// Banco PostgreSQL descartável em memória. NUNCA lê .env nem conecta produção.
// AVANTALAB_PGLITE_PATH=/caminho/temporario/node_modules/@electric-sql/pglite/dist/index.js node scripts/auditar-sessoes-perfil-banco.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

if (!process.env.AVANTALAB_PGLITE_PATH) throw new Error('Informe somente o caminho da instalação temporária do PGlite.');
const { PGlite } = await import(pathToFileURL(process.env.AVANTALAB_PGLITE_PATH).href);
const db = new PGlite();
let conferencias = 0;
const usuario = '00000000-0000-4000-8000-000000000001';
const basico = '00000000-0000-4000-8000-000000000010';
const pro = '00000000-0000-4000-8000-000000000011';
const pessoal = '00000000-0000-4000-8000-000000000012';
const a = '00000000-0000-4000-8000-000000000020';
const b = '00000000-0000-4000-8000-000000000021';
const c = '00000000-0000-4000-8000-000000000022';
async function confirmar(empresa, sessao, simultaneas, acao = 'entrar', plano = 'business', dispositivo = sessao) {
  return (await db.query('select public.avantalab_confirmar_sessao_perfil($1,$2,$3,$4,$5,$6,$7) as ativa', [usuario,empresa,sessao,dispositivo,plano,simultaneas,acao])).rows[0].ativa;
}
async function estados() {
  return (await db.query('select empresa_id, sessao_auth_id, status from public.sessoes_acesso_perfil order by empresa_id,sessao_auth_id')).rows;
}
function conferir(valor) { assert.ok(valor); conferencias++; }
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema public, auth to authenticated;
    create table public.empresas(id uuid primary key);
    create table public.usuarios_empresa(user_id uuid, empresa_id uuid, status text);
    insert into auth.users values ('${usuario}');
    insert into public.empresas values ('${basico}'),('${pro}'),('${pessoal}');
    insert into public.usuarios_empresa select '${usuario}',id,'ativo' from public.empresas;
    create table public.lancamentos(id int primary key, empresa_id uuid not null, valor numeric not null);
    alter table public.lancamentos enable row level security;
    create policy "Autorização prévia" on public.lancamentos for all to authenticated
      using (exists(select 1 from public.usuarios_empresa where user_id=auth.uid() and empresa_id=lancamentos.empresa_id and status='ativo'))
      with check (exists(select 1 from public.usuarios_empresa where user_id=auth.uid() and empresa_id=lancamentos.empresa_id and status='ativo'));
    grant select on public.usuarios_empresa to authenticated;
    grant all on public.lancamentos to authenticated;
    insert into public.lancamentos values (1,'${basico}',10),(2,'${pro}',20);
  `);
  await db.exec(await readFile('supabase/migrations/20261007190000_sessoes_isoladas_por_perfil.sql','utf8'));
  conferir(await confirmar(pro,a,true,'entrar','business_pro'));
  conferir(await confirmar(pro,b,true,'entrar','business_pro'));
  conferir(await confirmar(pessoal,b,true,'entrar','pessoal_premium'));
  conferir(await confirmar(pessoal,a,true,'entrar','free'));
  conferir((await estados()).every(r => r.status === 'ativa'));
  conferir(await confirmar(basico,a,false));
  conferir(!(await confirmar(basico,c,false,'verificar')));
  conferir(await confirmar(basico,b,false));
  conferir(!(await confirmar(basico,a,false,'verificar')));
  conferir(!(await confirmar(basico,a,false,'entrar','business','id-dispositivo-forjado')));
  conferir((await estados()).filter(r=>r.empresa_id!==basico).every(r=>r.status==='ativa'));
  const antes = await estados();
  await assert.rejects(confirmar(basico,c,false,'entrar',null));
  assert.deepEqual(await estados(), antes); conferencias++;
  // Um novo login genuíno obtém outro session_id e pode assumir a vaga.
  conferir(await confirmar(basico,c,false));
  conferir(!(await confirmar(basico,b,false)));
  // Renovação mantém session_id; reentrada não contorna o bloqueio.
  conferir(!(await confirmar(basico,a,false)));
  await db.exec(`set request.jwt.claims = '{"sub":"${usuario}","session_id":"${a}"}'; set role authenticated;`);
  const visiveis = (await db.query('select id from public.lancamentos order by id')).rows;
  assert.deepEqual(visiveis,[{id:2}]); conferencias++;
  await assert.rejects(db.exec(`insert into public.lancamentos values (3,'${basico}',30)`)); conferencias++;
  const alterados = (await db.query('update public.lancamentos set valor=99 where id=1 returning id')).rows;
  assert.deepEqual(alterados,[]); conferencias++;
  await assert.rejects(confirmar(basico,a,false)); conferencias++;
  await db.exec('reset role;');
  assert.equal((await db.query('select valor from public.lancamentos where id=1')).rows[0].valor,'10'); conferencias++;
  // Upgrade do mesmo perfil permite as sessões, sem afetar os outros perfis.
  conferir(await confirmar(basico,a,true,'entrar','business_pro'));
  conferir(await confirmar(basico,b,true,'entrar','business_pro'));
  // Downgrade para Básico é aplicado pela confirmação periódica; só uma
  // sessão fica ativa mesmo que anteriormente ambas fossem Pro.
  conferir(await confirmar(basico,a,false,'verificar','business'));
  conferir(!(await confirmar(basico,b,false,'verificar','business')));
  console.log(`OK: ${conferencias} conferências SQL; isolamento, bloqueio, RLS e rollback em PostgreSQL descartável. Nenhum acesso a produção.`);
} catch (erro) {
  console.error('Falha na auditoria SQL:', erro.message);
  process.exitCode = 1;
} finally { await db.close(); }
