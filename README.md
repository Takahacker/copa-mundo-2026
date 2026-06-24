# Copa do Mundo 2026 — Simulador

Aplicativo interativo da fase de grupos e do mata-mata da Copa do Mundo FIFA 2026 (México · Estados Unidos · Canadá).

🔗 **Acesse online:** https://takahacker.github.io/copa-mundo-2026/

## O que o app faz

- Mostra os 12 grupos (A–L) com as 48 seleções e suas bandeiras, 6 grupos de cada lado da tela
- **Busca automaticamente os resultados reais já disputados**, via o dataset público [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) (domínio público, sem chave de API). A busca roda ao carregar a página e se repete a cada 5 minutos; se a fonte estiver indisponível, o app mantém os últimos dados salvos (cache local + resultados preenchidos manualmente)
- Calcula a classificação automaticamente (pontos, jogos, saldo de gols) combinando resultados reais com os que você preencher/simular
- Identifica os 8 melhores terceiros colocados quando todos os grupos terminam
- Monta o chaveamento eliminatório oficial completo: 16-avos → oitavas → quartas → semifinal → disputa de 3º lugar → final, com pênaltis em caso de empate
- Botões de **simulação** geram placares aleatórios apenas para os jogos ainda em aberto (nunca sobrescrevem um resultado real)
- Os resultados ficam salvos no navegador (localStorage)

**Aviso:** projeto independente, sem afiliação com a FIFA. Os resultados reais dependem da disponibilidade de uma fonte de dados de terceiros (não oficial).

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

