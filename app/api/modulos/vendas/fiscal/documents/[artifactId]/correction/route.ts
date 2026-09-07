import { handleCommercialNfeRejectionCorrectionRequest } from '@/app/vendas/lib/server/commercial-nfe-rejection-correction-http.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId: emissionId } = await params;
  const companyId = new URL(request.url).searchParams.get('companyId')?.trim() || '';
  return handleCommercialNfeRejectionCorrectionRequest({ request, runtime: await getFiscalStatusRuntime(), companyId, emissionId });
}
