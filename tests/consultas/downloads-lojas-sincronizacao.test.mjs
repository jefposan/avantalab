import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as relatorios from '../../app/lib/downloads-lojas-relatorios.ts';

function servidor({ fetch, env = {} }) {
  const gravados = [];
  const consulta = { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
    maybeSingle: async () => ({ data: { data_referencia: new Date().toISOString().slice(0, 10) }, error: null }),
    upsert: async (linhas) => { gravados.push(...JSON.parse(JSON.stringify(linhas))); return { error: null }; } };
  const exports = {};
  const codigo = ts.transpileModule(readFileSync('app/lib/downloads-lojas-servidor.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(codigo, { exports, Buffer, process: { env }, Date, URLSearchParams, TextDecoder, Uint8Array, fetch,
    require: nome => {
      if (nome === 'node:crypto') return { createPrivateKey: () => ({}), sign: () => Buffer.from('assinatura-simulada') };
      if (nome === 'node:zlib') return { gunzipSync: buffer => buffer };
      if (nome === './admin-server') return { criarSupabaseAdmin: () => ({ from: () => consulta }) };
      if (nome === './downloads-lojas-relatorios') return relatorios;
      throw new Error(`Dependência inesperada: ${nome}`);
    },
  });
  return { ...exports, gravados };
}

test('sincronização Google lê UTF-16 das duas páginas e grava somente o pacote da fonte', async () => {
  const data = new Date().toISOString().slice(0, 10);
  const mes = data.slice(0, 7).replace('-', '');
  const nomes = [`stats/installs/installs_br.com.avantalab.vendas_${mes}_country.csv`, `stats/installs/installs_outro.app_${mes}_country.csv`];
  let paginas = 0;
  const app = servidor({
    env: { GOOGLE_PLAY_REPORTS_BUCKET: 'bucket-simulado', GOOGLE_PLAY_REPORTS_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'teste@example.com', private_key: 'simulada' }) },
    fetch: async (url) => {
      if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'simulado' });
      const u = new URL(url);
      if (u.searchParams.get('alt') === 'media') {
        const pacote = decodeURIComponent(u.pathname).includes('installs_br.com.avantalab.vendas_') ? 'br.com.avantalab.vendas' : 'outro.app';
        const csv = `Date,Package Name,Country,Daily Device Installs\r\n${data},${pacote},BR,3\r\n${data},${pacote},US,2`;
        return new Response(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(csv, 'utf16le')]));
      }
      paginas += 1;
      return Response.json(u.searchParams.has('pageToken') ? { items: [{ name: nomes[1] }] } : { items: [{ name: nomes[0] }], nextPageToken: 'segunda' });
    },
  });
  assert.equal((await app.sincronizarDownloadsGoogle()).registros, 1);
  assert.equal(paginas, 2);
  assert.equal(app.gravados.length, 1);
  assert.equal(app.gravados[0].aplicativo, 'avantavendas');
  assert.equal(app.gravados[0].downloads, 5);
  assert.equal(app.gravados[0].data_referencia, data);
});

test('Apple 403 informa recusa da chave e não grava zero nem avança o histórico', async () => {
  const app = servidor({ env: { APPLE_APP_STORE_CONNECT_ISSUER_ID: 'issuer', APPLE_APP_STORE_CONNECT_KEY_ID: 'key',
    APPLE_APP_STORE_CONNECT_PRIVATE_KEY: 'simulada', APPLE_APP_STORE_VENDOR_NUMBER: 'vendor' },
    fetch: async () => new Response('{}', { status: 403 }),
  });
  await assert.rejects(app.sincronizarDownloadsApple(), /403 em \d{4}-\d{2}-\d{2}/);
  assert.equal(app.gravados.length, 0);
});

test('Apple distingue contrato pendente pela resposta oficial e não afirma falta de permissão', async () => {
  const app = servidor({ env: { APPLE_APP_STORE_CONNECT_ISSUER_ID: 'issuer', APPLE_APP_STORE_CONNECT_KEY_ID: 'key',
    APPLE_APP_STORE_CONNECT_PRIVATE_KEY: 'simulada', APPLE_APP_STORE_VENDOR_NUMBER: 'vendor' },
    fetch: async () => Response.json({ errors: [{ code: 'FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED',
      detail: 'This request requires an in-effect agreement that has not been signed or has expired.' }] }, { status: 403 }),
  });
  await assert.rejects(app.sincronizarDownloadsApple(), erro => {
    assert.match(erro.message, /REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED/);
    assert.match(erro.message, /in-effect agreement/);
    assert.doesNotMatch(erro.message, /não tem acesso/);
    return true;
  });
  assert.equal(app.gravados.length, 0);
});
