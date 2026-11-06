import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { controlledPlan, installControlledFetch, verifyWorkspace } from '../../scripts/lib/controle-atendimento-jeff.mjs';
const plan={type:'marketplace-post-sale-jeff',version:'1.0.0',accountLabel:'JEFF',mode:'read-only-before-production',sellerReference:'123456',companyId:'11111111-1111-4111-8111-111111111111',connectionId:'22222222-2222-4222-8222-222222222222'};
const setup=()=>{const calls=[];const guard=installControlledFetch({supabaseUrl:'https://project.supabase.co',plan,fetchImpl:async(...args)=>{calls.push(args);return Response.json({messages:[{text:'private buyer text'}],conversation_status:{status:'active'},paging:{total:1,limit:10}});}});return {...guard,calls};};
test('controle exige plano JEFF da versão atual e ambiente de produção',()=>{
 assert.equal(controlledPlan({controlledCheck:plan},'1.0.1','production'),null);
 assert.equal(controlledPlan({},'1.0.0','production'),null);
 assert.equal(controlledPlan({controlledCheck:plan},'1.0.0','production'),plan);
 assert.throws(()=>controlledPlan({controlledCheck:plan},'1.0.0','preview'));
 for(const patch of [{accountLabel:'ALINE'},{mode:'write'},{sellerReference:'foreign'},{connectionId:'bad'}])assert.throws(()=>controlledPlan({controlledCheck:{...plan,...patch}},'1.0.0','production'));
});
test('controle permite leitura e sanitiza respostas sem gravar conteúdo da conversa',async()=>{
 const g=setup();await g.fetch('https://api.mercadolibre.com/messages/packs/123/sellers/456?tag=post_sale');await g.fetch('https://project.supabase.co/rest/v1/marketplace_sales');
 assert.equal(g.calls.length,2);assert.equal(g.stats.mlReads,1);assert.equal(g.stats.databaseReads,1);
 assert.equal(g.responses[0].resource,'/messages/packs/:id/sellers/:id');assert.equal(g.responses[0].status,200);assert.equal(JSON.stringify(g.responses).includes('private buyer text'),false);
});
test('controle impede envio de mensagem, reembolso, exclusão, RPC e hosts externos',async()=>{
 const g=setup();for(const [url,method] of [['https://api.mercadolibre.com/messages/packs/1/sellers/2','POST'],['https://api.mercadolibre.com/post-purchase/v1/claims/1/actions/refund','POST'],['https://project.supabase.co/rest/v1/marketplace_sales','DELETE'],['https://project.supabase.co/rest/v1/rpc/mutate','POST'],['https://other.example/read','GET']])await assert.rejects(g.fetch(url,{method}));
 assert.equal(g.calls.length,0);assert.equal(g.stats.blockedWrites,5);
});
test('controle permite somente renovação OAuth existente e manutenção da credencial da JEFF',async()=>{
 const g=setup();await g.fetch('https://api.mercadolibre.com/oauth/token',{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',refresh_token:'private'})});
 const target=`https://project.supabase.co/rest/v1/marketplace_connections?id=eq.${plan.connectionId}&empresa_id=eq.${plan.companyId}`;
 await g.fetch(target,{method:'PATCH',body:JSON.stringify({refresh_lock_owner:null,refresh_lock_until:null})});
 await assert.rejects(g.fetch('https://api.mercadolibre.com/oauth/token',{method:'POST',body:'grant_type=authorization_code'}));
 await assert.rejects(g.fetch(target.replace(plan.connectionId,plan.companyId),{method:'PATCH',body:'{"token_sealed":null}'}));
 await assert.rejects(g.fetch(target,{method:'PATCH',body:'{"sync_phase":"scan"}'}));
 assert.equal(g.calls.length,2);assert.equal(g.stats.oauthRefreshes,1);assert.equal(g.stats.credentialUpdates,1);
});
test('controle exige histórico confirmado e rejeita operação real pendente',()=>{
 const data={messages:[],cases:[],casesComplete:true,orderId:'2000019139347426',revision:'a'.repeat(64),operations:[],canReply:false,reason:'Compra encerrada',hasMore:false};
 assert.equal(verifyWorkspace(data).conversationPolicy,'restricted');
 assert.equal(verifyWorkspace({...data,canReply:true,reason:null}).conversationPolicy,'available');
 for(const patch of [{casesComplete:false},{revision:'bad'},{operations:[{state:'uncertain'}]},{canReply:true}])assert.throws(()=>verifyWorkspace({...data,...patch}));
});
test('build mantém suíte completa e controle real antes do Next; entrada não chama comandos comerciais',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8'));const gate=pkg.scripts.build.indexOf('scripts/validar-atendimento-jeff.mjs');assert.ok(gate>pkg.scripts.build.indexOf('npm test'));assert.ok(gate<pkg.scripts.build.indexOf('next build --webpack'));
 const script=readFileSync(new URL('../../scripts/validar-atendimento-jeff.mjs',import.meta.url),'utf8');assert.ok(script.includes('globalThis.fetch=guard.fetch'));assert.ok(script.includes("process.env.VERCEL_ENV!=='production'"));assert.ok(script.includes('process.exitCode=1'));assert.equal(/sendServiceCommand|uploadServiceAttachment/.test(script),false);
});
