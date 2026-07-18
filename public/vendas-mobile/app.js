const STORAGE_KEY = 'avantalab.vendas_mobile.v1';
const GOOGLE_CONNECTING_KEY = 'avantalab.vendas_mobile.google_connecting';
const PREPARING_VIEWPORT_HEIGHT_KEY = 'avantalab.vendas_mobile.preparing_viewport_height';
const ENTRADA_VENDAS_PELA_GESTAO_KEY = 'avantalab_vendas_entrada_gestao';
const CACHE_VENDAS_DB = 'avantalab.vendas_mobile.cache';
const CACHE_VENDAS_STORE = 'sessoes';
const CACHE_VENDAS_PENDENCIAS_STORE = 'pendencias';
const CACHE_VENDAS_VERSAO = 5;
const CACHE_VENDAS_VALIDADE_MS = 1000 * 60 * 60 * 24 * 7;
const HOJE = new Date();
const INICIO_MES = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1);

function isoData(data) {
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const estadoInicial = {
  usuario: {
    nome: 'Vendedor Autônomo',
    perfil: 'porta a porta',
  },
  produtos: [],
  pacotesProdutos: [],
  clientes: [],
  vendas: [],
  pagamentos: [],
  conteudosVendas: null,
  divulgacaoPastas: [],
  divulgacaoMateriais: [],
  carrinho: [],
  aba: 'dashboard',
  menuAberto: true,
  busca: '',
  autenticado: true,
  filtroInicio: isoData(INICIO_MES),
  filtroFim: isoData(HOJE),
  mesReferencia: isoData(INICIO_MES),
  agendaAno: new Date().getFullYear(),
  agendaMes: new Date().getMonth(),
  agendaDiaSelecionado: null,
  agendaFormAberto: false,
  agendaClientePreselecionado: '',
  agendaDataFormulario: '',
  agendaExpandida: false,
  agendaItemMovendo: null,
  agendaAnimar: '',
  agendaItens: [],
  agendaAlertaAniversarioDias: 7,
  metaMensal: 0,
  dashboardDiasInativos: 30,
  dashboardConsignadosExpandido: false,
  temaEscuro: false,
  acessoVendas: null,
  solicitacaoAcesso: null,
  usuarioSemAcesso: false,
  moduloVendasAtivo: true,
  sincronizacaoCatalogo: { adicionados: 0, ja_recebidos: 0 },
  integracaoGestao: { base_receita: 'recebidos', pode_configurar: false },
  vinculosComerciais: [],
  vinculoComercialAtivo: null,
  perfisFinanceiros: [],
  atalhoInferiorEsquerdo: 'tema',
  atalhoInferiorDireito: 'agenda',
  ordemSalaBotoes: [],
  organizandoSalaBotoes: false,
  seletorSistemaAberto: false,
  seletorSistemaInicialBloqueante: false,
  lembrarSistemaInicial: false,
  sistemaInicialAvaliado: false,
  seletorPerfilGestaoAberto: false,
  perfisGestaoTroca: [],
  perfisGestaoTrocaCarregando: false,
  perfisGestaoTrocaErro: '',
  perfilGestaoConfirmacao: null,
};

let state = carregarEstado();
document.documentElement.classList.toggle('dark-theme', Boolean(state.temaEscuro));
let buscaAplicada = state.busca || '';
let backendAtivo = Boolean(window.VendasDb?.client);
let carregandoBackend = backendAtivo;
let loginTipo = 'email';
let modoLogin = 'entrar';
let cadastroEtapa = 'dados';
let cadastroPendente = null;
let segundosReenvioSmsCadastro = 0;
let timerReenvioSmsCadastro = null;
let conectandoGoogle = sessionStorage.getItem(GOOGLE_CONNECTING_KEY) === '1';
let recuperacaoSenhaVendas = null;
let vinculoTelefonePendente = null;
let telefonePerfilPendente = null;
let telefonePerfilSalvando = false;
let rolagemAnteriorSheet = 0;
let cardsClientesEmDestaque = [];
let cardClienteEmDestaque = null;
let quadroDestaqueClientes = 0;
let calendarioCentralizado = null;
let botaoFeedbackAtivo = null;
let atualizacaoPwaPendente = false;
let filtroPedidos = 'todos';
let limitePedidos = 10;
let limiteClientesPagamentos = 10;
const ITENS_POR_LOTE_HISTORICO = 10;
let pedidoClienteRascunho = null;
let conversaoConsignadoRascunho = null;
let pagamentoClienteRascunho = null;
let pagamentoClienteSalvando = false;
let clientePersistenciaIdAtual = '';
let ordemAlfabetica = 'asc';
let feedbackVendasEnviando = false;
let feedbackVendasEnviado = false;
let produtoImagemUploadPendente = null;
let divulgacaoPastaAtualId = null;
let navegacaoInferiorBloqueadaAte = 0;
let estoqueProdutoAtualId = '';
let estoqueMovimentosAtuais = [];
let arrasteSalaBotoes = null;
let preparandoRecursosSala = false;
let recursosSalaBotoesPromise = null;
const imagensSalaBotoesPrecarregadas = new Map();
let temporizadorReconstrucaoSala = 0;
let temporizadorGarantiaSala = 0;
let tentativasGarantiaSala = 0;
let salaEmLayoutCompacto = window.matchMedia('(max-width: 850px)').matches;
let assinaturaSalaRenderizada = '';
let rolagemPorAba = {};
let contextoAberturaVendas = null;
let sincronizacaoCatalogoEmAndamento = false;
let revisaoDadosOperacionais = 0;
let mutacoesDadosEmAndamento = 0;
let filaCacheVendas = Promise.resolve();
let reenviandoPendenciasVendas = false;

try {
  rolagemPorAba = JSON.parse(sessionStorage.getItem('avantalab.vendas_mobile.rolagem_abas') || '{}') || {};
} catch {
  rolagemPorAba = {};
}

const PAISES_DDI = [
  ['Brasil', '55', '🇧🇷'], ['Portugal', '351', '🇵🇹'], ['Estados Unidos / Canadá', '1', '🇺🇸'],
  ['Argentina', '54', '🇦🇷'], ['Uruguai', '598', '🇺🇾'], ['Paraguai', '595', '🇵🇾'],
  ['Chile', '56', '🇨🇱'], ['Bolívia', '591', '🇧🇴'], ['Peru', '51', '🇵🇪'], ['Colômbia', '57', '🇨🇴'],
  ['Equador', '593', '🇪🇨'], ['Venezuela', '58', '🇻🇪'], ['México', '52', '🇲🇽'], ['Panamá', '507', '🇵🇦'],
  ['Costa Rica', '506', '🇨🇷'], ['Guatemala', '502', '🇬🇹'], ['Honduras', '504', '🇭🇳'], ['El Salvador', '503', '🇸🇻'],
  ['Nicarágua', '505', '🇳🇮'], ['Cuba', '53', '🇨🇺'], ['Angola', '244', '🇦🇴'], ['Moçambique', '258', '🇲🇿'],
  ['Cabo Verde', '238', '🇨🇻'], ['Espanha', '34', '🇪🇸'], ['França', '33', '🇫🇷'], ['Itália', '39', '🇮🇹'],
  ['Alemanha', '49', '🇩🇪'], ['Reino Unido', '44', '🇬🇧'], ['Irlanda', '353', '🇮🇪'], ['Países Baixos', '31', '🇳🇱'],
  ['Bélgica', '32', '🇧🇪'], ['Suíça', '41', '🇨🇭'], ['Áustria', '43', '🇦🇹'], ['Suécia', '46', '🇸🇪'],
  ['Noruega', '47', '🇳🇴'], ['Dinamarca', '45', '🇩🇰'], ['Finlândia', '358', '🇫🇮'], ['Polônia', '48', '🇵🇱'],
  ['Rússia', '7', '🇷🇺'], ['Ucrânia', '380', '🇺🇦'], ['Grécia', '30', '🇬🇷'], ['Turquia', '90', '🇹🇷'],
  ['Israel', '972', '🇮🇱'], ['Emirados Árabes Unidos', '971', '🇦🇪'], ['Arábia Saudita', '966', '🇸🇦'], ['Catar', '974', '🇶🇦'],
  ['Índia', '91', '🇮🇳'], ['China', '86', '🇨🇳'], ['Japão', '81', '🇯🇵'], ['Coreia do Sul', '82', '🇰🇷'],
  ['Singapura', '65', '🇸🇬'], ['Malásia', '60', '🇲🇾'], ['Tailândia', '66', '🇹🇭'], ['Indonésia', '62', '🇮🇩'],
  ['Filipinas', '63', '🇵🇭'], ['Vietnã', '84', '🇻🇳'], ['Austrália', '61', '🇦🇺'], ['Nova Zelândia', '64', '🇳🇿'],
  ['África do Sul', '27', '🇿🇦'], ['Nigéria', '234', '🇳🇬'], ['Egito', '20', '🇪🇬'], ['Marrocos', '212', '🇲🇦'],
];

const UFS_BRASIL = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins'],
];

const app = document.getElementById('app');

function fixarAlturaPreparacao() {
  const altura = Math.round(window.visualViewport?.height || window.innerHeight);
  if (!Number.isFinite(altura) || altura < 1) return;
  document.documentElement.style.setProperty('--vendas-preparing-height', `${altura}px`);
  try { sessionStorage.setItem(PREPARING_VIEWPORT_HEIGHT_KEY, String(altura)); } catch { /* armazenamento indisponível */ }
}

function liberarAlturaPreparacao() {
  document.documentElement.style.removeProperty('--vendas-preparing-height');
  try { sessionStorage.removeItem(PREPARING_VIEWPORT_HEIGHT_KEY); } catch { /* armazenamento indisponível */ }
}

function reconstruirSalaAposRotacao() {
  window.clearTimeout(temporizadorReconstrucaoSala);
  temporizadorReconstrucaoSala = window.setTimeout(() => {
    const novoLayoutCompacto = window.matchMedia('(max-width: 850px)').matches;
    salaEmLayoutCompacto = novoLayoutCompacto;
    if (!state.autenticado || !state.menuAberto || carregandoBackend || conectandoGoogle || preparandoRecursosSala) return;
    arrasteSalaBotoes = null;
    state.organizandoSalaBotoes = false;
    render();
  }, 240);
}

function sincronizarSalaAoMudarLargura() {
  const novoLayoutCompacto = window.matchMedia('(max-width: 850px)').matches;
  if (novoLayoutCompacto === salaEmLayoutCompacto) return;
  salaEmLayoutCompacto = novoLayoutCompacto;
  reconstruirSalaAposRotacao();
}

function formatarTelefoneCadastro(input) {
  formatarTelefoneCampo(input, 'cadastroDdi');
}

function formatarTelefoneCampo(input, ddiId) {
  const ddi = document.getElementById(ddiId)?.value || '55';
  const numeros = String(input.value || '').replace(/\D/g, '');
  if (ddi !== '55') {
    input.value = numeros.slice(0, 15);
    return;
  }

  const telefone = numeros.slice(0, 11);
  if (telefone.length <= 2) input.value = telefone ? `(${telefone}` : '';
  else if (telefone.length <= 6) input.value = `(${telefone.slice(0, 2)}) ${telefone.slice(2)}`;
  else if (telefone.length <= 10) input.value = `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`;
  else input.value = `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`;
}

function dataNascimentoParaCampo(valorData) {
  const valor = String(valorData || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return '';
  const [, mes, dia] = valor.split('-');
  return `${dia}/${mes}`;
}

function formatarDataNascimentoCampo(input) {
  const digitos = String(input.value || '').replace(/\D/g, '').slice(0, 4);
  input.value = digitos.replace(/(\d{2})(\d)/, '$1/$2');
}

function dataNascimentoParaIso(valorData) {
  const valor = String(valorData || '').trim();
  if (!valor) return null;
  const partes = valor.match(/^(\d{2})\/(\d{2})$/);
  if (!partes) return undefined;
  const [, dia, mes] = partes;
  // O ano-base é apenas técnico: aniversários são sempre exibidos e repetidos por dia/mês.
  const data = new Date(`2000-${mes}-${dia}T12:00:00`);
  if (data.getMonth() + 1 !== Number(mes) || data.getDate() !== Number(dia)) return undefined;
  return `2000-${mes}-${dia}`;
}

document.addEventListener('input', (event) => {
  const campo = event.target;
  if (campo?.id === 'cadastroTelefone') formatarTelefoneCadastro(campo);
  if (campo?.dataset.phoneField) formatarTelefoneCampo(campo, campo.dataset.ddiTarget);
});

document.addEventListener('change', (event) => {
  if (event.target?.id === 'cadastroDdi') {
    const telefone = document.getElementById('cadastroTelefone');
    if (telefone) formatarTelefoneCadastro(telefone);
  }
  if (event.target?.dataset.phoneDdi) {
    const telefone = document.getElementById(event.target.dataset.phoneTarget);
    if (telefone) formatarTelefoneCampo(telefone, event.target.id);
  }
});

if (window.__VENDAS_MOBILE_EMBEDDED__ && !document.querySelector('base[data-vendas-mobile]')) {
  const base = document.createElement('base');
  base.href = '/vendas-mobile/';
  base.dataset.vendasMobile = 'true';
  document.head.prepend(base);
}

function carregarEstado() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    // Pesquisas são contexto temporário: jamais são restauradas junto com a
    // sala de botões em uma nova abertura.
    return salvo ? { ...estadoInicial, ...salvo, carrinho: [], busca: '', menuAberto: true } : { ...estadoInicial };
  } catch {
    return { ...estadoInicial };
  }
}

function salvarEstado() {
  const persistente = backendAtivo ? {
    usuario: state.usuario,
    aba: state.aba,
    filtroInicio: state.filtroInicio,
    filtroFim: state.filtroFim,
    mesReferencia: state.mesReferencia,
    agendaAno: state.agendaAno,
    agendaMes: state.agendaMes,
    agendaDiaSelecionado: state.agendaDiaSelecionado,
    agendaItens: state.agendaItens,
    agendaAlertaAniversarioDias: state.agendaAlertaAniversarioDias,
    metaMensal: state.metaMensal,
    dashboardDiasInativos: state.dashboardDiasInativos,
    dashboardConsignadosExpandido: state.dashboardConsignadosExpandido,
    temaEscuro: state.temaEscuro,
    atalhoInferiorEsquerdo: state.atalhoInferiorEsquerdo,
    atalhoInferiorDireito: state.atalhoInferiorDireito,
    ordemSalaBotoes: state.ordemSalaBotoes,
  } : { ...state, carrinho: [] };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistente));
  } catch (error) {
    console.warn('Não foi possível salvar as preferências locais do Vendas.', error);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* armazenamento indisponível */ }
  }
}

function abrirBancoCacheVendas() {
  return new Promise((resolver, rejeitar) => {
    if (!('indexedDB' in window)) { rejeitar(new Error('Cache local indisponível.')); return; }
    const pedido = window.indexedDB.open(CACHE_VENDAS_DB, CACHE_VENDAS_VERSAO);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains(CACHE_VENDAS_STORE)) pedido.result.createObjectStore(CACHE_VENDAS_STORE);
      if (!pedido.result.objectStoreNames.contains(CACHE_VENDAS_PENDENCIAS_STORE)) pedido.result.createObjectStore(CACHE_VENDAS_PENDENCIAS_STORE);
    };
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error || new Error('Não foi possível abrir o cache local.'));
  });
}

function chaveCacheVendas(usuarioId = state.usuario?.id, empresaId = state.acessoVendas?.empresa_id) {
  if (!usuarioId || !empresaId) return '';
  return `${usuarioId}:${empresaId}`;
}

async function lerCacheVendas() {
  const chave = chaveCacheVendas();
  if (!chave) return null;
  try {
    const banco = await abrirBancoCacheVendas();
    const cache = await new Promise((resolver, rejeitar) => {
      const pedido = banco.transaction(CACHE_VENDAS_STORE, 'readonly').objectStore(CACHE_VENDAS_STORE).get(chave);
      pedido.onsuccess = () => resolver(pedido.result || null);
      pedido.onerror = () => rejeitar(pedido.error);
    });
    banco.close();
    if (!cache || cache.versao !== CACHE_VENDAS_VERSAO || Date.now() - Number(cache.atualizadoEm || 0) > CACHE_VENDAS_VALIDADE_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

async function salvarCacheVendas() {
  const chave = chaveCacheVendas();
  if (!chave || !state.autenticado || !state.acessoVendas || state.moduloVendasAtivo === false) return;
  const cacheAtual = {
    versao: CACHE_VENDAS_VERSAO,
    atualizadoEm: Date.now(),
    dados: {
      produtos: state.produtos,
      pacotesProdutos: state.pacotesProdutos,
      clientes: state.clientes,
      vendas: state.vendas,
      pagamentos: state.pagamentos,
      conteudosVendas: state.conteudosVendas,
      divulgacaoPastas: state.divulgacaoPastas,
      divulgacaoMateriais: state.divulgacaoMateriais,
      sincronizacaoCatalogo: state.sincronizacaoCatalogo,
      integracaoGestao: state.integracaoGestao,
      vinculosComerciais: state.vinculosComerciais,
      vinculoComercialAtivo: state.vinculoComercialAtivo,
      perfisFinanceiros: state.perfisFinanceiros,
    },
  };
  let cache;
  try {
    cache = typeof structuredClone === 'function'
      ? structuredClone(cacheAtual)
      : JSON.parse(JSON.stringify(cacheAtual));
  } catch {
    return;
  }
  filaCacheVendas = filaCacheVendas.catch(() => undefined).then(async () => {
    try {
      const banco = await abrirBancoCacheVendas();
      await new Promise((resolver, rejeitar) => {
        const pedido = banco.transaction(CACHE_VENDAS_STORE, 'readwrite').objectStore(CACHE_VENDAS_STORE).put(cache, chave);
        pedido.onsuccess = () => resolver();
        pedido.onerror = () => rejeitar(pedido.error);
      });
      banco.close();
    } catch { /* o Supabase continua sendo a fonte oficial dos dados */ }
  });
  await filaCacheVendas;
}

function iniciarMutacaoDadosVendas() {
  revisaoDadosOperacionais += 1;
  mutacoesDadosEmAndamento += 1;
}

async function confirmarMutacaoDadosVendas() {
  revisaoDadosOperacionais += 1;
  salvarEstado();
  await salvarCacheVendas();
}

function finalizarMutacaoDadosVendas() {
  mutacoesDadosEmAndamento = Math.max(0, mutacoesDadosEmAndamento - 1);
}

function uuidPersistenciaVendas() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caractere) => {
    const aleatorio = Math.floor(Math.random() * 16);
    const valor = caractere === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8;
    return valor.toString(16);
  });
}

function chavePendenciaVendas(tipo, identificador) {
  const contexto = chaveCacheVendas();
  return contexto && identificador ? `${contexto}:${tipo}:${identificador}` : '';
}

async function registrarPendenciaVendas(tipo, identificador, payload) {
  const contexto = chaveCacheVendas();
  const chave = chavePendenciaVendas(tipo, identificador);
  if (!chave) return '';
  try {
    const banco = await abrirBancoCacheVendas();
    await new Promise((resolver, rejeitar) => {
      const pedido = banco.transaction(CACHE_VENDAS_PENDENCIAS_STORE, 'readwrite')
        .objectStore(CACHE_VENDAS_PENDENCIAS_STORE)
        .put({ contexto, tipo, identificador, payload, atualizadoEm: Date.now() }, chave);
      pedido.onsuccess = () => resolver();
      pedido.onerror = () => rejeitar(pedido.error);
    });
    banco.close();
    return chave;
  } catch {
    return '';
  }
}

async function removerPendenciaVendas(chave) {
  if (!chave) return;
  try {
    const banco = await abrirBancoCacheVendas();
    await new Promise((resolver, rejeitar) => {
      const pedido = banco.transaction(CACHE_VENDAS_PENDENCIAS_STORE, 'readwrite')
        .objectStore(CACHE_VENDAS_PENDENCIAS_STORE)
        .delete(chave);
      pedido.onsuccess = () => resolver();
      pedido.onerror = () => rejeitar(pedido.error);
    });
    banco.close();
  } catch { /* a operação idempotente será conferida novamente */ }
}

async function listarPendenciasVendas() {
  const contexto = chaveCacheVendas();
  if (!contexto) return [];
  try {
    const banco = await abrirBancoCacheVendas();
    const registros = await new Promise((resolver, rejeitar) => {
      const pedido = banco.transaction(CACHE_VENDAS_PENDENCIAS_STORE, 'readonly')
        .objectStore(CACHE_VENDAS_PENDENCIAS_STORE)
        .getAll();
      pedido.onsuccess = () => resolver(pedido.result || []);
      pedido.onerror = () => rejeitar(pedido.error);
    });
    banco.close();
    return registros.filter((registro) => registro.contexto === contexto);
  } catch {
    return [];
  }
}

function erroTemporarioPersistencia(error) {
  const texto = String(error?.message || error || '');
  return !navigator.onLine || /fetch|network|conex|offline|timeout|tempo limite|failed to fetch|load failed/i.test(texto);
}

async function executarMutacaoGarantidaVendas(tipo, identificador, payload, executar) {
  const chave = await registrarPendenciaVendas(tipo, identificador, payload);
  try {
    const resultado = await executar();
    await removerPendenciaVendas(chave);
    return resultado;
  } catch (error) {
    if (!erroTemporarioPersistencia(error)) await removerPendenciaVendas(chave);
    else if (chave) error.persistenciaPendente = true;
    else error.persistenciaLocalIndisponivel = true;
    throw error;
  }
}

async function limparCacheVendas(usuarioId = state.usuario?.id, empresaId = state.acessoVendas?.empresa_id, limparPendencias = false) {
  const chave = chaveCacheVendas(usuarioId, empresaId);
  if (!chave) return;
  try {
    const banco = await abrirBancoCacheVendas();
    await new Promise((resolver, rejeitar) => {
      const pedido = banco.transaction(CACHE_VENDAS_STORE, 'readwrite').objectStore(CACHE_VENDAS_STORE).delete(chave);
      pedido.onsuccess = () => resolver();
      pedido.onerror = () => rejeitar(pedido.error);
    });
    if (limparPendencias) {
      await new Promise((resolver, rejeitar) => {
        const pedido = banco.transaction(CACHE_VENDAS_PENDENCIAS_STORE, 'readwrite')
          .objectStore(CACHE_VENDAS_PENDENCIAS_STORE)
          .openCursor();
        pedido.onsuccess = () => {
          const cursor = pedido.result;
          if (!cursor) { resolver(); return; }
          if (cursor.value?.contexto === chave) cursor.delete();
          cursor.continue();
        };
        pedido.onerror = () => rejeitar(pedido.error);
      });
    }
    banco.close();
  } catch { /* o logout continua mesmo sem acesso ao cache */ }
}

function restaurarCacheVendas(cache) {
  const dados = cache?.dados;
  if (!dados || !Array.isArray(dados.produtos) || !Array.isArray(dados.clientes) || !Array.isArray(dados.vendas) || !Array.isArray(dados.pagamentos)) return false;
  state.produtos = dados.produtos;
  state.pacotesProdutos = dados.pacotesProdutos || [];
  state.clientes = dados.clientes;
  state.vendas = dados.vendas;
  state.pagamentos = dados.pagamentos;
  state.conteudosVendas = dados.conteudosVendas || null;
  state.divulgacaoPastas = dados.divulgacaoPastas || [];
  state.divulgacaoMateriais = dados.divulgacaoMateriais || [];
  state.sincronizacaoCatalogo = dados.sincronizacaoCatalogo || { adicionados: 0, ja_recebidos: 0 };
  state.integracaoGestao = dados.integracaoGestao || { base_receita: 'recebidos', pode_configurar: false };
  state.vinculosComerciais = dados.vinculosComerciais || [];
  state.vinculoComercialAtivo = dados.vinculoComercialAtivo || null;
  state.perfisFinanceiros = dados.perfisFinanceiros || [];
  // O cache restaura dados, não a tela anterior: a nova abertura continua
  // obrigatoriamente na sala de botões.
  state.menuAberto = true;
  return true;
}

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
}

function numeroParaCampoMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numeroCampoMoeda(valorCampo) {
  const texto = String(valorCampo || '').trim().replace(/R\$|\s/g, '');
  if (!texto) return 0;
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarCampoMoeda(input) {
  if (!(input instanceof HTMLInputElement)) return 0;
  const digitos = input.value.replace(/\D/g, '');
  const numero = digitos ? Number(digitos) / 100 : 0;
  input.value = numeroParaCampoMoeda(numero);
  return numero;
}

function lerCampoMoeda(idCampo) {
  return numeroCampoMoeda(valor(idCampo));
}

function dataBR(value) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

function dataCurtaBR(value) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

function dataCompactaBR(value) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(value));
}

function id(prefixo) {
  return `${prefixo}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function toast(msg) {
  const atual = document.querySelector('.toast');
  if (atual) atual.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

let spriteIconesEstavelPronto = false;

function prepararSpriteIconesEstavel() {
  fetch('./assets/icons.svg')
    .then((resposta) => resposta.ok ? resposta.text() : Promise.reject(new Error('Sprite indisponível.')))
    .then((conteudo) => {
      const origem = document.createElement('div');
      origem.innerHTML = conteudo;
      const defs = origem.querySelector('defs');
      if (!defs || document.getElementById('vendas-sprite-icones')) return;
      const sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sprite.id = 'vendas-sprite-icones';
      sprite.setAttribute('aria-hidden', 'true');
      sprite.setAttribute('focusable', 'false');
      sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
      sprite.appendChild(document.importNode(defs, true));
      document.body.prepend(sprite);
      spriteIconesEstavelPronto = true;
    })
    .catch(() => undefined);
}

function svgIcon(nome, classe = '') {
  const origem = spriteIconesEstavelPronto ? `#${nome}` : `./assets/icons.svg#${nome}`;
  return `<svg class="svg-icon ${classe}" viewBox="0 0 24 24" aria-hidden="true"><use href="${origem}"></use></svg>`;
}

const ICONES_SVG_ESTAVEIS = {
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3h4v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21v4h-.09A1.65 1.65 0 0 0 19.4 15Z"/>',
  calendar: '<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
  cake: '<path d="M4 11h16v9H4zM3 20h18"/><path d="M7 11V8M12 11V6M17 11V8M7 5h0M12 3h0M17 5h0"/><path d="M4 14h16"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/>',
  'message-circle': '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5.1A8 8 0 1 1 21 15Z"/>',
};

function svgIconEstavel(nome, classe = '') {
  const conteudo = ICONES_SVG_ESTAVEIS[nome];
  return conteudo ? `<svg class="svg-icon ${classe}" viewBox="0 0 24 24" aria-hidden="true">${conteudo}</svg>` : svgIcon(nome, classe);
}

function logoVendas() {
  return `<span class="vendas-brand-logo"><img class="vendas-logo-claro" src="/vendas-mobile/assets/logo-vendas-claro.png" alt="AvantaLab — Cada venda, um avanço"><img class="vendas-logo-escuro" src="/vendas-mobile/assets/logo-vendas-escuro.png" alt="" aria-hidden="true"></span>`;
}

function setAba(aba) {
  const entradaClientes = aba === 'clientes'
    && (state.aba !== 'clientes' || state.menuAberto || Boolean(state.busca) || Boolean(buscaAplicada));
  if (aba === state.aba && !state.menuAberto && !document.getElementById('sheetBackdrop')) {
    if (entradaClientes) {
      limparPesquisaClientesAoEntrar();
      render();
    }
    return;
  }
  if (entradaClientes) limparPesquisaClientesAoEntrar();
  if (!state.menuAberto) {
    rolagemPorAba[state.aba] = window.scrollY || document.documentElement.scrollTop || 0;
    try { sessionStorage.setItem('avantalab.vendas_mobile.rolagem_abas', JSON.stringify(rolagemPorAba)); } catch { /* armazenamento indisponível */ }
  }
  if (aba !== 'agenda') fecharCamadasAgenda();
  if (aba !== 'divulgacao') divulgacaoPastaAtualId = null;
  if (aba === 'vendas' && state.aba !== 'vendas') limitePedidos = 10;
  if (aba === 'vender' && state.aba !== 'vender') limiteClientesPagamentos = 10;
  if (aba === 'informacoes' && state.aba !== 'informacoes') {
    feedbackVendasEnviando = false;
    feedbackVendasEnviado = false;
  }
  state.aba = aba;
  state.menuAberto = false;
  render();
  const rolagemSalva = Math.max(0, Number(rolagemPorAba[aba] || 0));
  requestAnimationFrame(() => window.scrollTo(0, rolagemSalva));
}

function alternarMenu() {
  state.menuAberto = !state.menuAberto;
  render();
}

function abrirSalaBotoes() {
  if (state.menuAberto && salaEmLayoutCompacto && salaBotoesEstaCompleta()) return;
  // Garante que a volta à sala reutilize imagens já carregadas e decodificadas.
  void prepararRecursosSalaBotoes();
  fecharSheet();
  fecharCamadasAgenda();
  divulgacaoPastaAtualId = null;
  assinaturaSalaRenderizada = '';
  state.menuAberto = true;
  render();
}

function totaisPeriodo() {
  const inicio = new Date(`${state.filtroInicio}T00:00:00`);
  const fim = new Date(`${state.filtroFim}T23:59:59`);
  const vendasMes = state.vendas.filter((v) => {
    const d = new Date(v.criado_em);
    return d >= inicio && d <= fim && v.status !== 'cancelada' && !pedidoEhConsignado(v) && !pedidoSomenteBonificado(v);
  });
  const total = vendasMes.reduce((s, v) => s + Number(v.total || 0), 0);
  const itens = vendasMes.reduce((s, v) => s + (v.itens || []).reduce(
    (x, i) => x + (itemPedidoBonificado(i) ? 0 : Number(i.quantidade || 0)),
    0,
  ), 0);
  const produtosSemCusto = new Set();
  vendasMes.forEach((venda) => (venda.itens || []).forEach((item) => {
    const produto = state.produtos.find((registro) => registro.id === item.produto_id);
    const custoItem = Number(item.preco_custo ?? produto?.preco_custo ?? produto?.metadados?.preco_custo ?? 0);
    if (Number(item.quantidade || 0) > 0 && custoItem <= 0) produtosSemCusto.add(item.produto_id || item.produto_nome || 'produto');
  }));
  const custo = vendasMes.reduce((soma, venda) => {
    const itensVenda = venda.itens || [];
    const todosComCustoHistorico = itensVenda.length > 0 && itensVenda.every((item) => item.preco_custo !== null && item.preco_custo !== undefined && Number.isFinite(Number(item.preco_custo)));
    if (todosComCustoHistorico) return soma + itensVenda.reduce((subtotal, item) => subtotal + Number(item.quantidade || 0) * Number(item.preco_custo || 0), 0);
    const custoRegistrado = Number(metadadosPedido(venda).custo_total);
    if (Number.isFinite(custoRegistrado) && custoRegistrado > 0) return soma + custoRegistrado;
    return soma + itensVenda.reduce((subtotal, item) => {
      const produto = state.produtos.find((registro) => registro.id === item.produto_id);
      return subtotal + Number(item.quantidade || 0) * Number(item.preco_custo ?? produto?.preco_custo ?? produto?.metadados?.preco_custo ?? 0);
    }, 0);
  }, 0);
  return {
    vendasMes,
    total,
    custo,
    margem: total - custo,
    pedidos: vendasMes.length,
    ticket: vendasMes.length ? total / vendasMes.length : 0,
    itens,
    produtosSemCusto: produtosSemCusto.size,
  };
}

function aplicarFiltroDashboard() {
  if (!state.filtroInicio || !state.filtroFim || state.filtroInicio > state.filtroFim) {
    toast('Informe um período válido.');
    return;
  }
  render();
  toast('Filtro aplicado!');
}

function campoDataCentralizado(idCampo, data, rotulo) {
  const valorData = /^\d{4}-\d{2}-\d{2}$/.test(String(data || '')) ? data : isoData(new Date());
  return `<label class="transaction-field transaction-date-field"><span>${escapeHtml(rotulo)}</span><button id="${idCampo}" type="button" class="date-picker-button" value="${valorData}" onclick="abrirCalendarioCentralizado('${idCampo}')">${dataBR(`${valorData}T12:00:00`)}</button></label>`;
}

function abrirCalendarioCentralizado(idCampo) {
  const campo = document.getElementById(idCampo);
  if (!campo) return;
  const data = String(campo.value || isoData(new Date()));
  const referencia = new Date(`${data}T12:00:00`);
  calendarioCentralizado = { idCampo, data: Number.isNaN(referencia.getTime()) ? new Date() : referencia };
  renderCalendarioCentralizado();
}

function renderCalendarioCentralizado() {
  if (!calendarioCentralizado) return;
  document.getElementById('calendarPickerBackdrop')?.remove();
  const atual = calendarioCentralizado.data;
  const ano = atual.getFullYear();
  const mes = atual.getMonth();
  const inicio = new Date(ano, mes, 1);
  const primeiroDia = inicio.getDay();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const valorSelecionado = String(document.getElementById(calendarioCentralizado.idCampo)?.value || '');
  const semanas = [];
  for (let indice = 0; indice < 42; indice += 1) {
    const dia = indice - primeiroDia + 1;
    if (dia < 1 || dia > ultimoDia) semanas.push('<i aria-hidden="true"></i>');
    else {
      const iso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      semanas.push(`<button type="button" class="${iso === valorSelecionado ? 'selected' : ''}" onclick="selecionarDataCalendario('${iso}')">${dia}</button>`);
    }
  }
  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const wrap = document.createElement('div');
  wrap.id = 'calendarPickerBackdrop';
  wrap.className = 'calendar-picker-backdrop';
  wrap.innerHTML = `<section class="calendar-picker-card" role="dialog" aria-modal="true" aria-label="Selecionar data"><header><button type="button" onclick="mudarMesCalendario(-1)" aria-label="Mês anterior">${svgIcon('chevron-left')}</button><b>${nomesMeses[mes]} de ${ano}</b><button type="button" onclick="mudarMesCalendario(1)" aria-label="Próximo mês">${svgIcon('chevron-right')}</button></header><div class="calendar-picker-weekdays"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div><div class="calendar-picker-days">${semanas.join('')}</div><footer><button type="button" onclick="fecharCalendarioCentralizado()">Cancelar</button><button type="button" onclick="selecionarDataCalendario('${isoData(new Date())}')">Hoje</button></footer></section>`;
  wrap.addEventListener('click', (event) => { if (event.target === wrap) fecharCalendarioCentralizado(); });
  document.body.appendChild(wrap);
}

function mudarMesCalendario(delta) {
  if (!calendarioCentralizado) return;
  calendarioCentralizado.data = new Date(calendarioCentralizado.data.getFullYear(), calendarioCentralizado.data.getMonth() + Number(delta || 0), 1);
  renderCalendarioCentralizado();
}

function selecionarDataCalendario(data) {
  if (!calendarioCentralizado) return;
  const campo = document.getElementById(calendarioCentralizado.idCampo);
  if (campo) { campo.value = data; campo.textContent = dataBR(`${data}T12:00:00`); }
  if (calendarioCentralizado.idCampo === 'pedidoClienteData' && pedidoClienteRascunho) pedidoClienteRascunho.data = data;
  if (calendarioCentralizado.idCampo === 'filtroInicio') state.filtroInicio = data;
  if (calendarioCentralizado.idCampo === 'filtroFim') state.filtroFim = data;
  fecharCalendarioCentralizado();
}

function fecharCalendarioCentralizado() {
  calendarioCentralizado = null;
  document.getElementById('calendarPickerBackdrop')?.remove();
}

function mudarMes(direcao) {
  const atual = new Date(`${state.mesReferencia}T12:00:00`);
  const novo = new Date(atual.getFullYear(), atual.getMonth() + direcao, 1);
  const hoje = new Date();
  const mesmoMes = novo.getFullYear() === hoje.getFullYear() && novo.getMonth() === hoje.getMonth();
  const fim = mesmoMes ? hoje : new Date(novo.getFullYear(), novo.getMonth() + 1, 0);
  state.mesReferencia = isoData(novo);
  state.filtroInicio = isoData(novo);
  state.filtroFim = isoData(fim);
  render();
}

function irMesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  state.mesReferencia = isoData(inicio);
  state.filtroInicio = isoData(inicio);
  state.filtroFim = isoData(hoje);
  render();
}

function mesReferenciaAtual() {
  const ref = new Date(`${state.mesReferencia}T12:00:00`);
  const hoje = new Date();
  return ref.getFullYear() === hoje.getFullYear() && ref.getMonth() === hoje.getMonth();
}

function nomeMesReferencia() {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${state.mesReferencia}T12:00:00`)).replace(/^./, (c) => c.toUpperCase());
}

function produtosFiltrados() {
  const q = normalizar(buscaAplicada);
  const produtos = q ? state.produtos.filter((p) => [p.nome, p.marca, p.categoria, p.sku].some((v) => normalizar(v).includes(q))) : [...state.produtos];
  return produtos.sort((a, b) => ordemAlfabetica === 'asc'
    ? String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' })
    : String(b.nome || '').localeCompare(String(a.nome || ''), 'pt-BR', { sensitivity: 'base' }));
}

function clientesFiltrados() {
  const q = normalizar(buscaAplicada);
  const clientes = q ? state.clientes.filter((c) => [c.nome, c.telefone, c.email].some((v) => normalizar(v).includes(q))) : [...state.clientes];
  return clientes.sort((a, b) => ordemAlfabetica === 'asc'
    ? String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' })
    : String(b.nome || '').localeCompare(String(a.nome || ''), 'pt-BR', { sensitivity: 'base' }));
}

function assinaturaVisualSalaBotoes() {
  return JSON.stringify({
    temaEscuro: Boolean(state.temaEscuro),
    ordem: itensSalaBotoesOrdenados().map(([id]) => id),
    organizando: Boolean(state.organizandoSalaBotoes),
    aniversarios: aniversariosHojeVendas().map((cliente) => cliente.id).sort(),
    acesso: `${state.acessoVendas?.empresa_id || ''}:${state.acessoVendas?.papel || ''}`,
    atalhos: [state.atalhoInferiorEsquerdo, state.atalhoInferiorDireito],
  });
}

function salaBotoesEstaCompleta() {
  if (!salaEmLayoutCompacto || !state.menuAberto) return false;
  const sala = app.querySelector('.mobile-menu');
  const grade = sala?.querySelector('.mobile-menu-grid');
  if (!sala || !grade) return false;
  const esperados = itensSalaBotoesOrdenados().map(([id]) => id);
  const cards = [...grade.querySelectorAll(':scope > [data-sala-botao]')];
  if (cards.length !== esperados.length) return false;
  const idsRenderizados = cards.map((card) => card.dataset.salaBotao || '');
  return esperados.every((id, indice) => idsRenderizados[indice] === id)
    && cards.every((card) => Boolean(card.querySelector('img')));
}

function cancelarGarantiaSalaBotoes() {
  window.clearTimeout(temporizadorGarantiaSala);
  temporizadorGarantiaSala = 0;
  tentativasGarantiaSala = 0;
}

function agendarGarantiaSalaBotoes() {
  window.clearTimeout(temporizadorGarantiaSala);
  if (!state.autenticado || !state.menuAberto || !salaEmLayoutCompacto || carregandoBackend || conectandoGoogle || preparandoRecursosSala) {
    tentativasGarantiaSala = 0;
    return;
  }
  temporizadorGarantiaSala = window.setTimeout(() => {
    temporizadorGarantiaSala = 0;
    if (!state.autenticado || !state.menuAberto || !salaEmLayoutCompacto || carregandoBackend || conectandoGoogle || preparandoRecursosSala) {
      tentativasGarantiaSala = 0;
      return;
    }
    if (salaBotoesEstaCompleta()) {
      tentativasGarantiaSala = 0;
      return;
    }
    if (tentativasGarantiaSala >= 2) {
      console.error('A sala de botões não ficou completa após a reconstrução automática.');
      return;
    }
    tentativasGarantiaSala += 1;
    assinaturaSalaRenderizada = '';
    render();
  }, 40);
}

function podePreservarSalaBotoes(assinatura) {
  return Boolean(
    salaEmLayoutCompacto &&
    state.menuAberto &&
    salaBotoesEstaCompleta() &&
    assinaturaSalaRenderizada === assinatura &&
    !state.seletorSistemaAberto &&
    !state.seletorPerfilGestaoAberto
  );
}

function render() {
  const agendaAtiva = Boolean(state.autenticado && state.aba === 'agenda' && !carregandoBackend && !conectandoGoogle && !preparandoRecursosSala);
  const formularioAgendaAberto = Boolean(state.autenticado && state.agendaFormAberto && !carregandoBackend && !conectandoGoogle && !preparandoRecursosSala);
  document.documentElement.classList.toggle('agenda-open', agendaAtiva);
  document.body.classList.toggle('agenda-open', agendaAtiva);
  document.documentElement.classList.toggle('agenda-form-open', formularioAgendaAberto);
  document.body.classList.toggle('agenda-form-open', formularioAgendaAberto);
  salvarEstado();
  if (!state.autenticado || !state.menuAberto || !salaEmLayoutCompacto || carregandoBackend || conectandoGoogle || preparandoRecursosSala) {
    cancelarGarantiaSalaBotoes();
  }
  if (carregandoBackend || conectandoGoogle || preparandoRecursosSala) {
    limparDestaqueClientes();
    renderPreparandoAcessoEstavel();
    return;
  }
  if (state.seletorSistemaAberto && state.seletorSistemaInicialBloqueante) {
    limparDestaqueClientes();
    app.innerHTML = renderSeletorSistemaVendas();
    return;
  }
  if (state.seletorPerfilGestaoAberto) {
    limparDestaqueClientes();
    app.innerHTML = renderSeletorPerfilGestaoVendas();
    return;
  }
  if (!state.autenticado) {
    limparDestaqueClientes();
    app.innerHTML = state.usuarioSemAcesso ? renderSolicitarAcesso() : renderLogin();
    if (!state.usuarioSemAcesso) adicionarBotoesGoogle();
    requestAnimationFrame(limparFocoInicialLogin);
    return;
  }
  if (!state.moduloVendasAtivo) {
    limparDestaqueClientes();
    app.innerHTML = renderModuloVendasDesativado();
    assinaturaSalaRenderizada = '';
    return;
  }
  const assinaturaSalaAtual = state.menuAberto && salaEmLayoutCompacto ? assinaturaVisualSalaBotoes() : '';
  if (assinaturaSalaAtual && podePreservarSalaBotoes(assinaturaSalaAtual)) {
    agendarGarantiaSalaBotoes();
    return;
  }
  if (!assinaturaSalaAtual) cancelarGarantiaSalaBotoes();
  const aniversariantesHoje = aniversariosHojeVendas();
  const cabecalho = `<header class="system-header"><button class="system-brand brand-home" onclick="abrirSalaBotoes()" aria-label="Ir para a sala de botões">${logoVendas()}</button><div class="system-header-actions">${aniversariantesHoje.length ? `<button class="birthday-header-button" onclick="abrirAgendaAniversariantes()" aria-label="${aniversariantesHoje.length} aniversário${aniversariantesHoje.length === 1 ? '' : 's'} hoje">${svgIconEstavel('cake')}<i>${aniversariantesHoje.length}</i></button>` : ''}</div></header>`;
  app.innerHTML = `
    <aside class="sidebar ${state.menuAberto ? 'open' : ''}">
      <button class="sidebar-brand brand-home" onclick="abrirSalaBotoes()" aria-label="Ir para a sala de botões">${logoVendas()}</button>
      <nav class="side-nav">
        ${tab('dashboard', 'home', 'Dashboard')}
        ${tab('clientes', 'users', 'Clientes')}
        ${tab('produtos', 'package', 'Produtos')}
        ${tab('vendas', 'shopping-cart', 'Pedidos')}
        ${tab('vender', 'dollar', 'Pagamento')}
        ${tab('agenda', 'calendar', 'Agenda')}
        ${tab('novidades', 'bell', 'Novidades')}
        ${tab('divulgacao', 'megaphone', 'Divulgação')}
        ${tab('informacoes', 'info', 'Informações')}
        ${tab('configuracoes', 'settings', 'Configurações')}
      </nav>
      <button class="side-link exit" onclick="sairSistema()">${svgIcon('log-out')} Sair</button>
      <footer>Desenvolvido por <b>AvantaLab</b></footer>
    </aside>
    <div class="main-area">
      ${cabecalho}
      <main class="content-area">${renderConteudo()}</main>
    </div>
    ${state.menuAberto ? renderMenuMobile() : ''}
    ${renderNavegacaoInferior()}
    ${state.aba === 'novo-pedido' ? `<button class="fab" onclick="abrirCarrinho()">${svgIcon('shopping-cart')}</button>` : ''}
    ${state.agendaFormAberto && state.aba !== 'agenda' ? renderFormularioAgendaVendas() : ''}
    ${renderSeletorSistemaVendas()}
  `;
  assinaturaSalaRenderizada = assinaturaSalaAtual;
  if (assinaturaSalaAtual) agendarGarantiaSalaBotoes();
  if (state.aba === 'clientes') requestAnimationFrame(configurarDestaqueClientes);
  else limparDestaqueClientes();
}

function renderModuloVendasDesativado() {
  const itens = [
    ['1_Dashboard.png', 'Dashboard'], ['4_Clientes.png', 'Clientes'], ['2_Produtos.png', 'Produtos'],
    ['5_Pedidos.png', 'Pedidos'], ['6_Pagamentos.png', 'Pagamentos'], ['3_Agenda.png', 'Agenda'],
    ['8_Novidades.png', 'Novidades'], ['7_Divulgacao.png', 'Divulgação'], ['9_Informacoes.png', 'Informações'],
  ];
  return `<section class="module-suspended-screen">
    <header class="mobile-menu-header"><div class="mobile-menu-brand">${logoVendas()}</div></header>
    <div class="module-suspended-preview" aria-hidden="true">
      <div class="mobile-menu-grid">${itens.map(([arquivo, label]) => `<div class="mobile-menu-card"><img src="./assets/menu/${arquivo}" alt="${label}"></div>`).join('')}</div>
    </div>
    <div class="module-suspended-shade"></div>
    <article class="module-suspended-card" role="alert" aria-live="assertive">
      <span class="module-suspended-icon">${svgIcon('lock')}</span>
      <p>Vendas Mobile</p>
      <h1>Sistema desativado</h1>
      <div class="module-suspended-message">O acesso foi desativado pelo gestor master. Seus dados permanecem preservados e estarão disponíveis novamente quando o módulo for reinstalado.</div>
      <button class="primary module-backup-button" type="button" onclick="exportarBackupVendasExcel()">${svgIcon('download')} Fazer backup dos dados</button>
      <button class="ghost module-logout-button" type="button" onclick="sairSistema()">${svgIcon('log-out')} Sair</button>
    </article>
  </section>`;
}

function configurarDestaqueClientes() {
  if (
    !window.matchMedia('(max-width: 850px)').matches ||
    window.matchMedia('(orientation: landscape) and (max-height: 560px)').matches
  ) {
    limparDestaqueClientes();
    return;
  }
  cardsClientesEmDestaque = [...app.querySelectorAll('.clientes-page .client-card')];
  atualizarDestaqueClientes();
}

function limparDestaqueClientes() {
  if (quadroDestaqueClientes) cancelAnimationFrame(quadroDestaqueClientes);
  cardsClientesEmDestaque.forEach((card) => card.classList.remove('client-card-emphasis', 'client-card-neighbor'));
  cardsClientesEmDestaque = [];
  cardClienteEmDestaque = null;
  quadroDestaqueClientes = 0;
}

function areaUtilVerticalClientes() {
  const cabecalhoPagina = app.querySelector('.system-header');
  const rodapePagina = document.querySelector('.vendas-bottom-nav');
  const topo = Math.max(0, cabecalhoPagina?.getBoundingClientRect().bottom || 0);
  const rodape = Math.min(window.innerHeight, rodapePagina?.getBoundingClientRect().top || window.innerHeight);
  return {
    topo,
    rodape,
    centro: topo + ((rodape - topo) / 2),
    foco: topo + ((rodape - topo) / 2),
  };
}

function atualizarDestaqueClientes() {
  if (
    !window.matchMedia('(max-width: 850px)').matches ||
    window.matchMedia('(orientation: landscape) and (max-height: 560px)').matches
  ) {
    limparDestaqueClientes();
    return;
  }
  if (!cardsClientesEmDestaque.length || state.aba !== 'clientes') return;
  const areaUtil = areaUtilVerticalClientes();
  const centroHorizontal = window.innerWidth / 2;
  const pontosBusca = [areaUtil.foco, areaUtil.foco - 28, areaUtil.foco + 28, areaUtil.foco - 56, areaUtil.foco + 56];
  let cardAtivo = null;
  for (const y of pontosBusca) {
    const elementos = document.elementsFromPoint(centroHorizontal, Math.max(areaUtil.topo + 1, Math.min(areaUtil.rodape - 1, y)));
    cardAtivo = elementos.map((elemento) => elemento.closest?.('.clientes-page .client-card')).find(Boolean) || null;
    if (cardAtivo) break;
  }
  cardAtivo ||= cardClienteEmDestaque;
  if (!cardAtivo?.isConnected || cardAtivo === cardClienteEmDestaque) return;
  cardsClientesEmDestaque.forEach((card) => card.classList.remove('client-card-emphasis', 'client-card-neighbor'));
  cardAtivo.classList.add('client-card-emphasis');
  const indiceAtivo = cardsClientesEmDestaque.indexOf(cardAtivo);
  cardsClientesEmDestaque[indiceAtivo - 1]?.classList.add('client-card-neighbor');
  cardsClientesEmDestaque[indiceAtivo + 1]?.classList.add('client-card-neighbor');
  cardClienteEmDestaque = cardAtivo;
}

function agendarDestaqueClientes() {
  if (state.aba !== 'clientes' || !cardsClientesEmDestaque.length) return;
  if (quadroDestaqueClientes) return;
  quadroDestaqueClientes = requestAnimationFrame(() => {
    quadroDestaqueClientes = 0;
    atualizarDestaqueClientes();
  });
}

function renderPreparandoAcessoEstavel() {
  if (app.firstElementChild?.classList.contains('preparing-access-screen') && app.children.length === 1) {
    sincronizarProgressoPreparacao();
    return;
  }
  app.innerHTML = renderPreparandoAcesso();
  sincronizarProgressoPreparacao();
}

function renderPreparandoAcesso() {
  const progresso = window.__AVANTALAB_VENDAS_PROGRESSO__ || { valor: 5, rotulo: 'Preparando recursos do aplicativo' };
  return `<section class="login-screen preparing-access-screen"><div class="preparing-access-card"><p>AvantaLab</p><span class="loader"></span><h1>Preparando acesso</h1><small id="accessProgressLabel">${escapeHtml(progresso.rotulo || 'Preparando recursos do aplicativo')}</small><div class="access-progress" aria-label="Carregando acesso"><i id="accessProgressBar" style="width:${Number(progresso.valor || 5)}%"></i></div><b id="accessProgressValue" class="access-progress-value">${Number(progresso.valor || 5)}%</b></div></section>`;
}

function atualizarProgressoPreparacao(grupo, concluido, total, rotulo) {
  window.__avantalabAtualizarProgressoVendas?.(grupo, concluido, total, rotulo);
}

function sincronizarProgressoPreparacao() {
  const progresso = window.__AVANTALAB_VENDAS_PROGRESSO__;
  if (!progresso) return;
  const barra = document.getElementById('accessProgressBar');
  const texto = document.getElementById('accessProgressValue');
  const etapa = document.getElementById('accessProgressLabel');
  if (barra) barra.style.width = `${progresso.valor}%`;
  if (texto) texto.textContent = `${progresso.valor}%`;
  if (etapa) etapa.textContent = progresso.rotulo;
}

function limparFocoInicialLogin() {
  const campoAtivo = document.activeElement;
  if (campoAtivo instanceof HTMLElement && campoAtivo.matches('.login-screen input, .login-screen select, .login-screen textarea')) {
    campoAtivo.blur();
  }
}

function renderLogin() {
  if (modoLogin === 'cadastro') return renderCadastroConta();
  const emailAtivo = loginTipo === 'email';
  return `<section class="login-screen"><div class="login-brand"><strong>Gestão de vendas</strong></div><form onsubmit="entrarSistema(event)"><div class="login-methods"><button type="button" class="${emailAtivo ? 'active' : ''}" onclick="trocarTipoLogin('email')">${svgIcon('mail')} E-mail</button><button type="button" class="${!emailAtivo ? 'active' : ''}" onclick="trocarTipoLogin('telefone')">${svgIcon('phone')} Telefone</button></div><label>${emailAtivo ? 'E-mail' : 'Telefone'}<div class="login-field">${svgIcon(emailAtivo ? 'mail' : 'phone')}<input id="loginContato" type="${emailAtivo ? 'email' : 'tel'}" inputmode="${emailAtivo ? 'email' : 'tel'}" autocomplete="${emailAtivo ? 'email' : 'tel'}" placeholder="${emailAtivo ? 'Digite seu e-mail' : 'Digite seu telefone'}" required></div></label><label>Senha<div class="login-field password-field">${svgIcon('lock')}<input id="loginSenha" type="password" autocomplete="current-password" placeholder="Digite sua senha" required><button type="button" class="password-toggle" onclick="alternarSenhaLogin()" aria-label="Exibir senha">${svgIcon('eye')}</button></div></label><div class="login-options"><label class="remember-option"><input id="loginLembrar" type="checkbox" checked><span></span>Lembrar-me</label><button type="button" class="forgot-link" onclick="abrirRecuperacaoSenha()">Esqueceu a senha?</button></div><div id="loginErro" class="login-error"></div><button class="primary login-submit" type="submit">Entrar</button><p class="login-register">Não tem conta? <button type="button" onclick="abrirCadastroConta()">Cadastre-se</button></p></form></section>`;
}

function renderCadastroConta() {
  if (cadastroEtapa === 'sms') return renderValidacaoSmsCadastro();
  const paises = PAISES_DDI.map(([nome, ddi, flag]) => `<option value="${ddi}" ${ddi === '55' ? 'selected' : ''}>${flag} +${ddi}</option>`).join('');
  return `<section class="login-screen"><div class="login-brand"><strong>Gestão de vendas</strong></div><form class="login-register-form" onsubmit="criarConta(event)"><label>Nome completo<div class="login-field">${svgIcon('user')}<input id="cadastroNome" autocomplete="name" placeholder="Digite seu nome" required></div></label><label>E-mail<div class="login-field">${svgIcon('mail')}<input id="cadastroEmail" type="email" autocomplete="email" placeholder="Digite seu e-mail" required></div></label><label>Celular<div class="phone-register-field"><select id="cadastroDdi" aria-label="País (DDI)">${paises}</select><div class="login-field">${svgIcon('phone')}<input id="cadastroTelefone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="DDD + número" required></div></div></label><label>Código da empresa<div class="login-field">${svgIcon('folder')}<input id="cadastroCodigo" autocomplete="off" autocapitalize="characters" placeholder="AVA-XXXXXXXX" required></div></label><label>Senha<div class="login-field">${svgIcon('lock')}<input id="cadastroSenha" type="password" autocomplete="new-password" placeholder="Crie sua senha" oninput="atualizarRequisitosSenhaCadastro(this.value)" required></div><small id="requisitosSenhaCadastro" class="password-requirements">8+ caracteres, maiúscula, minúscula e número.</small></label><label>Confirmar senha<div class="login-field">${svgIcon('lock')}<input id="cadastroConfirmarSenha" type="password" autocomplete="new-password" placeholder="Digite a senha novamente" required></div></label><div id="cadastroErro" class="login-error"></div><button class="primary login-submit" type="submit">Continuar</button><p class="login-register">Já tem conta? <button type="button" onclick="voltarParaLogin()">Entrar</button></p></form></section>`;
}

function senhaCadastroValida(senha) {
  return senha.length >= 8 && /[A-Z]/.test(senha) && /[a-z]/.test(senha) && /\d/.test(senha);
}

function atualizarRequisitosSenhaCadastro(senha) {
  const aviso = document.getElementById('requisitosSenhaCadastro');
  if (!aviso) return;
  const valida = senhaCadastroValida(senha);
  aviso.classList.toggle('valid', valida);
  aviso.textContent = valida ? '✓ Requisitos de senha atendidos.' : '8+ caracteres, maiúscula, minúscula e número.';
}

function renderValidacaoSmsCadastro() {
  const telefone = cadastroPendente?.telefone || '';
  return `<section class="login-screen"><div class="login-brand"><strong>Gestão de vendas</strong><p>Confirme seu celular</p></div><form class="login-register-form sms-confirm-form" onsubmit="confirmarCadastroSms(event)"><p class="login-card-help">Enviamos um código por SMS para <b>${escapeHtml(telefone)}</b>.</p><label>Código de validação<div class="login-field">${svgIcon('lock')}<input id="cadastroCodigoSms" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Digite o código recebido" autofocus required></div></label><div id="cadastroErro" class="login-error"></div><button class="primary login-submit" type="submit">Validar e criar conta</button><button id="reenviarSmsCadastro" class="forgot-link sms-resend" type="button" onclick="reenviarSmsCadastro()" disabled>Reenviar código em <span id="smsContador">60</span>s</button><p class="login-register"><button type="button" onclick="voltarDadosCadastro()">Alterar dados</button></p></form></section>`;
}

function trocarTipoLogin(tipo) {
  loginTipo = tipo;
  render();
}

function alternarSenhaLogin() {
  const input = document.getElementById('loginSenha');
  const botao = document.querySelector('.password-toggle');
  if (!input || !botao) return;
  const mostrar = input.type === 'password';
  input.type = mostrar ? 'text' : 'password';
  botao.innerHTML = svgIcon(mostrar ? 'eye-off' : 'eye');
  botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Exibir senha');
}

function tab(idAba, icon, label) {
  return `<button class="side-link ${state.aba === idAba ? 'active' : ''}" onclick="setAba('${idAba}')">${svgIcon(icon)}${label}</button>`;
}

const SALA_BOTOES_PADRAO = [
  ['dashboard', '1_Dashboard.png', 'Dashboard'], ['clientes', '4_Clientes.png', 'Clientes'], ['produtos', '2_Produtos.png', 'Produtos'],
  ['vendas', '5_Pedidos.png', 'Pedidos'], ['vender', '6_Pagamentos.png', 'Pagamentos'], ['agenda', '3_Agenda.png', 'Agenda'],
  ['novidades', '8_Novidades.png', 'Novidades'], ['divulgacao', '7_Divulgacao.png', 'Divulgação'], ['informacoes', '9_Informacoes.png', 'Informações'],
];

const RECURSOS_SALA_BOTOES = [
  ...SALA_BOTOES_PADRAO.map(([, arquivo]) => `/vendas-mobile/assets/menu/${arquivo}`),
  '/vendas-mobile/assets/logo-vendas-claro.png',
  '/vendas-mobile/assets/logo-vendas-escuro.png',
];

function carregarImagemEssencial(url) {
  return new Promise((resolver) => {
    const imagem = imagensSalaBotoesPrecarregadas.get(url) || new Image();
    imagensSalaBotoesPrecarregadas.set(url, imagem);
    let finalizado = false;
    const concluir = () => {
      if (finalizado) return;
      finalizado = true;
      resolver();
    };
    const decodificar = () => {
      if (typeof imagem.decode !== 'function') { concluir(); return; }
      imagem.decode().catch(() => undefined).finally(concluir);
    };
    imagem.onload = decodificar;
    imagem.onerror = concluir;
    imagem.decoding = 'sync';
    imagem.src = url;
    window.setTimeout(concluir, 7000);
  });
}

function prepararRecursosSalaBotoes() {
  if (!recursosSalaBotoesPromise) {
    let concluidos = 0;
    atualizarProgressoPreparacao('resources', 0, RECURSOS_SALA_BOTOES.length, 'Preparando imagens do menu');
    recursosSalaBotoesPromise = Promise.all(RECURSOS_SALA_BOTOES.map((url) => carregarImagemEssencial(url).then(() => {
      concluidos += 1;
      atualizarProgressoPreparacao('resources', concluidos, RECURSOS_SALA_BOTOES.length, 'Preparando imagens do menu');
    }))).then(() => undefined);
  }
  return recursosSalaBotoesPromise;
}

function itensSalaBotoesOrdenados() {
  const ids = new Set(SALA_BOTOES_PADRAO.map(([idAba]) => idAba));
  const ordemSalva = Array.isArray(state.ordemSalaBotoes) ? state.ordemSalaBotoes.filter((idAba) => ids.has(idAba)) : [];
  const ordem = [...new Set([...ordemSalva, ...SALA_BOTOES_PADRAO.map(([idAba]) => idAba)])];
  return ordem.map((idAba) => SALA_BOTOES_PADRAO.find(([id]) => id === idAba)).filter(Boolean);
}

function iconeOrganizarSala(concluir = false) {
  return concluir
    ? '<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>'
    : '<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 9.7-9.7a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"/><path d="m13.5 7.5 3 3"/></svg>';
}

function atualizarOrganizacaoSalaNoDom() {
  const wrap = app.querySelector('.mobile-menu-grid-wrap');
  const botaoOrganizar = app.querySelector('.mobile-menu-organize');
  const instrucaoOrganizar = app.querySelector('.mobile-menu-organize-instruction');
  if (!wrap || !botaoOrganizar) return false;
  const organizando = Boolean(state.organizandoSalaBotoes);
  wrap.classList.toggle('is-organizing', organizando);
  if (instrucaoOrganizar) instrucaoOrganizar.hidden = !organizando;
  botaoOrganizar.innerHTML = iconeOrganizarSala(organizando);
  botaoOrganizar.setAttribute('aria-label', organizando ? 'Concluir organização da sala' : 'Organizar sala de botões');
  botaoOrganizar.setAttribute('title', organizando ? 'Concluir' : 'Organizar sala');
  app.querySelectorAll('[data-sala-botao]').forEach((card) => {
    const idAba = card.dataset.salaBotao;
    card.classList.toggle('is-organizable', organizando);
    card.classList.remove('is-dragging', 'is-drop-target', 'button-pressed');
    card.removeAttribute('onclick');
    card.onpointerdown = organizando ? (event) => iniciarArrasteSalaBotoes(event, idAba) : null;
    card.onpointermove = organizando ? moverArrasteSalaBotoes : null;
    card.onpointerup = organizando ? finalizarArrasteSalaBotoes : null;
    card.onpointercancel = organizando ? finalizarArrasteSalaBotoes : null;
    if (!organizando) card.onclick = () => setAba(idAba);
  });
  assinaturaSalaRenderizada = assinaturaVisualSalaBotoes();
  return true;
}

function alternarOrganizacaoSalaBotoes() {
  state.organizandoSalaBotoes = !state.organizandoSalaBotoes;
  arrasteSalaBotoes = null;
  salvarEstado();
  if (!atualizarOrganizacaoSalaNoDom()) render();
}

function iniciarArrasteSalaBotoes(event, idAba) {
  if (!state.organizandoSalaBotoes) return;
  event.preventDefault();
  arrasteSalaBotoes = { idAba, destino: idAba };
  event.currentTarget?.setPointerCapture?.(event.pointerId);
  event.currentTarget?.classList.add('is-dragging');
}

function moverArrasteSalaBotoes(event) {
  if (!arrasteSalaBotoes) return;
  event.preventDefault();
  const destino = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-sala-botao]');
  document.querySelectorAll('[data-sala-botao]').forEach((item) => item.classList.remove('is-drop-target'));
  if (!destino || destino.dataset.salaBotao === arrasteSalaBotoes.idAba) return;
  arrasteSalaBotoes.destino = destino.dataset.salaBotao;
  destino.classList.add('is-drop-target');
}

function finalizarArrasteSalaBotoes(event) {
  if (!arrasteSalaBotoes) return;
  event.preventDefault();
  const { idAba, destino } = arrasteSalaBotoes;
  arrasteSalaBotoes = null;
  const ordem = itensSalaBotoesOrdenados().map(([id]) => id);
  const origemIndice = ordem.indexOf(idAba);
  const destinoIndice = ordem.indexOf(destino);
  if (origemIndice >= 0 && destinoIndice >= 0 && origemIndice !== destinoIndice) {
    ordem.splice(origemIndice, 1);
    ordem.splice(destinoIndice, 0, idAba);
    state.ordemSalaBotoes = ordem;
    salvarEstado();
    const grid = app.querySelector('.mobile-menu-grid');
    if (grid) {
      ordem.forEach((id) => {
        const card = grid.querySelector(`[data-sala-botao="${id}"]`);
        if (card) grid.appendChild(card);
      });
    }
  }
  app.querySelectorAll('[data-sala-botao]').forEach((item) => item.classList.remove('is-dragging', 'is-drop-target'));
  assinaturaSalaRenderizada = assinaturaVisualSalaBotoes();
}

function renderMenuMobile() {
  const itens = itensSalaBotoesOrdenados();
  const organizando = state.organizandoSalaBotoes;
  const aniversariantesHoje = aniversariosHojeVendas();
  return `<section class="mobile-menu" aria-label="Menu principal">
    <header class="mobile-menu-header"><div class="mobile-menu-brand">${logoVendas()}</div><div class="system-header-actions">${aniversariantesHoje.length ? `<button class="birthday-header-button" onclick="abrirAgendaAniversariantes()" aria-label="${aniversariantesHoje.length} aniversário${aniversariantesHoje.length === 1 ? '' : 's'} hoje">${svgIconEstavel('cake')}<i>${aniversariantesHoje.length}</i></button>` : ''}${podeTrocarParaGestaoVendas() ? `<button class="system-switch-header-button" onclick="abrirSeletorPerfilGestaoVendas()" aria-label="Ir para Gestão" title="Ir para Gestão">${iconeTrocaSistemaVendas()}</button>` : ''}</div></header>
    <div class="mobile-menu-grid-wrap${organizando ? ' is-organizing' : ''}"><div class="mobile-menu-organize-row"><span class="mobile-menu-organize-instruction" ${organizando ? '' : 'hidden'}>Clique no botão e arraste para a nova posição</span><button type="button" class="mobile-menu-organize" onclick="alternarOrganizacaoSalaBotoes()" aria-label="${organizando ? 'Concluir organização da sala' : 'Organizar sala'}" title="${organizando ? 'Concluir' : 'Organizar sala'}">${iconeOrganizarSala(organizando)}</button></div><div class="mobile-menu-grid">${itens.map(([idAba, arquivo, label]) => `<button type="button" data-sala-botao="${idAba}" class="mobile-menu-card${organizando ? ' is-organizable' : ''}" ${organizando ? `onpointerdown="iniciarArrasteSalaBotoes(event,'${idAba}')" onpointermove="moverArrasteSalaBotoes(event)" onpointerup="finalizarArrasteSalaBotoes(event)" onpointercancel="finalizarArrasteSalaBotoes(event)"` : `onclick="setAba('${idAba}')"`}><img src="./assets/menu/${arquivo}" alt="${label}" decoding="sync" fetchpriority="high" onerror="this.closest('.mobile-menu-card')?.classList.add('image-failed')" /><span class="mobile-menu-card-fallback" aria-hidden="true">${escapeHtml(label)}</span></button>`).join('')}</div></div>
    <div class="mobile-menu-assistance">
      <button type="button" class="mobile-ava-card" onclick="abrirChatIAVendas()">
        <span class="mobile-ava-logo" role="img" aria-label="Ava"></span>
        <span>Pergunte para a Ava...</span>
        <i aria-hidden="true">↑</i>
      </button>
      <button type="button" class="mobile-suggestions-card" onclick="abrirSugestoesVendas()">
        <span class="mobile-suggestions-icon">${svgIconEstavel('message-circle')}</span>
        <span><b>Dúvidas e Sugestões</b><small>Ajude a melhorar o AvantaLab</small></span>
        <i aria-hidden="true">›</i>
      </button>
    </div>
    <div class="mobile-menu-bottom"><button class="mobile-menu-wide" onclick="setAba('configuracoes')"><img src="./assets/menu/13_Configurações.png" alt="Configurações" /></button><button class="mobile-menu-wide" onclick="sairMenuMobile()"><img src="./assets/menu/14_Sair.png" alt="Sair" /></button></div>
  </section>`;
}

function contextoAvaVendas() {
  const totais = totaisPeriodo();
  const recebido = state.pagamentos.reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0);
  const debitosPendentes = state.clientes.reduce((soma, cliente) => soma + saldoFinanceiroCliente(cliente.id).debito, 0);
  const consignadosAtivos = state.vendas.filter((pedido) => pedidoEhConsignado(pedido) && pedido.status !== 'cancelada');
  const totalConsignado = consignadosAtivos.reduce((soma, pedido) => soma + Number(pedido.total || 0), 0);
  return [
    'Ambiente atual: Vendas AvantaLab',
    'O usuário já está autenticado no Vendas e pode trabalhar com dashboard, clientes, produtos, pacotes, pedidos de venda, consignados, itens bonificados, pagamentos, agenda, metas e relatórios comerciais.',
    'Ao responder, considere as funções e os dados deste ambiente de vendas, sem redirecionar para o sistema Gestão quando a ação existir aqui.',
    `Empresa: ${state.acessoVendas?.empresa_nome || 'Perfil atual'}`,
    `Período: ${state.filtroInicio} a ${state.filtroFim}`,
    `Vendas: ${moeda(totais.total)}`,
    `Custo: ${moeda(totais.custo)}`,
    `Margem: ${moeda(totais.margem)}`,
    `Pedidos: ${totais.pedidos}`,
    `Recebimentos registrados: ${moeda(recebido)}`,
    `Débitos pendentes dos clientes: ${moeda(debitosPendentes)}`,
    `Consignados ativos: ${consignadosAtivos.length} (${moeda(totalConsignado)})`,
    `Clientes cadastrados: ${state.clientes.length}`,
    `Produtos cadastrados: ${state.produtos.length}`,
  ].join('\n');
}

async function abrirChatIAVendas() {
  const agora = new Date();
  let accessToken = '';
  try {
    accessToken = await window.VendasDb?.getAccessToken?.() || '';
  } catch (error) {
    console.error('Não foi possível recuperar a sessão do Vendas para a Ava.', error);
  }
  if (!accessToken) {
    toast('Sua sessão expirou. Entre novamente para conversar com a Ava.');
    return;
  }
  const evento = new CustomEvent('avantalab:open-ava', {
    cancelable: true,
    detail: {
      ano: agora.getFullYear(),
      mes: agora.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase(),
      empresaId: state.acessoVendas?.empresa_id || '',
      empresaNome: state.acessoVendas?.empresa_nome || '',
      contexto: contextoAvaVendas(),
      darkMode: Boolean(state.temaEscuro),
      accessToken,
      userName: state.usuario?.nome || '',
      userId: state.usuario?.id || '',
      environment: 'vendas',
    },
  });
  const tratado = !window.dispatchEvent(evento);
  if (!tratado) toast('Não foi possível abrir a Ava neste momento. Atualize o aplicativo e tente novamente.');
}

function abrirSugestoesVendas() {
  const conteudos = conteudosPaginaVendas('informacoes');
  const participe = conteudos.find((item) => item.tipo === 'participe');
  const conteudo = feedbackVendasEnviado
    ? `<div class="feedback-success"><span>${svgIconEstavel('message-circle')}</span><h3>Sugestão enviada</h3><p>Obrigado por colaborar com a evolução do Vendas AvantaLab.</p><button type="button" class="ghost" onclick="novaSugestaoVendas()">Enviar outra sugestão</button></div>`
    : `<form class="feedback-sales-form" onsubmit="enviarSugestaoVendas(event)"><label for="sugestaoVendasMensagem">Conte sua ideia, dificuldade ou sugestão</label><textarea id="sugestaoVendasMensagem" rows="5" maxlength="2000" placeholder="Escreva sua sugestão..." required></textarea><div><small>Sua mensagem será enviada à equipe AvantaLab e identificada como originada no App Vendas.</small><button id="sugestaoVendasEnviar" type="submit" class="primary" ${feedbackVendasEnviando ? 'disabled' : ''}>${svgIconEstavel('message-circle')} ${feedbackVendasEnviando ? 'Enviando...' : 'Enviar sugestão'}</button></div></form>`;
  sheet(`<div class="sheet-header"><div><h2>${escapeHtml(participe?.titulo || 'Dicas e sugestões')}</h2><p class="muted small">${escapeHtml(participe?.descricao || 'Ajude a melhorar o aplicativo compartilhando sua experiência com nossa equipe.')}</p></div><button class="close" onclick="fecharSheet()">×</button></div>${conteudo}`, 'sheet-backdrop-centered suggestions-sales-backdrop');
}

function sairMenuMobile() {
  sairSistema();
}

const ATALHOS_INFERIORES_VENDAS = [
  ['tema', 'Modo escuro', 'tema'], ['dashboard', 'Dashboard', 'home'], ['clientes', 'Clientes', 'users'],
  ['produtos', 'Produtos', 'package'], ['vendas', 'Pedidos', 'shopping-cart'], ['vender', 'Pagamentos', 'dollar'],
  ['agenda', 'Agenda', 'calendar'], ['divulgacao', 'Divulgação', 'megaphone'],
  ['gestao', 'Ir para Gestão', 'gestao'],
];

function podeTrocarParaGestaoVendas() {
  return state.acessoVendas?.papel === 'gestor';
}

function chaveSistemaPerfilVendas(prefixo) {
  return `${prefixo}${state.acessoVendas?.empresa_id || 'sem-perfil'}`;
}

function avaliarSistemaInicialVendas() {
  if (state.sistemaInicialAvaliado || !podeTrocarParaGestaoVendas()) return false;
  state.sistemaInicialAvaliado = true;
  let escolha = '';
  try {
    escolha = sessionStorage.getItem(chaveSistemaPerfilVendas('avantalab_mobile_sistema_sessao_')) ||
      localStorage.getItem(chaveSistemaPerfilVendas('avantalab_mobile_sistema_inicial_')) || '';
  } catch { /* armazenamento indisponível */ }
  if (escolha === 'gestao') {
    abrirGestao();
    return true;
  }
  if (escolha === 'vendas') return false;
  state.seletorSistemaAberto = true;
  state.seletorSistemaInicialBloqueante = true;
  return true;
}

function escolherSistemaInicialVendas(sistema) {
  if (!['gestao', 'vendas'].includes(sistema) || !podeTrocarParaGestaoVendas()) return;
  const empresaId = state.acessoVendas?.empresa_id || '';
  try {
    sessionStorage.setItem(chaveSistemaPerfilVendas('avantalab_mobile_sistema_sessao_'), sistema);
    if (state.lembrarSistemaInicial) localStorage.setItem(chaveSistemaPerfilVendas('avantalab_mobile_sistema_inicial_'), sistema);
    else localStorage.removeItem(chaveSistemaPerfilVendas('avantalab_mobile_sistema_inicial_'));
    localStorage.setItem('avantalab_mobile_sistema_contexto', JSON.stringify({ empresaId, sistema, atualizadoEm: new Date().toISOString() }));
  } catch { /* navegação continua sem preferência local */ }
  state.seletorSistemaAberto = false;
  state.seletorSistemaInicialBloqueante = false;
  carregandoBackend = true;
  render();
  if (sistema === 'gestao') window.setTimeout(abrirGestao, 60);
  else window.setTimeout(carregarSistemaVendasCompleto, 60);
}

function definirLembrarSistemaInicialVendas(ativo) {
  state.lembrarSistemaInicial = ativo === true;
}

function renderSeletorSistemaVendas() {
  if (!state.seletorSistemaAberto || !podeTrocarParaGestaoVendas()) return '';
  const card = `<section class="system-selector-card" role="dialog" aria-modal="true" aria-labelledby="system-selector-title"><header><small>AvantaLab</small><h2 id="system-selector-title">Por onde deseja começar?</h2><p>Escolha o sistema para abrir neste acesso.</p></header><div class="system-selector-options"><button type="button" onclick="escolherSistemaInicialVendas('gestao')"><span>${svgIconEstavel('home')}</span><b>Gestão Mobile<small>Finanças, indicadores e administração.</small></b></button><button type="button" onclick="escolherSistemaInicialVendas('vendas')"><span>${iconeTrocaSistemaVendas()}</span><b>Vendas Mobile<small>Clientes, produtos, pedidos e pagamentos.</small></b></button><label><input type="checkbox" onchange="definirLembrarSistemaInicialVendas(this.checked)" ${state.lembrarSistemaInicial ? 'checked' : ''}><span>Memorizar minha escolha nos próximos acessos</span></label></div></section>`;
  if (state.seletorSistemaInicialBloqueante) return `<section class="login-screen system-selector-screen">${card}</section>`;
  return `<div class="system-selector-backdrop">${card}</div>`;
}

function atalhosInferioresVendasDisponiveis() {
  return ATALHOS_INFERIORES_VENDAS.filter(([id]) => id !== 'gestao' || podeTrocarParaGestaoVendas());
}

function atalhoInferiorVendasValido(valor, padrao) {
  return atalhosInferioresVendasDisponiveis().some(([id]) => id === valor) ? valor : padrao;
}

function dadosAtalhoInferiorVendas(id) {
  return ATALHOS_INFERIORES_VENDAS.find(([valor]) => valor === id) || ATALHOS_INFERIORES_VENDAS[0];
}

function definirAtalhoInferiorVendas(lado, valor) {
  const rolagens = {
    esquerdo: document.getElementById('atalhos-vendas-esquerdo-scroll')?.scrollTop || 0,
    direito: document.getElementById('atalhos-vendas-direito-scroll')?.scrollTop || 0,
  };
  const chave = lado === 'esquerdo' ? 'atalhoInferiorEsquerdo' : 'atalhoInferiorDireito';
  const outraChave = lado === 'esquerdo' ? 'atalhoInferiorDireito' : 'atalhoInferiorEsquerdo';
  const padrao = lado === 'esquerdo' ? 'tema' : 'agenda';
  const anterior = atalhoInferiorVendasValido(state[chave], padrao);
  const proximo = atalhoInferiorVendasValido(valor, padrao);
  if (state[outraChave] === proximo) state[outraChave] = anterior;
  state[chave] = proximo;
  salvarEstado();
  fecharSheet();
  render();
  abrirOrganizarAtalhosVendas(rolagens);
}

function restaurarAtalhosInferioresVendas() {
  state.atalhoInferiorEsquerdo = 'tema';
  state.atalhoInferiorDireito = 'agenda';
  salvarEstado();
  fecharSheet();
  render();
  toast('Atalhos restaurados.');
}

function abrirOrganizarAtalhosVendas(rolagens = {}) {
  const esquerdo = atalhoInferiorVendasValido(state.atalhoInferiorEsquerdo, 'tema');
  const direito = atalhoInferiorVendasValido(state.atalhoInferiorDireito, 'agenda');
  const grupo = (lado, titulo, selecionado) => `<section class="shortcut-organizer-group"><h3>${titulo}</h3><div id="atalhos-vendas-${lado}-scroll">${atalhosInferioresVendasDisponiveis().map(([id, rotulo, icone]) => `<button type="button" class="${selecionado === id ? 'selected' : ''}" onclick="definirAtalhoInferiorVendas('${lado}','${id}')"><span>${iconeNavegacaoInferior(icone)}</span><b>${rotulo}</b>${selecionado === id ? '<small>Selecionado</small>' : ''}</button>`).join('')}</div></section>`;
  sheet(`<div class="sheet-header"><div><h2>Organizar atalhos</h2><p class="muted small">Configurações, Lançar e Início permanecem fixos. Escolha os atalhos ao lado do +.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="shortcut-organizer">${grupo('esquerdo', 'À esquerda do +', esquerdo)}${grupo('direito', 'À direita do +', direito)}<button type="button" class="ghost shortcut-organizer-reset" onclick="restaurarAtalhosInferioresVendas()">Restaurar Modo escuro e Agenda</button></div>`, 'sheet-backdrop-centered');
  requestAnimationFrame(() => {
    const listaEsquerda = document.getElementById('atalhos-vendas-esquerdo-scroll');
    const listaDireita = document.getElementById('atalhos-vendas-direito-scroll');
    if (listaEsquerda) listaEsquerda.scrollTop = Number(rolagens.esquerdo || 0);
    if (listaDireita) listaDireita.scrollTop = Number(rolagens.direito || 0);
  });
}

function iconeNavegacaoInferior(tipo) {
  if (tipo === 'tema') return '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  if (tipo === 'gestao') return iconeTrocaSistemaVendas();
  return svgIconEstavel(tipo);
}

function iconeTrocaSistemaVendas() {
  return '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="8" height="7" rx="2"/><rect x="13" y="13" width="8" height="7" rx="2"/><path d="M15 7h4a2 2 0 0 1 2 2v1M9 17H5a2 2 0 0 1-2-2v-1M18 7l-2-2m2 2-2 2M6 17l2-2m-2 2 2 2"/></svg>';
}

function itemNavegacaoInferior(id, tipo, rotulo, acao) {
  return `<button id="${id}" type="button" class="vendas-nav-item" onclick="acionarNavegacaoInferior(event, '${acao}')" aria-label="${rotulo}"><span>${iconeNavegacaoInferior(tipo)}</span><b>${rotulo}</b></button>`;
}

function renderNavegacaoInferior() {
  const [esquerdo, rotuloEsquerdo, iconeEsquerdo] = dadosAtalhoInferiorVendas(atalhoInferiorVendasValido(state.atalhoInferiorEsquerdo, 'tema'));
  const [direito, rotuloDireito, iconeDireito] = dadosAtalhoInferiorVendas(atalhoInferiorVendasValido(state.atalhoInferiorDireito, 'agenda'));
  return `<nav class="vendas-bottom-nav" aria-label="Navegação principal"><div class="vendas-bottom-nav-inner">
    ${itemNavegacaoInferior('nav-configuracoes', 'settings', 'Configurações', 'configuracoes')}
    ${itemNavegacaoInferior('nav-atalho-esquerdo', iconeEsquerdo, rotuloEsquerdo, esquerdo)}
    <button id="nav-novo" type="button" class="vendas-nav-add" onclick="acionarNavegacaoInferior(event, 'novo')" aria-label="Lançar pedido ou pagamento"><span>+</span><b>Lançar</b></button>
    ${itemNavegacaoInferior('nav-atalho-direito', iconeDireito, rotuloDireito, direito)}
    ${itemNavegacaoInferior('nav-inicio', 'home', 'Início', 'inicio')}
  </div></nav>`;
}

function acionarNavegacaoInferior(event, destino) {
  const botao = event.currentTarget || event.target.closest('button');
  if (!botao) return;
  event.preventDefault();
  event.stopPropagation();
  const agora = Date.now();
  if (agora < navegacaoInferiorBloqueadaAte) return;
  navegacaoInferiorBloqueadaAte = agora + 420;
  document.querySelectorAll('.vendas-nav-ripple').forEach((ripple) => ripple.remove());
  const anel = document.createElement('i');
  anel.className = 'vendas-nav-ripple';
  const origem = botao.classList.contains('vendas-nav-add') ? botao.querySelector(':scope > span') : botao;
  origem?.appendChild(anel);
  anel.addEventListener('animationend', () => anel.remove(), { once: true });
  window.setTimeout(() => {
    fecharCamadasNavegacao();
    if (destino === 'configuracoes') setAba('configuracoes');
    else if (destino === 'tema') alternarTema(!state.temaEscuro);
    else if (destino === 'gestao') abrirSeletorPerfilGestaoVendas();
    else if (destino === 'novo') { render(); abrirAcoesRapidas(); }
    else if (['dashboard', 'clientes', 'produtos', 'vendas', 'vender', 'agenda', 'divulgacao'].includes(destino)) setAba(destino);
    else if (destino === 'inicio') abrirSalaBotoes();
  }, 130);
}

function fecharCamadasAgenda() {
  state.agendaDiaSelecionado = null;
  state.agendaFormAberto = false;
  state.agendaClientePreselecionado = '';
  state.agendaDataFormulario = '';
  state.agendaExpandida = false;
  state.agendaItemMovendo = null;
}

function fecharCamadasNavegacao() {
  fecharSheet();
  fecharCamadasAgenda();
}

function abrirAcoesRapidas() {
  sheet(`<div class="sheet-header"><div><h2>Novo lançamento</h2><p class="muted small">Escolha o que deseja registrar.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="quick-actions-grid"><button class="primary quick-action-button" onclick="abrirNovoPedidoGeral()">${svgIcon('shopping-bag')}<span>Lançar pedido</span></button><button class="secondary quick-action-button" onclick="abrirNovoPagamentoGeral()">${svgIcon('credit-card')}<span>Lançar pagamento</span></button></div>`, 'sheet-backdrop-centered');
}

async function sairSistema() {
  void limparCacheVendas();
  try { if (backendAtivo) await window.VendasDb.signOut(); } catch (error) { console.error(error); }
  try {
    Object.keys(sessionStorage).forEach((chave) => {
      if (chave.startsWith('avantalab_mobile_sistema_sessao_')) sessionStorage.removeItem(chave);
    });
    sessionStorage.removeItem(ENTRADA_VENDAS_PELA_GESTAO_KEY);
  } catch { /* armazenamento indisponível */ }
  state.autenticado = false;
  state.menuAberto = false;
  state.produtos = [];
  state.pacotesProdutos = [];
  state.clientes = [];
  state.vendas = [];
  state.pagamentos = [];
  state.acessoVendas = null;
  state.solicitacaoAcesso = null;
  state.usuarioSemAcesso = false;
  state.seletorSistemaAberto = false;
  state.seletorSistemaInicialBloqueante = false;
  state.sistemaInicialAvaliado = false;
  state.seletorPerfilGestaoAberto = false;
  state.perfisGestaoTroca = [];
  state.perfilGestaoConfirmacao = null;
  render();
}

async function entrarSistema(event) {
  event.preventDefault();
  const contato = valor('loginContato').trim();
  const senha = valor('loginSenha');
  const lembrar = document.getElementById('loginLembrar')?.checked ? '1' : '0';
  fixarAlturaPreparacao();
  window.__avantalabReiniciarProgressoVendas?.('Autenticando seu acesso');
  carregandoBackend = true;
  render();
  try {
    if (loginTipo === 'email') await window.VendasDb.signIn(contato, senha);
    else await window.VendasDb.signInPhone(`+55${contato.replace(/\D/g, '')}`, senha);
    atualizarProgressoPreparacao('auth', 1, 1, 'Sessão autenticada');
    localStorage.setItem('avantalab.vendas_mobile.lembrar', lembrar);
    const aguardandoEscolha = await prepararSelecaoSistemaAntesDosDadosVendas();
    carregandoBackend = false;
    if (aguardandoEscolha) {
      render();
      liberarAlturaPreparacao();
      return;
    }
    await carregarSistemaVendasCompleto();
  } catch (error) {
    carregandoBackend = false;
    render();
    const erro = document.getElementById('loginErro');
    if (erro) erro.textContent = traduzErro(error);
  }
}

async function entrarComGoogle() {
  if (conectandoGoogle) return;
  document.activeElement?.blur();
  fixarAlturaPreparacao();
  conectandoGoogle = true;
  sessionStorage.setItem(GOOGLE_CONNECTING_KEY, '1');
  render();
  try {
    await window.VendasDb.signInWithGoogle(`${window.location.origin}/mobile/vendas`);
  } catch (error) {
    conectandoGoogle = false;
    sessionStorage.removeItem(GOOGLE_CONNECTING_KEY);
    liberarAlturaPreparacao();
    render();
    const erro = document.getElementById('loginErro') || document.getElementById('cadastroErro');
    if (erro) erro.textContent = traduzErro(error);
  }
}

function adicionarBotoesGoogle() {
  const form = app.querySelector('.login-screen form');
  const rodape = form?.querySelector('.login-register');
  if (!form || !rodape || form.querySelector('.google-login-button') || cadastroEtapa === 'sms') return;
  const texto = conectandoGoogle ? 'Conectando...' : (modoLogin === 'cadastro' ? 'Cadastrar com Google' : 'Continuar com Google');
  rodape.insertAdjacentHTML('beforebegin', `<button type="button" class="google-login-button" onclick="entrarComGoogle()"><span class="google-login-mark" aria-hidden="true">G</span>${texto}</button>`);
  if (conectandoGoogle) {
    form.classList.add('google-connecting');
    form.querySelectorAll('input, select, button').forEach((controle) => { controle.disabled = true; });
  }
}

function abrirRecuperacaoSenha() {
  const email = loginTipo === 'email' ? valor('loginContato').trim().toLowerCase() : '';
  recuperacaoSenhaVendas = { email, codigoEnviado: false };
  renderRecuperacaoSenhaVendas();
}

async function enviarRecuperacaoSenha() {
  const email = (valor('recuperarEmail').trim() || recuperacaoSenhaVendas?.email || '').toLowerCase();
  if (!email || !emailValido(email)) { toast('Informe um e-mail válido.'); return; }
  try {
    const resposta = await fetch('/api/vendas/senha/enviar-codigo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    });
    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Não foi possível enviar o código por SMS.');
    recuperacaoSenhaVendas = { email, codigoEnviado: true, telefoneMascarado: resultado.telefoneMascarado || 'seu celular confirmado' };
    renderRecuperacaoSenhaVendas();
    toast('Código enviado por SMS.');
  } catch (error) { toast(traduzErro(error)); }
}

function renderRecuperacaoSenhaVendas() {
  const recuperacao = recuperacaoSenhaVendas || { email: '', codigoEnviado: false };
  const formulario = recuperacao.codigoEnviado
    ? `<p class="muted small">Código enviado por SMS para <b>${escapeHtml(recuperacao.telefoneMascarado)}</b>. Digite-o abaixo e defina sua nova senha.</p><div class="grid">${campo('recuperarCodigo','Código recebido','','text')}<label class="field"><span>Nova senha</span><input id="recuperarSenhaNova" type="password" autocomplete="new-password" minlength="8" placeholder="Mínimo de 8 caracteres"></label><label class="field"><span>Confirme a nova senha</span><input id="recuperarSenhaConfirma" type="password" autocomplete="new-password" minlength="8" placeholder="Digite novamente"></label><button class="primary" onclick="redefinirSenhaVendas()">Redefinir senha</button><button class="forgot-link" type="button" onclick="enviarRecuperacaoSenha()">Reenviar código por SMS</button></div>`
    : `<p class="muted small">Informe o e-mail apenas para localizar o celular confirmado que receberá o código por SMS.</p><div class="grid">${campo('recuperarEmail','E-mail de acesso',recuperacao.email,'email')}<button class="primary" onclick="enviarRecuperacaoSenha()">Continuar</button></div>`;
  sheet(`<div class="sheet-header"><div><h2>Recuperar senha</h2><p class="muted small">Recuperação segura por SMS.</p></div><button class="close" onclick="fecharSheet()">×</button></div>${formulario}`);
}

async function redefinirSenhaVendas() {
  const codigo = valor('recuperarCodigo').trim();
  const novaSenha = valor('recuperarSenhaNova');
  const confirma = valor('recuperarSenhaConfirma');
  if (!codigo || novaSenha.length < 8 || novaSenha !== confirma) {
    toast('Informe o código e confirme uma senha com pelo menos 8 caracteres.');
    return;
  }
  try {
    const resposta = await fetch('/api/vendas/senha/redefinir', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: recuperacaoSenhaVendas?.email, codigo, novaSenha }),
    });
    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Não foi possível redefinir a senha.');
    recuperacaoSenhaVendas = null;
    fecharSheet();
    toast('Senha redefinida. Você já pode entrar com e-mail e senha.');
  } catch (error) { toast(traduzErro(error)); }
}

function abrirCadastroConta() {
  modoLogin = 'cadastro';
  cadastroEtapa = 'dados';
  render();
}

function voltarParaLogin() {
  modoLogin = 'entrar';
  cadastroEtapa = 'dados';
  cadastroPendente = null;
  pararContadorSmsCadastro();
  render();
}

function voltarDadosCadastro() {
  cadastroEtapa = 'dados';
  pararContadorSmsCadastro();
  render();
}

async function criarConta(event) {
  event?.preventDefault();
  const erro = document.getElementById('cadastroErro');
  if (erro) erro.textContent = '';
  const nome = valor('cadastroNome').trim();
  const email = valor('cadastroEmail').trim();
  const senha = valor('cadastroSenha');
  const confirmarSenha = valor('cadastroConfirmarSenha');
  const telefone = valor('cadastroTelefone').replace(/\D/g, '');
  const ddi = valor('cadastroDdi').replace(/\D/g, '') || '55';
  const codigo = valor('cadastroCodigo').trim().toUpperCase();
  const telefoneCompleto = `+${ddi}${telefone}`;
  const ehBrasil = ddi === '55';
  if (!nome || !email || !codigo || !telefone || !senhaCadastroValida(senha)) {
    if (erro) erro.textContent = 'A senha deve ter 8 caracteres, ao menos uma letra maiúscula, uma minúscula e um número.';
    return;
  }
  if (ehBrasil ? (telefone.length < 10 || telefone.length > 11) : (telefone.length < 6 || telefone.length > 15)) {
    if (erro) erro.textContent = ehBrasil ? 'Informe um celular válido com DDD.' : 'Informe um número de celular válido para o país selecionado.';
    return;
  }
  if (senha !== confirmarSenha) {
    if (erro) erro.textContent = 'As senhas não coincidem.';
    return;
  }
  try {
    cadastroPendente = { nome, email, senha, codigo, telefone: telefoneCompleto };
    await enviarSmsCadastro(telefoneCompleto);
    cadastroEtapa = 'sms';
    render();
    iniciarContadorSmsCadastro();
  } catch (error) {
    if (erro) erro.textContent = traduzErro(error);
  }
}

async function enviarSmsCadastro(telefone) {
  const resposta = await fetch('/api/sms/enviar-codigo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone }),
  });
  const resultado = await resposta.json().catch(() => ({}));
  if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Não foi possível enviar o código por SMS.');
}

function atualizarContadorSmsCadastro() {
  const botao = document.getElementById('reenviarSmsCadastro');
  const contador = document.getElementById('smsContador');
  if (!botao || !contador) return;
  contador.textContent = String(segundosReenvioSmsCadastro);
  botao.disabled = segundosReenvioSmsCadastro > 0;
  botao.textContent = segundosReenvioSmsCadastro > 0 ? `Reenviar código em ${segundosReenvioSmsCadastro}s` : 'Reenviar código';
}

function pararContadorSmsCadastro() {
  if (timerReenvioSmsCadastro) window.clearInterval(timerReenvioSmsCadastro);
  timerReenvioSmsCadastro = null;
}

function iniciarContadorSmsCadastro() {
  pararContadorSmsCadastro();
  segundosReenvioSmsCadastro = 60;
  atualizarContadorSmsCadastro();
  timerReenvioSmsCadastro = window.setInterval(() => {
    segundosReenvioSmsCadastro = Math.max(0, segundosReenvioSmsCadastro - 1);
    atualizarContadorSmsCadastro();
    if (segundosReenvioSmsCadastro === 0) pararContadorSmsCadastro();
  }, 1000);
}

async function reenviarSmsCadastro() {
  if (!cadastroPendente || segundosReenvioSmsCadastro > 0) return;
  const erro = document.getElementById('cadastroErro');
  if (erro) erro.textContent = '';
  try {
    await enviarSmsCadastro(cadastroPendente.telefone);
    iniciarContadorSmsCadastro();
    toast('Enviamos um novo código por SMS.');
  } catch (error) {
    if (erro) erro.textContent = traduzErro(error);
  }
}

async function confirmarCadastroSms(event) {
  event?.preventDefault();
  const erro = document.getElementById('cadastroErro');
  if (erro) erro.textContent = '';
  const codigoSms = valor('cadastroCodigoSms').trim();
  if (!cadastroPendente || !codigoSms) { if (erro) erro.textContent = 'Digite o código recebido por SMS.'; return; }
  try {
    const resposta = await fetch('/api/sms/verificar-codigo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone: cadastroPendente.telefone, codigo: codigoSms }),
    });
    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Código inválido ou expirado.');
    const dados = cadastroPendente;
    localStorage.setItem('avantalab.vendas_mobile.solicitacao_pendente', JSON.stringify({ nome: dados.nome, codigo: dados.codigo, telefone: dados.telefone }));
    await window.VendasDb.signUp({ nome: dados.nome, email: dados.email, password: dados.senha, telefone: dados.telefone });
    pararContadorSmsCadastro();
    cadastroPendente = null;
    cadastroEtapa = 'dados';
    modoLogin = 'entrar';
    render();
    toast('Conta criada. Confirme seu e-mail e entre para enviar a solicitação ao gestor.');
  } catch (error) {
    if (erro) erro.textContent = traduzErro(error);
  }
}

function renderSolicitarAcesso() {
  const solicitacao = state.solicitacaoAcesso;
  if (solicitacao?.status === 'pendente') {
    return `<section class="login-screen approval-wait-screen"><div class="login-brand"><strong>Gestão de vendas</strong><p>Solicitação enviada</p></div><div class="sheet"><div class="sheet-header"><div><h2>Aguardando aprovação</h2><p class="muted small">O gestor do perfil analisará seu acesso. Volte mais tarde e entre novamente.</p></div></div><button class="primary approval-wait-exit" onclick="sairSistema()">Sair</button></div></section>`;
  }
  if (vinculoTelefonePendente) {
    return `<section class="login-screen"><div class="login-brand"><strong>Gestão de vendas</strong></div><div class="sheet access-request-card"><div class="sheet-header"><div><h2>Confirme seu celular</h2><p class="muted small">Enviamos um código SMS para validar seu número antes de solicitar o acesso.</p></div></div><div class="grid"><label class="access-request-label">Código recebido<div class="login-field">${svgIcon('lock')}<input id="vinculoCodigoSms" inputmode="numeric" autocomplete="one-time-code" placeholder="Digite o código" required></div></label><div id="solicitacaoErro" class="login-error"></div><button class="primary" onclick="confirmarTelefoneVinculo()">Confirmar e solicitar aprovação</button><button class="forgot-link" type="button" onclick="cancelarTelefoneVinculo()">Alterar telefone</button></div></div></section>`;
  }
  const telefoneAtual = String(state.usuario?.telefone || '');
  const telefoneObrigatorio = telefoneAtual ? '' : `<label class="access-request-label">Celular<div class="phone-register-field"><select id="solicitacaoDdi" aria-label="País (DDI)">${opcoesDdi()}</select><div class="login-field">${svgIcon('phone')}<input id="solicitacaoTelefone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="DDD + número" required></div></div></label>`;
  const avisoTelefone = telefoneAtual ? `<p class="muted small">Celular confirmado: <b>${escapeHtml(mascararTelefone(telefoneAtual))}</b>.</p>` : '<p class="muted small">Para sua segurança, confirme um celular por SMS antes de solicitar o acesso.</p>';
  return `<section class="login-screen"><div class="login-brand"><strong>Gestão de vendas</strong></div><div class="sheet access-request-card"><div class="sheet-header"><div><h2>Vincular a um perfil</h2><p class="muted small">Seu login foi identificado, mas ainda não possui acesso às vendas. Informe o código recebido do gestor para solicitar a aprovação.</p></div></div><div class="grid"><label class="access-request-label">Código da empresa<div class="login-field">${svgIcon('folder')}<input id="solicitacaoCodigo" autocomplete="off" autocapitalize="characters" placeholder="AVA-XXXXXXXX" required></div></label>${telefoneObrigatorio}${avisoTelefone}<div id="solicitacaoErro" class="login-error"></div><button class="primary" onclick="enviarSolicitacaoAcesso()">Solicitar aprovação</button><button class="forgot-link" type="button" onclick="sairSistema()">Sair da conta</button></div></div></section>`;
}

async function enviarSolicitacaoAcesso() {
  const erro = document.getElementById('solicitacaoErro');
  if (erro) erro.textContent = '';
  const nome = state.usuario?.nome || state.usuario?.email || 'Usuário Vendas';
  const codigo = valor('solicitacaoCodigo').trim().toUpperCase();
  if (!codigo) { if (erro) erro.textContent = 'Informe o código da empresa.'; return; }
  let telefone = String(state.usuario?.telefone || '');
  if (!telefone) {
    const ddi = valor('solicitacaoDdi').replace(/\D/g, '') || '55';
    const numero = valor('solicitacaoTelefone').replace(/\D/g, '');
    const ehBrasil = ddi === '55';
    if (!numero || (ehBrasil ? numero.length < 10 || numero.length > 11 : numero.length < 6 || numero.length > 15)) {
      if (erro) erro.textContent = ehBrasil ? 'Informe um celular válido com DDD.' : 'Informe um número de celular válido.';
      return;
    }
    telefone = `+${ddi}${numero}`;
    try {
      await enviarSmsCadastro(telefone);
      vinculoTelefonePendente = { codigo, nome, telefone };
      render();
      toast('Código enviado por SMS.');
    } catch (error) { if (erro) erro.textContent = traduzErro(error); }
    return;
  }
  await enviarSolicitacaoComTelefone({ codigo, nome, telefone, erro });
}

async function confirmarTelefoneVinculo() {
  const erro = document.getElementById('solicitacaoErro');
  const codigoSms = valor('vinculoCodigoSms').trim();
  if (!vinculoTelefonePendente || !codigoSms) { if (erro) erro.textContent = 'Digite o código recebido por SMS.'; return; }
  try {
    const resposta = await fetch('/api/sms/verificar-codigo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: vinculoTelefonePendente.telefone, codigo: codigoSms }) });
    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Código inválido ou expirado.');
    await window.VendasDb.updateUserMetadata({ telefone: vinculoTelefonePendente.telefone });
    state.usuario.telefone = vinculoTelefonePendente.telefone;
    const dados = vinculoTelefonePendente;
    vinculoTelefonePendente = null;
    await enviarSolicitacaoComTelefone({ ...dados, erro });
  } catch (error) { if (erro) erro.textContent = traduzErro(error); }
}

function cancelarTelefoneVinculo() {
  vinculoTelefonePendente = null;
  render();
}

async function enviarSolicitacaoComTelefone({ codigo, nome, telefone, erro }) {
  try {
    await window.VendasDb.solicitarAcesso({ codigo, nome, telefone });
    state.solicitacaoAcesso = { status: 'pendente' };
    render();
  } catch (error) { if (erro) erro.textContent = traduzErro(error); }
}

function mascararTelefone(telefone) {
  const numeros = String(telefone || '').replace(/\D/g, '');
  const brasileiro = numeros.startsWith('55') && numeros.length >= 12 ? numeros.slice(2) : numeros;
  if (brasileiro.length >= 10 && numeros.startsWith('55')) return `(${brasileiro.slice(0, 2)}) ${brasileiro[2] || ''}****-${brasileiro.slice(-4)}`;
  return `${numeros.slice(0, Math.min(3, numeros.length))}••••${numeros.slice(-4)}`;
}

function traduzErro(error) {
  if (error?.persistenciaPendente) return 'Sem confirmação do servidor. A alteração ficou protegida neste aparelho e será reenviada automaticamente quando a conexão estabilizar.';
  if (error?.persistenciaLocalIndisponivel) return 'Não foi possível confirmar no servidor nem proteger a alteração no aparelho. Mantenha esta tela aberta e tente novamente.';
  const texto = String(error?.message || error || 'Erro inesperado.');
  if (/invalid login credentials/i.test(texto)) return 'E-mail ou senha incorretos.';
  if (/relation .* does not exist/i.test(texto)) return 'O banco do Vendas Mobile ainda não foi instalado.';
  return texto;
}

function atualizarRegistroPersistido(lista, salvo) {
  const atual = Array.isArray(lista) ? lista : [];
  return atual.some((item) => item.id === salvo.id)
    ? atual.map((item) => item.id === salvo.id ? { ...item, ...salvo } : item)
    : [salvo, ...atual];
}

// O Dashboard não mantém totais próprios: ele sempre é calculado a partir de
// vendas e pagamentos confirmados. Esta etapa concentra a atualização após um
// lançamento para que cache e uma eventual tela de Dashboard aberta usem a
// mesma revisão dos dados já conferidos no servidor.
async function atualizarDashboardAposLancamento() {
  revisaoDadosOperacionais += 1;
  await salvarCacheVendas();
  if (state.aba === 'dashboard' && !state.menuAberto) render();
}

async function reconciliarFinanceiroCliente(clienteId) {
  if (!backendAtivo || !clienteId) return;
  const dados = await window.VendasDb.loadClientFinancial(clienteId);
  state.vendas = [
    ...(dados.vendas || []),
    ...(state.vendas || []).filter((item) => item.cliente_id !== clienteId),
  ];
  state.pagamentos = [
    ...(dados.pagamentos || []),
    ...(state.pagamentos || []).filter((item) => item.cliente_id !== clienteId),
  ];
  revisaoDadosOperacionais += 1;
}

// O cache acelera a abertura, mas nunca é a fonte para gravar saldo financeiro.
// Antes de confirmar pedido ou recebimento, recarregamos apenas aquela cliente.
async function saldoFinanceiroConfirmadoCliente(clienteId, pedidoIgnoradoId = '') {
  if (backendAtivo) await reconciliarFinanceiroCliente(clienteId);
  return saldoFinanceiroCliente(clienteId, pedidoIgnoradoId);
}

async function reenviarPendenciasVendas() {
  if (reenviandoPendenciasVendas || !backendAtivo || !navigator.onLine || !state.autenticado || !state.acessoVendas) return;
  reenviandoPendenciasVendas = true;
  let houveAtualizacao = false;
  try {
    const pendencias = await listarPendenciasVendas();
    for (const pendencia of pendencias) {
      const chave = chavePendenciaVendas(pendencia.tipo, pendencia.identificador);
      try {
        if (pendencia.tipo === 'cliente_salvar') {
          const salvo = await window.VendasDb.saveClient(pendencia.payload);
          state.clientes = atualizarRegistroPersistido(state.clientes, salvo);
        } else if (pendencia.tipo === 'cliente_excluir') {
          await window.VendasDb.deleteClient(pendencia.payload.id);
          state.clientes = state.clientes.filter((item) => item.id !== pendencia.payload.id);
        } else if (pendencia.tipo === 'pedido_salvar') {
          const salvo = pendencia.payload.novo
            ? await window.VendasDb.saveOrder(pendencia.payload.pedido)
            : await window.VendasDb.updateOrder(pendencia.payload.pedido);
          state.vendas = atualizarRegistroPersistido(state.vendas, salvo);
        } else if (pendencia.tipo === 'pedido_excluir') {
          await window.VendasDb.deleteOrder(pendencia.payload.id);
          state.vendas = state.vendas.filter((item) => item.id !== pendencia.payload.id);
        } else if (pendencia.tipo === 'pagamento_salvar') {
          const salvo = await window.VendasDb.savePayment(pendencia.payload);
          state.pagamentos = atualizarRegistroPersistido(state.pagamentos, salvo);
        } else if (pendencia.tipo === 'pagamento_atualizar') {
          const salvo = await window.VendasDb.updatePayment(pendencia.payload);
          state.pagamentos = atualizarRegistroPersistido(state.pagamentos, salvo);
        } else if (pendencia.tipo === 'pagamento_excluir') {
          await window.VendasDb.deletePayment(pendencia.payload.id);
          state.pagamentos = state.pagamentos.filter((item) => item.id !== pendencia.payload.id);
        }
        await removerPendenciaVendas(chave);
        houveAtualizacao = true;
      } catch (error) {
        if (!erroTemporarioPersistencia(error)) {
          await removerPendenciaVendas(chave);
          console.error('Pendência operacional rejeitada pelo servidor.', error);
          continue;
        }
        break;
      }
    }
    if (houveAtualizacao) {
      revisaoDadosOperacionais += 1;
      await salvarCacheVendas();
      render();
      toast('Alterações pendentes confirmadas pelo servidor.');
    }
  } finally {
    reenviandoPendenciasVendas = false;
  }
}

function comLimiteDeTempo(promessa, mensagem = 'A conexão com o AvantaLab demorou mais que o esperado. Tente novamente.', limiteMs = 15000) {
  return Promise.race([
    promessa,
    new Promise((_, rejeitar) => window.setTimeout(() => rejeitar(new Error(mensagem)), limiteMs)),
  ]);
}

async function carregarDadosBackend(mostrarCarregamento = true, manterPreparacaoAteRecursos = false, preservarTelaAtual = false) {
  const revisaoAoIniciar = revisaoDadosOperacionais;
  carregandoBackend = mostrarCarregamento;
  if (mostrarCarregamento) render();
  try {
    const contextoPreparado = contextoAberturaVendas;
    contextoAberturaVendas = null;
    let dados = await comLimiteDeTempo(window.VendasDb.loadAll(contextoPreparado));
    if (dados.user && !dados.acesso) {
      const pendente = JSON.parse(localStorage.getItem('avantalab.vendas_mobile.solicitacao_pendente') || 'null');
      if (pendente?.codigo && pendente?.nome) {
        await comLimiteDeTempo(window.VendasDb.solicitarAcesso(pendente));
        localStorage.removeItem('avantalab.vendas_mobile.solicitacao_pendente');
        dados = await comLimiteDeTempo(window.VendasDb.loadAll());
      }
    }
    state.autenticado = Boolean(dados.user);
    if (dados.user) {
      state.usuario = {
        ...state.usuario,
        id: dados.user.id,
        nome: dados.user.user_metadata?.nome || dados.user.user_metadata?.full_name || dados.user.user_metadata?.name || dados.user.email || state.usuario.nome,
        email: dados.user.email || state.usuario.email || '',
        telefone: dados.user.phone || dados.user.user_metadata?.telefone || dados.user.user_metadata?.phone || state.usuario.telefone || '',
      };
      state.produtos = dados.produtos;
      state.pacotesProdutos = dados.pacotes || [];
      const houveAlteracaoDuranteCarga = revisaoDadosOperacionais !== revisaoAoIniciar;
      if (!houveAlteracaoDuranteCarga) {
        state.clientes = dados.clientes;
        state.vendas = dados.vendas;
        state.pagamentos = dados.pagamentos || [];
      }
      state.conteudosVendas = dados.conteudos;
      state.divulgacaoPastas = dados.divulgacaoPastas || [];
      state.divulgacaoMateriais = dados.divulgacaoMateriais || [];
      if (!preservarTelaAtual) state.menuAberto = true;
      state.acessoVendas = dados.acesso || null;
      state.solicitacaoAcesso = dados.solicitacao || null;
      state.usuarioSemAcesso = !dados.acesso;
      state.moduloVendasAtivo = dados.moduloAtivo !== false;
      state.sincronizacaoCatalogo = dados.sincronizacaoCatalogo || { adicionados: 0, ja_recebidos: 0 };
      state.integracaoGestao = dados.integracaoGestao || { base_receita: 'recebidos', pode_configurar: false };
      state.vinculosComerciais = dados.vinculosComerciais || [];
      state.vinculoComercialAtivo = dados.vinculoComercialAtivo || null;
      state.perfisFinanceiros = dados.perfisFinanceiros || [];
      if (!dados.acesso) state.autenticado = false;
      else await salvarCacheVendas();
    }
  } catch (error) {
    console.error(error);
    if (!preservarTelaAtual) {
      state.autenticado = false;
      state.erroBackend = traduzErro(error);
    }
  } finally {
    carregandoBackend = false;
    conectandoGoogle = false;
    sessionStorage.removeItem(GOOGLE_CONNECTING_KEY);
    render();
    if (!manterPreparacaoAteRecursos) liberarAlturaPreparacao();
    if (state.erroBackend) { toast(state.erroBackend); state.erroBackend = '';
    }
  }
}

async function sincronizarCatalogoAutomaticamente(atualizarTela = false) {
  if (sincronizacaoCatalogoEmAndamento || !backendAtivo || state.moduloVendasAtivo === false || !state.acessoVendas) return state.sincronizacaoCatalogo;
  sincronizacaoCatalogoEmAndamento = true;
  try {
    const sincronizacao = await window.VendasDb.sincronizarCatalogoVendas();
    state.sincronizacaoCatalogo = sincronizacao || { adicionados: 0, ja_recebidos: 0 };
    if (Number(state.sincronizacaoCatalogo.adicionados || 0) > 0) {
      const catalogo = await window.VendasDb.listarCatalogoVendas();
      state.produtos = catalogo.produtos;
      state.pacotesProdutos = catalogo.pacotes;
      const campoAtivo = document.activeElement;
      const editando = campoAtivo instanceof HTMLElement && campoAtivo.matches('input, textarea, select, [contenteditable="true"]');
      if (atualizarTela || (state.aba === 'produtos' && !editando)) render();
    }
    void salvarCacheVendas();
    return state.sincronizacaoCatalogo;
  } finally {
    sincronizacaoCatalogoEmAndamento = false;
  }
}

async function prepararSelecaoSistemaAntesDosDadosVendas() {
  const [user, acessoVendas] = await Promise.all([
    window.VendasDb.currentUser(),
    window.VendasDb.buscarAcessoVendas(),
  ]);
  let entradaPelaGestao = false;
  try { entradaPelaGestao = sessionStorage.getItem(ENTRADA_VENDAS_PELA_GESTAO_KEY) === '1'; } catch { /* armazenamento indisponível */ }
  state.autenticado = Boolean(user && acessoVendas.acesso);
  state.usuarioSemAcesso = Boolean(user && !acessoVendas.acesso);
  state.acessoVendas = acessoVendas.acesso || null;
  state.solicitacaoAcesso = acessoVendas.solicitacao || null;
  state.moduloVendasAtivo = acessoVendas.moduloAtivo !== false;
  if (user) {
    state.usuario = {
      ...state.usuario,
      id: user.id,
      nome: user.user_metadata?.nome || user.user_metadata?.full_name || user.user_metadata?.name || user.email || state.usuario.nome,
      email: user.email || state.usuario.email || '',
      telefone: user.phone || user.user_metadata?.telefone || user.user_metadata?.phone || state.usuario.telefone || '',
    };
  }
  contextoAberturaVendas = user ? { user, acessoVendas } : null;
  if (entradaPelaGestao && acessoVendas.acesso?.empresa_id) {
    try {
      sessionStorage.setItem(`avantalab_mobile_sistema_sessao_${acessoVendas.acesso.empresa_id}`, 'vendas');
      sessionStorage.removeItem(ENTRADA_VENDAS_PELA_GESTAO_KEY);
    } catch { /* navegação continua sem armazenamento local */ }
    state.sistemaInicialAvaliado = true;
  }
  if (!state.autenticado || !state.moduloVendasAtivo) return false;
  return avaliarSistemaInicialVendas();
}

async function carregarSistemaVendasCompleto() {
  carregandoBackend = true;
  preparandoRecursosSala = true;
  render();
  let carregamentoConcluido = false;
  try {
    const recursosSala = prepararRecursosSalaBotoes();
    const cache = await lerCacheVendas();
    const restauradoDoCache = restaurarCacheVendas(cache);
    if (restauradoDoCache) {
      carregandoBackend = false;
      preparandoRecursosSala = false;
      render();
      liberarAlturaPreparacao();
      await Promise.all([carregarDadosBackend(false, true, true), recursosSala]);
    } else {
      await carregarDadosBackend(false, true);
      await recursosSala;
    }
    carregamentoConcluido = true;
  } finally {
    if (carregamentoConcluido) {
      atualizarProgressoPreparacao('data', 1, 1, 'Acesso pronto');
      atualizarProgressoPreparacao('resources', 1, 1, 'Acesso pronto');
      await new Promise((resolver) => window.setTimeout(resolver, 120));
    }
    carregandoBackend = false;
    preparandoRecursosSala = false;
    // carregar dados e cache nunca podem trazer a última página de volta na
    // abertura. A sala é o destino final de qualquer inicialização do Vendas.
    state.aba = 'dashboard';
    state.menuAberto = true;
    render();
    liberarAlturaPreparacao();
    window.setTimeout(() => {
      sincronizarCatalogoAutomaticamente().catch((error) => console.warn('Não foi possível sincronizar o catálogo em segundo plano.', error));
      reenviarPendenciasVendas().catch((error) => console.warn('Não foi possível reenviar alterações pendentes.', error));
    }, 160);
  }
}

async function inicializarApp() {
  // A abertura sempre começa na sala de botões. A aba anterior vale somente
  // durante a navegação da sessão e não é restaurada numa nova entrada.
  state.aba = 'dashboard';
  state.menuAberto = true;
  state.busca = '';
  buscaAplicada = '';
  if (!backendAtivo) {
    carregandoBackend = false;
    state.autenticado = true;
    render();
    toast('Modo local: conexão Supabase indisponível.');
    return;
  }
  window.__avantalabReiniciarProgressoVendas?.('Validando sua sessão');
  carregandoBackend = true;
  state.autenticado = false;
  state.usuarioSemAcesso = false;
  render();
  window.requestAnimationFrame(() => {
    const campoAtivo = document.activeElement;
    if (campoAtivo instanceof HTMLElement && campoAtivo.closest('.login-screen')) campoAtivo.blur();
  });
  try {
    const sessaoAtiva = conectandoGoogle
      ? await comLimiteDeTempo(aguardarSessaoGoogle(), 'Não foi possível concluir o acesso com o Google.', 12000)
      : await comLimiteDeTempo(window.VendasDb.hasSession(), 'Não foi possível restaurar sua sessão.', 10000);
    atualizarProgressoPreparacao('auth', 1, 1, sessaoAtiva ? 'Sessão restaurada' : 'Sessão não encontrada');
    if (!sessaoAtiva) {
      carregandoBackend = false;
      conectandoGoogle = false;
      sessionStorage.removeItem(GOOGLE_CONNECTING_KEY);
      render();
      liberarAlturaPreparacao();
      return;
    }
    const aguardandoEscolha = await prepararSelecaoSistemaAntesDosDadosVendas();
    carregandoBackend = false;
    if (aguardandoEscolha) {
      render();
      liberarAlturaPreparacao();
      return;
    }
    await carregarSistemaVendasCompleto();
  } catch (error) {
    console.error('Falha ao inicializar o Vendas Mobile.', error);
    carregandoBackend = false;
    preparandoRecursosSala = false;
    conectandoGoogle = false;
    state.autenticado = false;
    state.usuarioSemAcesso = false;
    sessionStorage.removeItem(GOOGLE_CONNECTING_KEY);
    render();
    liberarAlturaPreparacao();
    toast(`${traduzErro(error)} Atualize a página e tente novamente.`);
  }
}

async function aguardarSessaoGoogle() {
  const limite = Date.now() + 10000;
  while (Date.now() < limite) {
    if (await window.VendasDb.hasSession()) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

function renderConteudo() {
  if (state.aba === 'dashboard') return renderDashboard();
  if (state.aba === 'produtos') return renderProdutos();
  if (state.aba === 'clientes') return renderClientes();
  if (state.aba === 'vender') return renderPagamentos();
  if (state.aba === 'novo-pedido') return renderVender();
  if (state.aba === 'vendas') return renderVendas();
  if (state.aba === 'importar') return renderImportar();
  if (state.aba === 'configuracoes') return renderConfiguracoes();
  return renderModuloEmBreve();
}

function rankingClientesDashboard(vendas) {
  const mapa = new Map();
  vendas.filter((venda) => venda.cliente_id).forEach((venda) => {
    const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
    const atual = mapa.get(venda.cliente_id) || { nome: cliente?.nome || 'Cliente', total: 0, pedidos: 0 };
    atual.total += Number(venda.total || 0);
    atual.pedidos += 1;
    mapa.set(venda.cliente_id, atual);
  });
  return [...mapa.values()].sort((a, b) => b.total - a.total).slice(0, 10);
}

function rankingProdutosDashboard(vendas) {
  const mapa = new Map();
  vendas.forEach((venda) => (venda.itens || []).forEach((item) => {
    if (itemPedidoBonificado(item)) return;
    const chaveProduto = item.produto_id || item.produto_sku || item.produto_nome;
    const atual = mapa.get(chaveProduto) || { nome: item.produto_nome || 'Produto', qtd: 0, total: 0 };
    atual.qtd += Number(item.quantidade || 0);
    atual.total += Number(item.total ?? Number(item.quantidade || 0) * Number(item.preco || item.preco_unitario || 0));
    mapa.set(chaveProduto, atual);
  }));
  return [...mapa.values()].sort((a, b) => b.qtd - a.qtd).slice(0, 10);
}

function resumoConsignadosDashboard() {
  const pedidos = state.vendas.filter((venda) => pedidoEhConsignado(venda) && !['cancelada', 'convertida'].includes(String(venda.status || '').toLowerCase()));
  const produtos = new Map();
  pedidos.forEach((pedido) => (pedido.itens || []).forEach((item) => {
    if (itemPedidoBonificado(item)) return;
    const chave = item.produto_id || item.produto_sku || item.produto_nome;
    const atual = produtos.get(chave) || { nome: item.produto_nome || 'Produto', quantidade: 0 };
    atual.quantidade += Number(item.quantidade || 0);
    produtos.set(chave, atual);
  }));
  const listaProdutos = [...produtos.values()].sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR'));
  return {
    pedidos,
    total: pedidos.reduce((soma, pedido) => soma + Number(pedido.total || 0), 0),
    quantidade: listaProdutos.reduce((soma, item) => soma + item.quantidade, 0),
    produtos: listaProdutos,
  };
}

function alternarConsignadosDashboard() {
  state.dashboardConsignadosExpandido = !state.dashboardConsignadosExpandido;
  render();
}

function ajustarDiasInativosDashboard(delta) {
  state.dashboardDiasInativos = Math.max(1, Math.min(365, Number(state.dashboardDiasInativos || 30) + Number(delta || 0)));
  render();
}

function abrirClienteDashboard(clienteId) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  sheet(`<div class="sheet-header"><div><h2>${escapeHtml(cliente.nome)}</h2><p class="muted small">Ficha do cliente</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="dashboard-client-preview">${renderCliente(cliente)}</div>`, 'sheet-backdrop-centered dashboard-client-backdrop');
}

function clientesInativosDashboard() {
  const limiteDias = Math.max(1, Number(state.dashboardDiasInativos || 30));
  const fim = new Date(`${state.filtroFim || isoData(new Date())}T23:59:59`);
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - limiteDias);
  return state.clientes.filter((cliente) => cliente.ativo !== false).map((cliente) => {
    const compras = state.vendas
      .filter((venda) => venda.cliente_id === cliente.id && venda.status !== 'cancelada' && !pedidoEhConsignado(venda) && !pedidoSomenteBonificado(venda))
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    const ultima = compras[0];
    const houveCompraNoPeriodo = compras.some((venda) => {
      const data = new Date(venda.criado_em);
      return data >= inicio && data <= fim;
    });
    const dias = ultima ? Math.floor((fim.getTime() - new Date(ultima.criado_em).getTime()) / 86400000) : null;
    return { id: cliente.id, nome: cliente.nome, ultima, dias, houveCompraNoPeriodo };
  }).filter((item) => !item.houveCompraNoPeriodo)
    .sort((a, b) => (b.dias ?? Number.MAX_SAFE_INTEGER) - (a.dias ?? Number.MAX_SAFE_INTEGER));
}

function renderDashboard() {
  const t = totaisPeriodo();
  const pagamentosPeriodo = (state.pagamentos || []).filter((pagamento) => {
    const dataPagamento = new Date(`${pagamento.data_pagamento || String(pagamento.criado_em || '').slice(0, 10)}T12:00:00`);
    return dataPagamento >= new Date(`${state.filtroInicio}T00:00:00`) && dataPagamento <= new Date(`${state.filtroFim}T23:59:59`);
  });
  const totalRecebido = pagamentosPeriodo.reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0);
  const totalAReceber = state.clientes.reduce((soma, cliente) => soma + saldoFinanceiroCliente(cliente.id).debito, 0);
  const clientesTop = rankingClientesDashboard(t.vendasMes);
  const produtosTop = rankingProdutosDashboard(t.vendasMes);
  const consignados = resumoConsignadosDashboard();
  const clientesInativos = clientesInativosDashboard();
  const maiorMovimento = Math.max(t.total, totalRecebido, 1);
  const margemPercentual = t.total > 0 ? (t.margem / t.total) * 100 : 0;
  const progressoMensal = state.metaMensal > 0 ? Math.min(100, t.total / state.metaMensal * 100) : 0;
  const tabelaClientes = clientesTop.length ? clientesTop.map((item) => `<tr><td><b>${escapeHtml(item.nome)}</b><small>${item.pedidos} ${item.pedidos === 1 ? 'pedido' : 'pedidos'}</small></td><td>${moeda(item.total)}</td></tr>`).join('') : '<tr><td colspan="2">Nenhuma venda no período.</td></tr>';
  const tabelaInativos = clientesInativos.length ? clientesInativos.map((item) => `<tr class="dashboard-inactive-row" tabindex="0" role="button" onclick="abrirClienteDashboard('${item.id}')" onkeydown="if(event.key==='Enter'||event.key===' ')abrirClienteDashboard('${item.id}')"><td>${escapeHtml(item.nome)}</td><td>${item.ultima ? dataCurtaBR(item.ultima.criado_em) : 'Sem compra'}</td><td>${item.dias ?? '—'}</td></tr>`).join('') : '<tr><td colspan="3">Nenhum cliente sem pedido no período selecionado.</td></tr>';
  const graficoProdutos = produtosTop.length ? produtosTop.map((item) => `<div class="dashboard-bar-row"><span><b>${escapeHtml(item.nome)}</b><small>${item.qtd} un. · ${moeda(item.total)}</small></span><i><em style="width:${Math.max(4, item.qtd / produtosTop[0].qtd * 100)}%"></em></i></div>`).join('') : '<p>Sem vendas de produtos no período.</p>';
  const listaConsignados = consignados.produtos.length ? consignados.produtos.map((item) => `<div><span>${escapeHtml(item.nome)}</span><b>${item.quantidade.toLocaleString('pt-BR')} un.</b></div>`).join('') : '<p>Nenhum produto consignado ativo.</p>';
  const limiteInativos = Math.max(1, Number(state.dashboardDiasInativos || 30));
  return `
    <section class="dashboard-page">
      <div class="dashboard-sticky-head">
        <section class="page-heading"><div><h2>Dashboard</h2><p>Resultados do período selecionado</p></div><div class="date-filter">${campoDataCentralizado('filtroInicio', state.filtroInicio, 'Início')}${campoDataCentralizado('filtroFim', state.filtroFim, 'Fim')}<button class="filter-button" onclick="aplicarFiltroDashboard()">${svgIcon('filter')}<span>Filtrar</span></button></div></section>
        <section class="month-switcher"><div><button aria-label="Mês anterior" onclick="mudarMes(-1)">${svgIcon('chevron-left')}</button><strong>${nomeMesReferencia()}</strong><button aria-label="Próximo mês" onclick="mudarMes(1)">${svgIcon('chevron-right')}</button></div><button class="current-month" onclick="irMesAtual()">${svgIcon('calendar')}<span>${mesReferenciaAtual() ? 'Mês atual' : 'Ir para o mês atual'}</span></button></section>
      </div>
      <section class="goal-grid">
        <article class="goal-card sales-goal"><h3>${svgIcon('target')}<span>Meta Mensal</span><button type="button" onclick="setAba('configuracoes')" aria-label="Configurar metas">${svgIcon('settings')}</button></h3><div class="goal-card-body"><div class="goal-values"><b>Vendas <em>${moeda(t.total)}</em></b><b>Meta <em>${moeda(state.metaMensal)}</em></b></div><div class="progress"><i style="width:${Math.max(2, progressoMensal)}%"></i></div><p>Faltam <b>${moeda(Math.max(0, state.metaMensal - t.total))}</b> para atingir a meta.</p></div></article>
      </section>
      <section class="dashboard-kpis">
        ${kpi('Total Vendido', moeda(t.total), '$')}
        ${kpi('Total Recebido', moeda(totalRecebido), '⌁')}
        ${kpi('Saldo a Receber', moeda(totalAReceber), '◷')}
        ${kpi('Clientes Ativos', state.clientes.filter((cliente) => cliente.ativo !== false).length, '♧')}
        ${kpi('Pedidos', t.pedidos.toLocaleString('pt-BR'), '▤')}
        ${kpi('Ticket Médio', moeda(t.ticket), '◈')}
        ${kpi('Itens Vendidos', t.itens.toLocaleString('pt-BR'), '◇')}
        ${kpi('Total Consignado', moeda(consignados.total), '◎')}
      </section>
      <section class="dashboard-movement-card"><header><h3>${svgIcon('dollar')} Movimento financeiro</h3><small>${escapeHtml(nomeMesReferencia())}</small></header><div class="dashboard-finance-bars"><div><span>Vendas <b>${moeda(t.total)}</b></span><i><em style="width:${t.total / maiorMovimento * 100}%"></em></i></div><div><span>Recebimentos <b>${moeda(totalRecebido)}</b></span><i><em style="width:${totalRecebido / maiorMovimento * 100}%"></em></i></div></div></section>
      <section class="dashboard-consignment-card ${state.dashboardConsignadosExpandido ? 'expanded' : ''}"><header><div><h3>${svgIcon('package')} Estoque consignado</h3><small>${consignados.pedidos.length} ${consignados.pedidos.length === 1 ? 'consignado ativo' : 'consignados ativos'} · ${consignados.quantidade.toLocaleString('pt-BR')} unidades · ${moeda(consignados.total)}</small></div><button type="button" onclick="alternarConsignadosDashboard()" aria-expanded="${state.dashboardConsignadosExpandido}">${state.dashboardConsignadosExpandido ? 'Recolher' : 'Ver produtos'} ${state.dashboardConsignadosExpandido ? '⌃' : '⌄'}</button></header>${state.dashboardConsignadosExpandido ? `<div class="dashboard-consignment-products">${listaConsignados}</div>` : ''}</section>
      <section class="dashboard-tables">
        <article class="dashboard-panel dashboard-top-clients"><h3>${svgIcon('users')} Top 10 Clientes</h3><div class="dashboard-panel-body"><table><thead><tr><th>Cliente</th><th>Total comprado</th></tr></thead><tbody>${tabelaClientes}</tbody></table></div></article>
        <article class="dashboard-panel dashboard-inactive-panel"><h3>${svgIcon('calendar')}<span>Clientes sem compra</span><span class="dashboard-days-control"><button type="button" onclick="ajustarDiasInativosDashboard(-5)" aria-label="Diminuir dias">−</button><b>${limiteInativos} dias</b><button type="button" onclick="ajustarDiasInativosDashboard(5)" aria-label="Aumentar dias">+</button></span></h3><p class="dashboard-inactive-help">Sem pedidos nos últimos ${limiteInativos} dias.</p><div class="dashboard-panel-body"><table><thead><tr><th>Cliente</th><th>Última compra</th><th>Dias</th></tr></thead><tbody>${tabelaInativos}</tbody></table></div></article>
        <article class="dashboard-panel"><h3>${svgIcon('package')} Top 10 Produtos</h3><div class="dashboard-panel-body dashboard-product-chart">${graficoProdutos}</div></article>
        <article class="dashboard-panel"><h3>${svgIcon('target')} Rentabilidade</h3><div class="dashboard-panel-body profitability-report"><div><span>Receita de vendas</span><b>${moeda(t.total)}</b></div><div><span>Custo dos produtos</span><b>${moeda(t.custo)}</b></div><div class="highlight"><span>Margem de contribuição</span><b>${moeda(t.margem)}</b></div><div><span>Margem sobre vendas</span><b>${margemPercentual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</b></div><div class="${t.produtosSemCusto ? 'cost-warning' : 'cost-complete'}"><span>Cadastro de custos</span><b>${t.produtosSemCusto ? `${t.produtosSemCusto} ${t.produtosSemCusto === 1 ? 'produto sem custo' : 'produtos sem custo'}` : 'Completo no período'}</b></div></div></article>
      </section>
    </section>
  `;
}

function kpi(label, value, icon = '') {
  return `<article class="kpi"><div><span>${label}</span><strong>${value}</strong></div><b>${icon}</b></article>`;
}

function renderModuloEmBreve() {
  if (state.aba === 'agenda') return renderAgenda();
  if (state.aba === 'novidades') return renderPublicacoes('novidades');
  if (state.aba === 'divulgacao') return renderDivulgacao();
  return renderPublicacoes('informacoes');
}

function renderAgenda() {
  const animacao = state.agendaAnimar;
  state.agendaAnimar = '';
  const ano = Number(state.agendaAno) || new Date().getFullYear();
  const mes = Number(state.agendaMes) || 0;
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();
  const selecionado = Number(state.agendaDiaSelecionado) || 0;
  const dias = Array.from({ length: primeiroDia }, () => '<span class="agenda-mobile-empty"></span>');
  for (let dia = 1; dia <= totalDias; dia += 1) {
    const data = new Date(ano, mes, dia);
    const domingo = data.getDay() === 0;
    const sabado = data.getDay() === 6;
    const itens = itensAgendaDoDiaVendas(ano, mes, dia);
    const classes = [
      'agenda-mobile-day',
      domingo ? 'sunday' : '', sabado ? 'saturday' : '',
      dia === selecionado ? 'selected' : '',
      dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear() ? 'today' : '',
    ].filter(Boolean).join(' ');
    dias.push(`<button type="button" class="${classes}" onclick="selecionarDiaAgenda(${dia})"><b>${String(dia).padStart(2, '0')}</b>${itens.length ? '<i></i>' : ''}</button>`);
  }
  const itensDia = selecionado ? itensAgendaDoDiaVendas(ano, mes, selecionado) : [];
  const titulo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, mes, 1));
  const proximosAniversarios = aniversariosProximosAgenda();
  const alertaAniversarios = !selecionado ? `<section class="agenda-birthday-alert"><header><div><small>Alertas de aniversário</small><b>${Number(state.agendaAlertaAniversarioDias || 0) === 0 ? 'Somente no dia' : `${Number(state.agendaAlertaAniversarioDias || 0)} dias antes`}</b></div><span><button type="button" onclick="ajustarAlertaAniversario(-1)" aria-label="Reduzir antecedência">−</button><button type="button" onclick="ajustarAlertaAniversario(1)" aria-label="Aumentar antecedência">+</button></span></header>${proximosAniversarios.length ? `<div>${proximosAniversarios.slice(0, 3).map((item) => `<button type="button" onclick="abrirClienteDashboard('${item.cliente.id}')"><b>${escapeHtml(item.cliente.nome)}</b><small>${item.dias === 0 ? 'Hoje' : item.dias === 1 ? 'Amanhã' : `Em ${item.dias} dias`} · ${dataCurtaBR(item.data.toISOString())}</small></button>`).join('')}${proximosAniversarios.length > 3 ? `<em>+${proximosAniversarios.length - 3}</em>` : ''}</div>` : '<p>Nenhum aniversário neste intervalo.</p>'}</section>` : '';
  const detalheDia = selecionado ? `<section class="agenda-mobile-detail ${state.agendaExpandida ? 'expanded' : ''}"><header><h3>Agenda de ${String(selecionado).padStart(2, '0')} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(ano, mes, 1))}</h3><div><button type="button" class="agenda-expand" onclick="alternarExpansaoAgenda()" aria-label="${state.agendaExpandida ? 'Recolher agenda' : 'Expandir agenda'}">${state.agendaExpandida ? '↙' : '↗'}</button><button type="button" class="close" onclick="fecharDiaAgenda()">×</button></div></header><div class="agenda-mobile-reminders"><div><h4>Clientes agendados</h4><button type="button" class="primary" onclick="abrirFormularioAgendaVendas()">Adicionar</button></div>${itensDia.length ? itensDia.map(renderItemAgendaVendas).join('') : '<p class="agenda-mobile-none">Nenhum cliente agendado neste dia.</p>'}</div></section>` : '';
  return `<section class="agenda-mobile-page ${state.agendaExpandida ? 'agenda-expanded' : ''}"><div class="agenda-mobile-month"><button type="button" onclick="moverMesAgendaVendas(-1)" aria-label="Mês anterior">‹</button><h2>${escapeHtml(titulo)}</h2><button type="button" onclick="moverMesAgendaVendas(1)" aria-label="Próximo mês">›</button></div>${alertaAniversarios}<section class="agenda-mobile-screen ${selecionado ? 'agenda-has-selection' : ''} ${animacao ? `agenda-anim-${animacao}` : ''}"><h2>AGENDA</h2><div class="agenda-mobile-week"><b>D</b><b>S</b><b>T</b><b>Q</b><b>Q</b><b>S</b><b>S</b></div><div class="agenda-mobile-grid">${dias.join('')}</div>${detalheDia}</section>${state.agendaFormAberto ? renderFormularioAgendaVendas() : ''}${state.agendaItemMovendo ? renderMoverAgendaVendas() : ''}</section>`;
}

function aniversariosProximosAgenda() {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const limite = Math.max(0, Math.min(30, Number(state.agendaAlertaAniversarioDias || 0)));
  return state.clientes.filter((cliente) => cliente.ativo !== false && /^\d{4}-\d{2}-\d{2}$/.test(String(cliente.data_nascimento || ''))).map((cliente) => {
    const [, mes, dia] = cliente.data_nascimento.split('-').map(Number);
    let data = new Date(hoje.getFullYear(), mes - 1, dia);
    if (data < hoje) data = new Date(hoje.getFullYear() + 1, mes - 1, dia);
    return { cliente, data, dias: Math.round((data - hoje) / 86400000) };
  }).filter((item) => item.dias <= limite).sort((a, b) => a.dias - b.dias || a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR'));
}

function aniversariosHojeVendas() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const dia = hoje.getDate();
  return state.clientes.filter((cliente) => {
    if (cliente.ativo === false || !/^\d{4}-\d{2}-\d{2}$/.test(String(cliente.data_nascimento || ''))) return false;
    const [, mesNascimento, diaNascimento] = cliente.data_nascimento.split('-').map(Number);
    return mesNascimento === mes && diaNascimento === dia;
  });
}

function abrirAgendaAniversariantes() {
  const hoje = new Date();
  state.agendaAno = hoje.getFullYear();
  state.agendaMes = hoje.getMonth();
  state.agendaDiaSelecionado = null;
  state.agendaExpandida = false;
  setAba('agenda');
}

function ajustarAlertaAniversario(delta) {
  state.agendaAlertaAniversarioDias = Math.max(0, Math.min(30, Number(state.agendaAlertaAniversarioDias || 0) + Number(delta || 0)));
  render();
}

function itensAgendaVendas() {
  const itensManuais = Array.isArray(state.agendaItens) && state.agendaItens.length ? state.agendaItens : (state.compromissos || []).map((item) => {
    const data = new Date(`${item.data || isoData(new Date())}T12:00:00`);
    return { id: item.id, titulo: item.cliente || 'Compromisso', tipo: item.tipo || 'Visita', descricao: item.observacao || '', ano: data.getFullYear(), mes: data.getMonth(), dia: data.getDate(), repetir: false, repeticao: '' };
  });
  const aniversarios = state.clientes.filter((cliente) => cliente.ativo !== false && /^\d{4}-\d{2}-\d{2}$/.test(String(cliente.data_nascimento || ''))).map((cliente) => {
    const [ano, mes, dia] = cliente.data_nascimento.split('-').map(Number);
    return { id: `aniversario_${cliente.id}`, clienteId: cliente.id, titulo: cliente.nome, tipo: 'Aniversário', descricao: `Aniversário de ${cliente.nome}`, ano, mes: mes - 1, dia, repetir: true, repeticao: 'anual', automatico: true };
  });
  return [...itensManuais, ...aniversarios];
}

function itensAgendaDoDiaVendas(ano, mes, dia) {
  const alvo = new Date(ano, mes, dia); alvo.setHours(0, 0, 0, 0);
  return itensAgendaVendas().filter((item) => {
    const inicio = new Date(Number(item.ano), Number(item.mes), Number(item.dia)); inicio.setHours(0, 0, 0, 0);
    const diferenca = Math.floor((alvo - inicio) / 86400000);
    if (diferenca < 0) return false;
    if (!item.repetir) return inicio.getTime() === alvo.getTime();
    if (item.repeticao === 'diaria') return true;
    if (item.repeticao === 'semanal') return diferenca % 7 === 0;
    if (item.repeticao === 'quinzenal') return diferenca % 14 === 0;
    if (item.repeticao === 'anual') return inicio.getMonth() === alvo.getMonth() && inicio.getDate() === alvo.getDate();
    return inicio.getDate() === alvo.getDate();
  });
}

function renderItemAgendaVendas(item) {
  const etiqueta = item.tipo || 'Visita';
  const acoes = item.automatico
    ? `<button type="button" class="agenda-birthday-client" onclick="abrirClienteDashboard('${escapeAttr(item.clienteId)}')">Ver cliente</button>`
    : `<button type="button" class="agenda-mobile-move" onclick="abrirMoverAgendaVendas('${escapeAttr(item.id)}')" aria-label="Alterar data">↗</button><button type="button" class="agenda-mobile-delete" onclick="excluirItemAgendaVendas('${escapeAttr(item.id)}')" aria-label="Excluir agendamento">×</button>`;
  return `<article class="agenda-mobile-item ${item.automatico ? 'agenda-birthday-item' : ''}"><div><b>${escapeHtml(item.titulo)}</b><small class="agenda-tag ${String(etiqueta).toLowerCase()}">${escapeHtml(etiqueta)}</small>${state.agendaExpandida && item.descricao ? `<p>${escapeHtml(item.descricao)}</p>` : ''}</div><div class="agenda-mobile-item-actions">${acoes}</div></article>`;
}

function selecionarDiaAgenda(dia) { state.agendaDiaSelecionado = dia; state.agendaFormAberto = false; state.agendaClientePreselecionado = ''; state.agendaDataFormulario = ''; state.agendaExpandida = false; render(); }
function fecharDiaAgenda() { state.agendaDiaSelecionado = null; state.agendaFormAberto = false; state.agendaClientePreselecionado = ''; state.agendaDataFormulario = ''; state.agendaExpandida = false; render(); }
function alternarExpansaoAgenda() { state.agendaExpandida = !state.agendaExpandida; render(); }
function moverMesAgendaVendas(direcao) { const data = new Date(Number(state.agendaAno), Number(state.agendaMes) + direcao, 1); state.agendaAno = data.getFullYear(); state.agendaMes = data.getMonth(); state.agendaDiaSelecionado = null; state.agendaFormAberto = false; state.agendaClientePreselecionado = ''; state.agendaDataFormulario = ''; state.agendaExpandida = false; state.agendaAnimar = direcao > 0 ? 'prox' : 'prev'; render(); }
function dataFormularioAgenda() {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(state.agendaDataFormulario || ''))) return state.agendaDataFormulario;
  const dia = Number(state.agendaDiaSelecionado) || new Date().getDate();
  return `${String(state.agendaAno).padStart(4, '0')}-${String(Number(state.agendaMes) + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
function dataAgendaPorExtenso(data) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return `${String(dia).padStart(2, '0')} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(ano, mes - 1, 1))}`;
}
function abrirFormularioAgendaVendas() { state.agendaClientePreselecionado = ''; state.agendaDataFormulario = dataFormularioAgenda(); state.agendaFormAberto = true; render(); }
function cancelarFormularioAgendaVendas() { state.agendaFormAberto = false; state.agendaClientePreselecionado = ''; state.agendaDataFormulario = ''; render(); }
function renderFormularioAgendaVendas() {
  const data = dataFormularioAgenda();
  const vemDoCliente = Boolean(state.agendaClientePreselecionado);
  return `<div class="agenda-form-overlay" onclick="if(event.target===this)cancelarFormularioAgendaVendas()"><section class="agenda-form-card"><header><div><small>Novo agendamento</small><h3>${vemDoCliente ? 'Agende para a data desejada' : dataAgendaPorExtenso(data)}</h3></div><button type="button" class="close" onclick="cancelarFormularioAgendaVendas()">×</button></header><div class="agenda-form-fields"><input id="agendaClienteVendas" placeholder="Nome do cliente" autocomplete="off" value="${escapeAttr(state.agendaClientePreselecionado)}">${vemDoCliente ? `<label class="agenda-date-field"><span>Dia do agendamento</span><input id="agendaDataVendas" type="date" value="${escapeAttr(data)}"></label>` : ''}<select id="agendaEtiquetaVendas"><option value="Visita">Visita</option><option value="Entrega">Entrega</option><option value="Recebimento">Recebimento</option></select><textarea id="agendaDescricaoVendas" placeholder="Notas"></textarea><div><button type="button" class="ghost" onclick="cancelarFormularioAgendaVendas()">Cancelar</button><button type="button" class="primary" onclick="salvarItemAgendaVendas()">Salvar</button></div></div></section></div>`;
}
function salvarItemAgendaVendas() {
  const titulo = valor('agendaClienteVendas').trim();
  if (!titulo) { toast('Informe o nome do cliente.'); return; }
  const data = state.agendaClientePreselecionado ? valor('agendaDataVendas') : dataFormularioAgenda();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { toast('Selecione um dia válido.'); return; }
  const [ano, mes, dia] = data.split('-').map(Number);
  state.agendaItens = [...itensAgendaVendas(), { id: id('agenda'), titulo, tipo: valor('agendaEtiquetaVendas') || 'Visita', descricao: valor('agendaDescricaoVendas').trim(), ano, mes: mes - 1, dia, repetir: false, repeticao: '', criadoEm: new Date().toISOString() }];
  state.agendaAno = ano; state.agendaMes = mes - 1; state.agendaDiaSelecionado = dia;
  state.agendaFormAberto = false; state.agendaClientePreselecionado = ''; state.agendaDataFormulario = '';
  salvarEstado(); render(); toast('Cliente agendado.');
}
function excluirItemAgendaVendas(itemId) { state.agendaItens = itensAgendaVendas().filter((item) => String(item.id) !== String(itemId)); salvarEstado(); render(); toast('Lembrete excluído.'); }
function abrirMoverAgendaVendas(itemId) { state.agendaItemMovendo = itensAgendaVendas().find((item) => String(item.id) === String(itemId)) || null; render(); }
function cancelarMoverAgendaVendas() { state.agendaItemMovendo = null; render(); }
function renderMoverAgendaVendas() { const item = state.agendaItemMovendo; if (!item) return ''; const data = `${String(item.ano).padStart(4, '0')}-${String(Number(item.mes) + 1).padStart(2, '0')}-${String(item.dia).padStart(2, '0')}`; return `<div class="agenda-form-overlay" onclick="if(event.target===this)cancelarMoverAgendaVendas()"><section class="agenda-form-card"><header><div><small>Reagendar cliente</small><h3>${escapeHtml(item.titulo)}</h3></div><button type="button" class="close" onclick="cancelarMoverAgendaVendas()">×</button></header><div class="agenda-form-fields"><input id="agendaNovaDataVendas" type="date" value="${data}"><div><button type="button" class="ghost" onclick="cancelarMoverAgendaVendas()">Cancelar</button><button type="button" class="primary" onclick="salvarNovaDataAgendaVendas()">Reagendar</button></div></div></section></div>`; }
function salvarNovaDataAgendaVendas() { const data = valor('agendaNovaDataVendas'); if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { toast('Informe uma data válida.'); return; } const [ano, mes, dia] = data.split('-').map(Number); const idItem = state.agendaItemMovendo?.id; state.agendaItens = itensAgendaVendas().map((item) => String(item.id) === String(idItem) ? { ...item, ano, mes: mes - 1, dia } : item); state.agendaAno = ano; state.agendaMes = mes - 1; state.agendaDiaSelecionado = dia; state.agendaItemMovendo = null; salvarEstado(); render(); toast('Agendamento reagendado.'); }

const CONTEUDOS_INICIAIS_VENDAS = [
  { id: 'local-i1', pagina: 'informacoes', tipo: 'versao', titulo: 'Vendas AvantaLab', descricao: 'Aplicativo web progressivo com atualização contínua. As novas versões são disponibilizadas sem necessidade de reinstalar o aplicativo.', criado_em: '2026-07-13T17:00:00-03:00' },
  { id: 'local-i2', pagina: 'informacoes', tipo: 'melhorias', titulo: 'Evolução permanente', descricao: 'Os módulos de clientes, produtos, pedidos, pagamentos, agenda e dashboard recebem ajustes graduais de desempenho, segurança e experiência de uso.', criado_em: '2026-07-13T16:00:00-03:00' },
  { id: 'local-i3', pagina: 'informacoes', tipo: 'atualizacoes', titulo: 'Como acompanhar mudanças', descricao: 'Consulte a página Novidades para ver lançamentos, eventos e comunicados publicados pela sua empresa.', criado_em: '2026-07-13T15:00:00-03:00' },
  { id: 'local-i4', pagina: 'informacoes', tipo: 'participe', titulo: 'Dicas e sugestões', descricao: 'Ajude a melhorar o aplicativo compartilhando sua experiência com nossa equipe.', criado_em: '2026-07-13T14:00:00-03:00' },
];

function apresentacaoTipoConteudoVendas(tipo) {
  const mapa = {
    inclusao: ['Inclusão', 'plus'], ajuste: ['Ajuste', 'settings'], correcao: ['Correção', 'settings'], melhoria: ['Melhoria', 'target'], aviso: ['Aviso', 'bell'], comunicado: ['Comunicado', 'megaphone'],
    versao: ['Versão', 'info'], melhorias: ['Melhorias', 'target'], atualizacoes: ['Atualizações', 'bell'], participe: ['Participe', 'message-circle'], orientacao: ['Orientação', 'info'], seguranca: ['Segurança', 'lock'], dica: ['Dica', 'target'],
    lancamento: ['Lançamento', 'package'], evento: ['Evento', 'calendar'], campanha: ['Campanha', 'megaphone'], promocao: ['Promoção', 'dollar'],
  };
  const dados = mapa[tipo] || [String(tipo || 'Conteúdo'), 'info'];
  return { label: dados[0], icon: dados[1] };
}

function conteudosPaginaVendas(pagina) {
  const fonte = Array.isArray(state.conteudosVendas) ? state.conteudosVendas : CONTEUDOS_INICIAIS_VENDAS;
  return fonte.filter((item) => item.pagina === pagina);
}

function renderPublicacoes(tipo) {
  if (tipo === 'informacoes') return renderInformacoesVendas();
  const novidades = conteudosPaginaVendas('novidades');
  const cards = novidades.map((item, indice) => { const apresentacao = apresentacaoTipoConteudoVendas(item.tipo); return `<article class="update-card${indice === 0 ? ' featured' : ''}"><header><span>${svgIcon(apresentacao.icon)}</span><div><small>${escapeHtml(apresentacao.label)}</small><h3>${escapeHtml(item.titulo)}</h3></div><time>${dataCurtaBR(item.criado_em)}</time></header><p>${escapeHtml(item.descricao)}</p></article>`; }).join('');
  const vazio = '<article class="publication-empty"><span>' + svgIcon('bell') + '</span><h3>Nenhuma novidade publicada</h3><p>As próximas atualizações aparecerão aqui.</p></article>';
  return `<section class="module-page publicacoes-page novidades-page"><div class="module-sticky-head"><div class="module-title"><div><h2>Novidades</h2><p>Lançamentos, eventos e comunicados da sua empresa.</p></div></div></div><div class="updates-feed">${cards || vazio}<aside class="updates-future-note">${svgIcon('bell')}<p>As publicações desta área são cadastradas pela empresa à qual seu acesso está vinculado.</p></aside></div></section>`;
}

function renderInformacoesVendas() {
  const conteudos = conteudosPaginaVendas('informacoes');
  const cards = conteudos.filter((item) => item.tipo !== 'participe').map((item) => { const apresentacao = apresentacaoTipoConteudoVendas(item.tipo); return `<article class="information-card"><header><span>${svgIcon(apresentacao.icon)}</span><div><small>${escapeHtml(apresentacao.label)}</small><h3>${escapeHtml(item.titulo)}</h3></div></header><p>${escapeHtml(item.descricao)}</p></article>`; }).join('');
  const vazio = '<article class="publication-empty"><span>' + svgIcon('info') + '</span><h3>Nenhuma informação publicada</h3><p>As próximas informações do sistema aparecerão aqui.</p></article>';
  return `<section class="module-page publicacoes-page informacoes-page"><div class="module-sticky-head"><div class="module-title"><div><h2>Informações</h2><p>Versões, melhorias e orientações do aplicativo.</p></div></div></div><div class="information-grid">${cards || vazio}</div></section>`;
}

async function enviarSugestaoVendas(event) {
  event?.preventDefault();
  if (feedbackVendasEnviando) return;
  const mensagem = valor('sugestaoVendasMensagem').trim();
  if (!mensagem) { toast('Escreva sua mensagem antes de enviar.'); return; }
  if (!state.acessoVendas?.empresa_id) { toast('Não foi possível identificar a empresa para registrar sua mensagem.'); return; }
  if (!backendAtivo || !window.VendasDb?.saveFeedback) { toast('Não foi possível registrar sua mensagem neste momento.'); return; }
  feedbackVendasEnviando = true;
  const botao = document.getElementById('sugestaoVendasEnviar');
  if (botao) { botao.disabled = true; botao.textContent = 'Enviando...'; }
  try {
    await window.VendasDb.saveFeedback({
      empresaId: state.acessoVendas.empresa_id,
      nomeEmpresa: state.acessoVendas.empresa_nome || 'Empresa não informada',
      mensagem,
    });
    feedbackVendasEnviado = true;
    abrirSugestoesVendas();
    toast('Sugestão enviada com sucesso.');
  } catch (error) {
    toast(traduzErro(error) || 'Não foi possível registrar sua mensagem neste momento.');
    if (botao) { botao.disabled = false; botao.innerHTML = `${svgIconEstavel('message-circle')} Enviar sugestão`; }
  } finally {
    feedbackVendasEnviando = false;
  }
}

function novaSugestaoVendas() {
  feedbackVendasEnviado = false;
  abrirSugestoesVendas();
}

function renderDivulgacao() {
  const pesquisa = normalizar(buscaAplicada);
  const pastaAtual = (state.divulgacaoPastas || []).find((pasta) => pasta.id === divulgacaoPastaAtualId) || null;
  if (divulgacaoPastaAtualId && !pastaAtual) divulgacaoPastaAtualId = null;
  const pastaPaiId = pastaAtual?.id || null;
  const ordenarTexto = (a, b) => ordemAlfabetica === 'asc'
    ? String(a.nome || a.titulo || '').localeCompare(String(b.nome || b.titulo || ''), 'pt-BR', { sensitivity: 'base' })
    : String(b.nome || b.titulo || '').localeCompare(String(a.nome || a.titulo || ''), 'pt-BR', { sensitivity: 'base' });
  const pastas = (state.divulgacaoPastas || [])
    .filter((pasta) => (pasta.pasta_pai_id || null) === pastaPaiId)
    .filter((pasta) => !pesquisa || [pasta.nome, pasta.descricao].some((valor) => normalizar(valor).includes(pesquisa)))
    .sort(ordenarTexto);
  const materiais = pastaAtual ? (state.divulgacaoMateriais || [])
    .filter((material) => material.pasta_id === pastaAtual.id)
    .filter((material) => !pesquisa || normalizar(material.titulo).includes(pesquisa))
    .sort(ordenarTexto) : [];
  const cardsPastas = pastas.map((pasta) => {
    const materiais = (state.divulgacaoMateriais || []).filter((item) => item.pasta_id === pasta.id);
    const capa = materiais.find((item) => item.miniatura_url) || materiais[0];
    const subpastas = (state.divulgacaoPastas || []).filter((item) => item.pasta_pai_id === pasta.id).length;
    const resumo = pasta.descricao || `${subpastas ? `${subpastas} ${subpastas === 1 ? 'subpasta' : 'subpastas'} · ` : ''}${materiais.length} ${materiais.length === 1 ? 'material' : 'materiais'}`;
    return `<button type="button" class="material-folder-card" onclick="abrirPastaDivulgacao('${pasta.id}')"><span class="material-folder-cover">${capa?.miniatura_url ? `<img src="${escapeAttr(capa.miniatura_url)}" alt="">` : capa?.tipo === 'video' ? `<span class="material-cover-processing">${svgIcon('video')}<small>${capa.miniatura_status === 'erro' ? 'Capa indisponível' : 'Preparando capa'}</small></span>` : svgIcon('folder')}</span><span class="material-folder-info"><b>${escapeHtml(pasta.nome)}</b><small>${escapeHtml(resumo)}</small><em>${materiais.length}</em></span></button>`;
  }).join('');
  const cardsMateriais = materiais.map((item) => `<button type="button" class="material-thumb" onclick="abrirMaterialDivulgacao('${item.id}')"><span>${item.miniatura_url ? `<img src="${escapeAttr(item.miniatura_url)}" alt="${escapeAttr(item.titulo)}">` : item.tipo === 'video' ? `<span class="material-cover-processing">${svgIcon('video')}<small>${item.miniatura_status === 'erro' ? 'Capa indisponível' : 'Preparando capa'}</small></span>` : svgIcon('package')}</span><b>${escapeHtml(item.titulo)}</b><small>${item.tipo === 'video' ? 'Vídeo' : 'Imagem'}</small></button>`).join('');
  const voltarId = pastaAtual?.pasta_pai_id || '';
  const navegacao = pastaAtual ? `<div class="material-page-location"><button type="button" class="material-page-back" onclick="voltarPastaDivulgacao('${voltarId}')">${svgIcon('chevron-left')} Voltar</button><div><small>Pasta atual</small><b>${escapeHtml(pastaAtual.nome)}</b>${pastaAtual.descricao ? `<span>${escapeHtml(pastaAtual.descricao)}</span>` : ''}</div></div>` : '';
  const conteudo = cardsPastas || cardsMateriais
    ? `${cardsPastas ? `<section class="material-page-section"><h3>${pastaAtual ? 'Subpastas' : 'Pastas'}</h3><div class="materials-grid">${cardsPastas}</div></section>` : ''}${cardsMateriais ? `<section class="material-page-section"><h3>Materiais</h3><div class="material-page-files">${cardsMateriais}</div></section>` : ''}`
    : `<article class="publication-empty"><span>${svgIcon(pastaAtual ? 'package' : 'folder')}</span><h3>${pesquisa ? 'Nenhum material encontrado' : pastaAtual ? 'Esta pasta está vazia' : 'Nenhum material publicado'}</h3><p>${pesquisa ? 'Revise a pesquisa e tente novamente.' : pastaAtual ? 'Não há subpastas, fotos ou vídeos nesta pasta.' : 'Quando sua empresa publicar fotos ou vídeos, as pastas aparecerão aqui.'}</p></article>`;
  return `<section class="module-page materials-page divulgacao-page"><div class="module-sticky-head"><div class="module-title"><div><h2>Divulgação</h2><p>Materiais publicados pela sua empresa para compartilhar.</p></div></div>${renderBarraBusca('Pesquisar pastas ou materiais', 'Ordem Alfabética', true)}</div>${navegacao}<div class="material-page-content">${conteudo}</div></section>`;
}

function abrirPastaDivulgacao(pastaId) {
  if (!(state.divulgacaoPastas || []).some((item) => item.id === pastaId)) return;
  divulgacaoPastaAtualId = pastaId;
  state.busca = '';
  buscaAplicada = '';
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function voltarPastaDivulgacao(pastaId = '') {
  divulgacaoPastaAtualId = pastaId || null;
  state.busca = '';
  buscaAplicada = '';
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function abrirMaterialDivulgacao(materialId) {
  const material = (state.divulgacaoMateriais || []).find((item) => item.id === materialId);
  if (!material) return;
  const visualizacao = material.tipo === 'video'
    ? `<video src="${escapeAttr(material.arquivo_url)}" controls playsinline preload="metadata"></video>`
    : `<img src="${escapeAttr(material.arquivo_url)}" alt="${escapeAttr(material.titulo)}">`;
  sheet(`<div class="sheet-header"><div><h2>${escapeHtml(material.titulo)}</h2><p class="muted small">Toque na mídia para ampliar.</p></div><button class="close" onclick="fecharSheet()">×</button></div><button type="button" class="material-preview" onclick="alternarMaterialExpandido()" aria-label="Ampliar material">${visualizacao}</button><button type="button" class="primary material-share" onclick="compartilharMaterialDivulgacao('${material.id}')">${svgIcon('save')} Compartilhar material</button>`, 'sheet-backdrop-centered material-preview-backdrop');
}

function alternarMaterialExpandido() {
  document.getElementById('sheetBackdrop')?.classList.toggle('material-expanded');
}

async function compartilharMaterialDivulgacao(materialId) {
  const material = (state.divulgacaoMateriais || []).find((item) => item.id === materialId);
  if (!material) return;
  const botao = document.querySelector('.material-share');
  if (botao) { botao.disabled = true; botao.textContent = 'Preparando material...'; }
  try {
    const resposta = await fetch(material.arquivo_url);
    if (!resposta.ok) throw new Error('Não foi possível baixar o material.');
    const blob = await resposta.blob();
    const extensao = blob.type.split('/')[1]?.replace('quicktime', 'mov') || (material.tipo === 'video' ? 'mp4' : 'jpg');
    const nome = `${String(material.titulo || 'material').replace(/[^a-zA-Z0-9_-]+/g, '-')}.${extensao}`;
    const arquivo = new File([blob], nome, { type: blob.type });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [arquivo] }))) {
      await navigator.share({ title: material.titulo, text: 'Material de divulgação', files: [arquivo] });
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = nome; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Material baixado para compartilhar.');
  } catch (error) {
    if (error?.name !== 'AbortError') toast(traduzErro(error));
  } finally {
    if (botao) { botao.disabled = false; botao.innerHTML = `${svgIcon('save')} Compartilhar material`; }
  }
}

function renderConfiguracoes() {
  const t = totaisPeriodo();
  const progresso = state.metaMensal > 0 ? Math.min(100, t.total / state.metaMensal * 100) : 0;
  const telefone = String(state.usuario?.telefone || '');
  const empresa = String(state.acessoVendas?.empresa_nome || 'Não informada');
  const integracao = state.integracaoGestao || { base_receita: 'recebidos', pode_configurar: false };
  const vinculos = state.vinculosComerciais || [];
  const renderRecurso = (vinculo, chave, titulo) => {
    const campoAtivo = { novidades: 'novidades_ativas', divulgacao: 'divulgacao_ativa', catalogo: 'catalogo_ativo' }[chave];
    const ativo = Boolean(vinculo[campoAtivo]);
    return `<button type="button" class="${ativo ? 'is-on' : ''}" onclick="alternarRecursoVinculoComercial('${vinculo.empresa_id}','${chave}',${!ativo})">${titulo}</button>`;
  };
  const renderVinculo = (vinculo) => `<div class="commercial-link ${vinculo.ativo ? 'is-current' : ''}"><header><b>${escapeHtml(vinculo.empresa_nome || 'Empresa')}</b><span>${vinculo.ativo ? 'Ativa' : 'Histórico'}</span></header><div class="commercial-link-resources">${renderRecurso(vinculo, 'novidades', 'Notícias')}${renderRecurso(vinculo, 'divulgacao', 'Divulgação')}${renderRecurso(vinculo, 'catalogo', 'Catálogo')}</div></div>`;
  return `<section class="module-page settings-page">
    <div class="module-sticky-head"><div class="module-title"><div><h2>Configurações</h2><p>Preferências, segurança e recursos do Vendas.</p></div></div></div>
    <div class="settings-grid">
      <article class="settings-card settings-profile-card"><h3>${svgIcon('user')} Dados do usuário</h3><dl><dt>Nome completo</dt><dd>${escapeHtml(state.usuario.nome)}</dd><dt>Celular confirmado</dt><dd>${telefone ? escapeHtml(mascararTelefone(telefone)) : 'Não informado'}</dd><dt>Empresa vinculada</dt><dd>${escapeHtml(empresa)}</dd></dl><div class="actions"><button class="secondary" onclick="abrirAtualizarTelefone()">${svgIcon('phone')} ${telefone ? 'Alterar celular' : 'Cadastrar celular'}</button></div></article>
    <article class="settings-card"><h3>${svgIcon('settings')} Aparência</h3><label class="switch-line"><span>Modo escuro</span><input type="checkbox" ${state.temaEscuro ? 'checked' : ''} onchange="alternarTema(this.checked)"><i></i></label><p>Alterne o tema da aplicação para maior conforto visual.</p><div class="actions settings-shortcuts-actions"><button class="secondary" onclick="abrirOrganizarAtalhosVendas()">${svgIcon('settings')} Organizar atalhos</button></div></article>
    </div>
    <article class="settings-card settings-goal"><h3>${svgIcon('target')} Meta do período</h3><div class="settings-goal-summary"><div><span>Meta mensal</span><b>${moeda(state.metaMensal)}</b></div><div><span>Vendas mensais</span><b>${moeda(t.total)}</b></div></div><div class="progress"><i style="width:${Math.max(2, progresso)}%"></i></div><p>Faltam <b>${moeda(Math.max(0, state.metaMensal - t.total))}</b> para atingir sua meta.</p><div class="settings-form settings-goals-form"><label><span>Definir meta mensal</span><input id="metaConfig" type="text" inputmode="numeric" value="${numeroParaCampoMoeda(state.metaMensal)}" onfocus="this.select()" oninput="formatarCampoMoeda(this)" placeholder="0,00"></label><button class="primary" onclick="salvarMeta()">${svgIcon('save')} Salvar meta</button></div></article>
    <article class="settings-card"><h3>${svgIcon('settings')} Integração com Gestão</h3><p>Os resultados do Vendas Mobile entram automaticamente como receita no Gestão sempre que um lançamento for alterado.</p><div class="settings-integration"><span>Destino financeiro</span><button class="secondary" onclick="abrirPerfilFinanceiroVendas()">${svgIcon('settings')} ${escapeHtml((state.perfisFinanceiros || []).find((perfil) => perfil.empresa_id === integracao.empresa_id)?.empresa_nome || 'Definir perfil financeiro')}</button><span>Enviar para o Gestão</span><div class="settings-segmented ${integracao.pode_configurar ? '' : 'is-disabled'}" role="group" aria-label="Base de receita enviada ao Gestão"><button type="button" class="${integracao.base_receita === 'recebidos' ? 'is-selected' : ''}" onclick="salvarIntegracaoGestao('recebidos')" ${integracao.pode_configurar ? '' : 'disabled'}>Recebidos</button><button type="button" class="${integracao.base_receita === 'vendidos' ? 'is-selected' : ''}" onclick="salvarIntegracaoGestao('vendidos')" ${integracao.pode_configurar ? '' : 'disabled'}>Vendidos</button></div></div>${integracao.pode_configurar ? '' : '<small>Escolha um perfil que você gerencia para alterar o destino ou a base.</small>'}<small>O padrão é valores recebidos. As receitas criadas no Gestão são protegidas contra edição manual.</small></article>
    <article class="settings-card settings-commercial-links"><h3>${svgIcon('package')} Empresas e conteúdos</h3><p>Uma empresa fica ativa. As anteriores permanecem como histórico, e você decide o que manter.</p><div class="commercial-links-hint">Toque em Notícias, Divulgação ou Catálogo para ativar ou desativar cada item.</div><div class="commercial-links-list">${vinculos.length ? vinculos.map(renderVinculo).join('') : '<small>Nenhuma empresa comercial vinculada.</small>'}</div><div class="actions"><button class="secondary" onclick="abrirNovoVinculoComercial()">${svgIcon('plus')} Vincular outra empresa</button></div><small>Desligar Catálogo permite manter os produtos já recebidos ou removê-los sem afetar pedidos e resultados anteriores.</small></article>
    <article class="settings-card"><h3>${svgIcon('lock')} Senha da conta AvantaLab</h3><p>Esta senha pertence à sua conta principal. Ao alterá-la aqui, a nova senha passa a valer para o acesso ao Gestão e ao Vendas.</p><div class="password-form"><label>Nova senha (mín. 8 caracteres)<input id="senhaNova" type="password" autocomplete="new-password" minlength="8"></label><label>Confirme a nova senha<input id="senhaConfirma" type="password" autocomplete="new-password" minlength="8"></label><button class="password-button" onclick="alterarSenha()">${svgIcon('lock')} Atualizar senha da conta</button></div></article>
    <article class="settings-card settings-catalog-card"><h3>${svgIcon('package')} Catálogo de produtos</h3><p>Os novos produtos da empresa chegam automaticamente. Se recebeu um pacote, importe o arquivo ZIP completo.</p><div class="actions"><button class="primary" onclick="abrirImportacaoPacoteZip()">${svgIcon('package')} Importar pacote ZIP</button><button class="secondary" onclick="mostrarSincronizacaoCatalogo()">${svgIcon('save')} Situação da sincronização</button></div></article>
    <article class="settings-card settings-stock-card"><h3>${svgIcon('package')} Controle de estoque</h3><p>${state.produtos.filter((produto) => produto.estoque_controlado).length} produto(s) com estoque acompanhado neste aparelho.</p><div class="actions"><button class="primary" onclick="abrirAtualizarEstoque()">${svgIcon('plus')} Atualizar estoque</button></div><small>Entrada soma ao saldo atual. Ajuste define o saldo físico contado.</small></article>
    <article class="settings-card settings-pwa-card"><h3>${svgIcon('save')} Aplicativo Web (PWA)</h3><p>Instale o aplicativo na tela inicial para acesso rápido, como um app nativo.</p><button class="install-button" onclick="instalarPWA()">Adicionar à Área de Trabalho</button><small>Se o botão não aparecer, use “Adicionar à tela inicial” no menu do navegador.</small></article>
    <article class="settings-card settings-exit-card"><h3>${svgIcon('log-out')} Sair</h3><p>Encerre sua sessão neste aparelho.</p><button class="danger" onclick="abrirConfirmacaoSair()">Sair do Vendas</button></article>
    <article class="settings-card settings-reset-card"><h3>${svgIcon('warning')} Resetar sistema</h3><p>Gera um backup automático e apaga lançamentos, clientes, agenda, produtos e preferências deste Vendas.</p><button class="danger" onclick="abrirResetSistemaVendas()">${svgIcon('warning')} Resetar Vendas Mobile</button></article>
  </section>`;
}

function salvarMeta() {
  state.metaMensal = Math.max(0, lerCampoMoeda('metaConfig'));
  render();
  toast('Meta mensal salva.');
}

async function salvarIntegracaoGestao(base) {
  base = base === 'vendidos' ? 'vendidos' : 'recebidos';
  const anterior = state.integracaoGestao?.base_receita || 'recebidos';
  if (base === anterior) return;
  state.integracaoGestao = { ...state.integracaoGestao, base_receita: base };
  render();
  try {
    const resposta = await window.VendasDb.configurarIntegracaoGestao(base);
    state.integracaoGestao = { ...state.integracaoGestao, ...(resposta || {}), base_receita: base };
    render();
    toast(`Integração atualizada para ${base === 'vendidos' ? 'valores vendidos' : 'valores recebidos'}.`);
  } catch (error) { state.integracaoGestao = { ...state.integracaoGestao, base_receita: anterior }; render(); toast(traduzErro(error)); }
}

function abrirPerfilFinanceiroVendas() {
  const perfis = state.perfisFinanceiros || [];
  if (!perfis.length) { toast('Nenhum perfil financeiro disponível. Você precisa ser gestor ou administrador de um perfil no Gestão.'); return; }
  sheet(`<div class="sheet-header"><div><h2>Destino financeiro</h2><p class="muted small">Catálogo e resultados financeiros permanecem independentes.</p></div><button class="close" onclick="fecharSheet()">×</button></div><p>Escolha o perfil que receberá as próximas receitas do Vendas Mobile.</p><div class="grid">${perfis.map((perfil) => `<button class="secondary" onclick="confirmarPerfilFinanceiroVendas('${perfil.empresa_id}','${escapeHtml(perfil.empresa_nome)}')">${escapeHtml(perfil.empresa_nome)}</button>`).join('')}</div>`, 'sheet-backdrop-centered');
}

function confirmarPerfilFinanceiroVendas(empresaId, empresaNome) {
  sheet(`<div class="sheet-header"><div><h2>Confirmar destino</h2><p class="muted small">Confirmação de segurança.</p></div><button class="close" onclick="fecharSheet()">×</button></div><p>As próximas receitas serão enviadas para <b>${escapeHtml(empresaNome)}</b>. Esta mudança não altera catálogos, clientes ou pedidos anteriores.</p><div class="grid"><button class="secondary" onclick="abrirPerfilFinanceiroVendas()">Voltar</button><button class="primary" onclick="salvarPerfilFinanceiroVendas('${empresaId}')">Confirmar destino</button></div>`, 'sheet-backdrop-centered');
}

async function salvarPerfilFinanceiroVendas(empresaId) {
  try {
    await window.VendasDb.definirPerfilFinanceiro(empresaId);
    fecharSheet();
    await carregarDadosBackend(false);
    toast('Destino financeiro atualizado.');
  } catch (error) { toast(traduzErro(error)); }
}

async function alternarRecursoVinculoComercial(empresaId, recurso, ativar) {
  const vinculo = (state.vinculosComerciais || []).find((item) => item.empresa_id === empresaId);
  if (!vinculo) return;
  if (recurso === 'catalogo' && !ativar) {
    sheet(`<div class="sheet-header"><div><h2>Desligar catálogo</h2><p class="muted small">Os pedidos e resultados anteriores não serão alterados.</p></div><button class="close" onclick="fecharSheet()">×</button></div><p>O que deseja fazer com os produtos recebidos de <b>${escapeHtml(vinculo.empresa_nome)}</b>?</p><div class="grid"><button class="secondary" onclick="confirmarRecursoVinculoComercial('${empresaId}','catalogo',false,false)">Manter produtos no meu catálogo</button><button class="danger" onclick="confirmarRecursoVinculoComercial('${empresaId}','catalogo',false,true)">Remover produtos recebidos</button></div>`, 'sheet-backdrop-centered');
    return;
  }
  await confirmarRecursoVinculoComercial(empresaId, recurso, ativar, false);
}

async function confirmarRecursoVinculoComercial(empresaId, recurso, ativar, removerCatalogo) {
  try {
    const vinculos = await window.VendasDb.atualizarRecursoVinculoComercial(empresaId, recurso, ativar, removerCatalogo);
    state.vinculosComerciais = vinculos;
    state.vinculoComercialAtivo = vinculos.find((item) => item.ativo) || null;
    fecharSheet();
    render();
    toast(`${recurso === 'novidades' ? 'Notícias' : recurso === 'divulgacao' ? 'Divulgação' : 'Catálogo'} ${ativar ? 'mantido' : 'desligado'}.`);
  } catch (error) { toast(traduzErro(error)); }
}

function abrirNovoVinculoComercial() {
  sheet(`<div class="sheet-header"><div><h2>Vincular outra empresa</h2><p class="muted small">Após aprovação, ela passa a ser sua empresa comercial ativa.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="grid"><label>Código da empresa<input id="novoCodigoVinculo" autocomplete="off" autocapitalize="characters"></label><label>Digite o código novamente<input id="novoCodigoVinculoConfirma" autocomplete="off" autocapitalize="characters"></label><label>Nome para a solicitação<input id="novoVinculoNome" value="${escapeHtml(state.usuario?.nome || '')}"></label><button class="primary" onclick="solicitarNovoVinculoComercial()">Enviar para aprovação</button></div>`, 'sheet-backdrop-centered');
}

async function solicitarNovoVinculoComercial() {
  const codigo = valor('novoCodigoVinculo').trim().toUpperCase();
  const confirma = valor('novoCodigoVinculoConfirma').trim().toUpperCase();
  const nome = valor('novoVinculoNome').trim();
  if (!codigo || codigo !== confirma || !nome) { toast('Confirme o mesmo código da empresa duas vezes e informe seu nome.'); return; }
  try {
    await window.VendasDb.solicitarAcesso({ codigo, nome, telefone: state.usuario?.telefone || '' });
    fecharSheet();
    toast('Solicitação enviada. Após a aprovação, a nova empresa ficará ativa.');
  } catch (error) { toast(traduzErro(error)); }
}

function abrirResetSistemaVendas() {
  sheet(`<div class="sheet-header"><div><h2>Resetar Vendas Mobile</h2><p class="muted small">Esta ação é permanente.</p></div><button class="close" onclick="fecharSheet()">×</button></div><p>Antes de apagar, o sistema cria um backup automático e também baixa uma cópia Excel. Digite <b>RESETAR</b> para confirmar.</p><label>Confirmação<input id="confirmacaoResetVendas" autocomplete="off" autocapitalize="characters"></label><div class="grid"><button class="secondary" onclick="fecharSheet()">Cancelar</button><button class="danger" onclick="confirmarResetSistemaVendas()">Resetar definitivamente</button></div>`, 'sheet-backdrop-centered');
}

async function confirmarResetSistemaVendas() {
  if (valor('confirmacaoResetVendas').trim().toUpperCase() !== 'RESETAR') { toast('Digite RESETAR para confirmar.'); return; }
  try {
    await exportarBackupVendasExcel();
    await window.VendasDb.resetarSistemaVendas();
    await limparCacheVendas(undefined, undefined, true);
    localStorage.removeItem(STORAGE_KEY);
    fecharSheet();
    await carregarDadosBackend(false);
    toast('Sistema resetado. O backup foi gerado antes da limpeza.');
  } catch (error) { toast(traduzErro(error)); }
}

function alternarTema(ativo) {
  state.temaEscuro = Boolean(ativo);
  document.documentElement.classList.toggle('dark-theme', state.temaEscuro);
  render();
}

async function alterarSenha() {
  const nova = valor('senhaNova');
  const confirma = valor('senhaConfirma');
  if (nova.length < 8 || nova !== confirma) {
    toast('Confirme uma senha com pelo menos 8 caracteres.');
    return;
  }
  try {
    await window.VendasDb.updatePassword(nova);
    document.getElementById('senhaNova').value = '';
    document.getElementById('senhaConfirma').value = '';
    toast('Senha da conta atualizada para o Gestão e o Vendas.');
  } catch (error) { toast(traduzErro(error)); }
}

function abrirAtualizarTelefone() {
  telefonePerfilPendente = null;
  telefonePerfilSalvando = false;
  renderAtualizarTelefone();
}

function renderAtualizarTelefone() {
  const conteudo = telefonePerfilPendente
    ? `<p class="muted small">Enviamos um código para <b>${escapeHtml(mascararTelefone(telefonePerfilPendente))}</b>. Confirme-o para salvar seu celular.</p><div class="grid">${campo('perfilTelefoneCodigo', 'Código recebido', '', 'text')}<button class="primary" onclick="confirmarAtualizarTelefone()" ${telefonePerfilSalvando ? 'disabled' : ''}>${telefonePerfilSalvando ? 'Validando e salvando...' : 'Confirmar celular'}</button><button class="forgot-link" type="button" onclick="abrirAtualizarTelefone()" ${telefonePerfilSalvando ? 'disabled' : ''}>Alterar número</button></div>`
    : `<p class="muted small">Seu número será vinculado à conta atual e validado por SMS. Seus acessos permanecem os mesmos.</p><div class="grid">${campoTelefone('perfilTelefone', 'Celular', state.usuario?.telefone || '')}<button class="primary" onclick="enviarCodigoAtualizarTelefone()">Enviar código por SMS</button></div>`;
  sheet(`<div class="sheet-header"><div><h2>Celular da conta</h2><p class="muted small">Confirmação segura por SMS.</p></div><button class="close" onclick="fecharSheet()">×</button></div>${conteudo}`);
}

async function enviarCodigoAtualizarTelefone() {
  const ddi = valor('perfilTelefoneDdi').replace(/\D/g, '') || '55';
  const numero = valor('perfilTelefone').replace(/\D/g, '');
  const ehBrasil = ddi === '55';
  if (!numero || (ehBrasil ? numero.length < 10 || numero.length > 11 : numero.length < 6 || numero.length > 15)) {
    toast(ehBrasil ? 'Informe um celular válido com DDD.' : 'Informe um número de celular válido.');
    return;
  }
  try {
    telefonePerfilPendente = `+${ddi}${numero}`;
    await enviarSmsCadastro(telefonePerfilPendente);
    renderAtualizarTelefone();
    toast('Código enviado por SMS.');
  } catch (error) { telefonePerfilPendente = null; toast(traduzErro(error)); }
}

async function confirmarAtualizarTelefone() {
  const codigo = valor('perfilTelefoneCodigo').trim();
  if (!telefonePerfilPendente || !codigo || telefonePerfilSalvando) { if (!codigo) toast('Digite o código recebido por SMS.'); return; }
  const telefoneConfirmado = telefonePerfilPendente;
  telefonePerfilSalvando = true;
  renderAtualizarTelefone();
  try {
    const token = await comLimiteDeTempo(window.VendasDb.getAccessToken(), 'Sua sessão demorou para responder. Atualize a página e tente novamente.', 10000);
    if (!token) throw new Error('Sua sessão expirou. Entre novamente para confirmar o celular.');
    const resposta = await comLimiteDeTempo(fetch('/api/vendas/telefone/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ telefone: telefoneConfirmado, codigo }),
    }), 'A confirmação do celular demorou mais que o esperado.', 20000);
    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Código inválido ou expirado.');
    state.usuario.telefone = resultado.telefone || telefoneConfirmado;
    telefonePerfilPendente = null;
    telefonePerfilSalvando = false;
    fecharSheet();
    render();
    toast('Celular confirmado com sucesso.');
  } catch (error) {
    telefonePerfilSalvando = false;
    renderAtualizarTelefone();
    toast(traduzErro(error));
  }
}

function instalarPWA() {
  toast('Use a opção “Adicionar à tela inicial” do navegador.');
}

function linhaInfo(titulo, detalhe) {
  return `
    <div class="row">
      <div class="row-main">
        <p class="row-title">${escapeHtml(titulo)}</p>
        <p class="row-sub">${escapeHtml(detalhe)}</p>
      </div>
    </div>
  `;
}

function renderBusca(placeholder) {
  return `
    <div class="field">
      <input value="${escapeAttr(state.busca)}" placeholder="${placeholder}" oninput="state.busca = this.value" onkeydown="if(event.key==='Enter') aplicarBusca()" />
    </div>
  `;
}

function renderBarraBusca(placeholder, filtro = 'Ordem Alfabética', acoesSempreVisiveis = false) {
  const temBusca = Boolean(String(state.busca || '').trim());
  const filtroAlfabetico = normalizar(filtro).includes('ordem alfabetica');
  const rotuloFiltro = filtroAlfabetico ? `Ordem ${ordemAlfabetica === 'asc' ? 'A/Z' : 'Z/A'}` : filtro;
  return `<article class="tridium-search-card${acoesSempreVisiveis ? ' search-compact-always' : ''}"><div class="search-input-wrap">${svgIcon('search')}<input value="${escapeAttr(state.busca)}" placeholder="${escapeAttr(placeholder)}" oninput="atualizarBusca(this.value)" onkeydown="if(event.key==='Enter') aplicarBusca()"><button type="button" class="search-clear${temBusca ? '' : ' is-hidden'}" onclick="limparBusca()" aria-label="Limpar pesquisa">×</button></div><div class="search-actions${acoesSempreVisiveis ? ' always-visible' : temBusca ? '' : ' is-hidden'}"><button type="button" class="search-filter" ${filtroAlfabetico ? 'onclick="alternarOrdemAlfabetica()"' : ''}>${svgIcon('filter')}${escapeHtml(rotuloFiltro)}${filtroAlfabetico ? svgIcon('chevron-down') : ''}</button><button class="primary search-submit" onclick="aplicarBusca()">${svgIcon('search')} Buscar</button></div></article>`;
}

function alternarOrdemAlfabetica() {
  ordemAlfabetica = ordemAlfabetica === 'asc' ? 'desc' : 'asc';
  render();
}

function atualizarBusca(valor) {
  state.busca = valor;
  const temBusca = Boolean(String(valor || '').trim());
  app.querySelectorAll('.search-clear').forEach((botao) => botao.classList.toggle('is-hidden', !temBusca));
  app.querySelectorAll('.search-actions:not(.always-visible)').forEach((acoes) => acoes.classList.toggle('is-hidden', !temBusca));
  app.querySelector('.clientes-page, .produtos-page, .pedidos-page, .pagamentos-page, .publicacoes-page, .divulgacao-page')?.classList.toggle('is-searching', temBusca);
  if (!temBusca && buscaAplicada) {
    buscaAplicada = '';
    render();
  }
}

function limparBusca() {
  state.busca = '';
  buscaAplicada = '';
  if (state.aba === 'vendas') limitePedidos = 10;
  if (state.aba === 'vender') limiteClientesPagamentos = 10;
  render();
}

function opcoesDdi(selected = '55') {
  return PAISES_DDI.map(([nome, ddi, flag]) => `<option value="${ddi}" ${ddi === selected ? 'selected' : ''}>${flag} +${ddi}</option>`).join('');
}

function separarTelefone(telefone = '') {
  const valorTelefone = String(telefone || '').trim();
  const numeros = valorTelefone.replace(/\D/g, '');
  if (!valorTelefone.startsWith('+')) return { ddi: '55', numero: numeros };
  const pais = [...PAISES_DDI].sort((a, b) => b[1].length - a[1].length).find(([, ddi]) => numeros.startsWith(ddi));
  return pais ? { ddi: pais[1], numero: numeros.slice(pais[1].length) } : { ddi: '55', numero: numeros };
}

function campoTelefone(idCampo, label, telefone = '') {
  const dados = separarTelefone(telefone);
  const numero = dados.numero;
  const formatado = dados.ddi === '55' && numero ? `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}${numero.length > 6 ? `-${numero.slice(7, 11)}` : ''}`.trim() : numero;
  return `<div class="field"><label>${label}</label><div class="phone-system-field"><select id="${idCampo}Ddi" data-phone-ddi data-phone-target="${idCampo}" aria-label="DDI">${opcoesDdi(dados.ddi)}</select><input id="${idCampo}" data-phone-field data-ddi-target="${idCampo}Ddi" type="tel" inputmode="tel" autocomplete="tel-national" value="${escapeAttr(formatado)}" placeholder="(11) 99999-9999" /></div></div>`;
}

function campoCepCliente(cep = '') {
  const numeros = String(cep || '').replace(/\D/g, '').slice(0, 8);
  const formatado = numeros.length > 5 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : numeros;
  return `<div class="field"><label>CEP</label><div class="cep-system-field"><input id="cliCep" inputmode="numeric" autocomplete="postal-code" value="${escapeAttr(formatado)}" maxlength="9" placeholder="00000-000" oninput="this.value=this.value.replace(/\\D/g,'').replace(/(\\d{5})(\\d)/,'$1-$2')"><button type="button" class="secondary" onclick="buscarCepCliente()">${svgIcon('search')} Buscar</button></div></div>`;
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

async function buscarCepCliente() {
  const cep = valor('cliCep').replace(/\D/g, '');
  if (cep.length !== 8) { toast('Informe um CEP com 8 dígitos.'); return; }
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await resposta.json();
    if (!resposta.ok || dados.erro) throw new Error('CEP não encontrado.');
    document.getElementById('cliEndereco').value = [dados.logradouro, dados.bairro].filter(Boolean).join(' - ');
    document.getElementById('cliCidade').value = dados.localidade || '';
    document.getElementById('cliEstado').value = dados.uf || '';
    document.getElementById('cliCep').value = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    document.getElementById('cliNumero')?.focus();
  } catch (error) { toast('Não foi possível localizar esse CEP.'); }
}

function aplicarBusca() {
  buscaAplicada = state.busca;
  if (state.aba === 'vendas') limitePedidos = 10;
  if (state.aba === 'vender') limiteClientesPagamentos = 10;
  render();
}

function renderProdutos() {
  const produtos = produtosFiltrados();
  const temBusca = Boolean(String(state.busca || '').trim());
  return `
    <section class="module-page produtos-page${temBusca ? ' is-searching' : ''}">
      <div class="module-sticky-head"><div class="module-title"><div><h2>Produtos</h2><p>Catálogo, custos e preços de venda.</p></div><button class="primary product-new-button" onclick="this.blur();abrirProduto()">＋ Novo produto</button></div>${renderBarraBusca('Pesquisar produtos', 'Ordem alfabética')}<div class="module-stats product-package-stats"><span><b>${state.produtos.length}</b> produtos cadastrados</span><span><b>${state.pacotesProdutos.length}</b> pacotes ativos</span><button class="package-manage-link" onclick="abrirGerenciarPacotes()">${svgIcon('package')} Gerenciar</button></div></div>
      <section class="product-grid module-product-grid">
      ${produtos.length ? produtos.map(renderProduto).join('') : empty('Nenhum produto cadastrado.')}
    </section>
    </section>
  `;
}

function renderProduto(p) {
  const preco = p.preco;
  const pacote = state.pacotesProdutos.find((item) => item.id === p.pacote_origem_id);
  return `
    <article class="product-card">
      <div class="product-image-wrap" onclick="abrirProduto('${p.id}')">
        ${p.imagem_url ? `<img class="product-image" src="${escapeAttr(p.imagem_url)}" alt="${escapeAttr(p.nome)}" />` : '<div class="product-placeholder">🛍️</div>'}
        <span class="product-badge">${escapeHtml(p.categoria || 'Geral')}</span>${pacote ? `<small class="product-package-badge">${escapeHtml(pacote.numero || pacote.nome)}</small>` : ''}
      </div>
      <div class="product-content">
        <h3>${escapeHtml(p.nome)}</h3>
        <p class="row-sub">${escapeHtml(p.marca || 'Tridium')} · ${escapeHtml(p.sku || 'sem SKU')}</p>
        <div class="product-price-line"><p class="product-price"><small>Venda</small>${moeda(preco)}</p><p class="product-cost"><small>Custo</small>${moeda(p.preco_custo || 0)}</p></div>
        <div class="product-actions">
          <button class="ghost" onclick="abrirProduto('${p.id}')">Ver / editar</button>
        </div>
      </div>
    </article>
  `;
}

function resumosFinanceirosListaClientes() {
  const resumos = new Map();
  const obterResumo = (clienteId) => {
    if (!resumos.has(clienteId)) {
      resumos.set(clienteId, {
        totalDebitos: 0,
        consignado: 0,
        abatimentos: 0,
        ultimaVenda: null,
        ultimaVendaTempo: 0,
      });
    }
    return resumos.get(clienteId);
  };
  (state.vendas || []).forEach((venda) => {
    if (!venda.cliente_id || venda.status === 'cancelada') return;
    const resumo = obterResumo(venda.cliente_id);
    if (pedidoEhConsignado(venda)) {
      resumo.consignado += Number(venda.total || 0);
      return;
    }
    if (pedidoGeraDebito(venda)) resumo.totalDebitos += Number(venda.total || 0);
    if (pedidoSomenteBonificado(venda)) return;
    const tempoVenda = Date.parse(venda.criado_em || '') || 0;
    if (!resumo.ultimaVenda || tempoVenda >= resumo.ultimaVendaTempo) {
      resumo.ultimaVenda = venda;
      resumo.ultimaVendaTempo = tempoVenda;
    }
  });
  const pagamentosUnicos = new Map();
  (state.pagamentos || []).forEach((pagamento) => {
    if (pagamento.cliente_id && pagamento.id) pagamentosUnicos.set(`${pagamento.cliente_id}:${pagamento.id}`, pagamento);
  });
  pagamentosUnicos.forEach((pagamento) => {
    const resumo = obterResumo(pagamento.cliente_id);
    resumo.abatimentos += Number(pagamento.valor || 0) + Number(pagamento.desconto || 0);
  });
  resumos.forEach((resumo) => {
    resumo.debito = Math.max(0, resumo.totalDebitos - resumo.abatimentos);
    resumo.credito = Math.max(0, resumo.abatimentos - resumo.totalDebitos);
  });
  return resumos;
}

function renderClientes() {
  const clientes = clientesFiltrados();
  const resumos = resumosFinanceirosListaClientes();
  const aniversariantesHoje = new Set(aniversariosHojeVendas().map((cliente) => cliente.id));
  return `
    <section class="module-page clientes-page">
      <div class="module-sticky-head"><div class="module-title"><div><h2>Clientes</h2></div><div class="client-title-actions"><button class="primary" onclick="this.blur();abrirCliente()">＋ Novo cliente</button></div></div>${renderBarraBuscaClientes()}</div>
      ${clientes.length ? `<section class="client-card-grid">${clientes.map((cliente) => renderCliente(cliente, resumos.get(cliente.id), aniversariantesHoje.has(cliente.id))).join('')}</section>` : `<article class="empty-module"><h3>Nenhum cliente cadastrado</h3><p>Cadastre o primeiro cliente para iniciar suas vendas.</p></article>`}
    </section>
  `;
}

function limparPesquisaClientesAoEntrar() {
  state.busca = '';
  buscaAplicada = '';
}

function renderBarraBuscaClientes() {
  const temBusca = Boolean(String(state.busca || '').trim());
  const rotuloOrdem = `Ordem ${ordemAlfabetica === 'asc' ? 'A/Z' : 'Z/A'}`;
  return `<div class="client-search-toolbar is-open"><div class="client-search-input-wrap">${svgIcon('search')}<input value="${escapeAttr(state.busca)}" placeholder="Pesquisar clientes" oninput="atualizarBuscaClientes(this.value)" onkeydown="if(event.key==='Enter') aplicarBusca()"><button type="button" class="client-search-clear${temBusca ? '' : ' is-hidden'}" onclick="limparBuscaClientes()" aria-label="Limpar pesquisa">×</button></div><button type="button" class="client-order-button" onclick="alternarOrdemAlfabetica()">${svgIcon('filter')}${rotuloOrdem}${svgIcon('chevron-down')}</button><button type="button" class="primary client-search-submit" onclick="aplicarBusca()">Buscar</button></div>`;
}

function atualizarBuscaClientes(valor) {
  state.busca = valor;
  const temBusca = Boolean(String(valor || '').trim());
  app.querySelector('.client-search-clear')?.classList.toggle('is-hidden', !temBusca);
  if (!temBusca && buscaAplicada) {
    buscaAplicada = '';
    render();
    requestAnimationFrame(() => app.querySelector('.clientes-page .client-search-input-wrap input')?.focus());
  }
}

function limparBuscaClientes() {
  state.busca = '';
  buscaAplicada = '';
  render();
  requestAnimationFrame(() => app.querySelector('.clientes-page .client-search-input-wrap input')?.focus());
}

function pedidoGeraDebito(venda) {
  const forma = normalizar(venda.forma_pagamento);
  return !pedidoEhConsignado(venda) && (forma === '' || forma === 'venda' || forma.includes('a prazo'));
}

function pagamentosDoCliente(clienteId) {
  const unicos = new Map();
  (state.pagamentos || []).forEach((pagamento) => {
    if (pagamento.cliente_id === clienteId && pagamento.id) unicos.set(pagamento.id, pagamento);
  });
  return [...unicos.values()]
    .sort((a, b) => String(b.data_pagamento || b.criado_em || '').localeCompare(String(a.data_pagamento || a.criado_em || '')));
}

function saldoFinanceiroCliente(clienteId, pedidoIgnoradoId = '') {
  const pedidos = pedidosDoCliente(clienteId).filter((venda) => venda.status !== 'cancelada' && venda.id !== pedidoIgnoradoId);
  const totalDebitos = pedidos.filter(pedidoGeraDebito).reduce((soma, venda) => soma + Number(venda.total || 0), 0);
  const consignado = pedidos.filter(pedidoEhConsignado).reduce((soma, venda) => soma + Number(venda.total || 0), 0);
  const abatimentos = pagamentosDoCliente(clienteId).reduce((soma, pagamento) => soma + Number(pagamento.valor || 0) + Number(pagamento.desconto || 0), 0);
  return {
    totalDebitos,
    consignado,
    abatimentos,
    debito: Math.max(0, totalDebitos - abatimentos),
    credito: Math.max(0, abatimentos - totalDebitos),
  };
}

function enderecoPrincipalCliente(cliente) {
  const endereco = cliente?.endereco;
  if (endereco && typeof endereco === 'object') {
    return String(endereco.endereco || endereco.logradouro || '').trim();
  }
  return String(endereco || cliente?.logradouro || '').trim();
}

function renderCliente(c, resumoFinanceiro = null, aniversarianteHoje = false) {
  const resumo = resumoFinanceiro || {};
  const ultimaVenda = resumo.ultimaVenda || null;
  const debito = Number(resumo.debito || 0);
  const consignado = Number(resumo.consignado || 0);
  const credito = Number(resumo.credito || 0);
  const iniciais = String(c.nome || 'C').split(/\s+/).slice(0, 2).map((parte) => parte[0] || '').join('').toUpperCase();
  const enderecoPrincipal = enderecoPrincipalCliente(c);
  const partesEndereco = [enderecoPrincipal, c.numero, c.complemento, c.bairro, c.cidade, c.estado, c.cep]
    .map((parte) => String(parte || '').trim())
    .filter(Boolean);
  const temEndereco = Boolean(enderecoPrincipal);
  const local = partesEndereco.join(', ');
  const temTelefone = Boolean(String(c.telefone || '').replace(/\D/g, ''));
  return `
    <article class="client-card ${c.ativo === false ? 'inactive' : ''} ${aniversarianteHoje ? 'client-birthday-today' : ''}" data-cliente-id="${escapeAttr(c.id)}">
      <header class="client-card-header">
        <div class="client-avatar">${escapeHtml(iniciais)}</div>
        <div class="client-identity"><h3>${escapeHtml(c.nome)}</h3></div>
        ${c.ativo === false ? '<span class="client-inactive">Inativo</span>' : ''}
        <button class="client-more" aria-label="Opções do cliente" onclick="abrirMenuCliente('${c.id}')">⋮</button>
      </header>
      <div class="client-contact-list">
        <div class="client-contact-actions">${temTelefone ? `<button type="button" onclick="ligarCliente('${c.id}')" aria-label="Ligar para ${escapeAttr(c.nome)}">${svgIcon('phone')} Ligar</button><button type="button" onclick="abrirWhatsappCliente('${c.id}')" aria-label="Chamar ${escapeAttr(c.nome)} no WhatsApp"><span class="whatsapp-mark">◉</span> WhatsApp</button>` : '<span class="client-contact-empty">Telefone não informado</span>'}</div>
        ${temEndereco
          ? `<button type="button" class="client-address-link" onclick="abrirMapasCliente('${c.id}')" aria-label="Abrir endereço de ${escapeAttr(c.nome)} no Waze ou mapas">${svgIcon('map-pin')}<span>${escapeHtml(local)}</span><span class="client-address-arrow" aria-hidden="true">›</span></button>`
          : `<div class="client-address-link client-address-empty">${svgIcon('map-pin')}<span>Adicione o endereço para abrir no waze ou mapas.</span></div>`}
      </div>
      <div class="client-values">
        <div class="client-debt-highlight"><span>Débito Atual</span><b class="${debito > 0 ? 'negative' : 'positive'}">${moeda(debito)}</b></div>
        <div class="consigned"><span>Consignado</span><b>${moeda(consignado)}</b></div>
        <div class="credit"><span>Crédito</span><b>${moeda(credito)}</b></div>
        <div><span>Última Compra</span><strong><b>${moeda(ultimaVenda?.total || 0)}</b><small>${ultimaVenda ? dataBR(ultimaVenda.criado_em) : 'Sem compras'}</small></strong></div>
      </div>
      <div class="client-actions">
        <button class="client-details" onclick="abrirDetalhesCliente('${c.id}')">Ver Detalhes</button>
        <div><button class="client-payment" onclick="abrirPagamentoCliente('${c.id}')">${svgIcon('dollar')} Pagamento</button><button class="client-order" onclick="abrirNovoPedidoCliente('${c.id}')">${svgIcon('shopping-bag')} Pedido</button></div>
      </div>
    </article>
  `;
}

function produtosDisponiveisPedido() {
  return state.produtos
    .filter((produto) => produto.ativo !== false)
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }));
}

function produtosFiltradosPedido(termo = '') {
  const palavras = normalizar(termo).trim().split(/\s+/).filter(Boolean);
  const produtos = produtosDisponiveisPedido();
  if (!palavras.length) return produtos;
  return produtos.filter((produto) => {
    const textoProduto = normalizar([
      produto.nome,
      produto.sku,
      produto.marca,
      produto.categoria,
    ].filter(Boolean).join(' '));
    return palavras.every((palavra) => textoProduto.includes(palavra));
  });
}

function clientesDisponiveisPedido() {
  return state.clientes
    .filter((cliente) => cliente.ativo !== false)
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }));
}

function clientesFiltradosLancamento(termo = '') {
  const palavras = normalizar(termo).trim().split(/\s+/).filter(Boolean);
  const clientes = clientesDisponiveisPedido();
  if (!palavras.length) return clientes;
  return clientes.filter((cliente) => {
    const textoCliente = normalizar([
      cliente.nome,
      cliente.telefone,
      String(cliente.telefone || '').replace(/\D/g, ''),
      cliente.email,
      cliente.cidade,
    ].filter(Boolean).join(' '));
    return palavras.every((palavra) => textoCliente.includes(palavra));
  });
}

function campoBuscaClienteLancamento(tipo, clienteId, busca = '') {
  const prefixo = tipo === 'pagamento' ? 'pagamentoCliente' : 'pedidoCliente';
  const cliente = state.clientes.find((item) => item.id === clienteId);
  const valorBusca = cliente?.nome || busca || '';
  return `<div class="transaction-field transaction-client-select transaction-client-search-field"><span>Cliente</span><div class="transaction-client-combobox"><input id="${prefixo}Busca" type="text" value="${escapeAttr(valorBusca)}" placeholder="Digite o nome do cliente" autocomplete="off" autocapitalize="words" spellcheck="false" aria-label="Buscar cliente" aria-autocomplete="list" aria-controls="${prefixo}Opcoes" aria-expanded="false" onfocus="abrirBuscaClienteLancamento('${tipo}')" oninput="filtrarClientesLancamento('${tipo}',this.value)" onkeydown="if(event.key==='Escape'){fecharBuscaClienteLancamento('${tipo}');this.blur();}"><div id="${prefixo}Opcoes" class="transaction-client-options" role="listbox" hidden></div></div></div>`;
}

function totaisPedidoClienteRascunho() {
  const subtotal = (pedidoClienteRascunho?.itens || []).reduce((soma, item) => soma + (item.bonificado ? 0 : Number(item.quantidade || 0) * Number(item.preco || 0)), 0);
  const percentual = Math.max(0, Math.min(100, Number(pedidoClienteRascunho?.descontoPercentual || 0)));
  const descontoCalculado = pedidoClienteRascunho?.descontoTipo === 'percentual' ? subtotal * percentual / 100 : Number(pedidoClienteRascunho?.desconto || 0);
  const desconto = Math.min(subtotal, Math.max(0, Math.round(descontoCalculado * 100) / 100));
  return { subtotal, desconto, total: Math.max(0, subtotal - desconto) };
}

function abrirNovoPedidoGeral() {
  if (!clientesDisponiveisPedido().length) { fecharSheet(); toast('Cadastre um cliente antes de criar o pedido.'); return; }
  abrirNovoPedidoCliente('', true);
}

function abrirNovoPedidoCliente(clienteId, permitirSelecao = false) {
  const cliente = state.clientes.find((item) => item.id === clienteId) || (permitirSelecao ? clientesDisponiveisPedido()[0] : null);
  if (!cliente) return;
  pedidoClienteRascunho = {
    idPersistencia: uuidPersistenciaVendas(),
    clienteId: permitirSelecao ? '' : clienteId,
    clienteBusca: '',
    permitirSelecaoCliente: Boolean(permitirSelecao),
    tipo: 'venda',
    data: isoData(new Date()),
    produtoId: '',
    produtoBusca: '',
    quantidade: 1,
    preco: 0,
    bonificado: false,
    desconto: 0,
    descontoTipo: 'valor',
    descontoPercentual: 0,
    itens: [],
  };
  mostrarCardPedidoCliente();
}

function mostrarCardPedidoCliente() {
  const rascunho = pedidoClienteRascunho;
  const cliente = state.clientes.find((item) => item.id === rascunho?.clienteId);
  if (!rascunho || (!cliente && !rascunho.permitirSelecaoCliente)) return;
  const produtos = produtosDisponiveisPedido();
  const totais = totaisPedidoClienteRascunho();
  const produtoSelecionado = produtos.find((produto) => produto.id === rascunho.produtoId);
  const produtoBusca = produtoSelecionado?.nome || rascunho.produtoBusca || '';
  const itensHtml = rascunho.itens.length
    ? rascunho.itens.map((item, indice) => `<article id="pedidoItemRascunho${indice}" class="${item.bonificado ? 'order-draft-bonus' : ''}"><div><b>${escapeHtml(item.produto_nome)}</b><small><span id="pedidoItemResumo${indice}">${item.quantidade} × ${moeda(item.preco)}</span> ${item.bonificado ? '<em>Bonificado</em>' : ''}</small></div><div class="order-draft-quantity"><button type="button" onclick="ajustarItemPedidoCliente(${indice},-1)" aria-label="Diminuir quantidade de ${escapeAttr(item.produto_nome)}">−</button><strong id="pedidoItemQuantidade${indice}">${item.quantidade}</strong><button type="button" onclick="ajustarItemPedidoCliente(${indice},1)" aria-label="Aumentar quantidade de ${escapeAttr(item.produto_nome)}">+</button></div><strong id="pedidoItemTotal${indice}">${item.bonificado ? moeda(0) : moeda(item.quantidade * item.preco)}</strong><button type="button" onclick="removerItemPedidoCliente(${indice})" aria-label="Excluir ${escapeAttr(item.produto_nome)}">×</button></article>`).join('')
    : '<p class="transaction-empty">Nenhum item inserido.</p>';
  sheet(`
    <div class="sheet-header"><div><h2>${rascunho.editandoId ? 'Editar pedido' : 'Novo pedido'}</h2><p class="muted small">${rascunho.permitirSelecaoCliente ? 'Selecione o cliente' : escapeHtml(cliente.nome)}</p></div><button type="button" class="close" onclick="${rascunho.editandoId ? `cancelarEdicaoPedido('${rascunho.editandoId}')` : 'fecharSheet(event)'}">×</button></div>
    <div class="order-transaction-layout">
      <div class="order-transaction-fixed">
        ${rascunho.permitirSelecaoCliente ? campoBuscaClienteLancamento('pedido', rascunho.clienteId, rascunho.clienteBusca) : ''}
        <div class="transaction-type-switch"><button type="button" class="${rascunho.tipo === 'venda' ? 'active' : ''}" onclick="selecionarTipoPedidoCliente('venda')">Venda</button><button type="button" class="${rascunho.tipo === 'consignado' ? 'active' : ''}" onclick="selecionarTipoPedidoCliente('consignado')">Consignado</button></div>
        ${campoDataCentralizado('pedidoClienteData', rascunho.data, 'Data do pedido')}
      <article class="order-product-entry">
        ${produtos.length ? `<div class="transaction-field order-product-search-field"><span>Produto</span><div class="order-product-combobox"><input id="pedidoClienteProdutoBusca" type="text" value="${escapeAttr(produtoBusca)}" placeholder="Digite o nome ou código do produto" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Buscar produto" aria-autocomplete="list" aria-controls="pedidoClienteProdutoOpcoes" aria-expanded="false" onfocus="abrirBuscaProdutoPedidoCliente()" oninput="filtrarProdutosPedidoCliente(this.value)" onkeydown="if(event.key==='Escape'){fecharBuscaProdutoPedidoCliente();this.blur();}"><div id="pedidoClienteProdutoOpcoes" class="order-product-options" role="listbox" hidden></div></div></div>
        <div class="order-item-fields"><label class="transaction-field"><span>Quantidade</span><div class="quantity-stepper"><button type="button" onclick="ajustarQuantidadePedidoCliente(-1)">−</button><input id="pedidoClienteQuantidade" type="number" min="1" step="1" inputmode="numeric" value="${escapeAttr(rascunho.quantidade)}" onfocus="if(this.value==='1')this.value=''" oninput="sincronizarQuantidadePedidoCliente(this.value)" onblur="normalizarQuantidadePedidoCliente()"><button type="button" onclick="ajustarQuantidadePedidoCliente(1)">+</button></div></label><label class="transaction-field"><span>Preço</span><input id="pedidoClientePreco" type="text" inputmode="numeric" value="${numeroParaCampoMoeda(rascunho.preco)}" onfocus="this.select()" oninput="pedidoClienteRascunho.preco=formatarCampoMoeda(this)"></label></div>
        <div class="order-product-action-row">
          <label class="order-bonus-toggle"><input type="checkbox" ${rascunho.bonificado ? 'checked' : ''} onchange="pedidoClienteRascunho.bonificado=this.checked"><span></span><span class="order-bonus-copy"><b>Bonificado</b><small>O item entra no pedido sem valor.</small></span></label>
          <button type="button" class="primary order-insert-item" onclick="inserirItemPedidoCliente()">Inserir item</button>
        </div>` : '<p class="transaction-empty">Cadastre produtos antes de criar um pedido.</p>'}
      </article>
      </div>
      <section class="order-draft-scroll"><div class="order-draft-items"><h3>Itens do pedido</h3>${itensHtml}</div></section>
      <section class="transaction-totals">
        <div><span>Subtotal</span><b id="pedidoClienteSubtotal">${moeda(totais.subtotal)}</b></div>
        <label class="transaction-discount"><span>Desconto <span class="discount-mode"><button type="button" class="${rascunho.descontoTipo !== 'percentual' ? 'active' : ''}" onclick="selecionarTipoDescontoPedido('valor')">R$</button><button type="button" class="${rascunho.descontoTipo === 'percentual' ? 'active' : ''}" onclick="selecionarTipoDescontoPedido('percentual')">%</button></span></span><input id="pedidoClienteDesconto" type="text" inputmode="decimal" value="${rascunho.descontoTipo === 'percentual' ? Number(rascunho.descontoPercentual || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : numeroParaCampoMoeda(totais.desconto)}" onfocus="this.select()" oninput="atualizarDescontoPedidoCliente(this)"><small id="pedidoClienteDescontoCalculado">${rascunho.descontoTipo === 'percentual' ? `${Number(rascunho.descontoPercentual || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% = ${moeda(totais.desconto)}` : 'Informe o valor que será abatido.'}</small></label>
        <div class="total"><span>Total final</span><b id="pedidoClienteTotal">${moeda(totais.total)}</b></div>
      </section>
    </div>
    <footer class="client-transaction-footer ${rascunho.editandoId ? 'order-edit-footer' : ''}">${rascunho.editandoId ? `<button type="button" class="ghost" onclick="cancelarEdicaoPedido('${rascunho.editandoId}')">Cancelar</button><button type="button" class="danger" onclick="confirmarExclusaoPedido('${rascunho.editandoId}')">Excluir</button>` : ''}<button id="finalizarPedidoClienteBotao" type="button" class="primary transaction-confirm-button" onclick="finalizarPedidoCliente()">${rascunho.editandoId ? 'Salvar pedido' : 'Finalizar pedido'} <b id="pedidoClienteBotaoTotal">(${moeda(totais.total)})</b></button></footer>
  `, `sheet-backdrop-centered client-transaction-backdrop order-transaction-backdrop${rascunho.editandoId ? ' order-editing-backdrop' : ''}`);
  if (rascunho.permitirSelecaoCliente && !rascunho.clienteId) focarBuscaClienteLancamento('pedido');
}

function selecionarTipoPedidoCliente(tipo) {
  if (!pedidoClienteRascunho) return;
  pedidoClienteRascunho.tipo = tipo === 'consignado' ? 'consignado' : 'venda';
  mostrarCardPedidoCliente();
}

function selecionarClientePedido(clienteId) {
  if (!pedidoClienteRascunho || !clientesDisponiveisPedido().some((cliente) => cliente.id === clienteId)) return;
  pedidoClienteRascunho.clienteId = clienteId;
}

function contextoBuscaClienteLancamento(tipo) {
  if (tipo === 'pagamento') {
    return {
      rascunho: pagamentoClienteRascunho,
      prefixo: 'pagamentoCliente',
    };
  }
  return {
    rascunho: pedidoClienteRascunho,
    prefixo: 'pedidoCliente',
  };
}

function renderizarOpcoesClienteLancamento(tipo) {
  const contexto = contextoBuscaClienteLancamento(tipo);
  const campo = document.getElementById(`${contexto.prefixo}Busca`);
  const lista = document.getElementById(`${contexto.prefixo}Opcoes`);
  if (!contexto.rascunho || !campo || !lista) return;
  const clientes = clientesFiltradosLancamento(campo.value);
  const limite = 30;
  const clientesVisiveis = clientes.slice(0, limite);
  lista.innerHTML = clientesVisiveis.length
    ? `${clientesVisiveis.map((cliente) => `<button type="button" role="option" data-cliente-id="${escapeAttr(cliente.id)}" class="${cliente.id === contexto.rascunho.clienteId ? 'selected' : ''}" onclick="selecionarClienteLancamento('${tipo}',this.dataset.clienteId)"><span><b>${escapeHtml(cliente.nome)}</b></span></button>`).join('')}${clientes.length > limite ? `<p class="transaction-client-options-status">Mostrando os primeiros ${limite} clientes. Continue digitando para refinar.</p>` : ''}`
    : '<p class="transaction-client-options-empty">Nenhum cliente encontrado.</p>';
}

function abrirBuscaClienteLancamento(tipo) {
  const contexto = contextoBuscaClienteLancamento(tipo);
  const campo = document.getElementById(`${contexto.prefixo}Busca`);
  const lista = document.getElementById(`${contexto.prefixo}Opcoes`);
  if (!campo || !lista) return;
  renderizarOpcoesClienteLancamento(tipo);
  lista.hidden = false;
  campo.setAttribute('aria-expanded', 'true');
  campo.select();
}

function fecharBuscaClienteLancamento(tipo) {
  const contexto = contextoBuscaClienteLancamento(tipo);
  const campo = document.getElementById(`${contexto.prefixo}Busca`);
  const lista = document.getElementById(`${contexto.prefixo}Opcoes`);
  if (lista) lista.hidden = true;
  if (campo) campo.setAttribute('aria-expanded', 'false');
}

function focarBuscaClienteLancamento(tipo) {
  const contexto = contextoBuscaClienteLancamento(tipo);
  const campo = document.getElementById(`${contexto.prefixo}Busca`);
  if (!campo) return;
  campo.focus({ preventScroll: true });
  campo.select();
  abrirBuscaClienteLancamento(tipo);
}

function limparClienteSelecionadoLancamento(tipo) {
  const contexto = contextoBuscaClienteLancamento(tipo);
  if (!contexto.rascunho) return;
  contexto.rascunho.clienteId = '';
  if (tipo !== 'pagamento') return;
  contexto.rascunho.saldoAnterior = 0;
  const divida = document.getElementById('pagamentoClienteDivida');
  const saldoAnterior = document.getElementById('pagamentoClienteSaldoAnterior');
  if (divida) divida.value = moeda(0);
  if (saldoAnterior) saldoAnterior.textContent = moeda(0);
  atualizarResumoPagamentoCliente();
}

function filtrarClientesLancamento(tipo, termo) {
  const contexto = contextoBuscaClienteLancamento(tipo);
  if (!contexto.rascunho) return;
  const clienteSelecionado = state.clientes.find((cliente) => cliente.id === contexto.rascunho.clienteId);
  contexto.rascunho.clienteBusca = termo;
  if (clienteSelecionado && normalizar(termo).trim() !== normalizar(clienteSelecionado.nome).trim()) {
    limparClienteSelecionadoLancamento(tipo);
  }
  renderizarOpcoesClienteLancamento(tipo);
  const campo = document.getElementById(`${contexto.prefixo}Busca`);
  const lista = document.getElementById(`${contexto.prefixo}Opcoes`);
  if (lista) lista.hidden = false;
  if (campo) campo.setAttribute('aria-expanded', 'true');
}

function selecionarClienteLancamento(tipo, clienteId) {
  const contexto = contextoBuscaClienteLancamento(tipo);
  const cliente = clientesDisponiveisPedido().find((item) => item.id === clienteId);
  if (!contexto.rascunho || !cliente) return;
  contexto.rascunho.clienteId = cliente.id;
  contexto.rascunho.clienteBusca = cliente.nome || '';
  const campo = document.getElementById(`${contexto.prefixo}Busca`);
  if (campo) campo.value = cliente.nome || '';
  fecharBuscaClienteLancamento(tipo);
  campo?.blur();
  if (tipo === 'pedido') {
    selecionarClientePedido(cliente.id);
    return;
  }
  selecionarClientePagamento(cliente.id);
}

function renderizarOpcoesProdutoPedidoCliente() {
  const campo = document.getElementById('pedidoClienteProdutoBusca');
  const lista = document.getElementById('pedidoClienteProdutoOpcoes');
  if (!pedidoClienteRascunho || !campo || !lista) return;
  const produtos = produtosFiltradosPedido(campo.value);
  const limite = 30;
  const produtosVisiveis = produtos.slice(0, limite);
  lista.innerHTML = produtosVisiveis.length
    ? `${produtosVisiveis.map((produto) => {
      const detalhes = [produto.sku, produto.marca, produto.categoria].filter(Boolean).join(' · ');
      return `<button type="button" role="option" data-produto-id="${escapeAttr(produto.id)}" class="${produto.id === pedidoClienteRascunho.produtoId ? 'selected' : ''}" onclick="selecionarProdutoPedidoCliente(this.dataset.produtoId)"><span><b>${escapeHtml(produto.nome)}</b>${detalhes ? `<small>${escapeHtml(detalhes)}</small>` : ''}</span><strong>${moeda(produto.preco || 0)}</strong></button>`;
    }).join('')}${produtos.length > limite ? `<p class="order-product-options-status">Mostrando os primeiros ${limite} produtos. Continue digitando para refinar.</p>` : ''}`
    : '<p class="order-product-options-empty">Nenhum produto encontrado.</p>';
}

function abrirBuscaProdutoPedidoCliente() {
  const campo = document.getElementById('pedidoClienteProdutoBusca');
  const lista = document.getElementById('pedidoClienteProdutoOpcoes');
  if (!campo || !lista) return;
  renderizarOpcoesProdutoPedidoCliente();
  lista.hidden = false;
  campo.setAttribute('aria-expanded', 'true');
  campo.select();
}

function fecharBuscaProdutoPedidoCliente() {
  const campo = document.getElementById('pedidoClienteProdutoBusca');
  const lista = document.getElementById('pedidoClienteProdutoOpcoes');
  if (lista) lista.hidden = true;
  if (campo) campo.setAttribute('aria-expanded', 'false');
}

function filtrarProdutosPedidoCliente(termo) {
  if (!pedidoClienteRascunho) return;
  const produtoSelecionado = state.produtos.find((produto) => produto.id === pedidoClienteRascunho.produtoId);
  pedidoClienteRascunho.produtoBusca = termo;
  if (produtoSelecionado && normalizar(termo).trim() !== normalizar(produtoSelecionado.nome).trim()) {
    pedidoClienteRascunho.produtoId = '';
    pedidoClienteRascunho.preco = 0;
    const campoPreco = document.getElementById('pedidoClientePreco');
    if (campoPreco) campoPreco.value = numeroParaCampoMoeda(0);
  }
  renderizarOpcoesProdutoPedidoCliente();
  const lista = document.getElementById('pedidoClienteProdutoOpcoes');
  const campo = document.getElementById('pedidoClienteProdutoBusca');
  if (lista) lista.hidden = false;
  if (campo) campo.setAttribute('aria-expanded', 'true');
}

function selecionarProdutoPedidoCliente(produtoId) {
  if (!pedidoClienteRascunho) return;
  const produto = state.produtos.find((item) => item.id === produtoId);
  if (!produto) return;
  pedidoClienteRascunho.produtoId = produto.id;
  pedidoClienteRascunho.produtoBusca = produto.nome || '';
  pedidoClienteRascunho.preco = Number(produto?.preco || 0);
  const campoProduto = document.getElementById('pedidoClienteProdutoBusca');
  const campoPreco = document.getElementById('pedidoClientePreco');
  if (campoProduto) campoProduto.value = produto.nome || '';
  if (campoPreco) campoPreco.value = numeroParaCampoMoeda(pedidoClienteRascunho.preco);
  fecharBuscaProdutoPedidoCliente();
  campoProduto?.blur();
}

function sincronizarQuantidadePedidoCliente(valorQuantidade) {
  const quantidade = Math.floor(Number(valorQuantidade));
  if (pedidoClienteRascunho && quantidade >= 1) pedidoClienteRascunho.quantidade = quantidade;
}

function normalizarQuantidadePedidoCliente() {
  if (!pedidoClienteRascunho) return;
  const campo = document.getElementById('pedidoClienteQuantidade');
  const quantidade = Math.max(1, Math.floor(Number(campo?.value || pedidoClienteRascunho.quantidade || 1)));
  pedidoClienteRascunho.quantidade = quantidade;
  if (campo) campo.value = String(quantidade);
}

function ajustarQuantidadePedidoCliente(delta) {
  if (!pedidoClienteRascunho) return;
  const campo = document.getElementById('pedidoClienteQuantidade');
  const atual = Math.max(1, Math.floor(Number(campo?.value || pedidoClienteRascunho.quantidade || 1)));
  const quantidade = Math.max(1, atual + Number(delta || 0));
  pedidoClienteRascunho.quantidade = quantidade;
  if (campo) campo.value = String(quantidade);
}

function inserirItemPedidoCliente() {
  if (!pedidoClienteRascunho) return;
  normalizarQuantidadePedidoCliente();
  const produto = state.produtos.find((item) => item.id === pedidoClienteRascunho.produtoId);
  const quantidade = Math.max(1, Number(pedidoClienteRascunho.quantidade || 1));
  const preco = lerCampoMoeda('pedidoClientePreco');
  if (!produto) { toast('Selecione um produto.'); return; }
  if (preco < 0) { toast('Informe um preço válido.'); return; }
  pedidoClienteRascunho.itens.push({ produto_id: produto.id, produto_nome: produto.nome, produto_sku: produto.sku || null, quantidade, preco, preco_custo: Number(produto.preco_custo ?? produto.metadados?.preco_custo ?? 0), bonificado: Boolean(pedidoClienteRascunho.bonificado) });
  pedidoClienteRascunho.produtoId = '';
  pedidoClienteRascunho.produtoBusca = '';
  pedidoClienteRascunho.quantidade = 1;
  pedidoClienteRascunho.preco = 0;
  pedidoClienteRascunho.bonificado = false;
  mostrarCardPedidoCliente();
}

function removerItemPedidoCliente(indice) {
  if (!pedidoClienteRascunho) return;
  pedidoClienteRascunho.itens.splice(indice, 1);
  mostrarCardPedidoCliente();
}

function ajustarItemPedidoCliente(indice, delta) {
  const item = pedidoClienteRascunho?.itens?.[indice];
  if (!item) return;
  item.quantidade = Math.max(1, Number(item.quantidade || 1) + Number(delta || 0));
  const quantidade = document.getElementById(`pedidoItemQuantidade${indice}`);
  const resumo = document.getElementById(`pedidoItemResumo${indice}`);
  const totalItem = document.getElementById(`pedidoItemTotal${indice}`);
  if (quantidade) quantidade.textContent = String(item.quantidade);
  if (resumo) resumo.textContent = `${item.quantidade} × ${moeda(item.preco)}`;
  if (totalItem) totalItem.textContent = item.bonificado ? moeda(0) : moeda(item.quantidade * item.preco);
  atualizarTotaisPedidoClienteNoDom();
}

function selecionarTipoDescontoPedido(tipo) {
  if (!pedidoClienteRascunho) return;
  const totaisAtuais = totaisPedidoClienteRascunho();
  if (tipo === 'percentual') {
    pedidoClienteRascunho.descontoTipo = 'percentual';
    pedidoClienteRascunho.descontoPercentual = totaisAtuais.subtotal > 0 ? Math.min(100, totaisAtuais.desconto / totaisAtuais.subtotal * 100) : 0;
  } else {
    pedidoClienteRascunho.descontoTipo = 'valor';
    pedidoClienteRascunho.desconto = totaisAtuais.desconto;
    pedidoClienteRascunho.descontoPercentual = 0;
  }
  mostrarCardPedidoCliente();
}

function atualizarDescontoPedidoCliente(inputDesconto) {
  if (!pedidoClienteRascunho) return;
  if (pedidoClienteRascunho.descontoTipo === 'percentual') {
    const percentual = Math.max(0, Math.min(100, numeroCampoMoeda(inputDesconto.value)));
    pedidoClienteRascunho.descontoPercentual = percentual;
  } else {
    pedidoClienteRascunho.descontoPercentual = 0;
    pedidoClienteRascunho.desconto = Math.max(0, formatarCampoMoeda(inputDesconto));
  }
  atualizarTotaisPedidoClienteNoDom();
}

function atualizarTotaisPedidoClienteNoDom() {
  if (!pedidoClienteRascunho) return;
  const totais = totaisPedidoClienteRascunho();
  const subtotal = document.getElementById('pedidoClienteSubtotal');
  const total = document.getElementById('pedidoClienteTotal');
  const totalBotao = document.getElementById('pedidoClienteBotaoTotal');
  const descontoCalculado = document.getElementById('pedidoClienteDescontoCalculado');
  if (subtotal) subtotal.textContent = moeda(totais.subtotal);
  if (total) total.textContent = moeda(totais.total);
  if (totalBotao) totalBotao.textContent = `(${moeda(totais.total)})`;
  if (descontoCalculado) descontoCalculado.textContent = pedidoClienteRascunho.descontoTipo === 'percentual' ? `${Number(pedidoClienteRascunho.descontoPercentual || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% = ${moeda(totais.desconto)}` : 'Informe o valor que será abatido.';
}

async function finalizarPedidoCliente() {
  const rascunho = pedidoClienteRascunho;
  if (!state.clientes.some((cliente) => cliente.id === rascunho?.clienteId)) { toast('Selecione o cliente do pedido.'); return; }
  if (!rascunho?.itens.length) { toast('Insira ao menos um item no pedido.'); return; }
  const totais = totaisPedidoClienteRascunho();
  const dataPedido = valor('pedidoClienteData') || rascunho.data;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPedido)) { toast('Informe uma data válida.'); return; }
  let financeiroAnterior;
  try {
    financeiroAnterior = await saldoFinanceiroConfirmadoCliente(rascunho.clienteId, rascunho.editandoId || '');
  } catch (error) {
    toast('Não foi possível confirmar o saldo atual da cliente no servidor. Verifique a conexão e tente novamente.');
    return;
  }
  const saldoLiquidoAnterior = financeiroAnterior.debito - financeiroAnterior.credito;
  const saldoAtual = rascunho.tipo === 'consignado'
    ? financeiroAnterior.debito
    : Math.max(0, saldoLiquidoAnterior + totais.total);
  const custoTotalPedido = rascunho.itens.reduce((soma, item) => {
    const produto = state.produtos.find((registro) => registro.id === item.produto_id);
    return soma + Number(item.quantidade || 0) * Number(item.preco_custo ?? produto?.preco_custo ?? produto?.metadados?.preco_custo ?? 0);
  }, 0);
  const venda = {
    id: rascunho.editandoId || rascunho.idPersistencia || uuidPersistenciaVendas(),
    cliente_id: rascunho.clienteId,
    status: rascunho.status || 'concluida',
    subtotal: totais.subtotal,
    desconto: totais.desconto,
    total: totais.total,
    forma_pagamento: rascunho.tipo === 'consignado' ? 'Consignado' : 'Venda',
    observacoes: JSON.stringify({
      avantalab_pedido: true,
      tipo: rascunho.tipo,
      descricao: rascunho.tipo === 'consignado' ? 'Pedido consignado' : 'Pedido de venda',
      tem_bonificacao: rascunho.itens.some((item) => item.bonificado),
      custo_total: custoTotalPedido,
      desconto_tipo: rascunho.descontoTipo || 'valor',
      desconto_percentual: rascunho.descontoTipo === 'percentual' ? Number(rascunho.descontoPercentual || 0) : 0,
      saldo_anterior: financeiroAnterior.debito,
      saldo_final: saldoAtual,
    }),
    itens: rascunho.itens.map((item) => {
      const produto = state.produtos.find((registro) => registro.id === item.produto_id);
      return { ...item, preco_custo: Number(item.preco_custo ?? produto?.preco_custo ?? produto?.metadados?.preco_custo ?? 0), desconto: item.bonificado ? item.quantidade * item.preco : 0, total: item.bonificado ? 0 : item.quantidade * item.preco };
    }),
    criado_em: new Date(`${dataPedido}T12:00:00`).toISOString(),
  };
  const botaoFinalizar = document.getElementById('finalizarPedidoClienteBotao');
  if (botaoFinalizar) {
    botaoFinalizar.disabled = true;
    botaoFinalizar.classList.add('is-confirming');
    botaoFinalizar.textContent = rascunho.editandoId ? 'Salvando pedido...' : 'Finalizando pedido...';
  }
  iniciarMutacaoDadosVendas();
  try {
    const salvo = backendAtivo
      ? await executarMutacaoGarantidaVendas(
          'pedido_salvar',
          venda.id,
          { novo: !rascunho.editandoId, pedido: venda },
          () => rascunho.editandoId ? window.VendasDb.updateOrder(venda) : window.VendasDb.saveOrder(venda),
        )
      : venda;
    state.vendas = rascunho.editandoId
      ? state.vendas.map((item) => item.id === salvo.id ? salvo : item)
      : [salvo, ...state.vendas];
    if (backendAtivo) {
      await reconciliarFinanceiroCliente(salvo.cliente_id);
      const confirmado = (state.vendas || []).find((item) => item.id === salvo.id);
      if (!confirmado || Number(confirmado.total || 0) !== Number(venda.total || 0)) {
        throw new Error('O pedido foi enviado, mas a conferência financeira não foi concluída.');
      }
    }
    pedidoClienteRascunho = null;
    if (!rascunho.editandoId) {
      limparPesquisaClientesAoEntrar();
      state.aba = 'clientes';
      state.menuAberto = false;
    }
    await confirmarMutacaoDadosVendas();
    await atualizarDashboardAposLancamento();
    render();
    abrirPedidoCliente(salvo.id);
    toast(rascunho.editandoId ? 'Pedido atualizado.' : 'Pedido registrado. O comprovante está pronto para compartilhar.');
  } catch (error) {
    toast(traduzErro(error));
  } finally {
    const botaoAtual = document.getElementById('finalizarPedidoClienteBotao');
    if (botaoAtual) {
      botaoAtual.disabled = false;
      botaoAtual.classList.remove('is-confirming');
      botaoAtual.innerHTML = `${rascunho.editandoId ? 'Salvar pedido' : 'Finalizar pedido'} <b id="pedidoClienteBotaoTotal">(${moeda(totais.total)})</b>`;
    }
    finalizarMutacaoDadosVendas();
  }
}

function abrirEditarPedido(pedidoId) {
  const venda = state.vendas.find((item) => item.id === pedidoId);
  if (!venda) return;
  const metadados = metadadosPedido(venda);
  pedidoClienteRascunho = {
    editandoId: venda.id,
    clienteId: venda.cliente_id,
    permitirSelecaoCliente: false,
    tipo: pedidoEhConsignado(venda) ? 'consignado' : 'venda',
    status: venda.status || 'concluida',
    data: String(venda.criado_em || '').slice(0, 10) || isoData(new Date()),
    produtoId: '',
    produtoBusca: '',
    quantidade: 1,
    preco: 0,
    bonificado: false,
    desconto: Number(venda.desconto || 0),
    descontoTipo: metadados.desconto_tipo === 'percentual' ? 'percentual' : 'valor',
    descontoPercentual: Number(metadados.desconto_percentual || 0),
    itens: (venda.itens || []).map((item) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      produto_sku: item.produto_sku || null,
      quantidade: Number(item.quantidade || 1),
      preco: Number(item.preco ?? item.preco_unitario ?? 0),
      preco_custo: item.preco_custo == null ? null : Number(item.preco_custo),
      bonificado: itemPedidoBonificado(item),
    })),
  };
  mostrarCardPedidoCliente();
}

function cancelarEdicaoPedido(pedidoId) {
  pedidoClienteRascunho = null;
  abrirPedidoCliente(pedidoId);
}

function abrirPagamentoCliente(clienteId) {
  abrirPagamentoClienteComSelecao(clienteId, false);
}

function focarValorPagamentoCliente() {
  const campoValorPago = document.getElementById('pagamentoClienteValor');
  if (!campoValorPago || !document.getElementById('sheetBackdrop')?.contains(campoValorPago)) return;
  campoValorPago.focus({ preventScroll: true });
  campoValorPago.select();
}

function abrirNovoPagamentoGeral() {
  if (!clientesDisponiveisPedido().length) { fecharSheet(); toast('Cadastre um cliente antes de registrar um pagamento.'); return; }
  abrirPagamentoClienteComSelecao('', true);
}

function abrirPagamentoClienteComSelecao(clienteId, permitirSelecao = false) {
  const cliente = state.clientes.find((item) => item.id === clienteId) || (permitirSelecao ? clientesDisponiveisPedido()[0] : null);
  if (!cliente) return;
  const clienteSelecionadoId = permitirSelecao ? '' : clienteId;
  const saldo = clienteSelecionadoId ? saldoFinanceiroCliente(clienteSelecionadoId) : { debito: 0 };
  pagamentoClienteRascunho = { idPersistencia: uuidPersistenciaVendas(), clienteId: clienteSelecionadoId, clienteBusca: '', saldoAnterior: saldo.debito, permitirSelecaoCliente: Boolean(permitirSelecao) };
  sheet(`
    <div class="sheet-header"><div><h2>Registrar pagamento</h2><p class="muted small">${permitirSelecao ? 'Selecione o cliente' : escapeHtml(cliente.nome)}</p></div><button type="button" class="close" onclick="fecharSheet(event)">×</button></div>
    <div class="client-transaction-scroll payment-entry-form">
      ${permitirSelecao ? campoBuscaClienteLancamento('pagamento', '', '') : ''}
      <label class="transaction-field"><span>Valor pago</span><input id="pagamentoClienteValor" type="text" inputmode="numeric" value="0,00" onfocus="this.select()" oninput="formatarCampoMoeda(this);atualizarResumoPagamentoCliente()"></label>
      <label class="transaction-field"><span>Valor total da dívida</span><input id="pagamentoClienteDivida" value="${escapeAttr(moeda(saldo.debito))}" readonly></label>
      <label class="transaction-field"><span>Desconto</span><input id="pagamentoClienteDesconto" type="text" inputmode="numeric" value="0,00" onfocus="this.select()" oninput="formatarCampoMoeda(this);atualizarResumoPagamentoCliente()"></label>
      <section class="payment-balance-summary"><div><span>Saldo anterior</span><b id="pagamentoClienteSaldoAnterior">${moeda(saldo.debito)}</b></div><div><span>Valor pago + desconto</span><b id="pagamentoClienteAbatimento">${moeda(0)}</b></div><div class="final"><span>Saldo final</span><b id="pagamentoClienteSaldoFinal">${moeda(saldo.debito)}</b></div></section>
      ${campoDataCentralizado('pagamentoClienteData', isoData(new Date()), 'Data do pagamento')}
      <label class="transaction-field"><span>Forma de pagamento</span><select id="pagamentoClienteForma"><option selected>Pix</option><option>Dinheiro</option><option>Cartão de crédito</option><option>Cartão de débito</option><option>Cheque</option><option>Boleto</option></select></label>
    </div>
    <footer class="client-transaction-footer"><button id="confirmarPagamentoClienteBotao" type="button" class="primary transaction-confirm-button" onclick="confirmarPagamentoCliente()">Confirmar recebimento</button></footer>
  `, 'sheet-backdrop-centered client-transaction-backdrop payment-transaction-backdrop');
  if (permitirSelecao) {
    focarBuscaClienteLancamento('pagamento');
  } else {
    focarValorPagamentoCliente();
  }
}

function selecionarClientePagamento(clienteId) {
  if (!pagamentoClienteRascunho) return;
  const cliente = clientesDisponiveisPedido().find((item) => item.id === clienteId);
  if (!cliente) return;
  const saldo = saldoFinanceiroCliente(cliente.id);
  pagamentoClienteRascunho.clienteId = cliente.id;
  pagamentoClienteRascunho.clienteBusca = cliente.nome || '';
  pagamentoClienteRascunho.saldoAnterior = saldo.debito;
  const divida = document.getElementById('pagamentoClienteDivida');
  const saldoAnterior = document.getElementById('pagamentoClienteSaldoAnterior');
  if (divida) divida.value = moeda(saldo.debito);
  if (saldoAnterior) saldoAnterior.textContent = moeda(saldo.debito);
  atualizarResumoPagamentoCliente();
  focarValorPagamentoCliente();
}

function resumoPagamentoCliente() {
  const saldoAnterior = Number(pagamentoClienteRascunho?.saldoAnterior || 0);
  const valorPago = Math.max(0, lerCampoMoeda('pagamentoClienteValor'));
  const desconto = Math.max(0, lerCampoMoeda('pagamentoClienteDesconto'));
  return { saldoAnterior, valorPago, desconto, abatimento: valorPago + desconto, saldoFinal: Math.max(0, saldoAnterior - valorPago - desconto) };
}

function atualizarResumoPagamentoCliente() {
  const resumo = resumoPagamentoCliente();
  const abatimento = document.getElementById('pagamentoClienteAbatimento');
  const saldoFinal = document.getElementById('pagamentoClienteSaldoFinal');
  if (abatimento) abatimento.textContent = moeda(resumo.abatimento);
  if (saldoFinal) saldoFinal.textContent = moeda(resumo.saldoFinal);
}

async function confirmarPagamentoCliente() {
  const rascunho = pagamentoClienteRascunho;
  if (!rascunho || pagamentoClienteSalvando) return;
  if (!state.clientes.some((cliente) => cliente.id === rascunho.clienteId)) { toast('Selecione o cliente do pagamento.'); return; }
  let resumo = resumoPagamentoCliente();
  const dataPagamento = valor('pagamentoClienteData');
  if (resumo.abatimento <= 0) { toast('Informe o valor pago ou o desconto.'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) { toast('Informe uma data válida.'); return; }
  try {
    const saldoConfirmado = await saldoFinanceiroConfirmadoCliente(rascunho.clienteId);
    rascunho.saldoAnterior = saldoConfirmado.debito;
    resumo = resumoPagamentoCliente();
  } catch (error) {
    toast('Não foi possível confirmar o saldo atual da cliente no servidor. Verifique a conexão e tente novamente.');
    return;
  }
  const pagamento = {
    id: rascunho.idPersistencia || uuidPersistenciaVendas(),
    cliente_id: rascunho.clienteId,
    valor: resumo.valorPago,
    desconto: resumo.desconto,
    saldo_anterior: resumo.saldoAnterior,
    saldo_final: resumo.saldoFinal,
    data_pagamento: dataPagamento,
    forma_pagamento: valor('pagamentoClienteForma') || 'Pix',
    criado_em: new Date().toISOString(),
  };
  pagamentoClienteSalvando = true;
  const botaoConfirmar = document.getElementById('confirmarPagamentoClienteBotao');
  if (botaoConfirmar) {
    botaoConfirmar.disabled = true;
    botaoConfirmar.classList.add('is-confirming');
    botaoConfirmar.textContent = 'Confirmando recebimento...';
  }
  iniciarMutacaoDadosVendas();
  try {
    const salvo = backendAtivo
      ? await executarMutacaoGarantidaVendas('pagamento_salvar', pagamento.id, pagamento, () => window.VendasDb.savePayment(pagamento))
      : pagamento;
    state.pagamentos = atualizarRegistroPersistido(state.pagamentos, salvo);
    if (backendAtivo) {
      await reconciliarFinanceiroCliente(pagamento.cliente_id);
      const confirmado = (state.pagamentos || []).find((item) => item.id === salvo.id);
      if (!confirmado || Number(confirmado.valor || 0) !== Number(pagamento.valor || 0)) {
        throw new Error('O pagamento foi enviado, mas a conferência do saldo não foi concluída.');
      }
    }
    pagamentoClienteRascunho = null;
    limparPesquisaClientesAoEntrar();
    state.aba = 'clientes';
    state.menuAberto = false;
    await confirmarMutacaoDadosVendas();
    await atualizarDashboardAposLancamento();
    render();
    abrirPagamentoClienteDetalhe(salvo.id);
    toast('Recebimento confirmado. Saldo conferido com o servidor.');
  } catch (error) {
    toast(traduzErro(error));
  } finally {
    pagamentoClienteSalvando = false;
    const botaoAtual = document.getElementById('confirmarPagamentoClienteBotao');
    if (botaoAtual) {
      botaoAtual.disabled = false;
      botaoAtual.classList.remove('is-confirming');
      botaoAtual.textContent = 'Confirmar recebimento';
    }
    finalizarMutacaoDadosVendas();
  }
}

function listaPagamentosPaginaHtml(clienteId, pagina = 0) {
  const pagamentos = pagamentosDoCliente(clienteId);
  const limite = (pagina + 1) * ITENS_POR_LOTE_HISTORICO;
  const itens = pagamentos.slice(0, limite);
  if (!itens.length) return '<div class="payment-client-empty">Nenhum pagamento registrado para este cliente.</div>';
  const quantidadeProximoLote = Math.min(ITENS_POR_LOTE_HISTORICO, pagamentos.length - limite);
  return `<p class="history-visible-count">Exibindo ${itens.length} de ${pagamentos.length} pagamentos</p><div class="payment-client-list">${itens.map((pagamento) => `<button type="button" onclick="abrirEditarPagamentoCliente('${pagamento.id}', ${pagina})"><span><b>${dataBR(`${pagamento.data_pagamento}T12:00:00`)}</b><small>${escapeHtml(pagamento.forma_pagamento || 'Não informado')}${Number(pagamento.desconto || 0) > 0 ? ` · desconto ${moeda(pagamento.desconto)}` : ''}</small></span><strong>${moeda(pagamento.valor)}</strong>${svgIcon('chevron-right')}</button>`).join('')}</div>${pagamentos.length > limite ? `<button type="button" class="ghost payment-client-more" onclick="carregarMaisPagamentosCliente('${clienteId}', ${pagina})">Carregar mais ${quantidadeProximoLote} pagamentos</button>` : ''}`;
}

function abrirPagamentosCliente(clienteId, pagina = 0, rolagemConteudo = null) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  const pagamentos = pagamentosDoCliente(clienteId);
  sheet(`<div class="sheet-header"><div><h2>Pagamentos</h2><p class="muted small">${escapeHtml(cliente.nome)} · ${pagamentos.length} registro${pagamentos.length === 1 ? '' : 's'}</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="payment-client-history">${listaPagamentosPaginaHtml(clienteId, pagina)}</div>`, 'sheet-backdrop-centered payment-history-backdrop');
  if (Number.isFinite(rolagemConteudo)) {
    requestAnimationFrame(() => {
      const painel = document.querySelector('.payment-client-history');
      if (painel) painel.scrollTop = Number(rolagemConteudo);
    });
  }
}

function carregarMaisPagamentosCliente(clienteId, paginaAtual = 0) {
  const painel = document.querySelector('.payment-client-history');
  abrirPagamentosCliente(clienteId, Number(paginaAtual) + 1, painel?.scrollTop || 0);
}

function saldoClienteComPagamentoAlterado(pagamento, novoValor) {
  const totalDebitos = pedidosDoCliente(pagamento.cliente_id)
    .filter((venda) => venda.status !== 'cancelada' && pedidoGeraDebito(venda))
    .reduce((soma, venda) => soma + Number(venda.total || 0), 0);
  const abatimentos = (state.pagamentos || [])
    .filter((item) => item.cliente_id === pagamento.cliente_id && item.id !== pagamento.id)
    .reduce((soma, item) => soma + Number(item.valor || 0) + Number(item.desconto || 0), 0);
  const totalAtualizado = abatimentos + Number(novoValor || 0) + Number(pagamento.desconto || 0);
  return {
    debito: Math.max(0, totalDebitos - totalAtualizado),
    credito: Math.max(0, totalAtualizado - totalDebitos),
  };
}

function abrirEditarPagamentoCliente(pagamentoId, pagina = 0, retornoClienteId = '', retornoAba = '') {
  const pagamento = (state.pagamentos || []).find((item) => item.id === pagamentoId);
  if (!pagamento) return;
  const cliente = state.clientes.find((item) => item.id === pagamento.cliente_id);
  const saldoAtual = saldoFinanceiroCliente(pagamento.cliente_id);
  const valorFormatado = Number(pagamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  sheet(`
    <div class="sheet-header"><div><h2>Editar pagamento</h2><p class="muted small">${escapeHtml(cliente?.nome || 'Cliente não informado')}</p></div><button class="close" onclick="voltarEdicaoPagamento('${pagamento.cliente_id}', ${pagina}, '${retornoClienteId}', '${retornoAba}')">×</button></div>
    <div class="payment-edit-form">
      <label class="transaction-field"><span>Valor pago</span><input id="editarPagamentoValor" type="text" inputmode="numeric" value="${escapeAttr(valorFormatado)}" onfocus="this.select()" oninput="formatarCampoMoeda(this);atualizarResumoEdicaoPagamento('${pagamentoId}')"></label>
      ${campoDataCentralizado('editarPagamentoData', pagamento.data_pagamento || isoData(new Date()), 'Data do pagamento')}
      <section class="payment-edit-summary"><div><span>Saldo atual</span><b>${moeda(saldoAtual.debito)}</b></div><div><span>Crédito atual</span><b>${moeda(saldoAtual.credito)}</b></div><div class="final"><span>Novo saldo</span><b id="editarPagamentoNovoSaldo">${moeda(saldoAtual.debito)}</b></div><div><span>Novo crédito</span><b id="editarPagamentoNovoCredito">${moeda(saldoAtual.credito)}</b></div></section>
      <p class="payment-edit-note">O desconto e a forma de pagamento permanecem inalterados.</p>
    </div>
    <footer class="payment-edit-footer"><button type="button" class="ghost" onclick="voltarEdicaoPagamento('${pagamento.cliente_id}', ${pagina}, '${retornoClienteId}', '${retornoAba}')">Cancelar</button><button type="button" class="danger" onclick="abrirConfirmacaoExcluirPagamento('${pagamentoId}', ${pagina}, '${retornoClienteId}', '${retornoAba}')">Excluir</button><button type="button" class="primary" onclick="salvarEdicaoPagamentoCliente('${pagamentoId}', ${pagina}, '${retornoClienteId}', '${retornoAba}')">Salvar</button></footer>
  `, 'sheet-backdrop-centered payment-edit-backdrop');
}

function voltarEdicaoPagamento(clienteId, pagina, retornoClienteId = '', retornoAba = '') {
  if (retornoClienteId && retornoAba) { abrirDetalhesCliente(retornoClienteId, retornoAba, pagina); return; }
  abrirPagamentosCliente(clienteId, pagina);
}

function atualizarResumoEdicaoPagamento(pagamentoId) {
  const pagamento = (state.pagamentos || []).find((item) => item.id === pagamentoId);
  if (!pagamento) return;
  const saldo = saldoClienteComPagamentoAlterado(pagamento, Math.max(0, lerCampoMoeda('editarPagamentoValor')));
  const saldoEl = document.getElementById('editarPagamentoNovoSaldo');
  const creditoEl = document.getElementById('editarPagamentoNovoCredito');
  if (saldoEl) saldoEl.textContent = moeda(saldo.debito);
  if (creditoEl) creditoEl.textContent = moeda(saldo.credito);
}

async function salvarEdicaoPagamentoCliente(pagamentoId, pagina = 0, retornoClienteId = '', retornoAba = '') {
  const pagamentoAtual = (state.pagamentos || []).find((item) => item.id === pagamentoId);
  if (!pagamentoAtual) return;
  const valorAtualizado = Math.max(0, lerCampoMoeda('editarPagamentoValor'));
  const dataAtualizada = valor('editarPagamentoData');
  if (valorAtualizado <= 0) { toast('Informe um valor de pagamento maior que zero.'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAtualizada)) { toast('Informe uma data válida.'); return; }
  const candidato = { ...pagamentoAtual, valor: valorAtualizado, data_pagamento: dataAtualizada };
  const resumo = resumoFinanceiroParaConfirmarPagamento(candidato);
  candidato.saldo_anterior = resumo.saldoAnterior;
  candidato.saldo_final = resumo.saldoAtual;
  iniciarMutacaoDadosVendas();
  try {
    const salvo = backendAtivo
      ? await executarMutacaoGarantidaVendas('pagamento_atualizar', candidato.id, candidato, () => window.VendasDb.updatePayment(candidato))
      : candidato;
    state.pagamentos = (state.pagamentos || []).map((item) => item.id === pagamentoId ? { ...item, ...salvo } : item);
    await confirmarMutacaoDadosVendas();
    render();
    voltarEdicaoPagamento(pagamentoAtual.cliente_id, pagina, retornoClienteId, retornoAba);
    toast('Pagamento atualizado e saldos recalculados.');
  } catch (error) {
    toast(traduzErro(error));
  } finally {
    finalizarMutacaoDadosVendas();
  }
}

function abrirConfirmacaoExcluirPagamento(pagamentoId, pagina = 0, retornoClienteId = '', retornoAba = '', origem = 'edicao') {
  const pagamento = (state.pagamentos || []).find((item) => item.id === pagamentoId);
  if (!pagamento) return;
  const cliente = state.clientes.find((item) => item.id === pagamento.cliente_id);
  const acaoVoltar = origem === 'detalhe'
    ? `abrirPagamentoClienteDetalhe('${pagamentoId}','${retornoClienteId}','${retornoAba}',${pagina})`
    : `abrirEditarPagamentoCliente('${pagamentoId}',${pagina},'${retornoClienteId}','${retornoAba}')`;
  sheet(`<div class="sheet-header"><div><h2>Excluir pagamento?</h2><p class="muted small">Esta ação atualizará os saldos do cliente.</p></div><button class="close" onclick="${acaoVoltar}">×</button></div><div class="payment-delete-confirm"><p>Confirma a exclusão do pagamento de <b>${moeda(pagamento.valor)}</b> feito por <b>${escapeHtml(cliente?.nome || 'Cliente não informado')}</b> em ${dataBR(`${pagamento.data_pagamento}T12:00:00`)}?</p><button type="button" class="danger" onclick="excluirPagamentoCliente('${pagamentoId}','${retornoClienteId}','${retornoAba}',${pagina})">Sim, excluir pagamento</button><button type="button" class="ghost" onclick="${acaoVoltar}">Cancelar</button></div>`, 'sheet-backdrop-centered payment-delete-backdrop');
}

async function excluirPagamentoCliente(pagamentoId, retornoClienteId = '', retornoAba = '', retornoPagina = 0) {
  const pagamento = (state.pagamentos || []).find((item) => item.id === pagamentoId);
  if (!pagamento) return;
  iniciarMutacaoDadosVendas();
  try {
    if (backendAtivo) {
      await executarMutacaoGarantidaVendas('pagamento_excluir', pagamentoId, { id: pagamentoId }, () => window.VendasDb.deletePayment(pagamentoId));
    }
    state.pagamentos = (state.pagamentos || []).filter((item) => item.id !== pagamentoId);
    await confirmarMutacaoDadosVendas();
    fecharSheet();
    render();
    if (retornoClienteId && retornoAba) abrirDetalhesCliente(retornoClienteId, retornoAba, Number(retornoPagina) || 0);
    toast('Pagamento excluído e saldos recalculados.');
  } catch (error) {
    toast(traduzErro(error));
  } finally {
    finalizarMutacaoDadosVendas();
  }
}

function telefoneCliente(clienteId) {
  return String(state.clientes.find((cliente) => cliente.id === clienteId)?.telefone || '').replace(/\D/g, '');
}

function ligarCliente(clienteId) {
  const telefone = telefoneCliente(clienteId);
  if (!telefone) { toast('Este cliente não possui telefone cadastrado.'); return; }
  window.location.href = `tel:+${telefone}`;
}

function abrirWhatsappCliente(clienteId) {
  const telefone = telefoneCliente(clienteId);
  if (!telefone) { toast('Este cliente não possui telefone cadastrado.'); return; }
  salvarEstado();
  const emCelular = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (emCelular) {
    window.location.href = `whatsapp://send?phone=${telefone}`;
    return;
  }
  window.open(`https://web.whatsapp.com/send?phone=${telefone}`, '_blank', 'noopener,noreferrer');
}

function abrirMapasCliente(clienteId) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  const enderecoPrincipal = enderecoPrincipalCliente(cliente);
  if (!enderecoPrincipal) return;
  const endereco = [enderecoPrincipal, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado, cliente.cep].filter(Boolean).join(', ');
  const destino = encodeURIComponent(endereco);
  sheet(`<div class="sheet-header"><div><h2>Abrir endereço</h2><p class="muted small">Escolha o aplicativo de mapas.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="maps-option-list"><a href="https://www.google.com/maps/search/?api=1&query=${destino}" target="_blank" rel="noopener">Google Maps</a><a href="https://maps.apple.com/?q=${destino}" target="_blank" rel="noopener">Mapas Apple</a><a href="https://waze.com/ul?q=${destino}&navigate=yes" target="_blank" rel="noopener">Waze</a></div>`, 'sheet-backdrop-centered');
}

function iconeAcaoCliente(tipo) {
  const base = 'class="svg-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"';
  if (tipo === 'editar') return `<svg ${base}><path d="m4 20 4.2-1 9.7-9.7a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m13.5 7.5 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  return `<svg ${base}><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2"/><path d="M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function abrirMenuCliente(clienteId) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  const acaoStatus = cliente.ativo === false ? 'Ativar cliente' : 'Desativar cliente';
  sheet(`<div class="sheet-header"><div><h2>${escapeHtml(cliente.nome)}</h2><p class="muted small">Opções do cliente</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="client-option-list"><button class="primary" onclick="abrirAgendamentoCliente('${clienteId}')">${svgIcon('calendar')} Agendar</button><button class="secondary" onclick="fecharSheet();abrirCliente('${clienteId}')">${iconeAcaoCliente('editar')} Editar</button><button class="danger" onclick="alterarStatusCliente('${clienteId}', ${cliente.ativo === false})">${iconeAcaoCliente('desativar')} ${acaoStatus}</button></div>`, 'sheet-backdrop-centered');
}

function abrirAgendamentoCliente(clienteId) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  fecharSheet();
  state.agendaClientePreselecionado = cliente.nome || '';
  state.agendaDataFormulario = isoData(new Date());
  state.agendaFormAberto = true;
  render();
}

async function alterarStatusCliente(clienteId, ativar) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  iniciarMutacaoDadosVendas();
  try {
    const dados = { ...cliente, ativo: Boolean(ativar) };
    const salvo = backendAtivo
      ? await executarMutacaoGarantidaVendas('cliente_salvar', dados.id, dados, () => window.VendasDb.saveClient(dados))
      : dados;
    state.clientes = state.clientes.map((item) => item.id === clienteId ? salvo : item);
    await confirmarMutacaoDadosVendas();
    fecharSheet(); render(); toast(ativar ? 'Cliente ativado.' : 'Cliente desativado.');
  } catch (error) {
    toast(traduzErro(error));
  } finally {
    finalizarMutacaoDadosVendas();
  }
}

function pedidosDoCliente(clienteId) {
  return state.vendas.filter((venda) => venda.cliente_id === clienteId).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
}

function pedidoEhConsignado(venda) {
  return normalizar(venda.forma_pagamento).includes('consign');
}

function listaPedidosClienteHtml(pedidos, pagina, vazio, aba) {
  const limite = (pagina + 1) * ITENS_POR_LOTE_HISTORICO;
  const itens = pedidos.slice(0, limite);
  if (!itens.length) return `<div class="client-report-empty">${escapeHtml(vazio)}</div>`;
  const tipo = aba === 'consignado' ? 'consignados' : 'pedidos';
  const quantidadeProximoLote = Math.min(ITENS_POR_LOTE_HISTORICO, pedidos.length - limite);
  return `<p class="history-visible-count">Exibindo ${itens.length} de ${pedidos.length} ${tipo}</p><div class="client-report-list">${itens.map((venda) => `<button type="button" class="client-report-row" onclick="abrirPedidoCliente('${venda.id}','${venda.cliente_id}','${aba}',${pagina})"><span><b>${dataBR(venda.criado_em)}</b><small>${escapeHtml(venda.forma_pagamento || 'Não informado')} · ${(venda.itens || []).length} itens</small></span><strong>${moeda(venda.total)}</strong></button>`).join('')}</div>${pedidos.length > limite ? `<button class="ghost client-load-more" onclick="carregarMaisDetalhesCliente('${pedidos[0].cliente_id}', '${aba}', ${pagina})">Carregar mais ${quantidadeProximoLote} ${tipo}</button>` : ''}`;
}

function listaPagamentosClienteHtml(pagamentos, pagina) {
  const limite = (pagina + 1) * ITENS_POR_LOTE_HISTORICO;
  const itens = pagamentos.slice(0, limite);
  if (!itens.length) return '<div class="client-report-empty">Nenhum pagamento registrado.</div>';
  const quantidadeProximoLote = Math.min(ITENS_POR_LOTE_HISTORICO, pagamentos.length - limite);
  return `<p class="history-visible-count">Exibindo ${itens.length} de ${pagamentos.length} pagamentos</p><div class="client-report-list">${itens.map((pagamento) => `<button type="button" class="client-report-row" onclick="abrirPagamentoClienteDetalhe('${pagamento.id}','${pagamento.cliente_id}','pagamentos',${pagina})"><span><b>${dataBR(`${pagamento.data_pagamento}T12:00:00`)}</b><small>${escapeHtml(pagamento.forma_pagamento || 'Não informado')}${Number(pagamento.desconto || 0) > 0 ? ` · desconto ${moeda(pagamento.desconto)}` : ''}</small></span><strong>${moeda(pagamento.valor)}</strong></button>`).join('')}</div>${pagamentos.length > limite ? `<button class="ghost client-load-more" onclick="carregarMaisDetalhesCliente('${pagamentos[0].cliente_id}', 'pagamentos', ${pagina})">Carregar mais ${quantidadeProximoLote} pagamentos</button>` : ''}`;
}

function abrirDetalhesCliente(clienteId, aba = 'resumo', pagina = 0, rolagemConteudo = null) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  window.currentClientDetailTab = aba;
  const todosPedidos = pedidosDoCliente(clienteId);
  const consignados = todosPedidos.filter((venda) => venda.status !== 'cancelada' && pedidoEhConsignado(venda));
  const pedidos = todosPedidos.filter((venda) => !pedidoEhConsignado(venda));
  const pagamentos = pagamentosDoCliente(clienteId);
  const saldo = saldoFinanceiroCliente(clienteId);
  const totalComprado = pedidos.filter((venda) => venda.status !== 'cancelada' && !pedidoSomenteBonificado(venda)).reduce((soma, venda) => soma + Number(venda.total || 0), 0);
  const conteudo = aba === 'resumo'
    ? `<div class="client-summary-grid"><div><small>Débito pendente</small><b>${moeda(saldo.debito)}</b></div><div><small>Consignação</small><b>${moeda(saldo.consignado)}</b></div><div><small>Crédito</small><b>${moeda(saldo.credito)}</b></div><div><small>Total comprado</small><b>${moeda(totalComprado)}</b></div></div>`
    : aba === 'consignado'
      ? listaPedidosClienteHtml(consignados, pagina, 'Nenhum pedido consignado ativo.', 'consignado')
      : aba === 'pedidos'
        ? listaPedidosClienteHtml(pedidos, pagina, 'Nenhum pedido registrado.', 'pedidos')
        : listaPagamentosClienteHtml(pagamentos, pagina);
  sheet(`<div class="sheet-header"><div><h2>${escapeHtml(cliente.nome)}</h2><p class="muted small">Histórico do cliente</p></div><button class="close" onclick="fecharSheet()">×</button></div><nav class="client-detail-tabs"><button class="${aba === 'resumo' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','resumo')">Resumo</button><button class="${aba === 'consignado' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','consignado')">Consignado</button><button class="${aba === 'pedidos' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','pedidos')">Pedidos</button><button class="${aba === 'pagamentos' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','pagamentos')">Pagamentos</button></nav><div class="client-detail-content">${conteudo}</div>`, 'client-detail-backdrop sheet-backdrop-centered');
  if (Number.isFinite(rolagemConteudo)) {
    requestAnimationFrame(() => {
      const painel = document.querySelector('.client-detail-content');
      if (painel) painel.scrollTop = Number(rolagemConteudo);
    });
  }
}

function carregarMaisDetalhesCliente(clienteId, aba, paginaAtual = 0) {
  const painel = document.querySelector('.client-detail-content');
  abrirDetalhesCliente(clienteId, aba, Number(paginaAtual) + 1, painel?.scrollTop || 0);
}

function voltarParaDetalhesCliente(clienteId = '', aba = '', pagina = 0) {
  if (clienteId && aba) { abrirDetalhesCliente(clienteId, aba, Number(pagina) || 0); return; }
  fecharSheet();
}

function abrirPagamentoClienteDetalhe(pagamentoId, retornoClienteId = '', retornoAba = '', retornoPagina = 0) {
  const pagamento = (state.pagamentos || []).find((item) => item.id === pagamentoId);
  if (!pagamento) return;
  const cliente = state.clientes.find((item) => item.id === pagamento.cliente_id);
  const resumo = resumoComprovantePagamento(pagamento);
  const descontoHtml = Number(pagamento.desconto || 0) > 0 ? `<div><span>Desconto</span><b>${moeda(pagamento.desconto)}</b></div>` : '';
  sheet(`<div class="sheet-header"><div><h2>Comprovante de pagamento</h2><p class="muted small">Cliente: ${escapeHtml(cliente?.nome || 'não informado')} · ${dataComprovante(pagamento.data_pagamento)}</p></div><button class="close" onclick="voltarParaDetalhesCliente('${retornoClienteId}','${retornoAba}',${retornoPagina})">×</button></div><section class="payment-detail-summary receipt-detail-summary"><div><span>Saldo anterior</span><b>${moeda(resumo.saldoAnterior)}</b></div><div><span>Forma de pagamento</span><b>${escapeHtml(pagamento.forma_pagamento || 'Não informado')}</b></div>${descontoHtml}<div class="payment-paid-highlight"><span>Valor pago</span><b>${moeda(pagamento.valor)}</b></div><div class="receipt-current-balance"><span>Saldo atual</span><b>${moeda(resumo.saldoAtual)}</b></div></section><footer class="order-view-actions"><button type="button" class="ghost" onclick="voltarParaDetalhesCliente('${retornoClienteId}','${retornoAba}',${retornoPagina})">Fechar</button><button type="button" class="danger" onclick="abrirConfirmacaoExcluirPagamento('${pagamentoId}',${retornoPagina},'${retornoClienteId}','${retornoAba}','detalhe')">Excluir</button><button type="button" class="secondary" onclick="abrirEditarPagamentoCliente('${pagamentoId}',${retornoPagina},'${retornoClienteId}','${retornoAba}')">Editar</button></footer><button class="primary order-share" onclick="compartilharPagamento('${pagamentoId}')">${svgIcon('save')} Compartilhar comprovante</button>`, 'sheet-backdrop-centered receipt-view-backdrop');
}

function abrirPedidoCliente(pedidoId, retornoClienteId = '', retornoAba = '', retornoPagina = 0) {
  const venda = state.vendas.find((item) => item.id === pedidoId);
  if (!venda) return;
  if (pedidoEhConsignado(venda)) {
    abrirConsignadoCliente(venda, retornoClienteId, retornoAba, retornoPagina);
    return;
  }
  const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
  const resumo = resumoComprovantePedido(venda);
  const itensHtml = (venda.itens || []).map((item, indice) => {
    const preco = Number(item.preco ?? item.preco_unitario ?? 0);
    const bonificado = itemPedidoBonificado(item);
    const totalItem = bonificado ? 0 : Number(item.total ?? Number(item.quantidade || 0) * preco);
    return `<div class="receipt-order-row ${bonificado ? 'is-bonus' : ''}"><div class="receipt-order-product"><b>${escapeHtml(item.produto_nome)}</b>${bonificado ? '<em>Bonificado</em>' : ''}</div><span class="receipt-order-quantity">${Number(item.quantidade || 0)}</span><span class="receipt-order-price">${bonificado ? '—' : moeda(preco)}</span><strong class="receipt-order-total">${moeda(totalItem)}</strong></div>`;
  }).join('') || '<p class="muted">Sem itens registrados.</p>';
  sheet(`<div class="sheet-header"><div><h2>Comprovante de pedido</h2><p class="muted small">Cliente: ${escapeHtml(cliente?.nome || 'não informado')} · ${dataComprovante(venda.criado_em)}</p></div><button class="close" onclick="voltarParaDetalhesCliente('${retornoClienteId}','${retornoAba}',${retornoPagina})">×</button></div><section class="order-view-items receipt-order-table"><header><span>Produto</span><span>Qtd</span><span>Preço</span><span>Total</span></header><div class="receipt-order-scroll">${itensHtml}</div></section><div class="receipt-order-footer"><section class="receipt-balance-summary"><div><span>Saldo anterior</span><b>${moeda(resumo.saldoAnterior)}</b></div><div><span>Pedido</span><b>${moeda(venda.total)}</b></div><div class="receipt-current-balance"><span>Saldo atual</span><b>${moeda(resumo.saldoAtual)}</b></div></section><footer class="order-view-actions"><button type="button" class="ghost" onclick="voltarParaDetalhesCliente('${retornoClienteId}','${retornoAba}',${retornoPagina})">Fechar</button><button type="button" class="danger" onclick="confirmarExclusaoPedido('${pedidoId}','${retornoClienteId}','${retornoAba}',${retornoPagina})">Excluir</button><button type="button" class="secondary" onclick="abrirEditarPedido('${pedidoId}')">Editar</button></footer><button class="primary order-share" onclick="compartilharPedido('${pedidoId}')">${svgIcon('save')} Compartilhar comprovante</button></div>`, 'sheet-backdrop-centered receipt-view-backdrop order-view-backdrop');
}

function abrirConsignadoCliente(venda, retornoClienteId = '', retornoAba = '', retornoPagina = 0) {
  const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
  const itensHtml = (venda.itens || []).map((item) => `
    <div class="consignment-product-row">
      <b>${escapeHtml(item.produto_nome)}</b>
      <strong>${Number(item.quantidade || 0)}</strong>
    </div>
  `).join('') || '<p class="transaction-empty">Nenhum produto em consignação.</p>';
  const possuiItensDisponiveis = (venda.itens || []).some((item) => Number(item.quantidade || 0) > 0);
  sheet(`
    <div class="sheet-header">
      <div><h2>Pedido Consignado</h2><p class="muted small">Cliente: ${escapeHtml(cliente?.nome || 'não informado')} · ${dataComprovante(venda.criado_em)}</p></div>
      <button class="close" onclick="voltarParaDetalhesCliente('${retornoClienteId}','${retornoAba}',${retornoPagina})">×</button>
    </div>
    <div class="consignment-view-layout">
      <section class="consignment-product-table">
        <header><span>Produto</span><span>Quantidade</span></header>
        <div class="consignment-product-scroll">${itensHtml}</div>
      </section>
      <section class="consignment-fixed-summary">
        <div><span>Total em consignação</span><b>${moeda(venda.total)}</b></div>
        <button type="button" class="primary consignment-generate-button" ${possuiItensDisponiveis ? `onclick="abrirConversaoConsignado('${venda.id}','${retornoClienteId}','${retornoAba}',${retornoPagina})"` : 'disabled'}>Gerar pedido</button>
        ${!possuiItensDisponiveis ? '<p>Não há itens disponíveis para gerar um novo pedido.</p>' : ''}
        <button class="primary order-share" onclick="compartilharPedido('${venda.id}')">${svgIcon('save')} Compartilhar comprovante</button>
      </section>
      <footer class="order-view-actions consignment-view-actions">
        <button type="button" class="ghost" onclick="voltarParaDetalhesCliente('${retornoClienteId}','${retornoAba}',${retornoPagina})">Fechar</button>
        <button type="button" class="danger" onclick="confirmarExclusaoPedido('${venda.id}','${retornoClienteId}','${retornoAba}',${retornoPagina})">Excluir</button>
        <button type="button" class="secondary" onclick="abrirEditarPedido('${venda.id}')">Editar</button>
      </footer>
    </div>
  `, 'sheet-backdrop-centered consignment-view-backdrop');
}

function abrirConversaoConsignado(pedidoId, retornoClienteId = '', retornoAba = '', retornoPagina = 0) {
  const venda = state.vendas.find((item) => item.id === pedidoId);
  if (!venda || !pedidoEhConsignado(venda)) return;
  const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
  conversaoConsignadoRascunho = {
    pedidoId,
    quantidades: {},
    retornoClienteId,
    retornoAba,
    retornoPagina: Number(retornoPagina) || 0,
  };
  const itensHtml = (venda.itens || []).map((item, indice) => `
    <article class="consignment-conversion-row">
      <div><b>${escapeHtml(item.produto_nome)}</b><small>Disponível: ${Number(item.quantidade || 0)}</small></div>
      <div class="consignment-convert-stepper">
        <button type="button" onclick="ajustarConversaoConsignado('${pedidoId}',${indice},-1)" aria-label="Diminuir quantidade de ${escapeAttr(item.produto_nome)}">−</button>
        <b id="consignadoQuantidade${indice}">0</b>
        <button type="button" onclick="ajustarConversaoConsignado('${pedidoId}',${indice},1)" aria-label="Aumentar quantidade de ${escapeAttr(item.produto_nome)}">+</button>
        <small class="consignment-conversion-max">máx. ${Number(item.quantidade || 0)}</small>
      </div>
    </article>
  `).join('');
  sheet(`
    <div class="sheet-header">
      <div><h2>Gerar pedido</h2><p class="muted small">${escapeHtml(cliente?.nome || 'Cliente não informado')}</p></div>
      <button class="close" onclick="abrirPedidoCliente('${pedidoId}','${retornoClienteId}','${retornoAba}',${Number(retornoPagina) || 0})">×</button>
    </div>
    <div class="consignment-conversion-layout">
      <p class="consignment-conversion-help">Informe quanto foi vendido de cada produto. A quantidade não pode ultrapassar o saldo consignado.</p>
      <section class="consignment-conversion-scroll">${itensHtml}</section>
      <div class="consignment-conversion-total"><span>Itens selecionados</span><b id="consignadoTotalSelecionado">0</b></div>
      <footer class="consignment-conversion-actions">
        <button type="button" class="ghost" onclick="abrirPedidoCliente('${pedidoId}','${retornoClienteId}','${retornoAba}',${Number(retornoPagina) || 0})">Cancelar</button>
        <button type="button" class="primary" id="consignadoConfirmarPedido" onclick="gerarPedidoDoConsignado('${pedidoId}')" disabled>Confirmar pedido</button>
      </footer>
    </div>
  `, 'sheet-backdrop-centered consignment-conversion-backdrop');
}

function confirmarExclusaoPedido(pedidoId, retornoClienteId = '', retornoAba = '', retornoPagina = 0) {
  sheet(`<div class="sheet-header"><div><h2>Excluir pedido?</h2><p class="muted small">Esta ação é definitiva e atualizará todos os cálculos.</p></div><button class="close" onclick="abrirPedidoCliente('${pedidoId}','${retornoClienteId}','${retornoAba}',${retornoPagina})">×</button></div><div class="order-confirm-actions"><button class="danger" onclick="excluirPedido('${pedidoId}','${retornoClienteId}','${retornoAba}',${retornoPagina})">Excluir definitivamente</button><button class="ghost" onclick="abrirPedidoCliente('${pedidoId}','${retornoClienteId}','${retornoAba}',${retornoPagina})">Voltar</button></div>`, 'sheet-backdrop-centered order-confirm-backdrop');
}

async function excluirPedido(pedidoId, retornoClienteId = '', retornoAba = '', retornoPagina = 0) {
  iniciarMutacaoDadosVendas();
  try {
    if (backendAtivo) {
      await executarMutacaoGarantidaVendas('pedido_excluir', pedidoId, { id: pedidoId }, () => window.VendasDb.deleteOrder(pedidoId));
    }
    state.vendas = state.vendas.filter((item) => item.id !== pedidoId);
    pedidoClienteRascunho = null; conversaoConsignadoRascunho = null;
    await confirmarMutacaoDadosVendas();
    render(); voltarParaDetalhesCliente(retornoClienteId, retornoAba, retornoPagina); toast('Pedido excluído.');
  } catch (error) {
    toast(traduzErro(error));
  } finally {
    finalizarMutacaoDadosVendas();
  }
}

function ajustarConversaoConsignado(pedidoId, indice, delta) {
  const venda = state.vendas.find((item) => item.id === pedidoId);
  const item = venda?.itens?.[indice];
  if (!item || conversaoConsignadoRascunho?.pedidoId !== pedidoId) return;
  const atual = Number(conversaoConsignadoRascunho?.quantidades?.[indice] || 0);
  conversaoConsignadoRascunho.quantidades[indice] = Math.max(0, Math.min(Number(item.quantidade || 0), atual + Number(delta || 0)));
  const indicador = document.getElementById(`consignadoQuantidade${indice}`);
  if (indicador) indicador.textContent = String(conversaoConsignadoRascunho.quantidades[indice]);
  const totalSelecionado = Object.values(conversaoConsignadoRascunho.quantidades).reduce((soma, quantidade) => soma + Number(quantidade || 0), 0);
  const total = document.getElementById('consignadoTotalSelecionado');
  const confirmar = document.getElementById('consignadoConfirmarPedido');
  if (total) total.textContent = String(totalSelecionado);
  if (confirmar) confirmar.disabled = totalSelecionado <= 0;
}

async function gerarPedidoDoConsignado(pedidoId) {
  const consignado = state.vendas.find((item) => item.id === pedidoId);
  if (!consignado || !pedidoEhConsignado(consignado) || conversaoConsignadoRascunho?.pedidoId !== pedidoId) return;
  const selecionados = (consignado.itens || []).map((item, indice) => ({ item, quantidade: Number(conversaoConsignadoRascunho?.quantidades?.[indice] || 0) })).filter((registro) => registro.quantidade > 0);
  if (!selecionados.length) { toast('Selecione ao menos uma quantidade para gerar o pedido.'); return; }
  const itensPedido = selecionados.map(({ item, quantidade }) => ({ ...item, id: undefined, quantidade, preco: Number(item.preco ?? item.preco_unitario ?? 0), bonificado: false, desconto: 0, total: quantidade * Number(item.preco ?? item.preco_unitario ?? 0) }));
  const restantes = (consignado.itens || []).map((item, indice) => ({ ...item, quantidade: Number(item.quantidade || 0) - Number(conversaoConsignadoRascunho.quantidades[indice] || 0) })).filter((item) => item.quantidade > 0);
  const subtotalPedido = itensPedido.reduce((soma, item) => soma + item.total, 0);
  const subtotalRestante = restantes.reduce((soma, item) => soma + Number(item.quantidade || 0) * Number(item.preco ?? item.preco_unitario ?? 0), 0);
  const agora = new Date().toISOString();
  const pedido = {
    id: uuidPersistenciaVendas(), cliente_id: consignado.cliente_id, status: 'concluida', subtotal: subtotalPedido, desconto: 0, total: subtotalPedido, forma_pagamento: 'Venda', criado_em: agora,
    observacoes: JSON.stringify({ avantalab_pedido: true, tipo: 'venda', descricao: 'Venda originada de consignado', consignado_origem_id: consignado.id }), itens: itensPedido,
  };
  const consignadoAtualizado = { ...consignado, itens: restantes, subtotal: subtotalRestante, total: subtotalRestante, status: restantes.length ? 'concluida' : 'convertida', observacoes: JSON.stringify({ ...metadadosPedido(consignado), convertido_parcialmente: true }) };
  iniciarMutacaoDadosVendas();
  try {
    const botaoConfirmar = document.getElementById('consignadoConfirmarPedido');
    if (botaoConfirmar) {
      botaoConfirmar.disabled = true;
      botaoConfirmar.textContent = 'Salvando pedido...';
    }
    let salvoPedido = pedido;
    let salvoConsignado = consignadoAtualizado;
    if (backendAtivo) {
      salvoPedido = await window.VendasDb.saveOrder(pedido);
      try {
        salvoConsignado = await window.VendasDb.updateOrder(consignadoAtualizado);
      } catch (error) {
        await window.VendasDb.deleteOrder(salvoPedido.id).catch(() => {});
        throw error;
      }
    }
    state.vendas = [salvoPedido, ...state.vendas.map((item) => item.id === pedidoId ? salvoConsignado : item)];
    conversaoConsignadoRascunho = null;
    await confirmarMutacaoDadosVendas();
    render(); abrirPedidoCliente(salvoPedido.id); toast('Pedido gerado e consignado atualizado.');
  } catch (error) {
    const botaoConfirmar = document.getElementById('consignadoConfirmarPedido');
    if (botaoConfirmar) {
      botaoConfirmar.disabled = false;
      botaoConfirmar.textContent = 'Confirmar pedido';
    }
    toast(traduzErro(error));
  } finally {
    finalizarMutacaoDadosVendas();
  }
}

function dataComprovante(valorData) {
  const texto = String(valorData || '');
  const data = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T12:00:00`) : new Date(texto);
  if (Number.isNaN(data.getTime())) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR').format(data);
}

function timestampPedido(venda) {
  const tempo = new Date(venda?.criado_em || 0).getTime();
  return Number.isFinite(tempo) ? tempo : 0;
}

function timestampPagamento(pagamento) {
  const data = pagamento?.data_pagamento ? `${pagamento.data_pagamento}T12:00:00` : pagamento?.criado_em;
  const tempo = new Date(data || 0).getTime();
  return Number.isFinite(tempo) ? tempo : 0;
}

function metadadosPedido(venda) {
  try {
    const dados = JSON.parse(String(venda?.observacoes || ''));
    return dados && typeof dados === 'object' ? dados : {};
  } catch { return {}; }
}

function resumoComprovantePedido(venda) {
  const metadados = metadadosPedido(venda);
  if (Object.prototype.hasOwnProperty.call(metadados, 'saldo_anterior') && Object.prototype.hasOwnProperty.call(metadados, 'saldo_final')) {
    return { saldoAnterior: Number(metadados.saldo_anterior || 0), saldoAtual: Number(metadados.saldo_final || 0) };
  }
  const limite = timestampPedido(venda);
  const debitosAnteriores = state.vendas
    .filter((item) => item.id !== venda.id && item.cliente_id === venda.cliente_id && item.status !== 'cancelada' && pedidoGeraDebito(item) && timestampPedido(item) < limite)
    .reduce((soma, item) => soma + Number(item.total || 0), 0);
  const abatimentosAnteriores = (state.pagamentos || [])
    .filter((item) => item.cliente_id === venda.cliente_id && timestampPagamento(item) < limite)
    .reduce((soma, item) => soma + Number(item.valor || 0) + Number(item.desconto || 0), 0);
  const saldoAnterior = Math.max(0, debitosAnteriores - abatimentosAnteriores);
  const saldoAtual = Math.max(0, debitosAnteriores + (pedidoGeraDebito(venda) ? Number(venda.total || 0) : 0) - abatimentosAnteriores);
  return { saldoAnterior, saldoAtual };
}

function resumoFinanceiroParaConfirmarPagamento(pagamento) {
  const pedidosAtivos = pedidosDoCliente(pagamento.cliente_id)
    .filter((item) => item.status !== 'cancelada' && pedidoGeraDebito(item));
  const totalDebitos = pedidosAtivos.reduce((soma, item) => soma + Number(item.total || 0), 0);
  const abatimentosDosOutrosPagamentos = pagamentosDoCliente(pagamento.cliente_id)
    .filter((item) => item.id !== pagamento.id)
    .reduce((soma, item) => soma + Number(item.valor || 0) + Number(item.desconto || 0), 0);
  const saldoAnterior = Math.max(0, totalDebitos - abatimentosDosOutrosPagamentos);
  return {
    saldoAnterior,
    saldoAtual: Math.max(0, saldoAnterior - Number(pagamento.valor || 0) - Number(pagamento.desconto || 0)),
  };
}

function resumoComprovantePagamento(pagamento) {
  if (pagamento?.comprovante_financeiro_confirmado) {
    return {
      saldoAnterior: Number(pagamento.saldo_anterior || 0),
      saldoAtual: Number(pagamento.saldo_final || 0),
    };
  }
  // Registros antigos sem retrato confirmado usam apenas a soma atual dos
  // lançamentos ativos. O comprovante nunca depende de data ou horário.
  return resumoFinanceiroParaConfirmarPagamento(pagamento);
}

function caminhoRetanguloArredondado(ctx, x, y, largura, altura, raio) {
  const r = Math.min(raio, largura / 2, altura / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, r);
  ctx.arcTo(x + largura, y + altura, x, y + altura, r);
  ctx.arcTo(x, y + altura, x, y, r);
  ctx.arcTo(x, y, x + largura, y, r);
  ctx.closePath();
}

function textoCanvasLimitado(ctx, texto, larguraMaxima) {
  const original = String(texto || '');
  if (ctx.measureText(original).width <= larguraMaxima) return original;
  let reduzido = original;
  while (reduzido.length > 1 && ctx.measureText(`${reduzido}…`).width > larguraMaxima) reduzido = reduzido.slice(0, -1);
  return `${reduzido}…`;
}

function criarCanvasComprovante({ empresa = '', titulo, tituloDetalhes = 'Detalhes', cliente, data, etiqueta = '', temaEtiqueta = 'azul', linhas = [], resumo = [] }) {
  const linhasExibidas = linhas.slice(0, 44);
  if (linhas.length > linhasExibidas.length) linhasExibidas.push({ principal: `+ ${linhas.length - linhasExibidas.length} itens adicionais`, secundario: '', valor: '' });
  const linhasRegulares = resumo.filter((linha) => !linha.destaque);
  const linhaPrincipal = resumo.find((linha) => linha.destaque === 'principal');
  const linhaSaldo = resumo.find((linha) => linha.destaque === 'saldo');
  const largura = 1080;
  const alturaResumoRegular = linhasRegulares.length ? 38 + linhasRegulares.length * 82 : 0;
  const alturaResumo = alturaResumoRegular + (linhaPrincipal ? 162 : 0) + (linhaSaldo ? 176 : 0);
  const altura = Math.min(5400, Math.max(1700, 960 + alturaResumo + linhasExibidas.length * 90));
  const canvas = document.createElement('canvas');
  canvas.width = largura; canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível gerar o comprovante.');
  ctx.fillStyle = '#f3f7fb'; ctx.fillRect(0, 0, largura, altura);
  const gradiente = ctx.createLinearGradient(0, 0, largura, 260);
  gradiente.addColorStop(0, '#0A1F44'); gradiente.addColorStop(1, '#1687D9');
  ctx.fillStyle = gradiente; ctx.fillRect(0, 0, largura, 260);
  const nomeEmpresa = String(empresa || state.acessoVendas?.empresa_nome || 'AvantaLab').trim();
  ctx.fillStyle = '#fff'; ctx.font = `900 ${nomeEmpresa.length > 28 ? 36 : nomeEmpresa.length > 20 ? 42 : 50}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(textoCanvasLimitado(ctx, nomeEmpresa.toUpperCase(), 900), largura / 2, 92); ctx.textAlign = 'left';
  ctx.font = '700 34px Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fillText(textoCanvasLimitado(ctx, `Cliente: ${cliente}`, 640), 64, 198);
  ctx.textAlign = 'right'; ctx.fillText(data, 1016, 198); ctx.textAlign = 'left';
  let y = 318;
  if (etiqueta) {
    ctx.font = '900 33px Arial, sans-serif';
    const larguraEtiqueta = ctx.measureText(etiqueta).width + 82;
    const xEtiqueta = (largura - larguraEtiqueta) / 2;
    caminhoRetanguloArredondado(ctx, xEtiqueta, y - 39, larguraEtiqueta, 72, 36);
    ctx.fillStyle = temaEtiqueta === 'verde' ? '#dcfce7' : '#dff4ff'; ctx.fill();
    ctx.fillStyle = temaEtiqueta === 'verde' ? '#166534' : '#075985'; ctx.textAlign = 'center'; ctx.fillText(etiqueta, largura / 2, y + 11); ctx.textAlign = 'left'; y += 142;
  }

  if (linhasRegulares.length) {
    ctx.fillStyle = '#0A1F44'; ctx.font = '900 29px Arial, sans-serif'; ctx.fillText('Resumo financeiro', 64, y);
    y += 26;
    caminhoRetanguloArredondado(ctx, 48, y, 984, alturaResumoRegular, 26);
    ctx.fillStyle = '#fff'; ctx.fill();
    y += 53;
    linhasRegulares.forEach((linha, indice) => {
      if (indice) { ctx.strokeStyle = '#e1e9f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(78, y - 27); ctx.lineTo(1002, y - 27); ctx.stroke(); }
      ctx.fillStyle = '#526477'; ctx.font = '750 30px Arial, sans-serif'; ctx.fillText(linha.rotulo, 88, y + 14);
      ctx.fillStyle = '#0A1F44'; ctx.textAlign = 'right'; ctx.font = '850 36px Arial, sans-serif'; ctx.fillText(linha.valor, 992, y + 15); ctx.textAlign = 'left';
      y += 82;
    });
    y += 52;
  }
  if (linhaPrincipal) {
    ctx.fillStyle = '#0A1F44'; ctx.font = '900 27px Arial, sans-serif'; ctx.fillText(linhaPrincipal.tituloDestaque || 'Lançamento registrado', 64, y);
    y += 26;
    caminhoRetanguloArredondado(ctx, 48, y, 984, 136, 26);
    const destaqueGradiente = ctx.createLinearGradient(48, y, 1032, y + 136);
    destaqueGradiente.addColorStop(0, '#075985'); destaqueGradiente.addColorStop(1, '#1687D9');
    ctx.fillStyle = destaqueGradiente; ctx.fill(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#dff5ff'; ctx.font = '800 29px Arial, sans-serif'; ctx.fillText(linhaPrincipal.rotulo, 84, y + 52);
    if (linhaPrincipal.subtitulo) { ctx.fillStyle = '#bae6fd'; ctx.font = '650 21px Arial, sans-serif'; ctx.fillText(textoCanvasLimitado(ctx, linhaPrincipal.subtitulo, 470), 84, y + 95); }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = '900 48px Arial, sans-serif'; ctx.fillText(linhaPrincipal.valor, 996, y + 81); ctx.textAlign = 'left';
    y += 202;
  }
  if (linhaSaldo) {
    ctx.fillStyle = '#0A1F44'; ctx.font = '900 27px Arial, sans-serif'; ctx.fillText('Situação após o lançamento', 64, y);
    y += 26;
    caminhoRetanguloArredondado(ctx, 48, y, 984, 148, 26);
    ctx.fillStyle = '#073555'; ctx.fill(); ctx.strokeStyle = '#5ed7ff'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#e4f7ff'; ctx.font = '850 33px Arial, sans-serif'; ctx.fillText(linhaSaldo.rotulo, 84, y + 57);
    ctx.fillStyle = '#bdeaff'; ctx.font = '650 21px Arial, sans-serif'; ctx.fillText(linhaSaldo.subtitulo || 'Valor que permanece em aberto', 84, y + 101);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = '900 48px Arial, sans-serif'; ctx.fillText(linhaSaldo.valor, 996, y + 84); ctx.textAlign = 'left';
    y += 222;
  }

  ctx.fillStyle = '#0A1F44'; ctx.font = '900 32px Arial, sans-serif'; ctx.fillText(linhasExibidas.length ? tituloDetalhes : 'Informações', 64, y);
  y += 24;
  const alturaDetalhes = Math.max(120, 34 + linhasExibidas.length * 90);
  caminhoRetanguloArredondado(ctx, 48, y, 984, alturaDetalhes, 26);
  ctx.fillStyle = '#fff'; ctx.fill();
  y += 54;
  ctx.font = '750 28px Arial, sans-serif';
  linhasExibidas.forEach((linha, indice) => {
    if (indice) { ctx.strokeStyle = '#e1e9f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(78, y - 27); ctx.lineTo(1002, y - 27); ctx.stroke(); }
    ctx.font = '750 28px Arial, sans-serif';
    const principal = textoCanvasLimitado(ctx, linha.principal, linha.bonificado ? 380 : 600);
    ctx.fillStyle = '#172033'; ctx.fillText(principal, 78, y + 5);
    if (linha.bonificado) {
      const xBonificado = Math.min(78 + ctx.measureText(principal).width + 18, 488);
      caminhoRetanguloArredondado(ctx, xBonificado, y - 25, 178, 38, 19);
      ctx.fillStyle = '#ffedd5'; ctx.fill();
      ctx.fillStyle = '#9a3412'; ctx.font = '900 18px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BONIFICADO', xBonificado + 89, y + 1); ctx.textAlign = 'left';
    }
    if (linha.secundario) { ctx.fillStyle = '#64748b'; ctx.font = '650 23px Arial, sans-serif'; ctx.fillText(textoCanvasLimitado(ctx, linha.secundario, 600), 78, y + 39); ctx.font = '750 28px Arial, sans-serif'; }
    ctx.fillStyle = '#1687D9'; ctx.textAlign = 'right'; ctx.font = '850 30px Arial, sans-serif'; ctx.fillText(linha.valor || '', 1002, y + 10); ctx.textAlign = 'left'; ctx.font = '750 28px Arial, sans-serif';
    y += 90;
  });
  const rodape = textoCanvasLimitado(ctx, `${titulo} - ${cliente}`, 900);
  ctx.fillStyle = '#64748b'; ctx.font = '600 20px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(rodape, largura / 2, altura - 54); ctx.textAlign = 'left';
  return canvas;
}

async function compartilharCanvasComprovante(canvas, nomeArquivo, titulo) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Não foi possível gerar a imagem do comprovante.');
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [arquivo] }))) {
    try { await navigator.share({ title: titulo, text: titulo, files: [arquivo] }); return true; }
    catch (error) { if (error?.name === 'AbortError') return false; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = nomeArquivo; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Imagem do comprovante gerada.');
  return true;
}

async function compartilharPedido(pedidoId) {
  const venda = state.vendas.find((item) => item.id === pedidoId);
  if (!venda) return;
  const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
  const resumo = resumoComprovantePedido(venda);
  const linhas = (venda.itens || []).map((item) => ({
    principal: item.produto_nome || 'Produto',
    bonificado: itemPedidoBonificado(item),
    secundario: `${Number(item.quantidade || 0)} × ${moeda(item.preco || item.preco_unitario)}`,
    valor: moeda(itemPedidoBonificado(item) ? 0 : Number(item.total ?? Number(item.quantidade || 0) * Number(item.preco || item.preco_unitario || 0))),
  }));
  const canvas = criarCanvasComprovante({
    empresa: state.acessoVendas?.empresa_nome || 'AvantaLab',
    titulo: pedidoEhConsignado(venda) ? 'Pedido consignado' : 'Comprovante de pedido',
    tituloDetalhes: pedidoEhConsignado(venda) ? 'Detalhes do consignado' : 'Detalhes do pedido',
    cliente: cliente?.nome || 'Cliente não informado',
    data: dataComprovante(venda.criado_em),
    etiqueta: pedidoEhConsignado(venda) ? 'Pedido consignado' : 'Comprovante de pedido',
    linhas,
    resumo: [
      { rotulo: 'Saldo anterior', valor: moeda(resumo.saldoAnterior) },
      { rotulo: 'Pedido', valor: moeda(venda.total), destaque: 'principal', tituloDestaque: 'Pedido registrado' },
      { rotulo: 'Saldo atual', valor: moeda(resumo.saldoAtual), destaque: 'saldo' },
    ],
  });
  const compartilhado = await compartilharCanvasComprovante(canvas, `pedido-${String(venda.id).slice(0, 8)}.png`, `Comprovante de pedido - ${cliente?.nome || 'Cliente não informado'}`);
  if (compartilhado) fecharSheet();
}

async function compartilharPagamento(pagamentoId) {
  const pagamento = (state.pagamentos || []).find((item) => item.id === pagamentoId);
  if (!pagamento) return;
  const cliente = state.clientes.find((item) => item.id === pagamento.cliente_id);
  const resumo = resumoComprovantePagamento(pagamento);
  const desconto = Number(pagamento.desconto || 0);
  const abatimento = Number(pagamento.valor || 0) + desconto;
  const linhas = [{ principal: 'Forma de pagamento', secundario: '', valor: pagamento.forma_pagamento || 'Não informado' }];
  if (desconto > 0) linhas.push({ principal: 'Desconto', secundario: 'Abatimento concedido', valor: moeda(desconto) });
  const canvas = criarCanvasComprovante({
    empresa: state.acessoVendas?.empresa_nome || 'AvantaLab',
    titulo: 'Comprovante de pagamento',
    tituloDetalhes: 'Detalhes do pagamento',
    cliente: cliente?.nome || 'Cliente não informado',
    data: dataComprovante(pagamento.data_pagamento),
    etiqueta: 'Comprovante de pagamento',
    temaEtiqueta: 'verde',
    linhas,
    resumo: [
      { rotulo: 'Saldo anterior', valor: moeda(resumo.saldoAnterior) },
      { rotulo: desconto > 0 ? 'Valor pago + desconto' : 'Valor pago', valor: moeda(abatimento), destaque: 'principal', tituloDestaque: 'Pagamento registrado', subtitulo: desconto > 0 ? 'Valor recebido com desconto aplicado' : 'Pagamento confirmado' },
      { rotulo: 'Saldo atual', valor: moeda(resumo.saldoAtual), destaque: 'saldo' },
    ],
  });
  const compartilhado = await compartilharCanvasComprovante(canvas, `pagamento-${String(pagamento.id).slice(0, 8)}.png`, `Comprovante de pagamento - ${cliente?.nome || 'Cliente não informado'}`);
  if (compartilhado) fecharSheet();
}

function clientesOrdenadosPorUltimoPagamento() {
  const pesquisa = normalizar(buscaAplicada);
  if (pesquisa) return clientesFiltrados();
  const ultimaDataPorCliente = new Map();
  (state.pagamentos || []).forEach((pagamento) => {
    if (!pagamento.cliente_id) return;
    const referencia = `${pagamento.data_pagamento || ''}|${pagamento.criado_em || ''}`;
    const atual = ultimaDataPorCliente.get(pagamento.cliente_id) || '';
    if (referencia > atual) ultimaDataPorCliente.set(pagamento.cliente_id, referencia);
  });
  return state.clientes
    .filter((cliente) => ultimaDataPorCliente.has(cliente.id))
    .sort((a, b) => String(ultimaDataPorCliente.get(b.id)).localeCompare(String(ultimaDataPorCliente.get(a.id))));
}

function carregarMaisClientesPagamentos() {
  limiteClientesPagamentos += 10;
  render();
}

function renderPagamentos() {
  const todosClientes = clientesOrdenadosPorUltimoPagamento();
  const clientes = todosClientes.slice(0, limiteClientesPagamentos);
  const temBusca = Boolean(String(state.busca || '').trim());
  const quantidadeProximoLote = Math.min(ITENS_POR_LOTE_HISTORICO, todosClientes.length - clientes.length);
  const mensagemVazia = buscaAplicada
    ? '<h3>Nenhum cliente encontrado</h3><p>Revise o texto pesquisado e tente novamente.</p>'
    : '<h3>Nenhum pagamento registrado</h3><p>Pesquise um cliente para registrar o primeiro recebimento.</p>';
  return `<section class="module-page pagamentos-page${temBusca ? ' is-searching' : ''}"><div class="module-sticky-head"><div class="module-title"><div><h2>Pagamentos</h2><p>Gerencie pagamentos, débitos e créditos.</p></div></div>${renderBarraBusca('Pesquisar clientes', 'Ordem Alfabética')}</div>${clientes.length ? `<div class="module-stats order-results-stats"><span>Exibindo <b>${clientes.length}</b> de <b>${todosClientes.length}</b> clientes</span></div><section class="debt-card-grid">${clientes.map(renderClienteDebito).join('')}</section>${todosClientes.length > clientes.length ? `<button type="button" class="ghost payment-clients-more" onclick="carregarMaisClientesPagamentos()">Carregar mais ${quantidadeProximoLote} clientes</button>` : ''}` : `<article class="publication-empty"><span>${svgIcon('users')}</span>${mensagemVazia}</article>`}</section>`;
}

function renderClienteDebito(c) {
  const saldo = saldoFinanceiroCliente(c.id);
  const ultimoPagamento = pagamentosDoCliente(c.id)[0];
  const dataUltimoPagamento = ultimoPagamento ? dataCompactaBR(`${ultimoPagamento.data_pagamento}T12:00:00`) : '—';
  return `<article class="debt-card"><header><span>${svgIcon('user')}</span><div><h3>${escapeHtml(c.nome)}</h3></div></header><div class="debt-values"><div class="pending"><small>Pendente</small><b>${moeda(saldo.debito)}</b></div><div class="consigned"><small>Consignado</small><b>${moeda(saldo.consignado)}</b></div><div class="credit"><small>Crédito</small><b>${moeda(saldo.credito)}</b></div><div class="last-payment"><small>Último pagamento</small><b>${dataUltimoPagamento}</b></div></div><div class="debt-actions"><button class="debt-details primary" onclick="abrirPagamentoCliente('${c.id}')">${svgIcon('dollar')}<span>Registrar pagamento</span></button><button class="debt-details ghost" onclick="abrirPagamentosCliente('${c.id}')">${svgIcon('credit-card')}<span>Ver pagamentos</span></button></div></article>`;
}

function renderVender() {
  const produtos = produtosFiltrados();
  const totalCarrinho = state.carrinho.reduce((s, item) => s + item.quantidade * item.preco, 0);
  return `
    <section class="module-page">
      <div class="module-title"><div><h2>Novo Pedido</h2><p>Selecione os produtos e finalize a venda para o cliente.</p></div><button class="primary" onclick="abrirCarrinho()">${svgIcon('shopping-cart')} Carrinho · ${moeda(totalCarrinho)}</button></div>
      ${renderBarraBusca('Pesquisar', 'Ordem Alfabética')}
      <div class="module-stats"><span><b>${state.carrinho.reduce((s, item) => s + item.quantidade, 0)}</b> itens no carrinho</span><span>Finalize o pedido após selecionar o cliente</span></div>
      <section class="product-grid module-product-grid">
        ${produtos.length ? produtos.map(renderProdutoVenda).join('') : empty('Cadastre ou importe produtos antes de vender.')}
      </section>
    </section>
  `;
}

function renderProdutoVenda(p) {
  const preco = Number(p.preco || 0);
  return `
    <article class="product-card">
      <div class="product-image-wrap" onclick="adicionarCarrinho('${p.id}')">
        ${p.imagem_url ? `<img class="product-image" src="${escapeAttr(p.imagem_url)}" alt="${escapeAttr(p.nome)}" />` : '<div class="product-placeholder">🛍️</div>'}
        <span class="product-badge">${escapeHtml(p.categoria || 'Geral')}</span>
      </div>
      <div class="product-content">
        <h3>${escapeHtml(p.nome)}</h3>
        <p class="row-sub">Estoque ${p.estoque ?? '—'}</p>
        <p class="product-price">${moeda(preco)}</p>
        <div class="product-actions">
          <button class="ghost" onclick="abrirProduto('${p.id}')">Ver</button>
          <button class="primary" onclick="adicionarCarrinho('${p.id}')">Comprar</button>
        </div>
      </div>
    </article>
  `;
}

function renderVendas() {
  const vendas = pedidosFiltrados();
  const exibidas = vendas.slice(0, limitePedidos);
  const temBusca = Boolean(String(state.busca || '').trim());
  const quantidadeProximoLote = Math.min(ITENS_POR_LOTE_HISTORICO, vendas.length - exibidas.length);
  const rotuloProximoLote = filtroPedidos === 'consignados'
    ? 'consignados'
    : filtroPedidos === 'bonificacoes'
      ? 'bonificações'
      : 'pedidos';
  return `
    <section class="module-page pedidos-page${temBusca ? ' is-searching' : ''}">
      <div class="module-sticky-head">
        <div class="module-title"><div><h2>Pedidos</h2><p>Acompanhe todos os pedidos registrados.</p></div><button class="primary" onclick="abrirNovoPedidoGeral()">${svgIcon('plus')} Novo pedido</button></div>
        ${renderBarraBusca('Pesquisar pedidos', 'Ordem Alfabética')}
        <nav class="order-type-filters" aria-label="Filtrar pedidos por tipo">
          ${botaoFiltroPedidos('todos', 'Todos')}
          ${botaoFiltroPedidos('pedidos', 'Pedidos')}
          ${botaoFiltroPedidos('bonificacoes', 'Bonificações')}
          ${botaoFiltroPedidos('consignados', 'Consignados')}
        </nav>
      </div>
      <div class="module-stats order-results-stats"><span>Exibindo <b>${Math.min(exibidas.length, vendas.length)}</b> de <b>${vendas.length}</b></span></div>
      <div class="orders-card-grid">${exibidas.length ? exibidas.map(renderVenda).join('') : '<div class="table-empty orders-empty">Nenhum pedido encontrado.</div>'}</div>
      ${vendas.length > exibidas.length ? `<button class="ghost orders-load-more" onclick="carregarMaisPedidos()">Carregar mais ${quantidadeProximoLote} ${rotuloProximoLote}</button>` : ''}
    </section>
  `;
}

function tipoPedido(venda) {
  if (pedidoEhConsignado(venda)) return 'consignados';
  if ((venda.itens || []).some(itemPedidoBonificado)) return 'bonificacoes';
  const metadados = metadadosPedido(venda);
  const temBonificacaoMarcada = metadados.tem_bonificacao === true
    || ['true', '1', 'sim'].includes(normalizar(metadados.tem_bonificacao))
    || [metadados.tipo, metadados.descricao].some((valorItem) => normalizar(valorItem).includes('bonific'));
  if (temBonificacaoMarcada) return 'bonificacoes';
  const identificadores = [venda.tipo, venda.tipo_pedido, venda.categoria, venda.natureza, venda.forma_pagamento, venda.status]
    .map((valorItem) => normalizar(valorItem))
    .join(' ');
  if (identificadores.includes('bonific')) return 'bonificacoes';
  return 'pedidos';
}

function itemPedidoBonificado(item) {
  if (Object.prototype.hasOwnProperty.call(item || {}, 'bonificado')) {
    const valorMarcado = item.bonificado;
    return valorMarcado === true || valorMarcado === 1 || ['true', '1', 'sim'].includes(normalizar(valorMarcado));
  }
  const quantidade = Number(item?.quantidade || 0);
  const preco = Number(item?.preco ?? item?.preco_unitario ?? 0);
  return preco > 0 && Number(item?.total || 0) === 0 && Number(item?.desconto || 0) >= quantidade * preco;
}

function pedidoSomenteBonificado(venda) {
  return Boolean((venda.itens || []).length) && (venda.itens || []).every(itemPedidoBonificado);
}

function textoPesquisaPedido(venda) {
  const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
  const itens = (venda.itens || []).flatMap((item) => [item.produto_nome, item.produto_sku, item.quantidade, item.preco_unitario, item.total]);
  return [JSON.stringify(venda), JSON.stringify(cliente || {}), venda.id, cliente?.nome, venda.criado_em, dataBR(venda.criado_em), venda.forma_pagamento, venda.status, venda.observacoes, venda.subtotal, moeda(venda.subtotal), venda.desconto, moeda(venda.desconto), venda.total, moeda(venda.total), ...itens]
    .map((valorItem) => normalizar(valorItem))
    .join(' ');
}

function pedidosFiltrados() {
  const pesquisa = normalizar(buscaAplicada);
  return [...state.vendas]
    .filter((venda) => filtroPedidos === 'todos' || tipoPedido(venda) === filtroPedidos)
    .filter((venda) => !pesquisa || textoPesquisaPedido(venda).includes(pesquisa))
    .sort((a, b) => {
      const clienteA = state.clientes.find((item) => item.id === a.cliente_id)?.nome || '';
      const clienteB = state.clientes.find((item) => item.id === b.cliente_id)?.nome || '';
      const comparacao = String(clienteA).localeCompare(String(clienteB), 'pt-BR', { sensitivity: 'base' });
      if (comparacao) return ordemAlfabetica === 'asc' ? comparacao : -comparacao;
      return new Date(b.criado_em) - new Date(a.criado_em);
    });
}

function botaoFiltroPedidos(tipo, rotulo) {
  return `<button type="button" class="${filtroPedidos === tipo ? 'active' : ''}" onclick="selecionarFiltroPedidos('${tipo}')">${escapeHtml(rotulo)}</button>`;
}

function selecionarFiltroPedidos(tipo) {
  filtroPedidos = ['todos', 'pedidos', 'bonificacoes', 'consignados'].includes(tipo) ? tipo : 'todos';
  limitePedidos = 10;
  render();
}

function carregarMaisPedidos() {
  limitePedidos += 10;
  render();
}

function renderVenda(v) {
  const cliente = state.clientes.find((c) => c.id === v.cliente_id);
  const tipo = tipoPedido(v);
  const rotuloTipo = tipo === 'consignados' ? 'Consignado' : tipo === 'bonificacoes' ? 'Bonificação' : 'Pedido';
  return `
    <button type="button" class="order-list-card order-type-${tipo} ${v.status === 'cancelada' ? 'is-cancelled' : ''}" onclick="abrirPedidoCliente('${v.id}')">
      <header><span>${escapeHtml(rotuloTipo)}</span><time>${dataBR(v.criado_em)}</time></header>
      <div><h3>${escapeHtml(cliente?.nome || 'Cliente não informado')}</h3><span class="status-pill ${v.status === 'cancelada' ? 'warn' : 'ok'}">${escapeHtml(v.status || 'registrado')}</span></div>
      <footer><span>${(v.itens || []).length} ${(v.itens || []).length === 1 ? 'item' : 'itens'}</span><b>${moeda(v.total)}</b></footer>
    </button>
  `;
}

function renderImportar() {
  return `
    <section class="module-page">
      <div class="module-title"><div><h2>Importar produtos</h2><p>Inclua um catálogo próprio ou carregue o pacote Tridium.</p></div></div>
      <article class="empty-module">
      <h3>Planilha de produtos</h3><p>Baixe o modelo, preencha os dados e importe-o nesta área. A integração XLS/XLSX será conectada ao Supabase.</p>
      <div class="actions" style="margin-top:16px">
        <button class="secondary" onclick="baixarModeloCsv()">Baixar modelo CSV</button>
        <button class="primary" onclick="carregarPacoteTridium()">Carregar Tridium</button>
      </div>
      </article>
    <article class="data-panel" style="padding:18px">
      <div class="field">
        <label>CSV de produtos</label>
        <textarea id="csvInput" placeholder="marca,categoria,sku,nome,descricao,preco,estoque,unidade,ativo"></textarea>
      </div>
      <button class="primary" style="width:100%;margin-top:10px" onclick="importarCsv()">Importar CSV</button>
    </article>
    </section>
  `;
}

function empty(texto) {
  return `<div class="empty">${escapeHtml(texto)}</div>`;
}

function numeroPacoteSugerido() {
  return `PAC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
}

function carregarBibliotecaExcel() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (window.__vendasXlsxPromise) return window.__vendasXlsxPromise;
  window.__vendasXlsxPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `/vendas-mobile/vendor/xlsx.full.min.js?v=${window.__VENDAS_MOBILE_VERSION__ || ''}`;
    script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('Biblioteca de planilhas indisponível.'));
    script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca de planilhas.'));
    document.head.appendChild(script);
  });
  return window.__vendasXlsxPromise;
}

function carregarBibliotecaZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (window.__vendasZipPromise) return window.__vendasZipPromise;
  window.__vendasZipPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `/vendas-mobile/vendor/jszip.min.js?v=${window.__VENDAS_MOBILE_VERSION__ || ''}`;
    script.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('Leitor de pacotes indisponível.'));
    script.onerror = () => reject(new Error('Não foi possível carregar o leitor de pacotes.'));
    document.head.appendChild(script);
  });
  return window.__vendasZipPromise;
}

function mostrarSincronizacaoCatalogo() {
  const sincronizacao = state.sincronizacaoCatalogo || { adicionados: 0, ja_recebidos: 0 };
  sheet(`<div class="sheet-header"><div><h2>Sincronização do catálogo</h2><p class="muted small">Os produtos publicados pela empresa são verificados em segundo plano após a abertura.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="grid"><article class="stock-current"><span>Novos produtos recebidos nesta abertura</span><b>${Number(sincronizacao.adicionados || 0)}</b></article><article class="stock-current"><span>Produtos já recebidos anteriormente</span><b>${Number(sincronizacao.ja_recebidos || 0)}</b></article><p class="muted small">Produtos que você já alterou — inclusive preços e custos — não são sobrescritos pela atualização automática.</p><button class="primary" onclick="sincronizarCatalogoAgora()">${svgIcon('save')} Verificar agora</button></div>`, 'sheet-backdrop-centered');
}

async function sincronizarCatalogoAgora() {
  try {
    fecharSheet();
    await sincronizarCatalogoAutomaticamente(true);
    toast('Catálogo atualizado.');
    mostrarSincronizacaoCatalogo();
  } catch (error) { toast(traduzErro(error)); }
}

function abrirImportacaoPacoteZip() {
  sheet(`<div class="sheet-header"><div><h2>Importar pacote ZIP</h2><p class="muted small">Use o pacote criado pelo catálogo web. Ele inclui produtos e imagens.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="grid package-import-form">${campo('pacoteNomeZip', 'Nome do pacote', '')}${campo('pacoteNumeroZip', 'Número do pacote', numeroPacoteSugerido())}<input id="pacoteArquivoZip" type="file" accept=".zip,application/zip" hidden onchange="importarArquivoPacoteZip(this)"><button class="primary" onclick="document.getElementById('pacoteArquivoZip').click()">${svgIcon('folder')} Selecionar arquivo ZIP</button><p class="muted small package-import-note">A importação cria uma cópia dos produtos nesta conta, incluindo as imagens do pacote.</p></div>`, 'sheet-backdrop-centered');
}

async function importarArquivoPacoteZip(input) {
  const arquivo = input?.files?.[0];
  input.value = '';
  if (!arquivo) return;
  const nome = valor('pacoteNomeZip').trim();
  const numero = valor('pacoteNumeroZip').trim();
  if (!nome || !numero) { toast('Informe o nome e o número do pacote.'); return; }
  try {
    const JSZip = await carregarBibliotecaZip();
    const zip = await JSZip.loadAsync(arquivo);
    const manifestoArquivo = zip.file('catalogo-vendas-mobile.json');
    if (!manifestoArquivo) throw new Error('Este arquivo não é um pacote de produtos AvantaLab válido.');
    const manifesto = JSON.parse(await manifestoArquivo.async('text'));
    const produtosBase = Array.isArray(manifesto?.produtos) ? manifesto.produtos : [];
    if (!produtosBase.length) throw new Error('O pacote não possui produtos.');
    const produtos = [];
    for (const produto of produtosBase) {
      const nomeProduto = String(produto?.nome || '').trim();
      const preco = Number(produto?.preco_venda ?? produto?.preco ?? 0);
      if (!nomeProduto || !Number.isFinite(preco) || preco <= 0) continue;
      let imagem_url = String(produto?.imagem_url || '').trim();
      const imagemArquivo = String(produto?.imagem_arquivo || '').trim();
      if (imagemArquivo && zip.file(imagemArquivo) && backendAtivo) {
        try { imagem_url = await window.VendasDb.uploadProductImage(await zip.file(imagemArquivo).async('blob')); } catch { /* mantém a URL original quando a cópia da imagem falhar */ }
      }
      produtos.push({ marca: String(produto?.marca || '').trim(), categoria: String(produto?.categoria || '').trim(), sku: String(produto?.sku || '').trim(), nome: nomeProduto, descricao: String(produto?.descricao || '').trim(), preco, preco_custo: Number(produto?.preco_custo || 0), estoque: produto?.estoque ?? null, unidade: String(produto?.unidade || 'un').trim() || 'un', imagem_url, ativo: produto?.ativo !== false });
    }
    if (!produtos.length) throw new Error('Nenhum produto válido foi encontrado no pacote.');
    await salvarPacoteImportado({ nome, numero, origem: 'zip', produtos });
  } catch (error) { toast(traduzErro(error)); }
}

async function baixarModeloProdutosExcel() {
  try {
    await carregarBibliotecaExcel();
    const resposta = await fetch('/vendas-mobile/data/modelo-importacao-produtos-avantalab.xlsx');
    if (!resposta.ok) throw new Error('Modelo Excel indisponível.');
    const livro = window.XLSX.read(await resposta.arrayBuffer(), { type: 'array' });
    window.XLSX.writeFile(livro, 'modelo-importacao-produtos-avantalab.xlsx');
  } catch (error) { toast(traduzErro(error)); }
}

function abrirImportacaoPacote() {
  sheet(`<div class="sheet-header"><div><h2>Pacote de produtos</h2><p class="muted small">Dê um nome e número ao pacote antes de importar.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="grid package-import-form">${campo('pacoteNome', 'Nome do pacote', '')}${campo('pacoteNumero', 'Número do pacote', numeroPacoteSugerido())}<input id="pacoteArquivoExcel" type="file" accept=".xlsx,.xls" hidden onchange="importarArquivoPacote(this)"><button class="primary" onclick="document.getElementById('pacoteArquivoExcel').click()">${svgIcon('folder')} Buscar arquivo Excel</button><button class="secondary" onclick="abrirImportacaoPacoteLink()">${svgIcon('save')} Inserir link do arquivo</button><button class="ghost" onclick="importarCatalogoTridiumPersistente()">${svgIcon('package')} Importar catálogo Tridium disponível</button><p class="muted small package-import-note">O link deve apontar diretamente para um arquivo Excel e permitir acesso público (CORS).</p></div>`, 'sheet-backdrop-centered');
}

function dadosNovoPacote() {
  const nome = valor('pacoteNome').trim();
  const numero = valor('pacoteNumero').trim();
  if (!nome || !numero) { toast('Informe o nome e o número do pacote.'); return null; }
  return { nome, numero };
}

function abrirImportacaoPacoteLink() {
  const dados = dadosNovoPacote();
  if (!dados) return;
  const nomeCodificado = encodeURIComponent(dados.nome).replace(/'/g, '%27');
  const numeroCodificado = encodeURIComponent(dados.numero).replace(/'/g, '%27');
  sheet(`<div class="sheet-header"><div><h2>Arquivo hospedado</h2><p class="muted small">${escapeHtml(dados.nome)} · ${escapeHtml(dados.numero)}</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="grid"><div class="field"><label>Link direto do Excel</label><input id="pacoteArquivoLink" type="url" inputmode="url" placeholder="https://exemplo.com/produtos.xlsx"></div><button class="primary" onclick="importarLinkPacote('${nomeCodificado}', '${numeroCodificado}')">Importar arquivo</button></div>`, 'sheet-backdrop-centered');
}

function numeroProduto(valorProduto) {
  if (typeof valorProduto === 'number') return Number.isFinite(valorProduto) ? valorProduto : 0;
  const bruto = String(valorProduto || '').trim().replace(/R\$\s?/gi, '').replace(/\s/g, '');
  const texto = bruto.includes(',') ? bruto.replace(/\./g, '').replace(',', '.') : bruto;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

function produtosDaPlanilha(arrayBuffer) {
  const wb = window.XLSX.read(arrayBuffer, { type: 'array' });
  const primeiraAba = wb.SheetNames[0];
  if (!primeiraAba) throw new Error('A planilha não possui uma aba de produtos.');
  const aba = wb.Sheets[primeiraAba];
  const grade = window.XLSX.utils.sheet_to_json(aba, { header: 1, defval: '', raw: false });
  const linhaCabecalho = grade.findIndex((linha) => linha.some((campo) => normalizar(campo).replace(/\s/g, '_') === 'nome'));
  if (linhaCabecalho < 0) throw new Error('Não encontramos a coluna “nome” na planilha. Baixe e use o modelo Excel.');
  const linhas = window.XLSX.utils.sheet_to_json(aba, { defval: '', raw: false, range: linhaCabecalho });
  const chave = (linha, ...nomes) => {
    const mapa = Object.fromEntries(Object.entries(linha).map(([campo, valorCampo]) => [normalizar(campo).replace(/\s/g, '_'), valorCampo]));
    return nomes.map((nome) => mapa[nome]).find((valorCampo) => valorCampo !== undefined && valorCampo !== '');
  };
  const invalidos = [];
  const produtos = linhas.map((linha, indice) => {
    const nome = String(chave(linha, 'nome') || '').trim();
    const preco = numeroProduto(chave(linha, 'preco_venda', 'preco', 'preco_de_venda'));
    if (!nome || preco <= 0) { invalidos.push(indice + 2); return null; }
    return {
      marca: String(chave(linha, 'marca') || '').trim(), categoria: String(chave(linha, 'categoria') || '').trim(), sku: String(chave(linha, 'sku', 'codigo') || '').trim(), nome,
      descricao: String(chave(linha, 'descricao') || '').trim(), preco, preco_custo: numeroProduto(chave(linha, 'preco_custo', 'custo', 'preco_de_custo')),
      estoque: chave(linha, 'estoque') === '' ? null : numeroProduto(chave(linha, 'estoque')), unidade: String(chave(linha, 'unidade') || 'un').trim(),
      imagem_url: String(chave(linha, 'imagem_url', 'imagem', 'url_imagem') || '').trim(), ativo: true,
    };
  }).filter(Boolean);
  if (!produtos.length) throw new Error('Nenhum produto válido foi encontrado. Nome e preço de venda são obrigatórios.');
  return { produtos, invalidos };
}

async function importarArquivoPacote(input) {
  const arquivo = input.files?.[0];
  input.value = '';
  if (!arquivo) return;
  const dados = dadosNovoPacote();
  if (!dados) return;
  try {
    await carregarBibliotecaExcel();
    const resultado = produtosDaPlanilha(await arquivo.arrayBuffer());
    await salvarPacoteImportado({ ...dados, origem: 'excel', ...resultado });
  } catch (error) { toast(traduzErro(error)); }
}

async function importarLinkPacote(nomeCodificado, numeroCodificado) {
  const nome = decodeURIComponent(nomeCodificado);
  const numero = decodeURIComponent(numeroCodificado);
  const link = valor('pacoteArquivoLink').trim();
  if (!/^https:\/\//i.test(link)) { toast('Informe um link HTTPS direto para a planilha.'); return; }
  try {
    await carregarBibliotecaExcel();
    const resposta = await fetch(link);
    if (!resposta.ok) throw new Error('Não foi possível baixar o arquivo informado.');
    const resultado = produtosDaPlanilha(await resposta.arrayBuffer());
    await salvarPacoteImportado({ nome, numero, origem: 'link', ...resultado });
  } catch (error) { toast(`${traduzErro(error)} Verifique se o link é público e permite acesso ao arquivo.`); }
}

async function salvarPacoteImportado({ nome, numero, origem, produtos, invalidos = [] }) {
  let pacote;
  try {
    if (backendAtivo) {
      pacote = await window.VendasDb.createPackage({ nome, numero, origem, empresaId: state.acessoVendas?.empresa_id || null });
      const salvos = await window.VendasDb.saveProductsBulk(produtos, pacote);
      state.produtos = [...salvos.map((produto) => ({ ...produto, preco_custo: Number(produto.preco_custo ?? produto.metadados?.preco_custo ?? 0), pacote_origem_id: produto.pacote_origem_id ?? produto.metadados?.pacote?.id ?? null })), ...state.produtos];
    } else {
      pacote = { id: id('pacote'), nome, numero, origem, criado_em: new Date().toISOString() };
      const salvos = produtos.map((produto) => ({ id: id('prod'), ...produto, pacote_origem_id: pacote.id, criado_em: new Date().toISOString() }));
      state.produtos = [...salvos, ...state.produtos];
    }
    state.pacotesProdutos = [pacote, ...state.pacotesProdutos];
    fecharSheet(); state.aba = 'produtos'; salvarEstado(); render();
    toast(`${produtos.length} produtos importados${invalidos.length ? `; ${invalidos.length} linhas ignoradas` : ''}.`);
  } catch (error) {
    if (backendAtivo && pacote?.id) await window.VendasDb.deletePackage(pacote.id).catch(() => undefined);
    throw error;
  }
}

async function importarCatalogoTridiumPersistente() {
  const dados = dadosNovoPacote();
  if (!dados) return;
  try {
    const resposta = await fetch('/vendas-mobile/data/tridium-package.json');
    if (!resposta.ok) throw new Error('Catálogo Tridium indisponível.');
    const catalogo = await resposta.json();
    const produtos = (catalogo.produtos || []).map((produto) => ({ ...produto, imagem_url: String(produto.imagem_url || '').replace(/^\.\//, '/vendas-mobile/'), preco: Number(produto.preco || 0), preco_custo: Number(produto.preco_custo || 0), ativo: produto.status !== 'inativo' }));
    await salvarPacoteImportado({ nome: dados.nome || catalogo.nome, numero: dados.numero, origem: 'catalogo', produtos });
  } catch (error) { toast(traduzErro(error)); }
}

function carregarPacoteTridium() { abrirImportacaoPacote(); }

function abrirGerenciarPacotes() {
  const pacotes = state.pacotesProdutos;
  sheet(`<div class="sheet-header"><div><h2>Pacotes de produtos</h2><p class="muted small">Excluir um pacote remove todos os produtos que vieram dele.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="package-list">${pacotes.length ? pacotes.map((pacote) => { const quantidade = state.produtos.filter((produto) => produto.pacote_origem_id === pacote.id).length; return `<article><div><b>${escapeHtml(pacote.nome)}</b><small>Nº ${escapeHtml(pacote.numero || 'sem número')} · ${quantidade} produtos</small></div><button class="danger" onclick="excluirPacoteProdutos('${pacote.id}')">Excluir</button></article>`; }).join('') : '<p class="muted">Nenhum pacote importado.</p>'}</div>`, 'sheet-backdrop-centered');
}

async function excluirPacoteProdutos(pacoteId) {
  const pacote = state.pacotesProdutos.find((item) => item.id === pacoteId);
  if (!pacote) return;
  const quantidade = state.produtos.filter((produto) => produto.pacote_origem_id === pacoteId).length;
  if (!confirm(`Excluir o pacote “${pacote.nome}” e seus ${quantidade} produtos?`)) return;
  try {
    if (backendAtivo) await window.VendasDb.deletePackage(pacoteId);
    state.produtos = state.produtos.filter((produto) => produto.pacote_origem_id !== pacoteId);
    state.pacotesProdutos = state.pacotesProdutos.filter((item) => item.id !== pacoteId);
    fecharSheet(); salvarEstado(); render(); toast('Pacote e produtos excluídos.');
  } catch (error) { toast(traduzErro(error)); }
}

async function exportarProdutosExcel() {
  try {
    await carregarBibliotecaExcel();
    const linhas = state.produtos.map((produto) => ({
      marca: produto.marca || '', categoria: produto.categoria || '', sku: produto.sku || '', nome: produto.nome || '', descricao: produto.descricao || '',
      preco_custo: Number(produto.preco_custo || 0), preco_venda: Number(produto.preco || 0), estoque: produto.estoque ?? '', unidade: produto.unidade || 'un', imagem_url: produto.imagem_url || '',
    }));
    const aba = window.XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ marca: '', categoria: '', sku: '', nome: '', descricao: '', preco_custo: '', preco_venda: '', estoque: '', unidade: 'un', imagem_url: '' }]);
    aba['!cols'] = [18, 18, 16, 28, 36, 16, 16, 12, 12, 42].map((wch) => ({ wch }));
    const livro = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(livro, aba, 'Produtos');
    window.XLSX.writeFile(livro, `produtos-avantalab-${isoData(new Date())}.xlsx`);
  } catch (error) { toast(traduzErro(error)); }
}

function dataBackup(valorData) {
  if (!valorData) return '';
  const data = new Date(String(valorData).length === 10 ? `${valorData}T12:00:00` : valorData);
  return Number.isNaN(data.getTime()) ? String(valorData) : data.toLocaleDateString('pt-BR');
}

async function exportarBackupVendasExcel() {
  try {
    await carregarBibliotecaExcel();
    const clientesPorId = new Map(state.clientes.map((cliente) => [String(cliente.id), cliente]));
    const nomeCliente = (clienteId) => clientesPorId.get(String(clienteId || ''))?.nome || 'Cliente não identificado';
    const clientes = [...state.clientes]
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
      .map((cliente) => ({
        Cliente: cliente.nome || '', Telefone: cliente.telefone || '', Email: cliente.email || '', Documento: cliente.documento || '',
        CEP: cliente.cep || cliente.endereco?.cep || '', Logradouro: cliente.logradouro || cliente.endereco?.logradouro || '',
        Número: cliente.numero || cliente.endereco?.numero || '', Complemento: cliente.complemento || cliente.endereco?.complemento || '',
        Bairro: cliente.bairro || cliente.endereco?.bairro || '', Cidade: cliente.cidade || cliente.endereco?.cidade || '',
        UF: cliente.uf || cliente.endereco?.uf || '', Observações: cliente.observacoes || '',
        Situação: cliente.ativo === false ? 'Inativo' : 'Ativo', 'Cadastrado em': dataBackup(cliente.criado_em),
      }));
    const ordenarPorClienteEData = (a, b, campoData) => {
      const comparacaoCliente = nomeCliente(a.cliente_id).localeCompare(nomeCliente(b.cliente_id), 'pt-BR', { sensitivity: 'base' });
      return comparacaoCliente || String(b[campoData] || b.criado_em || '').localeCompare(String(a[campoData] || a.criado_em || ''));
    };
    const pedidosOrdenados = [...state.vendas].sort((a, b) => ordenarPorClienteEData(a, b, 'criado_em'));
    const pedidos = pedidosOrdenados.map((pedido) => ({
      Data: dataBackup(pedido.criado_em), Cliente: nomeCliente(pedido.cliente_id),
      Tipo: pedidoEhConsignado(pedido) ? 'Consignado' : (pedidoSomenteBonificado(pedido) ? 'Bonificação' : ((pedido.itens || []).some(itemPedidoBonificado) ? 'Venda com bonificação' : 'Venda')),
      Situação: pedido.status || '', Subtotal: Number(pedido.subtotal || 0), Desconto: Number(pedido.desconto || 0), Total: Number(pedido.total || 0),
      'Forma de pagamento': pedido.forma_pagamento || '', Observações: pedido.observacoes || '', 'Código do pedido': pedido.id || '',
    }));
    const itens = pedidosOrdenados.flatMap((pedido) => (pedido.itens || []).map((item) => ({
      Data: dataBackup(pedido.criado_em), Cliente: nomeCliente(pedido.cliente_id), 'Código do pedido': pedido.id || '',
      Item: item.produto_nome || '', SKU: item.produto_sku || '', Quantidade: Number(item.quantidade || 0),
      Bonificado: itemPedidoBonificado(item) ? 'Sim' : 'Não', 'Valor unitário': Number(item.preco_unitario || 0), Desconto: Number(item.desconto || 0), Total: Number(item.total || 0),
    })));
    const pagamentos = [...state.pagamentos]
      .sort((a, b) => ordenarPorClienteEData(a, b, 'data_pagamento'))
      .map((pagamento) => ({
        Data: dataBackup(pagamento.data_pagamento || pagamento.criado_em), Cliente: nomeCliente(pagamento.cliente_id),
        Valor: Number(pagamento.valor || 0), Desconto: Number(pagamento.desconto || 0), 'Forma de pagamento': pagamento.forma_pagamento || '',
        'Saldo anterior': Number(pagamento.saldo_anterior || 0), 'Saldo final': Number(pagamento.saldo_final || 0),
        Observações: pagamento.observacoes || '', 'Código do pagamento': pagamento.id || '',
      }));
    const agenda = [...(state.agendaItens || [])]
      .sort((a, b) => `${a.ano}-${String(Number(a.mes) + 1).padStart(2, '0')}-${String(a.dia).padStart(2, '0')}`.localeCompare(`${b.ano}-${String(Number(b.mes) + 1).padStart(2, '0')}-${String(b.dia).padStart(2, '0')}`))
      .map((item) => ({
        Data: dataBackup(`${item.ano}-${String(Number(item.mes) + 1).padStart(2, '0')}-${String(item.dia).padStart(2, '0')}`),
        Cliente: item.titulo || '', Tarefa: item.tipo || '', Notas: item.descricao || '',
      }));
    const livro = window.XLSX.utils.book_new();
    const adicionarAba = (nome, linhas, larguras) => {
      const aba = window.XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ Informação: 'Nenhum registro encontrado.' }]);
      aba['!cols'] = larguras.map((wch) => ({ wch }));
      window.XLSX.utils.book_append_sheet(livro, aba, nome);
    };
    adicionarAba('Clientes', clientes, [28, 18, 28, 18, 12, 30, 10, 20, 20, 20, 8, 36, 12, 14]);
    adicionarAba('Pedidos', pedidos, [12, 28, 16, 14, 14, 14, 14, 20, 36, 38]);
    adicionarAba('Itens dos pedidos', itens, [12, 28, 38, 30, 16, 12, 12, 16, 14, 14]);
    adicionarAba('Pagamentos', pagamentos, [12, 28, 14, 14, 20, 16, 16, 36, 38]);
    adicionarAba('Agenda', agenda, [12, 28, 18, 40]);
    window.XLSX.writeFile(livro, `backup-vendas-mobile-${isoData(new Date())}.xlsx`);
    toast('Backup gerado com sucesso.');
  } catch (error) { toast(traduzErro(error)); }
}

function abrirProduto(produtoId = '') {
  const p = state.produtos.find((item) => item.id === produtoId) || {};
  if (produtoImagemUploadPendente?.previewUrl) URL.revokeObjectURL(produtoImagemUploadPendente.previewUrl);
  produtoImagemUploadPendente = null;
  sheet(`
    <div class="sheet-header">
      <div>
        <h2>${produtoId ? 'Editar produto' : 'Novo produto'}</h2>
        <p class="muted small">Cadastro simples inspirado no catálogo Tridium.</p>
      </div>
      <button class="close" onclick="fecharSheet()">×</button>
    </div>
    <div class="grid client-form">
      ${campo('prodNome', 'Nome', p.nome || '')}
      <div class="grid-2">
        ${campo('prodMarca', 'Marca', p.marca || '')}
        ${campo('prodCategoria', 'Categoria', p.categoria || '')}
      </div>
      <div class="grid-2">
        ${campo('prodSku', 'SKU', p.sku || '')}
        ${campo('prodUnidade', 'Unidade', p.unidade || 'un')}
      </div>
      <div class="grid-2">
        ${campoMoeda('prodCusto', 'Preço de custo', p.preco_custo || 0)}
        ${campoMoeda('prodPreco', 'Preço de venda', p.preco || 0)}
      </div>
      ${campo('prodEstoque', 'Estoque', p.estoque ?? '', 'number', '0.001')}
      ${campo('prodImagem', 'Link da imagem (opcional)', p.imagem_url || '', 'url')}
      <div class="product-upload-field">
        <div><b>Enviar imagem</b><small>Use JPG, PNG ou WEBP. Padrão recomendado: 720 × 405 px (16:9), até 5 MB. A imagem será ajustada automaticamente.</small></div>
        <input id="prodImagemArquivo" type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="prepararImagemProduto(this)">
        <button type="button" class="secondary" onclick="document.getElementById('prodImagemArquivo').click()">${svgIcon('folder')} Escolher imagem</button>
        <span id="prodImagemArquivoNome">Nenhum arquivo selecionado</span>
        <img id="prodImagemPreview" class="product-upload-preview" ${p.imagem_url ? `src="${escapeAttr(p.imagem_url)}"` : 'hidden'} alt="Prévia da imagem do produto">
      </div>
      <div class="field"><label>Descrição</label><textarea id="prodDescricao">${escapeHtml(p.descricao || '')}</textarea></div>
      <div class="actions">
        <button class="ghost" onclick="fecharSheet()">Cancelar</button>
        <button class="primary" onclick="salvarProduto('${produtoId}')">Salvar</button>
        ${produtoId ? `<button class="danger" onclick="removerProduto('${produtoId}')">Remover</button>` : ''}
      </div>
    </div>
  `, 'cliente-sheet-backdrop');
}

function normalizarImagemProduto(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 405;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Não foi possível preparar a imagem.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const escala = Math.min(canvas.width / imagem.naturalWidth, canvas.height / imagem.naturalHeight);
        const largura = Math.round(imagem.naturalWidth * escala);
        const altura = Math.round(imagem.naturalHeight * escala);
        ctx.drawImage(imagem, Math.round((canvas.width - largura) / 2), Math.round((canvas.height - altura) / 2), largura, altura);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Não foi possível converter a imagem.'));
        }, 'image/webp', .84);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    imagem.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Arquivo de imagem inválido.')); };
    imagem.src = url;
  });
}

async function prepararImagemProduto(input) {
  const arquivo = input?.files?.[0];
  if (!arquivo) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) { input.value = ''; toast('Use uma imagem JPG, PNG ou WEBP.'); return; }
  if (arquivo.size > 5 * 1024 * 1024) { input.value = ''; toast('A imagem deve ter no máximo 5 MB.'); return; }
  try {
    const blob = await normalizarImagemProduto(arquivo);
    if (produtoImagemUploadPendente?.previewUrl) URL.revokeObjectURL(produtoImagemUploadPendente.previewUrl);
    const previewUrl = URL.createObjectURL(blob);
    produtoImagemUploadPendente = { blob, previewUrl, nome: arquivo.name };
    const nome = document.getElementById('prodImagemArquivoNome');
    const preview = document.getElementById('prodImagemPreview');
    if (nome) nome.textContent = `${arquivo.name} · imagem ajustada para 720 × 405 px`;
    if (preview) { preview.src = previewUrl; preview.hidden = false; }
  } catch (error) { input.value = ''; toast(traduzErro(error)); }
}

function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result || ''));
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    leitor.readAsDataURL(blob);
  });
}

async function salvarProduto(produtoId) {
  const dados = {
    nome: valor('prodNome').trim(),
    marca: valor('prodMarca').trim(),
    categoria: valor('prodCategoria').trim(),
    sku: valor('prodSku').trim(),
    unidade: valor('prodUnidade').trim() || 'un',
    preco: lerCampoMoeda('prodPreco'),
    preco_custo: lerCampoMoeda('prodCusto'),
    estoque: valor('prodEstoque') ? Number(valor('prodEstoque')) : null,
    imagem_url: valor('prodImagem').trim(),
    descricao: valor('prodDescricao').trim(),
    ativo: true,
  };
  if (!dados.nome || !dados.preco) {
    toast('Informe nome e preço do produto.');
    return;
  }
  try {
    if (produtoImagemUploadPendente?.blob) {
      dados.imagem_url = backendAtivo
        ? await window.VendasDb.uploadProductImage(produtoImagemUploadPendente.blob, produtoId || null)
        : await blobParaDataUrl(produtoImagemUploadPendente.blob);
    }
    if (backendAtivo) {
      const salvoBruto = await window.VendasDb.saveProduct({ id: produtoId || null, ...dados, metadados: state.produtos.find((produto) => produto.id === produtoId)?.metadados || {} });
      const salvo = { ...salvoBruto, preco_custo: Number(salvoBruto.preco_custo ?? salvoBruto.metadados?.preco_custo ?? 0), pacote_origem_id: salvoBruto.pacote_origem_id ?? salvoBruto.metadados?.pacote?.id ?? null };
      state.produtos = produtoId ? state.produtos.map((p) => p.id === produtoId ? salvo : p) : [salvo, ...state.produtos];
    } else if (produtoId) state.produtos = state.produtos.map((p) => p.id === produtoId ? { ...p, ...dados, atualizado_em: new Date().toISOString() } : p);
    else state.produtos.unshift({ id: id('prod'), ...dados, criado_em: new Date().toISOString() });
    if (produtoImagemUploadPendente?.previewUrl) URL.revokeObjectURL(produtoImagemUploadPendente.previewUrl);
    produtoImagemUploadPendente = null;
    fecharSheet(); toast('Produto salvo.'); render();
  } catch (error) { toast(traduzErro(error)); }
}

async function removerProduto(produtoId) {
  if (!confirm('Remover este produto?')) return;
  try {
    if (backendAtivo) await window.VendasDb.deleteProduct(produtoId);
    state.produtos = state.produtos.filter((p) => p.id !== produtoId);
    fecharSheet(); toast('Produto removido.'); render();
  } catch (error) { toast(traduzErro(error)); }
}

function abrirCliente(clienteId = '') {
  const c = state.clientes.find((item) => item.id === clienteId) || {};
  clientePersistenciaIdAtual = clienteId || uuidPersistenciaVendas();
  sheet(`
    <div class="sheet-header">
      <div>
        <h2>${clienteId ? 'Editar' : 'Novo cliente'}</h2>
        ${clienteId ? `<p class="client-editing-name">Cliente: ${escapeHtml(c.nome || 'Sem nome')}</p>` : ''}
      </div>
      <button class="close" onclick="fecharSheet()">×</button>
    </div>
    <div class="grid client-form">
      ${campo('cliNome', 'Nome', c.nome || '')}
      ${campoTelefone('cliTelefone', 'Telefone / WhatsApp', c.telefone || '')}
      ${campo('cliEmail', 'E-mail', c.email || '', 'email')}
      <div class="field client-birth-field"><label>Data de nascimento</label><div class="client-birth-control"><input id="cliNascimento" type="text" inputmode="numeric" maxlength="5" autocomplete="bday" placeholder="dd/mm" value="${escapeAttr(dataNascimentoParaCampo(c.data_nascimento))}" oninput="formatarDataNascimentoCampo(this)"></div></div>
      ${campoCepCliente(c.cep || '')}
      ${campo('cliEndereco', 'Endereço', c.endereco || '')}
      <div class="grid-2 client-address-extra">
        ${campo('cliNumero', 'Número', c.numero || '')}
        ${campo('cliComplemento', 'Complemento', c.complemento || '')}
      </div>
      <div class="grid-2 client-city-state">
        ${campo('cliCidade', 'Cidade', c.cidade || '')}
        <div class="field"><label>Estado</label><select id="cliEstado"><option value="">UF</option>${UFS_BRASIL.map(([uf]) => `<option value="${uf}" ${c.estado === uf ? 'selected' : ''}>${uf}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Observações</label><textarea id="cliObs">${escapeHtml(c.observacoes || '')}</textarea></div>
      <div class="actions">
        <button class="ghost" onclick="fecharSheet()">Cancelar</button>
        <button class="primary" onclick="salvarCliente('${clienteId}')">Salvar</button>
        ${clienteId ? `<button class="danger" onclick="removerCliente('${clienteId}')">Remover</button>` : ''}
      </div>
    </div>
  `, 'cliente-sheet-backdrop sheet-backdrop-centered');
}

function fecharAvisoClienteIncompleto(campoFoco = '') {
  document.getElementById('clientIncompleteWarning')?.remove();
  if (campoFoco) document.getElementById(campoFoco)?.focus();
}

function mostrarAvisoClienteIncompleto(clienteId, semTelefone, semEndereco) {
  document.getElementById('clientIncompleteWarning')?.remove();
  const sheetAtual = document.querySelector('#sheetBackdrop .sheet');
  if (!sheetAtual) return;
  const faltas = [semTelefone ? 'o celular permite iniciar conversas pelo WhatsApp' : '', semEndereco ? 'o endereço permite abrir a localização nos aplicativos de mapas' : ''].filter(Boolean);
  const aviso = document.createElement('div');
  aviso.id = 'clientIncompleteWarning';
  aviso.className = 'client-incomplete-warning';
  aviso.innerHTML = `<section><span>${svgIcon('info')}</span><h3>Completar dados do cliente?</h3><p>Somente o nome é obrigatório, mas ${faltas.join(' e ')} diretamente pela ficha do cliente.</p><div><button type="button" class="ghost" onclick="fecharAvisoClienteIncompleto('${semTelefone ? 'cliTelefone' : 'cliEndereco'}')">Cancelar e completar</button><button type="button" class="primary" onclick="fecharAvisoClienteIncompleto();salvarCliente('${escapeAttr(clienteId)}',true)">Continuar mesmo assim</button></div></section>`;
  sheetAtual.appendChild(aviso);
}

async function salvarCliente(clienteId, ignorarAviso = false) {
  const dataNascimento = dataNascimentoParaIso(valor('cliNascimento'));
  if (dataNascimento === undefined) { toast('Informe a data de nascimento no formato dd/mm.'); return; }
  const dados = {
    id: clienteId || clientePersistenciaIdAtual || uuidPersistenciaVendas(),
    nome: valor('cliNome').trim(),
    telefone: valor('cliTelefone').trim() ? `+${valor('cliTelefoneDdi')}${valor('cliTelefone').replace(/\D/g, '')}` : '',
    email: valor('cliEmail').trim(),
    data_nascimento: dataNascimento,
    endereco: valor('cliEndereco').trim(),
    numero: valor('cliNumero').trim(),
    complemento: valor('cliComplemento').trim(),
    cidade: valor('cliCidade').trim(),
    estado: valor('cliEstado').trim(),
    cep: valor('cliCep').trim(),
    observacoes: valor('cliObs').trim(),
  };
  if (!dados.nome) {
    toast('Informe o nome do cliente.');
    return;
  }
  if (dados.email && !emailValido(dados.email)) {
    toast('Informe um e-mail válido ou deixe o campo em branco.');
    return;
  }
  const semTelefone = !dados.telefone;
  const semEndereco = !dados.endereco;
  if (!clienteId && !ignorarAviso && (semTelefone || semEndereco)) {
    mostrarAvisoClienteIncompleto(clienteId, semTelefone, semEndereco);
    return;
  }
  iniciarMutacaoDadosVendas();
  try {
    if (backendAtivo) {
      const salvo = await executarMutacaoGarantidaVendas('cliente_salvar', dados.id, dados, () => window.VendasDb.saveClient(dados));
      state.clientes = clienteId ? state.clientes.map((c) => c.id === clienteId ? salvo : c) : [salvo, ...state.clientes];
    } else if (clienteId) state.clientes = state.clientes.map((c) => c.id === clienteId ? { ...c, ...dados, atualizado_em: new Date().toISOString() } : c);
    else state.clientes.unshift({ id: id('cli'), ...dados, criado_em: new Date().toISOString() });
    await confirmarMutacaoDadosVendas();
    fecharSheet(); toast('Cliente salvo.'); render();
  } catch (error) {
    toast(traduzErro(error));
  } finally {
    finalizarMutacaoDadosVendas();
  }
}

async function removerCliente(clienteId) {
  if (!confirm('Remover este cliente? As vendas antigas continuarão registradas.')) return;
  iniciarMutacaoDadosVendas();
  try {
    if (backendAtivo) {
      await executarMutacaoGarantidaVendas('cliente_excluir', clienteId, { id: clienteId }, () => window.VendasDb.deleteClient(clienteId));
    }
    state.clientes = state.clientes.filter((c) => c.id !== clienteId);
    await confirmarMutacaoDadosVendas();
    fecharSheet(); toast('Cliente removido.'); render();
  } catch (error) {
    toast(traduzErro(error));
  } finally {
    finalizarMutacaoDadosVendas();
  }
}

function adicionarCarrinho(produtoId) {
  const p = state.produtos.find((item) => item.id === produtoId);
  if (!p) return;
  const existente = state.carrinho.find((item) => item.produto_id === produtoId);
  const preco = Number(p.preco || 0);
  if (existente) existente.quantidade += 1;
  else state.carrinho.push({ produto_id: p.id, produto_nome: p.nome, produto_sku: p.sku, quantidade: 1, preco });
  toast(`${p.nome} adicionado.`);
  render();
}

function alterarQtd(produtoId, delta) {
  state.carrinho = state.carrinho.map((item) => item.produto_id === produtoId ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item);
  abrirCarrinho();
}

function removerCarrinho(produtoId) {
  state.carrinho = state.carrinho.filter((item) => item.produto_id !== produtoId);
  abrirCarrinho();
}

function abrirCarrinho() {
  const subtotal = state.carrinho.reduce((s, item) => s + item.quantidade * item.preco, 0);
  sheet(`
    <div class="sheet-header">
      <div>
        <h2>Carrinho</h2>
        <p class="muted small">Finalize a venda sem emissão fiscal.</p>
      </div>
      <button class="close" onclick="fecharSheet()">×</button>
    </div>
    <div class="grid">
      ${state.carrinho.length ? state.carrinho.map(renderItemCarrinho).join('') : empty('Carrinho vazio.')}
      <div class="divider"></div>
      <div class="field">
        <label>Cliente</label>
        <select id="vendaCliente">
          <option value="">Cliente não informado</option>
          ${state.clientes.map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('')}
        </select>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Desconto</label>
          <input id="vendaDesconto" type="text" inputmode="numeric" value="0,00" onfocus="this.select()" oninput="formatarCampoMoeda(this);atualizarTotalCarrinho()" />
        </div>
        <div class="field">
          <label>Pagamento</label>
          <select id="vendaPagamento">
            <option>Dinheiro</option>
            <option>Pix</option>
            <option>Cartão</option>
            <option>A prazo</option>
            <option>Consignado</option>
            <option>Não informado</option>
          </select>
        </div>
      </div>
    </div>
    <div class="cart-total">
      <div class="cart-total-row"><span>Total</span><strong id="carrinhoTotal">${moeda(subtotal)}</strong></div>
      <button class="primary" style="width:100%;margin-top:12px;background:white;color:#003E73" onclick="finalizarVenda()">Finalizar venda</button>
    </div>
  `);
}

function renderItemCarrinho(item) {
  return `
    <article class="row">
      <div class="row-main">
        <p class="row-title">${escapeHtml(item.produto_nome)}</p>
        <p class="row-sub">${moeda(item.preco)} · ${item.quantidade} un.</p>
      </div>
      <div class="actions" style="flex:0 0 auto">
        <button class="ghost" onclick="alterarQtd('${item.produto_id}', -1)">−</button>
        <button class="ghost" onclick="alterarQtd('${item.produto_id}', 1)">+</button>
        <button class="danger" onclick="removerCarrinho('${item.produto_id}')">×</button>
      </div>
    </article>
  `;
}

function atualizarTotalCarrinho() {
  const subtotal = state.carrinho.reduce((s, item) => s + item.quantidade * item.preco, 0);
  const desconto = lerCampoMoeda('vendaDesconto');
  const total = Math.max(0, subtotal - desconto);
  const el = document.getElementById('carrinhoTotal');
  if (el) el.textContent = moeda(total);
}

async function finalizarVenda() {
  if (!state.carrinho.length) {
    toast('Adicione produtos ao carrinho.');
    return;
  }
  const subtotal = state.carrinho.reduce((s, item) => s + item.quantidade * item.preco, 0);
  const desconto = lerCampoMoeda('vendaDesconto');
  const total = Math.max(0, subtotal - desconto);
  const venda = {
    id: uuidPersistenciaVendas(),
    cliente_id: valor('vendaCliente') || null,
    status: 'concluida',
    subtotal,
    desconto,
    total,
    forma_pagamento: valor('vendaPagamento'),
    itens: state.carrinho.map((item) => ({ ...item, total: item.quantidade * item.preco })),
    criado_em: new Date().toISOString(),
  };
  iniciarMutacaoDadosVendas();
  try {
    const salva = backendAtivo
      ? await executarMutacaoGarantidaVendas('pedido_salvar', venda.id, { novo: true, pedido: venda }, () => window.VendasDb.saveOrder(venda))
      : venda;
    state.vendas.unshift(salva);
    state.carrinho = [];
    await confirmarMutacaoDadosVendas();
    fecharSheet(); state.aba = 'vendas'; toast('Venda registrada com sucesso.'); render();
  } catch (error) {
    toast(traduzErro(error));
  } finally {
    finalizarMutacaoDadosVendas();
  }
}

function importarCsv() {
  const texto = valor('csvInput').trim();
  if (!texto) {
    toast('Cole o CSV antes de importar.');
    return;
  }
  const linhas = texto.split(/\r?\n/).filter(Boolean);
  const cabecalho = linhas.shift().split(',').map((h) => normalizar(h.trim()));
  const idx = (nome) => cabecalho.indexOf(nome);
  let ok = 0;
  let erro = 0;
  linhas.forEach((linha) => {
    const cols = linha.split(',').map((c) => c.trim());
    const nome = cols[idx('nome')];
    const preco = Number(String(cols[idx('preco')] || '').replace(',', '.'));
    if (!nome || !preco) {
      erro++;
      return;
    }
    state.produtos.unshift({
      id: id('prod'),
      marca: cols[idx('marca')] || '',
      categoria: cols[idx('categoria')] || '',
      sku: cols[idx('sku')] || '',
      nome,
      descricao: cols[idx('descricao')] || '',
      preco,
      estoque: cols[idx('estoque')] ? Number(String(cols[idx('estoque')]).replace(',', '.')) : null,
      unidade: cols[idx('unidade')] || 'un',
      ativo: normalizar(cols[idx('ativo')]) !== 'nao',
      criado_em: new Date().toISOString(),
    });
    ok++;
  });
  toast(`${ok} produtos importados. ${erro ? `${erro} linhas com erro.` : ''}`);
  state.aba = 'produtos';
  render();
}

function baixarModeloCsv() {
  const conteudo = 'marca,categoria,sku,nome,descricao,preco,estoque,unidade,ativo\nMinha Marca,Categoria,SKU-001,Produto Exemplo,Descricao do produto,49.90,10,un,sim\n';
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_produtos_vendas_mobile.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function abrirAtualizarEstoque() {
  if (!state.produtos.length) { toast('Cadastre ou importe um produto antes de atualizar o estoque.'); return; }
  estoqueProdutoAtualId = estoqueProdutoAtualId && state.produtos.some((produto) => produto.id === estoqueProdutoAtualId)
    ? estoqueProdutoAtualId : state.produtos[0].id;
  estoqueMovimentosAtuais = [];
  renderAtualizarEstoque();
  void carregarMovimentosEstoque();
}

async function carregarMovimentosEstoque() {
  if (!backendAtivo || !estoqueProdutoAtualId) return;
  try {
    estoqueMovimentosAtuais = await window.VendasDb.listarMovimentosEstoque(estoqueProdutoAtualId);
    renderAtualizarEstoque();
  } catch (error) { console.warn('Não foi possível carregar o histórico de estoque.', error); }
}

function selecionarProdutoEstoque(produtoId) {
  estoqueProdutoAtualId = produtoId;
  estoqueMovimentosAtuais = [];
  renderAtualizarEstoque();
  void carregarMovimentosEstoque();
}

function renderAtualizarEstoque() {
  const produto = state.produtos.find((item) => item.id === estoqueProdutoAtualId) || state.produtos[0];
  if (!produto) return;
  const saldo = Number(produto.estoque || 0);
  const opcoes = [...state.produtos].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
    .map((item) => `<option value="${escapeAttr(item.id)}" ${item.id === produto.id ? 'selected' : ''}>${escapeHtml(item.nome)} · ${Number(item.estoque || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${escapeHtml(item.unidade || 'un')}</option>`).join('');
  const historico = estoqueMovimentosAtuais.length
    ? estoqueMovimentosAtuais.map((movimento) => `<li><b>${escapeHtml(String(movimento.tipo || '').replace('_', ' '))}</b><span>${Number(movimento.quantidade || 0) > 0 ? '+' : ''}${Number(movimento.quantidade || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} · saldo ${Number(movimento.saldo_final || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span><small>${dataCurtaBR(movimento.criado_em)}</small></li>`).join('')
    : '<p class="muted small">Nenhuma movimentação registrada para este produto.</p>';
  sheet(`<div class="sheet-header"><div><h2>Atualizar estoque</h2><p class="muted small">Entrada soma ao saldo. Ajuste informa a contagem física final.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="grid stock-update-form"><div class="field"><label>Produto</label><select onchange="selecionarProdutoEstoque(this.value)">${opcoes}</select></div><article class="stock-current"><span>Saldo atual</span><b>${saldo.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${escapeHtml(produto.unidade || 'un')}</b></article>${produto.estoque_controlado ? `<div class="field"><label>Operação</label><select id="estoqueTipo"><option value="entrada">Entrada de estoque</option><option value="ajuste">Ajustar saldo físico</option></select></div><div class="field"><label>Quantidade</label><input id="estoqueQuantidade" type="number" min="0" step="0.001" inputmode="decimal" placeholder="0"></div><div class="field"><label>Observação (opcional)</label><input id="estoqueObservacao" maxlength="160" placeholder="Ex.: reposição do fornecedor"></div><button class="primary" onclick="salvarMovimentacaoEstoque()">${svgIcon('save')} Salvar movimentação</button>` : `<article class="stock-control-note"><b>Controle de estoque desativado</b><p>Ative para registrar entradas e ajustes deste produto. O saldo inicial será ${saldo.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}.</p><button class="primary" onclick="ativarControleEstoque('${escapeAttr(produto.id)}')">Ativar controle deste produto</button></article>`}<section class="stock-history"><h3>Últimas movimentações</h3><ul>${historico}</ul></section></div>`, 'sheet-backdrop-centered');
}

async function ativarControleEstoque(produtoId) {
  const produto = state.produtos.find((item) => item.id === produtoId);
  if (!produto) return;
  try {
    const salvo = backendAtivo ? await window.VendasDb.saveProduct({ ...produto, estoque_controlado: true, estoque: produto.estoque ?? 0 }) : { ...produto, estoque_controlado: true, estoque: produto.estoque ?? 0 };
    state.produtos = state.produtos.map((item) => item.id === produtoId ? { ...item, ...salvo, estoque_controlado: true } : item);
    salvarEstado(); renderAtualizarEstoque(); toast('Controle de estoque ativado.');
  } catch (error) { toast(traduzErro(error)); }
}

async function salvarMovimentacaoEstoque() {
  const produto = state.produtos.find((item) => item.id === estoqueProdutoAtualId);
  if (!produto || !produto.estoque_controlado) return;
  const tipo = valor('estoqueTipo');
  const quantidade = Number(String(valor('estoqueQuantidade')).replace(',', '.'));
  if (!Number.isFinite(quantidade) || (tipo === 'entrada' ? quantidade <= 0 : quantidade < 0)) { toast(tipo === 'entrada' ? 'Informe uma entrada maior que zero.' : 'Informe o saldo físico final.'); return; }
  try {
    const resultado = backendAtivo
      ? await window.VendasDb.movimentarEstoque({ produtoId: produto.id, tipo, quantidade, observacao: valor('estoqueObservacao').trim() })
      : { saldo_final: tipo === 'entrada' ? Number(produto.estoque || 0) + quantidade : quantidade };
    state.produtos = state.produtos.map((item) => item.id === produto.id ? { ...item, estoque: Number(resultado.saldo_final) } : item);
    salvarEstado(); toast(tipo === 'entrada' ? 'Entrada de estoque registrada.' : 'Saldo de estoque ajustado.');
    estoqueMovimentosAtuais = [];
    renderAtualizarEstoque();
    void carregarMovimentosEstoque();
  } catch (error) { toast(traduzErro(error)); }
}

function abrirGestao(perfilEmpresaId = '') {
  if (!podeTrocarParaGestaoVendas()) {
    toast('A troca de sistemas não está disponível para este usuário.');
    return;
  }
  const empresaId = perfilEmpresaId || state.acessoVendas?.empresa_id || '';
  try {
    localStorage.setItem('avantalab_mobile_sistema_contexto', JSON.stringify({ empresaId, sistema: 'gestao', atualizadoEm: new Date().toISOString() }));
    if (empresaId) sessionStorage.setItem(`avantalab_mobile_sistema_sessao_${empresaId}`, 'gestao');
    if (empresaId) localStorage.setItem('avantalab_mobile_ultimo_perfil_id', empresaId);
  } catch { /* navegação continua sem preferência local */ }
  window.location.assign('/mobile');
}

async function abrirSeletorPerfilGestaoVendas() {
  if (!podeTrocarParaGestaoVendas()) {
    toast('A troca de sistemas não está disponível para este usuário.');
    return;
  }
  state.seletorPerfilGestaoAberto = true;
  state.perfisGestaoTrocaCarregando = true;
  state.perfisGestaoTrocaErro = '';
  state.perfilGestaoConfirmacao = null;
  render();
  try {
    state.perfisGestaoTroca = await window.VendasDb.listarPerfisGestaoParaTroca();
  } catch (error) {
    state.perfisGestaoTroca = [];
    state.perfisGestaoTrocaErro = traduzErro(error);
  } finally {
    state.perfisGestaoTrocaCarregando = false;
    render();
  }
}

function fecharSeletorPerfilGestaoVendas() {
  state.seletorPerfilGestaoAberto = false;
  state.perfilGestaoConfirmacao = null;
  render();
}

function selecionarPerfilGestaoVendas(empresaId) {
  const perfil = (state.perfisGestaoTroca || []).find((item) => item.empresa_id === empresaId);
  if (!perfil) return;
  state.perfilGestaoConfirmacao = perfil;
  render();
}

function voltarListaPerfisGestaoVendas() {
  state.perfilGestaoConfirmacao = null;
  render();
}

function confirmarPerfilGestaoVendas() {
  const perfil = state.perfilGestaoConfirmacao;
  if (!perfil?.empresa_id) return;
  state.seletorPerfilGestaoAberto = false;
  state.perfilGestaoConfirmacao = null;
  carregandoBackend = true;
  render();
  window.setTimeout(() => abrirGestao(perfil.empresa_id), 60);
}

function rotuloPapelPerfilGestaoVendas(perfil) {
  return {
    gestor_master: 'Gestor Master',
    administrador: 'Administrador',
    operador_completo: 'Operador completo',
    operador_simples: 'Operador simples',
  }[perfil] || 'Usuário';
}

function renderSeletorPerfilGestaoVendas() {
  const confirmacao = state.perfilGestaoConfirmacao;
  if (confirmacao) {
    return `<section class="login-screen management-profile-selector-screen"><article class="management-profile-selector-card"><header><small>Troca de sistema</small><h2>Confirmar perfil</h2><p>A Gestão será aberta no perfil selecionado.</p></header><div class="management-profile-confirmation"><span>${svgIconEstavel(confirmacao.tipo_perfil === 'pessoal' ? 'user' : 'folder')}</span><h3>${escapeHtml(confirmacao.empresa_nome || 'Perfil')}</h3><p>${escapeHtml(rotuloPapelPerfilGestaoVendas(confirmacao.perfil))}</p><button class="secondary" type="button" onclick="voltarListaPerfisGestaoVendas()">Voltar aos perfis</button><button class="primary" type="button" onclick="confirmarPerfilGestaoVendas()">Abrir Gestão Mobile</button></div></article></section>`;
  }
  const conteudo = state.perfisGestaoTrocaCarregando
    ? `<div class="management-profile-loading"><span class="loader"></span><b>Carregando perfis...</b></div>`
    : state.perfisGestaoTrocaErro
      ? `<div class="management-profile-empty"><p>${escapeHtml(state.perfisGestaoTrocaErro)}</p><button class="secondary" type="button" onclick="abrirSeletorPerfilGestaoVendas()">Tentar novamente</button></div>`
      : (state.perfisGestaoTroca || []).length
        ? `<div class="management-profile-list">${state.perfisGestaoTroca.map((perfil) => `<button type="button" onclick="selecionarPerfilGestaoVendas('${escapeAttr(perfil.empresa_id)}')"><span>${svgIconEstavel(perfil.tipo_perfil === 'pessoal' ? 'user' : 'folder')}</span><b>${escapeHtml(perfil.empresa_nome || 'Perfil')}<small>${escapeHtml(rotuloPapelPerfilGestaoVendas(perfil.perfil))}</small></b><i>›</i></button>`).join('')}</div>`
        : `<div class="management-profile-empty"><p>Nenhum perfil ativo da Gestão está vinculado a esta conta.</p></div>`;
  return `<section class="login-screen management-profile-selector-screen"><article class="management-profile-selector-card"><header><div><small>Gestão Mobile</small><h2>Selecione o perfil</h2><p>Escolha em qual perfil deseja entrar.</p></div><button type="button" onclick="fecharSeletorPerfilGestaoVendas()" aria-label="Voltar ao Vendas">×</button></header>${conteudo}</article></section>`;
}

function abrirConfiguracoes() {
  sheet(`
    <div class="sheet-header">
      <div>
        <h2>Configurações</h2>
        <p class="muted small">Protótipo local do Vendas Mobile.</p>
      </div>
      <button class="close" onclick="fecharSheet()">×</button>
    </div>
    <div class="grid">
      ${campo('cfgNome', 'Nome do vendedor', state.usuario.nome || '')}
      <button class="primary" onclick="salvarConfiguracoes()">Salvar</button>
      <button class="danger" onclick="resetarDados()">Apagar dados locais</button>
      <button class="danger settings-exit" onclick="abrirConfirmacaoSair()">${svgIcon('log-out')} Sair do Vendas</button>
    </div>
  `);
}

function abrirConfirmacaoSair() {
  sheet(`<div class="sheet-header"><div><h2>Sair do Vendas</h2><p class="muted small">Você precisará entrar novamente para acessar seus dados.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="grid"><button class="danger" onclick="fecharSheet();sairSistema()">Confirmar saída</button><button class="ghost" onclick="fecharSheet()">Cancelar</button></div>`, 'sheet-backdrop-centered');
}

function salvarConfiguracoes() {
  state.usuario.nome = valor('cfgNome').trim() || 'Vendedor Autônomo';
  fecharSheet();
  toast('Configurações salvas.');
  render();
}

function resetarDados() {
  if (!confirm('Apagar todos os dados locais deste protótipo?')) return;
  void limparCacheVendas(undefined, undefined, true);
  localStorage.removeItem(STORAGE_KEY);
  state = { ...estadoInicial };
  fecharSheet();
  toast('Dados locais apagados.');
  render();
}

function produtoMaisVendido() {
  const mapa = new Map();
  state.vendas.filter((v) => v.status !== 'cancelada' && !pedidoEhConsignado(v) && !pedidoSomenteBonificado(v)).forEach((v) => {
    v.itens.forEach((i) => {
      const atual = mapa.get(i.produto_id) || { nome: i.produto_nome, qtd: 0 };
      atual.qtd += Number(i.quantidade || 0);
      mapa.set(i.produto_id, atual);
    });
  });
  return [...mapa.values()].sort((a, b) => b.qtd - a.qtd)[0] || null;
}

function clienteMaisCompra() {
  const mapa = new Map();
  state.vendas.filter((v) => v.status !== 'cancelada' && !pedidoEhConsignado(v) && !pedidoSomenteBonificado(v) && v.cliente_id).forEach((v) => {
    const cliente = state.clientes.find((c) => c.id === v.cliente_id);
    const atual = mapa.get(v.cliente_id) || { nome: cliente?.nome || 'Cliente', total: 0 };
    atual.total += Number(v.total || 0);
    mapa.set(v.cliente_id, atual);
  });
  return [...mapa.values()].sort((a, b) => b.total - a.total)[0] || null;
}

function campo(idCampo, label, value = '', type = 'text', step = '') {
  return `
    <div class="field">
      <label>${label}</label>
      <input id="${idCampo}" type="${type}" ${step ? `step="${step}"` : ''} value="${escapeAttr(value)}" />
    </div>
  `;
}

function campoMoeda(idCampo, label, value = 0) {
  return `
    <div class="field">
      <label>${label}</label>
      <input id="${idCampo}" type="text" inputmode="numeric" value="${escapeAttr(numeroParaCampoMoeda(value))}" onfocus="this.select()" oninput="formatarCampoMoeda(this)" />
    </div>
  `;
}

function valor(idCampo) {
  return document.getElementById(idCampo)?.value || '';
}

function sheet(html, backdropClass = '') {
  fecharSheet();
  rolagemAnteriorSheet = window.scrollY || document.documentElement.scrollTop || 0;
  const wrap = document.createElement('div');
  wrap.className = `sheet-backdrop ${backdropClass}`;
  wrap.id = 'sheetBackdrop';
  if (backdropClass.includes('client-transaction-backdrop') || backdropClass.includes('consignment-')) {
    const alturaViewport = Math.round(window.visualViewport?.height || window.innerHeight);
    if (Number.isFinite(alturaViewport) && alturaViewport > 0) {
      wrap.style.setProperty('--transaction-viewport-height', `${alturaViewport}px`);
    }
  }
  wrap.innerHTML = `<section class="sheet">${html}</section>`;
  wrap.querySelectorAll('button:not([type])').forEach((botao) => {
    botao.type = 'button';
  });
  wrap.addEventListener('click', (event) => {
    if (event.target === wrap) fecharSheet(event);
  });
  document.body.appendChild(wrap);
  document.body.classList.add('sheet-open');
  document.documentElement.classList.add('sheet-open');
  document.body.style.top = `-${rolagemAnteriorSheet}px`;
}

function fecharSheet(evento = null) {
  evento?.preventDefault?.();
  evento?.stopPropagation?.();
  const sheetAtual = document.getElementById('sheetBackdrop');
  const estavaAberto = Boolean(sheetAtual);
  if (!estavaAberto) return;
  const campoAtivo = document.activeElement;
  if (campoAtivo instanceof HTMLElement && sheetAtual.contains(campoAtivo)) {
    campoAtivo.blur();
  }
  if (document.getElementById('prodImagemArquivo') && produtoImagemUploadPendente?.previewUrl) {
    URL.revokeObjectURL(produtoImagemUploadPendente.previewUrl);
    produtoImagemUploadPendente = null;
  }
  sheetAtual.remove();
  document.body.classList.remove('sheet-open');
  document.documentElement.classList.remove('sheet-open');
  document.body.style.top = '';
  const rolagemAtual = window.scrollY || document.documentElement.scrollTop || 0;
  if (Math.abs(rolagemAtual - rolagemAnteriorSheet) > 1) {
    window.scrollTo({ top: rolagemAnteriorSheet, left: 0, behavior: 'auto' });
  }
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

function escapeAttr(v) {
  return escapeHtml(v).replace(/`/g, '&#096;');
}

function botaoTemAcaoVisual(botao) {
  if (!(botao instanceof HTMLButtonElement) || botao.disabled) return false;
  if (botao.matches('.icon-button, .close, .password-toggle, .search-clear, .client-more, .home-button, .system-brand, .menu-toggle, .vendas-nav-item, .vendas-nav-add, .mobile-menu button')) return false;
  const texto = (botao.textContent || '').replace(/[×⋮+＋]/g, '').trim();
  return Boolean(texto);
}

function ativarFeedbackBotao(botao) {
  if (!botaoTemAcaoVisual(botao)) return;
  if (botaoFeedbackAtivo && botaoFeedbackAtivo !== botao) botaoFeedbackAtivo.classList.remove('button-pressed');
  window.clearTimeout(botao.__tempoFeedbackAtivo);
  botao.classList.add('button-pressed');
  botaoFeedbackAtivo = botao;
}

function removerFeedbackBotao(botao) {
  const alvo = botaoFeedbackAtivo || botao;
  if (!(alvo instanceof HTMLButtonElement)) return;
  botaoFeedbackAtivo = null;
  window.clearTimeout(alvo.__tempoFeedbackAtivo);
  alvo.__tempoFeedbackAtivo = window.setTimeout(() => alvo.classList.remove('button-pressed'), 110);
}

function podeRecarregarAtualizacaoPwa() {
  const campoAtivo = document.activeElement;
  const editando = campoAtivo instanceof HTMLElement && campoAtivo.matches('input, textarea, select, [contenteditable="true"]');
  return mutacoesDadosEmAndamento === 0 && !editando && !document.getElementById('sheetBackdrop') && !state.agendaFormAberto && !state.agendaItemMovendo;
}

async function verificarAtualizacaoPwa() {
  const versaoAtual = String(window.__VENDAS_MOBILE_VERSION__ || '');
  if (!versaoAtual) return;
  try {
    const resposta = await fetch(`/mobile/vendas?update=${Date.now()}`, { cache: 'no-store' });
    if (!resposta.ok) return;
    const pagina = await resposta.text();
    const encontrada = pagina.match(/vendas-mobile\/app\.js\?v=([^"'&\s<]+)/)?.[1] || '';
    if (!encontrada || encontrada === versaoAtual) return;
    // Nunca recarrega o app enquanto a pessoa está usando a tela: uma atualização
    // de PWA deve entrar somente numa abertura/recarga consciente posterior.
    atualizacaoPwaPendente = true;
  } catch { /* sem conexão: mantém a versão offline atual */ }
}

function aplicarAtualizacaoPwaPendente() {
  if (!atualizacaoPwaPendente || !podeRecarregarAtualizacaoPwa()) return;
  window.location.reload();
}

if (!window.__VENDAS_MOBILE_EMBEDDED__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=38').catch(() => {});
  });
}

if (window.__VENDAS_MOBILE_EMBEDDED__) {
  window.setTimeout(verificarAtualizacaoPwa, 12000);
  window.setInterval(() => {
    if (document.visibilityState === 'visible') verificarAtualizacaoPwa();
  }, 120000);
}

window.addEventListener('online', () => {
  reenviarPendenciasVendas().catch((error) => console.warn('Não foi possível reenviar alterações pendentes.', error));
});

window.setAba = setAba;
window.state = state;
window.abrirGestao = abrirGestao;
window.abrirSeletorPerfilGestaoVendas = abrirSeletorPerfilGestaoVendas;
window.fecharSeletorPerfilGestaoVendas = fecharSeletorPerfilGestaoVendas;
window.selecionarPerfilGestaoVendas = selecionarPerfilGestaoVendas;
window.voltarListaPerfisGestaoVendas = voltarListaPerfisGestaoVendas;
window.confirmarPerfilGestaoVendas = confirmarPerfilGestaoVendas;
window.escolherSistemaInicialVendas = escolherSistemaInicialVendas;
window.definirLembrarSistemaInicialVendas = definirLembrarSistemaInicialVendas;
window.abrirConfiguracoes = abrirConfiguracoes;
window.abrirConfirmacaoSair = abrirConfirmacaoSair;
window.salvarConfiguracoes = salvarConfiguracoes;
window.resetarDados = resetarDados;
window.carregarPacoteTridium = carregarPacoteTridium;
window.baixarModeloProdutosExcel = baixarModeloProdutosExcel;
window.abrirImportacaoPacote = abrirImportacaoPacote;
window.abrirImportacaoPacoteLink = abrirImportacaoPacoteLink;
window.importarArquivoPacote = importarArquivoPacote;
window.importarLinkPacote = importarLinkPacote;
window.importarCatalogoTridiumPersistente = importarCatalogoTridiumPersistente;
window.abrirGerenciarPacotes = abrirGerenciarPacotes;
window.excluirPacoteProdutos = excluirPacoteProdutos;
window.exportarProdutosExcel = exportarProdutosExcel;
window.exportarBackupVendasExcel = exportarBackupVendasExcel;
window.abrirProduto = abrirProduto;
window.salvarProduto = salvarProduto;
window.removerProduto = removerProduto;
window.abrirCliente = abrirCliente;
window.salvarCliente = salvarCliente;
window.removerCliente = removerCliente;
window.adicionarCarrinho = adicionarCarrinho;
window.abrirCarrinho = abrirCarrinho;
window.alterarQtd = alterarQtd;
window.removerCarrinho = removerCarrinho;
window.atualizarTotalCarrinho = atualizarTotalCarrinho;
window.finalizarVenda = finalizarVenda;
window.baixarModeloCsv = baixarModeloCsv;
window.importarCsv = importarCsv;
window.abrirAtualizarEstoque = abrirAtualizarEstoque;
window.selecionarProdutoEstoque = selecionarProdutoEstoque;
window.ativarControleEstoque = ativarControleEstoque;
window.salvarMovimentacaoEstoque = salvarMovimentacaoEstoque;
window.fecharSheet = fecharSheet;
window.alternarMenu = alternarMenu;
window.abrirSalaBotoes = abrirSalaBotoes;
window.sairMenuMobile = sairMenuMobile;
window.abrirAcoesRapidas = abrirAcoesRapidas;
window.acionarNavegacaoInferior = acionarNavegacaoInferior;
window.buscarCepCliente = buscarCepCliente;
window.abrirMenuCliente = abrirMenuCliente;
window.atualizarBuscaClientes = atualizarBuscaClientes;
window.limparBuscaClientes = limparBuscaClientes;
window.abrirAgendamentoCliente = abrirAgendamentoCliente;
window.abrirNovoPedidoCliente = abrirNovoPedidoCliente;
window.abrirNovoPedidoGeral = abrirNovoPedidoGeral;
window.abrirNovoPagamentoGeral = abrirNovoPagamentoGeral;
window.selecionarTipoPedidoCliente = selecionarTipoPedidoCliente;
window.selecionarClientePedido = selecionarClientePedido;
window.selecionarClientePagamento = selecionarClientePagamento;
window.abrirBuscaClienteLancamento = abrirBuscaClienteLancamento;
window.fecharBuscaClienteLancamento = fecharBuscaClienteLancamento;
window.filtrarClientesLancamento = filtrarClientesLancamento;
window.selecionarClienteLancamento = selecionarClienteLancamento;
window.abrirBuscaProdutoPedidoCliente = abrirBuscaProdutoPedidoCliente;
window.fecharBuscaProdutoPedidoCliente = fecharBuscaProdutoPedidoCliente;
window.filtrarProdutosPedidoCliente = filtrarProdutosPedidoCliente;
window.selecionarProdutoPedidoCliente = selecionarProdutoPedidoCliente;
window.sincronizarQuantidadePedidoCliente = sincronizarQuantidadePedidoCliente;
window.normalizarQuantidadePedidoCliente = normalizarQuantidadePedidoCliente;
window.ajustarQuantidadePedidoCliente = ajustarQuantidadePedidoCliente;
window.inserirItemPedidoCliente = inserirItemPedidoCliente;
window.removerItemPedidoCliente = removerItemPedidoCliente;
window.atualizarDescontoPedidoCliente = atualizarDescontoPedidoCliente;
window.finalizarPedidoCliente = finalizarPedidoCliente;
window.abrirPagamentoCliente = abrirPagamentoCliente;
window.atualizarResumoPagamentoCliente = atualizarResumoPagamentoCliente;
window.confirmarPagamentoCliente = confirmarPagamentoCliente;
window.abrirPagamentosCliente = abrirPagamentosCliente;
window.carregarMaisPagamentosCliente = carregarMaisPagamentosCliente;
window.abrirEditarPagamentoCliente = abrirEditarPagamentoCliente;
window.voltarEdicaoPagamento = voltarEdicaoPagamento;
window.atualizarResumoEdicaoPagamento = atualizarResumoEdicaoPagamento;
window.salvarEdicaoPagamentoCliente = salvarEdicaoPagamentoCliente;
window.abrirConfirmacaoExcluirPagamento = abrirConfirmacaoExcluirPagamento;
window.excluirPagamentoCliente = excluirPagamentoCliente;
window.carregarMaisClientesPagamentos = carregarMaisClientesPagamentos;
window.abrirPagamentoClienteDetalhe = abrirPagamentoClienteDetalhe;
window.alterarStatusCliente = alterarStatusCliente;
window.abrirDetalhesCliente = abrirDetalhesCliente;
window.carregarMaisDetalhesCliente = carregarMaisDetalhesCliente;
window.voltarParaDetalhesCliente = voltarParaDetalhesCliente;
window.abrirPedidoCliente = abrirPedidoCliente;
window.compartilharPedido = compartilharPedido;
window.compartilharPagamento = compartilharPagamento;
window.ligarCliente = ligarCliente;
window.abrirWhatsappCliente = abrirWhatsappCliente;
window.abrirMapasCliente = abrirMapasCliente;
window.limparBusca = limparBusca;
window.sairSistema = sairSistema;
window.entrarSistema = entrarSistema;
window.entrarComGoogle = entrarComGoogle;
window.trocarTipoLogin = trocarTipoLogin;
window.alternarSenhaLogin = alternarSenhaLogin;
window.abrirRecuperacaoSenha = abrirRecuperacaoSenha;
window.enviarRecuperacaoSenha = enviarRecuperacaoSenha;
window.redefinirSenhaVendas = redefinirSenhaVendas;
window.abrirCadastroConta = abrirCadastroConta;
window.voltarParaLogin = voltarParaLogin;
window.voltarDadosCadastro = voltarDadosCadastro;
window.criarConta = criarConta;
window.confirmarCadastroSms = confirmarCadastroSms;
window.reenviarSmsCadastro = reenviarSmsCadastro;
window.atualizarRequisitosSenhaCadastro = atualizarRequisitosSenhaCadastro;
window.enviarSolicitacaoAcesso = enviarSolicitacaoAcesso;
window.confirmarTelefoneVinculo = confirmarTelefoneVinculo;
window.cancelarTelefoneVinculo = cancelarTelefoneVinculo;
window.aplicarFiltroDashboard = aplicarFiltroDashboard;
window.abrirCalendarioCentralizado = abrirCalendarioCentralizado;
window.mudarMesCalendario = mudarMesCalendario;
window.selecionarDataCalendario = selecionarDataCalendario;
window.fecharCalendarioCentralizado = fecharCalendarioCentralizado;
window.mudarMes = mudarMes;
window.irMesAtual = irMesAtual;
window.aplicarBusca = aplicarBusca;
window.alternarOrdemAlfabetica = alternarOrdemAlfabetica;
window.selecionarFiltroPedidos = selecionarFiltroPedidos;
window.carregarMaisPedidos = carregarMaisPedidos;
window.selecionarDiaAgenda = selecionarDiaAgenda;
window.fecharDiaAgenda = fecharDiaAgenda;
window.alternarExpansaoAgenda = alternarExpansaoAgenda;
window.moverMesAgendaVendas = moverMesAgendaVendas;
window.abrirFormularioAgendaVendas = abrirFormularioAgendaVendas;
window.cancelarFormularioAgendaVendas = cancelarFormularioAgendaVendas;
window.salvarItemAgendaVendas = salvarItemAgendaVendas;
window.excluirItemAgendaVendas = excluirItemAgendaVendas;
window.abrirMoverAgendaVendas = abrirMoverAgendaVendas;
window.cancelarMoverAgendaVendas = cancelarMoverAgendaVendas;
window.salvarNovaDataAgendaVendas = salvarNovaDataAgendaVendas;
window.salvarMeta = salvarMeta;
window.formatarDataNascimentoCampo = formatarDataNascimentoCampo;
window.salvarIntegracaoGestao = salvarIntegracaoGestao;
window.abrirAgendaAniversariantes = abrirAgendaAniversariantes;
window.abrirPerfilFinanceiroVendas = abrirPerfilFinanceiroVendas;
window.confirmarPerfilFinanceiroVendas = confirmarPerfilFinanceiroVendas;
window.salvarPerfilFinanceiroVendas = salvarPerfilFinanceiroVendas;
window.alternarRecursoVinculoComercial = alternarRecursoVinculoComercial;
window.confirmarRecursoVinculoComercial = confirmarRecursoVinculoComercial;
window.abrirNovoVinculoComercial = abrirNovoVinculoComercial;
window.solicitarNovoVinculoComercial = solicitarNovoVinculoComercial;
window.abrirResetSistemaVendas = abrirResetSistemaVendas;
window.confirmarResetSistemaVendas = confirmarResetSistemaVendas;
window.formatarCampoMoeda = formatarCampoMoeda;
window.alternarTema = alternarTema;
window.alternarOrganizacaoSalaBotoes = alternarOrganizacaoSalaBotoes;
window.iniciarArrasteSalaBotoes = iniciarArrasteSalaBotoes;
window.moverArrasteSalaBotoes = moverArrasteSalaBotoes;
window.finalizarArrasteSalaBotoes = finalizarArrasteSalaBotoes;
window.abrirOrganizarAtalhosVendas = abrirOrganizarAtalhosVendas;
window.definirAtalhoInferiorVendas = definirAtalhoInferiorVendas;
window.restaurarAtalhosInferioresVendas = restaurarAtalhosInferioresVendas;
window.alterarSenha = alterarSenha;
window.abrirAtualizarTelefone = abrirAtualizarTelefone;
window.enviarCodigoAtualizarTelefone = enviarCodigoAtualizarTelefone;
window.confirmarAtualizarTelefone = confirmarAtualizarTelefone;
window.instalarPWA = instalarPWA;
window.abrirImportacaoPacoteZip = abrirImportacaoPacoteZip;
window.importarArquivoPacoteZip = importarArquivoPacoteZip;
window.mostrarSincronizacaoCatalogo = mostrarSincronizacaoCatalogo;
window.sincronizarCatalogoAgora = sincronizarCatalogoAgora;
window.enviarSugestaoVendas = enviarSugestaoVendas;
window.novaSugestaoVendas = novaSugestaoVendas;
window.abrirPastaDivulgacao = abrirPastaDivulgacao;
window.voltarPastaDivulgacao = voltarPastaDivulgacao;
window.abrirMaterialDivulgacao = abrirMaterialDivulgacao;
window.alternarMaterialExpandido = alternarMaterialExpandido;
window.compartilharMaterialDivulgacao = compartilharMaterialDivulgacao;

window.addEventListener('pageshow', () => requestAnimationFrame(limparFocoInicialLogin));
window.addEventListener('scroll', agendarDestaqueClientes, { passive: true });
window.addEventListener('resize', () => {
  agendarDestaqueClientes();
  sincronizarSalaAoMudarLargura();
});
window.addEventListener('orientationchange', reconstruirSalaAposRotacao);
document.addEventListener('pointerdown', (event) => {
  if (event.target instanceof Element && !event.target.closest('.transaction-client-combobox')) {
    fecharBuscaClienteLancamento('pedido');
    fecharBuscaClienteLancamento('pagamento');
  }
  if (event.target instanceof Element && !event.target.closest('.order-product-combobox')) fecharBuscaProdutoPedidoCliente();
  ativarFeedbackBotao(event.target instanceof Element ? event.target.closest('button') : null);
});
document.addEventListener('pointerup', (event) => removerFeedbackBotao(event.target instanceof Element ? event.target.closest('button') : null));
document.addEventListener('pointercancel', (event) => removerFeedbackBotao(event.target instanceof Element ? event.target.closest('button') : null));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') ativarFeedbackBotao(document.activeElement);
});
document.addEventListener('keyup', (event) => {
  if (event.key === 'Enter' || event.key === ' ') removerFeedbackBotao(document.activeElement);
});

prepararSpriteIconesEstavel();
inicializarApp();
