export const AVANTAVENDAS_APP_STORE_URL_PADRAO = 'https://apps.apple.com/br/app/avantavendas/id6797617650';
export const AVANTAVENDAS_PLAY_STORE_URL_PADRAO = 'https://play.google.com/store/apps/details?id=br.com.avantalab.vendas&pcampaignid=web_share';
export const AVANTAVENDAS_DOWNLOAD_PATH = '/baixar/avantavendas';
export const AVANTAVENDAS_DOWNLOAD_PUBLIC_URL = `https://avantalab.com.br${AVANTAVENDAS_DOWNLOAD_PATH}`;

export type DispositivoDownloadAvantaVendas = 'ios' | 'android' | 'outro';
export type DestinoDownloadAvantaVendas = 'app_store' | 'google_play' | 'pagina_intermediaria';
export type LojaDownloadAvantaVendas = 'ios' | 'android';

export type ParametrosCampanhaAvantaVendas = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

type AmbienteDownloads = Record<string, string | undefined>;
type ParametrosEntrada = URLSearchParams | Record<string, string | string[] | undefined>;

export type LinksDownloadAvantaVendas = {
  appStoreUrl: string;
  playStoreUrl: string;
};

export type PlanoDownloadAvantaVendas = {
  dispositivo: DispositivoDownloadAvantaVendas;
  destino: DestinoDownloadAvantaVendas;
  url: string | null;
  links: LinksDownloadAvantaVendas;
};

function urlOficial(valor: string | undefined, padrao: string, hostEsperado: string) {
  try {
    const url = new URL(String(valor || '').trim());
    if (url.protocol !== 'https:' || url.hostname !== hostEsperado || !url.pathname || url.pathname === '/') throw new Error('URL inválida');
    return url.toString();
  } catch {
    return padrao;
  }
}

export function obterLinksDownloadAvantaVendas(ambiente: AmbienteDownloads = process.env): LinksDownloadAvantaVendas {
  return {
    appStoreUrl: urlOficial(ambiente.AVANTAVENDAS_APP_STORE_URL, AVANTAVENDAS_APP_STORE_URL_PADRAO, 'apps.apple.com'),
    playStoreUrl: urlOficial(ambiente.AVANTAVENDAS_PLAY_STORE_URL, AVANTAVENDAS_PLAY_STORE_URL_PADRAO, 'play.google.com'),
  };
}

export function identificarDispositivoDownloadAvantaVendas(userAgent: string | null | undefined): DispositivoDownloadAvantaVendas {
  const agente = String(userAgent || '');
  if (/\b(iPad|iPhone|iPod)\b/i.test(agente) || (/\bMacintosh\b/i.test(agente) && /\bMobile\b/i.test(agente))) return 'ios';
  if (/\bAndroid\b/i.test(agente)) return 'android';
  return 'outro';
}

export function normalizarParametrosDownloadAvantaVendas(entrada: ParametrosEntrada): URLSearchParams {
  if (entrada instanceof URLSearchParams) return new URLSearchParams(entrada);

  const parametros = new URLSearchParams();
  Object.entries(entrada).forEach(([chave, valor]) => {
    if (Array.isArray(valor)) valor.forEach((item) => parametros.append(chave, item));
    else if (typeof valor === 'string') parametros.append(chave, valor);
  });
  return parametros;
}

export function extrairParametrosCampanhaAvantaVendas(entrada: ParametrosEntrada): ParametrosCampanhaAvantaVendas {
  const parametros = normalizarParametrosDownloadAvantaVendas(entrada);
  const valor = (chave: string) => {
    const recebido = parametros.get(chave)?.trim() || '';
    return recebido ? recebido.slice(0, 255) : null;
  };
  return {
    utmSource: valor('utm_source'),
    utmMedium: valor('utm_medium'),
    utmCampaign: valor('utm_campaign'),
    utmContent: valor('utm_content'),
    utmTerm: valor('utm_term'),
  };
}

export function criarUrlLojaAvantaVendas(urlLoja: string, entrada: ParametrosEntrada) {
  const destino = new URL(urlLoja);
  normalizarParametrosDownloadAvantaVendas(entrada).forEach((valor, chave) => {
    if (!destino.searchParams.has(chave)) destino.searchParams.append(chave, valor);
  });
  return destino.toString();
}

export function criarUrlEscolhaLojaAvantaVendas(loja: LojaDownloadAvantaVendas, entrada: ParametrosEntrada) {
  const destino = new URL(`${AVANTAVENDAS_DOWNLOAD_PATH}/ir/${loja}`, 'https://avantalab.com.br');
  destino.search = normalizarParametrosDownloadAvantaVendas(entrada).toString();
  return destino.toString();
}

export function planejarDownloadAvantaVendas({
  userAgent,
  parametros,
  ambiente,
}: {
  userAgent?: string | null;
  parametros: ParametrosEntrada;
  ambiente?: AmbienteDownloads;
}): PlanoDownloadAvantaVendas {
  const links = obterLinksDownloadAvantaVendas(ambiente);
  const dispositivo = identificarDispositivoDownloadAvantaVendas(userAgent);
  if (dispositivo === 'ios') return { dispositivo, destino: 'app_store', url: criarUrlLojaAvantaVendas(links.appStoreUrl, parametros), links };
  if (dispositivo === 'android') return { dispositivo, destino: 'google_play', url: criarUrlLojaAvantaVendas(links.playStoreUrl, parametros), links };
  return { dispositivo, destino: 'pagina_intermediaria', url: null, links };
}

export function lojaParaDestinoDownloadAvantaVendas(loja: LojaDownloadAvantaVendas): DestinoDownloadAvantaVendas {
  return loja === 'ios' ? 'app_store' : 'google_play';
}

export async function executarRegistroDownloadSemBloquear(registrar: () => Promise<unknown>) {
  try {
    await registrar();
    return true;
  } catch {
    return false;
  }
}
