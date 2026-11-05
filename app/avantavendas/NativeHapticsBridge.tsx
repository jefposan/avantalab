'use client';

import { useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

// O SDK JavaScript já presente é suficiente para a ponte. O plugin oficial
// precisa estar embarcado no pacote nativo do Vendas, não no app Gestão.
const Haptics = registerPlugin<{
  impact(options: { style: 'LIGHT' }): Promise<void>;
}>('Haptics');
const MenuHaptics = registerPlugin<{ impact(): Promise<void> }>('AvantaMenuHaptics');

declare global {
  interface Window {
    __avantavendasToqueTatil?: () => Promise<void>;
  }
}

export default function NativeHapticsBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const android = Capacitor.getPlatform() === 'android';
    if (!Capacitor.isPluginAvailable(android ? 'AvantaMenuHaptics' : 'Haptics')) return;
    const tocar = android
      ? () => MenuHaptics.impact()
      : () => Haptics.impact({ style: 'LIGHT' });
    window.__avantavendasToqueTatil = tocar;
    return () => {
      if (window.__avantavendasToqueTatil === tocar) delete window.__avantavendasToqueTatil;
    };
  }, []);
  return null;
}
