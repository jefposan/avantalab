import {getFiscalStatusRuntime} from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';
import {handleFiscalEditorSettings} from '@/app/vendas/lib/server/fiscal-editor-settings.mjs';
import {autenticarPerfilCobrancaDetalhado} from '@/app/lib/cobranca-servidor';
import {saveCompanyFiscalDefaultsWithAdmin} from '@/app/vendas/lib/fiscal-company-defaults.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
async function handle(request:Request){
 const response=await handleFiscalEditorSettings({request,runtime:await getFiscalStatusRuntime(),companyId:new URL(request.url).searchParams.get('companyId')?.trim()||'',defaultsWriter:async(companyId:string,values:Record<string,string>,version:string)=>{
  const result=await autenticarPerfilCobrancaDetalhado(request,companyId,true);
  if(!result.acesso)throw Object.assign(new Error(result.erro?.mensagem||'Confirme novamente o acesso ao perfil.'),{status:result.erro?.status||403});
  return saveCompanyFiscalDefaultsWithAdmin({client:result.acesso.db,companyId,values,version});
 }});
 if(request.method==='GET'&&new URL(request.url).searchParams.get('section')==='defaults'&&response.ok){const companyId=new URL(request.url).searchParams.get('companyId')||'';const auth=await autenticarPerfilCobrancaDetalhado(request,companyId,false);if(auth.acesso){const {data,error}=await auth.acesso.db.from('configuracoes').select('logo_url').eq('empresa_id',companyId).maybeSingle();if(!error){const body=await response.json();return Response.json({...body,defaults:{...body.defaults,systemLogo:data?.logo_url||''}},{headers:{'Cache-Control':'no-store, private'}});}}}
 return response;
}
export const GET=handle;export const POST=handle;export const PATCH=handle;
