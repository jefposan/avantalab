import test from 'node:test';
import assert from 'node:assert/strict';
import {assertCompletionIdentity,missingCatalogPictures,missingCatalogAttributes,catalogEanConfirmed} from '../../app/modules/marketplaces/catalog-completion.ts';
test('EAN ausente no detalhe só aceita evidência da busca exata; contradição nunca é ignorada',()=>{
 const result={status:'found',product:{id:'MLB123',raw:{attributes:[]}},identifierEvidence:{ean:'7896347195829',productId:'MLB123'}};
 assert.equal(catalogEanConfirmed(result,'7896347195829'),true);assert.equal(catalogEanConfirmed({...result,identifierEvidence:undefined},'7896347195829'),false);assert.equal(catalogEanConfirmed(result,'7896006214007'),false);assert.equal(catalogEanConfirmed({...result,identifierEvidence:{ean:'7896347195829',productId:'MLB999'}},'7896347195829'),false);
 assert.equal(catalogEanConfirmed({...result,product:{id:'MLB123',raw:{attributes:[{id:'GTIN',value_name:'7896006214007'}]}}},'7896347195829'),false);
});
const source={id:'MLB123',ean:'7896347195829',description:'Ficha oficial',attributes:[{id:'BRAND',name:'Marca',value:'Electrolux'},{id:'VOLTAGE',name:'Voltagem',value:'127 V'},{id:'TEXT',name:'Texto',value:'Oficial'},{id:'COLOR',name:'Cor',value:'Preto',valueId:'black'}],pictures:[{id:'photo-original',url:'https://http2.mlstatic.com/photo-original-O.jpg'},{id:'photo-extra',url:'https://http2.mlstatic.com/photo-extra-O.jpg'}]};
test('complemento exige EAN válido e mesma variante; não aceita foto por nome aproximado',()=>{
 assert.doesNotThrow(()=>assertCompletionIdentity(source.ean,[{id:'VOLTAGE',value:'127V'},{id:'BRAND',value:'ELECTROLUX'}],source));
 for(const [ean,attributes]of [['7896347195828',[]],['7896006214007',[]],[null,[]],[source.ean,[{id:'VOLTAGE',name:'Voltagem',value:'220V'}]],[source.ean,[{id:'BRAND',value:'Outra'}]]])assert.throws(()=>assertCompletionIdentity(ean,attributes,source));
});
test('galeria acrescenta só fotos faltantes, preserva capa/ordem e deduplica tamanhos do mesmo ID',()=>{
 const current=[{id:'manual-cover',url:'https://exemplo.com/capa.jpg'},{url:'https://http2.mlstatic.com/D_NQ_NP_photo-original-F.webp'}];
 assert.deepEqual(missingCatalogPictures(current,source,12),[source.pictures[1]]);assert.equal(current[0].id,'manual-cover');
 assert.deepEqual(missingCatalogPictures(current,source,2),[]);assert.deepEqual(missingCatalogPictures([...current,{id:'photo-extra',url:'outro'}],source,12),[]);
});
test('somente campo vazio e editável recebe dado comprovado em formato aceito',()=>{
 const field=(id,extra={})=>({id,name:id,type:'string',editable:true,value:'',valueId:null,reason:'',maxLength:100,options:[],units:[],...extra});
 const editor={attributes:[field('BRAND',{editable:false}),field('TEXT'),field('COLOR',{type:'list',options:[{id:'black',name:'Preto'}]}),field('VOLTAGE',{value:'127 V'})]};
 assert.deepEqual(missingCatalogAttributes(editor,source),{TEXT:'Oficial',COLOR:'black'});
 editor.attributes[1].value='Preenchido por mim';editor.attributes[2].valueId='black';assert.deepEqual(missingCatalogAttributes(editor,source),{});
});
