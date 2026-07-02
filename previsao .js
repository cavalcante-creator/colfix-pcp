/* ============================================================
   previsao.js
   Página PREVISÃO — modelo mensal (Previsto x Estoque x Produzido x
   Faturado), com filtros, KPIs, status inteligente, cobertura de
   estoque e exportação CSV/Excel. Reescrita conforme solicitado —
   NÃO altera PCP, Projeção Temporal, Dashboard, OFAs, Linhas,
   Estoque, outras exportações, filtros de outras páginas ou CSS
   global. Todas as classes CSS usadas aqui já existem no sistema
   (kpi, srow/sinput/ssel, twrap/table, bdg, ader-bar) — nenhum CSS
   novo foi necessário.
   ============================================================ */

/* ==============================================================
   ESTADO PRÓPRIO DA PÁGINA (não conflita com G existente)
   ============================================================== */
G.historicoEstoque = G.historicoEstoque || [];
G.histPrevisao     = G.histPrevisao     || [];
G.prevMensal       = G.prevMensal       || [];
G._prevCarregando  = false;

/* ==============================================================
   CARREGAMENTO DOS DADOS EXTRAS
   HISTORICO_ESTOQUE e HIST_PREVISAO não fazem parte do fluxo
   principal (ABAS/processar, em state.js/api.js/pcp.js) — só a
   página Previsão precisa delas. Reaproveita fetchAba()/parseCSV()
   já existentes em api.js, sem tocar no pipeline principal.
   ============================================================== */
function carregarDadosPrevisaoExtra(){
  if(G._prevCarregando) return;
  G._prevCarregando = true;
  var b = el('prev-body');
  if(b) b.innerHTML = '<tr><td colspan="13" class="empty">Carregando dados de previsão mensal...</td></tr>';
  Promise.all([fetchAba('HISTORICO_ESTOQUE'), fetchAba('HIST_PREVISAO')])
    .then(function(r){
      G.historicoEstoque = r[0] || [];
      G.histPrevisao     = r[1] || [];
      // Espera o carregamento principal (G.saldo/CAPACIDADE/PARAMETROS/LINHAS/EXTRATO)
      // terminar, para não montar Produto/UM/Linha vazios por causa de corrida
      // entre os dois carregamentos independentes.
      aguardarDadosBase(function(){
        processarPrevisaoMensal();
        popularFiltrosPrevisao();
        rPrevisao();
      });
    })
    .catch(function(e){
      console.warn('Erro ao carregar HISTORICO_ESTOQUE / HIST_PREVISAO:', e);
      var b2 = el('prev-body');
      if(b2) b2.innerHTML = '<tr><td colspan="13" class="empty">Erro ao carregar dados de previsão mensal. Verifique se as abas HISTORICO_ESTOQUE e HIST_PREVISAO estão publicadas na planilha.</td></tr>';
    });
}
function aguardarDadosBase(cb, tentativas){
  tentativas = tentativas || 0;
  if(G.rawData || tentativas > 100){ cb(); return; }
  setTimeout(function(){ aguardarDadosBase(cb, tentativas + 1); }, 150);
}

/* ==============================================================
   PROCESSAMENTO — monta G.prevMensal (1 linha por Código + Competência)
   ============================================================== */
function compYYYYMM(str){
  str = s(str);
  if(!str) return '';
  if(/^\d{4}-\d{2}/.test(str)) return str.substring(0,7); // formato AAAA-MM (ex.: HISTORICO_ESTOQUE)
  var mmYYYY = str.match(/^(\d{1,2})\/(\d{4})$/); // formato MM/AAAA (ex.: HIST_PREVISAO)
  if(mmYYYY) return mmYYYY[2]+'-'+mmYYYY[1].padStart(2,'0');
  var d = parseDate(str);
  if(d) return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  return '';
}

function processarPrevisaoMensal(){
  /* ---- Produto / UM / Linha por código (reaproveita dados já carregados) ---- */
  var prodMap={}, umMap={}, linhaMap={};
  (G.capacidadeAba||[]).forEach(function(r){
    var cod=s(r['CODIGO']||r['Codigo']||r['_col0']||'');
    if(!cod) return;
    var desc=s(r['DESCRIÇÃO']||r['Descrição']||r['PRODUTO']||r['_col1']||'');
    if(desc) prodMap[cod]=desc;
  });
  (G.saldo||[]).forEach(function(r){
    var cod=s(r['Código']||r['Codigo']||r['_col0']||'');
    if(cod && !prodMap[cod]) prodMap[cod]=s(r['Descrição']||r['Descricao']||r['_col1']||'');
  });
  (G.parametros||[]).forEach(function(r){
    var cod=s(r['Cod. Item']||r['Codigo']||r['_col0']||'');
    if(!cod) return;
    var um=s(r['UM']||r['UNIDADE_MEDIDA']||r['_col2']||'');
    if(um) umMap[cod]=um;
  });
  (G.linhasAba||[]).forEach(function(r){
    var cod=s(r['CODIGO']||r['Codigo']||r['_col0']||'');
    if(!cod) return;
    var lk=null;
    LINHAS_KEYS.forEach(function(k){ if(!lk && ehTrue(r[k]||'')) lk=k; });
    if(lk) linhaMap[cod]=lk;
  });

  /* ---- Estoque INICIAL por Código+Competência (HISTORICO_ESTOQUE) ----
     A aba HISTORICO_ESTOQUE registra o saldo com que o item COMEÇOU
     cada mês (estoque de abertura), não o saldo do dia. Por isso a
     busca é sempre pela Competência exata do mês da linha; só cai no
     "mês anterior mais recente" se aquele mês específico não tiver
     registro (para não deixar o item sem estoque inicial nenhum). */
  var estoquePorItem={}; // cod -> [{comp,valor}] ordenado por competência
  (G.historicoEstoque||[]).forEach(function(r){
    var cod=s(r['Código']||r['Codigo']||r['_col1']||'');
    if(!cod) return;
    var comp=compYYYYMM(s(r['Competência']||r['Competencia']||r['_col0']||''));
    if(!comp) return;
    var val=n(r['Almox 3']||r['_col3']||0)+n(r['Almox 30']||r['_col4']||0);
    if(!estoquePorItem[cod]) estoquePorItem[cod]=[];
    estoquePorItem[cod].push({comp:comp,valor:val});
  });
  Object.keys(estoquePorItem).forEach(function(cod){
    estoquePorItem[cod].sort(function(a,b){ return a.comp<b.comp?-1:(a.comp>b.comp?1:0); });
  });
  function estoqueNaCompetencia(cod,comp){
    var arr=estoquePorItem[cod];
    if(!arr||!arr.length) return 0;
    var exato=arr.find(function(x){ return x.comp===comp; });
    if(exato) return exato.valor;
    var anteriores=arr.filter(function(x){ return x.comp<comp; });
    if(anteriores.length) return anteriores[anteriores.length-1].valor;
    return 0;
  }

  /* ---- Previsto por Código+Competência (HIST_PREVISAO) — soma, evita duplicar ---- */
  var prevPorItemComp={};
  (G.histPrevisao||[]).forEach(function(r){
    var cod=s(r['Item']||r['Codigo']||r['_col1']||'');
    if(!cod) return; // ignora itens sem código
    var comp=compYYYYMM(s(r['Competencia']||r['Competência']||r['_col0']||''));
    if(!comp) return;
    var prev=n(r['Previsto']||r['_col3']||0);
    var key=cod+'|'+comp;
    prevPorItemComp[key]=(prevPorItemComp[key]||0)+prev;
    if(!umMap[cod]){ var umAlt=s(r['UM']||r['_col2']||''); if(umAlt) umMap[cod]=umAlt; }
  });

  /* ---- Faturado (NFS) e Produzido (EPP) por Código+Competência (EXTRATO) ---- */
  var fatPorItemComp={}, prodPorItemComp={};
  (G.extrato||[]).forEach(function(r){
    var cod=s(r['Cod. Item']||r['_col12']||'');
    if(!cod) return;
    var tipo=s(r['Sigla']||r['Tipo']||r['_col3']||'').toUpperCase();
    if(tipo!=='NFS' && tipo!=='EPP') return;
    var dt=parseDate(s(r['Data']||r['_col1']||''));
    if(!dt) return;
    var comp=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');
    var qtd=Math.abs(n(r['Qtde']||r['_col5']||0));
    var key=cod+'|'+comp;
    if(tipo==='NFS') fatPorItemComp[key]=(fatPorItemComp[key]||0)+qtd;
    else              prodPorItemComp[key]=(prodPorItemComp[key]||0)+qtd;
  });

  /* ---- Monta 1 linha por Código+Competência com previsão registrada ---- */
  var HOJE=hoje0();
  var compAtual=HOJE.getFullYear()+'-'+String(HOJE.getMonth()+1).padStart(2,'0');
  var ultimoDiaMes=new Date(HOJE.getFullYear(),HOJE.getMonth()+1,0).getDate();
  var diasRestMes=ultimoDiaMes-HOJE.getDate();

  var out=[];
  Object.keys(prevPorItemComp).forEach(function(key){
    var p=key.split('|'), cod=p[0], comp=p[1];
    if(!cod) return;
    var previsto=prevPorItemComp[key]||0;
    var estoqueAtual=estoqueNaCompetencia(cod,comp);
    var faturado=fatPorItemComp[key]||0;
    var produzido=prodPorItemComp[key]||0;
    var necProducao=Math.max(previsto-estoqueAtual-produzido,0);
    var saldoFaturar=Math.max(previsto-faturado,0);
    var atendPct=previsto>0?Math.min(faturado/previsto*100,100):0;
    var prodPct=previsto>0?Math.min(produzido/previsto*100,100):0;
    var coberturaRaz=previsto>0?(estoqueAtual+produzido)/previsto:((estoqueAtual+produzido)>0?999:0);
    var coberturaSt=coberturaRaz>=1.5?'excesso':coberturaRaz>=1?'adequado':coberturaRaz>=0.5?'baixo':'critico';

    var status='PENDENTE';
    if(necProducao>0 && produzido<previsto*0.5) status='ATRASADA';
    else if(saldoFaturar>0 && comp===compAtual && diasRestMes<=5) status='RISCO';
    else if(produzido>0 && saldoFaturar>0) status='PRODUCAO';
    else if(saldoFaturar<=0) status='CONCLUIDO';

    out.push({
      Codigo:cod, Produto:prodMap[cod]||'', UM:umMap[cod]||'', Linha:linhaMap[cod]||'',
      Competencia:comp,
      EstoqueInicial:estoqueAtual, Previsto:previsto, Faturado:faturado, Produzido:produzido,
      NecessidadeProducao:necProducao, SaldoFaturar:saldoFaturar,
      AtendimentoPct:atendPct, ProducaoPct:prodPct,
      CoberturaRazao:coberturaRaz, CoberturaStatus:coberturaSt,
      Status:status
    });
  });
  G.prevMensal=out;
}

/* ==============================================================
   FILTROS (compartilhados entre tabela, CSV e Excel)
   ============================================================== */
function popularFiltrosPrevisao(){
  var anos={};
  (G.prevMensal||[]).forEach(function(it){ anos[it.Competencia.substring(0,4)]=1; });
  var selAno=el('prev-ano');
  if(selAno && selAno.options.length<=1){
    Object.keys(anos).sort().forEach(function(a){
      var o=document.createElement('option'); o.value=a; o.textContent=a; selAno.appendChild(o);
    });
  }
  var selLinha=el('prev-linha');
  if(selLinha && selLinha.options.length<=1){
    LINHAS_KEYS.forEach(function(k){
      var o=document.createElement('option'); o.value=k; o.textContent=LINHAS_NOMES[k]||k; selLinha.appendChild(o);
    });
  }
}

function getPrevisaoFiltrada(){
  var q=v('prev-q').toLowerCase();
  var mes=v('prev-mes'), ano=v('prev-ano'), linha=v('prev-linha'), st=v('prev-st');
  var onlyNec = !!(el('prev-only-nec') && el('prev-only-nec').checked);
  var onlyPend= !!(el('prev-only-pend') && el('prev-only-pend').checked);
  var sortBy=v('prev-sort');

  var its=(G.prevMensal||[]).filter(function(it){
    if(q && !it.Codigo.toLowerCase().includes(q) && !it.Produto.toLowerCase().includes(q)) return false;
    if(mes && it.Competencia.substring(5,7)!==mes) return false;
    if(ano && it.Competencia.substring(0,4)!==ano) return false;
    if(linha && it.Linha!==linha) return false;
    if(st && it.Status!==st) return false;
    if(onlyNec && it.NecessidadeProducao<=0) return false;
    if(onlyPend && it.SaldoFaturar<=0) return false;
    return true;
  });

  var cmp={
    necessidade: function(a,b){ return b.NecessidadeProducao-a.NecessidadeProducao; },
    saldo:       function(a,b){ return b.SaldoFaturar-a.SaldoFaturar; },
    atendimento: function(a,b){ return a.AtendimentoPct-b.AtendimentoPct; },
    previsto:    function(a,b){ return b.Previsto-a.Previsto; },
    risco:       function(a,b){
      var ord={ATRASADA:0,RISCO:1,PRODUCAO:2,PENDENTE:3,CONCLUIDO:4};
      return (ord[a.Status]!==undefined?ord[a.Status]:9) - (ord[b.Status]!==undefined?ord[b.Status]:9);
    }
  };
  if(sortBy && cmp[sortBy]) its=its.slice().sort(cmp[sortBy]);
  return its;
}

/* ==============================================================
   RENDERIZAÇÃO
   ============================================================== */
function bdgStatusPrevisao(st){
  var m={
    ATRASADA:{c:'bdg-d',l:'🔴 Atrasada'},
    RISCO:{c:'bdg-o',l:'🟠 Risco Fat.'},
    PRODUCAO:{c:'bdg-w',l:'🟡 Em Produção'},
    CONCLUIDO:{c:'bdg-s',l:'🟢 Concluído'},
    PENDENTE:{c:'bdg-m',l:'⚪ Pendente'}
  };
  var x=m[st]||m.PENDENTE;
  return '<span class="bdg '+x.c+'">'+x.l+'</span>';
}
function bdgCoberturaPrevisao(stCob){
  var m={
    critico:{c:'bdg-d',l:'Crítico'},
    baixo:{c:'bdg-w',l:'Baixo'},
    adequado:{c:'bdg-s',l:'Adequado'},
    excesso:{c:'bdg-p',l:'Excesso'}
  };
  var x=m[stCob]||m.adequado;
  return '<span class="bdg '+x.c+'">'+x.l+'</span>';
}
function barraPct(pct){
  var p=Math.round(pct);
  var cor=p>=100?'var(--green)':p>=50?'var(--yellow-mid)':'var(--red)';
  return '<div style="display:flex;align-items:center;gap:5px"><div class="ader-bar"><div class="ader-fill" style="width:'+p+'%;background:'+cor+'"></div></div><span style="font-size:9px;color:var(--text3)">'+p+'%</span></div>';
}

function rPrevisao(){
  var its=getPrevisaoFiltrada();

  var tPrev=its.reduce(function(a,x){ return a+x.Previsto; },0);
  var tProd=its.reduce(function(a,x){ return a+x.Produzido; },0);
  var tFat =its.reduce(function(a,x){ return a+x.Faturado; },0);
  var pctAtend=tPrev>0?Math.round(tFat/tPrev*100):0;
  var pctProd =tPrev>0?Math.round(tProd/tPrev*100):0;
  var pendentes=its.filter(function(x){ return x.SaldoFaturar>0; }).length;
  var criticos =its.filter(function(x){ return x.Status==='ATRASADA'; }).length;
  var necTotal =its.reduce(function(a,x){ return a+x.NecessidadeProducao; },0);

  txt('prev-kpi-previsto',fN(Math.round(tPrev)));
  txt('prev-kpi-produzido',fN(Math.round(tProd)));
  txt('prev-kpi-faturado',fN(Math.round(tFat)));
  txt('prev-kpi-atend',pctAtend+'%');
  txt('prev-kpi-prod',pctProd+'%');
  txt('prev-kpi-pendentes',pendentes);
  txt('prev-kpi-criticos',criticos);
  txt('prev-kpi-necessidade',fN(Math.round(necTotal)));
  txt('prev-cnt',its.length);

  var b=el('prev-body'); if(!b) return;
  b.innerHTML='';
  its.forEach(function(it){
    var tr=document.createElement('tr');
    tr.innerHTML=
       '<td><code>'+it.Codigo+'</code></td>'
      +'<td>'+it.Produto+'</td>'
      +'<td>'+it.UM+'</td>'
      +'<td class="nr">'+fN(Math.round(it.EstoqueInicial))+'</td>'
      +'<td class="nr">'+fN(Math.round(it.Previsto))+'</td>'
      +'<td class="nr">'+fN(Math.round(it.Faturado))+'</td>'
      +'<td class="nr">'+fN(Math.round(it.Produzido))+'</td>'
      +'<td class="nr '+(it.NecessidadeProducao>0?'num-r':'num-g')+'">'+fN(Math.round(it.NecessidadeProducao))+'</td>'
      +'<td class="nr '+(it.SaldoFaturar>0?'num-a':'num-g')+'">'+fN(Math.round(it.SaldoFaturar))+'</td>'
      +'<td>'+bdgStatusPrevisao(it.Status)+'</td>'
      +'<td>'+barraPct(it.AtendimentoPct)+'</td>'
      +'<td>'+barraPct(it.ProducaoPct)+'</td>'
      +'<td>'+bdgCoberturaPrevisao(it.CoberturaStatus)+'</td>';
    b.appendChild(tr);
  });
  if(!its.length) b.innerHTML='<tr><td colspan="13" class="empty">Nenhum item para os filtros selecionados</td></tr>';
}

/* ==============================================================
   EXPORTAÇÃO EXCEL (usa a mesma lista filtrada da tabela)
   ============================================================== */
function expExcelPrevisao(){
  if(typeof XLSX==='undefined'){ alert('Biblioteca de exportação Excel não carregou. Verifique sua conexão e tente novamente.'); return; }
  var its=getPrevisaoFiltrada();
  var hdr=['Codigo','Produto','UM','Competencia','EstoqueInicial','Previsto','Faturado','Produzido','NecessidadeProducao','SaldoFaturar','AtendimentoPct','ProducaoPct','CoberturaStatus','Status'];
  var rows=its.map(function(it){
    return hdr.map(function(h){
      var val=it[h];
      if(typeof val==='number') return Math.round(val*100)/100;
      return val===null||val===undefined?'':val;
    });
  });
  var ws=XLSX.utils.aoa_to_sheet([hdr].concat(rows));
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Previsao');
  var mes=v('prev-mes')||String(hoje0().getMonth()+1).padStart(2,'0');
  var ano=v('prev-ano')||String(hoje0().getFullYear());
  XLSX.writeFile(wb,'PREVISAO_MENSAL_'+ano+'_'+mes+'.xlsx');
}

/* ==============================================================
   BOOTSTRAP — dispara o carregamento dos dados extras assim que
   este script é interpretado (não depende do fluxo principal).
   ============================================================== */
carregarDadosPrevisaoExtra();
