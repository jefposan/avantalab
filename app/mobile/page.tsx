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
      <div
        id="mobile-root"
        data-supabase-url={supabaseUrl}
        data-supabase-anon-key={supabaseAnonKey}
      >
        <section
          className="flex min-h-screen flex-col justify-start px-4 pb-8 pt-8"
          style={{
            minHeight: '100dvh',
            backgroundColor: '#eef6fb',
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0)),url('/images/bg-avantalab-mobile-1080x1920.png')",
            backgroundSize: '100% auto',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center bottom',
          }}
        >
          <div
            className="mx-auto w-full max-w-md rounded-3xl border border-white/35 p-5 text-slate-900 shadow-2xl backdrop-blur-xl"
            style={{ backgroundColor: 'rgba(255,255,255,.18)' }}
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.32em] text-sky-700">
              AvantaLab Gestao
            </p>
            <h1 className="text-3xl font-black text-slate-900">
              Acesse sua conta
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Preparando acesso mobile...
            </p>
          </div>
        </section>
      </div>

      <script src="/mobile-supabase.js" defer />
      <script src="/mobile-app.js?v=20" defer />
    </main>
  );
}
