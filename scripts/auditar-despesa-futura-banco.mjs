// PostgreSQL descartável em memória. Não lê .env nem conecta produção.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

if (!process.env.AVANTALAB_PGLITE_PATH) throw new Error('Informe o caminho da instalação temporária do PGlite.');
const { PGlite } = await import(pathToFileURL(process.env.AVANTALAB_PGLITE_PATH).href);
const db = new PGlite();
let verificacoes = 0;
const conferir = (atual, esperado) => { assert.deepEqual(atual, esperado); verificacoes++; };
try {
  await db.exec(`
    create role anon; create role authenticated;
    create table lancamentos(id integer primary key, empresa_id text, ano integer, mes text, dia integer, status text, tipo_obs text, descricao text, valor numeric, recorrencia_id text);
    -- Registro legado: a instalação do trigger não pode migrá-lo.
    insert into lancamentos values (1,'perfil',2099,'JANEIRO',1,'confirmada','parcela','Caixas (2/3)',90,null);
    grant usage on schema public to authenticated;
    grant select,insert,update on lancamentos to authenticated;
  `);
  await db.exec(await readFile('supabase/migrations/20261007210000_despesa_futura_prevista.sql','utf8'));
  conferir((await db.query('select status from lancamentos where id=1')).rows[0].status,'confirmada');
  const hoje = (await db.query(`select ((now() at time zone 'America/Sao_Paulo')::date)::text as hoje`)).rows[0].hoje;
  const data = new Date(`${hoje}T12:00:00Z`);
  const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  const componentes = (delta) => {
    const d = new Date(data); d.setUTCDate(d.getUTCDate()+delta);
    return [d.getUTCFullYear(),meses[d.getUTCMonth()],d.getUTCDate()];
  };
  for (const [id,tipo] of [[2,null],[3,'fixa'],[4,'parcela']]) {
    const [ano,mes,dia] = componentes(0);
    await db.query('insert into lancamentos values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,'perfil',ano,mes,dia,'confirmada',tipo,'Original (2/3)',90,tipo==='fixa'?'recorrencia':null]);
    conferir((await db.query('select status from lancamentos where id=$1',[id])).rows[0].status,'confirmada');
    const [a,m,d] = componentes(1);
    await db.query('update lancamentos set ano=$1,mes=$2,dia=$3 where id=$4',[a,m,d,id]);
    const registro=(await db.query('select status,tipo_obs,descricao,valor,recorrencia_id from lancamentos where id=$1',[id])).rows[0];
    conferir(registro.status,'prevista');
    conferir([registro.tipo_obs,registro.descricao,Number(registro.valor),registro.recorrencia_id],[tipo,'Original (2/3)',90,tipo==='fixa'?'recorrencia':null]);
    // Regressar a hoje sem confirmar continua previsto.
    await db.query('update lancamentos set ano=$1,mes=$2,dia=$3 where id=$4',[ano,mes,dia,id]);
    conferir((await db.query('select status from lancamentos where id=$1',[id])).rows[0].status,'prevista');
    await db.query("update lancamentos set status='confirmada' where id=$1",[id]);
    conferir((await db.query('select status from lancamentos where id=$1',[id])).rows[0].status,'confirmada');
  }
  const [a,m,d] = componentes(1);
  await db.query("insert into lancamentos(id,ano,mes,dia,status) values(5,$1,$2,$3,'cancelada')",[a,m,d]);
  conferir((await db.query('select status from lancamentos where id=5')).rows[0].status,'cancelada');
  await db.exec('set role authenticated');
  await db.query("insert into lancamentos(id,ano,mes,dia,status,tipo_obs) values(6,$1,$2,$3,'confirmada','parcela')",[a,m,d]);
  conferir((await db.query('select status from lancamentos where id=6')).rows[0].status,'prevista');
  await db.exec('reset role');
  conferir((await db.query("select has_function_privilege('authenticated','public.marcar_despesa_futura_prevista()','execute') as acesso")).rows[0].acesso,false);
  // Sem efeito sobre outro perfil/registro nem descrição, preços ou receitas.
  conferir((await db.query('select status,descricao,valor from lancamentos where id=1')).rows[0],{status:'confirmada',descricao:'Caixas (2/3)',valor:'90'});
  await db.exec("insert into lancamentos(id,ano,mes,dia,status) values(7,2099,'JANEIRO',1,'confirmada')");
  conferir((await db.query('select status from lancamentos where id=7')).rows[0].status,'prevista');
  await db.exec('begin');
  await db.query('update lancamentos set ano=$1,mes=$2,dia=$3 where id=1',[a,m,d]);
  conferir((await db.query('select status from lancamentos where id=1')).rows[0].status,'prevista');
  await db.exec('rollback');
  conferir((await db.query('select status from lancamentos where id=1')).rows[0].status,'confirmada');
  console.log(`${verificacoes} verificações SQL aprovadas, sem conexão com produção.`);
} finally { await db.close(); }
