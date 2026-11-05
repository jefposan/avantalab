import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const mobile=readFileSync(new URL('../../app/marketplaces/consulta/MarketplaceMobileApp.tsx',import.meta.url),'utf8');
const web=readFileSync(new URL('../../app/marketplaces/ProductsStock.tsx',import.meta.url),'utf8');
function effect(source,marker,context){
 const ast=ts.createSourceFile('component.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let found;
 function walk(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes(marker))found=node.arguments[0].getText(ast);ts.forEachChild(node,walk);}
 walk(ast);assert.ok(found,marker);
 const timers=new Map();let id=0;
 const cleanup=vm.runInNewContext(ts.transpile(`(${found})()`,{target:ts.ScriptTarget.ES2022}),{loading:false,...context,setTimeout:(fn,ms)=>{assert.equal(ms,20_000);timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id)});
 return{expire:()=>{for(const fn of timers.values())fn();timers.clear();},cleanup,timers};
}
test('aviso e confirmação de gravação expiram sem alterar referência nem cadastro',()=>{
 let result={localProductId:'a',historyId:'h',notice:'Sem ofertas',referenceStatus:'preserved',prices:{market:123}};
 const context={result,resultDetailsOpen:true,setResult:fn=>{result=fn(result);}};
 const run=effect(mobile,'const productId=result?.localProductId',context);
 run.expire();assert.equal(result.notice,undefined);assert.equal(result.referenceStatus,undefined);assert.equal(result.prices.market,123);
});
test('timer antigo não apaga aviso de outro produto; desmontagem cancela timer',()=>{
 let result={localProductId:'a',historyId:'h',notice:'Antigo',referenceStatus:'preserved'};
 const run=effect(mobile,'const productId=result?.localProductId',{result,resultDetailsOpen:true,setResult:fn=>{result=fn(result);}});
 result={localProductId:'b',historyId:'other',notice:'Novo'};run.expire();assert.equal(result.notice,'Novo');
 const next=effect(mobile,'const productId=result?.localProductId',{result,resultDetailsOpen:true,setResult:fn=>{result=fn(result);}});
 next.cleanup();assert.equal(next.timers.size,0);
});
test('fechar tratamento limpa aviso e feedback Web/PWA tem duração limitada',()=>{
 let result={localProductId:'a',notice:'Sem ofertas'};
 effect(mobile,'const productId=result?.localProductId',{result,resultDetailsOpen:false,setResult:fn=>{result=fn(result);}});assert.equal(result.notice,undefined);
 const cleared=[];
 effect(mobile,'if(!priceResearchFeedback&&!resultError)',{priceResearchFeedback:{message:'Erro'},resultError:'Erro',setPriceResearchFeedback:v=>cleared.push(v),setResultError:v=>cleared.push(v)}).expire();assert.deepEqual(cleared,[null,'']);
 const webCleared=[];
 effect(web,'if(!priceFeedback&&!actionError&&!message)',{priceFeedback:{message:'Sem ofertas'},actionError:'',message:'',setPriceFeedback:v=>webCleared.push(v),setActionError:v=>webCleared.push(v),setMessage:v=>webCleared.push(v)}).expire();assert.deepEqual(webCleared,[null,'','']);
 assert.match(web,/setPriceFeedback\(null\);setActionError\(''\);setMessage\(''\);\},\[companyId,warehouseId,detailId,query,page\]/);
 assert.match(mobile,/\[company\?\.id,result\?\.localProductId,resultDetailsOpen\]/);
});
