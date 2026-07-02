/* ============================================================
   charts.js
   Criação/atualização dos gráficos Chart.js.
   ============================================================ */

/* ==============================================================
   CHARTS
   ============================================================== */
function renderCharts(){
  var pd=G.prodDiaria.slice(-14);
  mkChart('chart-prod-real',{type:'bar',data:{labels:pd.map(x=>x.data.substring(5)),datasets:[{label:'EPP (sc)',data:pd.map(x=>x.qty),backgroundColor:'rgba(27,92,122,.55)',borderColor:'rgba(27,92,122,.8)',borderWidth:1,borderRadius:3}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.04)'}},x:{grid:{display:false}}},maintainAspectRatio:false}});
}
function mkChart(id,cfg){var ctx=document.getElementById(id);if(!ctx) return;if(G.charts[id]) G.charts[id].destroy();G.charts[id]=new Chart(ctx,cfg);}

