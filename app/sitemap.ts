import type { MetadataRoute } from 'next';

const siteUrl = 'https://avantalab.com.br';
const landingPublicadoEm = new Date('2026-07-29T12:30:00-03:00');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: landingPublicadoEm, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/suporte`, lastModified: landingPublicadoEm, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/termos`, lastModified: landingPublicadoEm, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/privacidade`, lastModified: landingPublicadoEm, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/cookies`, lastModified: landingPublicadoEm, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
