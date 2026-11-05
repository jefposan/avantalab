import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import { OPCOES_MOBILE, reduzirScriptMobile } from '../../scripts/gerar-mobile-otimizado.mjs';
const require = createRequire(import.meta.url);
const { minify } = require('next/dist/compiled/terser');
const fonte = await readFile(new URL('../../public/mobile-app.js', import.meta.url), 'utf8');
const reduzido = await reduzirScriptMobile(fonte);

test('redução só de formatação, sem compressão lógica ou renomeação', () => {
  assert.equal(OPCOES_MOBILE.compress, false);
  assert.equal(OPCOES_MOBILE.mangle, false);
  assert.ok(Buffer.byteLength(reduzido) < Buffer.byteLength(fonte) * .9);
});
test('runtime completo mantém a representação canônica do programa original', async () => {
  const opcoes = { compress: false, mangle: false, format: { beautify: true, comments: false, ascii_only: true } };
  assert.equal((await minify(reduzido, opcoes)).code, (await minify(fonte, opcoes)).code);
});
test('símbolos, strings, callbacks e licenças preservados', async () => {
  const fixture = `/*! licença preservada */\n(function(){var permissao=false;
    function tokenSessao(){return 'áç😀';} function autorizar(permitido){return permitido?tokenSessao():null;}
    globalThis.resultado={bloqueado:autorizar(permissao),liberado:autorizar(true),nome:tokenSessao.name};})();`;
  const codigo = await reduzirScriptMobile(fixture);
  assert.match(codigo, /licen/);
  const a = {}, b = {};
  vm.runInNewContext(fixture, a); vm.runInNewContext(codigo, b);
  assert.equal(JSON.stringify(a.resultado), JSON.stringify(b.resultado));
  assert.equal(b.resultado.bloqueado, null);
  assert.equal(b.resultado.nome, 'tokenSessao');
});
test('mesmas URLs e cache protegido; desenvolvimento com fonte legível', async () => {
  const { default: config } = await import('../../next.config.ts');
  const modo = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.deepEqual((await config.rewrites()).beforeFiles, [{ source: '/mobile-app.js', destination: '/mobile-runtime/mobile-app.js' }]);
    process.env.NODE_ENV = 'development';
    assert.deepEqual((await config.rewrites()).beforeFiles, []);
  } finally {
    if (modo === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = modo;
  }
  const headers = await config.headers();
  for (const path of ['/mobile-app.js', '/mobile-runtime/:path*']) {
    const valores = headers.find(item => item.source === path)?.headers;
    for (const key of ['Cache-Control', 'Cloudflare-CDN-Cache-Control', 'CDN-Cache-Control']) {
      assert.match(valores?.find(item => item.key === key)?.value || '', /no-store/);
    }
  }
});
test('build gera distribuição depois das verificações e antes do Next', async () => {
  const pacote = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.match(pacote.scripts.build, /verificar-notificacoes-perfil\.mjs && node scripts\/gerar-mobile-otimizado\.mjs && (?:node scripts\/gerar-vendas-otimizado\.mjs && )?next build/);
});
