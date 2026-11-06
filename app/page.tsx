import type { Metadata } from 'next';
import { AvantaLandingPage } from './components/AvantaLandingPage';

const siteUrl = 'https://avantalab.com.br';

export const metadata: Metadata = {
  title: 'Laboratório de Marcas | AvantaLab',
  description: 'Do zero ao operacional: transformamos ideias em marcas prontas para entrar no mercado.',
  alternates: { canonical: siteUrl },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'AvantaLab | Do zero ao operacional',
    description: 'Transformamos ideias em marcas prontas para avançar.',
    url: siteUrl,
    siteName: 'AvantaLab',
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: '/images/avantalab-share-meta-safe-center-v2.jpg', width: 1200, height: 628, alt: 'AvantaLab — Laboratório de Marcas' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AvantaLab | Do zero ao operacional',
    description: 'Transformamos ideias em marcas prontas para avançar.',
    images: ['/images/avantalab-share-meta-safe-center-v2.jpg'],
  },
};

export default function LaboratorioDeMarcasPage() {
  return <AvantaLandingPage />;
}
