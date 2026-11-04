import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { fiscalProviderProblem,isFiscalPath,FiscalProviderError } from './fiscal-service-harness.mjs';
const source=readFileSync('app/modules/marketplaces/services/mercadolivre-management.ts','utf8'),ast=ts.createSourceFile('service.ts',source,ts.ScriptTarget.Latest,true);
function transport(fetch){
 const exports={};const nodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['mlRequest','mlBinaryRequest'].includes(n.name?.text));
 vm.runInNewContext(ts.transpileModule(nodes.map(n=>n.getText(ast)).join('\n'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,fetch,accessToken:async()=> 'test-token',AbortSignal,Uint8Array,JSON,Error,MarketplaceError:class extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}},fiscalProviderProblem,isFiscalPath,
 });return exports;
}
test('transporte fiscal preserva HTTP/código/correlação, sem expor mensagem ou cause brutos',async()=>{
 for(const status of [400,401,403,404,409,422,429,500]){
  let calls=0;const api=transport(async(_,options)=>{calls++;assert.equal(options.redirect,'error');return new Response(JSON.stringify({error_code:'invalid_parameter',message:'CPF privado que não deve ser exposto',cause:[{token:'secret'}]}),{status,headers:{'x-request-id':'correlation-1'}});});
  await assert.rejects(api.mlRequest({}, {}, '/mlb/order/123/dce/emission','POST'), e=>e instanceof FiscalProviderError && e.httpStatus===status && e.providerCode==='invalid_parameter' && e.correlation==='correlation-1' && !e.message.includes('CPF privado'));
  assert.equal(calls,status===401?2:1);
 }
});
test('envio XML mantém tipo/body original e downloads não seguem redirecionamentos',async()=>{
 const requests=[];const api=transport(async(url,options)=>{requests.push({url,options});return url.includes('/invoice_data')?new Response('{"id":123}',{headers:{'content-type':'application/json'}}):new Response('<?xml version="1.0"?><nfe/>',{headers:{'content-type':'application/xml'}});});
 await api.mlRequest({}, {},'/shipments/555/invoice_data/?siteId=MLB','POST',undefined,{xml:'<nfeProc/>'});
 assert.equal(requests[0].options.headers['Content-Type'],'application/xml');assert.equal(requests[0].options.body,'<nfeProc/>');
 const bytes=await api.mlBinaryRequest({}, {},'/users/123/invoices/documents/xml/456/authorized','xml');assert.ok(bytes.length>5);assert.equal(requests[1].options.redirect,'error');
});
