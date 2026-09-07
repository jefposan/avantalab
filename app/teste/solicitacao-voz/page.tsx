import type { Metadata, Viewport } from 'next';
import VoiceCommandLab from './VoiceCommandLab';

export const metadata: Metadata = {
  title: 'Laboratório de solicitação por voz',
  description: 'Experimento privado de comandos por voz do Avanta Vendas.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f4f8fb',
};

export default function VoiceCommandLabPage() {
  return (
    <VoiceCommandLab
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}
      configuredLabOrigin={process.env.NEXT_PUBLIC_SOLICITACAO_VOZ_LAB_ORIGIN || ''}
      allowLocalLab={process.env.NODE_ENV === 'development'}
    />
  );
}
