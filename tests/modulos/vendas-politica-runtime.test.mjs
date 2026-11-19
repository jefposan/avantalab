import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createCommercialPolicyRepository } from '../../app/vendas/lib/server/commercial-policy.mjs';

test('runtime: corrige 503 sem abrir políticas a empresas desativadas ou permitir exclusão', async () => {
 const db = new PGlite();
 const active='11111111-1111-4111-8111-111111111111';
 const inactive='22222222-2222-4222-8222-222222222222';
 try {
  await db.exec(`create role avanta_vendas_runtime; create role anon; create role authenticated;
   create schema fiscal_private; grant usage on schema fiscal_private to avanta_vendas_runtime, anon, authenticated;
   create table public.empresas(id uuid primary key, ativo boolean);
   insert into public.empresas values('${active}',true),('${inactive}',false);
   create function public.vendas_runtime_empresa_liberada(uuid) returns boolean language sql security definer
   set search_path=pg_catalog,public as 'select exists(select 1 from public.empresas where id=$1 and ativo)';
   create table fiscal_private.commercial_policies(company_id uuid primary key references public.empresas(id),max_discount_percent numeric default 15,version integer default 1,updated_by uuid,updated_at timestamptz default now());
   alter table fiscal_private.commercial_policies enable row level security;
   set role avanta_vendas_runtime;`);
  await assert.rejects(db.query('select * from fiscal_private.commercial_policies'),/permission denied/);
  await db.exec('reset role');
  await db.exec(readFileSync('supabase/migrations/20261119193000_vendas_politica_runtime.sql','utf8'));
  await db.exec('set role avanta_vendas_runtime');
  const repository=createCommercialPolicyRepository({pool:db});
  assert.deepEqual(await repository.load(active),{maxDiscountPercent:15,version:0});
  assert.equal((await repository.save(active,null,10,0)).version,1);
  assert.equal((await repository.save(active,null,12,1)).version,2);
  await assert.rejects(repository.save(active,null,13,1),/outra tela/);
  await assert.rejects(repository.save(inactive,null,10,0),/row-level security/);
  await assert.rejects(db.query('delete from fiscal_private.commercial_policies'),/permission denied/);
  await db.exec('reset role');
  await db.query('update public.empresas set ativo=false where id=$1',[active]);
  await db.exec('set role avanta_vendas_runtime');
  assert.equal((await db.query('select * from fiscal_private.commercial_policies')).rows.length,0);
  for (const role of ['anon','authenticated']) {
   await db.exec(`reset role; set role ${role}`);
   await assert.rejects(db.query('select * from fiscal_private.commercial_policies'),/permission denied/);
  }
 } finally { await db.close(); }
});
