import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Anunciados separa título, EAN e vínculo em linhas próprias, incluindo títulos curtos',()=>{
 const css=readFileSync('app/marketplaces/marketplaces.module.css','utf8');
 assert.match(css,/\.listingProductText\s*\{[^}]*display:grid[^}]*gap:4px/);
 assert.match(css,/\.listingProductText > strong,\.listingProductText > small\s*\{[^}]*display:block[^}]*white-space:normal/);
 for(const file of ['ListingGroupHeader.tsx','ListingProductIdentity.tsx']){
  const source=readFileSync('app/marketplaces/'+file,'utf8');
  assert.match(source,/className=\{styles.listingProductText\}/);assert.match(source,/<\/strong>[\s\S]*<small>EAN:/);
 }
});
