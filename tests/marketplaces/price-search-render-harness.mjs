import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import postcss from 'postcss';
const require=createRequire(import.meta.url),root=resolve(import.meta.dirname,'../..');
const main='app/marketplaces/consulta/MarketplaceMobileApp.tsx';
const source=readFileSync(resolve(root,main),'utf8');
const names=[...source.slice(source.indexOf('export default function MarketplaceMobileApp')).matchAll(/const \[(\w+),\s*set\w+\]\s*=\s*useState/g)].map(m=>m[1]);
export function createSearchRenderFixture(overrides={}){
 let cursor=0;const state={access:'ready',company:{id:'fictitious',nome:'Perfil demonstração',perfil:'gestor_master'},connectionId:'test-only',connectionStatus:'connected',...overrides};
 const styles=new Map(),cache=new Map();
 const hooks={...React,useState:initial=>{const name=names[cursor++];if(name&&!(name in state))state[name]=typeof initial==='function'?initial():initial;return[name?state[name]:initial,value=>{if(name)state[name]=typeof value==='function'?value(state[name]):value;}];},useRef:value=>({current:value}),useEffect:()=>{},useCallback:fn=>fn};
 const component=fn=>({__esModule:true,default:fn});
 function load(file){
  if(cache.has(file))return cache.get(file);
  const exports={};cache.set(file,exports);
  const localRequire=id=>{
   if(id==='react')return file===main?hooks:require(id);
   if(id==='react/jsx-runtime')return require(id);
   const full=id.startsWith('@/')?id.slice(2):id.startsWith('.')?resolve(dirname(resolve(root,file)),id).slice(root.length+1):id;
   if(full==='app/marketplaces/product-stock-events')return load(full+'.ts');
   if(full==='app/lib/formatters')return load(full+'.ts');
   if(full==='app/components/CampoMoeda')return load(full+'.tsx');
   if(full.endsWith('.css')){const key=styles.get(full)||'p'+styles.size;styles.set(full,key);return component(new Proxy({},{get:(_,name)=>`${key}_${String(name)}`}));}
   if(full==='app/lib/supabase')return{supabase:{auth:{getSession:()=>{throw Error('Não pode acessar rede no render');}}}};
   if(full.endsWith('usePriceLotCapture'))return component(()=>({active:null,capture:async()=>null,resolve:async()=>{},activate:()=>{}}));
   if(full.endsWith('usePriceSettings'))return component(()=>({settings:{profileColor:'#003e73',theme:'profile'},error:null}));
   if(full.endsWith('useTemaResolvido'))return component(()=>false);
   if(full.endsWith('useInstalacaoPwa'))return component(()=>({}));
   if(full.endsWith('PriceProductStock'))return component(()=>React.createElement('p',null,'Estoque do produto · dados fictícios'));
   if(full.endsWith('PriceLabelReader'))return component(props=>React.createElement('button',{className:props.className},'Ler etiqueta'));
   if(full.endsWith('CatalogCandidateChooser'))return component(()=>null);
   if(full.endsWith('CarregamentoDadosModulo'))return component(props=>props.ativo?React.createElement('span',{'aria-label':props.titulo+'. '+props.mensagem},props.mensagem):null);
   if(full.endsWith('PriceLotsPanel')||full.endsWith('ProductPost')||full.endsWith('InstalarPwa'))return component(()=>null);
   if(full.endsWith('price-lots'))return{lotTotals:()=>({quantity:0})};
   if(full.endsWith('scroll-panel-row'))return{scrollMarketplacePageTop:()=>()=>{}};
   if(full.endsWith('date-format'))return{marketplaceDateTime:new Intl.DateTimeFormat('pt-BR')};
   if(full.endsWith('services/ean'))return{isValidEan:v=>/^\d{13}$/.test(v),normalizeEan:v=>v.replace(/\D/g,'')};
   if(full.endsWith('price-search-cancellation'))return{boundedPriceRequest:()=>{throw Error('Não pode acessar rede no render');}};
   if(id==='next/image')return component(({priority,preload,...props})=>React.createElement('img',props));
   if(full.endsWith('BotaoExpandirCard'))return component(props=>React.createElement('button',{type:'button','aria-expanded':props.expandido,'aria-controls':props.controlsId,'aria-label':`${props.expandido?'Recolher':'Expandir'} ${props.contexto}`,onClick:props.onClick},props.expandido?'⌃':'⌄'));
   if(full.endsWith('ColaboradorTopbar')||full.endsWith('CampoBusca')||full.endsWith('BotaoAcaoCompacto')||full.endsWith('PriceSearchProgress')||full.endsWith('DetalhesRolaveis'))return load(full+'.tsx');
   throw Error('Import não simulado: '+id);
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(resolve(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:localRequire,Intl,AbortController,AbortSignal,crypto,setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),cancelAnimationFrame:()=>{},console});
  return exports;
 }
 const app=load(main).default;
 return{state,render(){cursor=0;const tree=app();const html=renderToStaticMarkup(tree);return{tree,html};},css(){const globals=[];postcss.parse(readFileSync(resolve(root,'app/globals.css'),'utf8')).walkRules(rule=>{if(rule.selector.includes('avanta-campo-busca'))globals.push(rule.toString());});return globals.join('\n')+'\n'+[...styles].map(([file,prefix])=>{const parsed=postcss.parse(readFileSync(resolve(root,file),'utf8'));parsed.walkRules(rule=>{rule.selector=rule.selector.replace(/:global\(([^)]+)\)/g,'$1').replace(/\.([a-zA-Z_][\w-]*)/g,(all,name)=>name.startsWith('avanta-')?all:`.${prefix}_${name}`);});return parsed.toString();}).join('\n');}};
}
