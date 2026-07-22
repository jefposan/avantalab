import type { Metadata, Viewport } from 'next';
import PortalAcesso from './PortalAcesso';

export const metadata: Metadata = {
  title: 'Acesso | AvantaLab',
  description: 'Entre uma vez e escolha entre Gestão e Vendas Mobile.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'overlays-content',
  themeColor: '#eef6fb',
  colorScheme: 'light',
};

export default function PaginaAcesso() {
  return <PortalAcesso />;
}
