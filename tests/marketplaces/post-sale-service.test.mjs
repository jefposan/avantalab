import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error { constructor(status,code,message){super(message);this.status=status;this.code=code;} }', shortCircuit: true };
  if (specifier === './mercadolivre-management') return { url: 'data:text/javascript,export async function loadConnection(db,company,id){if(company!==db.company||id!==db.connection.id)throw new Error("Conta não encontrada");return db.connection;} export async function mlRequest(db,connection,path){return db.read(path);} export async function mlBinaryRequest(db,connection,path){db.binaryReads.push(path);return new Uint8Array([37,80,68,70,45]);}', shortCircuit: true };
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { postSaleForSale, labelForSale } = await import('../../app/modules/marketplaces/services/mercadolivre-sales.ts');
hooks.deregister();
const company = '11111111-1111-4111-8111-111111111111';
const connectionId = '22222222-2222-4222-8222-222222222222';
const saleId = '33333333-3333-4333-8333-333333333333';
const providerId = '2000018759586622';

class Query {
  constructor(db) { this.db = db; this.filters = []; }
  select() { return this; }
  eq(key, value) { this.filters.push((row) => row[key] === value); return this; }
  maybeSingle() { this.single = true; return this; }
  update(value) { this.value = value; return this; }
  then(success, failure) { return Promise.resolve().then(() => {
    const found = this.db.rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.value) { if (this.db.saveFails) return { data: null, error: {} }; for (const row of found) Object.assign(row, this.value); }
    return { data: this.single ? structuredClone(found[0] || null) : structuredClone(found), error: null };
  }).then(success, failure); }
}
function database(overrides = {}) {
  const db = { company, connection: { id: connectionId, empresa_id: company, seller_reference: '123' }, reads: [], rows: [{ id: saleId, empresa_id: company, connection_id: connectionId, provider_order_id: providerId, status: 'paid', shipment_id: '555', shipment_status: 'delivered', shipment_substatus: null, label_status: 'unavailable', created_at: '2026-10-10T00:00:00Z', updated_at: '2026-10-10T00:00:00Z', snapshot: {} }],
    read: async (path) => {
      db.reads.push(path);
      if (path === `/orders/${providerId}`) return { id: providerId, seller: { id: 123 }, status: 'cancelled', date_created: '2026-09-01T12:00:00Z', shipping: { id: 555 }, buyer: { nickname: 'TEST' }, ...overrides };
      if (path === '/shipments/555') return { id: 555, status: 'delivered', mode: 'me2' };
      if (path.includes('/claims/search')) return { data: [], paging: { total: 0 } };
      throw new Error('unexpected path');
    }, from(table) { assert.equal(table, 'marketplace_sales'); return new Query(this); },
  };
  return db;
}

test('detalhes revalidam pedido/conta e salvam somente o retrato atual da venda', async () => {
  const db = database();
  const result = await postSaleForSale(db, company, connectionId, saleId);
  assert.equal(result.sale.status, 'cancelled');
  assert.equal(result.sale.shipmentStatus, 'delivered');
  assert.equal(result.sale.soldAt, '2026-09-01T12:00:00Z');
  assert.equal(result.postSale.claimsComplete, true);
  assert.equal(db.rows[0].snapshot.status, 'cancelled');
  assert.equal(db.rows[0].snapshot.postSaleProgress.state, 'closed');
  assert.ok(db.rows[0].operation_checked_at);
  assert.ok(db.reads.every((path) => !/\/refund|\/actions/.test(path)));
});

test('empresa, conta ou venda de terceiros são negadas antes de consultar ML', async () => {
  const db = database();
  await assert.rejects(postSaleForSale(db, 'other', connectionId, saleId));
  await assert.rejects(postSaleForSale(db, company, 'other', saleId));
  db.rows[0].empresa_id = 'other';
  await assert.rejects(postSaleForSale(db, company, connectionId, saleId), /não encontrada/);
  assert.equal(db.reads.length, 0);
});

test('venda inexistente ou identificador inválido não consulta o provedor', async () => {
  const db = database();
  await assert.rejects(postSaleForSale(db, company, connectionId, '../../orders/1'), /inválido/);
  await assert.rejects(postSaleForSale(db, company, connectionId, '44444444-4444-4444-8444-444444444444'), /não encontrada/);
  assert.equal(db.reads.length, 0);
});

test('pedido retornado com vendedor ou ID divergente não é salvo nem enriquecido', async () => {
  for (const overrides of [{ seller: { id: 999 } }, { id: '666' }]) {
    const db = database(overrides);
    await assert.rejects(postSaleForSale(db, company, connectionId, saleId), /não confirmou/);
    assert.equal(db.rows[0].status, 'paid');
    assert.equal(db.reads.length, 1);
  }
});

test('falha do envio conserva a situação anterior e avisa que não é atualização completa', async () => {
  const db = database(); const read = db.read;
  db.read = async (path) => { if (path.startsWith('/shipments/')) throw new Error('network'); return read(path); };
  const result = await postSaleForSale(db, company, connectionId, saleId);
  assert.equal(result.sale.shipmentStatus, 'delivered');
  assert.match(result.postSale.warnings.join(), /último registro salvo/);
});

test('falha de persistência não é anunciada como atualização concluída', async () => {
  const db = database(); db.saveFails = true;
  await assert.rejects(postSaleForSale(db, company, connectionId, saleId), /não foram salvos/);
});

test('mudança de envio com consulta falha não herda a entrega nem a etiqueta do anterior', async () => {
  const db = database({ shipping: { id: 666 } });
  db.rows[0].label_status = 'ready';
  const result = await postSaleForSale(db, company, connectionId, saleId);
  assert.equal(result.sale.shipmentId, '666');
  assert.equal(result.sale.shipmentStatus, null);
  assert.equal(result.sale.labelStatus, 'unavailable');
  assert.match(result.postSale.warnings.join(), /envio do pedido mudou/);
});

test('notificação concorrente não é sobrescrita pelos detalhes que partiram de retrato antigo', async () => {
  const db = database(); const read = db.read;
  db.read = async (path) => {
    if (path.startsWith('/orders/')) { db.rows[0].updated_at = '2026-10-11T15:00:00Z'; db.rows[0].status = 'partially_refunded'; }
    return read(path);
  };
  await assert.rejects(postSaleForSale(db, company, connectionId, saleId), /Outra atualização/);
  assert.equal(db.rows[0].status, 'partially_refunded');
});

test('rota e cliente preservam autenticação, conta da venda e cancelamento de consultas', () => {
  const route = readFileSync(resolve(root, 'app/api/modulos/marketplaces/vendas/pos-venda/route.ts'), 'utf8');
  const client = readFileSync(resolve(root, 'app/marketplaces/SalePostSale.tsx'), 'utf8');
  assert.match(route, /authorizeMarketplace\(request, params.get\('empresaId'\)\)/);
  assert.match(route, /'Cache-Control': 'no-store'/);
  assert.match(client, /new URLSearchParams\(\{ empresaId: companyId, connectionId, saleId \}\)/);
  assert.match(client, /controller\.abort\(\)/);
  assert.match(client, /if \(controller.signal.aborted\) return/);
  assert.match(client, /Atualizar pós-venda/);
});

test('novo formato logístico reconhece etiqueta e prazo; cache indisponível não bloqueia PDF atual', async () => {
  const db=database({status:'paid'});db.rows[0].provider='mercado_livre';db.binaryReads=[];const oldRead=db.read;
  db.read=async(path)=>path==='/shipments/555'?{id:555,status:'ready_to_ship',substatus:'ready_to_print',logistic:{mode:'me2',type:'xd_drop_off'},lead_time:{estimated_handling_limit:{date:'2026-10-14T15:00:00Z'}}}:oldRead(path);
  const refreshed=await postSaleForSale(db,company,connectionId,saleId);assert.equal(refreshed.sale.labelStatus,'ready');assert.equal(refreshed.sale.dispatchDeadline,'2026-10-14T15:00:00Z');
  db.rows[0].label_status='unavailable';await labelForSale(db,company,connectionId,saleId);assert.deepEqual(db.binaryReads,['/shipment_labels?shipment_ids=555&response_type=pdf']);
});
test('impressão revalida conta/pedido e recusa canceladas, despachadas, Full e agendadas antes do PDF', async () => {
  for(const scenario of [{order:{status:'cancelled'},shipment:{status:'ready_to_ship',substatus:'ready_to_print',mode:'me2'}},
    {order:{status:'paid'},shipment:{status:'shipped',substatus:'printed',mode:'me2'}},
    {order:{status:'paid'},shipment:{status:'ready_to_ship',substatus:'ready_to_print',logistic:{mode:'me2',type:'fulfillment'}}},
    {order:{status:'paid'},shipment:{status:'pending',substatus:'buffered',mode:'me2'}}]) {
    const db=database(scenario.order);db.rows[0].provider='mercado_livre';db.binaryReads=[];db.rows[0].label_status='ready';const oldRead=db.read;
    db.read=async(path)=>path==='/shipments/555'?{id:555,...scenario.shipment}:oldRead(path);
    await assert.rejects(labelForSale(db,company,connectionId,saleId));assert.deepEqual(db.binaryReads,[]);
  }
  const db=database({status:'paid',seller:{id:999}});db.rows[0].provider='mercado_livre';db.binaryReads=[];
  await assert.rejects(labelForSale(db,company,connectionId,saleId),/não confirmou/);assert.deepEqual(db.binaryReads,[]);
});
test('buffered conserva data de liberação e não indica etiqueta disponível', async () => {
  const db=database({status:'paid'});const oldRead=db.read;
  db.read=async(path)=>path==='/shipments/555'?{id:555,status:'pending',substatus:'buffered',logistic:{mode:'me2',type:'xd_drop_off'},buffering:{date:'2026-10-14T03:00:00Z'}}:oldRead(path);
  const result=await postSaleForSale(db,company,connectionId,saleId);assert.equal(result.sale.labelStatus,'unavailable');assert.equal(result.sale.labelReleaseAt,'2026-10-14T03:00:00Z');
});
