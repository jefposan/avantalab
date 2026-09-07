import { handleCommercialFiscalRulesRequest } from '@/app/vendas/lib/server/commercial-fiscal-rules-http.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const companyId = new URL(request.url).searchParams.get('companyId')?.trim() || '';
  return handleCommercialFiscalRulesRequest({ request, runtime: await getFiscalStatusRuntime(), companyId });
}

export async function POST(request: Request) {
  const companyId = new URL(request.url).searchParams.get('companyId')?.trim() || '';
  return handleCommercialFiscalRulesRequest({ request, runtime: await getFiscalStatusRuntime(), companyId });
}
