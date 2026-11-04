import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const fonte=readFileSync('public/mobile-app.js','utf8');
const ast=ts.createSourceFile('mobile.js',fonte,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const funcoes=new Map();
function visitar(n){if(ts.isFunctionDeclaration(n)&&n.name)funcoes.set(n.name.text,n.getText(ast));ts.forEachChild(n,visitar);}visitar(ast);
function executar(nomes,ctx){vm.createContext(ctx);vm.runInContext(nomes.map(n=>funcoes.get(n)).join('\n'),ctx);return ctx;}
function editor({cancelar=false,rejeitar=false}={}){
  const campos={'editar-dia':'30','editar-valor':'100','editar-despesa':'Fornecedor','editar-descricao':'Compra','editar-parcela-atual':'3','editar-total-parcelas':'5'};
  const original={id:1850,mes:'SETEMBRO',dia:30,valor:100,despesa:'Fornecedor',descricao:'Compra (2/4)',tipo:'parcela'};
  const state={empresa:{id:'empresa'},modalAcao:{tipo:'despesa',modo:'editar',item:original},ano:'2026',mes:'SETEMBRO',erro:'',mensagem:'',carregando:false};
  const chamadas=[];
  const ctx=executar(['salvarEdicaoLancamentoSelecionado','lerParcelamentoEditavelMobile','descricaoComParcelamentoMobile','iniciarAplicacaoLancamentoMobile','falharAplicacaoLancamentoMobile','setErro','invalidarCacheFinanceiroMobile'],{
    state,campo:id=>campos[id]||'',normalizarValor:Number,formatarDescricao:v=>v,maxDias:()=>30,render(){},dataFutura:()=>false,indiceMes:()=>8,
    confirmarDespesasMesmoValorMobile:async()=>true,
    solicitarDialogoSistemaMobile:async()=>cancelar?'cancelar':'reorganizar',
    enfileirarEdicaoFinanceiraMobile:async(tipo,item,dados)=>{chamadas.push({tipo,item,dados});state.modalAcao.erro=rejeitar?'Não foi possível guardar no aparelho.':'Edição preservada para envio.';return false;},
  });
  return {ctx,state,original,chamadas};
}
test('fila recebe ID numérico e rascunho completo de parcelas sem alterar o original',async()=>{
  const a=editor();await a.ctx.salvarEdicaoLancamentoSelecionado(false);
  assert.equal(a.chamadas[0].item.id,1850);assert.equal(a.chamadas[0].tipo,'parcelamento');
  assert.equal(a.chamadas[0].dados.parcela_atual,3);assert.equal(a.chamadas[0].dados.total_parcelas,5);
  assert.equal(a.state.erro,'');assert.match(a.state.modalAcao.erro,/preservada/);
  assert.equal(a.state.modalAcao.rascunho.parcelaAtual,3);assert.equal(a.state.modalAcao.rascunho.totalParcelas,5);
  assert.equal(a.original.descricao,'Compra (2/4)');assert.ok(!a.state.aplicacaoLancamento);assert.equal(a.state.carregando,false);
  assert.doesNotMatch(a.state.modalAcao.erro,/invalid input|1850/);
});
test('cancelar reorganização mantém edição; falha local mantém formulário sem erro global',async()=>{
  const a=editor({cancelar:true});await a.ctx.salvarEdicaoLancamentoSelecionado(false);
  assert.equal(a.chamadas.length,0);assert.equal(a.state.modalAcao.rascunho.parcelaAtual,3);
  const b=editor({rejeitar:true});await b.ctx.salvarEdicaoLancamentoSelecionado(false);
  assert.match(b.state.modalAcao.erro,/aparelho/);assert.equal(b.state.erro,'');assert.ok(!b.state.aplicacaoLancamento);
});
test('dashboard não duplica erro do modal e aviso global expira sem apagar mensagem posterior',()=>{
  const timers=[],state={ano:'2026',mes:'OUTUBRO',erro:'Aviso A',mensagem:''};
  let renders=0;
  const a=executar(['alertaDashboardMobileHtml','alertaHtml','financeiroPeriodoChaveMobile'],{state,escapeHtml:String,window:{setTimeout:(fn,ms)=>timers.push({fn,ms})},render:()=>renders++});
  assert.match(a.alertaDashboardMobileHtml(),/Aviso A/);a.alertaDashboardMobileHtml();assert.equal(timers.length,1);assert.equal(timers[0].ms,6000);
  state.erro='Aviso B';a.alertaDashboardMobileHtml();timers[0].fn();assert.equal(state.erro,'Aviso B');
  timers[1].fn();assert.equal(state.erro,'');assert.equal(renders,1);
  state.modalAcao={erro:'Só no editor'};assert.equal(a.alertaDashboardMobileHtml(),'');
  assert.doesNotMatch(funcoes.get('modalAcaoLancamentoHtml'),/alertaHtml\(/);
  assert.match(funcoes.get('modalAcaoLancamentoHtml'),/acao\.erro[\s\S]*?role="alert"/);
});
test('pílulas de despesas/receitas mantêm forma final estática em cada reconstrução do DOM',()=>{
  const css=readFileSync('app/globals.css','utf8');
  assert.doesNotMatch(css,/@keyframes av-mobile-lancamentos-pilula-expandir|animation: av-mobile-lancamentos-pilula-expandir/);
  const a=executar(['controlesUltimosLancamentosHtml','iconeBuscaUltimas','iconeOrdemUltimas'],{premiumPessoalBloqueadoMobile:()=>false});
  for(const tipo of ['despesa','receita']){
    const c={tipo,expandido:true,total:12,ordem:'desc',pesquisando:false};
    const html=a.controlesUltimosLancamentosHtml(c);
    for(let i=0;i<20;i++)assert.equal(a.controlesUltimosLancamentosHtml(c),html);
    assert.match(html,/Recolher/);assert.match(html,/buscar-ultimas-/);
  }
});
