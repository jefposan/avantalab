import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {readQualityCache,readProductQualityCache} from '@/app/modules/marketplaces/services/quality-cache';
export async function GET(request:Request){try{const params=new URL(request.url).searchParams;const {db,empresaId}=await authorizeMarketplace(request,params.get('empresaId'),'view');return NextResponse.json({records:params.has('productId')?await readProductQualityCache(db,empresaId,params.get('productId')):await readQualityCache(db,empresaId)},{headers:{'Cache-Control':'no-store'}});}catch(e){return managementFailure(e);}}
