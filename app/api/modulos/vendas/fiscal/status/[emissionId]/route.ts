import { handleFiscalEmissionStatusRequest } from '@/app/vendas/lib/server/fiscal-emission-status-http.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ emissionId: string }> }) {
  const { emissionId } = await context.params;
  return handleFiscalEmissionStatusRequest({ request, emissionId, runtime: await getFiscalStatusRuntime() });
}
