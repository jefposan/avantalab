import type { MetadataRoute } from 'next';

const siteUrl = 'https://avantalab.com.br';
const landingLaboratorioAtualizadaEm = new Date('2026-09-04T12:00:00-03:00');
const paginasGestaoAtualizadasEm = new Date('2026-07-29T12:30:00-03:00');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: landingLaboratorioAtualizadaEm, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/gestao-financeira`, lastModified: paginasGestaoAtualizadasEm, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/controle-financeiro-pessoal`, lastModified: paginasGestaoAtualizadasEm, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/controle-de-ponto`, lastModified: paginasGestaoAtualizadasEm, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/vendas-mobile`, lastModified: paginasGestaoAtualizadasEm, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/suporte`, lastModified: paginasGestaoAtualizadasEm, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/termos`, lastModified: paginasGestaoAtualizadasEm, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/privacidade`, lastModified: paginasGestaoAtualizadasEm, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/cookies`, lastModified: paginasGestaoAtualizadasEm, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
