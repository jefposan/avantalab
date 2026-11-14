import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

let fixtureCalls=0;
const mock=source=>({url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true});
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier==='next/server')return mock('export const NextResponse={json:(data,options)=>Response.json(data,options)};');
 if(specifier==='@/app/modules/marketplaces/dev/market-prices-fixture')return mock('export function createMarketPricesFixture(){return globalThis.__mlFixtureForbidden()}');
 return next(specifier,context);
}});
globalThis.__mlFixtureForbidden=()=>{fixtureCalls++;throw Error('Banco fictício não deve iniciar fora da prévia local.');};
const {POST}=await import('../../app/api/modulos/marketplaces/validacao-precos-ml/route.ts');
hooks.deregister();

test('prévia de preços é bloqueada em produção antes de ler corpo ou iniciar banco',async()=>{
 const prior=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  for(const host of ['127.0.0.1:3420','avantalab.com.br']){
   const response=await POST(new Request('http://'+host+'/api/modulos/marketplaces/validacao-precos-ml',{method:'POST',body:'corpo inválido'}));
   assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');
  }
  assert.equal(fixtureCalls,0);
 }finally{if(prior===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=prior;}
});
test('prévia também recusa host externo no modo de desenvolvimento, sem tocar banco',async()=>{
 const prior=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='development';
  const response=await POST(new Request('http://example.com/api/modulos/marketplaces/validacao-precos-ml',{method:'POST',body:'{}'}));
  assert.equal(response.status,404);assert.equal(fixtureCalls,0);
 }finally{if(prior===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=prior;}
});
