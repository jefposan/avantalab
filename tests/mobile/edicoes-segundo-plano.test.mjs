import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const fonte=readFileSync('public/mobile-app.js','utf8');
const ast=ts.createSourceFile('mobile.js',fonte,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),funcoes=new Map();
function visitar(n){if(ts.isFunctionDeclaration(n)&&n.name)funcoes.set(n.name.text,n.getText(ast));ts.forEachChild(n,visitar);}visitar(ast);
const tick=()=>new Promise(setImmediate);
function ambiente({armazenamento=new Map(),falhaLocal=false,erroRpc=null,pendente=false}={}){
  const item={id:1850,mes:'OUTUBRO',dia:20,valor:100,despesa:'Fornecedor',descricao:'Compra',status:'confirmada',revisao:3};
  const state={autenticado:true,usuario:{id:'user'},empresa:{id:'empresa'},ano:'2026',mes:'OUTUBRO',dadosCriticosProntos:true,lancamentos:[item],entradas:[],faturamentos:{OUTUBRO:0},modalAcao:{tipo:'despesa',item},financeiroCacheEpoca:0};
  const timers=[],rpc=[],toasts=[];let resolver;
  const gate=new Promise(r=>resolver=r);
  const ctx={state,edicoesFinanceirasMobile:[],edicoesConfirmadasMobile:[],edicoesEmGravacaoMobile:{},contextoEdicoesFinanceirasMobile:'',carregandoEdicoesFinanceirasMobile:null,geracaoEdicoesFinanceirasMobile:0,enviandoEdicoesFinanceirasMobile:false,timerEdicoesFinanceirasMobile:null,
    window:{crypto:webcrypto,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){}},navigator:{onLine:true},
    somenteModulosNoAppNativo:()=>false,ehLojaNativaMobile:()=>true,render(){},setErro:e=>state.modalAcao.erro=e,mostrarToast:e=>toasts.push(e),formatarDescricao:v=>v,
    promessaMobileComPrazo:p=>p,notificarFinanceiroAtualizadoMobile(){},atualizarPeriodoAposEdicaoMobile:async()=>{},
    solicitarDialogoSistemaMobile:async()=>'descartar',
    armazenamentoEdicoesFinanceirasMobile:async(acao,e)=>{if(falhaLocal)throw Error('quota');if(acao==='ler')return [...armazenamento.values()].map(v=>structuredClone(v));if(acao==='remover')armazenamento.delete(e.id);else armazenamento.set(e.id,structuredClone(e));},
    db:{auth:{getSession:async()=>({data:{session:{user:{id:state.usuario.id}}}})},rpc:async(nome,args)=>{rpc.push({nome,args});if(pendente)await gate;return erroRpc?{error:erroRpc}:{data:{registro:{id:1850,revisao:4,mes:'OUTUBRO',dia:21,valor:125,despesa_nome:'Fornecedor',descricao:'Nova',status:'confirmada'}}};}},
  };
  vm.createContext(ctx);vm.runInContext(['contextoEdicaoFinanceiraMobile','edicoesDoPerfilMobile','edicaoPendenteBloqueiaAcaoMobile','prepararEdicoesFinanceirasMobile','aplicarEdicoesPendentesMobile','enfileirarEdicaoFinanceiraMobile','agendarEnvioEdicoesFinanceirasMobile','enviarEdicoesFinanceirasMobile','aplicarDespesaPrevistaSalvaMobile','invalidarCacheFinanceiroMobile','avisoEdicoesFinanceirasMobileHtml','resolverEdicaoFinanceiraMobile'].map(n=>funcoes.get(n)).join('\n'),ctx);
  ctx.escapeHtml=String;
  const dados={ano:2026,mes:'OUTUBRO',dia:21,valor:125,status:'confirmada',despesa_nome:'Fornecedor',descricao:'Nova',tipo_obs:null};
  const projecao={...item,dia:21,valor:125,descricao:'Nova'};
  return {ctx,state,item,dados,projecao,armazenamento,rpc,toasts,timers,resolver,
    salvar:()=>ctx.enfileirarEdicaoFinanceiraMobile('despesa',item,dados,projecao)};
}
test('conexão lenta: edição fecha e altera lista antes de qualquer resposta do servidor, sem overlay',async()=>{
  const a=ambiente({pendente:true});assert.equal(await a.salvar(),true);
  assert.equal(a.state.modalAcao,null);assert.equal(a.state.lancamentos[0].valor,125);assert.equal(a.rpc.length,0);
  assert.equal(a.armazenamento.size,1);assert.ok(!a.state.aplicacaoLancamento);assert.ok(!a.state.carregando);
  assert.equal(a.toasts.length,0);assert.equal(a.ctx.avisoEdicoesFinanceirasMobileHtml(),'');
  const envio=a.ctx.enviarEdicoesFinanceirasMobile();await tick();assert.equal(a.rpc.length,1);assert.equal(a.armazenamento.size,1);
  a.resolver();await envio;assert.equal(a.armazenamento.size,0);assert.equal(a.state.lancamentos[0].revisao,4);
  assert.deepEqual(a.toasts,['Alteração salva.']);
  await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.toasts.length,1);
});
test('edição de receita também confirma uma única vez e somente depois do recibo',async()=>{
  const a=ambiente({pendente:true});a.state.lancamentos=[];a.state.entradas=[{...a.item,origem:'Cliente'}];
  await a.ctx.enfileirarEdicaoFinanceiraMobile('receita',a.state.entradas[0],a.dados,{...a.projecao,origem:'Cliente'});
  assert.equal(a.toasts.length,0);assert.equal(a.ctx.avisoEdicoesFinanceirasMobileHtml(),'');
  const envio=a.ctx.enviarEdicoesFinanceirasMobile();await tick();a.resolver();await envio;
  assert.deepEqual(a.toasts,['Alteração salva.']);
});
test('queda de rede preserva envio durável e reutiliza exatamente a mesma operação',async()=>{
  const a=ambiente({erroRpc:{message:'rede'}});await a.salvar();await a.ctx.enviarEdicoesFinanceirasMobile();
  assert.equal(a.armazenamento.size,1);assert.equal(a.ctx.edicoesFinanceirasMobile[0].bloqueada,false);
  assert.equal(a.toasts.length,0);assert.match(a.ctx.avisoEdicoesFinanceirasMobileHtml(),/Aguardando conexão/);
  await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.rpc[0].args.p_operacao_id,a.rpc[1].args.p_operacao_id);
  assert.equal(a.rpc[1].args.p_revisao,3);assert.equal(a.state.lancamentos[0].valor,125);
  assert.ok(a.timers.some(t=>t.ms>=2000));
});
test('reabrir restaura apenas pendências do usuário/perfil e mantém a edição visível',async()=>{
  const a=ambiente();await a.salvar();
  const b=ambiente({armazenamento:a.armazenamento});await b.ctx.prepararEdicoesFinanceirasMobile();
  assert.equal(b.state.lancamentos[0].valor,125);assert.equal(b.ctx.edicoesDoPerfilMobile().length,1);
  b.state.usuario={id:'outra-pessoa'};await b.ctx.prepararEdicoesFinanceirasMobile();
  assert.equal(b.ctx.edicoesDoPerfilMobile().length,0);await b.ctx.enviarEdicoesFinanceirasMobile();assert.equal(b.rpc.length,0);
});
test('sem gravação local não fecha editor, não altera financeiro e não envia',async()=>{
  const a=ambiente({falhaLocal:true});assert.equal(await a.salvar(),false);
  assert.ok(a.state.modalAcao);assert.match(a.state.modalAcao.erro,/Nada foi enviado/);assert.equal(a.state.lancamentos[0].valor,100);assert.equal(a.rpc.length,0);
});
test('conflito/revogação não descarta edição nem força sobrescrita',async()=>{
  for(const code of ['40001','42501']){
    const a=ambiente({erroRpc:{code,message:'negado'}});await a.salvar();await a.ctx.enviarEdicoesFinanceirasMobile();
    assert.equal(a.armazenamento.size,1);assert.equal(a.ctx.edicoesFinanceirasMobile[0].bloqueada,true);
    await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.rpc.length,1);
    assert.match(a.ctx.avisoEdicoesFinanceirasMobileHtml(),/operação pendente|não confirmada/);
  }
});
test('toque duplicado só guarda uma operação; pendência impede segunda edição do mesmo registro',async()=>{
  const a=ambiente();const r=await Promise.all([a.salvar(),a.salvar()]);assert.equal(r.filter(Boolean).length,1);assert.equal(a.armazenamento.size,1);
  a.state.modalAcao={item:a.item};assert.equal(await a.salvar(),false);assert.equal(a.armazenamento.size,1);
  const b=ambiente();b.state.modalAcao=null;
  assert.equal((await Promise.all([b.salvar(),b.salvar()])).filter(Boolean).length,1);assert.equal(b.armazenamento.size,1);
});
test('projeção de receita é idempotente mesmo com leituras/realtime e troca de mês',()=>{
  const a=ambiente();a.state.entradas=[{id:'r',mes:'OUTUBRO',valor:100,status:'confirmada'}];a.state.faturamentos.OUTUBRO=200;
  a.ctx.edicoesFinanceirasMobile=[{id:'e',usuarioId:'user',empresaId:'empresa',tipo:'receita',registroId:'r',ano:2026,projecao:{id:'r',mes:'OUTUBRO',valor:125,status:'confirmada'}}];
  for(let i=0;i<15;i++)a.ctx.aplicarEdicoesPendentesMobile();assert.equal(a.state.faturamentos.OUTUBRO,225);
  a.state.mes='NOVEMBRO';a.state.entradas=[];a.state.faturamentos={NOVEMBRO:300};
  for(let i=0;i<15;i++)a.ctx.aplicarEdicoesPendentesMobile();assert.equal(a.state.faturamentos.NOVEMBRO,300);assert.equal(a.state.faturamentos.OUTUBRO,undefined);
});
test('leitura iniciada antes do recibo não faz a despesa voltar ao valor antigo',async()=>{
  const a=ambiente();await a.salvar();await a.ctx.enviarEdicoesFinanceirasMobile();
  a.state.lancamentos=[{...a.item}];a.ctx.aplicarEdicoesPendentesMobile();
  assert.equal(a.state.lancamentos[0].valor,125);assert.equal(a.state.lancamentos[0].revisao,4);
  a.state.empresa={id:'outra'};a.state.lancamentos=[{...a.item}];a.ctx.aplicarEdicoesPendentesMobile();
  assert.equal(a.state.lancamentos[0].valor,100);
});
test('recibo de outro registro não remove pendência nem anuncia confirmação',async()=>{
  const a=ambiente();await a.salvar();a.ctx.db.rpc=async()=>({data:{registro:{id:999,revisao:4}}});
  await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.armazenamento.size,1);assert.equal(a.toasts.length,0);
});
test('excluir/aceitar novamente não concorre com pendência; descartar desfaz projeção, não grava no banco',async()=>{
  const a=ambiente({erroRpc:{code:'40001'}});await a.salvar();await a.ctx.enviarEdicoesFinanceirasMobile();
  assert.equal(a.ctx.edicaoPendenteBloqueiaAcaoMobile('despesa',1850),true);
  assert.equal(a.ctx.edicaoPendenteBloqueiaAcaoMobile('despesa',1851),false);
  await a.ctx.resolverEdicaoFinanceiraMobile(a.ctx.edicoesFinanceirasMobile[0].id,true);
  assert.equal(a.armazenamento.size,0);assert.equal(a.state.lancamentos[0].valor,100);assert.equal(a.rpc.length,1);
  const b=ambiente({erroRpc:{code:'40001'}});await b.salvar();await b.ctx.enviarEdicoesFinanceirasMobile();
  const guardar=b.ctx.armazenamentoEdicoesFinanceirasMobile;let liberar;
  b.ctx.armazenamentoEdicoesFinanceirasMobile=async(acao,e)=>{if(acao==='remover')await new Promise(r=>liberar=r);return guardar(acao,e);};
  const descarte=b.ctx.resolverEdicaoFinanceiraMobile(b.ctx.edicoesFinanceirasMobile[0].id,true);await tick();
  b.state.empresa={id:'outra'};b.state.lancamentos=[];liberar();await descarte;
  assert.equal(b.state.lancamentos.length,0,'trocar perfil durante o descarte não pode inserir o registro anterior');
});
test('Realtime financeiro não reinicia preparação nem lê todos os perfis ao confirmar uma edição',()=>{
  const corpo=funcoes.get('configurarRealtimeFinanceiroMobile');assert.match(corpo,/agendarAtualizacaoFinanceiraMobile/);
  const salvar=funcoes.get('salvarEdicaoLancamentoSelecionado');assert.match(salvar,/enfileirarEdicaoFinanceiraMobile/);
  assert.doesNotMatch(salvar,/iniciarAplicacaoLancamentoMobile|await carregarDados|db\.from|db\.rpc/);
  assert.match(funcoes.get('aceitarPrevistaHojeMobile'),/await enfileirarEdicaoFinanceiraMobile/);
  assert.doesNotMatch(funcoes.get('aceitarPrevistaHojeMobile'),/await carregarDados|db\.from/);
});
