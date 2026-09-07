import { handleCommercialFiscalEmissionPrepareRequest } from '@/app/vendas/lib/server/commercial-fiscal-emission-http.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId: draftId } = await params;
  const companyId = new URL(request.url).searchParams.get('companyId')?.trim() || '';
  return handleCommercialFiscalEmissionPrepareRequest({ request, runtime: await getFiscalStatusRuntime(), companyId, draftId });
}
