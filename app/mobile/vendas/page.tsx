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
  const assetVersion = '20260712-1';

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
        <section className="splash-card"><span className="loader" /><p>Carregando Vendas Mobile...</p></section>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__VENDAS_MOBILE_EMBEDDED__=true;window.VENDAS_MOBILE_CONFIG={supabaseUrl:${JSON.stringify(supabaseUrl)},supabaseAnonKey:${JSON.stringify(supabaseAnonKey)}};`,
        }}
      />
      <script src={`/vendas-mobile/vendor/supabase.min.js?v=${assetVersion}`} defer />
      <script src={`/vendas-mobile/config.js?v=${assetVersion}`} defer />
      <script src={`/vendas-mobile/supabase-client.js?v=${assetVersion}`} defer />
      <script src={`/vendas-mobile/app.js?v=${assetVersion}`} defer />
    </main>
  );
}
