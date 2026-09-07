import { NextRequest } from 'next/server';
import { handleCommercialServiceWorkflowRequest } from '@/app/vendas/lib/server/commercial-service-workflow-http.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const runtimeServices = await getFiscalStatusRuntime();
  return handleCommercialServiceWorkflowRequest({ request, runtime: runtimeServices, companyId: request.nextUrl.searchParams.get('companyId') });
}
