import type { Metadata } from 'next';
import ProjetosClient from './ProjetosClient';

export const metadata: Metadata = {
  title: 'AvantaProjetos — Mapa de Projetos',
  description: 'Planeje projetos, etapas, tarefas e responsáveis visualmente.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ empresaId?: string | string[]; projetoId?: string | string[]; retornoEmpresaId?: string | string[] }> }) {
  const params = await searchParams;
  const empresaId = Array.isArray(params.empresaId) ? params.empresaId[0] : params.empresaId;
  const projetoId = Array.isArray(params.projetoId) ? params.projetoId[0] : params.projetoId;
  const retornoEmpresaId = Array.isArray(params.retornoEmpresaId) ? params.retornoEmpresaId[0] : params.retornoEmpresaId;
  return <ProjetosClient companyId={String(empresaId || '').trim()} initialProjectId={String(projetoId || '').trim()} returnCompanyId={String(retornoEmpresaId || '').trim()} />;
}
