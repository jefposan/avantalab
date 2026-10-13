import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../app/marketplaces/Vendas.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../app/marketplaces/marketplaces.module.css', import.meta.url), 'utf8');

test('etiqueta do Mercado Livre permanece no AvantaLab e informa falha na própria tela', () => {
  assert.doesNotMatch(source, /window\.open\('about:blank'/);
  assert.match(source, /URL\.createObjectURL\(pdf\)/);
  assert.match(source, /labelPreview\?\.saleId === sale\.id/);
  assert.match(source, /<iframe title=\{`Etiqueta do Pedido #\$\{sale\.orderId\}`\} src=\{labelPreview\.url\}/);
  assert.match(source, /setPrintError\(err instanceof Error \? err\.message/);
  assert.match(css, /\.labelPreview iframe \{[^}]*min-height:/);
});

test('linha identifica a plataforma e copia a referência completa do pedido', () => {
  assert.match(source, /const providerBrand/);
  assert.match(source, /className=\{styles\.accountMarketplaceBrand\} data-provider=\{sale\.provider \?\? 'mercado_livre'\}/);
  assert.match(source, /className=\{styles\.saleProviderLogo\} src=\{provider\.logo\} alt=\{provider\.name\}/);
  assert.match(source, /copyOrderReference\(sale\.orderId\)/);
  assert.match(source, /const value = `Pedido #\$\{orderId\}`/);
  assert.match(source, /className=\{styles\.saleOrderHeading\}[\s\S]*?<strong>Pedido #\{sale\.orderId\}<\/strong>[\s\S]*?className=\{styles\.copySaleOrder\}/);
  assert.match(source, /`Copiar Pedido #\$\{sale\.orderId\}`/);
  assert.match(source, /navigator\.clipboard\?\.writeText/);
  assert.match(css, /\.saleSummary \{ grid-template-columns: 90px minmax\(0, 1fr\) auto; \}/);
  assert.match(css, /\.saleOrderHeading \.copySaleOrder \{[^}]*width: 44px; height: 44px;[^}]*margin-block: -10px;/);
  assert.match(css, /\.saleOrderHeading \.copySaleOrder::before \{[^}]*inset: 10px;/);
  assert.match(css, /\.accountMarketplaceBrand img \{[^}]*height: 24px/);
});

test('linha inteira abre a venda, Copiar não abre, e a situação permanece horizontal', () => {
  assert.match(source, /className=\{`\$\{styles\.saleSummary\} \$\{open === sale\.id \? styles\.saleSummaryExpanded : ''\}`\} onClick=\{event => \{/);
  assert.match(source, /className=\{styles\.saleSummaryOpen\} aria-expanded=\{open === sale\.id\}/);
  assert.match(source, /className=\{styles\.copySaleOrder\}[\s\S]*?onClick=\{event => \{ event\.stopPropagation\(\); void copyOrder\(sale\); \}\}/);
  assert.match(css, /\.saleSummary \.saleStatusAction \{[^}]*white-space: nowrap;/);
  assert.match(css, /\.saleSummary \.saleStatusAction b \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.saleSummary \{ grid-template-columns: 90px minmax\(0, 1fr\); \}\.saleSummary \.saleStatusAction \{ grid-column: 1 \/ -1; justify-self: end; max-width: 100%; \} \}/);
});
