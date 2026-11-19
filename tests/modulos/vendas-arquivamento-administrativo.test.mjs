import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const sql=await readFile(new URL('../../scripts/manutencao/2026-11-19-arquivar-duas-notas-tridium.sql',import.meta.url),'utf8');
const c='ec9604fd-38f2-429b-9c00-c4bc6c642b0e',ids=['8963fceb-8bd7-4dc6-9b96-4f3ecfdf5c48','9303eac3-ccfe-41b8-99b7-df2ee91a7c87'];
async function fixture(){const db=new PGlite();await db.exec(`create schema fiscal_private;
create table vendas_fiscal_rascunhos(empresa_id uuid,id uuid primary key);
create table fiscal_private.emissions(company_id uuid,id uuid primary key,draft_id text,environment text,state text,status_code text,series text,number int,authorized_at timestamptz,protocol_number text);
create table fiscal_private.artifacts(company_id uuid,id uuid default gen_random_uuid(),emission_id uuid,artifact_type text);
create table fiscal_private.number_reservations(company_id uuid,id uuid default gen_random_uuid(),number int,status text);
create table fiscal_private.draft_deletions(company_id uuid,draft_id uuid,emission_id uuid,actor_id uuid,previous_state text,series text,number int,primary key(company_id,draft_id));
create table vendas_eventos(empresa_id uuid,recurso_tipo text,recurso_id uuid,evento text,resumo text,metadados jsonb,criado_por uuid);`);
for(const [i,id] of ids.entries()){await db.query('insert into vendas_fiscal_rascunhos values($1,$2)',[c,id]);await db.query("insert into fiscal_private.emissions values($1,$2::uuid,$2::uuid::text,'homologacao','danfe_ready','100','2',$3,'2026-11-06T23:39:53Z',$4)",[c,id,i+1,i?'135260009867182':'135260009867036']);for(const type of ['signed_xml','protocol_xml','processed_xml','danfe_pdf'])await db.query('insert into fiscal_private.artifacts(company_id,emission_id,artifact_type) values($1,$2,$3)',[c,id,type]);}
await db.query("insert into fiscal_private.emissions values($1,gen_random_uuid(),'producao-preservada','producao','danfe_ready','100','1',800,now(),'PROTOCOLO-PRODUCAO')",[c]);return db;}
const db=await fixture();try{const result=await db.exec(sql);assert.equal(result.at(-1).rows[0].metadados.arquivadas_no_lote,2);assert.deepEqual(result.at(-1).rows[0].metadados.hashes_antes,result.at(-1).rows[0].metadados.hashes_depois);assert.equal((await db.query('select count(*)::int n from fiscal_private.emissions')).rows[0].n,3);assert.equal((await db.query('select count(*)::int n from fiscal_private.artifacts')).rows[0].n,8);assert.equal((await db.query('select count(*)::int n from vendas_eventos')).rows[0].n,2);assert.equal((await db.query("select number from fiscal_private.emissions where environment='producao'")).rows[0].number,800);console.log('Aprovado: somente duas marcações, dois eventos, oito arquivos e produção preservados.');}finally{await db.close();}
for(const change of ["update fiscal_private.emissions set environment='producao' where number=1","delete from fiscal_private.artifacts where artifact_type='danfe_pdf'","update fiscal_private.emissions set protocol_number='DIVERGENTE' where number=1"]){const db=await fixture();try{await db.exec(change);await assert.rejects(()=>db.exec(sql));await db.exec('rollback');assert.equal((await db.query('select count(*)::int n from fiscal_private.draft_deletions')).rows[0].n,0);console.log('Aprovado: divergência bloqueada sem arquivamento.');}finally{await db.close();}}

