'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

type AparenciaBarraNativa = 'fundo-claro' | 'fundo-escuro';

function aparenciaDeclarada(): AparenciaBarraNativa | null {
  const elemento = document.querySelector<HTMLElement>('[data-native-status-bar]');
  const valor = elemento?.dataset.nativeStatusBar;
  if (valor === 'dark-content') return 'fundo-claro';
  if (valor === 'light-content') return 'fundo-escuro';
  return null;
}

function detectarAparenciaBarraNativa(): AparenciaBarraNativa {
  const declarada = aparenciaDeclarada();
  if (declarada) return declarada;

  const caminho = window.location.pathname;

  // Landing e portal de acesso possuem fundo claro na área segura.
  if (caminho === '/' || caminho === '/acesso') return 'fundo-claro';

  if (caminho === '/mobile') {
    // Login, cadastro e preparação da Gestão usam o fundo mobile claro.
    if (
      document.querySelector(
        '.avantalab-mobile-bg-login, [data-native-status-bar="dark-content"]'
      )
    ) {
      return 'fundo-claro';
    }

    // Depois da autenticação, o header da Gestão ocupa o topo com gradiente escuro.
    if (document.querySelector('#mobile-main-header, #mobile-header-wrap')) {
      return 'fundo-escuro';
    }

    return 'fundo-claro';
  }

  if (caminho === '/mobile/vendas') {
    // Todas as cenas de acesso do Vendas usam o fundo oficial claro.
    if (document.querySelector('.login-screen, .preparing-access-screen')) {
      return 'fundo-claro';
    }

    // O header autenticado é branco no tema claro e escuro no tema escuro.
    if (document.querySelector('.system-header, .mobile-menu-header')) {
      return document.documentElement.classList.contains('dark-theme')
        ? 'fundo-escuro'
        : 'fundo-claro';
    }
  }

  return document.documentElement.classList.contains('dark-theme')
    ? 'fundo-escuro'
    : 'fundo-claro';
}

export default function NativeStatusBarController() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let aparenciaAplicada: AparenciaBarraNativa | null = null;
    let quadroPendente = 0;
    const temporizadores: number[] = [];

    const aplicarEstilo = async (forcar = false) => {
      quadroPendente = 0;
      const aparencia = detectarAparenciaBarraNativa();
      if (!forcar && aparencia === aparenciaAplicada) return;
      aparenciaAplicada = aparencia;

      const fundoClaro = aparencia === 'fundo-claro';
      const estilo = fundoClaro ? Style.Light : Style.Dark;

      try {
        await StatusBar.show();
        await StatusBar.setStyle({ style: estilo });
        // Com overlaysWebView=false, a barra possui fundo nativo separado da
        // página. O Capacitor aplica esta cor no iOS e no Android compatível;
        // em versões que não permitem personalizá-la, a chamada é inócua.
        await StatusBar.setBackgroundColor({
          color: fundoClaro ? '#FFFFFF' : '#003E73',
        });
      } catch (erro) {
        console.warn('Não foi possível adaptar a barra de status nativa:', erro);
      }
    };

    const agendarAplicacao = (forcar = false) => {
      if (quadroPendente) window.cancelAnimationFrame(quadroPendente);
      quadroPendente = window.requestAnimationFrame(() => {
        void aplicarEstilo(forcar);
      });
    };

    const observador = new MutationObserver(() => agendarAplicacao());
    observador.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-native-status-bar'],
    });

    const reaplicarAoExibir = () => agendarAplicacao(true);
    const reaplicarAoRetornar = () => {
      if (!document.hidden) agendarAplicacao(true);
    };

    window.addEventListener('pageshow', reaplicarAoExibir);
    window.addEventListener('popstate', reaplicarAoExibir);
    window.addEventListener('avantalab:native-status-bar-refresh', reaplicarAoExibir);
    document.addEventListener('visibilitychange', reaplicarAoRetornar);

    // O estilo inicial do projeto já é claro; estas reaplicações cobrem a
    // inicialização assíncrona da ponte nativa e o primeiro render remoto.
    agendarAplicacao(true);
    temporizadores.push(window.setTimeout(() => agendarAplicacao(true), 250));
    temporizadores.push(window.setTimeout(() => agendarAplicacao(true), 1000));

    return () => {
      observador.disconnect();
      if (quadroPendente) window.cancelAnimationFrame(quadroPendente);
      for (const temporizador of temporizadores) window.clearTimeout(temporizador);
      window.removeEventListener('pageshow', reaplicarAoExibir);
      window.removeEventListener('popstate', reaplicarAoExibir);
      window.removeEventListener('avantalab:native-status-bar-refresh', reaplicarAoExibir);
      document.removeEventListener('visibilitychange', reaplicarAoRetornar);
    };
  }, []);

  return null;
}
