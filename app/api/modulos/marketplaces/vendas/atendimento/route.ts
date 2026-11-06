import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { serviceWorkspace, sendServiceCommand, uploadServiceAttachment, downloadServiceAttachment } from '@/app/modules/marketplaces/services/post-sale-workspace';
export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store' };
function configured(){if(!process.env.MARKETPLACE_SECRETS_KEY)throw new MarketplaceError(503,'integration_not_configured','A integração não está configurada para o atendimento. Solicite ao administrador.');}
async function limitedBody(request:Request,limit:number){
  if(Number(request.headers.get('content-length')||0)>limit)throw new MarketplaceError(413,'body_too_large','O conteúdo excede o limite deste atendimento.');
  const reader=request.body?.getReader();if(!reader)throw new MarketplaceError(400,'invalid_body','Informe os dados do atendimento.');
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new MarketplaceError(413,'body_too_large','O conteúdo excede o limite deste atendimento.');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}return bytes;
}
export async function GET(request:Request){try{
  const params=new URL(request.url).searchParams;
  const {db,empresaId,vinculo}=await authorizeMarketplace(request,params.get('empresaId'));
  configured();
  const input=Object.fromEntries(params);
  if(params.get('attachmentId')){
    const result=await downloadServiceAttachment(db,empresaId,input);
    return new Response(result.stream,{headers:{...headers,'Content-Type':result.mime!,'Content-Disposition':'attachment; filename="anexo-pedido"','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});
  }
  const result=await serviceWorkspace(db,empresaId,input.connectionId,input.saleId,input.channel,['gestor_master','administrador','operador_completo'].includes(vinculo.perfil||''),input.offset);
  return NextResponse.json(result,{headers});
}catch(e){return managementFailure(e);}}
export async function POST(request:Request){try{
  const multipart=(request.headers.get('content-type')||'').startsWith('multipart/form-data');
  const bytes=await limitedBody(request,multipart?4*1024*1024:16*1024);
  let input:Record<string,unknown>,file:FormDataEntryValue|null=null;
  if(multipart){const form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();input=Object.fromEntries(form);file=form.get('file');}
  else {try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new MarketplaceError(400,'invalid_body','Dados do atendimento inválidos.');}}
  if(!input||typeof input!=='object'||Array.isArray(input))throw new MarketplaceError(400,'invalid_body','Dados do atendimento inválidos.');
  const {db,empresaId,usuario}=await authorizeMarketplace(request,input.empresaId,'manage');configured();
  if(multipart){if(!(file instanceof File))throw new MarketplaceError(400,'missing_attachment','Selecione o arquivo.');return NextResponse.json(await uploadServiceAttachment(db,empresaId,input,file),{headers});}
  const result=await sendServiceCommand(db,empresaId,usuario.id,input);
  const state=result.operation.state;
  const message=state==='completed'?'Solicitação aceita pelo Mercado Livre. Atualize o atendimento para acompanhar.':state==='rejected'?'O Mercado Livre recusou esta solicitação. Revise o conteúdo e atualize o atendimento.':state==='pending_review'?'Solicitação recebida e em revisão pelo Mercado Livre. Aguarde antes de enviar novamente.':'Solicitação registrada, aguardando confirmação. Atualize o atendimento; não repita o envio.';
  return NextResponse.json({...result,message},{headers,status:state==='rejected'?409:['uncertain','sending','pending_review'].includes(state)?202:200});
}catch(e){return managementFailure(e);}}
