import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('app/marketplaces/panel-expansion.ts','utf8'),out={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out,require:()=>({})});
const panels=['sales','announced','warehouses','products','results'];
test('cada abertura, inclusive por atalho, substitui qualquer outro dos cinco blocos; fechamento antigo não recolhe o novo',()=>{
 for(const before of panels)for(const after of panels){
  let state=out.nextPanelExpansion({companyId:'company',active:before},'company',after,true);
  assert.equal(state.active,after);
  if(before!==after){state=out.nextPanelExpansion(state,'company',before,false);assert.equal(state.active,after);}
  state=out.nextPanelExpansion(state,'company',after,false);assert.equal(state.active,'');
 }
 assert.equal(out.nextPanelExpansion({companyId:'old',active:'sales'},'new','products',false).active,'');
 assert.equal(out.nextPanelExpansion({companyId:'old',active:'sales'},'new','products',true).active,'products');
});
test('os cinco blocos usam o grupo único e preservam o conteúdo montado ao recolher',()=>{
 const client=readFileSync('app/marketplaces/MarketplacesClient.tsx','utf8');
 for(const panel of ['announced','warehouses','products','results']){
  assert.ok(client.includes(`panelExpanded={activePanel==='${panel}'}`));assert.ok(client.includes(`changePanel('${panel}',expanded)`));
 }
 assert.match(client,/salesExpanded=activePanel==='sales'/);assert.match(client,/changePanel\('sales',expanded\)/);
 for(const [file,id] of [['Anunciados','announced-content'],['ProductsStock','products-content'],['WarehousesPanel','warehouses-content'],['SalesReport','sales-report-content']]){
  const content=readFileSync(`app/marketplaces/${file}.tsx`,'utf8');assert.match(content,/usePanelExpansion/);assert.ok(content.includes(id));assert.match(content,/hidden=\{/);
 }
 assert.match(source,/currentCompany.current!==companyId/);
});
