import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {scrollMarketplaceRow} from '../../app/marketplaces/scroll-panel-row.ts';

const text=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');
const source=ts.createSourceFile('ProductsStock.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const effects=[];
const walk=node=>{if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect')effects.push(node.arguments[0]);ts.forEachChild(node,walk);};walk(source);
const compile=(node,context)=>runInNewContext('('+ts.transpileModule(node.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'')+')',context);

test('aviso cancela alinhamentos antigos e espera o produto, sem rolar o card principal',()=>{
 const calls=[],context={props:{noticeTarget:{key:'notice',productId:'product'}},consumedNotice:{current:''},noticeOpeningPending:{current:false},busy:false,creating:false,stockLoadOpen:false,controller:{current:{abort(){}}},generation:{current:0},pageScrollRequested:{current:true},expansionScrollRequested:{current:'old'},loadedListKey:{current:'old'},requestAnimationFrame:()=>{throw Error('não deve agendar rolagem do card');}};
 for(const setter of ['setNoticeResult','setNoticeProduct','setDetailId','setExpanded','setQuery','setPage','setProducts','setError','setActionError','setLoading'])context[setter]=value=>calls.push([setter,value]);
 const effect=compile(effects.find(e=>e.getText(source).includes('consumedNotice.current=props.noticeTarget.key')),context);
 effect();assert.equal(context.pageScrollRequested.current,false);assert.equal(context.expansionScrollRequested.current,'product');assert.equal(context.noticeOpeningPending.current,true);assert.ok(calls.some(([key,value])=>key==='setDetailId'&&value===''));
 context.props.noticeTarget={key:'announced',productId:'product',origin:'announced'};effect();assert.equal(context.expansionScrollRequested.current,'','atalho de anunciados mantém localização sem expansão');
 const load=text.slice(text.indexOf('const load = useCallback'),text.indexOf('const load = useCallback')+5500);
 assert.doesNotMatch(load,/scrollMarketplacePageTop/);
});
test('refresh posterior não reabre ficha antiga de uma pendência já consumida',()=>{
 const start=text.indexOf('const openNotice='),end=text.indexOf('if(openNotice)requestAnimationFrame',start);assert.ok(start>0&&end>start);
 let detail='';const context={setNoticeResult(){},noticeProduct:'product',noticeOpeningPending:{current:true},props:{noticeTarget:{key:'attempt',origin:'notice'}},data:{products:[{id:'product'}]},setDetailId:value=>{detail=typeof value==='function'?value(detail):value}};
 const run=()=>runInNewContext('(()=>{'+ts.transpileModule(text.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'})()',context);
 run();assert.equal(detail,'product');assert.equal(context.noticeOpeningPending.current,false);detail='';run();assert.equal(detail,'','atualizar metadados não expande produto recolhido');
 context.noticeProduct='';context.noticeOpeningPending.current=true;run();assert.equal(context.noticeOpeningPending.current,true,'carga da lista não consome abertura pendente do produto');
});
test('aviso e expansão manual usam a mesma rotina após montagem/foco, uma única vez',()=>{
 const calls=[],row={},context={detailId:'product',expansionScrollRequested:{current:'product'},productRows:{current:new Map([['product',row]])},scrollMarketplaceRow:()=>{throw Error('não rolar imediatamente');},scrollExpandedMarketplaceProduct:getRow=>{calls.push(['scheduled',getRow()]);return()=>calls.push(['cancel']);},ativarFocoProduto:element=>{calls.push(['lock',element]);return()=>calls.push(['restore']);},keepExpandedProductHeaderVisible:()=>()=>{}};
 const effect=compile(effects.find(e=>e.getText(source).includes('const restore=ativarFocoProduto(ficha,')),context);
 const restore=effect();assert.deepEqual(calls,[['lock',row]]);
 const align=compile(effects.find(e=>e.getText(source).includes('return scrollExpandedMarketplaceProduct')),context);
 const cancel=align();assert.deepEqual(calls,[['lock',row],['scheduled',row]]);assert.equal(context.expansionScrollRequested.current,'');
 align();assert.equal(calls.filter(c=>c[0]==='scheduled').length,1);cancel();restore();
 context.detailId='';const count=calls.length;effect();assert.equal(calls.length,count);
 context.detailId='missing';effect();assert.equal(calls.length,count,'não bloqueia/alinha ficha inexistente');
 assert.match(text,/detailId === product.id && <DetalhesRolaveis/,'rolagem interna preservada');
});
test('alinhamento imediato respeita barra fixa e seletor, independente da posição do card',()=>{
 const previous=globalThis.window;
 try{
  const calls=[];globalThis.window={scrollY:400,matchMedia:()=>({matches:false}),scrollTo:value=>calls.push(value)};
  const row={getBoundingClientRect:()=>({top:407}),closest:()=>({querySelector:selector=>({getBoundingClientRect:()=>({bottom:selector==='header'?80:60})})})};
  scrollMarketplaceRow(row,0,'instant');assert.deepEqual(calls,[{top:719,behavior:'instant'}]);
 }finally{globalThis.window=previous;}
});
