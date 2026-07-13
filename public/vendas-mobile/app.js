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
  clientes: [],
  vendas: [],
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
let rolagemAnteriorSheet = 0;
let cardsClientesEmDestaque = [];
let quadroDestaqueClientes = 0;
let botaoFeedbackAtivo = null;

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
  const persistente = { ...state, carrinho: [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistente));
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

function setAba(aba) {
  state.aba = aba;
  state.menuAberto = false;
  render();
}

function alternarMenu() {
  state.menuAberto = !state.menuAberto;
  render();
}

function abrirSalaBotoes() {
  state.menuAberto = true;
  render();
}

function totaisPeriodo() {
  const inicio = new Date(`${state.filtroInicio}T00:00:00`);
  const fim = new Date(`${state.filtroFim}T23:59:59`);
  const vendasMes = state.vendas.filter((v) => {
    const d = new Date(v.criado_em);
    return d >= inicio && d <= fim && v.status !== 'cancelada';
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
  if (!q) return state.produtos;
  return state.produtos.filter((p) => [p.nome, p.marca, p.categoria, p.sku].some((v) => normalizar(v).includes(q)));
}

function clientesFiltrados() {
  const q = normalizar(buscaAplicada);
  if (!q) return state.clientes;
  return state.clientes.filter((c) => [c.nome, c.telefone, c.email].some((v) => normalizar(v).includes(q)));
}

function render() {
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
  const cabecalho = `<header class="system-header"><button class="system-brand brand-home" onclick="abrirSalaBotoes()" aria-label="Ir para a sala de botões"><img src="./assets/logo-avantalab.png" alt="AvantaLab" /></button></header>`;
  app.innerHTML = `
    <aside class="sidebar ${state.menuAberto ? 'open' : ''}">
      <button class="sidebar-brand brand-home" onclick="abrirSalaBotoes()" aria-label="Ir para a sala de botões"><img src="./assets/logo-avantalab.png" alt="AvantaLab" /></button>
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
    <header class="mobile-menu-header"><div class="mobile-menu-brand"><img src="./assets/logo-avantalab.png" alt="AvantaLab" /></div></header>
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
    if (destino === 'configuracoes') setAba('configuracoes');
    else if (destino === 'tema') alternarTema(!state.temaEscuro);
    else if (destino === 'novo') abrirAcoesRapidas();
    else if (destino === 'agenda') setAba('agenda');
    else if (destino === 'inicio') abrirSalaBotoes();
  }, 130);
}

function abrirAcoesRapidas() {
  sheet(`<div class="sheet-header"><div><h2>Novo lançamento</h2><p class="muted small">Escolha o que deseja registrar.</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="quick-actions-grid"><button class="primary quick-action-button" onclick="fecharSheet();setAba('novo-pedido')">${svgIcon('shopping-bag')}<span>Lançar pedido</span></button><button class="secondary quick-action-button" onclick="fecharSheet();setAba('vender')">${svgIcon('credit-card')}<span>Lançar pagamento</span></button></div>`, 'sheet-backdrop-centered');
}

async function sairSistema() {
  try { if (backendAtivo) await window.VendasDb.signOut(); } catch (error) { console.error(error); }
  state.autenticado = false;
  state.menuAberto = false;
  state.produtos = [];
  state.clientes = [];
  state.vendas = [];
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

function comLimiteDeTempo(promessa, mensagem = 'A conexão com o AvantaLab demorou mais que o esperado. Tente novamente.') {
  return Promise.race([
    promessa,
    new Promise((_, rejeitar) => window.setTimeout(() => rejeitar(new Error(mensagem)), 15000)),
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
      state.clientes = dados.clientes;
      state.vendas = dados.vendas;
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
  const sessaoAtiva = conectandoGoogle
    ? await aguardarSessaoGoogle()
    : await window.VendasDb.hasSession();
  if (!sessaoAtiva) {
    carregandoBackend = false;
    conectandoGoogle = false;
    sessionStorage.removeItem(GOOGLE_CONNECTING_KEY);
    render();
    liberarAlturaPreparacao();
    return;
  }
  await carregarDadosBackend(false);
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
      ${kpi('Total Recebido', moeda(t.total), '⌁')}
      ${kpi('A Receber', moeda(0), '◷')}
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
  const detalheDia = selecionado ? `<section class="agenda-mobile-detail"><header><div><small>Dia selecionado</small><h3>${String(selecionado).padStart(2, '0')} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(ano, mes, 1))}</h3></div><button type="button" class="close" onclick="fecharDiaAgenda()">×</button></header><div class="agenda-mobile-reminders"><div><h4>Lembretes</h4><button type="button" class="primary" onclick="abrirFormularioAgendaVendas()">Adicionar</button></div>${itensDia.length ? itensDia.map(renderItemAgendaVendas).join('') : '<p class="agenda-mobile-none">Nenhum lembrete neste dia.</p>'}</div></section>` : '';
  return `<section class="agenda-mobile-page"><div class="agenda-mobile-month"><button type="button" onclick="moverMesAgendaVendas(-1)" aria-label="Mês anterior">‹</button><h2>${escapeHtml(titulo)}</h2><button type="button" onclick="moverMesAgendaVendas(1)" aria-label="Próximo mês">›</button></div><section class="agenda-mobile-screen ${animacao ? `agenda-anim-${animacao}` : ''}"><h2>AGENDA</h2><div class="agenda-mobile-week"><b>D</b><b>S</b><b>T</b><b>Q</b><b>Q</b><b>S</b><b>S</b></div><div class="agenda-mobile-grid">${dias.join('')}</div>${detalheDia}</section>${state.agendaFormAberto ? renderFormularioAgendaVendas() : ''}</section>`;
}

function itensAgendaVendas() {
  if (Array.isArray(state.agendaItens) && state.agendaItens.length) return state.agendaItens;
  return (state.compromissos || []).map((item) => {
    const data = new Date(`${item.data || isoData(new Date())}T12:00:00`);
    return { id: item.id, titulo: item.cliente || 'Compromisso', descricao: item.observacao || item.tipo || '', ano: data.getFullYear(), mes: data.getMonth(), dia: data.getDate(), repetir: false, repeticao: '' };
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
  const repeticao = item.repetir ? ({ diaria: 'Diária', semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal', anual: 'Anual' }[item.repeticao] || 'Mensal') : '';
  return `<article class="agenda-mobile-item"><div><b>${escapeHtml(item.titulo)}</b>${item.descricao ? `<p>${escapeHtml(item.descricao)}</p>` : ''}${repeticao ? `<small>${repeticao}</small>` : ''}</div><button type="button" class="agenda-mobile-delete" onclick="excluirItemAgendaVendas('${escapeAttr(item.id)}')" aria-label="Excluir lembrete">×</button></article>`;
}

function selecionarDiaAgenda(dia) { state.agendaDiaSelecionado = dia; state.agendaFormAberto = false; render(); }
function fecharDiaAgenda() { state.agendaDiaSelecionado = null; state.agendaFormAberto = false; render(); }
function moverMesAgendaVendas(direcao) { const data = new Date(Number(state.agendaAno), Number(state.agendaMes) + direcao, 1); state.agendaAno = data.getFullYear(); state.agendaMes = data.getMonth(); state.agendaDiaSelecionado = null; state.agendaFormAberto = false; state.agendaAnimar = direcao > 0 ? 'prox' : 'prev'; render(); }
function abrirFormularioAgendaVendas() { state.agendaFormAberto = true; render(); }
function cancelarFormularioAgendaVendas() { state.agendaFormAberto = false; render(); }
function renderFormularioAgendaVendas() { return `<div class="agenda-form-overlay" onclick="if(event.target===this)cancelarFormularioAgendaVendas()"><section class="agenda-form-card"><header><div><small>Novo item</small><h3>${String(state.agendaDiaSelecionado).padStart(2, '0')} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(state.agendaAno, state.agendaMes, 1))}</h3></div><button type="button" class="close" onclick="cancelarFormularioAgendaVendas()">×</button></header><div class="agenda-form-fields"><input id="agendaTituloVendas" placeholder="Título" autocomplete="off"><textarea id="agendaDescricaoVendas" placeholder="Descrição opcional"></textarea><label><input id="agendaRepetirVendas" type="checkbox"> <span>Repetir</span></label><select id="agendaRepeticaoVendas"><option value="mensal">Mensal</option><option value="diaria">Diária</option><option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option><option value="anual">Anual</option></select><div><button type="button" class="ghost" onclick="cancelarFormularioAgendaVendas()">Cancelar</button><button type="button" class="primary" onclick="salvarItemAgendaVendas()">Salvar</button></div></div></section></div>`; }
function salvarItemAgendaVendas() { const titulo = valor('agendaTituloVendas').trim(); if (!titulo) { toast('Informe um título.'); return; } const repetir = Boolean(document.getElementById('agendaRepetirVendas')?.checked); state.agendaItens = [...itensAgendaVendas(), { id: id('agenda'), titulo, descricao: valor('agendaDescricaoVendas').trim(), ano: Number(state.agendaAno), mes: Number(state.agendaMes), dia: Number(state.agendaDiaSelecionado), repetir, repeticao: repetir ? valor('agendaRepeticaoVendas') : '', criadoEm: new Date().toISOString() }]; state.agendaFormAberto = false; salvarEstado(); render(); toast('Lembrete salvo.'); }
function excluirItemAgendaVendas(itemId) { state.agendaItens = itensAgendaVendas().filter((item) => String(item.id) !== String(itemId)); salvarEstado(); render(); toast('Lembrete excluído.'); }

function renderPublicacoes(tipo) {
  const informacao = tipo === 'informacoes';
  return `<section class="module-page"><div class="module-title"><div><h2>${informacao ? `${svgIcon('info')} Informações do Sistema` : 'Novidades e Avisos'}</h2><p>${informacao ? 'Acesse tutoriais, comunicados técnicos e atualizações da plataforma.' : 'Acompanhe as atualizações, promoções e comunicados da empresa.'}</p></div></div>${renderBarraBusca('Buscar por título ou conteúdo...', 'Filtros')}<article class="publication-empty"><span>${svgIcon(informacao ? 'info' : 'bell')}</span><h3>${informacao ? 'Nenhuma informação encontrada' : 'Nenhuma novidade encontrada'}</h3><p>${informacao ? 'Tente ajustar seus filtros de busca.' : 'Aguarde por novas publicações.'}</p></article></section>`;
}

function renderDivulgacao() {
  return `<section class="materials-page"><div class="module-title"><div><h2>${svgIcon('folder')} Materiais AvantaLab</h2><p>Abra as pastas para compartilhar artes e vídeos com seus clientes.</p></div></div><div class="materials-search"><input placeholder="Pesquisar pastas..." value="${escapeAttr(state.busca)}" oninput="state.busca=this.value"><button onclick="aplicarBusca()">${svgIcon('search')}</button></div><div class="materials-grid"><button><span>${svgIcon('folder')}</span><h3>Catálogos</h3><p>Materiais de produtos</p></button><button><span>${svgIcon('folder')}</span><h3>Campanhas</h3><p>Artes para divulgação</p></button><button><span>${svgIcon('folder')}</span><h3>Vídeos</h3><p>Conteúdo para compartilhar</p></button></div></section>`;
}

function renderConfiguracoes() {
  const t = totaisPeriodo();
  const progresso = state.metaMensal > 0 ? Math.min(100, t.total / state.metaMensal * 100) : 0;
  const telefone = String(state.usuario?.telefone || '');
  return `<section class="settings-page">
    <h2>${svgIcon('settings')} Configurações do Representante</h2>
    <div class="settings-grid">
      <article class="settings-card"><h3>${svgIcon('user')} Dados do Usuário</h3><dl><dt>Nome Completo:</dt><dd>${escapeHtml(state.usuario.nome)}</dd><dt>Celular confirmado:</dt><dd>${telefone ? escapeHtml(mascararTelefone(telefone)) : 'Não informado'}</dd><dt>Representação/Empresa:</dt><dd>AvantaLab</dd></dl><div class="actions"><button class="secondary" onclick="abrirAtualizarTelefone()">${svgIcon('phone')} ${telefone ? 'Alterar celular' : 'Cadastrar celular'}</button></div></article>
      <article class="settings-card"><h3>${svgIcon('settings')} Aparência</h3><label class="switch-line"><span>Modo Escuro (Dark Mode)</span><input type="checkbox" ${state.temaEscuro ? 'checked' : ''} onchange="alternarTema(this.checked)"><i></i></label><p>Alterne o tema da aplicação para maior conforto visual.</p></article>
    </div>
    <article class="settings-card settings-goal"><h3>${svgIcon('target')} Medidor de Meta Mensal</h3><div class="goal-values"><b>Vendas Atuais: <em>${moeda(t.total)}</em></b><b>Meta: ${moeda(state.metaMensal)}</b></div><div class="progress"><i style="width:${Math.max(2, progresso)}%"></i></div><p>Faltam <b>${moeda(Math.max(0, state.metaMensal - t.total))}</b> para atingir sua meta! Vamos lá! 🚀</p><div class="settings-form"><input id="metaConfig" type="number" step="0.01" min="0" value="${state.metaMensal || ''}" placeholder="Definir nova Meta (R$)"><button class="primary" onclick="salvarMeta()">${svgIcon('save')} Salvar</button></div></article>
    <article class="settings-card"><h3>${svgIcon('lock')} Segurança e Senha</h3><p>Defina uma senha para entrar também por e-mail. Se você acessa pelo Google, esta é a sua primeira senha.</p><div class="password-form"><label>Nova Senha (mín. 8 caracteres)<input id="senhaNova" type="password" autocomplete="new-password" minlength="8"></label><label>Confirme Nova Senha<input id="senhaConfirma" type="password" autocomplete="new-password" minlength="8"></label><button class="password-button" onclick="alterarSenha()">${svgIcon('lock')} Salvar senha</button></div></article>
    <article class="settings-card"><h3>${svgIcon('package')} Catálogo de Produtos</h3><p>Importe uma planilha própria ou carregue o pacote de produtos disponível.</p><div class="actions"><button class="secondary" onclick="setAba('importar')">Importar produtos</button><button class="primary" onclick="carregarPacoteTridium()">${svgIcon('package')} Pacote de produtos</button></div></article>
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
  renderAtualizarTelefone();
}

function renderAtualizarTelefone() {
  const conteudo = telefonePerfilPendente
    ? `<p class="muted small">Enviamos um código para <b>${escapeHtml(mascararTelefone(telefonePerfilPendente))}</b>. Confirme-o para salvar seu celular.</p><div class="grid">${campo('perfilTelefoneCodigo', 'Código recebido', '', 'text')}<button class="primary" onclick="confirmarAtualizarTelefone()">Confirmar celular</button><button class="forgot-link" type="button" onclick="abrirAtualizarTelefone()">Alterar número</button></div>`
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
  if (!telefonePerfilPendente || !codigo) { toast('Digite o código recebido por SMS.'); return; }
  try {
    const resposta = await fetch('/api/sms/verificar-codigo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: telefonePerfilPendente, codigo }) });
    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Código inválido ou expirado.');
    await window.VendasDb.updateUserMetadata({ telefone: telefonePerfilPendente });
    state.usuario.telefone = telefonePerfilPendente;
    telefonePerfilPendente = null;
    fecharSheet();
    render();
    toast('Celular confirmado com sucesso.');
  } catch (error) { toast(traduzErro(error)); }
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
  return `<article class="tridium-search-card"><div class="search-input-wrap">${svgIcon('search')}<input value="${escapeAttr(state.busca)}" placeholder="${escapeAttr(placeholder)}" oninput="atualizarBusca(this.value)" onkeydown="if(event.key==='Enter') aplicarBusca()"><button type="button" class="search-clear${temBusca ? '' : ' is-hidden'}" onclick="limparBusca()" aria-label="Limpar pesquisa">×</button></div><div class="search-actions${temBusca ? '' : ' is-hidden'}"><button class="search-filter">${svgIcon('filter')}${escapeHtml(filtro)}${svgIcon('chevron-down')}</button><button class="primary search-submit" onclick="aplicarBusca()">${svgIcon('search')} Buscar</button></div></article>`;
}

function atualizarBusca(valor) {
  state.busca = valor;
  const temBusca = Boolean(String(valor || '').trim());
  app.querySelectorAll('.search-clear').forEach((botao) => botao.classList.toggle('is-hidden', !temBusca));
  app.querySelectorAll('.search-actions').forEach((acoes) => acoes.classList.toggle('is-hidden', !temBusca));
  app.querySelector('.clientes-page')?.classList.toggle('is-searching', temBusca);
  if (!temBusca && buscaAplicada) {
    buscaAplicada = '';
    render();
  }
}

function limparBusca() {
  state.busca = '';
  buscaAplicada = '';
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
  render();
}

function renderProdutos() {
  const produtos = produtosFiltrados();
  return `
    <section class="module-page">
      <div class="module-title"><div><h2>Produtos</h2><p>Catálogo e preços para suas vendas.</p></div><button class="primary" onclick="abrirProduto()">＋ Novo produto</button></div>
      ${renderBarraBusca('Pesquisar', 'Ordem Alfabética')}
      <div class="module-actions-line"><button class="secondary" onclick="carregarPacoteTridium()">${svgIcon('package')} Pacote de produtos</button></div>
      <div class="module-stats"><span><b>${state.produtos.length}</b> produtos cadastrados</span><span><b>${state.produtos.filter((p) => p.ativo !== false).length}</b> ativos</span></div>
    <section class="product-grid module-product-grid">
      ${produtos.length ? produtos.map(renderProduto).join('') : empty('Nenhum produto cadastrado.')}
    </section>
    </section>
  `;
}

function renderProduto(p) {
  const preco = p.preco_promocional || p.preco;
  return `
    <article class="product-card">
      <div class="product-image-wrap" onclick="abrirProduto('${p.id}')">
        ${p.imagem_url ? `<img class="product-image" src="${escapeAttr(p.imagem_url)}" alt="${escapeAttr(p.nome)}" />` : '<div class="product-placeholder">🛍️</div>'}
        <span class="product-badge">${escapeHtml(p.categoria || 'Geral')}</span>
      </div>
      <div class="product-content">
        <h3>${escapeHtml(p.nome)}</h3>
        <p class="row-sub">${escapeHtml(p.marca || 'Tridium')} · ${escapeHtml(p.sku || 'sem SKU')}</p>
        <p class="product-price">${moeda(preco)}</p>
        <div class="product-actions">
          <button class="ghost" onclick="abrirProduto('${p.id}')">Ver</button>
          <button class="primary" onclick="adicionarCarrinho('${p.id}')">Comprar</button>
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

function renderCliente(c) {
  const vendasCliente = state.vendas.filter((v) => v.cliente_id === c.id && v.status !== 'cancelada');
  const ultimaVenda = [...vendasCliente].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))[0];
  const debito = Number(c.debito_atual || c.saldo_pendente || 0);
  const consignado = Number(c.valor_consignado || c.saldo_consignado || 0);
  const credito = Number(c.credito_livre || 0);
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
        <div><button class="client-payment" onclick="setAba('vender')">${svgIcon('dollar')} Pagamento</button><button class="client-order" onclick="setAba('novo-pedido')">${svgIcon('shopping-bag')} Pedido</button></div>
      </div>
    </article>
  `;
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
  sheet(`<div class="sheet-header"><div><h2>${escapeHtml(cliente.nome)}</h2><p class="muted small">Opções do cliente</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="client-option-list"><button class="secondary" onclick="fecharSheet();abrirCliente('${clienteId}')">${iconeAcaoCliente('editar')} Editar</button><button class="danger" onclick="alterarStatusCliente('${clienteId}', ${cliente.ativo === false})">${iconeAcaoCliente('desativar')} ${acaoStatus}</button></div>`, 'sheet-backdrop-centered');
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
  const inicio = pagina * 10;
  const itens = pedidos.slice(inicio, inicio + 10);
  if (!itens.length) return `<div class="client-report-empty">${escapeHtml(vazio)}</div>`;
  return `<div class="client-report-list">${itens.map((venda) => `<button type="button" class="client-report-row" onclick="abrirPedidoCliente('${venda.id}')"><span><b>${dataBR(venda.criado_em)}</b><small>${escapeHtml(venda.forma_pagamento || 'Não informado')} · ${(venda.itens || []).length} itens</small></span><strong>${moeda(venda.total)}</strong></button>`).join('')}</div>${pedidos.length > inicio + 10 ? '<button class="ghost client-load-more" onclick="abrirDetalhesCliente(\'' + pedidos[0].cliente_id + '\', window.currentClientDetailTab, ' + (pagina + 1) + ')">Carregar mais</button>' : ''}`;
}

function abrirDetalhesCliente(clienteId, aba = 'resumo', pagina = 0) {
  const cliente = state.clientes.find((item) => item.id === clienteId);
  if (!cliente) return;
  window.currentClientDetailTab = aba;
  const pedidos = pedidosDoCliente(clienteId);
  const consignados = pedidos.filter((venda) => venda.status !== 'cancelada' && pedidoEhConsignado(venda));
  const pagamentos = pedidos.filter((venda) => venda.status !== 'cancelada' && !pedidoEhConsignado(venda) && normalizar(venda.forma_pagamento) !== 'a prazo');
  const totalComprado = pedidos.filter((venda) => venda.status !== 'cancelada').reduce((soma, venda) => soma + Number(venda.total || 0), 0);
  const conteudo = aba === 'resumo'
    ? `<div class="client-summary-grid"><div><small>Débito pendente</small><b>${moeda(cliente.debito_atual || cliente.saldo_pendente || 0)}</b></div><div><small>Consignação</small><b>${moeda(cliente.valor_consignado || cliente.saldo_consignado || 0)}</b></div><div><small>Crédito</small><b>${moeda(cliente.credito_livre || 0)}</b></div><div><small>Total comprado</small><b>${moeda(totalComprado)}</b></div></div>`
    : aba === 'consignado'
      ? listaPedidosClienteHtml(consignados, pagina, 'Nenhum pedido consignado ativo.')
      : aba === 'pedidos'
        ? listaPedidosClienteHtml(pedidos, pagina, 'Nenhum pedido registrado.')
        : listaPedidosClienteHtml(pagamentos, pagina, 'Nenhum pagamento registrado.');
  sheet(`<div class="sheet-header"><div><h2>${escapeHtml(cliente.nome)}</h2><p class="muted small">Histórico do cliente</p></div><button class="close" onclick="fecharSheet()">×</button></div><nav class="client-detail-tabs"><button class="${aba === 'resumo' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','resumo')">Resumo</button><button class="${aba === 'consignado' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','consignado')">Consignado</button><button class="${aba === 'pedidos' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','pedidos')">Pedidos</button><button class="${aba === 'pagamentos' ? 'active' : ''}" onclick="abrirDetalhesCliente('${clienteId}','pagamentos')">Pagamentos</button></nav><div class="client-detail-content">${conteudo}</div>`, 'client-detail-backdrop sheet-backdrop-centered');
}

function abrirPedidoCliente(pedidoId) {
  const venda = state.vendas.find((item) => item.id === pedidoId);
  if (!venda) return;
  const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
  sheet(`<div class="sheet-header"><div><h2>Pedido</h2><p class="muted small">${escapeHtml(cliente?.nome || 'Cliente não informado')} · ${dataBR(venda.criado_em)}</p></div><button class="close" onclick="fecharSheet()">×</button></div><div class="order-view-items">${(venda.itens || []).map((item) => `<div><span>${escapeHtml(item.produto_nome)}</span><b>${item.quantidade} × ${moeda(item.preco || item.preco_unitario)}</b></div>`).join('') || '<p class="muted">Sem itens registrados.</p>'}</div><div class="order-view-total"><span>Total</span><b>${moeda(venda.total)}</b></div><button class="primary order-share" onclick="compartilharPedido('${pedidoId}')"><svg class="svg-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Compartilhar</button>`, 'sheet-backdrop-centered');
}

async function compartilharPedido(pedidoId) {
  const venda = state.vendas.find((item) => item.id === pedidoId);
  if (!venda) return;
  const cliente = state.clientes.find((item) => item.id === venda.cliente_id);
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 720;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F7FAFC'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0A1F44'; ctx.fillRect(0, 0, canvas.width, 170);
  ctx.fillStyle = '#fff'; ctx.font = '900 44px Arial'; ctx.fillText('AvantaLab · Pedido', 70, 86);
  ctx.font = '600 29px Arial'; ctx.fillText(cliente?.nome || 'Cliente não informado', 70, 132);
  ctx.fillStyle = '#0A1F44'; ctx.font = '800 34px Arial'; ctx.fillText(`Total: ${moeda(venda.total)}`, 70, 240);
  ctx.font = '600 27px Arial'; (venda.itens || []).slice(0, 9).forEach((item, indice) => ctx.fillText(`${item.quantidade} × ${item.produto_nome}`, 70, 310 + indice * 42));
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const arquivo = new File([blob], 'pedido-avantalab.png', { type: 'image/png' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [arquivo] }))) await navigator.share({ title: 'Pedido AvantaLab', files: [arquivo] });
  else { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = arquivo.name; link.click(); URL.revokeObjectURL(link.href); }
}

function renderPagamentos() {
  const clientes = clientesFiltrados();
  return `<section class="module-page"><div class="module-title"><div><h2>Controle de Débitos</h2><p>Gerencie pagamentos, débitos e créditos.</p></div></div><article class="payment-search">${svgIcon('search')}<input placeholder="Pesquisar" value="${escapeAttr(state.busca)}" oninput="state.busca=this.value" onkeydown="if(event.key==='Enter') aplicarBusca()"></article>${clientes.length ? `<section class="debt-card-grid">${clientes.map(renderClienteDebito).join('')}</section>` : `<article class="publication-empty"><span>${svgIcon('users')}</span><h3>Nenhum cliente encontrado</h3><p>Cadastre clientes para controlar pagamentos e débitos.</p></article>`}</section>`;
}

function renderClienteDebito(c) {
  const pendente = Number(c.debito_atual || c.saldo_pendente || 0);
  const consignado = Number(c.valor_consignado || c.saldo_consignado || 0);
  const credito = Number(c.credito_livre || 0);
  return `<article class="debt-card"><header><span>${svgIcon('user')}</span><div><h3>${escapeHtml(c.nome)}</h3><p>${escapeHtml(c.telefone || 'Não informado')}</p></div></header><div class="debt-values"><div class="pending"><small>Pendente</small><b>${moeda(pendente)}</b></div><div class="consigned"><small>Consignado</small><b>${moeda(consignado)}</b></div><div class="credit"><small>Crédito</small><b>${moeda(credito)}</b></div></div><button class="debt-details" onclick="abrirCliente('${c.id}')">${svgIcon('eye')} Detalhes</button></article>`;
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
  const preco = Number(p.preco_promocional || p.preco || 0);
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
  const vendas = [...state.vendas].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
  return `
    <section class="module-page"><div class="module-title"><div><h2>Meus Pedidos</h2><p>Gerencie todos os pedidos registrados.</p></div><button class="primary" onclick="setAba('novo-pedido')">${svgIcon('plus')} Novo Pedido</button></div>${renderBarraBusca('Pesquisar', 'Mais Recente')}<article class="data-panel"><table><thead><tr><th>Cliente</th><th>Data</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Status</th></tr></thead><tbody>${vendas.length ? vendas.map(renderVenda).join('') : `<tr><td colspan="6" class="table-empty">Nenhum pedido registrado.</td></tr>`}</tbody></table></article></section>
  `;
}

function renderVenda(v) {
  const cliente = state.clientes.find((c) => c.id === v.cliente_id);
  return `
    <tr><td><b>${escapeHtml(cliente?.nome || 'Cliente não informado')}</b></td><td>${dataBR(v.criado_em)}</td><td>${v.itens.length}</td><td>${escapeHtml(v.forma_pagamento || 'Não informado')}</td><td><b>${moeda(v.total)}</b></td><td><span class="status-pill ${v.status === 'cancelada' ? 'warn' : 'ok'}">${escapeHtml(v.status)}</span></td></tr>
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
        <textarea id="csvInput" placeholder="marca,categoria,sku,nome,descricao,preco,preco_promocional,estoque,unidade,ativo"></textarea>
      </div>
      <button class="primary" style="width:100%;margin-top:10px" onclick="importarCsv()">Importar CSV</button>
    </article>
    </section>
  `;
}

function empty(texto) {
  return `<div class="empty">${escapeHtml(texto)}</div>`;
}

async function carregarPacoteTridium() {
  try {
    const res = await fetch('./data/tridium-package.json');
    const pacote = await res.json();
    let novos = 0;
    pacote.produtos.forEach((p) => {
      const existe = state.produtos.some((item) => item.sku && item.sku === p.sku);
      if (!existe) {
        state.produtos.push({
          id: id('prod'),
          pacote_origem: pacote.id,
          ...p,
          ativo: true,
          criado_em: new Date().toISOString(),
        });
        novos++;
      }
    });
    toast(novos ? `${novos} produtos Tridium carregados.` : 'Pacote Tridium já estava carregado.');
    state.aba = 'produtos';
    render();
  } catch {
    toast('Não foi possível carregar o pacote Tridium.');
  }
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
        ${campo('prodPreco', 'Preço', p.preco || '', 'number', '0.01')}
        ${campo('prodPromo', 'Preço promocional', p.preco_promocional || '', 'number', '0.01')}
      </div>
      ${campo('prodEstoque', 'Estoque', p.estoque ?? '', 'number', '0.001')}
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
    preco_promocional: valor('prodPromo') ? Number(valor('prodPromo')) : null,
    estoque: valor('prodEstoque') ? Number(valor('prodEstoque')) : null,
    descricao: valor('prodDescricao').trim(),
    ativo: true,
  };
  if (!dados.nome || !dados.preco) {
    toast('Informe nome e preço do produto.');
    return;
  }
  try {
    if (backendAtivo) {
      const salvo = await window.VendasDb.saveProduct({ id: produtoId || null, ...dados });
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
  const preco = Number(p.preco_promocional || p.preco || 0);
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
      preco_promocional: cols[idx('preco_promocional')] ? Number(String(cols[idx('preco_promocional')]).replace(',', '.')) : null,
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
  const conteudo = 'marca,categoria,sku,nome,descricao,preco,preco_promocional,estoque,unidade,ativo\nMinha Marca,Categoria,SKU-001,Produto Exemplo,Descricao do produto,49.90,,10,un,sim\n';
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
  state.vendas.filter((v) => v.status !== 'cancelada').forEach((v) => {
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
  state.vendas.filter((v) => v.status !== 'cancelada' && v.cliente_id).forEach((v) => {
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

if (!window.__VENDAS_MOBILE_EMBEDDED__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.setAba = setAba;
window.state = state;
window.abrirGestao = abrirGestao;
window.abrirConfiguracoes = abrirConfiguracoes;
window.abrirConfirmacaoSair = abrirConfirmacaoSair;
window.salvarConfiguracoes = salvarConfiguracoes;
window.resetarDados = resetarDados;
window.carregarPacoteTridium = carregarPacoteTridium;
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
window.alterarStatusCliente = alterarStatusCliente;
window.abrirDetalhesCliente = abrirDetalhesCliente;
window.abrirPedidoCliente = abrirPedidoCliente;
window.compartilharPedido = compartilharPedido;
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
window.selecionarDiaAgenda = selecionarDiaAgenda;
window.fecharDiaAgenda = fecharDiaAgenda;
window.moverMesAgendaVendas = moverMesAgendaVendas;
window.abrirFormularioAgendaVendas = abrirFormularioAgendaVendas;
window.cancelarFormularioAgendaVendas = cancelarFormularioAgendaVendas;
window.salvarItemAgendaVendas = salvarItemAgendaVendas;
window.excluirItemAgendaVendas = excluirItemAgendaVendas;
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
