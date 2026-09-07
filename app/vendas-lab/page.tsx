import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import VendasCatalogoLab from './VendasCatalogoLab';

export const metadata: Metadata = {
  title: 'Laboratório Vendas — AvantaLab',
  robots: { index: false, follow: false, nocache: true },
};

export default function VendasLabPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <VendasCatalogoLab />;
}

