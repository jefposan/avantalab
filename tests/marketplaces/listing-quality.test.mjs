import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeListingQuality,qualityActionUrl,qualityEditField} from '../../app/modules/marketplaces/listing-quality.ts';
const rule=(key,status='PENDING',mode='OPPORTUNITY',link='https://www.mercadolivre.com.br/anuncios/MLB123456/modificar')=>({key,status,mode,wordings:{title:`Objetivo ${key}`,link}});
const sample=(rules)=>({entity_id:'MLB123456',entity_type:'ITEM',score:69,level_wording:'Profissional',calculated_at:'2026-10-24T12:00:00Z',buckets:[{key:'DATA',variables:[{key:'V',title:'Informações',rules}]}]});
test('qualidade mantém nota real, avisos/objetivos cumpridos e não inventa corte em 70',()=>{
 const parsed=normalizeListingQuality(sample([rule('TITLE'),rule('PRICE','COMPLETED'),rule('GTIN','PENDING','WARNING')]),'MLB123456','ITEM');
 assert.equal(parsed.score,69);assert.equal(parsed.level,'Profissional');assert.equal(parsed.goals.length,3);
 assert.equal(parsed.goals[1].completed,true);assert.equal(parsed.goals[2].warning,true);assert.equal(parsed.goals[0].field,'title');
 assert.throws(()=>normalizeListingQuality(sample([]),'MLB999999','ITEM'));
 assert.throws(()=>normalizeListingQuality(sample([]),'MLB123456','USER_PRODUCT'));
 assert.equal(normalizeListingQuality({...sample([]),score:null},'MLB123456','ITEM').score,null);
 assert.equal(normalizeListingQuality({...sample([]),score:0},'MLB123456','ITEM').score,0);
 assert.equal(normalizeListingQuality({...sample([]),score:101},'MLB123456','ITEM').score,null);
});
test('links só permitem HTTPS oficial brasileiro e campos desconhecidos não viram edição indevida',()=>{
 for(const url of ['javascript:alert(1)','http://mercadolivre.com.br','https://mercadolivre.com.br.evil.test','https://evil.test/?next=mercadolivre.com.br','https://user:pass@mercadolivre.com.br'])assert.equal(qualityActionUrl(url),null);
 assert.ok(qualityActionUrl('https://www.mercadolivre.com.br/anuncios'));
 for(const key of ['STOCK','UP_STOCK','PICTURES','UP_TECHNICAL_SPECIFICATIONS_MAIN','SHIPPING_PRICE','FREE_SHIPPING','UNKNOWN'])assert.equal(qualityEditField(key),null);
 assert.equal(qualityEditField('UP_PRICE_COMPETITIVENESS'),'price');assert.equal(qualityEditField('DESCRIPTION'),'description');
});
test('objetivos ausentes não equivalem a todos cumpridos; objetivos duplicados são deduplicados',()=>{
 const parsed=normalizeListingQuality(sample([rule('TITLE'),rule('TITLE')]),'MLB123456','ITEM');assert.equal(parsed.goals.length,1);
 const partial=sample([]);partial.buckets[0].variables=[{key:'TECHNICAL',title:'Complete a ficha',status:'PENDING'}];
 assert.equal(normalizeListingQuality(partial,'MLB123456','ITEM').goals[0].completed,false);
});
test('consulta é manual, usa componente oficial e editor existente sem salvar por conta própria',()=>{
 const ui=readFileSync('app/marketplaces/ListingQuality.tsx','utf8');
 assert.match(ui,/Consultar objetivos/);assert.match(ui,/CarregamentoDadosModulo/);assert.match(ui,/Atualizar objetivos/);assert.doesNotMatch(ui,/setInterval|method:.*PATCH|request\([^\n]*,\s*\{/);
 assert.match(ui,/Ação exclusiva do Mercado Livre/);assert.match(ui,/não armazena senha/);assert.doesNotMatch(ui,/Conferir restrição no ML/);
 assert.match(ui,/embedded=false/);assert.match(ui,/!embedded&&<div className=\{styles.heading\}/);
 const editor=readFileSync('app/marketplaces/ListingEditor.tsx','utf8'),product=readFileSync('app/marketplaces/ProductLinkedListings.tsx','utf8');
 assert.match(editor,/editor\?\.provider==='mercado_livre'&&<ListingQuality/);assert.match(editor,/editor.fields\[field\]\?\.editable/);
 assert.match(product,/!removalReview&&link.provider==='mercado_livre'&&connected&&<ListingQuality/);
 assert.match(product,/<ListingEditor key=\{editing.link.id\}/);
});
