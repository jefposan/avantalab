import {contextFor} from './commercial-customer-http.mjs';
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleCustomerImport({request,runtime,companyId}) {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId||''))return reply(400,{ok:false,message:'Selecione o perfil empresarial.'});
  const resolved=await contextFor(request,runtime,companyId);
  if(resolved.error)return resolved.error;
  if(resolved.context.companyId!==companyId)return reply(403,{ok:false,message:'Perfil não autorizado.'});
  if(!runtime.customerImportService)return reply(503,{ok:false,message:'Importação ainda não disponível.'});
  if(Number(request.headers.get('content-length')||0)>2_000_000)return reply(413,{ok:false,message:'O lote ultrapassa o limite de tamanho.'});
  let body; try {const raw=await request.text();if(raw.length>2_000_000)return reply(413,{ok:false,message:'O lote ultrapassa o limite de tamanho.'});body=JSON.parse(raw);}catch{return reply(400,{ok:false,message:'Arquivo de importação inválido.'});}
  if(!body||typeof body!=='object'||(body.confirm!==false&&body.confirm!==true))return reply(400,{ok:false,message:'Confirme a etapa da importação.'});
  if(body.fileCompanyId&&body.fileCompanyId!==companyId)return reply(403,{ok:false,message:'Este modelo pertence a outro perfil empresarial.'});
  const result=await runtime.customerImportService.run({context:resolved.context,rows:body.rows,confirm:body.confirm,previewKey:body.previewKey,fileName:body.fileName});
  if(!result.ok){const code=result.errors?.[0]?.code||'';return reply(code.includes('PERMISSION')?403:code.includes('CONFLICT')?409:code.includes('STORAGE')?503:400,{...result,message:result.errors?.[0]?.message||'Não foi possível importar.'});}
  return reply(200,result);
}
