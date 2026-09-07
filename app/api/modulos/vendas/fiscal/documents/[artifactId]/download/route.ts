import { handleFiscalDocumentDownloadRequest } from '@/app/vendas/lib/server/fiscal-download-http.mjs';
import { getFiscalDownloadRuntime } from '@/app/vendas/lib/server/fiscal-download-runtime.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: RouteContext<'/api/modulos/vendas/fiscal/documents/[artifactId]/download'>) {
  const { artifactId } = await context.params;
  return handleFiscalDocumentDownloadRequest({ request, artifactId, runtime: await getFiscalDownloadRuntime() });
}
