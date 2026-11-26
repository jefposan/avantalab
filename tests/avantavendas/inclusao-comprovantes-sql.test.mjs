import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';
test('edição não move inclusão de pedido, pagamento ou legado com timestamp recuperável',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;
   create table vendas_mobile_pedidos(id text primary key,conta_id text,cliente_id text,total numeric,forma_pagamento text,observacoes text,criado_em timestamptz);
   create table vendas_mobile_pagamentos(id text primary key,valor numeric,criado_em timestamptz,data_pagamento date);
   insert into vendas_mobile_pedidos values('legado','conta','cliente',50,'Venda','{}','2026-01-01T13:25Z'),('incerto','conta','cliente',50,'Venda','{}','2026-01-01T15:00Z'),('comercial','conta','cliente',10,'Venda','{"avantalab_pedido":true}','2026-01-01T16:00Z');
   insert into vendas_mobile_pagamentos values('p',50,'2026-01-01T13:25Z','2026-01-01');`);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261126150000_preservar_retrato_pedido_vendas.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261126180000_preservar_ordem_inclusao_comprovantes.sql',import.meta.url),'utf8'));
  await db.exec(`update vendas_mobile_pedidos set criado_em='2026-11-26T15:00Z',registrado_em='2026-11-26T23:00Z';
    update vendas_mobile_pagamentos set criado_em='2026-11-26T23:00Z',data_pagamento='2026-11-26',valor=80;`);
  const rows=(await db.query("select id,registrado_em from vendas_mobile_pedidos where id in ('incerto','legado') order by id")).rows;
  assert.equal(rows[0].registrado_em,null,'meio-dia legado não é inventado');
  assert.equal((await db.query("select registrado_em from vendas_mobile_pedidos where id='comercial'")).rows[0].registrado_em,null,'data comercial de outro fuso não vira inclusão');
  assert.equal(rows[1].registrado_em.toISOString(),'2026-01-01T13:25:00.000Z');
  assert.equal((await db.query("select registrado_em from vendas_mobile_pedidos where id='comercial'")).rows[0].registrado_em,null,'data comercial em outro fuso não é recuperada como inclusão real');
  await db.exec(`update vendas_mobile_pedidos set criado_em='2027-01-01T15:00Z',registrado_em=null where id='legado';`);
  assert.equal((await db.query("select registrado_em from vendas_mobile_pedidos where id='legado'")).rows[0].registrado_em.toISOString(),'2026-01-01T13:25:00.000Z');
  const p=(await db.query("select * from vendas_mobile_pagamentos where id='p'")).rows[0];
  assert.equal(p.criado_em.toISOString(),'2026-01-01T13:25:00.000Z');assert.equal(Number(p.valor),80);
  await db.exec(`insert into vendas_mobile_pedidos values('novo','conta','cliente',10,'Venda','{}','2026-01-01T15:00Z',null);`);
  const antes=(await db.query("select registrado_em from vendas_mobile_pedidos where id='novo'")).rows[0].registrado_em;
  await db.exec(`update vendas_mobile_pedidos set registrado_em='2099-01-01T00:00Z',criado_em='2026-12-01T15:00Z' where id='novo';`);
  assert.deepEqual((await db.query("select registrado_em from vendas_mobile_pedidos where id='novo'")).rows[0].registrado_em,antes);
 }finally{await db.close();}
});
