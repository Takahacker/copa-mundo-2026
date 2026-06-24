import React, { useState, useEffect, useCallback, useMemo } from "react";

/* ---------------------------------------------------------------------- */
/* DADOS DO TORNEIO                                                       */
/* ---------------------------------------------------------------------- */

const GROUPS = {
  A: ["México", "África do Sul", "Coreia do Sul", "Rep. Checa"],
  B: ["Canadá", "Bósnia e Herz.", "Catar", "Suíça"],
  C: ["Brasil", "Marrocos", "Haiti", "Escócia"],
  D: ["Estados Unidos", "Turquia", "Austrália", "Paraguai"],
  E: ["Alemanha", "Curaçau", "Costa do Marfim", "Equador"],
  F: ["Holanda", "Japão", "Suécia", "Tunísia"],
  G: ["Bélgica", "Egito", "Irã", "Nova Zelândia"],
  H: ["Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai"],
  I: ["França", "Senegal", "Iraque", "Noruega"],
  J: ["Argentina", "Argélia", "Áustria", "Jordânia"],
  K: ["Portugal", "RD Congo", "Uzbequistão", "Colômbia"],
  L: ["Inglaterra", "Croácia", "Gana", "Panamá"],
};

const GROUP_LETTERS = Object.keys(GROUPS);
const LEFT_GROUPS = ["A", "B", "C", "D", "E", "F"];
const RIGHT_GROUPS = ["G", "H", "I", "J", "K", "L"];

function groupFixtures(letter) {
  const t = GROUPS[letter];
  return [
    { id: `${letter}-1a`, round: 1, home: t[0], away: t[1] },
    { id: `${letter}-1b`, round: 1, home: t[2], away: t[3] },
    { id: `${letter}-2a`, round: 2, home: t[0], away: t[2] },
    { id: `${letter}-2b`, round: 2, home: t[1], away: t[3] },
    { id: `${letter}-3a`, round: 3, home: t[0], away: t[3] },
    { id: `${letter}-3b`, round: 3, home: t[1], away: t[2] },
  ];
}

const R32_MATCHES = [
  { id: "R32-01", home: { type: "first", group: "A" }, away: { type: "third", slot: 0 } },
  { id: "R32-02", home: { type: "first", group: "C" }, away: { type: "third", slot: 1 } },
  { id: "R32-03", home: { type: "first", group: "E" }, away: { type: "third", slot: 2 } },
  { id: "R32-04", home: { type: "first", group: "G" }, away: { type: "third", slot: 3 } },
  { id: "R32-05", home: { type: "first", group: "H" }, away: { type: "third", slot: 4 } },
  { id: "R32-06", home: { type: "first", group: "I" }, away: { type: "third", slot: 5 } },
  { id: "R32-07", home: { type: "first", group: "K" }, away: { type: "third", slot: 6 } },
  { id: "R32-08", home: { type: "first", group: "L" }, away: { type: "third", slot: 7 } },
  { id: "R32-09", home: { type: "first", group: "B" }, away: { type: "first", group: "D" } },
  { id: "R32-10", home: { type: "first", group: "F" }, away: { type: "first", group: "J" } },
  { id: "R32-11", home: { type: "second", group: "A" }, away: { type: "second", group: "B" } },
  { id: "R32-12", home: { type: "second", group: "C" }, away: { type: "second", group: "D" } },
  { id: "R32-13", home: { type: "second", group: "E" }, away: { type: "second", group: "F" } },
  { id: "R32-14", home: { type: "second", group: "G" }, away: { type: "second", group: "H" } },
  { id: "R32-15", home: { type: "second", group: "I" }, away: { type: "second", group: "J" } },
  { id: "R32-16", home: { type: "second", group: "K" }, away: { type: "second", group: "L" } },
];

const R16_PAIRS = [
  ["R32-01", "R32-02"],
  ["R32-03", "R32-04"],
  ["R32-05", "R32-06"],
  ["R32-07", "R32-08"],
  ["R32-09", "R32-11"],
  ["R32-10", "R32-12"],
  ["R32-13", "R32-15"],
  ["R32-14", "R32-16"],
];

const STORAGE_KEY = "wc2026-resultados-v1";

/* ---------------------------------------------------------------------- */
/* LÓGICA DE CLASSIFICAÇÃO                                                */
/* ---------------------------------------------------------------------- */

function emptyTable(letter) {
  const t = {};
  for (const team of GROUPS[letter]) {
    t[team] = { team, p: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 };
  }
  return t;
}

function computeGroupTable(letter, results) {
  const table = emptyTable(letter);
  const fixtures = groupFixtures(letter);
  for (const fx of fixtures) {
    const r = results[fx.id];
    if (!r || r.home === "" || r.away === "" || r.home == null || r.away == null) continue;
    const hg = Number(r.home);
    const ag = Number(r.away);
    if (Number.isNaN(hg) || Number.isNaN(ag)) continue;
    const H = table[fx.home];
    const A = table[fx.away];
    H.p += 1; A.p += 1;
    H.gp += hg; H.gc += ag;
    A.gp += ag; A.gc += hg;
    if (hg > ag) { H.v += 1; H.pts += 3; A.d += 1; }
    else if (hg < ag) { A.v += 1; A.pts += 3; H.d += 1; }
    else { H.e += 1; A.e += 1; H.pts += 1; A.pts += 1; }
  }
  for (const team in table) table[team].sg = table[team].gp - table[team].gc;
  const ranked = Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.sg !== a.sg) return b.sg - a.sg;
    if (b.gp !== a.gp) return b.gp - a.gp;
    return a.team.localeCompare(b.team);
  });
  return ranked;
}

function allGroupTables(results) {
  const out = {};
  for (const letter of GROUP_LETTERS) out[letter] = computeGroupTable(letter, results);
  return out;
}

function bestThirdPlaced(tables) {
  const thirds = GROUP_LETTERS.map((letter) => ({ ...tables[letter][2], group: letter }));
  const ranked = thirds.slice().sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.sg !== a.sg) return b.sg - a.sg;
    if (b.gp !== a.gp) return b.gp - a.gp;
    return a.team.localeCompare(b.team);
  });
  return ranked.slice(0, 8);
}

function groupHasAllResults(letter, results) {
  return groupFixtures(letter).every((fx) => {
    const r = results[fx.id];
    return r && r.home !== "" && r.away !== "" && r.home != null && r.away != null;
  });
}

function resolveSlot(slot, tables, thirds) {
  if (slot.type === "first") return tables[slot.group][0]?.team ?? null;
  if (slot.type === "second") return tables[slot.group][1]?.team ?? null;
  if (slot.type === "third") return thirds[slot.slot]?.team ?? null;
  return null;
}

/* ---------------------------------------------------------------------- */
/* COMPONENTES PEQUENOS                                                   */
/* ---------------------------------------------------------------------- */

function ScoreInput({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      min="0"
      max="20"
      inputMode="numeric"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="score-input"
      aria-label="Placar"
    />
  );
}

function GroupFixtureRow({ fx, result, onChange }) {
  const home = result?.home ?? "";
  const away = result?.away ?? "";
  return (
    <div className="fixture-row">
      <span className="fixture-team home">{fx.home}</span>
      <div className="fixture-score">
        <ScoreInput value={home} onChange={(v) => onChange(fx.id, "home", v)} />
        <span className="fixture-dash">–</span>
        <ScoreInput value={away} onChange={(v) => onChange(fx.id, "away", v)} />
      </div>
      <span className="fixture-team away">{fx.away}</span>
    </div>
  );
}

function GroupCard({ letter, results, onChangeFixture, qualifiedSet, thirdLabelFor }) {
  const fixtures = groupFixtures(letter);
  const table = computeGroupTable(letter, results);
  const byRound = [1, 2, 3].map((r) => fixtures.filter((f) => f.round === r));

  return (
    <section className="group-card">
      <header className="group-card-header">
        <span className="group-letter">{letter}</span>
        <span className="group-name">Grupo {letter}</span>
      </header>

      <table className="standings">
        <thead>
          <tr>
            <th className="pos-col"></th>
            <th className="team-col">Seleção</th>
            <th title="Pontos">P</th>
            <th title="Jogos">J</th>
            <th title="Saldo de gols">SG</th>
          </tr>
        </thead>
        <tbody>
          {table.map((row, i) => {
            const qualified = qualifiedSet.has(row.team);
            const isThird = i === 2;
            const thirdNote = isThird ? thirdLabelFor(letter) : null;
            return (
              <tr key={row.team} className={qualified ? "qualified" : isThird ? "maybe" : ""}>
                <td className="pos-col">{i + 1}</td>
                <td className="team-col">
                  {row.team}
                  {thirdNote ? <span className="third-tag">{thirdNote}</span> : null}
                </td>
                <td>{row.pts}</td>
                <td>{row.p}</td>
                <td>{row.sg > 0 ? `+${row.sg}` : row.sg}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="fixtures">
        {byRound.map((roundFixtures, idx) => (
          <div className="round-block" key={idx}>
            <span className="round-label">Rodada {idx + 1}</span>
            {roundFixtures.map((fx) => (
              <GroupFixtureRow
                key={fx.id}
                fx={fx}
                result={results[fx.id]}
                onChange={onChangeFixture}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function KOMatchBox({ title, homeTeam, awayTeam, result, onChange, onPenChange, locked }) {
  const ready = homeTeam && awayTeam;
  const hg = result?.home ?? "";
  const ag = result?.away ?? "";
  const isDraw =
    ready && hg !== "" && ag !== "" && !Number.isNaN(Number(hg)) && !Number.isNaN(Number(ag)) && Number(hg) === Number(ag);

  return (
    <div className={`ko-box ${ready ? "" : "ko-pending"}`}>
      {title ? <span className="ko-title">{title}</span> : null}
      <div className="ko-row">
        <span className="ko-team">{homeTeam ?? "—"}</span>
        <ScoreInput
          value={hg}
          disabled={!ready || locked}
          onChange={(v) => onChange("home", v)}
        />
      </div>
      <div className="ko-row">
        <span className="ko-team">{awayTeam ?? "—"}</span>
        <ScoreInput
          value={ag}
          disabled={!ready || locked}
          onChange={(v) => onChange("away", v)}
        />
      </div>
      {isDraw && onPenChange ? (
        <div className="ko-pens">
          <span className="ko-pens-label">Pênaltis</span>
          <ScoreInput
            value={result?.pen?.home ?? ""}
            disabled={locked}
            onChange={(v) => onPenChange("home", v)}
          />
          <span className="fixture-dash">–</span>
          <ScoreInput
            value={result?.pen?.away ?? ""}
            disabled={locked}
            onChange={(v) => onPenChange("away", v)}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* APP PRINCIPAL                                                          */
/* ---------------------------------------------------------------------- */

export default function WorldCup2026() {
  const [results, setResults] = useState({});
  const [koResults, setKoResults] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");

  // Carregar dados salvos
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setResults(parsed.results || {});
        setKoResults(parsed.koResults || {});
      }
    } catch (e) {
      // sem dados salvos ainda
    } finally {
      setLoaded(true);
    }
  }, []);

  // Salvar a cada mudança (debounced simples)
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ results, koResults }));
      } catch (e) {
        // ignora falha de storage (ex: modo privado sem permissão)
      }
    }, 250);
    return () => clearTimeout(t);
  }, [results, koResults, loaded]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const handleFixtureChange = useCallback((id, side, value) => {
    setResults((prev) => ({
      ...prev,
      [id]: { ...prev[id], [side]: value },
    }));
  }, []);

  const handleKoChange = useCallback((matchId, homeTeam, awayTeam) => (side, value) => {
    setKoResults((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        homeTeam,
        awayTeam,
        [side]: value,
      },
    }));
  }, []);

  const handleKoPenChange = useCallback((matchId) => (side, value) => {
    setKoResults((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        pen: { ...(prev[matchId]?.pen || {}), [side]: value },
      },
    }));
  }, []);

  /* -------- Cálculos derivados -------- */

  const tables = useMemo(() => allGroupTables(results), [results]);
  const allGroupsComplete = useMemo(
    () => GROUP_LETTERS.every((l) => groupHasAllResults(l, results)),
    [results]
  );
  const thirds = useMemo(() => bestThirdPlaced(tables), [tables]);

  const qualifiedSet = useMemo(() => {
    const s = new Set();
    for (const letter of GROUP_LETTERS) {
      if (groupHasAllResults(letter, results)) {
        s.add(tables[letter][0].team);
        s.add(tables[letter][1].team);
      }
    }
    if (allGroupsComplete) {
      for (const t of thirds) s.add(t.team);
    }
    return s;
  }, [tables, results, allGroupsComplete, thirds]);

  const thirdLabelFor = useCallback(
    (letter) => {
      if (!allGroupsComplete) return null;
      const idx = thirds.findIndex((t) => t.group === letter);
      return idx >= 0 ? `${idx + 1}º melhor 3º` : "eliminado";
    },
    [thirds, allGroupsComplete]
  );

  const r32Resolved = useMemo(() => {
    // Slots "third" só podem ser resolvidos quando todos os 12 grupos
    // tiverem terminado (precisamos comparar os 12 terceiros entre si).
    const canResolve = (slot) => slot.type !== "third" || allGroupsComplete;
    return R32_MATCHES.map((m) => {
      const homeTeam = canResolve(m.home) ? resolveSlot(m.home, tables, thirds) : null;
      const awayTeam = canResolve(m.away) ? resolveSlot(m.away, tables, thirds) : null;
      return { ...m, homeTeam, awayTeam };
    });
  }, [tables, thirds, allGroupsComplete]);

  function winnerOf(matchId) {
    const r = koResults[matchId];
    if (!r) return null;
    const hg = Number(r.home), ag = Number(r.away);
    if (r.home === "" || r.away === "" || Number.isNaN(hg) || Number.isNaN(ag)) return null;
    if (hg > ag) return r.homeTeam;
    if (ag > hg) return r.awayTeam;
    if (r.pen && r.pen.home !== "" && r.pen.away !== "") {
      const ph = Number(r.pen.home), pa = Number(r.pen.away);
      if (!Number.isNaN(ph) && !Number.isNaN(pa) && ph !== pa) return ph > pa ? r.homeTeam : r.awayTeam;
    }
    return null;
  }

  const r16Resolved = useMemo(() => {
    return R16_PAIRS.map(([aId, bId], idx) => {
      const homeTeam = winnerOf(aId);
      const awayTeam = winnerOf(bId);
      return { id: `R16-${idx + 1}`, homeTeam, awayTeam, fromA: aId, fromB: bId };
    });
  }, [koResults, r32Resolved]);

  const qfResolved = useMemo(() => {
    const pairs = [[0, 1], [2, 3], [4, 5], [6, 7]];
    return pairs.map(([ai, bi], idx) => {
      const homeTeam = winnerOf(r16Resolved[ai].id);
      const awayTeam = winnerOf(r16Resolved[bi].id);
      return { id: `QF-${idx + 1}`, homeTeam, awayTeam };
    });
  }, [koResults, r16Resolved]);

  const sfResolved = useMemo(() => {
    const pairs = [[0, 1], [2, 3]];
    return pairs.map(([ai, bi], idx) => {
      const homeTeam = winnerOf(qfResolved[ai].id);
      const awayTeam = winnerOf(qfResolved[bi].id);
      return { id: `SF-${idx + 1}`, homeTeam, awayTeam };
    });
  }, [koResults, qfResolved]);

  const finalResolved = useMemo(() => {
    const homeTeam = winnerOf(sfResolved[0].id);
    const awayTeam = winnerOf(sfResolved[1].id);
    return { id: "FINAL", homeTeam, awayTeam };
  }, [koResults, sfResolved]);

  const champion = winnerOf("FINAL");

  /* -------- Ações: simular e resetar -------- */

  function randomScore() {
    const weights = [0, 0, 0, 1, 1, 1, 1, 2, 2, 3];
    return weights[Math.floor(Math.random() * weights.length)];
  }

  function simulateAll() {
    const newResults = { ...results };
    for (const letter of GROUP_LETTERS) {
      for (const fx of groupFixtures(letter)) {
        const cur = newResults[fx.id];
        if (!cur || cur.home === "" || cur.home == null || cur.away === "" || cur.away == null) {
          newResults[fx.id] = { home: String(randomScore()), away: String(randomScore()) };
        }
      }
    }
    setResults(newResults);
    showToast("Jogos de grupo em aberto foram simulados ⚽");
  }

  function simulateKnockoutStep(matches) {
    setKoResults((prev) => {
      const next = { ...prev };
      for (const m of matches) {
        if (!m.homeTeam || !m.awayTeam) continue;
        const existing = next[m.id];
        const hasResult = existing && existing.home !== "" && existing.away !== "" && existing.home != null && existing.away != null;
        if (hasResult) continue;
        let hg = randomScore();
        let ag = randomScore();
        const entry = { homeTeam: m.homeTeam, awayTeam: m.awayTeam, home: String(hg), away: String(ag) };
        if (hg === ag) {
          // Pênaltis: gera dois números distintos entre 3 e 7 para decidir o vencedor
          const penHome = 3 + Math.floor(Math.random() * 5);
          let penAway = 3 + Math.floor(Math.random() * 5);
          if (penAway === penHome) penAway = penHome + 1;
          entry.pen = { home: String(penHome), away: String(penAway) };
        }
        next[m.id] = entry;
      }
      return next;
    });
  }

  function resetAll() {
    if (typeof window !== "undefined" && !window.confirm("Tem certeza que deseja apagar todos os resultados?")) return;
    setResults({});
    setKoResults({});
    showToast("Tudo zerado.");
  }

  /* -------- Render -------- */

  return (
    <div className="wc-app">
      <Styles />
      <header className="app-header">
        <div className="app-header-inner">
          <div className="title-block">
            <span className="eyebrow">FIFA · 11 jun – 19 jul 2026</span>
            <h1>Copa do Mundo 2026</h1>
            <span className="subtitle">Canadá · México · Estados Unidos — 48 seleções, 12 grupos</span>
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={simulateAll}>
              Simular jogos de grupo
            </button>
            <button className="btn btn-ghost" onClick={resetAll}>
              Zerar tudo
            </button>
          </div>
        </div>
      </header>

      {!allGroupsComplete && (
        <div className="banner">
          Preencha (ou simule) todos os jogos dos 12 grupos para liberar o chaveamento eliminatório completo.
        </div>
      )}

      <div className="layout">
        <div className="groups-col">
          {LEFT_GROUPS.map((letter) => (
            <GroupCard
              key={letter}
              letter={letter}
              results={results}
              onChangeFixture={handleFixtureChange}
              qualifiedSet={qualifiedSet}
              thirdLabelFor={thirdLabelFor}
            />
          ))}
        </div>

        <div className="bracket-col">
          <BestThirdsPanel thirds={thirds} ready={allGroupsComplete} />

          <BracketRound
            title="16-avos de final"
            matches={r32Resolved.map((m) => ({
              id: m.id,
              homeTeam: m.homeTeam,
              awayTeam: m.awayTeam,
            }))}
            koResults={koResults}
            onChange={handleKoChange}
            onPenChange={handleKoPenChange}
            onSimulate={() => simulateKnockoutStep(r32Resolved)}
            simulateLabel="Simular 16-avos"
            canSimulate={allGroupsComplete}
          />

          <BracketRound
            title="Oitavas de final"
            matches={r16Resolved}
            koResults={koResults}
            onChange={handleKoChange}
            onPenChange={handleKoPenChange}
            onSimulate={() => simulateKnockoutStep(r16Resolved)}
            simulateLabel="Simular oitavas"
            canSimulate={r16Resolved.every((m) => m.homeTeam && m.awayTeam)}
          />

          <BracketRound
            title="Quartas de final"
            matches={qfResolved}
            koResults={koResults}
            onChange={handleKoChange}
            onPenChange={handleKoPenChange}
            onSimulate={() => simulateKnockoutStep(qfResolved)}
            simulateLabel="Simular quartas"
            canSimulate={qfResolved.every((m) => m.homeTeam && m.awayTeam)}
          />

          <BracketRound
            title="Semifinais"
            matches={sfResolved}
            koResults={koResults}
            onChange={handleKoChange}
            onPenChange={handleKoPenChange}
            onSimulate={() => simulateKnockoutStep(sfResolved)}
            simulateLabel="Simular semifinais"
            canSimulate={sfResolved.every((m) => m.homeTeam && m.awayTeam)}
          />

          <section className="final-section">
            <h3 className="round-title">Final</h3>
            <KOMatchBox
              homeTeam={finalResolved.homeTeam}
              awayTeam={finalResolved.awayTeam}
              result={koResults["FINAL"]}
              onChange={handleKoChange("FINAL", finalResolved.homeTeam, finalResolved.awayTeam)}
              onPenChange={handleKoPenChange("FINAL")}
            />
            {finalResolved.homeTeam && finalResolved.awayTeam && (
              <button
                className="btn btn-primary btn-small"
                onClick={() => simulateKnockoutStep([finalResolved])}
              >
                Simular final
              </button>
            )}
            {champion && (
              <div className="champion-card">
                <span className="champion-label">Campeã da Copa do Mundo 2026</span>
                <span className="champion-name">{champion}</span>
              </div>
            )}
          </section>
        </div>

        <div className="groups-col">
          {RIGHT_GROUPS.map((letter) => (
            <GroupCard
              key={letter}
              letter={letter}
              results={results}
              onChangeFixture={handleFixtureChange}
              qualifiedSet={qualifiedSet}
              thirdLabelFor={thirdLabelFor}
            />
          ))}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function BestThirdsPanel({ thirds, ready }) {
  return (
    <section className="thirds-panel">
      <h3 className="round-title">8 melhores 3ºs colocados</h3>
      {!ready ? (
        <p className="thirds-empty">Disponível quando todos os grupos forem concluídos.</p>
      ) : (
        <ol className="thirds-list">
          {thirds.map((t) => (
            <li key={t.group}>
              <span className="thirds-team">{t.team}</span>
              <span className="thirds-group">Grupo {t.group}</span>
              <span className="thirds-pts">{t.pts} pts · SG {t.sg > 0 ? `+${t.sg}` : t.sg}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function BracketRound({ title, matches, koResults, onChange, onPenChange, onSimulate, simulateLabel, canSimulate }) {
  return (
    <section className="bracket-round">
      <div className="bracket-round-header">
        <h3 className="round-title">{title}</h3>
        {canSimulate && (
          <button className="btn btn-ghost btn-small" onClick={onSimulate}>
            {simulateLabel}
          </button>
        )}
      </div>
      <div className="bracket-grid">
        {matches.map((m) => (
          <KOMatchBox
            key={m.id}
            homeTeam={m.homeTeam}
            awayTeam={m.awayTeam}
            result={koResults[m.id]}
            onChange={onChange(m.id, m.homeTeam, m.awayTeam)}
            onPenChange={onPenChange(m.id)}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* ESTILOS                                                                */
/* ---------------------------------------------------------------------- */

function Styles() {
  return (
    <style>{`
      :root {
        --bg: #0d1b2a;
        --panel: #14283d;
        --panel-2: #1b3552;
        --line: #2a4a6b;
        --text: #eaf2fb;
        --text-dim: #93acc7;
        --accent: #ffb703;
        --accent-2: #2ec4b6;
        --win: #1f6f4b;
      }

      * { box-sizing: border-box; }

      .wc-app {
        background: radial-gradient(circle at 10% 0%, #163149 0%, var(--bg) 55%);
        color: var(--text);
        font-family: 'Inter', system-ui, -apple-system, Segoe UI, sans-serif;
        min-height: 100vh;
        padding-bottom: 60px;
      }

      .app-header {
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 20;
        background: rgba(13, 27, 42, 0.92);
        backdrop-filter: blur(6px);
      }
      .app-header-inner {
        max-width: 1500px;
        margin: 0 auto;
        padding: 18px 24px;
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
        justify-content: space-between;
      }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent-2);
        font-weight: 600;
      }
      .title-block h1 {
        margin: 2px 0 2px;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.01em;
      }
      .subtitle { color: var(--text-dim); font-size: 13px; }
      .actions { display: flex; gap: 10px; flex-wrap: wrap; }

      .btn {
        border: 1px solid var(--line);
        background: var(--panel-2);
        color: var(--text);
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.08s ease, background 0.15s ease;
      }
      .btn:hover { transform: translateY(-1px); }
      .btn:focus-visible { outline: 2px solid var(--accent-2); outline-offset: 2px; }
      .btn-primary { background: var(--accent); color: #1a1300; border-color: var(--accent); }
      .btn-ghost { background: transparent; }
      .btn-small { padding: 6px 10px; font-size: 12px; }

      .banner {
        max-width: 1500px;
        margin: 14px auto 0;
        padding: 10px 24px;
        background: #2b2410;
        border: 1px solid #5a4a18;
        color: #ffd773;
        font-size: 13px;
        border-radius: 8px;
      }

      .layout {
        max-width: 1500px;
        margin: 20px auto 0;
        padding: 0 24px;
        display: grid;
        grid-template-columns: 300px 1fr 300px;
        gap: 20px;
        align-items: start;
      }

      .groups-col {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .group-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 14px;
      }
      .group-card-header {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 10px;
      }
      .group-letter {
        font-size: 20px;
        font-weight: 800;
        color: var(--accent);
        font-family: Georgia, serif;
      }
      .group-name { font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; }

      .standings { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
      .standings th { text-align: left; color: var(--text-dim); font-weight: 600; padding: 4px 4px; border-bottom: 1px solid var(--line); }
      .standings td { padding: 5px 4px; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .standings th:not(.team-col), .standings td:not(.team-col) { text-align: center; }
      .pos-col { width: 18px; color: var(--text-dim); }
      .team-col { font-weight: 600; }
      tr.qualified .team-col { color: var(--accent-2); }
      tr.qualified { background: rgba(46, 196, 182, 0.08); }
      tr.maybe .team-col { color: var(--accent); }
      .third-tag {
        display: inline-block;
        margin-left: 6px;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--accent);
        border: 1px solid var(--accent);
        border-radius: 999px;
        padding: 1px 6px;
      }

      .fixtures { display: flex; flex-direction: column; gap: 8px; }
      .round-block { display: flex; flex-direction: column; gap: 4px; }
      .round-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-dim);
        margin-top: 2px;
      }
      .fixture-row {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        padding: 3px 0;
      }
      .fixture-team.home { text-align: right; }
      .fixture-team.away { text-align: left; }
      .fixture-score { display: flex; align-items: center; gap: 4px; justify-content: center; }
      .fixture-dash { color: var(--text-dim); }

      .score-input {
        width: 32px;
        background: var(--panel-2);
        border: 1px solid var(--line);
        color: var(--text);
        border-radius: 6px;
        padding: 3px 2px;
        text-align: center;
        font-size: 13px;
        font-weight: 700;
      }
      .score-input::-webkit-outer-spin-button,
      .score-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      .score-input:focus-visible { outline: 2px solid var(--accent-2); }
      .score-input:disabled { opacity: 0.4; }

      .bracket-col { display: flex; flex-direction: column; gap: 18px; }

      .thirds-panel, .bracket-round, .final-section {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 14px;
      }
      .round-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; letter-spacing: 0.01em; }
      .bracket-round-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;}
      .bracket-round-header .round-title { margin-bottom: 0; }

      .thirds-empty { color: var(--text-dim); font-size: 12px; margin: 0; }
      .thirds-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
      .thirds-list li {
        display: flex; flex-direction: column; gap: 1px;
        background: var(--panel-2); border-radius: 8px; padding: 6px 8px; font-size: 11px;
      }
      .thirds-team { font-weight: 700; font-size: 12px; }
      .thirds-group { color: var(--text-dim); }
      .thirds-pts { color: var(--accent-2); }

      .bracket-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .ko-box {
        background: var(--panel-2);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ko-box.ko-pending { opacity: 0.55; }
      .ko-title { font-size: 10px; color: var(--text-dim); text-transform: uppercase; }
      .ko-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 600; }
      .ko-team { flex: 1; }
      .ko-pens { display: flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 11px; color: var(--text-dim); }
      .ko-pens-label { margin-right: 4px; }

      .final-section { display: flex; flex-direction: column; gap: 10px; align-items: stretch; }
      .final-section .ko-box { max-width: 320px; }

      .champion-card {
        margin-top: 6px;
        background: linear-gradient(135deg, var(--accent), #ffd773);
        color: #1a1300;
        border-radius: 10px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .champion-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
      .champion-name { font-size: 22px; font-weight: 800; }

      .toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--panel-2);
        border: 1px solid var(--accent-2);
        color: var(--text);
        padding: 10px 18px;
        border-radius: 999px;
        font-size: 13px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        z-index: 50;
      }

      @media (max-width: 1180px) {
        .layout { grid-template-columns: 1fr; }
        .bracket-col { order: -1; }
        .groups-col { flex-direction: row; flex-wrap: wrap; }
        .group-card { flex: 1 1 280px; }
      }
      @media (max-width: 640px) {
        .app-header-inner { flex-direction: column; align-items: flex-start; }
        .bracket-grid { grid-template-columns: 1fr; }
        .thirds-list { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
