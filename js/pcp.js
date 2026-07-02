/* ============================================================
   pcp.js
   Motor de cálculo do PCP: processamento principal (saldo, OFA, ruptura, necessidade de produção) e renderização da página PCP Decisório.
   ============================================================ */

/* ==============================================================
   PROCESSAMENTO PRINCIPAL
   ============================================================== */
function processar(dados){
  G.saldo        =dados['SALDO']        ||[];
  G.parametros   =dados['PARAMETROS']   ||[];
  G.perfil       =dados['PERFIL']       ||[];
  G.ordens       =dados['ORDENS']       ||[];
  G.extrato      =dados['EXTRATO']      ||[];
  G.previsao     =dados['PREVISAO']     ||[];
  G.linhasAba    =dados['LINHAS ']      ||[];
  G.capacidadeAba=dados['CAPACIDADE '] ||[];

  var HOJE=hoje0();
  var hzDate=addDias(HOJE,HORIZONTE_OFA);

  /* ---- Mapas base ---- */
  var segMap={};
  G.parametros.forEach(function(r){var c=s(r['Cod. Item']||r['Codigo']||r['_col0']||'');if(c) segMap[c]=n(r['Estq. Seg']||r['ESTOQUE SEGURANÇA']||r['_col6']||0);});

  /* ---- DC — com datas quando disponível ---- */
  // dcMap[cod] = total (para cálculo de demanda diária)
  // dcDatasMap[cod] = [{qty, dateFim}] para projeção temporal
  var dcMap={},dcDatasMap={};
  G.perfil.forEach(function(r){
    if(s(r['Tipo']||r['_col2']||'').toUpperCase()!=='DC') return;
    var cod=s(r['Item']||r['_col1']||'');
    var qtd=Math.abs(n(r['Quantidade']||r['_col6']||0));
    if(!cod||qtd<=0) return;
    dcMap[cod]=(dcMap[cod]||0)+qtd;
    var dtFim=parseDate(s(r['Data Fim']||r['_col5']||''));
    if(!dcDatasMap[cod]) dcDatasMap[cod]=[];
    dcDatasMap[cod].push({qty:qtd,dateFim:dtFim});
  });

  /* ---- OFAs processadas com data-awareness ---- */
  var ofaHorizMap={},ofaAtrasMap={},ofaForaMap={};
  var ofaDtFimMap={},ofaDetMap={};
  // ofaDiasMap[cod][isoDate] = qty produzida naquele dia (para projeção)
  var ofaDiasMap={};

  G.ordens.forEach(function(r){
    var cod   =s(r['Cod. Item']||r['_col3']||'');
    var tipo  =s(r['Tipo']    ||r['_col2']||'').toUpperCase();
    var sit   =s(r['Situacao']||r['_col8']||'').toLowerCase();
    var pend  =n(r['Qtde. Pendente']||r['_col10']||0);
    var ordem =s(r['Ordem']   ||r['_col0']||'');
    var aberta=(sit==='liberada'||sit==='aberta'||sit==='em aberto'||sit==='parcial'||sit==='');
    if(!cod||(tipo!=='OFA'&&tipo!=='OFP')||!aberta||pend<=0) return;
    var dtIni=parseDate(s(r['Dt. Inicio']||r['_col6']||''));
    var dtFim=parseDate(s(r['Dt. Fim']   ||r['_col7']||''));
    var diasRest=dtFim?difDias(HOJE,dtFim):null;
    var situDt;
    if(!dtFim){situDt='semdata';ofaHorizMap[cod]=(ofaHorizMap[cod]||0)+pend;}
    else if(dtFim<HOJE){situDt='atrasada';ofaAtrasMap[cod]=(ofaAtrasMap[cod]||0)+pend;ofaHorizMap[cod]=(ofaHorizMap[cod]||0)+pend;}
    else if(dtFim<=hzDate){situDt='horizonte';ofaHorizMap[cod]=(ofaHorizMap[cod]||0)+pend;}
    else{situDt='fora';ofaForaMap[cod]=(ofaForaMap[cod]||0)+pend;}
    if(dtFim&&(!ofaDtFimMap[cod]||dtFim<ofaDtFimMap[cod])) ofaDtFimMap[cod]=dtFim;
    if(!ofaDetMap[cod]) ofaDetMap[cod]=[];
    ofaDetMap[cod].push({pend,dtIni,dtFim,diasRest,situDt,ordem,tipo});
    // Distribuir produção da OFA por dia (para projeção temporal)
    if(pend>0){
      var iniEfetivo=dtIni&&dtIni>HOJE?dtIni:HOJE;
      var fimEfetivo=dtFim||addDias(HOJE,7);
      var totalDias=Math.max(difDias(iniEfetivo,fimEfetivo)+1,1);
      var porDia=pend/totalDias;
      if(!ofaDiasMap[cod]) ofaDiasMap[cod]={};
      var d=new Date(iniEfetivo);
      for(var di=0;di<totalDias;di++){var dk=isoDate(d);ofaDiasMap[cod][dk]=(ofaDiasMap[cod][dk]||0)+porDia;d=addDias(d,1);}
    }
  });

  /* ---- Linhas + Capacidade ---- */
  var itemLinhasMap={},itemFixcolMap={};
  G.linhasAba.forEach(function(r){var cod=s(r['CODIGO']||r['Codigo']||r['_col0']||'');if(!cod) return;itemFixcolMap[cod]=ehTrue(r['FIXCOL']||r['_col9']||'');var lk=[];LINHAS_KEYS.forEach(function(k){if(ehTrue(r[k]||'')) lk.push(k);});itemLinhasMap[cod]=lk;});
  var capProdMap={};
  G.capacidadeAba.forEach(function(r){var cod=s(r['CODIGO']||r['Codigo']||r['_col0']||'');if(!cod) return;capProdMap[cod]=n(r['Capacidade almox 30']||r['CAPACIDADE ALMOX 30']||r['_col2']||0);});
  var prodMap={};
  G.saldo.forEach(function(r){var c=s(r['Código']||r['Codigo']||r['_col0']||'');if(c) prodMap[c]=s(r['Descrição']||r['Descricao']||r['_col1']||'');});

  /* ---- EPP / NFS ---- */
  G.epp=[];G.nfs=[];var eppMap={},nfsMap={};
  G.extrato.forEach(function(r){
    var sigla=s(r['Sigla']||r['_col3']||'').toUpperCase();
    if(sigla!=='EPP'&&sigla!=='NFS') return;
    var dv=s(r['Data']||r['_col1']||'');if(dv.includes('T')) dv=dv.substring(0,10);
    var qtd=n(r['Qtde']||r['QTDE']||r['_col5']||0);var cod=s(r['Cod. Item']||r['CODIGO']||r['_col12']||'');
    if(!cod||qtd<=0) return;
    var obj={Data:dv,Codigo:cod,Produto:prodMap[cod]||'',Quantidade:qtd};
    if(sigla==='EPP'){G.epp.push(obj);eppMap[cod]=(eppMap[cod]||0)+qtd;}
    else{G.nfs.push(obj);nfsMap[cod]=(nfsMap[cod]||0)+qtd;}
  });
  var dpMap={};G.epp.forEach(function(r){if(r.Data) dpMap[r.Data]=(dpMap[r.Data]||0)+r.Quantidade;});
  G.prodDiaria=Object.keys(dpMap).map(function(d){return{data:d,qty:dpMap[d]};}).sort((a,b)=>a.data.localeCompare(b.data));

  /* ---- Previsão ---- */
  G.prevItens=[];
  G.previsao.forEach(function(r){
    var cod=s(r['Item']||r['_col0']||'');if(!cod) return;
    var prev=n(r['Previsto']||r['_col2']||0);var real=(eppMap[cod]||0)+(nfsMap[cod]||0);
    var ader=prev>0?Math.round(real/prev*100):(real>0?999:0);
    G.prevItens.push({Codigo:cod,Produto:prodMap[cod]||'',UM:s(r['UM']||r['_col1']||''),Previsto:prev,Realizado:real,Diferenca:real-prev,Aderencia:ader,Status:ader>=100?'ACIMA':ader>=80?'DENTRO':'ABAIXO',RowCls:ader>=100?'ro':ader>=80?'rw':'rc'});
  });

  /* ================================================================
     ITENS PCP — lógica temporal completa
  ================================================================ */
  G.itens=G.saldo.map(function(r){
    var cod =s(r['Código']||r['Codigo']||r['_col0']||'');
    var prod=s(r['Descrição']||r['Descricao']||r['_col1']||'');
    if(!cod) return null;
    var a3=n(r['Almox 3']||r['_col2']||0),a30=n(r['Almox 30']||r['_col3']||0);
    var pedCom=dcMap[cod]||0,estSeg=segMap[cod]||0;
    var ofaHoriz=ofaHorizMap[cod]||0,ofaFora=ofaForaMap[cod]||0,ofaAtras=ofaAtrasMap[cod]||0;
    var ofaTotal=ofaHoriz+ofaFora;
    var capProd=capProdMap[cod]||0,lk=itemLinhasMap[cod]||[],fixcol=itemFixcolMap[cod]||false;
    var dets=ofaDetMap[cod]||[];var dtFimOFA=ofaDtFimMap[cod]||null;
    var diasAteOFA=dtFimOFA?difDias(HOJE,dtFimOFA):null;
    var dispTotal=a3+a30;
    var necTotal=pedCom+estSeg;
    var necProd=Math.max(necTotal-dispTotal-ofaHoriz,0);
    var necCom=Math.max(pedCom-dispTotal,0);
    var diasNec=(necProd>0&&capProd>0)?necProd/capProd:0;
    var demDiaria=pedCom>0?pedCom/22:0;
    var cobDias=demDiaria>0?dispTotal/demDiaria:(dispTotal>0?999:0);
    var conflitoDCOFA=necCom>0&&dtFimOFA&&diasAteOFA!==null&&diasAteOFA>cobDias;

    /* PROJEÇÃO TEMPORAL — motor principal */
    var proj=calcProjecao(cod,dispTotal,estSeg,demDiaria,ofaDiasMap[cod]||{},HORIZONTE_PROJ);
    var ruptInfo=findRupturaDate(proj,estSeg);

    /* STATUS CAPACIDADE */
    var statusCap,motivo,rowCls;
    if(necProd<=0){statusCap=ofaHoriz>0&&ofaHoriz>=(necTotal-dispTotal)?'OFA ATENDE':'NORMAL';motivo='Coberto.';rowCls='ro';}
    else if(capProd<=0){statusCap='SEM CAPACIDADE';motivo=fixcol?'FIXCOL externo.':'Sem cap. mapeada.';rowCls='rc';}
    else if(diasNec>5){statusCap='CAP LIMITADA';motivo=diasNec.toFixed(1)+'d prod.';rowCls='rw';}
    else{statusCap='PRODUZIR URGENTE';motivo='Urgente!';rowCls='rc';}
    if(ofaAtras>0) motivo='⏰OFA ATRASADA '+fN(Math.round(ofaAtras))+'sc! '+motivo;
    if(conflitoDCOFA) motivo='🚨CONFLITO DC×OFA('+diasAteOFA+'d)! '+motivo;
    if(ruptInfo) motivo=(ruptInfo.tipo==='RUPTURA'?'🔴':'⚠️')+' Ruptura prevista em '+ruptInfo.dias+'d! '+motivo;

    /* RISCO */
    var riscoRuptura;
    if(conflitoDCOFA||(ruptInfo&&ruptInfo.dias<=3)) riscoRuptura='CRITICO';
    else if(ruptInfo&&ruptInfo.dias<=7) riscoRuptura='URGENTE';
    else if(ruptInfo&&ruptInfo.dias<=14) riscoRuptura='MODERADO';
    else if(ruptInfo) riscoRuptura='BAIXO';
    else riscoRuptura='OK';

    /* SCORE */
    var pri=0;
    if(ruptInfo&&ruptInfo.dias<=3) pri+=55;
    else if(ruptInfo&&ruptInfo.dias<=7) pri+=45;
    else if(ruptInfo&&ruptInfo.dias<=14) pri+=30;
    else if(ruptInfo) pri+=15;
    if(conflitoDCOFA) pri+=20;
    if(ofaAtras>0) pri+=12;
    if(necCom>0) pri+=15;
    if(dispTotal<estSeg) pri+=10;
    if(statusCap==='PRODUZIR URGENTE') pri+=10;
    if(statusCap==='SEM CAPACIDADE') pri-=10;
    if(necProd>1000) pri+=7;
    pri=Math.min(Math.max(pri,0),100);

    var dataIdeal=cobDias<=2?'HOJE':cobDias<=5?'Esta Semana':cobDias<=12?'Próx. Semana':'Programar';
    if(statusCap==='NORMAL'||statusCap==='OFA ATENDE') dataIdeal='Coberto';
    var tempoEst=capProd>0&&necProd>0?+(necProd/capProd).toFixed(1):0;
    var linhaRec=lk.length>0?(LINHAS_NOMES[lk[0]]||lk[0]):(fixcol?'COL FIXA':'N/M');

    return{Codigo:cod,Produto:prod,Almox3:a3,Almox30:a30,DispTotal:dispTotal,PedidoComercial:pedCom,NecComercial:necCom,EstoqueSeguranca:estSeg,
      OFAPendente:ofaTotal,OFAHorizonte:ofaHoriz,OFAFora:ofaFora,OFAAtrasada:ofaAtras,
      NecessidadeProd:necProd,CapacidadeDia:capProd,DiasNecessarios:diasNec,
      CoberturasDias:cobDias,DemandaDiaria:demDiaria,
      OFADtFim:dtFimOFA,DiasAteOFA:diasAteOFA,ConflitoDCOFA:conflitoDCOFA,OFADetalhes:dets,
      LinhaProducao:lk.map(k=>LINHAS_NOMES[k]||k).join(', ')||(fixcol?'COL FIXA':'N/M'),
      LinhasKeys:lk,LinhaRec:linhaRec,
      StatusCap:statusCap,Motivo:motivo,RowCls:rowCls,RiscoRuptura:riscoRuptura,Prioridade:pri,
      DataIdeal:dataIdeal,TempoEstimado:tempoEst,
      // CAMPOS PREDITIVOS
      Projecao:proj,
      RuptInfo:ruptInfo,
      DiasAteRuptura:ruptInfo?ruptInfo.dias:null,
      DataRuptura:ruptInfo?ruptInfo.data:null,
      TipoRuptura:ruptInfo?ruptInfo.tipo:null
    };
  }).filter(Boolean);

  /* ---- Linhas Info ---- */
  var lOFA={},lCap={},lAtras={};
  LINHAS_KEYS.forEach(k=>{lOFA[k]=0;lCap[k]=0;lAtras[k]=0;});
  G.itens.forEach(it=>{
    if(it.CapacidadeDia>0&&it.LinhasKeys.length>0) it.LinhasKeys.forEach(k=>{if(it.CapacidadeDia>lCap[k]) lCap[k]=it.CapacidadeDia;});
    if(it.OFAHorizonte>0&&it.LinhasKeys.length>0) it.LinhasKeys.forEach(k=>lOFA[k]+=it.OFAHorizonte/it.LinhasKeys.length);
    if(it.OFAAtrasada>0&&it.LinhasKeys.length>0) it.LinhasKeys.forEach(k=>lAtras[k]+=it.OFAAtrasada/it.LinhasKeys.length);
  });
  G.linhasInfo=LINHAS_KEYS.map(lk=>{
    var p=lOFA[lk]||0,c=lCap[lk]||0,a=lAtras[lk]||0;
    var u=c>0?Math.min(Math.round(p/c*100),999):(p>0?999:0);
    return{id:lk,nome:LINHAS_NOMES[lk]||lk,capDia:c,prog:p,util:u,livre:Math.max(c-p,0),atrasada:a,cor:u<=70?'verde':u<=90?'amarelo':'vermelho',itensAlocados:G.itens.filter(it=>it.LinhasKeys.includes(lk)&&it.NecessidadeProd>0).length};
  });

  /* ---- Forecast de Linhas (14 dias) ---- */
  G.linhaForecast=calcFuturoLinhas(14,ofaDiasMap);

  /* ---- Schedule ---- */
  G.schedule=gerarAutoSchedule();
  popularSelectLinhas();
  popularSelectLinhasEst();

  var ts=new Date().toLocaleString('pt-BR');
  txt('hdr-ts',ts);txt('sf-ts',ts);txt('dash-ts',ts);
  txt('dash-hz',HORIZONTE_PROJ);
  renderAll();
}


/* ==============================================================
   PCP DECISÓRIO
   ============================================================== */
function rPCP(){
  var q=v('pcp-q').toLowerCase(),st=v('pcp-st'),risco=v('pcp-risco'),linha=v('pcp-linha'),ord=v('pcp-ord')||'prioridade';
  var its=G.itens.filter(it=>{
    if(q&&!it.Codigo.toLowerCase().includes(q)&&!it.Produto.toLowerCase().includes(q)) return false;
    if(st&&it.StatusCap!==st) return false;
    if(risco&&it.RiscoRuptura!==risco) return false;
    if(linha&&!it.LinhasKeys.includes(linha)) return false;
    return true;
  });
  if(ord==='prioridade') its.sort((a,b)=>b.Prioridade-a.Prioridade);
  else if(ord==='ruptura') its.sort((a,b)=>(a.DiasAteRuptura===null?999:a.DiasAteRuptura)-(b.DiasAteRuptura===null?999:b.DiasAteRuptura));
  else if(ord==='cobertura') its.sort((a,b)=>a.CoberturasDias-b.CoberturasDias);
  else if(ord==='necessidade') its.sort((a,b)=>b.NecessidadeProd-a.NecessidadeProd);
  else its.sort((a,b)=>a.Codigo.localeCompare(b.Codigo));
  txt('pcp-cnt',its.length);
  var metEl=el('pcp-met');
  if(metEl){
    var tN=its.reduce((a,x)=>a+x.NecessidadeProd,0);
    var tC=its.reduce((a,x)=>a+x.NecComercial,0);
    var r7=its.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura<=7).length;
    var nConfl=its.filter(x=>x.ConflitoDCOFA).length;
    metEl.innerHTML='<div class="mbox"><div class="mbox-l">Nec. Total</div><div class="mbox-v">'+fN(Math.round(tN))+'</div></div>'
      +'<div class="mbox"><div class="mbox-l">Nec. Comercial</div><div class="mbox-v r">'+fN(Math.round(tC))+'</div></div>'
      +'<div class="mbox"><div class="mbox-l">Ruptura ≤7d</div><div class="mbox-v r">'+r7+'</div></div>'
      +'<div class="mbox"><div class="mbox-l">Conflitos</div><div class="mbox-v o">'+nConfl+'</div></div>';
  }
  var body=el('pcp-body-dec');body.innerHTML='';
  its.forEach((it,idx)=>{
    var priCls=it.Prioridade>=70?'p0':it.Prioridade>=50?'p1':it.Prioridade>=30?'p2':it.Prioridade>=10?'p3':'p4';
    var itemCls=it.RowCls==='rc'?'c':it.RowCls==='rw'?'w':it.RowCls==='rp'?'p':'g';
    var ruptChip=it.DiasAteRuptura!==null?'<span class="rupt-chip '+(it.DiasAteRuptura<=3?'c':it.DiasAteRuptura<=7?'w':'n')+'">⏰ '+it.DiasAteRuptura+'d</span>':'';
    var div=document.createElement('div');div.className='pcp-item '+itemCls;div.onclick=function(){openDetail(it);};
    div.innerHTML=
      '<div class="pcp-row1">'
        +'<span class="pcp-pri '+priCls+'">'+(idx+1)+'</span>'
        +'<span class="pcp-code">'+it.Codigo+'</span>'
        +'<span class="pcp-nome">'+it.Produto+'</span>'
        +'<div style="display:flex;align-items:center;gap:5px;flex-shrink:0">'+ruptChip+bdgRisco(it.RiscoRuptura)+bdgCap(it.StatusCap)+'</div>'
        +'<div class="pcp-qty-block"><div class="pcp-qty '+(it.NecessidadeProd>0?'r':'')+'">'+fN(Math.round(it.NecessidadeProd))+'<span style="font-size:9px;font-weight:400;margin-left:2px">sc</span></div><div style="font-size:9px;color:var(--text3)">Nec. (≤'+HORIZONTE_OFA+'d)</div></div>'
      +'</div>'
      +'<div class="pcp-row2">'
        +sparklineSVG(it.Projecao,50,16)
        +'<span style="width:6px"></span>'
        +covChip(it.CoberturasDias)
        +'<span class="pcp-meta" style="margin:0 3px;color:var(--text4)">·</span>'
        +ofaChip(it)
        +'<span class="pcp-meta" style="margin:0 3px;color:var(--text4)">·</span>'
        +'<span class="pcp-meta">📦 DC:<strong>'+fN(it.PedidoComercial)+'</strong></span>'
        +'<span class="pcp-meta" style="margin:0 3px;color:var(--text4)">·</span>'
        +'<span class="pcp-meta">🏭 '+it.LinhaRec+'</span>'
        +'<span class="pcp-meta" style="margin:0 3px;color:var(--text4)">·</span>'
        +'<span class="pcp-meta">📅 '+it.DataIdeal+'</span>'
        +(it.TempoEstimado>0?'<span class="pcp-meta" style="margin:0 3px;color:var(--text4)">·</span><span class="pcp-meta">⏱ '+it.TempoEstimado+'d</span>':'')
      +'</div>';
    body.appendChild(div);
  });
  if(!its.length) body.innerHTML='<div class="empty">Nenhum item com os filtros selecionados.</div>';
}

