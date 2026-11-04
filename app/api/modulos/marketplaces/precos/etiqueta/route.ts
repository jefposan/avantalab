import {NextResponse} from 'next/server';
import {authorizePriceConsultation} from '@/app/modules/marketplaces/services/price-access';
import {managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {readShippingLabel} from '@/app/modules/marketplaces/services/shipping-label';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){try{
 const body=await request.json();
 const {db,empresaId}=await authorizePriceConsultation(request,body.empresaId);
 return NextResponse.json(await readShippingLabel(db,empresaId,body.shipmentId),{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return managementFailure(error);}}
