import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const parent=readFileSync('app/vendas/VendasIntegrado.tsx','utf8');
const child=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(setImmediate);
function run(code,env){vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,env);}
function loader({failCatalog=false}={}){
 const catalog=defer(),permission=defer(),state={};
 const env={exports:{},Error,URLSearchParams,Date,activeCompanyRef:{current:'company'},useCallback:fn=>fn,supabase:{auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}},aguardarComLimite:p=>p,
 fetch:async url=>url.includes('/perfil?')?{ok:true,json:async()=>({tipoPerfil:'empresa',cadastro:{empresa_id:'company'}})}:failCatalog?Promise.reject(Error('Catálogo indisponível')):catalog.promise};
 for(const key of ['Erro','Catalogo','LogoUrl','PerfilCadastro','CorPrimaria','DadosProntosEmpresa','ApresentacaoEmpresa'])env['set'+key]=v=>state[key]=typeof v==='function'?v(state[key]):v;
 for(const name of ['DocumentosFiscais','RegrasFiscais','PerfilFiscal','Recebimentos','Estoque','Clientes','Fornecedores','Operacoes'])env['carregar'+name]=async()=>{};
 env.carregarPermissoes=()=>{state.permissionStarted=true;return permission.promise;};
 env.carregarResumo=()=>permission.promise;
 const start=parent.indexOf('  const carregarCatalogo = useCallback('),end=parent.indexOf('\n  useEffect(',start);
 run(parent.slice(start,end)+'\nexports.load=carregarCatalogo;',env);
 return {state,catalog,permission,load:env.exports.load};
}
test('catálogo e permissões lentos mantêm a preparação; catálogo vazio válido conclui',async()=>{
 const h=loader(),pending=h.load('company');await tick();assert.equal(h.state.DadosProntosEmpresa,'');
 h.catalog.resolve({ok:true,json:async()=>({catalogo:{itens:[]}})});await tick();
 assert.equal(h.state.DadosProntosEmpresa,'','não revelar totais enquanto permissões/dados estão pendentes');
 h.permission.resolve(true);await pending;assert.equal(h.state.DadosProntosEmpresa,'company');assert.equal(h.state.Erro,'');
});
test('falha real no catálogo encerra a espera e permite a tela de erro',async()=>{
 const h=loader({failCatalog:true});await h.load('company');assert.equal(h.state.DadosProntosEmpresa,'company');assert.equal(h.state.Erro,'Catálogo indisponível');assert.equal(h.state.PerfilCadastro.empresa_id,'company','ajustes continuam acessíveis com perfil confirmado');h.permission.resolve(false);
});
test('apresentação aguarda acesso e dois frames; certificado em consulta não bloqueia a Visão geral',()=>{
 const start=child.indexOf("  useEffect(() => {\n    if ((!overviewSummary&&!overviewError) || !presentationVersion || !integratedManagementRuntime || !managementCatalogBridge?.companyId"),end=child.indexOf('  const sidebarFiscalStatus',start);
 assert.ok(start>0&&end>start);
 for(const scenario of ['requestPending','accessPending','certificatePending','denied','ready']){
  const frames=[],messages=[];
  const env={overviewSummary:{start:'2026-11-01'},overviewError:'',presentationVersion:scenario==='requestPending'?0:1,integratedManagementRuntime:true,managementCatalogBridge:{companyId:'company'},managementProfileReady:true,accessBridgeState:{integrated:true,loading:scenario==='accessPending',available:scenario==='ready'},fiscalCertificateBridgeState:{integrated:true,loading:scenario==='certificatePending'},managementBridgeOrigin:'http://localhost:3000',useEffect:fn=>fn(),requestAnimationFrame:fn=>(frames.push(fn),frames.length),cancelAnimationFrame:()=>{},window:{parent:{postMessage:(message,origin)=>messages.push({message,origin})}}};
  run(child.slice(start,end),env);assert.equal(messages.length,0);
  if(scenario==='requestPending'||scenario==='accessPending')assert.equal(frames.length,0);
  else {frames.shift()();assert.equal(messages.length,0);frames.shift()();assert.equal(messages[0].message.settled,true);assert.equal(messages[0].message.companyId,'company');assert.equal(messages[0].origin,'http://localhost:3000');assert.equal(env.accessBridgeState.available,scenario==='ready');}
 }
});
test('confirmação de apresentação rejeita origem, janela e empresa diferentes',()=>{
 const start=parent.indexOf('    const receber = (event: MessageEvent) => {'),end=parent.indexOf("      if (event.data?.type === 'AVANTALAB_VENDAS_CATALOGO_READY_V1')",start);
 const sender={},received=[];const env={exports:{},origemPrototipo:'http://localhost:3000',iframeRef:{current:{contentWindow:sender}},empresaId:'company',RETURN_TO_MANAGEMENT_MESSAGE_TYPE:'return',retornarParaGestao:()=>{},setApresentacaoEmpresa:id=>received.push(id)};
 run(parent.slice(start,end)+'\n};exports.receive=receber;',env);
 const valid={origin:env.origemPrototipo,source:sender,data:{type:'AVANTALAB_VENDAS_PRESENTATION_V1',companyId:'company',settled:true}};
 for(const event of [{...valid,origin:'https://other.invalid'},{...valid,source:{}},{...valid,data:{...valid.data,companyId:'other'}},{...valid,data:{...valid.data,settled:false}}])env.exports.receive(event);
 assert.equal(received.length,0);env.exports.receive(valid);assert.deepEqual(received,['company']);
});

test('históricos lentos de outras abas não bloqueiam a Visão geral',async()=>{
 const h=loader(),pending=h.load('company');h.catalog.resolve({ok:true,json:async()=>({catalogo:{itens:[]}})});h.permission.resolve(true);await pending;
 assert.equal(h.state.DadosProntosEmpresa,'company');
 const start=parent.indexOf('const dadosIniciais ='),end=parent.indexOf('const parametros =',start);
 assert.doesNotMatch(parent.slice(start,end),/carregarEstoque|carregarClientes|carregarFornecedores|carregarDocumentosFiscais|carregarPerfilFiscal/);
});

test('permissões e resumos começam antes de o catálogo responder, sem abrir a página antes deles',async()=>{
 const h=loader(),pending=h.load('company');await tick();
 assert.equal(h.state.permissionStarted,true,'permissões iniciadas enquanto o catálogo está pendente');
 assert.equal(h.state.DadosProntosEmpresa,'');
 h.permission.resolve(true);await tick();assert.equal(h.state.DadosProntosEmpresa,'','catálogo ainda pendente');
 h.catalog.resolve({ok:true,json:async()=>({catalogo:{itens:[]}})});await pending;assert.equal(h.state.DadosProntosEmpresa,'company');
});
