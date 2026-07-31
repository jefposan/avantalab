'use client';

import { useEffect, useRef } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import {
  abrirOAuthSeguro,
  concluirOAuthSupabase,
  ehCancelamentoOAuth,
  prepararPopupOAuthWeb,
  REDIRECT_OAUTH_NATIVO,
} from '../lib/oauth-social';

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

function emitirRetorno(retorno: RetornoOAuthMobile) {
  window.__avantalabUltimoRetornoOAuthNativoMobile = retorno;
  window.dispatchEvent(new CustomEvent<RetornoOAuthMobile>('avantalab:oauth-nativo-mobile', {
    detail: retorno,
  }));
}

/**
 * Faz a ponte entre a Gestão Mobile imperativa e a autenticação social.
 * Google usa sessão segura no iOS, Custom Tab no Android e popup no PWA/web.
 * Apple preserva o fluxo já validado por redirect no web e Browser no nativo.
 */
export default function OAuthNativoMobileBridge() {
  const provedorPendenteRef = useRef<ProvedorOAuth | null>(null);

  useEffect(() => {
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
        const sessao = await concluirOAuthSupabase(url);

        emitirRetorno({
          status: 'concluido',
          provider: provedor,
          accessToken: sessao.access_token,
          refreshToken: sessao.refresh_token,
        });
      } catch (erro) {
        if (ehCancelamentoOAuth(erro)) emitirRetorno({ status: 'cancelado', provider: provedor });
        else {
          emitirRetorno({
            status: 'erro',
            provider: provedor,
            mensagem: erro instanceof Error ? erro.message : 'Não foi possível concluir o login social.',
          });
        }
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

      let popupWeb: Window | null = null;

      if (provedor === 'google' && !Capacitor.isNativePlatform()) {
        popupWeb = prepararPopupOAuthWeb();
      }

      // Apple no PWA/web continua com o redirect já utilizado em produção.
      if (!Capacitor.isNativePlatform() && provedor === 'apple') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: { redirectTo: `${window.location.origin}/mobile` },
        });
        if (error) throw error;
        return;
      }

      provedorPendenteRef.current = provedor;
      try {
        const googleEmJanelaSegura = provedor === 'google'
          && (Capacitor.getPlatform() === 'ios' || !Capacitor.isNativePlatform());
        const redirectTo = !Capacitor.isNativePlatform()
          ? `${window.location.origin}/`
          : REDIRECT_OAUTH_NATIVO;
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: provedor,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (!data.url) throw new Error('Não foi possível abrir o login social.');

        if (googleEmJanelaSegura) {
          const callbackUrl = await abrirOAuthSeguro({
            authUrl: data.url,
            redirectUrl: redirectTo,
            popup: popupWeb,
          });
          const sessao = await concluirOAuthSupabase(callbackUrl);
          provedorPendenteRef.current = null;
          emitirRetorno({
            status: 'concluido',
            provider: provedor,
            accessToken: sessao.access_token,
            refreshToken: sessao.refresh_token,
          });
          return;
        }

        await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
      } catch (erro) {
        popupWeb?.close();
        provedorPendenteRef.current = null;
        if (ehCancelamentoOAuth(erro)) {
          emitirRetorno({ status: 'cancelado', provider: provedor });
          return;
        }
        throw erro;
      }
    };

    void (async () => {
      if (!Capacitor.isNativePlatform()) return;
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
