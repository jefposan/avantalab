import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const mock=source=>({url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return mock('export{}');
 if(s==='next/server')return mock('export const after=callback=>globalThis.stockAfter=callback;');
 if(s==='./inventory-worker')return mock('export const deliverStockJob=(...args)=>globalThis.stockDeliver(...args);');
 return next(s,c);
}});
const {deliverCompanyStock,dispatchStockAfterCommit}=await import('../../app/modules/marketplaces/services/inventory-dispatch.ts');hooks.deregister();
test('estoque tenta enviar após commit, respeita empresa/lease e preserva contingência',async()=>{
 const prior=process.env.MARKETPLACE_SECRETS_KEY;process.env.MARKETPLACE_SECRETS_KEY='test-only';
 try{
  let enabled=true,claim=true,delivered=0;const calls=[];
  const db={rpc:async(name,args)=>{calls.push({name,args});return{data:claim,error:null};},from(table){const q={select(){return q;},eq(k,v){calls.push({table,k,v});return q;},lte(){return q;},order(){return q;},limit(){return q;},update(value){calls.push({table,update:value});return q;},maybeSingle(){return q;},then(done){return Promise.resolve({error:null,data:table==='marketplace_inventory_settings'?{enabled}:table==='empresa_modulos'?{expira_em:null}:table==='marketplace_inventory_outbox'?[{empresa_id:'company-test',link_id:'one'}]:null}).then(done);}};return q;}};
  globalThis.stockDeliver=async(_,job)=>{assert.equal(job.empresa_id,'company-test');delivered++;};
  dispatchStockAfterCommit(db,'company-test');assert.equal(delivered,0);await globalThis.stockAfter();assert.equal(delivered,1);
  assert.ok(calls.some(x=>x.table==='marketplace_inventory_outbox'&&x.k==='empresa_id'&&x.v==='company-test'));
  assert.ok(calls.some(x=>x.table==='marketplace_inventory_worker'&&x.k==='lease_owner'));
  claim=false;await deliverCompanyStock(db,'company-test');assert.equal(delivered,1);
  enabled=false;await deliverCompanyStock(db,'company-test');assert.equal(delivered,1);
 }finally{if(prior===undefined)delete process.env.MARKETPLACE_SECRETS_KEY;else process.env.MARKETPLACE_SECRETS_KEY=prior;}
});
