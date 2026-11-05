import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('atualizar do AvantaPreços usa arco contínuo, proporção fixa e botão oficial',()=>{
 const source=readFileSync('app/marketplaces/PriceProductStock.tsx','utf8'),css=readFileSync('app/components/BotaoAcaoCompacto.module.css','utf8');
 assert.match(source,/Sincronizar e atualizar saldos/);
 assert.match(source,/width="20" height="20" viewBox="0 0 24 24"/);
 assert.match(source,/M21 12a9 9 0 1 1-9-9c2\.52 0 4\.93 1 6\.74 2\.74L21 8/);
 assert.match(source,/M21 3v5h-5/);
 assert.match(readFileSync('app/marketplaces/price-product-stock.module.css','utf8'),/\.refreshBalance svg \{[^}]*width: 20px; height: 20px; aspect-ratio: 1/);
 assert.doesNotMatch(source,/M20 7v5h-5M4 17v-5h5/);
 assert.match(css,/\.face svg \{ display:block;flex:none;width:18px;height:18px/);
});
