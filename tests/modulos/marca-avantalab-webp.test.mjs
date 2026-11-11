import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import sharp from 'sharp';
const root = new URL('../../', import.meta.url);
const ler = path => readFileSync(new URL(path, root), 'utf8');

for (const tema of ['positivo', 'negativo']) for (const slogan of ['com', 'sem']) {
  test('WebP institucional ' + tema + ' ' + slogan + ' slogan mantém transparência e proporção', async () => {
    const path = new URL('public/images/avantalab-' + tema + '-' + slogan + '-slogan-20261110.webp', root);
    const m = await sharp(path.pathname).metadata();
    assert.equal(m.format, 'webp');
    assert.equal(m.width, 1000);
    assert.equal(m.height, slogan === 'com' ? 228 : 165);
    assert.equal(m.hasAlpha, true);
    assert.ok(statSync(path).size < 11000);
  });
}
test('acessos, páginas públicas e caches usam a nova marca sem alterar logos dos perfis', () => {
  for (const f of ['app/components/AuthCard.tsx', 'app/components/TelaCarregandoAcesso.tsx', 'app/mobile/page.tsx', 'public/mobile-app.js', 'public/ponto-app.js', 'public/mobile-sw.js', 'public/recebimentos-sw.js']) {
    assert.match(ler(f), /avantalab-positivo-com-slogan-20261110\.webp/);
    assert.doesNotMatch(ler(f), /\/images\/logo-avantalab-oficial\.png/);
  }
  assert.match(ler('app/components/PublicSeoPage.tsx'), /avantalab-negativo-com-slogan-20261110\.webp/);
  assert.match(ler('app/components/AppHeader.tsx'), /src=\{logoUrl\}/);
});
