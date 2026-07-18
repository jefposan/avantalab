import type { Metadata, Viewport } from 'next';
import ColaboradorApp from '../ColaboradorApp';

// URL exclusiva do colaborador — alvo do PWA "Recebimentos em Campo".
export const metadata: Metadata = {
  title: 'Recebimentos em Campo',
  description: 'Registre os recebimentos em dinheiro direto do campo.',
  manifest: '/recebimentos-manifest.json',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Recebimentos' },
  icons: {
    icon: '/images/recebimentos-icon-192.png',
    apple: '/images/recebimentos-icon-180.png',
  },
  openGraph: {
    title: 'Recebimentos — AvantaLab',
    description: 'Sistema de gestão financeira e operacional para recebimentos.',
    type: 'website',
    siteName: 'AvantaLab',
    images: [
      {
        url: '/images/recebimentos-colaborador-share.png',
        width: 1200,
        height: 628,
        alt: 'AvantaLab — Sistema de Gestão Financeira e Operacional — Recebimentos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recebimentos — AvantaLab',
    description: 'Sistema de gestão financeira e operacional para recebimentos.',
    images: ['/images/recebimentos-colaborador-share.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#003E73',
};

export default function RecebimentosColaboradorPage() {
  return <ColaboradorApp />;
}
