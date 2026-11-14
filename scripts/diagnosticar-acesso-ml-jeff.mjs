import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {installControlledFetch} from './lib/controle-atendimento-jeff.mjs';
import {priceAccessPlan,priceAccessEvents} from './lib/controle-diagnostico-ml.mjs';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(resolve(root,'avanta-entrega.json'),'utf8'));
const version=(await readFile(resolve(root,'app/lib/version.ts'),'utf8')).match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
let guard;
try{
 const plan=priceAccessPlan(manifest,version,process.env.VERCEL_ENV);
 if(!plan)console.log('Diagnóstico ML: nenhuma execução real agendada para esta versão.');
 else if(process.env.VERCEL_ENV!=='production')console.log('Diagnóstico ML: execução JEFF agendada somente para o build de produção, sem copiar segredos para o ambiente local.');
 else{
  for(const key of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','MARKETPLACE_SECRETS_KEY','MERCADOLIVRE_CLIENT_ID','MERCADOLIVRE_CLIENT_SECRET'])if(!process.env[key])throw Error('diagnostic_configuration');
  guard=installControlledFetch({fetchImpl:globalThis.fetch,supabaseUrl:process.env.NEXT_PUBLIC_SUPABASE_URL,plan});globalThis.fetch=guard.fetch;
  const timeout=setTimeout(()=>{console.error('AVANTA_ML_ACCESS_CHECK_FAILED '+JSON.stringify({version,code:'deadline',stats:guard.stats}));process.exit(1);},120000);timeout.unref();
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {loadConnection}=await import('../app/modules/marketplaces/services/mercadolivre-management.ts');
  const {diagnoseMercadoLivreAccess}=await import('../app/modules/marketplaces/services/mercadolivre-access-diagnostic.ts');
  const {priceDiagnosticInput}=await import('../app/modules/marketplaces/services/mercadolivre-price-diagnostic.ts');
  const connection=await loadConnection(db,plan.companyId,plan.connectionId);
  if(connection.seller_reference!==plan.sellerReference)throw Error('diagnostic_identity');
  const report=await diagnoseMercadoLivreAccess(db,connection,priceDiagnosticInput({ean:'7898649372113',query:'Amvox ARF 1250 127V'}));
  for(const [name,value] of priceAccessEvents(version,report,guard.stats))console.log(name+' '+JSON.stringify(value));
  clearTimeout(timeout);
 }
}catch(error){console.error('AVANTA_ML_ACCESS_CHECK_FAILED '+JSON.stringify({version,code:typeof error?.code==='string'&&/^[a-z_]{1,60}$/.test(error.code)?error.code:'controlled_diagnostic',status:typeof error?.status==='number'?error.status:null,stats:guard?.stats}));process.exitCode=1;}
