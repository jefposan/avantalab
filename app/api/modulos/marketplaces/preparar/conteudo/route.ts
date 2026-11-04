import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {loadConnection} from '@/app/modules/marketplaces/services/mercadolivre-management';
import {savePreparationContent} from '@/app/modules/marketplaces/services/preparation-content';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){try{const body=await request.json(),{db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage'),connection=await loadConnection(db,empresaId,body.connectionId);return NextResponse.json(await savePreparationContent(db,connection,usuario.id,body),{headers:{'Cache-Control':'no-store'}});}catch(e){return managementFailure(e);}}
