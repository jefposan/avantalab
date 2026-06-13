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
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        id="mobile-root"
        data-supabase-url={supabaseUrl}
        data-supabase-anon-key={supabaseAnonKey}
      >
        <section
          className="fixed inset-0 flex items-center justify-center overflow-hidden px-4"
          style={{
            height: '100dvh',
            backgroundColor: '#eef6fb',
            backgroundImage:
              "url('/images/bg-avantalab-mobile-1080x1920.png')",
            backgroundSize: '100% auto',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundAttachment: 'fixed',
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
      <script src="/mobile-app.js?v=31" defer />
    </main>
  );
}
