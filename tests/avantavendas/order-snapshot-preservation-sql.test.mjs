import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL('../../supabase/migrations/20261126150000_preservar_retrato_pedido_vendas.sql', import.meta.url), 'utf8');
test('banco preserva retrato em edição/reenvio inclusive de app antigo e registra horário real sem backfill', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
    create table public.vendas_mobile_pedidos (
      id text primary key, conta_id text, cliente_id text, forma_pagamento text,
      total numeric, observacoes text, criado_em timestamptz
    );
    insert into public.vendas_mobile_pedidos values
      ('primeiro','conta','duda','Venda',500,'{"saldo_anterior":0,"credito_anterior":0,"saldo_final":500}','2026-11-19T15:00Z'),
      ('segundo','conta','duda','Venda',1110,'{"saldo_anterior":500,"saldo_final":1610}','2026-11-19T15:00Z'),
      ('credito','conta','outra','Venda',56,'{"saldo_anterior":0,"saldo_final":34}','2026-11-19T15:00Z'),
      ('texto','conta','duda','Venda',10,'observação sem JSON','2026-11-19T15:00Z');`);
    await db.exec(migration);
    const ler = async (id) => (await db.query('select *,observacoes::text as obs from public.vendas_mobile_pedidos where id=$1', [id])).rows[0];
    const segundo = await ler('segundo');
    assert.equal((await ler('primeiro')).registrado_em, null, 'não inventa data real do legado');
    for (const total of [500, 450, 500]) {
      await db.query(`update public.vendas_mobile_pedidos set total=$1,
        observacoes='{"saldo_anterior":1110,"credito_anterior":0,"saldo_final":1610,"descricao":"nova"}' where id='primeiro'`, [total]);
      const row = await ler('primeiro'), meta = JSON.parse(row.obs);
      assert.equal(meta.saldo_anterior, 0);
      assert.equal(meta.saldo_final, total);
      assert.equal(meta.descricao, 'nova');
      assert.equal(row.registrado_em, null);
    }
    assert.deepEqual(await ler('segundo'), segundo, 'não modifica outro pedido');
    await db.exec(`update public.vendas_mobile_pedidos set total=70,observacoes='{"saldo_anterior":999,"saldo_final":1069}' where id='credito';`);
    assert.deepEqual(JSON.parse((await ler('credito')).obs), { saldo_anterior: 0, credito_anterior: 22, saldo_final: 48 });
    await db.exec(`update public.vendas_mobile_pedidos set observacoes='outra observação' where id='texto';`);
    assert.equal((await ler('texto')).obs, 'outra observação');
    await db.exec(`update public.vendas_mobile_pedidos set total=70,observacoes='{"saldo_anterior":999,"saldo_final":1069}' where id='credito';`);
    assert.deepEqual(JSON.parse((await ler('credito')).obs), { saldo_anterior: 0, credito_anterior: 22, saldo_final: 48 });
    await db.exec(`update public.vendas_mobile_pedidos set total=20 where id='texto';`);
    assert.equal((await ler('texto')).obs, 'outra observação');
    await db.exec(`insert into public.vendas_mobile_pedidos(id,conta_id,cliente_id,total,criado_em,registrado_em)
      values ('novo','conta','duda',10,'2025-01-01T15:00Z','2000-01-01T00:00Z');`);
    const registro = (await ler('novo')).registrado_em;
    assert.ok(new Date(registro).getTime() > Date.now() - 60000, 'hora de inclusão do servidor, não data comercial/client');
    await db.exec(`update public.vendas_mobile_pedidos set registrado_em='2000-01-01T00:00Z' where id='novo';`);
    assert.deepEqual((await ler('novo')).registrado_em, registro);
    await db.exec(`insert into public.vendas_mobile_pedidos(id,conta_id,cliente_id,forma_pagamento,total,observacoes)
      values ('consignado','conta','duda','Consignado',787.5,'{"tipo":"consignado"}');
      update public.vendas_mobile_pedidos set total=800 where id='consignado';`);
    assert.deepEqual(JSON.parse((await ler('consignado')).obs), { tipo: 'consignado' });
    await db.exec(`update public.vendas_mobile_pedidos set forma_pagamento='Consignado',observacoes='{"tipo":"consignado"}' where id='primeiro';`);
    assert.deepEqual(JSON.parse((await ler('primeiro')).obs), { tipo: 'consignado' });
    await db.exec(`insert into public.vendas_mobile_pedidos(id,conta_id,cliente_id,forma_pagamento,total,observacoes)
      values ('legado-zero','conta','outra','Venda',56,'{"saldo_anterior":0,"saldo_final":0}');
      update public.vendas_mobile_pedidos set observacoes='{"saldo_anterior":100,"saldo_final":156}' where id='legado-zero';`);
    assert.deepEqual(JSON.parse((await ler('legado-zero')).obs), { saldo_anterior: 0, saldo_final: 0 });
    await assert.rejects(db.exec(`update public.vendas_mobile_pedidos set total=70 where id='legado-zero'`), /crédito original/);
  } finally { await db.close(); }
});
