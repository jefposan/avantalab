import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const fonte=readFileSync('public/mobile-app.js','utf8'),ast=ts.createSourceFile('m.js',fonte,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),funcoes=new Map();
function visitar(n){if(ts.isFunctionDeclaration(n)&&n.name)funcoes.set(n.name.text,n.getText(ast));ts.forEachChild(n,visitar);}visitar(ast);
const nomes=['contextoEdicaoFinanceiraMobile','edicoesDoPerfilMobile','edicaoPendenteBloqueiaAcaoMobile','prepararEdicoesFinanceirasMobile','aplicarEdicoesPendentesMobile','registroFinanceiroDaFilaMobile','aplicarMovimentoLocalMobile','enfileirarMovimentoFinanceiroMobile','enfileirarExclusaoFinanceiraMobile','enviarMovimentoFinanceiroMobile','agendarEnvioEdicoesFinanceirasMobile','enviarEdicoesFinanceirasMobile','resolverEdicaoFinanceiraMobile','avisoEdicoesFinanceirasMobileHtml','salvarDespesa','salvarEntrada','excluirLancamentoSelecionado','excluirDespesaPrevista','excluirReceitaPrevista'];
const tick=()=>new Promise(setImmediate),meses=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
function ambiente({store=new Map(),lento=false,erroRpc=null,falhaLocal=false,anexoFalha=false}={}) {
  const item={id:1850,ano:2026,mes:'OUTUBRO',dia:20,valor:100,despesa:'Fornecedor',descricao:'Compra',revisao:2,status:'confirmada'};
  const state={autenticado:true,usuario:{id:'user'},empresa:{id:'empresa'},ano:2026,mes:'OUTUBRO',dadosCriticosProntos:true,lancamentos:[item],entradas:[],faturamentos:{OUTUBRO:200},modalLancamento:true,modalAcao:null,formParcelar:false,formParcelas:2};
  const campos={'despesa-dia':'20','despesa-nome':'Fornecedor','despesa-descricao':'Nova','despesa-valor':'125','entrada-dia':'20','entrada-origem':'Venda','entrada-valor':'125'};
  const chamadas=[],anexos=[],toasts=[],timers=[],recibos=new Map();let resolver,escolha='confirmar',erroAnexo=anexoFalha;
  const gate=new Promise(r=>resolver=r);
  const ctx={state,meses,edicoesFinanceirasMobile:[],edicoesConfirmadasMobile:[],edicoesEmGravacaoMobile:{},contextoEdicoesFinanceirasMobile:'',carregandoEdicoesFinanceirasMobile:null,geracaoEdicoesFinanceirasMobile:0,enviandoEdicoesFinanceirasMobile:false,timerEdicoesFinanceirasMobile:null,
    window:{crypto:webcrypto,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){}},navigator:{onLine:true},FormData,Blob,
    campo:n=>campos[n]||'',normalizarValor:Number,formatarDescricao:v=>v,escapeHtml:String,
    periodoLancamentoMobile:()=>({ano:2026,mes:'OUTUBRO',indice:9}),maxDias:(m,a)=>new Date(a,meses.indexOf(m)+1,0).getDate(),dataFutura:()=>false,
    confirmarDespesasMesmoValorMobile:async()=>true,limparRascunhoLancamentoMobile(){state.rascunhoLimpo=true;},centrosCustoAtivosMobile:()=>[],
    somenteModulosNoAppNativo:()=>false,ehLojaNativaMobile:()=>true,render(){},setErro:e=>state.erro=e,setErroLancamentoMobile:e=>state.lancamentoErro=e,mostrarToast:e=>toasts.push(e),
    promessaMobileComPrazo:p=>p,invalidarCacheFinanceiroMobile(){},notificarFinanceiroAtualizadoMobile(){},atualizarPeriodoAposEdicaoMobile:async()=>{},ehReceitaSincronizada:l=>l.tipo==='vendas_mobile_sistema',
    solicitarDialogoSistemaMobile:async()=>escolha,solicitarExclusaoDespesaFixaMobile:async()=>escolha,abrirModalMenuDespesasFixas(){state.fixasAberto=true;},
    iniciarAplicacaoLancamentoMobile(){throw Error('não pode bloquear');},carregarDados(){throw Error('não pode recarregar tudo');},
    armazenamentoEdicoesFinanceirasMobile:async(a,e)=>{if(falhaLocal)throw Error('quota');if(a==='ler')return [...store.values()].map(v=>structuredClone(v));if(a==='remover')store.delete(e.id);else store.set(e.id,structuredClone(e));},
    fetch:async(url,req)=>{anexos.push({url,req});return {ok:!erroAnexo,status:erroAnexo?503:200,json:async()=>({erro:erroAnexo})};},
    db:{auth:{getSession:async()=>({data:{session:{user:{id:state.usuario.id},access_token:'sessao-ficticia'}}})},rpc:async(nome,args)=>{
      chamadas.push({nome,args});if(lento)await gate;if(erroRpc)return {error:erroRpc};
      if(!recibos.has(args.p_operacao_id)) {
        const d=args.p_dados;
        const registros=args.p_acao==='incluir'?Array.from({length:d.parcelas||1},(_,i)=>({id:args.p_tipo==='receita'?'uuid-receita':2000+i,empresa_id:args.p_empresa_id,ano:d.ano,mes:d.mes,dia:d.dia,valor:d.valor,
          origem:d.origem,despesa_nome:d.despesa_nome,descricao:d.descricao||'',status:d.prevista?'prevista':null,revisao:1,operacao_mobile_id:args.p_operacao_id,operacao_mobile_indice:i})):[];
        const originais=args.p_acao==='excluir'?d.registros.map(l=>({id:l.id,empresa_id:args.p_empresa_id,nota_arquivo_path:item.notaArquivoPath||null})):[];
        recibos.set(args.p_operacao_id,{acao:args.p_acao,tipo:args.p_tipo,registros,originais});
      }
      return {data:structuredClone(recibos.get(args.p_operacao_id))};
    }},
  };
  vm.createContext(ctx);vm.runInContext(nomes.map(n=>funcoes.get(n)).join('\n'),ctx);
  return {ctx,state,item,campos,store,chamadas,anexos,toasts,timers,resolver,escolher:v=>escolha=v,liberarAnexo:()=>erroAnexo=false};
}
test('incluir despesa/receita fecha o card e atualiza sem RPC nem aguarde; servidor lento não bloqueia ações',async()=>{
  for(const tipo of ['despesa','receita']){
    const a=ambiente({lento:true});await a.ctx[tipo==='receita'?'salvarEntrada':'salvarDespesa']();
    assert.equal(a.state.modalLancamento,false);assert.equal(a.chamadas.length,0);assert.equal(a.store.size,1);
    assert.equal(a.toasts.length,0,'não mostrar confirmação antes do recibo');
    assert.equal(a.ctx.avisoEdicoesFinanceirasMobileHtml(),'','envio normal não cria painel extra');
    assert.equal([...a.store.values()][0].versao,2,'cliente anterior não deve interpretar inclusão/exclusão como edição');
    const lista=tipo==='receita'?a.state.entradas:a.state.lancamentos;assert.ok(lista.some(l=>String(l.id).startsWith('local:')));
    if(tipo==='receita')assert.equal(a.state.faturamentos.OUTUBRO,325);
    const envio=a.ctx.enviarEdicoesFinanceirasMobile();await tick();assert.equal(a.chamadas.length,1);assert.equal(a.store.size,1);
    assert.ok(!a.state.carregando);assert.ok(!a.state.aplicacaoLancamento);
    a.resolver();await envio;assert.equal(a.store.size,0);
    assert.deepEqual(a.toasts,['Lançamento salvo.']);
    await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.toasts.length,1,'nova rodada não repete sucesso');
    const final=tipo==='receita'?a.state.entradas:a.state.lancamentos;assert.ok(!final.some(l=>String(l.id).startsWith('local:')));
    if(tipo==='receita')assert.equal(a.state.faturamentos.OUTUBRO,325);
  }
});
test('excluir aparece imediatamente; confirmação de parcela/fixa e recusa sincronizada são preservadas',async()=>{
  const a=ambiente({lento:true});a.state.modalAcao={tipo:'despesa',item:a.item};await a.ctx.excluirLancamentoSelecionado();
  assert.equal(a.state.lancamentos.length,0);assert.equal(a.state.modalAcao,null);assert.equal(a.chamadas.length,0);
  assert.equal(a.toasts.length,0);assert.equal(a.ctx.avisoEdicoesFinanceirasMobileHtml(),'');
  const p=a.ctx.enviarEdicoesFinanceirasMobile();await tick();assert.equal(a.state.lancamentos.length,0);a.resolver();await p;assert.equal(a.store.size,0);
  assert.deepEqual(a.toasts,['Lançamento excluído.']);
  a.state.lancamentos=[{...a.item}];a.ctx.aplicarEdicoesPendentesMobile();assert.equal(a.state.lancamentos.length,0,'leitura velha não ressuscita exclusão');
  const b=ambiente();b.item.tipo='fixa';b.state.modalAcao={tipo:'despesa',item:b.item};b.escolher('cancelar');await b.ctx.excluirLancamentoSelecionado();assert.equal(b.store.size,0);
  b.escolher('excluir-mes');await b.ctx.excluirLancamentoSelecionado();assert.equal(b.store.size,1);
  const c=ambiente();c.item.descricao='Compra (1/2)';c.state.lancamentos.push({...c.item,id:1851,mes:'NOVEMBRO',descricao:'Compra (2/2)'});
  c.state.modalAcao={tipo:'despesa',item:c.item};c.escolher('todas');await c.ctx.excluirLancamentoSelecionado();assert.equal(c.ctx.edicoesDoPerfilMobile()[0].dados.registros.length,2);
  const d=ambiente();d.state.modalAcao={tipo:'receita',item:{id:'r',tipo:'vendas_mobile_sistema'}};await d.ctx.excluirLancamentoSelecionado();assert.equal(d.store.size,0);
});
test('reabertura e offline preservam inclusões/exclusões, conta/perfil isolados e mesmo identificador no reenvio',async()=>{
  for(const acao of ['incluir','excluir']){
    const a=ambiente({erroRpc:{message:'rede'}});
    if(acao==='incluir')await a.ctx.salvarEntrada();else await a.ctx.enfileirarExclusaoFinanceiraMobile('despesa',[a.item]);
    a.ctx.navigator.onLine=false;await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.chamadas.length,0);
    assert.match(a.ctx.avisoEdicoesFinanceirasMobileHtml(),/aguardando envio/);
    assert.equal(a.toasts.length,0,'offline nunca anuncia salvamento confirmado');
    a.ctx.navigator.onLine=true;await a.ctx.enviarEdicoesFinanceirasMobile();await a.ctx.enviarEdicoesFinanceirasMobile();
    assert.equal(a.chamadas[0].args.p_operacao_id,a.chamadas[1].args.p_operacao_id);
    const b=ambiente({store:a.store});await b.ctx.prepararEdicoesFinanceirasMobile();
    assert.equal(acao==='incluir'?b.state.entradas.length:b.state.lancamentos.length,acao==='incluir'?1:0);
    b.state.empresa={id:'outra'};await b.ctx.prepararEdicoesFinanceirasMobile();assert.equal(b.ctx.edicoesDoPerfilMobile().length,0);await b.ctx.enviarEdicoesFinanceirasMobile();assert.equal(b.chamadas.length,0);
  }
});
test('sem persistência local mantém formulário, anexo e dados, sem enviar; toque duplicado gera uma inclusão',async()=>{
  const a=ambiente({falhaLocal:true});a.state.notaArquivoPendente=new Blob(['nota'],{type:'image/png'});await a.ctx.salvarDespesa();
  assert.equal(a.state.modalLancamento,true);assert.ok(a.state.notaArquivoPendente);assert.equal(a.state.lancamentos.length,1);assert.equal(a.chamadas.length,0);assert.match(a.state.lancamentoErro,/Nada foi enviado/);
  const b=ambiente();await Promise.all([b.ctx.salvarEntrada(),b.ctx.salvarEntrada()]);assert.equal(b.store.size,1);assert.equal(b.state.faturamentos.OUTUBRO,325);
});
test('projeção de receitas, Realtime e recibos não duplicam linha nem total, e protegem registro real ainda pendente',async()=>{
  const a=ambiente();await a.ctx.salvarEntrada();const e=a.ctx.edicoesDoPerfilMobile()[0];
  for(let i=0;i<20;i++)a.ctx.aplicarEdicoesPendentesMobile();assert.equal(a.state.faturamentos.OUTUBRO,325);assert.equal(a.state.entradas.length,1);
  a.state.entradas=[{id:'real',ano:2026,mes:'OUTUBRO',dia:20,valor:125,status:null,operacaoMobileId:e.id,operacaoMobileIndice:0,revisao:1}];a.state.faturamentos.OUTUBRO=325;
  for(let i=0;i<20;i++)a.ctx.aplicarEdicoesPendentesMobile();assert.equal(a.state.faturamentos.OUTUBRO,325);assert.equal(a.state.entradas[0].id,'real');assert.equal(a.state.entradas.length,1);
  assert.equal(a.ctx.edicaoPendenteBloqueiaAcaoMobile('receita','real'),true);
  a.state.mes='NOVEMBRO';a.state.entradas=[];a.state.faturamentos={NOVEMBRO:50};a.ctx.aplicarEdicoesPendentesMobile();assert.equal(a.state.entradas.length,0);assert.equal(a.state.faturamentos.NOVEMBRO,50);
});
test('conflito/revogação mantém pendência e permite desfazer apenas a projeção local não confirmada',async()=>{
  for(const acao of ['incluir','excluir']){
    const a=ambiente({erroRpc:{code:'40001'}});if(acao==='incluir')await a.ctx.salvarEntrada();else await a.ctx.enfileirarExclusaoFinanceiraMobile('despesa',[a.item]);
    await a.ctx.enviarEdicoesFinanceirasMobile();const e=a.ctx.edicoesDoPerfilMobile()[0];assert.equal(e.bloqueada,true);assert.equal(a.store.size,1);
    a.escolher('descartar');await a.ctx.resolverEdicaoFinanceiraMobile(e.id,true);assert.equal(a.store.size,0);
    assert.equal(a.state.lancamentos.length,1);assert.equal(a.state.entradas.length,0);assert.equal(a.state.faturamentos.OUTUBRO,200);assert.equal(a.chamadas.length,1);
  }
});
test('anexo fica durável; recibo é gravado antes do upload e reenvio do anexo não repete inclusão',async()=>{
  const a=ambiente({anexoFalha:true});a.state.notaArquivoPendente=new Blob(['nota fictícia'],{type:'image/png'});await a.ctx.salvarDespesa();
  assert.equal(a.state.notaArquivoPendente,null);assert.equal([...a.store.values()][0].anexo.size,14);
  await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.chamadas.length,1);assert.equal(a.anexos.length,1);assert.equal(a.store.size,1);assert.ok([...a.store.values()][0].resultadoServidor);
  assert.equal(a.toasts.length,0,'anexo pendente não pode anunciar operação concluída');
  assert.match(a.ctx.avisoEdicoesFinanceirasMobileHtml(),/anexo/);
  const b=ambiente({store:a.store});await b.ctx.prepararEdicoesFinanceirasMobile();await b.ctx.enviarEdicoesFinanceirasMobile();
  assert.equal(b.chamadas.length,0);assert.equal(b.anexos.length,1);assert.equal(b.store.size,0);assert.equal(b.anexos[0].req.method,'POST');
  assert.deepEqual(b.toasts,['Lançamento salvo.']);
  assert.match(b.anexos[0].url,/empresaId=empresa/);assert.equal(b.anexos[0].req.headers.Authorization,'Bearer sessao-ficticia');
});
test('nota excluída só é removida após recibo financeiro; falha não repete exclusão',async()=>{
  const a=ambiente({anexoFalha:true});a.item.notaArquivoPath='empresa/1850.png';await a.ctx.enfileirarExclusaoFinanceiraMobile('despesa',[a.item]);assert.equal(a.anexos.length,0);
  await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.anexos[0].req.method,'DELETE');assert.equal(a.store.size,1);
  a.liberarAnexo();await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.chamadas.length,1);assert.equal(a.anexos.length,2);assert.equal(a.store.size,0);
});
test('parcelas têm data válida inclusive ano seguinte e guardam todo o plano numa única operação',async()=>{
  const a=ambiente();a.ctx.periodoLancamentoMobile=()=>({ano:2026,mes:'DEZEMBRO',indice:11});a.campos['despesa-dia']='31';a.state.formParcelar=true;a.state.formParcelas=3;
  await a.ctx.salvarDespesa();const e=a.ctx.edicoesDoPerfilMobile()[0];assert.equal(a.store.size,1);
  assert.deepEqual(Array.from(e.projecoes,l=>[l.ano,l.mes,l.dia]),[[2026,'DEZEMBRO',31],[2027,'JANEIRO',31],[2027,'FEVEREIRO',28]]);
});
test('receita excluída subtrai total uma vez e previstas usam a mesma fila sem total efetivado',async()=>{
  const a=ambiente();const r={id:'r',ano:2026,mes:'OUTUBRO',dia:20,valor:50,status:null,revisao:1,origem:'Venda'};a.state.entradas=[r];
  await a.ctx.enfileirarExclusaoFinanceiraMobile('receita',[r]);for(let i=0;i<20;i++)a.ctx.aplicarEdicoesPendentesMobile();assert.equal(a.state.faturamentos.OUTUBRO,150);
  const b=ambiente();b.item.status='prevista';await b.ctx.excluirDespesaPrevista(1850);assert.equal(b.state.lancamentos.length,0);assert.equal(b.store.size,1);
  const c=ambiente();c.state.entradas=[{...r,status:'prevista'}];await c.ctx.excluirReceitaPrevista('r');assert.equal(c.state.entradas.length,0);assert.equal(c.state.faturamentos.OUTUBRO,200);
});
test('papel operacional impede exclusão não autorizada antes de alterar a lista',async()=>{
  for(const perfil of ['operador_simples','operador_completo']){
    const a=ambiente();a.state.empresa.perfil=perfil;
    assert.equal(await a.ctx.enfileirarExclusaoFinanceiraMobile('despesa',[a.item]),false);assert.equal(a.state.lancamentos.length,1);assert.equal(a.store.size,0);
  }
  const b=ambiente();b.state.empresa.perfil='operador_completo';b.item.tipo='fixa';assert.equal(await b.ctx.enfileirarExclusaoFinanceiraMobile('despesa',[b.item]),true);
  const c=ambiente();c.state.caixinhaMovimentos=[{id:'aporte',lancamentoId:1850}];assert.equal(await c.ctx.enfileirarExclusaoFinanceiraMobile('despesa',[c.item]),false);assert.match(c.toasts.at(-1),/Caixinha/);
});
test('exclusões sobrepostas reservam os registros durante a gravação local',async()=>{
  const a=ambiente();const segundo={...a.item,id:1851};a.state.lancamentos.push(segundo);
  const r=await Promise.all([a.ctx.enfileirarExclusaoFinanceiraMobile('despesa',[a.item,segundo]),a.ctx.enfileirarExclusaoFinanceiraMobile('despesa',[a.item])]);
  assert.equal(r.filter(Boolean).length,1);assert.equal(a.store.size,1);
});
test('recibo inválido não confirma; resposta depois da troca de perfil não altera o novo perfil nem envia anexos',async()=>{
  const a=ambiente();await a.ctx.salvarEntrada();a.ctx.db.rpc=async()=>({data:{acao:'incluir',tipo:'receita',registros:[{id:'x',empresa_id:'outra'}],originais:[]}});
  await a.ctx.enviarEdicoesFinanceirasMobile();assert.equal(a.store.size,1);assert.equal(a.toasts.length,0);
  const b=ambiente({lento:true});b.state.notaArquivoPendente=new Blob(['nota'],{type:'image/png'});await b.ctx.salvarDespesa();
  const envio=b.ctx.enviarEdicoesFinanceirasMobile();await tick();b.state.empresa={id:'outra'};b.state.lancamentos=[];b.resolver();await envio;
  assert.equal(b.state.lancamentos.length,0);assert.equal(b.anexos.length,0);assert.equal(b.store.size,1);assert.ok([...b.store.values()][0].resultadoServidor);
  b.state.empresa={id:'empresa'};await b.ctx.prepararEdicoesFinanceirasMobile();await b.ctx.enviarEdicoesFinanceirasMobile();assert.equal(b.chamadas.length,1);assert.equal(b.anexos.length,1);assert.equal(b.store.size,0);
});
test('planos distintos/ambíguos não são agrupados para exclusão; fechar confirmação de fixa não exclui',async()=>{
  const a=ambiente();a.item.descricao='Compra (1/2)';a.item.operacaoMobileId='plano-a';
  a.state.lancamentos.push({...a.item,id:1851,mes:'NOVEMBRO',descricao:'Compra (2/2)',operacaoMobileId:'plano-b'});
  a.state.modalAcao={tipo:'despesa',item:a.item};a.escolher('todas');await a.ctx.excluirLancamentoSelecionado();assert.equal(a.ctx.edicoesDoPerfilMobile()[0].dados.registros.length,1);assert.equal(a.state.lancamentos.length,1);
  const b=ambiente();b.item.tipo='fixa';b.item.status='prevista';b.escolher(undefined);await b.ctx.excluirDespesaPrevista(1850);assert.equal(b.store.size,0);
});
