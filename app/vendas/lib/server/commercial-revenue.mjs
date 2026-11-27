import { evaluateAccessDecision } from '../access-control.mjs';
export const DEFAULT_REVENUE_SETTINGS=Object.freeze({enabled:true,version:0});
const valid=(v)=>typeof v?.enabled==='boolean'&&Number.isSafeInteger(v.version)&&v.version>=0;
const map=r=>r?{enabled:r.enabled,version:Number(r.version)}:{...DEFAULT_REVENUE_SETTINGS};
export function createCommercialRevenueRepository({pool}){
 return {
  async load(companyId){return map((await pool.query('select enabled,version from public.vendas_receita_configuracoes where empresa_id=$1',[companyId])).rows[0]);},
  async save(companyId,actorId,values){
   if(!valid(values))throw Object.assign(Error('Revise a configuração de receitas.'),{status:400,public:true});
   const client=await pool.connect();
   try{await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtextextended('vendas-financeiro:'||$1::text,0))",[companyId]);
    const current=map((await client.query('select enabled,version from public.vendas_receita_configuracoes where empresa_id=$1 for update',[companyId])).rows[0]);
    if(current.version!==values.version)throw Object.assign(Error('A configuração mudou em outra tela. Atualize antes de salvar.'),{status:409,public:true});
    if(current.enabled===values.enabled){await client.query('commit');return current;}
    const row=(await client.query(`insert into public.vendas_receita_configuracoes(empresa_id,enabled,version,updated_by) values($1,$2,1,$3)
     on conflict(empresa_id) do update set enabled=excluded.enabled,version=vendas_receita_configuracoes.version+1,updated_by=excluded.updated_by,updated_at=now() returning enabled,version`,[companyId,values.enabled,actorId])).rows[0];
    await client.query('select public.vendas_recalcular_receitas($1)',[companyId]);
    await client.query('commit');return map(row);
   }catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{client.release();}
  }
 };
}
export async function handleCommercialRevenue({request,runtime}){
 const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 const companyId=new URL(request.url).searchParams.get('companyId');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId||'')||!['GET','PATCH'].includes(request.method))return reply(400,{ok:false,message:'Selecione novamente o perfil.'});
 if(!runtime?.commercialRevenueRepository||!runtime.accessResolver)return reply(503,{ok:false,message:'A configuração financeira ainda não está disponível.'});
 try{
  const access=await runtime.accessResolver.resolve(request,{companyId});
  if(!access?.authenticated)return reply(401,{ok:false,message:'Confirme novamente sua sessão.'});
  const check=evaluateAccessDecision({boundary:access.boundary,effectivePermissions:access.effectivePermissions,permission:request.method==='PATCH'?'settings.edit':'settings.view'});
  if(!check.allowed||check.session.companyId!==companyId)return reply(403,{ok:false,message:'Seu acesso não permite consultar ou alterar a configuração financeira.'});
  if(request.method==='GET')return reply(200,{ok:true,settings:await runtime.commercialRevenueRepository.load(companyId),canManage:access.effectivePermissions?.['settings.edit']===true});
  const raw=await request.text();if(raw.length>2000)return reply(413,{ok:false,message:'Solicitação muito grande.'});
  let body;try{body=JSON.parse(raw);}catch{return reply(400,{ok:false,message:'Revise a configuração financeira.'});}
  if(!body||typeof body!=='object'||Object.keys(body).some(key=>!['enabled','version'].includes(key))||!valid(body))return reply(400,{ok:false,message:'Revise a configuração financeira.'});
  return reply(200,{ok:true,settings:await runtime.commercialRevenueRepository.save(companyId,check.session.userId,body),canManage:true});
 }catch(error){return reply(error.public?error.status||400:503,{ok:false,message:error.public?error.message:'Não foi possível confirmar a configuração financeira. Tente novamente.'});}
}
