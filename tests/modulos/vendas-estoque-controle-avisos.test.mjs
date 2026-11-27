import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {stockMinimumNotices} from '../../app/vendas/lib/stock-minimum-notices.mjs';
import {createCommercialStockService,createPostgresCommercialStockRepository} from '../../app/vendas/lib/server/commercial-stock-service.mjs';
import {assertStockControlActive} from '../../app/vendas/lib/server/commercial-order-stock-balance.mjs';
const companyId='11111111-1111-4111-8111-111111111111',actorId='22222222-2222-4222-8222-222222222222',productId='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'stock.adjust':true,'settings.edit':true}};
test('aviso aparece ao atingir o mínimo; some acima dele e não inclui serviços, limite zero ou controle desativado',()=>{
 const base={catalogItemId:productId,category:'Produto acabado',trackStock:true,minimum:5,available:5};
 assert.deepEqual(stockMinimumNotices([base]),[base]);assert.equal(stockMinimumNotices([{...base,available:4}]).length,1);
 for(const patch of [{available:6},{minimum:0},{category:'Serviço'},{trackStock:false}])assert.equal(stockMinimumNotices([{...base,...patch}]).length,0);
 assert.equal(stockMinimumNotices([base],{enabled:false}).length,0);assert.equal(stockMinimumNotices([base],{disabledProductIds:[productId]}).length,0);
 assert.equal(stockMinimumNotices([base],{disabledProductIds:[other]}).length,1);
});
test('chave única desliga e religa com reservas existentes sem alterar saldos, mínimos ou reservas',async()=>{
 const db=new PGlite();const migration=readFileSync('supabase/migrations/20261126210000_vendas_controle_estoque.sql','utf8');
 await db.exec(`create table empresas(id uuid primary key);create table vendas_estoque_saldos(id uuid primary key,empresa_id uuid,produto_id uuid,saldo_fisico numeric,saldo_reservado numeric,estoque_minimo numeric);insert into empresas values('${companyId}'),('${other}');insert into vendas_estoque_saldos values('${productId}','${companyId}','${productId}',20,2,5),('${other}','${other}','${productId}',30,0,8);`);await db.exec(migration);
 const query=(sql,args)=>db.query(sql,args);const repository=createPostgresCommercialStockRepository({pool:{query,connect:async()=>({query,release(){}})}});const service=createCommercialStockService({repository});
 const input={context,scope:'company',enabled:false,expectedEnabled:true};
 try{
 const before=(await db.query('select * from vendas_estoque_saldos order by id')).rows;
 assert.equal((await service.setControl({...input,scope:'product',productId})).ok,false,'sem chave individual');
 assert.equal((await service.setControl({...input,context:{...context,effectivePermissions:{'stock.adjust':true}}})).ok,false);
 assert.equal((await service.setControl(input)).ok,true);assert.equal((await service.setControl(input)).reused,true);
 assert.equal((await repository.controls({companyId})).enabled,false);assert.equal((await repository.controls({companyId:other})).enabled,true);
 await assert.rejects(()=>assertStockControlActive({query},companyId,before[0]),e=>e.code==='AV-STOCK-CONTROL-DISABLED');
 assert.deepEqual((await db.query('select * from vendas_estoque_saldos order by id')).rows,before);
 await db.exec(migration);assert.equal((await repository.controls({companyId})).enabled,false,'reaplicar não reativa');
 assert.equal((await service.setControl({...input,enabled:true,expectedEnabled:false})).ok,true);
 assert.equal((await repository.controls({companyId})).enabled,true);await assertStockControlActive({query},companyId,before[0]);
 assert.deepEqual((await db.query('select * from vendas_estoque_saldos order by id')).rows,before,'reativar recupera os mesmos dados');
 }finally{await db.close();}
});

test('API grava a chave com o papel restrito e preserva as demais colunas e empresas', async () => {
 const {handleCommercialStockRequest}=await import('../../app/vendas/lib/server/commercial-stock-http.mjs');
 const db=new PGlite();
 try {
  await db.exec(`
   create role avanta_vendas_runtime;
   create table public.empresas(id uuid primary key, nome text not null);
   insert into public.empresas values ('${companyId}','Empresa autorizada'),('${other}','Outra empresa');
   alter table public.empresas enable row level security;
   grant select on public.empresas to avanta_vendas_runtime;
   create policy empresas_vendas_runtime on public.empresas for all to avanta_vendas_runtime
     using (id = '${companyId}') with check (id = '${companyId}');
  `);
  await db.exec(readFileSync('supabase/migrations/20261126210000_vendas_controle_estoque.sql','utf8'));
  const query=(sql,args)=>db.query(sql,args);
  const stockService=createCommercialStockService({repository:createPostgresCommercialStockRepository({pool:{
   query,connect:async()=>({query,release(){}}),
  }})});
  const runtime={configured:true,stockService,accessResolver:{resolve:async(_request,{companyId})=>({
   authenticated:true,
   boundary:{companyId,userId:actorId,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true},
   effectivePermissions:context.effectivePermissions,
  })}};
  const change=(id,enabled,expectedEnabled)=>handleCommercialStockRequest({
   companyId:id,runtime,
   request:new Request(`https://local.test/stock?companyId=${id}`,{method:'POST',body:JSON.stringify({mode:'control',scope:'company',enabled,expectedEnabled})}),
  });

  await db.exec('set role avanta_vendas_runtime');
  const failure=await change(companyId,false,true);
  assert.equal(failure.status,503);
  assert.deepEqual(await failure.json(),{
   ok:false,code:'AV-STOCK-CONTROL-STORAGE',message:'Não foi possível salvar o controle de estoque. Tente novamente.',
  });

  await db.exec('reset role');
  await db.exec(readFileSync('supabase/migrations/20261127223000_vendas_controle_estoque_runtime.sql','utf8'));
  await db.exec('set role avanta_vendas_runtime');
  const disabled=await change(companyId,false,true);
  assert.equal(disabled.status,200);
  assert.deepEqual((await disabled.json()).control,{scope:'company',enabled:false});
  assert.equal((await change(companyId,false,true)).status,200);
  assert.equal((await change(other,false,true)).status,404);
  await assert.rejects(db.query("update public.empresas set nome='Outra' where id=$1",[companyId]),error=>error.code==='42501');
  const enabled=await change(companyId,true,false);
  assert.equal(enabled.status,200);
  assert.deepEqual((await enabled.json()).control,{scope:'company',enabled:true});

  await db.exec('reset role');
  const rows=(await db.query('select nome, vendas_estoque_controle_ativo as enabled from public.empresas order by id')).rows;
  assert.deepEqual(rows,[{nome:'Empresa autorizada',enabled:true},{nome:'Outra empresa',enabled:true}]);
 } finally { await db.close(); }
});
