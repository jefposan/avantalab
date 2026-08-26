import type { Metadata } from 'next';
import CustosClient from './CustosClient';

export const metadata: Metadata = {
  title: 'Custos e Precificação — AvantaLab',
  description: 'Cadastro de produtos, composição de custos, histórico e simulações de preço.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function CustosPage({ searchParams }: { searchParams: Promise<{ empresaId?: string | string[] }> }) {
  const params = await searchParams;
  const empresaId = Array.isArray(params.empresaId) ? params.empresaId[0] : params.empresaId;
  return <CustosClient companyId={String(empresaId || '').trim()} />;
}
