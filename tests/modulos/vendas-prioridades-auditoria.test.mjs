import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createCommercialOperationService} from '../../app/vendas/lib/server/commercial-operation-service.mjs';
import {commercialResponse} from '../../app/vendas/lib/server/commercial-visibility.mjs';
import {fetchCommercialPages} from '../../app/vendas/lib/commercial-pages.mjs';
import {emitterTaxOptions} from '../../app/vendas/lib/fiscal-emitter-capabilities.mjs';
import {lookupCompanyCnpj} from '../../app/vendas/lib/company-cnpj-lookup.mjs';
import {formatCnpj,isValidCnpj} from '../../app/vendas/lib/domain.mjs';
import {normalizeCommercialCustomerInput} from '../../app/vendas/lib/server/commercial-customer-service.mjs';
import {companyProfilePatch} from '../../app/vendas/lib/company-profile-save.mjs';
const companyId='11111111-1111-4111-8111-111111111111',actorId='22222222-2222-4222-8222-222222222222',customerId='33333333-3333-4333-8333-333333333333',productId='55555555-5555-4555-8555-555555555555';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'sales.view':true,'sales.create':true,'sales.edit':true}};
const input={type:'pedido',channel:'vendas',customerId,fiscalDocument:'nenhum',payment:{method:'pix',installments:1,firstDueDate:'2026-11-18'},items:[{catalogItemId:productId,quantity:1,unitPrice:100,discountUnit:0}],idempotencyKey:'auditoria:regressao:123456'};
function fixture(limit=15){let stored;const operation={id:productId,items:[{costUnitSnapshot:33.5,unitPrice:100}],serviceOrder:{actualCost:20,materials:[{costUnitSnapshot:12}]}};const service=createCommercialOperationService({repository:{create:async op=>{stored=op;return{operation:op};},update:async({operation})=>{stored=operation;return operation;},convertQuoteToOrder:async()=>({operation}),list:async()=>[operation],get:async()=>operation},customerResolver:async()=>({id:customerId,status:'ativo',displayName:'Cliente fictício'}),catalogResolver:async()=>({items:[{id:productId,name:'Produto fictício',unit:'un',salePrice:100,costPrice:33.5,active:true,published:true}]}),policyResolver:async()=>({maxDiscountPercent:limit})});return{service,stored:()=>stored};}
test('A01: lista, detalhe e gravação ocultam custos sem alterar o retrato persistido',async()=>{
 const {service,stored}=fixture();const listing=await service.list({context});assert.equal('costUnitSnapshot' in listing.operations[0].items[0],false);assert.equal('actualCost' in listing.operations[0].serviceOrder,false);
 const detail=await service.get({context,operationId:productId});assert.equal('costUnitSnapshot' in detail.operation.items[0],false);
 const saved=await service.create({context,input});assert.equal(saved.ok,true);assert.equal('costUnitSnapshot' in saved.operation.items[0],false);assert.equal(stored().items[0].costUnitSnapshot,33.5);
 const allowed=await service.list({context:{...context,effectivePermissions:{...context.effectivePermissions,'catalog.view_cost':true}}});assert.equal(allowed.operations[0].items[0].costUnitSnapshot,33.5);
});
test('A01: custos aninhados de OS, relatórios e movimentos não passam pela projeção',()=>{const r=commercialResponse(context,{laborCost:1,actualMarginPercent:2,materials:[{costUnitSnapshot:5}],net:100});assert.deepEqual(r,{materials:[{}],net:100});});
test('A02: limite atual é aplicado no servidor a desconto por item e geral',async()=>{
 for(const discount of [{items:[{...input.items[0],discountUnit:90}]},{items:[{...input.items[0],unitPrice:10}]},{generalDiscount:16},{items:[{...input.items[0],discountUnit:10}],generalDiscount:6}]){
  const {service,stored}=fixture();const r=await service.create({context,input:{...input,...discount}});assert.equal(r.ok,false);assert.match(r.errors[0].code,/DISCOUNT-PERMISSION/);assert.equal(stored(),undefined);
 }
 const f=fixture();assert.equal((await f.service.create({context,input:{...input,generalDiscount:15}})).ok,true);
 const permitted={...context,effectivePermissions:{...context.effectivePermissions,'sales.approve_discount':true}};assert.equal((await fixture().service.create({context:permitted,input:{...input,generalDiscount:90}})).ok,true);
 assert.equal((await fixture(5).service.update({context,operationId:productId,expectedVersion:1,input:{...input,generalDiscount:6}})).ok,false);
});
test('A03: capacidades não escolhem nem substituem códigos e mantêm listas oficiais intactas',()=>{const options=[{value:'102',label:'102'},{value:'500',label:'500'}];assert.equal(emitterTaxOptions('csosn',options)[0].disabled,undefined);assert.equal(emitterTaxOptions('csosn',options)[1].disabled,true);assert.equal(options[1].disabled,undefined);assert.equal(emitterTaxOptions('contribution',[{value:'01',label:'tributado'},{value:'07',label:'isento'}])[0].disabled,true);});
test('A04: carga percorre além de 100/200 registros e inclui o último na soma',async()=>{const records=Array.from({length:351},(_,i)=>({id:String(i),total:i+1}));const offsets=[];const result=await fetchCommercialPages({url:'/x?companyId=test',key:'operations',token:'ficticio',fetcher:async url=>{const u=new URL(url,'https://local.test');const n=Number(u.searchParams.get('offset'));offsets.push(n);return Response.json({ok:true,operations:records.slice(n,n+100)});}});assert.deepEqual(offsets,[0,100,200,300]);assert.equal(result.length,351);assert.equal(result.reduce((n,r)=>n+r.total,0),351*352/2);});
test('A04: erro intermediário ou página repetida nunca é apresentado como histórico completo',async()=>{let call=0;await assert.rejects(fetchCommercialPages({url:'/x',key:'operations',token:'ficticio',pageSize:1,fetcher:async()=>++call===1?Response.json({ok:true,operations:[{id:'1'}]}):Response.json({ok:false,message:'Falha confirmada'},{status:503})}),/Falha confirmada/);await assert.rejects(fetchCommercialPages({url:'/x',key:'operations',token:'ficticio',pageSize:1,fetcher:async()=>Response.json({ok:true,operations:[{id:'1'}]})}),/lista mudou/);});
test('A05: CNPJ alfanumérico é formatado, consultado e preservado no cadastro',async()=>{const doc='12ABC34501DE35';assert.equal(isValidCnpj(doc),true);assert.equal(formatCnpj(doc),'12.ABC.345/01DE-35');assert.equal(isValidCnpj('12ABC34501DE36'),false);let sent;const company=await lookupCompanyCnpj('12.abc.345/01de-35',{fetcher:async(url,init)=>{sent=JSON.parse(init.body).cnpj;return Response.json({success:true,data:{documento:doc,razaoSocial:'Empresa fictícia'}});}});assert.equal(sent,doc);assert.equal(company.document,doc);assert.equal(normalizeCommercialCustomerInput({documentType:'cnpj',document:formatCnpj(doc)}).normalized.document,doc);assert.equal(companyProfilePatch({city:'São Paulo/SP',document:formatCnpj(doc)}).documento,doc);assert.equal(formatCnpj('27865757000102'),'27.865.757/0001-02');});

test('migração e política: isolamento por empresa, versão, formato alfanumérico e CPF preservado',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const {createCommercialPolicyRepository}=await import('../../app/vendas/lib/server/commercial-policy.mjs');const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema fiscal_private;create table auth.users(id uuid primary key);create table public.empresas(id uuid primary key);create table public.vendas_clientes(documento text,documento_tipo text,tipo_pessoa text,constraint vendas_clientes_documento_check check(documento ~ '^[0-9]+$'));create table public.vendas_fornecedores(documento text,constraint vendas_fornecedores_documento_check check(documento is null or documento ~ '^[0-9]{14}$'));create table public.cadastros_perfil(tipo_documento text,documento text,constraint cadastros_perfil_check check(documento is null or documento ~ '^[0-9]+$'));`);
 await db.exec(readFileSync('supabase/migrations/20261118160000_vendas_prioridades_auditoria.sql','utf8'));
 await db.query('insert into public.empresas values($1),($2)',[companyId,customerId]);await db.query('insert into auth.users values($1)',[actorId]);
 const policy=createCommercialPolicyRepository({pool:db});assert.deepEqual(await policy.load(companyId),{maxDiscountPercent:15,version:0});
 assert.deepEqual(await policy.save(companyId,actorId,12.5,0),{maxDiscountPercent:12.5,version:1});
 assert.deepEqual(await policy.save(companyId,actorId,5,1),{maxDiscountPercent:5,version:2});
 await assert.rejects(policy.save(companyId,actorId,99,1),/outra tela/);assert.equal((await policy.load(customerId)).maxDiscountPercent,15);
 await assert.rejects(policy.save(companyId,actorId,-1,2),/0% a 100%/);
 await db.query("insert into public.vendas_clientes values('12ABC34501DE35','cnpj','juridica'),('11144477735','cpf','fisica')");
 await assert.rejects(db.query("insert into public.vendas_clientes values('12ABC34501DE35','cpf','fisica')"));
 await assert.rejects(db.query("insert into public.vendas_clientes values('12ABC34501DE35','cnpj','fisica')"));
 await db.query("insert into public.cadastros_perfil values('cnpj','12ABC34501DE35')");
 await db.query("insert into public.vendas_fornecedores values('12ABC34501DE35')");
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from fiscal_private.commercial_policies'));await db.exec('reset role');
 }finally{await db.close();}
});

test('política HTTP nega acesso sem sessão/permissão e não grava em outro perfil',async()=>{
 const {handleCommercialPolicy}=await import('../../app/vendas/lib/server/commercial-policy.mjs');let writes=0;
 const req=()=>new Request(`https://local.test/policy?companyId=${companyId}`,{method:'PATCH',body:JSON.stringify({maxDiscountPercent:100,version:0})});
 const boundary={userId:actorId,companyId,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true};
 for(const access of [{authenticated:false},{authenticated:true,boundary,effectivePermissions:{}},{authenticated:true,boundary:{...boundary,companyId:customerId},effectivePermissions:{'settings.edit':true}}]){
  const response=await handleCommercialPolicy({request:req(),runtime:{accessResolver:{resolve:async()=>access},commercialPolicyRepository:{save:async()=>{writes++;}}}});assert.ok([401,403].includes(response.status));
 }
 assert.equal(writes,0);
});
