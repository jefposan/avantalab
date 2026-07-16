import type { Metadata, Viewport } from 'next';
import AvaMobileBridge from '../AvaMobileBridge';

export const metadata: Metadata = {
  title: 'Vendas Mobile | AvantaLab',
  description: 'Clientes, produtos, pedidos e controle de vendas mobile.',
  manifest: '/vendas-mobile/manifest.webmanifest',
  icons: { icon: '/images/vendas-icon-192.png', apple: '/images/vendas-icon-180.png' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Vendas AvantaLab' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#55b9b1',
};

export default function VendasMobilePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const assetVersion = '20260716-10';
  const bootstrap = `
    (function () {
      window.__VENDAS_MOBILE_EMBEDDED__ = true;
      window.__VENDAS_MOBILE_VERSION__ = ${JSON.stringify(assetVersion)};
      var pesosProgresso = { shell: 5, scripts: 20, auth: 10, access: 15, data: 40, resources: 10 };
      var progresso = window.__AVANTALAB_VENDAS_PROGRESSO__ || { grupos: {}, valor: 0, rotulo: 'Iniciando o Vendas Mobile' };

      window.__AVANTALAB_VENDAS_PROGRESSO__ = progresso;
      window.__avantalabAtualizarProgressoVendas = function (grupo, concluido, total, rotulo) {
        var fracao = total > 0 ? Math.max(0, Math.min(1, Number(concluido || 0) / Number(total))) : 0;
        progresso.grupos[grupo] = Math.max(Number(progresso.grupos[grupo] || 0), fracao);
        var calculado = Object.keys(pesosProgresso).reduce(function (soma, chave) {
          return soma + pesosProgresso[chave] * Number(progresso.grupos[chave] || 0);
        }, 0);
        progresso.valor = Math.max(progresso.valor, Math.min(100, Math.round(calculado)));
        if (rotulo) progresso.rotulo = rotulo;
        var barra = document.getElementById('accessProgressBar');
        var texto = document.getElementById('accessProgressValue');
        var etapa = document.getElementById('accessProgressLabel');
        if (barra) barra.style.width = progresso.valor + '%';
        if (texto) texto.textContent = progresso.valor + '%';
        if (etapa) etapa.textContent = progresso.rotulo;
      };
      window.__avantalabReiniciarProgressoVendas = function (rotulo) {
        progresso.grupos = {
          shell: Number(progresso.grupos.shell || 0),
          scripts: Number(progresso.grupos.scripts || 0),
        };
        progresso.valor = Math.round(
          pesosProgresso.shell * progresso.grupos.shell +
          pesosProgresso.scripts * progresso.grupos.scripts
        );
        progresso.rotulo = rotulo || 'Validando sua sessão';
        window.__avantalabAtualizarProgressoVendas('auth', 0, 1, progresso.rotulo);
      };
      window.__avantalabAtualizarProgressoVendas('shell', 1, 1, 'Preparando recursos do aplicativo');
      var alturaPreparacao = Number(sessionStorage.getItem('avantalab.vendas_mobile.preparing_viewport_height'));
      if (Number.isFinite(alturaPreparacao) && alturaPreparacao > 0) {
        document.documentElement.style.setProperty('--vendas-preparing-height', alturaPreparacao + 'px');
      }
      window.VENDAS_MOBILE_CONFIG = {
        supabaseUrl: ${JSON.stringify(supabaseUrl)},
        supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)}
      };

      var arquivos = [
        '/vendas-mobile/vendor/supabase.min.js',
        '/vendas-mobile/config.js',
        '/vendas-mobile/supabase-client.js',
        '/vendas-mobile/app.js'
      ];

      function falhar(arquivo) {
        var app = document.getElementById('app');
        if (!app) return;
        app.innerHTML = '<section class="splash-card"><p>Não foi possível carregar o Vendas Mobile.</p><button class="primary" type="button" onclick="window.location.reload()">Tentar novamente</button></section>';
        console.error('Falha ao carregar ' + arquivo);
      }

      function carregar(indice) {
        if (indice >= arquivos.length) return;
        var script = document.createElement('script');
        script.src = arquivos[indice] + '?v=${assetVersion}';
        script.onload = function () {
          window.__avantalabAtualizarProgressoVendas(
            'scripts',
            indice + 1,
            arquivos.length,
            indice + 1 === arquivos.length ? 'Aplicativo carregado' : 'Carregando componentes seguros'
          );
          carregar(indice + 1);
        };
        script.onerror = function () { falhar(arquivos[indice]); };
        document.body.appendChild(script);
      }

      carregar(0);
    })();
  `;

  return (
    <main id="vendas-mobile-shell">
      <style>{`
        html, body, #vendas-mobile-shell { width: 100%; min-height: 100%; margin: 0; }
        #vendas-mobile-shell { min-height: 100svh; overflow-x: hidden; }
        #vendas-mobile-shell > #app.app-shell {
          width: 100%;
          max-width: none;
          min-height: 100svh;
          margin: 0;
          padding: 0;
        }
        #vendas-mobile-shell .splash-card {
          width: 100%;
          min-height: 100svh;
          border-radius: 0;
        }
      `}</style>
      <link rel="stylesheet" href={`/vendas-mobile/styles.css?v=${assetVersion}`} />
      <div id="app" className="app-shell">
        <section className="login-screen preparing-access-screen">
          <div className="preparing-access-card">
            <p>AvantaLab</p><span className="loader" /><h1>Preparando acesso</h1><small id="accessProgressLabel">Iniciando o Vendas Mobile</small><div className="access-progress" aria-label="Carregando acesso"><i id="accessProgressBar" style={{ width: '5%' }} /></div><b id="accessProgressValue" className="access-progress-value">5%</b>
          </div>
        </section>
      </div>
      <script
        dangerouslySetInnerHTML={{ __html: bootstrap }}
      />
      <AvaMobileBridge />
    </main>
  );
}
