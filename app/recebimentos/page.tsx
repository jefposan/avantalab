import type { Metadata, Viewport } from 'next';
import RecebimentosClient from './RecebimentosClient';

// Preview de desenvolvimento — a entrada oficial de gestão é o modal no Gestão Web.
export const metadata: Metadata = {
  title: 'AvantaLab · Preview Recebimentos Presencial',
  description: 'Preview de desenvolvimento do módulo Recebimentos Presencial.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RecebimentosPage() {
  return <RecebimentosClient />;
}
