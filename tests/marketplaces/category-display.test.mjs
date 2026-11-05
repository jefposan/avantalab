import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryDisplay} from '../../app/modules/marketplaces/category-display.ts';

test('categorias de mesmo nome ficam distinguíveis pelo caminho oficial completo',()=>{
 const normal=categoryDisplay('MLB1645','MLB1645',{name:'Ventiladores',path_from_root:[{name:'Eletrodomésticos'},{name:'Ar e Ventilação'},{name:'Ventiladores'}]});
 const antique=categoryDisplay('MLB40289','Ventiladores',{name:'Ventiladores',path_from_root:[{name:'Antiguidades e Coleções'},{name:'Antiguidades'},{name:'Eletrodomésticos Antigos'},{name:'Ventiladores'}]});
 assert.equal(normal.name,antique.name);
 assert.equal(normal.path,'Eletrodomésticos → Ar e Ventilação → Ventiladores');
 assert.equal(antique.path,'Antiguidades e Coleções → Antiguidades → Eletrodomésticos Antigos → Ventiladores');
 assert.equal(normal.id,'MLB1645');
});
test('falha externa preserva nome conhecido sem apresentar identificador como nome',()=>{
 assert.deepEqual(categoryDisplay('MLB1645','Ventiladores',null),{id:'MLB1645',name:'Ventiladores'});
 assert.deepEqual(categoryDisplay('MLB1645','MLB1645',null),{id:'MLB1645',name:'Categoria indisponível'});
 assert.equal(categoryDisplay('MLB1','',{path_from_root:[null,{name:'MLB1'}]}).path,undefined);
});
