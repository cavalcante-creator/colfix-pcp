/* ============================================================
   app.js
   Orquestração geral: renderização de todas as páginas (renderAll) e navegação entre páginas do menu lateral. Deve ser o ÚLTIMO script carregado.
   ============================================================ */

/* ==============================================================
   RENDER ALL
   ============================================================== */
function renderAll(){rDash();rProjecao();rPCP();rProg();rLinhas();rPrevisao();rEstoque();rProdReal();rOrdens();rPerfil();renderCharts();updateKPIs();}

function updateKPIs(){
  var its=G.itens;
  var r7=its.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura<=7).length;
  var r14=its.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura>7&&x.DiasAteRuptura<=14).length;
  var abSeg=its.filter(x=>x.DiasAteRuptura!==null&&x.TipoRuptura==='ABAIXO_SEG').length;
  var nConfl=its.filter(x=>x.ConflitoDCOFA).length;
  var nOk=its.filter(x=>!x.DiasAteRuptura).length;
  var nUrg=its.filter(x=>x.StatusCap==='PRODUZIR URGENTE'||x.StatusCap==='SEM CAPACIDADE').length;
  var sob=G.linhasInfo.filter(l=>l.cor==='vermelho').length;
  var linhasSat7=G.linhaForecast?LINHAS_KEYS.filter(lk=>G.linhaForecast[lk]&&G.linhaForecast[lk].slice(0,7).some(d=>d.util>90)).length:0;
  var prevAb=G.prevItens.filter(x=>x.Status==='ABAIXO').length;
  txt('kpi-rupt7',r7);txt('kpi-rupt14',r14);txt('kpi-abaixo-seg',abSeg);txt('kpi-conflito',nConfl);txt('kpi-ok-proj',nOk);txt('kpi-linhas-sat',linhasSat7);
  var r7first=its.filter(x=>x.DiasAteRuptura!==null&&x.DiasAteRuptura<=7).sort((a,b)=>a.DiasAteRuptura-b.DiasAteRuptura).slice(0,2);
  txt('kpi-rupt7-sub',r7first.length?r7first.map(x=>x.Codigo+'('+x.DiasAteRuptura+'d)').join(', '):'--');
  txt('nb-pcp',nUrg);el('nb-pcp').style.display=nUrg?'':'none';
  txt('nb-proj',r7+r14);el('nb-proj').style.display=(r7+r14)?'':'none';
  txt('nb-linhas',sob||'');el('nb-linhas').style.display=sob?'':'none';
  txt('nb-prev',prevAb||'');el('nb-prev').style.display=prevAb?'':'none';
}


/* ==============================================================
   NAVEGAÇÃO
   ============================================================== */
function goPage(navEl){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));el('page-'+navEl.dataset.page).classList.add('active');navEl.classList.add('active');}
function filterStatus(st){var pcpNav=document.querySelector('[data-page="pcp"]');goPage(pcpNav);if(el('pcp-st')) el('pcp-st').value=st;rPCP();}

