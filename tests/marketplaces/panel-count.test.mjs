import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {panelCountText} from '../../app/modules/marketplaces/panel-count.ts';
import {createListingConfirmationTracker,mergeConfirmedListings,mergeConfirmedGroups} from '../../app/marketplaces/listing-confirmation.ts';

test('contador distingue total confirmado, zero real, carregamento e falha',()=>{
 assert.equal(panelCountText(1200),'1.200');assert.equal(panelCountText(0),'0');
 assert.equal(panelCountText(null,true),'…');assert.equal(panelCountText(80,true),'80');
 for(const n of [null,NaN,-1,1.5])assert.equal(panelCountText(n),'—');
 assert.equal(panelCountText(0,false,true),'—');
});
test('Anunciados usa total exato da seleção, não linhas da página, e descarta resposta da conta anterior',async()=>{
 const source=ts.createSourceFile('Anunciados.tsx',readFileSync('app/marketplaces/Anunciados.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let node;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='loadList')node=n;ts.forEachChild(n,walk);}walk(source);
 const expression=ts.transpileModule('('+node.initializer.arguments[0].getText(source)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'');
 const make=new Function('env',`with(env){return ${expression};}`);
 const listingConfirmations={current:createListingConfirmationTracker()};
 const state={},listController={current:null},requests=[],confirmedListingCount={current:{scope:'',total:0}},backgroundSignature={current:''};
 function load(accountId,request){return make({qualityFilter:'',noticeListing:undefined,listingConfirmations,mergeConfirmedListings,mergeConfirmedGroups,listController,confirmedListingCount,backgroundSignature,listingDisplaySignature:data=>JSON.stringify(data),marketplace:'mercado_livre',marketplaceIntegrated:p=>['mercado_livre','magalu'].includes(p),companyId:'company',accountId,query:'',status:'',order:'desc',page:1,URLSearchParams,AbortController,Error,
  setListingGroups:v=>state.groups=v,setListingTotal:v=>state.listingTotal=v,setRows:v=>state.rows=v,setRowsFilter:v=>state.filter=v,setRowsAccountId:v=>state.account=v,setTotal:v=>state.total=v,setTotalScope:v=>state.scope=v,setError:v=>state.error=v,setSyncNotice(){},setLoading:v=>state.loading=v,
  marketplaceClientRequest:async(path,...args)=>{requests.push(path);return request(path,...args);}})();}
 await load('',async()=>({listings:Array(25).fill({}),total:120}));
 assert.equal(state.total,120);assert.match(requests.at(-1),/scope=all/);assert.equal(state.rows.length,25);
 await load('account-a',async()=>({listings:[{}],total:45}));
 assert.equal(state.total,45);assert.equal(state.error,'');assert.match(requests.at(-1),/connectionId=account-a/);assert.deepEqual(JSON.parse(state.scope),['company','mercado_livre','account-a','','','',null]);
 let release;const old=load('account-a',()=>new Promise(r=>release=r));
 await load('account-b',async()=>({listings:[],total:0}));release({listings:[{}],total:999});await old;
 assert.equal(state.total,0);assert.deepEqual(JSON.parse(state.account),['company','mercado_livre','account-b']);
 let finishList;const fast=load('account-c',async path=>path.includes('countOnly=1')?{total:123}:new Promise(resolve=>finishList=resolve));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(state.total,123,'contador disponível antes das fichas da página');assert.equal(state.loading,true);
 finishList({listings:[],total:null});await fast;assert.equal(state.total,123);
 let finishOldPrice;const reading=load('account-c',async path=>path.includes('countOnly=1')?{total:123}:new Promise(resolve=>finishOldPrice=resolve));
 await new Promise(resolve=>setImmediate(resolve));
 listingConfirmations.current.confirm({companyId:'company',connectionId:'account-c',listing:{id:'MLB123',price:155.9,status:'active',substatus:[]}});
 finishOldPrice({listings:[{connectionId:'account-c',status:'active',snapshot:{id:'MLB123',price:173.2,status:'active',substatus:[]}}],total:null});await reading;
 assert.equal(state.rows[0].snapshot.price,155.9,'consulta anterior não restaura o preço antigo');assert.equal(state.total,123,'confirmação mantém o total exato da seleção');

 const ui=readFileSync('app/marketplaces/Anunciados.tsx','utf8');
 assert.match(ui,/totalScope === countScope \? displayedTotal : null/);assert.match(ui,/Anunciados · \{announcedCount\}/);
 assert.match(ui,/marketplaceIntegrated\(marketplace\) \? total : 0/);
});
test('Estoques não recarrega por abrir/recolher, foco ou visibilidade; lista pesada é adiada',()=>{
 const stock=readFileSync('app/marketplaces/WarehousesPanel.tsx','utf8'),list=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');
 assert.match(stock,/\[load, refreshKey\]/);assert.doesNotMatch(stock,/\[load, refreshKey, open\]/);
 assert.match(list,/countOnly:'1'/);assert.match(list,/!listVisible/);assert.match(list,/loadedListKey.current===key/);
 assert.doesNotMatch(list,/addEventListener\('focus'|addEventListener\('visibilitychange'/);
 const reader=readFileSync('app/marketplaces/PriceProductStock.tsx','utf8');
 const initialRead=reader.slice(reader.indexOf('.then(body =>'),reader.indexOf('.catch(',reader.indexOf('.then(body =>')));
 assert.doesNotMatch(initialRead,/notifyProductStockChanged/);
});
test('tarja de publicação aparece na própria lista e considera todas as contas vinculadas',()=>{
 const source=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');
 const ribbon=source.split('\n').find(line=>line.includes('<ProductPublicationRibbon'));
 assert.ok(ribbon);assert.doesNotMatch(ribbon,/detailId === product.id|stockAccountId/);assert.match(ribbon,/productPublicationState\(product.links\)/);
});
test('Estoques recebe o total filtrado completo da lista compartilhada mesmo recolhido',()=>{
 const list=readFileSync('app/marketplaces/ProductsStock.tsx','utf8'),stock=readFileSync('app/marketplaces/WarehousesPanel.tsx','utf8');
 assert.match(list,/countCallback.current\?\.\(\{ total: data.total, loading: false \}\)/);
 assert.match(stock,/listCount\?\.warehouseId === selected && listCount.scope===countScope \? listCount : null/);
 assert.match(stock,/onCountChange=\{receiveCount\}/);assert.match(stock,/Estoques · \{stockCount\}/);
 assert.match(stock,/Produtos listados ·/);
 assert.match(stock,/const stockCount = panelCountText\(currentWarehouseCount\?\.total/);
 assert.match(stock,/\[companyId, selected, stockScope, request\]/);
 assert.match(stock,/\[countWarehouse, catalogRefresh, companyId\]/);
 assert.match(stock,/detail\?\.companyId === companyId\) void countWarehouse/);
 assert.doesNotMatch(stock,/useEffect\(\(\) => \{ if \(!open\) return;/);
});

test('total do estoque é leve e independente dos filtros, preserva confirmado e descarta resposta antiga',async()=>{
 const source=ts.createSourceFile('WarehousesPanel.tsx',readFileSync('app/marketplaces/WarehousesPanel.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let node;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='countWarehouse')node=n;ts.forEachChild(n,walk);}walk(source);
 const expression=ts.transpileModule('('+node.initializer.arguments[0].getText(source)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'');
 const make=new Function('env',`with(env){return ${expression};}`);
 const warehouseCountController={current:null},confirmedWarehouseCount={current:{scope:'',total:null}},alive={current:true},requests=[],states=[];
 const run=(selected,request,companyId='company')=>make({selected,companyId,stockScope:JSON.stringify([companyId,selected]),warehouseCountController,confirmedWarehouseCount,alive,AbortController,AbortSignal,URLSearchParams,Number,Error,
  setWarehouseCount:value=>states.push(value),request:async path=>{requests.push(path);return request();}})();
 await run('online',async()=>({total:120}));
 assert.deepEqual(states.at(-1),{scope:'["company","online"]',total:120,loading:false});
 const params=new URLSearchParams(requests.at(-1).split('?')[1]);
 assert.deepEqual([...params.keys()].sort(),['countOnly','empresaId','warehouseId']);
 assert.equal(params.get('countOnly'),'1');assert.equal(params.get('empresaId'),'company');assert.equal(params.get('warehouseId'),'online');
 let finish;const pending=run('online',()=>new Promise(resolve=>finish=resolve));
 assert.equal(states.at(-1).total,120,'preserva total confirmado na atualização');
 await run('saldao',async()=>({total:9}));finish({total:999});await pending;
 assert.equal(states.at(-1).total,9,'resposta antiga não altera estoque atual');
 await run('online',async()=>({total:0}),'other-company');assert.equal(states.at(-1).total,0);assert.equal(states.at(-1).scope,'["other-company","online"]');
 assert.equal(states.at(-2).total,null,'não reutiliza total de outra empresa');
 for(const total of [null,-1,1.5,undefined]){await run('online',async()=>({total}));assert.equal(states.at(-1).total,null);assert.equal(states.at(-1).loading,false);}
 await run('online',async()=>{throw Error('sem rede');});assert.equal(states.at(-1).total,null);
 const before=states.length;await run('',async()=>({total:99}));assert.equal(states.length,before);
 let release;const unmount=run('online',()=>new Promise(resolve=>release=resolve));alive.current=false;release({total:500});await unmount;assert.notEqual(states.at(-1).total,500);
});
