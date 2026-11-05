import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewGoalCards,reviewSectionBlock,reviewPhotoAccess} from '../../app/marketplaces/review-quality-goals.ts';
import {proposedProductPictures} from '../../app/modules/marketplaces/product-picture-policy.ts';
const editors=()=>({pictures:{reason:'',maxPictures:12,restrictions:[]},attributes:{reason:'',attributes:[{id:'COLOR',editable:true}],restrictions:[]},details:{reason:'',attributes:[{id:'DESCRIPTION',editable:true}],restrictions:[]}});
test('quatro contas mostram uma sugestão de fotos, mantêm instrução real e ação correspondente',()=>{
 const records=['a','b','c','d'].map(connectionId=>({connectionId,id:connectionId,quality:[{goals:[{id:'CHARACTERISTICS:PICTURES:PICTURES_QUANTITY_MIN',title:'Adicione pelo menos 3 fotos.',group:'Fotos',completed:false}]}]}));
 const cards=reviewGoalCards(records,editors());assert.equal(cards.length,1);assert.equal(cards[0].instruction,'Adicione pelo menos 3 fotos.');assert.equal(cards[0].targets.length,4);assert.equal(cards[0].action,'Adicionar fotos');assert.equal(cards[0].kind,'pictures');
 const e=editors();e.pictures.reason='Conteúdo controlado pelo catálogo do ML';const blocked=reviewGoalCards(records,e)[0];assert.equal(blocked.action,null);assert.match(blocked.reason,/catálogo/);
 e.pictures.reason='';e.pictures.restrictions=[{message:'O ML compartilha esses dados com um anúncio fora deste produto.'}];assert.match(reviewSectionBlock(e,'pictures'),/outro anúncio/);
});
test('metas cumpridas não aparecem e estoque não libera edição artificial de saldo',()=>{
 const cards=reviewGoalCards([{connectionId:'a',id:'one',quality:[{goals:[{id:'OLD',completed:true},{id:'STOCK',title:'Adicione 2 unidades.',group:'Estoque',completed:false},{id:'VIDEO',title:'Vídeo vertical.',group:'Vídeo',completed:false}]}]}],editors());
 assert.equal(cards.length,2);assert.ok(cards.every(c=>c.action===null));assert.match(cards.find(c=>c.title==='Disponibilidade').reason,/saldo físico/);assert.match(cards.find(c=>c.title==='Vídeo do produto').reason,/não envia vídeos/);
});
test('galeria proposta preserva capa e fotos existentes, deduplica e respeita o limite',()=>{
 const photo=id=>({id,url:'https://http2.mlstatic.com/'+id+'.jpg'}),current=[photo('cover'),photo('manual')];
 assert.deepEqual(proposedProductPictures(current,[photo('cover'),photo('new'),photo('extra')],3),[photo('cover'),photo('manual'),photo('new')]);
 assert.deepEqual(proposedProductPictures(current,[photo('cover')],12),[]);assert.deepEqual(proposedProductPictures(current,[photo('new')],0),[]);
});
test('instruções iguais com IDs diferentes de campanha/Flex são agrupadas; números diferentes continuam distintos',()=>{
 const rows=['a','b','c'].map(id=>({id,connectionId:id,quality:[{goals:[{id:'PROMOTIONS:CAMPAIGN_'+id,title:'Participe de uma promoção para receber mais visitas',completed:false},{id:'SHIPPING:FLEX_'+id,title:'Entregue no mesmo dia com o Envios Flex',completed:false}]}]}));
 const cards=reviewGoalCards(rows,editors());assert.equal(cards.length,2);assert.ok(cards.every(card=>card.targets.length===3));
 rows[0].quality[0].goals.push({id:'PICTURES',title:'Adicione pelo menos 4 fotos.',completed:false});rows[1].quality[0].goals.push({id:'PICTURES',title:'Adicione pelo menos 3 fotos.',completed:false});assert.equal(reviewGoalCards(rows,editors()).filter(card=>card.kind==='pictures').length,2);
});

test('recomendação de catálogo não é liberada por anúncio próprio sem a mesma pendência; motivos e contagem são por anúncio',()=>{
 const e=editors();const target=(id,reason,count)=>({connectionId:'a',id,affectedIds:[id],content:{reason,maxPictures:12,pictures:Array.from({length:count},(_,i)=>({id:`photo-${id}-${i}`}))}});
 e.pictures.reviewTargets=[target('own','',1),target('catalog','Anúncio de catálogo confirmado pelo ML (catalog). Fotos e ficha pertencem ao catálogo.',5),target('unknown','O ML não informou se o anúncio é de catálogo.',2)];
 const records=[{connectionId:'a',id:'catalog',quality:[{goals:[{id:'PICTURES',title:'Adicione 3 fotos.',completed:false}]}]}];
 let cards=reviewGoalCards(records,e);assert.equal(cards[0].action,null);assert.match(cards[0].reason,/depende da análise/);
 let access=reviewPhotoAccess(e,cards[0].targets);assert.equal(access.length,1);assert.equal(access[0].count,5);assert.equal(access[0].state,'catalog');
 records.push({connectionId:'a',id:'own',quality:records[0].quality});cards=reviewGoalCards(records,e);assert.equal(cards[0].action,'Adicionar fotos');assert.equal(cards[0].targets.length,2);
 access=reviewPhotoAccess(e,[{connectionId:'a',id:'unknown'}]);assert.equal(access[0].state,'verification');assert.equal(access[0].allowed,false);
});
