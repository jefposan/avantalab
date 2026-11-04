import test from 'node:test';
import assert from 'node:assert/strict';
import {productPriceTargets,reviewProductPrices,saveProductPrices} from '../../app/modules/marketplaces/listing-price-batch.ts';
const target=n=>({connection_id:`account-${n}`,provider_listing_id:`MLB${n}`,provider:'mercado_livre'});
const editor=(n,price=100)=>({provider:'mercado_livre',id:`MLB${n}`,revision:`revision-${n}`,currency:'BRL',values:{price},fields:{price:{editable:true,min:.01,max:1000}}});
const reviews=[1,2,3].map(n=>({target:target(n),editor:editor(n),error:''}));
function requester({blocked=0,changed=0,wrong=0,pending=0,fail=0,price=120}={}){
 const calls=[];return {calls,request:async(path,body,signal,method)=>{
  calls.push({path,body,method});
  const n=Number((body?.id||new URLSearchParams(path.split('?')[1]).get('id')).slice(3));
  if(method!=='PATCH'){const result=editor(n);if(n===blocked)result.fields.price={editable:false,reason:'Automatização ativa'};if(n===changed)result.revision='externally-changed';return result;}
  if(n===fail)throw new Error('Sem confirmação da operação.');
  return {listing:{id:n===wrong?'MLB999':`MLB${n}`,price,currency:'BRL'},pending:n===pending};
 }};
}
test('destinos vêm dos vínculos oficiais: todas as contas do provedor, sem agrupar por EAN nem incluir encerrados',()=>{
 const links=[1,2,3].map(n=>({...target(n),status:'active',source_snapshot:{}}));
 links.push({...links[0]}, {...target(4),status:'closed'},{...target(5),status:'active',provider:'magalu'},{...target(6),status:'active',source_snapshot:{substatus:['deleted']}});
 assert.deepEqual(productPriceTargets(links,'mercado_livre').map(t=>t.connection_id),['account-1','account-2','account-3']);
 assert.equal(productPriceTargets([...links,{...target(8),connection_id:'account-1',status:'paused'}],'mercado_livre').length,4,'dois anúncios reais da mesma conta continuam separados');
});
test('leitura autentica o contexto de cada conta e rejeita editor de outro anúncio, provedor ou moeda',async()=>{
 const stub=requester();assert.equal((await reviewProductPrices(stub.request,'company',[target(1)]))[0].error,'');
 const params=new URLSearchParams(stub.calls[0].path.split('?')[1]);assert.equal(params.get('empresaId'),'company');assert.equal(params.get('connectionId'),'account-1');
 for(const changed of [{id:'MLB999'},{provider:'magalu'},{currency:'USD'}]){const rows=await reviewProductPrices(async()=>({...editor(1),...changed}),'company',[target(1)]);assert.equal(rows[0].editor,null);assert.ok(rows[0].error);}
});
test('nenhum PATCH sai se qualquer conta falha na conferência ou tem revisão alterada',async()=>{
 for(const option of [{blocked:2},{changed:2}]){const stub=requester(option);await assert.rejects(saveProductPrices(stub.request,'company',reviews,120),/Recarregue/);assert.equal(stub.calls.filter(c=>c.method==='PATCH').length,0);}
 const stub=requester();await assert.rejects(saveProductPrices(stub.request,'company',reviews,2000));assert.equal(stub.calls.length,0);
});
test('um único valor envia somente preço, com revisão e chave individual, e confirma cada conta',async()=>{
 const stub=requester(),progress=[];const outcomes=await saveProductPrices(stub.request,'company',reviews,120,rows=>progress.push(rows));
 assert.deepEqual(outcomes.map(r=>r.status),['confirmed','confirmed','confirmed']);assert.equal(progress.length,3);
 const writes=stub.calls.filter(c=>c.method==='PATCH');assert.equal(writes.length,3);assert.ok(stub.calls.slice(0,3).every(c=>!c.method));assert.equal(new Set(writes.map(c=>c.body.requestKey)).size,3);
 writes.forEach((call,i)=>{assert.equal(call.body.empresaId,'company');assert.equal(call.body.connectionId,`account-${i+1}`);assert.equal(call.body.revision,`revision-${i+1}`);assert.deepEqual(call.body.changes,{price:120});});
});
test('falha, resposta divergente ou confirmação pendente interrompem sem repetir nem desfazer contas confirmadas',async()=>{
 for(const option of [{fail:2},{wrong:2},{pending:2}]){const stub=requester(option),outcomes=await saveProductPrices(stub.request,'company',reviews,120);assert.equal(stub.calls.filter(c=>c.method==='PATCH').length,2);assert.equal(outcomes[0].status,'confirmed');assert.ok(['failed','pending'].includes(outcomes[1].status));assert.equal(outcomes[2].status,'not_sent');}
 const stub=requester({price:119});assert.equal((await saveProductPrices(stub.request,'company',reviews,120))[0].status,'failed');assert.equal(stub.calls.filter(c=>c.method==='PATCH').length,1);
});
test('anúncios que já têm o preço desejado não recebem escrita redundante',async()=>{
 const stub=requester(),outcomes=await saveProductPrices(stub.request,'company',reviews,100);assert.deepEqual(outcomes.map(r=>r.status),['unchanged','unchanged','unchanged']);assert.equal(stub.calls.filter(c=>c.method==='PATCH').length,0);
});
