import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const fonte = readFileSync('public/mobile-app.js', 'utf8');
const ast = ts.createSourceFile('mobile.js', fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const funcs = new Map();
function visitar(n) { if (ts.isFunctionDeclaration(n) && n.name) funcs.set(n.name.text, n.getText(ast)); ts.forEachChild(n, visitar); } visitar(ast);
const nomes = ['contextoProgressivoMobile', 'financeiroPeriodoChaveMobile', 'financeiroMesProntoMobile', 'requisitarAcessoProgressivoMobile', 'buscarFinanceiroPeriodoMobile', 'carregarDadosProgressivosMobile', 'validarLeituraFinanceiraProgressivaMobile'];
nomes.push('finalizarBarraPreparacaoMobile', 'aplicarFinanceiroPeriodoMobile', 'saldoAnteriorProntoMobile', 'evolucaoProntaMobile', 'caixinhaDashboardProntaMobile', 'agendarComplementosDashboardMobile', 'carregarComplementosDashboardMobile', 'indicadorCardAutomaticoMobileHtml');
nomes.push('invalidarCacheFinanceiroMobile', 'financeiroCacheVigenteMobile', 'obterFinanceiroPeriodoCacheMobile', 'carregarPeriodoPreparadoMobile');
const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const tick = () => new Promise(resolve => setImmediate(resolve));
function pendencia() { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; }
function ambiente(o = {}) {
  const consultas = [], telas = [], requests = [], progresso = [];
  const state = { autenticado: true, usuario: { id: 'user' }, empresa: { id: 'empresa', telefone_confirmado: true }, ano: '2026', mes: 'OUTUBRO', cargaPerfilGeracao: 0, lancamentos: [], entradas: [], faturamentos: {} };
  const ctx = { state, meses, aplicarEdicoesPendentesMobile() {}, prepararEdicoesFinanceirasMobile: async () => {}, console: { warn() {} }, Date, String, Number, Boolean, Array, Promise, Error, encodeURIComponent, window: { setTimeout: fn => setTimeout(fn, 1), __avantalabConfirmarAcessoMobile() {} }, render() { telas.push({ abertura: state.aberturaProgressiva, pronto: state.dadosCriticosProntos, financeiro: state.financeiroPeriodoPronto, lancamentos: state.lancamentos.length }); },
    ehLojaNativaMobile: () => true, somenteModulosNoAppNativo: () => false, tokenSessao: async () => 'token', recuperarSessaoExpiradaMobile: async () => {}, prepararModulosAppNativo: async () => { state.restrito = true; }, ehContaRevisaoAppAppleMobile: () => false,
    confirmarSessaoDispositivoMobile: async () => { if (o.sessaoGate) await o.sessaoGate.promise; return { ativa: o.sessao !== false }; }, iniciarControleSessaoDispositivoMobile() {}, deveExibirCadastroPerfilMobile: () => state.cadastroPerfilStatus?.completo === false,
    nomeEmpresa: e => e.nome || 'Empresa', formatarDescricao: v => v, premiumPessoalBloqueadoMobile: () => o.premium === true, sincronizarCentroCustoSelecionadoMobile() {}, indiceMes: m => meses.indexOf(m), cardsDashboardVisiveis: () => o.visiveis || [],
    promessaMobileComPrazo: p => Promise.resolve(p), agendarPreCargaFinanceiroMobile() {}, carregarSecundariosProgressivosMobile: async () => { requests.push('secundarios'); if (o.secundarios) await o.secundarios.promise; },
    atualizarProgressoAcessoMobile(grupo, concluido, total, rotulo) { progresso.push({ grupo, concluido, total, rotulo, dashboardPronta: state.dadosCriticosProntos === true }); ctx.window.__avantalabAtualizarProgressoMobile?.(grupo, concluido, total, rotulo); },
    aguardarPinturaProgressoMobile: async ms => { assert.equal(ms, 0); if (o.pintura) await o.pintura.promise; },
    requisitarJsonMobile: async (url, opts, prazo) => {
      requests.push({ url, prazo });
      if (o.acessoGate && url.includes('acessos-usuario')) await o.acessoGate.promise;
      if (o.planoGate && url.includes('cobranca/estado')) await o.planoGate.promise;
      if (o.cadastroGate && url.includes('perfil-cadastro')) await o.cadastroGate.promise;
      let json = url.includes('acessos-usuario') ? { perfis: [{ empresa: { id: 'empresa' }, dashboard: o.dashboard !== false, modulos: [] }] } : url.includes('cobranca/estado') ? { precisaPaywall: o.paywall === true } : { ok: true, completo: !o.incompleto };
      if (o.invalido) json = {};
      return { resposta: { ok: !o.negado, status: o.negado ? 403 : 200 }, json };
    },
    db: { from(tabela) {
      const q = { tabela, filtros: {}, inicio: 0, select() { return q; }, eq(k,v) { q.filtros[k] = v; return q; }, order() { return q; }, range(inicio) { q.inicio = inicio; return q; }, maybeSingle() { return q; }, async then(resolve, reject) {
        consultas.push({ tabela, filtros: { ...q.filtros }, inicio: q.inicio });
        try {
          if (o.financeiro && tabela === 'lancamentos') await o.financeiro.promise;
          if (o.configGate && tabela === 'configuracoes') await o.configGate.promise;
          if (o.centrosGate && tabela === 'centros_custo') await o.centrosGate.promise;
          const data = tabela === 'configuracoes' ? { centros_custo_ativo: false } : tabela === 'lancamentos' ? [{ id: 'l', mes: q.filtros.mes, dia: 1, valor: 10 }] : tabela === 'faturamentos' ? [{ mes: q.filtros.mes, valor: 50 }] : [];
          resolve({ data, error: o.erroTabela === tabela ? Error('Falha') : null });
        } catch (e) { reject(e); }
      } }; return q;
    } },
  };
  vm.createContext(ctx); vm.runInContext(nomes.map(n => funcs.get(n)).join('\n'), ctx);
  return { ctx, state, consultas, telas, requests, progresso };
}

test('preparação abre antes da autorização; nenhum financeiro é lido antes das permissões', async () => {
  const acessoGate = pendencia(), a = ambiente({ acessoGate });
  const p = a.ctx.carregarDadosProgressivosMobile(); await tick();
  assert.equal(a.telas[0].abertura, true); assert.equal(a.consultas.length, 0);
  acessoGate.resolve(); await p;
});

// Executa o seletor de telas e o card reais, sem recriar suas condições no teste.
function renderizacaoReal(a, nativo = true) {
  const selecao = funcs.get('render');
  const inicio = selecao.indexOf("root.setAttribute('data-avantalab-mobile-ready'");
  const fim = selecao.indexOf('window.dispatchEvent', inicio);
  assert.ok(inicio > 0 && fim > inicio);
  const atributos = new Map(), cenas = [];
  Object.assign(a.ctx, {
    root: { setAttribute: (k, v) => atributos.set(k, v), removeAttribute: k => atributos.delete(k), getAttribute: k => atributos.get(k),
      set innerHTML(html) { cenas.push(html); } },
    URLSearchParams, previaConfirmacaoCelular: false,
    ehLojaNativaMobile: () => nativo, loginSocialMobileEmAndamento: () => false,
    escapeHtml: v => String(v), configurarCamadaFundoChatIA() {}, removerChatIAOverlay() {},
    ehFuncionarioPontoMobile: () => false,
    telaApp: () => '<main data-dashboard>Dashboard</main>',
    telaAvisoMobile: () => '<main data-erro>Erro de acesso</main>',
    dialogoSistemaMobileHtml: () => '', avisoAssinanteMobileHtml: () => '', ativacaoVendasMobileHtml: () => '',
  });
  a.ctx.window.location = { search: '' };
  vm.runInContext(['cenaAcessoGestaoMobile', 'renderLoadingPreparacaoMobile', 'telaCarregandoMobile', 'telaPreparacaoAcessoMobileVisivel'].map(n => funcs.get(n)).join('\n') + '\nfunction render() {' + selecao.slice(inicio, fim) + '}', a.ctx);
  return { atributos, cenas };
}

test('login, autorização lenta e perfil usam um único card padrão, seguido diretamente da dashboard', async () => {
  const acessoGate = pendencia(), sessaoGate = pendencia(), financeiro = pendencia(), secundarios = pendencia();
  const a = ambiente({ acessoGate, sessaoGate, financeiro, secundarios });
  const ui = renderizacaoReal(a);
  Object.assign(a.state, { autenticado: false, pronto: false });
  a.ctx.render();
  const cardInicial = ui.cenas[0];
  assert.match(cardInicial, /class="gestao-access-card" role="status"/);
  assert.match(cardInicial, /Preparando acesso/);
  assert.match(cardInicial, /gestao-access-loader/);
  assert.match(cardInicial, /mobileAccessProgressBar/);
  a.state.autenticado = true;
  const carga = a.ctx.carregarDadosProgressivosMobile(); await tick();
  assert.equal(ui.cenas.at(-1), cardInicial);
  assert.equal(a.ctx.telaPreparacaoAcessoMobileVisivel(), true);
  assert.equal(a.consultas.length, 0);
  acessoGate.resolve(); await tick();
  a.ctx.render(); // Re-render enquanto a sessão do dispositivo ainda responde.
  assert.equal(ui.cenas.at(-1), cardInicial);
  assert.equal(a.ctx.telaPreparacaoAcessoMobileVisivel(), true);
  assert.equal(a.consultas.length, 0);
  sessaoGate.resolve(); await tick();
  assert.equal(ui.cenas.at(-1), cardInicial);
  assert.equal(a.ctx.telaPreparacaoAcessoMobileVisivel(), true);
  financeiro.resolve(); await tick();
  assert.equal(ui.cenas.at(-1), '<main data-dashboard>Dashboard</main>');
  assert.equal(a.ctx.telaPreparacaoAcessoMobileVisivel(), false);
  secundarios.resolve(); await carga;
  const transicoes = ui.cenas.filter((html, i) => i === 0 || html !== ui.cenas[i - 1]);
  assert.deepEqual(transicoes, [cardInicial, '<main data-dashboard>Dashboard</main>']);
  assert.doesNotMatch(fonte, /estruturaProgressivaMobileHtml|Preparando seu perfil…/);
});

test('erro de autorização sai da preparação para recuperação, sem dashboard ou financeiro', async () => {
  const a = ambiente({ negado: true }); const ui = renderizacaoReal(a);
  await a.ctx.carregarDadosProgressivosMobile();
  assert.match(ui.cenas[0], /Preparando acesso/);
  assert.equal(ui.cenas.at(-1), '<main data-erro>Erro de acesso</main>');
  assert.equal(a.ctx.telaPreparacaoAcessoMobileVisivel(), false);
  assert.equal(a.consultas.length, 0);
});

test('PWA mantém seu seletor de telas sem receber o bloqueio exclusivo do nativo', () => {
  const a = ambiente(); const ui = renderizacaoReal(a, false);
  Object.assign(a.state, { pronto: true, aberturaProgressiva: true, dashboardPerfilLiberado: 'empresa', paywallVerificado: true });
  a.ctx.render();
  assert.equal(ui.cenas.at(-1), '<main data-dashboard>Dashboard</main>');
  assert.equal(a.ctx.telaPreparacaoAcessoMobileVisivel(), false);
});
test('preparação do perfil fecha camadas anteriores antes de consultar permissões', async () => {
  const acessoGate = pendencia(), a = ambiente({ acessoGate });
  Object.assign(a.state, { chatIAAberto: true, modalLancamento: true, modalMenu: 'caixinha', menuAberto: true });
  const p = a.ctx.carregarDadosProgressivosMobile(); await tick();
  assert.equal(a.state.chatIAAberto, false); assert.equal(a.state.modalLancamento, null);
  assert.equal(a.state.modalMenu, ''); assert.equal(a.state.menuAberto, false);
  assert.match(fonte, /bloquearCamadasProgressivas \? ''/);
  acessoGate.resolve(); await p;
});
test('mês principal fica pronto na preparação única; secundários não bloqueiam a dashboard', async () => {
  const financeiro = pendencia(), secundarios = pendencia(), a = ambiente({ financeiro, secundarios });
  const p = a.ctx.carregarDadosProgressivosMobile(); await tick();
  assert.equal(a.state.dadosCriticosProntos, false); assert.equal(a.state.aberturaProgressiva, true);
  assert.equal(a.ctx.financeiroMesProntoMobile(), false);
  financeiro.resolve(); await tick();
  assert.equal(a.ctx.financeiroMesProntoMobile(), true);
  assert.equal(a.state.dadosCriticosProntos, true); assert.equal(a.state.aberturaProgressiva, false);
  assert.ok(a.requests.includes('secundarios'));
  secundarios.resolve(); await p;
});
test('somente mês solicitado é consultado, sem caixinha ou histórico na entrada', async () => {
  const a = ambiente(); await a.ctx.carregarDadosProgressivosMobile();
  for (const q of a.consultas.filter(q => ['lancamentos','faturamentos','faturamentos_entradas'].includes(q.tabela))) assert.equal(q.filtros.mes, 'OUTUBRO');
  assert.ok(!a.consultas.some(q => q.tabela === 'caixinhas_movimentos'));
  a.state.mes = 'SETEMBRO'; await a.ctx.carregarDadosProgressivosMobile();
  assert.match(a.state.financeiroPeriodoPronto, /SETEMBRO$/);
  assert.deepEqual([...new Set(a.consultas.filter(q => q.tabela === 'lancamentos').map(q => q.filtros.mes))], ['OUTUBRO','SETEMBRO']);
});

test('mês já preparado abre sem segunda preparação, consultas ou flash de Atualizando mês', async () => {
  const a = ambiente(); await a.ctx.carregarDadosProgressivosMobile();
  await a.ctx.obterFinanceiroPeriodoCacheMobile('empresa', 2026, 'SETEMBRO');
  const n = a.consultas.length, requests = a.requests.length, telas = a.telas.length;
  a.state.mes = 'SETEMBRO';
  await a.ctx.carregarDadosProgressivosMobile({trocaPeriodo:true});
  assert.equal(a.consultas.length,n); assert.equal(a.requests.length,requests);
  assert.equal(a.telas.length,telas+1);
  assert.match(a.telas.at(-1).financeiro,/SETEMBRO$/);
  assert.equal(a.telas.at(-1).abertura,false);
});

test('cache deduplica mês em voo; troca rápida não aplica resposta do mês anterior', async () => {
  const opts={}, a=ambiente(opts); await a.ctx.carregarDadosProgressivosMobile();
  opts.financeiro=pendencia(); const antes=a.consultas.length;
  const pre=a.ctx.obterFinanceiroPeriodoCacheMobile('empresa',2026,'SETEMBRO');
  a.state.mes='SETEMBRO'; const p=a.ctx.carregarDadosProgressivosMobile({trocaPeriodo:true});
  await tick();
  a.state.mes='OUTUBRO'; await a.ctx.carregarDadosProgressivosMobile({trocaPeriodo:true});
  opts.financeiro.resolve(); await Promise.all([p,pre]);
  assert.match(a.state.financeiroPeriodoPronto,/OUTUBRO$/);
  assert.equal(a.consultas.slice(antes).filter(q=>q.tabela==='lancamentos').length,1);
});

test('gravação invalida cache/em voo e perfil negado não reutiliza financeiro preparado', async () => {
  const opts={},a=ambiente(opts); await a.ctx.carregarDadosProgressivosMobile();
  opts.financeiro=pendencia(); const p=a.ctx.obterFinanceiroPeriodoCacheMobile('empresa',2026,'SETEMBRO');
  a.ctx.invalidarCacheFinanceiroMobile(); opts.financeiro.resolve();await p;
  assert.deepEqual(Object.keys(a.state.financeiroCache),[]);
  opts.dashboard=false; const n=a.consultas.length;
  await a.ctx.carregarDadosProgressivosMobile();
  assert.equal(a.consultas.length,n); assert.equal(a.state.dashboardPerfilLiberado,'');
  assert.deepEqual(Object.keys(a.state.financeiroCache),[]);
});

test('pré-carga real ocorre só após acesso/financeiro e consulta sequencialmente o ano atual', async () => {
  const a=ambiente(); const tarefas=[];
  a.ctx.window.setTimeout=(fn,ms)=>{if(ms===0)tarefas.push(fn);else queueMicrotask(fn);};
  vm.runInContext(funcs.get('agendarPreCargaFinanceiroMobile'),a.ctx);
  a.ctx.agendarPreCargaFinanceiroMobile();assert.equal(tarefas.length,0);
  await a.ctx.carregarDadosProgressivosMobile();
  assert.equal(tarefas.length,1);
  assert.ok(a.consultas.every(q=>!q.filtros.mes||q.filtros.mes==='OUTUBRO'));
  const n=a.consultas.length;
  await tarefas[0]();
  const feitas=a.consultas.slice(n).filter(q=>q.tabela==='lancamentos');
  assert.equal(feitas.length,11);assert.equal(feitas[0].filtros.mes,'SETEMBRO');assert.equal(feitas[1].filtros.mes,'NOVEMBRO');
  assert.ok(feitas.every(q=>q.filtros.empresa_id==='empresa'&&q.filtros.ano===2026));
  assert.match(a.state.financeiroPeriodoPronto,/OUTUBRO$/);
  assert.equal(Object.keys(a.state.financeiroCache).length,12);
});

test('pré-carga aborta em falha de permissão sem novas leituras ou erro na dashboard', async () => {
  const opts={},a=ambiente(opts);await a.ctx.carregarDadosProgressivosMobile();const n=a.consultas.length;
  const tarefas=[];a.ctx.window.setTimeout=fn=>tarefas.push(fn);
  vm.runInContext(funcs.get('agendarPreCargaFinanceiroMobile'),a.ctx);
  a.ctx.agendarPreCargaFinanceiroMobile();opts.negado=true;
  await tarefas[0]();assert.equal(a.consultas.length,n);assert.equal(a.state.financeiroPreCarga,'');
  assert.equal(a.state.financeiroPeriodoErro,'');
});
test('perfil sem financeiro, assinatura bloqueada, cadastro incompleto e JSON inválido não liberam leitura', async () => {
  for (const opts of [{ dashboard: false }, { paywall: true }, { incompleto: true }, { negado: true }, { sessao: false }, { invalido: true }]) {
    const a = ambiente(opts); await a.ctx.carregarDadosProgressivosMobile();
    assert.equal(a.consultas.length, 0, JSON.stringify(opts)); assert.equal(a.state.autenticado, true);
  }
});
test('falha financeira não vira zero nem encerra a sessão; nova tentativa recupera', async () => {
  const opts = { erroTabela: 'lancamentos' }, a = ambiente(opts); await a.ctx.carregarDadosProgressivosMobile();
  assert.equal(a.ctx.financeiroMesProntoMobile(), false); assert.ok(a.state.falhaAcesso); assert.equal(a.state.autenticado, true);
  opts.erroTabela = ''; await a.ctx.carregarDadosProgressivosMobile(); assert.equal(a.ctx.financeiroMesProntoMobile(), true);
});
test('resposta anterior não preenche outro perfil ou outro mês', async () => {
  for (const troca of ['empresa', 'mes']) {
    const financeiro = pendencia(), a = ambiente({ financeiro }); const p = a.ctx.carregarDadosProgressivosMobile(); await tick();
    if (troca === 'empresa') a.state.empresa = { id: 'outra' }; else a.state.mes = 'NOVEMBRO';
    financeiro.resolve(); await p; assert.equal(a.state.lancamentos.length, 0); assert.equal(a.state.financeiroPeriodoPronto, '');
  }
});
test('rede transitória repete com prazo maior; 401 e 403 não repetem nem autorizam', async () => {
  const a = ambiente(); let chamadas = 0; const prazos = [];
  a.ctx.requisitarJsonMobile = async (_, __, prazo) => { prazos.push(prazo); if (++chamadas === 1) throw Error('Timeout'); return { resposta: { ok: true, status: 200 }, json: {} }; };
  await a.ctx.requisitarAcessoProgressivoMobile('/teste'); assert.deepEqual(prazos, [20000,30000]);
  for (const status of [401,403]) { chamadas = 0; a.ctx.requisitarJsonMobile = async () => { chamadas++; return { resposta: { ok: false, status }, json: {} }; }; const r = await a.ctx.requisitarAcessoProgressivoMobile('/teste'); assert.equal(chamadas, 1); assert.equal(r.resposta.ok, false); }
});
test('dashboard não oferece botões de carga nem mantém o carregador anual antigo', () => {
  assert.doesNotMatch(fonte, /data-historico-progressivo|Consultar histórico|carregarHistoricoProgressivoMobile|Preparando os cadastros para lançamentos/);
});

test('saldo carrega automaticamente só o mês anterior, sem substituir o mês corrente', async () => {
  const a = ambiente(); await a.ctx.carregarDadosProgressivosMobile(); const antes = a.consultas.length;
  const lancamentos = a.state.lancamentos;
  await a.ctx.carregarComplementosDashboardMobile(a.state.cargaPerfilGeracao, 'empresa', 'user', 2026, 'OUTUBRO', ['saldo']);
  assert.equal(a.ctx.saldoAnteriorProntoMobile(), true);
  assert.equal(a.state.lancamentos, lancamentos);
  assert.deepEqual(a.consultas.slice(antes).filter(q => q.tabela === 'lancamentos').map(q => q.filtros.mes), ['SETEMBRO']);
});

test('janela dos gráficos usa no máximo cinco meses adicionais, compartilhados com saldo', async () => {
  const a = ambiente(); await a.ctx.carregarDadosProgressivosMobile(); const antes = a.consultas.length;
  await a.ctx.carregarComplementosDashboardMobile(a.state.cargaPerfilGeracao, 'empresa', 'user', 2026, 'OUTUBRO', ['saldo', 'evolucaoDespesas', 'evolucaoReceitas']);
  const periodos = a.consultas.slice(antes).filter(q => q.tabela === 'lancamentos').map(q => q.filtros.mes);
  assert.equal(periodos.length, 5); assert.equal(new Set(periodos).size, 5);
  assert.deepEqual([...periodos].sort(), ['MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO'].sort());
  assert.equal(a.ctx.evolucaoProntaMobile(), true);
  assert.equal(a.state.lancamentos.length, 1);
});

test('saldo de janeiro consulta dezembro do ano anterior e não outro janeiro', async () => {
  const a = ambiente(); a.state.mes = 'JANEIRO'; await a.ctx.carregarDadosProgressivosMobile(); const antes = a.consultas.length;
  await a.ctx.carregarComplementosDashboardMobile(a.state.cargaPerfilGeracao, 'empresa', 'user', 2026, 'JANEIRO', ['saldo']);
  const periodo = a.consultas.slice(antes).find(q => q.tabela === 'lancamentos');
  assert.equal(periodo.filtros.ano, 2025); assert.equal(periodo.filtros.mes, 'DEZEMBRO');
  assert.equal(a.ctx.saldoAnteriorProntoMobile(), true);
});

test('caixinha visível carrega sozinha; card oculto não provoca consulta', async () => {
  const a = ambiente(); await a.ctx.carregarDadosProgressivosMobile(); const antes = a.consultas.length;
  await a.ctx.carregarComplementosDashboardMobile(a.state.cargaPerfilGeracao, 'empresa', 'user', 2026, 'OUTUBRO', ['totais']);
  assert.equal(a.consultas.length, antes);
  await a.ctx.carregarComplementosDashboardMobile(a.state.cargaPerfilGeracao, 'empresa', 'user', 2026, 'OUTUBRO', ['caixinha']);
  assert.equal(a.consultas.slice(antes).filter(q => q.tabela === 'caixinhas_movimentos').length, 1);
  assert.equal(a.ctx.caixinhaDashboardProntaMobile(), true);
});

test('complemento atrasado não entra em outra empresa, mês ou geração', async () => {
  for (const mudanca of ['empresa', 'mes', 'geracao']) {
    const opts = {}, a = ambiente(opts); await a.ctx.carregarDadosProgressivosMobile();
    opts.financeiro = pendencia();
    const p = a.ctx.carregarComplementosDashboardMobile(a.state.cargaPerfilGeracao, 'empresa', 'user', 2026, 'OUTUBRO', ['saldo']); await tick();
    if (mudanca === 'empresa') a.state.empresa = { id: 'outra' };
    if (mudanca === 'mes') a.state.mes = 'NOVEMBRO';
    if (mudanca === 'geracao') a.state.cargaPerfilGeracao++;
    opts.financeiro.resolve(); await p;
    assert.deepEqual(Object.keys(a.state.complementosDashboard), []);
  }
});

function usarDashboardReal(a) {
  const reais = ['telaApp', 'homeHtml', 'dadosMes', 'dadosMesAnterior', 'dataFutura', 'ehDespesaFutura', 'ehDataHoje', 'ehDespesaProjetada', 'ehDespesaRealizada', 'itemPertenceAoCentroCustoAtualMobile', 'lancamentosDoCentroCustoAtualMobile', 'entradasDoCentroCustoAtualMobile', 'saldoTopoHtml', 'miniSaldoHtml', 'totaisHtml', 'totalBoxHtml', 'caixinhaResumo', 'caixinhaCardHtml', 'evolucaoHtml', 'statusPeriodoMobileHtml', 'alertaDashboardMobileHtml'];
  Object.assign(a.state, { visao: 'home', caixinhaRecolhida: true, evolucaoSelecionada: {}, evolucaoSelecionadaMes: {} });
  a.ctx.cardsDashboardVisiveis = () => ['saldo', 'totais', 'caixinha', 'evolucaoDespesas'];
  a.ctx.dinheiro = v => 'R$ ' + Number(v).toFixed(2);
  a.ctx.valorFinanceiroCardHtml = a.ctx.dinheiro;
  a.ctx.botaoVisibilidadeValoresHtml = () => '<button aria-label="Visibilidade dos valores">Olho</button>';
  a.ctx.primeiroNomeUsuarioAva = () => 'Jeff'; a.ctx.saudacaoPeriodoMobile = () => 'Bom dia!';
  a.ctx.nomeCurtoPerfilMobile = () => 'Bora'; a.ctx.tituloCardDashboard = v => v;
  a.ctx.avisoEdicoesFinanceirasMobileHtml = () => '';
  for (const n of ['acoesHeaderMobileHtml', 'anoHeaderHtml', 'insightDespesasHtml', 'seletorCentroCustoPerfilHtml', 'avisoCarenciaMobileHtml', 'alertaHtml', 'rodapeMobileHtml', 'exportacaoMesMobileHtml', 'notaVisualizacaoHtml', 'processandoNotaHtml', 'aplicacaoLancamentoHtml', 'navegacaoInferiorHtml', 'toastHtml', 'avisoConfirmarHtml']) a.ctx[n] = () => '';
  vm.runInContext(reais.map(n => funcs.get(n)).join('\n'), a.ctx);
}

test('dashboard REAL abre completa após preparação; saldo/gráfico/caixinha atualizam sem clique e sem tela substituta', async () => {
  const financeiro = pendencia(), a = ambiente({ financeiro }); const ui = renderizacaoReal(a); usarDashboardReal(a);
  const p = a.ctx.carregarDadosProgressivosMobile(); await tick();
  assert.match(ui.cenas.at(-1), /gestao-access-card/);
  assert.doesNotMatch(ui.cenas.at(-1), /data-dashboard-card/);
  financeiro.resolve(); await p;
  const dashboard = ui.cenas.at(-1);
  for (const id of ['saldo', 'totais', 'caixinha', 'evolucaoDespesas']) assert.match(dashboard, new RegExp('data-dashboard-card="' + id + '"'));
  assert.doesNotMatch(dashboard, /gestao-access-card|Carregando o mês|Preparando os cadastros|Consultar histórico|data-historico-progressivo|data-periodo-recarregar/);
  assert.match(dashboard, /R\$ 50\.00/); // Receita do mês pronta na primeira pintura da dashboard.
  assert.match(dashboard, /Atualizando automaticamente/);
  assert.match(a.ctx.saldoTopoHtml(a.ctx.dadosMes('OUTUBRO'), a.ctx.dadosMesAnterior()), /&mdash;/);
  await a.ctx.carregarComplementosDashboardMobile(a.state.cargaPerfilGeracao, 'empresa', 'user', 2026, 'OUTUBRO', a.ctx.cardsDashboardVisiveis());
  a.ctx.render();
  assert.doesNotMatch(ui.cenas.at(-1), /Atualizando automaticamente|Consultar histórico|gestao-access-card/);
  assert.match(a.ctx.saldoTopoHtml(a.ctx.dadosMes('OUTUBRO'), a.ctx.dadosMesAnterior()), /R\$ 80\.00/);
  assert.equal((ui.cenas.at(-1).match(/data-dashboard-card="/g) || []).length, 4);
});

test('agendamento automático é único e não dispara antes de concluir os dados críticos', async () => {
  const a = ambiente({ visiveis: ['saldo'] }); const agendados = [];
  a.ctx.window.setTimeout = fn => agendados.push(fn);
  a.ctx.agendarComplementosDashboardMobile(); assert.equal(agendados.length, 0);
  await a.ctx.carregarDadosProgressivosMobile();
  a.ctx.agendarComplementosDashboardMobile(); a.ctx.agendarComplementosDashboardMobile();
  assert.equal(agendados.length, 1);
  await agendados[0](); await tick();
  a.ctx.agendarComplementosDashboardMobile(); assert.equal(agendados.length, 1);
});

test('autorização revogada impede a carga automática dos complementos', async () => {
  const opts = {}, a = ambiente(opts); await a.ctx.carregarDadosProgressivosMobile(); const antes = a.consultas.length;
  opts.negado = true;
  await a.ctx.carregarComplementosDashboardMobile(a.state.cargaPerfilGeracao, 'empresa', 'user', 2026, 'OUTUBRO', ['saldo','caixinha']);
  assert.equal(a.consultas.length, antes);
  assert.equal(a.ctx.saldoAnteriorProntoMobile(), false);
  assert.equal(a.ctx.caixinhaDashboardProntaMobile(), false);
  assert.equal(a.state.complementosDashboardErros.SETEMBRO, true);
  assert.equal(a.state.autenticado, true);
});

test('falha de complemento tem duas tentativas, não altera o mês e mantém estado de erro local', async () => {
  const opts = {}, a = ambiente(opts); await a.ctx.carregarDadosProgressivosMobile(); const antes = a.consultas.length;
  opts.erroTabela = 'lancamentos'; const corrente = a.state.lancamentos;
  await a.ctx.carregarComplementosDashboardMobile(a.state.cargaPerfilGeracao, 'empresa', 'user', 2026, 'OUTUBRO', ['saldo']);
  assert.equal(a.consultas.slice(antes).filter(q => q.tabela === 'lancamentos').length, 2);
  assert.equal(a.state.lancamentos, corrente);
  assert.equal(a.ctx.saldoAnteriorProntoMobile(), false);
  assert.equal(a.state.complementosDashboardErros.SETEMBRO, true);
});

function usarCalculadorRealDeProgresso(a) {
  const pagina = readFileSync('app/mobile/page.tsx', 'utf8');
  const bootstrap = pagina.match(/const bootstrapCarregamento = `([\s\S]*?)\n  `;/)[1];
  const arvore = ts.createSourceFile('bootstrap.js', bootstrap, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const variaveis = new Map(); let atualizador;
  function visitar(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) variaveis.set(n.name.text, n.initializer?.getText(arvore));
    if (ts.isBinaryExpression(n) && n.left.getText(arvore) === 'window.__avantalabAtualizarProgressoMobile') atualizador = n.getText(arvore);
    ts.forEachChild(n, visitar);
  }
  visitar(arvore); assert.ok(atualizador);
  const percentuais = [], barra = { style: {} }, texto = {}, etapa = {};
  Object.defineProperty(texto, 'textContent', { set: v => percentuais.push(Number(String(v).replace('%',''))), get: () => percentuais.at(-1) + '%' });
  a.ctx.document = { getElementById: id => ({ mobileAccessProgressBar: barra, mobileAccessProgressValue: texto, mobileAccessProgressLabel: etapa })[id] };
  vm.runInContext('var pesos = ' + variaveis.get('pesos') + '; var progresso = ' + variaveis.get('progresso') + '; window.__AVANTALAB_MOBILE_PROGRESSO__ = progresso; ' + atualizador + ';', a.ctx);
  for (const grupo of ['shell','scripts','auth','profiles','access']) a.ctx.window.__avantalabAtualizarProgressoMobile(grupo, 1, 1, 'Etapa confirmada');
  return { percentuais, barra, texto, get valor() { return a.ctx.window.__AVANTALAB_MOBILE_PROGRESSO__.valor; } };
}

test('calculador REAL avança 60→65→70→75→80→85→90→95→100 conforme respostas; 100 é pintado antes da dashboard', async () => {
  const o = Object.fromEntries(['acessoGate','sessaoGate','planoGate','cadastroGate','financeiro','configGate','centrosGate','pintura'].map(k => [k, pendencia()]));
  const a = ambiente(o), ui = renderizacaoReal(a), progresso = usarCalculadorRealDeProgresso(a);
  const p = a.ctx.carregarDadosProgressivosMobile(); await tick();
  assert.equal(progresso.valor, 60);
  for (const [gate, esperado] of [['acessoGate',65],['planoGate',70],['cadastroGate',75],['sessaoGate',80],['configGate',85],['centrosGate',90]]) {
    o[gate].resolve(); await tick(); assert.equal(progresso.valor, esperado);
    assert.equal(a.state.dadosCriticosProntos, false);
    assert.equal(a.ctx.telaPreparacaoAcessoMobileVisivel(), true);
  }
  o.financeiro.resolve(); await tick();
  assert.equal(progresso.valor, 100); assert.equal(progresso.barra.style.width, '100%');
  assert.equal(progresso.barra.style.transition, 'none'); assert.equal(progresso.texto.textContent, '100%');
  assert.equal(a.state.dadosCriticosProntos, false); assert.equal(a.state.aberturaProgressiva, true);
  assert.match(ui.cenas.at(-1), /gestao-access-card/);
  assert.deepEqual([...new Set(progresso.percentuais.filter(v => v >= 60))], [60,65,70,75,80,85,90,95,100]);
  o.pintura.resolve(); await p;
  assert.equal(ui.cenas.at(-1), '<main data-dashboard>Dashboard</main>');
  assert.equal(a.state.dadosCriticosProntos, true);
  const etapas = a.progresso.filter(e => e.grupo === 'data');
  assert.equal(etapas.length, 8); assert.equal(etapas.at(-1).rotulo, 'Acesso pronto');
  assert.ok(etapas.every(e => !e.dashboardPronta));
});

test('erro ou acesso negado nunca conclui a barra; atualização de mês não reinicia preparação', async () => {
  for (const o of [{ negado: true }, { sessao: false }, { erroTabela: 'lancamentos' }]) {
    const a = ambiente(o), ui = usarCalculadorRealDeProgresso(a);
    await a.ctx.carregarDadosProgressivosMobile();
    assert.ok(ui.valor < 100); assert.equal(a.state.dadosCriticosProntos, false);
  }
  const a = ambiente(); await a.ctx.carregarDadosProgressivosMobile(); const antes = a.progresso.length;
  a.state.mes = 'SETEMBRO'; await a.ctx.carregarDadosProgressivosMobile();
  assert.equal(a.progresso.length, antes); assert.equal(a.state.aberturaProgressiva, false);
});

test('pintura de conclusão usa somente dois quadros, sem timer de permanência ou espera da animação CSS', async () => {
  const a = ambiente(), quadros = [], temporizadores = [], cancelados = [];
  a.ctx.document = { hidden: false };
  Object.assign(a.ctx.window, { requestAnimationFrame: fn => quadros.push(fn), setTimeout: (fn, ms) => { temporizadores.push({ fn, ms }); return temporizadores.length; }, clearTimeout: id => cancelados.push(id) });
  vm.runInContext(funcs.get('aguardarPinturaProgressoMobile'), a.ctx);
  let terminou = false; const p = a.ctx.aguardarPinturaProgressoMobile(0).then(() => { terminou = true; });
  assert.equal(quadros.length, 1); assert.equal(terminou, false);
  quadros.shift()(); assert.equal(quadros.length, 1); assert.equal(terminou, false);
  quadros.shift()();
  assert.deepEqual(temporizadores.map(t => t.ms), [600,0]); // 600 é apenas contingência se rAF for suspenso.
  temporizadores[1].fn(); await p;
  assert.equal(terminou, true); assert.deepEqual(cancelados, [1]);
});

test('troca de perfil enquanto 100% é pintado não abre dados do contexto anterior', async () => {
  const pintura = pendencia(), a = ambiente({ pintura }); const ui = renderizacaoReal(a);
  const p = a.ctx.carregarDadosProgressivosMobile(); await tick();
  assert.match(ui.cenas.at(-1), /Preparando acesso/);
  assert.equal(a.state.dadosCriticosProntos, false);
  a.state.empresa = { id: 'outra' }; a.state.cargaPerfilGeracao++;
  pintura.resolve(); await p;
  assert.equal(a.state.dadosCriticosProntos, false);
  assert.ok(ui.cenas.every(html => !html.includes('data-dashboard')));
});
