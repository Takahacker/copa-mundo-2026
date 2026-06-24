// Dados da Copa do Mundo FIFA 2026 — fase de grupos
// Nome em português usado na UI -> { en: nome usado pelo dataset openfootball, flag: código ISO-3166-1 alpha-2 }

export const TEAM_INFO = {
  "México": { en: "Mexico", flag: "mx" },
  "África do Sul": { en: "South Africa", flag: "za" },
  "Coreia do Sul": { en: "South Korea", flag: "kr" },
  "Rep. Checa": { en: "Czech Republic", flag: "cz" },

  "Canadá": { en: "Canada", flag: "ca" },
  "Bósnia e Herz.": { en: "Bosnia & Herzegovina", flag: "ba" },
  "Catar": { en: "Qatar", flag: "qa" },
  "Suíça": { en: "Switzerland", flag: "ch" },

  "Brasil": { en: "Brazil", flag: "br" },
  "Marrocos": { en: "Morocco", flag: "ma" },
  "Haiti": { en: "Haiti", flag: "ht" },
  "Escócia": { en: "Scotland", flag: "gb-sct" },

  "Estados Unidos": { en: "USA", flag: "us" },
  "Turquia": { en: "Turkey", flag: "tr" },
  "Austrália": { en: "Australia", flag: "au" },
  "Paraguai": { en: "Paraguay", flag: "py" },

  "Alemanha": { en: "Germany", flag: "de" },
  "Curaçau": { en: "Curaçao", flag: "cw" },
  "Costa do Marfim": { en: "Ivory Coast", flag: "ci" },
  "Equador": { en: "Ecuador", flag: "ec" },

  "Holanda": { en: "Netherlands", flag: "nl" },
  "Japão": { en: "Japan", flag: "jp" },
  "Suécia": { en: "Sweden", flag: "se" },
  "Tunísia": { en: "Tunisia", flag: "tn" },

  "Bélgica": { en: "Belgium", flag: "be" },
  "Egito": { en: "Egypt", flag: "eg" },
  "Irã": { en: "Iran", flag: "ir" },
  "Nova Zelândia": { en: "New Zealand", flag: "nz" },

  "Espanha": { en: "Spain", flag: "es" },
  "Cabo Verde": { en: "Cape Verde", flag: "cv" },
  "Arábia Saudita": { en: "Saudi Arabia", flag: "sa" },
  "Uruguai": { en: "Uruguay", flag: "uy" },

  "França": { en: "France", flag: "fr" },
  "Senegal": { en: "Senegal", flag: "sn" },
  "Iraque": { en: "Iraq", flag: "iq" },
  "Noruega": { en: "Norway", flag: "no" },

  "Argentina": { en: "Argentina", flag: "ar" },
  "Argélia": { en: "Algeria", flag: "dz" },
  "Áustria": { en: "Austria", flag: "at" },
  "Jordânia": { en: "Jordan", flag: "jo" },

  "Portugal": { en: "Portugal", flag: "pt" },
  "RD Congo": { en: "DR Congo", flag: "cd" },
  "Uzbequistão": { en: "Uzbekistan", flag: "uz" },
  "Colômbia": { en: "Colombia", flag: "co" },

  "Inglaterra": { en: "England", flag: "gb-eng" },
  "Croácia": { en: "Croatia", flag: "hr" },
  "Gana": { en: "Ghana", flag: "gh" },
  "Panamá": { en: "Panama", flag: "pa" },
};

// índice reverso: nome em inglês (dataset) -> nome em português (UI)
export const EN_TO_PT = Object.fromEntries(
  Object.entries(TEAM_INFO).map(([pt, info]) => [info.en, pt])
);

export const GROUPS = {
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
