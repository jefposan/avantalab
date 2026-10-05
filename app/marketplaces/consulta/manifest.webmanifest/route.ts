import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

const manifest: MetadataRoute.Manifest = {
  id: '/marketplaces/consulta',
  name: 'AvantaLab Marketplaces',
  short_name: 'Marketplaces',
  description: 'Consulta rápida de produtos e preços por EAN.',
  start_url: '/marketplaces/consulta',
  scope: '/marketplaces/consulta',
  display: 'standalone',
  background_color: '#f4f7f8',
  theme_color: '#003E73',
  orientation: 'portrait',
  icons: [
    { src: '/images/marketplaces-mobile-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/images/marketplaces-mobile-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
};

export async function GET() {
  return Response.json(manifest, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/manifest+json; charset=utf-8',
    },
  });
}
