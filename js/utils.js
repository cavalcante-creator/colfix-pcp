/* ============================================================
   utils.js
   Funções utilitárias puras: datas, números, formatação e pequenos helpers de DOM usados em todo o sistema.
   ============================================================ */

/* ==============================================================
   UTILITÁRIOS DE DATA
   ============================================================== */
function parseDate(str){
  str=s(str).trim();if(!str||str==='-'||str.length<8) return null;
  if(/^\d{4}-\d{2}-\d{2}/.test(str)){var d=new Date(str.substring(0,10)+'T00:00:00');return isNaN(d.getTime())?null:d;}
  if(/^\d{2}\/\d{2}\/\d{4}/.test(str)){var p=str.split('/');var d=new Date(p[2]+'-'+p[1]+'-'+p[0]+'T00:00:00');return isNaN(d.getTime())?null:d;}
  if(/^\d{2}\/\d{2}\/\d{2}$/.test(str)){var p=str.split('/');var a=parseInt(p[2])<50?'20'+p[2]:'19'+p[2];var d=new Date(a+'-'+p[1]+'-'+p[0]+'T00:00:00');return isNaN(d.getTime())?null:d;}
  var d=new Date(str);return isNaN(d.getTime())?null:d;
}
function difDias(d1,d2){if(!d1||!d2) return null;return Math.round((d2.getTime()-d1.getTime())/86400000);}
function fmtDate(d){if(!d) return '--';return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
function isoDate(d){if(!d) return '';return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function hoje0(){var d=new Date();d.setHours(0,0,0,0);return d;}
function addDias(d,n){var r=new Date(d);r.setDate(r.getDate()+n);return r;}
function isDiaUtil(d){var dw=d.getDay();return dw!==0&&dw!==6;}
// Gera array de datas (todos os dias) por N dias a partir de HOJE
function gerarDias(n,inicio){var base=inicio||hoje0();var dias=[];for(var i=0;i<n;i++) dias.push(addDias(base,i));return dias;}


/* ==============================================================
   HELPERS
   ============================================================== */
function el(id){return document.getElementById(id);}
function txt(id,v){var e=el(id);if(e) e.textContent=v;}
function v(id){var e=el(id);return e?e.value:'';}
function s(val){return val===null||val===undefined?'':String(val).trim();}
function n(val){if(typeof val==='number') return val;var str=s(val);if(str.includes(',')&&str.includes('.')){str=str.replace(/\./g,'').replace(',','.');}else if(str.includes(',')) str=str.replace(',','.');if(!str.includes(',')&&str.includes('.')){var pts=str.split('.');if(pts.length===2&&pts[1].length===3) str=str.replace('.','');}var f=parseFloat(str);return isNaN(f)?0:f;}
function fN(val){return(typeof val==='number'?val:n(val)).toLocaleString('pt-BR');}
function bdgCap(st){var m={'OFA ATENDE':'bdg-s','NORMAL':'bdg-m','CAP LIMITADA':'bdg-w','SEM CAPACIDADE':'bdg-p','PRODUZIR URGENTE':'bdg-d'};return '<span class="bdg '+(m[st]||'bdg-m')+'">'+st+'</span>';}
function bdgPrev(st){var m={'ACIMA':'bdg-s','DENTRO':'bdg-w','ABAIXO':'bdg-d'};return '<span class="bdg '+(m[st]||'bdg-m')+'">'+st+'</span>';}
function bdgRisco(r){var m={'CRITICO':'bdg-d','URGENTE':'bdg-o','MODERADO':'bdg-w','BAIXO':'bdg-i','OK':'bdg-s'};var l={'CRITICO':'🔴 CRÍTICO','URGENTE':'🟠 URGENTE','MODERADO':'🟡 MODERADO','BAIXO':'🔵 BAIXO','OK':'✅ OK'};return '<span class="bdg '+(m[r]||'bdg-m')+'">'+(l[r]||r)+'</span>';}
function covChip(d){if(d>=999) return '<span class="cov-chip s">∞</span>';if(d<=2) return '<span class="cov-chip c">'+d.toFixed(1)+'d ⚠</span>';if(d<=7) return '<span class="cov-chip w">'+d.toFixed(1)+'d</span>';return '<span class="cov-chip s">'+d.toFixed(1)+'d</span>';}
function ofaChip(it){if(!it) return '';if(it.OFAAtrasada>0) return '<span class="ofa-chip atrasada">⏰ Atr. '+fN(Math.round(it.OFAAtrasada))+'sc</span>';if(it.OFAFora>0&&it.OFAHorizonte<=0) return '<span class="ofa-chip fora">Fora '+fN(Math.round(it.OFAFora))+'sc</span>';if(it.OFAHorizonte>0) return '<span class="ofa-chip semana">OFA '+fN(Math.round(it.OFAHorizonte))+'sc</span>';return '<span class="ofa-chip semdata">Sem OFA</span>';}

