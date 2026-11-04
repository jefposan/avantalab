import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..'),data=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return data('export {}');
 if(s==='./mercadolivre-management')return data("export async function loadConnection(db,company,id){if(company!=='company'||id!=='account')throw Error('Conta incorreta');return {id};}");
 if(s==='./mercadolivre-catalog')return data("export async function identifyMercadoLivreCatalog(db,c,input){db.calls.push(input);return db.result;}");
 const path=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(path&&existsSync(path+'.ts'))return next(pathToFileURL(path+'.ts').href,c);return next(s,c);
}});
const {qualityCatalogPictures}=await import('../../app/modules/marketplaces/services/quality-catalog-pictures.ts');hooks.deregister();
test('melhoria recupera galeria somente por EAN exato, sem escolher produto ambíguo nem variante divergente',async()=>{
 const db={calls:[],result:{status:'found',product:{raw:{attributes:[{id:'GTIN',value_name:'7899882311471'}],pictures:[{id:'photo-123',url:'https://http2.mlstatic.com/a.jpg'},{id:'photo-456',url:'https://http2.mlstatic.com/b.jpg'},{id:'invalid',url:'javascript:alert(1)'}]}}}};
 const photos=await qualityCatalogPictures(db,'company','account','7899882311471');assert.equal(photos.length,2);assert.deepEqual(db.calls[0],{ean:'7899882311471'});
 db.result.product.raw.attributes[0].value_name='7908103790527';assert.deepEqual(await qualityCatalogPictures(db,'company','account','7899882311471'),[]);
 db.result.status='choose';assert.deepEqual(await qualityCatalogPictures(db,'company','account','7899882311471'),[]);
 const before=db.calls.length;assert.deepEqual(await qualityCatalogPictures(db,'company','account','invalid-ean'),[]);assert.equal(db.calls.length,before);
});
