import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readMLDiagnosticEvidence} from '../../app/modules/marketplaces/services/mercadolivre-diagnostic-evidence.ts';
import {priceAccessPlan,priceAccessEvents} from '../../scripts/lib/controle-diagnostico-ml.mjs';
import {installControlledFetch} from '../../scripts/lib/controle-atendimento-jeff.mjs';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='./management-access')return {url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code})}}',shortCircuit:true};
 if(s==='./mercadolivre-management')return {url:'data:text/javascript,export async function mlRequest(){throw Error("Rede real proibida no teste");}',shortCircuit:true};
 const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);
}});
const {diagnoseMercadoLivreAccess,diagnosticPathAllowed}=await import('../../app/modules/marketplaces/services/mercadolivre-access-diagnostic.ts');hook.deregister();
test('recibo de 403 preserva somente códigos documentados, política e correlação, sem alterar a resposta original',async()=>{
 const token='APP_USR-private-token',response=Response.json({code:'PA_UNAUTHORIZED_RESULT_FROM_POLICIES',blocked_by:'PolicyAgent',message:'At least one policy returned UNAUTHORIZED.',status:403,access_token:token,email:'buyer@example.test',cause:[{code:'FORBIDDEN',message:'Bearer '+token},{code:token}]},{status:403,headers:{'x-request-id':'99d2bd12-abcd-4123-9123-999999999999','set-cookie':'secret-cookie'}});
 const e=await readMLDiagnosticEvidence(response,'/sites/MLB/search?q=Mixer',token);
 assert.equal(e.status,403);assert.equal(e.providerCode,'PA_UNAUTHORIZED_RESULT_FROM_POLICIES');assert.equal(e.blockedBy,'PolicyAgent');assert.equal(e.requestId,'99d2bd12-abcd-4123-9123-999999999999');assert.deepEqual(e.causeCodes,['FORBIDDEN']);
 assert.doesNotMatch(JSON.stringify(e),/private-token|buyer@|secret-cookie|access_token|Bearer/);assert.equal((await response.json()).access_token,token);
});
test('HTML, mensagem livre, código desconhecido, header secreto e corpo excessivo são omitidos',async()=>{
 const secret='APP_USR-private-token';
 for(const response of [new Response('<html>buyer@example.test</html>',{status:403}),Response.json({message:'buyer@example.test '+secret,code:secret,error:secret},{status:403,headers:{'x-request-id':secret}}),Response.json({code:'FORBIDDEN',padding:'x'.repeat(20000)},{status:403})]){
  const e=await readMLDiagnosticEvidence(response,'/items/MLB123',secret);assert.equal(e.message,null);assert.equal(e.providerCode,null);assert.equal(e.requestId,null);assert.doesNotMatch(JSON.stringify(e),/private-token|buyer@example/);
 }
 const success=Response.json({access_token:secret});assert.equal((await readMLDiagnosticEvidence(success,'/users/me',secret)).body,'not_read');assert.equal((await success.json()).access_token,secret);
});
test('limita os GETs à conta/app atuais e recusa origem, credenciais, caminho arbitrário e limite excessivo',()=>{
 for(const p of ['/users/me','/users/230210240/items/search?limit=1','/applications/12345','/products/MLB30515198/items?limit=20','/sites/MLB/search?q=7898649372113&limit=1'])assert.equal(diagnosticPathAllowed(p,'230210240','12345'),true,p);
 for(const p of ['https://evil.example/users/me','//evil.example/items/MLB123','/users/999/applications','/applications/999','/items/MLB123?access_token=secret','/products/MLB123/items?offset=100','/sites/MLB/search?seller_id=999&limit=1','/users/230210240/items/search?limit=1000','/oauth/token'])assert.equal(diagnosticPathAllowed(p,'230210240','12345'),false,p);
});
test('diagnóstico confirma identidade primeiro, compara dados próprios/terceiros e remove dados privados do app e de outros grants',async()=>{
 const old=process.env.MERCADOLIVRE_CLIENT_ID;process.env.MERCADOLIVRE_CLIENT_ID='12345';
 const paths=[];try{
  const r=await diagnoseMercadoLivreAccess({}, {seller_reference:'230210240'}, {ean:'7898649372113',query:'Amvox ARF 1250 127V',catalogId:null},async p=>{
   paths.push(p);if(p==='/users/me')return {id:230210240,site_id:'MLB',email:'private@example.test'};
   if(p==='/applications/12345')return {id:12345,active:true,sandbox_mode:false,certification_status:'not_certified',scopes:['read','write','urn:ml:mktp:publish-sync:/read-write','private secret'],client_secret:'private-app-secret'};
   if(p==='/users/230210240/applications')return [{app_id:999,user_id:230210240,scopes:['other-secret']},{app_id:12345,user_id:230210240,scopes:['read','write'],access_token:'private-token'}];
   if(p==='/users/230210240/items/search?limit=1')return {results:['MLB12345']};
   if(p.startsWith('/products/search?'))return {results:[{id:'MLB30515198',name:'Amvox'}]};
   if(p==='/products/MLB30515198')return {name:'Amvox',status:'active'};
   if(p==='/products/MLB30515198/items?limit=20')return {paging:{total:1},results:[{item_id:'MLB5282202535',seller_id:1022271672,price:429.9,currency_id:'BRL',condition:'new'}]};
   return {};
  });
  assert.equal(paths[0],'/users/me');assert.equal(paths.filter(p=>p==='/users/me').length,1);assert.equal(new Set(paths).size,paths.length);assert(paths.includes('/items/MLB12345'));assert(paths.includes('/items/MLB5282202535'));
  assert.equal(r.accessAudit.identityVerified,true);assert.equal(r.accessAudit.application.active,true);assert.equal(r.accessAudit.authorization.grantFound,true);assert.deepEqual(r.accessAudit.authorization.scopes,['read','write']);assert.equal(r.accessAudit.stockChanged,false);assert.equal(r.accessAudit.referenceSaved,false);assert.equal(r.openaiCalls,0);assert(paths.length<=16);
  assert.doesNotMatch(JSON.stringify(r),/private-token|private-app-secret|private@example|other-secret|client_secret|access_token/);
  const events=priceAccessEvents('3.2.0.423',r,{blockedWrites:0,mlReads:paths.length});assert(events.some(([n])=>n==='AVANTA_ML_ACCESS_APP'));assert.doesNotMatch(JSON.stringify(events),/private-token|private-app-secret|private@example/);
 }finally{if(old===undefined)delete process.env.MERCADOLIVRE_CLIENT_ID;else process.env.MERCADOLIVRE_CLIENT_ID=old;}
});
test('identidade divergente ou não confirmada impede consultas adicionais',async()=>{
 for(const identity of [{id:999,site_id:'MLB'},{id:230210240,site_id:'MLA'},{}]){
  const calls=[];await assert.rejects(diagnoseMercadoLivreAccess({}, {seller_reference:'230210240'}, {ean:'7898649372113',query:'',catalogId:null},async p=>{calls.push(p);return identity;}),{code:'diagnostic_identity'});assert.deepEqual(calls,['/users/me']);
 }
});
test('execução controlada exige a versão, produção, conta JEFF e não cria alternativa de autenticação HTTP',()=>{
 const plan={version:'3.2.0.423',type:'marketplace-price-access-jeff',accountLabel:'JEFF',mode:'production-read-only',sellerReference:'230210240',companyId:crypto.randomUUID(),connectionId:crypto.randomUUID()};
 assert.equal(priceAccessPlan({mlPriceAccessCheck:plan},'3.2.0.424','production'),null);assert.deepEqual(priceAccessPlan({mlPriceAccessCheck:plan},'3.2.0.423','production'),plan);
 assert.throws(()=>priceAccessPlan({mlPriceAccessCheck:plan},'3.2.0.423','preview'));assert.throws(()=>priceAccessPlan({mlPriceAccessCheck:{...plan,sellerReference:'999'}},'3.2.0.423','production'));
 const route=readFileSync('app/api/modulos/marketplaces/diagnostico-precos/route.ts','utf8');assert.match(route,/authorizeMarketplace\(request, body.empresaId, 'connections'\)/);assert.doesNotMatch(route,/CRON_SECRET|SUPABASE_SERVICE_ROLE_KEY|generateLink|createUser|signIn|bypass/i);
 const script=readFileSync('scripts/diagnosticar-acesso-ml-jeff.mjs','utf8');assert.match(script,/installControlledFetch/);assert.match(script,/process.env.VERCEL_ENV!==?'production'/);assert.doesNotMatch(script,/writeFile|\.update\(|\.insert\(|\.rpc\(/);
});
test('a execução real bloqueia preço, estoque, anúncios, RPC e origem externa antes de enviar qualquer escrita comercial',async()=>{
 let sent=0;const guard=installControlledFetch({fetchImpl:async()=>{sent++;return Response.json({ok:true})},supabaseUrl:'https://project.supabase.co',plan:{companyId:'company',connectionId:'connection'}});
 for(const [url,init] of [
  ['https://api.mercadolibre.com/items/MLB12345',{method:'PUT',body:JSON.stringify({price:1,available_quantity:0})}],
  ['https://api.mercadolibre.com/items',{method:'POST',body:'{}'}],
  ['https://project.supabase.co/rest/v1/marketplace_products',{method:'PATCH',body:JSON.stringify({price_cents:1})}],
  ['https://project.supabase.co/rest/v1/marketplace_warehouse_balances',{method:'PATCH',body:JSON.stringify({quantity:0})}],
  ['https://project.supabase.co/rest/v1/rpc/marketplace_product_command',{method:'POST',body:'{}'}],
  ['https://evil.example/users/me',{method:'GET'}],
 ])await assert.rejects(guard.fetch(url,init),/bloque/);
 assert.equal(sent,0);assert.equal(guard.stats.blockedWrites,6);
 await guard.fetch('https://api.mercadolibre.com/users/me',{method:'GET'});assert.equal(sent,1);assert.equal(guard.stats.mlReads,1);
});
