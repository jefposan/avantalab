import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as domain from '../../app/modules/marketplaces/product-post.ts';
const require=createRequire(import.meta.url),source=readFileSync('app/marketplaces/ProductPost.tsx','utf8');
const names=[...source.matchAll(/\[(\w+),set\w+\]=useState/g)].map(m=>m[1]);
function fixture(stock){
 const state={stock,file:new File(['png'],'post.png',{type:'image/png'}),saved:true,loadingSaved:false,readyDraft:{description:'Descrição',originalPriceCents:100,priceCents:70}},exports={};let cursor=0;
 const hooks={useState(initial){const name=names[cursor++];if(!(name in state))state[name]=typeof initial==='function'?initial():initial;return[state[name],value=>state[name]=typeof value==='function'?value(state[name]):value];},useRef(initial){return{current:initial}},useEffect(){}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Intl,require(id){if(id==='react')return hooks;if(id.includes('/modules/marketplaces/product-post'))return domain;if(id.includes('formatters'))return{formatarMoedaDigitada:v=>String(Number(v)/100)};if(id.endsWith('.module.css'))return{default:new Proxy({},{get:(_,key)=>key})};if(id.includes('CampoMoeda')||id.includes('BotaoAcaoCompacto'))return{default:'button'};if(id.includes('DirectSaleActions'))return{DirectDialog:'dialog'};if(id==='react/jsx-runtime')return require(id);return{};}});
 const flatten=n=>Array.isArray(n)?n.flatMap(flatten):n&&typeof n==='object'?[n,...flatten(n.props?.children)]:[];
 const render=()=>{cursor=0;return flatten(exports.ProductPostImage({product:{id:'p',name:'Produto',description:'Descrição',image:'/p.png'},companyName:'Perfil',storageScope:{companyId:'c',productId:'p'},onClose(){}}));};
 return{state,render};
}
const stocks={warehousesReady:true,warehouses:[{id:'online',name:'Online',quantity:0},{id:'saldao',name:'SALDÃO',quantity:3},{id:'loja',name:'Loja',quantity:2}]};
const label=n=>{const text=x=>Array.isArray(x)?x.map(text).join(' '):x&&typeof x==='object'?text(x.props?.children):x??'';return text(n.props.children);};
test('imagem: saldos são somente informativos, somam sem duplicar e não bloqueiam compartilhamento com zero',()=>{
 const f=fixture(stocks),nodes=f.render(),indicators=nodes.filter(n=>n.props?.className==='stockIndicator');
 assert.deepEqual(indicators.map(label),['Todos 5 un.','Online 0 un.','SALDÃO 3 un.','Loja 2 un.']);
 assert.ok(indicators.every(n=>n.type==='div'&&!n.props.onClick&&!('tabIndex' in n.props)&&!('aria-pressed' in n.props)));
 assert.equal(nodes.find(n=>label(n)==='Compartilhar post').props.disabled,false);
 const zero=fixture({warehousesReady:true,warehouses:[{id:'online',name:'Online',quantity:0}]}).render();
 assert.equal(label(zero.find(n=>n.props?.className==='stockIndicator')),'Todos 0 un.');
 assert.equal(zero.find(n=>label(n)==='Compartilhar post').props.disabled,false);
 assert.equal(stocks.warehouses[1].quantity,3);
});
test('imagem: saldo desconhecido é Indisponível, não zero, e não interfere em compartilhar',()=>{
 const f=fixture({...stocks,warehouses:[{id:'online',name:'Online',quantity:null},{id:'saldao',name:'SALDÃO',quantity:3}]}),n=f.render();
 assert.equal(label(n.find(n=>n.props?.className==='stockIndicator')),'Todos Indisponível');assert.equal(n.find(n=>label(n)==='Compartilhar post').props.disabled,false);
 const unavailable=fixture({warehousesReady:false,warehouses:[],warehouseError:'Não foi possível consultar os saldos.'}).render();
 assert.equal(unavailable.find(n=>label(n)==='Compartilhar post').props.disabled,false);
 assert.doesNotMatch(source,/warehouseId|noAvailableStock|stockUnavailable/);
});
