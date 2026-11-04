import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { SCRIPTS_VENDAS } from '../../scripts/gerar-vendas-otimizado.mjs';
import { reduzirScriptMobile } from '../../scripts/gerar-mobile-otimizado.mjs';

const require = createRequire(import.meta.url);
const { minify } = require('next/dist/compiled/terser');
for (const arquivo of SCRIPTS_VENDAS) {
  test(`${arquivo}: programa integral equivalente, símbolos e chamadas preservados`, async () => {
    const fonte = await readFile(new URL('../../app/avantavendas/sistema/' + arquivo, import.meta.url), 'utf8');
    const compacto = await reduzirScriptMobile(fonte);
    const opcoes = { compress: false, mangle: false, format: { beautify: true, comments: false, ascii_only: true } };
    assert.equal((await minify(compacto, opcoes)).code, (await minify(fonte, opcoes)).code);
    assert.ok(Buffer.byteLength(compacto) < Buffer.byteLength(fonte));
  });
}

const rota = await readFile(new URL('../../app/avantavendas/recursos/[...arquivo]/route.ts', import.meta.url), 'utf8');
const codigo = ts.transpileModule(rota, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, resolveJsonModule: true } }).outputText;
function servidor({ modo = 'production', ausente = false } = {}) {
  const lidos = [];
  const ctx = vm.createContext({ exports: {}, Response, URL,
    process: { cwd: () => '/fixture', env: { NODE_ENV: modo } },
    require(nome) {
      if (nome === 'node:path') return path;
      if (nome.includes('scripts-proprios.json')) return SCRIPTS_VENDAS;
      if (nome.includes('version')) return { AVANTAVENDAS_VERSION: '3.2.0.30-av190' };
      if (nome === 'node:fs/promises') return {
        stat: async () => ({ isFile: () => true }),
        readFile: async caminho => {
          lidos.push(caminho);
          if (ausente && caminho.includes('runtime-compacto')) throw Error('Artefato ausente');
          return caminho.includes('runtime-compacto') ? 'compacto' : 'original';
        },
      };
      throw Error('Import inesperado: ' + nome);
    },
  });
  vm.runInContext(codigo, ctx);
  return { lidos, get: (arquivo, query = '') => ctx.exports.GET(new Request('https://vendas.test/avantavendas/recursos/' + arquivo + query), { params: Promise.resolve({ arquivo: arquivo.split('/') }) }) };
}
test('revisão atual compacta cada script; cache imutável e MIME preservados', async () => {
  const s = servidor();
  for (const nome of SCRIPTS_VENDAS) {
    const r = await s.get(nome, '?v=3.2.0.30-av190');
    assert.equal(await r.text(), 'compacto');
    assert.match(r.headers.get('cache-control'), /immutable/);
    assert.equal(r.headers.get('content-type'), 'application/javascript; charset=utf-8');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  }
});
test('URL sem versão compacta sem cache imutável; versão anterior conserva fonte original', async () => {
  const s = servidor();
  const atual = await s.get('app.js');
  assert.equal(await atual.text(), 'compacto');
  assert.doesNotMatch(atual.headers.get('cache-control'), /immutable/);
  assert.equal(await (await s.get('app.js', '?v=3.2.0.29-av189')).text(), 'original');
});
test('desenvolvimento, bibliotecas, CSS e recurso de voz não são recompostos', async () => {
  assert.equal(await (await servidor({ modo: 'development' }).get('app.js')).text(), 'original');
  for (const nome of ['vendor/supabase.min.js', 'styles.css', 'avanta-voice-actions.js']) {
    assert.equal(await (await servidor().get(nome, '?v=3.2.0.30-av190')).text(), 'original');
  }
});
test('artefato ausente preserva acesso com original; traversal continua bloqueado', async () => {
  assert.equal(await (await servidor({ ausente: true }).get('app.js', '?v=3.2.0.30-av190')).text(), 'original');
  const s = servidor();
  assert.equal((await s.get('../../../../.env.local')).status, 404);
  assert.equal(s.lidos.length, 0);
});
test('build gera ambas entregas e inclui explicitamente os compactos no pacote serverless', async () => {
  const pacote = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.match(pacote.scripts.build, /gerar-mobile-otimizado\.mjs && node scripts\/gerar-vendas-otimizado\.mjs && next build/);
  const { default: config } = await import('../../next.config.ts');
  assert.ok(config.outputFileTracingIncludes['/avantavendas/recursos/*'].includes('./app/avantavendas/runtime-compacto/*.js'));
});
