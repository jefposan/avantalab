import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('cancelamento superior e inferior usam a mesma ação sem submeter ou interromper publicação',()=>{
 const source=readFileSync('app/marketplaces/NewListing.tsx','utf8');
 const buttons=[...source.matchAll(/<BotaoAcaoCompacto[^>]*onClick=\{clearPreparation\}[^>]*>Cancelar(?: anúncio)?<\/BotaoAcaoCompacto>/g)];
 assert.equal(buttons.length,2);
 for(const [button] of buttons)assert.match(button,/disabled=\{!hasCancellableDraft \|\| publishing \|\| preparing\}/);
 assert.match(source,/newListingTopActions[\s\S]*?Pesquisar'[\s\S]*?onClick=\{clearPreparation\}/);
 const css=readFileSync('app/marketplaces/marketplaces.module.css','utf8');
 assert.match(css,/\.newListingTopActions \{ display: flex; align-items: center; gap: 12px/);
 assert.match(css,/@media \(max-width: 760px\) \{ \.newListingTopActions/);
});

test('ficha vazia não permite cancelar; digitação e preparação habilitam, limpar volta a desabilitar',()=>{
 const source=readFileSync('app/marketplaces/NewListing.tsx','utf8');
 const expression=source.match(/const hasCancellableDraft = (.*);/)[1];
 const empty={prepared:null,form:{ean:'',productId:''},searchDescription:''};
 const evaluate=patch=>vm.runInNewContext(expression,{...empty,...patch});
 assert.equal(evaluate({}),false);
 assert.equal(evaluate({searchDescription:'   ',form:{ean:'  '}}),false);
 for(const patch of [{searchDescription:'ventilador'},{form:{ean:'789'}},{prepared:{status:'found'}},{form:{ean:'',localProductId:'local'}},{form:{ean:'',copySource:{listingId:'MLB1'}}},{form:{ean:'',productId:'MLB2'}}])assert.equal(evaluate(patch),true);
 assert.equal(evaluate({}),false);
});
