import type { Metadata } from 'next';
import { AvantaLandingPage } from '../page';

export const metadata: Metadata = {
  title: 'Gestão financeira',
  description: 'Organize receitas, despesas, indicadores e a operação da empresa em uma única visão.',
  alternates: { canonical: 'https://avantalab.com.br/gestao-financeira' },
  openGraph: {
    title: 'Gestão financeira para empresas | AvantaLab',
    description: 'Organize receitas, despesas, indicadores e a operação da empresa em uma única visão.',
    url: 'https://avantalab.com.br/gestao-financeira',
    siteName: 'AvantaLab',
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: '/images/avantalab-share-meta-safe-center-v2.jpg', width: 1200, height: 628, alt: 'AvantaLab Gestão Financeira' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestão financeira para empresas | AvantaLab',
    description: 'Organize receitas, despesas, indicadores e a operação da empresa em uma única visão.',
    images: ['/images/avantalab-share-meta-safe-center-v2.jpg'],
  },
};

export default function GestaoFinanceiraPage() {
  return <AvantaLandingPage contexto="gestao" />;
}
