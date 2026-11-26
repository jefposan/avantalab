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
