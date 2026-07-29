import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/termos', '/privacidade', '/cookies', '/suporte'],
      disallow: ['/gestao', '/admin', '/api/', '/preview/', '/mobile/', '/ponto/', '/recebimentos/'],
    },
    sitemap: 'https://avantalab.com.br/sitemap.xml',
    host: 'https://avantalab.com.br',
  };
}
