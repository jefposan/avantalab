import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {scrollExpandedMarketplaceProduct} from '../../app/marketplaces/scroll-panel-row.ts';

test('produto mede posição após o layout e alinha título sob marketplaces; recolhido/desmontado não rola',()=>{
 const previous={window:globalThis.window,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 try{
  for(const reduced of [false,true]){
   const frames=new Map(),calls=[];let frameId=0,top=900,expanded=true;
   globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
   globalThis.window={scrollY:1000,matchMedia:()=>({matches:reduced}),scrollTo:value=>calls.push(value)};
   const row={isConnected:true,querySelector:selector=>selector==='[id^="identity-"]'?null:expanded?{}:null,getBoundingClientRect:()=>({top}),closest:()=>({querySelector:selector=>({getBoundingClientRect:()=>({bottom:selector==='header'?80:190})})})};
   const flush=()=>{for(const callback of frames.values())callback();frames.clear();};
   scrollExpandedMarketplaceProduct(()=>row);assert.equal(calls.length,0);top=400;flush();
   assert.deepEqual(calls,[{top:1202,behavior:'instant'}]);
   scrollExpandedMarketplaceProduct(()=>row);expanded=false;flush();assert.equal(calls.length,1);
   expanded=true;const cancel=scrollExpandedMarketplaceProduct(()=>row);cancel();flush();assert.equal(calls.length,1);
   scrollExpandedMarketplaceProduct(()=>row);row.isConnected=false;flush();assert.equal(calls.length,1);
  }
 }finally{for(const[key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
test('título/seta usam o mesmo toggle: somente expansão explícita agenda; recolher, ocupado e refresh não rolam',()=>{
 const text=readFileSync('app/marketplaces/ProductsStock.tsx','utf8'),source=ts.createSourceFile('ProductsStock.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let toggle,effect;
 const visit=node=>{if(ts.isJsxAttribute(node)&&node.name.text==='onToggle'&&node.initializer?.getText(source).includes('expansionScrollRequested'))toggle=node.initializer.expression;if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&node.arguments[0]?.getText(source).includes('return scrollExpandedMarketplaceProduct'))effect=node.arguments[0];ts.forEachChild(node,visit);};visit(source);assert.ok(toggle);assert.ok(effect);
 const calls=[],pending={current:''};
 const context={detailId:'',busy:false,product:{id:'a'},expansionScrollRequested:pending,productRows:{current:new Map([['a','row-a'],['b','row-b']])},scrollExpandedMarketplaceProduct:get=>{calls.push(get());return()=>calls.push('cancel');}};
 context.setDetailId=fn=>context.detailId=fn(context.detailId);
 const compile=node=>runInNewContext('('+ts.transpileModule(node.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'')+')',context);
 const click=compile(toggle),settled=compile(effect);
 settled();assert.deepEqual(calls,[]);click();assert.equal(context.detailId,'a');const cancel=settled();assert.deepEqual(calls,['row-a']);
 settled();assert.equal(calls.length,1,'atualização não rouba posição');click();cancel();settled();assert.equal(context.detailId,'');assert.deepEqual(calls,['row-a','cancel']);
 context.busy=true;click();assert.equal(context.detailId,'');context.busy=false;context.detailId='a';settled();assert.equal(calls.length,2,'abertura programática não usa flag de clique');
 context.product.id='b';click();settled();assert.equal(calls.at(-1),'row-b');
 assert.match(text,/onClick=\{onToggle\}/);assert.match(text,/productRows\.current\.set\(product.id,row\)/);
});
