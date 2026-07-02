/* ============================================================
   dashboard.js
   Renderização da página Dashboard principal: KPIs, tabela de rupturas previstas, ações urgentes e conflitos DC×OFA.
   ============================================================ */

/* ==============================================================
   DASHBOARD
   ============================================================== */
function rDash(){
  // Tabela de rupturas previstas
  var rupt=G.itens.filter(x=>x.DiasAteRuptura!==null).sort((a,b)=>a.DiasAteRuptura-b.DiasAteRuptura).slice(0,15);
  var b=el('dash-rupt-body');b.innerHTML='';
  rupt.forEach(it=>{
    var cor=it.DiasAteRuptura<=3?'num-r':it.DiasAteRuptura<=7?'num-o':'num-a';
    var tr=document.createElement('tr');tr.className=it.RowCls;tr.onclick=function(){openDetail(it);};
    tr.innerHTML='<td><code>'+it.Codigo+'</code></td><td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">'+it.Produto+'</td>'
      +'<td><span class="rupt-chip '+(it.DiasAteRuptura<=3?'c':it.DiasAteRuptura<=7?'w':'n')+'">⏰ '+it.DiasAteRuptura+'d · '+fmtDate(it.DataRuptura)+'</span></td>'
      +'<td class="nr">'+fN(Math.round(it.DispTotal))+'</td>'
      +'<td class="nr '+(it.DemandaDiaria>0?'':'')+'">'+( it.DemandaDiaria>0?it.DemandaDiaria.toFixed(0):'--')+'</td>'
      +'<td>'+ofaChip(it)+'</td>'
      +'<td>'+bdgCap(it.StatusCap)+'</td>';
    b.appendChild(tr);
  });
  if(!rupt.length) b.innerHTML='<tr><td colspan="7" class="empty">✅ Nenhuma ruptura prevista no horizonte</td></tr>';
  rAcoesUrgentes();rConflitos();rAlertas();
}

function rAlertas(){
  var box=el('alert-box');box.innerHTML='';
  var r3=G.itens.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura<=3).length;
  var r7=G.itens.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura>3&&x.DiasAteRuptura<=7).length;
  var confl=G.itens.filter(x=>x.ConflitoDCOFA).length;
  var atras=G.itens.filter(x=>x.OFAAtrasada>0).length;
  var urg=G.itens.filter(x=>x.StatusCap==='PRODUZIR URGENTE').length;
  var sat=G.linhaForecast?LINHAS_KEYS.filter(lk=>G.linhaForecast[lk]&&G.linhaForecast[lk].slice(0,7).some(d=>d.util>90)).length:0;
  if(r3>0) box.innerHTML+='<div class="alert alert-d"><div><div class="alert-title">🔴 '+r3+' item(s) com RUPTURA PREVISTA em ≤ 3 dias</div><div class="alert-body">Produção imediata obrigatória. Ver aba Projeção Temporal.</div></div></div>';
  if(r7>0) box.innerHTML+='<div class="alert alert-w"><div><div class="alert-title">🟡 '+r7+' item(s) com ruptura prevista em 4–7 dias</div><div class="alert-body">Programar produção esta semana.</div></div></div>';
  if(confl>0) box.innerHTML+='<div class="alert alert-d"><div><div class="alert-title">🚨 '+confl+' conflito(s) DC×OFA — pedido em risco antes da entrega da OFA</div><div class="alert-body">Negociar prazo com cliente ou antecipar produção.</div></div></div>';
  if(atras>0) box.innerHTML+='<div class="alert alert-w"><div><div class="alert-title">⏰ '+atras+' item(s) com OFA ATRASADA (Dt.Fim já vencida)</div><div class="alert-body">Verificar andamento e registrar produção no Focco.</div></div></div>';
  if(urg>0) box.innerHTML+='<div class="alert alert-i"><div><div class="alert-title">⚡ '+urg+' item(s) PRODUZIR URGENTE com capacidade disponível</div></div></div>';
  if(sat>0) box.innerHTML+='<div class="alert alert-w"><div><div class="alert-title">📊 '+sat+' linha(s) saturada(s) nos próximos 7 dias (>90%)</div><div class="alert-body">Ver Forecast de Linhas.</div></div></div>';
}

function rAcoesUrgentes(){
  var ul=el('urgente-list');ul.innerHTML='';
  var its=[...G.itens.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura<=7).sort((a,b)=>a.DiasAteRuptura-b.DiasAteRuptura).slice(0,4),
           ...G.itens.filter(x=>x.DataIdeal==='HOJE'&&(!x.DiasAteRuptura||x.DiasAteRuptura>7)).slice(0,3)];
  if(!its.length){ul.innerHTML='<div style="padding:14px;text-align:center;font-size:11px;color:var(--text3)">✅ Sem ações urgentes</div>';return;}
  its.forEach(it=>{
    var ic=it.DiasAteRuptura!==null&&it.DiasAteRuptura<=3?'🔴':it.DiasAteRuptura!==null&&it.DiasAteRuptura<=7?'🟡':'⚡';
    var sub=it.DiasAteRuptura!==null?'Ruptura em '+it.DiasAteRuptura+'d · '+fN(Math.round(it.NecessidadeProd))+'sc · '+it.LinhaRec:'Produzir hoje · '+fN(Math.round(it.NecessidadeProd))+'sc';
    ul.innerHTML+='<div class="urg-item" onclick="openDetail(G.itens.find(x=>x.Codigo===\''+it.Codigo+'\'))">'
      +'<div class="urg-icon d">'+ic+'</div><div><div class="urg-title">'+it.Codigo+' · '+it.Produto.substring(0,24)+'</div><div class="urg-sub">'+sub+'</div></div></div>';
  });
}

function rConflitos(){
  var cl=el('conflito-list');cl.innerHTML='';
  var its=G.itens.filter(x=>x.ConflitoDCOFA||x.OFAAtrasada>0).sort((a,b)=>b.Prioridade-a.Prioridade).slice(0,8);
  if(!its.length){cl.innerHTML='<div style="padding:14px;text-align:center;font-size:11px;color:var(--text3)">✅ Sem conflitos de data</div>';return;}
  its.forEach(it=>{
    var tipo=it.ConflitoDCOFA?'🚨 DC×OFA':'⏰ OFA Atras.';
    var desc=it.ConflitoDCOFA?'DC sem cob.· OFA entrega em '+it.DiasAteOFA+'d':'OFA vencida · '+fN(Math.round(it.OFAAtrasada))+'sc';
    cl.innerHTML+='<div class="urg-item" onclick="openDetail(G.itens.find(x=>x.Codigo===\''+it.Codigo+'\'))">'
      +'<div class="urg-icon d">⚠️</div><div><div class="urg-title">'+it.Codigo+' · '+it.Produto.substring(0,20)+' <span style="font-size:9px">'+tipo+'</span></div><div class="urg-sub">'+desc+'</div></div></div>';
  });
}

