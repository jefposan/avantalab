import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const mock=source=>({url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true});
let inventoryReads=0;
globalThis.salesOnlyInventoryRead=()=>{inventoryReads++;return[];};
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return mock('');
 if(s==='next/server')return mock('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
 if(s.endsWith('/management-access'))return mock(`export class MarketplaceError extends Error{};export function managementFailure(e){return Response.json({message:e.message},{status:503})};export async function authorizeMarketplace(){return{db:{rpc:async()=>({data:{alerts:[],updatedAt:'version'}})},empresaId:'company',usuario:{id:'actor'}}}`);
 if(s.endsWith('/listing-model'))return mock('export const uuidIsValid=()=>true;');
 if(s.endsWith('/inventory-notices'))return mock('export async function readInventoryNotices(){return globalThis.salesOnlyInventoryRead()}');
 if(s.endsWith('/sale-alert-reads'))return next(new URL('../../app/modules/marketplaces/services/sale-alert-reads.ts',import.meta.url).href,c);
 return next(s,c);
}});
const {GET}=await import('../../app/api/modulos/marketplaces/avisos/route.ts');hook.deregister();
test('polling de vendas não relê estoques/pendências; primeira carga e Atualizar consultam tudo',async()=>{
 let r=await GET(new Request('http://localhost/api?empresaId=company&scope=sales'));assert.equal(r.status,200);assert.equal(inventoryReads,0);assert.equal((await r.json()).notices,undefined);
 r=await GET(new Request('http://localhost/api?empresaId=company'));assert.equal(r.status,200);assert.equal(inventoryReads,1);assert.deepEqual((await r.json()).notices,[]);
 delete globalThis.salesOnlyInventoryRead;
});
