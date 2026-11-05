import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {emptyFiscal} from '../../app/modules/marketplaces/fiscal-state.ts';
import * as statuses from '../../app/modules/marketplaces/sales-status.ts';
const file=readFileSync('app/marketplaces/Vendas.tsx','utf8'),ast=ts.createSourceFile('Vendas.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='Vendas');
const id='33333333-3333-4333-8333-333333333333';
function render(overrides={},canManage=true,labelFormat='zpl2'){
  const sale={id,connectionId:'account',orderId:'2000019139347426',soldAt:'2026-10-23T18:55:00Z',items:[{title:'Calculadora Elgin',quantity:1,unitPrice:580}],total:580,status:'paid',shipmentStatus:'ready_to_ship',shipmentSubstatus:'invoice_pending',labelStatus:'unavailable',...overrides};
  const queue=['',id,'',null,labelFormat,null,'',null,false,'','','desc'];let index=0;
  const exports={},require=createRequire(import.meta.url),Pass=({children})=>React.createElement('div',{},children),Button=({children,onClick,disabled,'aria-label':ariaLabel})=>React.createElement('button',{onClick,disabled,'aria-label':ariaLabel},children);
  vm.runInNewContext(ts.transpileModule(fn.getText(ast).replace('export default','export'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,require,...statuses,useState:()=>[queue[index++],()=>{}],useRef:()=>({current:false}),useMemo:f=>f(),useCallback:f=>f,useEffect(){},
    styles:new Proxy({},{get:(_,k)=>String(k)}),saleLayout:new Proxy({},{get:(_,k)=>String(k)}),money:new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}),date:new Intl.DateTimeFormat('pt-BR'),
    sortSalesByDate:s=>s,providerBrand:()=>({name:'Mercado Livre',logo:'/images/marketplaces/mercado-livre.png'}),accountDisplayName:()=> 'JEFF',
    Icon:()=>null,BotaoExpandirCard:()=>null,BotaoAcaoCompacto:Button,DetalhesRolaveis:Pass,Tooltip:Pass,DateOrderButton:()=>null,MarketplaceSelect:()=>null,CarregamentoDadosModulo:()=>null,
    SaleFiscalDocuments:()=>null,SaleItems:()=>React.createElement('span',{},'Calculadora Elgin'),SalePostSale:()=>React.createElement('h3',{},'Pós-venda · Mercado Livre'),ModalConfirmacao:()=>null,
  });
  return renderToStaticMarkup(React.createElement(exports.Vendas,{companyId:'company',accountId:'',onAccountChange(){},group:'',onGroupChange(){},counts:{},total:1,accounts:[],marketplaceOptions:[],selectedMarketplaces:[],onMarketplacesChange(){},sales:[sale],canManage,loading:false,error:'',awaitingUpdates:0,onRefresh(){},onSaleUpdated(){},expanded:true,onExpandedChange(){},saleToOpen:id,dark:false,brand:'#cf0201'}));
}
test('ação fiscal está dentro do pedido, entre o aviso da etiqueta e Pós-venda',()=>{
  const html=render();assert.ok(html.indexOf('A etiqueta será liberada')<html.indexOf('Solicitar DC-e'));
  assert.ok(html.indexOf('Solicitar DC-e')<html.indexOf('Pós-venda · Mercado Livre'));
  assert.match(html,/Consultar etiqueta/);
  assert.match(html,/aria-label="Documento e etiqueta"/);
});
test('a mesma faixa apresenta imprimir ou reimprimir conforme liberação do ML',()=>{
  for (const [shipmentSubstatus,label] of [['ready_to_print','Imprimir etiqueta'],['printed','Reimprimir etiqueta']]) {
    const html=render({labelStatus:'ready',shipmentSubstatus},true,'pdf');
    assert.match(html,/aria-label="Documento e etiqueta"/);
    assert.ok(html.includes(label));
    assert.doesNotMatch(html,/Solicitar DC-e|Consultar etiqueta/);
    assert.ok(html.indexOf(label)<html.indexOf('Pós-venda · Mercado Livre'));
  }
});
test('DC-e solicitada mantém aviso e botão inativo até a etiqueta ser liberada',()=>{
  const html=render({dceRequested:true});
  assert.match(html,/DC-e solicitada\. Aguarde a liberação da etiqueta/);
  assert.match(html,/<button disabled="">DC-e solicitada<\/button>/);
  assert.match(html,/Consultar etiqueta/);
  assert.doesNotMatch(html,/Solicitar DC-e/);
  const ready=render({dceRequested:true,labelStatus:'ready',shipmentSubstatus:'ready_to_print'});
  assert.match(ready,/PDF · 100 × 150 mm/);
  assert.match(ready,/Imprimir/);
  assert.doesNotMatch(ready,/<button disabled="">DC-e solicitada<\/button>/);
  assert.match(ready,/DC-e solicitada/);
  assert.doesNotMatch(ready,/Aguarde a liberação|Consultar etiqueta/);
});
test('confirmação fiscal persiste junto ao envio programado; incerteza não é anunciada como aceite',()=>{
  const html=render({shipmentStatus:'pending',shipmentSubstatus:'buffered',dceRequested:true,dceStatus:'requested'});
  assert.match(html,/Envio programado/);assert.match(html,/DC-e solicitada\. Aguarde/);assert.match(html,/<button disabled="">DC-e solicitada<\/button>/);
  assert.doesNotMatch(html,/Solicitar DC-e/);
  const uncertain=render({shipmentStatus:'pending',shipmentSubstatus:'buffered',dceRequested:true,dceStatus:'uncertain'});
  assert.match(uncertain,/sem confirmação do Mercado Livre/);assert.match(uncertain,/<button disabled="">DC-e solicitada<\/button>/);
  const absent=render({shipmentStatus:'pending',shipmentSubstatus:'buffered',dceStatus:'not_requested'});
  assert.match(absent,/Ainda não foi possível confirmar/);assert.doesNotMatch(absent,/DC-e solicitada/);
});
test('envio programado conserva consulta sem oferecer emissão ou impressão',()=>{
  const html=render({shipmentStatus:'pending',shipmentSubstatus:'buffered'});
  assert.match(html,/Consultar etiqueta/);
  assert.doesNotMatch(html,/Solicitar DC-e|Imprimir etiqueta/);
  assert.equal(statuses.canConsultSaleLabel({status:'paid',shipmentStatus:'ready_to_ship',shipmentSubstatus:'ready_to_print',labelStatus:'ready'}),false);
  assert.equal(statuses.canConsultSaleLabel({status:'cancelled',shipmentStatus:'pending',shipmentSubstatus:'buffered',labelStatus:'unavailable'}),false);
});
test('programado, cancelado, etiqueta pronta e operador de consulta não exibem emissão',()=>{
  for(const sale of [{shipmentSubstatus:'buffered'},{status:'cancelled'},{labelStatus:'ready',shipmentSubstatus:'ready_to_print'},{provider:'magalu'}])assert.doesNotMatch(render(sale),/Solicitar DC-e/);
  assert.doesNotMatch(render({},false),/Solicitar DC-e/);
});
const issueFn=fn.body.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='issueDce');
test('retorno aceito ou incerto bloqueia nova emissão; falha confirmada preserva recuperação',async()=>{
  for(const code of ['success',undefined,'dce_uncertain','dce_receipt_pending','sale_changed']){
    const updates=[],feedback=[],exports={};
    const sale={id,status:'paid',shipmentStatus:'ready_to_ship',shipmentSubstatus:'invoice_pending',labelStatus:'unavailable'};
    vm.runInNewContext(ts.transpileModule('export '+issueFn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
      exports,...statuses,emptyFiscal,dceLock:{current:false},canManage:true,companyId:'company',setIssuingDce(){},setDceFinished(){},setDceFeedback:v=>feedback.push(v),onSaleUpdated:v=>updates.push(v),
      marketplaceClientRequest:async()=>{if(code==='success')return{message:'DC-e solicitada'};throw Object.assign(new Error('Retorno fiscal'),{code});},Error,
    });
    await exports.issueDce(sale);
    assert.equal(updates.length,code==='sale_changed'?0:1);
    if(updates.length)assert.equal(statuses.canIssueDce(updates[0]),false);
    assert.ok(feedback.at(-1).message);
  }
});
