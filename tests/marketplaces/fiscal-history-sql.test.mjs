import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, ids } from './fiscal-fixture.mjs';
test('histórico fiscal: legado é preservado, reserva por envio, vínculos e RLS restritos', async () => {
  const db=await fixture(true), {company,connection,sale,other,foreign}=ids;
  try {
    const row=(await db.query('select * from marketplace_fiscal_operations')).rows[0];
    assert.equal(row.receipt_id,'receipt-original');assert.equal(row.state,'requested');
    await db.query('update marketplace_sales set snapshot=$1 where id=$2',[JSON.stringify({dceEmission:{status:'not_requested'}}),sale]);
    assert.equal((await db.query('select snapshot from marketplace_sales')).rows[0].snapshot.dceEmission.emissionId,'receipt-original');
    const insert=(c=company,a=connection,s=sale,ship='555')=>db.query("insert into marketplace_fiscal_operations(empresa_id,connection_id,sale_id,order_id,shipment_id,document_type,action,state) values($1,$2,$3,'2000019139347426',$4,'nfe','issue','sending')",[c,a,s,ship]);
    await assert.rejects(insert(),/duplicate key/);
    await assert.rejects(insert(other,foreign),/Vínculo fiscal inválido/);
    await assert.rejects(insert(company,connection,sale,'999'),/Vínculo fiscal inválido/);
    await db.query("update marketplace_fiscal_operations set state='completed'");
    await insert();
    await assert.rejects(insert(),/duplicate key/);
    await db.query("update marketplace_sales set snapshot='{}'::jsonb where id=$1",[sale]);
    assert.equal((await db.query('select receipt_id from marketplace_fiscal_operations where action=$1',['legacy'])).rows[0].receipt_id,'receipt-original');
    const rights=(await db.query("select has_table_privilege('authenticated','marketplace_fiscal_operations','insert') write,has_table_privilege('anon','marketplace_fiscal_status','select') read,has_table_privilege('service_role','marketplace_fiscal_operations','delete') del,relrowsecurity rls from pg_class where relname='marketplace_fiscal_operations'")).rows[0];
    assert.deepEqual(rights,{write:false,read:false,del:false,rls:true});
    await assert.rejects(db.query('update marketplace_fiscal_operations set connection_id=$1',[foreign]),/Vínculo fiscal inválido|Identidade fiscal imutável/);
    await db.query("insert into marketplace_sale_notifications(id,empresa_id,connection_id,topic,resource) values('event',$1,$2,'invoices','/users/123/invoices/456')",[company,connection]);
  } finally { await db.close(); }
});
test('recibo gravado pela versão anterior durante a transição também é arquivado',async()=>{
 const db=await fixture();try{
  await db.query('update marketplace_sales set snapshot=$1 where id=$2',[JSON.stringify({dceEmission:{requestedAt:'2026-10-26T15:00:00Z',emissionId:'during-upgrade'}}),ids.sale]);
  await db.query('update marketplace_sales set snapshot=$1 where id=$2',[JSON.stringify({dceEmission:{requestedAt:'2026-10-26T15:00:00Z',status:'unknown'}}),ids.sale]);
  assert.equal((await db.query('select receipt_id from marketplace_fiscal_operations')).rows[0].receipt_id,'during-upgrade');
  assert.equal((await db.query('select snapshot from marketplace_sales')).rows[0].snapshot.dceEmission.emissionId,'during-upgrade');
 }finally{await db.close();}
});
