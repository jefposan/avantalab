'use client';

import { useEffect } from 'react';

// Mantido localmente para que a janela de callback não inicialize o cliente
// Supabase antes de devolver o código PKCE à janela que iniciou o login.
const CANAL_OAUTH_POPUP = 'avantalab-oauth-social-v1';

function contemRetornoOAuth(url: URL) {
  const hash = new URLSearchParams(url.hash.slice(1));
  return url.searchParams.has('code')
    || url.searchParams.has('error')
    || url.searchParams.has('error_description')
    || hash.has('access_token')
    || hash.has('error');
}

/**
 * Entrega o callback OAuth à janela que iniciou o login no Web/PWA.
 * Sem parâmetros OAuth, o componente não executa nenhuma ação.
 */
export default function OAuthPopupCallbackBridge() {
  useEffect(() => {
    if (!window.opener && window.name !== 'AvantaLabOAuth') return;

    const callbackUrl = new URL(window.location.href);
    if (!contemRetornoOAuth(callbackUrl)) return;

    const valor = callbackUrl.toString();
    try {
      const canal = new BroadcastChannel(CANAL_OAUTH_POPUP);
      canal.postMessage(valor);
      canal.close();
    } catch {
      // postMessage abaixo mantém compatibilidade quando BroadcastChannel não existir.
    }

    try {
      window.opener?.postMessage({ callbackUrl: valor }, window.location.origin);
    } catch {
      // A janela principal ainda pode receber o retorno pelo BroadcastChannel.
    }

    if (window.opener || window.name === 'AvantaLabOAuth') {
      // Dá tempo para a mensagem entrar na fila da janela principal antes de
      // encerrar a folha/popup de autenticação.
      window.setTimeout(() => window.close(), 100);
    }
  }, []);

  return null;
}
