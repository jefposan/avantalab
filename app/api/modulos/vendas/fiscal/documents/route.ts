import { handleCommercialFiscalCenterRequest } from '@/app/vendas/lib/server/commercial-fiscal-center-http.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleCommercialFiscalCenterRequest({ request, runtime: await getFiscalStatusRuntime() });
}
