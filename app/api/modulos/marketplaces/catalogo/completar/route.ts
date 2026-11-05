import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure,MarketplaceError} from '@/app/modules/marketplaces/services/management-access';
import {catalogCompletionStatus,completeCatalogStep} from '@/app/modules/marketplaces/services/catalog-completion';
export const runtime='nodejs';export const maxDuration=60;
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){try{
 const {db,empresaId}=await authorizeMarketplace(request,new URL(request.url).searchParams.get('empresaId'),'manage');
 return NextResponse.json(await catalogCompletionStatus(db,empresaId),{headers});
}catch(error){return managementFailure(error);}}
export async function POST(request:Request){try{
 const body=await request.json();
 const {db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage');
 if(body.action==='seed'){
  const result=await db.rpc('marketplace_catalog_completion_seed',{p_company:empresaId,p_actor:usuario.id});
  if(result.error)throw new MarketplaceError(503,'catalog_queue','Não foi possível preparar a complementação do catálogo.');
  const retry=await db.from('marketplace_catalog_completion').update({state:'pending',issue:null,progress:{},next_check_at:new Date().toISOString()}).eq('empresa_id',empresaId).eq('state','skipped').eq('issue','O catálogo não confirmou o EAN exato.');
  if(retry.error)throw new MarketplaceError(503,'catalog_queue','Não foi possível retomar a conferência dos identificadores.');
  return NextResponse.json({queued:true},{headers});
 }
 if(body.action!=='next')throw new MarketplaceError(400,'invalid_action','Selecione uma ação válida.');
 return NextResponse.json(await completeCatalogStep(db,empresaId),{headers});
}catch(error){return managementFailure(error);}}
