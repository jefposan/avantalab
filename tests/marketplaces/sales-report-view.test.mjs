import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as model from '../../app/modules/marketplaces/sales-report.ts';
import * as financial from '../../app/modules/marketplaces/sales-financial.ts';
const compiled=ts.transpileModule(readFileSync('app/marketplaces/SalesReport.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function render({selected=null,loading=false,error='',gross=10000,orders=1,dark=false,complete=false}={}){
 const states=[true,true,2026,'','','',selected,{year:2026,months:Array.from({length:12},(_,i)=>({month:i+1,gross:i===9?gross:0,orders:i===9?orders:0,units:i===9?2:0,missingGross:0,pendingCosts:i===9?orders:0})),accounts:[],warehouses:[],generatedAt:'2026-10-27'},loading,error,0,JSON.stringify(['company',2026,'','','']),{scope:'',months:financial.emptyFinancialMonths()},false,[]];
 if(complete){const months=financial.emptyFinancialMonths();months[9]={month:10,fees:1500,freight:500,adjustments:0,net:8000,feeOrders:1,freightOrders:1,netOrders:1};states[12]={scope:JSON.stringify(['company',2026,'','',''])+':'+JSON.stringify(states[7].months),months};}
 const updates=[];let index=0;
 const mockReact={...React,useId:()=> 'report',useRef:()=>({current:null}),useState:()=>{const n=index++;return[states[n],value=>updates.push({n,value})];},useMemo:fn=>fn(),useEffect(){}};
 const buttons=[];
 const compact=props=>{buttons.push(props);return React.createElement('button',{disabled:props.disabled},props.children);};
 const select=props=>React.createElement('label',{},props.label,React.createElement('select',{'aria-label':props.label,defaultValue:props.value},props.options.map((o,i)=>React.createElement('option',{key:i,value:o.value},o.label))));
 const mod={exports:{}};
 new Function('require','module','exports',compiled)(name=>{
  if(name==='react')return mockReact;
  if(name==='./panel-expansion'){const hooks={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync('app/marketplaces/panel-expansion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(()=>mockReact,hooks,hooks.exports);return hooks.exports;}
  if(name==='react/jsx-runtime')return {...requireRuntime,jsx:(type,props,key)=>{if(type==='button'&&props.className==='monthButton')buttons.push(props);return requireRuntime.jsx(type,props,key);}};
  if(name.includes('sales-report')&&!name.endsWith('.css'))return model;
  if(name.includes('sales-financial'))return financial;
  if(name.endsWith('.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
  if(name.includes('formatters'))return{formatarMoeda:n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})};
  if(name.includes('BotaoAcao'))return compact;
  if(name.includes('MarketplaceSelect'))return select;
  if(name.includes('BotaoExpandir'))return()=>React.createElement('button',{},'Recolher');
  if(name.includes('LoadingPontos'))return()=>React.createElement('span',{},'loading');
  return {};
 },mod,mod.exports);
 return{html:renderToStaticMarkup(React.createElement(mod.exports.default,{companyId:'company',brand:'#003e73',dark})),updates,buttons};
}
import * as requireRuntime from 'react/jsx-runtime';
test('renderiza filtros, tabela de 12 meses, ações acessíveis e custos ausentes sem líquido inventado',()=>{
 const {html}=render();
 for(const label of ['Marketplace','Conta','Estoque','Ano','Resultado de vendas','Desempenho mensal','Do bruto ao líquido','A apurar','Origem não identificada'])assert.ok(html.includes(label),label);
 assert.equal((html.match(/class="barButton"/g)||[]).length,12);
 assert.ok(html.includes('aria-pressed="false"'));assert.ok(html.includes('role="row"')||html.includes('<tbody>'));
 assert.ok(html.includes('R$ 100,00'));assert.ok(!html.includes('Líquido</span><strong>R$'));
});
test('mês selecionado muda período e revela retorno ao ano, preservando tabela anual',()=>{
 const {html,buttons,updates}=render({selected:10,dark:true});
 assert.ok(html.includes('Outubro de 2026'));assert.ok(html.includes('data-selected="true"'));assert.ok(html.includes('dark'));
 buttons.find(b=>b.children==='Ver ano inteiro').onClick();assert.deepEqual(updates.at(-1),{n:6,value:null});
});
test('vazio confirmado difere de carregamento/erro e conserva dados durante atualização',()=>{
 assert.ok(render({orders:0,gross:0}).html.includes('Nenhuma venda confirmada'));
 assert.ok(render({loading:true}).html.includes('Atualizando…'));
 const failed=render({error:'Não foi possível consultar todas as vendas.'}).html;
 assert.ok(failed.includes('role="alert"'));assert.ok(failed.includes('Tentar novamente'));
});

test('com custos confirmados renderiza cascata real com bruto, taxa, frete e líquido',()=>{
 const {html}=render({selected:10,complete:true});
 assert.ok(html.includes('viewBox="0 0 800 176"'));assert.ok(html.includes('role="img"'));
 assert.ok(html.includes('taxas R$ 15,00'));assert.ok(html.includes('frete R$ 5,00'));assert.ok(html.includes('líquido R$ 80,00'));
 assert.ok(!html.includes('A apurar'));assert.ok(html.includes('Líquido após taxas e frete do vendedor.'));
});

test('linhas mensais oferecem botão nativo com seleção e teclado, preservando tabela compacta',()=>{
 const {html}=render({selected:10});
 assert.equal((html.match(/class="monthButton"/g)||[]).length,12);
 assert.ok(html.includes('aria-label="Selecionar Outubro de 2026"'));
 assert.match(html,/class="monthButton" aria-pressed="true" aria-label="Selecionar Outubro de 2026"/);
 const css=readFileSync('app/marketplaces/sales-report.module.css','utf8');
 assert.match(css,/\.monthButton::after[^}]*inset:0/);
});

test('acionar o mês da tabela aplica o mesmo toggle das barras e repetir retorna ao ano',()=>{
 for(const selected of [null,10]){
  const {buttons,updates}=render({selected});
  buttons.find(button=>button['aria-label']==='Selecionar Outubro de 2026').onClick();
  assert.deepEqual(updates.at(-1),{n:6,value:selected===null?10:null});
 }
});

test('sincronização com mesmos totais preserva composição e não remonta a paginação mensal',()=>{
 const source=readFileSync('app/marketplaces/SalesReport.tsx','utf8');
 assert.ok(source.includes('JSON.stringify(current.months)'));
 assert.ok(source.includes('if(!retainPrevious||!result.cursor)setFinance'));
 assert.ok(source.includes('key={`${scope}:${month}`} refreshKey={revision}'));
 assert.ok(!source.includes('key={`${scope}:${month}:${current.generatedAt}`}'));
});
