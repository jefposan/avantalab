import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {pathToFileURL} from 'node:url';
import {catalogPhotoFromUrl,uniqueCatalogPhotos} from '../../app/modules/marketplaces/catalog-photos.ts';
const hook=registerHooks({resolve(s,c,next){if(s==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};const f=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);}});
const {signCatalogPhoto,verifyCatalogPhoto}=await import('../../app/modules/marketplaces/services/catalog-photo-receipt.ts');hook.deregister();
test('fotos existentes identificam o mesmo ID entre tamanhos sem aceitar URL externa como ID ML',()=>{
 assert.equal(catalogPhotoFromUrl('https://http2.mlstatic.com/D_NQ_NP_982451-MLA82147517520_022025-F.jpg').id,'982451-MLA82147517520_022025');assert.equal(catalogPhotoFromUrl('https://exemplo.com/foto.jpg').id,undefined);
 assert.equal(uniqueCatalogPhotos([{id:'photo1',url:'a'},{id:'photo1',url:'b'},{id:'photo2',url:'c'}]).length,2);
});
test('comprovante de upload protege empresa, ator, cadastro, conteúdo e expiração',()=>{
 const before=process.env.MARKETPLACE_SECRETS_KEY;process.env.MARKETPLACE_SECRETS_KEY='test-only-receipt-key';try{
 const scope={company:'company',actor:'actor',product:'product'},photo={id:'photo-valid',url:'https://http2.mlstatic.com/photo.jpg'},token=signCatalogPhoto(scope,photo,1000);
 assert.deepEqual(verifyCatalogPhoto(scope,token,1001),photo);
 for(const wrong of [{...scope,company:'other'},{...scope,actor:'other'},{...scope,product:'other'}])assert.throws(()=>verifyCatalogPhoto(wrong,token,1001));
 assert.throws(()=>verifyCatalogPhoto(scope,token,1000+2*60*60_000));assert.throws(()=>verifyCatalogPhoto(scope,token.slice(0,-1)+'x',1001));assert.throws(()=>verifyCatalogPhoto(scope,'forjado',1001));
 }finally{if(before===undefined)delete process.env.MARKETPLACE_SECRETS_KEY;else process.env.MARKETPLACE_SECRETS_KEY=before;}
});
