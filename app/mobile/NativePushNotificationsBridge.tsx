'use client';

import { useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

type NativeBadge = { set(options: { count: number }): Promise<unknown> };
const NativeBadge = registerPlugin<NativeBadge>('NativeBadge');
const TOKEN_KEY = 'avantalab.native.push-token';
const BADGE_KEY = 'avantalab.mobile.badge';

declare global {
  interface Window {
    __avantalabAtivarPushNativoMobile?: () => Promise<string>;
    __avantalabDesativarPushNativoMobile?: () => Promise<string | null>;
    __avantalabEstadoPushNativoMobile?: () => Promise<boolean>;
    __avantalabAtualizarBadgeNativo?: (quantidade: number) => void;
    __avantalabCanalPushNativoMobile?: () => 'apns' | 'fcm';
  }
}

export default function NativePushNotificationsBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const plataforma = Capacitor.getPlatform();
    if (plataforma !== 'ios' && plataforma !== 'android') return;
    const canal = plataforma === 'ios' ? 'apns' : 'fcm';
    const nomeAparelho = plataforma === 'ios' ? 'iPhone' : 'Android';
    let resolverToken: ((token: string) => void) | null = null;
    let rejeitarToken: ((erro: Error) => void) | null = null;
    let badgeConfirmadoPelaGestao: number | null = null;

    const normalizarBadge = (quantidade: unknown) => Math.max(0, Math.trunc(Number(quantidade) || 0));
    const aplicarBadgeNativo = (total: number, limparEntregues: boolean) => {
      void NativeBadge.set({ count: total }).catch(() => undefined);
      if (limparEntregues && total === 0) {
        void PushNotifications.removeAllDeliveredNotifications().catch(() => undefined);
      }
    };
    const atualizarBadgeNativo = (quantidade: number) => {
      const total = normalizarBadge(quantidade);
      badgeConfirmadoPelaGestao = total;
      try { localStorage.setItem(BADGE_KEY, String(total)); } catch (_) {}
      aplicarBadgeNativo(total, true);
    };

    const salvarToken = (token: string) => {
      localStorage.setItem(TOKEN_KEY, token);
      resolverToken?.(token);
      resolverToken = null;
      rejeitarToken = null;
      if (badgeConfirmadoPelaGestao !== null) aplicarBadgeNativo(badgeConfirmadoPelaGestao, true);
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
        window.setTimeout(() => reject(new Error(`O ${nomeAparelho} demorou para registrar as notificações.`)), 12000);
      });
      await PushNotifications.register();
      return tokenAtual || espera;
    };

    const preparar = async () => {
      if (plataforma === 'android') {
        await PushNotifications.createChannel({
          id: 'avantalab_avisos',
          name: 'Avisos do AvantaLab',
          description: 'Lembretes, pagamentos e avisos importantes.',
          importance: 4,
          visibility: 1,
          vibration: true,
        }).catch(() => undefined);
      }
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
      window.__avantalabCanalPushNativoMobile = () => canal;
      window.__avantalabAtualizarBadgeNativo = atualizarBadgeNativo;
      let badgePersistido = 0;
      try { badgePersistido = Number(localStorage.getItem(BADGE_KEY)); } catch (_) {}
      aplicarBadgeNativo(normalizarBadge(badgePersistido), false);
      window.dispatchEvent(new CustomEvent('avantalab:badge-nativo-pronto'));
      void iniciar(false).catch(() => undefined);
    };
    void preparar();
    return () => { delete window.__avantalabAtivarPushNativoMobile; delete window.__avantalabDesativarPushNativoMobile; delete window.__avantalabEstadoPushNativoMobile; delete window.__avantalabAtualizarBadgeNativo; delete window.__avantalabCanalPushNativoMobile; void PushNotifications.removeAllListeners(); };
  }, []);
  return null;
}
