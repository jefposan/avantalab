import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const source=readFileSync('app/components/DetalhesRolaveis.tsx','utf8');
function fixture({viewport=800,headerHeight=140,navBottom=180,internal=false,bodyTop=200,searchHeight=0}={}){
 const search=searchHeight?{getBoundingClientRect:()=>({height:searchHeight})}:null;
 const area={style:{},scrollTop:70,querySelector:()=>search,getBoundingClientRect:()=>({top:bodyTop})},events=new Map(),frames=new Map(),observed=[],removed=[];
 let effect,cleanup,id=0,observerStopped=false;
 const header={getBoundingClientRect:()=>({height:headerHeight}),closest:selector=>selector==='main'?{querySelector:()=>({getBoundingClientRect:()=>({bottom:navBottom})})}:null};
 const win={innerHeight:viewport,visualViewport:{height:viewport,offsetTop:0,addEventListener:(n,f)=>events.set('visual-'+n,f),removeEventListener:n=>removed.push('visual-'+n)},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>removed.push(n)};
 const exports={};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,document:{getElementById:id=>id==='header'?header:null},window:win,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:n=>frames.delete(n),ResizeObserver:class{constructor(fn){this.fn=fn;}observe(node){observed.push(node);}disconnect(){observerStopped=true;}},require(id){if(id==='react')return {useRef:()=>({current:area}),useEffect:fn=>{effect=fn;}};if(id==='react/jsx-runtime')return require(id);if(id.endsWith('.css'))return {default:{area:'scroll'}};throw Error(id);}});
 const tree=exports.default({cabecalhoId:'header',rotulo:'Detalhes do produto',children:'Conteúdo',cabecalhoInterno:internal});cleanup=effect();
 return {area,tree,events,frames,observed,removed,win,resizeSearch(height){searchHeight=height;events.get('resize')();for(const fn of frames.values())fn();frames.clear();},resize(height){headerHeight=height;events.get('resize')();for(const fn of frames.values())fn();frames.clear();},cleanup(){cleanup();return observerStopped;}};
}
test('detalhes têm rolagem própria e preservam cabeçalho, largura, teclado e posição interna',()=>{
 const f=fixture();assert.equal(f.tree.props.role,'region');assert.equal(f.tree.props.tabIndex,0);assert.equal(f.tree.props['aria-label'],'Detalhes do produto');
 assert.equal(f.area.style.maxBlockSize,'456px');assert.equal(f.area.scrollTop,70);assert.equal(f.observed.length,3);
 f.resize(200);assert.equal(f.area.style.maxBlockSize,'396px');assert.equal(f.area.scrollTop,70);
 assert.equal(f.cleanup(),true);assert.deepEqual(f.removed.sort(),['resize','scroll','visual-resize']);
 const css=readFileSync('app/components/DetalhesRolaveis.module.css','utf8');assert.match(css,/width:100%/);assert.match(css,/overflow-y:auto/);assert.match(css,/overscroll-behavior-y:contain/);assert.match(css,/:focus-visible/);assert.match(css,/@media print/);
 assert.doesNotMatch(source,/fetch\(|scrollTo\(|preventDefault|stopPropagation|document.body/,'não prende a página nem dispara consultas');
});
test('viewport móvel/teclado, zoom e cabeçalho alto não geram altura negativa nem reiniciam scroll',()=>{
 const f=fixture({viewport:667,headerHeight:260,navBottom:130});assert.equal(f.area.style.maxBlockSize,'253px');
 f.win.visualViewport.height=320;f.resize(260);assert.equal(f.area.style.maxBlockSize,'120px');assert.equal(f.area.scrollTop,70);f.cleanup();
});
test('as quatro listas mantêm identificação fora do mesmo componente rolável',()=>{
 for(const file of ['ProductsStock.tsx','Anunciados.tsx','Vendas.tsx','DirectSalesHistory.tsx']){
  const text=readFileSync('app/marketplaces/'+file,'utf8');assert.match(text,/import DetalhesRolaveis from '@\/app\/components\/DetalhesRolaveis'/);assert.match(text,/<DetalhesRolaveis cabecalhoId=/);assert.match(text,/rotulo=/);
 }
 const product=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');assert.match(product,/id=\{`identity-\$\{detailPrefix\}-\$\{product.id\}`\}/);assert.match(product,/<LocalProductHeader[\s\S]*?<DetalhesRolaveis[\s\S]*?<ProductDetail/);
 const sale=readFileSync('app/marketplaces/Vendas.tsx','utf8');assert.match(sale,/salePinnedProduct/);assert.match(sale,/sale.items\[0\]\?\.title/);
});

test('cabeçalho interno ocupa a mesma região rolável sem descontar sua altura duas vezes',()=>{
 const f=fixture({internal:true,bodyTop:200});
 assert.equal(f.area.style.maxBlockSize,'576px');
 f.resize(220);assert.equal(f.area.style.maxBlockSize,'576px');
 assert.equal(f.area.scrollTop,70);f.cleanup();
});

test('Novo anúncio mantém título e pesquisa inteiros abaixo da tela após expandir as contas',()=>{
 const f=fixture({internal:true,viewport:600,bodyTop:900,headerHeight:56,searchHeight:112});
 assert.equal(f.area.style.maxBlockSize,'192px');
 assert.equal(f.area.scrollTop,70);
 f.resizeSearch(288);
 assert.equal(f.area.style.maxBlockSize,'368px');
 assert.equal(f.area.scrollTop,70);
 assert.ok(f.observed.length>3,'mudanças na pesquisa também atualizam o limite');
 f.cleanup();
});
