import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../../app/avantavendas/sistema/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['chaveSelecaoEnvioDivulgacao','invalidarPreparoEnvioDivulgacao','cancelarPreparoEnvioDivulgacao','continuarPreparoEnvioDivulgacao','limparSelecaoMateriaisDivulgacao','alternarSelecaoMaterialDivulgacao','selecionarLoteMateriaisDivulgacao','renderBarraSelecaoMateriaisDivulgacao','prepararEnvioMateriaisDivulgacao','compartilharMateriaisSelecionadosDivulgacao'];
const code=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
function ambiente(n=10){
 const timers=new Map(),chamadas=[],avisos=[];let tid=0;
 const materiais=Array.from({length:15},(_,i)=>({id:'m'+i,pasta_id:'p',arquivo_url:'https://example.test/'+i,titulo:'Foto '+i}));
 const c=vm.createContext({AbortController,Set,Map,JSON,Date,setTimeout:fn=>{timers.set(++tid,fn);return tid},clearTimeout:id=>timers.delete(id),state:{usuario:{id:'u'},contaVendasAtiva:{id:'a'},divulgacaoMateriais:materiais},divulgacaoSelecaoAtiva:true,divulgacaoSelecaoPastaId:'p',divulgacaoMateriaisSelecionados:new Set(materiais.slice(0,n).map(m=>m.id)),divulgacaoCompartilhamentoMultiploEmAndamento:false,divulgacaoCompartilhamentoStatus:'',divulgacaoCompartilhamentoAbortController:null,divulgacaoEnvioPreparado:null,divulgacaoPreparoDemorado:false,divulgacaoAbrindoCompartilhamento:false,ignorarCliqueSelecaoDivulgacaoAte:0,LIMITE_SELECAO_MATERIAIS_DIVULGACAO:10,buscaAplicada:'',normalizar:s=>s.toLowerCase(),escapeHtml:s=>s,svgIcon:()=>'',window:{},app:{querySelectorAll:()=>materiais.map(m=>({dataset:{materialId:m.id}}))},render:()=>{},atualizarBarraSelecaoDivulgacao:()=>{},atualizarStatusCompartilhamentoMultiploDivulgacao:()=>{},usarDownloadProvisorioAndroidDivulgacao:()=>false,podeCompartilharArquivosDivulgacao:()=>true,solicitarCompartilhamentoNativoDivulgacao:()=>null,prepararArquivoMaterialDivulgacao:async m=>{chamadas.push('preparar:'+m.id);return {name:m.id+'.jpg'}},tentarCompartilharArquivosWebDivulgacao:async a=>{chamadas.push('compartilhar:'+a.length);return true},toast:m=>avisos.push(m),compartilhamentoCanceladoDivulgacao:e=>e.name==='AbortError',traduzErroCompartilhamento:e=>e.name==='AbortError'?'':e.message});
 vm.runInContext(code,c);return {c,timers,chamadas,avisos};
}
test('prepara sem abrir sistema; novo toque compartilha sem baixar novamente e limpa após sucesso',async()=>{
 const {c,chamadas}=ambiente();assert.match(c.renderBarraSelecaoMateriaisDivulgacao(),/Preparar envio/);
 await c.prepararEnvioMateriaisDivulgacao();assert.equal(chamadas.length,10);assert.ok(c.divulgacaoEnvioPreparado);assert.match(c.renderBarraSelecaoMateriaisDivulgacao(),/Envio pronto/);assert.match(c.renderBarraSelecaoMateriaisDivulgacao(),/Compartilhar 10/);
 const p=c.compartilharMateriaisSelecionadosDivulgacao();assert.equal(chamadas[10],'compartilhar:10','abertura é chamada no mesmo turno do clique');await p;
 assert.equal(chamadas.length,11);assert.equal(c.divulgacaoSelecaoAtiva,false);assert.equal(c.divulgacaoEnvioPreparado,null);
});
test('cancelar janela ou falhar preserva envio pronto para tentar sem refazer arquivos',async()=>{
 const {c,chamadas,avisos}=ambiente(2);await c.prepararEnvioMateriaisDivulgacao();
 c.tentarCompartilharArquivosWebDivulgacao=async()=>{throw {name:'AbortError'}};
 await c.compartilharMateriaisSelecionadosDivulgacao();assert.equal(avisos.length,0);assert.ok(c.divulgacaoEnvioPreparado);assert.equal(c.divulgacaoCompartilhamentoMultiploEmAndamento,false);
 c.tentarCompartilharArquivosWebDivulgacao=async()=>{throw new Error('Falhou')};await c.compartilharMateriaisSelecionadosDivulgacao();assert.equal(avisos[0],'Falhou');assert.ok(c.divulgacaoEnvioPreparado);
 c.tentarCompartilharArquivosWebDivulgacao=async()=>true;await c.compartilharMateriaisSelecionadosDivulgacao();assert.equal(chamadas.length,2);
});
test('demora permite continuar ou cancelar preservando seleção; resposta tardia é descartada',async()=>{
 const {c,timers}=ambiente(2);let resolver;
 c.prepararArquivoMaterialDivulgacao=()=>new Promise(r=>resolver=r);
 const p=c.prepararEnvioMateriaisDivulgacao();[...timers.values()][0]();assert.equal(c.divulgacaoPreparoDemorado,true);
 c.continuarPreparoEnvioDivulgacao();assert.equal(c.divulgacaoPreparoDemorado,false);
 c.cancelarPreparoEnvioDivulgacao();assert.equal(c.divulgacaoMateriaisSelecionados.size,2);assert.equal(c.divulgacaoSelecaoAtiva,true);
 resolver({name:'tardio.jpg'});await p;assert.equal(c.divulgacaoEnvioPreparado,null);assert.equal(timers.size,0);
});
test('preparo nativo termina antes de pronto e contexto alterado descarta arquivos',async()=>{
 const {c}=ambiente(1);let resolver,descartes=0,shares=0;
 c.window.__avantavendasPrepararCompartilhamentoArquivos=()=>new Promise(r=>resolver=r);
 const p=c.prepararEnvioMateriaisDivulgacao();await new Promise(r=>setImmediate(r));assert.equal(c.divulgacaoEnvioPreparado,null);
 resolver({descartar(){descartes++},compartilhar(){shares++;return Promise.resolve(true)}});await p;assert.ok(c.divulgacaoEnvioPreparado);assert.equal(shares,0);
 c.state.contaVendasAtiva.id='outra';await c.compartilharMateriaisSelecionadosDivulgacao();assert.equal(shares,0);assert.equal(descartes,1);
 const segundo=ambiente(1);let liberar;segundo.c.window.__avantavendasPrepararCompartilhamentoArquivos=()=>new Promise(r=>liberar=r);
 const q=segundo.c.prepararEnvioMateriaisDivulgacao();await new Promise(r=>setImmediate(r));segundo.c.cancelarPreparoEnvioDivulgacao();liberar({descartar(){descartes++}});await q;assert.equal(descartes,2);assert.equal(segundo.c.divulgacaoEnvioPreparado,null);
});
test('seleção em lote e clique respeitam dez; alterar seleção invalida preparo',async()=>{
 const {c}=ambiente(0);c.selecionarLoteMateriaisDivulgacao();assert.equal(c.divulgacaoMateriaisSelecionados.size,10);assert.match(c.renderBarraSelecaoMateriaisDivulgacao(),/Selecionar 10/);
 c.alternarSelecaoMaterialDivulgacao('m11');assert.equal(c.divulgacaoMateriaisSelecionados.size,10);
 await c.prepararEnvioMateriaisDivulgacao();c.alternarSelecaoMaterialDivulgacao('m0');assert.equal(c.divulgacaoMateriaisSelecionados.size,9);assert.equal(c.divulgacaoEnvioPreparado,null);
});
