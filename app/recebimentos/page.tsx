import type { Metadata, Viewport } from 'next';
import RecebimentosClient from './RecebimentosClient';

// Estudo isolado — não indexar e não linkar no menu principal.
export const metadata: Metadata = {
  title: 'AvantaLab · Recebimentos em Campo',
  description: 'Estudo isolado para controle de recebimentos em dinheiro em campo.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RecebimentosPage() {
  return <RecebimentosClient />;
}
