import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const fonte=readFileSync('public/mobile-app.js','utf8');
const ast=ts.createSourceFile('mobile.js',fonte,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),funcoes=new Map();
function visitar(n){if(ts.isFunctionDeclaration(n)&&n.name)funcoes.set(n.name.text,n.getText(ast));ts.forEachChild(n,visitar);}visitar(ast);
const meses=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
class DataFixa extends Date{constructor(...args){super(...(args.length?args:[2026,9,31,12]));}}
function ambiente(mes='SETEMBRO',ano='2025'){
  const state={mes,ano,apoioFinanceiroPronto:true,despesaDia:'',entradaDia:''};
  const ctx={state,meses,Date:DataFixa,indiceMes:m=>meses.indexOf(m),maxDias:(m,a)=>new Date(a,meses.indexOf(m)+1,0).getDate(),
    ehLojaNativaMobile:()=>true,financeiroMesProntoMobile:()=>true,somenteModulosNoAppNativo:()=>false,cancelarJanelasMobile(){state.modalLancamento=false;},render(){},limparErroLancamentoMobile(){},mostrarToast(){}};
  vm.createContext(ctx);vm.runInContext(['diaHojeLancamentoMobile','periodoLancamentoMobile','iniciarPeriodoLancamentoMobile','prepararNovoLancamentoMobile','mudarPeriodoLancamentoMobile','abrirLancamentoPelaNavegacao'].map(n=>funcoes.get(n)).join('\n'),ctx);
  return {state,ctx};
}
test('abrir pelo botão + herda mês e ano da dashboard, não o calendário do aparelho',()=>{
  const {state,ctx}=ambiente();ctx.abrirLancamentoPelaNavegacao();
  assert.equal(state.modalLancamento,true);assert.equal(ctx.periodoLancamentoMobile().mes,'SETEMBRO');assert.equal(ctx.periodoLancamentoMobile().ano,2025);
  assert.equal(state.despesaDia,'30');assert.equal(state.entradaDia,'30');
});
test('seletor interno continua independente, inclusive na virada de ano',()=>{
  const {state,ctx}=ambiente('DEZEMBRO','2027');ctx.abrirLancamentoPelaNavegacao();ctx.mudarPeriodoLancamentoMobile(1);
  assert.equal(ctx.periodoLancamentoMobile().mes,'JANEIRO');assert.equal(ctx.periodoLancamentoMobile().ano,2028);
  assert.equal(state.mes,'DEZEMBRO');assert.equal(state.ano,'2027');
});
test('cada nova abertura volta a herdar a seleção atual da dashboard, não a última do card',()=>{
  const {state,ctx}=ambiente();ctx.abrirLancamentoPelaNavegacao();ctx.mudarPeriodoLancamentoMobile(3);
  state.mes='FEVEREIRO';state.ano='2028';ctx.abrirLancamentoPelaNavegacao();
  assert.equal(ctx.periodoLancamentoMobile().mes,'FEVEREIRO');assert.equal(ctx.periodoLancamentoMobile().ano,2028);
  assert.equal(state.despesaDia,'29');assert.equal(state.entradaDia,'29');
});
test('período inválido usa calendário como fallback; campos preenchidos válidos são preservados',()=>{
  const {state,ctx}=ambiente('invalido','');state.despesaDia='5';state.entradaDia='10';ctx.prepararNovoLancamentoMobile();
  assert.equal(ctx.periodoLancamentoMobile().mes,'OUTUBRO');assert.equal(ctx.periodoLancamentoMobile().ano,2026);
  assert.equal(state.despesaDia,'5');assert.equal(state.entradaDia,'10');
});
test('perfil sem Financeiro continua impedido de abrir o lançamento',()=>{
  const {state,ctx}=ambiente();ctx.somenteModulosNoAppNativo=()=>true;ctx.abrirLancamentoPelaNavegacao();
  assert.ok(!state.modalLancamento);assert.equal(state.lancamentoAno,undefined);
});
