/* ============================================================
   filters.js
   Filtros de busca/risco por página. As rotinas de filtragem permanecem coesas dentro da função de renderização de cada página (rPCP, rProjecao, rOrdens, rEstoque, etc.) em pcp.js / projections.js / estoque.js, pois cada uma manipula estado e DOM específicos daquela tabela. Este módulo documenta essa decisão e fica como ponto de extensão caso filtros cross-page sejam introduzidos no futuro — nenhuma lógica foi duplicada ou alterada.
   ============================================================ */


