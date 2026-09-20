import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type CapacitorRuntime = {
  isNativePlatform?: () => boolean;
};

function executandoNaGestaoNativa() {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as Window & { Capacitor?: CapacitorRuntime }).Capacitor;
  try {
    return Boolean(capacitor?.isNativePlatform?.() && window.location.pathname.startsWith('/mobile'));
  } catch {
    return false;
  }
}

const gestaoNativa = executandoNaGestaoNativa();

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  gestaoNativa
    ? {
        auth: {
          // /mobile-app.js é o proprietário da sessão no WebView. As pontes
          // React compartilham o armazenamento, mas não iniciam outro refresh
          // nem disputam o Navigator Lock durante a abertura fria pelo push.
          autoRefreshToken: false,
          persistSession: true,
          detectSessionInUrl: false,
          lock: async (_nome, _limiteMs, executar) => executar(),
        },
      }
    : undefined,
);
