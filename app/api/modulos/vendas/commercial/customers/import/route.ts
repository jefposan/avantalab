import {getFiscalStatusRuntime} from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';
import {handleCustomerImport} from '@/app/vendas/lib/server/commercial-customer-import-http.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(request:Request) {
  return handleCustomerImport({request,runtime:await getFiscalStatusRuntime(),companyId:new URL(request.url).searchParams.get('companyId')?.trim()||''});
}
