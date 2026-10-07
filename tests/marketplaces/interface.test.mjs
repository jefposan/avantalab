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
  assert.match(client, /className=\{styles\.disconnectAccountButton\}/);
  assert.doesNotMatch(listings, /Conta do Mercado Livre|accountSummary|Desconectar conta/);
  assert.match(css, /\.connectedAccount \{[^}]*border: 1px solid color-mix\([^}]*border-radius: 14px;/);
  assert.match(css, /\.connectedAccountSelected \{ border-color: var\(--brand\);/);
  assert.match(css, /\.dark \.connectedAccount \{[^}]*background:/);
});

test('connecting another marketplace account keeps the existing connections intact', () => {
  assert.match(client, /connectedAccounts\.length \? 'Conectar outra conta' : 'Conectar conta'/);
  assert.match(client, /id="connect-another-account-help" className=\{styles\.connectionHelp\}>As contas já conectadas serão mantidas\./);
  assert.match(client, /aria-describedby=\{connectedAccounts\.length \? 'connect-another-account-help' : undefined\}/);
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

test('marketplaces reutiliza o contexto interno e mantém validação oficial no acesso direto', () => {
  assert.match(client, /import TelaCarregandoAcesso from '@\/app\/components\/TelaCarregandoAcesso'/);
  assert.match(client, /const \[accessState, setAccessState\] = useState<'loading' \| 'ready' \| 'error'>\(\(\) => context \? 'ready' : 'loading'\)/);
  assert.match(client, /async function loadIdentity\(\) \{\s*if \(context\) return;/);
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

test('static notices are removed without disguising validation or hiding important errors', () => {
  assert.doesNotMatch(client, /OAuth|PKCE|styles.webOnly|styles.security|styles.flow|Nesta etapa/);
  assert.doesNotMatch(listings, /Para adicionar ou reconectar|Atualização automática enquanto|Anúncios da conta selecionada, inclusive/);
  assert.match(client, /<NewListing key=\{selectedAccount \|\| 'unselected'\} companyId=/);
  assert.match(newListing, /'Pesquisar'/);
  assert.match(newListing, /EAN não localizado/);
  assert.match(newListing, /'Publicar'/);
  assert.doesNotMatch(client, /Valor de venda/);
  assert.match(listings, /role="alert"/);
  assert.match(listings, /ModalConfirmacao/);
  assert.match(listings, /Esta ação encerra definitivamente/);
  assert.match(listings, /Frete vendedor estimado/);
});

test('the publication account field uses the standard dropdown and listings use the selected account from card one', () => {
  assert.match(client, /return connected\[0\]\?\.id \|\| ''/);
  assert.match(client, /accountId=\{selectedAccount\}/);
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
  assert.match(client, /if \(accessState !== 'ready'\) return;\s*void refreshConnections\(\)/);
  assert.match(client, /window\.open\('', 'avantalab-mercado-livre-oauth'/);
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
  assert.match(newListing, /\{preparing \? 'Pesquisando…' : 'Pesquisar'\}/);
  assert.match(css, /\.newListing \.form \{ grid-template-columns: minmax\(0, 1fr\) minmax\(260px, 1\.25fr\) auto; align-items: end;/);
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

test('category preparation preserves the located product and distinguishes blockers from warnings', () => {
  assert.match(newListing, /if \(!productId && !categoryId\) setPrepared\(null\)/);
  assert.match(newListing, /!prepared\.blockingIssues\?\.length/);
  assert.match(newListing, /prepared\.blockingIssues\.map/);
  assert.match(newListing, /prepared\.warnings\.map/);
  assert.match(newListing, /id="catalog-errors"[^>]*tabIndex=\{-1\}/);
  assert.match(css, /\.catalogWarnings \{ color: #1e4f78; background: #eff6ff;/);
});
