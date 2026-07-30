'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

type TemaNativo = { dark?: boolean };

export default function NativeShellBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return;

    let ativo = true;
    const aplicar = async (dark: boolean) => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        if (!ativo) return;
        await StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark });
      } catch (erro) {
        console.warn('Não foi possível atualizar a barra de status:', erro);
      }
    };
    const aoTrocarTema = (evento: Event) => {
      const detalhe = (evento as CustomEvent<TemaNativo>).detail;
      void aplicar(Boolean(detalhe?.dark));
    };

    window.addEventListener('avantalab:theme-changed', aoTrocarTema);
    void aplicar(false);
    return () => {
      ativo = false;
      window.removeEventListener('avantalab:theme-changed', aoTrocarTema);
    };
  }, []);

  return null;
}
