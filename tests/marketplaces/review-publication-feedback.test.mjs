import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
class ReviewPreflightConflict extends Error{}
function controller({readError=false,photos=true,preflightConflict=false}={}){
 const ast=ts.createSourceFile('review.tsx',readFileSync('app/marketplaces/ProductListingReview.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),functions=new Map();function visit(node){if(ts.isFunctionDeclaration(node)&&['begin','finish','publish'].includes(node.name?.text))functions.set(node.name.text,node.getText(ast));ts.forEachChild(node,visit);}visit(ast);assert.equal(functions.size,3);
 const state={confirm:'publish',operation:'',photos:0,results:[{status:'old'}],error:'',stale:false,writes:0,saved:0,recoveries:0,generalError:''};let yes,no,progress;
 const context={exports:{},Error,ReviewPreflightConflict,AbortSignal,Event,source:{},editors:{},draft:{},stale:false,allListings:false,priceChanged:false,price:null,prices:[],setPrices(){},setPriceTouched(){},lock:{current:false},alive:{current:true},request(){},refreshDraft:async()=>state.recoveries++,setOperation:v=>state.operation=v,onBusy(){},setError:v=>state.generalError=v,setMessage:v=>assert.equal(v,''),setConfirm:v=>state.confirm=v,setPublicationError:v=>state.error=v,setResults:v=>state.results=v,setStale:v=>state.stale=v,setPhotoFeedbackVersion:fn=>state.photos=fn(state.photos),reviewChanges:()=>photos?[{kind:'pictures'}]:[{kind:'details'}],publishListingReview:async(s,e,d,r,cb)=>{state.writes++;progress=cb;return new Promise((resolve,reject)=>{yes=resolve;no=reject;});},onSaved:()=>state.saved++,window:{dispatchEvent(){}},readReviewEditors:async()=>{if(readError)throw Error('Falha na releitura.');return{};},initialReviewDraft:()=>({}),setEditors(){},setDraft(){},setProposal(){},setAccepted(){}};
 vm.runInNewContext(ts.transpileModule([...functions.values()].join('\n')+'\nexports.run=publish;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return{state,run:context.exports.run,resolve:()=>yes(),reject:()=>no(preflightConflict?new ReviewPreflightConflict('Dados mudaram antes do envio.'):Error('Envio sem confirmação.')),progress:rows=>progress(rows)};
}
test('publicação mantém confirmação aberta durante envio, impede duplicidade e limpa aviso somente após confirmação',async()=>{
 const c=controller(),pending=c.run();assert.equal(c.state.confirm,'publish');assert.equal(c.state.operation,'publish');assert.equal(c.state.results.length,0);await c.run();assert.equal(c.state.writes,1);assert.equal(c.state.photos,0);
 c.progress([{kind:'pictures',status:'confirmed',connectionId:'jeff'}]);c.resolve();await pending;assert.equal(c.state.confirm,'sent');assert.equal(c.state.operation,'');assert.equal(c.state.photos,1);assert.equal(c.state.saved,1);assert.equal(c.state.results[0].status,'confirmed');
});
test('falha total/parcial mantém aviso pendente e exibe resultados sem sucesso geral nem reenvio',async()=>{
 for(const partial of [false,true]){const c=controller(),pending=c.run();if(partial)c.progress([{kind:'pictures',status:'confirmed'},{kind:'pictures',status:'failed'}]);c.reject();await pending;assert.equal(c.state.confirm,'publish-error');assert.equal(c.state.photos,0);assert.equal(c.state.stale,true);assert.match(c.state.error,/sem confirmação/);assert.equal(c.state.writes,1);assert.equal(c.state.saved,0);if(partial)assert.deepEqual(c.state.results.map(r=>r.status),['confirmed','failed']);}
});
test('fotos confirmadas não voltam a parecer rascunho se a releitura falhar; editar outro campo não limpa estado de fotos',async()=>{
 const c=controller({readError:true}),pending=c.run();c.progress([{kind:'pictures',status:'confirmed'}]);c.resolve();await pending;assert.equal(c.state.photos,1);assert.equal(c.state.confirm,'publish-error');assert.match(c.state.error,/releitura/);assert.equal(c.state.results[0].status,'confirmed');
 const other=controller({photos:false}),second=other.run();other.resolve();await second;assert.equal(other.state.photos,0);assert.equal(other.state.confirm,'sent');
});
test('conflito antes do envio reconfere o rascunho automaticamente e exige nova confirmação sem repetir publicação',async()=>{
 const c=controller({preflightConflict:true,photos:false}),pending=c.run();c.reject();await pending;
 assert.equal(c.state.recoveries,1);assert.equal(c.state.confirm,null);assert.equal(c.state.stale,false);assert.equal(c.state.writes,1);assert.equal(c.state.saved,0);assert.equal(c.state.error,'');
});
