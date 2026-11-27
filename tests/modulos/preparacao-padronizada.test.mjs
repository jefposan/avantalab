import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const ler = path => readFileSync(`app/${path}`, 'utf8');

test('transição reutiliza o card oficial e a espera de dados secundários fica na área correspondente', () => {
  const transicao = ler('components/TransicaoNavegacaoInterna.tsx');
  assert.match(transicao, /<CarregamentoDadosModulo/);
  assert.doesNotMatch(transicao, /<ModuloHeader|animate-pulse/);
  assert.doesNotMatch(transicao, /fixed inset-0/);
  for (const path of ['custos/CustosClient.tsx', 'projetos/ProjetosClient.tsx', 'recebimentos/RecebimentosPaginaClient.tsx', 'marketplaces/MarketplacesClient.tsx']) {
    const fonte = ler(path);
    assert.match(fonte, /<TransicaoNavegacaoInterna destino=/);
    assert.doesNotMatch(fonte, /TelaCarregandoAcesso/);
  }
  const card = ler('components/CarregamentoDadosModulo.tsx');
  assert.match(card, /role="status"/);
  assert.match(card, /aria-busy="true"/);
  assert.match(card, /<LoadingPontos/);
  assert.match(card, /temaEscuro/);
  assert.match(card, /bg-white\/35/);
  assert.doesNotMatch(card, /bg-slate-50\/95|bg-slate-950\/90/);
  assert.doesNotMatch(ler('recebimentos/RecebimentosClient.tsx'), /carregando \? <section className=\{styles\.esqueletoPainel\}/);
  assert.doesNotMatch(ler('projetos/ProjetosClient.tsx'), /!loaded \? <section/);
});

test('confirmar acesso em Operações de Campo não recria repositório da mesma empresa', () => {
  const fonte = ler('recebimentos/RecebimentosPaginaClient.tsx');
  assert.match(fonte, /const empresaDoRepo = acesso\?\.empresa\.id/);
  assert.match(fonte, /criarRepoSupabase\(empresaDoRepo\) : null, \[empresaDoRepo\]/);
  assert.doesNotMatch(fonte, /criarRepoSupabase\(acesso\.empresa\.id\) : null, \[acesso\]/);
});

test('Custos mantém atualização de permissões silenciosa apenas para a empresa já preparada', () => {
  const fonte = ler('custos/CustosWorkspace.tsx');
  assert.match(fonte, /recarregar\(empresaProntaRef\.current === companyId\)/);
  assert.match(fonte, /empresaProntaRef\.current = companyId; setCarregando\(false\)/);
  assert.match(fonte, /if \(!silencioso\) setCarregando\(true\)/);
});


test('a Gestão só revela a janela ativa após o módulo da empresa atual confirmar prontidão', () => {
  const gestao = ler('gestao/page.tsx');
  const abertura = ler('components/AberturaModulo.tsx');
  const start = gestao.indexOf('  const receberNavegacao = (event: MessageEvent)');
  const end = gestao.indexOf("  window.addEventListener('message', receberNavegacao)", start);
  assert.ok(start > 0 && end > start);
  const handler = gestao.slice(start, end);
  assert.match(handler, /event\.origin !== window\.location\.origin/);
  assert.match(handler, /event\.source !== moduloEmbutidoRef\.current\?\.contentWindow/);
  assert.match(handler, /event\.data\.destino === moduloEmbutido\.id/);
  assert.match(handler, /event\.data\.empresaId === empresaId && acessoLiberado && dashboardLiberada/);
  assert.doesNotMatch(gestao, /onLoad=\{\(\) => \{[^}]*setHrefModuloVisivel/);
  assert.match(abertura, /!aberta && <TransicaoNavegacaoInterna/);
  assert.match(abertura, /inert=\{!aberta \|\| undefined\}/);
});

test('os módulos têm uma condição de abertura baseada na primeira tela autorizada', () => {
  assert.match(ler('custos/CustosClient.tsx'), /pronta=\{acessoConfirmado && dadosIniciaisProntos\}/);
  assert.match(ler('recebimentos/RecebimentosPaginaClient.tsx'), /pronta=\{acessoConfirmado && dadosIniciaisProntos\}/);
  assert.match(ler('projetos/ProjetosClient.tsx'), /pronta=\{acessoConfirmado && loaded\}/);
  assert.match(ler('marketplaces/MarketplacesClient.tsx'), /aberturaPronta = acessoConfirmado && accountsRead\.companyId === companyId && accountsRead\.settled && empresaComResumo === companyId/);
  const gestao = ler('gestao/page.tsx');
  assert.match(gestao, /pontoProntoEmpresa === empresaId/);
  assert.match(gestao, /conteudoProntoEmpresa === empresaId/);
  const conteudo = ler('components/NovidadesVendasModal.tsx');
  assert.ok(conteudo.indexOf('onAberturaConcluida?.(empresaId)') < conteudo.indexOf('await novidadesEmCurso'));
});


test('um único card branco pertence à janela principal e não inclui Cancelar', () => {
  const arquivo = ler('components/TransicaoNavegacaoInterna.tsx');
  const codigo = ts.transpileModule(arquivo, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const float = Symbol('Card de preparação');
  const acesso = Symbol('Cena institucional');
  for (const { embutido, search, somenteInterna = false, esperado } of [
    { embutido: false, search: '?inicio=1', esperado: float },
    { embutido: true, search: '?acessoInicial=1', esperado: null },
    { embutido: false, search: '?acessoInicial=1', esperado: acesso },
    { embutido: false, search: '?acessoInicial=1', somenteInterna: true, esperado: float },
  ]) {
    const window = { location: { search } };
    window.parent = embutido ? {} : window;
    const exports = {};
    runInNewContext(codigo, { window, URLSearchParams, exports, require(nome) {
      if (nome === 'react') return { useSyncExternalStore: (_inscrever, consultar) => consultar() };
      if (nome === 'react/jsx-runtime') return { jsx: (tipo, props) => ({ tipo, props }) };
      if (nome === './CarregamentoDadosModulo') return { default: float };
      if (nome === './TelaCarregandoAcesso') return { default: acesso };
      if (nome === '@/app/lib/origem-preparacao') return { PARAMETRO_PREPARACAO_ACESSO: 'acessoInicial' };
      throw Error(nome);
    }});
    const resultado = exports.default({ destino: 'Projetos', somenteInterna });
    if (!esperado) assert.equal(resultado, null);
    else if (esperado === acesso) {
      assert.equal(resultado.tipo, acesso);
      assert.equal(resultado.props.preparandoAcesso, true);
    } else {
      assert.equal(resultado.tipo, float);
      assert.equal(resultado.props.fundoBranco, true);
      assert.equal(resultado.props.titulo, 'Preparando Projetos');
      assert.equal(resultado.props.onCancelar, undefined);
    }
  }
});

test('entrada institucional mantém fundo e logo, separados da espera interna do Dashboard', () => {
  const acesso = ler('components/TelaCarregandoAcesso.tsx');
  const gestao = ler('gestao/page.tsx');
  assert.match(acesso, /<FundoAcessoResponsivo/);
  assert.match(acesso, /avantalab-positivo-com-slogan/);
  assert.match(gestao, /params.get\('inicio'\) === '1' \? 'Dashboard'/);
  assert.match(gestao, /if \(preparandoGestao\) \{\s*if \(destinoEmPreparacao\) return null;/);
});


test('sair do Dashboard remove a origem interna antes do próximo login', () => {
  const arquivo = ts.transpileModule(ler('lib/origem-preparacao.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  const guardadas = [];
  runInNewContext(arquivo, { exports, URL, window: {
    location: { href: 'http://localhost:3000/gestao?inicio=1&empresaId=e&modulo=vendas' },
    history: { replaceState: (_estado, _titulo, url) => guardadas.push(url) },
  } });
  exports.apagarMarcadoresDePreparacao('inicio', 'modulo', 'acessoInicial');
  assert.equal(guardadas.length, 1);
  assert.equal(guardadas[0].pathname + guardadas[0].search, '/gestao?empresaId=e');
  assert.equal(exports.prepararDestinoAposLogin('/projetos?empresaId=e&inicio=1'), '/projetos?empresaId=e&acessoInicial=1');
  const gestao = ler('gestao/page.tsx');
  assert.match(gestao, /apagarMarcadoresDePreparacao\('inicio', 'modulo', PARAMETRO_PREPARACAO_ACESSO\)/);
  assert.match(gestao, /handleLogin=\{iniciarLoginPelaGestao\(handleLogin\)\}/);
  assert.match(gestao, /handleGoogleLogin=\{iniciarLoginPelaGestao\(handleGoogleLogin\)\}/);
  assert.match(gestao, /handleAppleLogin=\{iniciarLoginPelaGestao\(handleAppleLogin\)\}/);
});

test('a espera de Vendas fica visível fora do Suspense enquanto a rota muda', () => {
  const gestao = ler('gestao/page.tsx');
  const inicio = gestao.indexOf('export default function AppGestao()');
  const fim = gestao.indexOf('type ControladorPreparacaoModulo', inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  const { outputText } = ts.transpileModule(gestao.slice(inicio, fim), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const elemento = (tipo, props) => ({ tipo, props });
  const Suspense = Symbol('Suspense');
  const TelaCarregandoAcesso = Symbol('Espera de entrada');
  const TransicaoNavegacaoInterna = Symbol('Espera interna');
  const GestaoRoteada = Symbol('Gestão roteada');
  let destino;
  let busca = '';
  const exports = {};
  runInNewContext(outputText, {
    exports, Suspense, TelaCarregandoAcesso, TransicaoNavegacaoInterna, GestaoRoteada,
    URLSearchParams, observarBuscaInicial: null, obterBuscaInicial: null, buscaInicialServidor: null,
    useSyncExternalStore: () => busca,
    destinoDeNavegacaoGestao: (params) => params.get('modulo') === 'vendas' ? 'Vendas e Serviços' : '',
    useState: () => [destino, (nome) => { destino = nome; }],
    require(nome) {
      assert.equal(nome, 'react/jsx-runtime');
      return { Fragment: Symbol('Fragment'), jsx: elemento, jsxs: elemento };
    },
  });
  const [esperaInicial, rotaInicial] = exports.default().props.children;
  assert.equal(esperaInicial, null);
  assert.equal(rotaInicial.tipo, Suspense);
  assert.equal(rotaInicial.props.fallback.tipo, TelaCarregandoAcesso);
  busca = '?modulo=vendas';
  const [retomada, rotaRetomada] = exports.default().props.children;
  assert.equal(retomada.props.children.props.destino, 'Vendas e Serviços');
  assert.equal(rotaRetomada.props.fallback, null);
  rotaInicial.props.children.props.definirModuloEmPreparacao('Vendas e Serviços');

  const [camada, rotaEmTransicao] = exports.default().props.children;
  assert.equal(camada.tipo, 'div');
  assert.equal(camada.props.children.tipo, TransicaoNavegacaoInterna);
  assert.equal(camada.props.children.props.destino, 'Vendas e Serviços');
  assert.equal(camada.props.children.props.somenteInterna, true);
  assert.equal(rotaEmTransicao.tipo, Suspense);
  assert.equal(rotaEmTransicao.props.fallback, null);
  rotaEmTransicao.props.children.props.definirModuloEmPreparacao('');
  const [semEspera, rotaPronta] = exports.default().props.children;
  assert.equal(semEspera, null);
  assert.equal(rotaPronta.props.fallback, null);

  const navegacao = gestao.slice(gestao.indexOf('  function navegarParaModulo('), gestao.indexOf('  function trocarModuloPeloNavegador('));
  assert.match(navegacao, /definirModuloEmPreparacao\(nome\);[\s\S]*window\.history\.pushState/);
  assert.match(gestao, /const aguardandoModulo = Boolean\(moduloEmbutido && hrefModuloVisivel !== moduloEmbutido\.href && !aberturaModuloExpirada\)/);
});

test('retomar qualquer módulo mantém a preparação interna e login explícito mantém a abertura institucional', () => {
  const gestao = ler('gestao/page.tsx');
  const bloco = gestao.slice(gestao.indexOf('function destinoDeNavegacaoGestao('), gestao.indexOf('const observarBuscaInicial'));
  const js = (fonte) => ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const registro = {};
  runInNewContext(js(ler('lib/modulos-registro.ts')), {
    exports: registro,
    require(nome) {
      assert.equal(nome, './planos-comerciais');
      return { VALOR_MODULO_AVULSO_MENSAL: 0 };
    },
  });
  const destino = runInNewContext(js(bloco) + '\ndestinoDeNavegacaoGestao', {
    PARAMETRO_PREPARACAO_ACESSO: 'acessoInicial',
    obterRegistroModulo: registro.obterRegistroModulo,
  });
  for (const modulo of registro.REGISTRO_MODULOS) {
    assert.equal(destino(new URLSearchParams({ modulo: modulo.id })), modulo.nome);
    assert.equal(destino(new URLSearchParams({ modulo: modulo.id, acessoInicial: '1' })), '');
    assert.equal(destino(new URLSearchParams({ modulo: modulo.id, entrar: '1' })), '');
  }
  assert.equal(destino(new URLSearchParams({ inicio: '1' })), 'Dashboard');
  assert.equal(destino(new URLSearchParams()), '');
  assert.equal(destino(new URLSearchParams({ modulo: 'inexistente' })), '');
});
