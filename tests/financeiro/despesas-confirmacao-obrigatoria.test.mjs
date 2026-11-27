import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const web=readFileSync('app/gestao/page.tsx','utf8'),mobile=readFileSync('public/mobile-app.js','utf8');
const ast=ts.createSourceFile('page.tsx',web,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['dataFutura','despesaRealizada','despesaProjetada'];
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const today=new Date(2026,10,27,12);
class FixedDate extends Date{constructor(...args){super(...(args.length?args:[today.getTime()]));}}
const ctx={Date:FixedDate};vm.runInNewContext(compile(functions),ctx);
test('despesa prevista nunca entra no realizado antes, no dia ou depois do vencimento',()=>{
 for(const tipo of ['fixa','parcela','previsto',null])for(const dia of [26,27,28]){
  const item={dia,tipo,status:'prevista',valor:100};assert.equal(ctx.despesaRealizada(item,2026,10),false);assert.equal(ctx.despesaProjetada(item,2026,10),true);assert.equal(item.status,'prevista');
 }
 assert.equal(ctx.despesaRealizada({dia:26,status:'confirmada'},2026,10),true);
});
test('card de confirmação inclui todas as previsões devidas, inclusive sem tipo ou parceladas',()=>{
 const start=web.indexOf('const despesasAConfirmar =');const code=web.slice(start,web.indexOf('\n);',start)+3);
 const lancamentos=['fixa','parcela','previsto',null].flatMap(tipo=>[26,27,28].map(dia=>({mes:'NOVEMBRO',tipo,dia,status:'prevista'})));
 const context={...ctx,lancamentos,anoSelecionado:'2026',meses:['NOVEMBRO'],dataFutura:(_a,_m,d)=>d>27};vm.runInNewContext(compile(code+'\nthis.result=despesasAConfirmar;'),context);assert.equal(context.result.length,8);assert.ok(context.result.every(i=>i.dia<=27));
});
test('Web cria parcelas programadas previstas, mesmo quando a primeira data é hoje',()=>{
 const start=web.indexOf('    const ehFuturo = dataFutura(anoParc');const code=web.slice(start,web.indexOf('    const salvo =',start));
 for(const totalParcelas of [1,3])for(const future of [false,true]){
  const c={totalParcelas,anoParc:2026,idxMes:10,formDia:'27',parseInt,dataFutura:()=>future};vm.runInNewContext(compile(code+'\nthis.result={tipoLanc,statusLanc};'),c);assert.equal(c.result.statusLanc,totalParcelas>1||future?'prevista':null);
 }
});
test('Mobile enfileira parcelas previstas e mantém vencidas em confirmação',()=>{
 const a=mobile.indexOf('      var dados = { ano: periodo.ano, mes: periodo.mes, dia: dia, valor: valor, despesa_nome: nome,');const code=mobile.slice(a,mobile.indexOf('      if (!await enfileirarMovimentoFinanceiroMobile',a));assert.ok(a>0);
 const c={periodo:{ano:2026,mes:'NOVEMBRO',indice:10},dia:27,valor:100,nome:'Despesa',descricao:'Teste',centroCustoId:null,totalParcelas:3,meses:['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'],formatarDescricao:x=>x,dataFutura:()=>false,maxDias:()=>30};
 vm.runInNewContext(code+'\nthis.result=projecoes;',c);assert.equal(c.result.length,3);assert.ok(c.result.every(p=>p.status==='prevista'&&p.tipo==='parcela'));
 const start=mobile.indexOf('  function ehDespesaAConfirmar(item)');const fn=mobile.slice(start,mobile.indexOf('\n  }',start)+4);const context={ehDespesaFutura:()=>false,indiceMes:()=>10};vm.runInNewContext(fn,context);assert.equal(context.ehDespesaAConfirmar({status:'prevista',tipo:'parcela',mes:'NOVEMBRO',dia:26}),true);assert.equal(context.ehDespesaAConfirmar({status:'confirmada',tipo:'fixa',mes:'NOVEMBRO',dia:26}),false);
});
