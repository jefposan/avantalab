import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('runtime sem UPDATE prepara emissão pelo gatilho privado e continua sem alterar retratos',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create role avanta_vendas_runtime;
   create schema fiscal_private;
   create table public.vendas_fiscal_rascunhos(id uuid primary key,empresa_id uuid not null);
   create table fiscal_private.draft_deletions(company_id uuid,draft_id uuid);
   create table fiscal_private.emissions(id uuid primary key,company_id uuid,draft_id text);
   grant usage on schema public,fiscal_private to avanta_vendas_runtime;
   grant select on public.vendas_fiscal_rascunhos,fiscal_private.draft_deletions to avanta_vendas_runtime;
   grant insert,select on fiscal_private.emissions to avanta_vendas_runtime;
   create function fiscal_private.prevent_deleted_draft_emission() returns trigger language plpgsql as $$begin
    perform 1 from public.vendas_fiscal_rascunhos where empresa_id=new.company_id and id::text=new.draft_id for update;
    return new;end $$;
   create trigger prevent_deleted_draft_emission before insert on fiscal_private.emissions for each row execute function fiscal_private.prevent_deleted_draft_emission();
   insert into public.vendas_fiscal_rascunhos values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');`);
  const insert=`insert into fiscal_private.emissions values('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001')`;
  await db.exec('set role avanta_vendas_runtime');
  await assert.rejects(db.exec(insert),e=>e.code==='42501');
  await db.exec('reset role');
  await db.exec(readFileSync('supabase/migrations/20261106203000_vendas_trava_rascunho.sql','utf8'));
  await db.exec('set role avanta_vendas_runtime');
  await db.exec(insert);
  await assert.rejects(db.exec(`update public.vendas_fiscal_rascunhos set empresa_id=empresa_id`),e=>e.code==='42501');
  assert.equal((await db.query(`select has_function_privilege(current_user,'fiscal_private.prevent_deleted_draft_emission()','execute') as allowed`)).rows[0].allowed,false);
  await assert.rejects(db.exec(`insert into fiscal_private.emissions values('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001')`),e=>e.code==='23503');
  await db.exec('reset role');
  await db.exec(`insert into fiscal_private.draft_deletions values('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001')`);
  await db.exec('set role avanta_vendas_runtime');
  await assert.rejects(db.exec(`insert into fiscal_private.emissions values('10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001')`),e=>e.code==='23514');
  assert.equal((await db.query('select count(*)::int n from fiscal_private.emissions')).rows[0].n,1);
 }finally{await db.close();}
});
