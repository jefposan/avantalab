'use client';

import { useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

type NativeBadge = { set(options: { count: number }): Promise<unknown> };
const NativeBadge = registerPlugin<NativeBadge>('NativeBadge');
const TOKEN_KEY = 'avantalab.ios.push-token';
const BADGE_KEY = 'avantalab.mobile.badge';

declare global {
  interface Window {
    __avantalabAtivarPushNativoMobile?: () => Promise<string>;
    __avantalabDesativarPushNativoMobile?: () => Promise<string | null>;
    __avantalabEstadoPushNativoMobile?: () => Promise<boolean>;
    __avantalabAtualizarBadgeNativo?: (quantidade: number) => void;
  }
}

export default function NativePushNotificationsBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return;
    let resolverToken: ((token: string) => void) | null = null;
    let rejeitarToken: ((erro: Error) => void) | null = null;

    const normalizarBadge = (quantidade: unknown) => Math.max(0, Math.trunc(Number(quantidade) || 0));
    const atualizarBadgeNativo = (quantidade: number) => {
      const total = normalizarBadge(quantidade);
      try { localStorage.setItem(BADGE_KEY, String(total)); } catch (_) {}
      void NativeBadge.set({ count: total }).catch(() => undefined);
    };

    const salvarToken = (token: string) => {
      localStorage.setItem(TOKEN_KEY, token);
      resolverToken?.(token);
      resolverToken = null;
      rejeitarToken = null;
      window.dispatchEvent(new CustomEvent('avantalab:push-nativo-mobile', { detail: { token } }));
    };

    const iniciar = async (solicitarPermissao: boolean) => {
      const permissao = solicitarPermissao
        ? await PushNotifications.requestPermissions()
        : await PushNotifications.checkPermissions();
      if (permissao.receive !== 'granted') throw new Error('Permissão de notificações não concedida.');
      const tokenAtual = localStorage.getItem(TOKEN_KEY);
      const espera = new Promise<string>((resolve, reject) => {
        resolverToken = resolve;
        rejeitarToken = reject;
        window.setTimeout(() => reject(new Error('O iPhone demorou para registrar as notificações.')), 12000);
      });
      await PushNotifications.register();
      return tokenAtual || espera;
    };

    const preparar = async () => {
      await PushNotifications.addListener('registration', ({ value }) => salvarToken(value));
      await PushNotifications.addListener('registrationError', ({ error }) => {
        rejeitarToken?.(new Error(error)); resolverToken = null; rejeitarToken = null;
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const url = String(notification.data?.url || '/mobile');
        window.location.assign(url);
      });
      window.__avantalabAtivarPushNativoMobile = () => iniciar(true);
      window.__avantalabDesativarPushNativoMobile = async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        await PushNotifications.unregister(); localStorage.removeItem(TOKEN_KEY); return token;
      };
      window.__avantalabEstadoPushNativoMobile = async () => {
        const permissao = await PushNotifications.checkPermissions();
        if (permissao.receive !== 'granted') return false;
        void iniciar(false).catch(() => undefined);
        return Boolean(localStorage.getItem(TOKEN_KEY));
      };
      window.__avantalabAtualizarBadgeNativo = atualizarBadgeNativo;
      let badgePersistido = 0;
      try { badgePersistido = Number(localStorage.getItem(BADGE_KEY)); } catch (_) {}
      atualizarBadgeNativo(badgePersistido);
      void iniciar(false).catch(() => undefined);
    };
    void preparar();
    return () => { delete window.__avantalabAtivarPushNativoMobile; delete window.__avantalabDesativarPushNativoMobile; delete window.__avantalabEstadoPushNativoMobile; delete window.__avantalabAtualizarBadgeNativo; void PushNotifications.removeAllListeners(); };
  }, []);
  return null;
}
