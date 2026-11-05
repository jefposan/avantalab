import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {removalBlockers,removalNeedsDeletion} from '../../app/modules/marketplaces/product-removal.ts';
const require=createRequire(import.meta.url);
const id='11111111-1111-4111-8111-111111111111';
const key='22222222-2222-4222-8222-222222222222';
const clone=value=>JSON.parse(JSON.stringify(value));
function review(){return {product:{id,name:'Produto de teste',revision:2,stock_quantity:null,links:[{id:'link1',connection_id:'account1',provider:'mercado_livre',provider_listing_id:'MLB1'},{id:'link2',connection_id:'account2',provider:'magalu',provider_listing_id:'SKU2'}]},allocations:[],accounts:[{id:'account1'},{id:'account2'}],history:true,mode:'deleted',stockBlocked:false,workBlocked:false};}
function harness(options={}){
 const calls=[],exported={};let contexts=0,current=review(),remoteStatus=options.status??'closed';
 const db={rpc:async(name,args)=>{calls.push([name,args]);if(name==='marketplace_product_removal_context'){contexts++;current=options.context?.(contexts)??review();return {data:current};}if(name==='marketplace_product_removal_candidates')return {data:options.targets??current.product.links.map(link=>({...link,unlinked:false,conflict:false}))};return {data:{productId:id,mode:'deleted'}};},from:table=>{let updating=false;return {select(){return this;},eq(){return this;},in(){return this;},limit(){return this;},update(value){updating=true;calls.push(['audit-confirmed',{table,value}]);return this;},then(resolve){return Promise.resolve({data:updating?null:options.pendingActions??[]}).then(resolve);},async maybeSingle(){return {data:options.previous??null,error:options.auditError};}};}};
 class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
 vm.runInNewContext(ts.transpileModule(readFileSync('app/modules/marketplaces/services/product-removal.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exported,setTimeout,clearTimeout,require(name){
  if(name==='server-only')return {};
  if(name==='node:crypto')return require(name);
  if(name.includes('management-access'))return {MarketplaceError};
  if(name.includes('listing-model'))return {uuidIsValid:x=>typeof x==='string'&&x.length===36,objectValue:x=>x&&typeof x==='object'?x:{}};
  if(name.includes('integration-adapters'))return {integrationAdapter:async(_db,company,account)=>{calls.push(['adapter',{company,account}]);if(options.failure===account)throw new Error('Conta desconectada');return {provider:account==='account1'?'mercado_livre':'magalu',read:async listing=>{calls.push(['read',listing]);return {id:options.wrongId?'other':listing,status:remoteStatus,substatus:options.substatus??[],stock:0,ean:options.ean??'7898520002245',variations:options.variations??[]};},mutate:async(actor,input)=>{calls.push(['mutate',input]);if(options.mutationFailure)throw new Error('Falha remota');if(!options.pending)remoteStatus=input.action==='close'?'closed':'deleted';return {success:!options.pending,pending:!!options.pending};}};}};
  if(name.includes('product-removal'))return {removalBlockers,removalNeedsDeletion};
  throw Error(name);
 }});
 return {db,calls,...exported};
}
const r=review();
const discoveryKey=createHash('sha256').update(JSON.stringify([r.product.id,r.product.revision,r.product.ean,r.product.links.map(row=>[row.id,row.connection_id,row.provider,row.provider_listing_id,false,false]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))])).digest('hex');
const command={productId:id,requestKey:key,revision:2,mode:'deleted',confirmation:'Produto de teste',acknowledged:true,discoveryKey};
test('saldo a confirmar sem vínculo: uma leitura local, nenhuma consulta externa e nenhuma exigência de saldo',async()=>{
 const h=harness({context:()=>({...review(),stockBlocked:true,product:{...review().product,stock_quantity:null,links:[]}})});
 const r=await h.reviewProductRemoval(h.db,'company','actor',id);assert.equal(r.blockers.length,0);assert.equal(h.calls.length,4);
 await h.removeProduct(h.db,'company','actor',{...command,discoveryKey:r.discoveryKey});assert.ok(h.calls.some(c=>c[0]==='marketplace_product_remove_checked'));assert.equal(h.calls.some(c=>c[0]==='adapter'),false);
});
test('conferência consulta todos os vínculos/contas, sem filtro da tela e sem comandos remotos',async()=>{
 const h=harness(),result=await h.reviewProductRemoval(h.db,'company','actor',id);
 assert.deepEqual(h.calls.filter(c=>c[0]==='read').map(c=>c[1]).sort(),['MLB1','SKU2']);
 assert.equal(result.proofs.length,2);assert.ok(result.blockers.length>0,'anúncio somente encerrado ainda precisa de confirmação de exclusão');
 assert.equal(h.calls.filter(c=>c[0]==='marketplace_product_removal_context').length,2);
 assert.equal(h.calls.some(c=>c[0]==='marketplace_product_remove'),false);
});
for(const option of [{failure:'account2'},{status:'active'},{status:'paused'},{wrongId:true}])test(`falha/situação remota bloqueia remoção: ${JSON.stringify(option)}`,async()=>{
 const h=harness(option);await assert.rejects(h.removeProduct(h.db,'company','actor',command),e=>e.code==='removal_blocked');assert.equal(h.calls.some(c=>c[0]==='marketplace_product_remove'),false);
});
test('novos vínculos durante a conferência bloqueiam; não assume lista parcial como completa',async()=>{
 const h=harness({context:n=>{const r=review();if(n===2)r.product.links.push({id:'new',connection_id:'new',provider_listing_id:'new'});return r;}});
 const r=await h.reviewProductRemoval(h.db,'company','actor',id);assert.match(r.blockers.join(' '),/vínculos mudaram/);
});
test('remoção relê anúncios, usa provas do servidor e não as situações do navegador',async()=>{
 const h=harness({status:'deleted'});await h.removeProduct(h.db,'company','actor',{...command,proofs:[{status:'active'}]});
 const write=h.calls.find(c=>c[0]==='marketplace_product_remove_checked');assert.ok(write);
 assert.equal(write[1].p_proofs.length,2);assert.ok(write[1].p_proofs.every(p=>p.status==='deleted'&&p.checkedAt));
 assert.equal(h.calls.filter(c=>c[0]==='read').length,2);
});
test('revisão/pendências mudadas e confirmação ausente bloqueiam antes da escrita',async()=>{
 for(const edit of [r=>r.product.revision++,r=>r.workBlocked=true]){const h=harness({context:()=>{const r=review();edit(r);return r;}});await assert.rejects(h.removeProduct(h.db,'company','actor',command));assert.equal(h.calls.some(c=>c[0]==='marketplace_product_remove'),false);}
 const h=harness();await assert.rejects(h.removeProduct(h.db,'company','actor',{...command,acknowledged:false}));assert.equal(h.calls.length,0);
});
test('resposta perdida: mesma tentativa retorna resultado sem repetir remoção; outros dados são recusados',async()=>{
 const h=harness({previous:{actor_id:'actor',product_id:id,mode:'deleted',snapshot:{product:{name:command.confirmation}}}});
 assert.equal((await h.removeProduct(h.db,'company','actor',command)).replayed,true);assert.equal(h.calls.length,0);
 await assert.rejects(h.removeProduct(h.db,'company','other',command),e=>e.code==='removal_changed');
});
test('API exige gestão, PWA não confunde permissão de estoque com exclusão; superfícies compartilham fluxo',()=>{
 const api=readFileSync('app/api/modulos/marketplaces/produtos/excluir/route.ts','utf8');assert.match(api,/authorizeMarketplace\(request,body.empresaId,'manage'\)/);
 const stock=readFileSync('app/api/modulos/marketplaces/precos/estoque/route.ts','utf8');assert.match(stock,/canDeleteProduct\s*=\s*\['gestor_master','administrador','operador_completo'\]/);
 assert.doesNotMatch(stock,/canDeleteProduct\s*=\s*stockPermission/);
 for(const file of ['ProductsStock.tsx','PriceProductStock.tsx'])assert.match(readFileSync(`app/marketplaces/${file}`,'utf8'),/<ProductRemoval/);
 assert.match(readFileSync('app/api/modulos/marketplaces/precos/historico/route.ts','utf8'),/active_product.archived_at/);
});
test('API compartilhada relê autorização em review/remove/delete_listing; negar nunca alcança serviço',async()=>{
 const exports={},calls=[];let permitted=false,tenant='company',role='consulta_precos';
 class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
 vm.runInNewContext(ts.transpileModule(readFileSync('app/api/modulos/marketplaces/produtos/excluir/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require(name){
  if(name==='next/server')return {NextResponse:{json:value=>Response.json(value)}};
  if(name.endsWith('management-access'))return {MarketplaceError,managementFailure:error=>Response.json({code:error.code},{status:error.status||503}),authorizeMarketplace:async(_request,company,permission)=>{assert.equal(permission,'manage');if(company!==tenant||!permitted&&role!=='administrador')throw new MarketplaceError(403,'forbidden','Sem permissão');return {db:{},empresaId:company,usuario:{id:'actor'}};}};
 if(name.endsWith('product-removal'))return {reviewProductRemoval:async(...args)=>{calls.push(['review',args]);return {};},removeProduct:async(...args)=>{calls.push(['remove',args]);return {};},deleteRemovalListing:async(...args)=>{calls.push(['delete_listing',args]);return {};}};
  throw Error(name);
 }});
 const call=(action,empresaId=tenant)=>exports.POST(new Request('http://localhost/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({empresaId,action,productId:id})}));
 for(const action of ['review','remove','delete_listing'])assert.equal((await call(action)).status,403);assert.equal(calls.length,0);
 permitted=true;assert.equal((await call('review')).status,200);assert.equal((await call('remove')).status,200);assert.deepEqual(calls.map(c=>c[0]),['review','remove']);
 permitted=false;assert.equal((await call('remove')).status,403);assert.equal(calls.length,2);
 permitted=true;assert.equal((await call('remove','other')).status,403);assert.equal(calls.length,2);
 role='administrador';permitted=false;assert.equal((await call('review')).status,200);
 assert.equal((await call('invalid')).status,400);
});
for(const stale of [false,true])test(`sem anúncio e saldo desconhecido: uma confirmação; recuperação ${stale?'de revisão vencida':'de resposta perdida'}`,async()=>{
 const values=[],refs=[],exported={};let cursor=0,rc=0;const calls=[],notified=[];
 const h={useState(initial){const i=cursor++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return [values[i],v=>values[i]=typeof v==='function'?v(values[i]):v];},useRef(initial){const i=rc++;return refs[i]??=( {current:initial});},useEffect(){}};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/ProductRemoval.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exported,AbortController,setTimeout,clearTimeout,crypto:{randomUUID:()=>key},requestAnimationFrame:fn=>fn(),require(name){if(name==='react')return h;if(name==='react/jsx-runtime')return require(name);if(name.endsWith('product-removal'))return {removalNeedsDeletion};if(name.includes('ModalConfirmacao'))return {default:'modal'};if(name.includes('BotaoAcaoCompacto'))return {default:'button'};if(name.includes('ProductLinkedListings'))return {default:'linked'};if(name.includes('product-stock-events'))return {notifyProductStockChanged:()=>{}};if(name.endsWith('.css'))return {default:{}};throw Error(name);}});
 let fail=true;
 const request=async(_url,init)=>{const b=JSON.parse(init.body);calls.push(b);if(b.action==='review')return {result:{...review(),product:{...review().product,links:[]},proofs:[],blockers:[]}};if(fail)throw Object.assign(Error(stale?'O produto mudou':'Tempo esgotado'),{code:stale?'removal_changed':undefined});return {result:{productId:id,mode:'deleted'}};};
 const render=()=>{cursor=0;rc=0;return exported.default({companyId:'company',productId:id,request,onRemoved:r=>notified.push(r)});};
 const all=n=>Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];
 let tree=render();await all(tree).find(n=>n.props?.children==='Excluir produto').props.onClick();await new Promise(r=>setImmediate(r));tree=render();
 const button=label=>all(tree).find(n=>n.type==='button'&&n.props.children===label);
 assert.equal(all(tree).some(n=>n.type==='input'),false);assert.equal(button('Confirmar exclusão').props.disabled,false);
 button('Cancelar').props.onClick();tree=render();assert.equal(calls.filter(c=>c.action==='remove').length,0);
 await button('Excluir produto').props.onClick();await new Promise(r=>setImmediate(r));tree=render();await button('Confirmar exclusão').props.onClick();await new Promise(r=>setImmediate(r));tree=render();assert.equal(notified.length,0);assert.ok(all(tree).some(n=>n.props?.role==='alert'));
 fail=false;if(stale){assert.equal(button('Confirmar exclusão').props.disabled,true);await button('Conferir novamente').props.onClick();await new Promise(r=>setImmediate(r));tree=render();}
 await button('Confirmar exclusão').props.onClick();await new Promise(r=>setImmediate(r));tree=render();
 assert.equal(calls.filter(c=>c.action==='review').length,stale?3:2);
 assert.equal(notified.length,1);assert.equal(calls.filter(c=>c.action==='remove').length,2);assert.equal(new Set(calls.filter(c=>c.action==='remove').map(c=>c.requestKey)).size,1);
 assert.equal(all(tree).some(n=>n.type==='section'),false);
});
test('releitura confirma encerramento/exclusão incertos sem reenviar; outra ação pendente bloqueia',async()=>{
 for(const [action,status,confirmed]of [['close','closed',true],['delete','deleted',true],['delete','closed',false],['resume','deleted',false]]){
  const h=harness({status,pendingActions:[{id:'audit',action,status:'uncertain'}],context:()=>{const r=review();r.product.links=r.product.links.slice(0,1);return r;}});
  const result=await h.reviewProductRemoval(h.db,'company','actor',id);
  assert.equal(h.calls.some(c=>c[0]==='audit-confirmed'),confirmed);
  assert.equal(!!result.proofs[0].error,!confirmed);
  assert.equal(h.calls.some(c=>c[0]==='mutate'),false);
 }
});
test('confirmação fica antes das opções vinculadas e bloqueios continuam protegidos no cliente',()=>{
 const source=readFileSync('app/marketplaces/ProductRemoval.tsx','utf8');
 assert.match(source,/disabled=\{working\|\|!!disabled\|\|!review\|\|blocked\|\|needsAds&&!deleteAds\}/);
 assert.match(source,/if\(locked.current\|\|linkedBusy\|\|disabled\|\|!review\|\|blocked\|\|needsAds&&!deleteAds\)return/);
 assert.match(source,/Nenhum anúncio será excluído sem sua confirmação/);
 assert.doesNotMatch(source,/setConfirm\(true\)/,'conferir novamente nunca confirma a exclusão pelo usuário');
});

test('ML under_review/forbidden exclui direto, outros estados de moderação continuam bloqueados',async()=>{
 for(const substatus of [['forbidden'],['held'],[]]){
  const target={...review().product.links[0],unlinked:false,conflict:false};
  const h=harness({status:'under_review',substatus,targets:[target]});
  const r=await h.reviewProductRemoval(h.db,'company','actor',id);
  const input={...command,discoveryKey:r.discoveryKey,connectionId:target.connection_id,listingId:target.provider_listing_id};
  if(substatus.includes('forbidden')){assert.equal((await h.deleteRemovalListing(h.db,'company','actor',input)).status,'deleted');assert.deepEqual(h.calls.filter(c=>c[0]==='mutate').map(c=>c[1].action),['delete']);}
  else{await assert.rejects(h.deleteRemovalListing(h.db,'company','actor',input),e=>e.code==='removal_remote_state');assert.equal(h.calls.some(c=>c[0]==='mutate'),false);}
 }
});
test('anúncio sem vínculo encontrado por EAN: leitura remota e confirmação explícita antes de encerrar/excluir',async()=>{
 const target={id:'unlinked:account1:MLB123456',connection_id:'account1',provider:'mercado_livre',provider_listing_id:'MLB123456',unlinked:true,conflict:false};
 const h=harness({targets:[target],status:'active',context:()=>({...review(),product:{...review().product,ean:'7898520002245',links:[]}})});
 const r=await h.reviewProductRemoval(h.db,'company','actor',id);
 assert.equal(r.targets.length,1);assert.equal(r.proofs[0].status,'active');assert.equal(h.calls.some(c=>c[0]==='mutate'),false);
 const input={...command,discoveryKey:r.discoveryKey,connectionId:'account1',listingId:'MLB123456'};
 await assert.rejects(h.deleteRemovalListing(h.db,'company','actor',{...input,acknowledged:false}));assert.equal(h.calls.some(c=>c[0]==='mutate'),false);
 await assert.rejects(h.deleteRemovalListing(h.db,'company','actor',{...input,listingId:'MLB999999'}),e=>e.code==='removal_target');
 await assert.rejects(h.deleteRemovalListing(h.db,'company','actor',{...input,discoveryKey:'stale'}),e=>e.code==='removal_changed');
 const deleted=await h.deleteRemovalListing(h.db,'company','actor',input);assert.equal(deleted.status,'deleted');
 assert.deepEqual(h.calls.filter(c=>c[0]==='mutate').map(c=>c[1].action),['close','delete']);
 await h.removeProduct(h.db,'company','actor',input);
 const write=h.calls.find(c=>c[0]==='marketplace_product_remove_checked');assert.equal(write[1].p_proofs.length,0);assert.equal(write[1].p_discovery.length,1);
 await h.deleteRemovalListing(h.db,'company','actor',input);assert.equal(h.calls.filter(c=>c[0]==='mutate').length,2,'já excluído nunca é reenviado');
});
for(const options of [{conflict:true},{ean:'7890000000000'},{variations:[{ean:'7898520002245'},{ean:'7890000000000'}]},{mutationFailure:true},{pending:true}])test(`sem vínculo: conflito/identidade/falha preserva cadastro ${JSON.stringify(options)}`,async()=>{
 const target={id:'unlinked:account1:MLB123456',connection_id:'account1',provider:'mercado_livre',provider_listing_id:'MLB123456',unlinked:true,conflict:!!options.conflict};
 const h=harness({...options,targets:[target],status:'active',context:()=>({...review(),product:{...review().product,ean:'7898520002245',links:[]}})});
 const r=await h.reviewProductRemoval(h.db,'company','actor',id);
 await assert.rejects(h.deleteRemovalListing(h.db,'company','actor',{...command,discoveryKey:r.discoveryKey,connectionId:'account1',listingId:'MLB123456'}));
 assert.equal(h.calls.some(c=>c[0]==='marketplace_product_remove_checked'),false);
 if(options.conflict||options.ean||options.variations)assert.equal(h.calls.some(c=>c[0]==='mutate'),false);
});
