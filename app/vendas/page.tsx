import type { Metadata } from 'next';
import VendasIntegrado from './VendasIntegrado';
import { lerContextoVisualModulo } from '@/app/lib/navegacao-modulos';

export const metadata: Metadata = {
  title: 'Vendas e Serviços — AvantaLab',
  robots: { index: false, follow: false, nocache: true },
};

export default async function VendasPage({ searchParams }: { searchParams: Promise<{ empresaId?: string | string[]; __avctx?: string | string[] }> }) {
  const params = await searchParams;
  const empresaId = Array.isArray(params.empresaId) ? params.empresaId[0] : params.empresaId;
  const contextoVisual = lerContextoVisualModulo(Array.isArray(params.__avctx) ? params.__avctx[0] : params.__avctx, 'vendas', empresaId);
  return <VendasIntegrado initialContext={contextoVisual} />;
}
