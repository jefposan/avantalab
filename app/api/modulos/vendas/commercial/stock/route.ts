import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';
import { handleCommercialStockRequest } from '@/app/vendas/lib/server/commercial-stock-http.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
async function handle(request:Request){const companyId=new URL(request.url).searchParams.get('companyId')?.trim()||'';return handleCommercialStockRequest({request,runtime:await getFiscalStatusRuntime(),companyId});}
export const GET=handle;export const POST=handle;
