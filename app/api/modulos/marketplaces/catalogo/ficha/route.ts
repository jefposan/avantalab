import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {previewFullCatalog,confirmFullCatalog} from '@/app/modules/marketplaces/services/catalog-full';
export const runtime='nodejs';export const maxDuration=60;
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){try{
 const params=new URL(request.url).searchParams,{db,empresaId}=await authorizeMarketplace(request,params.get('empresaId'),'manage');
 return NextResponse.json(await previewFullCatalog(db,empresaId,params.get('productId')),{headers});
}catch(error){return managementFailure(error);}}
export async function POST(request:Request){try{
 const body=await request.json(),{db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage');
 return NextResponse.json(await confirmFullCatalog(db,empresaId,usuario.id,body),{headers});
}catch(error){return managementFailure(error);}}
