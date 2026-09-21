import type { Metadata } from 'next';
import RecebimentosPaginaClient from './RecebimentosPaginaClient';
import { lerContextoVisualModulo } from '@/app/lib/navegacao-modulos';

export const metadata: Metadata = {
  title: 'Operações de Campo — AvantaLab',
  description: 'Empresas, locais, recebimentos, serviços e conferência em campo.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function RecebimentosPage({ searchParams }: { searchParams: Promise<{ empresaId?: string | string[]; __avctx?: string | string[] }> }) {
  const params = await searchParams;
  const empresaId = Array.isArray(params.empresaId) ? params.empresaId[0] : params.empresaId;
  const contextoVisual = lerContextoVisualModulo(Array.isArray(params.__avctx) ? params.__avctx[0] : params.__avctx, 'recebimentos_presencial', empresaId);
  return <RecebimentosPaginaClient empresaId={String(empresaId || '').trim()} initialContext={contextoVisual} />;
}
