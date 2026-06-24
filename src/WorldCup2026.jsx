import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { GROUPS, TEAM_INFO } from "./teams-data.js";
import { KNOCKOUT_MATCHES, KO_ROUND_ORDER } from "./knockout-data.js";
import { fetchRemoteResults } from "./remote-data.js";

/* ---------------------------------------------------------------------- */
/* CONSTANTES                                                             */
/* ---------------------------------------------------------------------- */

const GROUP_LETTERS = Object.keys(GROUPS);
const LEFT_GROUPS = ["A", "B", "C", "D", "E", "F"];
const RIGHT_GROUPS = ["G", "H", "I", "J", "K", "L"];

const STORAGE_KEY = "wc2026-resultados-v2";
const REMOTE_CACHE_KEY = "wc2026-remote-cache-v2";
const REMOTE_REFRESH_MS = 5 * 60 * 1000; // 5 minutos

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

function flagUrl(ptTeamName) {
  const info = TEAM_INFO[ptTeamName];
  if (!info) return null;
  return `https://flagcdn.com/w40/${info.flag}.png`;
}

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

/* ---------------------------------------------------------------------- */
/* RESOLUÇÃO DO CHAVEAMENTO ELIMINATÓRIO                                 */
/* ---------------------------------------------------------------------- */

// Resolve um identificador de slot ("1A", "2B", "3A/B/C/D/F", "W101", "L101")
// para o nome (em português) da seleção que ocupa aquela posição, dado o
// estado atual (tabelas de grupo, 8 melhores 3ºs, resultados do mata-mata).
function resolveKoSlot(code, ctx) {
  if (!code) return null;

  // 1º ou 2º colocado de um grupo: "1A", "2C", ...
  const groupPos = code.match(/^([12])([A-L])$/);
  if (groupPos) {
    const [, pos, letter] = groupPos;
    const idx = pos === "1" ? 0 : 1;
    if (!groupHasAllResults(letter, ctx.results)) return null;
    return ctx.tables[letter][idx]?.team ?? null;
  }

  // Melhor 3º colocado entre uma lista de grupos: "3A/B/C/D/F"
  const thirdPos = code.match(/^3(.+)$/);
  if (thirdPos) {
    if (!ctx.allGroupsComplete) return null;
    const candidateGroups = thirdPos[1].split("/");
    const found = ctx.bestThirds.find((t) => candidateGroups.includes(t.group));
    return found ? found.team : null;
  }

  // Vencedor de uma partida anterior: "W89"
  const winner = code.match(/^W(\d+)$/);
  if (winner) {
    return ctx.winnerOf(Number(winner[1]));
  }

  // Perdedor de uma partida anterior (usado só na disputa de 3º lugar): "L101"
  const loser = code.match(/^L(\d+)$/);
  if (loser) {
    return ctx.loserOf(Number(loser[1]));
  }

  return null;
}

/* ---------------------------------------------------------------------- */
/* COMPONENTES PEQUENOS                                                   */
/* ---------------------------------------------------------------------- */

function Flag({ team, size = 20 }) {
  const url = flagUrl(team);
  if (!url) return <span className="flag-fallback" style={{ width: size }} />;
  return (
    <img
      className="flag-img"
      src={url}
      alt=""
      width={size}
      height={Math.round(size * 0.75)}
      loading="lazy"
    />
  );
}

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

function GroupFixtureRow({ fx, result, onChange, isReal }) {
  const home = result?.home ?? "";
  const away = result?.away ?? "";
  return (
    <div className={`fixture-row ${isReal ? "fixture-real" : ""}`}>
      <span className="fixture-team home">
        {fx.home}
        <Flag team={fx.home} size={16} />
      </span>
      <div className="fixture-score">
        <ScoreInput value={home} onChange={(v) => onChange(fx.id, "home", v)} disabled={isReal} />
        <span className="fixture-dash">–</span>
        <ScoreInput value={away} onChange={(v) => onChange(fx.id, "away", v)} disabled={isReal} />
      </div>
      <span className="fixture-team away">
        <Flag team={fx.away} size={16} />
        {fx.away}
      </span>
    </div>
  );
}

function GroupCard({ letter, results, realIds, onChangeFixture, qualifiedSet, thirdLabelFor }) {
  const fixtures = groupFixtures(letter);
  const table = computeGroupTable(letter, results);
  const byRound = [1, 2, 3].map((r) => fixtures.filter((f) => f.round === r));

  return (
    <section className="group-card">
      <header className="group-card-header">
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
                  <Flag team={row.team} size={18} />
                  <span>{row.team}</span>
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
                isReal={realIds.has(fx.id)}
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
        <Flag team={homeTeam} size={18} />
        <span className="ko-team">{homeTeam ?? "—"}</span>
        <ScoreInput value={hg} disabled={!ready || locked} onChange={(v) => onChange("home", v)} />
      </div>
      <div className="ko-row">
        <Flag team={awayTeam} size={18} />
        <span className="ko-team">{awayTeam ?? "—"}</span>
        <ScoreInput value={ag} disabled={!ready || locked} onChange={(v) => onChange("away", v)} />
      </div>
      {isDraw && onPenChange ? (
        <div className="ko-pens">
          <span className="ko-pens-label">Pênaltis</span>
          <ScoreInput value={result?.pen?.home ?? ""} disabled={locked} onChange={(v) => onPenChange("home", v)} />
          <span className="fixture-dash">–</span>
          <ScoreInput value={result?.pen?.away ?? ""} disabled={locked} onChange={(v) => onPenChange("away", v)} />
        </div>
      ) : null}
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
              <Flag team={t.team} size={16} />
              <div className="thirds-text">
                <span className="thirds-team">{t.team}</span>
                <span className="thirds-group">
                  Grupo {t.group} · {t.pts} pts · SG {t.sg > 0 ? `+${t.sg}` : t.sg}
                </span>
              </div>
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
/* APP PRINCIPAL                                                          */
/* ---------------------------------------------------------------------- */

export default function WorldCup2026() {
  const [results, setResults] = useState({});
  const [koResults, setKoResults] = useState({});
  const [realIds, setRealIds] = useState(new Set());
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [syncState, setSyncState] = useState("idle"); // idle | loading | ok | error
  const [lastSync, setLastSync] = useState(null);
  const refreshTimer = useRef(null);

  /* ---- Persistência local (localStorage) ---- */

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

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ results, koResults }));
      } catch (e) {
        // ignora falha de storage
      }
    }, 250);
    return () => clearTimeout(t);
  }, [results, koResults, loaded]);

  /* ---- Busca de resultados reais (com fallback) ---- */

  const syncRemote = useCallback(async () => {
    setSyncState("loading");
    const remote = await fetchRemoteResults(groupFixtures);
    if (!remote) {
      setSyncState("error");
      return;
    }
    const ids = new Set(Object.keys(remote));
    setRealIds(ids);
    setResults((prev) => {
      const merged = { ...prev };
      for (const id of ids) merged[id] = remote[id];
      return merged;
    });
    setSyncState("ok");
    setLastSync(new Date());
    try {
      localStorage.setItem(
        REMOTE_CACHE_KEY,
        JSON.stringify({ data: remote, ids: Array.from(ids), at: Date.now() })
      );
    } catch (e) {
      // cache best-effort
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    // 1) tenta usar um cache local recente para já mostrar algo rápido
    try {
      const cached = localStorage.getItem(REMOTE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.data && Date.now() - parsed.at < 24 * 60 * 60 * 1000) {
          setRealIds(new Set(parsed.ids || []));
          setResults((prev) => ({ ...prev, ...parsed.data }));
        }
      }
    } catch (e) {
      // ignora cache inválido
    }

    // 2) busca os dados reais mais recentes
    syncRemote();

    // 3) atualiza periodicamente
    refreshTimer.current = setInterval(syncRemote, REMOTE_REFRESH_MS);
    return () => clearInterval(refreshTimer.current);
  }, [loaded, syncRemote]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const handleFixtureChange = useCallback((id, side, value) => {
    setResults((prev) => ({ ...prev, [id]: { ...prev[id], [side]: value } }));
  }, []);

  const handleKoChange = useCallback(
    (matchId, homeTeam, awayTeam) => (side, value) => {
      setKoResults((prev) => ({
        ...prev,
        [matchId]: { ...prev[matchId], homeTeam, awayTeam, [side]: value },
      }));
    },
    []
  );

  const handleKoPenChange = useCallback(
    (matchId) => (side, value) => {
      setKoResults((prev) => ({
        ...prev,
        [matchId]: { ...prev[matchId], pen: { ...(prev[matchId]?.pen || {}), [side]: value } },
      }));
    },
    []
  );

  /* -------- Cálculos derivados -------- */

  const tables = useMemo(() => allGroupTables(results), [results]);
  const allGroupsComplete = useMemo(
    () => GROUP_LETTERS.every((l) => groupHasAllResults(l, results)),
    [results]
  );
  const bestThirds = useMemo(() => bestThirdPlaced(tables), [tables]);

  const qualifiedSet = useMemo(() => {
    const s = new Set();
    for (const letter of GROUP_LETTERS) {
      if (groupHasAllResults(letter, results)) {
        s.add(tables[letter][0].team);
        s.add(tables[letter][1].team);
      }
    }
    if (allGroupsComplete) for (const t of bestThirds) s.add(t.team);
    return s;
  }, [tables, results, allGroupsComplete, bestThirds]);

  const thirdLabelFor = useCallback(
    (letter) => {
      if (!allGroupsComplete) return null;
      const idx = bestThirds.findIndex((t) => t.group === letter);
      return idx >= 0 ? `${idx + 1}º melhor 3º` : "eliminado";
    },
    [bestThirds, allGroupsComplete]
  );

  function winnerOf(num) {
    const r = koResults[num];
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

  function loserOf(num) {
    const r = koResults[num];
    if (!r || !r.homeTeam || !r.awayTeam) return null;
    const w = winnerOf(num);
    if (!w) return null;
    return w === r.homeTeam ? r.awayTeam : r.homeTeam;
  }

  const koCtx = { results, tables, allGroupsComplete, bestThirds, winnerOf, loserOf };

  const koResolved = useMemo(() => {
    return KNOCKOUT_MATCHES.map((m) => ({
      ...m,
      id: String(m.num),
      homeTeam: resolveKoSlot(m.team1, koCtx),
      awayTeam: resolveKoSlot(m.team2, koCtx),
    }));
  }, [tables, allGroupsComplete, bestThirds, koResults]);

  const champion = winnerOf(104);

  /* -------- Ações: simular e resetar -------- */

  function randomScore() {
    const weights = [0, 0, 0, 1, 1, 1, 1, 2, 2, 3];
    return weights[Math.floor(Math.random() * weights.length)];
  }

  function simulateGroupStage() {
    const newResults = { ...results };
    for (const letter of GROUP_LETTERS) {
      for (const fx of groupFixtures(letter)) {
        if (realIds.has(fx.id)) continue; // nunca sobrescreve resultado real
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
        const hg = randomScore();
        const ag = randomScore();
        const entry = { homeTeam: m.homeTeam, awayTeam: m.awayTeam, home: String(hg), away: String(ag) };
        if (hg === ag) {
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

  function resetManualData() {
    if (typeof window !== "undefined" && !window.confirm("Isso apaga apenas os resultados que você preencheu/simulou manualmente (os reais continuam). Confirmar?")) return;
    setResults((prev) => {
      const kept = {};
      for (const id of realIds) if (prev[id]) kept[id] = prev[id];
      return kept;
    });
    setKoResults({});
    showToast("Resultados manuais zerados.");
  }

  /* -------- Agrupamento do chaveamento por rodada -------- */

  const koByRound = useMemo(() => {
    const out = {};
    for (const round of KO_ROUND_ORDER) out[round] = koResolved.filter((m) => m.round === round);
    return out;
  }, [koResolved]);

  /* -------- Render -------- */

  return (
    <div className="wc-app">
      <Styles />
      <header className="app-header">
        <div className="app-header-inner">
          <div className="title-block">
            <h1>
              FIFA WORLD CUP 2026 <span className="title-accent">FASE DE GRUPOS</span>
            </h1>
            <SyncStatus syncState={syncState} lastSync={lastSync} onRetry={syncRemote} />
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={simulateGroupStage}>
              Simular jogos restantes
            </button>
            <button className="btn btn-ghost" onClick={resetManualData}>
              Zerar simulação
            </button>
          </div>
        </div>
      </header>

      {!allGroupsComplete && (
        <div className="banner">
          Os resultados reais já disputados são buscados automaticamente. Preencha ou simule o restante para liberar o chaveamento completo.
        </div>
      )}

      <div className="layout">
        <div className="groups-col">
          {LEFT_GROUPS.map((letter) => (
            <GroupCard
              key={letter}
              letter={letter}
              results={results}
              realIds={realIds}
              onChangeFixture={handleFixtureChange}
              qualifiedSet={qualifiedSet}
              thirdLabelFor={thirdLabelFor}
            />
          ))}
        </div>

        <div className="bracket-col">
          <BestThirdsPanel thirds={bestThirds} ready={allGroupsComplete} />

          {KO_ROUND_ORDER.filter((r) => r !== "Disputa de 3º lugar" && r !== "Final").map((round) => (
            <BracketRound
              key={round}
              title={round}
              matches={koByRound[round]}
              koResults={koResults}
              onChange={handleKoChange}
              onPenChange={handleKoPenChange}
              onSimulate={() => simulateKnockoutStep(koByRound[round])}
              simulateLabel={`Simular ${round.toLowerCase()}`}
              canSimulate={koByRound[round].every((m) => m.homeTeam && m.awayTeam)}
            />
          ))}

          <section className="final-section">
            <h3 className="round-title">Final &amp; disputa de 3º lugar</h3>
            <div className="bracket-grid">
              {koByRound["Disputa de 3º lugar"].map((m) => (
                <KOMatchBox
                  key={m.id}
                  title="3º lugar"
                  homeTeam={m.homeTeam}
                  awayTeam={m.awayTeam}
                  result={koResults[m.id]}
                  onChange={handleKoChange(m.id, m.homeTeam, m.awayTeam)}
                  onPenChange={handleKoPenChange(m.id)}
                />
              ))}
              {koByRound["Final"].map((m) => (
                <KOMatchBox
                  key={m.id}
                  title="Final"
                  homeTeam={m.homeTeam}
                  awayTeam={m.awayTeam}
                  result={koResults[m.id]}
                  onChange={handleKoChange(m.id, m.homeTeam, m.awayTeam)}
                  onPenChange={handleKoPenChange(m.id)}
                />
              ))}
            </div>
            {koByRound["Final"][0]?.homeTeam && koByRound["Final"][0]?.awayTeam && (
              <button
                className="btn btn-primary btn-small"
                onClick={() => simulateKnockoutStep([...koByRound["Disputa de 3º lugar"], ...koByRound["Final"]])}
              >
                Simular final
              </button>
            )}
            {champion && (
              <div className="champion-card">
                <Flag team={champion} size={28} />
                <div>
                  <span className="champion-label">Campeã da Copa do Mundo 2026</span>
                  <span className="champion-name">{champion}</span>
                </div>
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
              realIds={realIds}
              onChangeFixture={handleFixtureChange}
              qualifiedSet={qualifiedSet}
              thirdLabelFor={thirdLabelFor}
            />
          ))}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <footer className="app-footer">
        Dados reais via{" "}
        <a href="https://github.com/openfootball/worldcup.json" target="_blank" rel="noreferrer">
          openfootball/worldcup.json
        </a>{" "}
        (domínio público). Projeto não-oficial, sem afiliação com a FIFA.
      </footer>
    </div>
  );
}

function SyncStatus({ syncState, lastSync, onRetry }) {
  if (syncState === "loading") {
    return <span className="sync-status sync-loading">Buscando resultados reais…</span>;
  }
  if (syncState === "ok") {
    const time = lastSync
      ? lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "";
    return <span className="sync-status sync-ok">Resultados reais atualizados às {time}</span>;
  }
  if (syncState === "error") {
    return (
      <span className="sync-status sync-error">
        Não foi possível buscar os resultados reais agora — usando dados salvos.{" "}
        <button className="sync-retry" onClick={onRetry}>
          Tentar de novo
        </button>
      </span>
    );
  }
  return null;
}

/* ---------------------------------------------------------------------- */
/* ESTILOS — inspirado em gráficos oficiais FIFA (fundo marinho, caixas    */
/* azul-petróleo nos cabeçalhos, bandeiras ao lado dos nomes)              */
/* ---------------------------------------------------------------------- */

function Styles() {
  return (
    <style>{`
      :root {
        --bg: #0a1126;
        --bg-2: #0d1730;
        --panel: #101d3d;
        --panel-2: #16264a;
        --header-box: #1b3360;
        --line: #28406e;
        --text: #f3f6fc;
        --text-dim: #8fa3c7;
        --accent: #8b7cf6;
        --accent-2: #ffffff;
        --gold: #f0b429;
        --win: #2ecf8a;
      }

      * { box-sizing: border-box; }

      .wc-app {
        background: var(--bg);
        background-image: radial-gradient(circle at 50% 0%, #122152 0%, var(--bg) 60%);
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
        background: rgba(10, 17, 38, 0.94);
        backdrop-filter: blur(6px);
      }
      .app-header-inner {
        max-width: 1560px;
        margin: 0 auto;
        padding: 18px 24px;
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
        justify-content: space-between;
      }
      .title-block h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.01em;
        text-transform: uppercase;
        color: var(--accent-2);
      }
      .title-accent { color: var(--accent); }
      .sync-status { display: block; margin-top: 6px; font-size: 12px; color: var(--text-dim); }
      .sync-ok::before { content: "● "; color: var(--win); }
      .sync-loading::before { content: "● "; color: var(--gold); }
      .sync-error::before { content: "● "; color: #e85d5d; }
      .sync-retry {
        background: none; border: none; color: var(--accent); text-decoration: underline;
        cursor: pointer; font-size: 12px; padding: 0; margin-left: 4px;
      }

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
      .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .btn-primary { background: var(--accent); color: #ffffff; border-color: var(--accent); }
      .btn-ghost { background: transparent; }
      .btn-small { padding: 6px 10px; font-size: 12px; align-self: flex-start; }

      .banner {
        max-width: 1560px;
        margin: 14px auto 0;
        padding: 10px 24px;
        background: #20264a;
        border: 1px solid var(--accent);
        color: #cfd3ff;
        font-size: 13px;
        border-radius: 8px;
      }

      .layout {
        max-width: 1560px;
        margin: 20px auto 0;
        padding: 0 24px;
        display: grid;
        grid-template-columns: 300px 1fr 300px;
        gap: 20px;
        align-items: start;
      }

      .groups-col { display: flex; flex-direction: column; gap: 16px; }

      .group-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 0 0 12px;
        overflow: hidden;
      }
      .group-card-header {
        background: var(--header-box);
        padding: 9px 14px;
        text-align: center;
        border-bottom: 1px solid var(--line);
      }
      .group-name {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--accent-2);
      }

      .standings { width: 100%; border-collapse: collapse; font-size: 12px; margin: 10px 0; padding: 0 12px; }
      .standings th { text-align: left; color: var(--text-dim); font-weight: 600; padding: 4px 10px; border-bottom: 1px solid var(--line); }
      .standings td { padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .standings th:not(.team-col), .standings td:not(.team-col) { text-align: center; }
      .pos-col { width: 18px; color: var(--text-dim); }
      .team-col { font-weight: 600; display: flex; align-items: center; gap: 6px; }
      td.team-col { display: flex; align-items: center; gap: 6px; }
      tr.qualified .team-col { color: var(--win); }
      tr.qualified { background: rgba(46, 207, 138, 0.07); }
      tr.maybe .team-col { color: var(--gold); }
      .third-tag {
        display: inline-block;
        margin-left: 4px;
        font-size: 8px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--gold);
        border: 1px solid var(--gold);
        border-radius: 999px;
        padding: 1px 5px;
        white-space: nowrap;
      }

      .flag-img { border-radius: 2px; display: inline-block; object-fit: cover; flex-shrink: 0; }
      .flag-fallback { display: inline-block; height: 14px; background: var(--line); border-radius: 2px; flex-shrink: 0; }

      .fixtures { display: flex; flex-direction: column; gap: 8px; padding: 0 12px; }
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
      .fixture-row.fixture-real { background: rgba(255, 255, 255, 0.03); border-radius: 4px; }
      .fixture-team { display: flex; align-items: center; gap: 5px; }
      .fixture-team.home { justify-content: flex-end; text-align: right; }
      .fixture-team.away { justify-content: flex-start; text-align: left; }
      .fixture-score { display: flex; align-items: center; gap: 4px; justify-content: center; }
      .fixture-dash { color: var(--text-dim); }

      .score-input {
        width: 30px;
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
      .score-input:focus-visible { outline: 2px solid var(--accent); }
      .score-input:disabled { opacity: 0.55; }

      .bracket-col { display: flex; flex-direction: column; gap: 16px; }

      .thirds-panel, .bracket-round, .final-section {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 0 0 14px;
        overflow: hidden;
      }
      .round-title {
        margin: 0;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--accent-2);
        background: var(--header-box);
        padding: 9px 14px;
      }
      .bracket-round-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--header-box); padding-right: 10px; }
      .bracket-round-header .round-title { flex: 1; }
      .bracket-round-header .btn-small { margin: 0; }

      .thirds-empty { color: var(--text-dim); font-size: 12px; margin: 10px 14px 0; }
      .thirds-list { list-style: none; margin: 10px 0 0; padding: 0 12px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
      .thirds-list li {
        display: flex; align-items: center; gap: 6px;
        background: var(--panel-2); border-radius: 8px; padding: 6px 8px; font-size: 11px;
      }
      .thirds-text { display: flex; flex-direction: column; gap: 1px; }
      .thirds-team { font-weight: 700; font-size: 12px; }
      .thirds-group { color: var(--text-dim); font-size: 10px; }

      .bracket-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        padding: 10px 12px 0;
      }

      .ko-box {
        background: var(--panel-2);
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ko-box.ko-pending { opacity: 0.5; }
      .ko-title { font-size: 10px; color: var(--text-dim); text-transform: uppercase; }
      .ko-row { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
      .ko-team { flex: 1; }
      .ko-pens { display: flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 11px; color: var(--text-dim); }
      .ko-pens-label { margin-right: 4px; }

      .final-section { display: flex; flex-direction: column; gap: 10px; align-items: stretch; }
      .final-section .btn-small { margin: 0 12px; }

      .champion-card {
        margin: 0 12px 4px;
        background: linear-gradient(135deg, var(--gold), #ffe39c);
        color: #2a1d00;
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .champion-card > div { display: flex; flex-direction: column; gap: 1px; }
      .champion-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
      .champion-name { font-size: 18px; font-weight: 800; }

      .toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--panel-2);
        border: 1px solid var(--accent);
        color: var(--text);
        padding: 10px 18px;
        border-radius: 999px;
        font-size: 13px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        z-index: 50;
      }

      .app-footer {
        max-width: 1560px;
        margin: 28px auto 0;
        padding: 0 24px;
        font-size: 11px;
        color: var(--text-dim);
        text-align: center;
      }
      .app-footer a { color: var(--accent); text-decoration: underline; }

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
