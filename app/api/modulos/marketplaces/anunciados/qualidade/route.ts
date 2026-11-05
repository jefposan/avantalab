import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {readListingQuality} from '@/app/modules/marketplaces/services/listing-quality';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 try{
  const params=new URL(request.url).searchParams;
  const {db,empresaId}=await authorizeMarketplace(request,params.get('empresaId'),'view');
  return NextResponse.json(await readListingQuality(db,empresaId,params.get('connectionId'),params.get('id')),{headers:{'Cache-Control':'no-store'}});
 }catch(error){return managementFailure(error);}
}
