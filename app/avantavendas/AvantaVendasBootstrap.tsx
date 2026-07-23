'use client';

import { useEffect } from 'react';

type ProgressoVendas = {
  grupos: Record<string, number>;
  valor: number;
  rotulo: string;
};

type JanelaAvantaVendas = Window & typeof globalThis & {
  Capacitor?: {
    getPlatform?: () => string;
  };
  VENDAS_MOBILE_CONFIG?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
  __AVANTAVENDAS_BOOTSTRAP_INICIADO__?: boolean;
  __VENDAS_MOBILE_EMBEDDED__?: boolean;
  __VENDAS_MOBILE_VERSION__?: string;
  __AVANTALAB_VENDAS_PROGRESSO__?: ProgressoVendas;
  __avantalabAtualizarProgressoVendas?: (
    grupo: string,
    concluido: number,
    total: number,
    rotulo?: string,
  ) => void;
  __avantalabReiniciarProgressoVendas?: (rotulo?: string) => void;
};

type AvantaVendasBootstrapProps = {
  assetVersion: string;
  caminhoRecursos: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
};

export default function AvantaVendasBootstrap({
  assetVersion,
  caminhoRecursos,
  supabaseAnonKey,
  supabaseUrl,
}: AvantaVendasBootstrapProps) {
  useEffect(() => {
    const janela = window as JanelaAvantaVendas;
    if (janela.__AVANTAVENDAS_BOOTSTRAP_INICIADO__) return;
    janela.__AVANTAVENDAS_BOOTSTRAP_INICIADO__ = true;

    const bridgeCapacitor = janela.Capacitor;
    const plataformaIos = Boolean(
      bridgeCapacitor
      && typeof bridgeCapacitor.getPlatform === 'function'
      && bridgeCapacitor.getPlatform() === 'ios',
    );
    document.documentElement.classList.toggle('capacitor-ios', plataformaIos);
    janela.__VENDAS_MOBILE_EMBEDDED__ = true;
    janela.__VENDAS_MOBILE_VERSION__ = assetVersion;

    let base = document.querySelector<HTMLBaseElement>('base[data-vendas-mobile]');
    if (!base) {
      base = document.createElement('base');
      base.dataset.vendasMobile = 'true';
      document.head.prepend(base);
    }
    base.href = `${caminhoRecursos}/`;

    const pesosProgresso: Record<string, number> = {
      shell: 5,
      scripts: 20,
      auth: 10,
      access: 15,
      data: 40,
      resources: 10,
    };
    const progresso = janela.__AVANTALAB_VENDAS_PROGRESSO__ || {
      grupos: {},
      valor: 0,
      rotulo: 'Iniciando o AvantaVendas',
    };
    janela.__AVANTALAB_VENDAS_PROGRESSO__ = progresso;

    janela.__avantalabAtualizarProgressoVendas = (
      grupo,
      concluido,
      total,
      rotulo,
    ) => {
      const fracao = total > 0
        ? Math.max(0, Math.min(1, Number(concluido || 0) / Number(total)))
        : 0;
      progresso.grupos[grupo] = Math.max(
        Number(progresso.grupos[grupo] || 0),
        fracao,
      );
      const calculado = Object.keys(pesosProgresso).reduce(
        (soma, chave) => soma + pesosProgresso[chave] * Number(progresso.grupos[chave] || 0),
        0,
      );
      progresso.valor = Math.max(progresso.valor, Math.min(100, Math.round(calculado)));
      if (rotulo) progresso.rotulo = rotulo;

      const barra = document.getElementById('accessProgressBar');
      const texto = document.getElementById('accessProgressValue');
      const etapa = document.getElementById('accessProgressLabel');
      if (barra) barra.style.width = `${progresso.valor}%`;
      if (texto) texto.textContent = `${progresso.valor}%`;
      if (etapa) etapa.textContent = progresso.rotulo;
    };

    janela.__avantalabReiniciarProgressoVendas = (rotulo) => {
      progresso.grupos = {
        shell: Number(progresso.grupos.shell || 0),
        scripts: Number(progresso.grupos.scripts || 0),
      };
      progresso.valor = Math.round(
        pesosProgresso.shell * progresso.grupos.shell
        + pesosProgresso.scripts * progresso.grupos.scripts,
      );
      progresso.rotulo = rotulo || 'Validando sua sessão';
      janela.__avantalabAtualizarProgressoVendas?.(
        'auth',
        0,
        1,
        progresso.rotulo,
      );
    };
    janela.__avantalabAtualizarProgressoVendas(
      'shell',
      1,
      1,
      'Preparando recursos do aplicativo',
    );

    janela.VENDAS_MOBILE_CONFIG = {
      supabaseUrl,
      supabaseAnonKey,
    };

    const arquivos = [
      `${caminhoRecursos}/vendor/supabase.min.js`,
      `${caminhoRecursos}/config.js`,
      `${caminhoRecursos}/supabase-client.js`,
      `${caminhoRecursos}/app.js`,
    ];

    const falhar = (arquivo: string) => {
      const app = document.getElementById('app');
      if (!app) return;
      app.innerHTML = [
        '<section class="splash-card">',
        '<p>Não foi possível carregar o AvantaVendas.</p>',
        '<button class="primary" type="button" onclick="window.location.reload()">',
        'Tentar novamente',
        '</button>',
        '</section>',
      ].join('');
      console.error(`Falha ao carregar ${arquivo}`);
    };

    const carregar = (indice: number) => {
      if (indice >= arquivos.length) return;
      const arquivo = arquivos[indice];
      const script = document.createElement('script');
      script.src = `${arquivo}?v=${encodeURIComponent(assetVersion)}`;
      script.dataset.avantavendasRecurso = arquivo;
      script.onload = () => {
        janela.__avantalabAtualizarProgressoVendas?.(
          'scripts',
          indice + 1,
          arquivos.length,
          indice + 1 === arquivos.length
            ? 'Aplicativo carregado'
            : 'Carregando componentes seguros',
        );
        carregar(indice + 1);
      };
      script.onerror = () => falhar(arquivo);
      document.body.appendChild(script);
    };

    carregar(0);

    const registrarPwa = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        const registro = await navigator.serviceWorker.register(
          `/avantavendas/sw.js?v=${encodeURIComponent(assetVersion)}`,
          {
            scope: '/avantavendas',
            updateViaCache: 'none',
          },
        );
        await registro.update();
      } catch (error) {
        console.warn('Não foi possível atualizar o PWA AvantaVendas.', error);
      }
    };

    if (document.readyState === 'complete') {
      void registrarPwa();
    } else {
      window.addEventListener('load', registrarPwa, { once: true });
    }
  }, [assetVersion, caminhoRecursos, supabaseAnonKey, supabaseUrl]);

  return null;
}
