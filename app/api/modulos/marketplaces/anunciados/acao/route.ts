import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import {integrationAdapter} from '@/app/modules/marketplaces/services/integration-adapters';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request:Request){
 try{
  const params=new URL(request.url).searchParams;
  const {db,empresaId}=await authorizeMarketplace(request,params.get('empresaId'),'manage');
  const adapter=await integrationAdapter(db,empresaId,params.get('connectionId'));
  const listing=await adapter.read(params.get('id')||'');
  if(adapter.provider==='mercado_livre'){
   const observed=await db.rpc('marketplace_observe_listing',{p_empresa:empresaId,p_connection:params.get('connectionId'),p_listing:listing.id,p_quantity:listing.stock,p_status:listing.substatus.includes('deleted')?'deleted':listing.status});
   if(observed.error)throw observed.error;
  }
  return NextResponse.json({listing},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return managementFailure(error);}
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const adapter=await integrationAdapter(db,empresaId,body.connectionId);
    return NextResponse.json(await adapter.mutate(usuario.id,body));
  } catch (error) { return managementFailure(error); }
}
