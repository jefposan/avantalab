import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { accountCleanupFixture, fixtureClient } from './helpers/account-cleanup-fixture.mjs';
const root = resolve(import.meta.dirname, '../..');
const data = source => ({ url: 'data:text/javascript,'+encodeURIComponent(source), shortCircuit: true });
const hook = registerHooks({
  resolve(name, context, next) {
    if (name === 'server-only') return data('export {}');
    if (name === 'next/server') return data('export const NextResponse={json:(v,o)=>Response.json(v,o)};');
    if (name.endsWith('/services/management-access') || name === './management-access') return data(`
      export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
      export async function authorizeMarketplace(request,company,permission) {
        if(permission!=='connections'||request.headers.get('authorization')!=='Bearer admin')throw new MarketplaceError(403,'forbidden','Sem permissão');
        if(company!==globalThis.cleanupScope.company)throw new MarketplaceError(403,'scope','Outro perfil');
        return {db:globalThis.cleanupClient,empresaId:company,usuario:{id:globalThis.cleanupScope.actor}};
      }
      export function managementFailure(e){return Response.json({message:e.message},{status:e.status||503});}
    `);
    const file = name.startsWith('@/') ? resolve(root, name.slice(2))
      : name.startsWith('.') && context.parentURL?.startsWith('file:') ? resolve(dirname(new URL(context.parentURL).pathname), name) : null;
    if (file && existsSync(file+'.ts')) return next(pathToFileURL(file+'.ts').href, context);
    return next(name, context);
  },
});
const service = await import('../../app/modules/marketplaces/services/account-cleanup.ts');
const { readInventoryNotices } = await import('../../app/modules/marketplaces/services/inventory-notices.ts');
const { POST } = await import('../../app/api/modulos/marketplaces/conexoes/limpeza/route.ts');
hook.deregister();
const options = { clearNotices: true, removeListings: true, removeProducts: true, archiveAccount: true };

test('prévia real e endpoint limpam avisos do perfil e retornam o resultado persistido após perda da resposta', async () => {
  const f = await accountCleanupFixture();
  try {
    globalThis.cleanupScope = f.scope;
    globalThis.cleanupClient = fixtureClient(f.db);
    const previousEvent = crypto.randomUUID();
    await f.db.query(`insert into marketplace_inventory_events(id,empresa_id,product_id,connection_id,listing_id,provider,order_id,state,issue)
      values($1,$2,$3,$4,'MLB7897013526107','mercado_livre','pedido-antigo','pending','stock_not_confirmed')`,
      [previousEvent, f.scope.company, f.products.sold, f.scope.account]);
    const request = (body, token = 'admin') => POST(new Request('http://local/api/modulos/marketplaces/conexoes/limpeza', {
      method: 'POST', headers: { authorization: 'Bearer '+token, 'content-type': 'application/json' }, body: JSON.stringify(body),
    }));
    const input = { empresaId: f.scope.company, connectionId: f.scope.account, options };
    assert.equal((await request({ ...input, action: 'review' }, 'operator')).status, 403);
    assert.equal((await request({ ...input, empresaId: f.scope.other, action: 'review' })).status, 403);
    const response = await request({ ...input, action: 'review' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const plan = await response.json();
    assert.equal(plan.counts.products, 1);
    assert.equal(plan.counts.retainedProducts, 3);
    assert.ok(plan.counts.notices > 0);
    assert.ok(plan.retained.some(product => product.reason.includes('Compartilhado')));
    const body = { ...input, action: 'execute', reviewToken: plan.reviewToken, confirmation: 'JEFF', requestKey: crypto.randomUUID() };
    const done = await request(body);
    assert.equal(done.status, 200);
    assert.equal((await done.json()).counts.products, 1);
    const replay = await request(body);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).replayed, true);
    // A rotina de estoque pode revisar o motivo depois de a limpeza retirar o vínculo.
    await f.db.query("update marketplace_inventory_events set issue='product_not_linked' where id=$1", [previousEvent]);
    const notices = await readInventoryNotices(globalThis.cleanupClient, f.scope.company);
    assert.equal(notices.filter(notice => notice.connectionId === f.scope.account).length, 0);
    const newEvent = crypto.randomUUID();
    await f.db.query(`insert into marketplace_inventory_events(id,empresa_id,product_id,connection_id,listing_id,provider,order_id,state,issue)
      values($1,$2,$3,$4,'MLB7897013526107','mercado_livre','pedido-novo','pending','product_not_linked')`,
      [newEvent, f.scope.company, f.products.sold, f.scope.account]);
    const updated = await readInventoryNotices(globalThis.cleanupClient, f.scope.company);
    assert.ok(updated.some(notice => notice.id === 'sale:' + newEvent));
    assert.ok(!updated.some(notice => notice.id === 'sale:' + previousEvent));
    // A dispensa não alcança a mesma identificação em outra conta ou perfil.
    await f.db.query(`insert into marketplace_inventory_events(id,empresa_id,product_id,connection_id,listing_id,provider,state,issue)
      values($1,$2,$3,$4,'MLB7897013526107','mercado_livre','pending','product_not_linked'),
      ($1,$5,$6,$7,'MLB7898578153678','mercado_livre','pending','product_not_linked')`,
      [previousEvent, f.scope.company, f.products.shared, f.scope.sharedAccount, f.scope.other, f.products.foreign, f.scope.foreignAccount]);
    const scoped = await readInventoryNotices(globalThis.cleanupClient, f.scope.company);
    assert.ok(scoped.some(notice => notice.id === 'sale:' + previousEvent && notice.connectionId === f.scope.sharedAccount));
    const foreignNotices = await readInventoryNotices(globalThis.cleanupClient, f.scope.other);
    assert.ok(foreignNotices.some(notice => notice.id === 'sale:' + previousEvent));
    assert.equal((await request({ ...input, action: 'unknown' })).status, 400);
  } finally {
    delete globalThis.cleanupScope;
    delete globalThis.cleanupClient;
    await f.db.close();
  }
});

test('valida opções e confirmações e informa migração ausente', async () => {
  const f = await accountCleanupFixture();
  try {
    const client = fixtureClient(f.db);
    await assert.rejects(service.reviewAccountCleanup(client, f.scope.company, f.scope.actor, 'outro', options), { code: 'invalid_cleanup' });
    await assert.rejects(service.reviewAccountCleanup(client, f.scope.company, f.scope.actor, f.scope.account,
      { ...options, removeListings: false }), { code: 'invalid_cleanup' });
    await assert.rejects(service.executeAccountCleanup(client, f.scope.company, f.scope.actor, {
      connectionId: f.scope.account, options, requestKey: 'invalid', reviewToken: 'x', confirmation: 'JEFF',
    }), { code: 'invalid_cleanup_confirmation' });
    const missing = { ...client, rpc: () => ({ abortSignal: async () => ({ error: { code: 'PGRST202' } }) }) };
    await assert.rejects(service.reviewAccountCleanup(missing, f.scope.company, f.scope.actor, f.scope.account, options), { code: 'cleanup_installation_pending' });
  } finally { await f.db.close(); }
});
