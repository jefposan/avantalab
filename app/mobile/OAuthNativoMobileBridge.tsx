'use client';

import { useEffect, useRef } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';

type ProvedorOAuth = 'google' | 'apple';

type RetornoOAuthMobile = {
  status: 'concluido' | 'cancelado' | 'erro';
  provider?: ProvedorOAuth;
  accessToken?: string;
  refreshToken?: string;
  mensagem?: string;
};

declare global {
  interface Window {
    __avantalabAbrirOAuthNativoMobile?: (provedor: ProvedorOAuth) => Promise<void>;
    __avantalabUltimoRetornoOAuthNativoMobile?: RetornoOAuthMobile;
  }
}

const REDIRECT_OAUTH_NATIVO = 'br.com.avantalab.app://auth/callback';

/**
 * O retorno OAuth pode chegar como query (`?code=…`) ou fragmento
 * (`#access_token=…`). Navegadores comuns deixam o Supabase processar ambos,
 * mas o deep link do Capacitor é tratado manualmente nesta ponte.
 */
function lerParametroOAuth(url: URL, nome: string) {
  return url.searchParams.get(nome)
    ?? new URLSearchParams(url.hash.replace(/^#/, '')).get(nome);
}

function emitirRetorno(retorno: RetornoOAuthMobile) {
  window.__avantalabUltimoRetornoOAuthNativoMobile = retorno;
  window.dispatchEvent(new CustomEvent<RetornoOAuthMobile>('avantalab:oauth-nativo-mobile', {
    detail: retorno,
  }));
}

/**
 * Faz a ponte entre a Gestão Mobile imperativa e os plugins nativos.
 * No navegador ela não registra nada: o fluxo OAuth existente do PWA continua
 * usando a URL https da própria página.
 */
export default function OAuthNativoMobileBridge() {
  const provedorPendenteRef = useRef<ProvedorOAuth | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let desmontado = false;
    const listeners: PluginListenerHandle[] = [];

    const fecharNavegador = async () => {
      try {
        await Browser.close();
      } catch {
        // O navegador pode já estar fechado após o retorno pelo deep link.
      }
    };

    const concluirRetorno = async (url: string) => {
      const callbackUrl = new URL(url);
      if (callbackUrl.protocol !== 'br.com.avantalab.app:') return;

      const provedor = provedorPendenteRef.current ?? undefined;
      provedorPendenteRef.current = null;

      try {
        const erroOAuth = lerParametroOAuth(callbackUrl, 'error_description')
          ?? lerParametroOAuth(callbackUrl, 'error');
        if (erroOAuth) throw new Error(erroOAuth);

        const codigo = lerParametroOAuth(callbackUrl, 'code');
        let accessToken = lerParametroOAuth(callbackUrl, 'access_token');
        let refreshToken = lerParametroOAuth(callbackUrl, 'refresh_token');

        if (codigo) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
          if (error) throw error;
          accessToken = data.session?.access_token ?? null;
          refreshToken = data.session?.refresh_token ?? null;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        if (!accessToken || !refreshToken) {
          throw new Error('O provedor não retornou os dados necessários para concluir o login.');
        }

        emitirRetorno({
          status: 'concluido',
          provider: provedor,
          accessToken,
          refreshToken,
        });
      } catch (erro) {
        emitirRetorno({
          status: 'erro',
          provider: provedor,
          mensagem: erro instanceof Error ? erro.message : 'Não foi possível concluir o login social.',
        });
      } finally {
        await fecharNavegador();
      }
    };

    const guardarListener = async (listener: Promise<PluginListenerHandle>) => {
      const handle = await listener;
      if (desmontado) await handle.remove();
      else listeners.push(handle);
    };

    window.__avantalabAbrirOAuthNativoMobile = async (provedor) => {
      if (provedorPendenteRef.current) {
        throw new Error('Já existe um login social em andamento.');
      }

      provedorPendenteRef.current = provedor;
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: provedor,
          options: {
            redirectTo: REDIRECT_OAUTH_NATIVO,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (!data.url) throw new Error('Não foi possível abrir o login social.');

        await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
      } catch (erro) {
        provedorPendenteRef.current = null;
        throw erro;
      }
    };

    void (async () => {
      await guardarListener(CapacitorApp.addListener('appUrlOpen', ({ url }) => {
        void concluirRetorno(url);
      }));
      await guardarListener(Browser.addListener('browserFinished', () => {
        const provedor = provedorPendenteRef.current;
        if (!provedor) return;
        provedorPendenteRef.current = null;
        emitirRetorno({ status: 'cancelado', provider: provedor });
      }));

      const aberturaInicial = await CapacitorApp.getLaunchUrl();
      if (aberturaInicial?.url) await concluirRetorno(aberturaInicial.url);
    })().catch((erro) => {
      const provedor = provedorPendenteRef.current ?? undefined;
      provedorPendenteRef.current = null;
      emitirRetorno({
        status: 'erro',
        provider: provedor,
        mensagem: erro instanceof Error ? erro.message : 'Não foi possível preparar o login social.',
      });
    });

    return () => {
      desmontado = true;
      delete window.__avantalabAbrirOAuthNativoMobile;
      for (const listener of listeners) void listener.remove();
    };
  }, []);

  return null;
}
