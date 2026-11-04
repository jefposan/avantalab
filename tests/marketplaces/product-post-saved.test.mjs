import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {saveProductPost,loadProductPost} from '../../app/marketplaces/product-post-store.ts';
import {preparePostPhoto} from '../../app/marketplaces/product-post-photo.ts';
const scope={companyId:'company',productId:'product'};
test('post salvo pelo servidor: envia arquivos e campos sem URL local, empresa/produto e revisão',async()=>{
 let calls=0;const request=async(path,options)=>{calls++;assert.match(path,/precos\/post/);const form=options.body;assert.ok(form instanceof FormData);assert.equal(form.get('empresaId'),'company');assert.equal(form.get('productId'),'product');assert.equal(form.get('revision'),'2');assert.equal(form.get('requestKey'),'attempt');assert.deepEqual(JSON.parse(form.get('draft')),{description:'Descrição'});assert.equal(form.get('image').type,'image/png');assert.equal(form.get('source').type,'image/jpeg');return{revision:3};};
 assert.equal((await saveProductPost(scope,request,{description:'Descrição',image:'blob:local'},new Blob(['png'],{type:'image/png'}),new Blob(['jpg'],{type:'image/jpeg'}),2,'attempt')).revision,3);assert.equal(calls,1);
 await assert.rejects(()=>loadProductPost({companyId:'',productId:'p'},request),/Selecione/);
});
test('consulta é autenticada pelo request do módulo e não possui cache persistido no aparelho',async()=>{
 const response=await loadProductPost(scope,async(path)=>{assert.match(path,/empresaId=company/);assert.match(path,/productId=product/);return{post:null,stock:{warehousesReady:true,warehouses:[]}};});assert.equal(response.post,null);assert.equal(response.stock.warehousesReady,true);
 const s=readFileSync('app/marketplaces/product-post-store.ts','utf8');assert.doesNotMatch(s,/indexedDB|localStorage/);assert.match(s,/credentials:'omit'/);
});
test('foto rejeita arquivos vazios, formato não suportado e acima de 12 MB antes de decodificar',async()=>{
 for(const file of [new File(['x'],'x.svg',{type:'image/svg+xml'}),new File([],'empty.jpg',{type:'image/jpeg'}),new File([new Uint8Array(12*1024*1024+1)],'large.jpg',{type:'image/jpeg'})])await assert.rejects(()=>preparePostPhoto(file,new AbortController().signal),/12 MB/);
});
test('fluxo recupera foto e arquivo, preserva campos, não compartilha antes de salvar e não escreve cadastro',()=>{
 const s=readFileSync('app/marketplaces/ProductPost.tsx','utf8');
 assert.match(s,/loadProductPost\(storageScope,request,controller.signal\)/);assert.match(s,/await persist\(draft,blob,photo\)/);assert.match(s,/setDescription\(d.description\)/);assert.match(s,/setSource\(saved.source\)/);assert.match(s,/capture="environment"/);
 assert.match(s,/compartilharImagem\(file,readyDraft\?\.name\|\|product.name,readyDraft\?productPostCaption/);
 assert.doesNotMatch(s,/Copiar legenda|neste navegador|navigator.clipboard/);assert.match(s,/Salvar novamente/);assert.match(s,/if\(!file\|\|!saved/);
 assert.doesNotMatch(s,/notifyDirectSalesChanged|localStorage|indexedDB/);
});
