import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const client = read('app/marketplaces/consulta/MarketplaceMobileApp.tsx');
const css = read('app/marketplaces/consulta/marketplaces-mobile.module.css');
const api = read('app/api/modulos/marketplaces/precos/route.ts');
const historyApi = read('app/api/modulos/marketplaces/precos/historico/route.ts');
const migration = read('supabase/migrations/20261005213000_marketplace_price_consultations.sql');
const accessMigration = read('supabase/migrations/20261006090000_avantaprecos_users.sql');
const priceAccess = read('app/modules/marketplaces/services/price-access.ts');
const pwaPage = read('app/marketplaces/consulta/page.tsx');
const pwaManifest = read('app/marketplaces/consulta/manifest.webmanifest/route.ts');
const receiptsPwaPage = read('app/recebimentos/colaborador/page.tsx');
const receiptsCss = read('app/recebimentos/recebimentos.module.css');
const viewportShell = read('app/marketplaces/consulta/viewport-shell.css');
const viewportValidationPage = read('app/marketplaces/consulta/validacao-visual/page.tsx');

test('PWA reutiliza autenticação, empresa e conexão do módulo sem novo OAuth', () => {
  assert.match(client, /signInWithPassword/);
  assert.match(client, /Digite seu login/);
  assert.doesNotMatch(client, /Continuar com Google|CPF|tipoLogin/);
  assert.match(client, /avantalab_marketplaces_mobile_empresa_id/);
  assert.match(client, /localStorage\.setItem\(SESSION_COMPANY_KEY/);
  assert.match(client, /localStorage\.removeItem\(SESSION_COMPANY_KEY/);
  assert.match(client, /setAccess\('choose-company'\)/);
  assert.match(client, /\/api\/modulos\/marketplaces\/precos\/contexto\?empresaId=/);
  assert.doesNotMatch(client, /oauth|authorizationUrl|conexoes\/mercado-livre\/iniciar/i);
  assert.match(api, /authorizePriceConsultation\(request, input\.empresaId\)/);
  assert.match(priceAccess, /marketplace_price_users/);
  assert.match(accessMigration, /revoke all on public\.marketplace_price_users from anon, authenticated/);
  assert.match(api, /resolveMercadoLivreConnection/);
  assert.match(api, /sealPendingContinuation/);
  assert.match(client, /continuation/);
  assert.match(client, /acompanhando a coleta de ofertas automaticamente/);
});

test('leitor pede somente a permissão nativa e só consulta após confirmação explícita', () => {
  assert.match(client, /BarcodeFormat\.EAN_13/);
  assert.match(client, /BarcodeFormat\.EAN_8/);
  assert.match(client, /facingMode: \{ ideal: 'environment' \}/);
  assert.match(client, /Código lido com sucesso/);
  assert.match(client, /A permissão nativa precisa nascer no gesto de "Ler EAN"/);
  assert.match(client, /void navigator\.mediaDevices\.getUserMedia\(/);
  assert.match(client, /stream\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.doesNotMatch(client, /CAMERA_ACCESS_KEY|Ativar câmera/);
  assert.match(client, /Libere-a nos ajustes do aparelho/);
  assert.match(client, />Consultar<\/button>/);
  assert.match(client, /onConsult=\{\(value\) =>/);
  assert.match(css, /\.scanWindow \{[^}]*height: 108px;/);
  assert.match(css, /\.cameraShade \{[^}]*background:/);
  assert.match(css, /\.cameraPrompt \{[^}]*position: absolute;/);
  assert.doesNotMatch(css, /\.cameraPrompt button/);
});

test('nova leitura de EAN descarta a pesquisa anterior antes de abrir a câmera', () => {
  const action = client.match(/const startEanReading = \(\) => \{([\s\S]*?)\n  \};/)?.[1] || '';
  for (const reset of ["setEan('')", "setQuery('')", 'setPendingInput({})', 'setCandidates([])', 'setResult(null)', "setError('')"]) assert.ok(action.includes(reset), `A ação deve executar ${reset}`);
  assert.match(action, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(action, /setScannerOpen\(true\)/);
  assert.match(client, /className=\{styles\.scanButton\} onClick=\{startEanReading\}/);
});

test('resultado diferencia os quatro valores e o histórico pode ser reaberto, ajustado e pesquisado novamente', () => {
  for (const text of ['Média dos até 5 menores preços', 'Preço mínimo', 'Preço médio de venda', 'Preço ideal', 'Últimas consultas', 'Consultar novamente', 'Atualizar cálculos', 'Produtos precificados', 'Registrar cálculo manual']) assert.match(client, new RegExp(text));
  assert.match(client, /openHistoryResult\(item/);
  assert.match(client, /loadHistory\(company\.id\)/);
  assert.match(client, /historyId: result\.historyId/);
  assert.match(client, /view=catalog&sort=/);
  assert.match(client, /CampoBusca/);
  assert.match(client, /correspondeBusca/);
  assert.match(css, /\.marketPrice \{[^}]*background:/);
  assert.match(css, /\.minimumPrice \{[^}]*background:/);
  assert.match(css, /\.mediumPrice \{[^}]*background:/);
  assert.match(css, /\.idealPrice \{[^}]*background:/);
  assert.match(client, /aria-label="Atualizar histórico" title="Atualizar histórico"/);
  assert.match(client, /M21 12a9 9 0 0 1-15 6\.7L3 16/);
  assert.match(client, /M3 12a9 9 0 0 1 15-6\.7L21 8/);
});

test('Consultar novamente usa somente a pesquisa web OpenAI e preserva as fontes', () => {
  const historyBranch = api.match(/if \(input\.historyId\) \{([\s\S]*?)\n    \}\n    const connection = await resolveMercadoLivreConnection/)?.[1] || '';
  assert.match(historyBranch, /refreshHistoryPrice\(db, empresaId, input\.historyId\)/);
  assert.doesNotMatch(historyBranch, /resolveMercadoLivreConnection|consultMercadoLivrePrice/);
  assert.match(api, /consultOpenAIWebPrices\(\{ ean: stored\.ean, productName: stored\.product_name \}\)/);
  assert.match(api, /source_offers: lookup\.sample\.offers/);
  assert.match(client, /Ofertas usadas no cálculo/);
  assert.match(client, /href=\{offer\.url\}/);
});

test('falha ao consultar novamente permanece no resultado aberto, não no dashboard', () => {
  assert.match(client, /const \[resultError, setResultError\] = useState\(''\)/);
  assert.match(client, /const isHistoryRefresh = Boolean\(input\.historyId\)/);
  assert.match(client, /if \(isHistoryRefresh\) setResultError\(message\); else setError\(message\);/);
  const resultPage = client.match(/\{result\?\.status === 'found'[\s\S]*?<\/section> : pricedProductsOpen/)?.[0] || '';
  assert.match(resultPage, /\{resultError && <p className=\{styles\.error\} role="alert">\{resultError\}<\/p>\}/);
});

test('início prioriza a consulta manual, compacta o leitor e deixa o catálogo antes das últimas consultas', () => {
  const manual = client.indexOf('id="manual-title">Consultar manualmente');
  const scan = client.indexOf('className={styles.scanSection}');
  const priced = client.indexOf('>Ver produtos precificados</button>');
  const history = client.indexOf('id="history-title">Últimas consultas');
  assert.ok(manual > -1 && scan > manual, 'A leitura por câmera deve vir após a consulta manual.');
  assert.ok(priced > scan && history > priced, 'O catálogo completo deve anteceder as últimas consultas.');
  assert.match(css, /\.scanButton \{[^}]*min-height: 105px;/);
});

test('login do AvantaPreços segue a composição aprovada e o padrão do Recebimentos', () => {
  assert.doesNotMatch(client, /className=\{styles\.loginIcon\}/);
  assert.match(client, /<h1 id="avantaprecos-login-title">AvantaPreços<\/h1>/);
  assert.match(client, /aria-pressed=\{showPassword\}/);
  assert.match(client, /name=\{showPassword \? 'eyeOff' : 'eye'\}/);
  assert.match(client, /className=\{styles\.loginSubmitTarget\}/);
  assert.match(css, /\.loginWrap \{[^}]*min-height: calc\(var\(--avanta-access-viewport-height\) \+ var\(--avanta-access-safe-extension\)\);[^}]*grid-template-rows: minmax\(0,1fr\) auto minmax\(0,1fr\);/);
  assert.match(css, /\.brandLogo \{[^}]*grid-row: 1;[^}]*margin-top: env\(safe-area-inset-top\);/);
  assert.match(css, /\.loginContent \{[^}]*grid-row: 2;/);
  assert.match(css, /\.loginCard \{[^}]*width: min\(100%, 336px\);/);
  assert.match(css, /\.loginCard h1 \{[^}]*text-align: center;/);
  assert.match(css, /\.loginSubmit \{[^}]*height: 36px;[^}]*background: #1687d9;/);
});

test('seletores de empresa e conta seguem lista ancorada do sistema', () => {
  assert.doesNotMatch(client, /<select|<option/);
  assert.match(client, /role="listbox"/);
  assert.match(client, /role="option"/);
  assert.match(client, /event\.key === 'Escape'/);
  assert.match(css, /\.pickerList \{[^}]*position: absolute;[^}]*top: calc\(100% \+ 5px\);/);
  assert.match(client, /label="Conta usada na consulta"/);
  assert.doesNotMatch(client, /label="Empresa ativa"/);
  assert.match(client, /Selecione o perfil que será usado nesta sessão/);
  assert.match(client, /Consulta rápida de produtos e preços/);
});

test('histórico é isolado por empresa e inacessível diretamente pelo navegador', () => {
  assert.match(historyApi, /authorizePriceConsultation\(request, empresaId\)/);
  assert.match(historyApi, /\.eq\('empresa_id', empresaId\)/);
  assert.match(migration, /empresa_id uuid not null references public\.empresas/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.marketplace_price_consultations from anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on public\.marketplace_price_consultations to service_role/);
  assert.match(historyApi, /searchParams\.get\('view'\) === 'catalog'/);
  assert.match(historyApi, /limit\(ean \? 1 : catalog \? 1_000 : 20\)/);
});

test('manifesto, service worker e cópia do endereço tornam o AvantaPreços instalável e compartilhável pelo módulo', () => {
  assert.match(pwaPage, /manifest: '\/marketplaces\/consulta\/manifest\.webmanifest'/);
  assert.match(pwaPage, /marketplaces-mobile-icon-180\.png/);
  assert.match(pwaManifest, /display: 'standalone'/);
  assert.match(pwaManifest, /marketplaces-mobile-icon-512\.png/);
  assert.match(read('app/marketplaces/consulta/sw.js/route.ts'), /avantalab-marketplaces-mobile-/);
  const moduleClient = read('app/marketplaces/MarketplacesClient.tsx');
  assert.match(moduleClient, /new URL\('\/marketplaces\/consulta', window\.location\.origin\)\.toString\(\)/);
  assert.match(moduleClient, /navigator\.clipboard\.writeText\(link\)/);
  assert.doesNotMatch(moduleClient, /href="\/marketplaces\/consulta"/);
  assert.match(pwaManifest, /short_name: 'AvantaPreços'/);
});

test('barra de status do iPhone usa o mesmo modelo do PWA Recebimentos', () => {
  assert.match(pwaPage, /statusBarStyle: 'default'/);
  assert.doesNotMatch(pwaPage, /statusBarStyle: 'black-translucent'/);
  assert.match(receiptsPwaPage, /statusBarStyle: 'default'/);
  assert.doesNotMatch(pwaPage, /interactiveWidget/);
  assert.doesNotMatch(receiptsPwaPage, /interactiveWidget/);
  assert.match(pwaPage, /themeColor: '#003E73'/);
  assert.match(pwaManifest, /background_color: '#003E73'/);
  assert.match(pwaManifest, /theme_color: '#003E73'/);
});

test('AvantaPreços e Recebimentos usam o mesmo componente de topo e o mesmo CSS de página', () => {
  const shared = read('app/recebimentos/components/ColaboradorTopbar.tsx');
  const receiptsClient = read('app/recebimentos/ColaboradorApp.tsx');
  assert.match(shared, /import styles from '..\/recebimentos\.module\.css'/);
  for (const name of ['topbar', 'topbarColaborador', 'topbarInner', 'brand', 'brandTitle', 'brandEmpresa', 'topbarAcoesColaborador']) {
    assert.ok(shared.includes(`styles.${name}`));
  }
  assert.match(shared, /\{children\}/);
  assert.match(receiptsClient, /import ColaboradorTopbar from '.\/components\/ColaboradorTopbar'/);
  assert.match(receiptsClient, /<ColaboradorTopbar nomeDoPerfil=\{nomeDoPerfil\} descricaoDaOperacao=\{descricaoDaOperacao\}>/);
  assert.match(client, /import ColaboradorTopbar from '@\/app\/recebimentos\/components\/ColaboradorTopbar'/);
  assert.match(client, /import recebimentosStyles from '@\/app\/recebimentos\/recebimentos\.module\.css'/);
  assert.match(client, /className=\{`\$\{recebimentosStyles.page\} \$\{styles.page\}`\}/);
  assert.match(client, /<ColaboradorTopbar/);
  assert.match(client, /recebimentosStyles.btnGhost/);
  assert.doesNotMatch(css, /\.(?:topbar|topbarInner|topbarMobile|brandTitle|brandSubtitle|logoutButton)\b/);
  assert.match(css, /\.page \{ --brand: var\(--cp\); --accent: #21aaa5; --ink: #152033; \}/);
  assert.doesNotMatch(css, /--avanta-status-inset-top/);
  assert.doesNotMatch(viewportShell, /data-avantaprecos-viewport='ready'/);
  assert.doesNotMatch(shared, /safe-area|backdrop-filter|style=/);
  assert.match(receiptsCss, /\.topbarColaborador \.topbarInner \{[^}]*min-height: 76px;[^}]*padding-block: 14px;/);
  assert.match(css, /@media \(max-width: 1023px\) \{ \.loginWrap \{/);
  assert.doesNotMatch(css, /\.page, \.loginWrap/);
});

test('rota de validação reutiliza o topo real sem inserir outra área segura', () => {
  assert.match(viewportValidationPage, /estado === 'pronto'/);
  assert.match(viewportValidationPage, /estado === 'carregando'/);
  assert.match(viewportValidationPage, /import ColaboradorTopbar from '@\/app\/recebimentos\/components\/ColaboradorTopbar'/);
  assert.match(viewportValidationPage, /<ColaboradorTopbar/);
  assert.match(viewportValidationPage, /recebimentosStyles.page/);
  assert.doesNotMatch(viewportValidationPage, /headerSafeStyle|--avanta-status-inset-top|styles.topbar/);
  assert.match(viewportValidationPage, /statusBarStyle: 'default'/);
  assert.match(viewportValidationPage, /robots: \{ index: false, follow: false \}/);
});
