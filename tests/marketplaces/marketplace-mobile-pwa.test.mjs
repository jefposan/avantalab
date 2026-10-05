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
const viewportShell = read('app/marketplaces/consulta/viewport-shell.css');
const viewportValidationPage = read('app/marketplaces/consulta/validacao-visual/page.tsx');

test('PWA reutiliza autenticação, empresa e conexão do módulo sem novo OAuth', () => {
  assert.match(client, /signInWithPassword/);
  assert.match(client, /Digite seu login/);
  assert.doesNotMatch(client, /Google|CPF|tipoLogin/);
  assert.match(client, /avantalab_marketplaces_mobile_empresa_id/);
  assert.match(client, /localStorage\.setItem\(SESSION_COMPANY_KEY/);
  assert.match(client, /localStorage\.removeItem\(SESSION_COMPANY_KEY/);
  assert.match(client, /setAccess\('choose-company'\)/);
  assert.match(client, /\/api\/modulos\/marketplaces\/precos\/contexto\?empresaId=/);
  assert.doesNotMatch(client, /oauth|authorizationUrl|conexoes\/mercado-livre\/iniciar/i);
  assert.match(api, /authorizePriceConsultation\(request, body\.empresaId\)/);
  assert.match(priceAccess, /marketplace_price_users/);
  assert.match(accessMigration, /revoke all on public\.marketplace_price_users from anon, authenticated/);
  assert.match(api, /resolveMercadoLivreConnection/);
});

test('leitor usa formatos EAN e só consulta após confirmação explícita', () => {
  assert.match(client, /BarcodeFormat\.EAN_13/);
  assert.match(client, /BarcodeFormat\.EAN_8/);
  assert.match(client, /facingMode: \{ ideal: 'environment' \}/);
  assert.match(client, /Código lido com sucesso/);
  assert.match(client, />Consultar<\/button>/);
  assert.match(client, /onConsult=\{\(value\) =>/);
  assert.match(css, /\.scanWindow \{[^}]*height: 108px;/);
  assert.match(css, /\.cameraShade \{[^}]*background:/);
});

test('nova leitura de EAN descarta a pesquisa anterior antes de abrir a câmera', () => {
  const action = client.match(/const startEanReading = \(\) => \{([\s\S]*?)\n  \};/)?.[1] || '';
  for (const reset of ["setEan('')", "setQuery('')", 'setPendingInput({})', 'setCandidates([])', 'setResult(null)', "setError('')"]) assert.ok(action.includes(reset), `A ação deve executar ${reset}`);
  assert.match(action, /setScannerOpen\(true\)/);
  assert.match(client, /className=\{styles\.scanButton\} onClick=\{startEanReading\}/);
});

test('resultado diferencia os quatro valores e o histórico pode ser reaberto e atualizado', () => {
  for (const text of ['Preço médio Mercado Livre', 'Preço mínimo', 'Preço médio de venda', 'Preço ideal', 'Últimas consultas', 'Consultar novamente']) assert.match(client, new RegExp(text));
  assert.match(client, /setResult\(historyToConsultation\(item\)\)/);
  assert.match(client, /loadHistory\(company\.id\)/);
  assert.match(css, /\.marketPrice \{[^}]*background:/);
  assert.match(css, /\.minimumPrice \{[^}]*background:/);
  assert.match(css, /\.mediumPrice \{[^}]*background:/);
  assert.match(css, /\.idealPrice \{[^}]*background:/);
  assert.match(client, /aria-label="Atualizar histórico" title="Atualizar histórico"/);
  assert.match(client, /M21 12a9 9 0 0 1-15 6\.7L3 16/);
  assert.match(client, /M3 12a9 9 0 0 1 15-6\.7L21 8/);
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
});

test('manifesto, service worker e atalhos tornam o Marketplaces Mobile instalável e acessível pelo módulo', () => {
  assert.match(pwaPage, /manifest: '\/marketplaces\/consulta\/manifest\.webmanifest'/);
  assert.match(pwaPage, /marketplaces-mobile-icon-180\.png/);
  assert.match(pwaManifest, /display: 'standalone'/);
  assert.match(pwaManifest, /marketplaces-mobile-icon-512\.png/);
  assert.match(read('app/marketplaces/consulta/sw.js/route.ts'), /avantalab-marketplaces-mobile-/);
  assert.match(read('app/marketplaces/MarketplacesClient.tsx'), /href="\/marketplaces\/consulta"/);
  assert.match(pwaManifest, /short_name: 'AvantaPreços'/);
});

test('barra de status do iPhone segue o topo sólido do PWA Recebimentos', () => {
  assert.match(pwaPage, /statusBarStyle: 'default'/);
  assert.doesNotMatch(pwaPage, /black-translucent/);
  assert.doesNotMatch(pwaPage, /interactiveWidget/);
  assert.doesNotMatch(receiptsPwaPage, /interactiveWidget/);
  assert.match(pwaPage, /themeColor: '#003E73'/);
  assert.match(pwaManifest, /background_color: '#003E73'/);
  assert.match(pwaManifest, /theme_color: '#003E73'/);
});

test('AvantaPreços replica a estrutura de viewport do Recebimentos sem camadas paralelas', () => {
  assert.match(css, /\.page \{[^}]*position: relative;[^}]*--avanta-safe-top: env\(safe-area-inset-top\);[^}]*min-height: 100dvh;[^}]*background-position: center bottom;[^}]*background-size: cover;[^}]*background-attachment: fixed;/);
  assert.match(css, /\.topbar \{[^}]*top: 0;[^}]*background: color-mix\(in srgb, var\(--brand\) 96%, #000\);/);
  assert.match(css, /\.topbarInner \{[^}]*padding: calc\(14px \+ var\(--avanta-safe-top\)\) 16px 14px;/);
  assert.match(css, /\.topbarMobile \.topbarInner \{[^}]*min-height: calc\(76px \+ var\(--avanta-safe-top\)\);/);
  assert.match(css, /\.loginWrap \{[^}]*--avanta-access-viewport-height: 100dvh;[^}]*--avanta-access-safe-extension: 0px;[^}]*min-height: calc\(var\(--avanta-access-viewport-height\) \+ var\(--avanta-access-safe-extension\)\);[^}]*background-image: image-set\([^}]*background-position: center bottom;[^}]*background-size: cover;[^}]*background-attachment: fixed;/);
  assert.match(css, /@media \(max-width: 1023px\) \{ \.page, \.loginWrap \{[^}]*background-size: 100% auto;/);
  assert.match(css, /@media \(max-width: 1023px\) and \(min-aspect-ratio: 9\/16\), \(max-width: 1023px\) and \(max-aspect-ratio: 9\/18\) \{ \.page, \.loginWrap \{[^}]*background-size: auto 100%;/);
  assert.match(css, /@media \(display-mode: standalone\) and \(max-width: 1023px\) \{ \.loginWrap \{[^}]*--avanta-access-safe-extension: env\(safe-area-inset-top\);/);
  assert.match(css, /@supports \(-webkit-touch-callout: none\) \{ \.page, \.loginWrap \{[^}]*background-attachment: scroll;/);
  assert.match(viewportShell, /html:has\(\[data-avantaprecos-viewport='access'\]\) \{[^}]*background-color: #eef6fb;[^}]*background-image: none;/);
  assert.match(viewportShell, /body:has\(\[data-avantaprecos-viewport='access'\]\) \{[^}]*background: transparent;/);
  assert.match(viewportShell, /html:has\(\[data-avantaprecos-viewport='ready'\]\),\s*body:has\(\[data-avantaprecos-viewport='ready'\]\) \{[^}]*background-color: #003e73;/);
  assert.doesNotMatch(viewportShell, /bg-avantalab-mobile|background-position|background-size|background-attachment/);
  assert.match(client, /data-avantaprecos-viewport="access"/);
  assert.match(client, /data-avantaprecos-viewport="ready"/);
  assert.doesNotMatch(client, /document\.documentElement|document\.body|avantaprecos-pwa-root/);
  assert.match(pwaPage, /import '\.\/viewport-shell\.css'/);
  assert.match(pwaPage, /rel="preload"[\s\S]*bg-avantalab-mobile-1080x1920-sem-logo\.webp/);
});

test('rota isolada valida login, carregamento e cabeçalho com área segura simulada', () => {
  assert.match(viewportValidationPage, /estado === 'pronto'/);
  assert.match(viewportValidationPage, /estado === 'carregando'/);
  assert.match(viewportValidationPage, /'--avanta-safe-top': '47px'/);
  assert.match(viewportValidationPage, /'--avanta-access-viewport-height': 'calc\(100dvh - 62px\)'/);
  assert.match(viewportValidationPage, /'--avanta-access-safe-extension': '62px'/);
  assert.match(viewportValidationPage, /className=\{styles\.loginWrap\} data-avantaprecos-viewport="access"/);
  assert.match(viewportValidationPage, /className=\{styles\.page\} data-avantaprecos-viewport="ready"/);
  assert.match(viewportValidationPage, /className=\{`\$\{styles\.topbar\} \$\{styles\.topbarMobile\}`\}/);
  assert.match(viewportValidationPage, /robots: \{ index: false, follow: false \}/);
});
