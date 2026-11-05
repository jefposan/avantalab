import {NextResponse} from 'next/server';
import {authorizeMarketplace,MarketplaceError,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {integrationAdapter} from '@/app/modules/marketplaces/services/integration-adapters';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){try{
 const body=await request.json();
 if(!['capabilities','sync','listing','action'].includes(body.operation))throw new MarketplaceError(400,'invalid_operation','Operação inválida.');
 const {db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,body.operation==='action'?'manage':'view');
 const adapter=await integrationAdapter(db,empresaId,body.connectionId);
 const result=body.operation==='capabilities'?{provider:adapter.provider,capabilities:adapter.capabilities}:body.operation==='sync'?await adapter.sync():body.operation==='listing'?{listing:await adapter.read(body.id)}:await adapter.mutate(usuario.id,body);
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return managementFailure(error);}}
