import {handleCommercialPolicy} from '@/app/vendas/lib/server/commercial-policy.mjs';
import {getFiscalStatusRuntime} from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){return handleCommercialPolicy({request,runtime:await getFiscalStatusRuntime()});}
export async function PATCH(request:Request){return handleCommercialPolicy({request,runtime:await getFiscalStatusRuntime()});}
