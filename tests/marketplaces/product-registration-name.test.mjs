import test from 'node:test';
import assert from 'node:assert/strict';
import {productRegistrationName} from '../../app/modules/marketplaces/product-registration-name.ts';
const name='Ferro de Passar Seco e Vapor Electrolux Efficient Base antiaderente Vapor Vertical Extra 1200W de Potência Cabo 1,35m ESI10';
const attributes=[{id:'BRAND',value:'Electrolux'},{id:'LINE',value:'Efficient'},{id:'MODEL',value:'ESI10'}];
test('nome de cadastro elimina detalhes comerciais e preserva tipo, marca, linha e modelo',()=>{
 assert.equal(productRegistrationName(name,attributes),'Ferro de Passar Seco e Vapor Electrolux Efficient ESI10');
});
test('variante e códigos adicionais sobrevivem à compactação, inclusive no fim do título',()=>{
 const result=productRegistrationName(name+' 220V Azul', [...attributes,{id:'VOLTAGE',value:'220V'},{id:'COLOR',value:'Azul'}]);
 assert.ok(Array.from(result).length<=60);for(const part of ['Ferro','Electrolux','ESI10','220V','Azul'])assert.ok(result.includes(part));
 const second=productRegistrationName('Smartphone Samsung Galaxy com tela de alta resolução e câmera de qualidade SM-A156M 128GB', [{id:'BRAND',value:'Samsung'},{id:'MODEL',value:'Galaxy A15'}]);
 assert.ok(second.includes('SM-A156M'));assert.ok(second.includes('128GB'));assert.ok(Array.from(second).length<=60);
});
test('não trunca nome curto, identidade desconhecida ou essenciais que excedem o limite',()=>{
 assert.equal(productRegistrationName('Ferro Electrolux ESI10',attributes),'Ferro Electrolux ESI10');
 assert.equal(productRegistrationName(name,[]),name);
 assert.equal(productRegistrationName(name,[{id:'BRAND',value:'Electrolux'},{id:'MODEL',value:'Modelo confirmado com uma referência muito longa que não pode ser removida'}]),name);
});
test('marca no começo do título e modelo contendo linha também são suportados',()=>{
 const result=productRegistrationName('Electrolux Ferro de Passar Seco e Vapor Base antiaderente Vapor Vertical Extra 1200W ESI10',attributes);
 assert.ok(Array.from(result).length<=60);assert.match(result,/Ferro/);assert.match(result,/Electrolux/);assert.match(result,/ESI10/);
 const combined=productRegistrationName(name,[...attributes.filter(item=>item.id!=='MODEL'),{id:'MODEL',value:'Efficient ESI10'}]);
 assert.equal((combined.match(/Efficient/g)||[]).length,1);
});
