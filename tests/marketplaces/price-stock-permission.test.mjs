import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const company='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',actor='00000000-0000-4000-8000-000000000003';
const mock=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
  if(s==='server-only')return mock('export {}');
  if(s==='next/server')return mock('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
  if(s==='@supabase/supabase-js')return mock('export function createClient(url,key){return key==="fake-service"?globalThis.permissionDb:{auth:{async getUser(token){return token==="session"?{data:{user:{id:globalThis.permissionActor,user_metadata:{can_edit_stock:true}}}}:{error:{}}}}}}');
  if(s.endsWith('/management-access')||s==='./management-access')return mock(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({code:e.code},{status:e.status||503})};export async function authorizeMarketplace(req,company,permission){if(req.headers.get('authorization')!=='Bearer manager'||permission!=='connections')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.permissionDb,empresaId:company,usuario:{id:'${actor}'}}}`);
  const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
  if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);
}});
const {GET,POST,PATCH}=await import('../../app/api/modulos/marketplaces/precos/usuarios/route.ts');
const {authorizePriceConsultation}=await import('../../app/modules/marketplaces/services/price-access.ts');
hooks.deregister();
class Query {
  constructor(db,table){this.db=db;this.table=table;this.filters=[];}
  select(){return this;}
  eq(k,v){this.filters.push(row=>row[k]===v);return this;}
  neq(k,v){this.filters.push(row=>row[k]!==v);return this;}
  order(){return this;}
  maybeSingle(){this.singleResult=true;return this;}
  single(){this.singleResult=true;return this;}
  update(value){this.updateValue=value;return this;}
  insert(value){this.insertValue={id:crypto.randomUUID(),ativo:true,can_edit_stock:false,...value};return this;}
  upsert(value){this.insertValue=value;return this;}
  then(ok,bad){return Promise.resolve().then(()=>{
    const rows=this.db.tables[this.table]||[];this.db.tables[this.table]=rows;
    if(this.insertValue)rows.push(structuredClone(this.insertValue));
    const found=rows.filter(row=>this.filters.every(filter=>filter(row)));
    if(this.updateValue)for(const row of found)Object.assign(row,this.updateValue);
    return {data:this.singleResult?structuredClone(found[0]||null):structuredClone(found),error:null};
  }).then(ok,bad);}
}
function fixture(){return {tables:{marketplace_price_users:[],usuarios_empresa:[],empresa_modulos:[{empresa_id:company,modulo_id:'marketplaces',ativo:true,expira_em:null}]},from(table){return new Query(this,table);},auth:{admin:{async createUser(){return {data:{user:{id:actor}}}},async updateUserById(){return {error:null}},async deleteUser(){throw Error('não deveria excluir neste teste')}}}};}
const req=(method,body,token='manager')=>new Request('http://localhost/api',{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({empresaId:company,nome:'Pessoa',login:'pessoa',senha:method==='POST'?'ficticia123':'',...body})});
test('cadastro/edição persistem somente booleano explícito, ausente não revoga e somente gestor pode conceder',async()=>{
  globalThis.permissionDb=fixture();
  assert.equal((await POST(req('POST',{can_edit_stock:true},'reader'))).status,403);
  for(const value of ['true',1,null])assert.equal((await POST(req('POST',{can_edit_stock:value}))).status,400);
  let response=await POST(req('POST',{}));assert.equal(response.status,201);let user=(await response.json()).user;assert.equal(user.can_edit_stock,false);
  response=await PATCH(req('PATCH',{id:user.id,can_edit_stock:true}));assert.equal(response.status,200);assert.equal((await response.json()).user.can_edit_stock,true);
  response=await PATCH(req('PATCH',{id:user.id}));assert.equal((await response.json()).user.can_edit_stock,true,'cliente antigo não muda a permissão');
  response=await PATCH(req('PATCH',{id:user.id,can_edit_stock:false}));assert.equal((await response.json()).user.can_edit_stock,false);
  response=await PATCH(req('PATCH',{empresaId:other,id:user.id,can_edit_stock:true}));assert.equal(response.status,404);
  response=await GET(new Request(`http://localhost/api?empresaId=${company}`,{headers:{authorization:'Bearer manager'}}));assert.equal((await response.json()).users[0].can_edit_stock,false);
  delete globalThis.permissionDb;
});
test('editar um usuário não concede nem revoga a permissão de outro usuário da mesma empresa',async()=>{
  globalThis.permissionDb=fixture();
  const rows=[{id:crypto.randomUUID(),user_id:crypto.randomUUID(),empresa_id:company,nome:'Ana',login:'ana',ativo:true,can_edit_stock:false},{id:crypto.randomUUID(),user_id:crypto.randomUUID(),empresa_id:company,nome:'Bia',login:'bia',ativo:true,can_edit_stock:false}];
  globalThis.permissionDb.tables.marketplace_price_users.push(...rows);
  try {
    for(const [index,value,expected] of [[0,true,[true,false]],[1,true,[true,true]],[0,false,[false,true]],[1,false,[false,false]]]){
      const user=rows[index];const response=await PATCH(req('PATCH',{id:user.id,nome:user.nome,login:user.login,can_edit_stock:value}));
      assert.equal(response.status,200);assert.equal((await response.json()).user.id,user.id);
      const listed=await GET(new Request(`http://localhost/api?empresaId=${company}`,{headers:{authorization:'Bearer manager'}}));
      assert.deepEqual((await listed.json()).users.map(u=>u.can_edit_stock),expected);
    }
  } finally {delete globalThis.permissionDb;}
});

test('acesso relê a caixa ativa da empresa a cada pedido; metadata, outro perfil e sessão antiga não concedem estoque',async()=>{
  const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'];const saved=keys.map(key=>process.env[key]);
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://fake.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='fake-anon';process.env.SUPABASE_SERVICE_ROLE_KEY='fake-service';
  globalThis.permissionDb=fixture();globalThis.permissionActor=actor;
  const row={id:crypto.randomUUID(),empresa_id:company,user_id:actor,ativo:true,can_edit_stock:false};globalThis.permissionDb.tables.marketplace_price_users.push(row);
  const request=new Request('http://localhost/api',{headers:{authorization:'Bearer session'}});
  try{
    assert.equal((await authorizePriceConsultation(request,company)).stockPermission,false);
    row.can_edit_stock=true;const access=await authorizePriceConsultation(request,company);assert.equal(access.stockPermission,true);assert.equal(access.perfil,'consulta_precos');
    await assert.rejects(authorizePriceConsultation(request,other),error=>error.status===403);
    row.can_edit_stock=false;assert.equal((await authorizePriceConsultation(request,company)).stockPermission,false);
    row.can_edit_stock=true;row.ativo=false;await assert.rejects(authorizePriceConsultation(request,company),error=>error.status===403);
    row.ativo=true;globalThis.permissionDb.tables.empresa_modulos[0].ativo=false;await assert.rejects(authorizePriceConsultation(request,company),error=>error.code==='module_inactive');
  } finally {keys.forEach((key,i)=>{if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];});delete globalThis.permissionDb;delete globalThis.permissionActor;}
});
