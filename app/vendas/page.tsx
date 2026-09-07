import type { Metadata } from 'next';
import VendasIntegrado from './VendasIntegrado';

export const metadata: Metadata = {
  title: 'Vendas e Serviços — AvantaLab',
  robots: { index: false, follow: false, nocache: true },
};

export default function VendasPage() {
  return <VendasIntegrado />;
}
