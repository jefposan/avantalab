import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFileSync(p,'utf8');
const exported={};vm.runInNewContext(ts.transpileModule(read('app/modules/marketplaces/product-quality-goals.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,Set,Map,Date});
test('objetivos reais por produto agrupam editores comuns, preservam desconhecidos e ignoram concluídos e outras contas',()=>{
 const goal=(id,extra={})=>({id,title:id,completed:false,field:null,...extra}),record=(connection_id,listing_id,goals)=>({connection_id,listing_id,checked_at:new Date().toISOString(),issue:null,quality:[{goals}]}),links=[{connection_id:'a',provider_listing_id:'one'},{connection_id:'b',provider_listing_id:'two'}];
 const result=exported.productQualityGoals([record('a','one',[goal('PICTURES'),goal('GTIN'),goal('STOCK'),goal('OLD',{completed:true})]),record('b','two',[goal('OTHER_PICTURES'),goal('TECHNICAL'),goal('TITLE',{field:'title'})]),record('other','one',[goal('WRONG')])],links);
 assert.deepEqual(Array.from(result.goals,g=>g.title),['Fotos do produto','Ficha técnica','STOCK','Informações do anúncio']);assert.equal(result.unknown,0);assert.equal(result.stale,false);assert.equal(result.goals.find(g=>g.title==='STOCK').kind,null);
 const empty=exported.productQualityGoals([],links);assert.equal(empty.goals.length,0);assert.equal(empty.unknown,2);
 const completed=exported.productQualityGoals([record('a','one',[goal('PICTURE',{completed:true})])],links);assert.equal(completed.goals.length,0);assert.equal(completed.unknown,1);
});
test('qualidade leva objetivos editáveis à seção correspondente da revisão geral, sem IA ou editores fragmentados',()=>{
 const source=read('app/marketplaces/ProductQuality.tsx'),css=read('app/marketplaces/listing-quality.module.css');
 assert.match(source,/styles.pendingActions/);assert.match(source,/Melhorar: \{goal.title\}/);assert.match(source,/onClick=\{\(\)=>open\(goal.kind!\)\}/);assert.match(source,/focusSection=\{reviewSection\}/);assert.doesNotMatch(source,/styles.manualArea|QualityAIReview|ListingContentEditor|Completar com IA/);
 assert.match(source,/styles.overview/);assert.match(source,/ref=\{accountsDetails\}/);assert.match(source,/disabled=\{disabled\|\|editing\}/);
 assert.match(source,/ProductListingReview/);assert.match(source,/>Revisar anúncio</);assert.match(source,/canEdit=\{\(\)=>false\}/);assert.match(source,/AbortSignal.timeout\(20_000\)/);assert.match(source,/setTimeout\(load,300\)/);
 const review=read('app/marketplaces/ProductListingReview.tsx');assert.match(review,/ReviewQualityObjectives/);assert.doesNotMatch(review,/<ListingQuality/);assert.match(review,/Atualizar objetivos/);
 assert.match(css,/pendingArea[^}]*#edab27/);assert.match(css,/manualArea[^}]*#003e73/);assert.match(css,/dark \.pendingAction/);assert.match(css,/max-width:700px/);assert.match(css,/focus-visible/);
});
test('leitura de objetivos salvos limita produto, empresa e par conta/anúncio sem chamar plataforma ou IA',async()=>{
 const source=ts.createSourceFile('cache.ts',read('app/modules/marketplaces/services/quality-cache.ts'),ts.ScriptTarget.Latest,true),fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='readProductQualityCache');
 const out={},calls=[],rows={marketplace_product_links:[{connection_id:'a',provider_listing_id:'one',status:'active'},{connection_id:'b',provider_listing_id:'two',status:'paused'},{connection_id:'c',provider_listing_id:'closed',status:'closed'}],marketplace_listing_quality:[{connection_id:'a',listing_id:'one'},{connection_id:'b',listing_id:'two'},{connection_id:'a',listing_id:'two'}]};
 const db={from(table){const chain={};for(const method of ['select','eq','in','limit'])chain[method]=(...args)=>{calls.push([table,method,...args]);return chain;};chain.then=resolve=>Promise.resolve(resolve({data:rows[table],error:null}));return chain;}};
 vm.runInNewContext(ts.transpileModule(fn.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out,Set,uuidIsValid:v=>v==='product',MarketplaceError:class extends Error{constructor(status,code,msg){super(msg);this.status=status;}}});
 const result=await out.readProductQualityCache(db,'company','product');assert.equal(result.length,2);assert.ok(calls.some(c=>c[0]==='marketplace_product_links'&&c[1]==='eq'&&c[2]==='product_id'&&c[3]==='product'));
 for(const table of Object.keys(rows))assert.ok(calls.some(c=>c[0]===table&&c[1]==='eq'&&c[2]==='empresa_id'&&c[3]==='company'));
 assert.ok(calls.some(c=>c[1]==='select'&&c[2].includes('quality:result->quality')&&!c[2].includes('snapshot')));await assert.rejects(out.readProductQualityCache(db,'company','wrong'),/inválido/);
 rows.marketplace_product_links=[];assert.equal((await out.readProductQualityCache(db,'company','product')).length,0);
 const api=read('app/api/modulos/marketplaces/anunciados/qualidade/cache/route.ts');assert.match(api,/authorizeMarketplace[\s\S]*'view'/);assert.match(api,/Cache-Control':'no-store/);
});
