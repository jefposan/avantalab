import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
test('cópia do cabeçalho inclui nome e EAN sem expandir; falha não informa sucesso',async()=>{
 const states=[];let cursor=0,fail=false,toggled=0,stopped=0;const copied=[],exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/ProductsStock.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports,navigator:{clipboard:{async writeText(value){if(fail)throw Error('denied');copied.push(value);}}},
  require(name){
   if(name==='react')return{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],value=>states[i]=value];},useEffect(){},useCallback:fn=>fn};
   if(name==='react/jsx-runtime')return require(name);
   if(name.endsWith('.module.css'))return{default:new Proxy({},{get:(_,key)=>key})};
   if(name.includes('local-product-publications'))return{productPublicationChannels:()=>[]};
   if(name.includes('BotaoAcaoCompacto'))return{default:'copy-button'};
   return new Proxy({default:'component'},{get:(target,key)=>target[key]||(()=>null)});
  }
 });
 const product={id:'p',name:'Ferro de passar',ean:'7896347184229',pictures:[],links:[],stock_quantity:1};
 const render=()=>{cursor=0;return exports.LocalProductHeader({product,onToggle(){toggled++;}});};
 const all=node=>Array.isArray(node)?node.flatMap(all):node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
 const click=async()=>{all(render()).find(node=>node.props?.['aria-label']==='Copiar nome e EAN do produto').props.onClick({stopPropagation(){stopped++;}});await new Promise(setImmediate);};
 await click();assert.equal(copied[0],'Ferro de passar\nEAN: 7896347184229');assert.equal(toggled,0);assert.equal(stopped,1);
 assert.equal(all(render()).find(node=>node.props?.role==='status').props.children,'Nome e EAN copiados.');
 fail=true;await click();assert.match(all(render()).find(node=>node.props?.role==='status').props.children,/Não foi possível/);
 fail=false;product.ean=null;await click();assert.equal(copied.at(-1),'Ferro de passar\nEAN: Não informado');
});
