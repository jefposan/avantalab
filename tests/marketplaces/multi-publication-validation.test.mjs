import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire,registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);}});
const helpers=await import('../../app/marketplaces/multi-publication-validation.ts');
const catalog=await import('../../app/modules/marketplaces/services/catalog-publication.ts');
const multi=await import('../../app/modules/marketplaces/multi-publication.ts');hook.deregister();
const form={ean:'7899882311471',productId:'MLB123456',categoryId:'MLB9188',price:189.9,stock:1,listingType:'gold_pro',shippingMode:'me2',condition:'new',warrantyType:'seller',warrantyTime:'3 meses',description:'Descrição',attributes:{},localProductId:'local'};
const prepared={status:'found',ean:form.ean,localProductId:'local',product:{id:form.productId,pictures:[],source:'mercadolivre_catalog'},categories:[{id:form.categoryId}],listingTypes:[{id:'gold_pro'}],shippingModes:[{id:'me2'},{id:'custom'}],conditions:[{id:'new'}],requiredAttributes:[],constraints:{maxDescriptionLength:50000}};
const all=n=>Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];
function harness({defer=false}={}){
 const states=[],effects=[],pending=[],timers=new Map(),calls=[],focused=[],busy=[],deferred=[];let cursor=0,ec=0,tid=0,tree,handle;
 const props={companyId:'company',form:{...form},confirmed:true,disabled:false,accounts:[{id:'a',seller_name:'JEFF',provider:'mercado_livre',status:'connected'},{id:'b',seller_name:'CIDY',provider:'mercado_livre',status:'connected'}],onBusyChange:v=>busy.push(v),onCompleted(){throw Error('Não deve publicar neste teste')},request:async(path,body,signal)=>{calls.push({path,body,signal});assert.equal(path,'publicacao-multiconta');if(body.action==='context')return {links:[]};assert.equal(body.action,'review','nenhuma publicação automática');if(defer)return await new Promise(r=>deferred.push({resolve:r,body,signal}));return {form:{...body.form},prepared,errors:catalog.publicationErrors(body.form,prepared)};}};
 const exported={};vm.runInNewContext(ts.transpileModule(readFileSync(resolve(root,'app/marketplaces/MultiAccountPublication.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exported,crypto,AbortController,AbortSignal,Error,Object,JSON,requestAnimationFrame:fn=>fn(),setTimeout(fn){const id=++tid;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),require(name){
  if(name==='react')return {forwardRef:fn=>p=>fn(p,{}),useImperativeHandle(_ref,create){handle=create()},useRef(value){const i=cursor++;return states[i]??={current:value}},useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]},useEffect(fn,deps){const i=ec++,old=effects[i];if(!old||deps.some((d,n)=>!Object.is(d,old.deps[n])))pending.push(()=>{old?.cleanup?.();effects[i]={deps,cleanup:fn()}})}};
  if(name.endsWith('multi-publication-validation'))return helpers;if(name.endsWith('/catalog-publication'))return catalog;if(name.endsWith('/multi-publication'))return multi;
  if(name==='./PublicationShipping')return {default:'shipping'};
  if(name.includes('BotaoAcaoCompacto'))return {default:'button'};if(name.includes('CampoMoeda'))return {default:'money'};if(name.includes('formatters'))return {moedaDigitadaParaNumero:s=>Number(s.replace(',','.'))};
  if(name==='./account-identification')return {accountDisplayName:a=>a?.seller_name||'Conta'};if(name.endsWith('.module.css'))return {default:{}};if(name==='./Anunciados')return {};return require(name);
 }});
 function render(){cursor=0;ec=0;tree=exported.default(props);tree.props.ref.current={ownerDocument:{getElementById(id){return {closest(){return null},scrollIntoView(){},focus(){focused.push(id)}}}}};pending.splice(0).forEach(fn=>fn());return tree;}
 async function settle(){await new Promise(setImmediate);render();render();}
 async function mount(){render();await settle();}
 async function select(index){all(render()).filter(n=>n.type==='input'&&n.props.type==='checkbox')[index+1].props.onChange({target:{checked:true}});render();render();const mode=all(tree).filter(n=>n.type==='input'&&n.props.type==='radio'&&n.props.name?.startsWith('publication-mode-'))[1];mode.props.onChange();render();render();}
 async function run(){const tasks=[...timers.values()];timers.clear();tasks.forEach(fn=>fn());await settle();}
 return {props,calls,focused,busy,deferred,mount,select,run,render,settle,timers,nodes:()=>all(tree),publish:()=>handle.publish(),unmount:()=>effects.forEach(e=>e?.cleanup?.())};
}
test('selecionar contas valida automaticamente com debounce, sem publicar, e oferece somente preço por conta',async()=>{
 const h=harness();await h.mount();await h.select(0);await h.select(1);assert.equal(h.calls.length,1);await h.run();assert.equal(h.calls.filter(c=>c.body.action==='review').length,2);assert.equal(h.nodes().filter(n=>n.type==='money').length,2);assert.deepEqual(h.busy,[]);h.render();h.render();assert.equal(h.timers.size,0);h.unmount();
});
test('mudar rascunho cancela leituras antigas e ignora resposta atrasada',async()=>{
 const h=harness({defer:true});await h.mount();await h.select(0);await h.run();const old=h.deferred[0];h.props.form={...h.props.form,price:200};h.render();h.render();assert.equal(old.signal.aborted,true);await h.run();const fresh=h.deferred[1];old.resolve({form:old.body.form,prepared,errors:{}});await h.settle();assert.equal(h.nodes().filter(n=>n.type==='money').length,0);fresh.resolve({form:fresh.body.form,prepared,errors:{}});await h.settle();assert.equal(h.nodes().find(n=>n.type==='money').props.value,'200,00');h.unmount();
});
test('recusa de validação oferece revalidar, sem repetir automaticamente nem publicar',async()=>{
 const h=harness();h.props.request=async(path,body)=>{h.calls.push({path,body});if(body.action==='context')return {links:[]};throw Error('Conta sem permissão para esta categoria')};await h.mount();await h.select(0);await h.run();assert.ok(h.nodes().some(n=>n.props?.children==='Conta sem permissão para esta categoria'));const count=h.calls.length;h.render();h.render();assert.equal(h.calls.length,count);assert.equal(h.timers.size,0);h.unmount();
});
test('confirmação e preço inválido levam ao controle correto sem chegar ao envio',async()=>{
 const h=harness();await h.mount();await h.select(0);await h.run();h.props.confirmed=false;h.render();await h.publish();assert.equal(h.focused.at(-1),'catalog-match');h.props.confirmed=true;h.render();h.nodes().find(n=>n.type==='money').props.onChange('');h.render();await h.publish();h.render();assert.equal(h.focused.at(-1),'destination-a-price');assert.ok(h.nodes().some(n=>n.props?.role==='alert'&&String(n.props.children).includes('preço válido')));h.unmount();
});
test('pendências vêm da validação da conta e apontam para o cadastro; nunca para um EAN de busca',()=>{
 const row={form:{...form,shippingQuoteToken:'proof'},prepared,errors:{shippingMode:'Forma de envio não permitida nesta conta.'}};assert.deepEqual(helpers.destinationErrors(row),row.errors);
 assert.equal(helpers.destinationFieldId('a','title'),'new-title');assert.equal(helpers.destinationFieldId('a','shippingMode'),'new-shippingMode');assert.equal(helpers.destinationFieldId('a','attribute:EMPTY_GTIN_REASON'),'new-attribute:EMPTY_GTIN_REASON');assert.equal(helpers.destinationFieldId('a','ean'),'new-local-ean');assert.notEqual(helpers.destinationFieldId('a','ean'),'new-ean');
});
test('frete de cada conta impede envio sem cotação e exige ciência quando o custo falta',async()=>{
 const h=harness();await h.mount();await h.select(0);await h.run();assert.equal(h.nodes().filter(n=>n.type==='shipping').length,1);
 await h.publish();assert.equal(h.calls.some(c=>c.body.action==='publish'),false);assert.equal(h.focused.at(-1),'destination-a-freeShipping');
 h.nodes().find(n=>n.type==='shipping').props.onReview({shippingQuoteToken:'proof'},true);h.render();await h.publish();assert.equal(h.focused.at(-1),'destination-a-shipping-acknowledgement');
 assert.deepEqual(helpers.destinationErrors({form:{...form,shippingQuoteToken:'proof',acknowledgeUnavailableShippingCost:true},prepared,errors:{},costUnavailable:true}),{});h.unmount();
});
test('salvar uma nova revisão do nome mantém a conta escolhida e revalida o cadastro',async()=>{
 const h=harness();await h.mount();await h.select(0);await h.run();const count=h.calls.length;h.props.productRevision=8;h.render();h.render();await h.run();assert.equal(h.calls.length,count+1);assert.equal(h.nodes().filter(n=>n.type==='input'&&n.props.type==='checkbox')[1].props.checked,true);h.unmount();
});
test('recusa mantém diagnóstico técnico e Conferir cadastro alcança nome; cotação não apaga recusa do título',async()=>{
 const h=harness(),read=h.props.request;h.props.request=async(path,body,signal)=>{if(body.action==='publish')throw Object.assign(Error('Título recusado'),{code:'invalid_fields',fields:{title:'Confira o nome'},details:'Resposta do Mercado Livre — HTTP 400\nitem.title.invalid_length'});return read(path,body,signal)};
 await h.mount();await h.select(0);await h.run();h.nodes().find(n=>n.type==='shipping').props.onReview({shippingQuoteToken:'proof'},false);h.render();await h.publish();h.render();assert.equal(h.focused.at(-1),'new-title');assert.ok(h.nodes().some(n=>n.type==='p'&&String(n.props.children).includes('item.title.invalid_length')));
 h.nodes().find(n=>n.type==='shipping').props.onReview({shippingQuoteToken:'refreshed'},false);h.render();assert.ok(h.nodes().some(n=>n.type==='span'&&n.props.children==='Confira o nome'));h.unmount();
});
test('concorrência de leitura limitada a duas, falha isolada e aborto não entregam resultados antigos',async()=>{
 let active=0,max=0;const results=[],controller=new AbortController();await helpers.validateDestinations(['a','b','c'],controller.signal,async id=>{max=Math.max(max,++active);await new Promise(setImmediate);active--;if(id==='b')throw Error('Recusado');return id},(id,value,error)=>results.push({id,value,error}));assert.equal(max,2);assert.equal(results.length,3);assert.ok(results.find(r=>r.id==='b').error);
 let resolveOld;const stopped=helpers.validateDestinations(['a'],controller.signal,()=>new Promise(r=>resolveOld=r),()=>assert.fail('resposta cancelada'));controller.abort();resolveOld('old');await stopped;
});

for(const partial of [false,true])test(`publicações iguais ${partial?'expõem criação parcial sem confirmar sucesso':'concluem e notificam o formulário pai após todas as contas'}`,async()=>{
 const h=harness(),read=h.props.request;let completed=0;
 h.props.onCompleted=()=>completed++;
 h.props.request=async(path,body,signal)=>{if(body.action==='publish'){if(partial)throw Object.assign(Error('O anúncio foi criado, mas a sincronização não foi confirmada.'),{code:'publication_partial'});return{status:'published',listing:{id:'MLB123'}};}return read(path,body,signal);};
 await h.mount();await h.select(0);await h.select(1);await h.run();
 h.nodes().filter(node=>node.type==='input'&&node.props.type==='radio')[0].props.onChange();h.render();h.render();await h.run();
 h.nodes().filter(node=>node.type==='shipping').forEach(node=>node.props.onReview({shippingQuoteToken:'proof'},false));h.render();
 await h.publish();h.render();
 assert.equal(completed,partial?0:1);assert.deepEqual(h.busy,[true,false]);
 if(partial){assert.equal(h.nodes().filter(node=>node.type==='input'&&node.props.type==='radio')[1].props.checked,true);assert.ok(h.nodes().some(node=>node.type==='p'&&String(node.props.children).includes('O anúncio foi criado')));}
 h.unmount();
});
