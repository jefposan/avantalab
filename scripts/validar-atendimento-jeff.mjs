import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {controlledPlan,installControlledFetch,verifyWorkspace} from './lib/controle-atendimento-jeff.mjs';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(resolve(root,'avanta-entrega.json'),'utf8'));
const version=(await readFile(resolve(root,'app/lib/version.ts'),'utf8')).match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
let guard;
try{
 const plan=controlledPlan(manifest,version,process.env.VERCEL_ENV);
 if(!plan){console.log('Controle JEFF: nenhuma verificação real agendada para esta versão.');}
 else if(process.env.VERCEL_ENV!=='production'){console.log('Controle JEFF: teste real agendado para o build de produção; não executado localmente.');}
 else{
  for(const name of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','MARKETPLACE_SECRETS_KEY','MERCADOLIVRE_CLIENT_ID','MERCADOLIVRE_CLIENT_SECRET'])if(!process.env[name])throw Error('Configuração de produção incompleta para o teste controlado.');
  guard=installControlledFetch({fetchImpl:globalThis.fetch,supabaseUrl:process.env.NEXT_PUBLIC_SUPABASE_URL,plan});globalThis.fetch=guard.fetch;
  const timeout=setTimeout(()=>{console.error('AVANTA_POST_SALE_CHECK_FAILED '+JSON.stringify({version,code:'deadline',stats:guard.stats}));process.exit(1);},180000);timeout.unref();
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {loadConnection,mlRequest}=await import('../app/modules/marketplaces/services/mercadolivre-management.ts');
  const {serviceWorkspace}=await import('../app/modules/marketplaces/services/post-sale-workspace.ts');
  const connection=await loadConnection(db,plan.companyId,plan.connectionId);
  if(connection.seller_reference!==plan.sellerReference)throw Error('A conexão JEFF mudou de vendedor.');
  const auth=await db.from('marketplace_connections').select('scopes').eq('empresa_id',plan.companyId).eq('id',plan.connectionId).single();
  if(auth.error||!auth.data?.scopes?.includes('write')||!auth.data.scopes.some(s=>s.includes('comunication:/read-write')))throw Error('A autorização de comunicação e escrita da JEFF não foi confirmada.');
  const owner=await mlRequest(db,connection,'/users/me');if(String(owner?.id)!==plan.sellerReference||owner.site_id!=='MLB')throw Error('A API não confirmou a identidade JEFF/MLB.');
  const requested=await db.from('marketplace_sales').select('id,provider_order_id').eq('empresa_id',plan.companyId).eq('connection_id',plan.connectionId).eq('provider','mercado_livre').eq('provider_order_id',plan.orderId).maybeSingle();
  const latest=await db.from('marketplace_sales').select('id,provider_order_id').eq('empresa_id',plan.companyId).eq('connection_id',plan.connectionId).eq('provider','mercado_livre').in('status',['paid','confirmed','partially_refunded']).order('created_at',{ascending:false}).limit(3);
  if(requested.error||latest.error)throw Error('Não foi possível selecionar pedidos da JEFF.');
  const candidates=[...new Map([...(requested.data?[requested.data]:[]),...(latest.data||[])].map(s=>[s.id,s])).values()].slice(0,2);if(!candidates.length)throw Error('Nenhum pedido JEFF disponível para a conferência.');
  const samples=[];
  for(const sale of candidates){
   const pending=await db.from('marketplace_post_sale_commands').select('id').eq('empresa_id',plan.companyId).eq('connection_id',plan.connectionId).eq('sale_id',sale.id).in('state',['sending','uncertain','pending_review']).limit(1);if(pending.error||pending.data?.length)throw Error('Amostra tem solicitação pendente ou histórico indisponível.');
   const snapshot=await serviceWorkspace(db,plan.companyId,plan.connectionId,sale.id,'order',true,0);samples.push({...verifyWorkspace(snapshot),channel:'order'});
   if(snapshot.cases.length){const claim=await serviceWorkspace(db,plan.companyId,plan.connectionId,sale.id,`claim:${snapshot.cases[0].id}`,true,0);samples.push({...verifyWorkspace(claim),channel:'claim'});}
  }
  if(guard.stats.blockedWrites!==0)throw Error('Foi bloqueada uma tentativa de escrita fora do controle.');
  clearTimeout(timeout);console.log('AVANTA_POST_SALE_CHECK '+JSON.stringify({version,account:'JEFF',identityVerified:true,writePermissionVerified:true,readOnly:true,realMessagesSent:0,financialActions:0,samples,stats:guard.stats}));
 }
}catch(error){console.error('AVANTA_POST_SALE_CHECK_FAILED '+JSON.stringify({version,code:error?.code||'controlled_check',status:error?.status||null,message:error instanceof Error?error.message:'Falha de controle',stats:guard?.stats,responses:guard?.responses}));process.exitCode=1;}
