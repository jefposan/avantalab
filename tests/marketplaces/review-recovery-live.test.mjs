import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const manifest=existsSync('avanta-entrega.json')?JSON.parse(readFileSync('avanta-entrega.json','utf8')):{},source=manifest.marketplaceReviewDiagnosis;
test('revisão do Lenoxx: comparar leituras e notas reais sem escrever nos anúncios',{skip:!process.env.VERCEL||!source},async()=>{
 assert.ok(process.env.MARKETPLACE_SECRETS_KEY,'Conexão existente necessária no ambiente remoto.');
 const root=process.cwd(),hook=registerHooks({resolve(s,c,next){if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};if(s==='next/server')return next('next/server.js',c);const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);}});
 const nativeFetch=globalThis.fetch;let writes=0;
 globalThis.fetch=async(url,options)=>{const u=new URL(typeof url==='string'||url instanceof URL?String(url):url.url),method=options?.method||(url instanceof Request?url.method:'GET');if(u.hostname==='api.mercadolibre.com'&&!['GET','HEAD'].includes(method)&&u.pathname!=='/oauth/token'){writes++;throw Error('Diagnóstico não permite escrita nos anúncios.');}return nativeFetch(url,options);};
 try{
  const {createClient}=await import('@supabase/supabase-js'),db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {readCommonProductEditor}=await import('../../app/modules/marketplaces/services/product-common-content.ts');
  const {loadConnection,mlRequest}=await import('../../app/modules/marketplaces/services/mercadolivre-management.ts');
  const {normalizeListingQuality}=await import('../../app/modules/marketplaces/listing-quality.ts');
  const args=[db,source.companyId,source.productId,'details',source.sourceConnectionId,source.sourceId,true];
  const first=await readCommonProductEditor(...args),second=await readCommonProductEditor(...args);
  assert.equal(first.targets.length,4);assert.equal(second.editor.scopeHash,first.editor.scopeHash);
  assert.equal(second.editor.revision,first.editor.revision,'Leituras consecutivas do conteúdo intacto devem manter a revisão.');
  const notes=[];
  for(const target of second.targets){const connection=await loadConnection(db,source.companyId,target.connectionId),item=await mlRequest(db,connection,'/items/'+target.id);const raw=await mlRequest(db,connection,'/user-product/'+item.user_product_id+'/performance'),quality=normalizeListingQuality(raw,item.user_product_id,'USER_PRODUCT');notes.push({listing:target.id,type:item.listing_type_id,score:quality.score,calculatedAt:quality.calculatedAt,pending:quality.goals.filter(g=>!g.completed).map(g=>g.id)});}
  assert.equal(writes,0);console.log('[lenoxx-review]',JSON.stringify({stable:true,externalWrites:writes,accounts:notes}));
 }finally{globalThis.fetch=nativeFetch;hook.deregister();}
});
