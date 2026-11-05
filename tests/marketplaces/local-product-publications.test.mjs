import test from 'node:test';
import assert from 'node:assert/strict';
import { productPublicationChannels, productPublicationState } from '../../app/modules/marketplaces/local-product-publications.ts';
const link=(provider,status,listing='1',connection='a')=>({id:listing,connection_id:connection,provider,provider_listing_id:listing,title:'Produto',reported_stock:null,status,source_snapshot:{},updated_at:''});
test('tarja independe do saldo: ativo vence pausado, análise e desativado; excluído não identifica publicação',()=>{
 for(const [status,label] of [['active','Anunciado'],['PUBLISHED','Anunciado'],['paused','Pausado'],['under_review','Em análise'],['IN_REVIEW','Em análise'],['inactive','Desativado'],['closed','Desativado']])assert.equal(productPublicationState([link('mercado_livre',status)]).label,label);
 for(const status of ['deleted','draft','unknown'])assert.equal(productPublicationState([link('mercado_livre',status)]),null);
 assert.equal(productPublicationState([link('mercado_livre','paused'),link('magalu','active','2')]).key,'advertised');
 assert.equal(productPublicationState([link('mercado_livre','closed'),link('magalu','paused','2')]).key,'paused');
 assert.equal(productPublicationState([link('mercado_livre','under_review'),link('magalu','inactive','2')]).key,'review');
 assert.equal(productPublicationState([link('mercado_livre','active','')]),null);
});
test('pílulas agrupam publicações ativas, sem pausados ou rascunhos, e deduplicam vínculos',()=>{
  const active=link('mercado_livre','active');
  const links=[link('magalu','PUBLISHED'),active,{...active,id:'duplicado'},link('mercado_livre','paused','2'),link('mercado_livre','active','1','outra-conta'),link('shopee','draft'),link('amazon','pending'),link('mercado_livre','closed','3'),link('magalu','published',''),link('desconhecido','active')];
  const before=structuredClone(links);
  assert.deepEqual(productPublicationChannels(links),[{provider:'mercado_livre',name:'Mercado Livre',total:2,paused:0},{provider:'magalu',name:'Magalu',total:1,paused:0}]);
  assert.deepEqual(links,before);
});
test('contas vazias, anúncios excluídos e moderação não viram publicação confirmada',()=>{
  assert.deepEqual(productPublicationChannels([]),[]);
  assert.deepEqual(productPublicationChannels([link('magalu','IN_REVIEW'),link('mercado_livre','deleted'),link('magalu','not_published')]),[]);
  assert.equal(productPublicationChannels([link('shopee','active'),link('amazon','published'),link('tiktok_shop','active'),link('casas_bahia','published')]).length,4);
});
