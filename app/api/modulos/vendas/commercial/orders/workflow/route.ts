import { handleCommercialOrderWorkflowRequest } from '@/app/vendas/lib/server/commercial-order-workflow-http.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const companyId = new URL(request.url).searchParams.get('companyId')?.trim() || '';
  return handleCommercialOrderWorkflowRequest({ request, runtime: await getFiscalStatusRuntime(), companyId });
}
