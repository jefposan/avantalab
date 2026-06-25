import type { Metadata, Viewport } from 'next';

const shareImage = 'https://avantalab.com.br/images/ponto-share-meta.jpg';

export const metadata: Metadata = {
  title: 'AvantaLab · Controle de Ponto',
  description: 'Registre seu ponto com CPF e senha.',
  manifest: '/ponto-manifest.json',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Avanta Ponto' },
  icons: {
    icon: '/images/ponto-icon-192.png',
    apple: '/images/ponto-icon-180.png',
  },
  openGraph: {
    title: 'AvantaLab · Controle de Ponto',
    description: 'Registre seu ponto de forma simples, com CPF e senha.',
    type: 'website',
    siteName: 'AvantaLab',
    images: [{ url: shareImage, secureUrl: shareImage, width: 1200, height: 628, alt: 'AvantaLab · Controle de Ponto', type: 'image/jpeg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AvantaLab · Controle de Ponto',
    description: 'Registre seu ponto de forma simples, com CPF e senha.',
    images: [shareImage],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#003E73',
};

export default function PontoPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    <main className="min-h-screen bg-slate-100">
      <link
        rel="preload"
        href="/images/bg-avantalab-mobile-1080x1920.webp"
        as="image"
        type="image/webp"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .avantalab-mobile-bg {
              background-color: #eef6fb;
              background-image: var(--avantalab-mobile-bg-overlay, none), image-set(url('/images/bg-avantalab-mobile-1080x1920.webp') type('image/webp'), url('/images/bg-avantalab-mobile-1080x1920.png') type('image/png'));
              background-position: center bottom;
              background-repeat: no-repeat;
              background-size: 100% auto;
              background-attachment: fixed;
            }
            @media (min-aspect-ratio: 9/16) { .avantalab-mobile-bg { background-size: auto 100%; } }
            @media (max-aspect-ratio: 9/18) { .avantalab-mobile-bg { background-size: auto 100%; } }
            @supports (-webkit-touch-callout: none) { .avantalab-mobile-bg { background-attachment: scroll; } }
            @media print {
              body * { visibility: hidden !important; }
              #ponto-relatorio-print, #ponto-relatorio-print * { visibility: visible !important; }
              #ponto-relatorio-print { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
              .no-print { display: none !important; }
            }
          `,
        }}
      />
      <div
        id="ponto-root"
        data-supabase-url={supabaseUrl}
        data-supabase-anon-key={supabaseAnonKey}
      >
        <section className="avantalab-mobile-bg fixed inset-0 flex items-center justify-center overflow-hidden px-4" style={{ height: '100dvh' }}>
          <div className="w-full max-w-xs rounded-3xl border border-white/40 bg-white/25 p-5 text-center text-slate-900 shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">AvantaLab</p>
            <h1 className="mt-2 text-xl font-black">Controle de Ponto</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">Preparando acesso…</p>
          </div>
        </section>
      </div>

      <script src="/mobile-supabase.js" defer />
      <script src="/ponto-app.js?v=7" defer />
    </main>
  );
}
