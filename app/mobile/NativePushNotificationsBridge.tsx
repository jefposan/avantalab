'use client';

import { useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { EVENTO_ABERTURA_PUSH_MOBILE, resolverDestinoPushMobile } from './push-navigation';

type NativeBadge = { set(options: { count: number }): Promise<unknown> };
const NativeBadge = registerPlugin<NativeBadge>('NativeBadge');
const TOKEN_KEY = 'avantalab.nativo.push-token';
const TOKEN_KEY_IOS_ANTERIOR = 'avantalab.ios.push-token';
const BADGE_KEY = 'avantalab.mobile.badge';
type TokenPushNativo = { token: string; canal: 'apns' | 'fcm' };

declare global {
  interface Window {
    __avantalabAtivarPushNativoMobile?: () => Promise<TokenPushNativo>;
    __avantalabSincronizarPushNativoMobile?: () => Promise<TokenPushNativo | null>;
    __avantalabDesativarPushNativoMobile?: () => Promise<TokenPushNativo | null>;
    __avantalabEstadoPushNativoMobile?: () => Promise<boolean>;
    __avantalabAtualizarBadgeNativo?: (quantidade: number) => void;
    __avantalabDestinoPushNativoMobile?: string;
  }
}

export default function NativePushNotificationsBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let resolverToken: ((token: TokenPushNativo) => void) | null = null;
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
      const canal: TokenPushNativo['canal'] = Capacitor.getPlatform() === 'android' ? 'fcm' : 'apns';
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY_IOS_ANTERIOR);
      resolverToken?.({ token, canal });
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
      const tokenAtual = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY_IOS_ANTERIOR);
      const canal: TokenPushNativo['canal'] = Capacitor.getPlatform() === 'android' ? 'fcm' : 'apns';
      const espera = tokenAtual ? null : new Promise<TokenPushNativo>((resolve, reject) => {
        resolverToken = resolve;
        rejeitarToken = reject;
        window.setTimeout(() => reject(new Error('O aparelho demorou para registrar as notificações.')), 12000);
      });
      await PushNotifications.register();
      return tokenAtual ? { token: tokenAtual, canal } : espera!;
    };

    const preparar = async () => {
      await PushNotifications.addListener('registration', ({ value }) => salvarToken(value));
      await PushNotifications.addListener('registrationError', ({ error }) => {
        rejeitarToken?.(new Error(error)); resolverToken = null; rejeitarToken = null;
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const destino = resolverDestinoPushMobile(window.location.href, notification.data?.url);
        if (!destino) return;

        window.__avantalabDestinoPushNativoMobile = destino.href;
        if (destino.mesmoDocumento) {
          const hrefAtual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          if (hrefAtual !== destino.href) {
            window.history.replaceState(window.history.state, '', destino.href);
          }
          window.dispatchEvent(new CustomEvent(EVENTO_ABERTURA_PUSH_MOBILE, {
            detail: { url: destino.href },
          }));
          return;
        }

        window.location.assign(destino.href);
      });
      window.__avantalabAtivarPushNativoMobile = () => iniciar(true);
      window.__avantalabSincronizarPushNativoMobile = async () => {
        const permissao = await PushNotifications.checkPermissions();
        return permissao.receive === 'granted' ? iniciar(false) : null;
      };
      window.__avantalabDesativarPushNativoMobile = async () => {
        const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY_IOS_ANTERIOR);
        const canal: TokenPushNativo['canal'] = Capacitor.getPlatform() === 'android' ? 'fcm' : 'apns';
        await PushNotifications.unregister(); localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY_IOS_ANTERIOR); return token ? { token, canal } : null;
      };
      window.__avantalabEstadoPushNativoMobile = async () => {
        const permissao = await PushNotifications.checkPermissions();
        if (permissao.receive !== 'granted') return false;
        void iniciar(false).catch(() => undefined);
        return Boolean(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY_IOS_ANTERIOR));
      };
      window.__avantalabAtualizarBadgeNativo = atualizarBadgeNativo;
      let badgePersistido = 0;
      try { badgePersistido = Number(localStorage.getItem(BADGE_KEY)); } catch (_) {}
      aplicarBadgeNativo(normalizarBadge(badgePersistido), false);
      window.dispatchEvent(new CustomEvent('avantalab:badge-nativo-pronto'));
    };
    void preparar();
    return () => { delete window.__avantalabAtivarPushNativoMobile; delete window.__avantalabSincronizarPushNativoMobile; delete window.__avantalabDesativarPushNativoMobile; delete window.__avantalabEstadoPushNativoMobile; delete window.__avantalabAtualizarBadgeNativo; void PushNotifications.removeAllListeners(); };
  }, []);
  return null;
}
