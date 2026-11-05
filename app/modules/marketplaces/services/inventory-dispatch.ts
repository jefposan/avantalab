import 'server-only';
import {after} from 'next/server';
import {randomUUID} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {deliverStockJob} from './inventory-worker';

/** Envio prioritário após o commit. A fila durável e o worker periódico permanecem a contingência. */
export async function deliverCompanyStock(db:SupabaseClient,company:string){
 if(!process.env.MARKETPLACE_SECRETS_KEY)return{configured:false};
 const settings=await db.from('marketplace_inventory_settings').select('enabled').eq('empresa_id',company).maybeSingle();
 if(settings.error||!settings.data?.enabled)return{enabled:false};
 const module=await db.from('empresa_modulos').select('expira_em').eq('empresa_id',company).eq('modulo_id','marketplaces').eq('ativo',true).maybeSingle();
 if(module.error||!module.data||module.data.expira_em&&Date.parse(module.data.expira_em)<Date.now())return{enabled:false};
 const owner=randomUUID(),claim=await db.rpc('marketplace_worker_claim',{p_owner:owner});
 if(claim.error||!claim.data)return{pending:true};
 const deadline=Date.now()+40_000;
 try{
  const jobs=await db.from('marketplace_inventory_outbox').select('*').eq('empresa_id',company).eq('state','pending').lte('next_attempt_at',new Date().toISOString()).order('next_attempt_at').limit(50);
  if(jobs.error)throw Error('inventory_read_failed');
  for(const job of jobs.data||[]){if(Date.now()>deadline-16_000)break;await deliverStockJob(db,job,deadline);}
  return{attempted:true};
 }finally{
  const release=await db.from('marketplace_inventory_worker').update({lease_owner:null,lease_until:null,finished_at:new Date().toISOString()}).eq('id',1).eq('lease_owner',owner);
  if(release.error)throw Error('inventory_release_failed');
 }
}
export function dispatchStockAfterCommit(db:SupabaseClient,company:string){
 try{after(async()=>{try{await deliverCompanyStock(db,company);}catch{console.error('marketplace_immediate_stock_pending');}});}
 catch{ /* Fora de uma requisição Next (ensaios/ferramentas), a fila continua durável. */ }
}
