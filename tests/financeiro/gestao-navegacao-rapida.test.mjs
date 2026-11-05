import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const fonte = readFileSync('app/gestao/page.tsx', 'utf8');
const perfil = fonte.slice(fonte.indexOf('const carregarEmpresaSelecionada = async'), fonte.indexOf('  // --- LOCAL STORAGE', fonte.indexOf('const carregarEmpresaSelecionada = async')));

test('Gestão não troca a seleção ou financeiro por overlay e não usa liberação por tempo', () => {
  assert.doesNotMatch(fonte, /if \(carregandoPerfil && !modalSelecionarEmpresa\)|if \(modalSelecionarEmpresa && carregandoPerfil\)/);
  assert.doesNotMatch(perfil, /setTimeout\(\(\) => setCarregandoPerfil\(false\), 12000\)/);
  assert.match(fonte, /inert=\{carregandoPerfil \|\| carregandoCentroCusto/);
  assert.match(fonte, /Atualizando dados deste perfil… Você pode navegar pelas abas/);
});

test('leituras paralelas e resumos secundários aguardam contexto correto', () => {
  assert.match(perfil, /\[resultadoConfiguracoes, despesas\] = await Promise.all/);
  assert.match(fonte, /\[lancamentosBanco, caixinhaBanco, faturamentosBanco, faturamentosEntradasBanco\] = await Promise.all/);
  assert.match(fonte, /!dashboardLiberada \|\| !configuracoesCarregadas\) return/);
  assert.ok((fonte.match(/if \(carregandoPerfil \|\| !configuracoesCarregadas\) return;/g) || []).length >= 3);
  assert.match(perfil, /setLancamentos\(\[\]\)/);
  assert.match(perfil, /setFaturamentosEntradasConsolidados\(\[\]\)/);
  assert.match(fonte, /if \(!ativo \|\| carga !== cargaPerfilRef.current\) return/);
});

test('resposta atrasada de perfil anterior não altera destino nem concessões do novo', async () => {
  const pendentes = new Map();
  const efeitos = [];
  const contexto = {
    cargaPerfilRef: { current: 0 }, empresasDoUsuario: [], URLSearchParams,
    window: { location: { search: '' } },
    buscarAcessosUsuario: id => new Promise(resolve => pendentes.set(id, resolve)),
    validarSessaoDoDispositivo: async () => ({ ok: true, ativa: true }),
    destinoAposLogin: id => `/modulos?empresaId=${id}`,
    router: { replace: href => efeitos.push(['destino', href]) },
  };
  for (const nome of new Set(perfil.match(/\bset[A-Z]\w+/g))) contexto[nome] = value => efeitos.push([nome, value]);
  vm.runInNewContext(ts.transpileModule(`${perfil}\nglobalThis.carregar = carregarEmpresaSelecionada;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, contexto);
  const antigo = contexto.carregar({ id: 'antigo' });
  const novo = contexto.carregar({ id: 'novo' });
  pendentes.get('novo')([{ empresa: { id: 'novo' }, dashboard: false, modulos: [{ id: 'projetos' }] }]);
  await novo;
  const quantidade = efeitos.length;
  pendentes.get('antigo')([{ empresa: { id: 'antigo' }, dashboard: false, modulos: [{ id: 'custos' }] }]);
  await antigo;
  assert.equal(efeitos.length, quantidade);
  assert.equal(efeitos.filter(e => e[0] === 'destino').at(-1)[1], '/modulos?empresaId=novo');
});

test('falha de configuração encerra busy, mantém dados limpos e oferece erro regional', async () => {
  const efeitos = [];
  const contexto = {
    cargaPerfilRef: { current: 0 }, empresasDoUsuario: [], URLSearchParams,
    window: { location: { search: '' } }, meses: ['JANEIRO'], ordemDashboardPadrao: {},
    normalizarTipoPerfil: () => 'empresa',
    buscarAcessosUsuario: async () => [{ empresa: { id: 'novo', corPrimaria: '#003E73', temaEscuro: false }, dashboard: true, modulos: [] }],
    supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'u', email: 'teste@empresa.com', user_metadata: {} } } } }) }, rpc: () => Promise.resolve({ error: null }) },
    buscarConfiguracoes: async () => { throw new Error('Rede indisponível'); },
    buscarDespesasCadastradas: async () => [],
  };
  for (const nome of new Set(perfil.match(/\bset[A-Z]\w+/g))) contexto[nome] = value => efeitos.push([nome, value]);
  vm.runInNewContext(ts.transpileModule(`${perfil}\nglobalThis.carregar = carregarEmpresaSelecionada;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, contexto);
  await contexto.carregar({ id: 'novo', telefone_confirmado: true, perfil: 'gestor_master' });
  assert.equal(efeitos.filter(e => e[0] === 'setCarregandoPerfil').at(-1)[1], false);
  assert.match(efeitos.find(e => e[0] === 'setErroDadosFinanceiros' && e[1])?.[1] || '', /Tente novamente/);
  assert.equal(efeitos.find(e => e[0] === 'setConfiguracoesCarregadas')?.[1], false);
  assert.equal(efeitos.find(e => e[0] === 'setLancamentos')?.[1].length, 0);
});

test('carga financeira inicia leituras em paralelo e descarta resultado após nova geração', async () => {
  const inicio = fonte.indexOf('useEffect(() => {', fonte.indexOf('// 2. Carrega Dados Financeiros do Ano pelo Supabase'));
  const fim = fonte.indexOf('\nuseEffect(() => {', inicio + 1);
  const efeito = fonte.slice(inicio, fim);
  const efeitos = [];
  const pendentes = new Map();
  let encerrar;
  const contexto = {
    mounted: true, empresaId: 'a', dashboardLiberada: true, configuracoesCarregadas: true,
    anoSelecionado: '2026', centrosCustoAtivo: false, centroCustoSelecionadoId: '', revisaoDadosFinanceiros: 0,
    cargaPerfilRef: { current: 1 }, contextoFinanceiroRef: { current: '' },
    useEffect: fn => { encerrar = fn(); },
    supabase: { rpc: async () => ({}) }, garantirFixasDoMesAtual: async () => {},
  };
  for (const nome of ['buscarLancamentos', 'buscarCaixinhaMovimentos', 'buscarFaturamentos', 'buscarFaturamentosEntradas']) contexto[nome] = () => new Promise(resolve => pendentes.set(nome, resolve));
  for (const nome of new Set(efeito.match(/\bset[A-Z]\w+/g))) contexto[nome] = value => efeitos.push([nome, value]);
  vm.runInNewContext(ts.transpileModule(efeito, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, contexto);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pendentes.size, 4, 'todas as leituras devem iniciar sem esperar a primeira terminar');
  const quantidade = efeitos.length;
  contexto.cargaPerfilRef.current += 1;
  for (const resolver of pendentes.values()) resolver([]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(efeitos.length, quantidade, 'resposta antiga não pode aplicar dados nem liberar a nova carga');
  encerrar();
});
