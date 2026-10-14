import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier === './management-access' || specifier.endsWith('/management-access.ts')) return { url: 'data:text/javascript,export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code}}', shortCircuit: true };
  if (specifier === './mercadolivre-sales') return { url: 'data:text/javascript,export function publicSale(row){return {id:row.id,status:row.status,provider:row.provider,...row.snapshot}}', shortCircuit: true };
  let path;
  if (specifier.startsWith('@/')) path = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) path = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (path && existsSync(`${path}.ts`)) return next(pathToFileURL(`${path}.ts`).href, context);
  return next(specifier, context);
} });
const model = await import('../../app/modules/marketplaces/magalu-sales-model.ts');
const { readMagaluPostSale } = await import('../../app/modules/marketplaces/services/magalu-post-sale.ts');
const { magaluPostSaleForSale, syncMagaluSales } = await import('../../app/modules/marketplaces/services/magalu-sales.ts');
const { magaluRequest, magaluCatalogRequest, loadMagaluCatalogConnection, loadMagaluConnection } = await import('../../app/modules/marketplaces/services/magalu-request.ts');
const { MAGALU_CATALOG_SCOPES, MAGALU_CONNECTION_SCOPES } = await import('../../app/modules/marketplaces/services/magalu-oauth.ts');
const { sealMarketplaceSecret } = await import('../../app/modules/marketplaces/services/secret-vault.ts');
const { MarketplaceError } = await import('../../app/modules/marketplaces/services/management-access.ts');
hooks.deregister();
const company = '11111111-1111-4111-8111-111111111111', connectionId = '22222222-2222-4222-8222-222222222222', saleId = '33333333-3333-4333-8333-333333333333';
const seller = 'GENPUB.44444444-4444-4444-8444-444444444444', orderId = '55555555-5555-4555-8555-555555555555', deliveryId = '66666666-6666-4666-8666-666666666666', channelId = '77777777-7777-4777-8777-777777777777', ticketId = '88888888-8888-4888-8888-888888888888', eventId = '99999999-9999-4999-8999-999999999999';
const originalFetch = globalThis.fetch, originalKey = process.env.MARKETPLACE_SECRETS_KEY;
const configKeys=['MAGALU_CLIENT_ID','MAGALU_CLIENT_SECRET','MAGALU_OAUTH_REDIRECT_URI','MAGALU_LOCAL_CREDENTIALS_FILE'];
const originalConfig=Object.fromEntries(configKeys.map(key=>[key,process.env[key]]));
test.before(() => { process.env.MARKETPLACE_SECRETS_KEY = randomBytes(32).toString('base64url'); process.env.MAGALU_CLIENT_ID='fixture-client';process.env.MAGALU_CLIENT_SECRET='fixture-secret';process.env.MAGALU_OAUTH_REDIRECT_URI='https://avantalab.com.br/api/modulos/marketplaces/conexoes/magalu/callback';delete process.env.MAGALU_LOCAL_CREDENTIALS_FILE; });
test.afterEach(() => { globalThis.fetch = originalFetch; });
test.after(() => { if (originalKey === undefined) delete process.env.MARKETPLACE_SECRETS_KEY; else process.env.MARKETPLACE_SECRETS_KEY = originalKey;for(const key of configKeys){if(originalConfig[key]===undefined)delete process.env[key];else process.env[key]=originalConfig[key];} });
function order(overrides = {}) { return { id: orderId, code: '12345678901234567890123456789012345678901234', status: 'approved', purchased_at: '2026-10-10T12:00:00Z', approved_at: '2026-10-10T12:01:00Z', updated_at: '2026-10-13T12:00:00Z', channel: { id: channelId }, customer: { name: 'Cliente de teste', document: 'never-export' }, amounts: { currency: 'BRL', normalizer: 100, total: 142500 }, deliveries: [{ id: deliveryId, code: 'PACOTE-1', status: 'approved', seller: { id: seller }, items: [{ info: { name: 'Purificador', sku: 'SKU1' }, quantity: 1, unit_price: { currency: 'BRL', normalizer: 100, value: 142500 } }] }], ...overrides }; }
function ticket(overrides = {}) { return { id: ticketId, channel: { id: channelId }, status: 'waiting_seller', closed: false, type: 'cancellation', reason: 'defective_product', due_date: '2026-10-14T12:00:00Z', order: [{ id: orderId, code: order().code, delivery: { id: deliveryId, seller: { id: seller.replace('GENPUB.', '') } } }], ...overrides }; }
const page = (rows, offset = 0, next = null) => ({ results: rows, meta: { page: { offset, count: rows.length, limit: 20 }, links: { next } } });
function postSaleReader(tickets = [], overrides = {}) { return async path => {
  const url = new URL(path, 'https://api.magalu.com');
  if (Object.hasOwn(overrides, url.pathname)) { const data = overrides[url.pathname]; if (data instanceof Error) throw data; return page(data); }
  if (url.pathname === '/seller/v0/tickets') { assert.equal(url.searchParams.get('order__code'), order().code); assert.equal(url.searchParams.get('channel__id'), channelId); return page(tickets); }
  if (url.pathname === '/seller/v1/financial-analysis/orders') assert.equal(url.searchParams.get('order_id'), orderId);
  return page([]);
}; }
class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; }
  select() { return this; } eq(k,v) { this.filters.push(row => row[k] === v); return this; }
  or() { return this; } filter(k,op,v) { assert.equal(op,'eq'); this.filters.push(row => JSON.stringify(row[k]) === v); return this; }
  maybeSingle() { this.single = true; return this; } update(value) { this.value = value; return this; }
  upsert(value, options = {}) { this.insert = value; this.options = options; return this; }
  then(ok, bad) { return Promise.resolve().then(() => {
    if (this.db.fail === this.table) return { error: {}, data: null };
    const rows = this.db.tables[this.table] ||= [];
    if (this.insert) { const keys = this.options.onConflict.split(','); const previous = rows.find(row => keys.every(k => row[k] === this.insert[k]));
      if (!previous) rows.push({ id: saleId, scan_offset: 0, ...structuredClone(this.insert) }); else if (!this.options.ignoreDuplicates) Object.assign(previous, structuredClone(this.insert)); }
    if(this.value && this.db.beforeUpdate)this.db.beforeUpdate(this.table,this.value);
    const found = rows.filter(row => this.filters.every(filter => filter(row)));
    if (this.value) for (const row of found) Object.assign(row, structuredClone(this.value));
    return { error: null, data: structuredClone(this.single ? found[0] || null : found) };
  }).then(ok, bad); }
}
function fixture() {
  const connection = { id: connectionId, empresa_id: company, provider: 'magalu', seller_reference: seller, status: 'attention', last_error_code: 'magalu_connector_pending', scopes: [...MAGALU_CONNECTION_SCOPES], connected_at: '2026-10-01T00:00:00Z', expires_at: new Date(Date.now() + 3600000).toISOString(), token_sealed: sealMarketplaceSecret(JSON.stringify({ accessToken: 'fixture-only-access', refreshToken: 'fixture-only-refresh' })) };
  const db = { tables: { marketplace_connections: [connection], marketplace_sales: [{ id: saleId, empresa_id: company, connection_id: connectionId, provider: 'magalu', provider_order_id: order().code, updated_at: '2026-10-12T00:00:00Z', snapshot: model.normalizeMagaluOrder(order(), seller) }] }, from(table) { return new Query(this, table); } };
  return { db, connection };
}

test('normalização preserva código longo, moeda, comprador e não exporta CPF nem baixa estoque', () => {
  const sale = model.normalizeMagaluOrder(order(), seller); assert.equal(sale.total,1425); assert.equal(sale.status,'paid'); assert.equal(sale.shipmentStatus,'handling'); assert.equal(sale.orderId.length,44);
  assert.deepEqual(sale.inventoryLines,[]); assert.ok(!JSON.stringify(sale).includes('never-export'));
  assert.equal(model.magaluMoney({currency:'USD',normalizer:100,total:100}),null); assert.equal(model.magaluMoney({currency:'BRL',normalizer:0,total:100}),null);
});
test('vendedor, código, UUID, datas e quantidades divergentes falham fechados', () => {
  for (const change of [{code:'../secret'}, {id:'bad'}, {updated_at:'bad'}, {deliveries:[]}, {deliveries:[{...order().deliveries[0],seller:{id:'other'}}]}, {deliveries:[{...order().deliveries[0],items:[{quantity:0}]}]}]) assert.throws(() => model.normalizeMagaluOrder(order(change),seller));
});
test('várias entregas não são dadas como entregues enquanto um pacote aguarda envio', () => {
  const source = order(); source.deliveries[0].status='delivered'; source.deliveries.push({...structuredClone(source.deliveries[0]),id:eventId,status:'approved'});
  assert.equal(model.normalizeMagaluOrder(source,seller).shipmentStatus,'handling'); source.deliveries[1].status='cancelled';
  assert.equal(model.normalizeMagaluOrder(source,seller).shipmentStatus,'delivered'); assert.equal(model.normalizeMagaluOrder(source,seller).warnings.length,1);
  source.deliveries[1].status='future_status'; assert.equal(model.normalizeMagaluOrder(source,seller).shipmentStatus,null);
});
test('pagina somente no domínio/rota reconhecidos e não confunde count com total', () => {
  assert.equal(model.magaluPage(page([order()],0,'/seller/v1/orders?_offset=1'),'/seller/v1/orders',0).next,1);
  for (const next of ['https://evil.example/seller/v1/orders?_offset=1','/seller/v0/tickets?_offset=1','?_offset=0','?_offset=2']) assert.throws(() => model.magaluPage(page([order()],0,next),'/seller/v1/orders',0));
  assert.throws(() => model.magaluPage({results:[],meta:{page:{offset:0,count:100},links:{next:null}}},'/seller/v1/orders',0));
});
test('protocolos trazem motivo, prazo, mensagens e histórico traduzidos; respostas ficam no Magalu', async () => {
  const details = await readMagaluPostSale(order(),seller,postSaleReader([ticket()],{
    [`/seller/v0/tickets/${ticketId}/messages`]: [{id:eventId,ticket_id:ticketId,message:'Produto <b>com defeito</b>',created_at:'2026-10-12T12:00:00Z'}],
    [`/seller/v0/tickets/${ticketId}/events`]: [{id:eventId,ticket_id:ticketId,type:'authorize_refund'}],
  }));
  assert.equal(details.processState,'open'); assert.equal(details.claims[0].reasonText,'Produto com defeito'); assert.equal(details.claims[0].actions[0].required,true);
  assert.equal(details.claims[0].messages[0].text,'Produto com defeito'); assert.equal(details.claims[0].events[0].text,'Reembolso autorizado'); assert.equal(details.refundedAmount,null);
});
test('negativa de permissão nunca é ausência de reclamação nem reembolso confirmado', async () => {
  const denied = new MarketplaceError(403,'denied','secret provider body');
  const details = await readMagaluPostSale(order({status:'cancelled'}),seller,postSaleReader([],{'/seller/v0/tickets':denied}));
  assert.equal(details.claimsComplete,false); assert.equal(details.returnsComplete,false); assert.equal(details.processState,'unknown'); assert.equal(details.refundedAmount,null);
  assert.equal(details.accessIssues[0].permissionDenied,true); assert.ok(!JSON.stringify(details).includes('secret provider body'));
});
test('protocolo de outra conta/canal/pedido não vaza mensagens e não vira ausência confirmada', async () => {
  for (const other of [ticket({channel:{id:eventId}}),ticket({order:[{id:eventId,code:order().code,delivery:{id:deliveryId,seller:{id:seller}}}]}),ticket({order:[{id:orderId,code:'other',delivery:{id:deliveryId,seller:{id:seller}}}]})]) {
    const result=await readMagaluPostSale(order(),seller,postSaleReader([other])); assert.equal(result.claims.length,0); assert.equal(result.claimsComplete,false);
  }
});
test('remessa de devolução ou protocolo fechado não comprovam recebimento físico', async () => {
  const result=await readMagaluPostSale(order(),seller,postSaleReader([ticket({closed:true,status:'closed'})],{[`/seller/v0/tickets/${ticketId}/returns`]:[{id:eventId}]}));
  assert.equal(result.claims[0].processState,'closed'); assert.equal(result.processState,'unknown'); assert.equal(result.returnsComplete,false); assert.equal(result.claims[0].returnDetails,null);
});
test('aviso de envio não cobra resposta e status closed contraditório pede confirmação', async () => {
  let result=await readMagaluPostSale(order(),seller,postSaleReader([ticket({type:'shipping_notification'})])); assert.deepEqual(result.claims[0].actions,[]);
  result=await readMagaluPostSale(order(),seller,postSaleReader([ticket({closed:false,status:'closed'})])); assert.equal(result.claims[0].statusText,'Encerramento a confirmar'); assert.notEqual(result.processState,'closed');
});
test('financeiro confere ordem/conta e não calcula recebimento ou reembolso por soma de lançamentos', async () => {
  const path='/seller/v1/financial-analysis/orders'; const report={external_id:orderId,seller:{id:seller},transactions:[{category:'COMMISSION',value:1000,normalizer:100,currency:'BRL',status:'concluded'}]};
  let result=await readMagaluPostSale(order(),seller,postSaleReader([],{[path]:[report]})); assert.equal(result.financialEntries[0].value,10); assert.equal(result.refundedAmount,null);
  result=await readMagaluPostSale(order(),seller,postSaleReader([],{[path]:[{...report,external_id:eventId}]})); assert.equal(result.financialEntries.length,0); assert.ok(result.warnings.length);
});
test('consulta é somente GET, passa tenant e nunca segue redirecionamento ou URL externa', async () => {
  const {db,connection}=fixture();let calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.equal(url.origin,'https://api.magalu.com');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.headers['X-Tenant-Id'],seller);return Response.json(order());};
  await magaluRequest(db,connection,`/seller/v1/orders/${order().code}`);
  for (const path of ['https://evil.example/orders','//api.magalu.com/seller/v1/orders','/seller/v1/orders#secret','/seller/v1/logistics/shipping-labels']) await assert.rejects(magaluRequest(db,connection,path));
  assert.equal(calls,1);
});
test('conta de outra empresa e conjunto incompleto são recusados antes da API; 403 não desconecta', async () => {
  const {db,connection}=fixture();await assert.rejects(loadMagaluConnection(db,'other',connectionId),/não encontrada/);
  connection.scopes=[];await assert.rejects(loadMagaluConnection(db,company,connectionId),/Autorize/);connection.scopes=[...MAGALU_CONNECTION_SCOPES];
  globalThis.fetch=async()=>new Response('private failure',{status:403}); await assert.rejects(magaluRequest(db,connection,'/seller/v1/orders'),e=>e.status===403&&!e.message.includes('private'));
  assert.equal(connection.status,'attention');assert.ok(connection.token_sealed);
});
test('catálogo exige autorização própria sem bloquear consultas de vendas existentes', async () => {
  const {db,connection}=fixture();
  await loadMagaluConnection(db,company,connectionId);
  await assert.rejects(loadMagaluCatalogConnection(db,company,connectionId),error=>error.code==='magalu_catalog_reauthorize');
  connection.scopes=[...MAGALU_CONNECTION_SCOPES,...MAGALU_CATALOG_SCOPES];
  assert.equal((await loadMagaluCatalogConnection(db,company,connectionId)).id,connectionId);
});
test('pós-venda exige venda/empresa/conta e não consulta pedido inexistente', async () => {
  const {db}=fixture();let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('unexpected network')};
  await assert.rejects(magaluPostSaleForSale(db,'other',connectionId,saleId));await assert.rejects(magaluPostSaleForSale(db,company,connectionId,eventId),/não encontrada/);
  await assert.rejects(magaluPostSaleForSale(db,company,connectionId,'../1'),/inválido/);assert.equal(calls,0);
});
test('pós-venda evita sobrescrever dados novos com leitura anterior ou atualização concorrente', async () => {
  const {db}=fixture();globalThis.fetch=async()=>Response.json(order({updated_at:'2026-10-01T12:00:00Z'}));await assert.rejects(magaluPostSaleForSale(db,company,connectionId,saleId),/posição anterior/);
  globalThis.fetch=async(url)=>{if(url.pathname.startsWith('/seller/v1/orders/')){db.tables.marketplace_sales[0].updated_at='2026-10-14T00:00:00Z';return Response.json(order());}return Response.json(page([]));};
  await assert.rejects(magaluPostSaleForSale(db,company,connectionId,saleId),/Outra atualização/);
});
test('cursor avança só depois da página completa, preserva histórico e retoma sem filtro de status', async () => {
  const {db,connection}=fixture();const calls=[];globalThis.fetch=async(url)=>{calls.push(url);return Response.json(page([order()],0,'/seller/v1/orders?_offset=1'));};
  assert.equal((await syncMagaluSales(db,connection)).pending,1);assert.equal(db.tables.marketplace_magalu_sales_sync[0].scan_offset,1);assert.equal(calls[0].searchParams.get('status'),null);
  assert.equal(calls[0].searchParams.get('updated_at__lte'),null);
  const window=db.tables.marketplace_magalu_sales_sync[0].window_end;globalThis.fetch=async(url)=>{assert.equal(url.searchParams.get('purchased_at__lte'),window);return Response.json(page([],1));};
  assert.equal((await syncMagaluSales(db,connection)).pending,0);assert.equal(db.tables.marketplace_magalu_sales_sync[0].checkpoint,window);
});
test('página inválida e falha de escrita não pulam pedidos, falta de migração não chama API', async () => {
  const {db,connection}=fixture();globalThis.fetch=async()=>Response.json(page([order({id:'invalid'})]));await assert.rejects(syncMagaluSales(db,connection));assert.equal(db.tables.marketplace_magalu_sales_sync[0].scan_offset,0);
  globalThis.fetch=async()=>Response.json(page([order()]));db.fail='marketplace_sales';await assert.rejects(syncMagaluSales(db,connection));assert.equal(db.tables.marketplace_magalu_sales_sync[0].scan_offset,0);
  db.fail='marketplace_magalu_sales_sync';globalThis.fetch=async()=>{throw new Error('unexpected API')};await assert.rejects(syncMagaluSales(db,connection),/migração/);
});

test('consulta sem alteração não marca atualização fictícia nem muda o retrato em foco', async () => {
  const {db,connection}=fixture();const before=structuredClone(db.tables.marketplace_sales[0]);globalThis.fetch=async()=>Response.json(page([order()]));
  await syncMagaluSales(db,connection);assert.deepEqual(db.tables.marketplace_sales[0],before);
});
function refreshed(sellerReference=seller){const token=`eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify({sub:sellerReference,exp:Math.floor(Date.now()/1000)+7200,aud:['https://api.magalu.com']})).toString('base64url')}.fixture-signature`;
  return {access_token:token,refresh_token:'fixture-new-refresh',token_type:'Bearer',expires_in:7200,scope:MAGALU_CONNECTION_SCOPES.join(' ')};}
test('token expirado renova com tenant conferido antes de consultar pedido', async () => {
  const {db,connection}=fixture();connection.expires_at='2000-01-01T00:00:00Z';let exchanges=0;
  globalThis.fetch=async(url,options)=>{
    if(String(url)==='https://id.magalu.com/oauth/token'){exchanges++;assert.equal(options.body.get('grant_type'),'refresh_token');return Response.json(refreshed());}
    if(String(url)==='https://api.magalu.com/seller/v1/portfolios/me')return Response.json({tenant:{id:seller},seller:{id:'test'}});
    assert.match(options.headers.Authorization,/Bearer eyJ/);return Response.json(order());
  };
  await magaluRequest(db,connection,`/seller/v1/orders/${order().code}`);assert.equal(exchanges,1);assert.equal(connection.refresh_lock_owner,null);assert.ok(Date.parse(connection.expires_at)>Date.now());
});
test('refresh revogado exige nova autorização e não reutiliza token antigo', async () => {
  const {db,connection}=fixture();connection.expires_at='2000-01-01T00:00:00Z';globalThis.fetch=async()=>Response.json({error:'invalid_grant'},{status:400});
  await assert.rejects(magaluRequest(db,connection,'/seller/v1/orders'));assert.equal(connection.status,'expired');assert.equal(connection.token_sealed,null);
});
test('refresh de outra loja não substitui a identidade nem grava suas credenciais', async () => {
  const {db,connection}=fixture();connection.expires_at='2000-01-01T00:00:00Z';const wrong=`GENPUB.${eventId}`;
  globalThis.fetch=async(url)=>String(url)==='https://id.magalu.com/oauth/token'?Response.json(refreshed(wrong)):Response.json({tenant:{id:wrong},seller:{id:'wrong'}});
  await assert.rejects(magaluRequest(db,connection,'/seller/v1/orders'),/identidade da loja mudou/);assert.equal(connection.seller_reference,seller);assert.equal(connection.token_sealed,null);
});
test('nova autorização concorrente não é sobrescrita ou expirada por refresh anterior', async () => {
  const {db,connection}=fixture();connection.expires_at='2000-01-01T00:00:00Z';const next=sealMarketplaceSecret(JSON.stringify({accessToken:'new-authorization',refreshToken:'new-authorization-refresh'}));
  db.beforeUpdate=(table,value)=>{if(table==='marketplace_connections'&&value.token_sealed){connection.token_sealed=next;connection.refresh_lock_owner=null;connection.status='connected';}};
  globalThis.fetch=async(url)=>String(url)==='https://id.magalu.com/oauth/token'?Response.json(refreshed()):Response.json({tenant:{id:seller},seller:{id:'test'}});
  await assert.rejects(magaluRequest(db,connection,'/seller/v1/orders'),/autorização mudou/);assert.deepEqual(connection.token_sealed,next);assert.equal(connection.status,'connected');
});
test('atenção autoriza somente conector pendente; outras plataformas/sessões não entram nos filtros', () => {
  assert.equal(model.salesAccountAvailable({provider:'magalu',status:'attention',last_error_code:'magalu_connector_pending'}),true);
  assert.equal(model.salesAccountAvailable({provider:'magalu',status:'expired'}),false);assert.equal(model.salesAccountAvailable({provider:'magalu',status:'attention',last_error_code:'revoked'}),false);
  assert.equal(model.salesAccountAvailable({provider:'shopee',status:'connected'}),false);assert.equal(model.salesAccountAvailable({provider:'mercado_livre',status:'connected'}),true);
});

test('catálogo Magalu restringe escrita a rotas fixas e aceita lista de categorias oficial', async () => {
  const { db, connection } = fixture();
  connection.scopes = [...MAGALU_CONNECTION_SCOPES, ...MAGALU_CATALOG_SCOPES];
  const seen = [];
  globalThis.fetch = async (url, options) => {
    seen.push({ url: String(url), method: options.method, tenant: options.headers['X-Tenant-Id'] });
    return options.method === 'GET' ? Response.json([{ id: eventId, name: 'Categoria', path: 'Raiz/Categoria' }]) : Response.json({ trace_id: eventId }, { status: 202 });
  };
  const found = await magaluCatalogRequest(db, connection, 'GET', '/seller/v1/portfolios/category?name=Categoria');
  assert.equal(Array.isArray(found.data), true);
  const posted = await magaluCatalogRequest(db, connection, 'POST', '/seller/v1/portfolios/skus', { sku: 'SKU-1' });
  assert.equal(posted.status, 202);
  assert.equal(seen.length, 2);
  assert.ok(seen.every(entry => entry.tenant === seller));
  await assert.rejects(magaluCatalogRequest(db, connection, 'POST', '/seller/v1/orders', {}));
  await assert.rejects(magaluCatalogRequest(db, connection, 'POST', '/seller/v1/portfolios/skus?foo=1', {}));
  assert.equal(seen.length, 2);
});
