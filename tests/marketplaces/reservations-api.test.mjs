import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as listing from '../../app/modules/marketplaces/services/listing-model.ts';
import {validSoldOn,saleToday} from '../../app/modules/marketplaces/direct-sales.ts';
class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
function load(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Response,Request,AbortSignal,console,require(name){const match=Object.keys(mocks).find(k=>name.endsWith(k));if(match)return mocks[match];throw Error('Dependência não declarada no ensaio: '+name);}});return exports;}
const model=load('app/modules/marketplaces/services/stock-reservations.ts',{'server-only':{},'/management-access':{MarketplaceError},'/listing-model':listing,'/direct-sales':{validSoldOn}});
const company=crypto.randomUUID(),actor=crypto.randomUUID(),product=crypto.randomUUID(),warehouse=crypto.randomUUID();
const payload=()=>({action:'reserve',requestKey:crypto.randomUUID(),productId:product,warehouseId:warehouse,revision:1,quantity:1,buyer:'Cliente',note:''});
test('reserva valida estoque, quantidade, comprador e venda; não aceita identidade enviada pelo cliente',()=>{
 const p=payload();assert.deepEqual(JSON.parse(JSON.stringify(model.reservationCommandData({...p,actorId:'outro',empresaId:'outra',status:'sold'}))),{action:'reserve',requestKey:p.requestKey,data:{productId:product,warehouseId:warehouse,revision:1,quantity:1,buyer:'Cliente',note:''}});
 for(const patch of [{quantity:0},{quantity:1.5},{quantity:100000},{quantity:'1'},{revision:0},{warehouseId:'outro'},{productId:'outro'},{buyer:''},{buyer:'x'.repeat(121)},{note:'x'.repeat(501)}])assert.throws(()=>model.reservationCommandData({...p,...patch}),MarketplaceError);
 const sell={action:'sell',requestKey:crypto.randomUUID(),reservationId:crypto.randomUUID(),reservationRevision:1,unitPriceCents:12000,soldOn:saleToday()};assert.equal(model.reservationCommandData(sell).data.unitPriceCents,12000);
 for(const patch of [{unitPriceCents:0},{unitPriceCents:1.5},{soldOn:'2999-01-01'},{soldOn:'2026-02-30'},{reservationRevision:0}])assert.throws(()=>model.reservationCommandData({...sell,...patch}),MarketplaceError);
});
test('API real exige sessão e permissão Registrar vendas, escopa leitura e usa empresa/ator autenticados',async()=>{
 let can=true,companyAccess=true,scopes=[],calls=[];
 const access={db:{},empresaId:company,usuario:{id:actor},dedicated:true,perfil:'consulta_precos'};
 const route=load('app/api/modulos/marketplaces/reservas/route.ts',{
  'next/server':{NextResponse:{json:(data,options)=>Response.json(data,options)}},
  '/price-access':{async authorizePriceConsultation(req,id){if(req.headers.get('authorization')!=='Bearer teste')throw new MarketplaceError(401,'unauthorized','Sessão inválida');if(id!==company||!companyAccess)throw new MarketplaceError(403,'forbidden','Perfil não autorizado');return access;}},
  '/management-access':{MarketplaceError,managementFailure:e=>Response.json({message:e.message},{status:e.status||503}),async authorizeMarketplace(req,id,scope){scopes.push([id,scope]);return access;}},
  '/direct-sales':{async directSalePermission(){return can;}},
  '/price-product-stock':{async priceStockProduct(db,id,input){assert.equal(id,company);return {id:product};}},
  '/warehouses':{async warehouseContext(db,id,p){assert.equal(id,company);assert.equal(p,product);return {warehousesReady:true,warehouses:[]};}},
  '/stock-reservations':{async listReservations(db,id,p){assert.equal(id,company);assert.equal(p,product);return [];},async reservationSyncStatus(){return {status:'none',message:'Sem anúncios.'};},async reservationCommand(db,id,who,input){calls.push([id,who,input]);return {reservationId:crypto.randomUUID()};}}
 });
 const req=(body,auth='teste')=>new Request('http://local/api',{method:'POST',headers:{authorization:'Bearer '+auth,'content-type':'application/json'},body:JSON.stringify({empresaId:company,...body})});
 assert.equal((await route.POST(req({action:'context'},'inválido'))).status,401);assert.equal(calls.length,0);
 can=false;assert.equal((await route.POST(req(payload()))).status,403);assert.equal(calls.length,0);can=true;
 companyAccess=false;assert.equal((await route.POST(req(payload()))).status,403);companyAccess=true;
 let r=await route.POST(req({action:'context',productId:product}));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).actorId,actor);
 r=await route.POST(req({...payload(),actorId:'falso'}));assert.equal(r.status,200);assert.deepEqual(calls[0].slice(0,2),[company,actor]);
 access.dedicated=false;await route.POST(req({action:'context',productId:product}));await route.POST(req(payload()));assert.deepEqual(scopes,[[company,'view'],[company,'manage']]);
});

const restore=load('app/modules/marketplaces/services/reservation-restore.ts',{'server-only':{},'/management-access':{MarketplaceError}});
test('conferência não importa saldo remoto sobre unidades Online reservadas; falha de leitura bloqueia',async()=>{
 for(const scenario of ['reserved','empty','offline','failure']){
  const filters=[];const db={from(table){assert.equal(table,'marketplace_stock_reservations');const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},async limit(){return {data:scenario==='reserved'?[{id:'reserva'}]:[],error:scenario==='failure'?{}:null};}};return q;}};
  if(scenario==='reserved')await assert.rejects(restore.assertNoOnlineReservationImport(db,company,product),e=>e.code==='reserved_stock_import');
  else if(scenario==='failure')await assert.rejects(restore.assertNoOnlineReservationImport(db,company,product),e=>e.status===503);
  else await restore.assertNoOnlineReservationImport(db,company,product);
  assert.deepEqual(filters,[['empresa_id',company],['product_id',product],['status','active'],['warehouse.is_online',true]]);
 }
});
