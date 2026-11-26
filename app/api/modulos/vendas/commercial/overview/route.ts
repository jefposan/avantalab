import {NextResponse} from 'next/server';
import {autenticarPerfilCobranca,resolverEstadoAcesso} from '@/app/lib/cobranca-servidor';
import {COBRANCA_ATIVA,assinaturaVigente} from '@/app/lib/cobranca';
import {moduloDisponivelParaEmpresa} from '@/app/lib/modulos-disponibilidade';
import {resolveModuleEffectivePermissions} from '@/app/vendas/lib/server/avantalab-module-access.mjs';
import {buildCommercialOverview,validOverviewPeriod} from '@/app/vendas/lib/server/commercial-overview.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};
const reply=(status:number,message:string)=>NextResponse.json({ok:false,message},{status,headers});
async function pages(query:()=>any){const rows:any[]=[];for(let offset=0;;offset+=1000){const {data,error}=await query().range(offset,offset+999);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<1000)return rows;}}
export async function GET(request:Request){
 const url=new URL(request.url),companyId=url.searchParams.get('companyId')||'',start=url.searchParams.get('start')||'',end=url.searchParams.get('end')||'';
 if(!/^[0-9a-f-]{36}$/i.test(companyId)||!validOverviewPeriod(start,end))return reply(400,'Confira a empresa e o período.');
 const access=await autenticarPerfilCobranca(request,companyId);if(!access)return reply(403,'Acesso não autorizado.');
 try{
  if(!moduloDisponivelParaEmpresa('vendas',companyId))return reply(403,'Módulo indisponível.');
  if(COBRANCA_ATIVA){const plan=await resolverEstadoAcesso(companyId);if(!plan||!assinaturaVigente(plan))return reply(403,'O plano deste perfil não está ativo.');}
  const db=access.db;
  const [module,company,roles,users]=await Promise.all([
   db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id',companyId).eq('modulo_id','vendas').maybeSingle(),
   db.from('empresas').select('tipo_perfil').eq('id',companyId).maybeSingle(),
   db.from('module_role_permission_overrides').select('permission_code,decision').eq('company_id',companyId).eq('module_id','vendas').eq('profile',access.vinculo.perfil),
   db.from('module_user_permission_overrides').select('permission_code,decision').eq('company_id',companyId).eq('module_id','vendas').eq('user_id',access.usuario.id),
  ]);
  if(module.error||company.error||roles.error||users.error)throw Error('access');
  if(company.data?.tipo_perfil!=='empresa'||module.data?.ativo!==true||(module.data.expira_em&&(!Number.isFinite(Date.parse(module.data.expira_em))||Date.parse(module.data.expira_em)<=Date.now())))return reply(403,'Módulo inativo neste perfil.');
  const decisions=(rows:any[])=>Object.fromEntries(rows.filter(row=>row.decision!=='inherit').map(row=>[row.permission_code,row.decision]));
  const permissions=resolveModuleEffectivePermissions({profile:access.vinculo.perfil,roleOverrides:decisions(roles.data||[]),userOverrides:decisions(users.data||[])});
  if(!permissions['dashboard.view'])return reply(403,'Sem permissão para visualizar o painel.');
  const [operations,receivables]=await Promise.all([
   pages(()=>db.from('vendas_operacoes').select('id,tipo,canal,situacao,total,criado_em,entrega_retrato').eq('empresa_id',companyId).order('id')),
   permissions['receivables.view']?pages(()=>db.from('vendas_contas_receber').select('id,operacao_id,vencimento,situacao,valor_original,valor_recebido,valor_estornado').eq('empresa_id',companyId).order('id')):[],
  ]);
  const ids=operations.filter(row=>['faturado','concluido'].includes(row.situacao)).map(row=>row.id);
  const batches=Array.from({length:Math.ceil(ids.length/100)},(_,i)=>ids.slice(i*100,i*100+100));
  const [items,services]=permissions['catalog.view_cost']&&ids.length?await Promise.all([
   Promise.all(batches.map(ids=>pages(()=>db.from('vendas_operacao_itens').select('id,operacao_id,quantidade,custo_unitario_retrato').eq('empresa_id',companyId).in('operacao_id',ids).order('id')))).then(rows=>rows.flat()),
   Promise.all(batches.map(ids=>pages(()=>db.from('vendas_ordens_servico').select('operacao_id,custo_real_total').eq('empresa_id',companyId).in('operacao_id',ids).order('operacao_id')))).then(rows=>rows.flat()),
  ]):[[],[]];
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
  const summary=buildCommercialOverview({operations,receivables,items,services,start,end,today,permissions});
  return NextResponse.json({ok:true,companyId,summary},{headers});
 }catch{return reply(503,'Não foi possível calcular os resumos. Tente novamente.');}
}
