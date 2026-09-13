import { createPrivateKey, sign } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { criarSupabaseAdmin } from './admin-server';
import { ehDownloadInicialApple, lerRelatorioApple, lerRelatorioGoogle } from './downloads-lojas-relatorios';

export { ehDownloadInicialApple, lerRelatorioApple, lerRelatorioGoogle } from './downloads-lojas-relatorios';

export const APLICATIVOS_LOJAS = ['avantalab', 'avantavendas'] as const;
export const LOJAS_DOWNLOADS = ['apple_app_store', 'google_play'] as const;

export type AplicativoLoja = typeof APLICATIVOS_LOJAS[number];
export type LojaDownload = typeof LOJAS_DOWNLOADS[number];

type RegistroDownloadDiario = {
  aplicativo: AplicativoLoja;
  loja: LojaDownload;
  data_referencia: string;
  downloads: number;
  fonte: string;
  atualizado_em: string;
};

type ResumoLoja = {
  downloads: number | null;
  atualizadoEm: string | null;
  dataMaisRecente: string | null;
};


const APPLE_IDS: Record<AplicativoLoja, string> = {
  avantalab: '6793744930',
  avantavendas: '6797617650',
};

const PACOTES_GOOGLE: Record<AplicativoLoja, string> = {
  avantalab: process.env.GOOGLE_PLAY_PACKAGE_AVANTALAB || 'br.com.avantalab.app',
  avantavendas: process.env.GOOGLE_PLAY_PACKAGE_AVANTAVENDAS || 'br.com.avantalab.vendas',
};

const DIAS_JANELA = 90;
const FONTE_APPLE = 'apple_sales_report_v2';

type ResultadoSincronizacaoLoja = {
  loja: LojaDownload;
  ok: boolean;
  configurado?: boolean;
  registros?: number;
  erro?: string;
};

let sincronizacaoEmAndamento: Promise<ResultadoSincronizacaoLoja[]> | null = null;

function base64Url(valor: Buffer | string) {
  return Buffer.from(valor).toString('base64url');
}

function dataIsoUTC(data: Date) {
  return data.toISOString().slice(0, 10);
}

function inicioDaJanela(dias = DIAS_JANELA) {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() - (dias - 1));
  return dataIsoUTC(data);
}

function jwtApple() {
  const issuer = process.env.APPLE_APP_STORE_CONNECT_ISSUER_ID;
  const keyId = process.env.APPLE_APP_STORE_CONNECT_KEY_ID;
  const chave = process.env.APPLE_APP_STORE_CONNECT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!issuer || !keyId || !chave) return null;
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64Url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const carga = base64Url(JSON.stringify({ iss: issuer, iat: agora, exp: agora + 1_100, aud: 'appstoreconnect-v1' }));
  const assinatura = sign('sha256', Buffer.from(`${cabecalho}.${carga}`), { key: createPrivateKey(chave), dsaEncoding: 'ieee-p1363' });
  return `${cabecalho}.${carga}.${base64Url(assinatura)}`;
}

function descompactarRespostaApple(conteudo: Uint8Array) {
  const comprimido = conteudo[0] === 0x1f && conteudo[1] === 0x8b;
  return (comprimido ? gunzipSync(conteudo) : Buffer.from(conteudo)).toString('utf8');
}

async function buscarRelatorioApple(data: string) {
  const token = jwtApple();
  const vendorNumber = process.env.APPLE_APP_STORE_VENDOR_NUMBER;
  if (!token || !vendorNumber) return null;
  const parametros = new URLSearchParams({
    'filter[frequency]': 'DAILY',
    'filter[reportDate]': data,
    'filter[reportSubType]': 'SUMMARY',
    'filter[reportType]': 'SALES',
    'filter[vendorNumber]': vendorNumber,
  });
  const resposta = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${parametros}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/a-gzip' },
    cache: 'no-store',
  });
  if (resposta.status === 404) return [];
  if (!resposta.ok) throw new Error(`Apple respondeu ${resposta.status}.`);
  return lerRelatorioApple(descompactarRespostaApple(new Uint8Array(await resposta.arrayBuffer())));
}

function jwtGoogle(chave: { client_email: string; private_key: string }) {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const carga = base64Url(JSON.stringify({
    iss: chave.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_only',
    aud: 'https://oauth2.googleapis.com/token',
    iat: agora,
    exp: agora + 3_300,
  }));
  const assinatura = sign('RSA-SHA256', Buffer.from(`${cabecalho}.${carga}`), createPrivateKey(chave.private_key));
  return `${cabecalho}.${carga}.${base64Url(assinatura)}`;
}

async function tokenGoogle() {
  const bruto = process.env.GOOGLE_PLAY_REPORTS_SERVICE_ACCOUNT_JSON;
  if (!bruto) return null;
  const chave = JSON.parse(bruto) as { client_email?: string; private_key?: string };
  if (!chave.client_email || !chave.private_key) throw new Error('A credencial do Google Play está incompleta.');
  const resposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwtGoogle(chave as { client_email: string; private_key: string }) }),
    cache: 'no-store',
  });
  if (!resposta.ok) throw new Error(`Google OAuth respondeu ${resposta.status}.`);
  const resultado = await resposta.json() as { access_token?: string };
  if (!resultado.access_token) throw new Error('Google OAuth não devolveu token de acesso.');
  return resultado.access_token;
}

async function objetosGoogle(token: string) {
  const bucket = process.env.GOOGLE_PLAY_REPORTS_BUCKET;
  if (!bucket) return [] as string[];
  const prefixo = process.env.GOOGLE_PLAY_REPORTS_PREFIX || 'stats/installs/';
  const parametros = new URLSearchParams({ prefix: prefixo, maxResults: '1000' });
  const resposta = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${parametros}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!resposta.ok) throw new Error(`Google Cloud Storage respondeu ${resposta.status}.`);
  const resultado = await resposta.json() as { items?: Array<{ name?: string }> };
  return (resultado.items || []).map((item) => item.name || '').filter(Boolean);
}

async function baixarObjetoGoogle(token: string, objeto: string) {
  const bucket = process.env.GOOGLE_PLAY_REPORTS_BUCKET!;
  const resposta = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objeto)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!resposta.ok) throw new Error(`Não foi possível baixar o relatório do Google (${resposta.status}).`);
  return resposta.text();
}

function datasParaBuscar(ultimaData: string | null) {
  const inicio = ultimaData && ultimaData >= inicioDaJanela() ? ultimaData : inicioDaJanela();
  const datas: string[] = [];
  const cursor = new Date(`${inicio}T00:00:00.000Z`);
  const fim = new Date();
  while (cursor <= fim) {
    datas.push(dataIsoUTC(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return datas;
}

async function salvarRegistros(registros: RegistroDownloadDiario[]) {
  if (!registros.length) return;
  const db = criarSupabaseAdmin();
  const { error } = await db.from('lojas_downloads_diarios').upsert(registros, { onConflict: 'aplicativo,loja,data_referencia' });
  if (error) throw error;
}

async function ultimaData(aplicativo: AplicativoLoja, loja: LojaDownload, fonte?: string) {
  const db = criarSupabaseAdmin();
  let consulta = db.from('lojas_downloads_diarios').select('data_referencia').eq('aplicativo', aplicativo).eq('loja', loja);
  if (fonte) consulta = consulta.eq('fonte', fonte);
  const { data, error } = await consulta.order('data_referencia', { ascending: false }).limit(1).maybeSingle();
  if (error && error.code !== '42P01' && error.code !== 'PGRST205') throw error;
  return data?.data_referencia || null;
}

export async function sincronizarDownloadsApple() {
  if (!jwtApple() || !process.env.APPLE_APP_STORE_VENDOR_NUMBER) return { configurado: false, registros: 0 };
  // A versão da fonte força uma única reprocessamento da janela depois de uma
  // correção de interpretação, sem repetir o histórico em cada cron diário.
  const dataInicial = await ultimaData('avantavendas', 'apple_app_store', FONTE_APPLE);
  const datas = datasParaBuscar(dataInicial);
  const agora = new Date().toISOString();
  const registros: RegistroDownloadDiario[] = [];
  for (const data of datas) {
    const linhas = await buscarRelatorioApple(data);
    if (linhas === null) break;
    for (const aplicativo of APLICATIVOS_LOJAS) {
      const downloads = linhas
        .filter((linha) => linha.appleId === APPLE_IDS[aplicativo] && ehDownloadInicialApple(linha.tipoProduto))
        .reduce((total, linha) => total + linha.unidades, 0);
      registros.push({ aplicativo, loja: 'apple_app_store', data_referencia: data, downloads: Math.max(0, downloads), fonte: FONTE_APPLE, atualizado_em: agora });
    }
  }
  await salvarRegistros(registros);
  return { configurado: true, registros: registros.length };
}

export async function sincronizarDownloadsGoogle() {
  const token = await tokenGoogle();
  if (!token || !process.env.GOOGLE_PLAY_REPORTS_BUCKET) return { configurado: false, registros: 0 };
  const inicio = inicioDaJanela();
  const objetos = (await objetosGoogle(token)).filter((objeto) => /(^|\/)installs_.*_\d{6}_country\.csv$/i.test(objeto));
  const porChave = new Map<string, number>();
  for (const objeto of objetos) {
    const mes = objeto.match(/_(\d{6})_country\.csv$/i)?.[1] || '';
    if (mes && `${mes.slice(0, 4)}-${mes.slice(4)}-01` < inicio.slice(0, 8) + '01') continue;
    const linhas = lerRelatorioGoogle(await baixarObjetoGoogle(token, objeto));
    for (const linha of linhas) {
      const aplicativo = (Object.entries(PACOTES_GOOGLE).find(([, pacote]) => pacote === linha.pacote)?.[0] || null) as AplicativoLoja | null;
      if (!aplicativo || linha.data < inicio) continue;
      const chave = `${aplicativo}:${linha.data}`;
      porChave.set(chave, (porChave.get(chave) || 0) + linha.instalacoes);
    }
  }
  const agora = new Date().toISOString();
  const registros = [...porChave.entries()].map(([chave, downloads]) => {
    const [aplicativo, data] = chave.split(':') as [AplicativoLoja, string];
    return { aplicativo, loja: 'google_play' as const, data_referencia: data, downloads: Math.max(0, downloads), fonte: 'google_play_bulk_report', atualizado_em: agora };
  });
  await salvarRegistros(registros);
  return { configurado: true, registros: registros.length };
}

export async function sincronizarDownloadsDasLojas() {
  if (sincronizacaoEmAndamento) return sincronizacaoEmAndamento;
  sincronizacaoEmAndamento = Promise.allSettled([sincronizarDownloadsApple(), sincronizarDownloadsGoogle()])
    .then((resultados) => resultados.map((resultado, indice) => ({
      loja: indice === 0 ? 'apple_app_store' as const : 'google_play' as const,
      ok: resultado.status === 'fulfilled',
      ...(resultado.status === 'fulfilled' ? resultado.value : { erro: resultado.reason instanceof Error ? resultado.reason.message : 'Falha desconhecida.' }),
    })))
    .finally(() => {
      sincronizacaoEmAndamento = null;
    });
  return sincronizacaoEmAndamento;
}

export async function resumoDownloadsDasLojas(): Promise<Record<AplicativoLoja, Record<LojaDownload, ResumoLoja>>> {
  const vazio: Record<AplicativoLoja, Record<LojaDownload, ResumoLoja>> = {
    avantalab: { apple_app_store: { downloads: null, atualizadoEm: null, dataMaisRecente: null }, google_play: { downloads: null, atualizadoEm: null, dataMaisRecente: null } },
    avantavendas: { apple_app_store: { downloads: null, atualizadoEm: null, dataMaisRecente: null }, google_play: { downloads: null, atualizadoEm: null, dataMaisRecente: null } },
  };
  const db = criarSupabaseAdmin();
  const { data, error } = await db.from('lojas_downloads_diarios').select('aplicativo, loja, downloads, data_referencia, atualizado_em').gte('data_referencia', inicioDaJanela());
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return vazio;
    throw error;
  }
  for (const registro of data || []) {
    if (!APLICATIVOS_LOJAS.includes(registro.aplicativo as AplicativoLoja) || !LOJAS_DOWNLOADS.includes(registro.loja as LojaDownload)) continue;
    const destino = vazio[registro.aplicativo as AplicativoLoja][registro.loja as LojaDownload];
    destino.downloads = (destino.downloads || 0) + Number(registro.downloads || 0);
    if (!destino.dataMaisRecente || registro.data_referencia > destino.dataMaisRecente) destino.dataMaisRecente = registro.data_referencia;
    if (!destino.atualizadoEm || registro.atualizado_em > destino.atualizadoEm) destino.atualizadoEm = registro.atualizado_em;
  }
  return vazio;
}
