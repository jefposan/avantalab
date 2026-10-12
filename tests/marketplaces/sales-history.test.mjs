import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code}}', shortCircuit: true };
  if (specifier === './mercadolivre-management') return { url: 'data:text/javascript,export async function mlRequest(db,connection,path){db.calls.push(path);return db.read(connection,path)} export function loadConnection(){throw Error("Not used")} export function mlBinaryRequest(){throw Error("Not used")}', shortCircuit: true };
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const path = resolve(dirname(new URL(context.parentURL).pathname), specifier);
    if (existsSync(`${path}.ts`)) return next(pathToFileURL(`${path}.ts`).href, context);
  }
  return next(specifier, context);
} });
const { reconcileSalesHistory } = await import('../../app/modules/marketplaces/services/mercadolivre-sales-history.ts');
const { syncOrder, processSaleNotifications } = await import('../../app/modules/marketplaces/services/mercadolivre-sales.ts');
hooks.deregister();
const { saleGroup } = await import('../../app/modules/marketplaces/sales-status.ts');
const company = crypto.randomUUID(), connectionId = crypto.randomUUID();
const activation = new Date().toISOString();
const sale = () => ({ id: '2000000000000101', seller: { id: 123 }, last_updated: '2026-10-10T22:53:03Z' });
class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.orders=[]; }
  select() { return this; }
  eq(key, value) { this.filters.push(row => row[key] === value); return this; }
  is(key,value) { this.filters.push(row => row[key] === value); return this; }
  lte(key,value) { this.filters.push(row => row[key] <= value); return this; }
  order(key) { this.orders.push(key); return this; }
  limit(value) { this.max=value; return this; }
  update(value) { this.updateValue=value; return this; }
  maybeSingle() { this.single = true; return this; }
  upsert(value, options) { this.value = value; this.options = options; return this; }
  then(ok, bad) { return Promise.resolve().then(() => {
    if (this.db.fail === this.table) return { error: {} };
    const rows = this.db.tables[this.table] ||= [];
    if (this.value) {
      const old = rows.find(row => this.table === 'marketplace_sale_notifications' ? row.id === this.value.id :
        row.connection_id === this.value.connection_id && (this.table !== 'marketplace_sales' || row.provider_order_id === this.value.provider_order_id));
      if (old && !this.options?.ignoreDuplicates) Object.assign(old, this.value);
      if (!old) rows.push(structuredClone(this.value));
    }
    const found = rows.filter(row => this.filters.every(fn => fn(row))).sort((a,b)=>{
      for(const key of this.orders) {if(a[key]!==b[key])return a[key]<b[key]?-1:1;} return 0;
    }).slice(0,this.max||10000);
    if(this.updateValue)for(const row of found)Object.assign(row,this.updateValue);
    return { data: structuredClone(this.single ? found[0] || null : found), error: null };
  }).then(ok, bad); }
}
function fixture() {
  return { connection: { id: connectionId, empresa_id: company, seller_reference: '123' },
    calls: [], tables: { marketplace_inventory_reconciliation: [{ empresa_id: company, connection_id: connectionId,
      checkpoint: activation, window_end: activation, scan_offset: 7, history_scan_offset: 0 }], marketplace_sale_notifications: [] },
    from(table) { return new Query(this, table); }, read: async () => ({ results: [sale()], paging: { total: 1 } }) };
}
function orderFixture(db, shipment) {
  db.read = async (_account, path) => {
    if (path === '/orders/2000000000000101') return { ...sale(), date_created: '2026-10-10T22:53:00Z', date_closed: '2026-10-10T22:53:03Z',
      status: 'paid', shipping: { id: 555 }, total_amount: 1425, currency_id: 'BRL',
      order_items: [{ item: { id: 'MLB123456', title: 'Purificador Soft' }, quantity: 1, unit_price: 1425 }] };
    if (path === '/shipments/555') { if (shipment instanceof Error) throw shipment; return shipment; }
    throw Error('unexpected_path');
  };
}

test('pedido histórico é relido no ML e classifica o envio confirmado, sem deduzir situação do anúncio pausado', async () => {
  const db = fixture(); orderFixture(db, { id: 555, status: 'ready_to_ship', substatus: 'buffered', mode: 'me2' });
  await syncOrder(db, db.connection, '2000000000000101');
  const saved = db.tables.marketplace_sales[0];
  assert.equal(saved.provider_order_id, '2000000000000101'); assert.equal(saved.snapshot.soldAt, '2026-10-10T22:53:00Z');
  assert.equal(saleGroup({ status: saved.status, shipmentStatus: saved.shipment_status }), 'awaiting_dispatch');
  assert.equal(saved.label_status, 'unavailable'); assert.deepEqual(saved.snapshot.inventoryLines, [{ listingId: 'MLB123456', variationId: '', quantity: 1, title: 'Purificador Soft' }]);
  orderFixture(db, { id: 555, status: 'ready_to_ship', substatus: 'ready_to_print', mode: 'me2' });
  await syncOrder(db, db.connection, '2000000000000101'); assert.equal(db.tables.marketplace_sales.length, 1); assert.equal(saved.label_status, 'ready');
});
test('falha/ID incorreto no envio preserva estado confirmado, mas não libera etiqueta antiga ou de outro envio', async () => {
  for (const shipment of [new Error('unavailable'), { id: 999, status: 'delivered', mode: 'me2' }]) {
    const db = fixture(); orderFixture(db, { id: 555, status: 'ready_to_ship', substatus: 'ready_to_print', mode: 'me2' });
    await syncOrder(db, db.connection, '2000000000000101'); orderFixture(db, shipment);
    await syncOrder(db, db.connection, '2000000000000101');
    const saved = db.tables.marketplace_sales[0]; assert.equal(saved.shipment_status, 'ready_to_ship'); assert.equal(saved.label_status, 'unavailable');
    saved.shipment_id = '100'; await syncOrder(db, db.connection, '2000000000000101'); assert.equal(saved.shipment_status, null);
  }
});
test('venda nova é processada antes de histórico mais antigo, sem perder a fila histórica',async()=>{
  const db=fixture();orderFixture(db,{id:555,status:'pending',substatus:'buffered',mode:'me2'});
  const base={empresa_id:company,connection_id:connectionId,topic:'orders_v2',processed_at:null,attempts:0,next_attempt_at:'2000-01-01T00:00:00Z'};
  db.tables.marketplace_sale_notifications=[{...base,id:'history:old',resource:'/orders/1',priority:1,created_at:'2000-01-01T00:00:00Z'},
    {...base,id:'live:new',resource:'/orders/2000000000000101',priority:0,created_at:'2001-01-01T00:00:00Z'}];
  await processSaleNotifications(db,db.connection,1);
  assert.equal(db.tables.marketplace_sale_notifications[0].processed_at,null);
  assert.ok(db.tables.marketplace_sale_notifications[1].processed_at);
  assert.equal(db.tables.marketplace_sales[0].provider_order_id,'2000000000000101');
});

test('histórico encontra pedido anterior à ativação sem recuar cursor de vendas novas', async () => {
  const db = fixture(); await reconcileSalesHistory(db, db.connection, activation);
  const url = new URL(db.calls[0], 'https://api.mercadolibre.com');
  assert.equal(url.searchParams.get('seller'), '123'); assert.equal(url.searchParams.get('sort'), 'date_desc');
  assert.ok(Date.parse(url.searchParams.get('order.date_created.from')) < Date.parse(activation) - 6 * 86400000);
  assert.equal(url.searchParams.has('order.status'), false); assert.equal(url.searchParams.has('order.date_last_updated.from'), false);
  const cursor = db.tables.marketplace_inventory_reconciliation[0];
  assert.equal(cursor.checkpoint, activation); assert.equal(cursor.window_end, activation); assert.equal(cursor.scan_offset, 7);
  assert.equal(db.tables.marketplace_sale_notifications[0].resource, '/orders/2000000000000101');
});
test('pagina histórico, fixa janela e só a recua após terminar a página', async () => {
  const db = fixture(); db.read = async () => ({ results: [sale()], paging: { total: 2 } });
  await reconcileSalesHistory(db, db.connection, activation);
  const first = structuredClone(db.tables.marketplace_inventory_reconciliation[0]);
  db.read = async () => ({ results: [{ ...sale(), id: '200' }], paging: { total: 2 } });
  await reconcileSalesHistory(db, db.connection, activation);
  const second = db.tables.marketplace_inventory_reconciliation[0];
  assert.equal(new URL(db.calls[2], 'https://ml.test').searchParams.get('offset'), '1');
  assert.equal(second.history_scan_offset, 0); assert.ok(Date.parse(second.history_window_end) < Date.parse(first.history_window_end));
  assert.equal(second.history_started_at, first.history_started_at);
});
test('falha na fila não avança histórico; repetição não duplica os eventos', async () => {
  const db = fixture(), before = structuredClone(db.tables.marketplace_inventory_reconciliation[0]);
  db.fail = 'marketplace_sale_notifications'; await assert.rejects(reconcileSalesHistory(db, db.connection, activation));
  assert.deepEqual(db.tables.marketplace_inventory_reconciliation[0], before);
  db.fail = null; db.read = async () => ({ results: [sale()], paging: { total: 2 } });
  await reconcileSalesHistory(db, db.connection, activation); db.tables.marketplace_inventory_reconciliation[0].history_scan_offset = 0;
  await reconcileSalesHistory(db, db.connection, activation); assert.equal(db.tables.marketplace_sale_notifications.length, 1);
});
test('página inválida ou vendedor diferente não gera evento nem avança cursor', async () => {
  for (const response of [{ results: [sale(), { ...sale(), seller: { id: 999 } }], paging: { total: 2 } },
    { results: [], paging: { total: 1 } }, { results: null, paging: { total: 0 } }, { results: [], paging: { total: -1 } }]) {
    const db = fixture(), before = structuredClone(db.tables.marketplace_inventory_reconciliation[0]); db.read = async () => response;
    await assert.rejects(reconcileSalesHistory(db, db.connection, activation));
    assert.equal(db.tables.marketplace_sale_notifications.length, 0); assert.deepEqual(db.tables.marketplace_inventory_reconciliation[0], before);
  }
});
test('isolamento da consulta não usa cursor de outra empresa; não realiza PUT ou baixa estoque', async () => {
  const db = fixture(); db.tables.marketplace_inventory_reconciliation[0].empresa_id = crypto.randomUUID(); db.tables.marketplace_inventory_reconciliation[0].connection_id = crypto.randomUUID();
  db.read = async (account, path) => { assert.equal(account.empresa_id, company); assert.ok(path.startsWith('/orders/search?')); return { results: [], paging: { total: 0 } }; };
  await reconcileSalesHistory(db, db.connection, activation);
  assert.equal(db.tables.marketplace_inventory_reconciliation.length, 2);
  assert.equal(db.tables.marketplace_inventory_reconciliation[1].empresa_id, company);
  assert.equal(Object.keys(db.tables).length, 2);
});
test('histórico concluído não consulta ML; limite de retenção encerra janela vazia', async () => {
  const db = fixture(); db.tables.marketplace_inventory_reconciliation[0].history_completed_at = activation;
  assert.deepEqual(await reconcileSalesHistory(db, db.connection, activation), { complete: true, count: 0 }); assert.equal(db.calls.length, 0);
  db.tables.marketplace_inventory_reconciliation[0].history_completed_at = null;
  db.tables.marketplace_inventory_reconciliation[0].history_window_end = '2000-01-01T00:00:00Z';
  assert.equal((await reconcileSalesHistory(db, db.connection, activation)).complete, true); assert.equal(db.calls.length, 0);
});
test('contas já existentes iniciam histórico; schema ainda não migrado informa pendência', async () => {
  const db = fixture(); delete db.tables.marketplace_inventory_reconciliation[0].history_scan_offset;
  await assert.rejects(reconcileSalesHistory(db, db.connection, activation), { code: 'sales_history_setup' }); assert.equal(db.calls.length, 0);
});
test('canceladas são consultadas explicitamente e pedidos repetidos nas duas buscas não duplicam eventos',async()=>{
  const db=fixture();
  db.read=async(_account,path)=>({results:[new URL(path,'https://ml.test').searchParams.get('order.status')==='cancelled'?{...sale(),id:'201',status:'cancelled'}:sale()],paging:{total:1}});
  await reconcileSalesHistory(db,db.connection,activation);
  assert.ok(db.calls.some(path=>new URL(path,'https://ml.test').searchParams.get('order.status')==='cancelled'));
  assert.deepEqual(db.tables.marketplace_sale_notifications.map(event=>event.resource),['/orders/2000000000000101','/orders/201']);
});
test('migração SQL real aditiva/idempotente conserva cursor, RLS e permissões', async () => {
  const db = new PGlite(); try {
    await db.exec("create role anon; create role authenticated; create role service_role; create table marketplace_inventory_reconciliation(connection_id uuid primary key,empresa_id uuid,checkpoint timestamptz,window_end timestamptz,scan_offset integer); alter table marketplace_inventory_reconciliation enable row level security; revoke all on marketplace_inventory_reconciliation from public,anon,authenticated; grant select,insert,update on marketplace_inventory_reconciliation to service_role;");
    await db.exec('create table marketplace_listings(empresa_id uuid,connection_id uuid,provider_listing_id text,search_text text,status text,snapshot jsonb,synced_at timestamptz); create table marketplace_sales(empresa_id uuid,connection_id uuid,provider text,provider_order_id text,updated_at timestamptz,status text,shipment_status text,snapshot jsonb); create table marketplace_sale_notifications(id text,created_at timestamptz,processed_at timestamptz);');
    await db.query('insert into marketplace_inventory_reconciliation values($1,$2,$3,$3,7)', [connectionId, company, activation]);
    const sql = readFileSync(resolve(root, 'supabase/migrations/20261012230000_marketplace_sales_history.sql'), 'utf8');
    await db.exec(sql); await db.exec(sql);
    const row = (await db.query('select * from marketplace_inventory_reconciliation')).rows[0];
    assert.equal(new Date(row.checkpoint).toISOString(), activation); assert.equal(row.scan_offset, 7); assert.equal(row.history_scan_offset, 0);
    assert.equal(row.history_completed_at, null); assert.equal((await db.query("select relrowsecurity from pg_class where relname='marketplace_inventory_reconciliation'")).rows[0].relrowsecurity, true);
    for (const role of ['anon', 'authenticated']) assert.equal((await db.query(`select has_table_privilege('${role}','marketplace_inventory_reconciliation','SELECT') as allowed`)).rows[0].allowed, false);
    await assert.rejects(db.query('update marketplace_inventory_reconciliation set history_scan_offset=-1'));
  } finally { await db.close(); }
});

test('worker reserva rodada e rodízio independentes para histórico, sem mudar filtros visuais', () => {
  const worker = readFileSync(resolve(root, 'app/modules/marketplaces/services/inventory-worker.ts'), 'utf8');
  assert.match(worker, /if \(turn === 2\) await reconcile\(true\)/);
  assert.match(worker, /history \? cursor\?\.history_checked_at : cursor\?\.checked_at/);
  assert.match(worker, /if \(turn !== 2\) await reconcile\(\)/);
  assert.match(readFileSync(resolve(root, 'app/marketplaces/Anunciados.tsx'), 'utf8'), /const \[status, setStatus\] = useState\(''\)/);
});
