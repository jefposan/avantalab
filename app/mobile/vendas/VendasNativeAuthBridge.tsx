'use client';

import { useEffect } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const CALLBACK_GOOGLE_NATIVO = 'br.com.avantalab.app://auth/callback';
const EVENTO_CALLBACK = 'avantalab:vendas-oauth-callback';
const EVENTO_CANCELADO = 'avantalab:vendas-oauth-cancelado';
const CHAVE_CALLBACK_PENDENTE = 'avantalab.vendas.oauth.callback_pendente';
const CHAVE_CALLBACK_PROCESSADO = 'avantalab.vendas.oauth.callback_processado';
const CHAVE_GOOGLE_INICIADO_EM = 'avantalab.vendas.oauth.iniciado_em';
const LIMITE_RETORNO_GOOGLE_MS = 15 * 60 * 1000;

type PonteOAuthVendas = {
  ativo: true;
  redirectTo: string;
  abrir: (url: string) => Promise<void>;
};

declare global {
  interface Window {
    __AVANTALAB_VENDAS_OAUTH_NATIVO__?: PonteOAuthVendas;
  }
}

function identificadorCallback(url: string) {
  let hash = 2166136261;
  for (let indice = 0; indice < url.length; indice += 1) {
    hash ^= url.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function callbackGoogleValido(url: string) {
  try {
    const callback = new URL(url);
    return (
      callback.protocol === 'br.com.avantalab.app:' &&
      callback.hostname === 'auth' &&
      callback.pathname === '/callback'
    );
  } catch {
    return false;
  }
}

function retornoGoogleEsperado() {
  try {
    const iniciadoEm = Number(localStorage.getItem(CHAVE_GOOGLE_INICIADO_EM));
    return Number.isFinite(iniciadoEm)
      && iniciadoEm > 0
      && Date.now() - iniciadoEm <= LIMITE_RETORNO_GOOGLE_MS;
  } catch {
    return false;
  }
}

function limparInicioGoogle() {
  try {
    localStorage.removeItem(CHAVE_GOOGLE_INICIADO_EM);
  } catch {
    // O estado visual de conexão também será limpo pelo evento de cancelamento.
  }
}

export default function VendasNativeAuthBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let desmontado = false;
    const listeners: PluginListenerHandle[] = [];

    const ponte: PonteOAuthVendas = {
      ativo: true,
      redirectTo: CALLBACK_GOOGLE_NATIVO,
      abrir: async (url) => {
        await Browser.open({ url, presentationStyle: 'fullscreen' });
      },
    };
    window.__AVANTALAB_VENDAS_OAUTH_NATIVO__ = ponte;

    const fecharNavegador = async () => {
      try {
        await Browser.close();
      } catch {
        // O callback também pode chegar após o navegador já ter sido fechado.
      }
    };

    const entregarCallback = async (url: string) => {
      if (!callbackGoogleValido(url)) return;
      const identificador = identificadorCallback(url);
      if (sessionStorage.getItem(CHAVE_CALLBACK_PROCESSADO) === identificador) {
        sessionStorage.removeItem(CHAVE_CALLBACK_PENDENTE);
        limparInicioGoogle();
        await fecharNavegador();
        return;
      }
      if (!retornoGoogleEsperado()) return;

      sessionStorage.setItem(CHAVE_CALLBACK_PENDENTE, url);
      await fecharNavegador();
      window.dispatchEvent(
        new CustomEvent(EVENTO_CALLBACK, { detail: { url, identificador } })
      );
    };

    const guardarListener = async (listener: Promise<PluginListenerHandle>) => {
      const handle = await listener;
      if (desmontado) await handle.remove();
      else listeners.push(handle);
    };

    void (async () => {
      await guardarListener(
        CapacitorApp.addListener('appUrlOpen', ({ url }) => {
          void entregarCallback(url);
        })
      );
      await guardarListener(
        Browser.addListener('browserFinished', () => {
          limparInicioGoogle();
          window.dispatchEvent(new CustomEvent(EVENTO_CANCELADO));
        })
      );

      const aberturaInicial = await CapacitorApp.getLaunchUrl();
      if (aberturaInicial?.url) await entregarCallback(aberturaInicial.url);
    })().catch((erro) => {
      console.error('Erro ao preparar OAuth nativo do Vendas:', erro);
    });

    return () => {
      desmontado = true;
      if (window.__AVANTALAB_VENDAS_OAUTH_NATIVO__ === ponte) {
        delete window.__AVANTALAB_VENDAS_OAUTH_NATIVO__;
      }
      for (const listener of listeners) void listener.remove();
    };
  }, []);

  return null;
}
