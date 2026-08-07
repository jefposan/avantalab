import type { Metadata } from 'next';
import ProjetosClient from './ProjetosClient';

export const metadata: Metadata = {
  title: 'AvantaProjetos — Mapa de Projetos',
  description: 'Planeje projetos, etapas, tarefas e responsáveis visualmente.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ empresaId?: string | string[] }> }) {
  const params = await searchParams;
  const empresaId = Array.isArray(params.empresaId) ? params.empresaId[0] : params.empresaId;
  return <ProjetosClient companyId={String(empresaId || '').trim()} />;
}
