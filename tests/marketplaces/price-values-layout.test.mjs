import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
test('preços do AvantaPreços ficam em uma única coluna em todas as larguras',()=>{
 const css=postcss.parse(readFileSync('app/marketplaces/consulta/marketplaces-mobile.module.css','utf8'));
 const columns=[];
 css.walkRules('.priceGrid',rule=>rule.walkDecls('grid-template-columns',declaration=>columns.push(declaration.value)));
 assert.deepEqual(columns,['minmax(0, 1fr)']);
});
