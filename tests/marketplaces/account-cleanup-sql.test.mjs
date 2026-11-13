import test from 'node:test';
import assert from 'node:assert/strict';
import { accountCleanupFixture } from './helpers/account-cleanup-fixture.mjs';

const all = { clearNotices: true, removeListings: true, removeProducts: true, archiveAccount: true };
const review = async (f, options = all, keys = []) => (await f.db.query(
  'select marketplace_account_cleanup_plan($1,$2,$3,$4,$5) as value',
  [f.scope.company, f.scope.actor, f.scope.account, JSON.stringify(options), keys],
)).rows[0].value;
const execute = async (f, plan, key = crypto.randomUUID(), confirmation = plan.accountName, keys = []) =>
  (await f.db.query('select marketplace_account_cleanup($1,$2,$3,$4,$5,$6,$7,$8) as value',
    [f.scope.company, f.scope.actor, f.scope.account, JSON.stringify(plan.options), keys, plan.reviewToken, confirmation, key])).rows[0].value;

test('limpa somente a conta do perfil confirmado; protege saldo, venda e produto compartilhado; repetição e reconexão são explícitas', async () => {
  const f = await accountCleanupFixture();
  try {
    const { company, other, actor, account, sharedAccount, foreignAccount } = f.scope;
    const keys = ['["aviso-antigo","import_stock_review"]'];
    const plan = await review(f, all, keys);
    assert.equal(plan.companyName, 'TRIDIUM · teste local');
    assert.equal(plan.accountName, 'JEFF');
    assert.equal(plan.products.length, 4);
    assert.equal(plan.products.filter(product => product.reason === null).length, 1);
    assert.deepEqual(plan.blockers, []);
    const count = async (table, tenant = company) => (await f.db.query('select count(*)::int n from '+table+' where empresa_id=$1', [tenant])).rows[0].n;
    const untouched = (await f.db.query('select * from marketplace_products where empresa_id=$1', [other])).rows;
    const otherLinks = (await f.db.query('select * from marketplace_product_links where connection_id in ($1,$2)', [sharedAccount, foreignAccount])).rows;
    const before = await count('marketplace_products');
    await assert.rejects(execute(f, plan, crypto.randomUUID(), 'SALDÃO', keys), /confirmação mudaram/);
    assert.equal(await count('marketplace_products'), before);
    const key = crypto.randomUUID();
    const result = await execute(f, plan, key, 'JEFF', keys);
    assert.deepEqual(result, { archived: true, replayed: false, counts: { products: 1, retainedProducts: 3, links: 4, listings: 4, notices: 2 } });
    assert.equal((await execute(f, plan, key, 'JEFF', [])).replayed, true);
    await assert.rejects(execute(f, { ...plan, options: { ...all, archiveAccount: false } }, key), /outra confirmação/);
    assert.equal(await count('marketplace_products'), 3);
    assert.equal(await count('marketplace_direct_sales'), 1);
    assert.equal(await count('marketplace_account_hidden_notices'), 2);
    assert.deepEqual((await f.db.query('select * from marketplace_products where empresa_id=$1', [other])).rows, untouched);
    assert.deepEqual((await f.db.query('select * from marketplace_product_links where connection_id in ($1,$2)', [sharedAccount, foreignAccount])).rows, otherLinks);
    assert.equal((await f.db.query('select stock_quantity from marketplace_products where id=$1', [f.products.stocked])).rows[0].stock_quantity, 2);

    const saved = (await f.db.query('select * from marketplace_connections where id=$1', [account])).rows[0];
    assert.equal(saved.catalog_import_enabled, false);
    assert.ok(saved.data_archived_at);
    // A gravação de uma sincronização iniciada antes da limpeza também é recusada.
    const late = await f.db.query("insert into marketplace_listings(empresa_id,connection_id,provider,provider_listing_id,title,status,snapshot) values($1,$2,'mercado_livre','MLB9000000001','Atrasado','active','{}') returning id", [company, account]);
    assert.equal(late.rows.length, 0);
    assert.equal((await f.db.query("select marketplace_listing_catalog_import($1,$2,'MLB9000000001') as r", [company, account])).rows[0].r.importDisabled, true);
    await assert.rejects(f.db.query('select marketplace_account_import_enable($1,$2,$3,$4)', [company, actor, account, 'JEFF']), /Reconecte/);
    await f.db.query("update marketplace_connections set status='connected',token_sealed='{}' where id=$1", [account]);
    const reconnected = (await f.db.query('select data_archived_at,catalog_import_enabled from marketplace_connections where id=$1', [account])).rows[0];
    assert.deepEqual(reconnected, { data_archived_at: null, catalog_import_enabled: false });
    await assert.rejects(f.db.query('select marketplace_account_import_enable($1,$2,$3,$4)', [other, actor, account, 'JEFF']), /Reconecte/);
    await f.db.query('select marketplace_account_import_enable($1,$2,$3,$4)', [company, actor, account, 'JEFF']);
    assert.equal((await f.db.query('select catalog_import_enabled from marketplace_connections where id=$1', [account])).rows[0].catalog_import_enabled, true);
    await f.add('Importação escolhida novamente', '7898578153678');
    assert.equal(await count('marketplace_products'), 4);
  } finally { await f.db.close(); }
});

test('mudança após prévia e operação em andamento bloqueiam a limpeza; falha parcial reverte todos os dados', async () => {
  const f = await accountCleanupFixture();
  try {
    const plan = await review(f);
    await f.db.query('update marketplace_products set revision=revision+1 where id=$1', [f.products.eligible]);
    await assert.rejects(execute(f, plan), /Confira a prévia novamente/);
    const withRevision = await review(f);
    await f.db.query("insert into marketplace_product_price_researches values($1,$2,'pending')", [f.scope.company,f.products.eligible]);
    await assert.rejects(execute(f, withRevision), /Confira a prévia novamente/);
    assert.match((await review(f)).products.find(p => p.id === f.products.eligible).reason, /pesquisa de preço/);
    await f.db.query('delete from marketplace_product_price_researches where product_id=$1', [f.products.eligible]);
    await f.db.query("update marketplace_connections set status='connected' where id=$1", [f.scope.account]);
    assert.match((await review(f)).blockers[0], /Desconecte/);
    await f.db.query("update marketplace_connections set status='disconnected' where id=$1", [f.scope.account]);
    await f.db.query('update marketplace_products set listing_stock_review_at=null where id=$1', [f.products.eligible]);
    await f.db.query("insert into marketplace_inventory_outbox(empresa_id,product_id,link_id,state)select empresa_id,product_id,id,'pending' from marketplace_product_links where connection_id=$1 limit 1", [f.scope.account]);
    await f.db.query("update marketplace_inventory_worker set lease_until=now()+interval '1 minute'");
    assert.match((await review(f)).blockers[0], /andamento/);
    await f.db.query('update marketplace_inventory_worker set lease_until=null');
    const fresh = await review(f);
    await f.db.exec("create function prevent_cleanup_test() returns trigger language plpgsql as $$begin raise exception 'falha controlada';end$$; create trigger prevent_cleanup_test before delete on marketplace_products for each row execute function prevent_cleanup_test()");
    await assert.rejects(execute(f, fresh), /falha controlada/);
    assert.equal((await f.db.query('select count(*)::int n from marketplace_product_links where connection_id=$1', [f.scope.account])).rows[0].n, 4);
    assert.equal((await f.db.query('select count(*)::int n from marketplace_account_cleanups')).rows[0].n, 0);
    assert.equal((await f.db.query('select catalog_import_enabled from marketplace_connections where id=$1', [f.scope.account])).rows[0].catalog_import_enabled, true);
  } finally { await f.db.close(); }
});

test('limpeza só de avisos mantém a conta desconectada visível; novos avisos aparecem; papéis e perfis são revalidados', async () => {
  const f = await accountCleanupFixture();
  try {
    const options = { clearNotices: true, removeListings: false, removeProducts: false, archiveAccount: false };
    await f.db.query("insert into marketplace_sale_alerts(empresa_id,connection_id,title)select $1,$2,'Aviso antigo '||n from generate_series(1,25)n", [f.scope.company,f.scope.account]);
    const plan = await review(f, options);
    const result = await execute(f, plan);
    assert.equal(result.archived, false);
    const row = (await f.db.query('select status,data_archived_at,catalog_import_enabled from marketplace_connections where id=$1', [f.scope.account])).rows[0];
    assert.deepEqual(row, { status: 'disconnected', data_archived_at: null, catalog_import_enabled: true });
    const feed = async () => (await f.db.query('select marketplace_live_feed($1,$2) as r', [f.scope.company, f.scope.actor])).rows[0].r;
    assert.equal((await feed()).alerts.length, 0);
    assert.equal((await feed()).pendingSales, 0);
    await f.db.query("insert into marketplace_sale_alerts(empresa_id,connection_id,title)values($1,$2,'Novo aviso')", [f.scope.company, f.scope.account]);
    await f.db.query("insert into marketplace_sale_notifications(empresa_id,connection_id,created_at)values($1,$2,clock_timestamp())", [f.scope.company, f.scope.account]);
    assert.equal((await feed()).alerts.length, 1);
    assert.equal((await feed()).pendingSales, 1);
    await assert.rejects(f.db.query('select marketplace_account_cleanup_plan($1,$2,$3,$4,$5)',
      [f.scope.other, f.scope.actor, f.scope.account, JSON.stringify(options), []]), /Conta não encontrada/);
    await f.db.query("update marketplace_connections set provider='magalu',status='attention',last_error_code='magalu_connector_pending',catalog_import_enabled=false where id=$1", [f.scope.account]);
    assert.equal((await f.db.query('select marketplace_account_import_enable($1,$2,$3,$4) as ok', [f.scope.company,f.scope.actor,f.scope.account,'JEFF'])).rows[0].ok, true);
    await f.db.query("update usuarios_empresa set perfil='operador_completo' where empresa_id=$1", [f.scope.company]);
    await assert.rejects(review(f), /Sem permissão/);
    await f.db.exec('set role authenticated');
    await assert.rejects(f.db.query('select * from marketplace_account_cleanups'), /permission denied/);
    await assert.rejects(review(f), /permission denied/);
  } finally { await f.db.close(); }
});
