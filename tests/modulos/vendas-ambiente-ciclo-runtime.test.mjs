import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import {createFiscalEmissionLifecycleService} from '../../app/vendas/lib/server/fiscal-emission-lifecycle.mjs';
import {createCommercialFiscalEmissionBridge} from '../../app/vendas/lib/server/commercial-fiscal-emission-bridge.mjs';
const companyId='11111111-1111-4111-8111-111111111111',actorId='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.prepare':true}};
const source=readFileSync('app/vendas/lib/server/fiscal-status-runtime.mjs','utf8');
const ast=ts.createSourceFile('runtime.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let wiring;
const visit=node=>{if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(ast)==='fiscalLifecycle'))wiring=node.getText(ast);ts.forEachChild(node,visit);};visit(ast);
assert.ok(wiring);
function fixture(environment){
 const emissions=new Map(),operations=new Map(),events=[];
 const tx={getOperation:async(company,key)=>operations.get(`${company}:${key}`),getEmission:async id=>emissions.get(id),insertEmission:async emission=>emissions.set(emission.id,structuredClone(emission)),appendEvent:async event=>events.push(event),insertOperation:async operation=>operations.set(`${operation.companyId}:${operation.operationKey}`,operation)};
 const repository={configured:true,runInTransaction:async work=>work(tx)};
 const scope={exports:{},createFiscalEmissionLifecycleService,fiscalRepository:repository,fiscalEnvironment:environment};
 vm.runInNewContext(wiring+'\nexports.lifecycle=fiscalLifecycle;',scope);
 return {lifecycle:scope.exports.lifecycle,emissions,operations,events};
}
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
for(const environment of ['homologacao','producao']){
 test(`runtime e ponte criam emissão em ${environment}, reutilizando o vínculo sem reservar número ou transmitir`,async()=>{
  const f=fixture(environment);
  const draft={id,companyId,operationId:id,originType:'avulsa',documentType:'nfe',status:'pronto',issuerSnapshot:{establishmentId:companyId},customerSnapshot:{name:'Cliente sintético'},itemsSnapshot:[],totalsSnapshot:{total:10},paymentSnapshot:{method:'Dinheiro',amount:10}};
  draft.contentDigest=createHash('sha256').update(JSON.stringify(stable({companyId,orderId:id,documentType:'nfe',issuer:draft.issuerSnapshot,customer:draft.customerSnapshot,items:draft.itemsSnapshot,totals:draft.totalsSnapshot,payment:draft.paymentSnapshot}))).digest('hex');
  const original=structuredClone(draft);
  const bridge=createCommercialFiscalEmissionBridge({draftRepository:{get:async()=>({...draft,emission:f.emissions.get(id)})},emissionLifecycle:f.lifecycle,environment});
  const result=await bridge.createNfeDraft({context,draftId:id,idempotencyKey:'environment-runtime-regression'});
  assert.equal(result.ok,true,JSON.stringify(result.errors));assert.equal(result.result.environment,environment);assert.equal(result.result.state,'draft');
  const persisted=f.emissions.get(id);assert.equal(persisted.environment,environment);assert.equal(persisted.number,0);assert.equal(persisted.accessKey,'');
  const repeat=await bridge.createNfeDraft({context,draftId:id,idempotencyKey:'environment-runtime-regression'});assert.equal(repeat.ok,true);assert.equal(repeat.result.reused,true);
  assert.equal(f.emissions.size,1);assert.equal(f.events.length,1);assert.equal(f.operations.size,1);assert.deepEqual(draft,original);
 });
 test(`runtime ${environment} continua recusando criação no outro ambiente antes de gravar`,async()=>{
  const f=fixture(environment),other=environment==='producao'?'homologacao':'producao';
  const result=await f.lifecycle.create({id,companyId,establishmentId:companyId,draftId:id,originId:id,documentType:'nfe',model:'55',environment:other,operationKey:'environment-runtime-mismatch',actorId});
  assert.equal(result.ok,false);assert.ok(result.errors.some(e=>e.code==='AV-FISCAL-LIFECYCLE-ENVIRONMENT'));assert.equal(f.emissions.size,0);assert.equal(f.events.length,0);
 });
}
