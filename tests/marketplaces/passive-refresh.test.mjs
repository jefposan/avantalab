import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createPassiveRefresh, listingDisplaySignature } from '../../app/marketplaces/passive-refresh.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const requests = [], latest = [], visible = [], loading = [], errors = [];
  const reader = createPassiveRefresh({
    read: signal => new Promise((resolve, reject) => requests.push({ signal, resolve, reject })),
    onLatest: value => latest.push(value), onVisible: value => visible.push(value),
    onLoading: value => loading.push(value), onError: value => errors.push(value),
  });
  return { reader, requests, latest, visible, loading, errors };
}
test('leitura automática muda somente os avisos, nunca a lista, loading ou erros da tela', async () => {
  const f = setup(); const run = f.reader.background(); f.requests[0].resolve({ id: 'nova' }); await run;
  assert.deepEqual(f.latest, [{ id: 'nova' }]); assert.deepEqual(f.visible, []); assert.deepEqual(f.loading, []);
  const failed = f.reader.background(); f.requests[1].reject(new Error('offline')); await failed;
  assert.deepEqual(f.errors, []); assert.deepEqual(f.visible, []);
});
test('Atualizar explícito aplica a lista e seu loading; falha manual preserva a lista anterior', async () => {
  const f = setup(); const run = f.reader.manual(); f.requests[0].resolve('confirmada'); await run;
  assert.deepEqual(f.latest, ['confirmada']); assert.deepEqual(f.visible, ['confirmada']); assert.deepEqual(f.loading, [true, false]);
  const failed = f.reader.manual(); f.requests[1].reject(new Error('offline')); await failed;
  assert.equal(f.errors[0].message, 'offline'); assert.deepEqual(f.visible, ['confirmada']);
});
test('requisição manual tem prioridade e descarta resposta automática antiga, mesmo sem abort cooperativo', async () => {
  const f = setup(); const old = f.reader.background(); const manual = f.reader.manual();
  assert.equal(f.requests[0].signal.aborted, true); f.requests[1].resolve('atual'); await manual;
  f.requests[0].resolve('antiga'); await old; assert.deepEqual(f.latest, ['atual']); assert.deepEqual(f.visible, ['atual']);
});
test('avisos recebidos durante atualização manual são recuperados silenciosamente ao terminar', async () => {
  const f = setup(); const manual = f.reader.manual(); await f.reader.background(); await f.reader.background();
  assert.equal(f.requests.length, 1); f.requests[0].resolve('manual'); await manual; await tick();
  assert.equal(f.requests.length, 2); f.requests[1].resolve('novidade'); await tick();
  assert.deepEqual(f.latest, ['manual', 'novidade']); assert.deepEqual(f.visible, ['manual']); assert.deepEqual(f.loading, [true, false]);
});
test('troca de empresa/desmontagem cancela tudo e não aplica respostas do contexto antigo', async () => {
  const f = setup(); const run = f.reader.manual(); await f.reader.background(); f.reader.stop();
  assert.equal(f.requests[0].signal.aborted, true); f.requests[0].resolve('outra empresa'); await run;
  await f.reader.manual(); assert.equal(f.requests.length, 1); assert.deepEqual(f.latest, []); assert.deepEqual(f.visible, []);
});
test('aviso de anúncio ignora somente horário da consulta e detecta preço, saldo e status alterados', () => {
  const first = { total: 1, listings: [{ status: 'active', snapshot: { id: 'MLB1', price: 100, availableQuantity: 5, syncedAt: 'antes' } }] };
  const make = patch => ({ ...first, listings: [{ ...first.listings[0], snapshot: { ...first.listings[0].snapshot, ...patch } }] });
  assert.equal(listingDisplaySignature(first), listingDisplaySignature(make({ syncedAt: 'depois' })));
  for (const patch of [{ price: 90 }, { availableQuantity: 4 }]) assert.notEqual(listingDisplaySignature(first), listingDisplaySignature(make(patch)));
  assert.notEqual(listingDisplaySignature(first), listingDisplaySignature({ ...first, listings: [{ ...first.listings[0], status: 'paused' }] }));
});
test('eventos automáticos não propagam refreshKey às listas; popup continua no monitor independente', () => {
  const read = file => readFileSync(new URL(`../../app/${file}`, import.meta.url), 'utf8');
  const client = read('marketplaces/MarketplacesClient.tsx');
  const handler = client.slice(client.indexOf('const update = (event: Event)'), client.indexOf('const [salesLoading'));
  assert.doesNotMatch(handler, /setRefreshKey|setSalesLoading|setSalesSnapshot|scrollIntoView/);
  assert.match(handler, /setBackgroundRefresh/);
  assert.match(client, /salesInPeriod\(salesSnapshot, salesPeriod\)/);
  assert.match(client, /onLatest: data => setSales/);
  assert.match(client, /onVisible: data => \{ setSalesSnapshot/);
  assert.match(client, /setInventorySnapshot\(\{companyId, feed: detail.feed\}\)/);
  assert.match(client, /<MarketplaceLiveMonitor key=\{companyId\}/);
  const listings = read('marketplaces/Anunciados.tsx');
  assert.doesNotMatch(listings, /synchronizeRef.current\(true\)|setInterval\(|addEventListener\('visibilitychange'/);
  assert.match(listings, /setSyncing\(true\); setError\(''\); setSyncNotice\(''\)/);
  assert.match(listings, /if\(!silent\)setLoading\(true\)/);
  assert.match(listings, /if \(!controller.signal.aborted && !silent\) setLoading\(false\)/);
  assert.match(listings, /loadListRef.current\(true,true\)/);
});
test('somente vendas online autorizam aplicação periódica na lista; saldão fica estável', async()=>{
 let online=true;const visible=[],latest=[];
 const reader=createPassiveRefresh({read:async()=>({id:'sale'}),onLatest:v=>latest.push(v),onVisible:v=>visible.push(v),onLoading(){},onError(){},backgroundVisible:()=>online});
 await reader.background();assert.equal(visible.length,1);online=false;await reader.background();assert.equal(visible.length,1);assert.equal(latest.length,2);await reader.manual();assert.equal(visible.length,2);
 const client=readFileSync('app/marketplaces/MarketplacesClient.tsx','utf8');assert.match(client,/backgroundVisible: \(\) => salesViewRef.current === 'online'/);
 const monitor=readFileSync('app/components/MarketplaceLiveMonitor.tsx','utf8');assert.match(monitor,/refreshInventory = manual \|\| !inventoryLoaded/);assert.match(monitor,/scope=sales/);assert.match(client,/if \(detail.refreshInventory !== false\) setInventorySnapshot/);
});
