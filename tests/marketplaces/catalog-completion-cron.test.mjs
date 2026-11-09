import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const data=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hook=registerHooks({resolve(s,c,next){
 if(s==='next/server')return data('export const after=fn=>globalThis.catalogAfter.push(fn);export const NextResponse={json:(v,o)=>Response.json(v,o)}');
 if(s==='@supabase/supabase-js')return data('export const createClient=()=>globalThis.catalogCronDB;');
 if(s.endsWith('/inventory-worker'))return data('export const runMarketplaceWorker=async()=>{globalThis.catalogCronCalls.push("stock");throw Error("Falha simulada")}');
 if(s.endsWith('/catalog-completion'))return data('export const resumeCatalogCompletion=async()=>globalThis.catalogCronCalls.push("catalog");');return next(s,c);
}});
const {POST}=await import('../../app/api/cron/marketplaces/route.ts');test.after(()=>hook.deregister());
test('retomada reutiliza worker autenticado; falha do estoque não cancela catálogo nem receitas',async()=>{
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY,log=console.error;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';globalThis.catalogAfter=[];globalThis.catalogCronCalls=[];let allowed=false;globalThis.catalogCronDB={rpc:name=>name==='marketplace_processar_receitas'?{abortSignal(){globalThis.catalogCronCalls.push('receitas');return Promise.resolve({error:null})}}:Promise.resolve({data:allowed})};
 try{const request=token=>new Request('http://local',{method:'POST',headers:{authorization:'Bearer '+token}});
  assert.equal((await POST(request('bad'))).status,401);assert.equal((await POST(request('a'.repeat(72)))).status,401);assert.equal(globalThis.catalogAfter.length,0);
  allowed=true;assert.equal((await POST(request('a'.repeat(72)))).status,202);assert.equal(globalThis.catalogAfter.length,3);console.error=()=>{};await Promise.all(globalThis.catalogAfter.map(fn=>fn()));assert.deepEqual(globalThis.catalogCronCalls.sort(),['catalog','receitas','stock']);
 }finally{console.error=log;if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});
