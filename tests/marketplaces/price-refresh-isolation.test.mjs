import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');
const ast=ts.createSourceFile('ProductsStock.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let execute;
function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='execute')execute=n;ts.forEachChild(n,walk);}walk(ast);
function fixture(status='updated'){
 const original={id:'product',empresa_id:'company',price_cents:null,revision:2,ean:'7899882311471',links:[]};
 const other={id:'other',empresa_id:'company',price_cents:5000};
 const state={rows:[original,other],requests:[],broadcasts:[],busy:false};
 const exports={},env={exports,companyId:'company',busy:false,canManage:true,products:state.rows,active:{current:true},mutationInFlight:{current:false},crypto,AbortSignal,URLSearchParams,Error,
  changedProductListingFields:()=>[],setBusy:v=>state.busy=v,setError(){},setActionError:v=>state.error=v,setMessage:v=>state.message=v,setResearchingId:v=>state.researching=v,setPriceFeedback:v=>state.feedback=v,setConfirmation(){},setCreating(){},setProducts:fn=>state.rows=fn(state.rows),setListingUpdate:v=>state.listingUpdate=v,
  notifyProductReferenceChanged:(company,product)=>state.broadcasts.push({company,product}),notifyProductStockChanged(){throw Error('Não deve invalidar estoque/contadores');},load(){throw Error('Não deve recarregar a lista');},
  async request(path,body){state.requests.push({path,body});if(path==='produtos/preco'){if(status==='failed')throw Error('Falha de rede');return{status,message:status==='updated'?'Referência atualizada.':'Pesquisa concluída sem ofertas válidas.'};}return {product:{...original,price_cents:status==='updated'?19900:null,revision:status==='updated'?3:2}};}};
 vm.runInNewContext(ts.transpileModule(execute.getText(ast)+'\nexports.execute=execute;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,env);
 return{...exports,state,env,other};
}
test('EAN 7899882311471: atualizar pesquisa uma vez e substitui só o produto, sem recarregar lista/contagens',async()=>{
 const f=fixture();await f.execute({action:'refresh_price',productId:'product',revision:2});
 assert.equal(f.state.requests.length,2);assert.equal(f.state.requests[0].path,'produtos/preco');assert.match(f.state.requests[1].path,/productId=product/);assert.equal(f.state.rows[0].price_cents,19900);assert.equal(f.state.rows[1],f.other);assert.equal(f.state.feedback.updated,true);assert.equal(f.state.broadcasts.length,1);assert.equal(f.state.listingUpdate,undefined);assert.equal(f.state.busy,false);assert.equal(f.env.mutationInFlight.current,false);
});
test('pesquisa sem oferta e falha ficam visíveis junto ao produto e liberam nova tentativa',async()=>{
 const empty=fixture('no_offers');await empty.execute({action:'refresh_price',productId:'product',revision:2});assert.equal(empty.state.rows[0].price_cents,null);assert.equal(empty.state.feedback.updated,false);assert.match(empty.state.feedback.message,/sem ofertas/);assert.equal(empty.state.busy,false);
 const failed=fixture('failed');await failed.execute({action:'refresh_price',productId:'product',revision:2});assert.equal(failed.state.feedback.error,true);assert.match(failed.state.feedback.message,/Falha de rede/);assert.equal(failed.state.requests.length,1);assert.equal(failed.state.busy,false);
 const onCommand=source.slice(source.indexOf('const onCommand ='),source.indexOf('const noticeNavigation ='));assert.doesNotMatch(onCommand,/setDetailId/);
});
