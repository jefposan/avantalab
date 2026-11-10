import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
  if(s==='./StockSync')return{url:'data:text/javascript,export const StockSyncDialog=()=>null',shortCircuit:true};
  if(s==='./Anunciados')return{url:'data:text/javascript,export async function marketplaceClientRequest(){return {}}',shortCircuit:true};
  if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
  if(s==='next/server')return {url:'data:text/javascript,export const NextResponse={json:(value,options)=>Response.json(value,options)}',shortCircuit:true};
  if(s==='./management-access'||s.endsWith('/services/management-access'))return {url:'data:text/javascript,'+encodeURIComponent(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.code=code;this.status=status;}};export async function authorizeMarketplace(req,id){if(!['Bearer manager','Bearer colleague'].includes(req.headers.get('authorization')))throw new MarketplaceError(401,'auth','Negado');if(id!=='empresa-a')throw new MarketplaceError(403,'scope','Negado');return{db:globalThis.noticeDb,empresaId:id,usuario:{id:req.headers.get('authorization')==='Bearer manager'?'actor':'colleague'}}};export function managementFailure(e){return Response.json({message:e.message},{status:e.status||503})}`),shortCircuit:true};
  if(s.endsWith('.module.css'))return {url:'data:text/javascript,export default new Proxy({}, {get:(_,k)=>k})',shortCircuit:true};
  const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
  if(f)for(const ext of ['.tsx','.ts'])if(existsSync(f+ext))return next(pathToFileURL(f+ext).href,c);
  return next(s,c);
},load(url,c,next){if(url.startsWith('file:')&&url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
const {readInventoryNotices}=await import('../../app/modules/marketplaces/services/inventory-notices.ts');
const {inventoryRows}=await import('../../app/modules/marketplaces/services/inventory-read.ts');
const {default:Notices,InventoryNoticeList}=await import('../../app/marketplaces/InventoryNotices.tsx');
const {inventoryNoticeCount,inventoryNoticeNeedsAttention}=await import('../../app/modules/marketplaces/live-feed.ts');
const {GET:getNotices,POST:dismissNotice}=await import('../../app/api/modulos/marketplaces/avisos/route.ts');
hook.deregister();
const company='empresa-a';
class Query {
  constructor(db,table){this.db=db;this.table=table;this.conditions=[];}
  select(){return this;}
  eq(k,v){this.conditions.push([k,v]);return this;}
  is(k,v){return this.eq(k,v);}
  in(k,v){this.includes=[k,v];return this;}
  not(k,op,v){assert.equal(op,'is');assert.equal(v,null);this.exclude=k;return this;}
  upsert(row,options){this.write={row,options};return this;}
  order(){return this;}
  range(from,to){this.from=from;this.to=to;return this;}
  abortSignal(signal){assert.ok(signal instanceof AbortSignal);return this;}
  then(ok,bad){return Promise.resolve().then(()=>{
    if(this.write){
      assert.equal(this.table,'marketplace_inventory_notice_dismissals');
      const {row,options}=this.write;
      assert.equal(row.empresa_id,company);
      const entries=this.db.tables[this.table]??=[];
      if(!entries.some(entry=>options.onConflict.split(',').every(key=>entry[key]===row[key])))entries.push(row);
      return {error:null};
    }
    assert.ok(this.conditions.some(([k,v])=>k==='empresa_id'&&v===company),'toda leitura restringe a empresa');
    if(this.db.failure===this.table)return {error:Error('falha'),data:null};
    const data=(this.db.tables[this.table]||[]).filter(row=>this.conditions.every(([k,v])=>row[k]===v)&&(!this.exclude||row[this.exclude]!=null)&&(!this.includes||this.includes[1].includes(row[this.includes[0]]))).slice(this.from,this.to===undefined?undefined:this.to+1);
    return {data,error:null};
  }).then(ok,bad);}
}
function fixture(){
  const row=value=>({empresa_id:company,...value});
  return {from(table){return new Query(this,table);},tables:{
    marketplace_products:[row({id:'airfryer',name:'Airfryer',ean:'8720389031151',stock_quantity:1,stock_confirmed_at:'2026-10-19T16:00:00Z',stock_baseline_at:'2026-10-19T16:00:00Z'}),row({id:'fan',name:'Ventilador Arno',ean:'7895500763318',stock_quantity:null,stock_confirmed_at:null})],
    marketplace_product_links:[row({id:'link-a',product_id:'airfryer',connection_id:'conta',provider:'mercado_livre',provider_listing_id:'MLB123456',reported_stock:1,status:'active'}),row({id:'link-f',product_id:'fan',connection_id:'conta',provider:'mercado_livre',provider_listing_id:'MLB999999',reported_stock:0,status:'paused'})],
    marketplace_connections:[row({id:'conta',seller_name:'Nome vendedor',provider:'mercado_livre'})],marketplace_connection_labels:[row({connection_id:'conta',local_label:'ALINE'})],
    marketplace_inventory_events:[row({id:'evento-f',product_id:'fan',connection_id:'conta',provider:'mercado_livre',listing_id:'MLB999999',order_id:'200',state:'pending',issue:'stock_not_confirmed',confirmed_at:'2026-10-14T00:00:00Z'})],
    marketplace_inventory_outbox:[row({link_id:'link-a',product_id:'airfryer',state:'pending',issue:'pending_product_sales',next_attempt_at:'2026-10-19T17:00:00Z'})],
  }};
}
test('pontuação baixa não gera avisos nem consultas extras; pendências reais e cache da nota são preservados',async()=>{
 const db=fixture(),before=await readInventoryNotices(db,company),reads=[];
 db.tables.marketplace_listing_quality=[{empresa_id:company,connection_id:'conta',listing_id:'MLB123456',score:65},{empresa_id:company,connection_id:'conta',listing_id:'MLB333333',score:50}];
 db.tables.marketplace_listings=[{empresa_id:company,connection_id:'conta',provider:'mercado_livre',provider_listing_id:'MLB333333',status:'active',snapshot:{title:'Produto sem vínculo'}}];
 const cached=structuredClone(db.tables.marketplace_listing_quality),from=db.from;
 db.from=function(table){reads.push(table);return from.call(this,table);};
 const notices=await readInventoryNotices(db,company);
 assert.deepEqual(notices,before,'mantém os avisos de estoque e vendas, sem incluir pontuação');
 assert.ok(!notices.some(n=>n.code==='listing_quality_low'));
 assert.ok(!reads.includes('marketplace_listing_quality'),'avisos não precisam consultar a nota');
 assert.deepEqual(db.tables.marketplace_listing_quality,cached,'nota permanece disponível para visualização manual');
 db.tables.marketplace_inventory_events=[];db.tables.marketplace_inventory_outbox=[];
 const onlyQuality=await readInventoryNotices(db,company);assert.deepEqual(onlyQuality,[]);
 assert.equal(inventoryNoticeCount({notices:onlyQuality,pendingSales:0,pendingStock:0,enabled:true,workerHealthy:true}),0,'nota baixa isolada não mantém badge no cabeçalho');
});
test('avisos identificam os dois produtos, EAN, conta, anúncio e pedido sem confundir causas',async()=>{
  const f=fixture();const notices=await readInventoryNotices(f,company);
  assert.equal(notices.length,2);assert.deepEqual(notices.map(n=>n.productName),['Ventilador Arno','Airfryer']);
  assert.equal(notices[0].ean,'7895500763318');assert.equal(notices[0].listingId,'MLB999999');assert.equal(notices[0].orderId,'200');assert.equal(notices[0].accountName,'ALINE');
  assert.equal(notices[0].code,'stock_not_confirmed');assert.equal(notices[1].code,'pending_product_sales');assert.equal(notices[1].ean,'8720389031151');
  assert.equal(notices[0].connectionId,'conta');assert.equal(notices[1].connectionId,'conta');
});
test('conferência de importação é explícita inclusive pausado, preserva saldo e some quando confirmada',async()=>{
 const f=fixture();f.tables.marketplace_inventory_events=[];f.tables.marketplace_inventory_outbox=[];
 Object.assign(f.tables.marketplace_products[0],{listing_stock_review_at:'2026-10-22T10:00:00Z'});f.tables.marketplace_product_links[0].status='paused';
 const notices=await readInventoryNotices(f,company);assert.equal(notices.length,1);assert.equal(notices[0].code,'import_stock_review');assert.equal(notices[0].productId,'airfryer');assert.equal(f.tables.marketplace_products[0].stock_quantity,1);
 f.tables.marketplace_products[0].listing_stock_review_at=null;assert.deepEqual(await readInventoryNotices(f,company),[]);
});
test('zero não gera aviso de esgotamento; conferência inicial e erros reais permanecem',async()=>{
 const f=fixture();f.tables.marketplace_inventory_events=[];f.tables.marketplace_inventory_outbox=[];
 const p=f.tables.marketplace_products[0],link=f.tables.marketplace_product_links[0];Object.assign(p,{stock_quantity:0});Object.assign(link,{status:'paused',reported_stock:0});
 let notices=await readInventoryNotices(f,company);assert.ok(!notices.some(n=>n.productId===p.id),'saldo zero confirmado e pausa comprovada não são pendência');
 for(const reported_stock of [0,2,null]){Object.assign(link,{status:'active',reported_stock});notices=await readInventoryNotices(f,company);assert.ok(!notices.some(n=>n.productId===p.id));}
 p.listing_stock_review_at='2026-10-26';notices=await readInventoryNotices(f,company);assert.equal(notices.find(n=>n.productId===p.id).code,'import_stock_review');
 f.tables.marketplace_inventory_outbox=[{empresa_id:company,product_id:p.id,link_id:link.id,state:'pending',issue:'provider_policy_403'}];p.listing_stock_review_at=null;notices=await readInventoryNotices(f,company);assert.ok(notices.some(n=>n.code==='provider_policy_403'));assert.ok(!notices.some(n=>n.code==='zero_stock_pause_pending'));
 Object.assign(link,{status:'closed'});f.tables.marketplace_inventory_outbox=[];assert.ok(!(await readInventoryNotices(f,company)).some(n=>n.code==='out_of_stock'||n.code==='zero_stock_pause_pending'));
});
test('estoque ambíguo mantém aviso e candidatos locais; ação ainda não confirmada também permanece',async()=>{
 const f=fixture();f.tables.marketplace_inventory_events=[];f.tables.marketplace_inventory_outbox=[];
 f.tables.marketplace_listing_import_issues=[{empresa_id:company,connection_id:'conta',provider:'mercado_livre',provider_listing_id:'MLB123',title:'Título externo',issue:'import_stock_review',candidate_product_ids:['airfryer','fan']}];
 f.tables.marketplace_listing_actions=[{empresa_id:company,id:'pause',connection_id:'conta',provider_listing_id:'MLB123',action:'pause',status:'uncertain'}];
 for(let read=0;read<2;read++){
  const notices=await readInventoryNotices(f,company);assert.equal(notices.find(n=>n.id==='import:conta:MLB123').candidateProducts.length,2);assert.ok(notices.some(n=>n.code==='listing_pause_unconfirmed'));
 }
 f.tables.marketplace_listing_actions[0].status='succeeded';assert.ok(!(await readInventoryNotices(f,company)).some(n=>n.code==='listing_pause_unconfirmed'));
});
test('confirmação posterior troca aviso de falta por conciliação e não grava nova baixa',async()=>{
  const f=fixture();Object.assign(f.tables.marketplace_products[1],{stock_quantity:0,stock_confirmed_at:'2026-10-19T16:00:00Z',stock_baseline_at:'2026-10-19T16:00:00Z'});
  assert.equal((await readInventoryNotices(f,company))[0].code,'baseline_reconciliation');
  f.tables.marketplace_inventory_events[0].state='baseline';f.tables.marketplace_inventory_events[0].issue=null;
  const notices=await readInventoryNotices(f,company);assert.equal(notices.length,1);assert.ok(!notices.some(n=>n.code==='out_of_stock'));assert.ok(!notices.some(n=>n.code==='baseline_reconciliation'));
});
test('anúncios desativados não geram falta/divergência ou fila genérica; ativo em outra conta ainda gera aviso correto',async()=>{
 for(const provider of ['mercado_livre','magalu'])for(const status of ['paused','inactive','closed','deleted','cancelled','canceled']){
  const f=fixture();f.tables.marketplace_inventory_events=[];f.tables.marketplace_products=f.tables.marketplace_products.slice(1);
  f.tables.marketplace_product_links=[{...f.tables.marketplace_product_links[1],provider,status,reported_stock:9}];
  for(const issue of [null,'stock_not_confirmed','local_stock_unset','stock_divergence','insufficient_stock','lower_remote_stock','paused_listing_review']){
   f.tables.marketplace_inventory_outbox=[{empresa_id:company,link_id:'link-f',product_id:'fan',state:'pending',issue}];
   assert.deepEqual(await readInventoryNotices(f,company),[],`${provider}/${status}/${issue}`);
  }
  f.tables.marketplace_inventory_outbox=[];
  f.tables.marketplace_product_links.push({...f.tables.marketplace_product_links[0],id:'active-link',provider:'mercado_livre',status:'active',connection_id:'active-account',provider_listing_id:'MLB123'});
  const notices=await readInventoryNotices(f,company);assert.equal(notices.length,1);assert.equal(notices[0].code,'local_stock_unset');assert.equal(notices[0].listingId,'MLB123');
 }
});
test('anúncio encerrado não mantém pausa pendente; falhas reais e estado desconhecido permanecem',async()=>{
 for(const status of ['closed','deleted','excluded','unpublished','cancelled','canceled'])for(const issue of ['pause_unconfirmed','paused_quantity_unconfirmed']){
  const f=fixture();f.tables.marketplace_inventory_events=[];f.tables.marketplace_product_links[1].status=status;f.tables.marketplace_inventory_outbox=[{empresa_id:company,link_id:'link-f',product_id:'fan',state:'pending',issue}];
  assert.ok(!(await readInventoryNotices(f,company)).some(n=>n.productId==='fan'),`${status}/${issue}`);
  f.tables.marketplace_inventory_outbox[0].issue='reconnect';assert.ok(!(await readInventoryNotices(f,company)).some(n=>n.productId==='fan'),'fila de anúncio terminal não gera pendência de estoque');
 }
});
test('venda pendente real, pausa não confirmada e falha de conexão não são escondidas por anúncio pausado',async()=>{
 const f=fixture();f.tables.marketplace_inventory_outbox=[{empresa_id:company,link_id:'link-f',product_id:'fan',state:'pending',issue:'pause_unconfirmed'}];
 let notices=await readInventoryNotices(f,company);assert.ok(notices.some(n=>n.source==='sale'&&n.code==='stock_not_confirmed'));assert.ok(notices.some(n=>n.code==='pause_unconfirmed'));
 f.tables.marketplace_inventory_outbox[0].issue='reconnect';notices=await readInventoryNotices(f,company);assert.ok(notices.some(n=>n.code==='reconnect'));
 f.tables.marketplace_inventory_outbox[0].link_id='missing-link';f.tables.marketplace_inventory_outbox[0].issue='stock_not_confirmed';notices=await readInventoryNotices(f,company);assert.ok(notices.some(n=>n.code==='remote_stock_unconfirmed'),'não presume status quando vínculo não foi encontrado');
});
test('API e contador não recriam falta ignorada a partir da fila bruta; falha preserva aviso de indisponibilidade',async()=>{
 const f=fixture();f.tables.marketplace_inventory_events=[];f.tables.marketplace_inventory_outbox=[{empresa_id:company,link_id:'link-f',product_id:'fan',state:'pending',issue:'stock_not_confirmed'}];
 f.rpc=async(name,args)=>{assert.equal(name,'marketplace_live_feed');assert.equal(args.p_empresa,company);return{data:{alerts:[],pendingSales:0,pendingStock:7,enabled:true,workerHealthy:true,issues:[]}};};
 globalThis.noticeDb=f;
 const request=(id=company,token='Bearer manager')=>new Request(`http://localhost/api/modulos/marketplaces/avisos?empresaId=${id}`,{headers:{authorization:token}});
 try{
  const response=await getNotices(request());assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.notices,[]);assert.equal(data.pendingStock,0);assert.equal(inventoryNoticeCount(data),0);assert.match(render(data),/Sem pendências/);
  assert.equal(f.tables.marketplace_inventory_outbox[0].state,'pending','ignorar aviso não apaga nem conclui a fila');
  f.tables.marketplace_product_links[1].status='active';const resumed=await(await getNotices(request())).json();assert.equal(resumed.pendingStock,1);assert.equal(resumed.notices[0].code,'remote_stock_unconfirmed');assert.equal(inventoryNoticeCount(resumed),1,'reativar volta a conferir o saldo');
  f.failure='marketplace_product_links';const unavailable=await(await getNotices(request())).json();assert.equal(unavailable.noticesUnavailable,true);assert.equal(unavailable.pendingStock,7);assert.equal(inventoryNoticeCount(unavailable),0);assert.equal(inventoryNoticeNeedsAttention(unavailable,false),true);
  assert.equal((await getNotices(request('outra-empresa'))).status,403);assert.equal((await getNotices(request(company,''))).status,401);
 }finally{delete globalThis.noticeDb;}
});
test('anúncio sem cadastro vinculado ainda identifica nome/EAN do catálogo da mesma conta',async()=>{
  const f=fixture();f.tables.marketplace_inventory_events[0].product_id=null;f.tables.marketplace_product_links=f.tables.marketplace_product_links.slice(0,1);
  f.tables.marketplace_listings=[{empresa_id:company,connection_id:'conta',provider:'mercado_livre',provider_listing_id:'MLB999999',snapshot:{title:'Ventilador do catálogo',ean:'7895500763318'}},{empresa_id:'empresa-b',connection_id:'conta',provider:'mercado_livre',provider_listing_id:'MLB999999',snapshot:{title:'Outra empresa',ean:'8720389031151'}}];
  const notice=(await readInventoryNotices(f,company))[0];assert.equal(notice.productName,'Ventilador do catálogo');assert.equal(notice.ean,'7895500763318');assert.equal(notice.productId,null);
});
test('insuficiência antiga não persiste depois do novo saldo e retorno remoto não vira falta de estoque inicial',async()=>{
  const f=fixture();Object.assign(f.tables.marketplace_inventory_events[0],{product_id:'airfryer',listing_id:'MLB123456',state:'applied',issue:'insufficient_stock'});
  f.tables.marketplace_inventory_outbox[0].issue='stock_not_confirmed';
  f.tables.marketplace_products[1].stock_quantity=0;
  const notices=await readInventoryNotices(f,company);assert.equal(notices.length,1);assert.equal(notices[0].code,'remote_stock_unconfirmed');
});
test('outra empresa é excluída e erro/truncamento nunca é convertido em lista vazia',async()=>{
  const f=fixture();f.tables.marketplace_inventory_events.push({...f.tables.marketplace_inventory_events[0],id:'foreign',empresa_id:'empresa-b'});
  assert.equal((await readInventoryNotices(f,company)).length,2);
  f.failure='marketplace_products';await assert.rejects(readInventoryNotices(f,company),/pendências/);
  let pages=0;const rows=await inventoryRows(async(from)=>{pages++;return {data:from===0?Array.from({length:500},(_,id)=>({id})):[],error:null};});assert.equal(rows.length,500);assert.equal(pages,2);
  await assert.rejects(inventoryRows(async()=>({data:Array.from({length:500},()=>({})),error:null})),/limite/);
});
const feed=notices=>({alerts:[],pendingStock:0,pendingSales:0,issues:[],enabled:true,workerHealthy:true,notices});
const render=(data,extra={})=>renderToStaticMarkup(React.createElement(InventoryNoticeList,{feed:data,unavailable:false,...extra}));
test('interface remove sincronização ativa e zeros, oferece atualização e não declara vazio em falha',async()=>{
  const html=render(feed(await readInventoryNotices(fixture(),company)));
  assert.match(html,/Ventilador Arno/);assert.match(html,/EAN: 7895500763318/);assert.match(html,/Pedido #200/);
  assert.doesNotMatch(html,/Sincronização.*ativa|0 aviso|Confira a conexão/);
  assert.match(render(feed([])),/Sem pendências na última consulta/);
  const unavailable=render({...feed([]),noticesUnavailable:true});assert.doesNotMatch(unavailable,/Sem pendências/);assert.match(unavailable,/Não foi possível identificar/);
  assert.doesNotMatch(render(feed([]),{unavailable:true}),/Sem pendências/);
});
test('alerta no header inicia fechado e mostra somente quantidade real, sem card fixo nem zero',async()=>{
  const data=feed(await readInventoryNotices(fixture(),company));data.pendingStock=1;
  const header=renderToStaticMarkup(React.createElement(Notices,{companyId:company,feed:data,unavailable:false}));
  assert.match(header,/aria-haspopup="dialog" aria-expanded="false"/);assert.match(header,/2 aviso\(s\) de pendências/);assert.match(header,/inventoryAlertBadge[^>]*>2<\/b>/);
  assert.match(header,/<svg/);assert.doesNotMatch(header,/Ventilador Arno|Atualizar avisos|inventoryStatus/);
  assert.equal(inventoryNoticeCount(data),2,'estoque agregado não duplica aviso já detalhado');
  const empty=renderToStaticMarkup(React.createElement(Notices,{companyId:company,feed:feed([]),unavailable:false}));
  assert.doesNotMatch(empty,/inventoryAlertBadge|>0</);assert.equal(inventoryNoticeCount(feed([])),0);
  assert.equal(inventoryNoticeCount(null),0);assert.equal(inventoryNoticeNeedsAttention(null,true),true);
  const stockWorkerAlert={...feed([]),workerHealthy:false};
  const workerHeader=renderToStaticMarkup(React.createElement(Notices,{companyId:company,feed:stockWorkerAlert,unavailable:false}));
  assert.match(workerHeader,/data-has-notices="false" data-needs-attention="true"/);
  assert.match(workerHeader,/Sincronização requer atenção/);
  assert.doesNotMatch(workerHeader,/inventoryAlertBadge/);
  assert.match(render(stockWorkerAlert),/A rotina de estoque precisa de atenção/);
  assert.equal(inventoryNoticeCount({...feed([]),pendingSales:3}),3);
  assert.equal(inventoryNoticeCount({...feed([]),pendingStock:4}),0);
  assert.equal(inventoryNoticeCount({...feed([]),noticesUnavailable:true}),0);
  assert.match(render({...feed([]),pendingStock:4}),/aguardando detalhamento/);
  const client=readFileSync(resolve(root,'app/marketplaces/MarketplacesClient.tsx'),'utf8');
  assert.equal((client.match(/<InventoryNotices /g)||[]).length,1);assert.match(client,/notices=\{<InventoryNotices/);
  const filters=readFileSync(resolve(root,'app/marketplaces/SalesFilters.tsx'),'utf8');
  assert.ok(filters.indexOf('{notices}')<filters.indexOf('<FiltroCompetencia'));
  assert.match(filters, /notices && <div className={styles.headerPeriodNotices}>{notices}<\/div>/);
  const css=readFileSync(resolve(root,'app/marketplaces/marketplaces.module.css'),'utf8');
  assert.match(css,/\.headerPeriodWithNotices > \.headerGroupLabel \{ grid-column: 2; grid-row: 1;/);
  assert.match(css,/\.headerPeriodWithNotices > \.salesDateFilters \{ grid-column: 2; grid-row: 2;/);
  assert.match(css,/\.headerPeriodNotices \{ grid-column: 1; grid-row: 2;/);
  assert.match(css,/\.inventoryAlertButton \{[^}]*min-height:var\(--header-control-height,44px\);height:var\(--header-control-height,44px\)/);
  assert.match(css,/\.inventoryAlertButton::after \{[^}]*height:var\(--header-touch-height,44px\)/);
});
test('área usa todo retorno novo, monitor agrupa refresh e GET não modifica estoque',()=>{
  const read=file=>readFileSync(resolve(root,file),'utf8');
  assert.match(read('app/marketplaces/MarketplacesClient.tsx'),/setInventorySnapshot\(\{companyId, feed: detail.feed\}\)/);
  const monitor=read('app/components/MarketplaceLiveMonitor.tsx');assert.match(monitor,/requested = requested \|\| manual/);assert.match(monitor,/PRODUCT_STOCK_CHANGED, refresh/);assert.match(monitor,/AbortSignal.timeout\(15_000\)/);
  const route=read('app/api/modulos/marketplaces/avisos/route.ts').split('export async function POST')[0];assert.match(route,/await authorizeMarketplace/);assert.match(route,/readInventoryNotices\(db, empresaId\)/);assert.doesNotMatch(route,/runMarketplaceWorker|apply_inventory|\.update\(|\.insert\(/);
});

test('dispensa persiste por usuário, preserva eventos e mantém correções abertas', async()=>{
  const db=fixture(), original=db.tables.marketplace_inventory_events[0];
  original.issue='cancelled_requires_manual_return';
  db.tables.marketplace_inventory_events.push({...original,id:'foreign',empresa_id:'empresa-b'});
  db.tables.marketplace_sale_notifications=[{empresa_id:company,id:'unsupported',connection_id:'conta',topic:'items',resource:'/items/MLB456',processed_at:null,error_code:'provider_not_supported'}];
  db.rpc=async()=>({data:feed([])});
  const originalEvents=structuredClone(db.tables.marketplace_inventory_events);
  const url='http://localhost/api/modulos/marketplaces/avisos';
  const get=async(actor='manager')=>(await getNotices(new Request(url+'?empresaId='+company,{headers:{authorization:'Bearer '+actor}}))).json();
  const post=(noticeId,code)=>dismissNotice(new Request(url,{method:'POST',headers:{authorization:'Bearer manager','content-type':'application/json'},body:JSON.stringify({empresaId:company,action:'dismiss_inventory_notice',noticeId,code})}));
  globalThis.noticeDb=db;
  try{
    const before=await get();
    const html=render(before,{onDismiss(){},onAdjust(){}});
    assert.match(html,/>OK<\/span>/);
    assert.match(html,/>Dispensar aviso<\/span>/);
    assert.match(html,/>Conferir e ajustar<\/span>/);
    assert.equal(inventoryNoticeCount(before),3);
    assert.equal((await post('stock:link-a','pending_product_sales')).status,409);
    assert.equal((await post('sale:foreign',original.issue)).status,409);
    assert.equal((await post('sale:evento-f',original.issue)).status,200);
    assert.equal((await post('sale:evento-f',original.issue)).status,200);
    const after=await get();
    assert.equal(after.pendingStock,1);
    assert.equal(inventoryNoticeCount(after),2);
    assert.deepEqual(after.notices.map(n=>n.code),['pending_product_sales','provider_not_supported']);
    assert.equal(inventoryNoticeCount(await get('colleague')),3);
    assert.equal(db.tables.marketplace_inventory_notice_dismissals.length,1);
    assert.deepEqual(db.tables.marketplace_inventory_events,originalEvents);
    original.issue='cancelled_stock_review';
    db.tables.marketplace_inventory_events.push({...original,id:'novo-evento',order_id:'novo-pedido'});
    const revised=await get();
    assert.deepEqual(revised.notices.filter(n=>n.source==='sale').map(n=>n.id),['sale:novo-evento']);
    assert.equal((await post('sale:evento-f','cancelled_requires_manual_return')).status,200,'um botão antigo confirma o mesmo cancelamento');
    assert.equal(db.tables.marketplace_inventory_notice_dismissals.length,1);
    db.tables.marketplace_inventory_notice_dismissals[0].issue_code='cancelled_stock_review';
    original.issue='cancelled_requires_manual_return';
    assert.deepEqual((await get()).notices.filter(n=>n.source==='sale').map(n=>n.id),['sale:novo-evento'],'dispensa antiga vale para os dois motivos');

    db.failure='marketplace_inventory_notice_dismissals';
    const degraded=await get();
    assert.equal(degraded.noticeDismissalsUnavailable,true);
    assert.deepEqual(degraded.notices.map(n=>n.code),['pending_product_sales']);
    assert.equal(inventoryNoticeCount(degraded),1,'conta somente a pendência de estoque');
    assert.equal(inventoryNoticeNeedsAttention(degraded,false),true);
    assert.match(render(degraded),/Não foi possível verificar quais avisos já foram dispensados/);
    assert.doesNotMatch(render({...degraded,notices:[],pendingStock:0}),/Sem pendências/);
    db.failure=null;
    assert.deepEqual((await get()).notices.filter(n=>n.source==='sale').map(n=>n.id),['sale:novo-evento']);
  }finally{delete globalThis.noticeDb;}
});
