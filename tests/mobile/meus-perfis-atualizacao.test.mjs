import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('public/mobile-app.js','utf8');
const ast=ts.createSourceFile('mobile.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),functions=new Map();
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node.getText(ast));ts.forEachChild(node,visit);}visit(ast);
function environment(){
 const state={empresa:{id:'tridium'},usuario:{id:'user'},empresas:[{id:'tridium',nome:'TRIDIUM COSMETICOS'},{id:'other',nome:'Outro perfil'}],perfisDashboardLiberados:['tridium','other'],mes:'NOVEMBRO',ano:'2026',dadosCriticosProntos:true,carregando:false,financeiroPeriodoPronto:'user:tridium:2026:NOVEMBRO',resumoPerfisSolicitacao:0,resumoPerfisCarregando:false,entradas:[],faturamentos:{NOVEMBRO:51371},lancamentos:[{id:1,ano:2026,mes:'NOVEMBRO',dia:10,valor:39527.66,status:'confirmada'}],resumoPerfis:[{id:'tridium',nome:'TRIDIUM COSMETICOS',receitas:51371,despesas:39527.66,resultado:11843.34},{id:'other',nome:'Outro perfil',receitas:62461.34,despesas:73109.3,resultado:-10647.96}]};
 const ctx={state,Number,Object,Math,Date,console,ehLojaNativaMobile:()=>true,somenteModulosNoAppNativo:()=>false,premiumPessoalBloqueadoMobile:()=>false,normalizarTipoPerfil:()=> 'empresa',nomeEmpresa:p=>p.nome,indiceMes:m=>m==='NOVEMBRO'?10:11,dataFutura:(_a,_m,d)=>d>17,ehDataHoje:(_a,_m,d)=>d===17,ehDespesaFutura:(_m,d)=>d>17,ehDespesaProjetada:(l)=>l.status==='prevista'||l.dia>17,ehDespesaRealizada:(l)=>l.status!=='prevista'&&l.status!=='cancelada'&&l.dia<=17,lancamentosDoCentroCustoAtualMobile:()=>state.lancamentos.filter(l=>!state.centrosCustoAtivo||l.centroCustoId===state.centroCustoSelecionadoId),entradasDoCentroCustoAtualMobile:()=>state.entradas.filter(l=>!state.centrosCustoAtivo||l.centroCustoId===state.centroCustoSelecionadoId),itemPertenceAoCentroCustoAtualMobile:()=>true,valoresCardVisiveis:()=>true,dinheiro:n=>'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),nomeMesCompleto:m=>m,escapeHtml:String,rotuloTipoPerfil:()=> 'Empresa',botaoVisibilidadeValoresHtml:()=>''};
 vm.createContext(ctx);vm.runInContext(['financeiroPeriodoChaveMobile','financeiroMesProntoMobile','dadosMes','aplicarFinanceiroPeriodoMobile','carregarPeriodoPreparadoMobile','registroFinanceiroDaFilaMobile','aplicarMovimentoLocalMobile','resumoPerfisAtuaisMobile','meusPerfisCardHtml','carregarResumoPerfisMobile'].map(name=>functions.get(name)||'').join('\n'),ctx);
 return{state,ctx,render:()=>ctx.meusPerfisCardHtml()};
}
test('novo faturamento atualiza gráfico, perfil e consolidado no mesmo render, sem rede ou soma duplicada',()=>{
 const a=environment();assert.match(a.render(),/51\.371,00/);
 a.ctx.aplicarMovimentoLocalMobile({tipo:'receita',acao:'incluir',ano:2026,projecoes:[{id:'local:operation',ano:2026,mes:'NOVEMBRO',dia:17,valor:69419,status:null}],originais:[]});
 assert.equal(a.ctx.dadosMes('NOVEMBRO').receitas,120790);
 for(let i=0;i<20;i++){const html=a.render();assert.match(html,/120\.790,00/);assert.match(html,/183\.251,34/);assert.match(html,/70\.614,38/);}
 assert.equal(a.state.resumoPerfis[0].receitas,51371,'a fotografia não é incrementada repetidamente');
});
test('despesa editada, excluída e prevista recompõe resultado sem incluir outros meses ou canceladas',()=>{
 const a=environment();a.state.lancamentos=[{mes:'NOVEMBRO',dia:10,valor:200,status:'confirmada'},{mes:'NOVEMBRO',dia:20,valor:999,status:'prevista'},{mes:'NOVEMBRO',dia:10,valor:999,status:'cancelada'},{mes:'OUTUBRO',dia:10,valor:999,status:'confirmada'}];
 assert.match(a.render(),/51\.171,00/);a.state.lancamentos=[];assert.match(a.render(),/51\.371,00/);
});
test('comparativo continua com o perfil inteiro quando o gráfico está filtrado por centro',()=>{
 const a=environment();a.state.centrosCustoAtivo=true;a.state.centroCustoSelecionadoId='A';a.state.faturamentos.NOVEMBRO=1000;a.state.entradas=[{mes:'NOVEMBRO',valor:400,centroCustoId:'A'},{mes:'NOVEMBRO',valor:600,centroCustoId:'B'}];a.state.lancamentos=[{mes:'NOVEMBRO',dia:10,valor:100,centroCustoId:'A'},{mes:'NOVEMBRO',dia:10,valor:200,centroCustoId:'B'}];
 assert.equal(a.ctx.dadosMes('NOVEMBRO').receitas,400);assert.match(a.render(),/1\.000,00/);assert.match(a.render(),/700,00/);assert.equal(a.state.centroCustoSelecionadoId,'A');
});
function responseGate(a){let finish;const gate=new Promise(resolve=>finish=resolve);a.ctx.db={from(table){const query={select(){return this;},in(){return this;},eq(){return this;},then(resolve,reject){return gate.then(()=>({data:table==='faturamentos'?[{empresa_id:'tridium',valor:51371}]:a.state.lancamentos.map(l=>({...l,empresa_id:'tridium',ano:2026}))})).then(resolve,reject);}};return query;}};return finish;}
test('resposta antiga do resumo não faz valor do perfil aberto regredir depois de receita local',async()=>{
 const a=environment(),finish=responseGate(a),read=a.ctx.carregarResumoPerfisMobile();a.state.faturamentos.NOVEMBRO=120790;finish();await read;assert.match(a.render(),/120\.790,00/);
});
test('trocar mês antes de a consulta voltar descarta resumo do período anterior',async()=>{
 const a=environment(),previous=a.state.resumoPerfis,finish=responseGate(a),read=a.ctx.carregarResumoPerfisMobile();a.state.mes='DEZEMBRO';finish();assert.equal(await read,false);assert.equal(a.state.resumoPerfis,previous);
});

test('releitura por Realtime substitui o total sem somar novamente nem depender do resumo remoto',()=>{
 const a=environment();a.ctx.aplicarEdicoesPendentesMobile=()=>{};
 for(let i=0;i<10;i++)a.ctx.aplicarFinanceiroPeriodoMobile({faturamento:120790,lancamentos:a.state.lancamentos,entradas:[]},'NOVEMBRO');
 assert.match(a.render(),/120\.790,00/);assert.equal(a.ctx.dadosMes('NOVEMBRO').receitas,120790);
});
test('troca de mês com cache pronto atualiza os perfis sem bloquear o mês ou mostrar outro período',async()=>{
 const a=environment();let finish,requested=0,rendered=0;const gate=new Promise(resolve=>finish=resolve);
 a.state.mes='DEZEMBRO';a.ctx.financeiroCacheVigenteMobile=()=>true;a.ctx.render=()=>{};a.ctx.agendarPreCargaFinanceiroMobile=()=>{};a.ctx.cardsDashboardVisiveis=()=>['meusPerfis'];a.ctx.agendarRenderSegundoPlanoMobile=()=>rendered++;
 a.ctx.obterFinanceiroPeriodoCacheMobile=async()=>({faturamento:900,lancamentos:[],entradas:[]});a.ctx.aplicarEdicoesPendentesMobile=()=>{};
 a.ctx.carregarResumoPerfisMobile=()=>{requested++;return gate;};
 await a.ctx.carregarPeriodoPreparadoMobile();assert.equal(requested,1);assert.equal(a.state.financeiroPeriodoPronto,'user:tridium:2026:DEZEMBRO');assert.equal(a.state.resumoPerfis.length,0);assert.equal(a.state.resumoPerfisCarregando,true);assert.match(a.render(),/R\$ —/);assert.doesNotMatch(a.render(),/51\.371,00/);
 finish();await gate;await new Promise(setImmediate);assert.equal(rendered,1);
});
test('perfil sem Dashboard não ganha card financeiro pela correção',()=>{const a=environment();a.ctx.somenteModulosNoAppNativo=()=>true;assert.equal(a.render(),'');});
