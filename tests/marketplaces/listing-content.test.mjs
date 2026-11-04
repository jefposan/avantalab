import test from 'node:test';
import assert from 'node:assert/strict';
import {contentAttributes,attributeChanges,mergeContentAttributes,validatePictureIds,contentMatches,contentBaseline,contentPreserved} from '../../app/modules/marketplaces/listing-content.ts';
import {qualityGaugeGeometry} from '../../app/modules/marketplaces/quality-gauge.ts';
const schema=[{id:'BRAND',name:'Marca',value_type:'string',tags:{}},{id:'GTIN',name:'EAN',value_type:'string',tags:{}},{id:'FIXED',value_type:'string',tags:{fixed:true}},{id:'IDENTITY',value_type:'string',tags:{parent_pk:true}},{id:'TEXT',name:'Texto',value_type:'string',value_max_length:8,tags:{}},{id:'POWER',name:'Potência',value_type:'number_unit',allowed_units:[{id:'W'}],tags:{}},{id:'COUNT',name:'Quantidade de funções',value_type:'number',tags:{}},{id:'BOOL',name:'Booleano',value_type:'boolean',values:[{id:'yes',name:'Sim'},{id:'no',name:'Não'}],tags:{}}];
const current=[{id:'BRAND',value_name:'Kian'},{id:'GTIN',value_name:'7899710028120'},{id:'TEXT',value_name:'Atual',values:[{id:null,name:'Atual'}]},{id:'UNKNOWN',values:[{id:'u',name:'Original',struct:{number:1,unit:'cm'}}]}];
const editor={attributes:contentAttributes(schema,current),maxPictures:6,pictures:[{id:'pict-A1',url:''},{id:'pict-B2',url:''}]};
test('ficha preserva identidade, tipos, valores intocados e estruturas desconhecidas',()=>{
 for(const id of ['BRAND','GTIN','FIXED','IDENTITY'])assert.equal(editor.attributes.find(a=>a.id===id).editable,false);
 const changes=attributeChanges(editor,{TEXT:'Novo',POWER:'1500 w',BOOL:'yes',COUNT:'3'}),merged=mergeContentAttributes(current,changes);
 assert.deepEqual(merged.find(a=>a.id==='UNKNOWN'),current[3]);assert.deepEqual(merged.find(a=>a.id==='BRAND'),current[0]);
 assert.equal(merged.find(a=>a.id==='TEXT').value_name,'Novo');assert.equal(merged.find(a=>a.id==='TEXT').values,undefined);
 assert.deepEqual(merged.find(a=>a.id==='POWER').value_struct,{number:1500,unit:'W'});
 for(const values of [{GTIN:'123'},{BRAND:'Outra'},{TEXT:''},{TEXT:'muito longo'},{BOOL:'inventado'},{COUNT:'abc'},{POWER:'20 kg'},{stock:'99'}])assert.throws(()=>attributeChanges(editor,values));
 assert.throws(()=>attributeChanges(editor,{}));
});
test('fotos respeitam ordem, limite, duplicidade e vínculos de variação',()=>{
 assert.deepEqual(validatePictureIds(editor,['pict-B2','pict-A1'],[]),['pict-B2','pict-A1']);
 for(const value of [[],['pict-A1','pict-A1'],['bad'],['pict-A1','pict-B2']])assert.throws(()=>validatePictureIds(editor,value,[]));
 assert.throws(()=>validatePictureIds(editor,['pict-A1'],[{variations:[{picture_ids:['pict-B2']}]}]),/variação/);
 assert.throws(()=>validatePictureIds({...editor,maxPictures:1},['pict-B2','pict-A1'],[]));
});
test('confirmação depende de dados relidos; unidades normalizadas e valores por ID são conferidos',()=>{
 assert.equal(contentMatches({pictures:[{id:'a'},{id:'b'}]},'pictures',['b','a']),false);
 assert.equal(contentMatches({pictures:[{id:'b'},{id:'a'}]},'pictures',['b','a']),true);
 assert.equal(contentMatches({attributes:[{id:'POWER',value_name:'1500 W'}]},'attributes',[{id:'POWER',value_name:'1500 w',value_struct:{number:1500,unit:'w'}}]),true);
 assert.equal(contentMatches({attributes:[{id:'BOOL',value_id:'no'}]},'attributes',[{id:'BOOL',value_id:'yes'}]),false);
 assert.equal(contentMatches({},'attributes',[]),false);
});
test('medidor semicircular usa nota exata sem normalizar ausente para zero',()=>{
 assert.equal(qualityGaugeGeometry(null),null);assert.equal(qualityGaugeGeometry(-1),null);assert.equal(qualityGaugeGeometry(101),null);
 assert.deepEqual(qualityGaugeGeometry(0),{x:36,y:133,nx:63,ny:133});assert.deepEqual(qualityGaugeGeometry(50),{x:140,y:29,nx:140,ny:56});assert.deepEqual(qualityGaugeGeometry(100),{x:244,y:133,nx:217,ny:133});
 const g=qualityGaugeGeometry(69);assert.ok(Math.abs((Math.PI-Math.atan2(133-g.ny,g.nx-140))/Math.PI*100-69)<.001);
});
test('confirmação não ignora perda de atributo ou foto intocada nem confunde normalização com perda',()=>{
 const original={attributes:current,pictures:[{id:'pict-A1'}]},after=structuredClone(original),desired=[{id:'TEXT',value_name:'Novo'}];
 after.attributes.find(a=>a.id==='TEXT').value_name='Novo';
 assert.equal(contentPreserved(contentBaseline(original),after,'attributes',desired),true);
 after.attributes.find(a=>a.id==='BRAND').value_id='outra';
 assert.equal(contentPreserved(original,after,'attributes',desired),false);
 const photoLost={...original,pictures:[]};assert.equal(contentPreserved(original,photoLost,'attributes',desired),false);
 assert.equal(contentPreserved(original,{...original,attributes:current.slice(1)},'pictures',['pict-B2']),false);
});
