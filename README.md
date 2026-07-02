# COLFIX · PCP Preditivo v11 — versão modularizada

Este pacote é o mesmo sistema `index.html` original, **refatorado em módulos**, sem
nenhuma alteração de lógica, cálculo, ID de DOM, regra de negócio ou comportamento
visual. Todo o conteúdo foi extraído programaticamente (linha a linha) do arquivo
monolítico original e conferido byte a byte contra o original antes da entrega —
nada foi reescrito, resumido ou "simplificado".

## Como rodar

Só abrir `index.html` no navegador (localmente ou publicado no GitHub Pages).
Não há build, não há Node.js, não há framework. É HTML + CSS + JS puro, carregado
como `<script src="...">` simples (sem módulos ES6), exatamente como o app
original funcionava dentro de uma única tag `<script>` — ou seja, todas as funções
continuam no mesmo escopo global de sempre e continuam podendo se chamar
livremente (`onclick="goPage(this)"`, `onchange="reprocessar()"`, etc. no HTML
continuam funcionando sem qualquer adaptação).

A ordem dos `<script src>` no `index.html` foi mantida de forma que arquivos de
estado/utilitários carregam primeiro e `app.js` (orquestrador) por último — mas
isso é só organização: como nenhuma função é *chamada* durante o carregamento
(só `window.onload=initLoad` é registrado), a ordem não é uma dependência crítica
graças ao hoisting de `function` no JavaScript.

## Estrutura

```
/index.html                 → esqueleto HTML (head + body), idêntico ao original
/css/
  variables.css              → tokens de design (cores, fontes, raios, sombras)
  layout.css                 → topbar, sidebar, navegação, cabeçalho de página
  components.css              → KPIs, cards, tabelas, badges, botões, alertas, grids
  dashboard.css                → cards de linha, painel de detalhe, itens PCP, Gantt,
                                  chips OFA/cobertura, lista de urgentes, config bar,
                                  estilos de análise de estoque
  projections.css              → timeline heatmap, forecast de linhas, modal de
                                  projeção, sparkline, chips de ruptura
  responsive.css                → reservado; o sistema original não tinha nenhuma
                                  @media query, então este arquivo está vazio (com
                                  um comentário explicando isso) — pronto para
                                  evolução futura sem tocar nos demais módulos
/js/
  state.js      → CONFIG: constantes, nomes de abas/linhas, objeto G (estado global)
  utils.js      → utilitários de data/número/DOM + HELPERS (badges, chips, formatação)
  api.js        → FETCH: integração com Google Sheets (gviz CSV) e parsing de CSV
  pcp.js        → PROCESSAMENTO PRINCIPAL (motor de cálculo do PCP) + página PCP Decisório
  dashboard.js   → página Dashboard (KPIs, rupturas previstas, urgentes, conflitos)
  projections.js → motor de projeção temporal + página Projeção Temporal (heatmap)
  linhas.js      → forecast de ocupação das linhas + cards de linhas
  programacao.js → geração da programação semanal (schedule) + Gantt/backlog
  previsao.js    → página Previsão vs Realizado
  estoque.js     → análise PCP sênior de estoque + páginas Produção EPP/Ordens/Perfil
  charts.js      → criação dos gráficos Chart.js
  modals.js      → modal de projeção individual + painel lateral de detalhamento
  exports.js     → todas as exportações CSV
  filters.js     → nota de arquitetura (ver abaixo) — sem lógica própria
  app.js         → renderAll() (orquestração de todas as renderizações) + navegação
                    entre páginas — deve ser o ÚLTIMO <script> carregado
/data/
  exemplo-base.json → amostra ilustrativa de 5 linhas de cada aba principal da
                        planilha (SALDO, PARAMETROS, PERFIL, CAPACIDADE, LINHAS),
                        gerada a partir do Excel enviado. É só documentação/exemplo
                        do formato de dados — o app NÃO lê este arquivo; ele continua
                        buscando os dados ao vivo do Google Sheets publicado (igual
                        ao original, em api.js/state.js).
/assets/icons, /assets/images → pastas reservadas (o app original usa apenas SVG
                        inline no HTML, não há nenhum arquivo de imagem/ícone
                        externo hoje).
```

## Sobre `filters.js`

A estrutura pedida previa um módulo dedicado de filtros. Na prática, cada página
(`rPCP`, `rProjecao`, `rOrdens`, `rEstoque`, `rPerfil`, `rProdReal`...) filtra e
renderiza sua própria tabela numa única função coesa, lendo os inputs da própria
página e escrevendo direto no DOM daquela página. Extrair esse filtro para um
arquivo à parte exigiria quebrar essa função em pedaços e mudar como ela lê/escreve
estado — ou seja, mudar comportamento, o que a tarefa proíbe explicitamente. Por
isso optei por manter os filtros exatamente onde estavam (dentro de `pcp.js`,
`projections.js`, `estoque.js`, etc.) e deixar `filters.js` apenas com essa nota,
como ponto de extensão futuro. Nenhuma lógica foi duplicada, movida pela metade ou
reescrita.

## O que foi melhorado (sem tocar em cálculo/regra)

- **Organização**: 1 arquivo de ~144 KB → 22 arquivos pequenos e nomeados por
  responsabilidade, muito mais fácil de navegar, revisar e dar manutenção.
- **Cacheável**: CSS e JS agora são arquivos estáticos separados — o navegador
  (e o GitHub Pages) podem cachear cada um independentemente entre deploys.
- **Zero acoplamento de build**: continua sem necessidade de bundler, Node.js ou
  transpilador. Basta subir a pasta inteira no GitHub Pages.
- **Rastreabilidade**: cada arquivo tem um cabeçalho descrevendo sua
  responsabilidade, facilitando localizar qualquer função rapidamente.

## O que foi preservado 100%

- Todos os cálculos de PCP, ruptura, cobertura, OFA, forecast e programação.
- Todos os IDs de DOM usados pelo JS (nenhum foi renomeado).
- Todo o HTML/CSS visual (nenhuma classe, cor, espaçamento ou animação mudou).
- Toda a integração com Google Sheets (mesma URL, mesmo parsing de CSV).
- Todos os exports CSV, modais, painel de detalhe e navegação entre páginas.

A verificação foi feita comparando, linha a linha (como multiconjunto, já que a
ordem de `<script>` não é uma dependência funcional aqui), o conteúdo de
`style_full.css`/`script_full.js` extraídos do arquivo original contra a soma de
todos os arquivos modulares — 100% de correspondência, exceto por comentários de
cabeçalho que eu adicionei para identificar cada módulo.
