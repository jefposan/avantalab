import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure,MarketplaceError} from '@/app/modules/marketplaces/services/management-access';
import {integrationAdapter} from '@/app/modules/marketplaces/services/integration-adapters';
import {productListingUrl} from '@/app/modules/marketplaces/product-listing-update';
export const runtime='nodejs';
export const maxDuration=60;
/** Consulta exclusiva do endereço; não observa saldo, não atualiza cache/listas e não altera anúncio. */
export async function GET(request:Request){
 try{
  const p=new URL(request.url).searchParams,{db,empresaId}=await authorizeMarketplace(request,p.get('empresaId'),'manage');
  const connectionId=p.get('connectionId'),id=p.get('id')||'',adapter=await integrationAdapter(db,empresaId,connectionId);
  const result=await adapter.readLink(id);
  if(result.id!==id)throw new MarketplaceError(409,'listing_mismatch','A plataforma retornou outro anúncio. Nenhum vínculo foi alterado.');
  const permalink=productListingUrl({provider:adapter.provider,source_snapshot:{permalink:result.permalink}});
  if(!permalink)throw new MarketplaceError(404,'listing_link_unavailable','A plataforma não retornou um link válido para este anúncio. Tente novamente mais tarde.');
  return NextResponse.json({id,connectionId,permalink},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return managementFailure(error);}
}
