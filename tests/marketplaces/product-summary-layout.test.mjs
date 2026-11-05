import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url),read=p=>readFileSync(p,'utf8');
const source=ts.createSourceFile('header.tsx',read('app/marketplaces/ProductsStock.tsx'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='LocalProductHeader');
const exported={};vm.runInNewContext(ts.transpileModule(fn.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exported,require,useState:value=>[value,()=>{}],useEffect(){},useCallback:fn=>fn,productPublicationChannels:()=>[],stockDivergence:()=>undefined,marketplaceClientRequest(){throw Error('não deve consultar');},styles:new Proxy({},{get:(_,k)=>k}),ProductThumbnail:'photo',QualitySummary:'quality',StockSync:'sync',ReferencePriceEditor:'reference',ProductSalePrices:'prices',BotaoAcaoCompacto:'prepare',BotaoExpandirCard:'expand',Tooltip:'tooltip',Icon:'icon'});
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):typeof n==='string'||typeof n==='number'?String(n):'';
test('cabeçalho separa saldos, referência/sugestões e expansão sem repetir saldos ou alterar ações',()=>{
 const commands=[],toggle=()=>{},product={id:'p',empresa_id:'c',name:'Produto',sku:'SKU',ean:'123',pictures:[],links:[],stock_quantity:0,price_cents:78307,revision:1,listing_stock_review_at:'2026-10-25',allocations:[{warehouseId:'online',name:'Online',quantity:0},{warehouseId:'saldao',name:'SALDÃO',quantity:2}]};
 const tree=exported.LocalProductHeader({product,expanded:false,canManage:true,busy:false,dark:false,brand:'#003e73',percentages:{minimum:50,medium:70,ideal:90},onToggle:toggle,onCommand:c=>commands.push(c),warehouse:{id:'online',name:'Online'}});
 const all=nodes(tree),stock=all.find(n=>n.props?.['aria-label']==='Estoque do produto'),pricing=all.find(n=>n.props?.['aria-label']==='Preços sugeridos do produto');
 assert.ok(stock&&pricing);assert.equal((text(stock).match(/Online: 0 un\./g)||[]).length,1);assert.equal((text(stock).match(/SALDÃO: 2 un\./g)||[]).length,1);
 assert.match(text(stock),/Sem estoque/);assert.doesNotMatch(text(stock),/Estoque a confirmar/,'cadastro sem anúncio não recebe conferência');assert.ok(!nodes(stock).some(n=>n.type==='reference'));
 for(const status of ['active','paused','deleted','closed']){product.links=[{provider:'mercado_livre',status}];const header=exported.LocalProductHeader({product,onToggle:toggle,onCommand(){},percentages:null});assert.equal(/Estoque a confirmar/.test(text(header)),['active','paused'].includes(status));}
 const reference=nodes(pricing).find(n=>n.type==='reference'),prices=nodes(pricing).find(n=>n.type==='prices');assert.equal(reference.props.product,product);assert.equal(prices.props.reference,78307);
 reference.props.onResearch();assert.equal(commands[0].action,'refresh_price');assert.equal(commands[0].productId,'p');
 assert.equal(all.find(n=>n.type==='expand').props.onClick,toggle);assert.equal(all.find(n=>n.type==='expand').props.desabilitado,false);
 product.listing_stock_review_at=null;product.allocations=[];const fallback=exported.LocalProductHeader({product,onToggle:toggle,onCommand(){},percentages:null});assert.match(text(fallback),/Online: 0 un\./);assert.doesNotMatch(text(fallback),/Estoque a confirmar/);
});
test('preparar anúncio aparece acima da expansão sem anúncio, com saldo Online nulo, zero ou positivo',()=>{
 const product={id:'p',empresa_id:'c',name:'Produto',sku:'SKU',ean:null,pictures:[],links:[],stock_quantity:null,price_cents:null,revision:1,allocations:[{warehouseId:'saldao',name:'Saldão',online:false,quantity:2}]};
 let prepared=0;
 const render=()=>exported.LocalProductHeader({product,expanded:false,canManage:true,busy:false,dark:false,brand:'#003e73',percentages:null,onToggle(){},onCommand(){},onPrepareAnnouncement:()=>{prepared++;}});
 let header=render(), prepare=nodes(header).find(node=>node.type==='prepare'&&node.props.children==='Preparar anúncio');
 assert.ok(prepare);assert.equal(prepare.props.children,'Preparar anúncio');assert.equal(prepare.props.disabled,false);
 prepare.props.onClick();assert.equal(prepared,1);
 product.links=[{provider:'mercado_livre',status:'active'}];header=render();assert.equal(nodes(header).some(node=>node.type==='prepare'&&node.props.children==='Preparar anúncio'),false);
 product.links=[];for(const quantity of [null,0,1]){product.stock_quantity=quantity;header=render();assert.equal(nodes(header).some(node=>node.type==='prepare'&&node.props.children==='Preparar anúncio'),true);}
});

test('preparar anúncio e expandir usam a mesma pílula no cabeçalho',()=>{
 const css=read('app/marketplaces/marketplaces.module.css');
 assert.match(css,/localProductPriceActions \{ --local-product-action-width:128px/);
 assert.match(css,/localProductPriceActions :is\(\.localProductPrepareButton,button\[aria-controls\^="local-detail-"\]\) \{ box-sizing:border-box;width:var\(--local-product-action-width\);min-width:var\(--local-product-action-width\); \}/);
 assert.match(css,/localProductPrepareButton > span \{ min-height:24px;height:24px;padding:0 6px;border-radius:999px;font-size:11px/);
 assert.match(css,/localProductPriceActions \.localProductPrepareButton \{ --brand:#003e73;--av-action-on-brand:#fff/);
 assert.match(css,/productPrepareAction \{ --brand:#187747;--av-action-on-brand:#fff/);
});
test('referência em área suave, valores sem quebra, mobile vertical e tema escuro preservados',()=>{
 const css=read('app/marketplaces/marketplaces.module.css');assert.match(css,/localProductPricing[^}]*background:color-mix/);assert.match(css,/dark \.localProductPricing/);assert.match(css,/localProductPricing \.productSalePriceAmount[^}]*white-space:nowrap/);assert.match(css,/@container \(max-width:380px\)[^\n]*grid-template-columns:1fr/);
});
