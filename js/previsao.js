/* ============================================================
   previsao.js
   Renderização da página Previsão vs Realizado.
   ============================================================ */

/* ==============================================================
   PREVISÃO
   ============================================================== */
function rPrevisao(){
  var q=v('prev-q').toLowerCase(),st=v('prev-st');
  var its=G.prevItens.filter(it=>{if(q&&!it.Codigo.toLowerCase().includes(q)&&!it.Produto.toLowerCase().includes(q)) return false;if(st&&it.Status!==st) return false;return true;});
  var tP=its.reduce((a,x)=>a+x.Previsto,0),tR=its.reduce((a,x)=>a+x.Realizado,0);
  var ag=tP>0?Math.round(tR/tP*100):0;
  txt('prev-kpi-prev',fN(Math.round(tP)));txt('prev-kpi-real',fN(Math.round(tR)));txt('prev-kpi-ader',ag+'%');txt('prev-kpi-abaixo',its.filter(x=>x.Status==='ABAIXO').length);txt('prev-cnt',its.length);
  var b=el('prev-body');b.innerHTML='';
  its.forEach(it=>{var pct=Math.min(it.Aderencia,100);var barCor=it.Aderencia>=100?'var(--green)':it.Aderencia>=80?'var(--yellow-mid)':'var(--red)';var tr=document.createElement('tr');tr.className=it.RowCls;tr.innerHTML='<td><code>'+it.Codigo+'</code></td><td>'+it.Produto+'</td><td>'+it.UM+'</td><td class="nr">'+fN(it.Previsto)+'</td><td class="nr">'+fN(it.Realizado)+'</td><td class="nr '+(it.Diferenca>=0?'num-g':'num-r')+'">'+fN(it.Diferenca)+'</td><td class="nr">'+it.Aderencia+'%</td><td>'+bdgPrev(it.Status)+'</td><td><div class="ader-bar"><div class="ader-fill" style="width:'+pct+'%;background:'+barCor+'"></div></div></td>';b.appendChild(tr);});
  if(!its.length) b.innerHTML='<tr><td colspan="9" class="empty">Nenhum item</td></tr>';
}

