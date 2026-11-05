import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const mock=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='next/server')return mock('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
 if(s.endsWith('/management-access'))return mock(`export async function authorizeMarketplace(req,id,permission){if(permission!=='manage'||id!=='company'||req.headers.get('authorization')!=='Bearer manager')throw Object.assign(Error('Negado'),{status:403});return{db:globalThis.fullDB,empresaId:id,usuario:{id:'actor'}}};export const managementFailure=e=>Response.json({message:e.message},{status:e.status||503})`);
 if(s.endsWith('/catalog-full'))return mock('export async function previewFullCatalog(db,c,id){db.calls.push(["preview",c,id]);return{fingerprint:"hash"}};export async function confirmFullCatalog(db,c,a,b){db.calls.push(["confirm",c,a,b]);return{queued:true}}');return next(s,c);
}});
const {GET,POST}=await import('../../app/api/modulos/marketplaces/catalogo/ficha/route.ts');hooks.deregister();
test('prévia e confirmação exigem gestão, empresa autorizada e identidade da sessão',async()=>{
 const calls=[];globalThis.fullDB={calls};const get=token=>new Request('http://local?empresaId=company&productId=product',{headers:{authorization:'Bearer '+token}});
 assert.equal((await GET(get('viewer'))).status,403);assert.equal(calls.length,0);assert.equal((await GET(get('manager'))).status,200);assert.deepEqual(calls[0],['preview','company','product']);
 const post=(company,token)=>new Request('http://local',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({empresaId:company,actorId:'forjado',confirm:true})});
 assert.equal((await POST(post('other','manager'))).status,403);assert.equal((await POST(post('company','viewer'))).status,403);assert.equal((await POST(post('company','manager'))).status,200);assert.equal(calls.at(-1)[2],'actor');
});
