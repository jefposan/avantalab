import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const parent=readFileSync('app/vendas/VendasIntegrado.tsx','utf8');
const child=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const defer=()=>{let resolve,reject;const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});return {promise,resolve,reject};};
const tick=()=>new Promise(setImmediate);
function run(code,env){vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,env);}
function catalogLoader() {
 const deferred = defer();
 const state = {};
 const env = { exports:{}, Error, URLSearchParams, AbortSignal,
   catalogoGenerationRef:{current:0}, activeCompanyRef:{current:'company'}, useCallback:fn=>fn,
   supabase:{auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}},
   fetch:()=>deferred.promise, setCatalogo:value=>{state.catalog=value;},
   setErroCatalogo:value=>{state.error=value;},
 };
 const start=parent.indexOf('  const carregarCatalogo = useCallback('), end=parent.indexOf('\n  useEffect(',start);
 run(parent.slice(start,end)+'\nexports.load=carregarCatalogo;',env);
 return { state, deferred, load:env.exports.load, activeCompany:env.activeCompanyRef };
}

test('resposta lenta do catálogo não precisa de permissões nem altera o perfil que está aberto', async () => {
 const h = catalogLoader(), pending = h.load('company');
 await tick();
 assert.equal(h.state.catalog, undefined);
 const result={itens:[]};
 h.deferred.resolve({ok:true,json:async()=>({catalogo:result})});
 await pending;
 assert.equal(h.state.catalog, result);
 assert.equal(h.state.error, '');
});

test('erro de catálogo fica local e atualização em segundo plano não apaga o retrato anterior', async () => {
 for (const somenteDados of [false,true]) {
   const h=catalogLoader(), pending=h.load('company', somenteDados);
   await tick();
   h.deferred.reject(new Error('Catálogo indisponível'));
   await pending;
   assert.equal(h.state.error, somenteDados ? undefined : 'Catálogo indisponível');
   assert.equal(h.state.catalog, undefined);
 }
});

test('catálogo tardio não repõe dados de uma empresa anterior', async () => {
 const h=catalogLoader(), pending=h.load('company');
 h.activeCompany.current='other-company';
 h.deferred.resolve({ok:true,json:async()=>({catalogo:{itens:[1]}})});
 await pending;
 assert.equal(h.state.catalog, undefined);
});

test('Vendas prepara a Visão geral escondida e carrega complementos só após a abertura', () => {
 assert.match(parent, /className=\{`absolute.*mostrarVendas/);
 assert.match(parent, /!mostrarVendas && <TransicaoNavegacaoInterna/);
 assert.match(parent, /perfilComAplicativo = mostrarVendas && permissoes\?\.snapshot.available === true/);
 assert.match(parent, /if \(!empresaId\) return;\s*void carregarPermissoes\(empresaId\)/);
 assert.doesNotMatch(parent, /iframePronto\) void carregarPermissoes/);
});

test('a hero só sinaliza após perfil, permissões e resumo, ou uma resposta de erro utilizável', () => {
 const start=child.indexOf('  const primeiraHeroConcluida');
 const end=child.indexOf('  const consultarComplementosFiscais',start);
 assert.ok(start > 0 && end > start);
 for (const [profile, accessSettled, granted, overview, error, ready] of [
   [false,true,true,{},'',false],
   [true,false,true,{},'',false],
   [true,true,true,null,'',false],
   [true,true,true,{},'',true],
   [true,true,true,null,'Consulta indisponível',true],
   [true,true,false,null,'',true],
 ]) {
   const sent=[];
   run(child.slice(start,end),{exports:{},managementProfileReady:profile,accessBridgeState:{integrated:true,loading:!accessSettled},managementAccessReady:granted,
    overviewSummary:overview,overviewError:error,integratedManagementRuntime:true,empresaDaHero:'company',managementBridgeOrigin:'http://localhost:3000',
    MENSAGEM_VENDAS_HERO_PRONTA:'ready',useEffect:fn=>fn(),window:{parent:{postMessage:msg=>sent.push(msg)}},
   });
   assert.equal(sent.length,ready?1:0);
   if(ready)assert.equal(sent[0].empresaId,'company');
 }
});

test('troca encaminhada pelo iframe exige origem, janela e empresa atuais', () => {
 const start=parent.indexOf('    const receber = (event: MessageEvent) => {');
 const end=parent.indexOf('      if (event.data?.type === RETURN_TO_MANAGEMENT_MESSAGE_TYPE)',start);
 const sender={}, forwarded=[], revealed=[];
 const env={exports:{},origemPrototipo:'http://localhost:3000',iframeRef:{current:{contentWindow:sender}},empresaId:'company',
  MENSAGEM_VENDAS_HERO_PRONTA:'ready',setHeroPronta:value=>revealed.push(value),MENSAGEM_TROCA_MODULO:'switch', criarRotaTrocaModulo:()=>'/custos', solicitarTrocaAoHospedeiro:data=>{forwarded.push(data.destino);return true;},
 };
 run(parent.slice(start,end)+'\n};exports.receive=receber;',env);
 const valid={origin:env.origemPrototipo,source:sender,data:{type:'switch',empresaId:'company',destino:'custos'}};
 for(const event of [{...valid,origin:'https://other.invalid'},{...valid,source:{}},{...valid,data:{...valid.data,empresaId:'other'}}])env.exports.receive(event);
 assert.deepEqual(forwarded,[]);
 env.exports.receive(valid);
 assert.deepEqual(forwarded,['custos']);
 const ready={...valid,data:{type:'ready',empresaId:'company'}};
 env.exports.receive({...ready,source:{}});
 env.exports.receive({...ready,data:{type:'ready',empresaId:'other'}});
 assert.deepEqual(revealed,[]);
 env.exports.receive(ready);
 assert.deepEqual(revealed,[true]);
});
