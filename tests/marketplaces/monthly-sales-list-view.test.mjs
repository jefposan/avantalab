import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as runtime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {monthlySaleStatus} from '../../app/modules/marketplaces/sales-report-list.ts';
import {REPORT_MONTHS} from '../../app/modules/marketplaces/sales-report.ts';
const compiled=ts.transpileModule(readFileSync('app/marketplaces/MonthlySalesList.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const base={id:'paid',revision:'rev',orderId:'123',date:'2026-10-10T12:00:00Z',provider:'mercado_livre',account:'Adriano',warehouse:'Origem não identificada',status:'paid',included:true,gross:1000,units:1,items:[{title:'Produto',quantity:1,unitPrice:1000}],financial:null};
function render({loading=false,error='',empty=false}={}){
 const data={rows:empty?[]:[base,{...base,id:'cancelled',status:'cancelled',included:false}],total:empty?0:30,page:1,pageSize:25,confirmedGross:empty?0:1000,confirmedOrders:empty?0:1,missingGross:0};
 const states=[1,data,loading,error,0],updates=[],buttons=[];let index=0,closed=0;
 const react={...React,useState:()=>{const n=index++;return[states[n],v=>updates.push({n,value:typeof v==='function'?v(states[n]):v})];},useEffect(){}};
 const component=props=>{buttons.push(props);return React.createElement('button',{disabled:props.disabled},props.children);};
 const mod={exports:{}};
 new Function('require','module','exports',compiled)(name=>{
  if(name==='react')return react;if(name==='react/jsx-runtime')return runtime;
  if(name.endsWith('.css'))return{__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
  if(name.includes('sales-report-list'))return{monthlySaleStatus};if(name.includes('sales-report'))return{REPORT_MONTHS};
  if(name.includes('formatters'))return{formatarMoeda:n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})};
  if(name.includes('BotaoAcaoCompacto'))return component;if(name.includes('LoadingPontos'))return()=>React.createElement('span',{},'Loading');return{};
 },mod,mod.exports);
 const html=renderToStaticMarkup(React.createElement(mod.exports.default,{id:'list',companyId:'company',year:2026,month:10,filters:{provider:'',accountId:'',warehouseId:''},brand:'#003e73',entries:[{id:'paid',revision:'rev',value:{fees:100,freight:200,net:700,adjustments:0}}],totals:{gross:data.confirmedGross,orders:data.confirmedOrders,fees:100,freight:200,net:700,feeOrders:1,freightOrders:1,netOrders:1,adjustments:0,month:10},request(){throw Error('render must not fetch');},onClose(){closed++;}}));
 return{html,buttons,updates,get closed(){return closed;}};
}
test('lista exibe itens, situação, cobertura e custos confirmados por pedido/revisão',()=>{
 const {html}=render();for(const text of ['Vendas de','Outubro','Produto','Adriano','Origem não identificada','Cancelada','Fora do total','Total confirmado do mês','Pedido 123','R$ 1,00','R$ 2,00','R$ 7,00'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('max-height')||html.includes('monthSalesScroll'));assert.ok(html.includes('tabindex="0"'));
});
test('paginar e fechar lista não alteram filtros ou pedido',()=>{
 const result=render();result.buttons.find(b=>b.children==='Próxima').onClick();assert.deepEqual(result.updates.at(-1),{n:0,value:2});
 result.buttons.find(b=>b.children==='Fechar lista').onClick();assert.equal(result.closed,1);
});
test('vazio, carregamento e falha possuem retorno e recuperação',()=>{
 assert.ok(render({empty:true}).html.includes('Nenhuma venda neste mês e filtros.'));
 assert.ok(render({loading:true}).html.includes('Carregando vendas do mês…'));
 const failed=render({error:'Falha na lista'});assert.ok(failed.html.includes('role="alert"'));failed.buttons.find(b=>b.children==='Tentar novamente').onClick();assert.deepEqual(failed.updates.at(-1),{n:4,value:1});
});
