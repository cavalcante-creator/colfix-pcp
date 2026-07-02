/* ============================================================
   exports.js
   Exportações CSV (PCP, projeção, previsão, ordens, programação).
   ============================================================ */

/* ==============================================================
   CSV EXPORTS
   ============================================================== */
function csvEsc(v){var sv=String(v===null||v===undefined?'':v);if(sv.includes(',')||sv.includes('"')||sv.includes('\n')) return '"'+sv.replace(/"/g,'""')+'"';return sv;}
function dlCSV(nome,c){var blob=new Blob(['\uFEFF'+c],{type:'text/csv;charset=utf-8;'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=nome;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}

function expCSVMain(){
  var hdr=['Codigo','Produto','Almox3','Almox30','DispTotal','PedidoComercial','NecComercial','EstoqueSeguranca','OFAHorizonte','OFAFora','OFAAtrasada','NecessidadeProd','CapacidadeDia','CoberturasDias','DemandaDiaria','DiasAteRuptura','DataRuptura','TipoRuptura','ConflitoDCOFA','LinhaProducao','StatusCap','RiscoRuptura','Prioridade','DataIdeal'];
  var rows=[hdr.join(',')];
  G.itens.forEach(it=>rows.push(hdr.map(h=>{var v=it[h];if(v instanceof Date) return csvEsc(fmtDate(v));if(typeof v==='boolean') return csvEsc(String(v));if(typeof v==='number') return csvEsc(v.toFixed(2));return csvEsc(v);}).join(',')));
  dlCSV('pcp_v11_preditivo.csv',rows.join('\n'));
}

function expCSVProjecao(){
  var its=G.itens.filter(x=>x.DiasAteRuptura!==null||x.NecessidadeProd>0).sort((a,b)=>(a.DiasAteRuptura||999)-(b.DiasAteRuptura||999));
  var dias=gerarDias(HORIZONTE_PROJ);
  var hdr=['Codigo','Produto','SaldoHoje','EstSeg','CoberturasDias','DiasAteRuptura','DataRuptura','TipoRuptura','ConsumoDiario','OFAHorizonte','NecProd',...dias.map(d=>isoDate(d))];
  var rows=[hdr.join(',')];
  its.forEach(it=>{
    var projs=(it.Projecao||[]).map(p=>csvEsc(Math.round(p.saldoFim)));
    rows.push([csvEsc(it.Codigo),csvEsc(it.Produto),csvEsc(it.DispTotal),csvEsc(it.EstoqueSeguranca),csvEsc(it.CoberturasDias.toFixed(1)),csvEsc(it.DiasAteRuptura||''),csvEsc(fmtDate(it.DataRuptura)),csvEsc(it.TipoRuptura||'OK'),csvEsc(it.DemandaDiaria.toFixed(2)),csvEsc(Math.round(it.OFAHorizonte)),csvEsc(Math.round(it.NecessidadeProd)),...projs].join(','));
  });
  dlCSV('projecao_temporal_v11.csv',rows.join('\n'));
}

function expCSVPrev(){
  // Usa a mesma lista filtrada exibida na tabela da página Previsão (getPrevisaoFiltrada, em previsao.js)
  var hdr=['Codigo','Produto','UM','Competencia','EstoqueInicial','Previsto','Faturado','Produzido','NecessidadeProducao','SaldoFaturar','AtendimentoPct','ProducaoPct','CoberturaStatus','Status'];
  var rows=[hdr.join(',')];
  var its=(typeof getPrevisaoFiltrada==='function')?getPrevisaoFiltrada():(G.prevMensal||[]);
  its.forEach(it=>rows.push(hdr.map(h=>{var val=it[h];if(typeof val==='number') return csvEsc(Math.round(val*100)/100);return csvEsc(val);}).join(',')));
  dlCSV('previsao_mensal_v11.csv',rows.join('\n'));
}

function expCSVOrdens(){
  var hdr=['Ordem','Tipo','CodItem','Descricao','DtInicio','DtFim','Situacao','SituacaoDt','DiasRestantes','QtdePlan','QtdePend'];
  var rows=[hdr.join(',')];var HOJE=hoje0();
  G.ordens.forEach(r=>{var dtFim=parseDate(s(r['Dt. Fim']||r['_col7']||'')),dtIni=parseDate(s(r['Dt. Inicio']||r['_col6']||''));var dias=dtFim?difDias(HOJE,dtFim):null;var hz2=addDias(HOJE,HORIZONTE_OFA);var situDt=!dtFim?'semdata':dtFim<HOJE?'atrasada':dtFim<=hz2?'horizonte':'fora';rows.push([csvEsc(s(r['Ordem']||r['_col0'])),csvEsc(s(r['Tipo']||r['_col2'])),csvEsc(s(r['Cod. Item']||r['_col3'])),csvEsc(s(r['Descricao']||r['_col4'])),csvEsc(fmtDate(dtIni)),csvEsc(fmtDate(dtFim)),csvEsc(s(r['Situacao']||r['_col8'])),csvEsc(situDt),csvEsc(dias!==null?dias:''),csvEsc(n(r['Qtde']||r['_col9'])),csvEsc(n(r['Qtde. Pendente']||r['_col10']))].join(','));});
  dlCSV('ordens_v11.csv',rows.join('\n'));
}

function expCSVProg(){if(!G.schedule) return;var {grade,dias}=G.schedule;var hdr=['Linha','Data','CapDia','OFA_ERP','Sugestao_PCP','Total','Pct'];var rows=[hdr.join(',')];LINHAS_KEYS.forEach(lk=>dias.forEach(d=>{var dk=isoDate(d),c=grade[lk]&&grade[lk][dk]?grade[lk][dk]:{cap:0,ofaProg:0,sugestao:0};var tot=c.ofaProg+c.sugestao,pct=c.cap>0?Math.round(tot/c.cap*100):0;rows.push([csvEsc(LINHAS_NOMES[lk]),csvEsc(dk),csvEsc(c.cap),csvEsc(Math.round(c.ofaProg)),csvEsc(Math.round(c.sugestao)),csvEsc(Math.round(tot)),csvEsc(pct)].join(','));}));dlCSV('programacao_v11.csv',rows.join('\n'));}

