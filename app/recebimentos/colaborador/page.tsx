import type { Metadata, Viewport } from 'next';
import ColaboradorApp from '../ColaboradorApp';

const colaboradorUrl = 'https://avantalab.com.br/recebimentos/colaborador';
const shareImage = 'https://avantalab.com.br/images/recebimentos-share-meta.jpg?v=160';

// URL exclusiva do colaborador — alvo do PWA "Recebimentos em Campo".
export const metadata: Metadata = {
  metadataBase: new URL('https://avantalab.com.br'),
  title: 'AvantaLab · Recebimentos Presencial',
  description: 'Registre recebimentos em campo com CPF e senha.',
  manifest: '/recebimentos-manifest.json',
  alternates: { canonical: colaboradorUrl },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Recebimentos' },
  icons: {
    icon: '/images/recebimentos-icon-192.png',
    apple: '/images/recebimentos-icon-180.png',
  },
  openGraph: {
    title: 'AvantaLab · Recebimentos Presencial',
    description: 'Sistema de gestão financeira e operacional para recebimentos em campo.',
    url: colaboradorUrl,
    locale: 'pt_BR',
    type: 'website',
    siteName: 'AvantaLab',
    images: [{
      url: shareImage,
      secureUrl: shareImage,
      width: 1200,
      height: 628,
      alt: 'AvantaLab · Recebimentos Presencial',
      type: 'image/jpeg',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AvantaLab · Recebimentos Presencial',
    description: 'Sistema de gestão financeira e operacional para recebimentos em campo.',
    images: [shareImage],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#003E73',
};

export default function RecebimentosColaboradorPage() {
  return (
    <>
      <link
        rel="preload"
        href="/images/bg-avantalab-mobile-1080x1920.webp"
        as="image"
        type="image/webp"
      />
      <ColaboradorApp />
    </>
  );
}
