const CHAVE_RETORNO_OAUTH = 'avantalab.oauth.retorno';
const CHAVE_LOGIN_SOCIAL_PENDENTE = 'avantalab_gestao_login_social_pendente';
const VALIDADE_RETORNO_OAUTH_MS = 15 * 60 * 1000;
const DESTINO_GESTAO = '/gestao';

type RetornoOAuth = {
  destino: typeof DESTINO_GESTAO;
  criadoEm: number;
};

function podeUsarSessao(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

/**
 * Registra a tela que iniciou o OAuth. O provedor continua voltando para a
 * raiz pública, mas a sessão confirmada segue imediatamente para a Gestão.
 */
export function registrarRetornoOauthGestao(): void {
  if (!podeUsarSessao()) return;

  const retorno: RetornoOAuth = { destino: DESTINO_GESTAO, criadoEm: Date.now() };
  window.sessionStorage.setItem(CHAVE_RETORNO_OAUTH, JSON.stringify(retorno));
}

export function lerRetornoOauthPendente(): string | null {
  if (!podeUsarSessao()) return null;

  try {
    const salvo = window.sessionStorage.getItem(CHAVE_RETORNO_OAUTH);
    if (!salvo) return null;

    const retorno = JSON.parse(salvo) as Partial<RetornoOAuth>;
    const valido = retorno.destino === DESTINO_GESTAO
      && typeof retorno.criadoEm === 'number'
      && Date.now() - retorno.criadoEm <= VALIDADE_RETORNO_OAUTH_MS;

    if (valido) return DESTINO_GESTAO;
  } catch {
    // Registro inválido é removido abaixo e não interfere no acesso público.
  }

  limparRetornoOauthPendente();
  return null;
}

export function limparRetornoOauthPendente(): void {
  if (!podeUsarSessao()) return;
  window.sessionStorage.removeItem(CHAVE_RETORNO_OAUTH);
}

export function limparEstadoRetornoOauthGestao(): void {
  if (!podeUsarSessao()) return;
  window.sessionStorage.removeItem(CHAVE_RETORNO_OAUTH);
  window.sessionStorage.removeItem(CHAVE_LOGIN_SOCIAL_PENDENTE);
}
