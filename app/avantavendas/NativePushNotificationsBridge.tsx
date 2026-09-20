'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const TOKEN_KEY = 'avantalab.vendas.nativo.push-token';
const CANAL_KEY = 'avantalab.vendas.nativo.push-canal';
type TokenPushNativo = { token: string; canal: 'apns' | 'fcm' };

declare global {
  interface Window {
    __avantavendasAtivarPushNativo?: () => Promise<TokenPushNativo>;
    __avantavendasDesativarPushNativo?: () => Promise<TokenPushNativo | null>;
    __avantavendasEstadoPushNativo?: () => Promise<boolean>;
  }
}

export default function NativePushNotificationsBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let resolverToken: ((token: TokenPushNativo) => void) | null = null;
    let rejeitarToken: ((erro: Error) => void) | null = null;

    const iniciar = async (solicitarPermissao: boolean) => {
      const permissao = solicitarPermissao
        ? await PushNotifications.requestPermissions()
        : await PushNotifications.checkPermissions();
      if (permissao.receive !== 'granted') throw new Error('Permissão de notificações não concedida.');
      const tokenAtual = localStorage.getItem(TOKEN_KEY);
      const canal: TokenPushNativo['canal'] = Capacitor.getPlatform() === 'android' ? 'fcm' : 'apns';
      const espera = new Promise<TokenPushNativo>((resolve, reject) => {
        resolverToken = resolve;
        rejeitarToken = reject;
        window.setTimeout(() => reject(new Error('O aparelho demorou para registrar as notificações.')), 12000);
      });
      await PushNotifications.register();
      return tokenAtual ? { token: tokenAtual, canal } : espera;
    };

    const preparar = async () => {
      await PushNotifications.addListener('registration', ({ value }) => {
        const canal: TokenPushNativo['canal'] = Capacitor.getPlatform() === 'android' ? 'fcm' : 'apns';
        localStorage.setItem(TOKEN_KEY, value);
        localStorage.setItem(CANAL_KEY, canal);
        resolverToken?.({ token: value, canal });
        resolverToken = null;
        rejeitarToken = null;
      });
      await PushNotifications.addListener('registrationError', ({ error }) => {
        rejeitarToken?.(new Error(error));
        resolverToken = null;
        rejeitarToken = null;
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        window.location.assign(String(notification.data?.url || '/avantavendas'));
      });
      window.__avantavendasAtivarPushNativo = () => iniciar(true);
      window.__avantavendasDesativarPushNativo = async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        const canal = localStorage.getItem(CANAL_KEY) === 'fcm' ? 'fcm' : 'apns';
        await PushNotifications.unregister();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(CANAL_KEY);
        return token ? { token, canal } : null;
      };
      window.__avantavendasEstadoPushNativo = async () => {
        const permissao = await PushNotifications.checkPermissions();
        if (permissao.receive !== 'granted') return false;
        void iniciar(false).catch(() => undefined);
        return Boolean(localStorage.getItem(TOKEN_KEY));
      };
      void iniciar(false).catch(() => undefined);
    };

    void preparar();
    return () => {
      delete window.__avantavendasAtivarPushNativo;
      delete window.__avantavendasDesativarPushNativo;
      delete window.__avantavendasEstadoPushNativo;
      void PushNotifications.removeAllListeners();
    };
  }, []);
  return null;
}
