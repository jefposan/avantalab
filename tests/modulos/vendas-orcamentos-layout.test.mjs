import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const sales=source.slice(source.indexOf('function SalesView('),source.indexOf('\nfunction ServicesView('));
function render(created, period = { start: '', end: '' }){
 const context={exports:{},React,monthPeriod:()=>({start:'2026-11-01',end:'2026-11-30'}),useState:value=>[value && typeof value === 'object' && 'start' in value ? period : value,()=>{}],useMemo:fn=>fn(),useRef:value=>({current:value}),useEffect(){},useContext:()=>({can:()=>true}),PermissionContext:{},money:value=>String(value),normalizeSearch:value=>String(value).toLowerCase(),commercialRecords:[],documentLabel:value=>value,
 SalesPeriodFilter:()=>React.createElement('span',null,'Período das vendas'),BotaoAcaoCompacto:({children,onClick})=>React.createElement('button',{onClick},children),PageHeading:({action})=>React.createElement('header',null,action),Metric:()=>null,Panel:({title,children})=>React.createElement('section',null,React.createElement('h2',null,title),children),Badge:({children})=>React.createElement('span',null,children),
 Table:({children})=>React.createElement('table',null,React.createElement('tbody',null,children)),SearchToolbar:({children})=>React.createElement('div',null,React.createElement('input',{'aria-label':'Pesquisar vendas'}),children),
 Icon:()=>null,EmptyState:({title})=>React.createElement('p',null,title),QuoteActions:()=>React.createElement('button',null,'Compartilhar orçamento'),CommercialRecordIndicators:()=>null,CommercialRecordActions:()=>React.createElement('button',null,'Ações da venda'),OrderDetailsDialog:()=>null,OrderLifecycleDialog:()=>null,OrderStockDialog:()=>null,OrderToolsDialog:()=>null};
 vm.runInNewContext(ts.transpileModule(`${sales}\nexports.Component=SalesView;`,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022},fileName:'vendas.tsx'}).outputText,context);
 return renderToStaticMarkup(React.createElement(context.exports.Component,{created,company:{name:'Empresa fictícia',document:'teste'},clients:[],connected:true,fiscalDrafts:[],fiscalPrepareState:{},onNew:()=>{}}));
}
const order={id:'PED-1',type:'pedido',client:'Cliente sintético',createdAt:'2026-11-19T12:00:00Z',total:100,status:'Confirmado',order:{fiscalDocument:'nenhum'}};
const quote={id:'ORC-1',type:'orcamento',client:'Cliente sintético',createdAt:'2026-11-19T12:00:00Z',total:80,quote:{source:'vendas'}};
test('sem orçamento salvo não renderiza card vazio, mas mantém botão no topo',()=>{
 const html=render([order]);assert.match(html,/>Novo orçamento<\/button>/);assert.match(html,/> Novo pedido<\/button>/);assert.match(html,/<h2>Vendas<\/h2>/);assert.doesNotMatch(html,/<h2>Orçamentos<\/h2>|Orçamentos salvos|Criar primeiro orçamento|Nenhum orçamento salvo/);assert.match(html,/PED-1/);assert.match(html,/Pesquisar vendas/);
});
test('orçamentos salvos aparecem somente depois de Vendas e mantêm lista e ações',()=>{
 const html=render([order,quote]);assert.ok(html.indexOf('<h2>Vendas</h2>')<html.indexOf('<h2>Orçamentos</h2>'));assert.match(html,/ORC-1/);assert.match(html,/Compartilhar orçamento/);assert.match(html,/Ações da venda/);assert.doesNotMatch(html,/Operações comerciais|Orçamentos salvos/);
});

test('período personalizado inclui os dois limites e filtra a lista de vendas', () => {
 const records = [
  { ...order, id:'ANTES', createdAt:'2026-11-01T12:00:00Z' },
  { ...order, id:'INICIO', createdAt:'2026-11-02T12:00:00Z' },
  { ...order, id:'FIM', createdAt:'2026-11-05T23:00:00Z' },
  { ...order, id:'DEPOIS', createdAt:'2026-11-06T12:00:00Z' },
 ];
 const html=render(records,{start:'2026-11-02',end:'2026-11-05'});
 assert.match(html,/INICIO/);assert.match(html,/FIM/);
 assert.doesNotMatch(html,/ANTES|DEPOIS/);
 assert.ok(html.indexOf('Período das vendas')<html.indexOf('Novo pedido'));
 assert.match(render(records),/ANTES/);
 assert.match(render(records),/DEPOIS/);
});
