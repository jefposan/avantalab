import assert from 'node:assert/strict';
import test from 'node:test';
import {proxyLocalCommercialRead} from '../../app/vendas/lib/server/local-commercial-read-proxy.mjs';
const environment={NODE_ENV:'development',AVANTA_LOCAL_REAL_DATA_READ_ONLY:'true'};
const request=(path='commercial/operations',method='GET',origin='http://localhost:3000')=>new Request(`${origin}/api/modulos/vendas/${path}?companyId=empresa-sintetica`,{method,headers:{Authorization:'Bearer synthetic-session',Cookie:'unrelated=do-not-forward'}});

test('consulta dados reais pelo destino fixo, com mesma sessão e empresa, sem cookies nem cache',async()=>{
 let calls=0;
 const response=await proxyLocalCommercialRead(request(),{environment,fetchImpl:async(url,options)=>{
  calls++;assert.equal(String(url),'https://avantalab.com.br/api/modulos/vendas/commercial/operations?companyId=empresa-sintetica');
  assert.deepEqual(options.headers,{Authorization:'Bearer synthetic-session',Accept:'application/json'});
  assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  return Response.json({ok:true,records:[{id:'synthetic-record'}]});
 }});
 assert.equal(calls,1);assert.equal(response.status,200);assert.equal(response.headers.get('x-avanta-local-data'),'production-read-only');
 assert.equal((await response.json()).records[0].id,'synthetic-record');
});

test('nenhuma gravação, reserva, preparação, cancelamento ou transmissão chega à produção',async()=>{
 for(const path of ['commercial/operations','commercial/orders/workflow','fiscal/checkout','fiscal/documents/id/prepare','fiscal/documents/id/number','fiscal/documents/id/continue','fiscal/documents/id/cancel','fiscal/certificate']){
  for(const method of ['POST','PATCH','PUT','DELETE']){
   const response=await proxyLocalCommercialRead(request(path,method),{environment,fetchImpl:()=>assert.fail('nenhuma escrita pode ser encaminhada')});assert.equal(response.status,403);
  }
 }
});

test('proxy permanece inativo em produção, Vercel, hosts externos e sem ativação explícita',async()=>{
 for(const [env,origin] of [[{...environment,NODE_ENV:'production'},'http://localhost:3000'],[{...environment,VERCEL:'1'},'http://localhost:3000'],[{NODE_ENV:'development'},'http://localhost:3000'],[environment,'https://avantalab.com.br'],[environment,'http://localhost:3001']]){
  assert.equal(await proxyLocalCommercialRead(request(undefined,undefined,origin),{environment:env,fetchImpl:()=>assert.fail('não encaminhar')}),null);
 }
});

test('recusa rota não permitida e sessão ausente; preserva recusa remota sem elevar permissões',async()=>{
 assert.equal((await proxyLocalCommercialRead(request('fiscal/unknown'),{environment})).status,403);
 const anonymous=request();anonymous.headers.delete('authorization');assert.equal((await proxyLocalCommercialRead(anonymous,{environment})).status,401);
 const forbidden=await proxyLocalCommercialRead(request('fiscal/documents'),{environment,fetchImpl:async()=>Response.json({ok:false,message:'Sem acesso'},{status:403})});assert.equal(forbidden.status,403);
 const invalid=await proxyLocalCommercialRead(request(),{environment,fetchImpl:async()=>new Response('login',{headers:{'content-type':'text/html'}})});assert.equal(invalid.status,502);
});
