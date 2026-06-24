# Copa do Mundo 2026 — Simulador

Aplicativo interativo da fase de grupos e do mata-mata da Copa do Mundo FIFA 2026 (México · Estados Unidos · Canadá).

🔗 **Acesse online:** https://takahacker.github.io/copa-mundo-2026/

## O que o app faz

- Mostra os 12 grupos (A–L) com as 48 seleções, 6 grupos de cada lado da tela
- Calcula a classificação automaticamente (pontos, jogos, saldo de gols) conforme você preenche os placares
- Identifica os 8 melhores terceiros colocados quando todos os grupos terminam
- Monta o chaveamento eliminatório completo no centro: 16-avos → oitavas → quartas → semifinal → final, com pênaltis em caso de empate
- Botões de **simulação** geram placares aleatórios apenas para os jogos ainda em aberto, em qualquer fase
- Os resultados ficam salvos no navegador (localStorage), então o progresso persiste entre visitas

## Rodando localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run preview
```

## Deploy

O deploy é automático via GitHub Actions (`.github/workflows/deploy.yml`): a cada push na branch `main`, o site é gerado com Vite e publicado no GitHub Pages.
