// Chaveamento eliminatório oficial da Copa do Mundo 2026, espelhando
// 1:1 a estrutura usada pelo dataset openfootball/worldcup.json.
// "1A"/"2A" = 1º/2º colocado do grupo A.
// "3A/B/C/D/F" = melhor 3º colocado entre os grupos A, B, C, D, F que estiver
//                classificado entre os 8 melhores 3ºs gerais.
// "WNN" = vencedor da partida número NN. "LNN" = perdedor da partida NN.

export const KNOCKOUT_MATCHES = [
  { num: 73, round: "16-avos de final", team1: "2A", team2: "2B" },
  { num: 74, round: "16-avos de final", team1: "1E", team2: "3A/B/C/D/F" },
  { num: 75, round: "16-avos de final", team1: "1F", team2: "2C" },
  { num: 76, round: "16-avos de final", team1: "1C", team2: "2F" },
  { num: 77, round: "16-avos de final", team1: "1I", team2: "3C/D/F/G/H" },
  { num: 78, round: "16-avos de final", team1: "2E", team2: "2I" },
  { num: 79, round: "16-avos de final", team1: "1A", team2: "3C/E/F/H/I" },
  { num: 80, round: "16-avos de final", team1: "1L", team2: "3E/H/I/J/K" },
  { num: 81, round: "16-avos de final", team1: "1D", team2: "3B/E/F/I/J" },
  { num: 82, round: "16-avos de final", team1: "1G", team2: "3A/E/H/I/J" },
  { num: 83, round: "16-avos de final", team1: "2K", team2: "2L" },
  { num: 84, round: "16-avos de final", team1: "1H", team2: "2J" },
  { num: 85, round: "16-avos de final", team1: "1B", team2: "3E/F/G/I/J" },
  { num: 86, round: "16-avos de final", team1: "1J", team2: "2H" },
  { num: 87, round: "16-avos de final", team1: "1K", team2: "3D/E/I/J/L" },
  { num: 88, round: "16-avos de final", team1: "2D", team2: "2G" },

  { num: 89, round: "Oitavas de final", team1: "W74", team2: "W77" },
  { num: 90, round: "Oitavas de final", team1: "W73", team2: "W75" },
  { num: 91, round: "Oitavas de final", team1: "W76", team2: "W78" },
  { num: 92, round: "Oitavas de final", team1: "W79", team2: "W80" },
  { num: 93, round: "Oitavas de final", team1: "W83", team2: "W84" },
  { num: 94, round: "Oitavas de final", team1: "W81", team2: "W82" },
  { num: 95, round: "Oitavas de final", team1: "W86", team2: "W88" },
  { num: 96, round: "Oitavas de final", team1: "W85", team2: "W87" },

  { num: 97, round: "Quartas de final", team1: "W89", team2: "W90" },
  { num: 98, round: "Quartas de final", team1: "W93", team2: "W94" },
  { num: 99, round: "Quartas de final", team1: "W91", team2: "W92" },
  { num: 100, round: "Quartas de final", team1: "W95", team2: "W96" },

  { num: 101, round: "Semifinal", team1: "W97", team2: "W98" },
  { num: 102, round: "Semifinal", team1: "W99", team2: "W100" },

  { num: 103, round: "Disputa de 3º lugar", team1: "L101", team2: "L102" },
  { num: 104, round: "Final", team1: "W101", team2: "W102" },
];

export const KO_ROUND_ORDER = [
  "16-avos de final",
  "Oitavas de final",
  "Quartas de final",
  "Semifinal",
  "Disputa de 3º lugar",
  "Final",
];
