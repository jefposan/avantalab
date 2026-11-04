import test from 'node:test';import assert from 'node:assert/strict';
import {pictureAccountPermissions,perAccountPictureEditor,appendTargetPictures} from '../../app/modules/marketplaces/picture-account-permissions.ts';
const photo=id=>({id,url:'https://http2.mlstatic.com/'+id+'.jpg'});
const target=(connectionId,id,reason='',count=1)=>({connectionId,id,affectedIds:[id],revision:'rev',content:{reason,maxPictures:6,pictures:Array.from({length:count},(_,i)=>photo(connectionId+'-'+i))}});
const editor=()=>({connectionId:'a',id:'MLB1',pictures:[photo('a-0')],reason:'catálogo',maxPictures:0,reviewTargets:[target('a','MLB1','Conteúdo de catálogo'),target('b','MLB2','',2),target('c','MLB3')],restrictions:[{connectionId:'a',id:'MLB1',message:'Conteúdo de catálogo'}]});
test('conta de catálogo não bloqueia outras; base liberada, limites e capas por conta são preservados',()=>{
 const e=editor(),prepared=perAccountPictureEditor(e);assert.deepEqual(prepared.pictureAppendTargets,['b:MLB2','c:MLB3']);assert.deepEqual(prepared.pictureSource,{connectionId:'b',id:'MLB2'});assert.equal(prepared.reason,'');assert.equal(prepared.maxPictures,6);assert.deepEqual(prepared.pictures,[photo('b-0'),photo('b-1')]);
 assert.deepEqual(appendTargetPictures(e.reviewTargets[2],['new-1','new-2']),['c-0','new-1','new-2']);assert.deepEqual(e.reviewTargets[2].content.pictures,[photo('c-0')]);
});
test('alcance externo, desconhecido, divergente e limite cheio não ganham permissão',()=>{
 const e=editor();e.reviewTargets[1].affectedIds.push('MLB999');e.reviewTargets[2].content.maxPictures=1;assert.ok(pictureAccountPermissions(e).every(p=>!p.allowed));assert.deepEqual(perAccountPictureEditor(e).pictureAppendTargets,[]);
 const unknown=editor();delete unknown.reviewTargets[1].content;assert.equal(pictureAccountPermissions(unknown)[1].allowed,false);
});
test('adição não aceita galeria vazia nem duplicada',()=>{const t=target('b','MLB2');assert.throws(()=>appendTargetPictures(t,[]));assert.throws(()=>appendTargetPictures(t,['new','new']));});
