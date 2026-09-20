export const EVENTO_ABERTURA_PUSH_MOBILE = 'avantalab:push-mobile-aberto';

export type DestinoPushMobile = {
  href: string;
  mesmoDocumento: boolean;
};

function rotaGestaoMobilePermitida(pathname: string) {
  return pathname === '/mobile' || pathname.startsWith('/mobile/');
}

/**
 * Mantém o push dentro da Gestão Mobile e identifica quando basta atualizar a
 * URL atual, sem reiniciar o WebView nem disputar a restauração da sessão.
 */
export function resolverDestinoPushMobile(
  hrefAtual: string,
  destinoRecebido: unknown,
): DestinoPushMobile | null {
  try {
    const atual = new URL(hrefAtual);
    const valor = typeof destinoRecebido === 'string' && destinoRecebido.trim()
      ? destinoRecebido.trim()
      : '/mobile';
    const destino = new URL(valor, atual.origin);

    if (destino.origin !== atual.origin || !rotaGestaoMobilePermitida(destino.pathname)) {
      return null;
    }

    return {
      href: `${destino.pathname}${destino.search}${destino.hash}`,
      mesmoDocumento: destino.pathname === atual.pathname,
    };
  } catch {
    return null;
  }
}
