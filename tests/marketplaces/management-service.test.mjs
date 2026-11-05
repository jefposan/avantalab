import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Harness Node: server-only permanece no código de produção; aqui não há Next runtime.
const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier.endsWith('/management-access') || specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error { constructor(status,code,message){super(message);this.status=status;this.code=code;} }', shortCircuit: true };
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { loadConnection, mlRequest, mlBinaryRequest, manageListing, synchronizeListings } = await import('../../app/modules/marketplaces/services/mercadolivre-management.ts');
const { sealMarketplaceSecret, openMarketplaceSecret } = await import('../../app/modules/marketplaces/services/secret-vault.ts');
const {reconcileListingEdits}=await import('../../app/modules/marketplaces/services/listing-edit-confirmation.ts');
const {refreshKnownListingStatuses}=await import('../../app/modules/marketplaces/services/listing-status-refresh.ts');
hooks.deregister();
const company = '11111111-1111-4111-8111-111111111111', connectionId = '22222222-2222-4222-8222-222222222222';
const itemId = 'MLB5324529993';
test('edição pendente só é confirmada quando todos os campos relidos correspondem, na empresa/conta exatas',()=>environment(async()=>{
 const db=database();db.tables.marketplace_listing_actions=[{id:'a',empresa_id:company,connection_id:connectionId,provider_listing_id:itemId,action:'edit',status:'uncertain',request_payload:{changes:{price:150,title:'Produto',description:'Descrição',stock:3,listingType:'gold_special'}}}];
 const values={price:149,title:'Produto',description:'Descrição',stock:3,listingType:'gold_special'};
 await reconcileListingEdits(db,company,connectionId,itemId,values);assert.equal(db.tables.marketplace_listing_actions[0].status,'uncertain');
 await reconcileListingEdits(db,'other',connectionId,itemId,{...values,price:150});assert.equal(db.tables.marketplace_listing_actions[0].status,'uncertain');
 await reconcileListingEdits(db,company,connectionId,itemId,{...values,price:150});assert.equal(db.tables.marketplace_listing_actions[0].status,'succeeded');
}));

class Query {
  constructor(db, table) { this.db=db; this.table=table; this.filters=[]; this.mode='select'; }
  select() { return this; }
  eq(key,value) { this.filters.push((row) => row[key]===value); return this; }
  gt(key,value) { this.filters.push(row=>row[key]>value);return this; }
  order(key) { this.orderKey=key;return this; }
  limit(value) { this.max=value;return this; }
  is(key,value) { this.filters.push((row) => (row[key] ?? null)===value); return this; }
  or(expression) { const key=expression.startsWith('sync_') ? 'sync_lock_until' : 'refresh_lock_until';this.filters.push((row) => !row[key] || new Date(row[key]).getTime()<Date.now()); return this; }
  update(values) { this.mode='update'; this.values=values; return this; }
  insert(values) { this.mode='insert'; this.values=values; return this; }
  upsert(values) { this.mode='upsert'; this.values=values; return this; }
  maybeSingle() { this.one=true; return this; }
  single() { this.one=true; return this; }
  then(success,failure) { return Promise.resolve().then(() => this.execute()).then(success,failure); }
  execute() {
    const rows=this.db.tables[this.table] ||= [];
    let matched=rows.filter((row) => this.filters.every((predicate) => predicate(row)));
    if(this.orderKey)matched.sort((a,b)=>String(a[this.orderKey]).localeCompare(String(b[this.orderKey])));
    if(this.max!=null)matched=matched.slice(0,this.max);
    if (this.mode==='insert') {
      if(rows.some((row) => row.request_key===this.values.request_key && row.empresa_id===this.values.empresa_id)) return {error:{code:'23505'},data:null};
      const row={id:crypto.randomUUID(),...this.values}; rows.push(row); matched=[row];
    } else if(this.mode==='update') for(const row of matched) Object.assign(row, this.values);
    else if(this.mode==='upsert') { const previous=rows.find((row) => row.connection_id===this.values.connection_id && row.provider_listing_id===this.values.provider_listing_id); if(previous) Object.assign(previous,this.values); else rows.push(this.values); }
    return {error:null,data: structuredClone(this.one ? matched[0] || null : matched)};
  }
}
function database(expired=false) {
  return { tables: { marketplace_connections: [{ id:connectionId,empresa_id:company,provider:'mercado_livre',seller_reference:'123',status:'connected',
    expires_at:new Date(Date.now()+(expired ? -1000 : 3600000)).toISOString(),token_sealed:sealMarketplaceSecret(JSON.stringify({accessToken:'test-access',refreshToken:'test-refresh'})) }] },
    observations:[],rpc(name,args){assert.equal(name,'marketplace_observe_listing');this.observations.push(args);return Promise.resolve({error:this.observationError||null});},
    from(table) {return new Query(this,table);} };
}
async function environment(task) {
  const previous=globalThis.fetch;
  const keys=['MARKETPLACE_SECRETS_KEY','MERCADOLIVRE_CLIENT_ID','MERCADOLIVRE_CLIENT_SECRET','MERCADOLIVRE_OAUTH_REDIRECT_URI'];
  const saved=keys.map((key) => [key,process.env[key]]);
  Object.assign(process.env,{MARKETPLACE_SECRETS_KEY:Buffer.alloc(32,7).toString('base64url'),MERCADOLIVRE_CLIENT_ID:'123',MERCADOLIVRE_CLIENT_SECRET:'test-secret',MERCADOLIVRE_OAUTH_REDIRECT_URI:'https://example.test/callback'});
  try { await task(); } finally {globalThis.fetch=previous; for(const [key,value] of saved) { if(value===undefined) delete process.env[key];else process.env[key]=value;}}
}
test('conexão é isolada por empresa, não apenas por ID', () => environment(async () => {
  const db=database();
  await assert.rejects(loadConnection(db,'99999999-9999-4999-8999-999999999999',connectionId), /não encontrada/);
}));
test('validador do Mercado Livre aceita sucesso 204 sem exigir JSON', () => environment(async () => {
  const db=database(), connection=await loadConnection(db,company,connectionId);
  globalThis.fetch=async (_url,options) => { assert.equal(options.method,'POST'); return new Response(null,{status:204}); };
  assert.equal(await mlRequest(db,connection,'/items/validate','POST',{title:'Teste'}),null);
}));
test('pré-validação 400 com apenas warnings é não bloqueante, mas criação 400 permanece recusada',()=>environment(async()=>{
  const db=database(),connection=await loadConnection(db,company,connectionId);let calls=0;
  globalThis.fetch=async()=>{calls++;return Response.json({error:'validation_error',status:400,cause:[{type:'warning',code:'item.shipping.mandatory_free_shipping',message:'Mandatory free shipping added'}]},{status:400});};
  assert.equal((await mlRequest(db,connection,'/items/validate','POST',{title:'Teste'})).validatedWithWarnings,true);
  await assert.rejects(mlRequest(db,connection,'/items','POST',{title:'Teste'}),error=>error.code==='invalid_fields');
  assert.equal(calls,2);
}));
test('envios enviam o header oficial novo sem afetar consultas de outros recursos', () => environment(async () => {
  const db=database(),connection=await loadConnection(db,company,connectionId);
  globalThis.fetch=async(url,options)=>{assert.equal(options.headers['X-Format-New'],url.includes('/shipments/')?'true':undefined);return Response.json({id:555});};
  await mlRequest(db,connection,'/shipments/555');await mlRequest(db,connection,'/items/MLB123456');
}));
test('etiqueta térmica valida o pacote ZIP e recusa HTML, PDF e conteúdo inválido',()=>environment(async()=>{
 const db=database(),connection=await loadConnection(db,company,connectionId);
 const bytes=new Uint8Array(30);bytes.set([0x50,0x4b,0x03,0x04]);
 globalThis.fetch=async(_url,options)=>{assert.equal(options.headers.Accept,'application/zip');return new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}});};
 assert.deepEqual(await mlBinaryRequest(db,connection,'/shipment_labels?shipment_ids=555&response_type=zpl2','zip'),bytes);
 for(const [body,type] of [['<html>Falha</html>','text/html'],['%PDF-falso','application/pdf'],['conteudo invalido'.repeat(3),'application/zip']]){
  globalThis.fetch=async()=>new Response(body,{headers:{'Content-Type':type}});
  await assert.rejects(mlBinaryRequest(db,connection,'/shipment_labels?shipment_ids=555&response_type=zpl2','zip'),error=>error.code==='invalid_label');
 }
}));
test('negação de recurso não é apresentada como perda da conexão', () => environment(async () => {
  const db=database(), connection=await loadConnection(db,company,connectionId);
  globalThis.fetch=async () => Response.json({code:'PA_UNAUTHORIZED_RESULT_FROM_POLICIES'},{status:403});
  await assert.rejects(mlRequest(db,connection,'/categories/MLB1/shipping_preferences'), (error) => error.status===403 && error.code==='provider_403' && /conexão segue ativa/i.test(error.message));
}));
test('limite de consulta preserva o status e a orientação do Mercado Livre', () => environment(async () => {
  const db=database(), connection=await loadConnection(db,company,connectionId);
  globalThis.fetch=async () => Response.json({message:'too many requests'},{status:429});
  await assert.rejects(mlRequest(db,connection,'/items/MLB1/sale_price?context=channel_marketplace'), (error) => error.status===429 && error.code==='provider_429' && /limite de consultas/i.test(error.message));
}));
test('pós-venda distingue política de acesso sem revelar a resposta privada nem desconectar', () => environment(async () => {
  const db=database(), connection=await loadConnection(db,company,connectionId);
  globalThis.fetch=async () => Response.json({code:'PA_UNAUTHORIZED_RESULT_FROM_POLICIES',message:'PRIVATE',cause:['SECRET']},{status:403});
  await assert.rejects(mlRequest(db,connection,'/post-purchase/v1/claims/search?order_id=123'), (error) => error.status===403 && error.code==='provider_policy_403' && !error.message.includes('PRIVATE'));
  assert.equal(db.tables.marketplace_connections[0].status,'connected');
  globalThis.fetch=async () => Response.json({error:'forbidden_error',message:'PRIVATE'},{status:403});
  await assert.rejects(mlRequest(db,connection,'/post-purchase/v1/claims/123'), (error) => error.code==='provider_403' && !error.message.includes('PRIVATE'));
}));
test('refresh concorrente troca uma única vez e salva o par novo atomicamente', () => environment(async () => {
  const db=database(true), connection=await loadConnection(db,company,connectionId);
  let refreshes=0;
  globalThis.fetch=async (url,options) => {
    if(url.endsWith('/oauth/token')) { refreshes++; assert.equal(options.body.get('refresh_token'),'test-refresh'); await new Promise((resolve) => setTimeout(resolve,20)); return Response.json({access_token:'new-access',refresh_token:'new-refresh',user_id:123,expires_in:21600}); }
    assert.equal(options.headers.Authorization,'Bearer new-access'); return Response.json({id:123});
  };
  await Promise.all([mlRequest(db,connection,'/users/me'),mlRequest(db,connection,'/users/me')]);
  assert.equal(refreshes,1);
  assert.deepEqual(JSON.parse(openMarketplaceSecret(db.tables.marketplace_connections[0].token_sealed)),{accessToken:'new-access',refreshToken:'new-refresh'});
  assert.equal(db.tables.marketplace_connections[0].refresh_lock_owner,null);
}));
test('seller alheio é recusado antes de qualquer PUT', () => environment(async () => {
  const db=database(), connection=await loadConnection(db,company,connectionId); let puts=0;
  globalThis.fetch=async (_url,options) => { if(options.method==='PUT') puts++; return Response.json({id:itemId,seller_id:999,status:'active'}); };
  await assert.rejects(manageListing(db,connection,'actor',{id:itemId,action:'pause',requestKey:crypto.randomUUID(),confirmation:itemId}),/não pertence/);
  assert.equal(puts,0);
}));
test('ação aplicada é auditada e reenvio com mesma chave não repete o PUT', () => environment(async () => {
  const db=database(), connection=await loadConnection(db,company,connectionId); let puts=0, status='active';
  globalThis.fetch=async (url,options) => {
    if(options.method==='PUT') { puts++; status=JSON.parse(options.body).status; return Response.json({status}); }
    if(url.includes('/listing_prices')) return Response.json([{listing_type_id:'gold_pro',sale_fee_amount:25}]);
    return Response.json({id:itemId,seller_id:123,title:'Teste',status,price:160,listing_type_id:'gold_pro',category_id:'MLB1'});
  };
  const input={id:itemId,action:'pause',requestKey:crypto.randomUUID(),confirmation:itemId};
  await manageListing(db,connection,'actor',input);
  assert.equal(puts,1); assert.equal(db.tables.marketplace_listing_actions[0].status,'succeeded');
  assert.equal(db.tables.marketplace_listings[0].status,'paused');
  assert.deepEqual(db.observations[0],{p_empresa:company,p_connection:connectionId,p_listing:itemId,p_quantity:null,p_status:'paused'});
  status='active'; await assert.rejects(manageListing(db,connection,'actor',input)); assert.equal(puts,1);
}));
test('resposta perdida ao alterar gera resultado incerto, não repete a mutação', () => environment(async () => {
  const db=database(), connection=await loadConnection(db,company,connectionId); let puts=0;
  globalThis.fetch=async (_url,options) => { if(options.method==='PUT') {puts++;throw new Error('network');}return Response.json({id:itemId,seller_id:123,status:'active'}); };
  await assert.rejects(manageListing(db,connection,'actor',{id:itemId,action:'pause',requestKey:crypto.randomUUID(),confirmation:itemId}),/pode ter sido aplicada/);
  assert.equal(puts,1); assert.equal(db.tables.marketplace_listing_actions[0].status,'uncertain');
}));
test('pausa aceita mas ainda não observada fica pendente e mantém status real do vínculo',()=>environment(async()=>{
 const db=database(),connection=await loadConnection(db,company,connectionId);
 globalThis.fetch=async()=>Response.json({id:itemId,seller_id:123,status:'active'});
 const result=await manageListing(db,connection,'actor',{id:itemId,action:'pause',requestKey:crypto.randomUUID(),confirmation:itemId});
 assert.equal(result.pending,true);assert.equal(result.success,false);assert.equal(db.observations[0].p_status,'active');
 assert.equal(db.tables.marketplace_listing_actions[0].status,'uncertain');
}));
test('falha ao persistir vínculo após ação remota não declara conclusão',()=>environment(async()=>{
 const db=database(),connection=await loadConnection(db,company,connectionId);let status='active';db.observationError=Error('database');
 globalThis.fetch=async(_url,options)=>{if(options.method==='PUT')status='paused';return Response.json({id:itemId,seller_id:123,status});};
 await assert.rejects(manageListing(db,connection,'actor',{id:itemId,action:'pause',requestKey:crypto.randomUUID(),confirmation:itemId}),/pode ter sido aplicada/);
 assert.equal(db.tables.marketplace_listing_actions[0].status,'uncertain');
}));
test('pausa, reativação, encerramento e exclusão persistem somente a situação observada do anúncio correto',()=>environment(async()=>{
 for(const [action,initial,expected] of [['pause','active','paused'],['resume','paused','active'],['close','paused','closed'],['delete','closed','deleted']]){
  const db=database(),connection=await loadConnection(db,company,connectionId);let status=initial,deleted=false;
  globalThis.fetch=async(_url,options)=>{if(options.method==='PUT'){const input=JSON.parse(options.body);if(input.deleted)deleted=true;else status=input.status;}return Response.json({id:itemId,seller_id:123,status,sub_status:deleted?['deleted']:[]});};
  const result=await manageListing(db,connection,'actor',{id:itemId,action,requestKey:crypto.randomUUID(),confirmation:itemId});
  assert.equal(result.success,true);assert.equal(result.pending,false);assert.equal(db.observations[0].p_status,expected);
  assert.equal(db.observations[0].p_connection,connectionId);assert.equal(db.observations[0].p_empresa,company);assert.equal(db.observations[0].p_listing,itemId);
 }
}));
test('reativação confere saldo atual no servidor, sem usar saldo do Saldão ou ficha antiga',()=>environment(async()=>{
 for(const quantity of [0,null]){
  const db=database(),connection=await loadConnection(db,company,connectionId);let puts=0;
  db.tables.marketplace_product_links=[{empresa_id:company,connection_id:connectionId,provider_listing_id:itemId,product_id:'produto'}];
  db.tables.marketplace_products=[{empresa_id:company,id:'produto',stock_quantity:quantity,archived_at:null}];
  globalThis.fetch=async(_url,options)=>{if(options.method==='PUT')puts++;return Response.json({id:itemId,seller_id:123,status:'paused'});};
  await assert.rejects(manageListing(db,connection,'actor',{id:itemId,action:'resume',requestKey:crypto.randomUUID(),confirmation:itemId}),/Sem estoque Online/);
  assert.equal(puts,0);assert.equal(db.tables.marketplace_listing_actions?.length||0,0);
 }
}));
test('reativação vinculada confirma a quantidade atual antes de liberar o anúncio',()=>environment(async()=>{
 const db=database(),connection=await loadConnection(db,company,connectionId),writes=[];let status='paused',quantity=0;
 db.tables.marketplace_product_links=[{empresa_id:company,connection_id:connectionId,provider_listing_id:itemId,product_id:'produto'}];
 db.tables.marketplace_products=[{empresa_id:company,id:'produto',stock_quantity:2,archived_at:null}];
 globalThis.fetch=async(_url,options)=>{if(options.method==='PUT'){const body=JSON.parse(options.body);writes.push(body);if('available_quantity' in body)quantity=body.available_quantity;if(body.status)status=body.status;}return Response.json({id:itemId,seller_id:123,title:'Produto',status,available_quantity:quantity,shipping:{}});};
 const result=await manageListing(db,connection,'actor',{id:itemId,action:'resume',requestKey:crypto.randomUUID(),confirmation:itemId});
 assert.equal(result.success,true);assert.deepEqual(writes,[{available_quantity:2},{status:'active'}]);assert.equal(db.observations[0].p_quantity,2);
}));
test('scan enumera IDs antes de cotar; falha no bulk preserva a fila e não pula produtos', () => environment(async () => {
  const db=database(); let scans=0, failBulk=true;
  globalThis.fetch=async (url) => {
    if(url.includes('/items/search')) {scans++; return Response.json(scans===1 ? {results:[itemId],scroll_id:'cursor-test'} : {results:null});}
    if(url.includes('/items/bulk')) {if(failBulk) throw new Error('temporary');return Response.json([{status_code:200,id:itemId,body:{id:itemId,seller_id:123,title:'Gin',status:'active',price:160,listing_type_id:'gold_pro'}}]);}
    if(url.includes('/listing_prices')) return Response.json([{listing_type_id:'gold_pro',sale_fee_amount:20}]);
    throw new Error('Unexpected API path');
  };
  const get=() => loadConnection(db,company,connectionId);
  await synchronizeListings(db,await get()); await synchronizeListings(db,await get());
  assert.equal(db.tables.marketplace_connections[0].sync_phase,'enrich');
  await assert.rejects(synchronizeListings(db,await get()));
  assert.deepEqual(db.tables.marketplace_connections[0].sync_pending_ids,[itemId]);
  failBulk=false; const result=await synchronizeListings(db,await get());
  assert.equal(result.complete,true); assert.equal(scans,2); assert.equal(db.tables.marketplace_listings[0].provider_listing_id,itemId);
}));
test('conferência automática percorre todos os IDs locais, mesmo excluídos que não aparecem na busca, e não faz PUT',()=>environment(async()=>{
 const db=database(),connection=await loadConnection(db,company,connectionId),seen=[];
 db.tables.marketplace_listings=Array.from({length:10},(_,i)=>({id:String(i).padStart(2,'0'),empresa_id:company,connection_id:connectionId,provider:'mercado_livre',provider_listing_id:`MLB532452${1000+i}`,status:'active',snapshot:{}}));
 db.tables.marketplace_listings.push({id:'other',empresa_id:'other',connection_id:connectionId,provider:'mercado_livre',provider_listing_id:'MLB9999999999',status:'active'});
 globalThis.fetch=async(url,options)=>{assert.equal(options.method,'GET');assert.match(new URL(url).pathname,/^\/items\/MLB\d+$/);const id=new URL(url).pathname.split('/').pop();seen.push(id);return Response.json({id,seller_id:123,status:'closed',sub_status:['deleted'],title:'Armário',price:100,available_quantity:1});};
 let progress=await refreshKnownListingStatuses(db,connection);assert.equal(progress.count,8);assert.equal(progress.complete,false);
 progress=await refreshKnownListingStatuses(db,connection);assert.equal(progress.count,2);assert.equal(progress.complete,true);
 assert.equal(new Set(seen).size,10);assert.equal(db.tables.marketplace_listings.filter(x=>x.empresa_id===company&&x.status==='deleted').length,10);assert.equal(db.tables.marketplace_listings.find(x=>x.id==='other').status,'active');
 assert.ok(db.tables.marketplace_listing_status_checks[0].last_completed_at);assert.equal(db.tables.marketplace_listing_status_checks[0].issue,null);
}));
test('falha isolada preserva situação, avança cursor sem bloquear demais e só encerra aviso após ciclo íntegro',()=>environment(async()=>{
 const db=database(),connection=await loadConnection(db,company,connectionId);let fail=true;
 db.tables.marketplace_listings=Array.from({length:9},(_,i)=>({id:String(i).padStart(2,'0'),empresa_id:company,connection_id:connectionId,provider:'mercado_livre',provider_listing_id:`MLB532452${1000+i}`,status:'active',snapshot:{}}));
 globalThis.fetch=async(url,options)=>{assert.equal(options.method,'GET');const id=new URL(url).pathname.split('/').pop();if(fail&&id==='MLB5324521000')return Response.json({}, {status:404});return Response.json({id,seller_id:123,status:'paused',title:'Produto',price:100});};
 await refreshKnownListingStatuses(db,connection);assert.equal(db.tables.marketplace_listings[0].status,'active');assert.equal(db.tables.marketplace_listings[1].status,'paused');
 await refreshKnownListingStatuses(db,connection);assert.equal(db.tables.marketplace_listings[8].status,'paused');assert.equal(db.tables.marketplace_listing_status_checks[0].issue,'listing_refresh_partial');assert.equal(db.tables.marketplace_listing_status_checks[0].last_completed_at,null);
 fail=false;await refreshKnownListingStatuses(db,connection);await refreshKnownListingStatuses(db,connection);assert.equal(db.tables.marketplace_listings[0].status,'paused');assert.equal(db.tables.marketplace_listing_status_checks[0].issue,null);
}));
test('tentativa incompatível relê e persiste exclusão antes de recusar pausa; sem PUT nem recibo falso',()=>environment(async()=>{
 const db=database();db.tables.marketplace_listings=[{id:'local',empresa_id:company,connection_id:connectionId,provider_listing_id:itemId,status:'active',snapshot:{}}];
 globalThis.fetch=async(url,options)=>{assert.equal(options.method,'GET');return Response.json({id:itemId,seller_id:123,title:'Armário',status:'closed',sub_status:['deleted']});};
 await assert.rejects(manageListing(db,await loadConnection(db,company,connectionId),'actor',{id:itemId,action:'pause',confirmation:itemId,requestKey:crypto.randomUUID()}),/já foi excluído/);
 assert.equal(db.tables.marketplace_listings[0].status,'deleted');assert.equal((db.tables.marketplace_listing_actions||[]).length,0);
}));
test('conferência respeita trava e orçamento; vendedor divergente não sobrescreve estado',()=>environment(async()=>{
 const db=database(),connection=await loadConnection(db,company,connectionId);
 db.tables.marketplace_listings=[{id:'local',empresa_id:company,connection_id:connectionId,provider:'mercado_livre',provider_listing_id:itemId,status:'active',snapshot:{}}];
 db.tables.marketplace_connections[0].sync_lock_until=new Date(Date.now()+60_000).toISOString();
 globalThis.fetch=()=>{throw new Error('não deve consultar durante trava/orçamento esgotado');};
 assert.equal((await refreshKnownListingStatuses(db,connection)).busy,true);
 db.tables.marketplace_connections[0].sync_lock_until=null;
 assert.equal((await refreshKnownListingStatuses(db,connection,Date.now())).count,0);
 assert.equal(db.tables.marketplace_connections[0].sync_lock_owner,null);
 globalThis.fetch=async()=>Response.json({id:itemId,seller_id:999,status:'paused'});
 assert.equal((await refreshKnownListingStatuses(db,connection)).partial,true);
 assert.equal(db.tables.marketplace_listings[0].status,'active');
 assert.equal(db.tables.marketplace_connections[0].sync_lock_owner,null);
}));
test('perda de resposta do scan reinicia em vez de reutilizar cursor já consumido', () => environment(async () => {
  const db=database(); const connection=db.tables.marketplace_connections[0];
  Object.assign(connection,{sync_cursor:'old-cursor',sync_cursor_at:new Date().toISOString(),sync_scan_in_flight:true,sync_pending_ids:[itemId]});
  globalThis.fetch=async (url) => {assert.equal(new URL(url).searchParams.has('scroll_id'),false);return Response.json({results:[itemId],scroll_id:'fresh-cursor'});};
  await synchronizeListings(db,await loadConnection(db,company,connectionId));
  assert.equal(connection.sync_cursor,'fresh-cursor');assert.equal(connection.sync_scan_in_flight,false);
}));
