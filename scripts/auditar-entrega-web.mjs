// Auditoria pública e somente leitura. Não envia cookies, credenciais ou gravações.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const executar = promisify(execFile);
const MARCADOR = '\n__AVANTA_AUDITORIA_METRICAS__';
const CABECALHOS = ['server', 'content-type', 'content-encoding', 'cache-control',
  'cdn-cache-control', 'cloudflare-cdn-cache-control', 'cf-cache-status', 'age',
  'etag', 'vary', 'strict-transport-security', 'x-content-type-options',
  'referrer-policy', 'content-security-policy', 'x-frame-options',
  'permissions-policy', 'x-powered-by', 'x-vercel-cache', 'location', 'alt-svc'];

export function analisarResposta(buffer) {
  const fim = buffer.lastIndexOf(Buffer.from(MARCADOR));
  if (fim < 0) throw new Error('Resposta sem métricas do curl.');
  const metricas = JSON.parse(buffer.subarray(fim + Buffer.byteLength(MARCADOR)).toString());
  let offset = 0;
  let headers = {};
  while (buffer.subarray(offset, offset + 5).toString() === 'HTTP/') {
    const limite = buffer.indexOf(Buffer.from('\r\n\r\n'), offset);
    if (limite < 0 || limite >= fim) throw new Error('Cabeçalhos incompletos.');
    const linhas = buffer.subarray(offset, limite).toString().split('\r\n');
    headers = {};
    for (const linha of linhas.slice(1)) {
      const indice = linha.indexOf(':');
      if (indice > 0) headers[linha.slice(0, indice).toLowerCase()] = linha.slice(indice + 1).trim();
    }
    offset = limite + 4;
  }
  const transmitido = buffer.subarray(offset, fim);
  const encoding = headers['content-encoding'];
  const body = encoding === 'br' ? brotliDecompressSync(transmitido)
    : encoding === 'gzip' ? gunzipSync(transmitido)
      : encoding === 'deflate' ? inflateSync(transmitido) : transmitido;
  return { metricas, headers, body, bytesTransferidos: transmitido.length };
}

export async function consultar(url, extras = []) {
  // Sem -L: não segue redirecionamento para terceiros e não aciona OAuth.
  const { stdout } = await executar('curl', ['--silent', '--show-error',
    '--connect-timeout', '8', '--max-time', '25', '--max-filesize', '16000000',
    '--proto', '=https', '--header', 'Accept-Encoding: br, gzip',
    '--header', 'User-Agent: AvantaLab-Delivery-Audit/1.0',
    '--dump-header', '-', '--write-out', `${MARCADOR}%{json}`, ...extras, url],
  { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 });
  return analisarResposta(stdout);
}

export function resumir(url, tipo, resposta) {
  const { headers, body, metricas, bytesTransferidos } = resposta;
  const sinais = [];
  if (!headers.server?.includes('cloudflare')) sinais.push('proxy_cloudflare_nao_confirmado');
  if (!headers['strict-transport-security']) sinais.push('sem_hsts');
  if (!headers['x-content-type-options']) sinais.push('sem_nosniff');
  if (!headers['referrer-policy']) sinais.push('sem_referrer_policy_explicita');
  if (metricas.http_code >= 500) sinais.push('erro_servidor_ou_origem');
  if (body.length > 2048 && /text\/|javascript|json/.test(headers['content-type'] || '') &&
    !headers['content-encoding']) sinais.push('texto_sem_compressao');
  if (['codigo_mobile', 'service_worker', 'versao', 'api_privada'].includes(tipo) &&
    /^(HIT|STALE|UPDATING|REVALIDATED)$/.test(headers['cf-cache-status'] || '')) {
    sinais.push('conteudo_sensivel_ou_mutavel_em_cache_cloudflare');
  }
  if (tipo === 'api_privada' && ![401, 403].includes(metricas.http_code)) {
    sinais.push('revisar_resposta_api_sem_autenticacao');
  }
  if (tipo === 'pagina' && /rocket-loader\.min\.js|text\/rocketscript/.test(body.toString())) {
    sinais.push('rocket_loader_presente');
  }
  return { url, tipo, status: metricas.http_code,
    bytesDescompactados: body.length, bytesTransferidos,
    reducaoPercentual: body.length ? Math.round((1 - bytesTransferidos / body.length) * 100) : 0,
    ttfbMs: Math.round(metricas.time_starttransfer * 1000),
    totalMs: Math.round(metricas.time_total * 1000),
    headers: Object.fromEntries(CABECALHOS.filter(k => headers[k]).map(k => [k, headers[k]])), sinais };
}

const ALVOS = [
  ['avantalab.com.br', '/', 'pagina'],
  ['www.avantalab.com.br', '/', 'pagina'],
  ['avantalab.com.br', '/gestao', 'pagina'],
  ['avantalab.com.br', '/modulos', 'pagina'],
  ['avantalab.com.br', '/ponto', 'pagina'],
  ['avantalab.com.br', '/custos', 'pagina'],
  ['avantalab.com.br', '/projetos', 'pagina'],
  ['avantalab.com.br', '/marketplaces', 'pagina'],
  ['avantalab.com.br', '/marketplaces/consulta', 'pagina'],
  ['avantalab.com.br', '/vendas', 'pagina'],
  ['avantalab.com.br', '/recebimentos', 'pagina'],
  ['avantalab.com.br', '/admin', 'pagina'],
  ['app.avantalab.com.br', '/mobile', 'pagina'],
  ['app.avantalab.com.br', '/mobile-app.js', 'codigo_mobile'],
  ['app.avantalab.com.br', '/mobile-supabase.js', 'codigo_mobile'],
  ['app.avantalab.com.br', '/mobile-sw.js', 'service_worker'],
  ['app.avantalab.com.br', '/mobile/versao', 'versao'],
  ['app.avantalab.com.br', '/mobile-manifest.json', 'manifesto'],
  ['avantalab.com.br', '/sw.js', 'service_worker'],
  ['vendas.avantalab.com.br', '/', 'pagina'],
  ['vendas.avantalab.com.br', '/avantavendas/sw.js', 'service_worker'],
  ['vendas.avantalab.com.br', '/avantavendas/versao', 'versao'],
  ['vendas.avantalab.com.br', '/avantavendas/recursos/app.js', 'codigo_vendas'],
  ['vendas.avantalab.com.br', '/avantavendas/recursos/styles.css', 'css_vendas'],
  ['admin.avantalab.com.br', '/', 'pagina'],
  ['ponto.avantalab.com.br', '/', 'pagina'],
  ['recebimentos.avantalab.com.br', '/', 'pagina'],
  ['avantalab.com.br', '/api/acessos-usuario', 'api_privada'],
  ['avantalab.com.br', '/api/usuarios-empresa?empresaId=00000000-0000-4000-8000-000000000000', 'api_privada'],
  ['avantalab.com.br', '/api/modulos/marketplaces/conexoes?empresaId=00000000-0000-4000-8000-000000000000', 'api_privada'],
];

async function paralelos(itens, tratar) {
  let indice = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (indice < itens.length) await tratar(itens[indice++]);
  }));
}

async function main() {
  const resultados = [];
  const assets = new Set();
  await paralelos(ALVOS, async ([host, caminho, tipo]) => {
    const url = `https://${host}${caminho}`;
    try {
      const resposta = await consultar(url);
      resultados.push(resumir(url, tipo, resposta));
      if (tipo === 'pagina' && resposta.metricas.http_code === 200) {
        const html = resposta.body.toString();
        const recursos = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
          .map(m => m[1].replaceAll('&amp;', '&'))
          .filter(p => p.startsWith('/_next/static/') && /\.(js|css|woff2)(?:\?|$)/.test(p));
        // Amostra determinística por página; não simula uma sessão autenticada.
        for (const ext of ['.js', '.css', '.woff2']) {
          const p = recursos.find(p => p.includes(ext));
          if (p) assets.add(`https://${host}${p}`);
        }
      }
    } catch (e) { resultados.push({ url, tipo, erro: String(e.message).slice(0, 400) }); }
  });
  await paralelos([...assets], async url => {
    try { resultados.push(resumir(url, 'asset_hash', await consultar(url))); }
    catch (e) { resultados.push({ url, tipo: 'asset_hash', erro: String(e.message).slice(0, 400) }); }
  });
  // Segunda leitura distingue MISS de ausência de cache; não prova latência em celular.
  const aquecer = resultados.filter(r => r.tipo === 'asset_hash' && r.status === 200).slice(0, 4);
  await paralelos(aquecer, async item => {
    try { resultados.push(resumir(item.url, 'asset_hash_releitura', await consultar(item.url))); }
    catch (e) { resultados.push({ url: item.url, tipo: 'asset_hash_releitura', erro: String(e.message).slice(0, 400) }); }
  });
  const relatorio = { dataUtc: new Date().toISOString(),
    escopo: 'GETs públicos sem cookies/tokens, sem purga ou alteração remota. Não audita sessão autenticada, regras privadas do painel ou banco.',
    resultados: resultados.sort((a, b) => a.url.localeCompare(b.url) || a.tipo.localeCompare(b.tipo)) };
  const saida = process.argv[2];
  if (saida) await writeFile(saida, JSON.stringify(relatorio, null, 2) + '\n', { mode: 0o600 });
  const sinais = {};
  for (const item of resultados) for (const sinal of item.sinais || []) sinais[sinal] = (sinais[sinal] || 0) + 1;
  console.log(JSON.stringify({ relatorio: saida || null, consultas: resultados.length,
    erros: resultados.filter(r => r.erro), sinais,
    amostras: resultados.filter(r => r.tipo !== 'asset_hash').map(r => ({url: r.url, status:r.status,
      kb: Math.round((r.bytesDescompactados || 0) / 1024), kbRede:Math.round((r.bytesTransferidos || 0) / 1024),
      compressao:r.headers?.['content-encoding'], cache:r.headers?.['cf-cache-status'], ttfbMs:r.ttfbMs})) }, null, 2));
  if (!saida) console.log(JSON.stringify(relatorio, null, 2));
  if (resultados.some(r => r.erro || r.status >= 500)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
