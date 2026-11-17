import {getFiscalStatusRuntime} from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';
import {handleFiscalEditorSettings} from '@/app/vendas/lib/server/fiscal-editor-settings.mjs';
import {autenticarPerfilCobrancaDetalhado} from '@/app/lib/cobranca-servidor';
import {saveCompanyFiscalDefaultsWithAdmin} from '@/app/vendas/lib/fiscal-company-defaults.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
async function handle(request:Request){
 return handleFiscalEditorSettings({request,runtime:await getFiscalStatusRuntime(),companyId:new URL(request.url).searchParams.get('companyId')?.trim()||'',defaultsWriter:async(companyId:string,values:Record<string,string>,version:string)=>{
  const result=await autenticarPerfilCobrancaDetalhado(request,companyId,true);
  if(!result.acesso)throw Object.assign(new Error(result.erro?.mensagem||'Confirme novamente o acesso ao perfil.'),{status:result.erro?.status||403});
  return saveCompanyFiscalDefaultsWithAdmin({client:result.acesso.db,companyId,values,version});
 }});
}
export const GET=handle;export const POST=handle;export const PATCH=handle;
