/** Os parâmetros só escolhem apresentação. Não concedem acesso. */
export const PARAMETRO_PREPARACAO_ACESSO = 'acessoInicial';

export function prepararDestinoAposLogin(destino: string) {
  const url = new URL(destino, 'https://avantalab.com.br');
  url.searchParams.delete('inicio');
  url.searchParams.set(PARAMETRO_PREPARACAO_ACESSO, '1');
  return `${url.pathname}${url.search}${url.hash}`;
}

export function apagarMarcadoresDePreparacao(...chaves: string[]) {
  const url = new URL(window.location.href);
  if (!chaves.some(chave => url.searchParams.has(chave))) return;
  for (const chave of chaves) url.searchParams.delete(chave);
  window.history.replaceState(null, '', url);
}
