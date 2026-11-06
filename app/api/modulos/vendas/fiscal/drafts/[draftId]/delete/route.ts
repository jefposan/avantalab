import { handleFiscalDraftDelete } from '@/app/vendas/lib/server/fiscal-draft-delete.mjs';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: Request, {params}: {params: Promise<{draftId:string}>}) {
 const {draftId}=await params;
 return handleFiscalDraftDelete({request,runtime:await getFiscalStatusRuntime(),companyId:new URL(request.url).searchParams.get('companyId') || '',draftId});
}
