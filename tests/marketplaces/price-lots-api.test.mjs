import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';
import {existsSync} from 'node:fs';
const root=resolve(import.meta.dirname,'../..');
const company='00000000-0000-4000-8000-000000000001',lot='00000000-0000-4000-8000-000000000002',item='00000000-0000-4000-8000-000000000003';
const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='next/server')return next('next/server.js',context);
  if(specifier==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};
  if(specifier==='./price-access')return{url:'data:text/javascript,export async function authorizePriceConsultation(){if(globalThis.lotAccessError)throw globalThis.lotAccessError;return {db:globalThis.lotDb,empresaId:globalThis.lotCompany,usuario:{id:"user"},dedicated:globalThis.lotDedicated,perfil:globalThis.lotRole}}',shortCircuit:true};
  if(specifier.endsWith('/management-access')||specifier==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export async function authorizeMarketplace(request,company,permission){globalThis.lotChecks.push(permission);if(globalThis.lotRegularDenied)throw new MarketplaceError(403,"forbidden","Acesso negado");};export function managementFailure(error){return Response.json({message:error.message,code:error.code},{status:error.status||503})}',shortCircuit:true};
  let file;if(specifier.startsWith('@/'))file=resolve(root,specifier.slice(2));else if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))file=resolve(dirname(new URL(context.parentURL).pathname),specifier);
  if(file&&existsSync(`${file}.ts`))return next(pathToFileURL(`${file}.ts`).href,context);return next(specifier,context);
}});
const service=await import('../../app/modules/marketplaces/services/price-lots.ts');
const api=await import('../../app/api/modulos/marketplaces/precos/lotes/route.ts');
hooks.deregister();
function reset(){globalThis.lotCompany=company;globalThis.lotChecks=[];globalThis.lotRole='administrador';globalThis.lotDedicated=false;globalThis.lotRegularDenied=false;globalThis.lotAccessError=null;globalThis.lotDb={rpc:async()=>({error:null})};}
const req=body=>new Request('http://localhost/api/modulos/marketplaces/precos/lotes',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({empresaId:company,id:lot,...body})});
test('lotes reafirmam permissão do módulo e papel antes de operar service role',async()=>{
  reset();await service.authorizePriceLots(new Request('http://localhost'),company,true);assert.deepEqual(globalThis.lotChecks,['manage']);
  globalThis.lotRegularDenied=true;await assert.rejects(service.authorizePriceLots(new Request('http://localhost'),company),/Acesso negado/);
  reset();globalThis.lotDedicated=true;const access=await service.authorizePriceLots(new Request('http://localhost'),company,true);assert.equal(access.canEdit,true);assert.deepEqual(globalThis.lotChecks,[]);
  reset();globalThis.lotAccessError=new Error('Sessão expirada');await assert.rejects(service.authorizePriceLots(new Request('http://localhost'),company),/Sessão/);
});
test('metadados rejeitam datas normalizadas pelo JS e custo malformado',()=>{
  const data={name:'Lote',receivedOn:'2026-02-28',purchaseCost:'0'};
  assert.equal(service.lotMetadata(data).purchase_cost_cents,0);
  for(const extra of [{receivedOn:'2026-02-30'},{receivedOn:'amanhã'},{purchaseCost:'1,234'},{name:' '},{notes:'x'.repeat(2001)}])assert.throws(()=>service.lotMetadata({...data,...extra}));
});
test('API não aceita preços enviados pelo cliente e valida operação/quantidade/identificadores',async()=>{
  for(const body of [{action:'resolve',itemId:item,historyId:'foreign-invalid'},{action:'quantity',itemId:item,quantity:1.5},{action:'quantity',itemId:item,quantity:0},{action:'capture',itemId:item,scannedCode:''},{action:'prices',minimum_price_cents:1}]){reset();const response=await api.PATCH(req(body));assert.equal(response.status,400);}
});
test('leitura completa pagina além de mil itens e sempre restringe empresa e lote',async()=>{
  reset();const filters=[],ranges=[];
  const lotsQuery={select(){return this},eq(key,value){filters.push([key,value]);return this},async maybeSingle(){return {data:{id:lot,empresa_id:company},error:null}}};
  const itemsQuery={select(){return this},eq(key,value){filters.push([key,value]);return this},order(){return this},async range(start,end){ranges.push([start,end]);return{data:Array.from({length:start===0?1000:3},(_,i)=>({id:String(start+i)})),error:null}}};
  globalThis.lotDb={from:table=>table==='marketplace_price_lots'?lotsQuery:itemsQuery};
  const result=await service.readPriceLot(globalThis.lotDb,company,lot);assert.equal(result.items.length,1003);assert.deepEqual(ranges,[[0,999],[1000,1999]]);assert.equal(filters.filter(([key,value])=>key==='empresa_id'&&value===company).length,4);assert.equal(filters.filter(([key,value])=>key==='lot_id'&&value===lot).length,2);
});
