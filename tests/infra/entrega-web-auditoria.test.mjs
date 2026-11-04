import assert from 'node:assert/strict';
import test from 'node:test';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { analisarResposta, resumir } from '../../scripts/auditar-entrega-web.mjs';

function resposta(corpo, encoding = '', anterior = '') {
  const body = Buffer.from(corpo);
  const packed = encoding === 'br' ? brotliCompressSync(body) : encoding === 'gzip' ? gzipSync(body) : body;
  const headers = `HTTP/2 200\r\nserver: cloudflare\r\ncontent-type: text/html; charset=utf-8\r\n${encoding ? `content-encoding: ${encoding}\r\n` : ''}cf-cache-status: DYNAMIC\r\n\r\n`;
  return Buffer.concat([Buffer.from(anterior + headers), packed,
    Buffer.from('\n__AVANTA_AUDITORIA_METRICAS__' + JSON.stringify({ http_code: 200, time_starttransfer: 0.1, time_total: 0.2 }))]);
}

for (const encoding of ['', 'br', 'gzip']) {
  test(`auditoria separa cabeçalhos, bytes reais e corpo ${encoding || 'sem compressão'}`, () => {
    const texto = '<html>' + 'conteudo '.repeat(600) + '</html>';
    const r = analisarResposta(resposta(texto, encoding));
    assert.equal(r.body.toString(), texto);
    assert.equal(r.headers.server, 'cloudflare');
    assert.equal(r.metricas.http_code, 200);
    assert.equal(r.bytesTransferidos, encoding ? (encoding === 'br' ? brotliCompressSync(Buffer.from(texto)).length : gzipSync(Buffer.from(texto)).length) : Buffer.byteLength(texto));
    const s = resumir('https://avantalab.com.br/', 'pagina', r);
    assert.equal(s.ttfbMs, 100);
    assert.equal(s.totalMs, 200);
    assert.equal(s.sinais.includes('texto_sem_compressao'), !encoding);
  });
}

test('ignora cabeçalhos intermediários de CONNECT sem misturar corpo e não guarda cookies', () => {
  const raw = resposta('pagina', '', 'HTTP/1.1 200 Connection established\r\nproxy-agent: intermediario\r\n\r\n');
  const r = analisarResposta(raw);
  r.headers['set-cookie'] = 'sessao=nao-exportar';
  assert.equal(r.body.toString(), 'pagina');
  assert.equal(r.headers['proxy-agent'], undefined);
  assert.equal(resumir('https://avantalab.com.br/', 'pagina', r).headers['set-cookie'], undefined);
});

test('sinaliza cache indevido de API, versão, código mobile e worker; não acusa cache de asset com hash', () => {
  const r = analisarResposta(resposta('codigo'));
  r.headers['cf-cache-status'] = 'HIT';
  for (const tipo of ['api_privada', 'versao', 'codigo_mobile', 'service_worker']) {
    assert(resumir('https://avantalab.com.br/', tipo, r).sinais.includes('conteudo_sensivel_ou_mutavel_em_cache_cloudflare'));
  }
  assert(!resumir('https://avantalab.com.br/', 'asset_hash', r).sinais.includes('conteudo_sensivel_ou_mutavel_em_cache_cloudflare'));
});

test('erro de origem e API liberada geram alertas, sem considerar 401 ou 403 falha de autorização', () => {
  const r = analisarResposta(resposta('erro'));
  r.metricas.http_code = 526;
  assert(resumir('https://www.avantalab.com.br/', 'pagina', r).sinais.includes('erro_servidor_ou_origem'));
  for (const status of [401, 403]) {
    r.metricas.http_code = status;
    assert(!resumir('https://avantalab.com.br/api/teste', 'api_privada', r).sinais.includes('revisar_resposta_api_sem_autenticacao'));
  }
  r.metricas.http_code = 200;
  assert(resumir('https://avantalab.com.br/api/teste', 'api_privada', r).sinais.includes('revisar_resposta_api_sem_autenticacao'));
});

test('transporte não segue redirects e não envia credenciais nem métodos mutáveis', () => {
  const codigo = readFileSync(new URL('../../scripts/auditar-entrega-web.mjs', import.meta.url), 'utf8');
  const transporte = codigo.slice(codigo.indexOf('export async function consultar'), codigo.indexOf('export function resumir'));
  assert(!/['"](?:-L|--location|--insecure|-k|--cookie|--cookie-jar|--data|--data-raw|--request|-X)['"]/.test(transporte));
  assert(!/Authorization:|Bearer |Cookie:/.test(transporte));
  assert.match(transporte, /'--proto', '=https'/);
  assert.match(transporte, /'--max-time', '25'/);
});
