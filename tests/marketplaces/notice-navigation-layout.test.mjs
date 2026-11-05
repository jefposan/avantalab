import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const source=read('app/marketplaces/ProductsStock.tsx');
test('pendência usa o mesmo controle real em um destino na linha dos estoques, sem duplicar navegação',()=>{
 const parent=read('app/marketplaces/WarehousesPanel.tsx');
 assert.match(parent,/warehouseNavigationRow[\s\S]*warehouseSelectorLine[\s\S]*ref=\{setNoticeNavigationHost\} className=\{styles.warehouseNoticeHost\}/);
 assert.match(parent,/noticeNavigationHost=\{noticeNavigationHost\}/);
 assert.match(parent,/onNoticeDismiss=\{dismissNotice\}/);
 assert.match(parent,/dismissNotice=useCallback\(\(\)=>setActiveNotice\(undefined\),\[\]\)/);
 assert.match(source,/createPortal\(noticeNavigation, props.noticeNavigationHost\) : noticeNavigation/);
 assert.equal(source.split('>Voltar à lista<').length-1,1);
 const css=read('app/marketplaces/marketplaces.module.css');
 assert.match(css,/\.warehouseNavigationRow\s*\{[^}]*align-items:center;[^}]*flex-wrap:wrap/);
 assert.match(css,/\.warehouseNoticeHost\s*\{[^}]*margin-inline-start:auto;max-width:100%/);
 assert.match(css,/\.warehouseNoticeHost:empty\s*\{\s*display:none/);
 assert.match(css,/\.productNoticeNavigation\s*\{[^}]*border-radius:12px;[^}]*background:color-mix/);
});
test('voltar limpa somente foco/pesquisa local, dispensa alvo consumido e respeita gravação em andamento',()=>{
 const ast=ts.createSourceFile('ProductsStock.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let fn;const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text==='changeSearch')fn=node;ts.forEachChild(node,visit);};visit(ast);assert.ok(fn);
 for(const locked of [false,true]){
  const calls=[];
  const context={busy:locked,creating:false,mutationInFlight:{current:false},noticeProduct:'product',props:{onNoticeDismiss:()=>calls.push('dismiss')},controller:{current:{abort:()=>calls.push('abort')}},generation:{current:0},countCallback:{current:()=>calls.push('count')}};
  for(const name of ['setNoticeProduct','setQuery','setPage','setDetailId','setProducts','setTotal','setError','setActionError','setLoading','setExpanded'])context[name]=value=>calls.push([name,value]);
  vm.runInNewContext(ts.transpileModule(fn.getText(ast)+'; changeSearch(\'\');',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
  if(locked)assert.deepEqual(calls,[]);
  else{assert.ok(calls.includes('dismiss'));assert.ok(calls.includes('abort'));assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='setNoticeProduct'&&c[1]===''));assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='setPage'&&c[1]===1));}
 }
});
