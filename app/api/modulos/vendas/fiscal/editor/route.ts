import {getFiscalStatusRuntime} from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';
import {handleFiscalEditorSettings} from '@/app/vendas/lib/server/fiscal-editor-settings.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
async function handle(request:Request){return handleFiscalEditorSettings({request,runtime:await getFiscalStatusRuntime(),companyId:new URL(request.url).searchParams.get('companyId')?.trim()||''});}
export const GET=handle;export const POST=handle;
