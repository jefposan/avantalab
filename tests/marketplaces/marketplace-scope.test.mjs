import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { accountsForMarketplace, publicationAccount } from '../../app/marketplaces/marketplace-scope.ts';

const accounts = [
  { id: 'ml-legacy', status: 'connected' },
  { id: 'ml', provider: 'mercado_livre', status: 'connected' },
  { id: 'magalu', provider: 'magalu', status: 'connected' },
  { id: 'magalu-expired', provider: 'magalu', status: 'expired' },
  { id: 'shopee', provider: 'shopee', status: 'attention' },
];

test('filtro separa plataformas sem apagar contas e preserva payloads legados do ML', () => {
  const original = JSON.stringify(accounts);
  assert.deepEqual(accountsForMarketplace(accounts, 'mercado_livre').map(account => account.id), ['ml-legacy', 'ml']);
  assert.deepEqual(accountsForMarketplace(accounts, 'magalu').map(account => account.id), ['magalu', 'magalu-expired']);
  assert.deepEqual(accountsForMarketplace(accounts, 'shopee').map(account => account.id), ['shopee']);
  assert.deepEqual(accountsForMarketplace(accounts, 'amazon'), []);
  assert.equal(JSON.stringify(accounts), original);
});

test('publicação usa somente conta conectada do conjunto filtrado, nunca destino da plataforma anterior', () => {
  const magalu = accountsForMarketplace(accounts, 'magalu');
  assert.equal(publicationAccount(magalu, 'ml'), 'magalu');
  assert.equal(publicationAccount(magalu, 'magalu-expired'), 'magalu');
  assert.equal(publicationAccount(accountsForMarketplace(accounts, 'amazon'), 'ml'), '');
  assert.equal(publicationAccount(accountsForMarketplace(accounts, 'shopee'), 'ml'), '');
  assert.equal(publicationAccount(accountsForMarketplace(accounts, 'mercado_livre'), 'ml'), 'ml');
});

test('navegação fica no contexto da página inteira, mede altura real e mantém permissões', () => {
  const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const client = read('app/marketplaces/MarketplacesClient.tsx');
  const listings = read('app/marketplaces/Anunciados.tsx');
  const products = read('app/marketplaces/ProductsStock.tsx');
  const css = read('app/marketplaces/marketplaces.module.css');
  assert.match(css, /\.page \.salesHeader \{ position: fixed; top: 0;/);
  assert.match(css, /\.marketplaceSelector \{ position: sticky; top: calc\(var\(--marketplace-header-height, 80px\) \+ 12px\)/);
  assert.match(css, /:global\(body\):has\(> \.page\)/);
  assert.match(client, /new ResizeObserver\(measure\)/);
  assert.match(client, /observer\.observe\(header\); observer\.observe\(selector\)/);
  assert.match(client, /observer\.disconnect\(\)/);
  assert.ok(client.indexOf('data-marketplace-selector') < client.indexOf('<section className={styles.grid}'));
  assert.match(listings, /if \(marketplace !== 'mercado_livre'\) return;/);
  assert.match(listings, /const visibleRows = marketplace === 'mercado_livre'/);
  assert.match(listings, /scopedAccounts.filter/);
  assert.match(products, /const publicationAccounts = props.publicationAccounts \?\? accounts/);
  assert.match(products, /!validTargetAccount/);
  assert.match(client, /<Vendas[\s\S]*?accounts=\{salesAccounts\}/);
  assert.match(client, /const salesAccounts = accounts.filter\(salesAccountAvailable\)/);
});
