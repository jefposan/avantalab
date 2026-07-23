import type { MetadataRoute } from 'next';

export const manifestoAvantaVendas: MetadataRoute.Manifest = {
  id: '/avantavendas',
  name: 'AvantaVendas',
  short_name: 'AvantaVendas',
  description: 'Clientes, produtos, pedidos e controle de vendas AvantaLab.',
  start_url: '/avantavendas',
  scope: '/avantavendas',
  display: 'standalone',
  background_color: '#001827',
  theme_color: '#003E73',
  orientation: 'portrait',
  icons: [
    {
      src: '/images/avanta-vendas-icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/images/avanta-vendas-icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
  ],
};
