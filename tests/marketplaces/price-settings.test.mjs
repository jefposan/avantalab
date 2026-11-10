import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { DEFAULT_PRICE_PERCENTAGES, suggestedPriceCents, validPricePercentages } from '../../app/modules/marketplaces/price-settings.ts';
import { resolverTema } from '../../app/hooks/useTemaResolvido.ts';

test('tema automático acompanha aparelho, manual ignora horário e perfil preserva shell', () => {
  for (const profile of [false,true]) for (const system of [false,true]) {
    assert.equal(resolverTema('profile',profile,system),profile);
    assert.equal(resolverTema('system',profile,system),system);
    assert.equal(resolverTema('light',profile,system),false);
    assert.equal(resolverTema('dark',profile,system),true);
  }
});

test('percentuais são da referência, arredondam centavos e distinguem ausência de zero', () => {
  assert.deepEqual(suggestedPriceCents(20000), {minimum:10000,medium:14000,ideal:18000});
  assert.deepEqual(suggestedPriceCents(1999,{minimum:55.5,medium:80,ideal:110}), {minimum:1109,medium:1599,ideal:2199});
  assert.equal(suggestedPriceCents(null),null);assert.deepEqual(suggestedPriceCents(0),{minimum:0,medium:0,ideal:0});
  for(const value of [null,{}, {minimum:'50',medium:70,ideal:90}, {minimum:80,medium:70,ideal:90}, {minimum:0,medium:70,ideal:90}, {minimum:1.111,medium:70,ideal:90}, {minimum:50,medium:70,ideal:Infinity}])assert.equal(validPricePercentages(value),false);
  assert.ok(validPricePercentages(DEFAULT_PRICE_PERCENTAGES));
});

const root=resolve(import.meta.dirname,'../..');
const accessSource=`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(error){return Response.json({code:error.code||'unavailable',message:error.message},{status:error.status||503})};export async function authorizeMarketplace(request,id,permission){if(request.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Sem permissão');if(permission!=='connections')throw Error('Permissão incorreta');return {db:globalThis.settingsDb,empresaId:id,usuario:{id:'actor'}}}`;
const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
  if(specifier==='next/server')return {url:'data:text/javascript,export const NextResponse={json:(value,options)=>Response.json(value,options)}',shortCircuit:true};
  if(specifier.endsWith('/management-access')||specifier==='./management-access')return {url:'data:text/javascript,'+encodeURIComponent(accessSource),shortCircuit:true};
  if(specifier.endsWith('/price-access'))return {url:'data:text/javascript,'+encodeURIComponent(`export async function authorizePriceConsultation(request,id){if(!request.headers.has('authorization'))throw Object.assign(Error('Sem sessão'),{status:401,code:'unauthorized'});return {db:globalThis.settingsDb,empresaId:id}}`),shortCircuit:true};
  let file=specifier.startsWith('@/')?resolve(root,specifier.slice(2)):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?resolve(dirname(new URL(context.parentURL).pathname),specifier):null;
  if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,context);return next(specifier,context);
}});
const service=await import('../../app/modules/marketplaces/services/price-settings.ts');
const route=await import('../../app/api/modulos/marketplaces/precos/configuracoes/route.ts');hooks.deregister();
function database(){
  const rows=new Map();const db={rows,fail:null,from(table){let company,revision,values,mode='read';const query={select(columns){query.columns=columns;return query},eq(key,value){if(key==='empresa_id')company=value;if(key==='revision')revision=value;return query},insert(value){mode='insert';values=value;company=value.empresa_id;return query},update(value){mode='update';values=value;return query},async maybeSingle(){
    if(db.fail)return {data:null,error:db.fail};
    if(db.oldSchema&&query.columns.includes('finance_revenue_enabled'))return {data:null,error:{code:'42703'}};
    if(table==='configuracoes')return {data:{dark_mode:true,cor_primaria:'#de2244'},error:null};
    assert.equal(table,'marketplace_price_settings');assert.ok(company,'empresa obrigatória');const current=rows.get(company);
    if(mode==='insert'&&current)return {data:null,error:{code:'23505'}};
    if(mode==='update'&&(!current||current.revision!==revision))return {data:null,error:null};
    if(values){rows.set(company,{...current,...values});}return {data:rows.get(company)||null,error:null};
  }};return query;}};return db;
}
test('serviço isola empresas, valida entradas, sinaliza migração/falha e protege concorrência',async()=>{
  const db=database();assert.deepEqual((await service.readPriceSettings(db,'a')).percentages,DEFAULT_PRICE_PERCENTAGES);
  const input={percentages:{minimum:60,medium:80,ideal:100},theme:'system',revision:0};
  const saved=await service.savePriceSettings(db,'a','actor',input);assert.equal(saved.revision,1);
  assert.equal((await service.readPriceSettings(db,'a')).theme,'system');assert.equal((await service.readPriceSettings(db,'b')).revision,0);
  assert.equal((await service.readPriceSettings(db,'b')).financeRevenueEnabled,true);
  const disabled=await service.savePriceSettings(db,'a','actor',{...input,revision:1,financeRevenueEnabled:false,financeRevenueBasis:'net'});
  assert.equal(disabled.financeRevenueEnabled,false);
  assert.equal(disabled.financeRevenueBasis,'net');
  await service.savePriceSettings(db,'a','actor',{...input,revision:2});
  assert.equal((await service.readPriceSettings(db,'a')).financeRevenueEnabled,false,'um cliente antigo não religa a opção');
  await assert.rejects(service.savePriceSettings(db,'a','actor',{...input,revision:3,financeRevenueEnabled:'false'}),{code:'invalid_finance_revenue'});
  assert.equal((await service.readPriceSettings(db,'a')).financeRevenueBasis,'net');
  await assert.rejects(service.savePriceSettings(db,'a','actor',{...input,revision:3,financeRevenueBasis:'total'}),{code:'invalid_finance_revenue_basis'});
  db.oldSchema=true;assert.equal((await service.readPriceSettings(db,'a')).storageReady,true);
  db.oldSchema=false;
  await assert.rejects(service.savePriceSettings(db,'a','actor',input),{code:'price_settings_conflict'});
  await assert.rejects(service.savePriceSettings(db,'a','actor',{...input,revision:5}),{code:'price_settings_conflict'});
  for(const patch of [{theme:'javascript'}, {percentages:{minimum:-10,medium:70,ideal:90}}, {revision:'1'}])await assert.rejects(service.savePriceSettings(db,'a','actor',{...input,...patch}));
  db.fail={code:'42P01'};assert.equal((await service.readPriceSettings(db,'a')).storageReady,false);
  db.fail={code:'08006'};await assert.rejects(service.readPriceSettings(db,'a'),{code:'price_settings_unavailable'});
});
test('API lê configurações com sessão e grava somente por permissão de gestão, sem cache',async()=>{
  globalThis.settingsDb=database();const url='http://localhost/api/modulos/marketplaces/precos/configuracoes?empresaId=a';
  assert.equal((await route.GET(new Request(url))).status,401);
  const read=await route.GET(new Request(url,{headers:{authorization:'Bearer reader'}}));assert.equal(read.status,200);assert.equal(read.headers.get('cache-control'),'no-store');const visual=(await read.json()).settings;assert.equal(visual.profileDark,true);assert.equal(visual.profileColor,'#de2244');
  const body={empresaId:'a',percentages:DEFAULT_PRICE_PERCENTAGES,theme:'dark',revision:0};
  const req=role=>new Request(url,{method:'PUT',headers:{authorization:'Bearer '+role,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await route.PUT(req('reader'))).status,403);assert.equal(globalThis.settingsDb.rows.size,0);
  assert.equal((await route.PUT(req('manager'))).status,200);assert.equal((await route.PUT(req('manager'))).status,409);delete globalThis.settingsDb;
});
test('migração real preserva isolamento de banco, valida percentuais e bloqueia acesso direto',async()=>{
  const db=new PGlite();try{
    await db.exec(`create schema auth;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;`);
    await db.exec(readFileSync(resolve(root,'supabase/migrations/20261018190000_marketplace_price_settings.sql'),'utf8'));
    await db.exec(`insert into empresas values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');insert into marketplace_price_settings(empresa_id) values ('00000000-0000-4000-8000-000000000001');`);
    assert.equal((await db.query('select count(*)::int n from marketplace_price_settings')).rows[0].n,1);
    await assert.rejects(db.exec("update marketplace_price_settings set minimum_percent=80,medium_percent=70"));
    await db.exec('set role authenticated');await assert.rejects(db.query('select * from marketplace_price_settings'));await db.exec('reset role');
    assert.equal((await db.query("select relrowsecurity from pg_class where relname='marketplace_price_settings'")).rows[0].relrowsecurity,true);
  }finally{await db.close();}
});
