/* ============================================================
   linhas.js
   Forecast de ocupação futura das linhas de produção e renderização dos cards de linhas.
   ============================================================ */

/* ==============================================================
   FORECAST DE LINHAS — projeção de ocupação futura
   ============================================================== */
function calcFuturoLinhas(dias,ofaDiasMapGlobal){
  var HOJE=hoje0();
  var result={};
  LINHAS_KEYS.forEach(lk=>{
    result[lk]=[];
    for(var d=0;d<dias;d++){
      var date=addDias(HOJE,d);var dk=isoDate(date);
      var linhaInfo=G.linhasInfo.find(l=>l.id===lk);
      var cap=linhaInfo?linhaInfo.capDia:0;
      var ofa=0;
      // Soma OFAs de itens dessa linha para esse dia
      G.itens.forEach(it=>{
        if(!it.LinhasKeys.includes(lk)) return;
        var ofaDias=ofaDiasMapGlobal[it.Codigo];
        if(ofaDias&&ofaDias[dk]) ofa+=ofaDias[dk]/Math.max(it.LinhasKeys.length,1);
      });
      var util=cap>0?Math.min(Math.round(ofa/cap*100),999):(ofa>0?999:0);
      result[lk].push({date,dk,cap,ofa,util,livre:Math.max(cap-ofa,0),cor:util<=70?'verde':util<=90?'amarelo':'vermelho'});
    }
  });
  return result;
}


/* ==============================================================
   LINHAS + FORECAST
   ============================================================== */
function rLinhas(){
  var li=G.linhasInfo;
  txt('lin-kpi-ok',li.filter(l=>l.cor==='verde').length);
  txt('lin-kpi-med',(li.length?Math.round(li.reduce((a,l)=>a+l.util,0)/li.length):0)+'%');
  txt('lin-kpi-sob',li.filter(l=>l.cor==='vermelho').length);
  txt('lin-kpi-total',fN(li.reduce((a,l)=>a+l.capDia,0))+' sc');
  var ce=el('linhas-cards');ce.innerHTML='';
  li.forEach(l=>{
    if(l.capDia<=0&&l.itensAlocados<=0) return;
    var sat7=G.linhaForecast&&G.linhaForecast[l.id]?G.linhaForecast[l.id].slice(0,7).filter(d=>d.util>90).length:0;
    var card=document.createElement('div');card.className='linha-card';
    card.innerHTML='<div class="linha-card-header"><div><div class="linha-nome">'+l.nome+'</div><div class="linha-cap">'+fN(l.capDia)+' sc/dia</div></div>'
      +'<div class="linha-status '+l.cor+'"><div class="linha-status-dot"></div>'+l.util+'%</div></div>'
      +'<div class="linha-body"><div class="linha-stats">'
      +'<div class="linha-stat"><div class="linha-stat-v">'+fN(Math.round(l.prog))+'</div><div class="linha-stat-l">OFA Prog.</div></div>'
      +'<div class="linha-stat"><div class="linha-stat-v '+(sat7>0?'num-o':'')+'">'+sat7+'d</div><div class="linha-stat-l">Sat. próx. 7d</div></div>'
      +'<div class="linha-stat"><div class="linha-stat-v">'+l.itensAlocados+'</div><div class="linha-stat-l">Itens</div></div>'
      +'</div><div class="linha-progress-bar"><div class="linha-progress-fill '+l.cor+'" style="width:'+Math.min(l.util,100)+'%"></div></div></div>';
    ce.appendChild(card);
  });
  var lb=el('linhas-body');lb.innerHTML='';
  li.forEach(l=>{var tr=document.createElement('tr');tr.innerHTML='<td><strong>'+l.nome+'</strong></td><td class="nr">'+fN(l.capDia)+'</td><td class="nr">'+fN(Math.round(l.prog))+'</td><td class="nr '+(l.atrasada>0?'num-o':'')+'">'+fN(Math.round(l.atrasada))+'</td><td class="nr"><span class="'+(l.util>90?'num-r':l.util>70?'num-a':'num-g')+'">'+l.util+'%</span></td><td class="nr">'+fN(Math.round(l.livre))+'</td><td><span class="linha-status '+l.cor+'" style="display:inline-flex"><span class="linha-status-dot"></span>'+l.cor.toUpperCase()+'</span></td><td>'+l.itensAlocados+'</td>';lb.appendChild(tr);});
  // Forecast table na aba linhas
  rLinhaForecast('linhas-forecast-table',14);
}

