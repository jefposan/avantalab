'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from './supabase';

export const REDIRECT_OAUTH_NATIVO = 'br.com.avantalab.app://auth/callback';
export const CANAL_OAUTH_POPUP = 'avantalab-oauth-social-v1';

type SecureOAuthPlugin = {
  open(options: { url: string; callbackScheme: string }): Promise<{ callbackUrl: string }>;
};

const SecureOAuth = registerPlugin<SecureOAuthPlugin>('SecureOAuth');

export class OAuthCanceladoError extends Error {
  code = 'USER_CANCELED';

  constructor(message = 'Login cancelado pelo usuário.') {
    super(message);
    this.name = 'OAuthCanceladoError';
  }
}

function erroComCodigo(codigo: string, mensagem: string) {
  const erro = new Error(mensagem) as Error & { code?: string };
  erro.code = codigo;
  return erro;
}

export function ehCancelamentoOAuth(erro: unknown) {
  const codigo = String((erro as { code?: unknown } | null)?.code || '').toUpperCase();
  const mensagem = erro instanceof Error ? erro.message.toLowerCase() : String(erro || '').toLowerCase();

  return codigo === 'USER_CANCELED'
    || codigo === 'POPUP_CLOSED'
    || mensagem.includes('cancelado')
    || mensagem.includes('cancelled')
    || mensagem.includes('canceled')
    || mensagem.includes('access_denied');
}

export function prepararPopupOAuthWeb() {
  if (Capacitor.isNativePlatform()) return null;

  const largura = Math.min(600, Math.max(360, window.screen.availWidth - 32));
  const altura = Math.min(720, Math.max(560, window.screen.availHeight - 64));
  const esquerda = Math.max(0, Math.round((window.screen.availWidth - largura) / 2));
  const topo = Math.max(0, Math.round((window.screen.availHeight - altura) / 2));
  const popup = window.open(
    'about:blank',
    'AvantaLabOAuth',
    `popup=yes,width=${largura},height=${altura},left=${esquerda},top=${topo},resizable=yes,scrollbars=yes`,
  );

  if (!popup) {
    throw erroComCodigo(
      'POPUP_BLOCKED',
      'O navegador bloqueou a janela de login. Permita pop-ups para o AvantaLab e tente novamente.',
    );
  }

  popup.focus();
  return popup;
}

function aguardarRetornoPopup(
  popup: Window,
  authUrl: string,
  redirectUrl: string,
) {
  return new Promise<string>((resolve, reject) => {
    let encerrado = false;
    const canal = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(CANAL_OAUTH_POPUP)
      : null;

    const finalizar = (callbackUrl?: string, erro?: Error) => {
      if (encerrado) return;
      encerrado = true;
      window.clearInterval(intervaloFechamento);
      window.clearTimeout(tempoLimite);
      window.removeEventListener('message', receberPostMessage);
      canal?.close();
      if (!popup.closed) popup.close();
      if (erro) reject(erro);
      else if (callbackUrl) resolve(callbackUrl);
    };

    const validarRetorno = (valor: unknown) => {
      const callbackUrl = typeof valor === 'string'
        ? valor
        : String((valor as { callbackUrl?: unknown } | null)?.callbackUrl || '');
      if (!callbackUrl) return;
      if (!callbackUrl.startsWith(redirectUrl)) {
        finalizar(undefined, new Error('O endereço de retorno do login social não corresponde ao AvantaLab.'));
        return;
      }
      finalizar(callbackUrl);
    };

    const receberPostMessage = (evento: MessageEvent) => {
      if (evento.origin !== window.location.origin) return;
      validarRetorno(evento.data);
    };

    canal?.addEventListener('message', (evento) => validarRetorno(evento.data));
    window.addEventListener('message', receberPostMessage);

    const intervaloFechamento = window.setInterval(() => {
      if (popup.closed) {
        finalizar(undefined, erroComCodigo('POPUP_CLOSED', 'Login cancelado pelo usuário.'));
      }
    }, 250);
    const tempoLimite = window.setTimeout(() => {
      finalizar(undefined, erroComCodigo('OAUTH_TIMEOUT', 'O tempo para concluir o login expirou. Tente novamente.'));
    }, 5 * 60 * 1000);

    try {
      popup.location.replace(authUrl);
      popup.focus();
    } catch (erro) {
      finalizar(undefined, erro instanceof Error ? erro : new Error('Não foi possível abrir o login social.'));
    }
  });
}

export async function abrirOAuthSeguro({
  authUrl,
  redirectUrl,
  popup,
}: {
  authUrl: string;
  redirectUrl: string;
  popup?: Window | null;
}) {
  if (Capacitor.getPlatform() === 'ios') {
    const callbackScheme = new URL(redirectUrl).protocol.replace(':', '');
    const retorno = await SecureOAuth.open({ url: authUrl, callbackScheme });
    return retorno.callbackUrl;
  }

  if (!Capacitor.isNativePlatform()) {
    const janela = popup ?? prepararPopupOAuthWeb();
    if (!janela) throw new Error('Não foi possível preparar a janela de login.');
    return aguardarRetornoPopup(janela, authUrl, redirectUrl);
  }

  throw new Error('A janela segura solicitada não está disponível nesta plataforma.');
}

export async function concluirOAuthSupabase(url: string) {
  const callbackUrl = new URL(url);
  const hashParams = new URLSearchParams(callbackUrl.hash.slice(1));
  const obterParametro = (nome: string) => callbackUrl.searchParams.get(nome) ?? hashParams.get(nome);
  const erroOAuth = obterParametro('error_description') ?? obterParametro('error');

  if (erroOAuth) {
    if (/access_denied|cancel/i.test(erroOAuth)) throw new OAuthCanceladoError();
    throw new Error(erroOAuth);
  }

  const codigo = callbackUrl.searchParams.get('code');
  if (codigo) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (error) throw error;
    if (!data.session) throw new Error('O Supabase não retornou uma sessão válida.');
    return data.session;
  }

  const accessToken = obterParametro('access_token');
  const refreshToken = obterParametro('refresh_token');
  if (!accessToken || !refreshToken) {
    throw new Error('O provedor não retornou os dados necessários para concluir o login.');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  if (!data.session) throw new Error('O Supabase não retornou uma sessão válida.');
  return data.session;
}
