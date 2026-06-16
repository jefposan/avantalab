import type { Metadata, Viewport } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://avantalab.com.br';
const shareImage = 'https://avantalab.com.br/images/avantalab-share-meta-safe-center-v2.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'AvantaLab Gestão Mobile',
  description:
    'Controle entradas, despesas e saldo do seu negócio ou das suas finanças pessoais pelo celular.',
  manifest: '/mobile-manifest.json',
  openGraph: {
    title: 'AvantaLab Gestão',
    description:
      'Descubra quanto realmente sobra no seu negócio ou nas suas despesas pessoais.',
    type: 'website',
    siteName: 'AvantaLab Gestão',
    images: [
      {
        url: shareImage,
        secureUrl: shareImage,
        width: 1200,
        height: 628,
        alt: 'AvantaLab Gestão',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AvantaLab Gestão',
    description:
      'Controle entradas, despesas e saldo de forma simples pelo celular.',
    images: [shareImage],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AvantaLab',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#003E73',
};

export default function MobilePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .avantalab-mobile-bg {
              background-color: #eef6fb;
              background-image: var(--avantalab-mobile-bg-overlay, none), url('/images/bg-avantalab-mobile-1080x1920.png');
              background-position: center bottom;
              background-repeat: no-repeat;
              background-size: 100% auto;
              background-attachment: fixed;
            }

            @media (min-aspect-ratio: 9/16) {
              .avantalab-mobile-bg {
                background-size: auto 100%;
              }
            }

            @media (max-aspect-ratio: 9/18) {
              .avantalab-mobile-bg {
                background-size: auto 100%;
              }
            }

            @supports (-webkit-touch-callout: none) {
              .avantalab-mobile-bg {
                background-attachment: scroll;
              }
            }
          `,
        }}
      />
      <div
        id="mobile-root"
        data-supabase-url={supabaseUrl}
        data-supabase-anon-key={supabaseAnonKey}
      >
        <section
          className="avantalab-mobile-bg fixed inset-0 flex items-center justify-center overflow-hidden px-4"
          style={{
            height: '100dvh',
          }}
        >
          <div
            className="w-full max-w-xs rounded-3xl border border-white/40 bg-white/25 p-5 text-center text-slate-900 shadow-2xl backdrop-blur-xl"
          >
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">
              AvantaLab
            </p>
            <h1 className="mt-2 text-xl font-black">
              Preparando acesso
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Carregando seus dados com seguranca.
            </p>
          </div>
        </section>
      </div>

      <script src="/mobile-supabase.js" defer />
      <script src="/mobile-app.js?v=62" defer />
    </main>
  );
}
