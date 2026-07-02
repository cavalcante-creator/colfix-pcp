/* ============================================================
   estoque.js
   Análise PCP sênior de estoque (cobertura, giro, distribuição de risco) e páginas de Produção EPP / Ordens / Perfil (dados ERP).
   ============================================================ */

/* ==============================================================
   ESTOQUE — ANÁLISE PCP SÊNIOR (com DP do Perfil)
   ============================================================== */
var _estSortCol='risco',_estSortDir=1;

function popularSelectLinhasEst(){
  var sel=el('est-linha');if(!sel) return;
  sel.innerHTML='<option value="">Todas Linhas</option>';
  LINHAS_KEYS.forEach(k=>{var op=document.createElement('option');op.value=k;op.textContent=LINHAS_NOMES[k]||k;sel.appendChild(op);});
}

function resetFiltrosEst(){
  ['est-q','est-st','est-risco','est-cob','est-dp','est-linha'].forEach(id=>{var e=el(id);if(e) e.value='';});
  el('est-ord').value='risco';
  rEstoque();
}

function sortEst(col){
  if(_estSortCol===col) _estSortDir*=-1; else{_estSortCol=col;_estSortDir=1;}
  rEstoque();
}

function rEstoque(){
  var q=v('est-q').toLowerCase();
  var st=v('est-st');
  var risco=v('est-risco');
  var cobFiltro=v('est-cob');
  var dpFiltro=v('est-dp');
  var linhaFiltro=v('est-linha');
  var ord=v('est-ord')||'risco';

  var its=G.itens.filter(it=>{
    if(q&&!it.Codigo.toLowerCase().includes(q)&&!it.Produto.toLowerCase().includes(q)) return false;
    if(st==='SEM_EST'&&it.DispTotal>0) return false;
    if(st==='ABAIXO_SEG'&&(it.DispTotal>=it.EstoqueSeguranca||it.DispTotal<=0)) return false;
    if(st==='OK'&&it.DispTotal<it.EstoqueSeguranca) return false;
    if(risco&&it.RiscoRuptura!==risco) return false;
    if(cobFiltro==='0'&&it.CoberturasDias>0) return false;
    if(cobFiltro==='3'&&!(it.CoberturasDias>=0&&it.CoberturasDias<=3)) return false;
    if(cobFiltro==='7'&&!(it.CoberturasDias>=0&&it.CoberturasDias<=7)) return false;
    if(cobFiltro==='15'&&!(it.CoberturasDias>=0&&it.CoberturasDias<=15)) return false;
    if(cobFiltro==='30'&&!(it.CoberturasDias>=0&&it.CoberturasDias<=30)) return false;
    if(cobFiltro==='30+'&&it.CoberturasDias<=30) return false;
    if(dpFiltro==='com_dp'&&it.DemandaDiaria<=0) return false;
    if(dpFiltro==='sem_dp'&&it.DemandaDiaria>0) return false;
    if(dpFiltro==='dp_risco'&&!(it.PedidoComercial>0&&it.CoberturasDias<22)) return false;
    if(linhaFiltro&&!it.LinhasKeys.includes(linhaFiltro)) return false;
    return true;
  });

  // Ordenação
  its.sort((a,b)=>{
    var va,vb;
    switch(ord){
      case 'risco': var rm={'CRITICO':5,'URGENTE':4,'MODERADO':3,'BAIXO':2,'OK':1}; va=rm[a.RiscoRuptura]||0; vb=rm[b.RiscoRuptura]||0; return vb-va||(a.CoberturasDias-b.CoberturasDias);
      case 'cobertura_asc': va=a.CoberturasDias>=999?9999:a.CoberturasDias; vb=b.CoberturasDias>=999?9999:b.CoberturasDias; return va-vb;
      case 'cobertura_desc': va=a.CoberturasDias>=999?9999:a.CoberturasDias; vb=b.CoberturasDias>=999?9999:b.CoberturasDias; return vb-va;
      case 'estoque_desc': return b.DispTotal-a.DispTotal;
      case 'giro_desc': va=a.DemandaDiaria*30/(a.DispTotal||1); vb=b.DemandaDiaria*30/(b.DispTotal||1); return vb-va;
      case 'dp_desc': return b.PedidoComercial-a.PedidoComercial;
      case 'codigo': return a.Codigo.localeCompare(b.Codigo);
      default: return b.Prioridade-a.Prioridade;
    }
  });

  txt('est-cnt',its.length);

  // KPIs analíticos globais
  var kpiEl=el('est-kpis');
  if(kpiEl){
    var tot=G.itens.length;
    var sE=G.itens.filter(x=>x.DispTotal<=0).length;
    var aS=G.itens.filter(x=>x.DispTotal>0&&x.DispTotal<x.EstoqueSeguranca).length;
    var okE=G.itens.filter(x=>x.DispTotal>=x.EstoqueSeguranca).length;
    var comDp=G.itens.filter(x=>x.DemandaDiaria>0).length;
    var semDp=G.itens.filter(x=>x.DemandaDiaria<=0).length;
    var emRisco=G.itens.filter(x=>x.PedidoComercial>0&&x.CoberturasDias<22).length;
    var cobMedia=G.itens.filter(x=>x.DemandaDiaria>0).reduce((a,x)=>a+(x.CoberturasDias>=999?30:x.CoberturasDias),0)/(comDp||1);
    kpiEl.innerHTML=
      '<div class="kpi red"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></div><div class="kpi-val">'+sE+'</div><div class="kpi-label">Zerados</div><div class="kpi-sub">de '+tot+' itens</div></div>'
      +'<div class="kpi yellow"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg></div><div class="kpi-val">'+aS+'</div><div class="kpi-label">Abaixo Seg.</div><div class="kpi-sub">estoque insuficiente</div></div>'
      +'<div class="kpi green"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg></div><div class="kpi-val">'+okE+'</div><div class="kpi-label">Adequados</div><div class="kpi-sub">≥ estoque segurança</div></div>'
      +'<div class="kpi blue"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg></div><div class="kpi-val">'+cobMedia.toFixed(1)+'d</div><div class="kpi-label">Cobertura Média</div><div class="kpi-sub">itens com DC</div></div>'
      +'<div class="kpi orange"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/></svg></div><div class="kpi-val">'+emRisco+'</div><div class="kpi-label">DC em Risco</div><div class="kpi-sub">cob &lt; 22d com pedido</div></div>'
      +'<div class="kpi purple"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/></svg></div><div class="kpi-val">'+comDp+' / '+semDp+'</div><div class="kpi-label">Com / Sem DC</div><div class="kpi-sub">demanda do perfil</div></div>';
  }

  // Métricas resumo
  var metEl=el('est-met');
  if(metEl){
    var tE=its.reduce((a,x)=>a+x.DispTotal,0);
    var tDp=its.reduce((a,x)=>a+x.PedidoComercial,0);
    var tNec=its.reduce((a,x)=>a+x.NecessidadeProd,0);
    var tA3=its.reduce((a,x)=>a+x.Almox3,0);
    var tA30=its.reduce((a,x)=>a+x.Almox30,0);
    metEl.innerHTML=
      '<div class="mbox"><div class="mbox-l">Itens filtrados</div><div class="mbox-v">'+its.length+'</div></div>'
      +'<div class="mbox"><div class="mbox-l">Almox 3</div><div class="mbox-v">'+fN(Math.round(tA3))+'</div></div>'
      +'<div class="mbox"><div class="mbox-l">Almox 30</div><div class="mbox-v">'+fN(Math.round(tA30))+'</div></div>'
      +'<div class="mbox"><div class="mbox-l">Total Estoque</div><div class="mbox-v" style="color:var(--accent)">'+fN(Math.round(tE))+'</div></div>'
      +'<div class="mbox"><div class="mbox-l">Total DC (DP)</div><div class="mbox-v o">'+fN(Math.round(tDp))+'</div></div>'
      +'<div class="mbox"><div class="mbox-l">Nec. Produzir</div><div class="mbox-v '+(tNec>0?'r':'g')+'">'+fN(Math.round(tNec))+'</div></div>';
  }

  // Tabela principal
  var b=el('est-body');b.innerHTML='';
  its.forEach(it=>{
    // Status badge
    var sit=it.DispTotal<=0
      ?'<span class="bdg bdg-d">ZERADO</span>'
      :it.DispTotal<it.EstoqueSeguranca
        ?'<span class="bdg bdg-w">ABAIXO SEG</span>'
        :'<span class="bdg bdg-s">OK</span>';

    // Ruptura
    var ruptLabel=it.DiasAteRuptura!==null
      ?'<span class="rupt-chip '+(it.DiasAteRuptura<=3?'c':it.DiasAteRuptura<=7?'c':'w')+'">⏰ '+it.DiasAteRuptura+'d · '+fmtDate(it.DataRuptura)+'</span>'
      :'<span class="rupt-chip s">OK</span>';

    // Cobertura bar
    var cobDias=it.CoberturasDias>=999?999:it.CoberturasDias;
    var cobPct=Math.min(cobDias/30*100,100);
    var cobCor=cobDias<=3?'var(--red)':cobDias<=7?'var(--yellow-mid)':cobDias<=15?'var(--orange)':'var(--green)';
    var cobStr=cobDias>=999?'∞':cobDias.toFixed(1)+'d';
    var cobHtml='<div class="cob-bar-wrap"><div class="cob-bar"><div class="cob-bar-fill" style="width:'+cobPct+'%;background:'+cobCor+'"></div></div><div class="cov-val" style="color:'+cobCor+'">'+cobStr+'</div></div>';

    // Giro mensal = (DC mensal / estoque) — quantas vezes o estoque gira por mês
    var giroMes=it.DispTotal>0&&it.DemandaDiaria>0?(it.DemandaDiaria*22/it.DispTotal).toFixed(2):'--';
    var giroCls=giroMes==='--'?'zero':parseFloat(giroMes)>=1.5?'alto':parseFloat(giroMes)>=0.8?'med':'baixo';
    var giroHtml='<span class="giro-chip '+giroCls+'">'+(giroMes==='--'?'—':giroMes+'x')+'</span>';

    // DC (DP) — comparativo com cobertura
    var dpHtml='';
    if(it.PedidoComercial>0){
      var dpRisco=it.CoberturasDias<22&&it.PedidoComercial>0;
      dpHtml='<div class="dp-compare"><div class="dp-compare-val '+(dpRisco?'num-r':'')+'" title="Pedido DC do Perfil">'+fN(it.PedidoComercial)+'sc</div><div class="dp-compare-sub">'+(it.DemandaDiaria>0?it.DemandaDiaria.toFixed(1)+'sc/d':'')+'</div></div>';
    } else {
      dpHtml='<span style="color:var(--text4);font-size:10px">—</span>';
    }

    // OFA
    var ofaHtml='<span class="nr '+(it.OFAAtrasada>0?'num-o':'')+'">'
      +fN(Math.round(it.OFAHorizonte))
      +(it.OFAAtrasada>0?' <span title="OFA Atrasada" style="color:var(--orange)">⏰</span>':'')
      +'</span>';

    var tr=document.createElement('tr');
    tr.className=it.RowCls;
    tr.onclick=function(){openDetail(it);};
    tr.innerHTML=
      '<td><code style="font-size:10px">'+it.Codigo+'</code></td>'
      +'<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+it.Produto+'">'+it.Produto+'</td>'
      +'<td class="nr">'+fN(it.Almox3)+'</td>'
      +'<td class="nr">'+fN(it.Almox30)+'</td>'
      +'<td class="nr"><strong style="color:var(--accent)">'+fN(it.DispTotal)+'</strong></td>'
      +'<td class="nr" style="color:var(--text3)">'+fN(it.EstoqueSeguranca)+'</td>'
      +'<td class="nr">'+dpHtml+'</td>'
      +'<td>'+cobHtml+'</td>'
      +'<td class="nr">'+giroHtml+'</td>'
      +'<td>'+ofaHtml+'</td>'
      +'<td class="nr '+(it.NecessidadeProd>0?'num-r':'num-g')+'">'+fN(Math.round(it.NecessidadeProd))+'</td>'
      +'<td>'+ruptLabel+'</td>'
      +'<td>'+sit+'</td>';
    b.appendChild(tr);
  });
  if(!its.length) b.innerHTML='<tr><td colspan="13" class="empty">Nenhum item com os filtros selecionados.</td></tr>';

  // Distribuição por cobertura
  var distEl=el('est-dist-cob');
  if(distEl){
    var faixas=[
      {label:'Zerado (0d)',min:-1,max:0,cor:'var(--red)'},
      {label:'1–3 dias',min:0,max:3,cor:'var(--red)'},
      {label:'4–7 dias',min:3,max:7,cor:'var(--orange)'},
      {label:'8–15 dias',min:7,max:15,cor:'var(--yellow-mid)'},
      {label:'16–30 dias',min:15,max:30,cor:'var(--green)'},
      {label:'> 30 dias',min:30,max:99999,cor:'var(--accent)'},
    ];
    var maxQ=1;
    var counts=faixas.map(f=>{
      var c=G.itens.filter(it=>{
        if(f.min===-1) return it.DispTotal<=0;
        return it.CoberturasDias>f.min&&it.CoberturasDias<=f.max&&it.DispTotal>0;
      }).length;
      if(c>maxQ) maxQ=c;
      return c;
    });
    distEl.innerHTML=faixas.map((f,i)=>{
      var pct=maxQ>0?Math.round(counts[i]/maxQ*100):0;
      return '<div class="dist-bar-row">'
        +'<div class="dist-bar-label">'+f.label+'</div>'
        +'<div class="dist-bar-outer"><div class="dist-bar-inner" style="width:'+pct+'%;background:'+f.cor+'">'+( pct>15?counts[i]:'')+'</div></div>'
        +'<div class="dist-bar-count" style="color:'+f.cor+'">'+counts[i]+'</div>'
        +'</div>';
    }).join('');
  }

  // Distribuição por linha
  var distLEl=el('est-dist-linha');
  if(distLEl){
    var linhasData=LINHAS_KEYS.map(lk=>{
      var itensLinha=G.itens.filter(it=>it.LinhasKeys.includes(lk));
      var emRiscoL=itensLinha.filter(it=>it.RiscoRuptura==='CRITICO'||it.RiscoRuptura==='URGENTE').length;
      return{nome:LINHAS_NOMES[lk]||lk,total:itensLinha.length,risco:emRiscoL};
    }).filter(x=>x.total>0);
    var maxL=Math.max(...linhasData.map(x=>x.total),1);
    distLEl.innerHTML=linhasData.map(l=>{
      var pct=Math.round(l.total/maxL*100);
      var pctR=l.total>0?Math.round(l.risco/l.total*100):0;
      var cor=pctR>30?'var(--red)':pctR>10?'var(--orange)':'var(--green)';
      return '<div class="dist-bar-row">'
        +'<div class="dist-bar-label" style="font-size:9px">'+l.nome+'</div>'
        +'<div class="dist-bar-outer"><div class="dist-bar-inner" style="width:'+pct+'%;background:'+cor+'">'+( pct>15?l.total:'')+'</div></div>'
        +'<div class="dist-bar-count" style="color:var(--text2)">'+l.total+' <span style="font-size:9px;color:'+cor+'">'+( l.risco>0?'⚠'+l.risco:'')+'</span></div>'
        +'</div>';
    }).join('')||'<div style="color:var(--text4);font-size:11px">Nenhuma linha mapeada</div>';
  }

  // Top riscos (DC × Estoque)
  var topEl=el('est-top-risk');
  if(topEl){
    var topRisk=G.itens
      .filter(it=>it.PedidoComercial>0)
      .sort((a,b)=>{
        var ra={'CRITICO':4,'URGENTE':3,'MODERADO':2,'BAIXO':1,'OK':0};
        return (ra[b.RiscoRuptura]||0)-(ra[a.RiscoRuptura]||0)||(a.CoberturasDias-b.CoberturasDias);
      }).slice(0,10);

    if(!topRisk.length){topEl.innerHTML='<div class="empty">✅ Sem itens com DC em risco</div>';return;}
    topEl.innerHTML=topRisk.map((it,i)=>{
      var cobDp=it.DemandaDiaria>0?it.CoberturasDias:0;
      var cobPctBar=Math.min(cobDp/30*100,100);
      var estPctBar=it.EstoqueSeguranca>0?Math.min(it.DispTotal/it.EstoqueSeguranca*100,200):0;
      var cobCor=cobDp<=3?'var(--red)':cobDp<=7?'var(--orange)':cobDp<=15?'var(--yellow-mid)':'var(--green)';
      return '<div class="risk-item" onclick="openDetail(G.itens.find(x=>x.Codigo===\''+it.Codigo+'\'))">'
        +'<div class="risk-rank">#'+(i+1)+'</div>'
        +'<div class="risk-info">'
          +'<div style="display:flex;align-items:center;gap:6px"><div class="risk-code">'+it.Codigo+'</div>'+bdgRisco(it.RiscoRuptura)+'</div>'
          +'<div class="risk-name">'+it.Produto+'</div>'
          +'<div class="risk-detail">DC: <strong>'+fN(it.PedidoComercial)+'sc</strong> · Cob: <strong style="color:'+cobCor+'">'+(cobDp>=999?'∞':cobDp.toFixed(1)+'d')+'</strong> · '+it.LinhaRec+'</div>'
        +'</div>'
        +'<div class="risk-meters">'
          +'<div class="risk-meter-row"><div class="risk-meter-label">Cobertura</div><div class="risk-meter-bar"><div class="risk-meter-fill" style="width:'+cobPctBar+'%;background:'+cobCor+'"></div></div></div>'
          +'<div class="risk-meter-row"><div class="risk-meter-label">vs Seg.</div><div class="risk-meter-bar"><div class="risk-meter-fill" style="width:'+Math.min(estPctBar,100)+'%;background:'+(estPctBar<100?'var(--red)':'var(--green)')+'"></div></div></div>'
        +'</div>'
        +(it.DiasAteRuptura!==null?'<span class="rupt-chip '+(it.DiasAteRuptura<=7?'c':'w')+'" style="flex-shrink:0">⏰ '+it.DiasAteRuptura+'d</span>':'')
        +'</div>';
    }).join('');
  }
}

function expCSVEstoque(){
  var its=G.itens.sort((a,b)=>b.Prioridade-a.Prioridade);
  var hdr=['Codigo','Produto','Almox3','Almox30','DispTotal','EstoqueSeguranca','PedidoComercial','DemandaDiaria','CoberturasDias','GiroMensal','OFAHorizonte','OFAFora','OFAAtrasada','NecessidadeProd','RiscoRuptura','DiasAteRuptura','DataRuptura','TipoRuptura','LinhaProducao','StatusCap','Prioridade'];
  var rows=[hdr.join(',')];
  its.forEach(it=>{
    var giro=it.DispTotal>0&&it.DemandaDiaria>0?(it.DemandaDiaria*22/it.DispTotal).toFixed(2):'0';
    rows.push([csvEsc(it.Codigo),csvEsc(it.Produto),csvEsc(it.Almox3),csvEsc(it.Almox30),csvEsc(it.DispTotal),csvEsc(it.EstoqueSeguranca),csvEsc(it.PedidoComercial),csvEsc(it.DemandaDiaria.toFixed(2)),csvEsc(it.CoberturasDias>=999?'INF':it.CoberturasDias.toFixed(1)),csvEsc(giro),csvEsc(Math.round(it.OFAHorizonte)),csvEsc(Math.round(it.OFAFora)),csvEsc(Math.round(it.OFAAtrasada)),csvEsc(Math.round(it.NecessidadeProd)),csvEsc(it.RiscoRuptura),csvEsc(it.DiasAteRuptura||''),csvEsc(fmtDate(it.DataRuptura)),csvEsc(it.TipoRuptura||'OK'),csvEsc(it.LinhaProducao),csvEsc(it.StatusCap),csvEsc(it.Prioridade)].join(','));
  });
  dlCSV('estoque_analise_pcp.csv',rows.join('\n'));
}


/* ==============================================================
   PRODUÇÃO EPP / ORDENS / PERFIL
   ============================================================== */
function rProdReal(){var q=v('prod-q').toLowerCase();var rows=G.epp.filter(r=>!q||r.Codigo.toLowerCase().includes(q)||r.Produto.toLowerCase().includes(q));txt('prod-cnt',rows.length);var b=el('prod-body');b.innerHTML='';rows.forEach(r=>{var tr=document.createElement('tr');tr.innerHTML='<td>'+r.Data+'</td><td><code>'+r.Codigo+'</code></td><td>'+r.Produto+'</td><td class="nr">'+fN(r.Quantidade)+'</td>';b.appendChild(tr);});}

function rOrdens(){
  var q=v('ord-q').toLowerCase(),filtSit=v('ord-sit');
  var HOJE=hoje0(),hz2=addDias(HOJE,HORIZONTE_OFA);
  var rows=G.ordens.filter(r=>{
    var cod=s(r['Cod. Item']||r['_col3']||''),sit=s(r['Situacao']||r['_col8']||'').toLowerCase();
    var tipo=s(r['Tipo']||r['_col2']||'').toUpperCase();
    var aberta=(sit==='liberada'||sit==='aberta'||sit==='em aberto'||sit==='parcial'||sit==='');
    if(!aberta||(tipo!=='OFA'&&tipo!=='OFP')) return false;
    if(q&&!cod.toLowerCase().includes(q)&&!s(r['Descricao']||r['_col4']||'').toLowerCase().includes(q)) return false;
    var dtFim=parseDate(s(r['Dt. Fim']||r['_col7']||''));
    if(filtSit==='atrasada'&&!(dtFim&&dtFim<HOJE)) return false;
    if(filtSit==='semana'){var em7=addDias(HOJE,7);if(!(dtFim&&dtFim>=HOJE&&dtFim<=em7)) return false;}
    if(filtSit==='horizonte'&&!(dtFim&&dtFim>=HOJE&&dtFim<=hz2)) return false;
    if(filtSit==='fora'&&!(dtFim&&dtFim>hz2)) return false;
    return true;
  });
  txt('ord-cnt',rows.length);var b=el('ord-body');b.innerHTML='';
  rows.forEach(r=>{
    var dtFim=parseDate(s(r['Dt. Fim']||r['_col7']||'')),dtIni=parseDate(s(r['Dt. Inicio']||r['_col6']||''));
    var dias=dtFim?difDias(HOJE,dtFim):null;
    var hz2=addDias(HOJE,HORIZONTE_OFA),em7=addDias(HOJE,7);
    var situDt='semdata',situDtHtml='<span class="ofa-chip semdata">sem data</span>';
    if(dtFim){if(dtFim<HOJE){situDt='atrasada';situDtHtml='<span class="ofa-chip atrasada">⏰ '+Math.abs(dias)+'d atraso</span>';}else if(dtFim<=em7){situDt='semana';situDtHtml='<span class="ofa-chip semana">Esta sem. ('+dias+'d)</span>';}else if(dtFim<=hz2){situDt='horizonte';situDtHtml='<span class="ofa-chip horizonte">'+dias+'d</span>';}else{situDt='fora';situDtHtml='<span class="ofa-chip fora">'+dias+'d (fora)</span>';}}
    var tr=document.createElement('tr');
    tr.innerHTML='<td>'+s(r['Ordem']||r['_col0'])+'</td><td>'+s(r['Tipo']||r['_col2'])+'</td><td><code>'+s(r['Cod. Item']||r['_col3'])+'</code></td><td>'+s(r['Descricao']||r['_col4'])+'</td><td>'+fmtDate(dtIni)+'</td><td>'+fmtDate(dtFim)+'</td><td>'+s(r['Situacao']||r['_col8'])+'</td><td>'+situDtHtml+'</td><td class="nr">'+fN(n(r['Qtde']||r['_col9']))+'</td><td class="nr">'+fN(n(r['Qtde. Pendente']||r['_col10']))+'</td><td class="nr '+(dias!==null&&dias<0?'num-r':dias!==null&&dias<=7?'num-a':'')+'">'+( dias!==null?dias+'d':'--')+'</td>';
    b.appendChild(tr);
  });
  if(!rows.length) b.innerHTML='<tr><td colspan="11" class="empty">Nenhuma OFA</td></tr>';
}

function rPerfil(){var q=v('perf-q').toLowerCase();var rows=G.perfil.filter(r=>!q||s(r['Item']||r['_col1']||'').toLowerCase().includes(q));txt('perf-cnt',rows.length);var b=el('perf-body');b.innerHTML='';rows.slice(0,120).forEach(r=>{var tr=document.createElement('tr');tr.innerHTML='<td>'+s(r['Data Relatorio']||r['_col0'])+'</td><td>'+s(r['Item']||r['_col1'])+'</td><td>'+s(r['Tipo']||r['_col2'])+'</td><td>'+s(r['Referencia']||r['_col3'])+'</td><td>'+s(r['Data Inicio']||r['_col4'])+'</td><td>'+s(r['Data Fim']||r['_col5'])+'</td><td class="nr">'+fN(n(r['Quantidade']||r['_col6']))+'</td>';b.appendChild(tr);});}

