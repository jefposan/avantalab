import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

for (const marketplace of ['mercado_livre', 'magalu']) test(`${marketplace}: conclusão libera controles, atualiza listas e volta ao topo sem recarregar`, () => {
  const source=readFileSync('app/marketplaces/MarketplacesClient.tsx','utf8');
  const start=source.indexOf('  const completePublication = () => {'), end=source.indexOf('\n  const productContext',start);
  const frames=[],calls=[];
  vm.runInNewContext(`${source.slice(start,end)};completePublication();`,{marketplace,
    setCopyRequest:value=>calls.push(['copy',value]),setPublicationBusy:value=>calls.push(['busy',value]),
    setRefreshKey:updater=>calls.push(['refresh',updater(1)]),setMagaluCatalogRefresh:updater=>calls.push(['magalu',updater(1)]),
    requestAnimationFrame:fn=>frames.push(fn),document:{getElementById(id){assert.equal(id,'module-title');return{focus:options=>calls.push(['focus',JSON.stringify(options)])};}},
    window:{scrollTo:options=>calls.push(['scroll',JSON.stringify(options)])},
  });
  assert.deepEqual(calls.slice(0,3),[['copy',null],['busy',false],['refresh',2]]);
  assert.equal(calls.some(([name])=>name==='scroll'),false);frames.forEach(fn=>fn());
  assert.deepEqual(JSON.parse(calls.at(-1)[1]),{top:0,left:0,behavior:'instant'});
  assert.equal(calls.some(([name])=>name==='magalu'),marketplace==='magalu');
  assert.equal((source.match(/onPublished=\{completePublication\}/g)||[]).length,2);
});

function magaluHarness() {
  const source=readFileSync('app/marketplaces/MagaluListing.tsx','utf8'),state={progress:{requestKey:'key',sku:'SKU1',status:'publishing'},form:{sku:'SKU1'},completed:0},calls=[];
  const context={...state,crypto,Error,emptyForm:()=>({sku:''}),onPublished:()=>state.completed++,canManage:true,busy:false,companyId:'company',accountId:'account',
    marketplaceClientRequest:async()=>({publication:state.response}),
  };
  for(const name of ['Product','Products','Form','PriceText','Query','CategoryQuery','Categories','Template','Progress','Confirmed','Errors','RequestKey','Message','Busy']) context[`set${name}`]=value=>calls.push([name,value]);
  const start=source.indexOf('  function finishPublication('),end=source.indexOf('\n  const accountsReady',start);
  const functions=vm.runInNewContext(`(()=>{${stripTypeScriptTypes(source.slice(start,end))};return{finishPublication,advance};})()`,context);
  return{...functions,state,calls};
}

test('Magalu: confirmação final fecha o produto, mas etapas pendentes/falhas não encerram tarefa', async()=>{
  for(const status of ['published','publishing','failed']){
    const h=magaluHarness();h.state.response={status,sku:'SKU1',requestKey:'key'};await h.advance();
    assert.equal(h.state.completed,status==='published'?1:0);
    assert.equal(h.calls.some(([name,value])=>name==='Product'&&value===null),status==='published');
    assert.equal(h.calls.some(([name,value])=>name==='Busy'&&value===false),true);
    if(status==='published')assert.ok(h.calls.some(([name,value])=>name==='Progress'&&value===null));
  }
});

test('Magalu: SKU divergente ou resultado incompleto não é sucesso nem apaga dados',()=>{
  for(const publication of [{status:'published',sku:'outro',requestKey:'key'},{status:'publishing',sku:'SKU1',requestKey:'key'},{status:'published',sku:'',requestKey:'key'},{status:'published',sku:'SKU1',requestKey:'outro'}]){
    const h=magaluHarness();assert.throws(()=>h.finishPublication(publication));assert.equal(h.state.completed,0);assert.equal(h.calls.length,0);
  }
});

test('Magalu: aceite inicial não é sucesso, retomada não reabre publicação já concluída',()=>{
  const source=readFileSync('app/marketplaces/MagaluListing.tsx','utf8');
  assert.match(source,/data\.publication\.status !== 'published'\) setProgress/);
  assert.match(source,/if \(data\.publication\.status === 'published'\) finishPublication\(data.publication\)/);
  assert.match(source,/check.publication.requestKey === requestKey && check.publication.status === 'published'\) \{ finishPublication\(check.publication\); return; \}/);
});
