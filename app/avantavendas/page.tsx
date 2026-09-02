import type { Metadata, Viewport } from 'next';
import AvaMobileBridge from '../mobile/AvaMobileBridge';
import AvantaVendasBootstrap from './AvantaVendasBootstrap';
import { AVANTAVENDAS_VERSION } from './version';

export const metadata: Metadata = {
  title: 'AvantaVendas',
  description: 'Clientes, produtos, pedidos e controle de vendas AvantaLab.',
  manifest: '/avantavendas/manifest.webmanifest',
  icons: {
    icon: '/images/avanta-vendas-pwa-192.png',
    apple: '/images/avanta-vendas-pwa-180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AvantaVendas',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#003E73',
};

export default function AvantaVendasPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const assetVersion = AVANTAVENDAS_VERSION;
  const caminhoRecursos = '/avantavendas/recursos';

  return (
    <main id="avantavendas-shell">
      <style>{`
        html, body, #avantavendas-shell {
          width: 100%;
          min-height: 100%;
          margin: 0;
        }
        #avantavendas-shell {
          min-height: 100svh;
          overflow-x: hidden;
        }
        #avantavendas-shell > #app.app-shell {
          width: 100%;
          max-width: none;
          min-height: 100svh;
          margin: 0;
          padding: 0;
        }
        #avantavendas-shell .splash-card {
          width: 100%;
          min-height: 100svh;
          border-radius: 0;
        }
      `}</style>
      <link
        rel="stylesheet"
        href={`${caminhoRecursos}/styles.css?v=${assetVersion}`}
      />
      {[
        'vendor/supabase.min.js',
        'config.js',
        'supabase-client.js',
        'payment-receipt-v2.js',
        'order-receipt-v2.js',
        'app.js',
      ].map((arquivo) => (
        <link
          key={arquivo}
          rel="preload"
          href={`${caminhoRecursos}/${arquivo}?v=${assetVersion}`}
          as="script"
        />
      ))}
      <div id="app" className="app-shell">
        <section className="login-screen preparing-access-screen">
          <div className="access-brand-zone">
            <img
              src="/images/logo-avantalab-oficial.png"
              alt="AvantaLab — Do zero ao operacional"
            />
          </div>
          <div className="preparing-access-card" role="status" aria-live="polite" aria-busy="true">
            <span className="loader" aria-hidden="true" />
            <h1>Preparando acesso</h1>
            <small id="accessProgressLabel">Iniciando o AvantaVendas</small>
            <div className="access-progress" aria-label="Carregando acesso">
              <i id="accessProgressBar" style={{ width: '5%' }} />
            </div>
            <b id="accessProgressValue" className="access-progress-value">5%</b>
          </div>
        </section>
      </div>
      <AvantaVendasBootstrap
        assetVersion={assetVersion}
        caminhoRecursos={caminhoRecursos}
        supabaseAnonKey={supabaseAnonKey}
        supabaseUrl={supabaseUrl}
      />
      <AvaMobileBridge />
    </main>
  );
}
