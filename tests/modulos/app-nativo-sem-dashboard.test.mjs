import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const fonte = readFileSync('public/mobile-app.js', 'utf8');
const ast = ts.createSourceFile('mobile.js', fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const funcoes = new Map();
function visitar(no) { if (ts.isFunctionDeclaration(no) && no.name) funcoes.set(no.name.text, no.getText(ast)); ts.forEachChild(no, visitar); }
visitar(ast);
function ambiente(plataforma = 'ios', modulos = ['ponto', 'vendas_mobile', 'recebimentos_presencial', 'marketplaces', 'vendas', 'custos', 'projetos']) {
  const eventos = [], consultas = [], destinos = [];
  const state = { empresa: { id: 'empresa', nome: 'Empresa', telefone_confirmado: true }, usuario: { id: 'usuario' }, autenticado: true, dashboardPerfilLiberado: '', perfilModulosNativo: '', resumoPerfisSolicitacao: 0, lancamentos: [{ valor: 500 }], entradas: [{ valor: 500 }], despesas: [{}], faturamentos: { Jan: 500 }, caixinhaMovimentos: [{}] };
  const acesso = { empresa: { id: 'empresa', nome: 'Empresa', temaEscuro: false }, dashboard: false, modulos: modulos.map(id => ({ id })) };
  const contexto = { state, Boolean, Array, String, Error, encodeURIComponent,
    window: { Capacitor: { isNativePlatform: () => plataforma !== 'pwa', getPlatform: () => plataforma }, dispatchEvent: event => eventos.push(event), location: { replace: url => destinos.push(url) } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    db: { auth: { getSession: async () => ({ data: { session: { access_token: 'token-teste' } } }) }, from: tabela => { consultas.push(tabela); throw Error('Consulta financeira proibida: ' + tabela); }, removeChannel() {} },
    fetch: async () => ({ ok: true, json: async () => ({ perfis: [acesso] }) }),
    confirmarSessaoDispositivoMobile: async () => ({ ativa: true }), iniciarControleSessaoDispositivoMobile() {}, ehContaRevisaoAppAppleMobile: () => false,
    atualizarProgressoAcessoMobile() {}, finalizarBarraPreparacaoMobile: async () => {},
    render() {}, escapeHtml: value => String(value), nomeEmpresa: emp => emp.nome,
    modalMenuHtml: () => '', toastHtml: () => '',
    abrirRelatorioPontoMobile: () => eventos.push({ type: 'ponto' }), carregarResumoPontoMobile: async () => {},
  };
  vm.createContext(contexto);
  const nomes = ['contextoProgressivoMobile', 'financeiroPeriodoChaveMobile', 'financeiroMesProntoMobile', 'carregarDadosProgressivosMobile', 'ehIosNativoMobile', 'ehAndroidNativoMobile', 'ehLojaNativaMobile', 'somenteModulosNoAppNativo', 'prepararModulosAppNativo', 'abrirConteudoVendasMobile', 'carregarDados', 'cardDashboardPermitido', 'ordemDashboardPadrao', 'normalizarOrdemDashboard', 'normalizarOcultosDashboard', 'cardsDashboardOcultosPadrao', 'cardsDashboardVisiveis', 'tituloCardDashboard', 'configurarResumoHtml', 'alternarCardResumo', 'selecionarEmpresaMobile', 'homeHtml', 'abrirLancamentoPelaNavegacao'];
  Object.assign(contexto, { tokenSessao: async () => 'teste', requisitarAcessoProgressivoMobile: async () => { const resposta = await contexto.fetch(); return { resposta, json: await resposta.json() }; } });
  Object.assign(contexto, { premiumPessoalBloqueadoMobile: () => false, podeGerenciarPontoMobile: () => state.pontoModuloAtivo, podeGerenciarConteudoVendas: () => true, temCardCentrosCustoMobile: () => true, salvarResumoDashboard() {}, trocarEmpresaHtml: () => state.empresas.map(e => e.nome).join('|'), controlePontoCardHtml: () => '<section>Controle de Ponto</section>' });
  vm.runInContext(nomes.concat('meusPerfisCardHtml', 'invalidarCacheFinanceiroMobile').map(nome => funcoes.get(nome)).join('\n'), contexto);
  return { contexto, state, eventos, consultas, destinos, acesso };
}
for (const plataforma of ['ios', 'android']) test(`${plataforma}: sessão restaurada sem Dashboard não consulta financeiro nem navega para fora`, async () => {
  const a = ambiente(plataforma);
  await a.contexto.carregarDados();
  assert.equal(a.state.perfilModulosNativo, 'empresa');
  assert.equal(a.state.pronto, true);
  assert.equal(a.consultas.length, 0);
  assert.equal(a.destinos.length, 0);
  for (const campo of ['lancamentos', 'entradas', 'despesas', 'caixinhaMovimentos']) assert.equal(a.state[campo].length, 0);
  assert.equal(a.state.pontoModuloAtivo, true);
  assert.equal(a.state.vendasMobileModuloAtivo, true);
  const html = a.contexto.homeHtml({}, {});
  assert.doesNotMatch(html, /R\$|saldo|receita|despesa|marketplaces|Projetos|Precificação|href=/i);
  assert.doesNotMatch(html, /Operações de Campo/);
  assert.doesNotMatch(html, /Conteúdo AvantaVendas|data-app-modulo/);
});
test('PWA mantém redirecionamento existente e não recebe o hub nativo', async () => {
  const a = ambiente('pwa'); await a.contexto.carregarDados();
  assert.deepEqual(a.destinos, ['/modulos?entrada=1&empresaId=empresa']);
  assert.equal(a.contexto.somenteModulosNoAppNativo(), false);
});
test('nenhum módulo liberado mantém início vazio sem consultar financeiro', async () => {
  const a = ambiente('android', []); await a.contexto.carregarDados();
  assert.equal(a.contexto.homeHtml({}, {}), '');
  a.contexto.abrirConteudoVendasMobile(); assert.equal(a.eventos.length, 0);
});
test('ações usam eventos internos e não abrem navegador; módulos negados não abrem', async () => {
  const a = ambiente('ios', ['vendas_mobile', 'recebimentos_presencial']); await a.contexto.carregarDados();
  a.contexto.abrirConteudoVendasMobile();
  assert.deepEqual(a.eventos.map(e => e.type), ['avantalab:open-vendas-conteudo']);
  assert.equal(a.destinos.length, 0);
  a.contexto.podeGerenciarConteudoVendas = () => false;
  a.contexto.abrirConteudoVendasMobile();
  assert.equal(a.eventos.length, 1);
});

test('Conteúdo existe somente no menu e abre o popup compartilhado', () => {
  assert.doesNotMatch(fonte, /data-app-modulo|function telaModulosAppNativo/);
  assert.doesNotMatch(funcoes.get('homeHtml'), /Conteúdo AvantaVendas|vendas_mobile|open-vendas-conteudo/);
  assert.doesNotMatch(funcoes.get('ordemDashboardPadrao'), /vendas_mobile|conteudo/i);
  assert.match(fonte, /bind\('menu-vendas-mobile',[\s\S]*?fecharMenuLateralAnimado\(abrirConteudoVendasMobile\)/);
  const bridge = readFileSync('app/mobile/VendasMobileConteudoBridge.tsx', 'utf8');
  assert.match(bridge, /avantalab:open-vendas-conteudo/);
  assert.match(bridge, /<NovidadesVendasModal/);
  assert.match(bridge, /onFechar=\{\(\) => setDados\(null\)\}/);
});
test('sessão de dispositivo recusada não libera o hub', async () => {
  const a = ambiente(); a.contexto.confirmarSessaoDispositivoMobile = async () => ({ ativa: false });
  await a.contexto.carregarDados(); assert.equal(a.contexto.somenteModulosNoAppNativo(), false); assert.ok(a.state.falhaAcesso);
});
test('troca de perfil invalida o contexto anterior', async () => {
  const a = ambiente(); await a.contexto.carregarDados(); a.state.empresa = { id: 'outra' };
  assert.equal(a.contexto.somenteModulosNoAppNativo(), false);
  a.state.vendasMobileModuloAtivo = false;
  a.contexto.abrirConteudoVendasMobile(); assert.equal(a.eventos.length, 0);
});
test('com Dashboard, o app continua no fluxo financeiro normal', async () => {
  const a = ambiente(); a.acesso.dashboard = true;
  Object.assign(a.contexto, {
    ehFuncionarioPontoMobile: () => false,
    lerCacheGestaoMobile: () => { throw new Error('fluxo-financeiro-normal'); },
  });
  await a.contexto.carregarDados();
  assert.ok(a.state.falhaAcesso); // confirmação incompleta nunca libera financeiro
  assert.equal(a.state.dashboardPerfilLiberado, 'empresa');
  assert.equal(a.contexto.somenteModulosNoAppNativo(), false);
  assert.equal(a.destinos.length, 0);
});
test('resposta de outro perfil é descartada antes de preparar módulos', async () => {
  const a = ambiente();
  a.contexto.fetch = async () => { a.state.empresa = { id: 'outra' }; return { ok: true, json: async () => ({ perfis: [a.acesso] }) }; };
  await a.contexto.carregarDados(); assert.equal(a.state.perfilModulosNativo, ''); assert.equal(a.destinos.length, 0);
});
test('Operações usa cliente autenticado e autorização original, sem rota externa', () => {
  const bridge = readFileSync('app/mobile/OperacoesCampoNativoBridge.tsx', 'utf8');
  assert.match(bridge, /!Capacitor.isNativePlatform\(\)/);
  assert.match(bridge, /api\/modulos\/acesso\?empresaId=/);
  assert.match(bridge, /recebimentos_presencial/);
  assert.match(bridge, /root.inert = true/);
  assert.doesNotMatch(bridge, /window.open|Browser.open|location.replace|<iframe/);
});
test('app nativo em tela larga não é redirecionado para a Web', () => {
  const a = ambiente('ios');
  a.contexto.window.innerWidth = 1366;
  // O ramo nativo precisa resolver antes de consultar display-mode/User-Agent.
  vm.runInContext(funcoes.get('deveRedirecionarMobileParaWeb'), a.contexto);
  assert.equal(a.contexto.deveRedirecionarMobileParaWeb(), false);
});

test('restrição pertence ao perfil selecionado e não impede trocar para outro com financeiro', async () => {
  const a = ambiente();
  const tridium = { id: 'empresa', nome: 'Tridium Cosméticos', telefone_confirmado: true };
  const outro = { id: 'outro', nome: 'Outro perfil', telefone_confirmado: true };
  a.state.empresas = [tridium, outro];
  a.contexto.fetch = async () => ({ ok: true, json: async () => ({ perfis: [a.acesso, { empresa: outro, dashboard: true, modulos: [] }] }) });
  await a.contexto.carregarDados();
  assert.match(a.contexto.trocarEmpresaHtml(), /Tridium Cosméticos\|Outro perfil/);
  assert.doesNotMatch(a.contexto.homeHtml({}, {}), /Tridium Cosméticos\|Outro perfil|data-empresa-id|Meus perfis/);
  assert.equal(a.contexto.cardDashboardPermitido('saldo'), false);
  a.contexto.selecionarEmpresaMobile('outro', false);
  Object.assign(a.contexto, { ehFuncionarioPontoMobile: () => false, lerCacheGestaoMobile: () => { throw Error('financeiro-do-outro'); } });
  let erroFinanceiro;
  try { await a.contexto.carregarDados(); } catch (erro) { erroFinanceiro = erro; }
  assert.equal(erroFinanceiro, undefined);
  assert.ok(a.state.falhaAcesso); // sem confirmação completa, nenhum financeiro é consultado
  assert.equal(a.contexto.cardDashboardPermitido('saldo'), true);
  assert.equal(a.state.dashboardPerfilLiberado, 'outro');
  a.contexto.selecionarEmpresaMobile('empresa', false);
  await a.contexto.carregarDados();
  assert.equal(a.contexto.cardDashboardPermitido('saldo'), false);
  assert.equal(a.consultas.length, 0);
  assert.equal(a.destinos.length, 0);
});

test('cards financeiros não montam nem podem ser reativados ou abrir lançamento', async () => {
  const a = ambiente(); a.state.empresas = [a.state.empresa];
  a.contexto.avisoEdicoesFinanceirasMobileHtml = () => '';
  await a.contexto.carregarDados();
  const proibidos = ['saldo', 'totais', 'ultimasDespesas', 'ultimasReceitas', 'categorias', 'tipos', 'evolucaoDespesas', 'evolucaoReceitas', 'caixinha', 'centrosCusto', 'meusPerfis', 'insightsAva', 'ia'];
  a.state.dashboardOcultos = [...proibidos];
  for (const id of proibidos) {
    assert.equal(a.contexto.cardDashboardPermitido(id), false, id);
    a.contexto.alternarCardResumo(id);
    assert.ok(a.state.dashboardOcultos.includes(id));
    assert.match(a.contexto.configurarResumoHtml(), new RegExp('data-dashboard-toggle="' + id + '" disabled aria-disabled="true"'));
  }
  a.contexto.abrirLancamentoPelaNavegacao();
  assert.equal(a.state.modalLancamento, null);
  const html = a.contexto.homeHtml({}, {});
  assert.doesNotMatch(html, /Resumo inicial|Totais|Caixinha|R\$/);
  assert.match(html, /Controle de Ponto/);
  assert.doesNotMatch(html, /data-empresa-id|Meus perfis|PERFIL EM USO/);
});

test('perfil restrito reutiliza shell e botão de lançamento realmente desabilitado', () => {
  assert.doesNotMatch(funcoes.get('telaApp'), /return telaModulosAppNativo/);
  assert.match(funcoes.get('render'), /somenteModulosNoAppNativo\(\).*telaApp\(\)/);
  assert.match(funcoes.get('navegacaoInferiorHtml'), /id="nav-lancamento"[\s\S]*?disabled aria-disabled="true"/);
});

test('shell completo preserva cabeçalho, menu e perfis sem montar insights financeiros', async () => {
  const a = ambiente(); a.state.empresas = [a.state.empresa];
  a.contexto.avisoEdicoesFinanceirasMobileHtml = () => '';
  await a.contexto.carregarDados();
  Object.assign(a.state, { mes: 'Jan', ano: '2026', visao: 'home', dashboardOrdem: [], dashboardOcultos: [] });
  const vazios = ['anoHeaderHtml', 'acoesHeaderMobileHtml', 'seletorCentroCustoPerfilHtml', 'avisoCarenciaMobileHtml', 'alertaHtml', 'alertaDashboardMobileHtml', 'rodapeMobileHtml', 'exportacaoMesMobileHtml', 'notaVisualizacaoHtml', 'processandoNotaHtml', 'aplicacaoLancamentoHtml'];
  for (const nome of vazios) a.contexto[nome] = () => '';
  Object.assign(a.contexto, { dadosMes: () => ({}), dadosMesAnterior: () => ({}), centrosCustoAtivosMobile: () => [], primeiroNomeUsuarioAva: () => 'Jeff', saudacaoPeriodoMobile: () => 'Olá', nomeCurtoPerfilMobile: e => e.nome, normalizarAtalhoInferior: (tipo, padrao) => tipo || padrao, iconeAgendaSvg: () => '', insightDespesasHtml: () => { throw Error('insight financeiro não deve montar'); } });
  const nomes = ['telaApp', 'navegacaoInferiorHtml', 'itemNavegacaoInferiorHtml', 'rotuloAtalhoInferior', 'iconeNavegacaoInferior', 'iconeMaisGeometricoMobile'];
  vm.runInContext(nomes.map(n => funcoes.get(n)).join('\n'), a.contexto);
  for (const dark of [false, true]) {
    a.state.darkMode = dark;
    const html = a.contexto.telaApp();
    assert.match(html, /id="mobile-main-header"/);
    assert.match(html, /id="nav-menu"/);
    assert.match(html, /id="nav-lancamento" type="button" disabled aria-disabled="true"/);
    assert.doesNotMatch(html, /data-empresa-id|Meus perfis|PERFIL EM USO/);
    assert.doesNotMatch(html, /R\$|Resumo inicial|Caixinha/);
  }
});
