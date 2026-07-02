/* ============================================================
   modals.js
   Modal de projeção individual por item e painel lateral de detalhamento (detail panel).
   ============================================================ */

/* ==============================================================
   MODAL DE PROJEÇÃO INDIVIDUAL
   ============================================================== */
function openProjModal(cod){
  var it=G.itens.find(x=>x.Codigo===cod);if(!it) return;
  el('proj-modal-title').textContent=it.Codigo+' · '+it.Produto;
  el('proj-modal').classList.add('open');
  // Gera gráfico
  var proj=it.Projecao;
  var labels=proj.map(p=>DIAS_PT[p.date.getDay()]+' '+p.date.getDate()+'/'+(p.date.getMonth()+1));
  var saldos=proj.map(p=>Math.max(p.saldoFim,0));
  var ofa=proj.map(p=>p.entradaOFA);
  var dc=proj.map(p=>p.saidaDC);
  var seg=proj.map(()=>it.EstoqueSeguranca);
  var ctx=el('proj-chart');
  if(G.charts['proj-chart']) G.charts['proj-chart'].destroy();
  G.charts['proj-chart']=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[
      {label:'Saldo Projetado',data:saldos,borderColor:'#1B5C7A',backgroundColor:'rgba(27,92,122,.08)',fill:true,tension:.3,borderWidth:2.5,pointRadius:3},
      {label:'Est. Segurança',data:seg,borderColor:'#B83232',borderDash:[4,4],borderWidth:1.5,pointRadius:0,fill:false},
      {label:'Entrada OFA',data:ofa,borderColor:'#5B3FA6',backgroundColor:'rgba(91,63,166,.12)',fill:true,tension:.2,borderWidth:1.5,pointRadius:2,type:'bar'},
      {label:'Saída DC',data:dc,borderColor:'#A0470A',backgroundColor:'rgba(160,71,10,.1)',fill:false,tension:.2,borderWidth:1,pointRadius:1,borderDash:[3,3]},
    ]},
    options:{plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.05)'},ticks:{font:{size:10}}},x:{grid:{display:false},ticks:{font:{size:9},maxRotation:45}}},responsive:true,maintainAspectRatio:false}
  });
  // Detalhe textual
  var rupt=it.RuptInfo;
  var detail='';
  if(rupt) detail+='<div style="background:var(--red-dim);color:var(--red);border:1px solid var(--red-mid);border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:11px"><strong>'+(rupt.tipo==='RUPTURA'?'🔴 Ruptura prevista':'⚠️ Abaixo do mínimo')+' em '+rupt.dias+' dias</strong> ('+fmtDate(rupt.data)+')</div>';
  detail+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:10px">'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:6px 8px"><div style="color:var(--text3)">Saldo Hoje</div><strong>'+fN(it.DispTotal)+'sc</strong></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:6px 8px"><div style="color:var(--text3)">Cons./Dia</div><strong>'+(it.DemandaDiaria>0?it.DemandaDiaria.toFixed(1)+'sc':'--')+'</strong></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:6px 8px"><div style="color:var(--text3)">OFA Prevista</div><strong>'+fN(Math.round(it.OFAHorizonte))+'sc</strong></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:6px 8px"><div style="color:var(--text3)">Nec. Produzir</div><strong>'+fN(Math.round(it.NecessidadeProd))+'sc</strong></div>'
    +'</div>';
  el('proj-modal-detail').innerHTML=detail;
}
function closeProjModal(){el('proj-modal').classList.remove('open');}


/* ==============================================================
   DETAIL PANEL
   ============================================================== */
function openDetail(it){
  if(!it) return;
  el('dp-title').textContent=it.Codigo+' · '+it.Produto;
  el('dp-sub').textContent='Risco: '+it.RiscoRuptura+' · Pri: '+it.Prioridade+'/100 · '+it.StatusCap;
  var cobPct=Math.min(it.CoberturasDias>=999?100:it.CoberturasDias/30*100,100);
  var cobCor=it.CoberturasDias<=2?'var(--red)':it.CoberturasDias<=7?'var(--yellow-mid)':'var(--green)';
  var cobLabel=it.CoberturasDias>=999?'∞':it.CoberturasDias.toFixed(1)+'d';
  var acoes='';
  if(it.RuptInfo){var rt=it.RuptInfo;acoes+='<div class="dp-action '+(rt.dias<=3?'critico':'urgente')+'"><div class="dp-action-icon">'+(rt.tipo==='RUPTURA'?'🔴':'⚠️')+'</div><div><div class="dp-action-text">'+(rt.tipo==='RUPTURA'?'RUPTURA':'ABAIXO DO MÍNIMO')+' em '+rt.dias+' dias ('+fmtDate(rt.data)+')</div><span class="dp-action-sub">Saldo projetado cai '+(rt.tipo==='RUPTURA'?'a zero':'abaixo do estoque de segurança')+' em '+rt.dias+' dia(s). Produzir antes de '+fmtDate(rt.data)+'.</span></div></div>';}
  if(it.ConflitoDCOFA) acoes+='<div class="dp-action critico"><div class="dp-action-icon">🚨</div><div><div class="dp-action-text">CONFLITO DC × OFA — OFA entrega em '+it.DiasAteOFA+'d</div><span class="dp-action-sub">DC sem cobertura de estoque. OFA entrega depois da necessidade.</span></div></div>';
  if(it.OFAAtrasada>0) acoes+='<div class="dp-action urgente"><div class="dp-action-icon">⏰</div><div><div class="dp-action-text">OFA ATRASADA — '+fN(Math.round(it.OFAAtrasada))+'sc</div><span class="dp-action-sub">Verificar andamento no Focco.</span></div></div>';
  if(it.OFAFora>0) acoes+='<div class="dp-action info"><div class="dp-action-icon">📅</div><div><div class="dp-action-text">OFA FORA DO HORIZONTE — '+fN(Math.round(it.OFAFora))+'sc</div><span class="dp-action-sub">NÃO abateu NecProd. Dt.Fim > '+HORIZONTE_OFA+'d. Avaliar antecipação.</span></div></div>';
  if(!it.RuptInfo&&it.RiscoRuptura==='OK') acoes+='<div class="dp-action ok"><div class="dp-action-icon">✅</div><div><div class="dp-action-text">COBERTO — sem ruptura prevista em '+HORIZONTE_PROJ+' dias</div><span class="dp-action-sub">'+it.Motivo+'</span></div></div>';
  // Projeção resumida (próximos 7 dias)
  var projHtml='<div class="dp-sec-title">Projeção de Estoque — próximos 7 dias</div><div style="display:flex;gap:4px;margin-bottom:8px">';
  (it.Projecao||[]).slice(0,7).forEach(p=>{
    var bg=p.ruptura?'var(--red-dim)':p.abaixoSeg?'var(--yellow-dim)':'var(--green-dim)';
    var col=p.ruptura?'var(--red)':p.abaixoSeg?'var(--yellow)':'var(--green)';
    projHtml+='<div style="flex:1;text-align:center;padding:5px 3px;background:'+bg+';border-radius:5px;font-family:var(--mono);font-size:9px;font-weight:700;color:'+col+'">'
      +'<div>'+DIAS_PT[p.date.getDay()]+'</div>'
      +'<div style="font-size:11px">'+( p.saldoFim<0?'0':p.saldoFim>9999?Math.round(p.saldoFim/1000)+'K':Math.round(p.saldoFim))+'</div>'
      +(p.entradaOFA>0?'<div>📦</div>':'')
      +'</div>';
  });
  projHtml+='</div>';
  // OFAs individuais
  var ofaDetHtml='';
  if(it.OFADetalhes&&it.OFADetalhes.length>0){
    ofaDetHtml='<div class="dp-sec-title" style="margin-top:12px">OFAs em Aberto</div>';
    it.OFADetalhes.forEach(det=>{
      var cc=det.situDt==='atrasada'?'atrasada':det.situDt==='fora'?'fora':det.situDt==='horizonte'?'horizonte':'semana';
      ofaDetHtml+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:10px">'
        +'<span style="font-family:var(--mono);color:var(--accent)">#'+det.ordem+'</span>'
        +'<strong>'+fN(Math.round(det.pend))+'sc</strong>'
        +'<span class="ofa-chip '+cc+'">'+det.situDt+'</span>'
        +(det.dtIni?'<span style="color:var(--text3)">Ini: '+fmtDate(det.dtIni)+'</span>':'')
        +(det.dtFim?'<span style="color:var(--text3)">Fim: '+fmtDate(det.dtFim)+(det.diasRest!==null?' ('+det.diasRest+'d)':'')+'</span>':'')
        +'</div>';
    });
  }
  el('dp-body').innerHTML=
    '<div class="dp-section"><div class="dp-sec-title">Recomendação PCP</div>'+acoes+'</div>'
    +'<div class="dp-section">'+projHtml+ofaDetHtml+'</div>'
    +'<div class="dp-section"><div class="dp-sec-title">Posição de Estoque</div>'
      +'<div class="dp-grid">'
        +'<div class="dp-stat"><div class="dp-stat-l">Almox 3</div><div class="dp-stat-v '+(it.Almox3<=0?'r':'g')+'">'+fN(it.Almox3)+'sc</div></div>'
        +'<div class="dp-stat"><div class="dp-stat-l">Almox 30</div><div class="dp-stat-v">'+fN(it.Almox30)+'sc</div></div>'
        +'<div class="dp-stat"><div class="dp-stat-l">Total Disp.</div><div class="dp-stat-v '+(it.DispTotal<=0?'r':it.DispTotal<it.EstoqueSeguranca?'a':'g')+'">'+fN(it.DispTotal)+'sc</div></div>'
        +'<div class="dp-stat"><div class="dp-stat-l">Est. Segurança</div><div class="dp-stat-v">'+fN(it.EstoqueSeguranca)+'sc</div></div>'
      +'</div>'
      +'<div style="margin-top:8px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">Cobertura atual: <strong>'+cobLabel+'</strong> · Consumo: <strong>'+(it.DemandaDiaria>0?it.DemandaDiaria.toFixed(1)+'sc/d':'sem DC')+'</strong></div>'
      +'<div style="height:8px;border-radius:4px;background:var(--bg4);overflow:hidden"><div style="height:100%;width:'+cobPct+'%;background:'+cobCor+'"></div></div></div>'
    +'</div>'
    +'<div class="dp-section"><div class="dp-sec-title">Necessidade de Produção</div>'
      +'<div class="dp-grid">'
        +'<div class="dp-stat"><div class="dp-stat-l">Pedido DC</div><div class="dp-stat-v '+(it.PedidoComercial>0?'o':'')+'">'+fN(it.PedidoComercial)+'sc</div></div>'
        +'<div class="dp-stat"><div class="dp-stat-l">Nec. Comercial</div><div class="dp-stat-v '+(it.NecComercial>0?'r':'')+'">'+fN(it.NecComercial)+'sc</div></div>'
        +'<div class="dp-stat"><div class="dp-stat-l">OFA ≤'+HORIZONTE_OFA+'d</div><div class="dp-stat-v p">'+fN(Math.round(it.OFAHorizonte))+'sc</div></div>'
        +'<div class="dp-stat"><div class="dp-stat-l">OFA >'+HORIZONTE_OFA+'d</div><div class="dp-stat-v" style="color:var(--purple)">'+fN(Math.round(it.OFAFora))+'sc</div></div>'
        +'<div class="dp-stat"><div class="dp-stat-l">Nec. Produzir</div><div class="dp-stat-v '+(it.NecessidadeProd>0?'r':'g')+'">'+fN(Math.round(it.NecessidadeProd))+'sc</div></div>'
        +'<div class="dp-stat"><div class="dp-stat-l">Cap./Dia · Linha</div><div class="dp-stat-v" style="font-size:12px">'+fN(it.CapacidadeDia)+'sc · '+it.LinhaRec+'</div></div>'
      +'</div>'
    +'</div>';
  el('detail-panel').classList.add('open');el('detail-overlay').classList.add('open');
}
function closeDetail(){el('detail-panel').classList.remove('open');el('detail-overlay').classList.remove('open');}

