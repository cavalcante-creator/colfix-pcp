/* ============================================================
   state.js
   Estado global da aplicação: configurações, nomes de abas/linhas, objeto G (estado compartilhado) e bootstrap de carregamento.
   ============================================================ */


/* ==============================================================
   CONFIG
   ============================================================== */
var PUB_ID="1_jTVohMskSRguXpHF8n5ym7WPHfjasvl92PXAPSrat8";
var ABAS=['SALDO','PARAMETROS','PERFIL','ORDENS','EXTRATO','PREVISAO','LINHAS ','CAPACIDADE '];
var LINHAS_NOMES={'L1':'Linha 1','L2':'Linha 2','L3':'Linha 3','AREA LIQUIDA':'Área Líquida','MQ 1':'Máquina 1','MAQ 2':'Máquina 2','REJUNTE ACRILICO':'Rejunte Acrílico'};
var LINHAS_KEYS=['L1','L2','L3','AREA LIQUIDA','MQ 1','MAQ 2','REJUNTE ACRILICO'];
var DIAS_PT=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
var HORIZONTE_OFA=14;  // dias para considerar OFA como cobertura
var HORIZONTE_PROJ=21; // dias de projeção temporal
var G={
  saldo:[],parametros:[],perfil:[],ordens:[],extrato:[],previsao:[],linhasAba:[],capacidadeAba:[],
  itens:[],epp:[],nfs:[],prodDiaria:[],prevItens:[],linhasInfo:[],
  schedule:null,semanaOffset:0,linhaForecast:null,charts:{},
  rawData:null // guarda dados brutos para reprocessar
};

