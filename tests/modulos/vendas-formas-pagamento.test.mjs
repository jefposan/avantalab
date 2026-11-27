import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {addCustomPaymentMethod, normalizePaymentSettings, paymentFilterOptions} from '../../app/vendas/lib/payment-methods.mjs';
import {buildCommercialReport, freshReportFilters} from '../../app/vendas/lib/report-builder.mjs';
import {createCommercialPolicyRepository, handleCommercialPolicy} from '../../app/vendas/lib/server/commercial-policy.mjs';
import {createCommercialOperationService} from '../../app/vendas/lib/server/commercial-operation-service.mjs';

const empresa = '11111111-1111-4111-8111-111111111111';
const outra = '12121212-1212-4212-8212-121212121212';
const autor = '22222222-2222-4222-8222-222222222222';
const cliente = '33333333-3333-4333-8333-333333333333';
const produto = '44444444-4444-4444-8444-444444444444';

test('legado preserva as opções ativas e Consignado, enquanto o novo cadastro permite desativá-lo', () => {
  const legacy = normalizePaymentSettings({enabledMethods:['boleto'], defaultMethod:'boleto'});
  assert.deepEqual(legacy.enabledMethods, ['boleto','consignado']);
  const custom = addCustomPaymentMethod(legacy, ' Vale  Presente ');
  assert.deepEqual(custom.customMethods, ['Vale Presente']);
  assert.throws(() => addCustomPaymentMethod(custom,' vale presente'), /já existe/);
  assert.throws(() => addCustomPaymentMethod(custom,'Transferência bancária'), /já existe/);
  const inactive = normalizePaymentSettings({...custom, enabledMethods:['Vale Presente'], defaultMethod:'boleto'});
  assert.equal(inactive.defaultMethod, 'Vale Presente');
  assert.deepEqual(paymentFilterOptions(inactive, ['a_prazo','Consignado','vale presente']), [
    {value:'prazo',label:'A prazo'}, {value:'consignado',label:'Consignado'}, {value:'vale presente',label:'Vale Presente'},
  ]);
});

test('o filtro de relatório compara códigos e nomes históricos pela mesma regra', () => {
  const orders=[{id:'01',type:'pedido',client:'Cliente',createdAt:'2026-11-26',total:50,order:{paymentMethod:'A prazo'}},
    {id:'02',type:'pedido',client:'Cliente',createdAt:'2026-11-27',total:20,order:{paymentMethod:'Vale Presente'}}];
  for (const [method,label] of [['prazo','A prazo'],['vale presente','Vale Presente']]) {
    const report = buildCommercialReport({id:'orders',operations:orders,filters:{...freshReportFilters(),methods:[method]}});
    assert.deepEqual(report.rows.map(row=>row.method), [label]);
  }
});

test('gravação por empresa aplica a migração, exige versão e respeita RLS', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema fiscal_private; create schema auth;
      create role anon; create role authenticated; create role avanta_vendas_runtime;
      create table empresas(id uuid primary key); create table auth.users(id uuid primary key);
      create function public.vendas_runtime_empresa_liberada(uuid) returns boolean language sql as
        'select $1::text = current_setting(''test.company'',true)';
      grant usage on schema fiscal_private to avanta_vendas_runtime;`);
    await db.exec(readFileSync('supabase/migrations/20261127170000_vendas_formas_pagamento.sql','utf8'));
    await db.query('insert into empresas values($1),($2)',[empresa,outra]);
    await db.query('insert into auth.users values($1)',[autor]);
    await db.exec(`set test.company = '${empresa}'; set role avanta_vendas_runtime`);
    const repo = createCommercialPolicyRepository({pool:db});
    const config = addCustomPaymentMethod(normalizePaymentSettings(), 'Vale Presente');
    assert.equal((await repo.loadPayments(empresa)).version,0);
    assert.equal((await repo.savePayments(empresa,autor,config,0)).version,1);
    await assert.rejects(repo.savePayments(empresa,autor,config,0), {status:409});
    assert.deepEqual((await repo.loadPayments(empresa)).payments,config);
    await assert.rejects(repo.savePayments(outra,autor,config,0));
    assert.deepEqual(await repo.loadPayments(outra),{payments:null,version:0});
    await assert.rejects(repo.savePayments(empresa,autor,{...config,enabledMethods:['inválido']},1),{status:400});
    assert.equal((await repo.savePayments(empresa,autor,{...config,enabledMethods:['pix']},1)).version,2);
  } finally { await db.close(); }
});

test('forma desativada bloqueia novos pedidos e pode ser mantida ao editar um pedido antigo', async () => {
  const creates=[];
  const repository={
    create: async (operation, {existingOnly=false}={})=>{
      const previous = creates.find(saved=>saved.idempotencyKey === operation.idempotencyKey);
      if (previous) return {operation:previous,reused:true};
      if (existingOnly) return null;
      creates.push(operation);
      return {operation};
    },
    update: async ({operation})=>operation,
    convertQuoteToOrder: async()=>({}),
    get: async()=>({paymentSnapshot:{method:'Vale Presente'}}),
  };
  const context={companyId:empresa,actorId:autor,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'sales.create':true,'sales.edit':true}};
  let settings=addCustomPaymentMethod(normalizePaymentSettings(), 'Vale Presente');
  const service=createCommercialOperationService({repository,paymentSettingsResolver:async()=>settings,
    customerResolver:async()=>({id:cliente,status:'ativo',legalName:'Cliente'}),
    catalogResolver:async()=>({items:[{id:produto,sku:'A1',name:'Item',type:'produto',unit:'UN',salePrice:50,active:true,published:true,fiscalReady:true}]}),
  });
  const input={type:'pedido',channel:'vendas',customerId:cliente,fiscalDocument:'nenhum',payment:{method:'Vale Presente',installments:1,firstDueDate:'2026-11-27'},items:[{catalogItemId:produto,quantity:1,unitPrice:50}],idempotencyKey:'formas:pedido:1'};
  const saved = await service.create({context,input});
  assert.equal(saved.ok,true, JSON.stringify(saved.errors));
  assert.equal(creates[0].paymentSnapshot.method,'Vale Presente');
  settings=normalizePaymentSettings({...settings,enabledMethods:['pix']});
  assert.equal((await service.create({context,input})).reused, true, 'repetição preserva o pedido já salvo');
  const denied=await service.create({context,input:{...input,idempotencyKey:'formas:pedido:2'}});
  assert.equal(denied.errors[0]?.code,'AV-COMMERCIAL-PAYMENT-INACTIVE');
  assert.equal((await service.update({context,input,operationId:produto,expectedVersion:1})).ok,true);
});

test('API libera consulta para a operação e reserva a gravação ao perfil autorizado', async () => {
  const boundary={userId:autor,companyId:empresa,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true};
  const config=normalizePaymentSettings();
  let writes=0;
  const call=(method,permissions,companyId=empresa)=>handleCommercialPolicy({
    request:new Request(`https://local.test/policy?companyId=${empresa}&section=payments`,{
      method,...(method==='PATCH'?{body:JSON.stringify({settings:config,version:0})}:{}),
    }),
    runtime:{
      accessResolver:{resolve:async()=>({authenticated:true,boundary:{...boundary,companyId},effectivePermissions:permissions})},
      commercialPolicyRepository:{
        loadPayments:async id=>{assert.equal(id,empresa);return {payments:config,version:0};},
        savePayments:async (id,actor,settings,version)=>{
          assert.equal(id,empresa);assert.equal(actor,autor);assert.equal(version,0);
          writes++;
          return {payments:settings,version:1};
        },
      },
    },
  });
  assert.equal((await call('GET',{'sales.create':true})).status,200);
  assert.equal((await call('PATCH',{'sales.create':true})).status,403);
  assert.equal((await call('PATCH',{'settings.edit':true},outra)).status,403);
  const saved=await call('PATCH',{'settings.edit':true});
  assert.equal(saved.status,200);
  assert.equal((await saved.json()).version,1);
  assert.equal(writes,1);
});
