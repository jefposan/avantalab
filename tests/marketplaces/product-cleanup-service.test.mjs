import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { productCleanupFixture } from './helpers/product-cleanup-fixture.mjs';
import { fixtureClient } from './helpers/account-cleanup-fixture.mjs';
const root = resolve(import.meta.dirname, '../..');
const data = source => ({ url: 'data:text/javascript,'+encodeURIComponent(source), shortCircuit: true });
const hook = registerHooks({
  resolve(name, context, next) {
    if (name === 'server-only') return data('export {}');
    if (name === 'next/server') return data('export const NextResponse={json:(v,o)=>Response.json(v,o)};');
    if (name.endsWith('/services/management-access') || name === './management-access') return data(`
      export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
      export async function authorizeMarketplace(request,company,permission) {
        if(permission!=='connections'||request.headers.get('authorization')!=='Bearer admin')throw new MarketplaceError(403,'forbidden','Sem permissão');
        if(company!==globalThis.cleanupScope.company)throw new MarketplaceError(403,'scope','Outro perfil');
        return {db:globalThis.cleanupClient,empresaId:company,usuario:{id:globalThis.cleanupScope.actor}};
      }
      export function managementFailure(e){return Response.json({message:e.message},{status:e.status||503});}
    `);
    const file = name.startsWith('@/') ? resolve(root, name.slice(2))
      : name.startsWith('.') && context.parentURL?.startsWith('file:') ? resolve(dirname(new URL(context.parentURL).pathname), name) : null;
    if (file && existsSync(file+'.ts')) return next(pathToFileURL(file+'.ts').href, context);
    return next(name, context);
  },
});
const service = await import('../../app/modules/marketplaces/services/product-cleanup.ts');
const { POST } = await import('../../app/api/modulos/marketplaces/produtos/limpeza/route.ts');
hook.deregister();
test('endpoint exige administrador e confirmação; repete resposta perdida sem apagar novamente', async()=>{
 const f=await productCleanupFixture();try{
  globalThis.cleanupScope=f.scope;globalThis.cleanupClient=fixtureClient(f.db);
  const request=(body,token='admin')=>POST(new Request('http://local/api/modulos/marketplaces/produtos/limpeza',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({empresaId:f.scope.company,...body})}));
  assert.equal((await request({action:'list'},'viewer')).status,403);
  assert.equal((await request({action:'list',empresaId:f.scope.other})).status,403);
  const listing=await request({action:'list'});assert.equal(listing.status,200);assert.equal(listing.headers.get('cache-control'),'no-store');
  assert.ok((await listing.json()).products.some(p=>p.id===f.products.price));
  const productIds=[f.products.price,f.products.historic];
  const preview=await request({action:'review',productIds});assert.equal(preview.status,200);const plan=await preview.json();
  const input={action:'execute',productIds,reviewToken:plan.reviewToken,confirmation:plan.companyName,requestKey:crypto.randomUUID()};
  assert.equal((await request(input)).status,400);
  assert.equal((await request({...input,acknowledged:true,confirmation:'OUTRO PERFIL'})).status,409);
  const done=await request({...input,acknowledged:true});assert.equal(done.status,200);assert.equal((await done.json()).removed,2);
  const repeat=await request({...input,acknowledged:true});assert.equal(repeat.status,200);assert.equal((await repeat.json()).replayed,true);
  assert.equal((await request({action:'unknown'})).status,400);
  assert.equal((await request({action:'review',productIds:['outro']})).status,400);
  const missing={rpc:()=>({abortSignal:async()=>({error:{code:'PGRST202'}})})};
  await assert.rejects(service.listProductCleanup(missing,f.scope.company,f.scope.actor),{code:'cleanup_installation_pending'});
 }finally{delete globalThis.cleanupScope;delete globalThis.cleanupClient;await f.db.close();}
});
