import * as stockSyncModel from '../../app/modules/marketplaces/stock-reconciliation.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {priceStockState} from '../../app/modules/marketplaces/price-stock-state.ts';
const require=createRequire(import.meta.url);

test('card real: saldo numérico e confirmação direta do Online, sem somar outros estoques',async()=>{
 for(const onlineQuantity of [null,0,7]) for(const offlineQuantity of [0,2]){
  const stock={productId:'product',syncLinkedCount:0,quantity:onlineQuantity,confirmed:false,revision:1,canManage:true,warehousesReady:true,warehouses:[{id:'online',name:'Online',is_online:true,quantity:onlineQuantity,confirmed_at:null},{id:'saldao',name:'SALDÃO',is_online:false,quantity:offlineQuantity,confirmed_at:'2026-10-20'}]};
  const states=[stock,false],refs=[];let cursor=0,refCursor=0;
  const hooks={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(initial){return refs[refCursor++]||={current:initial};},useEffect(){},useCallback(fn){return fn;}};
  const exported={};
  vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/PriceProductStock.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exported,AbortSignal,crypto,requestAnimationFrame(fn){fn();},require(name){if(name.includes('stock-reconciliation'))return stockSyncModel;
   if(name.includes('ModalConfirmacao'))return {default:'zero-modal'}; if(name==='react')return hooks;
   if(name.includes('ProductRemoval'))return{default:'product-removal'};
   if(name.includes('StockSync'))return{default:'stock-sync'};
   if(name.includes('BotaoAcaoCompacto'))return{default:'button'};
   if(name.endsWith('.module.css'))return{default:new Proxy({},{get:(_,k)=>k})};
   if(name.includes('price-stock-state'))return{priceStockState};
   if(name.includes('DirectSaleActions'))return{default:'sales'};
   if(name.includes('direct-sales'))return{DIRECT_SALES_CHANGED:'sales'};
   if(name.includes('product-stock-events'))return{notifyProductStockChanged(){}};
   if(name.includes('product-internal-notes'))return{PRODUCT_INTERNAL_NOTES_LIMIT:160};
   return require(name);
  }});
  const writes=[];
  const wrapper=exported.default({companyId:'company',productId:'product',initialWarehouseId:'saldao',request:async(_path,options)=>{const body=JSON.parse(options.body);writes.push(body);return {stock:{...stock,quantity:body.quantity,importStockReview:false}};},compactSummary:true});
  let tree=wrapper.type(wrapper.props);
  const all=n=>Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];
  const text=n=>Array.isArray(n)?n.map(text).join(' '):n&&typeof n==='object'?text(n.props?.children):typeof n==='string'||typeof n==='number'?String(n):'';
  const nodes=all(tree),pill=nodes.find(n=>n.props?.['aria-label']===`Online: ${onlineQuantity??0} unidades`);
  assert.ok(pill);assert.equal(pill.props['data-quantity'],onlineQuantity??0);
  assert.match(text(pill),new RegExp(`${onlineQuantity??0} un\\.`));
  if((onlineQuantity??0)+offlineQuantity>0)assert.match(text(tree),new RegExp(`${(onlineQuantity??0)+offlineQuantity} un\\.`));
  else assert.match(text(tree),/Total 0 un\./);
  assert.doesNotMatch(text(tree),/a confirmar|confirmadas/i);
  const refresh=nodes.find(n=>n.props?.['aria-label']==='Sincronizar e atualizar saldos');assert.ok(refresh);
  const svg=all(refresh).find(n=>n.type==='svg');assert.equal(svg.props.viewBox,'0 0 24 24');
  assert.equal(all(svg).filter(n=>n.type==='path').length,2);
  nodes.find(n=>n.type==='sales').props.onSaleAccessLoaded(true);
  cursor=refCursor=0;tree=wrapper.type(wrapper.props);
  const sale=all(tree).find(n=>n.props?.children==='Venda');
  assert.equal(sale.props.disabled,(onlineQuantity??0)+offlineQuantity<=0,'Venda depende de saldo em algum estoque');
  states[0]={...stock,importStockReview:true};cursor=refCursor=0;tree=wrapper.type(wrapper.props);
  const confirm=()=>all(tree).find(n=>n.type==='button'&&text(n).replace(/\s+/g,' ').trim()===`Confirmar saldo ${onlineQuantity??0}`);
  assert.ok(confirm());confirm().props.onClick();cursor=refCursor=0;tree=wrapper.type(wrapper.props);
  let modal=all(tree).find(n=>n.type==='zero-modal'&&n.props.aberto);
  assert.ok(!all(tree).some(n=>n.type==='form'),'confirmar saldo abre somente o popup, sem editor');
  assert.equal(modal.props.titulo,`Confirmar saldo ${onlineQuantity??0}?`);assert.equal(writes.length,0,'abrir não grava');
  modal.props.aoCancelar();cursor=refCursor=0;tree=wrapper.type(wrapper.props);assert.equal(writes.length,0,'cancelar não grava');
  confirm().props.onClick();cursor=refCursor=0;tree=wrapper.type(wrapper.props);
  modal=all(tree).find(n=>n.type==='zero-modal'&&n.props.aberto);await modal.props.aoConfirmar();
  assert.equal(writes.length,1);assert.equal(writes[0].quantity,onlineQuantity??0);assert.equal(writes[0].warehouseId,'online');assert.equal(writes[0].action,'set');
  refresh.props.onClick();assert.equal(states[0],null);assert.equal(states[1],true);
 }
});
test('saldo vazio é zero no Web, catálogo PWA, resumo, venda e devolução; erro não é convertido em saldo',()=>{
 for(const path of ['app/marketplaces/ProductsStock.tsx','app/marketplaces/PriceProductStock.tsx','app/marketplaces/consulta/MarketplaceMobileApp.tsx','app/marketplaces/DirectSaleActions.tsx','app/marketplaces/DirectSalesHistory.tsx']){
  const source=readFileSync(path,'utf8');
  const numericSource=source.split('\n').filter(line=>!line.includes('product.listing_stock_review_at &&')&&!line.includes('product.listing_stock_review_at ?')&&!line.includes('stock.importStockReview &&')).join('\n');
  assert.doesNotMatch(numericSource,/Estoque a confirmar|Estoque a ser inserido|['"]a confirmar['"]|['"]A confirmar['"]/,'quantidade não deve virar texto pendente em '+path);
  assert.match(source,/\?\? 0/,'vazio deve ter apresentação zero em '+path);
 }
 const stock=readFileSync('app/marketplaces/PriceProductStock.tsx','utf8');
 assert.match(stock,/warehousesReady === false \? 'Indisponível'/);
 assert.match(stock,/role="alert"/);
 assert.match(stock,/action: 'context'/,'leitura continua sem escrita automática de estoque');
 assert.match(stock,/width="20" height="20" viewBox="0 0 24 24"/);
});
