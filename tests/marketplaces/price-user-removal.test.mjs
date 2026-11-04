import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const hooks=registerHooks({resolve(s,c,next){
  if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
  if(s==='./management-access')return{url:'data:text/javascript,'+encodeURIComponent('export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}'),shortCircuit:true};
  if(s==='./listing-model')return next(new URL('../../app/modules/marketplaces/services/listing-model.ts',import.meta.url).href,c);
  return next(s,c);
}});
const {removePriceUser}=await import('../../app/modules/marketplaces/services/price-user-removal.ts');
hooks.deregister();

async function fixture(){
  const sql=new PGlite(),company=crypto.randomUUID(),other=crypto.randomUUID(),user=crypto.randomUUID(),manager=crypto.randomUUID(),id=crypto.randomUUID();
  await sql.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(id uuid default gen_random_uuid(),user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);create table usuarios_contas(user_id uuid references auth.users(id),login text unique,atualizado_em timestamptz);`);
  await sql.exec(readFileSync('supabase/migrations/20261006090000_avantaprecos_users.sql','utf8'));
  await sql.exec(readFileSync('supabase/historico-sem-registro/20261011200000_marketplace_local_products.sql','utf8'));
  await sql.exec(`create table marketplace_price_consultations(id uuid primary key default gen_random_uuid(),empresa_id uuid references empresas(id),created_by uuid references auth.users(id) on delete set null,product_name text,market_price_cents integer);`);
  await sql.exec(readFileSync('supabase/migrations/20261016190000_marketplace_price_lots.sql','utf8'));
  await sql.query('insert into empresas values($1),($2)',[company,other]);await sql.query('insert into auth.users values($1),($2)',[user,manager]);
  await sql.query("insert into marketplace_price_users(id,empresa_id,user_id,nome,login,email) values($1,$2,$3,'Pessoa de teste','jeff','test@example.invalid')",[id,company,user]);
  await sql.query("insert into usuarios_contas(user_id,login) values($1,'jeff')",[user]);
  const product=crypto.randomUUID();await sql.query("insert into marketplace_products(id,empresa_id,created_by,stock_confirmed_by,name,description,price_cents,pictures,stock_quantity,stock_confirmed_at) values($1,$2,$3,$3,'Produto do perfil','Descrição mantida',50000,'[\"https://example.invalid/manual.jpg\"]',7,now())",[product,company,user]);
  await sql.query("insert into marketplace_stock_movements(empresa_id,product_id,actor_id,kind,stock_after) values($1,$2,$3,'confirmation',7)",[company,product,user]);
  await sql.query("insert into marketplace_product_operations(empresa_id,request_key,actor_id,action,request_hash,result) values($1,$2,$3,'confirm_stock','hash','{}')",[company,crypto.randomUUID(),user]);
  const history=crypto.randomUUID(),lot=crypto.randomUUID();await sql.query("insert into marketplace_price_consultations values($1,$2,$3,'Produto consultado',50000)",[history,company,user]);
  await sql.query("insert into marketplace_price_lots(id,empresa_id,created_by,company_name,name) values($1,$2,$3,'Perfil de teste','Lote preservado')",[lot,company,user]);
  await sql.query("insert into marketplace_price_lot_items(id,lot_id,empresa_id,scanned_code,history_id,quantity) values($1,$2,$3,'7890000000000',$4,3)",[crypto.randomUUID(),lot,company,history]);
  await sql.query("insert into marketplace_products(empresa_id,created_by,name,price_cents) values($1,$2,'Outro perfil',1000)",[other,user]);
  const identity={id:user,app_metadata:{restricted_app:'avantaprecos',empresa_id:company},user_metadata:{nome:'Pessoa de teste',login:'jeff'}};
  const calls=[],failure={stage:''};
  const allowed=new Set(['marketplace_price_users','usuarios_empresa','usuarios_contas']);
  const db={auth:{admin:{async getUserById(uid){assert.equal(uid,user);return{data:{user:structuredClone(identity)},error:null};},async updateUserById(uid,data){calls.push(['auth',uid,data]);if(failure.stage==='auth')return{error:Error('falha simulada')};Object.assign(identity,{banned:true,user_metadata:data.user_metadata});return{error:null};},async deleteUser(){assert.fail('Nunca apagar auth.users com histórico referenciado');}}},from(table){
    assert.ok(allowed.has(table),'Tabelas de produtos/histórico não podem ser alteradas');let fields='*',method='select',values={},filters=[],limit='',single=false;
    const query={select(f){fields=f;return query;},eq(k,v){filters.push([k,v]);return query;},limit(n){limit=' limit '+n;return query;},maybeSingle(){single=true;return query;},update(v){method='update';values=v;return query;},delete(){method='delete';return query;},then(resolve,reject){return(async()=>{
      const stage=method==='update'?(table==='usuarios_contas'?'directory':'disable'):method==='delete'?'delete':'read';
      if(stage!=='read')calls.push([stage,table,filters]);
      if(failure.stage===stage)return{data:null,error:Error('falha simulada')};
      const params=[],sets=Object.entries(values).map(([k,v])=>{params.push(v);return k+'=$'+params.length;});
      const where=filters.map(([k,v])=>{params.push(v);return k+'=$'+params.length;}).join(' and ');
      const text=(method==='select'?`select ${fields} from ${table}`:method==='update'?`update ${table} set ${sets.join(',')}`:`delete from ${table}`)+(where?' where '+where:'')+limit;
      const result=await sql.query(text,params);return{data:single?result.rows[0]||null:result.rows,error:null};
    })().then(resolve,reject);}};return query;
  }};
  const snapshot=async()=>{const result={};for(const table of ['marketplace_products','marketplace_stock_movements','marketplace_product_operations','marketplace_price_consultations','marketplace_price_lots','marketplace_price_lot_items'])result[table]=(await sql.query(`select * from ${table}`)).rows;return result;};
  return{sql,db,company,other,user,manager,id,identity,calls,failure,snapshot};
}

test('SQL real: excluir somente o acesso conserva produtos, saldo, consultas, lote, autoria e outro perfil; login fica livre',async()=>{
  const f=await fixture();try{
    const before=await f.snapshot();await assert.rejects(f.sql.query('delete from auth.users where id=$1',[f.user]),/foreign key/);
    const result=await removePriceUser(f.db,f.company,f.id,f.manager);assert.equal(result.success,true);assert.match(result.message,/permanecem neste perfil/);
    assert.deepEqual(await f.snapshot(),before);assert.equal((await f.sql.query('select count(*)::int n from auth.users where id=$1',[f.user])).rows[0].n,1);
    assert.equal((await f.sql.query('select count(*)::int n from marketplace_price_users where id=$1',[f.id])).rows[0].n,0);
    assert.equal(f.identity.banned,true);assert.equal(f.identity.user_metadata.login,'');assert.equal(f.identity.user_metadata.nome,'Pessoa de teste');assert.equal(f.calls[1][2].ban_duration,'876000h');
    assert.equal((await f.sql.query('select login from usuarios_contas where user_id=$1',[f.user])).rows[0].login,null);
    const next=crypto.randomUUID();await f.sql.query('insert into auth.users values($1)',[next]);await f.sql.query("insert into usuarios_contas values($1,'jeff',now())",[next]);
    await f.sql.query("insert into marketplace_price_users(empresa_id,user_id,nome,login,email) values($1,$2,'Novo acesso','jeff','new@example.invalid')",[f.other,next]);
    assert.deepEqual(await f.snapshot(),before,'novo acesso não recebe produtos do perfil anterior');
  }finally{await f.sql.close();}
});

test('nenhuma exclusão fora da empresa, do próprio gestor, conta comum ou identidade compartilhada',async()=>{
  const f=await fixture();try{
    await assert.rejects(removePriceUser(f.db,f.other,f.id,f.manager),e=>e.code==='not_found');
    await assert.rejects(removePriceUser(f.db,f.company,f.id,f.user),e=>e.code==='shared_access');
    const metadata=structuredClone(f.identity.app_metadata);f.identity.app_metadata={};await assert.rejects(removePriceUser(f.db,f.company,f.id,f.manager),e=>e.code==='shared_access');f.identity.app_metadata=metadata;
    await f.sql.query("insert into usuarios_empresa(user_id,empresa_id,status,perfil) values($1,$2,'ativo','administrador')",[f.user,f.other]);await assert.rejects(removePriceUser(f.db,f.company,f.id,f.manager),e=>e.code==='shared_access');await f.sql.query('delete from usuarios_empresa');
    await f.sql.query("insert into marketplace_price_users(empresa_id,user_id,nome,login,email) values($1,$2,'Outro vínculo','outro','other@example.invalid')",[f.other,f.user]);await assert.rejects(removePriceUser(f.db,f.company,f.id,f.manager),e=>e.code==='shared_access');
    assert.equal(f.calls.length,0);
  }finally{await f.sql.close();}
});

test('falha parcial revoga acesso e conserva dados; nova exclusão conclui sem apagar identidade',async()=>{
  for(const stage of ['auth','directory','delete']){
    const f=await fixture();try{
      const before=await f.snapshot();f.failure.stage=stage;
      await assert.rejects(removePriceUser(f.db,f.company,f.id,f.manager),e=>e.code==='access_cleanup');
      assert.equal((await f.sql.query('select ativo from marketplace_price_users where id=$1',[f.id])).rows[0].ativo,false);assert.deepEqual(await f.snapshot(),before);
      f.failure.stage='';await removePriceUser(f.db,f.company,f.id,f.manager);assert.deepEqual(await f.snapshot(),before);
    }finally{await f.sql.close();}
  }
});
