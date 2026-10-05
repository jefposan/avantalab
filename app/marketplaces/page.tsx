import type { Metadata } from 'next';
import MarketplacesClient from './MarketplacesClient';
import { lerContextoVisualModulo } from '@/app/lib/navegacao-modulos';

export const metadata: Metadata = {
  title: 'Anúncios em marketplaces — AvantaLab',
  description: 'Conecte contas e prepare anúncios por EAN e valor de venda.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function MarketplacesPage({ searchParams }: { searchParams: Promise<{ empresaId?: string | string[]; __avctx?: string | string[]; marketplaceConnection?: string | string[]; message?: string | string[] }> }) {
  const params = await searchParams;
  const empresaId = Array.isArray(params.empresaId) ? params.empresaId[0] : params.empresaId;
  const context = lerContextoVisualModulo(Array.isArray(params.__avctx) ? params.__avctx[0] : params.__avctx, 'marketplaces', empresaId);
  const connectionStatus = Array.isArray(params.marketplaceConnection) ? params.marketplaceConnection[0] : params.marketplaceConnection;
  const message = Array.isArray(params.message) ? params.message[0] : params.message;
  return <MarketplacesClient companyId={String(empresaId || '').trim()} initialContext={context} connectionStatus={connectionStatus} connectionMessage={message} />;
}
