import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('abertura de Marketplaces mantém os totais e reserva detalhes para depois da primeira tela',async()=>{
 const calls=[], det=[], exports={};
 const builder={select(){return this;},eq(){return this;},in(){return this;},is(){return this;},then(resolve){return Promise.resolve(resolve({data:[{id:'account',provider:'mercado_livre',status:'connected'}],count:4,error:null}));}};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/api/modulos/marketplaces/vendas/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL,Date,Promise,Set,require(name){
  if(name==='next/server')return{NextResponse:{json:value=>value}};
  if(name.includes('management-access'))return{authorizeMarketplace:async()=>({db:{from(table){calls.push(table);return builder;}},empresaId:'company'}),managementFailure:e=>{throw e;},MarketplaceError:Error};
  if(name.includes('magalu-sales-model'))return{salesAccountAvailable:()=>true};
  if(name.endsWith('services/direct-sales'))return{listDirectSales:async()=>[],directSaleAsMarketplace:x=>x};
  if(name.endsWith('services/mercadolivre-sales'))return{listSales:async (_db,_empresa,_ids,options)=>{det.push(options?.resumoInicial);return[{id:'saved',title:'Venda salva'}];},processSaleNotifications(){throw Error('Não pode sincronizar na abertura local');}};
  if(name.includes('magalu-sales'))return{syncMagaluSales(){throw Error('Não pode consultar marketplace');}};
  if(name.includes('sales-provider'))return{loadSalesProvider(){throw Error('Não pode consultar conta remota');}};
  if(name.includes('mercadolivre-management'))return{loadConnection(){throw Error('Não pode consultar provider');}};
  throw Error(name);
 }});
 const initial='https://example.invalid/vendas?empresaId=company&scope=all&localOnly=1';
 const hero=await exports.GET({url:initial+'&hero=1'});
 const detalhe=await exports.GET({url:initial});
 assert.equal(hero.sales[0].id,'saved');
 assert.equal(hero.awaitingUpdates,4);
 assert.deepEqual(hero,detalhe);
 assert.deepEqual(det,[true,false]);
 assert.deepEqual(calls,[
  'marketplace_connections','marketplace_sale_notifications',
  'marketplace_connections','marketplace_sale_notifications',
 ]);
});
