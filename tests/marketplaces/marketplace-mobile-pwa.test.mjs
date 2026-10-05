import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const client = read('app/marketplaces/consulta/MarketplaceMobileApp.tsx');
const css = read('app/marketplaces/consulta/marketplaces-mobile.module.css');
const api = read('app/api/modulos/marketplaces/precos/route.ts');
const historyApi = read('app/api/modulos/marketplaces/precos/historico/route.ts');
const migration = read('supabase/migrations/20261005213000_marketplace_price_consultations.sql');

test('PWA reutiliza autenticação, empresa e conexão do módulo sem novo OAuth', () => {
  assert.match(client, /<AuthCard \{\.\.\.auth\}/);
  assert.match(client, /useAuth\(/);
  assert.match(client, /buscarEmpresasDoUsuario/);
  assert.match(client, /avantalab_mobile_ultimo_perfil_id/);
  assert.match(client, /new URLSearchParams\(window\.location\.search\)\.get\('empresaId'\)/);
  assert.match(client, /\/api\/modulos\/marketplaces\/conexoes\?empresaId=/);
  assert.doesNotMatch(client, /oauth|authorizationUrl|conexoes\/mercado-livre\/iniciar/i);
  assert.match(api, /authorizeMarketplace\(request, body\.empresaId, 'view'\)/);
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

test('resultado diferencia os quatro valores e o histórico pode ser reaberto e atualizado', () => {
  for (const text of ['Preço médio Mercado Livre', 'Preço mínimo', 'Preço médio de venda', 'Preço ideal', 'Últimas consultas', 'Consultar novamente']) assert.match(client, new RegExp(text));
  assert.match(client, /setResult\(historyToConsultation\(item\)\)/);
  assert.match(client, /loadHistory\(company\.id\)/);
  assert.match(css, /\.marketPrice \{[^}]*background:/);
  assert.match(css, /\.minimumPrice \{[^}]*background:/);
  assert.match(css, /\.mediumPrice \{[^}]*background:/);
  assert.match(css, /\.idealPrice \{[^}]*background:/);
});

test('seletores de empresa e conta seguem lista ancorada do sistema', () => {
  assert.doesNotMatch(client, /<select|<option/);
  assert.match(client, /role="listbox"/);
  assert.match(client, /role="option"/);
  assert.match(client, /event\.key === 'Escape'/);
  assert.match(css, /\.pickerList \{[^}]*position: absolute;[^}]*top: calc\(100% \+ 5px\);/);
  assert.match(client, /label="Conta usada na consulta"/);
});

test('histórico é isolado por empresa e inacessível diretamente pelo navegador', () => {
  assert.match(historyApi, /authorizeMarketplace\(request, empresaId, 'view'\)/);
  assert.match(historyApi, /\.eq\('empresa_id', empresaId\)/);
  assert.match(migration, /empresa_id uuid not null references public\.empresas/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.marketplace_price_consultations from anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on public\.marketplace_price_consultations to service_role/);
});

test('manifesto, service worker e atalhos tornam o Marketplaces Mobile instalável e acessível pelo módulo', () => {
  assert.match(read('app/marketplaces/consulta/page.tsx'), /manifest: '\/marketplaces\/consulta\/manifest\.webmanifest'/);
  assert.match(read('app/marketplaces/consulta/page.tsx'), /marketplaces-mobile-icon-180\.png/);
  assert.match(read('app/marketplaces/consulta/manifest.webmanifest/route.ts'), /display: 'standalone'/);
  assert.match(read('app/marketplaces/consulta/manifest.webmanifest/route.ts'), /marketplaces-mobile-icon-512\.png/);
  assert.match(read('app/marketplaces/consulta/sw.js/route.ts'), /avantalab-marketplaces-mobile-/);
  assert.match(read('app/marketplaces/MarketplacesClient.tsx'), /href=\{`\/marketplaces\/consulta\?empresaId=\$\{encodeURIComponent\(companyId\)\}`\}/);
});
