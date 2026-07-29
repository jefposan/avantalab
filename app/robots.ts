import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    // Declaração explícita para os crawlers de busca. A Cloudflare acrescenta
    // regras próprias para Google-Extended (IA), que não devem se confundir
    // com o Googlebot usado pelo Search Console.
    rules: [
      { userAgent: ['Googlebot', 'Bingbot'], allow: '/' },
      {
        userAgent: '*',
        allow: ['/', '/termos', '/privacidade', '/cookies', '/suporte'],
        disallow: ['/gestao', '/admin', '/api/', '/preview/', '/mobile/', '/ponto/', '/recebimentos/'],
      },
    ],
    sitemap: 'https://avantalab.com.br/sitemap.xml',
    host: 'https://avantalab.com.br',
  };
}
