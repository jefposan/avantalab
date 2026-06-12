import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'AvantaLab Gestao Mobile',
  manifest: '/mobile-manifest.json',
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
    <main className="min-h-screen bg-slate-950 text-white">
      <div id="mobile-root">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            AvantaLab Gestao
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight">Carregando mobile...</h1>
          <p className="mt-3 text-sm text-slate-300">
            Preparando os controles do app.
          </p>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.AVANTALAB_MOBILE_CONFIG = {
              supabaseUrl: ${JSON.stringify(supabaseUrl)},
              supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)}
            };
          `,
        }}
      />
      <script src="/mobile-supabase.js" />
      <script src="/mobile-app.js?v=13" />
    </main>
  );
}
