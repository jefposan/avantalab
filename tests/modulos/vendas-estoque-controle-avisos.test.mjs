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
test('controle individual/geral persiste, conserva saldos e histórico, protege reservas e exige permissão',async()=>{
 const db=new PGlite();const migration=readFileSync('supabase/migrations/20261126210000_vendas_controle_estoque.sql','utf8');
 await db.exec(`create table empresas(id uuid primary key);create table vendas_estoque_saldos(id uuid primary key,empresa_id uuid,produto_id uuid,saldo_fisico numeric,saldo_reservado numeric,estoque_minimo numeric);insert into empresas values('${companyId}'),('${other}');insert into vendas_estoque_saldos values('${productId}','${companyId}','${productId}',20,0,5),('${other}','${other}','${productId}',30,0,8);`);await db.exec(migration);
 const query=(sql,args)=>db.query(sql,args);const repository=createPostgresCommercialStockRepository({pool:{query,connect:async()=>({query,release(){}})}});const service=createCommercialStockService({repository});
 const input={context,scope:'product',productId,enabled:false,expectedEnabled:true};
 try{
 assert.equal((await service.setControl(input)).ok,true);assert.equal((await repository.controls({companyId})).disabledProductIds[0],productId);
 let row=(await db.query('select * from vendas_estoque_saldos where empresa_id=$1',[companyId])).rows[0];assert.equal(row.controle_ativo,false);assert.equal(Number(row.saldo_fisico),20);assert.equal(Number(row.estoque_minimo),5);
 await assert.rejects(()=>assertStockControlActive({query},companyId,row),e=>e.code==='AV-STOCK-CONTROL-DISABLED');
 assert.equal((await service.setControl({...input,enabled:true,expectedEnabled:false})).ok,true);
 await db.query('update vendas_estoque_saldos set saldo_reservado=2 where empresa_id=$1',[companyId]);assert.equal((await service.setControl(input)).errors[0].code,'AV-STOCK-CONTROL-RESERVED');assert.equal((await service.setControl({...input,scope:'company'})).ok,false);
 await db.query('update vendas_estoque_saldos set saldo_reservado=0 where empresa_id=$1',[companyId]);
 assert.equal((await service.setControl({...input,scope:'company',context:{...context,effectivePermissions:{'stock.adjust':true}}})).ok,false);
 assert.equal((await service.setControl({...input,scope:'company'})).ok,true);assert.equal((await repository.controls({companyId})).enabled,false);
 row=(await db.query('select * from vendas_estoque_saldos where empresa_id=$1',[companyId])).rows[0];await assert.rejects(()=>assertStockControlActive({query},companyId,row));
 assert.equal((await repository.controls({companyId:other})).enabled,true);assert.equal((await db.query('select controle_ativo from vendas_estoque_saldos where empresa_id=$1',[other])).rows[0].controle_ativo,true);
 await db.exec(migration);assert.equal((await repository.controls({companyId})).enabled,false,'reaplicar migração não reativa controle');
 assert.equal((await service.setControl({...input,scope:'company',enabled:true,expectedEnabled:false})).ok,true);assert.equal((await repository.controls({companyId})).enabled,true);
 }finally{await db.close();}
});
