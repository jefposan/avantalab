import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { formatarMoedaDigitada } from '../../app/lib/formatters.ts';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const client = read('app/marketplaces/MarketplacesClient.tsx');
const listings = read('app/marketplaces/Anunciados.tsx');
const newListing = read('app/marketplaces/NewListing.tsx');
const accountPicker = read('app/marketplaces/MarketplaceAccountPicker.tsx');
const marketplaceSelect = read('app/marketplaces/MarketplaceSelect.tsx');
const css = read('app/marketplaces/marketplaces.module.css');

test('card de apresentação é mais baixo sem diminuir texto nem alvos dos botões', () => {
  const hero = css.match(/\.hero \{([^}]+)\}/)[1];
  assert.match(hero, /padding: 8px 24px;/);
  assert.match(hero, /margin-bottom: 24px;/);
  assert.doesNotMatch(hero, /(?:^|;)\s*(?:height|max-height|overflow):/);
  assert.match(css, /\.hero h1 \{ font-size: 26px; line-height: 1\.2;/);
  assert.match(css, /\.hero \{ align-items: stretch; flex-direction: column; gap: 8px; padding: 8px 20px; \}/);
  assert.doesNotMatch(client, /Conexão e gestão|styles\.eyebrow/);
  assert.match(client, /<h1 id="module-title">Anúncios em marketplaces<\/h1>/);
  assert.match(css, /\.marketplaceMobileLink \{[^}]*min-height: 44px;/);
  assert.match(css, /\.settingsButton, \.iconAction \{[^}]*width: 44px; height: 44px;/);
  assert.match(css, /\.marketplaceMobileLink \{ width: 100%; min-height: 48px; \}/);
});

test('seletor mantém marcas coloridas com assets locais, nome acessível e seleção explícita', () => {
  const source = stripTypeScriptTypes(client.slice(client.indexOf('const providers:'), client.indexOf('\nexport default function')));
  const providers = runInNewContext(`${source}; providers`);
  assert.equal(providers.length, 6);
  assert.match(read('public/images/marketplaces/amazon.svg'), /<mask id="mask-2" fill="white">/);
  for (const provider of providers) {
    assert.ok(provider.width > 0 && provider.height > 0);
    const asset = readFileSync(new URL(`../../public/images/marketplaces/${provider.logo}`, import.meta.url));
    if (provider.logo.endsWith('.svg')) {
      const svg = asset.toString('utf8');
      assert.match(svg, /<svg\b/);
      assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\son[a-z]+\s*=/i);
      assert.doesNotMatch(svg, /(?:href|src)=["'](?!#)[^"']+/i);
    } else assert.equal(asset.subarray(1, 4).toString(), 'PNG');
    assert.ok(css.includes(`.provider[data-provider="${provider.id}"]`));
  }
  assert.match(client, /data-provider=\{provider.id\}/);
  assert.match(client, /<strong className=\{styles.providerName\}>\{provider.name\}<\/strong>/);
  assert.match(client, /<Image className=\{styles.providerLogo\}[\s\S]*?alt=""[\s\S]*?unoptimized/);
  assert.match(client, /marketplace === provider.id && <span className=\{styles.providerCheck\} aria-hidden="true"><Icon name="check"/);
  assert.match(css, /\.page \.provider:disabled \{ opacity: 1; cursor: not-allowed; \}/);
  assert.match(css, /\.page \.provider:focus-visible \{ outline: 3px solid #003e73;/);
  assert.match(css, /\.providerLogo \{[^}]*max-width: 100%;[^}]*object-fit: contain;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.page \.provider \{ transition: none; \} \}/);
});

test('Casas Bahia usa desenho local, fundo azul e traço vermelho sem placa branca', () => {
  const svg=read('public/images/marketplaces/casas-bahia.svg');
  assert.match(svg,/<rect width="124" height="30" rx="4" fill="#0033C6"\/>/);
  assert.match(svg,/fill="#D43642"/);assert.match(svg,/fill="white"/);
  assert.doesNotMatch(svg,/<rect[^>]+fill="white"|stroke="#E5E5E5"/);
  assert.match(css,/\.provider\[data-provider="casas_bahia"\] \{[^}]*background: #0033c6;[^}]*color: #fff;/);
  assert.match(css,/\.connectedAccount\[data-provider="casas_bahia"\][^}]*--account-marketplace-background: #0033c6;/);
});

test('retorno Magalu é limitado à janela aberta e conta autorizada não habilita operação nem renovação ML',()=>{
  assert.match(client,/if \(!oauthWindow.current \|\| event.source !== oauthWindow.current\) return/);
  assert.match(client,/\['mercado_livre', 'magalu'\]\.includes\(data.provider \|\| ''\)/);
  assert.match(client,/data.empresaId !== companyId/);
  assert.match(client,/Autorizada · sincronização pendente/);
  assert.match(client,/Sincronização automática do Mercado Livre ativa\./);
  assert.match(client,/!account.provider \|\| account.provider === 'mercado_livre'/);
  assert.match(client,/canManage=\{canManage && selectedProvider.available && !connecting\}/);
});

test('todas as marcas podem filtrar a tela sem declarar conexão ou publicação operacional', () => {
  const source = stripTypeScriptTypes(client.slice(client.indexOf('const providers:'), client.indexOf('\nexport default function')));
  const providers = runInNewContext(`${source}; providers`);
  const selector = client.slice(client.indexOf('{providers.map'), client.indexOf('</button>)}', client.indexOf('{providers.map')));
  const expression = selector.match(/disabled=\{([^}]+)\}/)[1];
  const disabled = (provider, changes = {}) => runInNewContext(expression, { provider, connecting: false, accountSelectionLocked: false, publicationBusy: false, disconnecting: false, identificationAccountId: '', ...changes });
  for (const provider of providers) assert.equal(disabled(provider), false);
  const magalu = providers.find(provider => provider.id === 'magalu');
  assert.equal(magalu.available, false); assert.equal(magalu.selectable, true);
  for (const state of ['connecting', 'accountSelectionLocked', 'publicationBusy', 'disconnecting']) assert.equal(disabled(magalu, { [state]: true }), true);
  assert.equal(disabled(magalu, {identificationAccountId: 'editing'}),true);
  assert.match(selector, /provider.selectable \? 'Em preparação' : 'Em breve'/);
  assert.match(selector, /aria-pressed=\{marketplace === provider.id\}/);
  assert.match(selector, /setMarketplace\(provider.id\)/);
  assert.match(client, /marketplace !== 'mercado_livre' && marketplace !== 'magalu'/);
  assert.doesNotMatch(client, /!connectionTarget\(marketplace\)/);
  assert.match(client, /canManage=\{canManage && selectedProvider.available && !connecting\}/);
});

test('seletor filtra contas e destinos sem desmontar os blocos nem alterar avisos gerais', () => {
  const rendered = client.slice(client.indexOf('  return <main className='));
  assert.doesNotMatch(rendered, /marketplace === 'mercado_livre'|marketplace === 'magalu'|Magalu · Conexão em preparação/);
  for (const component of ['SalesFilters', 'NewListing', 'AvantaKanban', 'Vendas', 'ProductsStock', 'Anunciados']) assert.match(rendered, new RegExp(`<${component}\\b`));
  const connect = client.slice(client.indexOf('  async function connectMarketplace()'), client.indexOf("  if (accessState === 'loading')"));
  assert.match(connect, /connectionTarget\(marketplace\)/);assert.match(connect, /fetch\(target.endpoint/);
  assert.match(connect, /validateConnectionAuthorization\(marketplace, payload.authorizationUrl\)/);
  assert.doesNotMatch(connect, /setSelectedAccount|setSalesAccount|setSalesExpanded|setCopyRequest/);
  assert.match(client, /const displayedAccounts = accountsForMarketplace\(renewableAccounts, marketplace\)/);
  assert.match(client, /const publicationAccountId = publicationAccount\(marketplaceAccounts, selectedAccount\)/);
  assert.match(rendered, /accounts=\{marketplaceAccounts\}/);
  assert.match(rendered, /<Anunciados companyId=\{companyId\} marketplace=\{marketplace\}/);
});

test('linhas de Vendas têm destaque suave por mouse e teclado nos dois temas, sem alterar os estados', () => {
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.salesPanel \.saleSummary:hover \{ background: color-mix\(in srgb, var\(--brand\) 4%, #fff\); \}\s*\.dark \.salesPanel \.saleSummary:hover \{ background: color-mix\(in srgb, var\(--brand\) 10%, #182235\); \}/);
  assert.match(css, /\.salesPanel \.saleSummary:focus-visible \{ background: color-mix\(in srgb, var\(--brand\) 4%, #fff\); \}/);
  assert.match(css, /\.dark \.salesPanel \.saleSummary:focus-visible \{ background: color-mix\(in srgb, var\(--brand\) 10%, #182235\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.saleSummary \{ transition: none; \} \}/);
  for (const rule of css.matchAll(/\.saleSummary:(?:hover|focus-visible) \{([^}]+)\}/g)) {
    assert.doesNotMatch(rule[1], /(?:^|;)\s*(?:color|transform|display|width|height):/);
  }
  assert.match(css, /\.saleSummary b\[data-status="cancelled"\]/);
});

test('a cada abertura somente Vendas inicia aberto, sem persistir expansão dos outros blocos', () => {
  const products = read('app/marketplaces/ProductsStock.tsx');
  assert.match(client, /const \[salesExpanded, setSalesExpanded\] = useState\(true\)/);
  assert.match(listings, /const \[panelExpanded, setPanelExpanded\] = useState\(false\)/);
  assert.match(products, /const \[expanded, setExpanded\] = useState\(false\)/);
  assert.match(listings, /id="announced-content" hidden=\{!panelExpanded\}/);
  assert.match(products, /id="products-content" hidden=\{!expanded\}/);
  for (const source of [listings, products]) assert.doesNotMatch(source, /(?:localStorage|sessionStorage)/);
  assert.match(listings, /onClick=\{\(\) => setPanelExpanded\(\(current\) => !current\)\}/);
  assert.match(products, /onClick=\{\(\) => setExpanded\(value => !value\)\}/);
});

test('cards são identificados por título, sem numeração decorativa', () => {
  const sales = read('app/marketplaces/Vendas.tsx');
  for (const source of [client, sales, listings, read('app/marketplaces/ProductsStock.tsx')]) {
    assert.doesNotMatch(source, /styles\.step/);
  }
  assert.doesNotMatch(css, /\.step\s*\{/);
  assert.match(client, /<h2 className=\{styles.srOnly\}>Marketplace<\/h2>/);
  assert.match(client, /<h2 id="new-listing-title">Novo anúncio<\/h2>/);
  assert.match(sales, /<h2 id="sales-title">Vendas · \{sales\.length\}<\/h2>/);
});

test('expansão individual de produtos tem face de 24px e alvo de 48px sem alterar os blocos', () => {
  const products = read('app/marketplaces/ProductsStock.tsx');
  assert.match(products, /contexto=\{`produto \$\{product\.name\}`\} controlsId=\{`local-detail-\$\{product\.id\}`\}/);
  assert.match(css, /\.localProductHeading button\[aria-controls\^="local-detail-"\] \{[^}]*min-height: 24px; height: 24px;[^}]*min-width: 80px;[^}]*font-size: 12px;/);
  assert.match(css, /\.localProductHeading button\[aria-controls\^="local-detail-"\]::after \{ content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 48px; transform: translateY\(-50%\); \}/);
  assert.match(css, /\.localProductHeading button\[aria-controls\^="local-detail-"\] svg \{ width: 12px; height: 12px;/);
  assert.match(css, /:not\(:where\(\.localProductHeading button\)\)/);
  assert.match(css, /\.panelHeadingActions \{ --heading-control-height: 40px;/);
  assert.match(css, /\.panelHeadingActions \{ --heading-control-height: 48px;/);
});

test('Novo anúncio não exibe as orientações removidas e mantém validação da busca', () => {
  assert.doesNotMatch(newListing, /Digite pelo menos 3 caracteres e escolha a ficha correta/);
  assert.doesNotMatch(newListing, /O produto já está cadastrado\?/);
  assert.doesNotMatch(newListing, /new-search-description-help/);
  assert.match(newListing, /searchDescription\.trim\(\)\.length < 3/);
  assert.match(newListing, /onClick=\{searchByDescription\}/);
});

test('cópia sem EAN preenche valores visíveis e mantém origem, descrição e opções para revisão', () => {
  const start = newListing.indexOf('  function applyPreparation(');
  const end = newListing.indexOf('\n  async function prepare(', start);
  const source = stripTypeScriptTypes(newListing.slice(start, end));
  const copySource = { connectionId: 'origem', listingId: 'MLB123' };
  const product = { id: 'MLB456', name: 'Produto', pictures: [], description: '' };
  const preferred = { ean: '', productId: product.id, price: 1500, stock: 1, listingType: 'gold_pro', shippingMode: 'me2', condition: 'new', description: 'Descrição original completa.', copySource, attributes: {} };
  const result = { ean: '', product, categoryId: 'MLB1', listingTypes: [{ id: 'gold_pro' }], shippingModes: [{ id: 'me2' }], conditions: [{ id: 'new' }], copySource };
  const state = { form: {}, priceText: '', stockText: '', preserve: false };
  const context = {
    preserveCopiedFields: false, crypto: { randomUUID: () => 'request-key' }, formatarMoedaDigitada,
    setPrepared(value) { state.prepared = value; }, setSearchDescription() {}, setRequestKey() {},
    setForm(update) { state.form = update(state.form); },
    setPreserveCopiedFields(value) { state.preserve = value; },
    setPriceText(value) { state.priceText = value; }, setStockText(value) { state.stockText = value; },
  };
  runInNewContext(`(${source})`, context)(result, preferred);
  assert.equal(state.priceText, formatarMoedaDigitada('150000'));
  assert.equal(state.stockText, '1'); assert.equal(state.form.ean, '');
  assert.equal(state.form.description, preferred.description);
  assert.equal(state.form.copySource, copySource);
  assert.equal(state.form.listingType, 'gold_pro'); assert.equal(state.preserve, true);
  assert.equal(state.prepared, result);
});

test('Envio uses human-readable labels rather than raw provider codes', () => {
  assert.match(listings, /shippingLabels\(item.shipping\)/);
  assert.match(listings, /<td>\{shipping.freight\}<small>\{shipping.method\}<\/small><\/td>/);
  assert.doesNotMatch(listings, /\{item.shipping.mode\}|\{item.shipping.logisticType\}/);
});

test('editing actions use one visual border, an accessible target and hover feedback', () => {
  assert.match(css, /\.actionBar \{[^}]*gap: 10px; margin-bottom: 24px;/);
  assert.match(css, /\.listingDetails dl \{[^}]*margin: 0;/);
  assert.match(css, /\.listingsPanel \.actionBar :is\(button, a\) \{[^}]*min-height: 40px;[^}]*border: 1px solid #cbd5e1;[^}]*padding: 0 14px;/);
  assert.match(css, /\.listingsPanel \.actionBar :is\(button, a\):hover:not\(:disabled\) \{[^}]*box-shadow:[^}]*transform: translateY\(-1px\);/);
  assert.doesNotMatch(css, /\.actionBar button::before/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.listingsPanel \.actionBar :is\(button, a\) \{ min-height: 48px;/);
  assert.match(css, /\.dark \.listingsPanel \.actionBar :is\(button, a\) \{[^}]*border-color:[^}]*background:/);
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

test('connected accounts stay in rounded controls at the bottom of the marketplace card', () => {
  assert.match(client, /<div className=\{styles\.connectedAccounts\} aria-labelledby="connected-accounts-title">/);
  assert.match(client, /<h3 id="connected-accounts-title">Contas conectadas<\/h3>/);
  assert.match(client, /className=\{styles\.connectedAccountSelect\}/);
  assert.match(client, /className=\{`\$\{styles\.disconnectAccountButton\} \$\{styles\.compactConnectionButton\}`\}/);
  assert.doesNotMatch(listings, /Conta do Mercado Livre|accountSummary|Desconectar conta/);
  assert.match(css, /\.connectedAccount \{[^}]*border: 1px solid color-mix\([^}]*border-radius: 14px;/);
  assert.match(css, /\.connectedAccountSelected \{ border-color: var\(--brand\);/);
  assert.match(css, /\.dark \.connectedAccount \{[^}]*background:/);
});

test('contas compactas preservam campos, marca da conexão e controles com alvo acessível', () => {
  const cards = client.slice(client.indexOf('displayedAccounts.map'), client.indexOf('</article>; })}</div>'));
  assert.match(cards, /provider.id === \(account.provider \?\? 'mercado_livre'\)/);
  assert.match(cards, /data-provider=\{account.provider \?\? 'mercado_livre'\}/);
  assert.doesNotMatch(cards, /data-provider=\{marketplace\}|provider.id === marketplace/);
  for (const field of ['seller_name', 'seller_reference', 'status', 'last_synced_at']) assert.ok(cards.includes(`account.${field}`));
  assert.match(cards, /pendingSales\[account.id\]/);
  assert.match(cards, /alt=\{accountProvider.name\}/);
  assert.doesNotMatch(cards, /<br\s*\/?>/);
  assert.match(cards, /aria-label=\{`Renovar autorização de \$\{account.seller_name \|\| account.seller_reference\}`\}/);
  assert.match(cards, />Renovar<\/button>/);
  assert.match(cards, /setDisconnectAccount\(account\)/);
  assert.match(cards, /disabled=\{accountSelectionLocked \|\| publicationBusy\} aria-pressed=\{account.id === publicationAccountId\}/);
  assert.match(css, /\.connectedAccount \{ display: grid; grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.connectedAccountSelect \{ display: flex; flex-wrap: wrap;/);
  assert.match(css, /\.connectedAccount > div:is\(\[id\^="account-renewal-"\], \[id\^="account-identification-"\]\) \{ grid-column: 1 \/ -1;/);
  assert.match(css, /\.page \.connectedAccounts \.compactConnectionButton \{ min-height: 44px;/);
  assert.match(css, /\.connectedAccounts \.compactConnectionButton::before \{ inset-block: 8px;/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.connectedAccount \{ grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /\.connectedAccountsTitle > span \{/);
  assert.doesNotMatch(css, /\.connectedAccountsHeading span \{/);
});

test('connecting another marketplace account keeps the existing connections intact', () => {
  assert.match(client, /connectedAccounts\.length \? 'Conectar outra conta' : 'Conectar conta'/);
  assert.doesNotMatch(client, /connect-another-account-help|As contas já conectadas serão mantidas/);
  assert.match(client, /onClick=\{\(\) => void connectMarketplace\(\)\}/);
  assert.match(css, /\.connectionHelp \{ margin: 0; color: #64748b; font-size: 12px; \}/);
});

test('marketplaces and costs reuse the same company header and return action', () => {
  assert.match(client, /<ModuloHeader empresa=\{empresa\} onBack=\{voltar\}/);
  assert.match(read('app/custos/CustosClient.tsx'), /<ModuloHeader empresa=\{access.empresa\}/);
  assert.match(client, /solicitarRetornoAoModuloHospedeiro/);
  assert.match(client, /moduloId=marketplaces/);
  assert.match(read('app/components/ModuloHeader.tsx'), /app\/custos\/custos.module.css/);
});

test('AvantaPreços header action copies the mobile link instead of opening it', () => {
  assert.match(client, /new URL\('\/marketplaces\/consulta', window\.location\.origin\)\.toString\(\)/);
  assert.match(client, /navigator\.clipboard\.writeText\(link\)/);
  assert.match(client, /onClick=\{\(\) => void copyPriceLink\(\)\}/);
  assert.match(client, /Copiar link do AvantaPreços/);
  assert.match(client, /Link copiado/);
  assert.match(client, /aria-live="polite"/);
  assert.doesNotMatch(client, /<a className=\{styles\.marketplaceMobileLink\} href="\/marketplaces\/consulta"/);
  assert.match(css, /\.marketplaceMobileLink \{[^}]*border: 0;[^}]*cursor: pointer;/);
});

test('marketplaces carrega a marca ausente do contexto interno e mantém validação oficial no acesso direto', () => {
  assert.match(client, /import TelaCarregandoAcesso from '@\/app\/components\/TelaCarregandoAcesso'/);
  assert.match(client, /const \[accessState, setAccessState\] = useState<'loading' \| 'ready' \| 'error'>\(\(\) => context \? 'ready' : 'loading'\)/);
  assert.match(client, /async function loadIdentity\(\) \{[\s\S]*?if \(context\?\.empresa\.logoUrl\) return;/);
  assert.match(client, /const needsAccessValidation = !context;/);
  assert.match(client, /if \(needsAccessValidation\) \{\s*setAccessState\('loading'\);/);
  assert.match(client, /if \(!needsAccessValidation\) return;/);
  assert.match(client, /if \(accessState === 'loading'\) \{\s*return <TelaCarregandoAcesso titulo="Validando acesso" mensagem="Confirmando o módulo e seu perfil…" \/>;/);
  assert.match(client, /if \(!response\.ok \|\| !payload\?\.empresa\) throw new Error/);
  assert.match(client, /setAccessState\('ready'\)/);
  assert.match(client, /setAccessState\('error'\)/);
});

test('grid panels fill their track without auto margins, sharing the content wrapper', () => {
  assert.match(client, /<div className=\{styles.content\}>/);
  assert.match(css, /\.grid > \.panel \{ margin: 0; width: 100%; min-width: 0;/);
  assert.doesNotMatch(css, /margin-inline: auto/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.grid \{ grid-template-columns: 1fr;/);
});

test('configuração usa blocos horizontais de largura integral: Marketplace antes de Novo anúncio', () => {
  assert.match(css, /\.grid \{ display: grid; grid-template-columns: minmax\(0, 1fr\); gap: 24px;/);
  assert.doesNotMatch(css, /grid-template-columns: minmax\(0, \.78fr\) minmax\(0, 1\.22fr\)/);
  assert.ok(client.indexOf('<nav className={styles.marketplaceSelector}') < client.indexOf('<NewListing '));
  assert.match(css, /\.providerGrid \{ display: grid; grid-template-columns: repeat\(6, minmax\(0, 1fr\)\);/);
  assert.match(css, /@media \(min-width: 761px\) and \(max-width: 1100px\) \{ \.providerGrid \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.providerGrid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.connectionGeneralActions \{[^}]*flex-wrap: wrap;[^}]*max-width: 100%;/);
});

test('static notices are removed without disguising validation or hiding important errors', () => {
  assert.doesNotMatch(client, /OAuth|PKCE|styles.webOnly|styles.security|styles.flow|Nesta etapa/);
  assert.doesNotMatch(listings, /Para adicionar ou reconectar|Atualização automática enquanto|Anúncios da conta selecionada, inclusive/);
  assert.match(client, /<NewListing key=\{companyId\} companyId=\{companyId\} marketplaceName=\{selectedProvider.name\} accountId=\{publicationAccountId\}/);
  assert.match(newListing, /'Pesquisar'/);
  assert.match(newListing, /EAN não localizado/);
  assert.match(newListing, /'Publicar'/);
  assert.doesNotMatch(client, /Valor de venda/);
  assert.match(listings, /role="alert"/);
  assert.match(listings, /ModalConfirmacao/);
  assert.match(listings, /Esta ação encerra definitivamente/);
  assert.match(listings, /Frete vendedor estimado/);
});

test('a conta de publicação continua própria, independente do filtro de contas dos anúncios', () => {
  assert.match(client, /return connected\[0\]\?\.id \|\| ''/);
  assert.match(client, /accountId=\{publicationAccountId\}/);
  assert.match(newListing, /<MarketplaceAccountPicker label="Publicar na conta"/);
  assert.doesNotMatch(listings, /<MarketplaceAccountPicker label="Conta do Mercado Livre"/);
  assert.match(accountPicker, /<MarketplaceSelect/);
  assert.match(marketplaceSelect, /role="listbox"/);
  assert.match(marketplaceSelect, /role="option"/);
  assert.match(marketplaceSelect, /event\.key === 'Escape'/);
  assert.match(css, /\.selectControl \{ position: relative;/);
  assert.match(css, /\.selectList \{ position: absolute; top: calc\(100% \+ 5px\);/);
});

test('connections load from the persisted company records and OAuth returns without replacing the module page', () => {
  assert.match(client, /const refreshConnections = useCallback/);
  assert.match(client, /if \(accessState !== 'ready'\) return;\s*queueMicrotask/);
  assert.match(client, /askIdentification \? completeNewConnection\(connectedAccountId\) : refreshConnections\(\)/);
  assert.match(client, /window\.open\('', target.popup/);
  assert.match(read('app/marketplaces/connection-target.ts'), /popup: 'avantalab-mercado-livre-oauth'/);
  assert.match(client, /window\.addEventListener\('message', receiveAuthorization\)/);
  assert.match(client, /data\.type !== 'avantalab-marketplace-oauth'/);
  assert.match(read('app/api/modulos/marketplaces/conexoes/mercado-livre/callback/route.ts'), /window\.opener\.postMessage\(message,target\)/);
  assert.match(read('app/api/modulos/marketplaces/conexoes/mercado-livre/callback/route.ts'), /window\.close\(\)/);
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

test('new listing keeps account, a wide EAN field and a compact search action on one desktop row', () => {
  assert.match(newListing, /<div className=\{styles\.form\}>\s*<MarketplaceAccountPicker[\s\S]*?<div className=\{styles\.eanField\}>[\s\S]*?<button type="button" className=\{`\$\{styles\.primary\} \$\{styles\.searchAction\}`\}/);
  assert.match(newListing, /\{searchingBy === 'ean' \? 'Pesquisando…' : 'Pesquisar'\}/);
  assert.match(css, /\.newListing \.form \{ grid-template-columns: minmax\(180px, 1fr\) minmax\(260px, 1\.25fr\) auto; align-items: end;/);
  assert.match(css, /\.newListing \.searchAction \{ min-width: 94px; padding-inline: 14px; \}/);
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
  assert.match(newListing, /<CampoBusca inputRef=\{eanInputRef\} id="new-ean"/);
  assert.match(newListing, /rotuloLimpar="Limpar EAN \/ GTIN"/);
  assert.match(newListing, /function changeEan\(value: string\)/);
  assert.match(css, /\.eanControl :global\(\.avanta-campo-busca-limpar\) \{ right: 46px;/);
  assert.match(css, /\.scannerButton \{[^}]*width: 44px; min-height: 44px;/);
  assert.match(css, /\.scannerButton\[aria-pressed="true"\] \{ color: #fff; background: var\(--brand\); \}/);
  assert.match(read('app/projetos/components/Icon.tsx'), /barcode:.*M4 5v14/);
});

test('cada botão de busca tem indicador e rótulo próprios, mantendo bloqueio concorrente', () => {
  assert.match(newListing, /aria-busy=\{searchingBy === 'ean'\}/);
  assert.match(newListing, /aria-busy=\{searchingBy === 'description'\}/);
  assert.match(newListing, /searchingBy === 'description' \? 'Pesquisando…' : 'Buscar produto'/);
  assert.doesNotMatch(newListing, /preparing \? 'Pesquisando…'/);
  assert.match(newListing, /setSearchingBy\(productId \|\| categoryId \? null : query \? 'description' : 'ean'\)/);
  assert.match(newListing, /finally \{ setPreparing\(false\); setSearchingBy\(null\); \}/);
});

for (const [mode, args, expected] of [
  ['EAN', [], 'ean'],
  ['descrição', ['', '', '', 'account', undefined, 'cooktop mondial'], 'description'],
  ['seleção de ficha', ['', 'MLB123', '', 'account', undefined, 'cooktop mondial'], null],
]) {
  test(`indicador de ${mode} termina após sucesso ou falha sem ativar o outro botão`, async () => {
    const start = newListing.indexOf('  async function prepare(');
    const end = newListing.indexOf('\n  useEffect(', start);
    const source = stripTypeScriptTypes(newListing.slice(start, end));
    for (const fail of [false, true]) {
      let finish;
      const pending = new Promise((resolve, reject) => { finish = () => fail ? reject(new Error('Falha de teste')) : resolve({ result: {} }); });
      const context = {
        canManage: true, accountId: 'account', form: { ean: '7899882306941' },
        preparing: false, publishing: false, activeRef: { current: true }, companyId: 'company',
        searchingBy: null, applied: false,
        marketplaceClientRequest: () => pending,
        setPreparing(value) { context.preparing = value; },
        setSearchingBy(value) { context.searchingBy = value; },
        setScannerArmed() {}, setMessage() {}, setErrors() {}, setPublishedId() {}, setMatched() {}, setPrepared() {},
        applyPreparation() { context.applied = true; },
      };
      const prepare = runInNewContext(`(${source})`, context);
      const request = prepare(...args);
      assert.equal(context.searchingBy, expected);
      assert.equal(context.preparing, true);
      await prepare(...args); // A segunda ação não inicia outra busca.
      assert.equal(context.searchingBy, expected);
      finish(); await request;
      assert.equal(context.searchingBy, null);
      assert.equal(context.preparing, false);
      assert.equal(context.applied, !fail);
    }
  });
}

test('descrição em linha própria usa CampoBusca, Enter e seleção antes de preparar, sem publicar', () => {
  assert.match(newListing, /className=\{styles\.descriptionSearchRow\}/);
  assert.match(newListing, /<label htmlFor="new-search-description">Ou pesquise por nome, marca ou modelo/);
  assert.match(newListing, /<CampoBusca id="new-search-description"[^>]*maxLength=\{120\}/);
  assert.match(newListing, /rotuloLimpar="Limpar pesquisa por descrição"/);
  assert.match(newListing, /event\.key === 'Enter'\) \{ event\.preventDefault\(\); searchByDescription\(\)/);
  assert.match(newListing, /searchDescription\.trim\(\)\.length < 3/);
  assert.match(newListing, /void prepare\('', '', '', accountId, undefined, searchDescription\)/);
  assert.match(newListing, /prepared\.candidates\.length > 0 && !product/);
  assert.match(newListing, /prepared\.query \|\| ''/);
  assert.match(newListing, /!prepared\.ean && !!prepared\.gtins\?\.length/);
  assert.match(newListing, /\{\(prepared\.ean \|\| prepared\.copySource \|\| prepared\.localProductId\) && <><div className=\{styles\.catalogFields\}/);
  assert.match(newListing, /prepared\.copySource \|\| prepared\.localProductId \? 'Produto sem EAN'/);
  assert.match(newListing, /change\('copySource', undefined\)/);
  assert.match(newListing, /function changeEan\(value: string\) \{\s*if \(preparing \|\| publishing\) return;\s*setSearchDescription\(''\)/);
  assert.match(newListing, /function changeSearchDescription\(value: string\) \{\s*if \(preparing \|\| publishing\) return;\s*setSearchDescription\(value\);\s*change\('ean', ''\)/);
  assert.match(css, /\.newListing \.descriptionSearchRow \{ grid-column: 1 \/ -1; display: grid; grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.newListing \.descriptionSearchRow \{ grid-template-columns: 1fr;/);
  const route = read('app/api/modulos/marketplaces/preparar/route.ts');
  assert.match(route, /authorizeMarketplace\(request, body\.empresaId, 'manage'\)/);
  assert.match(route, /loadConnection\(db, empresaId, body\.connectionId\)/);
  assert.match(route, /query: body\.query/);
});

test('category preparation preserves the located product and distinguishes blockers from warnings', () => {
  assert.match(newListing, /if \(!productId && !categoryId\) setPrepared\(null\)/);
  assert.match(newListing, /!prepared\.blockingIssues\?\.length/);
  assert.match(newListing, /prepared\.blockingIssues\.map/);
  assert.match(newListing, /prepared\.warnings\.map/);
  assert.match(newListing, /id="catalog-errors"[^>]*tabIndex=\{-1\}/);
  assert.match(css, /\.catalogWarnings \{ color: #1e4f78; background: #eff6ff;/);
});

test('a publicação pode ser preparada para outra conta com revisão separada', () => {
  assert.match(newListing, /Preparar em outra conta/);
  assert.match(newListing, /A nova conta só recebe o anúncio após uma confirmação separada/);
  assert.match(newListing, /preparar-copia/);
  assert.match(listings, /Publicar em outra conta/);
  assert.match(listings, /Preparar publicação/);
  assert.match(listings, /Nada é publicado nesta etapa/);
  assert.match(client, /onPublishInAnotherAccount/);
});
