import test from 'node:test';import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,next){if(s==='./product-picture-policy')return next('./product-picture-policy.ts',c);return next(s,c);}});
const {publicationContentReadiness}=await import('../../app/modules/marketplaces/publication-content-readiness.ts');hook.deregister();
import {productPhotoBytes} from '../../app/modules/marketplaces/product-photo-file.ts';
test('preparação orienta fotos, descrição e campos reais de categoria, sem inventar nota',()=>{
 const prepared={product:{pictures:['https://cdn.example/1.jpg']},requiredAttributes:[{id:'BRAND',name:'Marca'}],optionalAttributes:[{id:'POWER',name:'Potência'},{id:'UNRELATED',name:'Outro'}]};const tasks=publicationContentReadiness(prepared,{attributes:{BRAND:'Marca real'}});assert.equal(tasks.filter(t=>!t.ready).length,3);assert.match(tasks[2].title,/Potência/);assert.doesNotMatch(tasks[2].title,/Outro/);
 assert.ok(publicationContentReadiness(prepared,{pictureUrl:prepared.product.pictures[0],additionalPictures:['https://cdn.example/2.jpg','https://cdn.example/3.jpg'],description:'Descrição confirmada',attributes:{BRAND:'Marca',POWER:'400 W'}}).every(t=>t.ready));
});
test('mesmo contrato de arquivo recusa tamanho, MIME e assinatura incoerentes',()=>{assert.throws(()=>productPhotoBytes({mime:'text/html',base64:'aaaa'}));assert.throws(()=>productPhotoBytes({mime:'image/png',base64:Buffer.from('<html>').toString('base64')}));const png=Buffer.from([137,80,78,71,13,10,26,10]);assert.deepEqual(productPhotoBytes({mime:'image/png',base64:png.toString('base64')}),png);assert.throws(()=>productPhotoBytes({mime:'image/png',base64:Buffer.alloc(2_621_441).toString('base64')}));});
