import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Vendas Mobile | AvantaLab',
  description: 'Clientes, produtos, pedidos e controle de vendas mobile.',
  manifest: '/vendas-mobile/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Vendas Mobile' },
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
  const assetVersion = '20260712-3';
  const bootstrap = `
    (function () {
      window.__VENDAS_MOBILE_EMBEDDED__ = true;
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
        #vendas-mobile-shell { min-height: 100dvh; overflow-x: hidden; }
        #vendas-mobile-shell > #app.app-shell {
          width: 100%;
          max-width: none;
          min-height: 100dvh;
          margin: 0;
          padding: 0;
        }
        #vendas-mobile-shell .splash-card {
          width: 100%;
          min-height: 100dvh;
          border-radius: 0;
        }
      `}</style>
      <link rel="stylesheet" href={`/vendas-mobile/styles.css?v=${assetVersion}`} />
      <div id="app" className="app-shell">
        <section className="login-screen">
          <div className="login-brand"><strong>Gestão de vendas</strong></div>
          <form>
            <div className="login-methods">
              <button type="button" className="active"><svg className="svg-icon" aria-hidden="true"><use href="/vendas-mobile/assets/icons.svg#mail" /></svg>E-mail</button>
              <button type="button"><svg className="svg-icon" aria-hidden="true"><use href="/vendas-mobile/assets/icons.svg#phone" /></svg>Telefone</button>
            </div>
            <label>E-mail<div className="login-field"><svg className="svg-icon" aria-hidden="true"><use href="/vendas-mobile/assets/icons.svg#mail" /></svg><input type="email" placeholder="Digite seu e-mail" /></div></label>
            <label>Senha<div className="login-field password-field"><svg className="svg-icon" aria-hidden="true"><use href="/vendas-mobile/assets/icons.svg#lock" /></svg><input type="password" placeholder="Digite sua senha" /><button type="button" className="password-toggle" aria-label="Exibir senha"><svg className="svg-icon" aria-hidden="true"><use href="/vendas-mobile/assets/icons.svg#eye" /></svg></button></div></label>
            <div className="login-options"><label className="remember-option"><input type="checkbox" defaultChecked /><span />Lembrar-me</label><button type="button" className="forgot-link">Esqueceu a senha?</button></div>
            <button className="primary login-submit" type="button">Entrar</button>
            <p className="login-register">Não tem conta? <button type="button">Cadastre-se</button></p>
          </form>
        </section>
      </div>
      <script
        dangerouslySetInnerHTML={{ __html: bootstrap }}
      />
    </main>
  );
}
