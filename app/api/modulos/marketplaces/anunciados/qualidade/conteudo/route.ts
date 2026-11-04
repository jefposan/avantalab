import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {readListingContent,saveListingContent} from '@/app/modules/marketplaces/services/listing-content';
export const runtime='nodejs';export const maxDuration=60;
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){try{const p=new URL(request.url).searchParams,{db,empresaId}=await authorizeMarketplace(request,p.get('empresaId'),'manage');return NextResponse.json(await readListingContent(db,empresaId,p.get('connectionId'),p.get('id'),p.get('kind')),{headers});}catch(e){return managementFailure(e);}}
export async function PATCH(request:Request){try{const body=await request.json(),{db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage');return NextResponse.json(await saveListingContent(db,empresaId,body.connectionId,usuario.id,body),{headers});}catch(e){return managementFailure(e);}}
