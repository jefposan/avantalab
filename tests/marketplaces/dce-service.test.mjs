import assert from 'node:assert/strict';
import test from 'node:test';
import { serviceFixture, ids, issue, state, readDceState, issueDceForSale } from './fiscal-service-harness.mjs';
test('consulta fiscal recupera documento existente sem emitir; 404 preserva o último recibo',async()=>{
 const db=await serviceFixture();try{
  assert.equal((await readDceState(db,db.connection,db.order.id,null)).status,'unknown');
  const fiscal=await readDceState(db,db.connection,db.order.id,{requestedAt:'2026-10-26T13:00:00Z',emissionId:'old'});
  assert.equal(fiscal.emissionId,'old');assert.equal(fiscal.status,'requested');assert.equal(fiscal.query.httpStatus,404);
  for(const status of ['pending','completed']){db.dce={status};assert.equal((await readDceState(db,db.connection,db.order.id,null)).status,status);}
  assert.equal(db.calls.filter(c=>c.method==='POST').length,0);
 }finally{await db.sql.close();}
});
test('primeira emissão exige confirmação explícita e persiste recibo no histórico independente',async()=>{
 const db=await serviceFixture();try{
  await assert.rejects(issueDceForSale(db,ids.company,ids.connection,ids.sale),error=>error.code==='first_request_confirmation_required');
  const result=await issue(db);assert.equal(result.emissionId,'fiscal-receipt');assert.equal((await state(db)).dce.receiptId,'fiscal-receipt');
  await issue(db);assert.equal(db.calls.filter(c=>c.method==='POST').length,1);
 }finally{await db.sql.close();}
});
test('consulta com rejeição ou contrato desconhecido não autoriza uma nova emissão',async()=>{
 for(const status of ['error','unknown']){const db=await serviceFixture();try{db.dce={status};await assert.rejects(issue(db));assert.equal(db.calls.filter(c=>c.method==='POST').length,0);}finally{await db.sql.close();}}
});
test('falha ao reservar interrompe a operação antes do POST',async()=>{
 const db=await serviceFixture();try{
  await db.sql.exec("create function fail_reserve() returns trigger language plpgsql as $$begin raise exception 'falha simulada';end$$;create trigger fail_reserve before insert on marketplace_fiscal_operations for each row execute function fail_reserve();");
  await assert.rejects(issue(db),error=>error.code==='fiscal_history_unavailable');assert.equal(db.calls.filter(c=>c.method==='POST').length,0);
 }finally{await db.sql.close();}
});
