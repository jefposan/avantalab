import { handleCommercialFiscalCenterRequest } from '@/app/vendas/lib/server/commercial-fiscal-center-http.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';
import { handleStandaloneFiscalRequest } from '@/app/vendas/lib/server/standalone-fiscal-http.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleCommercialFiscalCenterRequest({ request, runtime: await getFiscalStatusRuntime() });
}

export async function POST(request: Request) {
  return handleStandaloneFiscalRequest({ request, runtime: await getFiscalStatusRuntime() });
}
