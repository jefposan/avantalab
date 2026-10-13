import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier === 'next/server') return { url: 'data:text/javascript,export class NextResponse extends Response {static json(body,options){return new NextResponse(JSON.stringify(body),options)}}', shortCircuit: true };
  if (specifier.endsWith('/management-access')) return { url: 'data:text/javascript,export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(error){return Response.json({message:error.message,code:error.code},{status:error.status||503})};export async function authorizeMarketplace(request,company,action){return globalThis.labelsAccess(company,action)}', shortCircuit: true };
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { PATCH } = await import('../../app/api/modulos/marketplaces/conexoes/identificacao/route.ts');
const { GET, DELETE } = await import('../../app/api/modulos/marketplaces/conexoes/route.ts');
hooks.deregister();
const company = '11111111-1111-4111-8111-111111111111';
const connection = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333';

class Query {
  constructor(db, table) { this.db=db; this.table=table; this.filters=[]; }
  select(columns) { this.columns=columns.split(','); return this; }
  eq(key,value) { this.filters.push(row=>row[key]===value); return this; }
  neq(key,value) { this.filters.push(row=>row[key]!==value); return this; }
  in(key,values) { this.filters.push(row=>values.includes(row[key])); return this; }
  update(values) { this.updateValues=values; return this; }
  order() { return this; }
  upsert(values) { this.values=values; return this; }
  async maybeSingle() { const result=await this.run(); return {...result,data:result.data?.[0]||null}; }
  single() { return this.maybeSingle(); }
  then(resolve,reject) { return this.run().then(resolve,reject); }
  async run() {
    if(this.db.fail===this.table) return {error:new Error('database'),data:null};
    const rows=this.db.tables[this.table];
    if(this.values) {
      assert.equal(this.table,'marketplace_connection_labels');
      this.db.writes.push({table:this.table,...this.values});
      const existing=rows.find(row=>row.connection_id===this.values.connection_id);
      if(existing) Object.assign(existing,this.values); else rows.push(this.values);
    }
    const selected=rows.filter(row=>this.filters.every(fn=>fn(row)));
    if(this.updateValues)selected.forEach(row=>{this.db.writes.push({table:this.table,id:row.id,...this.updateValues});Object.assign(row,this.updateValues);});
    return {data:selected.map(row=>Object.fromEntries(this.columns.map(key=>[key,row[key]]))),error:null};
  }
}
function setup() {
  const db={writes:[],tables:{marketplace_connections:[{id:connection,empresa_id:company,provider:'mercado_livre',seller_reference:'123',seller_name:'OFICIAL',status:'connected',token_sealed:'private'}],marketplace_connection_labels:[]},from(table){return new Query(this,table)}};
  globalThis.labelsAccess=async(received,action)=>{
    assert.equal(received,company);
    if(action) assert.equal(action,'connections');
    return {db,empresaId:company,usuario:{id:actor},podeGerenciar:true,vinculo:{perfil:'administrador'}};
  };
  return db;
}
function request(local_label='001',connectionId=connection) {
  return new Request('https://example.test/api', {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({empresaId:company,connectionId,local_label})});
}
test.afterEach(()=>{delete globalThis.labelsAccess;});
test('salvar identificação grava somente tabela auxiliar e devolve dados públicos',async()=>{
  const db=setup(); const before=JSON.stringify(db.tables.marketplace_connections);
  const response=await PATCH(request()); const result=await response.json();
  assert.equal(response.status,200); assert.equal(result.local_label,'001');
  assert.equal(result.connectionId,connection); assert.ok(Date.parse(result.local_label_updated_at));
  assert.equal(db.writes.length,1); assert.equal(db.writes[0].empresa_id,company); assert.equal(db.writes[0].updated_by,actor);
  assert.equal(JSON.stringify(db.tables.marketplace_connections),before);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(Object.keys(result).sort(),['connectionId','local_label','local_label_updated_at']);
});
test('conta de outra empresa ou desconectada não pode receber identificação',async()=>{
  for(const change of [row=>row.empresa_id=actor,row=>row.status='disconnected']) {
    const db=setup(); change(db.tables.marketplace_connections[0]);
    assert.equal((await PATCH(request())).status,404); assert.equal(db.writes.length,0);
  }
});
test('permissão, UUID e texto inválidos falham antes da escrita',async()=>{
  const db=setup();
  assert.equal((await PATCH(request('001','invalid'))).status,400);
  for(const label of [42,'a'.repeat(81),'loja\nnorte']) assert.equal((await PATCH(request(label))).status,400);
  globalThis.labelsAccess=async()=>{throw Object.assign(new Error('Sem permissão'),{status:403});};
  assert.equal((await PATCH(request())).status,403); assert.equal(db.writes.length,0);
});
test('falha da tabela é informada sem fingir que salvou e sem mudar conta',async()=>{
  const db=setup(); db.fail='marketplace_connection_labels';
  const response=await PATCH(request()); assert.equal(response.status,503);
  assert.equal((await response.json()).code,'label_unavailable'); assert.equal(db.writes.length,0);
});
test('consulta combina identificação da empresa, nunca expõe token e tolera tabela indisponível',async()=>{
  const db=setup(); db.tables.marketplace_connection_labels.push({connection_id:connection,empresa_id:company,local_label:'Loja Centro',updated_at:'2026-10-12T21:00:00Z'},{connection_id:connection,empresa_id:actor,local_label:'Outra empresa'});
  let response=await GET(new Request(`https://example.test/api?empresaId=${company}`));
  let result=await response.json(); assert.equal(result.accounts[0].local_label,'Loja Centro');
  assert.equal(result.labelsAvailable,true); assert.equal(result.accounts[0].token_sealed,undefined);
  db.fail='marketplace_connection_labels';
  response=await GET(new Request(`https://example.test/api?empresaId=${company}`)); result=await response.json();
  assert.equal(response.status,200); assert.equal(result.labelsAvailable,false); assert.equal(result.accounts.length,1);
});

test('consulta inclui Magalu autorizado e ML da empresa; rejeita outra empresa, provedor e desconexão',async()=>{
  const db=setup();const magalu={id:actor,empresa_id:company,provider:'magalu',seller_reference:'GENPUB.test',status:'attention',last_error_code:'magalu_connector_pending',token_sealed:'PRIVATE',scopes:['open:portfolio-categories-seller:read','open:portfolio-skus-seller:read','open:portfolio-prices-seller:read','open:portfolio-stocks-seller:read','open:portfolio-skus-seller:write','open:portfolio-prices-seller:write','open:portfolio-stocks-seller:write']};
  db.tables.marketplace_connections.push(magalu,{...magalu,id:'outside',empresa_id:actor},{...magalu,id:'unsupported',provider:'shopee'},{...magalu,id:'disconnected',status:'disconnected'});
  db.tables.marketplace_connection_labels.push({connection_id:actor,empresa_id:company,local_label:'Minha loja'},{connection_id:actor,empresa_id:actor,local_label:'Outra empresa'});
  const response=await GET(new Request(`https://example.test/api?empresaId=${company}`));const {accounts}=await response.json();
  assert.equal(response.status,200);assert.deepEqual(accounts.map(row=>row.id),[connection,actor]);assert.equal(accounts[1].local_label,'Minha loja');assert.equal(accounts[1].status,'attention');assert.equal(accounts[1].last_error_code,'magalu_connector_pending');assert.equal(accounts[1].magalu_catalog_authorized,true);assert.equal(accounts[0].magalu_catalog_authorized,false);
  for(const row of accounts)assert.equal(row.token_sealed,undefined);assert.equal(db.writes.length,0);
});

test('desconectar Magalu exige confirmação/permissão e limita alteração à conta da empresa',async()=>{
  const db=setup();const magalu={id:actor,empresa_id:company,provider:'magalu',status:'attention',token_sealed:'PRIVATE'};
  db.tables.marketplace_connections.push(magalu,{...magalu,id:'outside',empresa_id:actor},{...magalu,id:'unsupported',provider:'shopee'});
  const mlBefore=JSON.stringify(db.tables.marketplace_connections[0]);
  const remove=(id,confirmation=id)=>new Request('https://example.test/api',{method:'DELETE',body:JSON.stringify({empresaId:company,connectionId:id,confirmation})});
  assert.notEqual((await DELETE(remove(actor,'wrong'))).status,200);assert.equal(db.writes.length,0);
  assert.notEqual((await DELETE(remove('outside'))).status,200);assert.notEqual((await DELETE(remove('unsupported'))).status,200);assert.equal(db.writes.length,0);
  assert.equal((await DELETE(remove(actor))).status,200);assert.equal(magalu.status,'disconnected');assert.equal(magalu.token_sealed,null);assert.equal(db.writes.length,1);assert.equal(JSON.stringify(db.tables.marketplace_connections[0]),mlBefore);
  assert.equal(db.tables.marketplace_connections.find(row=>row.id==='outside').token_sealed,'PRIVATE');
  globalThis.labelsAccess=async()=>{throw Object.assign(new Error('Sem permissão'),{status:403});};assert.equal((await DELETE(remove(connection))).status,403);assert.equal(db.writes.length,1);
});

test('Magalu autorizado recebe identificação sem modificar seus tokens ou estado de sincronização',async()=>{
  const db=setup();Object.assign(db.tables.marketplace_connections[0],{provider:'magalu',status:'attention',last_error_code:'magalu_connector_pending'});
  const before=JSON.stringify(db.tables.marketplace_connections);assert.equal((await PATCH(request('Loja Magalu'))).status,200);assert.equal(JSON.stringify(db.tables.marketplace_connections),before);assert.equal(db.writes[0].local_label,'Loja Magalu');
});
