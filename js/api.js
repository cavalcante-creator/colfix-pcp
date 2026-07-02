/* ============================================================
   api.js
   Integração com Google Sheets (Apps Script / gviz CSV): busca das abas, parsing de CSV e troca de horizonte/reprocessamento.
   ============================================================ */

/* ==============================================================
   FETCH
   ============================================================== */
function initLoad(){
  el('conn-status').textContent='ATUALIZANDO...';
  Promise.all(ABAS.map(fetchAba))
    .then(function(r){var d={};ABAS.forEach(function(a,i){d[a]=r[i];});G.rawData=d;processar(d);el('conn-status').textContent='CONECTADO';})
    .catch(function(e){console.warn('Erro:',e);el('conn-status').textContent='ERRO CONEXÃO';var d={SALDO:[],PARAMETROS:[],PERFIL:[],ORDENS:[],EXTRATO:[],PREVISAO:[],'LINHAS ':[],'CAPACIDADE ':[]};G.rawData=d;processar(d);});
}
function fetchAba(aba){return fetch("https://docs.google.com/spreadsheets/d/"+PUB_ID+"/gviz/tq?tqx=out:csv&sheet="+encodeURIComponent(aba)).then(function(r){return r.ok?r.text():Promise.reject(aba);}).then(parseCSV);}
function parseCSV(csv){var ls=csv.split('\n');if(!ls.length) return[];var cols=splitL(ls[0]);var rows=[];for(var i=1;i<ls.length;i++){var l=ls[i].trim();if(!l) continue;var vals=splitL(l);var obj={};cols.forEach(function(c,ci){obj[limpC(c)]=limpV(vals[ci]);});vals.forEach(function(v,vi){obj['_col'+vi]=limpV(v);});rows.push(obj);}return rows;}
function splitL(l){var r=[],c='',q=false;for(var i=0;i<l.length;i++){var ch=l[i];if(ch==='"'){q=!q;}else if(ch===','&&!q){r.push(c);c='';}else{c+=ch;}}r.push(c);return r;}
function limpC(c){return(c||'').trim().replace(/^"|"$/g,'');}
function limpV(v){return(v===undefined||v===null)?'':String(v).trim().replace(/^"|"$/g,'');}
function ehTrue(v){var t=s(v).toLowerCase();return t==='true'||t==='1'||t==='sim'||t==='yes';}
function reprocessar(){HORIZONTE_PROJ=parseInt(v('cfg-horizonte-proj'))||21;if(G.rawData)processar(G.rawData);}
function mudarHorizonte(){HORIZONTE_OFA=parseInt(v('cfg-horizonte'))||14;txt('horizonte-label',HORIZONTE_OFA+'d');if(G.rawData)processar(G.rawData);}

