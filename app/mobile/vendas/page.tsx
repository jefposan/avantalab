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
  const assetVersion = '20260714-04';
  const bootstrap = `
    (function () {
      window.__VENDAS_MOBILE_EMBEDDED__ = true;
      window.__VENDAS_MOBILE_VERSION__ = ${JSON.stringify(assetVersion)};
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
        script.onload = function () { carregar(indice + 1); };
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
            <p>AvantaLab</p><span className="loader" /><h1>Preparando acesso</h1><small>Estamos validando seu login e preparando seus dados com segurança.</small>
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
