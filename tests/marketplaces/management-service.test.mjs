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
const { loadConnection, mlRequest, manageListing, synchronizeListings } = await import('../../app/modules/marketplaces/services/mercadolivre-management.ts');
const { sealMarketplaceSecret, openMarketplaceSecret } = await import('../../app/modules/marketplaces/services/secret-vault.ts');
hooks.deregister();
const company = '11111111-1111-4111-8111-111111111111', connectionId = '22222222-2222-4222-8222-222222222222';
const itemId = 'MLB5324529993';

class Query {
  constructor(db, table) { this.db=db; this.table=table; this.filters=[]; this.mode='select'; }
  select() { return this; }
  eq(key,value) { this.filters.push((row) => row[key]===value); return this; }
  is(key,value) { this.filters.push((row) => (row[key] ?? null)===value); return this; }
  or(expression) { const key=expression.startsWith('sync_') ? 'sync_lock_until' : 'refresh_lock_until';this.filters.push((row) => !row[key] || new Date(row[key]).getTime()<Date.now()); return this; }
  update(values) { this.mode='update'; this.values=values; return this; }
  insert(values) { this.mode='insert'; this.values=values; return this; }
  upsert(values) { this.mode='upsert'; this.values=values; return this; }
  maybeSingle() { this.single=true; return this; }
  single() { this.single=true; return this; }
  then(success,failure) { return Promise.resolve().then(() => this.execute()).then(success,failure); }
  execute() {
    const rows=this.db.tables[this.table] ||= [];
    let matched=rows.filter((row) => this.filters.every((predicate) => predicate(row)));
    if (this.mode==='insert') {
      if(rows.some((row) => row.request_key===this.values.request_key && row.empresa_id===this.values.empresa_id)) return {error:{code:'23505'},data:null};
      const row={id:crypto.randomUUID(),...this.values}; rows.push(row); matched=[row];
    } else if(this.mode==='update') for(const row of matched) Object.assign(row, this.values);
    else if(this.mode==='upsert') { const previous=rows.find((row) => row.connection_id===this.values.connection_id && row.provider_listing_id===this.values.provider_listing_id); if(previous) Object.assign(previous,this.values); else rows.push(this.values); }
    return {error:null,data: structuredClone(this.single ? matched[0] || null : matched)};
  }
}
function database(expired=false) {
  return { tables: { marketplace_connections: [{ id:connectionId,empresa_id:company,provider:'mercado_livre',seller_reference:'123',status:'connected',
    expires_at:new Date(Date.now()+(expired ? -1000 : 3600000)).toISOString(),token_sealed:sealMarketplaceSecret(JSON.stringify({accessToken:'test-access',refreshToken:'test-refresh'})) }] },
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
test('negação de recurso não é apresentada como perda da conexão', () => environment(async () => {
  const db=database(), connection=await loadConnection(db,company,connectionId);
  globalThis.fetch=async () => Response.json({code:'PA_UNAUTHORIZED_RESULT_FROM_POLICIES'},{status:403});
  await assert.rejects(mlRequest(db,connection,'/categories/MLB1/shipping_preferences'), (error) => error.code==='provider_403' && /conexão segue ativa/i.test(error.message));
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
  status='active'; await assert.rejects(manageListing(db,connection,'actor',input)); assert.equal(puts,1);
}));
test('resposta perdida ao alterar gera resultado incerto, não repete a mutação', () => environment(async () => {
  const db=database(), connection=await loadConnection(db,company,connectionId); let puts=0;
  globalThis.fetch=async (_url,options) => { if(options.method==='PUT') {puts++;throw new Error('network');}return Response.json({id:itemId,seller_id:123,status:'active'}); };
  await assert.rejects(manageListing(db,connection,'actor',{id:itemId,action:'pause',requestKey:crypto.randomUUID(),confirmation:itemId}),/pode ter sido aplicada/);
  assert.equal(puts,1); assert.equal(db.tables.marketplace_listing_actions[0].status,'uncertain');
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
test('perda de resposta do scan reinicia em vez de reutilizar cursor já consumido', () => environment(async () => {
  const db=database(); const connection=db.tables.marketplace_connections[0];
  Object.assign(connection,{sync_cursor:'old-cursor',sync_cursor_at:new Date().toISOString(),sync_scan_in_flight:true,sync_pending_ids:[itemId]});
  globalThis.fetch=async (url) => {assert.equal(new URL(url).searchParams.has('scroll_id'),false);return Response.json({results:[itemId],scroll_id:'fresh-cursor'});};
  await synchronizeListings(db,await loadConnection(db,company,connectionId));
  assert.equal(connection.sync_cursor,'fresh-cursor');assert.equal(connection.sync_scan_in_flight,false);
}));
