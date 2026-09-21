import type { Metadata } from 'next';
import CustosClient from './CustosClient';
import { lerContextoVisualModulo } from '@/app/lib/navegacao-modulos';

export const metadata: Metadata = {
  title: 'Custos e Precificação — AvantaLab',
  description: 'Cadastro de produtos, composição de custos, histórico e simulações de preço.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function CustosPage({ searchParams }: { searchParams: Promise<{ empresaId?: string | string[]; novo?: string | string[]; retorno?: string | string[]; __avctx?: string | string[] }> }) {
  const params = await searchParams;
  const empresaId = Array.isArray(params.empresaId) ? params.empresaId[0] : params.empresaId;
  const novo = Array.isArray(params.novo) ? params.novo[0] : params.novo;
  const retorno = Array.isArray(params.retorno) ? params.retorno[0] : params.retorno;
  const contextoVisual = lerContextoVisualModulo(Array.isArray(params.__avctx) ? params.__avctx[0] : params.__avctx, 'custos', empresaId);
  return <CustosClient companyId={String(empresaId || '').trim()} initialNewType={novo === 'produto' ? 'produto' : undefined} returnTo={retorno === 'vendas' ? 'vendas' : undefined} initialContext={contextoVisual} />;
}
