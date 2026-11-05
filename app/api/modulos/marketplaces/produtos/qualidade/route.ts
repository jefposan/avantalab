import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {readCommonProductEditor,reviewCommonProductEdit,applyCommonProductEdit} from '@/app/modules/marketplaces/services/product-common-content';
export const runtime='nodejs';export const maxDuration=60;
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){try{const p=new URL(request.url).searchParams,{db,empresaId}=await authorizeMarketplace(request,p.get('empresaId'),'manage');const loaded=await readCommonProductEditor(db,empresaId,p.get('productId'),p.get('kind'),p.get('sourceConnectionId'),p.get('sourceId'),p.get('localDraft')==='true');return NextResponse.json({...loaded.editor,...(p.get('includeTargets')==='true'?{reviewTargets:loaded.targets}:{})},{headers});}catch(e){return managementFailure(e);}}
export async function POST(request:Request){try{const body=await request.json(),{db,empresaId}=await authorizeMarketplace(request,body.empresaId,'manage');return NextResponse.json(await reviewCommonProductEdit(db,empresaId,body),{headers});}catch(e){return managementFailure(e);}}
export async function PATCH(request:Request){try{const body=await request.json(),{db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage');return NextResponse.json(await applyCommonProductEdit(db,empresaId,usuario.id,body),{headers});}catch(e){return managementFailure(e);}}
