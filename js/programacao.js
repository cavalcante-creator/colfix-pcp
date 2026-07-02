/* ============================================================
   programacao.js
   Geração automática da programação semanal (grade por linha/dia) e renderização do Gantt/backlog.
   ============================================================ */

/* ==============================================================
   SCHEDULE SEMANAL INTELIGENTE — prioriza itens com ruptura prevista
   ============================================================== */
function getSemanaAtual(){
  var hoje=hoje0();var base=new Date(hoje);base.setDate(hoje.getDate()+(G.semanaOffset*7));
  var dw=base.getDay();var inicio=new Date(base);inicio.setDate(base.getDate()-(dw===0?6:dw-1));
  var dias=[];for(var i=0;i<6;i++){var d=new Date(inicio);d.setDate(inicio.getDate()+i);dias.push(d);}return dias;
}

function gerarAutoSchedule(){
  var dias=getSemanaAtual();var HOJE=hoje0();
  var grade={};
  LINHAS_KEYS.forEach(lk=>{grade[lk]={};dias.forEach(d=>{var dk=isoDate(d);var li=G.linhasInfo.find(l=>l.id===lk);grade[lk][dk]={cap:li?li.capDia:0,ofaProg:0,sugestao:0,itensOFA:[],itensSug:[]};});});

  // Pré-alocar OFAs com Dt.Início dentro da semana
  G.ordens.forEach(function(r){
    var cod=s(r['Cod. Item']||r['_col3']||''),tipo=s(r['Tipo']||r['_col2']||'').toUpperCase();
    var sit=s(r['Situacao']||r['_col8']||'').toLowerCase();
    var pend=n(r['Qtde. Pendente']||r['_col10']||0);
    var aberta=(sit==='liberada'||sit==='aberta'||sit==='em aberto'||sit==='parcial'||sit==='');
    if(!cod||(tipo!=='OFA'&&tipo!=='OFP')||!aberta||pend<=0) return;
    var dtIni=parseDate(s(r['Dt. Inicio']||r['_col6']||'')),dtFim=parseDate(s(r['Dt. Fim']||r['_col7']||''));
    var lk=G.itens.find(x=>x.Codigo===cod);lk=lk?lk.LinhasKeys:[];if(!lk||!lk.length) return;
    var dkStart=isoDate(dtIni&&dtIni>HOJE?dtIni:HOJE);
    var dkEnd=dtFim?isoDate(dtFim):isoDate(dias[dias.length-1]);
    var diasOFA=dias.filter(d=>{var dk=isoDate(d);return dk>=dkStart&&dk<=dkEnd;});
    if(!diasOFA.length) return;
    var porDia=pend/diasOFA.length;
    diasOFA.forEach(d=>{var dk=isoDate(d);lk.forEach(lk2=>{if(grade[lk2]&&grade[lk2][dk]){grade[lk2][dk].ofaProg+=porDia/lk.length;grade[lk2][dk].itensOFA.push({cod,qty:Math.round(porDia/lk.length),ordem:s(r['Ordem']||r['_col0']||'')});}});});
  });

  // Sugestão PCP — ordenada por urgência preditiva (ruptura mais próxima primeiro)
  var fila=G.itens.filter(it=>it.NecessidadeProd>0&&it.LinhasKeys.length>0)
    .sort((a,b)=>{
      var ar=a.DiasAteRuptura!==null?a.DiasAteRuptura:999;
      var br=b.DiasAteRuptura!==null?b.DiasAteRuptura:999;
      if(ar!==br) return ar-br;
      return b.Prioridade-a.Prioridade;
    });

  var naoProgramados=[];
  fila.forEach(it=>{
    var restante=it.NecessidadeProd;
    for(var di=0;di<dias.length&&restante>0;di++){
      var dk=isoDate(dias[di]);var melhor=null,espMax=0;
      it.LinhasKeys.forEach(lk=>{var cell=grade[lk]&&grade[lk][dk];if(!cell) return;var esp=cell.cap-cell.ofaProg-cell.sugestao;if(esp>espMax){espMax=esp;melhor=lk;}});
      if(melhor&&espMax>0){var aloc=Math.min(restante,espMax);grade[melhor][dk].sugestao+=aloc;grade[melhor][dk].itensSug.push({it,qty:Math.round(aloc)});restante-=aloc;}
    }
    if(restante>10) naoProgramados.push({it,restante:Math.round(restante)});
  });
  return{grade,dias,naoProgramados};
}

function semanaAnterior(){G.semanaOffset--;G.schedule=gerarAutoSchedule();rProg();}
function semanaProxima(){G.semanaOffset++;G.schedule=gerarAutoSchedule();rProg();}
function semanaHoje(){G.semanaOffset=0;G.schedule=gerarAutoSchedule();rProg();}
function popularSelectLinhas(){var sel=el('pcp-linha');if(!sel) return;sel.innerHTML='<option value="">Todas Linhas</option>';LINHAS_KEYS.forEach(k=>{var op=document.createElement('option');op.value=k;op.textContent=LINHAS_NOMES[k]||k;sel.appendChild(op);});}


/* ==============================================================
   PROGRAMAÇÃO SEMANAL
   ============================================================== */
function rProg(){
  if(!G.schedule) return;
  var {grade,dias,naoProgramados}=G.schedule;var HOJE=hoje0();var hojeStr=isoDate(HOJE);
  var tOFA=0,tSug=0,tCap=0,diasSat=0;
  LINHAS_KEYS.forEach(lk=>dias.forEach(d=>{var c=grade[lk]&&grade[lk][isoDate(d)];if(!c) return;tOFA+=c.ofaProg;tSug+=c.sugestao;tCap+=c.cap;if(c.cap>0&&(c.ofaProg+c.sugestao)/c.cap>0.9) diasSat++;}));
  var sem=el('prog-stats');
  if(sem){
    var lbl=dias[0].toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+' – '+dias[dias.length-1].toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
    var ocup=tCap>0?Math.round((tOFA+tSug)/tCap*100):0;
    sem.innerHTML='<div class="semana-stat"><div class="semana-stat-v" style="font-size:12px">'+lbl+'</div><div class="semana-stat-l">Semana</div></div>'
      +'<div class="semana-stat"><div class="semana-stat-v" style="color:var(--purple)">'+fN(Math.round(tOFA))+'</div><div class="semana-stat-l">sc OFA ERP</div></div>'
      +'<div class="semana-stat"><div class="semana-stat-v" style="color:var(--green)">'+fN(Math.round(tSug))+'</div><div class="semana-stat-l">sc Sugestão PCP</div></div>'
      +'<div class="semana-stat"><div class="semana-stat-v" style="color:var(--text3)">'+fN(Math.round(tCap))+'</div><div class="semana-stat-l">Cap. Total</div></div>'
      +'<div class="semana-stat"><div class="semana-stat-v" style="color:'+(ocup>90?'var(--red)':ocup>70?'var(--yellow)':'var(--green)')+'">'+ocup+'%</div><div class="semana-stat-l">Ocupação</div></div>'
      +'<div class="semana-stat"><div class="semana-stat-v" style="color:var(--red)">'+naoProgramados.length+'</div><div class="semana-stat-l">Backlog</div></div>';
  }
  var gt=el('gantt-table');gt.innerHTML='';
  var thead=document.createElement('thead');var tr0=document.createElement('tr');
  tr0.innerHTML='<th style="text-align:left;min-width:130px">Linha</th>';
  dias.forEach(d=>{var dk=isoDate(d),isH=(dk===hojeStr);tr0.innerHTML+='<th style="'+(isH?'background:var(--accent-dim);color:var(--accent)':'')+' min-width:115px;text-align:center">'+DIAS_PT[d.getDay()]+' '+d.getDate()+'/'+(d.getMonth()+1)+(isH?' ◀':'')+'</th>';});
  thead.appendChild(tr0);gt.appendChild(thead);
  var tbody=document.createElement('tbody');
  LINHAS_KEYS.forEach(lk=>{
    var li=G.linhasInfo.find(l=>l.id===lk);var cap=li?li.capDia:0;
    var tr=document.createElement('tr');
    var tdL=document.createElement('td');tdL.className='gantt-linha-label';
    tdL.innerHTML='<div class="gantt-linha-name">'+LINHAS_NOMES[lk]+'</div>'+(cap>0?'<div class="gantt-linha-cap">'+fN(cap)+' sc/dia</div>':'<div class="gantt-linha-cap" style="color:var(--text4)">sem cap.</div>');
    tr.appendChild(tdL);
    dias.forEach(d=>{
      var dk=isoDate(d),isH=(dk===hojeStr);
      var c=grade[lk]&&grade[lk][dk]?grade[lk][dk]:{cap,ofaProg:0,sugestao:0,itensOFA:[],itensSug:[]};
      var tot=c.ofaProg+c.sugestao;var pOFA=cap>0?Math.min(c.ofaProg/cap*100,100):0;
      var pSug=cap>0?Math.min(c.sugestao/cap*(100-pOFA),100-pOFA):0;var pTot=Math.min(pOFA+pSug,100);
      var corSug=pTot<=70?'g':pTot<=90?'a':'r';
      var td=document.createElement('td');td.style.background=isH?'rgba(27,92,122,.03)':'';
      var oHtml=c.itensOFA.slice(0,2).map(e=>'<span class="gantt-chip ofa">📋 '+e.cod+' '+fN(e.qty)+'sc</span>').join('');
      var sHtml=c.itensSug.slice(0,2).map(e=>{
        var rupt=e.it.DiasAteRuptura!==null&&e.it.DiasAteRuptura<=7?'⏰ ':'';
        return '<span class="gantt-chip '+(e.it.RowCls||'ro')+'" title="'+e.it.Produto+'">'+rupt+e.it.Codigo+' '+fN(e.qty)+'sc</span>';
      }).join('');
      td.innerHTML='<div class="gantt-cell"><div class="cap-bar-wrap"><div class="cap-bar-ofa" style="width:'+pOFA+'%"></div><div class="cap-bar-sug '+corSug+'" style="width:'+pSug+'%"></div></div>'
        +oHtml+sHtml+'<div class="gantt-cell-rem">Livre: '+fN(Math.round(Math.max(cap-tot,0)))+'sc</div></div>';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  gt.appendChild(tbody);
  var bl=el('backlog-list');bl.innerHTML='';txt('backlog-cnt',naoProgramados.length);
  if(!naoProgramados.length) bl.innerHTML='<div class="empty">✅ Todos os itens foram alocados</div>';
  else naoProgramados.forEach(e=>{
    bl.innerHTML+='<div class="backlog-item"><div class="backlog-code">'+e.it.Codigo+'</div><div style="font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e.it.Produto+'</div>'
      +(e.it.DiasAteRuptura!==null?'<span class="rupt-chip '+(e.it.DiasAteRuptura<=7?'c':'w')+'">⏰ '+e.it.DiasAteRuptura+'d</span>':'')
      +bdgRisco(e.it.RiscoRuptura)
      +'<div style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--red);margin-left:auto">'+fN(e.restante)+'sc</div></div>';
  });
}

