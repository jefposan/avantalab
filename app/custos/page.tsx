import type { Metadata } from 'next';
import CustosClient from './CustosClient';

export const metadata: Metadata = {
  title: 'Custos e Precificação — AvantaLab',
  description: 'Cadastro de produtos, composição de custos, histórico e simulações de preço.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function CustosPage({ searchParams }: { searchParams: Promise<{ empresaId?: string | string[]; novo?: string | string[]; retorno?: string | string[] }> }) {
  const params = await searchParams;
  const empresaId = Array.isArray(params.empresaId) ? params.empresaId[0] : params.empresaId;
  const novo = Array.isArray(params.novo) ? params.novo[0] : params.novo;
  const retorno = Array.isArray(params.retorno) ? params.retorno[0] : params.retorno;
  return <CustosClient companyId={String(empresaId || '').trim()} initialNewType={novo === 'produto' ? 'produto' : undefined} returnTo={retorno === 'vendas' ? 'vendas' : undefined} />;
}
