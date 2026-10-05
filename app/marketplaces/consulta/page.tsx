import type { Metadata, Viewport } from 'next';
import MarketplaceMobileApp from './MarketplaceMobileApp';

export const metadata: Metadata = {
  title: 'AvantaPreços — Consulta de preços | AvantaLab',
  description: 'Consulte produtos e preços do Mercado Livre pelo EAN.',
  manifest: '/marketplaces/consulta/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/images/marketplaces-mobile-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/marketplaces-mobile-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/images/marketplaces-mobile-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'AvantaPreços' },
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#003E73',
};

export default function MarketplaceMobilePage() {
  return <MarketplaceMobileApp />;
}
