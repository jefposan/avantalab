import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname,resolve } from 'node:path';
import { existsSync } from 'node:fs';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
  if(specifier==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}',shortCircuit:true};
  if(specifier==='./mercadolivre-management')return{url:'data:text/javascript,export async function loadConnection(db,company,id){if(company!==db.company||id!==db.connection.id)throw new Error("wrong_connection");return db.connection;} export async function mlRequest(db,c,path,method="GET",body){return db.read(path,method,body);} export async function saveListing(db,c,item){db.saved.push(structuredClone(item));}',shortCircuit:true};
  if(specifier==='./mercadolivre-sales')return{url:'data:text/javascript,export async function processSaleNotifications(){throw new Error("Not used");} export async function syncOrder(){throw new Error("Not used");}',shortCircuit:true};
  let candidate;if(specifier.startsWith('@/'))candidate=resolve(root,specifier.slice(2));else if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))candidate=resolve(dirname(new URL(context.parentURL).pathname),specifier);
  if(candidate&&existsSync(`${candidate}.ts`))return next(pathToFileURL(`${candidate}.ts`).href,context);return next(specifier,context);
}});
const {deliverStockJob,reconcileOrders,runMarketplaceWorker}=await import('../../app/modules/marketplaces/services/inventory-worker.ts');
const {stockIncreaseBlocker}=await import('../../app/modules/marketplaces/services/inventory-product-guard.ts');hooks.deregister();
const company=crypto.randomUUID(),connectionId=crypto.randomUUID(),productId=crypto.randomUUID(),linkId=crypto.randomUUID();
test('Magalu só permite reposição com varredura recente, completa e da conta vinculada',async()=>{
 const {db}=fixture();db.tables.marketplace_product_links[0].provider='magalu';
 assert.equal(await stockIncreaseBlocker(db,company,productId),'pending_unidentified_sales');
 const sync={empresa_id:company,connection_id:connectionId,scan_offset:0,window_end:null,last_completed_at:new Date().toISOString()};db.tables.marketplace_magalu_sales_sync=[sync];
 assert.equal(await stockIncreaseBlocker(db,company,productId),null);
 for(const patch of [{scan_offset:1},{window_end:new Date().toISOString()},{last_completed_at:'invalid'},{last_completed_at:new Date(Date.now()-600000).toISOString()}]){db.tables.marketplace_magalu_sales_sync=[{...sync,...patch}];assert.equal(await stockIncreaseBlocker(db,company,productId),'pending_unidentified_sales');}
 db.tables.marketplace_magalu_sales_sync=[{...sync,connection_id:crypto.randomUUID()}];assert.equal(await stockIncreaseBlocker(db,company,productId),'pending_unidentified_sales');
});
class Query {
  constructor(db,table){this.db=db;this.table=table;this.filters=[];this.limitValue=Infinity;}
  select(_,options){this.countOnly=options?.head;return this;}
  eq(k,v){this.filters.push(row=>row[k]===v);return this;}
  is(k,v){this.filters.push(row=>row[k]===v);return this;}
  in(k,v){this.filters.push(row=>v.includes(row[k]));return this;}
  order(){return this;}
  limit(v){this.limitValue=v;return this;}
  range(from,to){this.start=from;this.limitValue=to-from+1;return this;}
  abortSignal(){return this;}
  maybeSingle(){this.single=true;return this;}
  update(v){this.updateValue=v;return this;}
  upsert(v){this.insertValue=v;return this;}
  then(ok,bad){return Promise.resolve().then(()=>{
    if(this.db.dbFail===this.table)return{data:null,error:{}};
    const rows=this.db.tables[this.table]||[];
    if(this.insertValue){rows.push(structuredClone(this.insertValue));this.db.tables[this.table]=rows;}
    const found=rows.filter(row=>this.filters.every(fn=>fn(row))).slice(this.start||0,(this.start||0)+this.limitValue);
    if(this.updateValue)for(const row of found)Object.assign(row,this.updateValue);
    return{data:this.countOnly?null:this.single?structuredClone(found[0]||null):structuredClone(found),count:found.length,error:null};
  }).then(ok,bad);}
}
function fixture(){
  const job={link_id:linkId,empresa_id:company,product_id:productId,desired_quantity:3,revision:2,generation:crypto.randomUUID(),allow_increase:false,attempts:0,state:'pending'};
  const db={company,connection:{id:connectionId,empresa_id:company,seller_reference:'123'},calls:[],saved:[],
    item:{id:'MLB123456',seller_id:123,title:'Produto',status:'active',sub_status:[],variations:[],available_quantity:5,shipping:{}},
    tables:{marketplace_products:[{id:productId,empresa_id:company,stock_quantity:3,revision:2,archived_at:null}],marketplace_product_links:[{id:linkId,empresa_id:company,product_id:productId,connection_id:connectionId,provider:'mercado_livre',provider_listing_id:'MLB123456'}],marketplace_inventory_outbox:[{...job}],marketplace_inventory_events:[],marketplace_sale_notifications:[]},
    from(table){return new Query(this,table);},read:async(path,method,body)=>{
      db.calls.push({path,method,body});
      if(db.override)return db.override(path,method,body);
      if(path==='/users/123')return{id:123,tags:[]};
      if(path==='/items/MLB123456'){if(method==='PUT'){if('available_quantity' in body)db.item.available_quantity=body.available_quantity;if(body.status){db.item.status=body.status;db.item.sub_status=['paused_by_seller'];}}return structuredClone(db.item);}
      throw new Error('unexpected_path');
    }};
  return{db,job,outbox:()=>db.tables.marketplace_inventory_outbox[0]};
}
test('estado terminal encerra a fila por revisão e geração sem enviar pausa ou saldo',async()=>{
 for(const provider of ['mercado_livre','magalu'])for(const status of ['deleted','closed','excluded','unpublished','cancelled','canceled']){
  const f=fixture();Object.assign(f.db.tables.marketplace_product_links[0],{provider,status});f.outbox().issue='pause_unconfirmed';
  await deliverStockJob(f.db,f.job);assert.equal(f.outbox().state,'excluded');assert.equal(f.outbox().issue,null);assert.equal(f.db.calls.length,0);assert.equal(f.db.tables.marketplace_products[0].stock_quantity,3);
 }
 const f=fixture();f.db.tables.marketplace_product_links[0].status='deleted';f.outbox().generation='nova';await deliverStockJob(f.db,f.job);assert.equal(f.outbox().state,'pending','não encerra geração mais recente');
});
test('exclusão descoberta na leitura remota atualiza vínculo e encerra tentativa sem PUT',async()=>{
 const f=fixture();f.db.item.status='deleted';await deliverStockJob(f.db,f.job);
 assert.equal(f.outbox().state,'excluded');assert.equal(f.db.tables.marketplace_product_links[0].status,'deleted');assert.equal(f.db.calls.length,1);assert.equal(f.db.calls[0].method,'GET');
});
test('importação pendente não altera nem pausa anúncios antes da confirmação física',async()=>{
 for(const quantity of [0,3]){const f=fixture();f.job.desired_quantity=quantity;f.outbox().desired_quantity=quantity;Object.assign(f.db.tables.marketplace_products[0],{stock_quantity:quantity,listing_stock_review_at:new Date().toISOString()});await deliverStockJob(f.db,f.job);assert.equal(f.outbox().issue,'import_stock_review');assert.equal(f.db.calls.length,0);}
});
test('quantidade de anúncio pausado manualmente acompanha o saldo sem reativar ou alterar informações comerciais',async()=>{
 const f=fixture();f.db.item.status='paused';f.db.item.sub_status=['paused_by_seller'];
 await deliverStockJob(f.db,f.job);
 assert.equal(f.outbox().state,'synced');assert.equal(f.db.item.status,'paused');assert.equal(f.db.item.available_quantity,3);
 const writes=f.db.calls.filter(call=>call.method==='PUT');assert.equal(writes.length,1);assert.deepEqual(writes[0].body,{available_quantity:3});
});
test('saldo zero solicita pausa explícita e confirma pausa e quantidade juntas',async()=>{
  const f=fixture();f.job.desired_quantity=0;f.outbox().desired_quantity=0;f.db.tables.marketplace_products[0].stock_quantity=0;
  await deliverStockJob(f.db,f.job);
  assert.deepEqual(f.db.calls.filter(c=>c.method==='PUT').map(c=>c.body),[{status:'paused'},{available_quantity:0}]);
  assert.equal(f.outbox().state,'synced');assert.equal(f.db.item.status,'paused');assert.equal(f.db.tables.marketplace_listing_stock_control[0].paused_by_system,true);
});
test('User Product sem vínculos completos pausa o grupo confirmado e não finge que zerou o saldo remoto',async()=>{
  const f=fixture();f.job.desired_quantity=0;f.outbox().desired_quantity=0;f.db.tables.marketplace_products[0].stock_quantity=0;f.db.item.user_product_id='MLBU123456';
  const shared={id:'MLB654321',seller_id:123,user_product_id:'MLBU123456',status:'active',sub_status:[],available_quantity:1};
  f.db.override=async(path,method,body)=>{
    if(path==='/users/123')return{id:123,tags:[]};
    if(path==='/user-products/MLBU123456/stock')return{user_id:123,locations:[{type:'selling_address',quantity:1}]};
    if(path.startsWith('/users/123/items/search'))return{results:['MLB123456','MLB654321'],paging:{total:2}};
    const target=path==='/items/MLB654321'?shared:f.db.item;
    if(method==='PUT'&&body.status==='paused'){target.status='paused';target.sub_status=['paused_by_seller'];}
    return structuredClone(target);
  };
  await deliverStockJob(f.db,f.job);
  assert.equal(f.outbox().state,'protected');assert.equal(f.outbox().issue,'paused_quantity_unconfirmed');
  assert.equal(f.db.item.status,'paused');assert.equal(shared.status,'paused');assert.equal(f.db.item.available_quantity,5);
  assert.deepEqual(f.db.calls.filter(c=>c.method==='PUT').map(c=>c.body),[{status:'paused'},{status:'paused'}]);
});
test('resposta de pausa sem confirmação remota permanece pendente',async()=>{
  const f=fixture();f.job.desired_quantity=0;f.outbox().desired_quantity=0;f.db.tables.marketplace_products[0].stock_quantity=0;
  f.db.override=async(path)=>path.startsWith('/users')?{id:123,tags:[]}:structuredClone(f.db.item);
  await deliverStockJob(f.db,f.job);assert.equal(f.outbox().state,'pending');assert.equal(f.outbox().issue,'pause_unconfirmed');
});
test('pausa manual não vira pausa do sistema nem recebe reativação automática',async()=>{
  const f=fixture();f.db.item.status='paused';f.db.item.sub_status=['paused_by_seller'];
  await deliverStockJob(f.db,f.job);assert.equal(f.outbox().state,'synced');assert.equal(f.db.item.status,'paused');assert.deepEqual(f.db.calls.filter(c=>c.method==='PUT').map(c=>c.body),[{available_quantity:3}]);assert.equal(f.db.tables.marketplace_listing_stock_control,undefined);
  f.job.desired_quantity=0;f.outbox().desired_quantity=0;f.db.tables.marketplace_products[0].stock_quantity=0;
  await deliverStockJob(f.db,f.job);assert.equal(f.outbox().state,'synced');assert.equal(f.db.tables.marketplace_listing_stock_control,undefined);
});
test('Full não recebe pausa nem alteração de quantidade',async()=>{
  const f=fixture();f.job.desired_quantity=0;f.outbox().desired_quantity=0;f.db.tables.marketplace_products[0].stock_quantity=0;f.db.item.shipping={logistic_type:'fulfillment'};
  await deliverStockJob(f.db,f.job);assert.equal(f.outbox().issue,'fulfillment');assert.equal(f.db.calls.some(c=>c.method==='PUT'),false);
});
test('envio altera apenas quantidade e confirma GET antes de marcar sincronizado',async()=>{
  const f=fixture();await deliverStockJob(f.db,f.job);
  assert.deepEqual(f.db.calls.filter(c=>c.method==='PUT').map(c=>c.body),[{available_quantity:3}]);
  assert.equal(f.outbox().state,'synced');assert.equal(f.db.saved.length,1);assert.equal(f.db.item.available_quantity,3);
});
test('saldo já igual não escreve; confirmação não observada permanece pendente',async()=>{
  const f=fixture();f.db.item.available_quantity=3;await deliverStockJob(f.db,f.job);assert.equal(f.db.calls.filter(c=>c.method==='PUT').length,0);assert.equal(f.outbox().state,'synced');
  const other=fixture();other.db.override=async(path,method)=>path.startsWith('/users')?{id:123,tags:[]}:structuredClone(other.db.item);
  await deliverStockJob(other.db,other.job);assert.equal(other.outbox().state,'pending');assert.equal(other.outbox().issue,'remote_stock_unconfirmed');
});
test('falha incerta no PUT é recuperada por leitura sem repetir escrita que já chegou',async()=>{
  const f=fixture();f.db.override=async(path,method,body)=>{
    if(path.startsWith('/users'))return{id:123,tags:[]};
    if(method==='PUT'){f.db.item.available_quantity=body.available_quantity;throw new Error('timeout');}return structuredClone(f.db.item);
  };
  await deliverStockJob(f.db,f.job);assert.equal(f.outbox().state,'pending');
  await deliverStockJob(f.db,{...f.outbox()});assert.equal(f.outbox().state,'synced');assert.equal(f.db.calls.filter(c=>c.method==='PUT').length,1);
});
test('venda ainda não processada não é apagada por reposição no anúncio de origem',async()=>{
  const f=fixture();f.db.item.available_quantity=2;await deliverStockJob(f.db,f.job);assert.equal(f.outbox().issue,'lower_remote_stock');assert.equal(f.db.calls.some(c=>c.method==='PUT'),false);
});
test('nova revisão durante consultas impede saldo antigo e não apaga o job mais recente',async()=>{
  const f=fixture();const original=f.db.read;f.db.read=async(...args)=>{
    const result=await original(...args);if(args[0]==='/users/123'){f.db.tables.marketplace_products[0].stock_quantity=2;f.db.tables.marketplace_products[0].revision=3;Object.assign(f.outbox(),{desired_quantity:2,revision:3});}return result;
  };
  await deliverStockJob(f.db,f.job);assert.equal(f.db.calls.some(c=>c.method==='PUT'),false);assert.equal(f.outbox().revision,3);assert.equal(f.outbox().state,'pending');assert.equal(f.outbox().issue,undefined);
});
test('retorno de item de outra conta não escreve; credencial local ausente não acessa banco nem expira conexões',async()=>{
  const f=fixture();f.db.item.seller_id=999;await deliverStockJob(f.db,f.job);assert.equal(f.outbox().issue,'invalid_listing');assert.equal(f.db.calls.some(c=>c.method==='PUT'),false);
  const old=process.env.MARKETPLACE_SECRETS_KEY;delete process.env.MARKETPLACE_SECRETS_KEY;
  try{assert.deepEqual(await runMarketplaceWorker({rpc(){throw new Error('não pode acessar');}}),{configured:false});}finally{if(old)process.env.MARKETPLACE_SECRETS_KEY=old;}
});
test('novo evento do anúncio com mesma revisão não é confirmado por uma resposta de geração anterior',async()=>{
  const f=fixture();let reads=0;const original=f.db.read;
  f.db.read=async(...args)=>{const result=await original(...args);if(args[0]==='/items/MLB123456'&&args[1]==='GET'&&++reads===2)Object.assign(f.outbox(),{generation:crypto.randomUUID(),state:'pending'});return result;};
  await deliverStockJob(f.db,f.job);assert.equal(f.outbox().state,'pending');assert.notEqual(f.outbox().generation,f.job.generation);assert.equal(f.outbox().synced_at,undefined);
});
test('varredura valida vendedor, pagina e guarda cursor apenas depois da fila persistida',async()=>{
  const f=fixture();f.db.override=async()=>({results:[{id:'200',seller:{id:123},last_updated:'2026-10-11T12:00:00Z'}],paging:{total:2}});
  await reconcileOrders(f.db,f.db.connection,'2026-10-11T00:00:00Z');
  assert.equal(f.db.tables.marketplace_sale_notifications[0].resource,'/orders/200');assert.equal(f.db.tables.marketplace_inventory_reconciliation[0].scan_offset,1);
  assert.ok(f.db.calls[0].path.includes('order.date_last_updated.from'));
  const other=fixture();other.db.override=async()=>({results:[{id:'200',seller:{id:999}}],paging:{total:1}});
  await assert.rejects(reconcileOrders(other.db,other.db.connection,'2026-10-11T00:00:00Z'),/conta/);assert.equal(other.db.tables.marketplace_sale_notifications.length,0);
});
test('falha ao guardar fila não avança cursor e permite revarredura segura',async()=>{
  const f=fixture();f.db.override=async()=>({results:[{id:'200',seller:{id:123}}],paging:{total:1}});f.db.dbFail='marketplace_sale_notifications';
  await assert.rejects(reconcileOrders(f.db,f.db.connection,'2026-10-11T00:00:00Z'),/registrar/);assert.equal(f.db.tables.marketplace_inventory_reconciliation,undefined);
});
test('varredura recorrente consulta canceladas mesmo sem webhook e sem duplicar pedido das duas buscas',async()=>{
  const f=fixture();f.db.override=async()=>({results:[{id:'200',seller:{id:123}}],paging:{total:1}});
  await reconcileOrders(f.db,f.db.connection,'2026-10-11T00:00:00Z');
  assert.ok(f.db.calls.some(call=>new URL(call.path,'https://ml.test').searchParams.get('order.status')==='cancelled'));
  assert.equal(f.db.tables.marketplace_sale_notifications.length,1);
});

test('venda de outro produto não bloqueia aumento confirmado, mesmo na mesma conta',async()=>{
  const f=fixture();f.job.allow_increase=true;f.db.item.available_quantity=0;
  f.db.tables.marketplace_inventory_events.push({id:'outro',empresa_id:company,connection_id:connectionId,listing_id:'MLB999999',product_id:'other-product',state:'pending',issue:'stock_not_confirmed'});
  await deliverStockJob(f.db,f.job);assert.equal(f.outbox().state,'synced');assert.equal(f.db.item.available_quantity,3);
});
test('eventos do próprio produto e de anúncios compartilhados impedem reposição indevida',async()=>{
  for(const event of [{product_id:productId,connection_id:'outra-conta',listing_id:'MLB999999'},{product_id:null,connection_id:connectionId,listing_id:'MLB123456'}]){
    const f=fixture();f.job.allow_increase=true;f.db.item.available_quantity=0;
    f.db.tables.marketplace_inventory_events.push({...event,empresa_id:company,state:'pending'});
    await deliverStockJob(f.db,f.job);assert.equal(f.outbox().issue,'pending_product_sales');assert.equal(f.db.calls.some(c=>c.method==='PUT'),false);
  }
});
test('notificação sem produto identificado é precaução da conta relacionada, não de toda a empresa',async()=>{
  for(const related of [false,true]){
    const f=fixture();f.job.allow_increase=true;f.db.item.available_quantity=0;
    f.db.tables.marketplace_sale_notifications.push({empresa_id:company,connection_id:related?connectionId:'outra-conta',processed_at:null,topic:'orders_v2',resource:'/orders/200'});
    await deliverStockJob(f.db,f.job);assert.equal(f.outbox().state,related?'pending':'synced');if(related)assert.equal(f.outbox().issue,'pending_unidentified_sales');
  }
});
test('falha na conferência não autoriza aumento; pendência de outra empresa não bloqueia',async()=>{
  const f=fixture();f.job.allow_increase=true;f.db.item.available_quantity=0;f.db.dbFail='marketplace_inventory_events';
  await deliverStockJob(f.db,f.job);assert.equal(f.outbox().issue,'inventory_database');assert.equal(f.db.calls.some(c=>c.method==='PUT'),false);
  const g=fixture();g.job.allow_increase=true;g.db.item.available_quantity=0;g.db.tables.marketplace_inventory_events.push({empresa_id:'outra-empresa',product_id:productId,state:'pending'});
  await deliverStockJob(g.db,g.job);assert.equal(g.outbox().state,'synced');
});

test('divergência repetida continua sendo consultada sem inflar tentativas ou enviar reposição',async()=>{
 const f=fixture();f.db.item.available_quantity=1;
 await deliverStockJob(f.db,f.job);assert.equal(f.outbox().issue,'lower_remote_stock');assert.equal(f.outbox().attempts,1);
 for(let i=0;i<3;i++){
  const readCount=f.db.calls.length;
  await deliverStockJob(f.db,{...f.outbox()});
  assert.ok(f.db.calls.length>readCount,'a consulta automática continua ativa');
  assert.equal(f.outbox().attempts,1);assert.equal(f.outbox().state,'pending');
  assert.ok(Date.parse(f.outbox().next_attempt_at)>Date.now()+29*60000);
 }
 assert.equal(f.db.calls.filter(c=>c.method==='PUT').length,0);
 f.db.item.available_quantity=3;
 await deliverStockJob(f.db,{...f.outbox()});
 assert.equal(f.outbox().state,'synced');assert.equal(f.outbox().issue,null);
 assert.equal(f.db.calls.filter(c=>c.method==='PUT').length,0,'reconhece correção externa sem reenviar');
});

test('Resolver com nova geração retoma envio imediato e preserva pausa manual',async()=>{
 const f=fixture();f.db.item.available_quantity=1;f.db.item.status='paused';f.db.item.sub_status=['paused_by_seller'];
 Object.assign(f.outbox(),{issue:'lower_remote_stock',attempts:185});
 await deliverStockJob(f.db,{...f.outbox()});assert.equal(f.outbox().attempts,185);
 const generation=crypto.randomUUID();Object.assign(f.outbox(),{generation,issue:null,allow_increase:true,attempts:0});
 await deliverStockJob(f.db,{...f.outbox()});
 assert.equal(f.outbox().generation,generation);assert.equal(f.outbox().state,'synced');
 assert.equal(f.db.item.status,'paused');assert.deepEqual(f.db.calls.filter(c=>c.method==='PUT').map(c=>c.body),[{available_quantity:3}]);
});

test('falha técnica continua tendo retry normal e contador de novas tentativas',async()=>{
 const f=fixture();f.db.override=async()=>{throw Error('network');};
 await deliverStockJob(f.db,f.job);assert.equal(f.outbox().attempts,1);assert.equal(f.outbox().issue,'processing');
 await deliverStockJob(f.db,{...f.outbox()});assert.equal(f.outbox().attempts,2);
 assert.ok(Date.parse(f.outbox().next_attempt_at)<Date.now()+3*60000);
});
