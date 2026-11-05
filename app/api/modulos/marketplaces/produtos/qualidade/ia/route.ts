import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {prepareQualityAI} from '@/app/modules/marketplaces/services/quality-ai';
export const runtime='nodejs';export const maxDuration=90;
export async function POST(request:Request){try{const body=await request.json(),{db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage');return NextResponse.json(await prepareQualityAI(db,empresaId,usuario.id,body),{headers:{'Cache-Control':'no-store'}});}catch(e){return managementFailure(e);}}
