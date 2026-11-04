'use client';

import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { APP_VERSION } from '../lib/version';
import { criarControladorOAuthMobile, type ProvedorOAuthMobile, type RetornoOAuthMobile } from './oauth-nativo-controller';

declare global {
  interface Window {
    __AVANTALAB_MOBILE_SUPABASE_CLIENT__?: SupabaseClient;
    __avantalabAbrirOAuthNativoMobile?: (provedor: ProvedorOAuthMobile) => Promise<void>;
    __avantalabCancelarOAuthNativoMobile?: () => Promise<void>;
    __avantalabUltimoRetornoOAuthNativoMobile?: RetornoOAuthMobile;
    __avantalabOAuthNativoMobileEmAndamento?: () => boolean;
    __avantalabAberturaOAuthMobile?: boolean;
    __avantalabPonteOAuthMobilePendente?: boolean;
    __avantalabControladorOAuthMobile?: ReturnType<typeof criarControladorOAuthMobile>;
  }
}

export default function OAuthNativoMobileBridge() {
  const controlador = useRef<ReturnType<typeof criarControladorOAuthMobile> | null>(null);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let desmontado = false;
    const listeners: PluginListenerHandle[] = [];
    // O ref sobrevive ao ciclo setup/cleanup/setup do React.
    controlador.current = window.__avantalabControladorOAuthMobile ??= criarControladorOAuthMobile({
      cliente: () => window.__AVANTALAB_MOBILE_SUPABASE_CLIENT__,
      abrir: (url) => Browser.open({ url, presentationStyle: 'fullscreen' }),
      fechar: () => Browser.close(),
      timer: (acao, ms) => setTimeout(acao, ms), limparTimer: (timer) => clearTimeout(timer),
      estado: () => {},
      diagnostico: (etapa, tentativa) => {
        // Nunca registrar URL, token, código, erro bruto ou identidade.
        try {
          sessionStorage.setItem('avantalab.mobile.oauth.etapa', JSON.stringify({
            etapa, tentativa, versao: APP_VERSION, em: Date.now(),
          }));
        } catch { /* Diagnóstico não bloqueia acesso. */ }
      },
      emitir: (retorno) => {
        window.__avantalabUltimoRetornoOAuthNativoMobile = retorno;
        window.dispatchEvent(new CustomEvent('avantalab:oauth-nativo-mobile', { detail: retorno }));
      },
    });
    const fluxo = controlador.current;
    const guardarListener = async (p: Promise<PluginListenerHandle>) => {
      const handle = await p;
      if (desmontado) await handle.remove(); else listeners.push(handle);
    };
    const pronto = (async () => {
      await guardarListener(CapacitorApp.addListener('appUrlOpen', ({ url }) => { void fluxo.receber(url); }));
      await guardarListener(Browser.addListener('browserFinished', () => fluxo.navegadorFechado()));
      if (desmontado) return;
      const abertura = await CapacitorApp.getLaunchUrl();
      if (!desmontado && abertura?.url) void fluxo.receber(abertura.url);
    })();
    // Só abrir depois de registrar os listeners de retorno.
    window.__avantalabAbrirOAuthNativoMobile = async (provedor) => { await fluxo.iniciar(provedor, pronto); };
    window.__avantalabCancelarOAuthNativoMobile = async () => { await fluxo.cancelar(); };
    window.__avantalabOAuthNativoMobileEmAndamento = () => fluxo.ocupado() || window.__avantalabAberturaOAuthMobile === true;
    void pronto.catch(() => {
      window.dispatchEvent(new CustomEvent('avantalab:oauth-nativo-mobile', {
        detail: { status: 'erro', tentativa: fluxo.estado().tentativa, mensagem: 'Não foi possível preparar o login social. Tente novamente.' },
      }));
    });
    return () => {
      desmontado = true;
      delete window.__avantalabAbrirOAuthNativoMobile;
      delete window.__avantalabCancelarOAuthNativoMobile;
      delete window.__avantalabOAuthNativoMobileEmAndamento;
      for (const handle of listeners) void handle.remove();
    };
  }, []);
  return null;
}
