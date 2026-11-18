import {UUID} from './fiscal-note-backup.mjs';
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'};
export async function handleFiscalNoteBackupRequest({request,runtime}){
 const reply=(status,body)=>Response.json(body,{status,headers});
 const companyId=new URL(request.url).searchParams.get('companyId');
 if(!UUID.test(companyId||''))return reply(400,{ok:false,message:'Selecione uma empresa válida.'});
 if(!runtime?.configured)return reply(503,{ok:false,message:'A geração de backups fiscais não está disponível neste momento.'});
 try{
  const access=await runtime.accessResolver.resolve(request,{companyId});
  if(request.method==='GET')return reply(200,{ok:true,...await runtime.service.list(access,{offset:new URL(request.url).searchParams.get('offset')||0})});
  if(Number(request.headers.get('content-length'))>4096)return reply(400,{ok:false,message:'Solicitação inválida.'});
  let body;try{body=await request.json();}catch{return reply(400,{ok:false,message:'Solicitação inválida.'});}if(!['preview','create','step','download'].includes(body?.action))return reply(400,{ok:false,message:'Ação inválida.'});
  const result=await runtime.service[body.action](access,body);return reply(200,{ok:true,...result});
 }catch(error){const status=[400,401,403,404,409,503].includes(error?.status)?error.status:503;return reply(status,{ok:false,message:error?.status?error.message:'Não foi possível consultar ou gerar o backup. Tente novamente.'});}
}
