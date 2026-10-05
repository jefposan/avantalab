import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const client = read('app/marketplaces/MarketplacesClient.tsx');
const listings = read('app/marketplaces/Anunciados.tsx');
const newListing = read('app/marketplaces/NewListing.tsx');
const accountPicker = read('app/marketplaces/MarketplaceAccountPicker.tsx');
const marketplaceSelect = read('app/marketplaces/MarketplaceSelect.tsx');
const css = read('app/marketplaces/marketplaces.module.css');

test('Envio uses human-readable labels rather than raw provider codes', () => {
  assert.match(listings, /shippingLabels\(item.shipping\)/);
  assert.match(listings, /<td>\{shipping.freight\}<small>\{shipping.method\}<\/small><\/td>/);
  assert.doesNotMatch(listings, /\{item.shipping.mode\}|\{item.shipping.logisticType\}/);
});

test('editing actions have compact faces, accessible hit targets and breathing room', () => {
  assert.match(css, /\.actionBar \{[^}]*gap: 12px; margin-bottom: 24px;/);
  assert.match(css, /\.listingDetails dl \{[^}]*margin: 0;/);
  assert.match(css, /\.listingsPanel \.actionBar button \{[^}]*height: 44px; min-height: 44px; min-width: 44px;[^}]*background: transparent;/);
  assert.match(css, /\.listingsPanel \.actionBar button::before \{[^}]*inset: 6px 0;[^}]*pointer-events: none;/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.listingsPanel \.actionBar button \{ height: 48px; min-height: 48px; \}\.listingsPanel \.actionBar button::before \{ inset: 8px 0;/);
  assert.match(css, /\.dark \.actionBar button::before \{[^}]*border-color:[^}]*background:/);
});

test('cancel closes details locally and restores focus without changing the listing', () => {
  assert.match(listings, /onClick=\{\(\) => cancelEditing\(item.id\)\}>Cancelar<\/button>/);
  const cancel = listings.match(/function cancelEditing\(id: string\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(cancel);
  assert.match(cancel, /if \(acting\) return;/);
  assert.match(cancel, /setExpanded\(''\);/);
  assert.match(cancel, /editButtons.current.get\(id\)\?\.focus\(\);/);
  assert.doesNotMatch(cancel, /marketplaceClientRequest|fetch|executeAction|setRows|setConfirmation/);
  assert.match(listings, /ref=\{\(button\) => \{ if \(button\) editButtons.current.set\(item.id, button\); else editButtons.current.delete\(item.id\); \}\}/);
});

test('listing widths fit desktop and keep an accessible pencil visible when scrolling', () => {
  assert.match(css, /\.listingTable \{[^}]*min-width: 960px;[^}]*table-layout: fixed;/);
  assert.doesNotMatch(css, /min-width: 1150px|width: 280px/);
  assert.match(listings, /<colgroup>[\s\S]*?width: 64[\s\S]*?<\/colgroup>/);
  assert.match(css, /\.listingTable \.listingActions \{[^}]*position: sticky; right: 0;/);
  assert.match(css, /\.dark \.listingTable \.listingActions \{[^}]*background:/);
  assert.match(listings, /aria-label=\{`Editar anúncio: \$\{item.title\}`\} title="Editar anúncio" aria-expanded=/);
  assert.match(listings, /onClick=\{\(\) => openEditing\(item.id\)\}><Icon name="edit" size=\{18\}/);
  assert.match(css, /button.editListing \{[^}]*width: 44px;[^}]*border: 0;/);
  assert.match(css, /button.editListing \{ width: 48px; min-height: 48px;/);
  assert.match(read('app/projetos/components/Icon.tsx'), /edit:.*M16.5 3.5/);
});

test('selected account is enclosed with its action in a rounded, theme-aware border', () => {
  assert.match(listings, /<div className=\{styles\.accountSummary\}><span>[\s\S]*?<button[\s\S]*?>Desconectar<\/button>\}<\/div>/);
  assert.match(css, /\.accountSummary \{[^}]*padding: 14px 18px;[^}]*border: 1px solid color-mix\([^}]*border-radius: 16px;/);
  assert.match(css, /\.accountSummary > span \{ min-width: 0; overflow-wrap: anywhere; \}/);
  assert.match(css, /\.accountSummary > button \{ flex-shrink: 0; \}/);
  assert.match(css, /\.dark \.accountSummary \{[^}]*border-color:[^}]*background:/);
  assert.match(css, /@media \(max-width: 760px\)[^}]*\}\.accountSummary \{ flex-wrap: wrap;/);
});

test('marketplaces and costs reuse the same company header and return action', () => {
  assert.match(client, /<ModuloHeader empresa=\{empresa\} onBack=\{voltar\}/);
  assert.match(read('app/custos/CustosClient.tsx'), /<ModuloHeader empresa=\{access.empresa\}/);
  assert.match(client, /solicitarRetornoAoModuloHospedeiro/);
  assert.match(client, /moduloId=marketplaces/);
  assert.match(read('app/components/ModuloHeader.tsx'), /app\/custos\/custos.module.css/);
});

test('grid panels fill their track without auto margins, sharing the content wrapper', () => {
  assert.match(client, /<div className=\{styles.content\}>/);
  assert.match(css, /\.grid > \.panel \{ margin: 0; width: 100%; min-width: 0;/);
  assert.doesNotMatch(css, /margin-inline: auto/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.grid \{ grid-template-columns: 1fr;/);
});

test('static notices are removed without disguising validation or hiding important errors', () => {
  assert.doesNotMatch(client, /OAuth|PKCE|styles.webOnly|styles.security|styles.flow|Nesta etapa/);
  assert.doesNotMatch(listings, /Para adicionar ou reconectar|Atualização automática enquanto|Anúncios da conta selecionada, inclusive/);
  assert.match(client, /<NewListing key=\{selectedAccount \|\| 'unselected'\} companyId=/);
  assert.match(newListing, /'Validar e preparar'/);
  assert.match(newListing, /EAN não localizado/);
  assert.match(newListing, /'Publicar'/);
  assert.doesNotMatch(client, /Valor de venda/);
  assert.match(listings, /role="alert"/);
  assert.match(listings, /ModalConfirmacao/);
  assert.match(listings, /Esta ação encerra definitivamente/);
  assert.match(listings, /Frete vendedor estimado/);
});

test('both marketplace account fields use the same dropdown below the field', () => {
  assert.match(client, /connected\.length === 1 \? connected\[0\]\.id : ''/);
  assert.match(client, /accountId=\{selectedAccount\}/);
  assert.match(newListing, /<MarketplaceAccountPicker label="Publicar na conta"/);
  assert.match(listings, /<MarketplaceAccountPicker label="Conta do Mercado Livre"/);
  assert.match(accountPicker, /<MarketplaceSelect/);
  assert.match(marketplaceSelect, /role="listbox"/);
  assert.match(marketplaceSelect, /role="option"/);
  assert.match(marketplaceSelect, /event\.key === 'Escape'/);
  assert.match(css, /\.selectControl \{ position: relative;/);
  assert.match(css, /\.selectList \{ position: absolute; top: calc\(100% \+ 5px\);/);
});

test('every marketplace list opens in the same anchored system component', () => {
  assert.doesNotMatch(newListing, /<select|<option/);
  assert.doesNotMatch(listings, /<select|<option/);
  assert.match(newListing, /<MarketplaceSelect id="new-productId"/);
  assert.match(newListing, /label="Categoria"/);
  assert.match(newListing, /label="Tipo de anúncio"/);
  assert.match(newListing, /label="Forma de envio"/);
  assert.match(newListing, /label="Condição"/);
  assert.match(newListing, /label="Garantia"/);
  assert.match(newListing, /key=\{attribute\.id\} id=\{`new-attribute:/);
  assert.match(listings, /<MarketplaceSelect label="Situação"/);
  assert.match(marketplaceSelect, /aria-haspopup="listbox"/);
  assert.match(marketplaceSelect, /aria-expanded=\{visibleOpen\}/);
  assert.match(css, /\.selectList \{[^}]*right: 0; left: 0;[^}]*max-height: 260px; overflow-y: auto;/);
});

test('new listing keeps account, EAN and prepare action on one desktop row', () => {
  assert.match(newListing, /<div className=\{styles\.form\}>\s*<MarketplaceAccountPicker[\s\S]*?<div className=\{styles\.eanField\}>[\s\S]*?<button type="button" className=\{styles\.primary\}/);
  assert.match(css, /\.newListing \.form \{ grid-template-columns: minmax\(0, 1\.15fr\) minmax\(0, \.85fr\) auto; align-items: end;/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.newListing \.form, \.catalogFields, \.catalogAttributes \{ grid-template-columns: 1fr;/);
});

test('EAN reader button arms keyboard scanners and submits their Enter suffix', () => {
  assert.match(newListing, /const eanInputRef = useRef<HTMLInputElement>\(null\)/);
  assert.match(newListing, /const \[scannerArmed, setScannerArmed\] = useState\(false\)/);
  assert.match(newListing, /aria-label=\{scannerArmed \? 'Desativar leitor de código de barras' : 'Ativar leitor de código de barras'\}/);
  assert.match(newListing, /aria-pressed=\{scannerArmed\}/);
  assert.match(newListing, /<Icon name="barcode" size=\{20\}/);
  assert.match(newListing, /event\.key === 'Enter' && event\.currentTarget\.value/);
  assert.match(newListing, /void prepare\(event\.currentTarget\.value\)/);
  assert.match(newListing, /requestAnimationFrame\(\(\) => \{ eanInputRef\.current\?\.focus\(\); eanInputRef\.current\?\.select\(\); \}\)/);
  assert.match(css, /\.scannerButton \{[^}]*width: 44px; min-height: 44px;/);
  assert.match(css, /\.scannerButton\[aria-pressed="true"\] \{ color: #fff; background: var\(--brand\); \}/);
  assert.match(read('app/projetos/components/Icon.tsx'), /barcode:.*M4 5v14/);
});
