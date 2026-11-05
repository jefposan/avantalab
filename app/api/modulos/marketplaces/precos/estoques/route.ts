import {NextResponse} from 'next/server';
import {authorizePriceConsultation} from '@/app/modules/marketplaces/services/price-access';
import {managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {listWarehouses} from '@/app/modules/marketplaces/services/warehouses';
export const runtime='nodejs';
export async function GET(request:Request){
 try{
  const {db,empresaId}=await authorizePriceConsultation(request,new URL(request.url).searchParams.get('empresaId'));
  return NextResponse.json({warehouses:await listWarehouses(db,empresaId)},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return managementFailure(e);}
}
