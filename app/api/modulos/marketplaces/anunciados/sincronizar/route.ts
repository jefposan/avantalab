import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import {integrationAdapter} from '@/app/modules/marketplaces/services/integration-adapters';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizeMarketplace(request, body.empresaId);
    const adapter=await integrationAdapter(db,empresaId,body.connectionId);
    if(body.reconcileKnown===true&&adapter.provider==='mercado_livre'){
      const {loadConnection}=await import('@/app/modules/marketplaces/services/mercadolivre-management');
      const {refreshKnownListingStatuses}=await import('@/app/modules/marketplaces/services/listing-status-refresh');
      return NextResponse.json(await refreshKnownListingStatuses(db,await loadConnection(db,empresaId,body.connectionId)),{headers:{'Cache-Control':'no-store'}});
    }
    return NextResponse.json(await adapter.sync());
  } catch (error) { return managementFailure(error); }
}
