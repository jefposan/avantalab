import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {corTextoSobreFundo} from '../../app/lib/cores-avanta.ts';
import {warehousePillColor} from '../../app/modules/marketplaces/warehouses.ts';
import {panelCountText} from '../../app/modules/marketplaces/panel-count.ts';
const require=createRequire(import.meta.url);
test('Estoques: cabeçalho cria em modal, pílula única automática, troca de lista e repetição sem duplicar',async()=>{
  const warehouses=[{id:'online',name:'Online',is_online:true}],states=[],refs=[],effects=[],writes=[],receipts=new Map();
  let cursor=0,refCursor=0,first=true,tree,loseResponse=false;
  const hooks={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useRef(initial){const i=refCursor++;return refs[i]||=({current:initial});},useCallback(fn){return fn;},useEffect(fn){if(first)effects.push(fn);}};
  const exports={};
  vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/WarehousesPanel.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Error,crypto,AbortSignal,AbortController,URLSearchParams,queueMicrotask,requestAnimationFrame(){return 1;},cancelAnimationFrame(){},window:{addEventListener(){},removeEventListener(){}},require(name){
    if(name==='react')return hooks;if(name==='./panel-expansion'){const module={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/panel-expansion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:module.exports,require:()=>hooks});return module.exports;}if(name.includes('magalu-sales-model'))return{salesAccountAvailable:a=>a.status==='connected'};if(name.includes('account-identification'))return{accountDisplayName:a=>a.seller_name};if(name.includes('MarketplaceSelect'))return{default:'select'};if(name.endsWith('/panel-count'))return{panelCountText};if(name.includes('cores-avanta'))return{corTextoSobreFundo};if(name.endsWith('.module.css'))return{default:new Proxy({},{get:(_,k)=>k})};if(name.includes('Botao'))return{default:'button'};if(name.includes('ModalConfirmacao'))return{default:'modal'};if(name.includes('CardExpandidoModal'))return{default:'dialog'};if(name.includes('ProductsStock'))return{default:'products'};if(name.endsWith('/warehouses'))return{warehousePillColor};if(name.includes('Anunciados'))return{marketplaceClientRequest(){throw Error('Teste não acessa rede');}};if(name.includes('product-stock-events'))return{PRODUCT_STOCK_CHANGED:'changed',notifyProductStockChanged(){}};return require(name);
  }});
  const request=async(_path,body)=>{
    if(!body)return{warehouses:structuredClone(warehouses)};
    writes.push(body);assert.equal(body.empresaId,'company');assert.ok(body.requestKey);
    if(receipts.has(body.requestKey))return receipts.get(body.requestKey);
    let id=body.warehouseId;
    if(body.action==='create'){id=`store-${warehouses.length}`;warehouses.push({id,name:body.name,is_online:false});}
    if(body.action==='rename')warehouses.find(w=>w.id===id).name=body.name;
    const result={warehouseId:id};receipts.set(body.requestKey,result);
    if(loseResponse){loseResponse=false;throw Error('Resposta não confirmada.');}
    return result;
  };
  function render(canManage=true){cursor=0;refCursor=0;tree=exports.default({companyId:'company',canManage,dark:false,brand:'#003e73',request,productContext:{accounts:[{id:'account-a',seller_name:'Conta A',status:'connected'}],preparationLocked:true,onPrepare(){}},reorderHandle:'warehouse-handle'});first=false;}
  function all(n){if(Array.isArray(n))return n.flatMap(all);if(!n||typeof n!=='object')return[];return[n,...all(n.props?.children)];}
  const find=fn=>{const n=all(tree).find(fn);assert.ok(n);return n;};
  const button=text=>find(n=>n.type==='button'&&n.props.children===text);
  const flush=()=>new Promise(done=>setImmediate(done));
  render();effects.forEach(fn=>fn());await flush();render();
  assert.equal(find(n=>n.props?.id==='warehouses-content').props.hidden,true);
  assert.equal(find(n=>n.type==='dialog').props.aberto,false);
  assert.ok(find(n=>n.props?.className==='panelHeadingActions').props.children.includes('warehouse-handle'));
  const before=all(tree);assert.ok(before.indexOf(button('Criar estoque'))<before.indexOf(button('Atualizar')));
  find(n=>n.props?.contexto==='estoques').props.onClick();render();await button('Atualizar').props.onClick();await flush();render();
  assert.equal(find(n=>n.type==='products').props.warehouse.id,'online');
  const selectionGroup=find(n=>n.props?.['aria-label']==='Seleção e ações dos estoques');
  assert.ok(all(selectionGroup).includes(button('Renomear')));
  assert.ok(find(n=>n.props?.['aria-label']==='Ações do estoque Online'));
  const accountFilter=find(n=>n.type==='select'&&n.props.ariaLabel==='Conta dos produtos em estoque');
  assert.equal(accountFilter.props.value,'');assert.equal(accountFilter.props.options[0].label,'Todas as contas');
  accountFilter.props.onChange('account-a');render();assert.equal(find(n=>n.type==='products').props.stockAccountId,'account-a');
  find(n=>n.type==='select'&&n.props.ariaLabel==='Conta dos produtos em estoque').props.onChange('');render();assert.equal(find(n=>n.type==='products').props.stockAccountId,'');
  const filter=find(n=>n.type==='select'&&n.props.ariaLabel==='Filtrar produtos por publicação');
  assert.deepEqual(Array.from(filter.props.options,o=>o.label),['Todos','Anunciado','Pausado','Em análise','Desativado','Sem anúncio']);
  filter.props.onChange('unadvertised');render();assert.equal(find(n=>n.type==='products').props.publicationFilter,'unadvertised');
  find(n=>n.type==='select'&&n.props.ariaLabel==='Filtrar produtos por publicação').props.onChange('all');render();
  find(n=>n.type==='products').props.onCountChange({total:75,loading:false});render();
  assert.deepEqual(Array.from(find(n=>n.props?.id==='warehouses-title').props.children),['Estoques · ','…'],'resultado filtrado não substitui o total do estoque');
  assert.deepEqual(Array.from(find(n=>n.props?.role==='status'&&Array.isArray(n.props.children)&&n.props.children[0]==='Produtos listados · ').props.children),['Produtos listados · ','75']);
  assert.equal(all(tree).filter(n=>n.props?.['aria-pressed']!==undefined).length,1);
  button('Criar estoque').props.onClick();render();assert.equal(find(n=>n.type==='dialog').props.aberto,true);
  find(n=>n.type==='input').props.onChange({target:{value:'Saldão'}});render();
  await find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await flush();render();
  assert.equal(writes[0].action,'create');assert.equal(warehouses.length,2);assert.equal(find(n=>n.type==='dialog').props.aberto,false);
  assert.equal(find(n=>n.type==='products').props.warehouse.id,'store-1');
  assert.deepEqual(Array.from(find(n=>n.props?.id==='warehouses-title').props.children),['Estoques · ','…']);
  find(n=>n.type==='products').props.onCountChange({total:0,loading:false});render();
  assert.deepEqual(Array.from(find(n=>n.props?.id==='warehouses-title').props.children),['Estoques · ','…']);
  assert.deepEqual(Array.from(find(n=>n.props?.role==='status'&&Array.isArray(n.props.children)&&n.props.children[0]==='Produtos listados · ').props.children),['Produtos listados · ','0']);
  find(n=>n.key==='online'&&n.props?.['aria-pressed']!==undefined).props.onClick();render();assert.equal(find(n=>n.type==='products').props.warehouse.id,'online');
  find(n=>n.key==='store-1'&&n.props?.['aria-pressed']!==undefined).props.onClick();render();
  button('Renomear').props.onClick();render();find(n=>n.type==='input').props.onChange({target:{value:'Loja física'}});render();await find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await flush();render();
  assert.equal(warehouses[1].name,'Loja física');assert.equal(writes[1].warehouseId,'store-1');
  button('Criar estoque').props.onClick();render();find(n=>n.type==='input').props.onChange({target:{value:'Tentativa perdida'}});render();loseResponse=true;
  await find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await flush();render();assert.equal(find(n=>n.type==='input').props.disabled,true);
  const failedKey=writes.at(-1).requestKey;await find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await flush();render();
  assert.equal(writes.at(-1).requestKey,failedKey);assert.equal(warehouses.length,3);
  find(n=>n.type==='products').props.onInteractionLockChange(true);render();assert.equal(find(n=>n.key==='online'&&n.props?.['aria-pressed']!==undefined).props.disabled,true);
  find(n=>n.type==='products').props.onInteractionLockChange(false);render(false);assert.equal(all(tree).some(n=>n.type==='button'&&n.props.children==='Criar estoque'),false);
});
test('pílulas têm cores estáveis por identidade e a lista usa exatamente o componente compartilhado',()=>{
  assert.match(warehousePillColor('online'),/^#[a-f0-9]{6}$/);assert.equal(warehousePillColor('online'),warehousePillColor('online'));assert.notEqual(warehousePillColor('online'),warehousePillColor('saldao'));
  const source=readFileSync('app/marketplaces/WarehousesPanel.tsx','utf8');assert.match(source,/<ProductsStock[^\n]*warehouse=\{selectedWarehouse\}/);assert.doesNotMatch(source,/products\.map|quantity.*product.*name/);
  const list=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');assert.match(list,/id="products-title"[^>]*>Produtos cadastrados/);assert.match(list,/page: String\(page\), skipCount:'1'/);assert.match(list,/warehouseId \? \{ warehouseId \} : \{\}/);assert.match(list,/setDetailId\(id => data.products.some/);
});
test('paleta dos estoques é sóbria, estável e legível; ações ficam junto à seleção sem alterar Arquivar',()=>{
  const luminance=hex=>{const values=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
  const colors=new Set(Array.from({length:200},(_,i)=>warehousePillColor(`warehouse-${i}`)));
  assert.ok(colors.size>1);assert.ok(colors.size<=6);
  for(const color of colors){const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));assert.ok(Math.max(...rgb)-Math.min(...rgb)<=24,'sem cores saturadas');assert.ok((luminance(color)+.05)/(luminance('#142538')+.05)>=4.5,'contraste AA dos nomes');}
  const css=readFileSync('app/marketplaces/marketplaces.module.css','utf8');
  const group=css.match(/\.warehouseSelectorLine \{([^}]+)\}/)[1];assert.match(group,/justify-content:flex-start/);assert.match(group,/width:fit-content/);assert.doesNotMatch(group,/space-between/);
  assert.match(css,/\.warehouseSelectedActions \{[^}]*border-inline-start:/);assert.match(css,/\.dark \.warehouseSelectorLine/);
  assert.match(css,/\.warehouseTabs button\[data-av-action="compact"\]\[aria-pressed="true"\] > span/);
  assert.match(css,/\.warehouseSelectedActions \.warehouseManagementAction\[data-av-action="compact"\] > span/);
  const source=readFileSync('app/marketplaces/WarehousesPanel.tsx','utf8');assert.match(source,/<BotaoAcaoCompacto variante="destrutivo".*?action: 'archive'.*?>Arquivar/);
});
