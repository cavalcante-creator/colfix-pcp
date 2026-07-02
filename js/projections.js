/* ============================================================
   projections.js
   Motor de projeção temporal (saldo dia a dia) e renderização da página Projeção Temporal (KPIs, timeline heatmap).
   ============================================================ */

/* ==============================================================
   MOTOR DE PROJEÇÃO TEMPORAL
   ============================================================== */
function calcProjecao(cod,dispTotal,estSeg,demDiaria,ofaDiasMapCod,horizonte){
  var HOJE=hoje0();
  var saldo=dispTotal;
  var proj=[];
  for(var d=0;d<horizonte;d++){
    var date=addDias(HOJE,d);var dk=isoDate(date);
    var util=isDiaUtil(date);
    var entradaOFA=ofaDiasMapCod[dk]||0;
    var saidaDC=util&&demDiaria>0?demDiaria:0;
    var saldoInicio=saldo;
    var saldoFim=saldoInicio+entradaOFA-saidaDC;
    saldo=Math.max(saldoFim,0); // não acumula negativo
    proj.push({d,date,dk,util,entradaOFA,saidaDC,saldoInicio,saldoFim,
      abaixoSeg:saldoFim<estSeg&&estSeg>0,ruptura:saldoFim<=0,
      excesso:estSeg>0&&saldoFim>estSeg*3});
  }
  return proj;
}

function findRupturaDate(proj,estSeg){
  for(var i=0;i<proj.length;i++){
    if(proj[i].ruptura) return{dias:i+1,tipo:'RUPTURA',data:proj[i].date};
    if(proj[i].abaixoSeg&&estSeg>0) return{dias:i+1,tipo:'ABAIXO_SEG',data:proj[i].date};
  }
  return null;
}


/* ==============================================================
   PROJEÇÃO TEMPORAL — página principal preditiva
   ============================================================== */
function rProjecao(){
  var q=v('proj-q').toLowerCase(),filtro=v('proj-filtro');
  var its=G.itens.filter(it=>{
    if(q&&!it.Codigo.toLowerCase().includes(q)&&!it.Produto.toLowerCase().includes(q)) return false;
    if(filtro==='ruptura'&&!it.DiasAteRuptura) return false;
    if(filtro==='abaixo'&&it.TipoRuptura!=='ABAIXO_SEG') return false;
    if(filtro==='ok'&&it.DiasAteRuptura) return false;
    return true;
  }).sort((a,b)=>{
    var ar=a.DiasAteRuptura!==null?a.DiasAteRuptura:999;
    var br=b.DiasAteRuptura!==null?b.DiasAteRuptura:999;
    if(ar!==br) return ar-br;
    return b.Prioridade-a.Prioridade;
  }).slice(0,30); // max 30 para performance

  // KPIs da projeção
  var pkel=el('proj-kpis');
  if(pkel){
    var r3=G.itens.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura<=3).length;
    var r7=G.itens.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura>3&&x.DiasAteRuptura<=7).length;
    var r14=G.itens.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura>7&&x.DiasAteRuptura<=14).length;
    var ok=G.itens.filter(x=>!x.DiasAteRuptura).length;
    pkel.innerHTML=
      '<div class="kpi red"><div class="kpi-val">'+r3+'</div><div class="kpi-label">Ruptura ≤3 dias</div></div>'
      +'<div class="kpi orange"><div class="kpi-val">'+r7+'</div><div class="kpi-label">Ruptura 4–7 dias</div></div>'
      +'<div class="kpi yellow"><div class="kpi-val">'+r14+'</div><div class="kpi-label">Ruptura 8–14 dias</div></div>'
      +'<div class="kpi green"><div class="kpi-val">'+ok+'</div><div class="kpi-label">Cobertos ('+HORIZONTE_PROJ+'d)</div></div>';
  }

  // Gerar heatmap da timeline
  var HOJE=hoje0();
  var dias=gerarDias(HORIZONTE_PROJ);
  var tbl=el('timeline-table');tbl.innerHTML='';

  // Cabeçalho
  var thead=document.createElement('thead');
  var tr0=document.createElement('tr');
  tr0.innerHTML='<th style="text-align:left;min-width:150px;position:sticky;left:0;z-index:3;background:var(--bg4)">Item</th>'
    +'<th style="min-width:70px">Ruptura</th><th style="min-width:60px">Cob. Hoje</th>';
  dias.forEach((d,i)=>{
    var isHoje=(i===0);
    var dw=DIAS_PT[d.getDay()];
    var label=dw+' '+d.getDate()+'/'+(d.getMonth()+1);
    tr0.innerHTML+='<th class="'+(isHoje?'hoje':'')+'">'+label+'</th>';
  });
  thead.appendChild(tr0);tbl.appendChild(thead);

  var tbody=document.createElement('tbody');
  its.forEach(it=>{
    var tr=document.createElement('tr');
    // Sparkline inline
    var spark=sparklineSVG(it.Projecao,60,20);
    var ruptLabel=it.DiasAteRuptura!==null?'<span class="rupt-chip '+(it.DiasAteRuptura<=3?'c':it.DiasAteRuptura<=7?'w':'n')+'">'+it.DiasAteRuptura+'d</span>':'<span class="rupt-chip s">OK</span>';
    var cobLabel=covChip(it.CoberturasDias);
    var cellsHTML='<td class="tl-item-cell" style="position:sticky;left:0;z-index:2;background:var(--bg2)" onclick="openDetail(it)">'
      +'<div class="tl-cod">'+it.Codigo+'</div>'
      +'<div class="tl-nome">'+it.Produto.substring(0,18)+'</div>'
      +'<div style="margin-top:3px">'+spark+'</div>'
      +'</td>'
      +'<td style="text-align:center;padding:4px">'+ruptLabel+'</td>'
      +'<td style="text-align:center;padding:4px">'+cobLabel+'</td>';

    dias.forEach((d,di)=>{
      var proj=it.Projecao[di];
      if(!proj){cellsHTML+='<td class="tl-cell"><div class="tl-cell-inner"><div class="tl-saldo">--</div></div></td>';return;}
      var cls=proj.ruptura?'ruptura':proj.abaixoSeg?'abaixo':proj.excesso?'excesso':'ok';
      if(!proj.ruptura&&!proj.abaixoSeg&&proj.saldoFim<it.EstoqueSeguranca*1.5&&proj.saldoFim>0) cls='critico';
      var dispVal=proj.saldoFim<=0?'0':proj.saldoFim>9999?fN(Math.round(proj.saldoFim/1000))+'K':fN(Math.round(proj.saldoFim));
      var icon=proj.ruptura?'🔴':proj.abaixoSeg?'⚠️':proj.entradaOFA>0?'📦':'';
      cellsHTML+='<td class="tl-cell '+cls+'" onclick="openProjModal(\''+it.Codigo+'\')" title="'+it.Codigo+' · '+fmtDate(d)+' · Saldo: '+fN(Math.round(proj.saldoFim))+'sc">'
        +'<div class="tl-cell-inner"><div class="tl-saldo">'+dispVal+'</div><div class="tl-label">'+icon+'</div></div></td>';
    });
    tr.innerHTML=cellsHTML;
    tbody.appendChild(tr);
  });
  if(!its.length) tbody.innerHTML='<tr><td colspan="'+(3+HORIZONTE_PROJ)+'" class="empty">Nenhum item encontrado</td></tr>';
  tbl.appendChild(tbody);

  // Heatmap de linhas
  rLinhaForecast('lf-table',14);
}

function sparklineSVG(proj,w,h){
  if(!proj||!proj.length) return '';
  var vals=proj.map(p=>Math.max(p.saldoFim,0));
  var maxV=Math.max(...vals,1);
  var pts=vals.map(function(v,i){return((i/(vals.length-1||1))*w)+','+(h-((v/maxV)*(h-2))+1);}).join(' ');
  var hasRupt=proj.some(p=>p.ruptura);
  var col=hasRupt?'#B83232':proj.some(p=>p.abaixoSeg)?'#D4A017':'#2D7D46';
  return '<svg class="spark" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="1.5" stroke-linejoin="round"/></svg>';
}

function rLinhaForecast(tableId,dias){
  var HOJE=hoje0();
  var tbl=el(tableId);if(!tbl||!G.linhaForecast) return;tbl.innerHTML='';
  var thead=document.createElement('thead');var tr0=document.createElement('tr');
  tr0.innerHTML='<th style="text-align:left;min-width:120px">Linha / Cap.</th>';
  for(var d=0;d<dias;d++){
    var date=addDias(HOJE,d);var isHoje=(d===0);
    tr0.innerHTML+='<th class="'+(isHoje?'hoje':'')+'" style="min-width:52px">'+DIAS_PT[date.getDay()]+' '+date.getDate()+'/'+(date.getMonth()+1)+'</th>';
  }
  thead.appendChild(tr0);tbl.appendChild(thead);
  var tbody=document.createElement('tbody');
  LINHAS_KEYS.forEach(lk=>{
    var li=G.linhasInfo.find(l=>l.id===lk);if(!li||li.capDia<=0) return;
    var tr=document.createElement('tr');
    var cells='<td class="lf-label">'+li.nome+'<div style="font-size:9px;color:var(--text3);font-family:var(--font)">'+(li.capDia>0?fN(li.capDia)+' sc/d':'')+'</div></td>';
    var fc=G.linhaForecast[lk]||[];
    for(var di=0;di<dias;di++){
      var entry=fc[di]||{util:0,ofa:0,cap:0};
      var bg=entry.util<=0?'':entry.util<=70?'#E8F5ED':entry.util<=90?'#FFF8E1':'#FDEAEA';
      var col=entry.util<=0?'var(--text4)':entry.util<=70?'var(--green)':entry.util<=90?'var(--yellow)':'var(--red)';
      cells+='<td class="sat-cell" style="background:'+bg+';color:'+col+'">'+(entry.util>0?entry.util+'%':'–')+'</td>';
    }
    tr.innerHTML=cells;tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
}

