import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const sql=readFileSync('supabase/migrations/20261112120000_mover_materiais_divulgacao.sql','utf8');
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('movimentação respeita RLS/origem e conserva arquivo, miniatura e hash; capa só sai ao deixar sua árvore',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema auth;create role anon;create role authenticated;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('teste.usuario',true),'')::uuid$$;
 create table vendas_mobile_divulgacao_pastas(id uuid primary key,empresa_id uuid,pasta_pai_id uuid,nome text,ativo boolean default true,capa_material_id uuid,atualizado_em timestamptz);
 create table vendas_mobile_divulgacao_materiais(id uuid primary key,empresa_id uuid,pasta_id uuid references vendas_mobile_divulgacao_pastas,titulo text,tipo text,ativo boolean default true,arquivo_path text,arquivo_url text,miniatura_url text,arquivo_hash text,atualizado_em timestamptz);
 insert into vendas_mobile_divulgacao_pastas(id,empresa_id,pasta_pai_id,nome) values('${id(1)}','${id(10)}',null,'Raiz'),('${id(2)}','${id(10)}','${id(1)}','A'),('${id(3)}','${id(10)}','${id(1)}','B'),('${id(4)}','${id(10)}',null,'Outra raiz'),('${id(5)}','${id(20)}',null,'Outra empresa');
 insert into vendas_mobile_divulgacao_materiais values('${id(100)}','${id(10)}','${id(2)}','Imagem','imagem',true,'mesmo/path','https://arquivo','https://miniatura','hash',null);
 insert into vendas_mobile_divulgacao_materiais values('${id(101)}','${id(10)}','${id(2)}','Catálogo','pdf',true,'pdf/path','https://pdf','https://capa','hash-pdf',null);
 update vendas_mobile_divulgacao_pastas set capa_material_id='${id(100)}' where id='${id(1)}';
 alter table vendas_mobile_divulgacao_pastas enable row level security;alter table vendas_mobile_divulgacao_materiais enable row level security;
 create policy leitura on vendas_mobile_divulgacao_pastas for select to authenticated using(empresa_id=nullif(current_setting('teste.empresa',true),'')::uuid);
 create policy leitura on vendas_mobile_divulgacao_materiais for select to authenticated using(empresa_id=nullif(current_setting('teste.empresa',true),'')::uuid);
 create policy escrita on vendas_mobile_divulgacao_pastas for update to authenticated using(empresa_id=nullif(current_setting('teste.empresa',true),'')::uuid and current_setting('teste.gestor',true)='sim') with check(empresa_id=nullif(current_setting('teste.empresa',true),'')::uuid);
 create policy escrita on vendas_mobile_divulgacao_materiais for update to authenticated using(empresa_id=nullif(current_setting('teste.empresa',true),'')::uuid and current_setting('teste.gestor',true)='sim') with check(empresa_id=nullif(current_setting('teste.empresa',true),'')::uuid);
 grant usage on schema public,auth to authenticated;grant select,update on vendas_mobile_divulgacao_pastas,vendas_mobile_divulgacao_materiais to authenticated;
 set teste.usuario='${id(99)}';set teste.empresa='${id(10)}';set teste.gestor='sim';`);
 await db.exec(sql);await db.exec('set role authenticated');
 const mover=(material,origem,destino,empresa=id(10))=>db.query('select mover_material_divulgacao_rpc($1,$2,$3,$4) as resultado',[empresa,material,origem,destino]);
 await assert.rejects(mover(id(100),id(2),id(5)),/destino indisponível/);
 await assert.rejects(mover(id(100),id(3),id(4)),/já mudou/);
 await assert.rejects(mover(id(100),id(2),id(3),id(20)),/sem permissão/);
 await db.exec("set teste.gestor='nao'");await assert.rejects(mover(id(100),id(2),id(3)),/sem permissão/);await db.exec("set teste.gestor='sim'");
 const antes=(await db.query('select * from vendas_mobile_divulgacao_materiais where id=$1',[id(100)])).rows[0];
 const a=(await mover(id(100),id(2),id(3))).rows[0].resultado;assert.equal(a.material.pasta_id,id(3));assert.deepEqual(a.capas_limpas,[]);
 const b=(await mover(id(100),id(3),id(4))).rows[0].resultado;assert.deepEqual(b.capas_limpas,[id(1)]);
 for(const campo of ['id','titulo','tipo','arquivo_path','arquivo_url','miniatura_url','arquivo_hash']) assert.equal(b.material[campo],antes[campo]);
 const pdf=(await mover(id(101),id(2),id(3))).rows[0].resultado.material;assert.equal(pdf.tipo,'pdf');assert.equal(pdf.arquivo_url,'https://pdf');assert.equal(pdf.arquivo_hash,'hash-pdf');
 assert.equal((await db.query('select count(*)::int n from vendas_mobile_divulgacao_materiais')).rows[0].n,2);
 await db.exec("set teste.usuario=''");await assert.rejects(mover(id(100),id(4),id(3)),/Sessão expirada/);
 }finally{await db.close();}
});
