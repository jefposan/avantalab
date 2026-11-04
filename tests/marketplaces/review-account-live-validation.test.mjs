import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {existsSync,readFileSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {pathToFileURL} from 'node:url';
const manifest=JSON.parse(readFileSync('avanta-entrega.json','utf8')),source=manifest.marketplaceReviewValidation;
test('pré-publicação: permissões e fotos da batedeira real, sem alteração de anúncios', {skip:!process.env.VERCEL||!source},async()=>{
 assert.ok(process.env.MARKETPLACE_SECRETS_KEY,'A validação remota exige a conexão existente, sem expor sua chave.');
 const root=process.cwd(),hook=registerHooks({resolve(s,c,next){if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};if(s==='next/server')return next('next/server.js',c);const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);}});
 const realFetch=globalThis.fetch;let externalWrites=0;
 globalThis.fetch=async(url,options)=>{const u=new URL(typeof url==='string'||url instanceof URL?String(url):url.url),method=options?.method||(url instanceof Request?url.method:'GET');if(u.hostname==='api.mercadolibre.com'&&!['GET','HEAD'].includes(method)&&u.pathname!=='/oauth/token'){externalWrites++;throw Error('Teste de leitura não permite escrita no Mercado Livre.');}return realFetch(url,options);};
 try{
  const {createClient}=await import('@supabase/supabase-js');const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {readCommonProductEditor,reviewCommonProductEdit}=await import('../../app/modules/marketplaces/services/product-common-content.ts');
  const {perAccountPictureEditor,pictureAccountPermissions}=await import('../../app/modules/marketplaces/picture-account-permissions.ts');
  const {qualityCatalogPictures}=await import('../../app/modules/marketplaces/services/quality-catalog-pictures.ts');
  const {getLocalProduct}=await import('../../app/modules/marketplaces/services/local-products.ts');
  const {proposedProductPictures}=await import('../../app/modules/marketplaces/product-picture-policy.ts');
  const loaded=await readCommonProductEditor(db,source.companyId,source.productId,'pictures',source.sourceConnectionId,source.sourceId,true),editor=perAccountPictureEditor({...loaded.editor,reviewTargets:loaded.targets});
  const permissions=pictureAccountPermissions(editor);assert.equal(permissions.length,4);assert.ok(editor.pictureAppendTargets.length,'Deve existir conta com edição de fotos confirmada.');assert.ok(permissions.some(row=>!row.allowed),'As restrições das outras contas devem continuar visíveis.');
  const product=await getLocalProduct(db,source.companyId,source.productId);const catalog=await qualityCatalogPictures(db,source.companyId,editor.pictureSource.connectionId,product.ean);
  const candidates=[...loaded.targets.flatMap(t=>t.content.pictures),...catalog];const proposed=proposedProductPictures(editor.pictures,candidates,editor.maxPictures);const additions=proposed.filter(p=>!editor.pictures.some(old=>old.id===p.id)).map(p=>p.id);
  if(additions.length){const checked=await reviewCommonProductEdit(db,source.companyId,{productId:source.productId,sourceConnectionId:source.sourceConnectionId,sourceId:source.sourceId,kind:'pictures',localDraft:true,appendPictures:true,pictureTargets:editor.pictureAppendTargets,revision:editor.revision,values:additions});assert.equal(checked.blocked.length,0);assert.ok(checked.parts.length);assert.ok(checked.parts.every(p=>editor.pictureAppendTargets.includes(`${p.connectionId}:${p.id}`)));}
  assert.equal(externalWrites,0);console.log('[batedeira-real]',JSON.stringify({contas:permissions.map(row=>({anuncio:row.target.id,liberada:row.allowed,motivo:row.reason,fotos:row.target.content.pictures.length})),fotosCatalogo:catalog.length,fotosPropostas:proposed.length,adicionais:additions.length,escritasML:externalWrites}));
 }finally{globalThis.fetch=realFetch;hook.deregister();}
});
