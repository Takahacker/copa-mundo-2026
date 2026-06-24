import { TEAM_INFO } from "./teams-data.js";

const REMOTE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const FETCH_TIMEOUT_MS = 8000;

// nome em português (usado na UI) -> nome em inglês (usado pelo dataset remoto)
const PT_TO_EN = Object.fromEntries(
  Object.entries(TEAM_INFO).map(([pt, info]) => [pt, info.en])
);

// nome em inglês (dataset remoto) -> nome em português (UI)
const EN_TO_PT = Object.fromEntries(
  Object.entries(TEAM_INFO).map(([pt, info]) => [info.en, pt])
);

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/**
 * Busca o dataset público (openfootball/worldcup.json) com os resultados
 * reais da Copa do Mundo 2026. Em caso de qualquer falha (rede, CORS,
 * formato inesperado), retorna null — quem chamar deve manter os dados
 * manuais/salvos como estão, sem quebrar o app.
 *
 * @param {(letter: string) => Array<{id: string, home: string, away: string}>} groupFixturesFn
 *   função local que devolve, para uma letra de grupo, a lista de confrontos
 *   (em português) na mesma ordem usada pelo restante do app.
 */
export async function fetchRemoteResults(groupFixturesFn) {
  try {
    const res = await withTimeout(
      fetch(REMOTE_URL, { cache: "no-store" }),
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Array.isArray(data.matches)) return null;
    return parseRemoteMatches(data.matches, groupFixturesFn);
  } catch (e) {
    return null;
  }
}

/**
 * Converte a lista de partidas do dataset remoto (nomes em inglês) num
 * dicionário { fixtureId: {home, away} } compatível com o formato interno
 * do app. O casamento é feito pelo PAR de seleções, não pela posição
 * casa/visitante, porque o dataset remoto pode listar o confronto invertido
 * em relação à nossa lista local de fixtures.
 */
function parseRemoteMatches(matches, groupFixturesFn) {
  const out = {};
  const byGroup = {};

  for (const m of matches) {
    if (!m.group) continue; // pula jogos de mata-mata aqui (tratados separadamente)
    const letter = m.group.replace("Group ", "").trim();
    if (!byGroup[letter]) byGroup[letter] = [];
    byGroup[letter].push(m);
  }

  for (const letter of Object.keys(byGroup)) {
    const remoteList = byGroup[letter];
    const localFixtures = groupFixturesFn(letter);

    for (const fx of localFixtures) {
      const homeEn = PT_TO_EN[fx.home] || fx.home;
      const awayEn = PT_TO_EN[fx.away] || fx.away;
      const match = remoteList.find(
        (m) =>
          (m.team1 === homeEn && m.team2 === awayEn) ||
          (m.team1 === awayEn && m.team2 === homeEn)
      );
      if (!match) continue;
      const ft = match.score && Array.isArray(match.score.ft) ? match.score.ft : null;
      if (!ft) continue;

      const sameOrder = match.team1 === homeEn;
      out[fx.id] = {
        home: String(sameOrder ? ft[0] : ft[1]),
        away: String(sameOrder ? ft[1] : ft[0]),
      };
    }
  }

  return out;
}

/** Traduz um nome de seleção em inglês (dataset remoto) para o nome em português usado na UI. */
export function translateTeamName(enName) {
  return EN_TO_PT[enName] || enName;
}
