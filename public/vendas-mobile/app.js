const STORAGE_KEY = 'avantalab.vendas_mobile.v1';
const GOOGLE_CONNECTING_KEY = 'avantalab.vendas_mobile.google_connecting';
const PREPARING_VIEWPORT_HEIGHT_KEY = 'avantalab.vendas_mobile.preparing_viewport_height';
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
  metaMensal: 0,
  temaEscuro: false,
  acessoVendas: null,
  solicitacaoAcesso: null,
  usuarioSemAcesso: false,
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
let quadroDestaqueClientes = 0;
let botaoFeedbackAtivo = null;
let atualizacaoPwaPendente = false;
let filtroPedidos = 'todos';
let limitePedidos = 10;
let pedidoClienteRascunho = null;
let pagamentoClienteRascunho = null;
let ordemAlfabetica = 'asc';

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
    return salvo ? { ...estadoInicial, ...salvo, carrinho: [], menuAberto: true } : { ...estadoInicial };
  } catch {
    return { ...estadoInicial };
  }
}

function salvarEstado() {
  const persistente = backendAtivo ? {
    usuario: state.usuario,
    aba: state.aba,
    busca: state.busca,
    filtroInicio: state.filtroInicio,
    filtroFim: state.filtroFim,
    mesReferencia: state.mesReferencia,
    agendaAno: state.agendaAno,
    agendaMes: state.agendaMes,
    agendaDiaSelecionado: state.agendaDiaSelecionado,
    agendaItens: state.agendaItens,
    metaMensal: state.metaMensal,
    temaEscuro: state.temaEscuro,
  } : { ...state, carrinho: [] };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistente));
  } catch (error) {
    console.warn('Não foi possível salvar as preferências locais do Vendas.', error);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* armazenamento indisponível */ }
  }
}

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
}

function dataBR(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
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

function svgIcon(nome, classe = '') {
  return `<svg class="svg-icon ${classe}" aria-hidden="true"><use href="./assets/icons.svg#${nome}"></use></svg>`;
}

function logoVendas() {
  return `<span class="vendas-brand-logo"><img class="vendas-logo-claro" src="/vendas-mobile/assets/logo-vendas-claro.png" alt="AvantaLab — Cada venda, um avanço"><img class="vendas-logo-escuro" src="/vendas-mobile/assets/logo-vendas-escuro.png" alt="" aria-hidden="true"></span>`;
}

function setAba(aba) {
  if (aba !== 'agenda') fecharCamadasAgenda();
  if (aba === 'vendas' && state.aba !== 'vendas') limitePedidos = 10;
  state.aba = aba;
  state.menuAberto = false;
  render();
}

function alternarMenu() {
  state.menuAberto = !state.menuAberto;
  render();
}

function abrirSalaBotoes() {
  fecharCamadasAgenda();
  state.menuAberto = true;
  render();
}

function totaisPeriodo() {
  const inicio = new Date(`${state.filtroInicio}T00:00:00`);
  const fim = new Date(`${state.filtroFim}T23:59:59`);
  const vendasMes = state.vendas.filter((v) => {
    const d = new Date(v.criado_em);
    return d >= inicio && d <= fim && v.status !== 'cancelada' && !pedidoEhConsignado(v);
  });
  const total = vendasMes.reduce((s, v) => s + Number(v.total || 0), 0);
  const itens = vendasMes.reduce((s, v) => s + v.itens.reduce((x, i) => x + Number(i.quantidade || 0), 0), 0);
  return {
    vendasMes,
    total,
    pedidos: vendasMes.length,
    ticket: vendasMes.length ? total / vendasMes.length : 0,
    itens,
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

function render() {
  const agendaAtiva = Boolean(state.autenticado && state.aba === 'agenda' && !carregandoBackend && !conectandoGoogle);
  const formularioAgendaAberto = Boolean(state.autenticado && state.agendaFormAberto && !carregandoBackend && !conectandoGoogle);
  document.documentElement.classList.toggle('agenda-open', agendaAtiva);
  document.body.classList.toggle('agenda-open', agendaAtiva);
  document.documentElement.classList.toggle('agenda-form-open', formularioAgendaAberto);
  document.body.classList.toggle('agenda-form-open', formularioAgendaAberto);
  salvarEstado();
  if (carregandoBackend || conectandoGoogle) {
    limparDestaqueClientes();
    renderPreparandoAcessoEstavel();
    return;
  }
  if (!state.autenticado) {
    limparDestaqueClientes();
    app.innerHTML = state.usuarioSemAcesso ? renderSolicitarAcesso() : renderLogin();
    if (!state.usuarioSemAcesso) adicionarBotoesGoogle();
    requestAnimationFrame(limparFocoInicialLogin);
    return;
  }
  const cabecalho = `<header class="system-header"><button class="system-brand brand-home" onclick="abrirSalaBotoes()" aria-label="Ir para a sala de botões">${logoVendas()}</button></header>`;
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
  `;
  if (state.aba === 'clientes') requestAnimationFrame(configurarDestaqueClientes);
  else limparDestaqueClientes();
}

function configurarDestaqueClientes() {
  cardsClientesEmDestaque = [...app.querySelectorAll('.clientes-page .client-card')];
  atualizarDestaqueClientes();
}

function limparDestaqueClientes() {
  cardsClientesEmDestaque.forEach((card) => card.classList.remove('client-card-emphasis', 'client-card-deemphasized'));
  cardsClientesEmDestaque = [];
}

function atualizarDestaqueClientes() {
  if (!cardsClientesEmDestaque.length || state.aba !== 'clientes') return;
  const topoVisivel = Math.max(0, app.querySelector('.module-sticky-head')?.getBoundingClientRect().bottom || 0);
  const rodapeVisivel = Math.min(window.innerHeight, document.querySelector('.vendas-bottom-nav')?.getBoundingClientRect().top || window.innerHeight);
  const centroVisivel = topoVisivel + ((rodapeVisivel - topoVisivel) / 2);
  const visiveis = cardsClientesEmDestaque.filter((card) => {
    const area = card.getBoundingClientRect();
    return area.bottom > topoVisivel && area.top < rodapeVisivel;
  });
  const cardAtivo = visiveis.reduce((maisProximo, card) => {
    if (!maisProximo) return card;
    const centroCard = card.getBoundingClientRect().top + (card.getBoundingClientRect().height / 2);
    const centroAtual = maisProximo.getBoundingClientRect().top + (maisProximo.getBoundingClientRect().height / 2);
    return Math.abs(centroCard - centroVisivel) < Math.abs(centroAtual - centroVisivel) ? card : maisProximo;
  }, null);
  cardsClientesEmDestaque.forEach((card) => {
    card.classList.toggle('client-card-emphasis', card === cardAtivo);
    card.classList.toggle('client-card-deemphasized', Boolean(cardAtivo) && card !== cardAtivo);
  });
}

function agendarDestaqueClientes() {
  if (quadroDestaqueClientes) return;
  quadroDestaqueClientes = requestAnimationFrame(() => {
    quadroDestaqueClientes = 0;
    atualizarDestaqueClientes();
  });
}

function renderPreparandoAcessoEstavel() {
  if (app.firstElementChild?.classList.contains('preparing-access-screen') && app.children.length === 1) return;
  app.innerHTML = renderPreparandoAcesso();
}

function renderPreparandoAcesso() {
  return `<section class="login-screen preparing-access-screen"><div class="preparing-access-card"><p>AvantaLab</p><span class="loader"></span><h1>Preparando acesso</h1><small>Estamos validando seu login e preparando seus dados com segurança.</small></div></section>`;
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

function renderMenuMobile() {
  const itens = [
    ['dashboard', '1_Dashboard.png', 'Dashboard'], ['clientes', '4_Clientes.png', 'Clientes'], ['produtos', '2_Produtos.png', 'Produtos'],
    ['vendas', '5_Pedidos.png', 'Pedidos'], ['vender', '6_Pagamentos.png', 'Pagamentos'], ['agenda', '3_Agenda.png', 'Agenda'],
    ['novidades', '8_Novidades.png', 'Novidades'], ['divulgacao', '7_Divulgação.png', 'Divulgação'], ['informacoes', '9_Informações.png', 'Informações']
  ];
  return `<section class="mobile-menu" aria-label="Menu principal">
    <header class="mobile-menu-header"><div class="mobile-menu-brand">${logoVendas()}</div></header>
    <div class="mobile-menu-grid">${itens.map(([idAba, arquivo, label]) => `<button class="mobile-menu-card" onclick="setAba('${idAba}')"><img src="./assets/menu/${arquivo}" alt="${label}" /></button>`).join('')}</div>
    <div class="mobile-menu-bottom"><button class="mobile-menu-wide" onclick="setAba('configuracoes')"><img src="./assets/menu/13_Configurações.png" alt="Configurações" /></button><button class="mobile-menu-wide" onclick="sairMenuMobile()"><img src="./assets/menu/14_Sair.png" alt="Sair" /></button></div>
  </section>`;
}

function sairMenuMobile() {
  sairSistema();
}

function iconeNavegacaoInferior(tipo) {
  if (tipo === 'tema') return '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  return svgIcon(tipo);
}

function itemNavegacaoInferior(id, tipo, rotulo, acao) {
  return `<button id="${id}" type="button" class="vendas-nav-item" onclick="acionarNavegacaoInferior(event, '${acao}')" aria-label="${rotulo}"><span>${iconeNavegacaoInferior(tipo)}</span><b>${rotulo}</b></button>`;
}

function renderNavegacaoInferior() {
  return `<nav class="vendas-bottom-nav" aria-label="Navegação principal"><div class="vendas-bottom-nav-inner">
    ${itemNavegacaoInferior('nav-configuracoes', 'settings', 'Configurações', 'configuracoes')}
    ${itemNavegacaoInferior('nav-tema', 'tema', 'Tema', 'tema')}
    <button id="nav-novo" type="button" class="vendas-nav-add" onclick="acionarNavegacaoInferior(event, 'novo')" aria-label="Lançar pedido ou pagamento"><span>+</span><b>Lançar</b></button>
    ${itemNavegacaoInferior('nav-agenda', 'calendar', 'Agenda', 'agenda')}
    ${itemNavegacaoInferior('nav-inicio', 'home', 'Início', 'inicio')}
  </div></nav>`;
}

function acionarNavegacaoInferior(event, destino) {
  const botao = event.currentTarget || event.target.closest('button');
  if (!botao) return;
  const anel = document.createElement('i');
  anel.className = 'vendas-nav-ripple';
  const origem = botao.classList.contains('vendas-nav-add') ? botao.querySelector(':scope > span') : botao;
  origem?.appendChild(anel);
  anel.addEventListener('animationend', () => anel.remove(), { once: true });
  window.setTimeout(() => {
    fecharCamadasNavegacao();
    if (destino === 'configuracoes') setAba('configuracoes');
    else if (destino === 'tema') alternarTema(!state.temaEscuro);
    else if (destino === 'novo') { render(); abrirAcoesRapidas(); }
    else if (destino === 'agenda') setAba('agenda');
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
  sheet(`<div class="sheet-header"><div><h2>Novo lançamento</h2><p class="muted small">Escolha o que deseja registrar.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="quick-actions-grid"><button class="primary quick-action-button" onclick="abrirNovoPedidoGeral()">${svgIcon('shopping-bag')}<span>Lançar pedido</span></button><button class="secondary quick-action-button" onclick="fecharSheet();setAba('vender')">${svgIcon('credit-card')}<span>Lançar pagamento</span></button></div>`, 'sheet-backdrop-centered');
}

async function sairSistema() {
  try { if (backendAtivo) await window.VendasDb.signOut(); } catch (error) { console.error(error); }
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
  render();
}

async function entrarSistema(event) {
  event.preventDefault();
  const contato = valor('loginContato').trim();
  const senha = valor('loginSenha');
  const lembrar = document.getElementById('loginLembrar')?.checked ? '1' : '0';
  fixarAlturaPreparacao();
  carregandoBackend = true;
  render();
  try {
    if (loginTipo === 'email') await window.VendasDb.signIn(contato, senha);
    else await window.VendasDb.signInPhone(`+55${contato.replace(/\D/g, '')}`, senha);
    localStorage.setItem('avantalab.vendas_mobile.lembrar', lembrar);
    await carregarDadosBackend(false);
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
  const texto = String(error?.message || error || 'Erro inesperado.');
  if (/invalid login credentials/i.test(texto)) return 'E-mail ou senha incorretos.';
  if (/relation .* does not exist/i.test(texto)) return 'O banco do Vendas Mobile ainda não foi instalado.';
  return texto;
}

function comLimiteDeTempo(promessa, mensagem = 'A conexão com o AvantaLab demorou mais que o esperado. Tente novamente.', limiteMs = 15000) {
  return Promise.race([
    promessa,
    new Promise((_, rejeitar) => window.setTimeout(() => rejeitar(new Error(mensagem)), limiteMs)),
  ]);
}

async function carregarDadosBackend(mostrarCarregamento = true) {
  carregandoBackend = mostrarCarregamento;
  if (mostrarCarregamento) render();
  try {
    let dados = await comLimiteDeTempo(window.VendasDb.loadAll());
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
        nome: dados.user.user_metadata?.nome || dados.user.user_metadata?.full_name || dados.user.user_metadata?.name || dados.user.email || state.usuario.nome,
        email: dados.user.email || state.usuario.email || '',
        telefone: dados.user.phone || dados.user.user_metadata?.telefone || dados.user.user_metadata?.phone || state.usuario.telefone || '',
      };
      state.produtos = dados.produtos;
      state.pacotesProdutos = dados.pacotes || [];
      state.clientes = dados.clientes;
      state.vendas = dados.vendas;
      state.pagamentos = dados.pagamentos || [];
      state.menuAberto = true;
      state.acessoVendas = dados.acesso || null;
      state.solicitacaoAcesso = dados.solicitacao || null;
      state.usuarioSemAcesso = !dados.acesso;
      if (!dados.acesso) state.autenticado = false;
    }
  } catch (error) {
    console.error(error);
    state.autenticado = false;
    state.erroBackend = traduzErro(error);
  } finally {
    carregandoBackend = false;
    conectandoGoogle = false;
    sessionStorage.removeItem(GOOGLE_CONNECTING_KEY);
    render();
    liberarAlturaPreparacao();
    if (state.erroBackend) { toast(state.erroBackend); state.erroBackend = '';
    }
  }
}

async function inicializarApp() {
  if (!backendAtivo) {
    carregandoBackend = false;
    state.autenticado = true;
    render();
    toast('Modo local: conexão Supabase indisponível.');
    return;
  }
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
    if (!sessaoAtiva) {
      carregandoBackend = false;
      conectandoGoogle = false;
      sessionStorage.removeItem(GOOGLE_CONNECTING_KEY);
      render();
      liberarAlturaPreparacao();
      return;
    }
    await carregarDadosBackend(false);
  } catch (error) {
    console.error('Falha ao inicializar o Vendas Mobile.', error);
    carregandoBackend = false;
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

function renderDashboard() {
  const t = totaisPeriodo();
  const pagamentosPeriodo = (state.pagamentos || []).filter((pagamento) => {
    const dataPagamento = new Date(`${pagamento.data_pagamento || String(pagamento.criado_em || '').slice(0, 10)}T12:00:00`);
    return dataPagamento >= new Date(`${state.filtroInicio}T00:00:00`) && dataPagamento <= new Date(`${state.filtroFim}T23:59:59`);
  });
  const totalRecebido = pagamentosPeriodo.reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0);
  const totalAReceber = state.clientes.reduce((soma, cliente) => soma + saldoFinanceiroCliente(cliente.id).debito, 0);
  const produtoTop = produtoMaisVendido();
  const clienteTop = clienteMaisCompra();
  return `
    <section class="page-heading"><h2>Dashboard</h2><div class="date-filter"><label><span>Início</span><input type="date" value="${state.filtroInicio}" onchange="state.filtroInicio=this.value"></label><label><span>Fim</span><input type="date" value="${state.filtroFim}" onchange="state.filtroFim=this.value"></label><button class="filter-button" onclick="aplicarFiltroDashboard()">${svgIcon('filter')}<span>Filtrar</span></button></div></section>
    <section class="month-switcher"><div><button aria-label="Mês anterior" onclick="mudarMes(-1)">${svgIcon('chevron-left')}</button><strong>${nomeMesReferencia()}</strong><button aria-label="Próximo mês" onclick="mudarMes(1)">${svgIcon('chevron-right')}</button></div><button class="current-month" onclick="irMesAtual()">${svgIcon('calendar')} &nbsp; ${mesReferenciaAtual() ? 'Mês Atual' : 'Voltar para o Mês Atual'}</button></section>
    <section class="goal-grid">
      <article class="goal-card orders-goal"><h3>${svgIcon('target')} <span>Meta de Pedidos</span><small>Empresa</small></h3><div><b>Realizado: <em>${moeda(t.total)}</em></b><span>(${t.pedidos} pedidos)</span><b>Meta: ${moeda(state.metaMensal)}</b></div><div class="progress"><i style="width:${state.metaMensal ? Math.max(2, Math.min(100, t.total / state.metaMensal * 100)) : 2}%"></i></div><p>Faltam <b>${moeda(Math.max(0, state.metaMensal - t.total))}</b> para atingir a meta.</p></article>
      <article class="goal-card sales-goal"><h3>${svgIcon('target')} <span>Medidor de Meta Mensal</span></h3><div class="goal-values"><b>Vendas Atuais: <em>${moeda(t.total)}</em></b><b>Meta: ${moeda(state.metaMensal)}</b></div><div class="progress"><i style="width:${state.metaMensal ? Math.max(2, Math.min(100, t.total / state.metaMensal * 100)) : 2}%"></i></div><p>Faltam <b>${moeda(Math.max(0, state.metaMensal - t.total))}</b> para atingir sua meta! Vamos lá! 🚀</p><hr /><button class="outline-button" onclick="setAba('configuracoes')">${svgIcon('settings')} Configurar Meta</button></article>
    </section>
    <section class="dashboard-kpis">
      ${kpi('Total Vendido', moeda(t.total), '$')}
      ${kpi('Total Recebido', moeda(totalRecebido), '⌁')}
      ${kpi('A Receber', moeda(totalAReceber), '◷')}
      ${kpi('Clientes Ativos', state.clientes.length, '♧')}
    </section>
    <section class="dashboard-tables">
      <article class="dashboard-panel"><h3>♧ &nbsp; Top 10 Clientes</h3><table><thead><tr><th>Cliente</th><th>Total Comprado</th></tr></thead><tbody><tr><td>${clienteTop ? escapeHtml(clienteTop.nome) : 'Nenhum cliente.'}</td><td>${clienteTop ? moeda(clienteTop.total) : ''}</td></tr></tbody></table></article>
      <article class="dashboard-panel"><h3>◷ &nbsp; Clientes Inativos (+30 dias)</h3><table><thead><tr><th>Cliente</th><th>Última Compra</th><th>Dias</th></tr></thead><tbody><tr><td colspan="3">Nenhum inativo.</td></tr></tbody></table></article>
      <article class="dashboard-panel"><h3>◇ &nbsp; Top 10 Produtos</h3><p>${produtoTop ? `${escapeHtml(produtoTop.nome)} · ${produtoTop.qtd} unidades` : 'Sem dados.'}</p></article>
      <article class="dashboard-panel"><h3>↗ &nbsp; Rentabilidade</h3><p>Sem dados.</p></article>
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
  const detalheDia = selecionado ? `<section class="agenda-mobile-detail ${state.agendaExpandida ? 'expanded' : ''}"><header><h3>Agenda de ${String(selecionado).padStart(2, '0')} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(ano, mes, 1))}</h3><div><button type="button" class="agenda-expand" onclick="alternarExpansaoAgenda()" aria-label="${state.agendaExpandida ? 'Recolher agenda' : 'Expandir agenda'}">${state.agendaExpandida ? '↙' : '↗'}</button><button type="button" class="close" onclick="fecharDiaAgenda()">×</button></div></header><div class="agenda-mobile-reminders"><div><h4>Clientes agendados</h4><button type="button" class="primary" onclick="abrirFormularioAgendaVendas()">Adicionar</button></div>${itensDia.length ? itensDia.map(renderItemAgendaVendas).join('') : '<p class="agenda-mobile-none">Nenhum cliente agendado neste dia.</p>'}</div></section>` : '';
  return `<section class="agenda-mobile-page ${state.agendaExpandida ? 'agenda-expanded' : ''}"><div class="agenda-mobile-month"><button type="button" onclick="moverMesAgendaVendas(-1)" aria-label="Mês anterior">‹</button><h2>${escapeHtml(titulo)}</h2><button type="button" onclick="moverMesAgendaVendas(1)" aria-label="Próximo mês">›</button></div><section class="agenda-mobile-screen ${selecionado ? 'agenda-has-selection' : ''} ${animacao ? `agenda-anim-${animacao}` : ''}"><h2>AGENDA</h2><div class="agenda-mobile-week"><b>D</b><b>S</b><b>T</b><b>Q</b><b>Q</b><b>S</b><b>S</b></div><div class="agenda-mobile-grid">${dias.join('')}</div>${detalheDia}</section>${state.agendaFormAberto ? renderFormularioAgendaVendas() : ''}${state.agendaItemMovendo ? renderMoverAgendaVendas() : ''}</section>`;
}

function itensAgendaVendas() {
  if (Array.isArray(state.agendaItens) && state.agendaItens.length) return state.agendaItens;
  return (state.compromissos || []).map((item) => {
    const data = new Date(`${item.data || isoData(new Date())}T12:00:00`);
    return { id: item.id, titulo: item.cliente || 'Compromisso', tipo: item.tipo || 'Visita', descricao: item.observacao || '', ano: data.getFullYear(), mes: data.getMonth(), dia: data.getDate(), repetir: false, repeticao: '' };
  });
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
  return `<article class="agenda-mobile-item"><div><b>${escapeHtml(item.titulo)}</b><small class="agenda-tag ${String(etiqueta).toLowerCase()}">${escapeHtml(etiqueta)}</small>${state.agendaExpandida && item.descricao ? `<p>${escapeHtml(item.descricao)}</p>` : ''}</div><div class="agenda-mobile-item-actions"><button type="button" class="agenda-mobile-move" onclick="abrirMoverAgendaVendas('${escapeAttr(item.id)}')" aria-label="Alterar data">↗</button><button type="button" class="agenda-mobile-delete" onclick="excluirItemAgendaVendas('${escapeAttr(item.id)}')" aria-label="Excluir agendamento">×</button></div></article>`;
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

function renderPublicacoes(tipo) {
  const informacao = tipo === 'informacoes';
  const temBusca = Boolean(String(state.busca || '').trim());
  return `<section class="module-page publicacoes-page${temBusca ? ' is-searching' : ''}"><div class="module-sticky-head"><div class="module-title"><div><h2>${informacao ? 'Informações' : 'Novidades'}</h2><p>${informacao ? 'Tutoriais, comunicados técnicos e atualizações.' : 'Atualizações, promoções e comunicados da empresa.'}</p></div></div>${renderBarraBusca('Buscar por título ou conteúdo...', 'Filtros')}</div><article class="publication-empty"><span>${svgIcon(informacao ? 'info' : 'bell')}</span><h3>${informacao ? 'Nenhuma informação encontrada' : 'Nenhuma novidade encontrada'}</h3><p>${informacao ? 'Tente ajustar seus filtros de busca.' : 'Aguarde por novas publicações.'}</p></article></section>`;
}

function renderDivulgacao() {
  const temBusca = Boolean(String(state.busca || '').trim());
  return `<section class="module-page materials-page divulgacao-page${temBusca ? ' is-searching' : ''}"><div class="module-sticky-head"><div class="module-title"><div><h2>Divulgação</h2><p>Artes, catálogos e vídeos para compartilhar.</p></div></div>${renderBarraBusca('Pesquisar materiais', 'Filtros')}</div><div class="materials-grid"><button><span>${svgIcon('folder')}</span><h3>Catálogos</h3><p>Materiais de produtos</p></button><button><span>${svgIcon('folder')}</span><h3>Campanhas</h3><p>Artes para divulgação</p></button><button><span>${svgIcon('folder')}</span><h3>Vídeos</h3><p>Conteúdo para compartilhar</p></button></div></section>`;
}

function renderConfiguracoes() {
  const t = totaisPeriodo();
  const progresso = state.metaMensal > 0 ? Math.min(100, t.total / state.metaMensal * 100) : 0;
  const telefone = String(state.usuario?.telefone || '');
  return `<section class="module-page settings-page">
    <div class="module-sticky-head"><div class="module-title"><div><h2>Configurações</h2><p>Preferências, segurança e recursos do Vendas.</p></div></div></div>
    <div class="settings-grid">
      <article class="settings-card"><h3>${svgIcon('user')} Dados do Usuário</h3><dl><dt>Nome Completo:</dt><dd>${escapeHtml(state.usuario.nome)}</dd><dt>Celular confirmado:</dt><dd>${telefone ? escapeHtml(mascararTelefone(telefone)) : 'Não informado'}</dd><dt>Representação/Empresa:</dt><dd>AvantaLab</dd></dl><div class="actions"><button class="secondary" onclick="abrirAtualizarTelefone()">${svgIcon('phone')} ${telefone ? 'Alterar celular' : 'Cadastrar celular'}</button></div></article>
      <article class="settings-card"><h3>${svgIcon('settings')} Aparência</h3><label class="switch-line"><span>Modo Escuro (Dark Mode)</span><input type="checkbox" ${state.temaEscuro ? 'checked' : ''} onchange="alternarTema(this.checked)"><i></i></label><p>Alterne o tema da aplicação para maior conforto visual.</p></article>
    </div>
    <article class="settings-card settings-goal"><h3>${svgIcon('target')} Medidor de Meta Mensal</h3><div class="goal-values"><b>Vendas Atuais: <em>${moeda(t.total)}</em></b><b>Meta: ${moeda(state.metaMensal)}</b></div><div class="progress"><i style="width:${Math.max(2, progresso)}%"></i></div><p>Faltam <b>${moeda(Math.max(0, state.metaMensal - t.total))}</b> para atingir sua meta! Vamos lá! 🚀</p><div class="settings-form"><input id="metaConfig" type="number" step="0.01" min="0" value="${state.metaMensal || ''}" placeholder="Definir nova Meta (R$)"><button class="primary" onclick="salvarMeta()">${svgIcon('save')} Salvar</button></div></article>
    <article class="settings-card"><h3>${svgIcon('lock')} Segurança e Senha</h3><p>Defina uma senha para entrar também por e-mail. Se você acessa pelo Google, esta é a sua primeira senha.</p><div class="password-form"><label>Nova Senha (mín. 8 caracteres)<input id="senhaNova" type="password" autocomplete="new-password" minlength="8"></label><label>Confirme Nova Senha<input id="senhaConfirma" type="password" autocomplete="new-password" minlength="8"></label><button class="password-button" onclick="alterarSenha()">${svgIcon('lock')} Salvar senha</button></div></article>
    <article class="settings-card"><h3>${svgIcon('package')} Catálogo de Produtos</h3><p>Importe um pacote Excel, exporte seu catálogo e gerencie as listas cadastradas.</p><div class="actions"><button class="secondary" onclick="baixarModeloProdutosExcel()">${svgIcon('download')} Modelo Excel</button><button class="primary" onclick="abrirImportacaoPacote()">${svgIcon('package')} Pacote de produtos</button></div></article>
    <article class="settings-card"><h3>${svgIcon('save')} Aplicativo Web (PWA)</h3><p>Instale o aplicativo na tela inicial para acesso rápido, como um app nativo.</p><button class="install-button" onclick="instalarPWA()">Adicionar à Área de Trabalho</button><small>Se o botão não aparecer, use “Adicionar à tela inicial” no menu do navegador.</small></article>
    <article class="settings-card settings-exit-card"><h3>${svgIcon('log-out')} Sair</h3><p>Encerre sua sessão neste aparelho.</p><button class="danger" onclick="abrirConfirmacaoSair()">Sair do Vendas</button></article>
  </section>`;
}

function salvarMeta() {
  state.metaMensal = Math.max(0, Number(valor('metaConfig') || 0));
  render();
  toast('Meta mensal salva.');
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
    toast('Senha salva. Agora você também pode entrar com e-mail e senha.');
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

function renderBarraBusca(placeholder, filtro = 'Ordem Alfabética') {
  const temBusca = Boolean(String(state.busca || '').trim());
  const filtroAlfabetico = normalizar(filtro).includes('ordem alfabetica');
  const rotuloFiltro = filtroAlfabetico ? `Ordem ${ordemAlfabetica === 'asc' ? 'A/Z' : 'Z/A'}` : filtro;
  return `<article class="tridium-search-card"><div class="search-input-wrap">${svgIcon('search')}<input value="${escapeAttr(state.busca)}" placeholder="${escapeAttr(placeholder)}" oninput="atualizarBusca(this.value)" onkeydown="if(event.key==='Enter') aplicarBusca()"><button type="button" class="search-clear${temBusca ? '' : ' is-hidden'}" onclick="limparBusca()" aria-label="Limpar pesquisa">×</button></div><div class="search-actions${temBusca ? '' : ' is-hidden'}"><button type="button" class="search-filter" ${filtroAlfabetico ? 'onclick="alternarOrdemAlfabetica()"' : ''}>${svgIcon('filter')}${escapeHtml(rotuloFiltro)}${filtroAlfabetico ? svgIcon('chevron-down') : ''}</button><button class="primary search-submit" onclick="aplicarBusca()">${svgIcon('search')} Buscar</button></div></article>`;
}

function alternarOrdemAlfabetica() {
  ordemAlfabetica = ordemAlfabetica === 'asc' ? 'desc' : 'asc';
  render();
}

function atualizarBusca(valor) {
  state.busca = valor;
  const temBusca = Boolean(String(valor || '').trim());
  app.querySelectorAll('.search-clear').forEach((botao) => botao.classList.toggle('is-hidden', !temBusca));
  app.querySelectorAll('.search-actions').forEach((acoes) => acoes.classList.toggle('is-hidden', !temBusca));
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
  render();
}

function renderProdutos() {
  const produtos = produtosFiltrados();
  const temBusca = Boolean(String(state.busca || '').trim());
  return `
    <section class="module-page produtos-page${temBusca ? ' is-searching' : ''}">
      <div class="module-sticky-head"><div class="module-title"><div><h2>Produtos</h2><p>Catálogo, custos e preços de venda.</p></div><button class="primary" onclick="this.blur();abrirProduto()">＋ Novo produto</button></div><div class="produtos-actions"><button class="ghost" onclick="baixarModeloProdutosExcel()" aria-label="Baixar modelo Excel">${svgIcon('save')} Modelo</button><button class="secondary" onclick="abrirImportacaoPacote()" aria-label="Importar pacote de produtos">${svgIcon('package')} Pacote</button><button class="primary" onclick="exportarProdutosExcel()" aria-label="Exportar produtos para Excel">${svgIcon('save')} Exportar</button></div>${renderBarraBusca('Pesquisar produtos', 'Ordem alfabética')}</div>
      <div class="module-stats product-package-stats"><span><b>${state.produtos.length}</b> produtos cadastrados</span><span><b>${state.pacotesProdutos.length}</b> pacotes ativos</span><button class="package-manage-link" onclick="abrirGerenciarPacotes()">${svgIcon('package')} Gerenciar</button></div>
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

function renderClientes() {
  const clientes = clientesFiltrados();
  const temBusca = Boolean(String(state.busca || '').trim());
  return `
    <section class="module-page clientes-page${temBusca ? ' is-searching' : ''}">
      <div class="module-sticky-head"><div class="module-title"><div><h2>Clientes</h2><p>Gerencie seus clientes</p></div><button class="primary" onclick="this.blur();abrirCliente()">＋ Novo cliente</button></div>${renderBarraBusca('Pesquisar', 'Ordem Alfabética')}</div>
      ${clientes.length ? `<section class="client-card-grid">${clientes.map(renderCliente).join('')}</section>` : `<article class="empty-module"><h3>Nenhum cliente cadastrado</h3><p>Cadastre o primeiro cliente para iniciar suas vendas.</p></article>`}
    </section>
  `;
}

function pedidoGeraDebito(venda) {
  const forma = normalizar(venda.forma_pagamento);
  return !pedidoEhConsignado(venda) && (forma === '' || forma === 'venda' || forma.includes('a prazo'));
}

function pagamentosDoCliente(clienteId) {
  return (state.pagamentos || [])
    .filter((pagamento) => pagamento.cliente_id === clienteId)
    .sort((a, b) => String(b.data_pagamento || b.criado_em || '').localeCompare(String(a.data_pagamento || a.criado_em || '')));
}

function saldoFinanceiroCliente(clienteId) {
  const pedidos = pedidosDoCliente(clienteId).filter((venda) => venda.status !== 'cancelada');
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

function renderCliente(c) {
  const vendasCliente = state.vendas.filter((v) => v.cliente_id === c.id && v.status !== 'cancelada' && !pedidoEhConsignado(v));
  const ultimaVenda = [...vendasCliente].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))[0];
  const saldo = saldoFinanceiroCliente(c.id);
  const debito = saldo.debito;
  const consignado = saldo.consignado;
  const credito = saldo.credito;
  const iniciais = String(c.nome || 'C').split(/\s+/).slice(0, 2).map((parte) => parte[0] || '').join('').toUpperCase();
  const local = [c.endereco, c.cidade, c.estado].filter(Boolean).join(' - ') || 'Não informado';
  const temTelefone = Boolean(String(c.telefone || '').replace(/\D/g, ''));
  return `
    <article class="client-card ${c.ativo === false ? 'inactive' : ''}">
      <header class="client-card-header">
        <div class="client-avatar">${escapeHtml(iniciais)}</div>
        <div class="client-identity"><h3>${escapeHtml(c.nome)}</h3></div>
        ${c.ativo === false ? '<span class="client-inactive">Inativo</span>' : ''}
        <button class="client-more" aria-label="Opções do cliente" onclick="abrirMenuCliente('${c.id}')">⋮</button>
      </header>
      <div class="client-contact-list">
        <div class="client-contact-actions">${temTelefone ? `<button type="button" onclick="ligarCliente('${c.id}')" aria-label="Ligar para ${escapeAttr(c.nome)}">${svgIcon('phone')} Ligar</button><button type="button" onclick="abrirWhatsappCliente('${c.id}')" aria-label="Chamar ${escapeAttr(c.nome)} no WhatsApp"><span class="whatsapp-mark">◉</span> WhatsApp</button>` : '<span class="client-contact-empty">Telefone não informado</span>'}</div>
        <button type="button" class="client-address-link" onclick="abrirMapasCliente('${c.id}')">${svgIcon('map-pin')}<span>${escapeHtml(local)}</span></button>
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

function clientesDisponiveisPedido() {
  return state.clientes
    .filter((cliente) => cliente.ativo !== false)
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }));
}

function totaisPedidoClienteRascunho() {
  const subtotal = (pedidoClienteRascunho?.itens || []).reduce((soma, item) => soma + Number(item.quantidade || 0) * Number(item.preco || 0), 0);
  const desconto = Math.max(0, Number(pedidoClienteRascunho?.desconto || 0));
  return { subtotal, desconto, total: Math.max(0, subtotal - desconto) };
}

function abrirNovoPedidoGeral() {
  const cliente = clientesDisponiveisPedido()[0];
  if (!cliente) { fecharSheet(); toast('Cadastre um cliente antes de criar o pedido.'); return; }
  abrirNovoPedidoCliente(cliente.id, true);
}

function abrirNovoPedidoCliente(clienteId, permitirSelecao = false) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  pedidoClienteRascunho = {
    clienteId,
    permitirSelecaoCliente: Boolean(permitirSelecao),
    tipo: 'venda',
    data: isoData(new Date()),
    produtoId: '',
    quantidade: 1,
    preco: 0,
    desconto: 0,
    itens: [],
  };
  mostrarCardPedidoCliente();
}

function mostrarCardPedidoCliente() {
  const rascunho = pedidoClienteRascunho;
  const cliente = state.clientes.find((item) => item.id === rascunho?.clienteId);
  if (!rascunho || !cliente) return;
  const produtos = produtosDisponiveisPedido();
  const clientes = clientesDisponiveisPedido();
  const totais = totaisPedidoClienteRascunho();
  const itensHtml = rascunho.itens.length
    ? rascunho.itens.map((item, indice) => `<article><div><b>${escapeHtml(item.produto_nome)}</b><small>${item.quantidade} × ${moeda(item.preco)}</small></div><strong>${moeda(item.quantidade * item.preco)}</strong><button type="button" onclick="removerItemPedidoCliente(${indice})" aria-label="Excluir ${escapeAttr(item.produto_nome)}">×</button></article>`).join('')
    : '<p class="transaction-empty">Nenhum item inserido.</p>';
  sheet(`
    <div class="sheet-header"><div><h2>Novo pedido</h2><p class="muted small">${rascunho.permitirSelecaoCliente ? 'Selecione o cliente' : escapeHtml(cliente.nome)}</p></div><button class="close" onclick="fecharSheet()">×</button></div>
    <div class="order-transaction-layout">
      <div class="order-transaction-fixed">
        ${rascunho.permitirSelecaoCliente ? `<label class="transaction-field transaction-client-select"><span>Cliente</span><select id="pedidoClienteSelecionado" onchange="selecionarClientePedido(this.value)">${clientes.map((item) => `<option value="${item.id}" ${item.id === rascunho.clienteId ? 'selected' : ''}>${escapeHtml(item.nome)}</option>`).join('')}</select></label>` : ''}
        <div class="transaction-type-switch"><button type="button" class="${rascunho.tipo === 'venda' ? 'active' : ''}" onclick="selecionarTipoPedidoCliente('venda')">Venda</button><button type="button" class="${rascunho.tipo === 'consignado' ? 'active' : ''}" onclick="selecionarTipoPedidoCliente('consignado')">Consignado</button></div>
        <label class="transaction-field transaction-date-field"><span>Data do pedido</span><input id="pedidoClienteData" type="date" value="${escapeAttr(rascunho.data)}" onchange="pedidoClienteRascunho.data=this.value"></label>
      <article class="order-product-entry">
        <h3>Inserir produto</h3>
        ${produtos.length ? `<label class="transaction-field"><span>Produto</span><select id="pedidoClienteProduto" onchange="selecionarProdutoPedidoCliente(this.value)"><option value="" ${rascunho.produtoId ? '' : 'selected'} disabled>Selecione o produto</option>${produtos.map((produto) => `<option value="${produto.id}" ${produto.id === rascunho.produtoId ? 'selected' : ''}>${escapeHtml(produto.nome)}</option>`).join('')}</select></label>
        <div class="order-item-fields"><label class="transaction-field"><span>Quantidade</span><div class="quantity-stepper"><button type="button" onclick="ajustarQuantidadePedidoCliente(-1)">−</button><input id="pedidoClienteQuantidade" type="number" min="1" step="1" inputmode="numeric" value="${escapeAttr(rascunho.quantidade)}" onfocus="if(this.value==='1')this.value=''" oninput="sincronizarQuantidadePedidoCliente(this.value)" onblur="normalizarQuantidadePedidoCliente()"><button type="button" onclick="ajustarQuantidadePedidoCliente(1)">+</button></div></label><label class="transaction-field"><span>Preço</span><input id="pedidoClientePreco" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(rascunho.preco || 0).toFixed(2)}" oninput="pedidoClienteRascunho.preco=Number(this.value||0)"></label></div>
        <button type="button" class="primary order-insert-item" onclick="inserirItemPedidoCliente()">Inserir item</button>` : '<p class="transaction-empty">Cadastre produtos antes de criar um pedido.</p>'}
      </article>
      </div>
      <section class="order-draft-scroll"><div class="order-draft-items"><h3>Itens do pedido</h3>${itensHtml}</div></section>
      <section class="transaction-totals">
        <div><span>Subtotal</span><b id="pedidoClienteSubtotal">${moeda(totais.subtotal)}</b></div>
        <label><span>Desconto</span><input id="pedidoClienteDesconto" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(totais.desconto).toFixed(2)}" oninput="atualizarDescontoPedidoCliente(this.value)"></label>
        <div class="total"><span>Total final</span><b id="pedidoClienteTotal">${moeda(totais.total)}</b></div>
      </section>
    </div>
    <footer class="client-transaction-footer"><button type="button" class="primary" onclick="finalizarPedidoCliente()">Finalizar pedido <b id="pedidoClienteBotaoTotal">(${moeda(totais.total)})</b></button></footer>
  `, 'sheet-backdrop-centered client-transaction-backdrop order-transaction-backdrop');
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

function selecionarProdutoPedidoCliente(produtoId) {
  if (!pedidoClienteRascunho) return;
  const produto = state.produtos.find((item) => item.id === produtoId);
  pedidoClienteRascunho.produtoId = produtoId;
  pedidoClienteRascunho.preco = Number(produto?.preco || 0);
  const campoPreco = document.getElementById('pedidoClientePreco');
  if (campoPreco) campoPreco.value = pedidoClienteRascunho.preco.toFixed(2);
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
  const preco = Number(document.getElementById('pedidoClientePreco')?.value || pedidoClienteRascunho.preco || 0);
  if (!produto) { toast('Selecione um produto.'); return; }
  if (preco < 0) { toast('Informe um preço válido.'); return; }
  pedidoClienteRascunho.itens.push({ produto_id: produto.id, produto_nome: produto.nome, produto_sku: produto.sku || null, quantidade, preco });
  pedidoClienteRascunho.produtoId = '';
  pedidoClienteRascunho.quantidade = 1;
  pedidoClienteRascunho.preco = 0;
  mostrarCardPedidoCliente();
}

function removerItemPedidoCliente(indice) {
  if (!pedidoClienteRascunho) return;
  pedidoClienteRascunho.itens.splice(indice, 1);
  mostrarCardPedidoCliente();
}

function atualizarDescontoPedidoCliente(valorDesconto) {
  if (!pedidoClienteRascunho) return;
  pedidoClienteRascunho.desconto = Math.max(0, Number(valorDesconto || 0));
  const totais = totaisPedidoClienteRascunho();
  const subtotal = document.getElementById('pedidoClienteSubtotal');
  const total = document.getElementById('pedidoClienteTotal');
  const totalBotao = document.getElementById('pedidoClienteBotaoTotal');
  if (subtotal) subtotal.textContent = moeda(totais.subtotal);
  if (total) total.textContent = moeda(totais.total);
  if (totalBotao) totalBotao.textContent = `(${moeda(totais.total)})`;
}

async function finalizarPedidoCliente() {
  const rascunho = pedidoClienteRascunho;
  if (!state.clientes.some((cliente) => cliente.id === rascunho?.clienteId)) { toast('Selecione o cliente do pedido.'); return; }
  if (!rascunho?.itens.length) { toast('Insira ao menos um item no pedido.'); return; }
  const totais = totaisPedidoClienteRascunho();
  const dataPedido = valor('pedidoClienteData') || rascunho.data;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPedido)) { toast('Informe uma data válida.'); return; }
  const financeiroAnterior = saldoFinanceiroCliente(rascunho.clienteId);
  const saldoLiquidoAnterior = financeiroAnterior.debito - financeiroAnterior.credito;
  const saldoAtual = rascunho.tipo === 'consignado'
    ? financeiroAnterior.debito
    : Math.max(0, saldoLiquidoAnterior + totais.total);
  const venda = {
    id: id('vend'),
    cliente_id: rascunho.clienteId,
    status: 'concluida',
    subtotal: totais.subtotal,
    desconto: totais.desconto,
    total: totais.total,
    forma_pagamento: rascunho.tipo === 'consignado' ? 'Consignado' : 'Venda',
    observacoes: JSON.stringify({
      avantalab_pedido: true,
      tipo: rascunho.tipo,
      descricao: rascunho.tipo === 'consignado' ? 'Pedido consignado' : 'Pedido de venda',
      saldo_anterior: financeiroAnterior.debito,
      saldo_final: saldoAtual,
    }),
    itens: rascunho.itens.map((item) => ({ ...item, total: item.quantidade * item.preco })),
    criado_em: new Date(`${dataPedido}T12:00:00`).toISOString(),
  };
  try {
    const salvo = backendAtivo ? await window.VendasDb.saveOrder(venda) : venda;
    state.vendas.unshift(salvo);
    pedidoClienteRascunho = null;
    render();
    abrirPedidoCliente(salvo.id);
    toast('Pedido registrado. O comprovante está pronto para compartilhar.');
  } catch (error) { toast(traduzErro(error)); }
}

function abrirPagamentoCliente(clienteId) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  const saldo = saldoFinanceiroCliente(clienteId);
  pagamentoClienteRascunho = { clienteId, saldoAnterior: saldo.debito };
  sheet(`
    <div class="sheet-header"><div><h2>Registrar pagamento</h2><p class="muted small">${escapeHtml(cliente.nome)}</p></div><button class="close" onclick="fecharSheet()">×</button></div>
    <div class="client-transaction-scroll payment-entry-form">
      <label class="transaction-field"><span>Valor pago</span><input id="pagamentoClienteValor" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" oninput="atualizarResumoPagamentoCliente()"></label>
      <label class="transaction-field"><span>Valor total da dívida</span><input value="${escapeAttr(moeda(saldo.debito))}" readonly></label>
      <label class="transaction-field"><span>Desconto</span><input id="pagamentoClienteDesconto" type="number" min="0" step="0.01" inputmode="decimal" value="0.00" oninput="atualizarResumoPagamentoCliente()"></label>
      <section class="payment-balance-summary"><div><span>Saldo anterior</span><b>${moeda(saldo.debito)}</b></div><div><span>Valor pago + desconto</span><b id="pagamentoClienteAbatimento">${moeda(0)}</b></div><div class="final"><span>Saldo final</span><b id="pagamentoClienteSaldoFinal">${moeda(saldo.debito)}</b></div></section>
      <label class="transaction-field transaction-date-field"><span>Data do pagamento</span><input id="pagamentoClienteData" type="date" value="${isoData(new Date())}"></label>
      <label class="transaction-field"><span>Forma de pagamento</span><select id="pagamentoClienteForma"><option selected>Pix</option><option>Dinheiro</option><option>Cartão de crédito</option><option>Cartão de débito</option><option>Cheque</option><option>Boleto</option></select></label>
    </div>
    <footer class="client-transaction-footer"><button type="button" class="primary" onclick="confirmarPagamentoCliente()">Confirmar recebimento</button></footer>
  `, 'sheet-backdrop-centered client-transaction-backdrop payment-transaction-backdrop');
}

function resumoPagamentoCliente() {
  const saldoAnterior = Number(pagamentoClienteRascunho?.saldoAnterior || 0);
  const valorPago = Math.max(0, Number(valor('pagamentoClienteValor') || 0));
  const desconto = Math.max(0, Number(valor('pagamentoClienteDesconto') || 0));
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
  if (!rascunho) return;
  const resumo = resumoPagamentoCliente();
  const dataPagamento = valor('pagamentoClienteData');
  if (resumo.abatimento <= 0) { toast('Informe o valor pago ou o desconto.'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) { toast('Informe uma data válida.'); return; }
  const pagamento = {
    id: id('pag'),
    cliente_id: rascunho.clienteId,
    valor: resumo.valorPago,
    desconto: resumo.desconto,
    saldo_anterior: resumo.saldoAnterior,
    saldo_final: resumo.saldoFinal,
    data_pagamento: dataPagamento,
    forma_pagamento: valor('pagamentoClienteForma') || 'Pix',
    criado_em: new Date().toISOString(),
  };
  try {
    const salvo = backendAtivo ? await window.VendasDb.savePayment(pagamento) : pagamento;
    state.pagamentos = [salvo, ...(state.pagamentos || [])];
    pagamentoClienteRascunho = null;
    render();
    abrirPagamentoClienteDetalhe(salvo.id);
    toast('Recebimento confirmado. O comprovante está pronto para compartilhar.');
  } catch (error) { toast(traduzErro(error)); }
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
  const endereco = [cliente.endereco, cliente.numero, cliente.complemento, cliente.cidade, cliente.estado, cliente.cep].filter(Boolean).join(', ');
  if (!endereco) { toast('Este cliente não possui endereço cadastrado.'); return; }
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
  try {
    const dados = { ...cliente, ativo: Boolean(ativar) };
    const salvo = backendAtivo ? await window.VendasDb.saveClient(dados) : dados;
    state.clientes = state.clientes.map((item) => item.id === clienteId ? salvo : item);
    fecharSheet(); render(); toast(ativar ? 'Cliente ativado.' : 'Cliente desativado.');
  } catch (error) { toast(traduzErro(error)); }
}

function pedidosDoCliente(clienteId) {
  return state.vendas.filter((venda) => venda.cliente_id === clienteId).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
}

function pedidoEhConsignado(venda) {
  return normalizar(venda.forma_pagamento).includes('consign');
}

function listaPedidosClienteHtml(pedidos, pagina, vazio) {
  const limite = (pagina + 1) * 10;
  const itens = pedidos.slice(0, limite);
  if (!itens.length) return `<div class="client-report-empty">${escapeHtml(vazio)}</div>`;
  return `<div class="client-report-list">${itens.map((venda) => `<button type="button" class="client-report-row" onclick="abrirPedidoCliente('${venda.id}')"><span><b>${dataBR(venda.criado_em)}</b><small>${escapeHtml(venda.forma_pagamento || 'Não informado')} · ${(venda.itens || []).length} itens</small></span><strong>${moeda(venda.total)}</strong></button>`).join('')}</div>${pedidos.length > limite ? '<button class="ghost client-load-more" onclick="abrirDetalhesCliente(\'' + pedidos[0].cliente_id + '\', window.currentClientDetailTab, ' + (pagina + 1) + ')">Carregar mais</button>' : ''}`;
}

function listaPagamentosClienteHtml(pagamentos, pagina) {
  const limite = (pagina + 1) * 10;
  const itens = pagamentos.slice(0, limite);
  if (!itens.length) return '<div class="client-report-empty">Nenhum pagamento registrado.</div>';
  return `<div class="client-report-list">${itens.map((pagamento) => `<button type="button" class="client-report-row" onclick="abrirPagamentoClienteDetalhe('${pagamento.id}')"><span><b>${dataBR(`${pagamento.data_pagamento}T12:00:00`)}</b><small>${escapeHtml(pagamento.forma_pagamento || 'Não informado')}${Number(pagamento.desconto || 0) > 0 ? ` · desconto ${moeda(pagamento.desconto)}` : ''}</small></span><strong>${moeda(pagamento.valor)}</strong></button>`).join('')}</div>${pagamentos.length > limite ? `<button class="ghost client-load-more" onclick="abrirDetalhesCliente('${pagamentos[0].cliente_id}', 'pagamentos', ${pagina + 1})">Carregar mais</button>` : ''}`;
}

function abrirDetalhesCliente(clienteId, aba = 'resumo', pagina = 0) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  window.currentClientDetailTab = aba;
  const pedidos = pedidosDoCliente(clienteId);
  const consignados = pedidos.filter((venda) => venda.status !== 'cancelada' && pedidoEhConsignado(venda));
  const pagamentos = pagamentosDoCliente(clienteId);
  const saldo = saldoFinanceiroCliente(clienteId);
  const totalComprado = pedidos.filter((venda) => venda.status !== 'cancelada' && !pedidoEhConsignado(venda)).reduce((soma, venda) => soma + Number(venda.total || 0), 0);
  const conteudo = aba === 'resumo'
    ? `<div class="client-summary-grid"><div><small>Débito pendente</small><b>${moeda(saldo.debito)}</b></div><div><small>Consignação</small><b>${moeda(saldo.consignado)}</b></div><div><small>Crédito</small><b>${moeda(saldo.credito)}</b></div><div><small>Total comprado</small><b>${moeda(totalComprado)}</b></div></div>`
    : aba === 'consignado'
      ? listaPedidosClienteHtml(consignados, pagina, 'Nenhum pedido consignado ativo.')
      : aba === 'pedidos'
        ? listaPedidosClienteHtml(pedidos, pagina, 'Nenhum pedido registrado.')
        : listaPagamentosClienteHtml(pagamentos, pagina);
  sheet(`<div class="sheet-header"><div><h2>${escapeHtml(cliente.nome)}</h2><p class="muted small">Histórico do cliente</p></div><button class="close" onclick="fecharSheet()">×</button></div><nav class="client-detail-tabs"><button class="${aba === 'resumo' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','resumo')">Resumo</button><button class="${aba === 'consignado' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','consignado')">Consignado</button><button class="${aba === 'pedidos' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','pedidos')">Pedidos</button><button class="${aba === 'pagamentos' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','pagamentos')">Pagamentos</button></nav><div class="client-detail-content">${conteudo}</div>`, 'client-detail-backdrop sheet-backdrop-centered');
}

function abrirPagamentoClienteDetalhe(pagamentoId) {
  const pagamento = (state.pagamentos || []).find((item) => item.id === pagamentoId);
  if (!pagamento) return;
  const cliente = state.clientes.find((item) => item.id === pagamento.cliente_id);
  const resumo = resumoComprovantePagamento(pagamento);
  sheet(`<div class="sheet-header"><div><h2>Comprovante de pagamento</h2><p class="muted small">${escapeHtml(cliente?.nome || 'Cliente não informado')} · ${dataComprovante(pagamento.data_pagamento)}</p></div><button class="close" onclick="fecharSheet()">×</button></div><section class="payment-detail-summary receipt-detail-summary"><div><span>Valor pago</span><b>${moeda(pagamento.valor)}</b></div><div><span>Desconto</span><b>${moeda(pagamento.desconto)}</b></div><div><span>Forma</span><b>${escapeHtml(pagamento.forma_pagamento || 'Não informado')}</b></div><div><span>Saldo anterior</span><b>${moeda(resumo.saldoAnterior)}</b></div><div class="receipt-current-balance"><span>Saldo atual</span><b>${moeda(resumo.saldoAtual)}</b></div></section><button class="primary order-share" onclick="compartilharPagamento('${pagamentoId}')">${svgIcon('save')} Compartilhar comprovante</button>`, 'sheet-backdrop-centered receipt-view-backdrop');
}

function abrirPedidoCliente(pedidoId) {
  const venda = state.vendas.find((item) => item.id === pedidoId);
  if (!venda) return;
  const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
  const resumo = resumoComprovantePedido(venda);
  const tipo = pedidoEhConsignado(venda) ? 'Pedido consignado' : 'Comprovante de pedido';
  sheet(`<div class="sheet-header"><div><h2>${tipo}</h2><p class="muted small">${escapeHtml(cliente?.nome || 'Cliente não informado')} · ${dataComprovante(venda.criado_em)}</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="order-view-items">${(venda.itens || []).map((item) => `<div><span>${escapeHtml(item.produto_nome)}</span><b>${item.quantidade} × ${moeda(item.preco || item.preco_unitario)} · ${moeda(Number(item.quantidade || 0) * Number(item.preco || item.preco_unitario || 0))}</b></div>`).join('') || '<p class="muted">Sem itens registrados.</p>'}</div><section class="receipt-balance-summary"><div><span>Total dos itens</span><b>${moeda(venda.subtotal || venda.total)}</b></div><div><span>Saldo anterior</span><b>${moeda(resumo.saldoAnterior)}</b></div><div><span>Valor do pedido</span><b>${moeda(venda.total)}</b></div><div class="receipt-current-balance"><span>Saldo atual</span><b>${moeda(resumo.saldoAtual)}</b></div></section><button class="primary order-share" onclick="compartilharPedido('${pedidoId}')">${svgIcon('save')} Compartilhar comprovante</button>`, 'sheet-backdrop-centered receipt-view-backdrop');
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

function resumoComprovantePagamento(pagamento) {
  const temSaldos = pagamento?.saldo_anterior !== undefined && pagamento?.saldo_anterior !== null
    && pagamento?.saldo_final !== undefined && pagamento?.saldo_final !== null;
  if (temSaldos) return { saldoAnterior: Number(pagamento.saldo_anterior || 0), saldoAtual: Number(pagamento.saldo_final || 0) };
  const limite = timestampPagamento(pagamento);
  const debitosAnteriores = state.vendas
    .filter((item) => item.cliente_id === pagamento.cliente_id && item.status !== 'cancelada' && pedidoGeraDebito(item) && timestampPedido(item) < limite)
    .reduce((soma, item) => soma + Number(item.total || 0), 0);
  const abatimentosAnteriores = (state.pagamentos || [])
    .filter((item) => item.id !== pagamento.id && item.cliente_id === pagamento.cliente_id && timestampPagamento(item) < limite)
    .reduce((soma, item) => soma + Number(item.valor || 0) + Number(item.desconto || 0), 0);
  const saldoAnterior = Math.max(0, debitosAnteriores - abatimentosAnteriores);
  return { saldoAnterior, saldoAtual: Math.max(0, saldoAnterior - Number(pagamento.valor || 0) - Number(pagamento.desconto || 0)) };
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

function criarCanvasComprovante({ titulo, cliente, data, etiqueta = '', linhas = [], resumo = [] }) {
  const linhasExibidas = linhas.slice(0, 44);
  if (linhas.length > linhasExibidas.length) linhasExibidas.push({ principal: `+ ${linhas.length - linhasExibidas.length} itens adicionais`, secundario: '', valor: '' });
  const largura = 1080;
  const altura = Math.min(4000, Math.max(1350, 720 + linhasExibidas.length * 66 + resumo.length * 76));
  const canvas = document.createElement('canvas');
  canvas.width = largura; canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível gerar o comprovante.');
  ctx.fillStyle = '#f3f7fb'; ctx.fillRect(0, 0, largura, altura);
  const gradiente = ctx.createLinearGradient(0, 0, largura, 230);
  gradiente.addColorStop(0, '#0A1F44'); gradiente.addColorStop(1, '#1687D9');
  ctx.fillStyle = gradiente; ctx.fillRect(0, 0, largura, 230);
  ctx.fillStyle = '#fff'; ctx.font = '900 48px Arial, sans-serif'; ctx.fillText('AVANTALAB', 64, 82);
  ctx.font = '800 32px Arial, sans-serif'; ctx.fillText(titulo, 64, 142);
  ctx.font = '600 24px Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(textoCanvasLimitado(ctx, cliente, 680), 64, 188);
  ctx.textAlign = 'right'; ctx.fillText(data, 1016, 188); ctx.textAlign = 'left';
  let y = 278;
  if (etiqueta) {
    ctx.font = '800 22px Arial, sans-serif';
    const larguraEtiqueta = ctx.measureText(etiqueta).width + 44;
    caminhoRetanguloArredondado(ctx, 64, y - 28, larguraEtiqueta, 46, 23);
    ctx.fillStyle = '#dff4ff'; ctx.fill(); ctx.fillStyle = '#075985'; ctx.fillText(etiqueta, 86, y + 3); y += 58;
  }
  caminhoRetanguloArredondado(ctx, 48, y, 984, Math.max(120, 78 + linhasExibidas.length * 66), 26);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.fillStyle = '#0A1F44'; ctx.font = '900 27px Arial, sans-serif'; ctx.fillText(linhasExibidas.length ? 'Detalhes' : 'Informações', 78, y + 48);
  y += 82;
  ctx.font = '700 23px Arial, sans-serif';
  linhasExibidas.forEach((linha, indice) => {
    if (indice) { ctx.strokeStyle = '#e1e9f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(78, y - 18); ctx.lineTo(1002, y - 18); ctx.stroke(); }
    ctx.fillStyle = '#172033'; ctx.fillText(textoCanvasLimitado(ctx, linha.principal, 600), 78, y + 5);
    if (linha.secundario) { ctx.fillStyle = '#64748b'; ctx.font = '600 19px Arial, sans-serif'; ctx.fillText(textoCanvasLimitado(ctx, linha.secundario, 600), 78, y + 33); ctx.font = '700 23px Arial, sans-serif'; }
    ctx.fillStyle = '#1687D9'; ctx.textAlign = 'right'; ctx.fillText(linha.valor || '', 1002, y + 8); ctx.textAlign = 'left';
    y += 66;
  });
  y += 34;
  caminhoRetanguloArredondado(ctx, 48, y, 984, 74 + resumo.length * 76, 26);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.fillStyle = '#0A1F44'; ctx.font = '900 27px Arial, sans-serif'; ctx.fillText('Resumo financeiro', 78, y + 48);
  y += 82;
  resumo.forEach((linha, indice) => {
    const destaque = indice === resumo.length - 1;
    if (destaque) { caminhoRetanguloArredondado(ctx, 68, y - 22, 944, 62, 18); ctx.fillStyle = '#e5f4ff'; ctx.fill(); }
    ctx.fillStyle = '#526477'; ctx.font = `${destaque ? '900' : '700'} 23px Arial, sans-serif`; ctx.fillText(linha.rotulo, 88, y + 15);
    ctx.fillStyle = destaque ? '#075985' : '#0A1F44'; ctx.textAlign = 'right'; ctx.font = `${destaque ? '900' : '800'} ${destaque ? 30 : 25}px Arial, sans-serif`; ctx.fillText(linha.valor, 992, y + 17); ctx.textAlign = 'left';
    y += 76;
  });
  ctx.fillStyle = '#64748b'; ctx.font = '600 20px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Comprovante gerado pelo Vendas AvantaLab', largura / 2, altura - 54); ctx.textAlign = 'left';
  return canvas;
}

async function compartilharCanvasComprovante(canvas, nomeArquivo, titulo) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Não foi possível gerar a imagem do comprovante.');
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [arquivo] }))) {
    try { await navigator.share({ title: titulo, text: 'Comprovante gerado pelo Vendas AvantaLab.', files: [arquivo] }); return; }
    catch (error) { if (error?.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = nomeArquivo; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Imagem do comprovante gerada.');
}

async function compartilharPedido(pedidoId) {
  const venda = state.vendas.find((item) => item.id === pedidoId);
  if (!venda) return;
  const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
  const resumo = resumoComprovantePedido(venda);
  const linhas = (venda.itens || []).map((item) => ({
    principal: item.produto_nome || 'Produto',
    secundario: `${Number(item.quantidade || 0)} × ${moeda(item.preco || item.preco_unitario)}`,
    valor: moeda(Number(item.quantidade || 0) * Number(item.preco || item.preco_unitario || 0)),
  }));
  const canvas = criarCanvasComprovante({
    titulo: pedidoEhConsignado(venda) ? 'Pedido consignado' : 'Comprovante de pedido',
    cliente: cliente?.nome || 'Cliente não informado',
    data: dataComprovante(venda.criado_em),
    etiqueta: pedidoEhConsignado(venda) ? 'CONSIGNADO' : 'VENDA',
    linhas,
    resumo: [
      { rotulo: 'Total dos itens', valor: moeda(venda.subtotal || venda.total) },
      { rotulo: 'Saldo anterior', valor: moeda(resumo.saldoAnterior) },
      { rotulo: 'Valor total do pedido', valor: moeda(venda.total) },
      { rotulo: 'Saldo atual', valor: moeda(resumo.saldoAtual) },
    ],
  });
  await compartilharCanvasComprovante(canvas, `pedido-${String(venda.id).slice(0, 8)}.png`, 'Comprovante de pedido AvantaLab');
}

async function compartilharPagamento(pagamentoId) {
  const pagamento = (state.pagamentos || []).find((item) => item.id === pagamentoId);
  if (!pagamento) return;
  const cliente = state.clientes.find((item) => item.id === pagamento.cliente_id);
  const resumo = resumoComprovantePagamento(pagamento);
  const abatimento = Number(pagamento.valor || 0) + Number(pagamento.desconto || 0);
  const canvas = criarCanvasComprovante({
    titulo: 'Comprovante de pagamento',
    cliente: cliente?.nome || 'Cliente não informado',
    data: dataComprovante(pagamento.data_pagamento),
    etiqueta: String(pagamento.forma_pagamento || 'PAGAMENTO').toUpperCase(),
    linhas: [
      { principal: 'Valor pago', secundario: pagamento.forma_pagamento || 'Não informado', valor: moeda(pagamento.valor) },
      { principal: 'Desconto', secundario: 'Abatimento concedido', valor: moeda(pagamento.desconto) },
    ],
    resumo: [
      { rotulo: 'Saldo anterior', valor: moeda(resumo.saldoAnterior) },
      { rotulo: 'Valor pago + desconto', valor: moeda(abatimento) },
      { rotulo: 'Saldo atual', valor: moeda(resumo.saldoAtual) },
    ],
  });
  await compartilharCanvasComprovante(canvas, `pagamento-${String(pagamento.id).slice(0, 8)}.png`, 'Comprovante de pagamento AvantaLab');
}

function renderPagamentos() {
  const clientes = clientesFiltrados();
  const pagamentos = [...(state.pagamentos || [])].sort((a, b) => String(b.data_pagamento || b.criado_em || '').localeCompare(String(a.data_pagamento || a.criado_em || ''))).slice(0, 10);
  const temBusca = Boolean(String(state.busca || '').trim());
  return `<section class="module-page pagamentos-page${temBusca ? ' is-searching' : ''}"><div class="module-sticky-head"><div class="module-title"><div><h2>Pagamentos</h2><p>Gerencie pagamentos, débitos e créditos.</p></div></div>${renderBarraBusca('Pesquisar clientes', 'Ordem Alfabética')}</div>${clientes.length ? `<section class="debt-card-grid">${clientes.map(renderClienteDebito).join('')}</section>` : `<article class="publication-empty"><span>${svgIcon('users')}</span><h3>Nenhum cliente encontrado</h3><p>Cadastre clientes para controlar pagamentos e débitos.</p></article>`}<section class="payment-history-panel"><header><div><h3>Últimos pagamentos</h3><p>Os 10 recebimentos mais recentes.</p></div><b>${pagamentos.length}</b></header>${pagamentos.length ? `<div>${pagamentos.map((pagamento) => { const cliente = state.clientes.find((item) => item.id === pagamento.cliente_id); return `<button type="button" onclick="abrirPagamentoClienteDetalhe('${pagamento.id}')"><span><b>${escapeHtml(cliente?.nome || 'Cliente não informado')}</b><small>${dataBR(`${pagamento.data_pagamento}T12:00:00`)} · ${escapeHtml(pagamento.forma_pagamento || 'Não informado')}</small></span><strong>${moeda(pagamento.valor)}</strong></button>`; }).join('')}</div>` : '<p class="transaction-empty">Nenhum pagamento registrado.</p>'}</section></section>`;
}

function renderClienteDebito(c) {
  const saldo = saldoFinanceiroCliente(c.id);
  return `<article class="debt-card"><header><span>${svgIcon('user')}</span><div><h3>${escapeHtml(c.nome)}</h3><p>${escapeHtml(c.telefone || 'Não informado')}</p></div></header><div class="debt-values"><div class="pending"><small>Pendente</small><b>${moeda(saldo.debito)}</b></div><div class="consigned"><small>Consignado</small><b>${moeda(saldo.consignado)}</b></div><div class="credit"><small>Crédito</small><b>${moeda(saldo.credito)}</b></div></div><button class="debt-details" onclick="abrirPagamentoCliente('${c.id}')">${svgIcon('dollar')} Registrar pagamento</button></article>`;
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
      <article class="data-panel orders-panel"><table><thead><tr><th>Cliente</th><th>Data</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Status</th></tr></thead><tbody>${exibidas.length ? exibidas.map(renderVenda).join('') : `<tr><td colspan="6" class="table-empty">Nenhum pedido encontrado.</td></tr>`}</tbody></table></article>
      ${vendas.length > exibidas.length ? `<button class="ghost orders-load-more" onclick="carregarMaisPedidos()">Carregar mais 10</button>` : ''}
    </section>
  `;
}

function tipoPedido(venda) {
  const identificadores = [venda.tipo, venda.tipo_pedido, venda.categoria, venda.natureza, venda.forma_pagamento, venda.status, venda.observacoes]
    .map((valorItem) => normalizar(valorItem))
    .join(' ');
  if (identificadores.includes('bonific')) return 'bonificacoes';
  if (identificadores.includes('consign')) return 'consignados';
  return 'pedidos';
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
  return `
    <tr><td><b>${escapeHtml(cliente?.nome || 'Cliente não informado')}</b></td><td>${dataBR(v.criado_em)}</td><td>${(v.itens || []).length}</td><td>${escapeHtml(v.forma_pagamento || 'Não informado')}</td><td><b>${moeda(v.total)}</b></td><td><span class="status-pill ${v.status === 'cancelada' ? 'warn' : 'ok'}">${escapeHtml(v.status || 'registrado')}</span></td></tr>
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
      state.produtos = [...salvos.map((produto) => ({ ...produto, preco_custo: Number(produto.metadados?.preco_custo || 0), pacote_origem_id: produto.metadados?.pacote?.id || null })), ...state.produtos];
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

function abrirProduto(produtoId = '') {
  const p = state.produtos.find((item) => item.id === produtoId) || {};
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
        ${campo('prodCusto', 'Preço de custo', p.preco_custo || '', 'number', '0.01')}
        ${campo('prodPreco', 'Preço de venda', p.preco || '', 'number', '0.01')}
      </div>
      ${campo('prodEstoque', 'Estoque', p.estoque ?? '', 'number', '0.001')}
      ${campo('prodImagem', 'Link da imagem (opcional)', p.imagem_url || '', 'url')}
      <div class="field"><label>Descrição</label><textarea id="prodDescricao">${escapeHtml(p.descricao || '')}</textarea></div>
      <div class="actions">
        <button class="primary" onclick="salvarProduto('${produtoId}')">Salvar</button>
        ${produtoId ? `<button class="danger" onclick="removerProduto('${produtoId}')">Remover</button>` : ''}
      </div>
    </div>
  `, 'cliente-sheet-backdrop');
}

async function salvarProduto(produtoId) {
  const dados = {
    nome: valor('prodNome').trim(),
    marca: valor('prodMarca').trim(),
    categoria: valor('prodCategoria').trim(),
    sku: valor('prodSku').trim(),
    unidade: valor('prodUnidade').trim() || 'un',
    preco: Number(valor('prodPreco') || 0),
    preco_custo: Number(valor('prodCusto') || 0),
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
    if (backendAtivo) {
      const salvoBruto = await window.VendasDb.saveProduct({ id: produtoId || null, ...dados, metadados: state.produtos.find((produto) => produto.id === produtoId)?.metadados || {} });
      const salvo = { ...salvoBruto, preco_custo: Number(salvoBruto.metadados?.preco_custo || 0), pacote_origem_id: salvoBruto.metadados?.pacote?.id || null };
      state.produtos = produtoId ? state.produtos.map((p) => p.id === produtoId ? salvo : p) : [salvo, ...state.produtos];
    } else if (produtoId) state.produtos = state.produtos.map((p) => p.id === produtoId ? { ...p, ...dados, atualizado_em: new Date().toISOString() } : p);
    else state.produtos.unshift({ id: id('prod'), ...dados, criado_em: new Date().toISOString() });
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
  sheet(`
    <div class="sheet-header">
      <div>
        <h2>${clienteId ? 'Editar cliente' : 'Novo cliente'}</h2>
        <p class="muted small">Cliente simples para venda direta.</p>
      </div>
      <button class="close" onclick="fecharSheet()">×</button>
    </div>
    <div class="grid client-form">
      ${campo('cliNome', 'Nome', c.nome || '')}
      ${campoTelefone('cliTelefone', 'Telefone / WhatsApp', c.telefone || '')}
      ${campo('cliEmail', 'E-mail', c.email || '', 'email')}
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
        <button class="primary" onclick="salvarCliente('${clienteId}')">Salvar</button>
        ${clienteId ? `<button class="danger" onclick="removerCliente('${clienteId}')">Remover</button>` : ''}
      </div>
    </div>
  `, 'cliente-sheet-backdrop sheet-backdrop-centered');
}

async function salvarCliente(clienteId) {
  const dados = {
    nome: valor('cliNome').trim(),
    telefone: valor('cliTelefone').trim() ? `+${valor('cliTelefoneDdi')}${valor('cliTelefone').replace(/\D/g, '')}` : '',
    email: valor('cliEmail').trim(),
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
  try {
    if (backendAtivo) {
      const salvo = await window.VendasDb.saveClient({ id: clienteId || null, ...dados });
      state.clientes = clienteId ? state.clientes.map((c) => c.id === clienteId ? salvo : c) : [salvo, ...state.clientes];
    } else if (clienteId) state.clientes = state.clientes.map((c) => c.id === clienteId ? { ...c, ...dados, atualizado_em: new Date().toISOString() } : c);
    else state.clientes.unshift({ id: id('cli'), ...dados, criado_em: new Date().toISOString() });
    fecharSheet(); toast('Cliente salvo.'); render();
  } catch (error) { toast(traduzErro(error)); }
}

async function removerCliente(clienteId) {
  if (!confirm('Remover este cliente? As vendas antigas continuarão registradas.')) return;
  try {
    if (backendAtivo) await window.VendasDb.deleteClient(clienteId);
    state.clientes = state.clientes.filter((c) => c.id !== clienteId);
    fecharSheet(); toast('Cliente removido.'); render();
  } catch (error) { toast(traduzErro(error)); }
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
          <input id="vendaDesconto" type="number" step="0.01" value="0" oninput="atualizarTotalCarrinho()" />
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
  const desconto = Number(valor('vendaDesconto') || 0);
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
  const desconto = Number(valor('vendaDesconto') || 0);
  const total = Math.max(0, subtotal - desconto);
  const venda = {
    id: id('vend'),
    cliente_id: valor('vendaCliente') || null,
    status: 'concluida',
    subtotal,
    desconto,
    total,
    forma_pagamento: valor('vendaPagamento'),
    itens: state.carrinho.map((item) => ({ ...item, total: item.quantidade * item.preco })),
    criado_em: new Date().toISOString(),
  };
  try {
    const salva = backendAtivo ? await window.VendasDb.saveOrder(venda) : venda;
    state.vendas.unshift(salva);
    state.carrinho = [];
    fecharSheet(); state.aba = 'vendas'; toast('Venda registrada com sucesso.'); render();
  } catch (error) { toast(traduzErro(error)); }
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

function abrirGestao() {
  const destino = `${window.location.origin}/mobile`;
  if (confirm(`Abrir gestão AvantaLab?\n${destino}`)) window.location.href = destino;
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
  localStorage.removeItem(STORAGE_KEY);
  state = { ...estadoInicial };
  fecharSheet();
  toast('Dados locais apagados.');
  render();
}

function produtoMaisVendido() {
  const mapa = new Map();
  state.vendas.filter((v) => v.status !== 'cancelada' && !pedidoEhConsignado(v)).forEach((v) => {
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
  state.vendas.filter((v) => v.status !== 'cancelada' && !pedidoEhConsignado(v) && v.cliente_id).forEach((v) => {
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

function valor(idCampo) {
  return document.getElementById(idCampo)?.value || '';
}

function sheet(html, backdropClass = '') {
  fecharSheet();
  rolagemAnteriorSheet = window.scrollY || document.documentElement.scrollTop || 0;
  const wrap = document.createElement('div');
  wrap.className = `sheet-backdrop ${backdropClass}`;
  wrap.id = 'sheetBackdrop';
  wrap.innerHTML = `<section class="sheet">${html}</section>`;
  wrap.addEventListener('click', (event) => {
    if (event.target === wrap) fecharSheet();
  });
  document.body.appendChild(wrap);
  document.body.classList.add('sheet-open');
  document.documentElement.classList.add('sheet-open');
  document.body.style.top = `-${rolagemAnteriorSheet}px`;
}

function fecharSheet() {
  const estavaAberto = Boolean(document.getElementById('sheetBackdrop'));
  document.getElementById('sheetBackdrop')?.remove();
  document.body.classList.remove('sheet-open');
  document.documentElement.classList.remove('sheet-open');
  document.body.style.top = '';
  if (estavaAberto) window.scrollTo(0, rolagemAnteriorSheet);
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

function escapeAttr(v) {
  return escapeHtml(v).replace(/`/g, '&#096;');
}

function botaoTemAcaoVisual(botao) {
  if (!(botao instanceof HTMLButtonElement) || botao.disabled) return false;
  if (botao.matches('.icon-button, .close, .password-toggle, .search-clear, .client-more, .home-button, .system-brand, .menu-toggle, .vendas-nav-item, .vendas-nav-add, .mobile-menu-header button')) return false;
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
  return !editando && !document.getElementById('sheetBackdrop') && !state.agendaFormAberto && !state.agendaItemMovendo;
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
    if (podeRecarregarAtualizacaoPwa()) window.location.reload();
    else atualizacaoPwaPendente = true;
  } catch { /* sem conexão: mantém a versão offline atual */ }
}

function aplicarAtualizacaoPwaPendente() {
  if (!atualizacaoPwaPendente || !podeRecarregarAtualizacaoPwa()) return;
  window.location.reload();
}

if (!window.__VENDAS_MOBILE_EMBEDDED__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

if (window.__VENDAS_MOBILE_EMBEDDED__) {
  window.setTimeout(verificarAtualizacaoPwa, 12000);
  window.setInterval(verificarAtualizacaoPwa, 120000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verificarAtualizacaoPwa(); });
  document.addEventListener('focusout', () => window.setTimeout(aplicarAtualizacaoPwaPendente, 0));
}

window.setAba = setAba;
window.state = state;
window.abrirGestao = abrirGestao;
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
window.fecharSheet = fecharSheet;
window.alternarMenu = alternarMenu;
window.abrirSalaBotoes = abrirSalaBotoes;
window.sairMenuMobile = sairMenuMobile;
window.abrirAcoesRapidas = abrirAcoesRapidas;
window.acionarNavegacaoInferior = acionarNavegacaoInferior;
window.buscarCepCliente = buscarCepCliente;
window.abrirMenuCliente = abrirMenuCliente;
window.abrirAgendamentoCliente = abrirAgendamentoCliente;
window.abrirNovoPedidoCliente = abrirNovoPedidoCliente;
window.abrirNovoPedidoGeral = abrirNovoPedidoGeral;
window.selecionarTipoPedidoCliente = selecionarTipoPedidoCliente;
window.selecionarClientePedido = selecionarClientePedido;
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
window.abrirPagamentoClienteDetalhe = abrirPagamentoClienteDetalhe;
window.alterarStatusCliente = alterarStatusCliente;
window.abrirDetalhesCliente = abrirDetalhesCliente;
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
window.alternarTema = alternarTema;
window.alterarSenha = alterarSenha;
window.abrirAtualizarTelefone = abrirAtualizarTelefone;
window.enviarCodigoAtualizarTelefone = enviarCodigoAtualizarTelefone;
window.confirmarAtualizarTelefone = confirmarAtualizarTelefone;
window.instalarPWA = instalarPWA;

window.addEventListener('pageshow', () => requestAnimationFrame(limparFocoInicialLogin));
window.addEventListener('scroll', agendarDestaqueClientes, { passive: true });
window.addEventListener('resize', agendarDestaqueClientes);
document.addEventListener('pointerdown', (event) => ativarFeedbackBotao(event.target instanceof Element ? event.target.closest('button') : null));
document.addEventListener('pointerup', (event) => removerFeedbackBotao(event.target instanceof Element ? event.target.closest('button') : null));
document.addEventListener('pointercancel', (event) => removerFeedbackBotao(event.target instanceof Element ? event.target.closest('button') : null));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') ativarFeedbackBotao(document.activeElement);
});
document.addEventListener('keyup', (event) => {
  if (event.key === 'Enter' || event.key === ' ') removerFeedbackBotao(document.activeElement);
});

inicializarApp();
