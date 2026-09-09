import type { Metadata } from 'next';
import RecebimentosPaginaClient from './RecebimentosPaginaClient';

export const metadata: Metadata = {
  title: 'Operações de Campo — AvantaLab',
  description: 'Empresas, locais, recebimentos, serviços e conferência em campo.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function RecebimentosPage({ searchParams }: { searchParams: Promise<{ empresaId?: string | string[] }> }) {
  const params = await searchParams;
  const empresaId = Array.isArray(params.empresaId) ? params.empresaId[0] : params.empresaId;
  return <RecebimentosPaginaClient empresaId={String(empresaId || '').trim()} />;
}
