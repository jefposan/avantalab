error: improper chunk offset(s) 26990 and 35eb8
(function () {
  var root = document.getElementById('mobile-root');
  var config = window.AVANTALAB_MOBILE_CONFIG || {};
  var supabaseGlobal = window.supabase;

  if (!root) return;

  function deveRedirecionarMobileParaWeb() {
    var standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone;

    if (standalone) return false;

    var larguraDesktop = window.innerWidth >= 1024;
    var userAgentMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
      navigator.userAgent
    );

    return larguraDesktop && !userAgentMobile;
  }

  if (window.location.pathname === '/mobile' && deveRedirecionarMobileParaWeb()) {
    window.location.replace('/');
    return;
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    config = {
      supabaseUrl: root.getAttribute('data-supabase-url') || '',
      supabaseAnonKey: root.getAttribute('data-supabase-anon-key') || '',
    };
  }

  if (!supabaseGlobal || !config.supabaseUrl || !config.supabaseAnonKey) {
    root.setAttribute('data-avantalab-mobile-ready', '1');
    root.innerHTML = telaAvisoMobile(
      'Conexao necessaria',
      'Para acessar seus dados com seguranca, conecte-se a internet e tente novamente.'
    );
    return;
  }

  var db = supabaseGlobal.createClient(config.supabaseUrl, config.supabaseAnonKey);
  var CHAVE_ULTIMO_PERFIL_MOBILE = 'avantalab_mobile_ultimo_perfil_id';
  var meses = [
    'JANEIRO',
    'FEVEREIRO',
    'MARÇO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO',
  ];

  var state = {
    pronto: false,
    autenticado: false,
    usuario: null,
    empresas: [],
    empresa: null,
    mes: meses[new Date().getMonth()],
    ano: String(new Date().getFullYear()),
    faturamentos: {},
    lancamentos: [],
    entradas: [],
    despesas: [],
    usuariosEmpresa: [],
    usuariosCarregando: false,
    usuariosAtivosSistema: null,
    usuariosAtivosCarregando: false,
    usuarioEditandoId: '',
    usuarioModo: '',
    usuarioExistenteTermo: '',
    usuarioExistenteResultado: null,
    usuarioExistentePerfil: 'operador_simples',
    pesquisandoUsuarioExistente: false,
    vinculandoUsuarioExistente: false,
    categoriaEditandoId: '',
    categoriaAcoesId: '',
    erro: '',
    mensagem: '',
    carregando: false,
    loginAcao: '',
    empresaAcao: '',
    loginValor: '',
    telaAcesso: 'boasVindas',
    modoSenha: false,
    modoCadastro: false,
    smsSenhaEnviado: false,
    smsCadastroEnviado: false,
    mostrarSenhaLogin: false,
    mostrarNovaSenha: false,
    mostrarConfirmarSenha: false,
    mostrarSenhaCadastro: false,
    mostrarConfirmarSenhaCadastro: false,
    loginRecuperacao: '',
    telefoneCadastroConfirmado: '',
    validacaoTelefoneObrigatoria: false,
    telefoneObrigatorio: '',
    telefoneObrigatorioConfirmado: '',
    codigoTelefoneObrigatorio: '',
    smsTelefoneObrigatorioEnviado: false,
    validandoTelefoneObrigatorio: false,
    cadastro: {
      nome: '',
      email: '',
      telefone: '',
      senha: '',
      confirmarSenha: '',
    },
    visao: 'home',
    busca: '',
    modalLancamento: false,
    modalAcao: null,
    tipoLancamento: 'despesa',
    modoReceita: 'entrada',
    menuAberto: false,
     menuConfigAberto: false,
    modalMenu: '',
    darkMode: false,
    installPrompt: null,
    isIos: /iphone|ipad|ipod/i.test(navigator.userAgent),
    novaCategoriaNome: '',
    novaCategoriaTipo: '',
    novaDespesaAberta: false,
    novaDespesaNome: '',
    novaDespesaCategoria: '',
    categoriasExpandido: false,
    tiposDespesaExpandido: false,
    ultimasDespesasExpandido: false,
    ultimasReceitasExpandido: false,
    ultimasDespesasBuscaAberta: false,
    ultimasReceitasBuscaAberta: false,
    ultimasDespesasBusca: '',
    ultimasReceitasBusca: '',
    dashboardOrdem: ordemDashboardPadrao(),
    dashboardOcultos: [],
    dragDashboardId: '',
    evolucaoSelecionada: {},
    toast: '',
    duplicadosAtivo: true,
    feedbackEtapa: 'inicio',
    feedbackTipo: '',
    feedbackMensagem: '',
    feedbackEnviando: false,
    manterConectado: false,
    empresaExclusaoAberta: false,
    empresaEdicaoAberta: false,
    empresaCriarAberta: false,
    editEmpresaNome: '',
    editEmpresaLogin: '',
    editEmpresaSenha: '',
    editEmpresaTipoPerfil: 'empresa',
    novaEmpresaTipoPerfil: 'empresa',
    cadastroTipoPerfil: 'empresa',
    modoCriarPerfil: false,
    criarPerfilNome: '',
    criarPerfilTipo: 'empresa',
    recorrencias: [],
    recorrSalvando: false,
    novaRecorrNome: '',
    novaRecorrDia: '',
    novaRecorrDescricao: '',
    novaRecorrValor: '',
    novaRecorrValorNumerico: 0,
    novaRecorrLancarAgora: false,
    recorrEditandoId: null,
    editRecorrNome: '',
    editRecorrDia: '',
    editRecorrDescricao: '',
    editRecorrValor: '',
    editRecorrValorNumerico: 0,
    editRecorrLancarAgora: false,
    formParcelar: false,
    formParcelas: 2,
    lancandoDespesa: false,
    _diaInvalido: false,
    chatIAAberto: false,
    chatIAMensagens: [{ role: 'assistant', content: 'Ola! Sou a Ava, sua assistente financeira. Posso analisar seus resultados, dar dicas ou tirar duvidas sobre o sistema. Como posso ajudar?' }],
    chatIADigitando: false,
    chatIAInput: '',
    chatIAGravando: false,
    chatIAAudioEnviando: false,
    chatIAAnimacao: '',
    agendaDiaSelecionado: null,
    agendaFormAberto: false,
    agendaItens: [],
    notificacoesNaoLidas: 0,
    mostrarPromptNotificacoes: false,
    pontoHoje: [],
    pontoBatendo: false,
    pontoComprovante: null,
    pontoView: 'bater',
    pontoCarregado: false,
    pontoRegistrosLista: [],
    pontoPeriodo: 'dia',
    pontoConfig: null,
    pontoFuncDados: null,
    tourAberto: false,
    tourPasso: 0,
    agendaTipoItem: 'lembrete',
    agendaTitulo: '',
    agendaDescricao: '',
    agendaRepetir: false,
    agendaRepeticao: 'mensal',
  };

  var CHAVE_MANTER_CONECTADO_ATE = 'avantalab_mobile_manter_conectado_ate';
  var CHAVE_SESSAO_TEMPORARIA = 'avantalab_mobile_sessao_temporaria';
  var CHAVE_OAUTH_TEMPORARIO_ATE = 'avantalab_mobile_oauth_temporario_ate';
  var CHAVE_AGENDA_ITENS = 'avantalab_mobile_agenda_itens';
  var CHAVE_PROMPT_NOTIF = 'avantalab_mobile_prompt_notif';
  var TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;
  var DEZ_MINUTOS_MS = 10 * 60 * 1000;

  // --- Helpers de tipo de perfil ---
  var CATEGORIAS_EMPRESA_MOBILE = [
    { nome: 'Amortizacao', descricao: 'Custos nao fisicos.', exemplos: 'Softwares, patente.' },
    { nome: 'Custos Variaveis', descricao: 'Variam com venda/producao.', exemplos: 'Embalagem, materia-prima, frete, comissao.' },
    { nome: 'Depreciacao', descricao: 'Uso/desgaste de bens fisicos.', exemplos: 'Maquinas, veiculos, equipamentos.' },
    { nome: 'Despesas Financeiras', descricao: 'Bancos, juros e operacoes.', exemplos: 'Juros, tarifas, taxas, cambio.' },
    { nome: 'Despesas Operacionais', descricao: 'Mantem o negocio funcionando.', exemplos: 'Aluguel, agua, luz, salarios, manutencao, pro-labore, publicidade.' },
    { nome: 'Impostos sobre Lucro', descricao: 'Tributos sobre lucro.', exemplos: 'IR e CSLL.' },
  ];

  var CATEGORIAS_PESSOAL_MOBILE = [
    { nome: 'Moradia', descricao: 'Gastos com sua casa ou local onde mora.', exemplos: 'Aluguel, condominio, financiamento, manutencao.' },
    { nome: 'Custos de Vida', descricao: 'Despesas essenciais do dia a dia.', exemplos: 'Mercado, agua, luz, internet, transporte, saude, educacao.' },
    { nome: 'Lazer e Consumo', descricao: 'Gastos nao essenciais e experiencias.', exemplos: 'Restaurantes, viagens, compras, assinaturas, presentes.' },
    { nome: 'Financeiro e Impostos', descricao: 'Custos financeiros e obrigacoes.', exemplos: 'Tarifas bancarias, juros, cartao, seguros, impostos, multas.' },
    { nome: 'Investimentos', descricao: 'Valores para patrimonio ou reservas.', exemplos: 'Aplicacoes, reserva de emergencia, previdencia, aportes.' },
  ];

  function normalizarTipoPerfil(valor) {
    return valor === 'pessoal' ? 'pessoal' : 'empresa';
  }

  function categoriasDoPerfil(tipoPerfil) {
    return normalizarTipoPerfil(tipoPerfil) === 'pessoal' ? CATEGORIAS_PESSOAL_MOBILE : CATEGORIAS_EMPRESA_MOBILE;
  }

  function rotuloTipoPerfil(tipoPerfil) {
    return normalizarTipoPerfil(tipoPerfil) === 'pessoal' ? 'Pessoal' : 'Empresa';
  }

  function rotuloNomePerfil(tipoPerfil) {
    return normalizarTipoPerfil(tipoPerfil) === 'pessoal' ? 'Nome do perfil' : 'Nome da empresa';
  }

  function placeholderNomePerfil(tipoPerfil) {
    return normalizarTipoPerfil(tipoPerfil) === 'pessoal' ? 'Ex: Minha vida financeira' : 'Ex: Minha Empresa';
  }
  // --- Fim helpers de tipo de perfil ---

  function dinheiro(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor || 0));
  }

  function inteiro(valor) {
    return new Intl.NumberFormat('pt-BR').format(Number(valor || 0));
  }

  function normalizarValor(valor) {
    return Number(
      String(valor || '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '') || 0
    );
  }

  function formatarMoedaDigitada(valor) {
    var apenasNumeros = String(valor || '').replace(/\D/g, '');
    if (!apenasNumeros) return '';

    return dinheiro(Number(apenasNumeros) / 100);
  }

  function mensagemErro(error, fallback) {
    if (!error || !error.message) return fallback || 'Nao foi possivel concluir a acao.';
    var texto = String(error.message || '').toLowerCase();
    if (texto.indexOf('failed to fetch') >= 0 || texto.indexOf('network') >= 0 || texto.indexOf('timeout') >= 0) {
      return 'Verifique sua conexao com a internet e tente novamente.';
    }
    if (texto.indexOf('row-level security') >= 0 || texto.indexOf('violates row-level security policy') >= 0 || error.code === '42501') {
      return 'Voce nao tem permissao para realizar esta acao.';
    }
    if (
      texto.indexOf('already registered') >= 0 ||
      texto.indexOf('already been registered') >= 0 ||
      texto.indexOf('user already registered') >= 0 ||
      texto.indexOf('email address has already') >= 0
    ) {
      return 'Este email ja possui cadastro. Faca login ou use a recuperacao de senha.';
    }
    if (texto.indexOf('duplicate key') >= 0 || error.code === '23505') return 'Este registro ja existe.';
    return fallback || 'Nao foi possivel concluir a acao. Tente novamente em instantes.';
  }

  function formatarDescricao(texto) {
    var limpo = String(texto || '').trim().toLowerCase();
    return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : '';
  }

  function textoBusca(valor) {
    return String(valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function limparPreferenciaSessaoMobile() {
    try {
      localStorage.removeItem(CHAVE_MANTER_CONECTADO_ATE);
      localStorage.removeItem(CHAVE_SESSAO_TEMPORARIA);
      localStorage.removeItem(CHAVE_OAUTH_TEMPORARIO_ATE);
      sessionStorage.removeItem(CHAVE_SESSAO_TEMPORARIA);
    } catch (error) {}
  }

  function registrarPreferenciaSessaoMobile(manterConectado, aguardandoOAuth) {
    try {
      if (manterConectado) {
        localStorage.setItem(CHAVE_MANTER_CONECTADO_ATE, String(Date.now() + TRINTA_DIAS_MS));
        localStorage.removeItem(CHAVE_SESSAO_TEMPORARIA);
        localStorage.removeItem(CHAVE_OAUTH_TEMPORARIO_ATE);
        sessionStorage.removeItem(CHAVE_SESSAO_TEMPORARIA);
        return;
      }

      localStorage.removeItem(CHAVE_MANTER_CONECTADO_ATE);
      localStorage.setItem(CHAVE_SESSAO_TEMPORARIA, '1');
      sessionStorage.setItem(CHAVE_SESSAO_TEMPORARIA, '1');

      if (aguardandoOAuth) {
        localStorage.setItem(CHAVE_OAUTH_TEMPORARIO_ATE, String(Date.now() + DEZ_MINUTOS_MS));
      } else {
        localStorage.removeItem(CHAVE_OAUTH_TEMPORARIO_ATE);
      }
    } catch (error) {}
  }

  function sessaoPersistenteValidaMobile() {
    try {
      var validade = Number(localStorage.getItem(CHAVE_MANTER_CONECTADO_ATE) || 0);
      if (!validade) return false;
      if (validade > Date.now()) return true;
      limparPreferenciaSessaoMobile();
      return false;
    } catch (error) {
      return false;
    }
  }

  function permitirRetornoOAuthTemporarioMobile() {
    try {
      var validade = Number(localStorage.getItem(CHAVE_OAUTH_TEMPORARIO_ATE) || 0);
      if (!validade || validade <= Date.now()) return false;
      sessionStorage.setItem(CHAVE_SESSAO_TEMPORARIA, '1');
      localStorage.removeItem(CHAVE_OAUTH_TEMPORARIO_ATE);
      return true;
    } catch (error) {
      return false;
    }
  }

  function deveEncerrarSessaoSalvaMobile() {
    try {
      if (sessaoPersistenteValidaMobile()) return false;

      if (localStorage.getItem(CHAVE_SESSAO_TEMPORARIA) === '1') {
        if (sessionStorage.getItem(CHAVE_SESSAO_TEMPORARIA) === '1') return false;
        if (permitirRetornoOAuthTemporarioMobile()) return false;
        limparPreferenciaSessaoMobile();
        return true;
      }

      return true;
    } catch (error) {
      return true;
    }
  }

  function maxDias(mes, ano) {
    if (['ABRIL', 'JUNHO', 'SETEMBRO', 'NOVEMBRO'].indexOf(mes) >= 0) return 30;
    if (mes === 'FEVEREIRO') {
      var numero = Number(ano);
      return numero % 4 === 0 && (numero % 100 !== 0 || numero % 400 === 0) ? 29 : 28;
    }
    return 31;
  }

  function escapeHtml(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function telaBase(conteudo) {
    return '<div class="mx-auto max-w-md px-4 py-5">' + conteudo + '</div>';
  }

  var APP_VERSION = '1.3.5.1';
  var APP_VERSION_LABEL = 'AvantaLab Gest&atilde;o v' + APP_VERSION;

  function telaAvisoMobile(titulo, texto) {
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex items-center justify-center overflow-hidden px-4" style="height:100dvh;">' +
        '<div class="w-full max-w-xs rounded-3xl border border-white/40 bg-white/25 p-5 text-center text-slate-900 shadow-2xl backdrop-blur-xl">' +
          '<p class="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">AvantaLab</p>' +
          '<h1 class="mt-2 text-xl font-black">' + escapeHtml(titulo) + '</h1>' +
          '<p class="mt-2 text-sm font-semibold leading-relaxed text-slate-600">' + escapeHtml(texto) + '</p>' +
          '<button type="button" onclick="window.location.reload()" class="mt-4 h-11 w-full rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wide text-white">Tentar novamente</button>' +
        '</div>' +
      '</section>'
    );
  }

  function nomeEmpresa(empresa) {
    return (empresa && (empresa.nome || empresa.empresa_nome)) || 'Perfil';
  }

  function ordemDashboardPadrao() {
    return [
      'ia',
      'agenda',
      'saldo',
      'totais',
      'ultimasDespesas',
      'ultimasReceitas',
      'categorias',
      'tipos',
      'evolucaoDespesas',
      'evolucaoReceitas',
    ];
  }

  function tituloCardDashboard(id) {
    return {
      saldo: 'Resumo inicial',
      ia: 'Perguntas para IA',
      agenda: 'Agenda',
      categorias: 'Despesas por categoria',
      tipos: 'Total por tipo de despesa',
      ultimasDespesas: 'Ultimas despesas',
      ultimasReceitas: 'Ultimas receitas',
      totais: 'Totais',
      evolucaoDespesas: 'Evolucao das despesas',
      evolucaoReceitas: 'Evolucao das receitas',
    }[id] || id;
  }

  function normalizarOrdemDashboard(lista) {
    var padrao = ordemDashboardPadrao();
    var limpa = Array.isArray(lista)
      ? lista.filter(function (id, index) { return padrao.indexOf(id) >= 0 && lista.indexOf(id) === index; })
      : [];

    padrao.forEach(function (id) {
      if (limpa.indexOf(id) < 0) limpa.push(id);
    });

    return limpa;
  }

  function normalizarOcultosDashboard(lista) {
    var padrao = ordemDashboardPadrao();
    return Array.isArray(lista)
      ? lista.filter(function (id, index) { return padrao.indexOf(id) >= 0 && lista.indexOf(id) === index; })
      : [];
  }

  function cardsDashboardVisiveis() {
    var ocultos = normalizarOcultosDashboard(state.dashboardOcultos);
    return normalizarOrdemDashboard(state.dashboardOrdem).filter(function (id) {
      return ocultos.indexOf(id) < 0;
    });
  }

  function salvarOrdemDashboard() {
    try {
      localStorage.setItem('avantalab_mobile_dashboard_ordem', JSON.stringify(state.dashboardOrdem));
    } catch (error) {}
  }

  function salvarResumoDashboard() {
    try {
      localStorage.setItem('avantalab_mobile_dashboard_ordem', JSON.stringify(state.dashboardOrdem));
      localStorage.setItem('avantalab_mobile_dashboard_ocultos', JSON.stringify(state.dashboardOcultos));
    } catch (error) {}
  }

  function categoriasPadrao() {
    return categoriasDoPerfil(state.empresa && state.empresa.tipo_perfil).map(function (c) { return c.nome; });
  }

  function indiceMes(mes) {
    var indice = meses.indexOf(mes);
    return indice < 0 ? 0 : indice;
  }

  function mudarMes(delta) {
    var indice = indiceMes(state.mes) + delta;
    var anoAnterior = String(state.ano);
    var ano = Number(state.ano) || new Date().getFullYear();

    if (indice < 0) {
      indice = 11;
      ano -= 1;
    }

    if (indice > 11) {
      indice = 0;
      ano += 1;
    }

    state.mes = meses[indice];
    state.ano = String(ano);
    state.agendaDiaSelecionado = null;
    state.agendaFormAberto = false;
    if (String(state.ano) !== anoAnterior) {
      carregarDados();
    } else {
      render();
    }
  }

  function trocarAnoMobile(valor) {
    var ano = String(valor || '').replace(/\D/g, '').slice(0, 4);
    if (ano.length !== 4) ano = String(new Date().getFullYear());
    if (String(state.ano) === ano) return;

    state.ano = ano;
    state.agendaDiaSelecionado = null;
    state.agendaFormAberto = false;
    state.busca = '';
    carregarDados();
  }

  function salvarUltimoPerfilMobile(empresaId) {
    if (!empresaId) return;
    try {
      localStorage.setItem(CHAVE_ULTIMO_PERFIL_MOBILE, String(empresaId));
    } catch (error) {}
  }

  function lerUltimoPerfilMobile() {
    try {
      return localStorage.getItem(CHAVE_ULTIMO_PERFIL_MOBILE) || '';
    } catch (error) {
      return '';
    }
  }

  function selecionarEmpresaMobile(empresaId, salvarEscolha) {
    var empresaSelecionada = state.empresas.find(function (empresa) {
      return empresa.id === empresaId;
    });

    if (!empresaSelecionada) return false;

    state.empresa = empresaSelecionada;

    if (salvarEscolha !== false) {
      salvarUltimoPerfilMobile(empresaSelecionada.id);
    }

    return true;
  }

  function nomeMesCompleto(mes) {
    return [
      'Janeiro',
      'Fevereiro',
      'Mar\u00e7o',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ][indiceMes(mes)] || mes;
  }

  function abrirAgendaMobile() {
    state.agendaDiaSelecionado = null;
    state.agendaFormAberto = false;
    state.visao = 'agenda';
    state.menuAberto = false;
    state.menuConfigAberto = false;
    state.busca = '';
    render();
  }

  function dataAgenda(ano, mes, dia) {
    return new Date(Number(ano) || new Date().getFullYear(), indiceMes(mes), Number(dia) || 1);
  }

  function diasEntreDatas(inicio, fim) {
    var umDia = 24 * 60 * 60 * 1000;
    var a = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
    var b = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate()).getTime();
    return Math.floor((b - a) / umDia);
  }

  function itemAgendaApareceNoDia(item, ano, mes, dia) {
    if (!item) return false;

    var alvo = dataAgenda(ano, mes, dia);
    var inicio = dataAgenda(item.ano, item.mes, item.dia);
    var diferenca = diasEntreDatas(inicio, alvo);

    if (diferenca < 0) return false;
    if (!item.repetir) {
      return String(item.ano) === String(ano) && item.mes === mes && Number(item.dia) === Number(dia);
    }

    if (item.repeticao === 'diaria') return true;
    if (item.repeticao === 'semanal') return diferenca % 7 === 0;
    if (item.repeticao === 'quinzenal') return diferenca % 14 === 0;
    if (item.repeticao === 'mensal') return Number(item.dia) === Number(dia);
    if (item.repeticao === 'anual') return item.mes === mes && Number(item.dia) === Number(dia);

    return false;
  }

  function itensAgendaDoDia(ano, mes, dia) {
    return (state.agendaItens || []).filter(function (item) {
      return itemAgendaApareceNoDia(item, ano, mes, dia);
    });
  }

  function despesasFuturasDoDia(ano, mes, dia) {
    var mesIndice = indiceMes(mes);
    return (state.lancamentos || []).filter(function (item) {
      return item && item.mes === mes && Number(item.dia) === Number(dia) && dataFutura(Number(ano), mesIndice, dia);
    });
  }

  function agendaTemAvisoHoje() {
    var hoje = new Date();
    return itensAgendaDoDia(String(hoje.getFullYear()), meses[hoje.getMonth()], hoje.getDate()).length > 0;
  }

  function sinoAvisoSvg() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M6.5 10.2c0-3.1 2.2-5.7 5.5-5.7s5.5 2.6 5.5 5.7v2.7l1.5 2.8H5l1.5-2.8v-2.7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M10 18.2c.4.9 1.1 1.3 2 1.3s1.6-.4 2-1.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M12 2.8v1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
  }

  function iconeAgendaSvg() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M3.5 9h17M8 3v3M16 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
  }

  function salvarAgendaItensMobile() {
    try {
      localStorage.setItem(CHAVE_AGENDA_ITENS, JSON.stringify(state.agendaItens || []));
    } catch (error) {}
  }

  // ─── Sincronizacao da agenda com o Supabase ─────────────────
  function agendaItemParaSupabase(item) {
    return {
      id: String(item.id),
      user_id: state.usuario ? state.usuario.id : null,
      empresa_id: state.empresa ? state.empresa.id : null,
      tipo: item.tipo || 'lembrete',
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      ano: String(item.ano || ''),
      mes: item.mes || '',
      dia: Number(item.dia) || 1,
      repetir: !!item.repetir,
      repeticao: item.repeticao || '',
    };
  }

  async function gravarItemAgendaSupabase(item) {
    if (!state.usuario || !state.usuario.id) return;
    try {
      await db.from('agenda_itens').upsert(agendaItemParaSupabase(item), { onConflict: 'id' });
    } catch (e) {}
  }

  // Pronta para quando a exclusao de itens for adicionada na UI:
  // remove o item e as notificacoes que ele gerou.
  async function excluirItemAgendaSupabase(id) {
    if (!id) return;
    try {
      await db.from('agenda_itens').delete().eq('id', String(id));
      await db.from('notificacoes').delete().eq('origem_id', String(id));
    } catch (e) {}
  }

  function normalizarItemAgenda(r) {
    return {
      id: String(r.id),
      tipo: r.tipo || 'lembrete',
      titulo: r.titulo || '',
      descricao: r.descricao || '',
      mes: r.mes || '',
      ano: String(r.ano || ''),
      dia: Number(r.dia) || 1,
      repetir: !!r.repetir,
      repeticao: r.repeticao || '',
      criadoEm: r.criado_em || r.criadoEm || new Date().toISOString(),
    };
  }

  function configurarRealtimeAgendaMobile() {
    try {
      if (window._avaRealtimeAgenda) return;
      if (!state.usuario || !state.usuario.id) return;
      window._avaRealtimeAgenda = db
        .channel('agenda_mobile_' + state.usuario.id)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'agenda_itens', filter: 'user_id=eq.' + state.usuario.id },
          function () { sincronizarAgendaSupabase(); })
        .subscribe();
    } catch (e) {}
  }

  async function sincronizarAgendaSupabase() {
    if (!state.usuario || !state.usuario.id) return;
    try {
      var resposta = await db.from('agenda_itens').select('*').eq('user_id', state.usuario.id);
      if (resposta.error) return;

      var remotos = (resposta.data || []).map(normalizarItemAgenda);
      var locais = Array.isArray(state.agendaItens) ? state.agendaItens : [];

      var idsRemotos = {};
      remotos.forEach(function (r) { idsRemotos[String(r.id)] = true; });

      var migrada = false;
      try { migrada = localStorage.getItem('avantalab_mobile_agenda_migrada') === '1'; } catch (e) {}

      if (!migrada) {
        // Primeira sincronizacao: envia ao servidor os itens que so
        // existem neste aparelho e marca como migrado.
        var soLocais = locais.filter(function (l) { return !idsRemotos[String(l.id)]; });
        for (var i = 0; i < soLocais.length; i++) {
          await gravarItemAgendaSupabase(soLocais[i]);
        }
        state.agendaItens = remotos.concat(soLocais.map(normalizarItemAgenda));
        try { localStorage.setItem('avantalab_mobile_agenda_migrada', '1'); } catch (e) {}
      } else {
        // Servidor e a fonte da verdade: exclusoes refletem aqui.
        state.agendaItens = remotos;
      }

      salvarAgendaItensMobile();
      render();
    } catch (e) {}
  }

  function abrirFormularioAgendaMobile() {
    if (!state.agendaDiaSelecionado) return;
    state.agendaFormAberto = true;
    state.agendaTipoItem = 'lembrete';
    state.agendaTitulo = '';
    state.agendaDescricao = '';
    state.agendaRepetir = false;
    state.agendaRepeticao = 'mensal';
    render();
  }

  function cancelarFormularioAgendaMobile() {
    state.agendaFormAberto = false;
    state.agendaTitulo = '';
    state.agendaDescricao = '';
    render();
  }

  function excluirItemAgendaMobile(id) {
    if (!id) return;
    if (!window.confirm('Excluir este lembrete?')) return;
    state.agendaItens = (state.agendaItens || []).filter(function (it) {
      return String(it.id) !== String(id);
    });
    salvarAgendaItensMobile();
    excluirItemAgendaSupabase(id);
    render();
  }

  function salvarItemAgendaMobile() {
    var dia = Number(state.agendaDiaSelecionado);
    var titulo = campo('agenda-titulo').trim();

    if (!dia) {
      mostrarToast('Selecione um dia.');
      return;
    }

    if (!titulo) {
      mostrarToast('Informe um titulo.');
      return;
    }

    var repetir = !!document.getElementById('agenda-repetir') && document.getElementById('agenda-repetir').checked;
    var repeticao = campo('agenda-repeticao') || 'mensal';
    var tipo = campo('agenda-tipo') || 'lembrete';

    var novoItemAgenda = {
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
      tipo: tipo,
      titulo: titulo,
      descricao: campo('agenda-descricao').trim(),
      mes: state.mes,
      ano: String(state.ano),
      dia: dia,
      repetir: repetir,
      repeticao: repetir ? repeticao : '',
      criadoEm: new Date().toISOString(),
    };

    state.agendaItens = (state.agendaItens || []).concat([novoItemAgenda]);

    salvarAgendaItensMobile();
    gravarItemAgendaSupabase(novoItemAgenda);
    state.agendaFormAberto = false;
    state.agendaTitulo = '';
    state.agendaDescricao = '';
    render();
  }

  function anoHeaderHtml() {
    var anoAtual = Number(state.ano) || new Date().getFullYear();
    var inicio = anoAtual - 5;
    var fim = anoAtual + 3;
    var opcoes = [];

    for (var ano = inicio; ano <= fim; ano += 1) {
      opcoes.push(
        '<option value="' + ano + '"' + (String(ano) === String(state.ano) ? ' selected' : '') + '>' + ano + '</option>'
      );
    }

    return (
      '<div class="relative flex h-11 items-center gap-1.5 overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-2 shadow-sm backdrop-blur">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0 text-cyan-200"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="M3.5 9h17M8 3v3M16 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<div class="leading-none">' +
          '<p class="text-sm font-black text-white">' + escapeHtml(String(state.ano)) + '</p>' +
          '<p class="mt-0.5 text-[8px] font-black uppercase tracking-wide text-cyan-300">Ano</p>' +
        '</div>' +
        '<select id="ano" aria-label="Selecionar ano" style="font-size:16px" class="absolute inset-0 cursor-pointer opacity-0">' +
          opcoes.join('') +
        '</select>' +
      '</div>'
    );
  }

  function dataFutura(ano, mesIndice, dia) {
    var hoje = new Date();
    var anoHoje = hoje.getFullYear();
    if (ano > anoHoje) return true;
    if (ano < anoHoje) return false;
    var mesHoje = hoje.getMonth();
    if (mesIndice > mesHoje) return true;
    if (mesIndice < mesHoje) return false;
    return Number(dia) > hoje.getDate();
  }

  function ehDespesaFutura(mesIndice, dia) {
    return dataFutura(Number(state.ano), mesIndice, dia);
  }

  // Despesa que era prevista, cuja data ja chegou e ainda nao foi confirmada/cancelada.
  function ehDespesaAConfirmar(item) {
    return item && item.status === 'prevista' && !ehDespesaFutura(indiceMes(item.mes), item.dia);
  }

  function dadosMes(mes) {
    var lancamentos = state.lancamentos.filter(function (item) {
      return item.mes === mes && item.status !== 'cancelada';
    });
    var entradas = state.entradas.filter(function (item) { return item.mes === mes; });
    var mesIndice = indiceMes(mes);
    var despesasRealizadas = 0;
    var despesasFuturas = 0;
    lancamentos.forEach(function (item) {
      if (ehDespesaFutura(mesIndice, item.dia)) {
        despesasFuturas += item.valor;
      } else {
        despesasRealizadas += item.valor;
      }
    });
    var temTotalDefinido = Object.prototype.hasOwnProperty.call(state.faturamentos, mes);
    var receitas = temTotalDefinido ? state.faturamentos[mes] : entradas.reduce(function (total, item) { return total + item.valor; }, 0);

    return {
      lancamentos: lancamentos,
      entradas: entradas,
      despesas: despesasRealizadas,
      despesasFuturas: despesasFuturas,
      despesasTotais: despesasRealizadas + despesasFuturas,
      receitas: receitas,
      saldo: receitas - despesasRealizadas,
      saldoPrevisto: receitas - (despesasRealizadas + despesasFuturas),
    };
  }

  function dadosMesAnterior() {
    var indice = indiceMes(state.mes) - 1;
    if (indice < 0) indice = 11;
    return dadosMes(meses[indice]);
  }

  function insightDespesasHtml(atual, anterior) {
    var lampSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0" style="color:#1F8A9E"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.2 1 2V16h6v-.5c0-.8.4-1.4 1-2A6 6 0 0 0 12 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var atualD = (atual && atual.despesas) || 0;
    var antD = (anterior && anterior.despesas) || 0;
    var inicio = '<div class="mt-2 flex items-center gap-1.5 text-[11px]">' + lampSvg;
    var fim = '</div>';

    if (!(antD > 0)) {
      return inicio +
        '<span class="font-semibold" style="color:rgba(255,255,255,0.65)">Compare seus gastos conforme registra novos meses</span>' +
        fim;
    }

    var pct = (atualD - antD) / antD * 100;
    var pctInt = Math.round(Math.abs(pct));

    if (pctInt === 0) {
      return inicio +
        '<span class="font-semibold" style="color:rgba(255,255,255,0.85)">Despesas est&aacute;veis em rela&ccedil;&atilde;o ao m&ecirc;s anterior</span>' +
        fim;
    }

    var subiu = pct > 0;
    var corPct = subiu ? '#E5484D' : '#2EAD68';
    var verbo = subiu ? 'aumentaram' : 'reduziram';
    return inicio +
      '<span class="font-semibold" style="color:rgba(255,255,255,0.85)">Despesas ' + verbo + ' </span>' +
      '<span class="font-black" style="color:' + corPct + '">' + pctInt + '%</span>' +
      '<span class="font-semibold" style="color:rgba(255,255,255,0.85)"> em rela&ccedil;&atilde;o ao m&ecirc;s anterior</span>' +
      fim;
  }

  function setErro(texto) {
    state.erro = texto || '';
    state.mensagem = '';
    render();
  }

  function setMensagem(texto) {
    state.mensagem = texto || '';
    state.erro = '';
    render();
  }

  function mostrarToast(texto) {
    state.toast = texto || '';
    render();

    window.setTimeout(function () {
      if (state.toast === texto) {
        state.toast = '';
        render();
      }
    }, 1600);
  }

  function campo(id) {
    var item = document.getElementById(id);
    return item ? item.value : '';
  }

  function bind(id, fn) {
    var item = document.getElementById(id);
    if (item) item.addEventListener('click', fn);
  }

  function bindChange(id, fn) {
    var item = document.getElementById(id);
    if (item) item.addEventListener('change', fn);
  }

  function bindInput(id, fn) {
    var item = document.getElementById(id);
    if (item) item.addEventListener('input', fn);
  }

  function perfilFormatado(perfil) {
    if (perfil === 'gestor_master') return 'Gestor Master';
    if (perfil === 'administrador') return 'Administrador';
    if (perfil === 'operador_completo') return 'Operador Completo';
    if (perfil === 'operador_simples') return 'Operador Simples';
    return 'Usuario';
  }

  function abrirModalMenu(nome) {
    state.menuAberto = false;
    state.modalMenu = nome;
    if (nome === 'gerenciar') state.empresaExclusaoAberta = false;
    render();
  }

  function fecharModalMenu() {
    if (state.modalMenu === 'categorias') {
      state.categoriaEditandoId = '';
      state.categoriaAcoesId = '';
    }
    if (state.modalMenu === 'feedback') {
      limparFeedbackMobile();
    }
    state.empresaExclusaoAberta = false;
    state.modalMenu = '';
    render();
  }

  function abrirFeedbackMobile() {
    state.menuAberto = false;
    state.modalMenu = 'feedback';
    state.feedbackEtapa = 'inicio';
    state.feedbackTipo = '';
    state.feedbackMensagem = '';
    state.feedbackEnviando = false;
    state.erro = '';
    state.mensagem = '';
    render();
  }

  function limparFeedbackMobile() {
    state.feedbackEtapa = 'inicio';
    state.feedbackTipo = '';
    state.feedbackMensagem = '';
    state.feedbackEnviando = false;
    state.erro = '';
    state.mensagem = '';
  }

  function abrirFormularioFeedbackMobile(tipo) {
    state.feedbackTipo = tipo;
    state.feedbackMensagem = '';
    state.feedbackEtapa = 'formulario';
    state.erro = '';
    state.mensagem = '';
    render();
  }

  function voltarFeedbackMobile() {
    state.feedbackTipo = '';
    state.feedbackMensagem = '';
    state.feedbackEtapa = 'inicio';
    state.erro = '';
    state.mensagem = '';
    render();
  }

  async function enviarFeedbackMobile() {
    if (state.feedbackEnviando) return;

    var mensagemLimpa = campo('feedback-mensagem').trim();

    if (!state.feedbackTipo) {
      setErro('Escolha Sugestoes ou Duvidas antes de enviar.');
      return;
    }

    if (!mensagemLimpa) {
      setErro('Escreva sua mensagem antes de enviar.');
      return;
    }

    if (!state.empresa) {
      setErro('Nao foi possivel identificar a empresa para registrar sua mensagem.');
      return;
    }

    state.feedbackMensagem = mensagemLimpa;
    state.feedbackEnviando = true;
    state.erro = '';
    render();

    var resposta = await db
      .from('feedbacks')
      .insert({
        empresa_id: state.empresa.id,
        usuario_id: state.usuario && state.usuario.id ? state.usuario.id : null,
        acesso_id: state.empresa.acessoId || null,
        nome_empresa: nomeEmpresa(state.empresa),
        nome_usuario:
          (state.usuario && state.usuario.user_metadata && state.usuario.user_metadata.nome) ||
          (state.usuario && state.usuario.email) ||
          null,
        email_usuario: state.usuario && state.usuario.email ? state.usuario.email : null,
        tipo: state.feedbackTipo,
        mensagem: mensagemLimpa,
        status: 'novo',
      })
      .select()
      .single();

    state.feedbackEnviando = false;

    if (resposta.error) {
      setErro(mensagemErro(resposta.error, 'Nao foi possivel registrar sua mensagem neste momento. Tente novamente em alguns minutos.'));
      return;
    }

    state.feedbackMensagem = '';
    state.feedbackEtapa = 'confirmacao';
    render();
  }

  function voltarDashboard() {
    state.visao = 'home';
    state.busca = '';
    state.modalMenu = '';
    state.menuAberto = false;
    render();
  }

  function removerChatIAOverlay() {
    var overlay = document.getElementById('chat-ia-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function configurarCamadaFundoChatIA(ativo) {
    var cor = state.darkMode ? '#0b1220' : '#f4f8fc';
    document.documentElement.style.background = ativo ? cor : '';
    document.body.style.background = ativo ? cor : '';
  }

  function avaLogoPrincipalHtml(width, height) {
    return '<img src="/images/ava-logo-principal.png" alt="Ava" style="display:block;width:' + width + 'px;height:' + height + 'px;object-fit:contain;flex-shrink:0;">';
  }

  function pararGravacaoIA() {
    if (window._chatMediaRecorder && window._chatMediaRecorder.state !== 'inactive') {
      try { window._chatMediaRecorder.stop(); } catch (error) {}
    }
    if (window._chatAudioStream) {
      try {
        window._chatAudioStream.getTracks().forEach(function (track) { track.stop(); });
      } catch (error) {}
      window._chatAudioStream = null;
    }
    window._chatMediaRecorder = null;
    window._chatAudioChunks = [];
    state.chatIAGravando = false;
  }

  function abrirChatIA() {
    window._avaBaseViewportHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0, window.visualViewport ? window.visualViewport.height : 0);
    state.chatIAAberto = true;
    state.chatIAAnimacao = 'entrar';
    state.erro = '';
    render();
    setTimeout(function () {
      if (state.chatIAAberto && state.chatIAAnimacao === 'entrar') state.chatIAAnimacao = '';
    }, 260);
    setTimeout(function() {
      var msgsEl = document.getElementById('chat-ia-msgs');
      if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
      _avaPinViewport();
    }, 50);
  }

  function fecharChatIA() {
    if (state.chatIAAnimacao === 'sair') return;
    window._chatAudioCancelado = state.chatIAGravando;
    pararGravacaoIA();
    state.chatIAAnimacao = 'sair';
    state.chatIAAudioEnviando = false;
    render();
    setTimeout(function () {
      state.chatIAAberto = false;
      state.chatIAAnimacao = '';
      window._avaBaseViewportHeight = 0;
      removerChatIAOverlay();
      render();
    }, 220);
  }

  function primeiroNomeUsuarioAva() {
    var candidatos = [
      state.empresa && state.empresa.usuario_nome,
      state.usuario && state.usuario.user_metadata && state.usuario.user_metadata.nome,
      state.usuario && state.usuario.user_metadata && state.usuario.user_metadata.name,
      state.usuario && state.usuario.user_metadata && state.usuario.user_metadata.full_name,
    ];

    for (var i = 0; i < candidatos.length; i += 1) {
      var nome = String(candidatos[i] || '').trim();
      if (!nome || nome.indexOf('@') >= 0) continue;
      nome = nome
        .replace(/U[0-9A-F]{4,8}/gi, ' ')
        .replace(/[0-9_!?.@#$%&*()[\]{}+=/\\|:;,"<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(function (parte) {
          return parte && parte.length > 1;
        })
        .join(' ');
      if (nome) return nome.split(' ')[0];
    }

    return '';
  }

  function trocarTema() {
    state.darkMode = !state.darkMode;
    try {
      localStorage.setItem('avantalab_mobile_dark', state.darkMode ? '1' : '0');
    } catch (error) {}
    render();
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  }

  function deveBloquearScroll() {
    return Boolean(state.modalLancamento || state.modalMenu || state.menuAberto || state.modalAcao || state.chatIAAberto || state.tourAberto);
  }

  function liberarScrollChatIA() {
    if (!window._avaBodyLocked) return;
    var scrollY = window._avaScrollY || 0;
    window._avaBodyLocked = false;
    window._avaScrollY = 0;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollY);
  }

  function atualizarScrollBloqueado(scrollPrevio) {
    if (deveBloquearScroll()) {
      // Trava o body em position:fixed para QUALQUER modal (acao, edicao,
      // menu, chat). Sem isso, ao reconstruir o innerHTML em render() a
      // posicao de scroll da lista se perde e volta ao topo.
      if (!window._avaBodyLocked) {
        window._avaBodyLocked = true;
        window._avaScrollY = (typeof scrollPrevio === 'number')
          ? scrollPrevio
          : (window.scrollY || document.documentElement.scrollTop || 0);
        document.body.style.position = 'fixed';
        document.body.style.top = '-' + window._avaScrollY + 'px';
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
      }
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      return;
    }

    liberarScrollChatIA();
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  // ─── Notificacoes push (Web Push / VAPID) ───────────────────
  var VAPID_PUBLIC_KEY = 'BL_wlTejki6TPH1TJSHw8q6VeeSoaoH5Ciiirjs0nSg0M4riD5jl-RnkUVArlGMuI5h-eshP98kQKFPsjjM7f4c';

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  async function ativarNotificacoesMobile() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        mostrarToast('Este aparelho/navegador nao suporta notificacoes push.');
        return;
      }
      if (!state.usuario || !state.usuario.id) {
        mostrarToast('Faca login para ativar as notificacoes.');
        return;
      }

      var permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        mostrarToast('Permissao de notificacao negada.');
        return;
      }

      var registro = await navigator.serviceWorker.ready;
      var inscricao = await registro.pushManager.getSubscription();
      if (!inscricao) {
        inscricao = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      var dados = inscricao.toJSON();
      var resultado = await db.from('push_subscriptions').upsert({
        user_id: state.usuario.id,
        empresa_id: state.empresa ? state.empresa.id : null,
        endpoint: dados.endpoint,
        p256dh: dados.keys ? dados.keys.p256dh : '',
        auth: dados.keys ? dados.keys.auth : '',
        user_agent: navigator.userAgent,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

      if (resultado.error) {
        mostrarToast('Nao foi possivel salvar a inscricao.');
        return;
      }
      mostrarToast('Notificacoes ativadas neste aparelho.');
    } catch (e) {
      mostrarToast('Falha ao ativar notificacoes.');
    }
  }

  async function desativarNotificacoesMobile() {
    try {
      var registro = await navigator.serviceWorker.ready;
      var inscricao = await registro.pushManager.getSubscription();
      if (inscricao) {
        var endpoint = inscricao.endpoint;
        await inscricao.unsubscribe().catch(function () {});
        if (state.usuario && state.usuario.id) {
          await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
        }
      }
      atualizarBadgeApp(0);
      mostrarToast('Notificacoes desativadas neste aparelho.');
    } catch (e) {
      mostrarToast('Falha ao desativar notificacoes.');
    }
  }

  async function desativarOuReativarNotificacoes() {
    try {
      var registro = await navigator.serviceWorker.ready;
      var inscricao = await registro.pushManager.getSubscription();
      if (inscricao) await desativarNotificacoesMobile();
      else await ativarNotificacoesMobile();
    } catch (e) {}
  }

  // Liga/desliga. Se a permissao ainda nao foi dada, chama ativar
  // direto (o iOS exige o pedido de permissao no proprio toque).
  function alternarNotificacoesMobile() {
    if (!('Notification' in window)) { ativarNotificacoesMobile(); return; }
    if (Notification.permission === 'granted') desativarOuReativarNotificacoes();
    else ativarNotificacoesMobile();
  }

  // Na primeira abertura (uma vez por aparelho), oferece ativar as
  // notificacoes. O toque no botao "Ativar" e o gesto que o iOS exige
  // para disparar o pedido de permissao do sistema.
  function avaliarPromptNotificacoes() {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (Notification.permission !== 'default') return;
      if (!state.usuario || !state.usuario.id) return;
      if (localStorage.getItem(CHAVE_PROMPT_NOTIF) === '1') return;
      // So oferece notificacoes depois que o tutorial foi concluido/pulado
      if (localStorage.getItem('avantalab_mobile_tour_concluido') !== '1') return;
      setTimeout(function () {
        if (Notification.permission !== 'default') return;
        if (localStorage.getItem(CHAVE_PROMPT_NOTIF) === '1') return;
        state.mostrarPromptNotificacoes = true;
        render();
      }, 1500);
    } catch (e) {}
  }

  function marcarPromptNotifVisto() {
    try { localStorage.setItem(CHAVE_PROMPT_NOTIF, '1'); } catch (e) {}
  }

  function promptNotificacoesHtml() {
    return (
      '<div id="prompt-notif-overlay" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-5">' +
        '<div class="w-full max-w-xs rounded-3xl bg-white p-5 text-center shadow-2xl">' +
          '<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl">&#128276;</div>' +
          '<h2 class="text-base font-black text-slate-900">Ativar notificacoes?</h2>' +
          '<p class="mt-1.5 text-xs font-semibold text-slate-500">Receba no celular os lembretes e avisos da sua agenda, mesmo com o app fechado.</p>' +
          '<div class="mt-4 grid gap-2">' +
            '<button id="prompt-notif-ativar" type="button" class="h-11 rounded-xl bg-slate-950 text-sm font-black uppercase tracking-wide text-white">Ativar</button>' +
            '<button id="prompt-notif-agora-nao" type="button" class="h-10 rounded-xl text-xs font-bold text-slate-500">Agora nao</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ─── Tutorial (tour de primeiro acesso) ─────────────────────
  var PASSOS_TOUR = [
    { icone: '👋', local: '', titulo: 'Bem-vindo ao AvantaLab!', descricao: 'Vamos te mostrar o essencial em poucos passos. E lembre-se: qualquer dúvida sobre como usar o app, é só perguntar à Ava, nossa assistente de IA. Você pode pular e rever depois pelo menu.' },
    { icone: '🤖', local: 'Botão da Ava, no app', titulo: 'Converse com a Ava', descricao: 'A Ava é sua assistente de IA. Pergunte como usar qualquer função, peça análises dos seus números e dicas. Use sempre que tiver dúvida, em vez de ficar procurando.', destaque: true },
    { icone: '✅', local: 'Menu → Cadastrar despesas', titulo: 'Comece cadastrando as despesas', descricao: 'O primeiro passo é cadastrar as suas despesas, conforme a sua necessidade. Abra o menu e toque em "Cadastrar despesas" para adicionar cada tipo de despesa e a categoria.' },
    { icone: '📋', local: 'Botão de menu (☰)', titulo: 'Menu do app', descricao: 'No menu você encontra Agenda, Cadastrar despesas, Ativar/Desativar notificações, Configurações e mais.' },
    { icone: '💰', local: 'Tela inicial → mês', titulo: 'Entradas e total do mês', descricao: 'Registre as receitas e o total do mês. Esses valores alimentam o seu saldo automaticamente.' },
    { icone: '📊', local: 'Lançamentos do mês', titulo: 'Lançar despesas', descricao: 'Registre cada despesa por categoria. Você também pode criar despesas fixas (todo mês) e parcelar em vários meses.' },
    { icone: '📅', local: 'Menu → Agenda', titulo: 'Agenda e notificações', descricao: 'Crie lembretes com repetição (diária, semanal, mensal e mais) e receba como notificação no celular, mesmo com o app fechado. Ative em "Ativar notificações".' },
    { icone: '🔔', local: 'Sininho no topo', titulo: 'Avisos no sininho', descricao: 'O sininho mostra seus lembretes do dia e avisos. O número indica quantos estão pendentes.' },
    { icone: '🚀', local: '', titulo: 'Tudo pronto!', descricao: 'Você já conhece o essencial. Qualquer dúvida, chame a Ava. Este tutorial fica sempre no menu, em "Tutorial".' },
  ];

  function abrirTourMobile() {
    state.tourAberto = true;
    state.tourPasso = 0;
    render();
  }

  function fecharTourMobile() {
    state.tourAberto = false;
    try { localStorage.setItem('avantalab_mobile_tour_concluido', '1'); } catch (e) {}
    render();
    avaliarPromptNotificacoes();
  }

  function tourIr(delta) {
    var n = state.tourPasso + delta;
    if (n < 0) n = 0;
    if (n > PASSOS_TOUR.length - 1) n = PASSOS_TOUR.length - 1;
    state.tourPasso = n;
    render();
  }

  function avaliarTourMobile() {
    try {
      if (!state.usuario || !state.usuario.id) return;
      if (localStorage.getItem('avantalab_mobile_tour_concluido') === '1') return;
      setTimeout(function () {
        if (localStorage.getItem('avantalab_mobile_tour_concluido') === '1') return;
        state.tourAberto = true;
        state.tourPasso = 0;
        render();
      }, 700);
    } catch (e) {}
  }

  function tourHtml() {
    if (!state.tourAberto) return '';
    var total = PASSOS_TOUR.length;
    var idx = Math.max(0, Math.min(total - 1, state.tourPasso));
    var p = PASSOS_TOUR[idx];
    var ehPrimeiro = idx === 0;
    var ehUltimo = idx === total - 1;
    var azul = '#003E73';

    var dots = '';
    for (var i = 0; i < total; i++) {
      dots += '<span style="width:' + (i === idx ? '20px' : '8px') + ';height:8px;border-radius:9999px;background-color:' + (i === idx ? azul : '#cbd5e1') + ';display:inline-block;"></span>';
    }

    return (
      '<div id="tour-overlay" class="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/70 px-4">' +
        '<div class="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" style="max-height:88vh;">' +
          '<div class="px-5 pt-4 pb-4" style="background-color:' + azul + ';">' +
            '<div class="flex items-start justify-between gap-3">' +
              '<div class="flex items-center gap-3 min-w-0">' +
                '<span class="text-3xl leading-none shrink-0">' + p.icone + '</span>' +
                '<div class="min-w-0">' +
                  '<p class="text-[10px] font-black uppercase tracking-widest text-white/60">Passo ' + (idx + 1) + ' de ' + total + '</p>' +
                  '<h2 class="text-base font-black leading-tight text-white">' + escapeHtml(p.titulo) + '</h2>' +
                '</div>' +
              '</div>' +
              '<button id="tour-pular" type="button" class="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-white/90">Pular ✕</button>' +
            '</div>' +
            '<div class="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden"><div class="h-full rounded-full bg-white/80" style="width:' + Math.round(((idx + 1) / total) * 100) + '%;"></div></div>' +
          '</div>' +
          '<div class="flex-1 overflow-y-auto px-5 py-4">' +
            (p.local ? '<div class="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500"><span>📍</span><span>' + escapeHtml(p.local) + '</span></div>' : '') +
            (p.destaque
              ? '<div class="rounded-xl border-2 p-3" style="border-color:' + azul + ';background-color:rgba(0,62,115,0.08);"><p class="text-sm leading-relaxed text-slate-700">' + escapeHtml(p.descricao) + '</p></div>'
              : '<p class="text-sm leading-relaxed text-slate-600">' + escapeHtml(p.descricao) + '</p>') +
            '<div class="mt-5 flex items-center justify-center gap-1.5 flex-wrap">' + dots + '</div>' +
          '</div>' +
          '<div class="flex items-center gap-3 border-t border-slate-200 px-5 py-3">' +
            '<button id="tour-anterior" type="button" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600' + (ehPrimeiro ? ' opacity-30' : '') + '">← Anterior</button>' +
            (ehUltimo
              ? '<button id="tour-concluir" type="button" class="flex-1 rounded-xl py-2 text-sm font-black text-white" style="background-color:' + azul + ';">Concluir 🎉</button>'
              : '<button id="tour-proximo" type="button" class="flex-1 rounded-xl py-2 text-sm font-black text-white" style="background-color:' + azul + ';">' + (ehPrimeiro ? 'Começar →' : 'Próximo →') + '</button>') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ─── Sininho + badge (notificacoes nao lidas) ───────────────
  function atualizarBadgeApp(quantidade) {
    try {
      if ('setAppBadge' in navigator) {
        if (quantidade > 0) navigator.setAppBadge(quantidade);
        else if ('clearAppBadge' in navigator) navigator.clearAppBadge();
      }
    } catch (e) {}
  }

  async function carregarNotificacoesNaoLidas() {
    if (!state.usuario || !state.usuario.id) return;
    try {
      var resposta = await db
        .from('notificacoes')
        .select('id', { count: 'exact', head: true })
        .eq('lida', false);
      if (resposta.error) return;
      state.notificacoesNaoLidas = resposta.count || 0;
      atualizarBadgeApp(state.notificacoesNaoLidas);
      render();
    } catch (e) {}
  }

  async function marcarNotificacoesComoLidas() {
    state.notificacoesNaoLidas = 0;
    atualizarBadgeApp(0);
    render();
    try {
      if (state.usuario && state.usuario.id) {
        await db.from('notificacoes').update({ lida: true }).eq('lida', false);
      }
    } catch (e) {}
  }

  async function instalarApp() {
    if (state.isIos) {
      abrirModalMenu('instalar-ios');
      return;
    }

    if (!state.installPrompt) {
      abrirModalMenu('instalar-android');
      return;
    }

    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    render();
  }

  function podeGerenciarUsuarios() {
    return state.empresa && (state.empresa.perfil === 'gestor_master' || state.empresa.perfil === 'administrador');
  }

  async function tokenSessao() {
    var sessao = await db.auth.getSession();
    return sessao.data && sessao.data.session ? sessao.data.session.access_token : '';
  }

  async function abrirUsuariosMobile() {
    state.menuAberto = false;
    state.modalMenu = 'usuario';
    state.usuarioModo = '';
    state.usuarioExistenteTermo = '';
    state.usuarioExistenteResultado = null;
    state.usuarioExistentePerfil = 'operador_simples';
    state.pesquisandoUsuarioExistente = false;
    state.vinculandoUsuarioExistente = false;
    state.erro = '';
    render();

    if (podeGerenciarUsuarios()) {
      await carregarUsuariosMobile();
    }
  }

  async function carregarUsuariosMobile() {
    if (!state.empresa || !podeGerenciarUsuarios()) return;

    state.usuariosCarregando = true;
    render();

    var resposta = await db.rpc('listar_usuarios_empresa_rpc', {
      p_empresa_id: state.empresa.id,
    });

    state.usuariosEmpresa = resposta.error ? [] : (resposta.data || []);
    state.usuariosCarregando = false;
    render();
  }

  function abrirCriarUsuarioMobile() {
    state.usuarioModo = 'criar';
    state.usuarioExistenteTermo = '';
    state.usuarioExistenteResultado = null;
    state.usuarioExistentePerfil = 'operador_simples';
    state.pesquisandoUsuarioExistente = false;
    state.vinculandoUsuarioExistente = false;
    state.erro = '';
    render();
  }

  function ocultarFormularioUsuarioMobile() {
    state.usuarioModo = '';
    state.usuarioExistenteTermo = '';
    state.usuarioExistenteResultado = null;
    state.usuarioExistentePerfil = 'operador_simples';
    state.pesquisandoUsuarioExistente = false;
    state.vinculandoUsuarioExistente = false;
    state.erro = '';
    render();
  }

  function abrirAdicionarUsuarioExistenteMobile() {
    state.usuarioModo = 'existente';
    state.usuarioEditandoId = '';
    state.usuarioExistenteTermo = '';
    state.usuarioExistenteResultado = null;
    state.usuarioExistentePerfil = 'operador_simples';
    state.pesquisandoUsuarioExistente = false;
    state.vinculandoUsuarioExistente = false;
    state.erro = '';
    render();
  }

  async function buscarUsuarioExistenteMobile() {
    if (!state.empresa || !podeGerenciarUsuarios()) return;

    var termo = campo('usuario-existente-termo').trim().toLowerCase();

    if (!termo) {
      setErro('Informe o email ou login do usuario ja cadastrado.');
      return;
    }

    state.usuarioExistenteTermo = termo;
    state.usuarioExistenteResultado = null;
    state.usuarioExistentePerfil = 'operador_simples';
    state.pesquisandoUsuarioExistente = true;
    state.erro = '';
    render();

    var token = await tokenSessao();
    var resposta = await fetch('/api/vincular-usuario-existente', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        acao: 'buscar',
        empresaId: state.empresa.id,
        termo: termo,
      }),
    });
    var resultado = await lerResposta(resposta);

    state.pesquisandoUsuarioExistente = false;

    if (!resposta.ok || resultado.erro) {
      setErro(resultado.mensagem || 'Nao foi possivel pesquisar o usuario.');
      return;
    }

    if (!resultado.encontrado) {
      setErro('Nenhum usuario encontrado com este email ou login.');
      return;
    }

    if (resultado.jaVinculado) {
      setErro('Este usuario ja esta vinculado a esta empresa.');
      return;
    }

    state.usuarioExistenteResultado = resultado.usuario || null;
    state.usuarioExistentePerfil = 'operador_simples';
    render();
  }

  async function confirmarVinculoUsuarioExistenteMobile() {
    if (!state.empresa || !state.usuarioExistenteResultado || !podeGerenciarUsuarios()) return;

    var perfil = campo('usuario-existente-perfil') || state.usuarioExistentePerfil;

    if (!perfil) {
      setErro('Selecione o perfil de acesso.');
      return;
    }

    state.usuarioExistentePerfil = perfil;
    state.vinculandoUsuarioExistente = true;
    state.erro = '';
    render();

    var token = await tokenSessao();
    var resposta = await fetch('/api/vincular-usuario-existente', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        acao: 'vincular',
        empresaId: state.empresa.id,
        userId: state.usuarioExistenteResultado.id,
        perfil: perfil,
      }),
    });
    var resultado = await lerResposta(resposta);

    state.vinculandoUsuarioExistente = false;

    if (!resposta.ok || resultado.erro) {
      setErro(resultado.mensagem || 'Nao foi possivel vincular o usuario.');
      return;
    }

    state.usuarioModo = '';
    state.usuarioExistenteTermo = '';
    state.usuarioExistenteResultado = null;
    state.usuarioExistentePerfil = 'operador_simples';
    await carregarUsuariosMobile();
    mostrarToast('Usuario vinculado com sucesso.');
  }

  async function criarUsuarioMobile() {
    if (!state.empresa || !podeGerenciarUsuarios()) return;

    var nome = campo('usuario-nome').trim();
    var login = campo('usuario-login').trim().toLowerCase();
    var senha = campo('usuario-senha').trim();
    var perfil = campo('usuario-perfil');

    if (!nome || !login || !senha || !perfil) {
      setErro('Informe nome, login, senha e perfil.');
      return;
    }

    if (login.indexOf('@') >= 0) {
      setErro('Use um login simples, sem @.');
      return;
    }

    if (senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var token = await tokenSessao();
    var resposta = await fetch('/api/criar-usuario-interno', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        empresaId: state.empresa.id,
        nome: nome,
        login: login,
        senha: senha,
        perfil: perfil,
      }),
    });
    var resultado = await lerResposta(resposta);

    state.carregando = false;

    if (!resposta.ok || resultado.erro) {
      setErro(resultado.mensagem || 'Nao foi possivel criar o usuario.');
      return;
    }

    await carregarUsuariosMobile();
    mostrarToast('Usuario criado.');
  }

  function editarUsuarioMobile(id) {
    state.usuarioEditandoId = id || '';
    state.erro = '';
    render();
  }

  async function salvarUsuarioMobile() {
    if (!state.usuarioEditandoId || !podeGerenciarUsuarios()) return;

    var nome = campo('edit-usuario-nome').trim();
    var login = campo('edit-usuario-login').trim().toLowerCase();
    var perfil = campo('edit-usuario-perfil');

    if (!nome || !login || !perfil) {
      setErro('Informe nome, login/email e perfil.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var tok = await tokenSessao();
    if (!tok) {
      state.carregando = false;
      setErro('Sessao expirada. Faca login novamente.');
      return;
    }

    var respostaHttp = await fetch('/api/atualizar-usuario-empresa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + tok,
      },
      body: JSON.stringify({
        acessoId: state.usuarioEditandoId,
        nome: nome,
        email: login,
        perfil: perfil,
      }),
    });
    var resposta = await lerResposta(respostaHttp);

    state.carregando = false;

    if (!respostaHttp.ok || resposta.erro) {
      setErro(resposta.mensagem || 'Nao foi possivel atualizar o usuario.');
      return;
    }

    state.usuarioEditandoId = '';
    await carregarUsuariosMobile();
    mostrarToast('Usuario atualizado.');
  }

  async function excluirUsuarioMobile(id) {
    if (!id || !podeGerenciarUsuarios()) return;
    if (!window.confirm('Excluir este usuario? Ele perdera acesso a esta empresa.')) return;

    state.carregando = true;
    state.erro = '';
    render();

    var token = await tokenSessao();
    var resposta = await fetch('/api/excluir-usuario-interno', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ acessoId: id }),
    });
    var resultado = await lerResposta(resposta);

    state.carregando = false;

    if (!resposta.ok || resultado.erro) {
      setErro(resultado.mensagem || 'Nao foi possivel excluir o usuario.');
      return;
    }

    if (state.empresa && state.empresa.acessoId === id) {
      await sair();
      return;
    }

    await carregarUsuariosMobile();
    mostrarToast('Usuario excluido.');
  }

  function alternarSenha(stateKey, inputId, buttonId) {
    state[stateKey] = !state[stateKey];

    var input = document.getElementById(inputId);
    var botao = document.getElementById(buttonId);

    if (input) input.type = state[stateKey] ? 'text' : 'password';

    if (botao) {
      botao.textContent = state[stateKey] ? '◉' : '◎';
      botao.setAttribute('aria-label', state[stateKey] ? 'Ocultar senha' : 'Exibir senha');
    }
  }

  async function buscarEmailPorLogin(login) {
    var resposta = await db.rpc('buscar_email_por_login_rpc', {
      p_login: String(login || '').trim(),
    });
    return resposta.error ? null : resposta.data;
  }

  async function carregarUsuariosAtivosSistema() {
    if (state.usuariosAtivosCarregando || state.usuariosAtivosSistema !== null) return;

    state.usuariosAtivosCarregando = true;

    try {
      var resposta = await fetch('/api/usuarios-ativos');
      if (!resposta.ok) return;

      var dados = await resposta.json();
      var total = Number(dados && dados.total);

      if (Number.isFinite(total)) {
        state.usuariosAtivosSistema = total;
        render();
      }
    } catch (error) {
      console.error('Erro ao carregar usuarios ativos:', error);
    } finally {
      state.usuariosAtivosCarregando = false;
    }
  }

  async function carregarEmpresas(usuarioId) {
    var usuarioAtual = await db.auth.getUser();
    var emailUsuario = (usuarioAtual.data.user && usuarioAtual.data.user.email || '').toLowerCase();

    if (emailUsuario) {
      var convites = await db
        .from('usuarios_empresa')
        .select('id')
        .eq('email', emailUsuario)
        .is('user_id', null)
        .in('status', ['pendente', 'ativo']);

      if (!convites.error && convites.data && convites.data.length) {
        await db
          .from('usuarios_empresa')
          .update({
            user_id: usuarioId,
            status: 'ativo',
            atualizado_em: new Date().toISOString(),
          })
          .in('id', convites.data.map(function (convite) { return convite.id; }));
      }
    }

    var vinculos = await db
      .from('usuarios_empresa')
      .select('id, empresa_id, nome, email, login, perfil, status, telefone, telefone_confirmado')
      .eq('user_id', usuarioId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true });

    if (vinculos.error || !vinculos.data || !vinculos.data.length) {
      state.empresas = [];
      state.empresa = null;
      return;
    }

    var acessoComTelefone = vinculos.data.find(function (vinculo) {
      return vinculo.telefone_confirmado === true && vinculo.telefone;
    });

    if (acessoComTelefone) {
      await db
        .from('usuarios_empresa')
        .update({
          telefone: acessoComTelefone.telefone,
          telefone_confirmado: true,
          telefone_confirmado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq('user_id', usuarioId);

      vinculos.data = vinculos.data.map(function (vinculo) {
        return Object.assign({}, vinculo, {
          telefone: acessoComTelefone.telefone,
          telefone_confirmado: true,
        });
      });
    }

    var ids = vinculos.data.map(function (vinculo) { return vinculo.empresa_id; }).filter(Boolean);
    var empresas = await db.from('empresas').select('id, nome, tipo_perfil').in('id', ids);

    if (empresas.error || !empresas.data) {
      state.empresas = [];
      state.empresa = null;
      return;
    }

    state.empresas = vinculos.data
      .map(function (vinculo) {
        var empresa = empresas.data.find(function (item) { return item.id === vinculo.empresa_id; });
        if (!empresa) return null;
        return {
          id: empresa.id,
          nome: empresa.nome,
          empresa_nome: empresa.nome,
          tipo_perfil: normalizarTipoPerfil(empresa.tipo_perfil),
          usuario_nome: vinculo.nome || '',
          email: vinculo.email || '',
          login: vinculo.login || '',
          perfil: vinculo.perfil,
          acessoId: vinculo.id,
          telefone: vinculo.telefone || '',
          telefone_confirmado: vinculo.telefone_confirmado === true,
        };
      })
      .filter(Boolean)
      .sort(function(a, b) { return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }); });

    var ultimoPerfilId = lerUltimoPerfilMobile();
    state.empresa =
      state.empresas.find(function (empresa) { return empresa.id === ultimoPerfilId; }) ||
      state.empresas[0] ||
      null;

    if (state.empresa) {
      salvarUltimoPerfilMobile(state.empresa.id);
    }
  }

  async function carregarDados() {
    if (!state.empresa) return;

    carregarUsuariosAtivosSistema();

    if (state.empresa.telefone_confirmado !== true) {
      state.validacaoTelefoneObrigatoria = true;
      state.telefoneObrigatorio = state.empresa.telefone || '';
      state.telefoneObrigatorioConfirmado = '';
      state.codigoTelefoneObrigatorio = '';
      state.smsTelefoneObrigatorioEnviado = false;
      state.carregando = false;
      render();
      return;
    }

    state.carregando = true;
    render();

    var empresaId = state.empresa.id;
    var ano = Number(state.ano);

    var resultados = await Promise.all([
      db.from('lancamentos').select('*').eq('empresa_id', empresaId).eq('ano', ano).order('dia', { ascending: true }),
      db.from('faturamentos').select('*').eq('empresa_id', empresaId).eq('ano', ano),
      db.from('faturamentos_entradas').select('*').eq('empresa_id', empresaId).eq('ano', ano).order('dia', { ascending: true }),
      db.from('despesas_cadastradas').select('*').eq('empresa_id', empresaId).order('nome', { ascending: true }),
      db.from('configuracoes').select('duplicados_ativo').eq('empresa_id', empresaId).maybeSingle(),
    ]);

    state.lancamentos = (resultados[0].data || []).map(function (item) {
      return {
        id: item.id,
        mes: item.mes,
        dia: Number(item.dia),
        despesa: item.despesa_nome,
        descricao: item.descricao || '',
        valor: Number(item.valor || 0),
        status: item.status || null,
      };
    });

    state.faturamentos = {};
    (resultados[1].data || []).forEach(function (item) {
      state.faturamentos[item.mes] = Number(item.valor || 0);
    });

    state.entradas = (resultados[2].data || []).map(function (item) {
      return {
        id: item.id,
        mes: item.mes,
        dia: Number(item.dia),
        origem: item.origem,
        valor: Number(item.valor || 0),
      };
    });

    state.despesas = (resultados[3].data || []).map(function (item) {
      return {
        id: item.id,
        nome: item.nome,
        categoria: item.categoria || 'Sem categoria',
      };
    });

    if (resultados[4].data && resultados[4].data.duplicados_ativo !== undefined) {
      state.duplicadosAtivo = resultados[4].data.duplicados_ativo !== false;
    } else {
      state.duplicadosAtivo = true;
    }

    state.carregando = false;
    render();

    // Sincroniza a agenda com o servidor (em segundo plano) + tempo real
    sincronizarAgendaSupabase();
    configurarRealtimeAgendaMobile();
    // Atualiza a contagem de notificacoes nao lidas (sino + badge do icone)
    carregarNotificacoesNaoLidas();
    // Primeiro acesso: tutorial (e, ao concluir, oferece notificacoes)
    avaliarTourMobile();
    avaliarPromptNotificacoes();
  }

  async function entrar() {
    if (state.carregando) return;

    var login = campo('login').trim();
    var senha = campo('senha');
    state.loginValor = login;

    if (!login || !senha) {
      setErro('Informe login e senha.');
      return;
    }

    state.carregando = true;
    state.loginAcao = 'senha';
    state.erro = '';
    render();

    var email = login;
    if (login.indexOf('@') < 0) {
      email = await buscarEmailPorLogin(login);
      if (!email) {
        state.carregando = false;
        state.loginAcao = '';
        setErro('Login nao encontrado.');
        return;
      }
    }

    var resposta = await db.auth.signInWithPassword({ email: email, password: senha });
    if (resposta.error || !resposta.data.user) {
      state.carregando = false;
      state.loginAcao = '';
      setErro('Nao foi possivel entrar. Confira seus dados.');
      return;
    }

    registrarPreferenciaSessaoMobile(state.manterConectado, false);
    state.usuario = resposta.data.user;
    state.autenticado = true;
    await carregarEmpresas(resposta.data.user.id);

    if (!state.empresa) {
      state.carregando = false;
      state.loginAcao = '';
      state.modoCriarPerfil = true;
      render();
      return;
    }

    await carregarDados();
  }

  async function entrarGoogle() {
    if (state.carregando) return;

    var checkboxManterConectado = document.getElementById('manter-conectado');
    if (checkboxManterConectado) {
      state.manterConectado = Boolean(checkboxManterConectado.checked);
    }

    state.erro = '';
    state.mensagem = '';
    state.carregando = true;
    state.loginAcao = 'google';
    registrarPreferenciaSessaoMobile(state.manterConectado, true);
    render();

    var resposta = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/mobile',
      },
    });

    if (resposta.error) {
      state.carregando = false;
      state.loginAcao = '';
      limparPreferenciaSessaoMobile();
      setErro(mensagemErro(resposta.error, 'Nao foi possivel conectar com o Google agora. Tente novamente em instantes.'));
    }
  }

  async function enviarCodigoSenha() {
    var login = (campo('login-senha') || state.loginRecuperacao || campo('login')).trim().toLowerCase();

    if (!login) {
      setErro('Informe seu email ou login para criar uma senha.');
      return;
    }

    state.loginRecuperacao = login;

    state.carregando = true;
    state.erro = '';
    state.mensagem = '';
    render();

    var resposta = await fetch('/api/senha/enviar-codigo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: login,
      }),
    });

    var resultado = await lerResposta(resposta);

    state.carregando = false;

    if (!resposta.ok || resultado.erro) {
      setErro(resultado.mensagem || 'Nao foi possivel enviar o codigo por SMS.');
      return;
    }

    state.modoSenha = true;
    state.smsSenhaEnviado = true;
    setMensagem('Enviamos um codigo por SMS para o celular confirmado neste acesso.');
  }

  async function redefinirSenha() {
    var login = (campo('login-senha') || state.loginRecuperacao).trim().toLowerCase();
    var codigo = campo('codigo-senha').trim();
    var novaSenha = campo('nova-senha');
    var confirmarSenha = campo('confirmar-senha');

    if (!login) {
      setErro('Informe seu email ou login.');
      return;
    }

    if (!state.smsSenhaEnviado) {
      await enviarCodigoSenha();
      return;
    }

    if (!codigo) {
      setErro('Digite o codigo recebido por SMS.');
      return;
    }

    if (!novaSenha || novaSenha.length < 8) {
      setErro('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas nao coincidem.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await fetch('/api/senha/redefinir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: login,
        codigo: codigo,
        novaSenha: novaSenha,
      }),
    });

    var resultado = await lerResposta(resposta);

    state.carregando = false;

    if (!resposta.ok || resultado.erro) {
      setErro(resultado.mensagem || 'Nao foi possivel redefinir a senha.');
      return;
    }

    state.modoSenha = false;
    state.smsSenhaEnviado = false;
    setMensagem('Senha redefinida com sucesso. Faca login com a nova senha.');
  }

  function lerCadastroDaTela() {
    state.cadastro = {
      nome: campo('cadastro-nome').trim(),
      email: campo('cadastro-email').trim().toLowerCase(),
      telefone: campo('cadastro-telefone').replace(/\D/g, ''),
      senha: campo('cadastro-senha'),
      confirmarSenha: campo('cadastro-confirmar-senha'),
    };
    // preserva o tipo selecionado (já está em state.cadastroTipoPerfil via botão)
  }

  async function enviarCodigoCadastro() {
    lerCadastroDaTela();

    if (!validarCadastroBase()) return;

    state.carregando = true;
    state.erro = '';
    state.mensagem = '';
    render();

    var resposta = await fetch('/api/sms/enviar-codigo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telefone: state.cadastro.telefone,
      }),
    });

    var resultado = await lerResposta(resposta);

    state.carregando = false;

    if (!resposta.ok || resultado.erro) {
      setErro(resultado.mensagem || 'Nao foi possivel enviar o codigo por SMS.');
      return;
    }

    state.smsCadastroEnviado = true;
    state.telefoneCadastroConfirmado = state.cadastro.telefone;
    setMensagem('Enviamos um codigo por SMS. Digite o codigo recebido para concluir o cadastro.');
  }

  async function concluirCadastro() {
    lerCadastroDaTela();

    if (!validarCadastroBase()) return;

    var codigo = campo('cadastro-codigo').trim();

    if (!codigo) {
      setErro('Digite o codigo recebido por SMS.');
      return;
    }

    if (state.cadastro.telefone !== state.telefoneCadastroConfirmado) {
      state.smsCadastroEnviado = false;
      state.telefoneCadastroConfirmado = '';
      setErro('O celular foi alterado. Solicite um novo codigo antes de concluir.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var verificacao = await fetch('/api/sms/verificar-codigo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telefone: state.cadastro.telefone,
        codigo: codigo,
      }),
    });

    var resultadoVerificacao = await lerResposta(verificacao);

    if (!verificacao.ok || resultadoVerificacao.erro) {
      state.carregando = false;
      setErro(resultadoVerificacao.mensagem || 'Codigo invalido ou expirado.');
      return;
    }

    var cadastro = await db.auth.signUp({
      email: state.cadastro.email,
      password: state.cadastro.senha,
      options: {
        data: {
          nome: state.cadastro.nome,
          telefone: state.cadastro.telefone,
        },
      },
    });

    state.carregando = false;

    if (cadastro.error) {
      setErro(mensagemErro(cadastro.error, 'Nao foi possivel criar o cadastro. Verifique os dados e tente novamente.'));
      return;
    }

    state.telaAcesso = 'login';
    state.modoCadastro = false;
    state.smsCadastroEnviado = false;
    state.telefoneCadastroConfirmado = '';
    // criarPerfilTipo guarda a escolha para usar na criação do primeiro perfil
    state.criarPerfilTipo = normalizarTipoPerfil(state.cadastroTipoPerfil);
    state.cadastro = {
      nome: '',
      email: '',
      telefone: '',
      senha: '',
      confirmarSenha: '',
    };
    setMensagem('Cadastro criado e celular confirmado. Faca login para acessar.');
  }

  var DESPESAS_PADRAO_PESSOAL_MOBILE = [
    { nome: 'Aluguel',            categoria: 'Moradia' },
    { nome: 'Parcela casa',       categoria: 'Moradia' },
    { nome: 'Condominio',         categoria: 'Moradia' },
    { nome: 'Agua',               categoria: 'Moradia' },
    { nome: 'Energia',            categoria: 'Moradia' },
    { nome: 'Gas',                categoria: 'Moradia' },
    { nome: 'Internet',           categoria: 'Moradia' },
    { nome: 'Itens para casa',    categoria: 'Moradia' },
    { nome: 'Manutencao casa',    categoria: 'Moradia' },
    { nome: 'Mercado',            categoria: 'Custos de Vida' },
    { nome: 'Saude',              categoria: 'Custos de Vida' },
    { nome: 'Farmacia',           categoria: 'Custos de Vida' },
    { nome: 'Educacao',           categoria: 'Custos de Vida' },
    { nome: 'Celular',            categoria: 'Custos de Vida' },
    { nome: 'Combustivel',        categoria: 'Custos de Vida' },
    { nome: 'Transporte',         categoria: 'Custos de Vida' },
    { nome: 'Gastos com veiculo', categoria: 'Custos de Vida' },
    { nome: 'Parcela veiculo',    categoria: 'Custos de Vida' },
    { nome: 'Alimentacao',        categoria: 'Lazer e Consumo' },
    { nome: 'Passeios',           categoria: 'Lazer e Consumo' },
    { nome: 'Assinaturas',        categoria: 'Lazer e Consumo' },
    { nome: 'Vestuario',          categoria: 'Lazer e Consumo' },
    { nome: 'Viagem',             categoria: 'Lazer e Consumo' },
    { nome: 'Taxas bancarias',    categoria: 'Financeiro e Impostos' },
    { nome: 'Cartao de credito',  categoria: 'Financeiro e Impostos' },
    { nome: 'Seguro',             categoria: 'Financeiro e Impostos' },
    { nome: 'IPVA',               categoria: 'Financeiro e Impostos' },
    { nome: 'IPTU',               categoria: 'Financeiro e Impostos' },
    { nome: 'Investimento',       categoria: 'Investimentos' },
  ];

  async function inserirDespesasPadraoMobile(empresaId) {
    var rows = DESPESAS_PADRAO_PESSOAL_MOBILE.map(function (d) {
      return { empresa_id: empresaId, nome: d.nome, categoria: d.categoria };
    });
    var resp = await db.from('despesas_cadastradas').insert(rows);
    if (resp.error) {
      console.error('Erro ao inserir despesas padrao pessoal:', resp.error);
    }
  }

  async function criarPerfilInicial() {
    var nome = campo('criar-perfil-inicial-nome').trim();
    var tipo = normalizarTipoPerfil(state.criarPerfilTipo);

    if (!nome) {
      setErro(rotuloNomePerfil(tipo) + ' e obrigatorio.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await db.rpc('criar_empresa_inicial_rpc', { p_nome_empresa: nome });

    if (resposta.error || !resposta.data) {
      state.carregando = false;
      setErro(mensagemErro(resposta.error, 'Nao foi possivel criar o perfil financeiro.'));
      return;
    }

    var criada = Array.isArray(resposta.data) ? resposta.data[0] : resposta.data;
    var criadaId = criada && (criada.id || criada.empresa_id);

    if (criadaId) {
      await db.from('configuracoes').upsert({ empresa_id: criadaId, duplicados_ativo: true }, { onConflict: 'empresa_id' });
      var tokInicial = await tokenSessao();
      if (tokInicial) {
        await fetch('/api/atualizar-empresa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokInicial },
          body: JSON.stringify({ empresaId: criadaId, nome: nome, tipoPerfil: tipo }),
        });
      }
    }

    if (tipo === 'pessoal' && criadaId) {
      await inserirDespesasPadraoMobile(criadaId);
    }

    state.modoCriarPerfil = false;
    state.criarPerfilNome = '';
    await carregarEmpresas(state.usuario.id);
    await carregarDados();
  }

  function telaCriarPerfilInicial() {
    var tipo = normalizarTipoPerfil(state.criarPerfilTipo);
    return (
      '<div class="grid gap-3">' +
        '<p class="text-sm font-semibold text-slate-600">Bem-vindo! Crie seu primeiro perfil financeiro para comecar.</p>' +
        '<div>' +
          '<p class="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-600">Tipo do perfil</p>' +
          seletorTipoPerfilHtml('criar-perfil', tipo) +
        '</div>' +
        inputHtml('criar-perfil-inicial-nome', rotuloNomePerfil(tipo), 'text', placeholderNomePerfil(tipo), state.criarPerfilNome) +
        alertaHtml() +
        '<button id="criar-perfil-inicial-submit" type="button" class="h-12 rounded-xl bg-slate-900 px-4 text-sm font-black uppercase tracking-wide text-white shadow-lg">' +
          (state.carregando ? 'Criando...' : 'Criar perfil') +
        '</button>' +
        '<button id="sair-criar-perfil" type="button" class="text-xs font-bold text-slate-500 underline">Cancelar e sair</button>' +
      '</div>'
    );
  }

  async function enviarCodigoTelefoneObrigatorioMobile() {
    if (state.validandoTelefoneObrigatorio) return;

    var telefone = campo('telefone-obrigatorio').replace(/\D/g, '');

    if (!telefone || telefone.length < 10 || telefone.length > 13) {
      setErro('Informe um celular valido com DDD.');
      return;
    }

    state.telefoneObrigatorio = telefone;
    state.validandoTelefoneObrigatorio = true;
    state.erro = '';
    render();

    var resposta = await fetch('/api/sms/enviar-codigo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telefone: telefone,
      }),
    });

    var resultado = await lerResposta(resposta);

    state.validandoTelefoneObrigatorio = false;

    if (!resposta.ok || resultado.erro) {
      setErro(resultado.mensagem || 'Nao foi possivel enviar o codigo por SMS.');
      return;
    }

    state.smsTelefoneObrigatorioEnviado = true;
    state.telefoneObrigatorioConfirmado = telefone;
    state.codigoTelefoneObrigatorio = '';
    setMensagem('Enviamos um codigo por SMS. Digite o codigo recebido para confirmar seu celular.');
  }

  async function confirmarTelefoneObrigatorioMobile() {
    if (!state.usuario || !state.empresa) return;

    var telefone = campo('telefone-obrigatorio').replace(/\D/g, '');
    var codigo = campo('codigo-telefone-obrigatorio').trim();

    if (!telefone || telefone.length < 10 || telefone.length > 13) {
      setErro('Informe um celular valido com DDD.');
      return;
    }

    if (!state.smsTelefoneObrigatorioEnviado) {
      await enviarCodigoTelefoneObrigatorioMobile();
      return;
    }

    if (!codigo) {
      setErro('Digite o codigo recebido por SMS.');
      return;
    }

    if (telefone !== state.telefoneObrigatorioConfirmado) {
      state.smsTelefoneObrigatorioEnviado = false;
      state.telefoneObrigatorioConfirmado = '';
      setErro('O celular foi alterado. Solicite um novo codigo antes de confirmar.');
      return;
    }

    state.validandoTelefoneObrigatorio = true;
    state.erro = '';
    render();

    var verificacao = await fetch('/api/sms/verificar-codigo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telefone: telefone,
        codigo: codigo,
      }),
    });

    var resultadoVerificacao = await lerResposta(verificacao);

    if (!verificacao.ok || resultadoVerificacao.erro) {
      state.validandoTelefoneObrigatorio = false;
      setErro(resultadoVerificacao.mensagem || 'Codigo invalido ou expirado.');
      return;
    }

    var agora = new Date().toISOString();
    var atualizacao = await db
      .from('usuarios_empresa')
      .update({
        telefone: telefone,
        telefone_confirmado: true,
        telefone_confirmado_em: agora,
        atualizado_em: agora,
      })
      .eq('user_id', state.usuario.id);

    if (atualizacao.error) {
      state.validandoTelefoneObrigatorio = false;
      setErro(mensagemErro(atualizacao.error, 'Nao foi possivel salvar o celular confirmado.'));
      return;
    }

    state.empresas = state.empresas.map(function (empresa) {
      return Object.assign({}, empresa, {
        telefone: telefone,
        telefone_confirmado: true,
      });
    });
    state.empresa = Object.assign({}, state.empresa, {
      telefone: telefone,
      telefone_confirmado: true,
    });
    state.validacaoTelefoneObrigatoria = false;
    state.telefoneObrigatorio = '';
    state.telefoneObrigatorioConfirmado = '';
    state.codigoTelefoneObrigatorio = '';
    state.smsTelefoneObrigatorioEnviado = false;
    state.validandoTelefoneObrigatorio = false;
    await carregarDados();
  }

  function validarCadastroBase() {
    if (!state.cadastro.nome) {
      setErro('Informe seu nome completo.');
      return false;
    }

    if (!state.cadastro.email || state.cadastro.email.indexOf('@') < 0 || state.cadastro.email.indexOf('.') < 0) {
      setErro('Informe um email valido.');
      return false;
    }

    if (!state.cadastro.telefone || state.cadastro.telefone.length < 10 || state.cadastro.telefone.length > 13) {
      setErro('Informe um celular valido com DDD.');
      return false;
    }

    if (!state.cadastro.senha || state.cadastro.senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return false;
    }

    if (state.cadastro.senha !== state.cadastro.confirmarSenha) {
      setErro('As senhas nao coincidem.');
      return false;
    }

    return true;
  }

  async function lerResposta(resposta) {
    try {
      return await resposta.json();
    } catch (error) {
      return {};
    }
  }

  async function sair() {
    await db.auth.signOut();
    limparPreferenciaSessaoMobile();
    state.autenticado = false;
    state.usuario = null;
    state.empresas = [];
    state.empresa = null;
    state.lancamentos = [];
    state.entradas = [];
    state.faturamentos = {};
    state.telaAcesso = 'boasVindas';
    state.loginAcao = '';
    state.modoCadastro = false;
    state.modoSenha = false;
    render();
  }

  function montarContextoIA() {
    var atual = dadosMes(state.mes);
    var anterior = dadosMes(meses[(indiceMes(state.mes) - 1 + 12) % 12]);
    var totalDespesas = atual.despesas || 0;
    var totalReceita = atual.receita || 0;
    var resultado = totalReceita - totalDespesas;
    var porTipo = {};
    (atual.lancamentos || []).forEach(function(l) {
      porTipo[l.despesa] = (porTipo[l.despesa] || 0) + Number(l.valor);
    });
    var cats = Object.keys(porTipo)
      .sort(function(a, b) { return porTipo[b] - porTipo[a]; })
      .slice(0, 8)
      .map(function(k) { return '  - ' + k + ': R$ ' + porTipo[k].toLocaleString('pt-BR', { minimumFractionDigits: 2 }); })
      .join('\n');
    var linhas = [
      'Empresa: ' + (state.empresa ? state.empresa.nome : ''),
      'Periodo: ' + state.mes + ' / ' + state.ano,
      'Receita total: R$ ' + totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      'Total de despesas: R$ ' + totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      'Resultado: R$ ' + resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      'Lancamentos no mes: ' + (atual.lancamentos || []).length,
    ];
    if (cats) linhas.push('Despesas por tipo:\n' + cats);
    if (anterior.despesas > 0) linhas.push('Despesas mes anterior: R$ ' + (anterior.despesas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    return linhas.join('\n');
  }

  function _avaHora() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }

  function valorInputChatIA() {
    var inputEl = document.getElementById('chat-ia-input');
    if (!inputEl) return state.chatIAInput || '';
    if (typeof inputEl.value === 'string') return inputEl.value;
    return inputEl.textContent || '';
  }

  function preencherInputChatIA(valor) {
    var inputEl = document.getElementById('chat-ia-input');
    if (!inputEl) return;
    if (typeof inputEl.value === 'string') {
      inputEl.value = valor || '';
    } else {
      inputEl.textContent = valor || '';
    }
  }

  function _avaPinViewport() {
    var ov = document.getElementById('chat-ia-overlay');
    var vv = window.visualViewport;
    if (!ov) return;
    ov.style.left = '0px';
    ov.style.right = '0px';
    ov.style.width = '100vw';
    ov.style.bottom = 'auto';
    ov.style.transform = 'none';
    ov.style.setProperty('--ava-keyboard-offset', '0px');
    if (vv) {
      ov.style.top = Math.max(0, Math.round(vv.offsetTop || 0)) + 'px';
      ov.style.height = Math.max(320, Math.round(vv.height || window.innerHeight || 0)) + 'px';
      ov.style.minHeight = ov.style.height;
    } else {
      ov.style.top = '0px';
      ov.style.height = '100dvh';
      ov.style.minHeight = '100dvh';
    }
  }

  function _avaManterTelaFixa() {
    var ov = document.getElementById('chat-ia-overlay');
    if (ov) ov.scrollTop = 0;
    if (state.chatIAAberto && window._avaBodyLocked) {
      window.scrollTo(0, window._avaScrollY || 0);
    }
    _avaPinViewport();
  }

  async function gravarVoz() {
    if (state.chatIAAudioEnviando || state.chatIADigitando) return;

    if (state.chatIAGravando) {
      if (window._chatMediaRecorder && window._chatMediaRecorder.state !== 'inactive') {
        try { window._chatMediaRecorder.stop(); } catch (error) {}
      }
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('Gravacao de audio nao disponivel neste navegador.');
      return;
    }

    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var tipos = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      var tipoAudio = '';
      for (var i = 0; i < tipos.length; i += 1) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(tipos[i])) {
          tipoAudio = tipos[i];
          break;
        }
      }

      var opcoes = tipoAudio ? { mimeType: tipoAudio } : undefined;
      var recorder = new MediaRecorder(stream, opcoes);
      window._chatAudioStream = stream;
      window._chatMediaRecorder = recorder;
      window._chatAudioChunks = [];

      recorder.ondataavailable = function (event) {
        if (event.data && event.data.size > 0) window._chatAudioChunks.push(event.data);
      };

      recorder.onerror = function () {
        state.chatIAGravando = false;
        state.chatIAAudioEnviando = false;
        pararGravacaoIA();
        render();
      };

      recorder.onstop = async function () {
        if (window._chatAudioCancelado) {
          window._chatAudioCancelado = false;
          pararGravacaoIA();
          render();
          return;
        }

        var chunks = window._chatAudioChunks || [];
        var mimeType = recorder.mimeType || tipoAudio || 'audio/webm';
        pararGravacaoIA();

        if (!chunks.length) {
          render();
          return;
        }

        state.chatIAAudioEnviando = true;
        render();

        try {
          var blob = new Blob(chunks, { type: mimeType });
          var formData = new FormData();
          var extensao = mimeType.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
          formData.append('audio', blob, 'ava-audio.' + extensao);

          var resposta = await fetch('/api/ava/transcrever-audio', {
            method: 'POST',
            body: formData,
          });
          var resultado = await resposta.json().catch(function () { return {}; });

          if (!resposta.ok || resultado.erro || !resultado.texto) {
            alert(resultado.mensagem || 'Nao foi possivel transcrever o audio.');
            state.chatIAAudioEnviando = false;
            render();
            return;
          }

          state.chatIAInput = String(resultado.texto || '').trim();
          state.chatIAAudioEnviando = false;
          render();
          setTimeout(function () {
            preencherInputChatIA(state.chatIAInput);
            enviarMensagemIA();
          }, 50);
        } catch (error) {
          state.chatIAAudioEnviando = false;
          alert('Nao foi possivel enviar o audio para a Ava.');
          render();
        }
      };

      state.chatIAGravando = true;
      render();
      recorder.start();
    } catch (error) {
      state.chatIAGravando = false;
      state.chatIAAudioEnviando = false;
      pararGravacaoIA();
      alert('Autorize o uso do microfone para enviar audio para a Ava.');
      render();
    }
  }

  async function enviarMensagemIA() {
    var texto = valorInputChatIA().trim();
    if (!texto || state.chatIADigitando) return;

    state.chatIAMensagens.push({ role: 'user', content: texto, hora: _avaHora() });
    state.chatIAInput = '';
    state.chatIADigitando = true;
    state.chatIAMensagens.push({ role: 'assistant', content: '', hora: _avaHora() });
    render();
    setTimeout(function() {
      var msgsEl = document.getElementById('chat-ia-msgs');
      if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
    }, 50);

    try {
      var res = await fetch('/api/ava/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.chatIAMensagens.slice(0, -1).map(function(m) { return { role: m.role, content: m.content }; }),
          contexto: montarContextoIA(),
        }),
      });

      if (!res.ok || !res.body) {
        var erroJson = await res.json().catch(function () { return {}; });
        throw new Error(erroJson.mensagem || 'A Ava nao conseguiu responder agora.');
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var resposta = '';

      while (true) {
        var read = await reader.read();
        if (read.done) break;
        var chunk = decoder.decode(read.value, { stream: true });
        var linhas = chunk.split('\n').filter(function(l) { return l.startsWith('data: '); });
        for (var i = 0; i < linhas.length; i++) {
          var dado = linhas[i].replace('data: ', '').trim();
          if (dado === '[DONE]') continue;
          try {
            var json = JSON.parse(dado);
            var delta = (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) || '';
            if (delta) {
              resposta += delta;
              state.chatIAMensagens[state.chatIAMensagens.length - 1].content = resposta;
              var msgsEl2 = document.getElementById('chat-ia-msgs');
              if (msgsEl2) {
                var lastBubble = msgsEl2.lastElementChild && msgsEl2.lastElementChild.querySelector('div');
                if (lastBubble) { lastBubble.textContent = resposta; msgsEl2.scrollTop = msgsEl2.scrollHeight; }
              }
            }
          } catch (e) { /* ignorar */ }
        }
      }
    } catch (e) {
      console.error('Erro ao responder com a Ava:', e);
      state.chatIAMensagens[state.chatIAMensagens.length - 1].content = 'Desculpe, ocorreu um erro ao gerar a resposta. Tente novamente em instantes.';
    }

    state.chatIADigitando = false;
    render();
    setTimeout(function() { var msgsEl3 = document.getElementById('chat-ia-msgs'); if (msgsEl3) msgsEl3.scrollTop = msgsEl3.scrollHeight; }, 50);
  }

  async function salvarDespesa() {
    if (!state.empresa || state.lancandoDespesa) return;

    var dia = Number(campo('despesa-dia'));
    var nome = campo('despesa-nome');
    var descricao = campo('despesa-descricao');
    var valor = normalizarValor(campo('despesa-valor'));
    var limite = maxDias(state.mes, state.ano);

    if (!dia || dia < 1 || dia > limite || !nome || valor <= 0) {
      // Preservar campos preenchidos ao mostrar erro de validação
      var _diaV = campo('despesa-dia'), _nomeV = campo('despesa-nome'),
          _descV = campo('despesa-descricao'), _valorV = campo('despesa-valor');
      var _msgErro = (!dia || dia < 1 || dia > limite)
        ? 'Data invalida. Informe um dia entre 1 e ' + limite + '.'
        : (!nome ? 'Selecione o tipo de despesa.' : 'Informe um valor valido.');
      setErro(_msgErro);
      var _d = document.getElementById('despesa-dia'); if (_d) _d.value = _diaV;
      var _n = document.getElementById('despesa-nome'); if (_n) _n.value = _nomeV;
      var _desc = document.getElementById('despesa-descricao'); if (_desc) _desc.value = _descV;
      var _v = document.getElementById('despesa-valor'); if (_v) _v.value = _valorV;
      // Focar no campo com problema
      var _focusId = (!dia || dia < 1 || dia > limite) ? 'despesa-dia' : (!nome ? 'despesa-nome' : 'despesa-valor');
      var _focusEl = document.getElementById(_focusId); if (_focusEl) _focusEl.focus();
      return;
    }

    if (state.duplicadosAtivo) {
      var existeIgual = state.lancamentos.some(function (item) {
        return item.mes === state.mes && item.despesa === nome && Number(item.valor) === Number(valor);
      });

      if (existeIgual) {
        var confirmar = window.confirm('Ja existe uma despesa com o mesmo nome e valor neste mes.\n\nDeseja adicionar mesmo assim?');
        if (!confirmar) return;
      }
    }

    state.lancandoDespesa = true;
    state.carregando = true;
    state.erro = '';
    render();

    var totalParcelas = (state.formParcelar && state.formParcelas >= 2) ? state.formParcelas : 1;
    var mesIndex = indiceMes(state.mes);
    var ok = true;

    for (var p = 0; p < totalParcelas; p++) {
      var idxMes = (mesIndex + p) % 12;
      var anosExtra = Math.floor((mesIndex + p) / 12);
      var mesParc = meses[idxMes];
      var anoParc = Number(state.ano) + anosExtra;
      var descBase = formatarDescricao(descricao);
      var descParc = totalParcelas > 1
        ? (descBase ? descBase + ' (' + (p + 1) + '/' + totalParcelas + ')' : '(' + (p + 1) + '/' + totalParcelas + ')')
        : descBase;

      var resposta = await db
        .from('lancamentos')
        .insert({
          empresa_id: state.empresa.id,
          ano: anoParc,
          mes: mesParc,
          dia: dia,
          despesa_nome: nome,
          descricao: descParc,
          valor: valor,
          status: dataFutura(anoParc, idxMes, dia) ? 'prevista' : null,
        })
        .select()
        .single();

      if (resposta.error) {
        ok = false;
        state.lancandoDespesa = false;
        state.carregando = false;
        setErro('Nao foi possivel salvar a despesa.');
        return;
      }
    }

    state.lancandoDespesa = false;
    state.formParcelar = false;
    state.formParcelas = 2;
    state.modalLancamento = false;
    state.tipoLancamento = 'despesa';
    state.modoReceita = 'entrada';
    state.erro = '';
    await carregarDados();
    mostrarToast(totalParcelas > 1 ? 'Despesa parcelada em ' + totalParcelas + 'x.' : 'Despesa lancada.');
  }

  async function alternarDuplicados() {
    if (!state.empresa || state.carregando) return;

    var proximo = !state.duplicadosAtivo;
    var anterior = state.duplicadosAtivo;
    state.duplicadosAtivo = proximo;
    state.carregando = true;
    render();

    var resposta = await db
      .from('configuracoes')
      .upsert({ empresa_id: state.empresa.id, duplicados_ativo: proximo }, { onConflict: 'empresa_id' });

    state.carregando = false;

    if (resposta.error) {
      state.duplicadosAtivo = anterior;
      setErro('Nao foi possivel salvar a configuracao de duplicados.');
      return;
    }

    render();
    mostrarToast(proximo ? 'Aviso de duplicados ativado.' : 'Aviso de duplicados desativado.');
  }

  async function salvarEntrada() {
    if (!state.empresa) return;

    var dia = Number(campo('entrada-dia'));
    var origem = campo('entrada-origem');
    var valor = normalizarValor(campo('entrada-valor'));
    var limite = maxDias(state.mes, state.ano);

    if (!dia || dia < 1 || dia > limite || !origem.trim() || valor <= 0) {
      setErro('Informe dia, origem e valor validos.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await db
      .from('faturamentos_entradas')
      .insert({
        empresa_id: state.empresa.id,
        ano: Number(state.ano),
        mes: state.mes,
        dia: dia,
        origem: formatarDescricao(origem),
        valor: valor,
        criado_por: state.usuario ? state.usuario.id : null,
      })
      .select()
      .single();

    if (resposta.error) {
      state.carregando = false;
      setErro('Nao foi possivel salvar a entrada.');
      return;
    }

    var totalAtual = state.faturamentos[state.mes] || 0;
    var total = await db
      .from('faturamentos')
      .upsert(
        {
          empresa_id: state.empresa.id,
          ano: Number(state.ano),
          mes: state.mes,
          valor: totalAtual + valor,
        },
        { onConflict: 'empresa_id,ano,mes' }
      )
      .select()
      .single();

    if (total.error) {
      state.carregando = false;
      setErro('Entrada salva, mas o total do mes nao foi atualizado.');
      return;
    }

    state.modalLancamento = false;
    state.tipoLancamento = 'despesa';
    state.modoReceita = 'entrada';
    state.erro = '';
    await carregarDados();
    mostrarToast('Entrada lancada.');
  }

  async function salvarTotalReceita() {
    if (!state.empresa) return;

    var valor = normalizarValor(campo('receita-total'));

    if (valor < 0) {
      setErro('Informe um total valido.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await db
      .from('faturamentos')
      .upsert(
        {
          empresa_id: state.empresa.id,
          ano: Number(state.ano),
          mes: state.mes,
          valor: valor,
        },
        { onConflict: 'empresa_id,ano,mes' }
      )
      .select()
      .single();

    if (resposta.error) {
      state.carregando = false;
      setErro('Nao foi possivel definir o total do mes.');
      return;
    }

    state.modalLancamento = false;
    state.tipoLancamento = 'despesa';
    state.modoReceita = 'entrada';
    state.erro = '';
    await carregarDados();
    mostrarToast('Total do mes atualizado.');
  }

  async function excluirTotalMesMobile() {
    if (!state.empresa || !state.mes) return;

    var totalEntradas = state.entradas
      .filter(function (e) { return e.mes === state.mes; })
      .reduce(function (acc, e) { return acc + e.valor; }, 0);

    var mensagem = totalEntradas > 0
      ? 'O total definido manualmente sera removido. As receitas lancadas (' + formatarMoeda(totalEntradas) + ') serao mantidas.'
      : 'Nao ha receitas lancadas neste mes. O total do mes sera zerado.';

    if (!window.confirm(mensagem)) return;

    state.carregando = true;
    state.erro = '';
    render();

    if (totalEntradas > 0) {
      var resp = await db
        .from('faturamentos')
        .upsert(
          {
            empresa_id: state.empresa.id,
            ano: Number(state.ano),
            mes: state.mes,
            valor: totalEntradas,
          },
          { onConflict: 'empresa_id,ano,mes' }
        )
        .select()
        .single();

      if (resp.error) {
        state.carregando = false;
        setErro('Nao foi possivel excluir o total definido.');
        return;
      }

      state.faturamentos[state.mes] = totalEntradas;
    } else {
      var del = await db
        .from('faturamentos')
        .delete()
        .eq('empresa_id', state.empresa.id)
        .eq('ano', Number(state.ano))
        .eq('mes', state.mes);

      if (del.error) {
        state.carregando = false;
        setErro('Nao foi possivel excluir o total do mes.');
        return;
      }

      delete state.faturamentos[state.mes];
    }

    state.carregando = false;
    mostrarToast('Total do mes excluido.');
    render();
  }

  async function salvarCategoriaDespesa() {
    if (!state.empresa) return;

    var nome = campo('categoria-nome').trim();
    var tipo = campo('categoria-tipo').trim();
    if (!nome || !tipo) {
      setErro('Informe o nome da despesa e a categoria.');
      return;
    }

    state.carregando = true;
    state.categoriaEditandoId = '';
    state.categoriaAcoesId = '';
    state.erro = '';
    render();

    var resposta = await db
      .from('despesas_cadastradas')
      .insert({
        empresa_id: state.empresa.id,
        nome: formatarDescricao(nome),
        categoria: formatarDescricao(tipo),
      })
      .select()
      .single();

    if (resposta.error) {
      state.carregando = false;
      setErro('Nao foi possivel adicionar a despesa.');
      return;
    }

    state.modalMenu = 'categorias';
    state.erro = '';
    await carregarDados();
    mostrarToast('Despesa cadastrada.');
  }

  async function salvarNovaDespesaInline() {
    if (!state.empresa) return;

    var nomeEl = document.getElementById('nova-despesa-nome');
    var catEl = document.getElementById('nova-despesa-categoria');
    var nome = (nomeEl ? nomeEl.value : state.novaDespesaNome).trim();
    var categoria = (catEl ? catEl.value : state.novaDespesaCategoria).trim();

    if (!nome) {
      setAlerta('Informe o nome do tipo de despesa.');
      return;
    }
    if (!categoria) {
      setAlerta('Selecione uma categoria.');
      return;
    }
    var jaExiste = state.despesas.some(function (d) { return d.nome.toLowerCase() === nome.toLowerCase(); });
    if (jaExiste) {
      setAlerta('Ja existe um tipo com esse nome.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await db
      .from('despesas_cadastradas')
      .insert({
        empresa_id: state.empresa.id,
        nome: formatarDescricao(nome),
        categoria: formatarDescricao(categoria),
      })
      .select()
      .single();

    if (resposta.error) {
      state.carregando = false;
      setAlerta('Nao foi possivel cadastrar o tipo de despesa.');
      return;
    }

    var novoNome = resposta.data && resposta.data.nome ? resposta.data.nome : formatarDescricao(nome);
    state.novaDespesaAberta = false;
    state.novaDespesaNome = '';
    state.novaDespesaCategoria = '';
    state.erro = '';
    await carregarDados();
    setTimeout(function () {
      var sel = document.getElementById('despesa-nome');
      if (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === novoNome) { sel.selectedIndex = i; break; }
        }
      }
    }, 50);
    mostrarToast('Tipo cadastrado e selecionado.');
  }

  function abrirCategoriaAcoes(id) {
    state.categoriaAcoesId = state.categoriaAcoesId === id ? '' : (id || '');
    state.categoriaEditandoId = '';
    state.erro = '';
    render();
  }

  function editarCategoriaDespesa(id) {
    state.categoriaEditandoId = id || '';
    state.categoriaAcoesId = '';
    state.erro = '';
    render();
  }

  async function salvarEdicaoCategoriaDespesa(id) {
    if (!state.empresa || !id) return;

    var nome = campo('edit-categoria-nome-' + id).trim();
    var tipo = campo('edit-categoria-tipo-' + id).trim();

    if (!nome || !tipo) {
      setErro('Informe o nome da despesa e a categoria.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await db
      .from('despesas_cadastradas')
      .update({
        nome: formatarDescricao(nome),
        categoria: formatarDescricao(tipo),
      })
      .eq('id', id)
      .eq('empresa_id', state.empresa.id)
      .select()
      .single();

    if (resposta.error) {
      state.carregando = false;
      setErro('Nao foi possivel editar a despesa.');
      return;
    }

    state.modalMenu = 'categorias';
    state.categoriaEditandoId = '';
    state.categoriaAcoesId = '';
    state.erro = '';
    await carregarDados();
    mostrarToast('Despesa atualizada.');
  }

  async function excluirCategoriaDespesa(id) {
    var despesaId = id || state.categoriaEditandoId || state.categoriaAcoesId;
    if (!state.empresa || !despesaId) return;

    var despesa = state.despesas.find(function (item) { return String(item.id) === String(despesaId); });
    var nome = despesa ? despesa.nome : 'esta despesa';

    if (!window.confirm('Excluir "' + nome + '" da lista de despesas cadastradas?')) return;

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await db
      .from('despesas_cadastradas')
      .delete()
      .eq('id', despesaId)
      .eq('empresa_id', state.empresa.id);

    if (resposta.error) {
      state.carregando = false;
      setErro('Nao foi possivel excluir a despesa.');
      return;
    }

    state.modalMenu = 'categorias';
    state.categoriaEditandoId = '';
    state.categoriaAcoesId = '';
    state.erro = '';
    await carregarDados();
    mostrarToast('Despesa excluida.');
  }

  async function criarEmpresaMobile() {
    var nome = campo('nova-empresa-nome').trim();
    var tipoPerfil = normalizarTipoPerfil(state.novaEmpresaTipoPerfil);

    if (!nome) {
      setErro('Informe o nome do perfil financeiro.');
      return;
    }

    state.carregando = true;
    state.empresaAcao = 'criar';
    state.erro = '';
    render();

    var resposta = await db.rpc('criar_empresa_inicial_rpc', {
      p_nome_empresa: nome,
    });

    if (resposta.error) {
      state.carregando = false;
      state.empresaAcao = '';
      setErro(mensagemErro(resposta.error, 'Não foi possível criar o perfil financeiro.'));
      return;
    }

    var dadosBrutos = resposta.data;
    var semDados = !dadosBrutos || (Array.isArray(dadosBrutos) && dadosBrutos.length === 0);
    if (semDados) {
      state.carregando = false;
      state.empresaAcao = '';
      setErro('O servidor criou o perfil mas não retornou os dados. Recarregue a página e verifique se o perfil foi criado antes de tentar novamente.');
      return;
    }

    var criada = Array.isArray(dadosBrutos) ? dadosBrutos[0] : dadosBrutos;
    var criadaId = criada && (criada.id || criada.empresa_id);

    if (!criadaId) {
      state.carregando = false;
      state.empresaAcao = '';
      setErro('Perfil criado, mas o identificador não foi reconhecido. Recarregue a página para verificar.');
      return;
    }

    await db
      .from('configuracoes')
      .upsert({ empresa_id: criadaId, duplicados_ativo: true }, { onConflict: 'empresa_id' });

    var tokCriar = await tokenSessao();
    if (tokCriar) {
      var respostaTipo = await fetch('/api/atualizar-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokCriar },
        body: JSON.stringify({ empresaId: criadaId, nome: nome, tipoPerfil: tipoPerfil }),
      });
      if (!respostaTipo.ok) {
        console.warn('criarEmpresaMobile: tipo_perfil não aplicado (API retornou ' + respostaTipo.status + ')');
      }
    } else {
      console.warn('criarEmpresaMobile: sem token — tipo_perfil não aplicado');
    }

    if (tipoPerfil === 'pessoal') {
      await inserirDespesasPadraoMobile(criadaId);
    }

    state.modalMenu = '';
    state.empresaAcao = '';
    state.empresaExclusaoAberta = false;
    state.empresaCriarAberta = false;
    state.novaEmpresaTipoPerfil = 'empresa';
    salvarUltimoPerfilMobile(criadaId);
    await carregarEmpresas(state.usuario.id);
    await carregarDados();
    mostrarToast('Perfil criado.');
  }

  function abrirEdicaoEmpresaMobile() {
    if (!state.empresa || !podeGerenciarUsuarios()) return;

    state.empresaEdicaoAberta = true;
    state.empresaExclusaoAberta = false;
    state.editEmpresaNome = nomeEmpresa(state.empresa);
    state.editEmpresaTipoPerfil = normalizarTipoPerfil(state.empresa.tipo_perfil);
    state.editEmpresaLogin = state.empresa.login || state.empresa.email || '';
    state.editEmpresaSenha = '';
    state.erro = '';
    render();
  }

  function selecionarTipoPerfilEdicao(tipo) {
    state.editEmpresaTipoPerfil = normalizarTipoPerfil(tipo);
    render();
  }

  function selecionarTipoPerfilNovo(tipo) {
    state.novaEmpresaTipoPerfil = normalizarTipoPerfil(tipo);
    render();
  }

  function cancelarEdicaoEmpresaMobile() {
    if (state.carregando) return;

    state.empresaEdicaoAberta = false;
    state.editEmpresaNome = '';
    state.editEmpresaLogin = '';
    state.editEmpresaSenha = '';
    state.editEmpresaTipoPerfil = 'empresa';
    state.erro = '';
    render();
  }

  function abrirCriarEmpresaMobile() {
    state.empresaCriarAberta = true;
    state.empresaEdicaoAberta = false;
    state.empresaExclusaoAberta = false;
    state.novaEmpresaTipoPerfil = 'empresa';
    state.erro = '';
    render();
  }

  function cancelarCriarEmpresaMobile() {
    if (state.carregando) return;
    state.empresaCriarAberta = false;
    state.novaEmpresaTipoPerfil = 'empresa';
    state.erro = '';
    render();
  }

  async function salvarEdicaoEmpresaMobile() {
    if (!state.empresa || !podeGerenciarUsuarios()) return;

    var nome = campo('editar-empresa-nome').trim();
    var login = campo('editar-empresa-login').trim().toLowerCase();
    var senha = campo('editar-empresa-senha').trim();

    var tipoPerfil = normalizarTipoPerfil(state.editEmpresaTipoPerfil);

    if (!nome) {
      setErro('Informe o nome do perfil financeiro.');
      return;
    }

    if (!login) {
      setErro('Informe o login ou email do acesso atual.');
      return;
    }

    if (senha && senha.length < 8) {
      setErro('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    state.carregando = true;
    state.empresaAcao = 'editar';
    state.erro = '';
    render();

    var tok = await tokenSessao();
    if (!tok) {
      state.carregando = false;
      state.empresaAcao = '';
      setErro('Sessao expirada. Faca login novamente.');
      return;
    }

    var respostaEmpresaHttp = await fetch('/api/atualizar-empresa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify({ empresaId: state.empresa.id, nome: nome, tipoPerfil: tipoPerfil }),
    });
    var respostaEmpresa = await lerResposta(respostaEmpresaHttp);

    if (!respostaEmpresaHttp.ok || respostaEmpresa.erro) {
      state.carregando = false;
      state.empresaAcao = '';
      setErro(respostaEmpresa.mensagem || 'Nao foi possivel atualizar o perfil financeiro.');
      return;
    }

    var respostaUsuarioHttp = await fetch('/api/atualizar-usuario-empresa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + tok,
      },
      body: JSON.stringify({
        acessoId: state.empresa.acessoId,
        nome: state.empresa.usuario_nome || nome,
        email: login,
        perfil: state.empresa.perfil || 'operador_simples',
      }),
    });
    var respostaUsuario = await lerResposta(respostaUsuarioHttp);

    if (!respostaUsuarioHttp.ok || respostaUsuario.erro) {
      state.carregando = false;
      state.empresaAcao = '';
      setErro(respostaUsuario.mensagem || 'Nao foi possivel atualizar o acesso.');
      return;
    }

    if (senha) {
      var respostaSenhaHttp = await fetch('/api/redefinir-senha-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + tok,
        },
        body: JSON.stringify({
          acessoId: state.empresa.acessoId,
          novaSenha: senha,
        }),
      });
      var respostaSenha = await lerResposta(respostaSenhaHttp);

      if (!respostaSenhaHttp.ok || respostaSenha.erro) {
        state.carregando = false;
        state.empresaAcao = '';
        setErro(respostaSenha.mensagem || 'Perfil e login foram salvos, mas a senha nao foi alterada.');
        await carregarEmpresas(state.usuario.id);
        render();
        return;
      }
    }

    state.carregando = false;
    state.empresaAcao = '';
    state.empresaEdicaoAberta = false;
    state.editEmpresaNome = '';
    state.editEmpresaLogin = '';
    state.editEmpresaSenha = '';
    state.editEmpresaTipoPerfil = 'empresa';
    await carregarEmpresas(state.usuario.id);
    await carregarDados();
    mostrarToast('Dados atualizados.');
  }

  async function excluirEmpresaMobile() {
    if (!state.empresa) return;

    if (state.empresa.perfil !== 'gestor_master') {
      setErro('Somente o Gestor Master pode excluir o perfil atual.');
      return;
    }

    var confirmacao = campo('excluir-empresa-confirmacao').trim();
    var nome = nomeEmpresa(state.empresa);

    if (confirmacao !== nome) {
      setErro('Digite exatamente o nome do perfil para confirmar.');
      return;
    }

    state.carregando = true;
    state.empresaAcao = 'excluir';
    state.erro = '';
    render();

    var resposta = await db.rpc('excluir_empresa_rpc', {
      p_empresa_id: state.empresa.id,
      p_nome_confirmacao: confirmacao,
    });

    if (resposta.error) {
      state.carregando = false;
      state.empresaAcao = '';
      setErro(mensagemErro(resposta.error, 'Nao foi possivel excluir o perfil financeiro.'));
      return;
    }

    state.modalMenu = '';
    state.empresaAcao = '';
    state.empresaExclusaoAberta = false;
    await carregarEmpresas(state.usuario.id);

    if (!state.empresa) {
      await sair();
      return;
    }

    await carregarDados();
    mostrarToast('Perfil excluido.');
  }

  function abrirAcaoLancamento(tipo, id) {
    var lista = tipo === 'receita' ? state.entradas : state.lancamentos;
    var item = lista.find(function (registro) { return String(registro.id) === String(id); });
    if (!item) return;

    state.modalAcao = {
      tipo: tipo,
      modo: 'opcoes',
      item: item,
    };
    render();
  }

  function fecharAcaoLancamento() {
    state.modalAcao = null;
    render();
  }

  async function excluirLancamentoSelecionado() {
    if (!state.modalAcao || !state.modalAcao.item || !state.empresa) return;

    var tipo = state.modalAcao.tipo;
    var item = state.modalAcao.item;

    // Detectar parcelas pendentes (padrao X/N na descricao)
    if (tipo !== 'receita') {
      var matchParcela = (item.descricao || '').match(/\((\d+)\/(\d+)\)$/);
      if (matchParcela) {
        var totalN = parseInt(matchParcela[2], 10);
        var parcelasGrupo = state.lancamentos.filter(function(l) {
          if (l.despesa !== item.despesa) return false;
          var m = (l.descricao || '').match(/\((\d+)\/(\d+)\)$/);
          return m && parseInt(m[2], 10) === totalN;
        });
        var pendentes = parcelasGrupo.filter(function(l) { return l.id !== item.id; });
        if (pendentes.length > 0) {
          var resp = window.confirm(
            'Este lancamento faz parte de um parcelamento em ' + totalN + 'x.\n' +
            'Ha ' + pendentes.length + ' parcela(s) pendente(s).\n\n' +
            'OK = Excluir TODAS as ' + parcelasGrupo.length + ' parcelas\n' +
            'Cancelar = Excluir somente esta'
          );
          state.carregando = true;
          state.erro = '';
          render();
          if (resp) {
            // Excluir todas
            for (var i = 0; i < parcelasGrupo.length; i++) {
              await db.from('lancamentos').delete().eq('id', parcelasGrupo[i].id).eq('empresa_id', state.empresa.id);
            }
          } else {
            // Excluir somente esta
            await db.from('lancamentos').delete().eq('id', item.id).eq('empresa_id', state.empresa.id);
          }
          state.modalAcao = null;
          await carregarDados();
          mostrarToast(resp ? 'Parcelas excluidas.' : 'Despesa excluida.');
          return;
        }
      }
    }

    state.carregando = true;
    state.erro = '';
    render();

    if (tipo === 'receita') {
      var apagada = await db.from('faturamentos_entradas').delete().eq('id', item.id).eq('empresa_id', state.empresa.id);
      if (apagada.error) {
        state.carregando = false;
        setErro('Nao foi possivel excluir a receita.');
        return;
      }

      var totalAtual = state.faturamentos[state.mes] || 0;
      await db
        .from('faturamentos')
        .upsert(
          {
            empresa_id: state.empresa.id,
            ano: Number(state.ano),
            mes: state.mes,
            valor: Math.max(0, totalAtual - Number(item.valor || 0)),
          },
          { onConflict: 'empresa_id,ano,mes' }
        );
    } else {
      var removida = await db.from('lancamentos').delete().eq('id', item.id).eq('empresa_id', state.empresa.id);
      if (removida.error) {
        state.carregando = false;
        setErro('Nao foi possivel excluir a despesa.');
        return;
      }
    }

    state.modalAcao = null;
    await carregarDados();
    mostrarToast(tipo === 'receita' ? 'Receita excluida.' : 'Despesa excluida.');
  }

  async function salvarEdicaoLancamentoSelecionado() {
    if (!state.modalAcao || !state.modalAcao.item || !state.empresa) return;

    var tipo = state.modalAcao.tipo;
    var item = state.modalAcao.item;
    var dia = Number(campo('editar-dia'));
    var valor = normalizarValor(campo('editar-valor'));
    var limite = maxDias(state.mes, state.ano);

    if (!dia || dia < 1 || dia > limite || valor <= 0) {
      setErro('Informe dia e valor validos.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    if (tipo === 'receita') {
      var origem = campo('editar-origem').trim();
      if (!origem) {
        state.carregando = false;
        setErro('Informe a origem.');
        return;
      }

      var receita = await db
        .from('faturamentos_entradas')
        .update({
          dia: dia,
          origem: formatarDescricao(origem),
          valor: valor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('empresa_id', state.empresa.id)
        .select()
        .single();

      if (receita.error) {
        state.carregando = false;
        setErro('Nao foi possivel editar a receita.');
        return;
      }

      var totalAtual = state.faturamentos[state.mes] || 0;
      var diferenca = valor - Number(item.valor || 0);
      await db
        .from('faturamentos')
        .upsert(
          {
            empresa_id: state.empresa.id,
            ano: Number(state.ano),
            mes: state.mes,
            valor: Math.max(0, totalAtual + diferenca),
          },
          { onConflict: 'empresa_id,ano,mes' }
        );
    } else {
      var despesaNome = campo('editar-despesa').trim();
      var descricao = campo('editar-descricao');
      if (!despesaNome) {
        state.carregando = false;
        setErro('Informe a despesa.');
        return;
      }

      var despesa = await db
        .from('lancamentos')
        .update({
          dia: dia,
          despesa_nome: despesaNome,
          descricao: formatarDescricao(descricao),
          valor: valor,
          status: item.status === 'prevista' ? 'confirmada' : (item.status || null),
        })
        .eq('id', item.id)
        .eq('empresa_id', state.empresa.id)
        .select()
        .single();

      if (despesa.error) {
        state.carregando = false;
        setErro('Nao foi possivel editar a despesa.');
        return;
      }
    }

    state.modalAcao = null;
    await carregarDados();
    mostrarToast(tipo === 'receita' ? 'Receita atualizada.' : 'Despesa atualizada.');
  }

  async function confirmarDespesaPrevista(id) {
    if (!state.empresa) return;
    state.carregando = true;
    render();
    var resp = await db.from('lancamentos').update({ status: 'confirmada' }).eq('id', id).eq('empresa_id', state.empresa.id);
    if (resp.error) {
      state.carregando = false;
      setErro('Nao foi possivel confirmar a despesa.');
      return;
    }
    await carregarDados();
    mostrarToast('Despesa confirmada.');
  }

  async function excluirDespesaPrevista(id) {
    if (!state.empresa) return;
    if (!window.confirm('Excluir esta despesa prevista? Ela nao ocorreu e sera removida.')) return;
    state.carregando = true;
    render();
    var resp = await db.from('lancamentos').delete().eq('id', id).eq('empresa_id', state.empresa.id);
    if (resp.error) {
      state.carregando = false;
      setErro('Nao foi possivel excluir a despesa.');
      return;
    }
    await carregarDados();
    mostrarToast('Despesa excluida.');
  }

  function ajustarDespesaPrevista(id) {
    abrirAcaoLancamento('despesa', id);
    if (state.modalAcao) state.modalAcao.modo = 'editar';
    render();
  }

  function telaLoginWrapper(conteudo, titulo, subtitulo) {
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-4 py-5" style="height:100dvh;--avantalab-mobile-bg-overlay:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0));">' +
        '<div class="mx-auto w-full max-w-md overflow-y-auto rounded-3xl border border-white/35 p-5 text-slate-900 shadow-2xl backdrop-blur-xl" style="background-color:rgba(255,255,255,.18);max-height:calc(100dvh - 8rem);overscroll-behavior:contain;">' +
          '<div class="mb-5">' +
            '<h1 class="text-3xl font-black text-slate-900">' + escapeHtml(titulo) + '</h1>' +
            '<p class="mt-1 text-xs leading-snug text-slate-600">' + escapeHtml(subtitulo) + '</p>' +
          '</div>' +
          conteudo +
        '</div>' +
      '</section>'
    );
  }

  function telaLogin() {
    var boasVindas = state.telaAcesso === 'boasVindas' && !state.modoCadastro && !state.modoSenha;
    var maxH = (state.modoCadastro || state.modoSenha)
      ? 'calc(80dvh - 1.5rem)'
      : 'calc(80dvh - 5.5rem)';
    var padClass = state.modoCadastro ? 'p-3' : 'p-3';

    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex flex-col items-center overflow-hidden px-4 pb-4" style="height:100dvh;padding-top:20dvh;--avantalab-mobile-bg-overlay:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0));">' +
        '<div class="mx-auto w-full max-w-md overflow-y-auto rounded-3xl border border-white/35 ' + padClass + ' text-slate-900 shadow-2xl backdrop-blur-xl" style="background-color:rgba(255,255,255,.18);max-height:' + maxH + ';overscroll-behavior:contain;">' +
          (boasVindas
            ? telaBoasVindas()
            : '<div class="' + (state.modoCadastro ? 'mb-2' : 'mb-3') + '">' +
                '<h1 class="' + (state.modoCadastro ? 'text-xl' : 'text-2xl') + ' font-black text-slate-900">' + (state.modoCadastro ? 'Criar cadastro' : state.modoSenha ? 'Recuperar senha' : 'Acesse sua conta') + '</h1>' +
                '<p class="mt-1 text-xs leading-snug text-slate-600">' +
                  (state.modoCadastro ? 'Preencha seus dados e confirme o celular por SMS.' : state.modoSenha ? 'Digite seu login, receba o codigo por SMS e defina uma nova senha.' : 'Entre para acompanhar sua gestao financeira, lancamentos e resultados.') +
                '</p>' +
              '</div>' +
              (state.modoCadastro ? telaCadastro() : state.modoSenha ? telaSenha() : telaLoginCampos())) +
        '</div>' +
        (!state.modoCadastro && !state.modoSenha ? cardInstalarLoginHtml() : '') +
        (state.modalMenu ? modalMenuHtml() : '') +
      '</section>'
    );
  }

  function telaBoasVindas() {
    return (
      '<div class="grid gap-4">' +
        '<div>' +
          '<h1 class="text-3xl font-black leading-tight text-slate-900">Descubra quanto realmente sobra no seu neg&oacute;cio ou nas suas despesas pessoais.</h1>' +
          '<p class="mt-3 text-sm font-semibold leading-relaxed text-slate-600">Controle entradas e despesas de forma simples.</p>' +
        '</div>' +
        '<div class="grid gap-2 rounded-2xl bg-white/22 p-3 text-sm font-bold leading-snug text-slate-700">' +
          '<p>&#10003; Entenda seus gastos.</p>' +
          '<p>&#10003; Compare seus resultados mes a mes.</p>' +
          '<p>&#10003; Descubra quais despesas mais impactam seu lucro.</p>' +
          '<p>&#10003; Use no computador ou celular.</p>' +
        '</div>' +
        '<button id="boas-vindas-cadastro" type="button" class="h-12 rounded-xl px-4 text-sm font-black uppercase tracking-wide text-white shadow-lg" style="background:linear-gradient(135deg,#003E73,#00A6C8)">' +
          'Criar conta gratis' +
        '</button>' +
        '<div class="text-center text-sm text-slate-600">Ja tem conta? <button id="boas-vindas-login" type="button" class="font-bold text-sky-700 underline">Entrar</button></div>' +
      '</div>'
    );
  }

  function telaCarregandoMobile() {
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex items-center justify-center overflow-hidden px-4" style="height:100dvh;">' +
        '<div class="w-full max-w-xs rounded-3xl border border-white/40 bg-white/25 p-5 text-center text-slate-900 shadow-2xl backdrop-blur-xl">' +
          '<p class="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">AvantaLab</p>' +
          '<h1 class="mt-2 text-xl font-black">Preparando acesso</h1>' +
          '<p class="mt-2 text-sm font-semibold text-slate-600">Carregando seus dados com seguranca.</p>' +
        '</div>' +
      '</section>'
    );
  }

  function cardInstalarLoginHtml() {
    if (isStandalone()) return '';

    return (
      '<div class="mx-auto mt-3 w-full max-w-md rounded-2xl border border-white/25 p-3 text-slate-800 shadow-lg backdrop-blur-lg" style="background-color:rgba(255,255,255,.14)">' +
        '<div class="flex items-center justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<p class="text-xs font-black uppercase tracking-wide"><span style="color:#003E73">AVANTA</span><span style="color:#00A6C8">LAB</span> app</p>' +
            '<p class="mt-0.5 text-xs font-semibold leading-snug text-slate-600">Instale o AvantaLab como app no celular.</p>' +
          '</div>' +
          '<button id="instalar-login" type="button" class="shrink-0 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-md" style="background:linear-gradient(135deg,#003E73,#00A6C8)">' +
            'Instalar' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function telaLoginCampos() {
    return (
      '<div class="grid gap-2">' +
        inputHtml('login', 'Email ou login', 'text', 'seuemail@exemplo.com ou seu login', state.loginValor) +
        senhaInputHtml('senha', 'Senha', 'Digite sua senha', 'mostrarSenhaLogin', 'toggle-senha-login') +
        '<label class="flex items-start gap-2 rounded-xl border border-white/35 bg-white/35 px-3 py-2 text-left shadow-sm">' +
          '<input id="manter-conectado" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-cyan-700"' + (state.manterConectado ? ' checked' : '') + ' />' +
          '<span class="min-w-0">' +
            '<span class="block text-xs font-black text-slate-800">Manter conectado</span>' +
            '<span class="mt-0.5 block text-xs font-semibold leading-snug text-slate-600">Nao pedir login neste celular por 30 dias.</span>' +
          '</span>' +
        '</label>' +
        '<div class="text-right">' +
          '<button id="esqueci-senha" type="button" class="text-xs font-bold text-sky-700 underline">Esqueci minha senha</button>' +
        '</div>' +
        alertaHtml() +
        '<button id="entrar" type="button" class="h-10 rounded-xl bg-slate-900 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg">' +
          (state.loginAcao === 'senha' ? 'Entrando...' : 'Entrar') +
        '</button>' +
        '<button id="entrar-google" type="button" class="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-4 text-xs font-bold text-slate-700 shadow-sm">' +
          '<img src="/images/google-logo.svg" alt="Google" class="h-4 w-4" />' +
          '<span>' + (state.loginAcao === 'google' ? 'Conectando...' : 'Entrar ou cadastrar com Google') + '</span>' +
        '</button>' +
        '<div class="text-center text-xs text-slate-600">Ainda nao tem conta? <button id="abrir-cadastro" type="button" class="font-bold text-sky-700 underline">Criar cadastro</button></div>' +
      '</div>'
    );
  }

  function telaCadastro() {
    var tipoCadastro = normalizarTipoPerfil(state.cadastroTipoPerfil);
    return (
      '<div class="grid gap-2">' +
        inputHtml('cadastro-nome', 'Nome', 'text', 'Seu nome completo', state.cadastro.nome) +
        '<div>' +
          '<p class="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-600">Tipo do primeiro perfil</p>' +
          seletorTipoPerfilHtml('cadastro-tipo', tipoCadastro) +
        '</div>' +
        inputHtml('cadastro-email', 'Email', 'email', 'seuemail@exemplo.com', state.cadastro.email) +
        inputHtml('cadastro-telefone', 'Celular', 'tel', 'DDD + numero. Ex: 11999999999', state.cadastro.telefone) +
        senhaInputHtml('cadastro-senha', 'Senha', 'Crie uma senha', 'mostrarSenhaCadastro', 'toggle-senha-cadastro', state.cadastro.senha) +
        senhaInputHtml('cadastro-confirmar-senha', 'Confirmar senha', 'Repita a senha', 'mostrarConfirmarSenhaCadastro', 'toggle-confirmar-cadastro', state.cadastro.confirmarSenha) +
        (state.smsCadastroEnviado ? inputHtml('cadastro-codigo', 'Codigo recebido por SMS', 'text', 'Digite o codigo recebido') + '<p class="-mt-1 text-[11px] font-semibold text-slate-500">Enviamos o codigo para o celular informado.</p>' : '') +
        alertaHtml() +
        '<button id="cadastro-submit" type="button" class="h-10 rounded-xl bg-slate-900 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg">' +
          (state.carregando ? (state.smsCadastroEnviado ? 'Validando...' : 'Enviando...') : (state.smsCadastroEnviado ? 'Concluir cadastro' : 'Enviar codigo por SMS')) +
        '</button>' +
        (state.smsCadastroEnviado ? '<button id="reenviar-cadastro" type="button" class="text-xs font-bold text-sky-700 underline">Reenviar codigo</button>' : '') +
        '<div class="text-center text-xs text-slate-600">Ja tem conta? <button id="voltar-login-cadastro" type="button" class="font-bold text-sky-700 underline">Entrar</button></div>' +
      '</div>'
    );
  }

  function telaSenha() {
    return (
      '<div class="grid gap-2">' +
        inputHtml('login-senha', 'Email ou login', 'text', 'Informe seu email ou login', state.loginRecuperacao) +
        (state.smsSenhaEnviado
          ? inputHtml('codigo-senha', 'Codigo recebido por SMS', 'text', 'Digite o codigo recebido') +
            senhaInputHtml('nova-senha', 'Nova senha', 'Digite a nova senha', 'mostrarNovaSenha', 'toggle-nova-senha') +
            senhaInputHtml('confirmar-senha', 'Confirmar nova senha', 'Repita a nova senha', 'mostrarConfirmarSenha', 'toggle-confirmar-senha')
          : '') +
        alertaHtml() +
        '<button id="redefinir-senha" type="button" class="h-10 rounded-xl bg-slate-900 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg">' +
          (state.carregando ? (state.smsSenhaEnviado ? 'Redefinindo...' : 'Enviando...') : (state.smsSenhaEnviado ? 'Redefinir senha' : 'Enviar codigo por SMS')) +
        '</button>' +
        (state.smsSenhaEnviado
          ? '<button id="reenviar-senha" type="button" class="text-xs font-bold text-sky-700 underline">Reenviar codigo</button>'
          : '') +
        '<button id="voltar-login" type="button" class="text-xs font-bold text-slate-600 underline">Voltar para login</button>' +
      '</div>'
    );
  }

  function telaTelefoneObrigatorioMobile() {
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-4 py-5" style="height:100dvh;--avantalab-mobile-bg-overlay:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0));">' +
        '<div class="mx-auto w-full max-w-md overflow-y-auto rounded-3xl border border-white/35 p-3 text-slate-900 shadow-2xl backdrop-blur-xl" style="background-color:rgba(255,255,255,.18);max-height:calc(100dvh - 2.5rem);overscroll-behavior:contain;">' +
          '<div class="mb-3">' +
            '<h1 class="text-2xl font-black text-slate-900">Confirme seu celular</h1>' +
            '<p class="mt-1 text-xs leading-snug text-slate-600">Para manter seu acesso seguro, confirme um celular com DDD por SMS.</p>' +
          '</div>' +
          '<div class="grid gap-2">' +
            inputHtml('telefone-obrigatorio', 'Celular', 'tel', 'DDD + numero. Ex: 11999999999', state.telefoneObrigatorio) +
            (state.smsTelefoneObrigatorioEnviado
              ? inputHtml('codigo-telefone-obrigatorio', 'Codigo recebido por SMS', 'text', 'Digite o codigo recebido', state.codigoTelefoneObrigatorio) +
                '<p class="-mt-1 text-[11px] font-semibold text-slate-500">Enviamos o codigo para o celular informado.</p>'
              : '') +
            alertaHtml() +
            '<button id="confirmar-telefone-obrigatorio" type="button" class="h-10 rounded-xl bg-slate-900 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg">' +
              (state.validandoTelefoneObrigatorio
                ? (state.smsTelefoneObrigatorioEnviado ? 'Validando...' : 'Enviando...')
                : (state.smsTelefoneObrigatorioEnviado ? 'Confirmar celular' : 'Enviar codigo por SMS')) +
            '</button>' +
            (state.smsTelefoneObrigatorioEnviado
              ? '<button id="reenviar-telefone-obrigatorio" type="button" class="text-xs font-bold text-sky-700 underline">Reenviar codigo</button>'
              : '') +
            '<button id="sair-telefone-obrigatorio" type="button" class="text-xs font-bold text-slate-600 underline">Sair</button>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function alertaHtml() {
    if (state.erro) {
      return '<p class="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">' + escapeHtml(state.erro) + '</p>';
    }
    if (state.mensagem) {
      return '<p class="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">' + escapeHtml(state.mensagem) + '</p>';
    }
    return '';
  }

  function inputHtml(id, label, type, placeholder, value) {
    return (
      '<label class="grid gap-1 text-xs font-semibold text-slate-700">' +
        escapeHtml(label) +
        '<input id="' + id + '" type="' + type + '" placeholder="' + escapeHtml(placeholder || '') + '" value="' + escapeHtml(value || '') + '" style="font-size:16px;background-color:rgba(255,255,255,.62)" class="h-10 rounded-xl border border-white/60 px-3 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20" />' +
      '</label>'
    );
  }

  function senhaInputHtml(id, label, placeholder, stateKey, toggleId, value) {
    var visivel = !!state[stateKey];

    return (
      '<label class="grid gap-1 text-xs font-semibold text-slate-700">' +
        escapeHtml(label) +
        '<span class="relative block">' +
          '<input id="' + id + '" type="' + (visivel ? 'text' : 'password') + '" placeholder="' + escapeHtml(placeholder || '') + '" value="' + escapeHtml(value || '') + '" style="font-size:16px;background-color:rgba(255,255,255,.62)" class="h-10 w-full rounded-xl border border-white/60 px-4 pr-10 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20" />' +
          '<button id="' + toggleId + '" type="button" class="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/35 text-xs font-black text-slate-600 backdrop-blur-sm" aria-label="' + (visivel ? 'Ocultar senha' : 'Exibir senha') + '">' +
            (visivel ? '◉' : '◎') +
          '</button>' +
        '</span>' +
      '</label>'
    );
  }

  function campoClaro(id, label, extra) {
    return (
      '<label class="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-600">' +
        escapeHtml(label) +
        '<input id="' + id + '" ' + (extra || '') + ' style="font-size:16px" class="h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal text-slate-900 outline-none focus:border-cyan-500" />' +
      '</label>'
    );
  }

  function campoValor(id, label, value) {
    return (
      '<label class="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-600">' +
        escapeHtml(label) +
        '<input id="' + id + '" inputmode="decimal" value="' + escapeHtml(value || '') + '" placeholder="R$ 0,00" style="font-size:16px" class="h-11 rounded-md border border-slate-300 bg-white px-3 text-right text-base font-black normal-case tracking-normal text-slate-900 outline-none focus:border-cyan-500" />' +
      '</label>'
    );
  }

  // ─── Controle de Ponto (funcionário) ───────────────────────
  function ehFuncionarioPontoMobile() {
    if (state.empresa && state.empresa.perfil === 'funcionario_ponto') return true;
    var md = state.usuario && state.usuario.user_metadata;
    return !!(md && md.tipo === 'funcionario_ponto');
  }

  function diaPontoHoje() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }

  function horaPonto(ts) {
    try { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }

  function rotuloAcaoPonto(tipo) {
    return ({ entrada: 'Registrar entrada', saida_refeicao: 'Saída para refeição', retorno_refeicao: 'Retorno da refeição', saida: 'Registrar saída' })[tipo] || tipo;
  }

  function proximaAcaoPonto(tipos) {
    if (tipos.indexOf('saida') !== -1) return null;
    if (tipos.indexOf('entrada') === -1) return 'entrada';
    if (tipos.indexOf('saida_refeicao') === -1) return 'saida_refeicao';
    if (tipos.indexOf('retorno_refeicao') === -1) return 'retorno_refeicao';
    return 'saida';
  }

  function distanciaMetros(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var toRad = function (g) { return (g * Math.PI) / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async function carregarPontoConfigMobile() {
    if (state.pontoConfig) return;
    var md = state.usuario && state.usuario.user_metadata;
    var empresaId = state.empresa ? state.empresa.id : (md && md.empresa_id);
    if (!empresaId) return;
    try {
      var resp = await db.from('ponto_config')
        .select('latitude, longitude, raio_m')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      state.pontoConfig = (!resp.error && resp.data) ? resp.data : { latitude: null, longitude: null, raio_m: 100 };
    } catch (e) {
      state.pontoConfig = { latitude: null, longitude: null, raio_m: 100 };
    }
  }

  async function carregarPontoFuncMobile() {
    if (state.pontoFuncDados || !state.usuario || !state.usuario.id) return;
    try {
      var resp = await db.from('ponto_funcionarios')
        .select('dias_trabalho, hora_entrada, hora_saida')
        .eq('user_id', state.usuario.id)
        .maybeSingle();
      state.pontoFuncDados = (!resp.error && resp.data) ? resp.data : { dias_trabalho: null };
    } catch (e) {
      state.pontoFuncDados = { dias_trabalho: null };
    }
  }

  // weekday (0=Dom..6=Sab) da data de hoje em Brasilia, independente do fuso do aparelho
  function diaSemanaHojePonto() {
    var p = diaPontoHoje().split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  }

  async function carregarPontoHoje() {
    if (!state.usuario || !state.usuario.id) return;
    await carregarPontoConfigMobile();
    await carregarPontoFuncMobile();
    try {
      var resp = await db.from('ponto_registros')
        .select('id, tipo, registrado_em')
        .eq('user_id', state.usuario.id)
        .eq('dia', diaPontoHoje())
        .order('registrado_em', { ascending: true });
      if (!resp.error) state.pontoHoje = resp.data || [];
    } catch (e) {}
    render();
  }

  function baterPonto(tipo) {
    if (state.pontoBatendo) return;
    var fd = state.pontoFuncDados;
    if (fd && Array.isArray(fd.dias_trabalho) && fd.dias_trabalho.length > 0 && fd.dias_trabalho.indexOf(diaSemanaHojePonto()) === -1) {
      mostrarToast('Hoje nao e um dia de trabalho. Nao e possivel bater o ponto.');
      return;
    }
    if (!navigator.geolocation) { mostrarToast('Geolocalizacao indisponivel neste aparelho.'); return; }
    state.pontoBatendo = true;
    render();
    navigator.geolocation.getCurrentPosition(async function (pos) {
      try {
        var md = state.usuario && state.usuario.user_metadata;
        var empresaId = state.empresa ? state.empresa.id : (md && md.empresa_id);
        await carregarPontoConfigMobile();
        var cfg = state.pontoConfig;
        var distancia = null;
        if (cfg && cfg.latitude != null && cfg.longitude != null) {
          distancia = distanciaMetros(cfg.latitude, cfg.longitude, pos.coords.latitude, pos.coords.longitude);
          var raio = cfg.raio_m || 100;
          if (distancia > raio) {
            state.pontoBatendo = false;
            mostrarToast('Voce esta a ' + Math.round(distancia) + 'm da empresa. Aproxime-se (limite ' + raio + 'm) para bater o ponto.');
            render();
            return;
          }
        }
        var hash = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase();
        var resp = await db.from('ponto_registros').insert({
          empresa_id: empresaId,
          user_id: state.usuario.id,
          tipo: tipo,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao_m: pos.coords.accuracy,
          distancia_m: distancia,
          dispositivo: navigator.userAgent,
          hash: hash,
        }).select().single();
        state.pontoBatendo = false;
        if (resp.error) { mostrarToast('Nao foi possivel registrar o ponto.'); render(); return; }
        state.pontoComprovante = { tipo: tipo, registrado_em: resp.data.registrado_em, hash: hash, lat: pos.coords.latitude, lng: pos.coords.longitude, distancia: distancia };
        await carregarPontoHoje();
      } catch (e) {
        state.pontoBatendo = false;
        mostrarToast('Erro ao registrar o ponto.');
        render();
      }
    }, function () {
      state.pontoBatendo = false;
      mostrarToast('Ative a localizacao para bater o ponto.');
      render();
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }

  function telaPonto() {
    if (state.pontoView === 'registros') return telaPontoRegistros();
    var md = (state.usuario && state.usuario.user_metadata) || {};
    var nome = md.nome || md.login || 'Funcionario';
    var empresaNome = nomeEmpresa(state.empresa);

    if (state.pontoComprovante) {
      var c = state.pontoComprovante;
      return (
        '<div class="flex min-h-screen flex-col items-center justify-center px-5 ' + (state.darkMode ? 'bg-slate-950' : 'bg-slate-100') + '">' +
          '<div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">' +
            '<div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl font-black text-emerald-600">&#10003;</div>' +
            '<h2 class="text-lg font-black text-slate-900">' + escapeHtml(rotuloAcaoPonto(c.tipo)) + ' registrada</h2>' +
            '<p class="mt-1 text-sm font-semibold text-slate-500">' + escapeHtml(horaPonto(c.registrado_em)) + ' &middot; ' + escapeHtml(diaPontoHoje().split('-').reverse().join('/')) + '</p>' +
            '<div class="mt-4 grid gap-1 rounded-xl bg-slate-50 p-3 text-left text-xs font-semibold text-slate-600">' +
              '<p>Funcion&aacute;rio: ' + escapeHtml(nome) + '</p>' +
              '<p>Empresa: ' + escapeHtml(empresaNome) + '</p>' +
              '<p>Local: ' + Number(c.lat).toFixed(5) + ', ' + Number(c.lng).toFixed(5) + '</p>' +
              (c.distancia != null ? '<p>Dist&acirc;ncia da empresa: ' + Math.round(c.distancia) + 'm</p>' : '') +
              '<p>C&oacute;digo: ' + escapeHtml(c.hash) + '</p>' +
            '</div>' +
            '<button id="ponto-comprovante-ok" type="button" class="mt-5 h-12 w-full rounded-xl bg-slate-950 text-sm font-black uppercase tracking-wide text-white">Concluir</button>' +
          '</div>' +
        '</div>'
      );
    }

    var tipos = (state.pontoHoje || []).map(function (r) { return r.tipo; });
    var proxima = proximaAcaoPonto(tipos);
    var podeEncerrar = tipos.indexOf('entrada') !== -1 && tipos.indexOf('saida') === -1;
    var dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    var statusHtml = ['entrada', 'saida_refeicao', 'retorno_refeicao', 'saida'].map(function (t) {
      var reg = (state.pontoHoje || []).filter(function (r) { return r.tipo === t; })[0];
      return '<div class="flex items-center justify-between rounded-xl border px-3 py-2.5 ' + (reg ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white') + '">' +
          '<span class="text-xs font-bold ' + (reg ? 'text-emerald-800' : 'text-slate-500') + '">' + escapeHtml(rotuloAcaoPonto(t)) + '</span>' +
          '<span class="text-sm font-black ' + (reg ? 'text-emerald-700' : 'text-slate-300') + '">' + (reg ? escapeHtml(horaPonto(reg.registrado_em)) : '&mdash;') + '</span>' +
        '</div>';
    }).join('');

    var botoesHtml = '';
    if (proxima) {
      botoesHtml += '<button id="ponto-acao" data-tipo="' + proxima + '" type="button" ' + (state.pontoBatendo ? 'disabled' : '') + ' class="h-14 w-full rounded-2xl bg-cyan-600 text-base font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-60">' + (state.pontoBatendo ? 'Registrando...' : escapeHtml(rotuloAcaoPonto(proxima))) + '</button>';
      if (podeEncerrar && proxima !== 'saida') {
        botoesHtml += '<button id="ponto-encerrar" type="button" ' + (state.pontoBatendo ? 'disabled' : '') + ' class="mt-2 h-12 w-full rounded-2xl border-2 border-rose-300 bg-white text-sm font-black uppercase tracking-wide text-rose-600 disabled:opacity-60">Encerrar (Sa&iacute;da)</button>';
      }
    } else {
      botoesHtml += '<div class="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-sm font-black text-emerald-700">Expediente encerrado. At&eacute; amanh&atilde;! &#128075;</div>';
    }

    return (
      '<div class="min-h-screen ' + (state.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900') + '">' +
        '<header class="px-5 pb-5 text-white shadow-xl" style="padding-top:calc(env(safe-area-inset-top) + 18px);background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);">' +
          '<div class="mx-auto max-w-md">' +
            '<p class="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">Controle de Ponto</p>' +
            '<h1 class="mt-1 text-2xl font-black leading-tight text-white">Ol&aacute;, ' + escapeHtml(String(nome).split(' ')[0]) + '</h1>' +
            '<p class="mt-0.5 text-xs font-semibold text-cyan-50/85">' + escapeHtml(empresaNome) + '</p>' +
            '<p class="mt-2 text-[11px] font-semibold text-cyan-50/70">' + escapeHtml(dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)) + '</p>' +
          '</div>' +
        '</header>' +
        '<div class="mx-auto max-w-md px-5 pt-5 pb-10">' +
          '<p class="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Registros de hoje</p>' +
          '<div class="grid gap-2">' + statusHtml + '</div>' +
          '<div class="mt-6">' + botoesHtml + '</div>' +
          '<button id="ponto-meus-registros" type="button" class="mt-4 h-11 w-full rounded-xl border border-slate-300 bg-white text-xs font-black uppercase tracking-wide text-slate-600">Meus registros</button>' +
          '<button id="ponto-sair" type="button" class="mt-2 h-11 w-full rounded-xl text-xs font-bold text-slate-400">Sair</button>' +
        '</div>' +
      '</div>'
    );
  }

  function fmtLocalISO(d) {
    var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  async function carregarPontoRegistros(periodo) {
    state.pontoPeriodo = periodo || state.pontoPeriodo || 'dia';
    if (!state.usuario || !state.usuario.id) return;
    var hoje = new Date();
    var inicio;
    if (state.pontoPeriodo === 'dia') inicio = hoje;
    else if (state.pontoPeriodo === 'semana') { inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 6); }
    else if (state.pontoPeriodo === 'mes') inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    else inicio = new Date(hoje.getFullYear(), 0, 1);
    try {
      var resp = await db.from('ponto_registros')
        .select('id, tipo, registrado_em, dia')
        .eq('user_id', state.usuario.id)
        .gte('dia', fmtLocalISO(inicio))
        .order('registrado_em', { ascending: true });
      if (!resp.error) state.pontoRegistrosLista = resp.data || [];
    } catch (e) {}
    render();
  }

  function calcHorasDia(regs) {
    function ms(t) { var r = regs.filter(function (x) { return x.tipo === t; })[0]; return r ? new Date(r.registrado_em).getTime() : null; }
    var ent = ms('entrada'), sai = ms('saida'), sr = ms('saida_refeicao'), rr = ms('retorno_refeicao');
    if (ent == null || sai == null) return null;
    var liq = (sai - ent) - ((sr != null && rr != null) ? (rr - sr) : 0);
    if (liq < 0) liq = 0;
    return Math.floor(liq / 3600000) + 'h ' + String(Math.floor((liq % 3600000) / 60000)).padStart(2, '0') + 'm';
  }

  function telaPontoRegistros() {
    var md = (state.usuario && state.usuario.user_metadata) || {};
    var nome = md.nome || md.login || 'Funcionario';
    var empresaNome = nomeEmpresa(state.empresa);
    var periodos = [['dia', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']];

    // Agrupa por dia
    var porDia = {};
    (state.pontoRegistrosLista || []).forEach(function (r) {
      (porDia[r.dia] = porDia[r.dia] || []).push(r);
    });
    var diasOrdenados = Object.keys(porDia).sort().reverse();

    var listaHtml = diasOrdenados.length === 0
      ? '<p class="py-8 text-center text-sm font-semibold text-slate-400">Nenhum registro no período.</p>'
      : diasOrdenados.map(function (dia) {
          var regs = porDia[dia];
          var horas = calcHorasDia(regs);
          var linhas = ['entrada', 'saida_refeicao', 'retorno_refeicao', 'saida'].map(function (t) {
            var reg = regs.filter(function (x) { return x.tipo === t; })[0];
            return '<div class="flex items-center justify-between py-1"><span class="text-[11px] font-semibold text-slate-500">' + escapeHtml(rotuloAcaoPonto(t)) + '</span><span class="text-xs font-black text-slate-800">' + (reg ? escapeHtml(horaPonto(reg.registrado_em)) : '&mdash;') + '</span></div>';
          }).join('');
          return '<div class="rounded-xl border border-slate-200 bg-white p-3">' +
              '<div class="mb-1 flex items-center justify-between"><span class="text-xs font-black text-slate-900">' + escapeHtml(dia.split('-').reverse().join('/')) + '</span>' +
              (horas ? '<span class="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-700">' + escapeHtml(horas) + '</span>' : '') + '</div>' +
              linhas +
            '</div>';
        }).join('');

    var rotuloPeriodo = (periodos.filter(function (p) { return p[0] === state.pontoPeriodo; })[0] || ['', ''])[1];

    return (
      '<div class="min-h-screen ' + (state.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900') + '">' +
        '<header class="no-print px-5 pb-4 text-white shadow-xl" style="padding-top:calc(env(safe-area-inset-top) + 16px);background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);">' +
          '<div class="mx-auto flex max-w-md items-center gap-3">' +
            '<button id="ponto-voltar" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/15 text-lg font-black text-white" aria-label="Voltar">&lsaquo;</button>' +
            '<div><p class="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">Controle de Ponto</p><h1 class="text-lg font-black leading-tight text-white">Meus registros</h1></div>' +
          '</div>' +
        '</header>' +
        '<div class="mx-auto max-w-md px-5 pt-4 pb-10">' +
          '<div class="no-print mb-3 grid grid-cols-4 gap-1.5">' +
            periodos.map(function (p) {
              var ativo = state.pontoPeriodo === p[0];
              return '<button id="ponto-periodo-' + p[0] + '" type="button" class="rounded-lg px-1 py-2 text-[11px] font-black ' + (ativo ? 'bg-cyan-600 text-white' : 'bg-white text-slate-500 border border-slate-200') + '">' + p[1] + '</button>';
            }).join('') +
          '</div>' +
          '<div id="ponto-relatorio-print">' +
            '<div class="mb-3 rounded-xl bg-white p-3 text-xs font-semibold text-slate-600">' +
              '<p class="text-sm font-black text-slate-900">' + escapeHtml(empresaNome) + '</p>' +
              '<p>Funcion&aacute;rio: ' + escapeHtml(nome) + '</p>' +
              '<p>Per&iacute;odo: ' + escapeHtml(rotuloPeriodo) + '</p>' +
            '</div>' +
            '<div class="grid gap-2">' + listaHtml + '</div>' +
          '</div>' +
          '<button id="ponto-gerar-pdf" type="button" class="no-print mt-5 h-12 w-full rounded-xl bg-slate-950 text-sm font-black uppercase tracking-wide text-white">Gerar PDF</button>' +
        '</div>' +
      '</div>'
    );
  }

  function telaApp() {
    var atual = dadosMes(state.mes);
    var anterior = dadosMesAnterior();

    return (
      '<div class="' + (state.visao === 'agenda' ? 'h-screen overflow-hidden' : 'min-h-screen pb-24') + ' mobile-app-shell ' + (state.darkMode ? 'mobile-dark bg-slate-950 text-slate-100' : 'mobile-light bg-slate-100 text-slate-900') + '">' +
        '<header class="fixed inset-x-0 top-0 z-40 border-b border-white/15 px-4 pb-3 text-white shadow-xl shadow-sky-950/20 backdrop-blur" style="padding-top:calc(env(safe-area-inset-top) + 10px);background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);">' +
          '<div class="mx-auto max-w-md">' +
            '<div class="flex items-center gap-3">' +
              '<button id="menu-toggle" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-lg font-black text-white shadow-sm backdrop-blur" aria-label="Abrir menu">&#9776;</button>' +
              '<div class="min-w-0 flex-1">' +
                '<h1 class="truncate text-lg font-black leading-tight text-white">' + (function(){ var pn = primeiroNomeUsuarioAva(); return 'Ol&aacute;' + (pn ? ', ' + escapeHtml(pn) : ''); })() + '</h1>' +
                '<p class="truncate text-[11px] font-semibold text-cyan-100/75">Bem-vindo ao AvantaLab</p>' +
              '</div>' +
              (state.visao === 'home'
                ? ((agendaTemAvisoHoje() || state.notificacoesNaoLidas > 0)
                  ? '<button id="avisos-dashboard" type="button" class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/15 text-white shadow-sm backdrop-blur" aria-label="Avisos">' + sinoAvisoSvg() +
                    (state.notificacoesNaoLidas > 0
                      ? '<span class="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white/60">' + (state.notificacoesNaoLidas > 99 ? '99+' : state.notificacoesNaoLidas) + '</span>'
                      : '<span class="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-white/60"></span>') +
                    '</button>'
                  : '<span class="h-10 w-10 shrink-0" aria-hidden="true"></span>')
                : '<button id="voltar-dashboard-topo" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/15 text-lg font-black text-white shadow-sm backdrop-blur" aria-label="Voltar ao dashboard">&#8962;</button>') +
            '</div>' +
            '<div class="mt-3 grid grid-cols-[84px_minmax(0,1fr)] gap-2">' +
              anoHeaderHtml() +
              '<div class="flex h-11 items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-1 shadow-sm backdrop-blur">' +
                '<button id="mes-anterior" type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xl font-black leading-none text-white active:bg-white/10" aria-label="Mes anterior">&lsaquo;</button>' +
                '<h2 class="min-w-0 flex-1 truncate text-center text-base font-black tracking-wide text-white">' + escapeHtml(state.mes.charAt(0) + state.mes.slice(1).toLowerCase()) + '</h2>' +
                '<button id="mes-proximo" type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xl font-black leading-none text-white active:bg-white/10" aria-label="Proximo mes">&rsaquo;</button>' +
              '</div>' +
            '</div>' +
            insightDespesasHtml(atual, anterior) +
          '</div>' +
        '</header>' +
        '<div class="mx-auto grid max-w-md gap-3 px-4" style="padding-top:calc(env(safe-area-inset-top) + ' + (state.visao === 'agenda' ? '168px' : '152px') + ');">' +
          (state.visao === 'agenda' ? '' : empresaHtml()) +
          alertaHtml().replace('mt-4', '') +
          (state.visao === 'home' ? homeHtml(atual, anterior) : (state.visao === 'agenda' ? agendaMobileHtml(atual) : listaDetalhadaHtml(atual))) +
          (state.visao === 'agenda' ? '' : rodapeMobileHtml()) +
        '</div>' +
        (state.visao === 'agenda' ? '' : '<button id="abrir-lancamento" type="button" class="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-3xl font-light leading-none text-white shadow-2xl shadow-cyan-900/30">+</button>') +
        (state.modalLancamento ? modalLancamentoHtml() : '') +
        (state.modalAcao ? modalAcaoLancamentoHtml() : '') +
        (state.menuAberto ? menuLateralHtml() : '') +
        (state.modalMenu ? modalMenuHtml() : '') +
        toastHtml() +
      '</div>'
    );
  }

  function empresaHtml() {
    var empresasHtml = '';
    if (state.empresas.length > 1) {
      empresasHtml =
        '<label class="grid gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Perfil' +
        '<select id="empresa" style="font-size:16px" class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-base font-bold normal-case tracking-normal text-slate-900 shadow-sm">' +
        state.empresas.map(function (empresa) {
          return '<option value="' + escapeHtml(empresa.id) + '"' + (state.empresa && empresa.id === state.empresa.id ? ' selected' : '') + '>' + escapeHtml(nomeEmpresa(empresa)) + '</option>';
        }).join('') +
        '</select></label>';
    }

    return empresasHtml;
  }

  function toastHtml() {
    if (!state.toast) return '';

    return (
      '<div class="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center px-6">' +
        '<div class="rounded-2xl bg-slate-950/90 px-5 py-3 text-center text-sm font-black text-white shadow-2xl backdrop-blur">' +
          escapeHtml(state.toast) +
        '</div>' +
      '</div>'
    );
  }

  function rodapeMobileHtml() {
    var ano = new Date().getFullYear();
    var usuariosAtivosHtml = state.usuariosAtivosSistema === null
      ? ''
      : '<span class="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-0.5 font-black text-white shadow-sm">Usu&aacute;rios ativos ' + inteiro(state.usuariosAtivosSistema) + '</span>';
    return (
      '<footer class="mt-2 overflow-hidden rounded-2xl border border-white/15 px-4 py-4 text-center text-[11px] text-white shadow-lg shadow-sky-950/15" style="background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);">' +
        '<div class="text-xs font-black tracking-[0.18em] text-white">' + APP_VERSION_LABEL + '</div>' +
        '<p class="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-semibold text-cyan-50/90">&copy; ' + ano + ' Todos os direitos reservados.' + usuariosAtivosHtml + '</p>' +
        '<div class="mt-3 flex flex-wrap items-center justify-center gap-2 font-bold">' +
          '<a href="https://www.instagram.com/avanta.lab" target="_blank" rel="noopener noreferrer" class="rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-cyan-50 shadow-sm backdrop-blur">@avanta.lab</a>' +
          '<button id="termos-mobile" type="button" class="rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-cyan-50 shadow-sm backdrop-blur">Termos de Uso</button>' +
          '<button id="privacidade-mobile" type="button" class="rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-cyan-50 shadow-sm backdrop-blur">Privacidade</button>' +
        '</div>' +
      '</footer>'
    );
  }

  function avisoConfirmarHtml() {
    var pendentes = (state.lancamentos || []).filter(ehDespesaAConfirmar);
    if (!pendentes.length) return '';
    var total = pendentes.reduce(function (s, i) { return s + i.valor; }, 0);
    var plural = pendentes.length > 1;
    return (
      '<section class="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">' +
        '<div class="flex items-center gap-2 px-4 pt-3">' +
          '<span class="text-base">&#128276;</span>' +
          '<h2 class="min-w-0 flex-1 text-sm font-black text-amber-900">' + pendentes.length + ' despesa' + (plural ? 's' : '') + ' prevista' + (plural ? 's' : '') + ' para confirmar</h2>' +
          '<strong class="shrink-0 text-sm font-black text-amber-900">' + dinheiro(total) + '</strong>' +
        '</div>' +
        '<p class="px-4 pt-1 text-[11px] font-semibold leading-snug text-amber-700">J&aacute; entraram no total pelo valor previsto. Confirme, ajuste o valor ou marque que n&atilde;o ocorreu.</p>' +
        '<div class="grid gap-2 p-4">' +
          pendentes.map(function (item) {
            return '<div class="rounded-xl border border-amber-100 bg-white p-3">' +
              '<div class="flex items-center justify-between gap-2">' +
                '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.despesa) + '</p>' +
                '<p class="truncate text-xs text-slate-500">' + escapeHtml(item.mes.charAt(0) + item.mes.slice(1).toLowerCase()) + ' &middot; Dia ' + item.dia + (item.descricao ? ' - ' + escapeHtml(item.descricao) : '') + '</p></div>' +
                '<strong class="shrink-0 text-sm font-black text-red-600">' + dinheiro(item.valor) + '</strong>' +
              '</div>' +
              '<div class="mt-2 grid grid-cols-3 gap-2">' +
                '<button type="button" data-confirmar-id="' + escapeHtml(item.id) + '" class="h-9 rounded-lg bg-emerald-600 text-xs font-black text-white active:bg-emerald-700">Confirmar</button>' +
                '<button type="button" data-ajustar-id="' + escapeHtml(item.id) + '" class="h-9 rounded-lg border border-slate-300 bg-white text-xs font-black text-slate-700 active:bg-slate-50">Ajustar valor</button>' +
                '<button type="button" data-excluir-prevista-id="' + escapeHtml(item.id) + '" class="h-9 rounded-lg border border-red-200 bg-white text-xs font-black text-red-600 active:bg-red-50">Excluir</button>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</section>'
    );
  }

  function homeHtml(atual, anterior) {
    var banner = avisoConfirmarHtml();
    var cards = {
      saldo: saldoTopoHtml(atual, anterior),
      ia: perguntaIaHtml(),
      agenda: agendaResumoHtml(),
      categorias: graficoCategoriaHtml(atual),
      tipos: graficoTipoDespesaHtml(atual),
      ultimasDespesas: ultimasDespesasHtml(atual.lancamentos),
      ultimasReceitas: ultimasReceitasHtml(atual.entradas),
      totais: totaisHtml(atual),
      evolucaoDespesas: evolucaoHtml('despesas'),
      evolucaoReceitas: evolucaoHtml('receitas'),
    };

    var visiveis = cardsDashboardVisiveis();
    if (!visiveis.length) {
      return (
        banner +
        '<section class="rounded-2xl border border-cyan-100 bg-white p-4 text-center shadow-sm">' +
          '<p class="text-sm font-black text-slate-900">Nenhum card visivel</p>' +
          '<p class="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Abra o menu e use Configurar resumo para reexibir os cards.</p>' +
        '</section>'
      );
    }

    return banner + visiveis
      .map(function (id) {
        if (!cards[id]) return '';
        return '<div data-dashboard-card="' + escapeHtml(id) + '" class="relative pb-2 transition-[transform,opacity,filter] duration-200 ease-out">' +
          cards[id] +
          (id === 'ia' ? '' : '<button type="button" data-dashboard-handle="' + escapeHtml(id) + '" class="absolute bottom-1 right-3 flex h-7 w-8 select-none touch-none items-center justify-center rounded-full bg-transparent text-[11px] font-black leading-none text-slate-400" aria-label="Mover card">&vellip;&vellip;</button>') +
        '</div>';
      })
      .join('');
  }

  function saldoTopoHtml(atual, anterior) {
    return (
      '<section class="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">' +
        '<div class="grid grid-cols-3 gap-2 text-center">' +
          miniSaldoHtml('Inicial', anterior.saldo, 'text-slate-200') +
          miniSaldoHtml('Final', atual.saldo, atual.saldo >= 0 ? 'text-emerald-300' : 'text-red-300') +
          miniSaldoHtml('Previsto', atual.saldoPrevisto, atual.saldoPrevisto >= 0 ? 'text-cyan-300' : 'text-red-300') +
        '</div>' +
      '</section>'
    );
  }

  function miniSaldoHtml(rotulo, valor, cor) {
    return (
      '<div class="min-w-0">' +
        '<p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">' + rotulo + '</p>' +
        '<strong class="mt-1 block truncate text-sm font-black ' + cor + '">' + dinheiro(valor) + '</strong>' +
      '</div>'
    );
  }

  function perguntaIaHtml() {
    return (
      '<button id="chat-ia-card" type="button" class="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-left shadow-sm active:scale-[0.99]">' +
        '<span class="flex h-9 w-[88px] shrink-0 items-center justify-center">' + avaLogoPrincipalHtml(82, 40) + '</span>' +
        '<span class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-400">Pergunte para a Ava...</span>' +
        '<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-base font-black text-white">&#8593;</span>' +
      '</button>'
    );
  }

  function agendaResumoHtml() {
    var hoje = new Date();
    var ehMesAtual = state.mes === meses[hoje.getMonth()] && String(state.ano) === String(hoje.getFullYear());
    var dia = ehMesAtual ? hoje.getDate() : 1;
    return (
      '<button id="abrir-agenda-card" type="button" class="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[0.99]">' +
        '<div class="flex items-center gap-3">' +
          '<span class="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-md shadow-sky-950/15" style="background:linear-gradient(135deg,#0A1F44,#1F8A9E);">' +
            '<span class="text-[9px] font-black uppercase leading-none text-cyan-100">' + escapeHtml(nomeMesCompleto(state.mes).slice(0, 3)) + '</span>' +
            '<span class="mt-0.5 text-lg font-black leading-none">' + String(dia).padStart(2, '0') + '</span>' +
          '</span>' +
          '<span class="min-w-0 flex-1">' +
            '<span class="block text-sm font-black text-slate-900">Agenda</span>' +
            '<span class="mt-0.5 block truncate text-xs font-semibold text-slate-500">Lembretes e avisos do mes</span>' +
          '</span>' +
          '<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-lg font-black text-cyan-700">&#8250;</span>' +
        '</div>' +
      '</button>'
    );
  }

  function rotuloRepeticaoAgenda(valor) {
    return {
      diaria: 'Diaria',
      semanal: 'Semanal',
      quinzenal: 'Quinzenal',
      mensal: 'Mensal',
      anual: 'Anual',
    }[valor] || 'Sem repeticao';
  }

  function agendaItemHtml(item) {
    return (
      '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<p class="truncate text-sm font-black text-slate-900">' + escapeHtml(item.titulo) + '</p>' +
            '<p class="mt-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-700">Lembrete</p>' +
          '</div>' +
          '<div class="flex shrink-0 items-center gap-2">' +
            (item.repetir ? '<span class="rounded-full bg-cyan-50 px-2 py-1 text-[9px] font-black uppercase text-cyan-700">' + escapeHtml(rotuloRepeticaoAgenda(item.repeticao)) + '</span>' : '') +
            '<button type="button" data-agenda-excluir="' + escapeHtml(item.id) + '" class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-base font-black leading-none text-slate-600 active:scale-95" aria-label="Excluir lembrete">&times;</button>' +
          '</div>' +
        '</div>' +
        (item.descricao ? '<p class="mt-2 text-xs font-semibold leading-relaxed text-slate-500">' + escapeHtml(item.descricao) + '</p>' : '') +
      '</div>'
    );
  }

  function agendaDespesaHtml(item) {
    return (
      '<div class="rounded-2xl border border-rose-100 bg-white p-3 shadow-sm">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<p class="truncate text-sm font-black text-slate-900">' + escapeHtml(item.despesa || 'Despesa') + '</p>' +
            '<p class="mt-0.5 text-[10px] font-black uppercase tracking-wide text-rose-600">Despesa futura</p>' +
          '</div>' +
          '<strong class="shrink-0 text-sm font-black tabular-nums text-rose-600">' + Number(item.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '</strong>' +
        '</div>' +
        (item.descricao ? '<p class="mt-2 text-xs font-semibold leading-relaxed text-slate-500">' + escapeHtml(item.descricao) + '</p>' : '') +
      '</div>'
    );
  }

  function formularioAgendaHtml() {
    var opcoesRepeticao = [
      ['diaria', 'Diaria'],
      ['semanal', 'Semanal'],
      ['quinzenal', 'Quinzenal'],
      ['mensal', 'Mensal'],
      ['anual', 'Anual'],
    ].map(function (opcao) {
      return '<option value="' + opcao[0] + '"' + (state.agendaRepeticao === opcao[0] ? ' selected' : '') + '>' + opcao[1] + '</option>';
    }).join('');

    return (
      '<div id="agenda-form-overlay" class="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-sm">' +
        '<div class="w-full max-w-sm rounded-[26px] border border-white/70 bg-white p-4 shadow-2xl shadow-slate-950/30">' +
          '<div class="mb-3 flex items-center justify-between gap-3">' +
            '<div>' +
              '<p class="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">Novo item</p>' +
              '<h3 class="mt-1 text-lg font-black text-slate-950">' + String(state.agendaDiaSelecionado || '').padStart(2, '0') + ' de ' + escapeHtml(nomeMesCompleto(state.mes)) + '</h3>' +
            '</div>' +
            '<button id="cancelar-agenda-item-topo" type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xl font-black text-slate-600">&times;</button>' +
          '</div>' +
          '<div class="grid gap-2">' +
            '<input type="hidden" id="agenda-tipo" value="lembrete" />' +
            '<input id="agenda-titulo" value="' + escapeHtml(state.agendaTitulo || '') + '" placeholder="Titulo" style="font-size:16px" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-900 outline-none" />' +
            '<textarea id="agenda-descricao" placeholder="Descricao opcional" style="font-size:16px" class="h-[66px] resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-800 outline-none">' + escapeHtml(state.agendaDescricao || '') + '</textarea>' +
            '<label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800">' +
              '<input id="agenda-repetir" type="checkbox" class="h-5 w-5 rounded border-slate-300" ' + (state.agendaRepetir ? 'checked' : '') + ' />' +
              '<span>Repetir</span>' +
            '</label>' +
            '<select id="agenda-repeticao" style="font-size:16px" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none">' + opcoesRepeticao + '</select>' +
            '<div class="grid grid-cols-2 gap-2 pt-1">' +
              '<button id="cancelar-agenda-item" type="button" class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase text-slate-600">Cancelar</button>' +
              '<button id="salvar-agenda-item" type="button" class="h-10 rounded-xl bg-slate-950 px-3 text-xs font-black uppercase text-white">Salvar</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function agendaMobileHtml() {
    var ano = Number(state.ano) || new Date().getFullYear();
    var mesIndice = indiceMes(state.mes);
    var totalDias = maxDias(state.mes, state.ano);
    var primeiroDiaSemana = new Date(ano, mesIndice, 1).getDay();
    var hoje = new Date();
    var diaSelecionado = state.agendaDiaSelecionado ? Math.min(Math.max(Number(state.agendaDiaSelecionado), 1), totalDias) : null;
    var ehMesAtual = mesIndice === hoje.getMonth() && ano === hoje.getFullYear();
    var semana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    var celulas = [];

    semana.forEach(function (dia) {
      celulas.push('<div class="text-center text-[10px] font-black uppercase tracking-wide text-slate-400">' + dia + '</div>');
    });

    for (var vazio = 0; vazio < primeiroDiaSemana; vazio += 1) {
      celulas.push('<div class="min-h-0 rounded-2xl border border-transparent"></div>');
    }

    for (var dia = 1; dia <= totalDias; dia += 1) {
      var selecionado = dia === diaSelecionado;
      var hojeClasse = ehMesAtual && dia === hoje.getDate();
      var estilo = selecionado
        ? 'border-cyan-500 bg-cyan-50 shadow-md shadow-cyan-900/10'
        : 'border-slate-200 bg-white shadow-sm';
      var textoNumero = selecionado ? 'text-cyan-900' : 'text-slate-900';
      var tamanhoNumero = hojeClasse && diaSelecionado ? 'text-xs' : 'text-xl';
      var dataDia = new Date(ano, mesIndice, dia);
      var rotuloSemana = dataDia.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      var temLembreteDia = itensAgendaDoDia(state.ano, state.mes, dia).length > 0;
      var temDespesaFuturaDia = despesasFuturasDoDia(state.ano, state.mes, dia).length > 0;
      var indicadoresDia = (temLembreteDia || temDespesaFuturaDia)
        ? '<span class="absolute right-1.5 top-6 flex flex-col items-center gap-0.5">' +
            (temLembreteDia ? '<span class="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-sm"></span>' : '') +
            (temDespesaFuturaDia ? '<span class="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-sm"></span>' : '') +
          '</span>'
        : '';

      celulas.push(
        '<button type="button" data-agenda-dia="' + dia + '" class="relative min-h-0 overflow-hidden rounded-2xl border p-1.5 text-left transition active:scale-[0.98] ' + estilo + '">' +
          '<span class="block text-[10px] font-black uppercase tracking-wide ' + (selecionado ? 'text-cyan-700' : 'text-slate-400') + '">' + escapeHtml(rotuloSemana) + '</span>' +
          '<span class="mt-1 block pr-3 ' + tamanhoNumero + ' font-black leading-none ' + textoNumero + '">' + String(dia).padStart(2, '0') + '</span>' +
          indicadoresDia +
          (hojeClasse ? '<span class="absolute bottom-1 right-1 rounded-full bg-slate-950 px-1 py-0.5 text-[7px] font-black uppercase leading-none text-white">Hoje</span>' : '') +
        '</button>'
      );
    }

    while (celulas.length < 49) {
      celulas.push('<div class="min-h-0 rounded-2xl border border-transparent"></div>');
    }

    var itensDia = diaSelecionado ? itensAgendaDoDia(state.ano, state.mes, diaSelecionado) : [];
    var despesasDia = diaSelecionado ? despesasFuturasDoDia(state.ano, state.mes, diaSelecionado) : [];
    var painelDia = '';
    var formularioAgenda = state.agendaFormAberto ? formularioAgendaHtml() : '';
    var classeGrade = diaSelecionado
      ? 'grid min-h-0 shrink-0 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-1.5'
      : 'grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-1.5';
    var estiloGrade = diaSelecionado ? 'style="height:54%;"' : '';

    if (diaSelecionado) {
      painelDia =
        '<div class="-mt-8 flex min-h-0 flex-1 flex-col rounded-[24px] border-2 border-cyan-200 bg-cyan-50/85 p-4 shadow-xl shadow-cyan-950/10">' +
          '<div class="sticky top-0 z-10 -mx-1 flex shrink-0 items-center justify-between gap-3 border-b border-cyan-200/70 bg-cyan-50/95 px-1 pb-2 backdrop-blur">' +
            '<h3 class="min-w-0 flex-1 truncate text-sm font-black text-slate-950">Dia selecionado: ' + String(diaSelecionado).padStart(2, '0') + ' de ' + escapeHtml(nomeMesCompleto(state.mes)) + '</h3>' +
            '<button id="fechar-agenda-dia" type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-black text-slate-600" aria-label="Fechar dia">&times;</button>' +
          '</div>' +
          '<div class="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5">' +
            '<div class="rounded-2xl border border-cyan-200 bg-white/85 p-3 shadow-sm">' +
              '<div class="mb-2 flex items-center justify-between gap-2">' +
                '<h4 class="text-xs font-black uppercase tracking-wide text-cyan-800">Lembretes:</h4>' +
                '<button id="abrir-agenda-item" type="button" class="h-8 rounded-xl bg-cyan-600 px-3 text-[10px] font-black uppercase text-white">Adicionar</button>' +
              '</div>' +
              '<div class="grid gap-2">' +
                (itensDia.length
                  ? itensDia.map(agendaItemHtml).join('')
                  : '<div class="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/70 px-3 py-3 text-center"><p class="text-xs font-black text-slate-500">Nenhum lembrete neste dia.</p></div>') +
              '</div>' +
            '</div>' +
            (despesasDia.length
              ? '<div class="mt-4">' +
                  '<h4 class="mb-2 text-xs font-black uppercase tracking-wide text-rose-700">Despesas para o dia:</h4>' +
                  '<div class="grid gap-2">' + despesasDia.map(agendaDespesaHtml).join('') + '</div>' +
                '</div>'
              : '') +
          '</div>' +
        '</div>';
    }

    return (
      '<section id="agenda-mobile-screen" class="relative -mx-1 flex overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-3 shadow-sm" style="height:calc(100dvh - 170px - env(safe-area-inset-top));touch-action:pan-x;">' +
        '<div class="flex min-h-0 w-full flex-col">' +
          '<div class="shrink-0 px-1 pb-2">' +
            '<h2 class="text-center text-lg font-black tracking-[0.22em] text-slate-950">AGENDA</h2>' +
            '<p class="mt-1 text-center text-xs font-black uppercase tracking-wide text-cyan-700">' + escapeHtml(nomeMesCompleto(state.mes)) + ' ' + escapeHtml(state.ano) + '</p>' +
          '</div>' +
          '<div class="' + classeGrade + '" ' + estiloGrade + '>' + celulas.join('') + '</div>' +
          painelDia +
        '</div>' +
        formularioAgenda +
      '</section>'
    );
  }

  function categoriasDoMes(atual) {
    var categoriasMap = {};
    atual.lancamentos.forEach(function (lancamento) {
      var despesa = state.despesas.find(function (item) { return item.nome === lancamento.despesa; });
      var categoria = despesa ? despesa.categoria : 'Sem categoria';
      categoriasMap[categoria] = (categoriasMap[categoria] || 0) + lancamento.valor;
    });

    return Object.keys(categoriasMap)
      .map(function (categoria) { return { categoria: categoria, valor: categoriasMap[categoria] }; })
      .sort(function (a, b) { return b.valor - a.valor; });
  }

  function tiposDespesaDoMes(atual) {
    var tiposMap = {};
    atual.lancamentos.forEach(function (lancamento) {
      var tipo = lancamento.despesa || 'Sem tipo';
      tiposMap[tipo] = (tiposMap[tipo] || 0) + lancamento.valor;
    });

    return Object.keys(tiposMap)
      .map(function (tipo) { return { categoria: tipo, valor: tiposMap[tipo] }; })
      .sort(function (a, b) { return b.valor - a.valor; });
  }

  function graficoCategoriaHtml(atual) {
    return graficoPizzaHtml({
      titulo: 'Despesas por categoria',
      itens: categoriasDoMes(atual),
      total: atual.despesas || 0,
      expandido: state.categoriasExpandido,
      toggleId: 'toggle-categorias',
      textoExpandir: 'Expandir categorias',
    });
  }

  function graficoTipoDespesaHtml(atual) {
    return graficoPizzaHtml({
      titulo: 'Total por tipo de despesa',
      itens: tiposDespesaDoMes(atual),
      total: atual.despesas || 0,
      expandido: state.tiposDespesaExpandido,
      toggleId: 'toggle-tipos-despesa',
      textoExpandir: 'Expandir tipos',
    });
  }

  function graficoPizzaHtml(configuracao) {
    var categorias = configuracao.itens || [];
    var total = configuracao.total || 0;
    var totalFormatado = dinheiro(total);
    var classeValorCentral =
      totalFormatado.length > 15
        ? 'text-[8px]'
        : totalFormatado.length > 12
          ? 'text-[9px]'
          : 'text-[10px]';
    var cores = ['#0284c7', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#64748b'];
    var cursor = 0;
    var segmentos = categorias.map(function (item, index) {
      var inicio = cursor;
      var fim = total > 0 ? cursor + (item.valor / total) * 100 : cursor;
      cursor = fim;
      return cores[index % cores.length] + ' ' + inicio.toFixed(2) + '% ' + fim.toFixed(2) + '%';
    }).join(',');
    var fundo = total > 0 ? 'conic-gradient(' + segmentos + ')' : '#e2e8f0';
    var categoriasVisiveis = configuracao.expandido ? categorias : categorias.slice(0, 3);

    return (
      '<section class="rounded-2xl bg-white p-4 pb-8 shadow-sm">' +
        '<div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-black">' + escapeHtml(configuracao.titulo) + '</h2><span class="text-xs font-bold text-slate-400">' + dinheiro(total) + '</span></div>' +
        '<div class="grid grid-cols-[136px_1fr] items-center gap-3">' +
          '<div class="relative h-32 w-32 rounded-full" style="background:' + fundo + '">' +
            '<div class="absolute left-1/2 top-1/2 flex h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white px-1 text-center shadow-inner">' +
              '<span class="text-[9px] font-bold leading-none text-slate-400">Total</span><strong class="mt-1 block max-w-[78px] truncate leading-none ' + classeValorCentral + ' font-black text-slate-900">' + totalFormatado + '</strong>' +
            '</div>' +
          '</div>' +
          '<div class="grid gap-2">' +
            (categorias.length ? categoriasVisiveis.map(function (item, index) {
              return '<div class="flex min-w-0 items-center justify-between gap-2 text-xs">' +
                '<span class="min-w-0 truncate font-bold text-slate-600"><i class="mr-2 inline-block h-2.5 w-2.5 rounded-full" style="background:' + cores[index % cores.length] + '"></i>' + escapeHtml(item.categoria) + '</span>' +
                '<strong class="shrink-0 text-slate-900">' + dinheiro(item.valor) + '</strong>' +
              '</div>';
            }).join('') : '<p class="text-xs text-slate-500">Sem despesas no mes.</p>') +
            (categorias.length > 3 ? '<button id="' + escapeHtml(configuracao.toggleId) + '" type="button" class="mt-1 text-left text-xs font-black text-cyan-700">' + (configuracao.expandido ? 'Recolher' : escapeHtml(configuracao.textoExpandir)) + '</button>' : '') +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function visaoGeralHtml(atual) {
    return (
      '<section class="rounded-2xl bg-white p-4 pb-12 shadow-sm">' +
        '<h2 class="mb-2 text-sm font-black">Vis&atilde;o geral do m&ecirc;s</h2>' +
        '<div class="grid gap-1">' +
          linhaVisaoHtml('receitas', '+', 'Receitas', atual.receitas, 'bg-emerald-100 text-emerald-700') +
          linhaVisaoHtml('despesas', '-', 'Despesas', atual.despesas, 'bg-red-100 text-red-700') +
          linhaVisaoHtml('saldo', '=', 'Saldo', atual.saldo, 'bg-cyan-100 text-cyan-700') +
        '</div>' +
      '</section>'
    );
  }

  function linhaVisaoHtml(id, icone, titulo, valor, classe) {
    var clicavel = id === 'receitas' || id === 'despesas';
    return (
      '<button type="button" ' + (clicavel ? 'id="ver-' + id + '"' : '') + ' class="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition active:bg-slate-50">' +
        '<span class="flex min-w-0 items-center gap-3"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black ' + classe + '">' + icone + '</span><span class="truncate text-sm font-bold text-slate-700">' + titulo + '</span></span>' +
        '<strong class="shrink-0 text-sm font-black text-slate-900">' + dinheiro(valor) + '</strong>' +
      '</button>'
    );
  }

  function iconeBuscaUltimas(aberta) {
    var base = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    if (aberta) base += '<path d="M19 5 5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    return base + '</svg>';
  }

  function ultimasDespesasHtml(lancamentos) {
    var todos = lancamentos.slice().sort(function (a, b) { return b.dia - a.dia; });
    var pesquisando = state.ultimasDespesasBuscaAberta;
    var itens = pesquisando ? todos : (state.ultimasDespesasExpandido ? todos : todos.slice(0, 3));

    return (
      '<section class="overflow-hidden rounded-2xl bg-white shadow-sm">' +
        '<div class="flex items-center justify-between gap-3 bg-red-50 px-4 py-3"><h2 class="text-sm font-black text-red-900">Ultimas despesas</h2><div class="flex items-center gap-2">' + (!pesquisando && state.ultimasDespesasExpandido && todos.length > 3 ? '<button id="toggle-ultimas-despesas" type="button" class="flex h-8 items-center justify-center rounded-full bg-white/80 px-3 text-xs font-black text-red-700 shadow-sm">Recolher</button>' : '') + '<button id="buscar-ultimas-despesas" type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm font-black text-red-700 shadow-sm" aria-label="' + (pesquisando ? 'Fechar busca' : 'Buscar despesas') + '">' + iconeBuscaUltimas(pesquisando) + '</button></div></div>' +
        (state.ultimasDespesasBuscaAberta ? '<div class="px-4 pt-3"><div class="flex h-10 items-center gap-2 rounded-xl border border-red-100 bg-red-50/60 px-3"><input id="busca-ultimas-despesas" type="search" autocomplete="off" enterkeyhint="search" value="' + escapeHtml(state.ultimasDespesasBusca) + '" placeholder="Buscar descricao ou valor" style="font-size:16px" class="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none" /><button id="limpar-ultimas-despesas" type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-red-600 shadow-sm" aria-label="Limpar busca">&times;</button></div></div>' : '') +
        '<div class="grid gap-1 p-4" id="ultimas-despesas-lista">' +
          (itens.length ? itens.map(function (item) {
            var valor = dinheiro(item.valor);
            var selo = '';
            if (ehDespesaFutura(indiceMes(state.mes), item.dia)) {
              selo = ' <span class="ml-1 inline-block rounded-full bg-sky-100 px-1.5 align-middle text-[10px] font-black text-sky-700">Prevista</span>';
            } else if (item.status === 'prevista') {
              selo = ' <span class="ml-1 inline-block rounded-full bg-amber-100 px-1.5 align-middle text-[10px] font-black text-amber-700">A confirmar</span>';
            }
            var buscaItem = textoBusca([item.descricao, item.despesa, valor, item.valor].join(' '));
            return '<button type="button" data-tipo-lancamento="despesa" data-lancamento-id="' + escapeHtml(item.id) + '" data-busca-ultimas-despesas="' + escapeHtml(buscaItem) + '" class="flex w-full items-center justify-between gap-3 border-b border-slate-100 py-2 text-left last:border-b-0">' +
              '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.despesa) + selo + '</p><p class="truncate text-xs text-slate-500">Dia ' + item.dia + (item.descricao ? ' - ' + escapeHtml(item.descricao) : '') + '</p></div>' +
              '<strong class="shrink-0 text-sm font-black text-red-600">' + valor + '</strong>' +
            '</button>';
          }).join('') + '<p id="ultimas-despesas-vazia" style="display:none" class="text-xs text-slate-500">Nenhuma despesa encontrada.</p>' : '<p class="text-xs text-slate-500">Nenhuma despesa neste mes.</p>') +
          (!pesquisando && !state.ultimasDespesasExpandido && todos.length > 3 ? '<button id="toggle-ultimas-despesas" type="button" class="pt-2 text-left text-xs font-black text-cyan-700">Expandir despesas</button>' : '') +
        '</div>' +
      '</section>'
    );
  }

  function ultimasReceitasHtml(entradas) {
    var todos = entradas.slice().sort(function (a, b) { return b.dia - a.dia; });
    var pesquisando = state.ultimasReceitasBuscaAberta;
    var itens = pesquisando ? todos : (state.ultimasReceitasExpandido ? todos : todos.slice(0, 3));

    return (
      '<section class="overflow-hidden rounded-2xl bg-white shadow-sm">' +
        '<div class="flex items-center justify-between gap-3 bg-emerald-50 px-4 py-3"><h2 class="text-sm font-black text-emerald-900">Ultimas receitas</h2><div class="flex items-center gap-2">' + (!pesquisando && state.ultimasReceitasExpandido && todos.length > 3 ? '<button id="toggle-ultimas-receitas" type="button" class="flex h-8 items-center justify-center rounded-full bg-white/80 px-3 text-xs font-black text-emerald-700 shadow-sm">Recolher</button>' : '') + '<button id="buscar-ultimas-receitas" type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm font-black text-emerald-700 shadow-sm" aria-label="' + (pesquisando ? 'Fechar busca' : 'Buscar receitas') + '">' + iconeBuscaUltimas(pesquisando) + '</button></div></div>' +
        (state.ultimasReceitasBuscaAberta ? '<div class="px-4 pt-3"><div class="flex h-10 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3"><input id="busca-ultimas-receitas" type="search" autocomplete="off" enterkeyhint="search" value="' + escapeHtml(state.ultimasReceitasBusca) + '" placeholder="Buscar descricao ou valor" style="font-size:16px" class="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none" /><button id="limpar-ultimas-receitas" type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-emerald-600 shadow-sm" aria-label="Limpar busca">&times;</button></div></div>' : '') +
        '<div class="grid gap-1 p-4" id="ultimas-receitas-lista">' +
          (itens.length ? itens.map(function (item) {
            var valor = dinheiro(item.valor);
            var buscaItem = textoBusca([item.origem, item.descricao, valor, item.valor].join(' '));
            return '<button type="button" data-tipo-lancamento="receita" data-lancamento-id="' + escapeHtml(item.id) + '" data-busca-ultimas-receitas="' + escapeHtml(buscaItem) + '" class="flex w-full items-center justify-between gap-3 border-b border-slate-100 py-2 text-left last:border-b-0">' +
              '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.origem) + '</p><p class="truncate text-xs text-slate-500">Dia ' + item.dia + '</p></div>' +
              '<strong class="shrink-0 text-sm font-black text-emerald-600">' + valor + '</strong>' +
            '</button>';
          }).join('') + '<p id="ultimas-receitas-vazia" style="display:none" class="text-xs text-slate-500">Nenhuma receita encontrada.</p>' : '<p class="text-xs text-slate-500">Nenhuma receita neste mes.</p>') +
          (!pesquisando && !state.ultimasReceitasExpandido && todos.length > 3 ? '<button id="toggle-ultimas-receitas" type="button" class="pt-2 text-left text-xs font-black text-cyan-700">Expandir receitas</button>' : '') +
        '</div>' +
      '</section>'
    );
  }

  function totaisHtml(atual) {
    return (
      '<section class="rounded-2xl bg-white p-4 pb-12 shadow-sm">' +
        '<h2 class="mb-3 text-sm font-black">Vis&atilde;o geral do m&ecirc;s</h2>' +
        '<div class="grid grid-cols-3 gap-2">' +
          totalBoxHtml('Despesas', atual.despesas, 'text-red-600', 'ver-despesas-total') +
          totalBoxHtml('Receitas', atual.receitas, 'text-emerald-600', 'ver-receitas-total') +
          totalBoxHtml('Saldo', atual.saldo, atual.saldo >= 0 ? 'text-cyan-700' : 'text-red-600', '') +
        '</div>' +
      '</section>'
    );
  }

  function totalBoxHtml(titulo, valor, cor, id) {
    var tag = id ? 'button' : 'div';
    return '<' + tag + (id ? ' id="' + id + '" type="button"' : '') + ' class="min-w-0 rounded-2xl bg-slate-50 p-3 text-left shadow-sm"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">' + titulo + '</p><strong class="mt-1 block truncate text-xs font-black ' + cor + '">' + dinheiro(valor) + '</strong></' + tag + '>';
  }

  function evolucaoHtml(tipo) {
    var indiceAtual = indiceMes(state.mes);
    var inicio = Math.max(0, indiceAtual - 5);
    var lista = meses.slice(inicio, indiceAtual + 1).map(function (mes) {
      var dados = dadosMes(mes);
      return {
        mes: mes,
        valor: tipo === 'despesas' ? dados.despesas : dados.receitas,
      };
    });
    var max = Math.max.apply(null, lista.map(function (item) { return item.valor; }).concat([1]));
    var cor = tipo === 'despesas' ? 'bg-red-400' : 'bg-emerald-400';
    var valorSelecionado = state.evolucaoSelecionada[tipo];

    return (
      '<section class="rounded-2xl bg-white p-4 shadow-sm">' +
        '<div class="mb-3 flex items-center justify-between gap-3">' +
          '<h2 class="text-sm font-black">Evolucao das ' + (tipo === 'despesas' ? 'despesas' : 'receitas') + '</h2>' +
          '<span class="shrink-0 text-xs font-black ' + (tipo === 'despesas' ? 'text-red-600' : 'text-emerald-600') + '">' + (valorSelecionado != null ? dinheiro(valorSelecionado) : '') + '</span>' +
        '</div>' +
        '<div class="flex h-28 items-end gap-2">' +
          lista.map(function (item) {
            var altura = Math.max(8, Math.round((item.valor / max) * 100));
            return '<button type="button" data-evolucao-tipo="' + escapeHtml(tipo) + '" data-evolucao-mes="' + escapeHtml(item.mes) + '" data-evolucao-valor="' + escapeHtml(item.valor) + '" class="flex min-w-0 flex-1 flex-col items-center gap-1"><div class="flex h-24 w-full items-end"><div class="w-full rounded-t-md ' + cor + '" style="height:' + altura + '%"></div></div><span class="text-[9px] font-bold text-slate-400">' + item.mes.slice(0, 3) + '</span></button>';
          }).join('') +
        '</div>' +
      '</section>'
    );
  }

  function itensListaDetalhadaHtml(atual) {
    var tipo = state.visao;
    var itens = tipo === 'receitas'
      ? atual.entradas.map(function (item) {
          return {
            id: item.id,
            tipo: 'receita',
            titulo: item.origem,
            detalhe: 'Dia ' + item.dia,
            valor: item.valor,
            dia: item.dia,
          };
        })
      : atual.lancamentos.map(function (item) {
          return {
            id: item.id,
            tipo: 'despesa',
            titulo: item.despesa,
            detalhe: 'Dia ' + item.dia + (item.descricao ? ' - ' + item.descricao : ''),
            valor: item.valor,
            dia: item.dia,
          };
        });

    itens = itens.sort(function (a, b) { return b.dia - a.dia; });

    return itens.length ? itens.map(function (item) {
      var buscaItem = String(item.titulo + ' ' + item.detalhe + ' ' + item.valor).toLowerCase();
      return '<button type="button" data-tipo-lancamento="' + escapeHtml(item.tipo) + '" data-lancamento-id="' + escapeHtml(item.id) + '" data-busca-lancamento="' + escapeHtml(buscaItem) + '" class="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-1 py-3 text-left last:border-b-0">' +
        '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.titulo) + '</p><p class="truncate text-xs text-slate-500">' + escapeHtml(item.detalhe) + '</p></div>' +
        '<strong class="shrink-0 text-sm font-black ' + (tipo === 'receitas' ? 'text-emerald-600' : 'text-red-600') + '">' + dinheiro(item.valor) + '</strong>' +
      '</button>';
    }).join('') + '<p id="lista-detalhada-vazia" style="display:none" class="p-3 text-sm text-slate-500">Nenhum item encontrado.</p>' : '<p class="p-3 text-sm text-slate-500">Nenhum item encontrado.</p>';
  }

  function listaDetalhadaHtml(atual) {
    var tipo = state.visao;
    var total = tipo === 'receitas' ? atual.receitas : atual.despesas;
    var cor = tipo === 'receitas' ? 'text-emerald-600' : 'text-red-600';
    var titulo = tipo === 'receitas' ? 'Receitas' : 'Despesas';

    return (
      '<section class="grid gap-3">' +
        '<div class="rounded-2xl bg-white p-4 shadow-sm">' +
          '<div class="mb-3 flex items-center gap-3">' +
            '<button id="voltar-home" type="button" class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-700">&lsaquo;</button>' +
            '<div class="min-w-0 flex-1"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Total do mes</p><h2 class="truncate text-lg font-black">' + titulo + '</h2></div>' +
            '<strong class="shrink-0 text-sm font-black ' + cor + '">' + dinheiro(total) + '</strong>' +
          '</div>' +
          '<div class="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">' +
            '<span class="text-slate-400">&#128269;</span>' +
            '<input id="busca-lista" type="search" autocomplete="off" enterkeyhint="search" value="' + escapeHtml(state.busca) + '" placeholder="Procurar" style="font-size:16px" class="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-700 outline-none" />' +
            '<button id="limpar-busca-lista" type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500 shadow-sm" aria-label="Limpar busca">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div id="lista-detalhada-itens" class="rounded-2xl bg-white p-3 shadow-sm">' +
          itensListaDetalhadaHtml(atual) +
        '</div>' +
      '</section>'
    );
  }

  function modalLancamentoHtml() {
    var despesaAtiva = state.tipoLancamento === 'despesa';
    var novaAberta = state.novaDespesaAberta;

    return (
      '<div id="modal-lancamento-overlay" class="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-slate-950/60 px-3 py-4">' +
        '<section class="mx-auto max-h-[calc(100dvh-32px)] w-full max-w-md overflow-x-hidden overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl overscroll-contain">' +
          (novaAberta
            ? '<div class="-mx-4 -mt-4 mb-5 flex items-center gap-3 rounded-t-3xl border-b border-sky-100 bg-sky-50 px-4 py-3">' +
                '<button id="fechar-nova-despesa" type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg font-black text-slate-700">&larr;</button>' +
                '<div class="min-w-0 flex-1">' +
                  '<p class="text-[10px] font-black uppercase tracking-wide text-sky-500">Novo lan&ccedil;amento &rsaquo; Despesa</p>' +
                  '<h2 class="text-sm font-black text-sky-900">Cadastrar tipo de despesa</h2>' +
                '</div>' +
              '</div>' +
              novaDespesaFormHtml()
            : '<div class="-mx-4 -mt-4 mb-4 flex items-center justify-between rounded-t-3xl border-b border-cyan-100 bg-cyan-50/90 px-4 py-3">' +
                '<h2 class="text-base font-black">Novo lancamento</h2>' +
                '<button id="fechar-lancamento" type="button" class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600">&times;</button>' +
              '</div>' +
              '<div class="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">' +
                '<button id="tipo-despesa" type="button" class="h-9 rounded-lg text-sm font-black transition ' + (despesaAtiva ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500') + '">Despesa</button>' +
                '<button id="tipo-receita" type="button" class="h-9 rounded-lg text-sm font-black transition ' + (!despesaAtiva ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500') + '">Receita</button>' +
              '</div>' +
              '<p id="lancamento-alerta-dia" class="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700 mb-3"' + (state.erro ? '' : ' style="display:none"') + '>' + escapeHtml(state.erro) + '</p>' +
              (despesaAtiva ? modalDespesaCamposHtml() : modalReceitaCamposHtml())
          ) +
        '</section>' +
      '</div>'
    );
  }

  function novaDespesaFormHtml() {
    var categorias = categoriasDoPerfil(state.empresa && state.empresa.tipo_perfil);
    return (
      '<div class="grid gap-4">' +
        '<label class="grid gap-1.5 text-xs font-black uppercase tracking-wide text-slate-600">Nome da despesa' +
          '<input id="nova-despesa-nome" type="text" value="' + escapeHtml(state.novaDespesaNome) + '" placeholder="Ex: Plano de saude" style="font-size:16px" autocomplete="off" class="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" />' +
        '</label>' +
        '<label class="grid gap-1.5 text-xs font-black uppercase tracking-wide text-slate-600">Categoria' +
          '<select id="nova-despesa-categoria" style="font-size:16px" class="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal">' +
            categorias.map(function (cat) {
              return '<option value="' + escapeHtml(cat.nome) + '"' + (cat.nome === state.novaDespesaCategoria ? ' selected' : '') + '>' + escapeHtml(cat.nome) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
        alertaHtml().replace('mt-4', 'mt-0') +
        '<button id="salvar-nova-despesa" type="button" class="h-12 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white shadow-md">' + (state.carregando ? 'Salvando...' : 'Salvar tipo de despesa') + '</button>' +
      '</div>'
    );
  }

  function modalDespesaCamposHtml() {
    return (
      '<div class="grid gap-3">' +
        '<div class="flex items-end gap-6">' +
          '<div class="w-20 shrink-0">' + campoClaro('despesa-dia', 'Dia', 'type="number" min="1" max="' + maxDias(state.mes, state.ano) + '" inputmode="numeric" style="font-size:16px;text-align:center"') + '</div>' +
          '<label class="grid min-w-0 flex-1 gap-1 text-xs font-black uppercase tracking-wide text-slate-600">Despesa' +
            '<select id="despesa-nome" style="font-size:16px" class="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal">' +
              '<option value="">Selecione</option>' +
              state.despesas.map(function (despesa) {
                return '<option value="' + escapeHtml(despesa.nome) + '">' + escapeHtml(despesa.nome) + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
        '</div>' +
        '<button id="abrir-nova-despesa" type="button" class="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:text-slate-700">+ Cadastrar despesa</button>' +
        campoClaro('despesa-descricao', 'Descricao') +
        campoValor('despesa-valor', 'Valor') +
        // Linha parcelamento
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<button id="toggle-parcelar-despesa" type="button" class="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black uppercase tracking-wide transition-all ' +
            (state.formParcelar
              ? 'border-red-500 bg-red-600 text-white shadow-sm'
              : 'border-slate-300 bg-white text-slate-500') + '">' +
            '<span>' + (state.formParcelar ? '&#10003;' : '&divide;') + '</span>' +
            '<span>Parcelar</span>' +
          '</button>' +
          (state.formParcelar ? (
            '<div class="flex items-center gap-1">' +
              '<button id="parcelar-menos" type="button" class="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-black text-slate-700">&minus;</button>' +
              '<span class="w-7 text-center text-sm font-black text-slate-900">' + state.formParcelas + '</span>' +
              '<button id="parcelar-mais" type="button" class="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-black text-slate-700">+</button>' +
              '<span class="text-[10px] font-semibold text-slate-500">x</span>' +
            '</div>' +
            '<span class="text-[10px] font-semibold italic text-slate-400">nos meses seguintes</span>'
          ) : '') +
        '</div>' +
        '<button id="salvar-despesa" type="button" ' + (state.lancandoDespesa ? 'disabled ' : '') + 'class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white disabled:opacity-60">' + (state.lancandoDespesa ? 'Salvando...' : 'Salvar despesa') + '</button>' +
      '</div>'
    );
  }

  function modalReceitaCamposHtml() {
    var entradaAtiva = state.modoReceita !== 'total';
    return (
      '<div class="grid gap-3">' +
        '<div class="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">' +
          '<button id="modo-receita-entrada" type="button" class="h-9 rounded-lg text-xs font-black ' + (entradaAtiva ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500') + '">Adicionar entrada</button>' +
          '<button id="modo-receita-total" type="button" class="h-9 rounded-lg text-xs font-black ' + (!entradaAtiva ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500') + '">Definir total</button>' +
        '</div>' +
        (entradaAtiva
          ? '<div class="grid gap-3">' +
              '<div class="flex items-end gap-6">' +
                '<div class="w-20 shrink-0">' + campoClaro('entrada-dia', 'Dia', 'inputmode="numeric"') + '</div>' +
                '<div class="min-w-0 flex-1">' + campoClaro('entrada-origem', 'Origem') + '</div>' +
              '</div>' +
              campoValor('entrada-valor', 'Valor') +
              '<button id="salvar-entrada" type="button" class="h-11 rounded-xl bg-cyan-500 px-4 text-sm font-black uppercase tracking-wide text-slate-950">' + (state.carregando ? 'Salvando...' : 'Salvar receita') + '</button>' +
            '</div>'
          : '<div class="grid gap-3">' +
              '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900">Define o faturamento total do mes selecionado, substituindo o valor atual.</p>' +
              campoValor('receita-total', 'Total do mes') +
              '<button id="salvar-total-receita" type="button" class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Definir total') + '</button>' +
              (Object.prototype.hasOwnProperty.call(state.faturamentos, state.mes)
                ? '<button id="excluir-total-receita" type="button" class="h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black uppercase tracking-wide text-red-600">' + (state.carregando ? 'Excluindo...' : 'Excluir total do mes') + '</button>'
                : '') +
            '</div>') +
      '</div>'
    );
  }

  function modalAcaoLancamentoHtml() {
    var acao = state.modalAcao;
    if (!acao || !acao.item) return '';

    var item = acao.item;
    var receita = acao.tipo === 'receita';
    var titulo = receita ? item.origem : item.despesa;
    var detalhe = receita ? 'Receita' : 'Despesa';

    return (
      '<div id="modal-acao-overlay" class="fixed inset-0 z-[55] flex items-center justify-center overflow-hidden bg-slate-950/60 px-3 py-4">' +
        '<section class="mx-auto max-h-[calc(100dvh-32px)] w-full max-w-md overflow-x-hidden overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl overscroll-contain">' +
          '<div class="-mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 rounded-t-3xl border-b border-cyan-100 bg-cyan-50/90 px-4 py-3">' +
            '<div class="min-w-0"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">' + detalhe + '</p><h2 class="truncate text-base font-black">' + escapeHtml(titulo) + '</h2></div>' +
            '<button id="fechar-acao-lancamento" type="button" class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600">&times;</button>' +
          '</div>' +
          alertaHtml().replace('mt-4', 'mb-3') +
          (acao.modo === 'editar' ? modalEditarLancamentoHtml(acao) : modalOpcoesLancamentoHtml(acao)) +
        '</section>' +
      '</div>'
    );
  }

  function modalOpcoesLancamentoHtml(acao) {
    return (
      '<div class="grid gap-2">' +
        '<div class="rounded-2xl bg-slate-50 p-4"><p class="text-xs font-semibold text-slate-500">Dia ' + escapeHtml(acao.item.dia) + '</p><strong class="mt-1 block text-lg font-black">' + dinheiro(acao.item.valor) + '</strong></div>' +
        '<button id="editar-lancamento" type="button" class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white">Editar</button>' +
        '<button id="excluir-lancamento" type="button" class="h-11 rounded-xl bg-red-600 px-4 text-sm font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Excluindo...' : 'Excluir') + '</button>' +
      '</div>'
    );
  }

  function modalEditarLancamentoHtml(acao) {
    var item = acao.item;
    if (acao.tipo === 'receita') {
      return (
        '<div class="grid gap-3">' +
          '<div class="grid grid-cols-[72px_minmax(0,1fr)] gap-6">' +
            campoClaro('editar-dia', 'Dia', 'inputmode="numeric" value="' + escapeHtml(item.dia) + '"') +
            campoClaro('editar-origem', 'Origem', 'value="' + escapeHtml(item.origem) + '"') +
          '</div>' +
          campoValor('editar-valor', 'Valor', dinheiro(item.valor)) +
          '<button id="salvar-edicao-lancamento" type="button" class="h-11 rounded-xl bg-cyan-500 px-4 text-sm font-black uppercase tracking-wide text-slate-950">' + (state.carregando ? 'Salvando...' : 'Salvar alteracoes') + '</button>' +
        '</div>'
      );
    }

    return (
      '<div class="grid gap-3">' +
        '<div class="grid grid-cols-[72px_minmax(0,1fr)] gap-6">' +
          campoClaro('editar-dia', 'Dia', 'inputmode="numeric" value="' + escapeHtml(item.dia) + '"') +
          '<label class="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-600">Despesa' +
            '<select id="editar-despesa" style="font-size:16px" class="h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal">' +
              state.despesas.map(function (despesa) {
                return '<option value="' + escapeHtml(despesa.nome) + '"' + (despesa.nome === item.despesa ? ' selected' : '') + '>' + escapeHtml(despesa.nome) + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
        '</div>' +
        campoClaro('editar-descricao', 'Descricao', 'value="' + escapeHtml(item.descricao || '') + '"') +
        campoValor('editar-valor', 'Valor', dinheiro(item.valor)) +
        '<button id="salvar-edicao-lancamento" type="button" class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Salvar alteracoes') + '</button>' +
      '</div>'
    );
  }

  function menuLateralHtml() {
    var dk = state.darkMode;
    var bordaBase = dk ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
    var configAberto = !!state.menuConfigAberto;

    var configSubItens = configAberto ? (
      '<div class="cfg-sub-group mt-2 grid gap-1.5 overflow-hidden rounded-2xl border ' + (dk ? 'border-slate-700 bg-slate-800/60' : 'border-cyan-100 bg-cyan-50/40') + ' py-2 pl-5 pr-2">' +
        '<button id="menu-duplicados" type="button" class="rounded-xl border ' + bordaBase + ' px-3 py-2.5 text-left">' +
          '<div class="flex items-center gap-2.5">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-[10px] font-black text-cyan-700">D</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Duplicados</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">' + (state.duplicadosAtivo ? 'Avisar despesas repetidas' : 'Nao avisar repeticoes') + '</span></span>' +
            '<span class="relative h-5 w-9 shrink-0 rounded-full p-0.5 ' + (state.duplicadosAtivo ? 'bg-emerald-500' : 'bg-rose-400') + '"><span class="block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ' + (state.duplicadosAtivo ? 'translate-x-4' : 'translate-x-0') + '"></span></span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-gerenciar" type="button" class="rounded-xl border ' + bordaBase + ' px-3 py-2.5 text-left active:scale-[0.99]">' +
          '<div class="flex items-center gap-2.5">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-[10px] font-black text-cyan-700">P</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Gerenciar perfil</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">Editar, criar ou excluir perfil</span></span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-tema" type="button" class="rounded-xl border ' + bordaBase + ' px-3 py-2.5 text-left">' +
          '<div class="flex items-center gap-2.5">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-[10px] font-black text-cyan-700">' + (dk ? 'ON' : 'OFF') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Modo escuro</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">' + (dk ? 'Ativo' : 'Inativo') + '</span></span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-organizar-dashboard" type="button" class="rounded-xl border ' + bordaBase + ' px-3 py-2.5 text-left active:scale-[0.99]">' +
          '<div class="flex items-center gap-2.5">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-sm font-black text-cyan-700">&#8597;</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Organizar Dashboard</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">Definir a ordem dos cards</span></span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-usuario" type="button" class="rounded-xl border ' + bordaBase + ' px-3 py-2.5 text-left active:scale-[0.99]">' +
          '<div class="flex items-center gap-2.5">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-[10px] font-black text-cyan-700">U</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Usuarios</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">' + escapeHtml(perfilFormatado(state.empresa && state.empresa.perfil)) + '</span></span>' +
          '</div>' +
        '</button>' +
      '</div>'
    ) : '';

    return (
      '<div id="menu-overlay" class="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm">' +
        '<aside id="menu-aside" data-preserve-scroll class="h-full w-[84vw] max-w-[328px] overflow-y-auto ' + (dk ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900') + ' p-3 shadow-2xl">' +
          '<div class="mb-3 overflow-hidden rounded-2xl border border-white/15 p-3 text-white shadow-lg shadow-sky-950/15" style="background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);">' +
            '<div class="flex items-start justify-between gap-3">' +
              '<div class="min-w-0"><p class="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-100">AvantaLab</p><h2 class="mt-1 truncate text-base font-black">' + escapeHtml(nomeEmpresa(state.empresa)) + '</h2><p class="mt-0.5 truncate text-[11px] font-semibold text-cyan-50/85">' + escapeHtml(state.usuario && state.usuario.email ? state.usuario.email : 'Usuario logado') + '</p></div>' +
              '<button id="fechar-menu" type="button" class="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/15 text-lg font-black text-white">&times;</button>' +
            '</div>' +
          '</div>' +
          '<div class="grid gap-2">' +
            menuBotaoHtml('menu-agenda', 'Agenda', 'Lembretes e avisos', iconeAgendaSvg()) +
            menuBotaoHtml('menu-notificacoes', 'Ativar / Desativar notificacoes', 'Receber avisos no celular', sinoAvisoSvg()) +
            menuBotaoHtml('menu-configurar-resumo', 'Organizar resumo', 'Exibir e ocultar cards', '&#9776;') +
            menuBotaoHtml('menu-categorias', 'Cadastrar despesas', 'Adicionar tipos de despesa', '+') +
            menuBotaoHtml('menu-despesas-fixas', 'Despesas fixas', 'Lancamentos automaticos mensais', '&#10227;') +
            menuBotaoHtml('menu-ajuda-categorias', 'Instrucoes sobre categorias', 'Como organizar seus gastos', '?') +
            menuBotaoHtml('menu-tutorial', 'Tutorial', 'Como usar o AvantaLab', '&#127891;') +
            '<button id="menu-config-toggle" type="button" class="rounded-2xl border ' + (configAberto ? (dk ? 'border-cyan-700 bg-cyan-900/40' : 'border-cyan-200 bg-cyan-50') : bordaBase) + ' p-3 text-left shadow-sm active:scale-[0.99]">' +
              '<div class="flex items-center gap-3">' +
                '<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ' + (configAberto ? 'bg-cyan-600 text-white' : 'bg-cyan-50 text-cyan-700') + '">&#9881;</span>' +
                '<span class="min-w-0 flex-1"><span class="block text-xs font-black">Configuracoes</span><span class="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">Perfil, tema e preferencias</span></span>' +
                '<span class="text-[10px] font-black text-slate-400">' + (configAberto ? '&#9650;' : '&#9660;') + '</span>' +
              '</div>' +
            '</button>' +
            configSubItens +
            '<button id="menu-feedback" type="button" class="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-left shadow-sm active:scale-[0.99]"><div class="flex items-center gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white" style="background:linear-gradient(135deg,#003E73,#00A6C8)">!</span><span class="min-w-0 flex-1"><span class="block text-xs font-black text-slate-900">Duvidas e Sugestoes</span><span class="mt-0.5 block truncate text-[10px] font-semibold text-cyan-800">Ajude a melhorar o AvantaLab</span></span></div></button>' +
            '<button id="sair" type="button" class="mt-1 rounded-2xl border border-rose-100 bg-white p-3 text-left text-xs font-black text-rose-700 shadow-sm">Sair</button>' +
          '</div>' +
        '</aside>' +
      '</div>'
    );
  }

  function chatIAModalHtml() {
    var dark = !!state.darkMode;
    var temTexto = state.chatIAInput.trim().length > 0;
    var gravando = state.chatIAGravando;
    var enviando = state.chatIADigitando;
    var transcrevendoAudio = state.chatIAAudioEnviando;

    var C = dark
      ? { bg:'#0b1220', bar:'#0b1220', border:'#1c2940', text:'#e8eef6', muted:'#8896ab',
          card:'#141e30', cardBorder:'#243349', userBg:'#26334a', userTx:'#eaf1fb',
          aiBg:'#141e30', aiTx:'#e8eef6', aiBorder:'#243349', pill:'#141e30', pillBorder:'#2a3a52',
          sep:'#243349', plus:'#8896ab', sendOff:'#243349', sendArrowOff:'#5b6b82', accent:'#7cc4ff', sparkBg:'rgba(59,130,246,0.14)' }
      : { bg:'#f4f8fc', bar:'#ffffff', border:'#e7eef6', text:'#10243d', muted:'#647892',
          card:'#ffffff', cardBorder:'#e7eef6', userBg:'linear-gradient(135deg,#0ea5e9,#0369a1)', userTx:'#ffffff',
          aiBg:'#ffffff', aiTx:'#10243d', aiBorder:'#e7eef6', pill:'#f1f5f9', pillBorder:'#e2e8f0',
          sep:'#e2e8f0', plus:'#94a3b8', sendOff:'#e2e8f0', sendArrowOff:'#94a3b8', accent:'#0284c7', sparkBg:'rgba(2,132,199,0.10)' };

    function sparkSvg(sz, id) {
      return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">' +
        '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">' +
          '<stop stop-color="#38bdf8"/><stop offset="0.5" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/>' +
        '</linearGradient></defs>' +
        '<circle cx="12" cy="12" r="10" fill="rgba(56,189,248,0.12)"/>' +
        '<path d="M6.4 17.4C7.8 12.4 9.8 7.2 12 7.2s4.2 5.2 5.6 10.2" stroke="url(#' + id + ')" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M8.5 14.2c1.4-1.25 2.55-1.85 3.5-1.85s2.1.6 3.5 1.85" stroke="url(#' + id + ')" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M7.5 18.6c2.65 1.45 6.35 1.45 9 0" stroke="url(#' + id + ')" stroke-width="1.55" stroke-linecap="round" opacity="0.72"/>' +
        '<circle cx="18.25" cy="17.2" r="1.7" fill="url(#' + id + ')"/>' +
      '</svg>';
    }
    function sugIcon(k, cor) {
      if (k === 'chart') return '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="' + cor + '" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 14l3-3 3 3 5-6"/></svg>';
      if (k === 'doc')   return '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="' + cor + '" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6M9 17h6M9 9h2M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>';
      if (k === 'plus')  return '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="' + cor + '" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/></svg>';
      return '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="' + cor + '" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5h18V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5zM3 7.5 5 4h14l2 3.5M16 13.5h2"/></svg>';
    }

    var primeiro = primeiroNomeUsuarioAva();
    var saud = 'Ol&aacute;' + (primeiro ? ', ' + escapeHtml(primeiro) : '') + '.';

    var sugs = [
      { ic:'doc',    cor:'#22c55e', bg:'rgba(34,197,94,0.16)',  t:'Por onde inicio o uso do sistema?' },
      { ic:'chart',  cor:'#f59e0b', bg:'rgba(245,158,11,0.16)', t:'Analise meus resultados.' },
      { ic:'wallet', cor:'#3b82f6', bg:'rgba(59,130,246,0.16)', t:'Como reduzir gastos sem afetar o essencial?' },
      { ic:'plus',   cor:'#ef4444', bg:'rgba(239,68,68,0.16)',  t:'Como montar uma reserva de emergência?' }
    ];
    var cards = sugs.map(function(srg, i) {
      return '<button id="chat-ia-sug-' + i + '" type="button" style="' +
          'display:flex;align-items:center;gap:9px;text-align:left;cursor:pointer;width:100%;' +
          'background:' + C.card + ';border:1px solid ' + C.cardBorder + ';border-radius:15px;padding:11px;' +
          (dark ? '' : 'box-shadow:0 1px 3px rgba(15,35,61,0.05);') + '">' +
          '<span style="width:30px;height:30px;border-radius:50%;background:' + srg.bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + sugIcon(srg.ic, srg.cor) + '</span>' +
          '<span style="flex:1;min-width:0;font-size:12px;font-weight:600;line-height:1.25;color:' + C.text + ';">' + escapeHtml(srg.t) + '</span>' +
          '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="' + C.muted + '" stroke-width="2" style="flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
        '</button>';
    }).join('');

    var welcome =
      '<div style="text-align:center;padding:18px 6px 4px;">' +
        '<p style="margin:0;font-size:18px;font-weight:800;color:' + C.text + ';letter-spacing:-0.01em;">' + saud + '</p>' +
        '<p style="margin:7px auto 0;max-width:282px;font-size:12.5px;line-height:1.5;color:' + C.muted + ';">Sou a Ava, sua assistente financeira. Como posso ajudar?</p>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:14px 2px 4px;">' + cards + '</div>';

    var firstUser = -1;
    for (var fu = 0; fu < state.chatIAMensagens.length; fu++) { if (state.chatIAMensagens[fu].role === 'user') { firstUser = fu; break; } }
    var convoHtml = '';
    if (firstUser >= 0) {
      convoHtml += '<div style="display:flex;align-items:center;gap:10px;margin:20px 4px 14px;">' +
          '<span style="flex:1;height:1px;background:' + C.sep + ';"></span>' +
          '<span style="font-size:10.5px;font-weight:600;color:' + C.muted + ';">Hoje</span>' +
          '<span style="flex:1;height:1px;background:' + C.sep + ';"></span>' +
        '</div>';
      convoHtml += state.chatIAMensagens.slice(firstUser).map(function(m) {
        var isUser = m.role === 'user';
        var digitando = !isUser && !m.content;
        var inner = digitando
          ? '<span style="display:inline-flex;gap:5px;align-items:center;height:18px">' +
              '<span style="width:7px;height:7px;border-radius:50%;background:' + C.muted + ';display:inline-block;animation:avaBounce 1.2s infinite 0ms"></span>' +
              '<span style="width:7px;height:7px;border-radius:50%;background:' + C.muted + ';display:inline-block;animation:avaBounce 1.2s infinite 200ms"></span>' +
              '<span style="width:7px;height:7px;border-radius:50%;background:' + C.muted + ';display:inline-block;animation:avaBounce 1.2s infinite 400ms"></span>' +
            '</span>'
          : escapeHtml(m.content);
        var bub = isUser
          ? 'background:' + C.userBg + ';color:' + C.userTx + ';border-radius:18px 18px 5px 18px;'
          : 'background:' + C.aiBg + ';color:' + C.aiTx + ';border:1px solid ' + C.aiBorder + ';border-radius:18px 18px 18px 5px;' + (dark ? '' : 'box-shadow:0 1px 4px rgba(15,35,61,0.06);');
        var hora = (m.hora && !digitando) ? '<span style="display:block;margin-top:4px;font-size:9.5px;' + (isUser ? 'text-align:right;color:rgba(255,255,255,0.75);' : 'color:' + C.muted + ';') + '">' + escapeHtml(m.hora) + '</span>' : '';
        return '<div style="display:flex;margin-bottom:12px;animation:avaFadeUp 0.25s ease;' + (isUser ? 'justify-content:flex-end;' : 'justify-content:flex-start;') + '">' +
            '<div style="max-width:82%;padding:10px 14px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word;' + bub + '">' + inner + hora + '</div>' +
          '</div>';
      }).join('');
    }

    var header =
      '<div style="position:absolute;top:0;left:0;right:0;z-index:4;display:flex;align-items:center;gap:10px;' +
        'padding-top:calc(env(safe-area-inset-top,0px) + 12px);padding-left:8px;padding-right:14px;padding-bottom:12px;' +
        'background:' + C.bar + ';border-bottom:1px solid ' + C.border + ';">' +
        '<button id="chat-ia-fechar" type="button" aria-label="Voltar" style="background:transparent;border:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">' +
          '<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="' + C.text + '" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
        '</button>' +
        avaLogoPrincipalHtml(96, 52) +
      '</div>';

    var body =
      '<div id="chat-ia-msgs" style="position:absolute;left:0;right:0;z-index:2;top:calc(env(safe-area-inset-top,0px) + 76px);bottom:64px;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:6px 14px 16px;">' +
        welcome + convoHtml +
      '</div>';

    var micInner = transcrevendoAudio
      ? '<span style="width:16px;height:16px;border:2px solid ' + C.muted + ';border-top-color:transparent;border-radius:50%;display:block;animation:avaSpin .8s linear infinite;"></span>'
      : gravando
      ? '<svg width="16" height="16" fill="#fff" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>'
      : '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="' + C.muted + '" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>';
    var micStyle = 'width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;' +
      (gravando ? 'background:#ef4444;animation:avaPulse 1.3s infinite;' : 'background:transparent;');
    var micBtn = '<button id="chat-ia-mic" type="button" ' + (transcrevendoAudio || enviando ? 'disabled' : '') + ' style="' + micStyle + (transcrevendoAudio || enviando ? 'opacity:.65;cursor:not-allowed;' : '') + '" aria-label="' + (gravando ? 'Parar gravacao' : 'Gravar audio para a Ava') + '">' + micInner + '</button>';

    var sendActive = temTexto && !enviando;
    var sendStyle = 'width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;' +
      (sendActive ? 'background:linear-gradient(135deg,#0ea5e9,#0369a1);box-shadow:0 3px 10px rgba(2,132,199,0.32);' : 'background:transparent;');
    var sendBtn = '<button id="chat-ia-enviar" type="button" ' + (sendActive ? '' : 'disabled') + ' style="' + sendStyle + '">' +
        '<svg width="19" height="19" viewBox="0 0 24 24"><path fill="' + (sendActive ? '#fff' : C.sendArrowOff) + '" d="M12 4l-7.5 7.5 1.4 1.4L11 8.8V20h2V8.8l5.1 5.1 1.4-1.4z"/></svg>' +
      '</button>';

    var fieldBg = dark ? '#111b2d' : '#ffffff';
    var fieldBorder = dark ? '#27364f' : '#d8e4ef';
    var keyboardShield =
      '<div aria-hidden="true" style="position:absolute;left:0;right:0;bottom:0;z-index:1;height:86px;background:' + C.bg + ';pointer-events:none;"></div>';
    var inputBar =
      '<div style="position:absolute;left:0;right:0;bottom:0;z-index:3;padding:5px 10px;' +
        'padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px);background:' + C.bg + ';">' +
        '<div style="width:100%;display:flex;align-items:flex-end;gap:4px;background:' + fieldBg + ';border:1px solid ' + fieldBorder + ';border-radius:24px;padding:5px 6px 5px 14px;min-height:46px;box-shadow:' + (dark ? 'none' : '0 8px 20px rgba(15,35,61,0.08)') + ';">' +
          '<div id="chat-ia-input" role="textbox" aria-multiline="true" inputmode="text" enterkeyhint="send" autocapitalize="sentences" autocomplete="off" autocorrect="on" spellcheck="true" contenteditable="' + (enviando ? 'false' : 'plaintext-only') + '" data-placeholder="Como posso ajudar voce hoje?" style="flex:1;min-height:22px;max-height:96px;overflow-y:auto;outline:none;background:transparent;font-size:16px;font-family:inherit;color:' + C.text + ';line-height:1.4;padding:7px 2px;margin:0;width:100%;white-space:pre-wrap;word-break:break-word;-webkit-user-select:text;user-select:text;">' + escapeHtml(state.chatIAInput) + '</div>' +
          micBtn +
          sendBtn +
        '</div>' +
      '</div>';

    var animacao = state.chatIAAnimacao === 'entrar'
      ? 'animation:avaSlideIn .22s cubic-bezier(.2,.8,.2,1);'
      : state.chatIAAnimacao === 'sair'
        ? 'animation:avaSlideOut .2s ease forwards;'
        : '';

    return (
      '<div id="chat-ia-overlay" style="position:fixed;top:0;left:0;right:0;bottom:auto;width:100vw;height:100dvh;min-height:100dvh;z-index:5000;display:block;background:' + C.bg + ';overflow:hidden;isolation:isolate;overscroll-behavior:contain;--ava-keyboard-offset:0px;' + animacao + '">' +
        keyboardShield + header + body + inputBar +
      '</div>'
    );
  }


    function menuBotaoHtml(id, titulo, subtitulo, icone) {
    return '<button id="' + id + '" type="button" class="rounded-2xl border ' + (state.darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white') + ' p-3 text-left shadow-sm active:scale-[0.99]">' +
      '<div class="flex items-center gap-3">' +
        '<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-sm font-black text-cyan-700">' + (icone || '&bull;') + '</span>' +
        '<span class="min-w-0 flex-1"><span class="block text-xs font-black">' + escapeHtml(titulo) + '</span><span class="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">' + escapeHtml(subtitulo || '') + '</span></span>' +
      '</div>' +
    '</button>';
  }

  function modalMenuHtml() {
    var titulo = {
      usuario: 'Usuario',
      empresa: 'Trocar perfil',
      gerenciar: 'Gerenciar perfil',
      configurarResumo: 'Configurar resumo',
      organizarDashboard: 'Organizar dashboard',
      categorias: 'Cadastrar despesas',
      ajudaCategorias: 'Instrucoes',
      'instalar-ios': 'Instalar no iPhone',
      'instalar-android': 'Instalar app',
      termos: 'Termos de Uso',
      privacidade: 'Privacidade',
      feedback: 'Dúvidas e Sugestões',
      despesasFixas: 'Gerenciar despesas fixas',
    }[state.modalMenu] || 'Menu';

    return (
      '<div id="modal-menu-overlay" class="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-slate-950/60 px-3 py-4">' +
        '<section class="mx-auto flex max-h-[calc(100dvh-32px)] w-full max-w-md flex-col overflow-hidden rounded-3xl ' + (state.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900') + ' shadow-2xl">' +
          '<div class="shrink-0 flex items-center justify-between gap-3 border-b ' + (state.darkMode ? 'border-slate-700 bg-slate-800' : 'border-cyan-100 bg-cyan-50/90') + ' px-4 py-3">' +
            '<h2 class="text-base font-black">' + escapeHtml(titulo) + '</h2>' +
            '<button id="fechar-modal-menu" type="button" class="flex h-9 w-9 items-center justify-center rounded-full ' + (state.darkMode ? 'bg-slate-800' : 'bg-slate-100') + ' text-xl">&times;</button>' +
          '</div>' +
          '<div id="modal-menu-scroll" data-preserve-scroll class="min-h-0 flex-1 overflow-y-auto p-4 overscroll-contain">' + conteudoModalMenuHtml() + '</div>' +
        '</section>' +
      '</div>'
    );
  }

  function conteudoModalMenuHtml() {
    if (state.modalMenu === 'usuario') return usuarioHtml();
    if (state.modalMenu === 'empresa') return trocarEmpresaHtml();
    if (state.modalMenu === 'gerenciar') return gerenciarEmpresaHtml();
    if (state.modalMenu === 'configurarResumo') return configurarResumoHtml();
    if (state.modalMenu === 'organizarDashboard') return organizarDashboardHtml();
    if (state.modalMenu === 'categorias') return categoriasMenuHtml();
    if (state.modalMenu === 'ajudaCategorias') return ajudaCategoriasHtml();
    if (state.modalMenu === 'instalar-ios') return instalarIosHtml();
    if (state.modalMenu === 'instalar-android') return instalarAndroidHtml();
    if (state.modalMenu === 'termos') return termosMobileHtml();
    if (state.modalMenu === 'privacidade') return privacidadeMobileHtml();
    if (state.modalMenu === 'feedback') return feedbackMobileHtml();
    if (state.modalMenu === 'despesasFixas') return despesasFixasMenuHtml();
    return '';
  }

  function feedbackMobileHtml() {
    if (state.feedbackEtapa === 'formulario') {
      var sugestao = state.feedbackTipo === 'sugestao';
      return (
        '<div class="grid gap-4 text-sm">' +
          alertaHtml().replace('mt-4', '') +
          '<button id="feedback-voltar" type="button" class="w-fit text-xs font-black uppercase tracking-wide text-cyan-700">Voltar</button>' +
          '<div>' +
            '<h3 class="text-lg font-black">' + (sugestao ? 'Enviar sugestao' : 'Enviar duvida') + '</h3>' +
            '<p class="mt-2 text-xs font-semibold leading-relaxed text-slate-500">' +
              (sugestao
                ? 'Sua opiniao e muito importante para melhorarmos o AvantaLab. Escreva sua sugestao, avaliacao ou ponto de melhoria.'
                : 'Descreva sua duvida sobre o uso do AvantaLab. Esse canal ajuda a melhorar o sistema e orientar os proximos ajustes.') +
            '</p>' +
          '</div>' +
          '<textarea id="feedback-mensagem" rows="6" placeholder="' + (sugestao ? 'Escreva sua sugestao...' : 'Escreva sua duvida...') + '" style="font-size:16px" class="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15">' + escapeHtml(state.feedbackMensagem || '') + '</textarea>' +
          '<button id="feedback-enviar" type="button" class="h-12 rounded-2xl px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-60" style="background:linear-gradient(135deg,#003E73,#00A6C8)"' + (state.feedbackEnviando ? ' disabled' : '') + '>' + (state.feedbackEnviando ? 'Enviando...' : 'Enviar mensagem') + '</button>' +
        '</div>'
      );
    }

    if (state.feedbackEtapa === 'confirmacao') {
      return (
        '<div class="grid gap-4 text-center text-sm">' +
          '<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-black text-emerald-700">&#10003;</div>' +
          '<div>' +
            '<h3 class="text-lg font-black">Mensagem registrada</h3>' +
            '<p class="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Obrigado! Sua mensagem foi registrada com sucesso.</p>' +
          '</div>' +
          '<button id="feedback-outra" type="button" class="h-12 rounded-2xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg">Enviar outra mensagem</button>' +
        '</div>'
      );
    }

    return (
      '<div class="grid gap-4 text-sm">' +
        '<p class="text-sm font-semibold leading-relaxed text-slate-600">Ola, agradecemos sua interacao com a AvantaLab. Como podemos ajudar?</p>' +
        '<div class="grid gap-3">' +
          '<button id="feedback-abrir-ava" type="button" class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm active:scale-[0.99]">' +
            avaLogoPrincipalHtml(38, 38) +
            '<span class="min-w-0 flex-1">' +
              '<span class="block text-sm font-black text-slate-900">Pergunte para a Ava</span>' +
              '<span class="mt-0.5 block text-xs font-semibold text-slate-500">Tire duvidas com nossa assistente de IA.</span>' +
            '</span>' +
            '<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-base font-black text-white">&#8593;</span>' +
          '</button>' +
          '<button id="feedback-sugestao" type="button" class="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-left shadow-sm active:scale-[0.99]">' +
            '<div class="flex items-center gap-3">' +
              '<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-lg font-black text-cyan-800">&#10022;</span>' +
              '<span><span class="block text-sm font-black text-slate-900">Sugestoes</span><span class="mt-0.5 block text-xs font-semibold text-slate-500">Envie ideias, avaliacoes ou pontos de melhoria.</span></span>' +
            '</div>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function usuarioHtml() {
    if (!podeGerenciarUsuarios()) {
      return (
        '<div class="grid gap-3 text-sm">' +
          '<div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Email</p><p class="mt-1 font-bold">' + escapeHtml(state.usuario && state.usuario.email ? state.usuario.email : '-') + '</p></div>' +
          '<div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Perfil</p><p class="mt-1 font-bold">' + escapeHtml(perfilFormatado(state.empresa && state.empresa.perfil)) + '</p></div>' +
          '<p class="rounded-2xl bg-cyan-50 p-4 text-xs font-semibold text-cyan-900">Somente Gestor Master e Administrador podem criar, editar ou excluir usuarios.</p>' +
        '</div>'
      );
    }

    var usuarioEditando = state.usuariosEmpresa.find(function (usuario) { return String(usuario.id) === String(state.usuarioEditandoId); });
    var formularioUsuario = usuarioEditando
      ? editarUsuarioHtml(usuarioEditando)
      : (state.usuarioModo === 'criar'
        ? criarUsuarioHtml()
        : state.usuarioModo === 'existente'
          ? usuarioExistenteHtml()
          : '');

    return (
      '<div class="grid w-full min-w-0 gap-3 overflow-x-hidden text-sm">' +
        alertaHtml().replace('mt-4', '') +
        (usuarioEditando ? '' : botoesFluxoUsuarioHtml()) +
        formularioUsuario +
        '<div class="grid min-w-0 gap-1.5">' +
          '<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Usuarios cadastrados</p>' +
          (state.usuariosCarregando ? '<p class="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Carregando usuarios...</p>' : '') +
          (state.usuariosEmpresa.length ? state.usuariosEmpresa.map(function (usuario) {
            var atual = state.empresa && state.empresa.acessoId === usuario.id;
            var bloqueado = usuario.status === 'bloqueado';
            var protegido = usuario.perfil === 'gestor_master' && !atual && !(state.empresa && state.empresa.perfil === 'gestor_master');
            return '<div class="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">' +
              '<div class="grid min-w-0 gap-2">' +
                '<div class="min-w-0"><p class="truncate text-xs font-black text-slate-900">' + escapeHtml(usuario.nome || usuario.login || usuario.email || 'Usuario') + '</p><p class="truncate text-[10px] font-semibold text-slate-500">' + escapeHtml(usuario.login || usuario.email || '-') + ' · ' + escapeHtml(perfilFormatado(usuario.perfil)) + (bloqueado ? ' · Bloqueado' : '') + '</p></div>' +
                '<div class="flex min-w-0 gap-1">' +
                  '<button type="button" data-editar-usuario="' + escapeHtml(usuario.id) + '" class="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-cyan-700">Editar</button>' +
                  (protegido ? '' : '<button type="button" data-excluir-usuario="' + escapeHtml(usuario.id) + '" class="rounded-lg border border-rose-100 bg-white px-2 py-1 text-[10px] font-black text-rose-600">Excluir</button>') +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('') : '<p class="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Nenhum usuario encontrado.</p>') +
        '</div>' +
      '</div>'
    );
  }

  function opcoesPerfilHtml(valor, incluirGestor) {
    var perfis = [
      ['operador_simples', 'Operador Simples'],
      ['operador_completo', 'Operador Completo'],
      ['administrador', 'Administrador'],
    ];
    if (incluirGestor) perfis.push(['gestor_master', 'Gestor Master']);

    return perfis.map(function (perfil) {
      return '<option value="' + perfil[0] + '"' + (perfil[0] === valor ? ' selected' : '') + '>' + perfil[1] + '</option>';
    }).join('');
  }

  function botoesFluxoUsuarioHtml() {
    return (
      '<div class="grid gap-2">' +
        '<button id="abrir-criar-usuario-mobile" type="button" class="h-11 rounded-xl border px-4 text-xs font-black uppercase tracking-wide ' + (state.usuarioModo === 'criar' ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600') + '">Criar novo usuario</button>' +
        '<button id="abrir-usuario-existente-mobile" type="button" class="h-11 rounded-xl border px-4 text-xs font-black uppercase tracking-wide ' + (state.usuarioModo === 'existente' ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600') + '">Adicionar usuario existente</button>' +
      '</div>'
    );
  }

  function criarUsuarioHtml() {
    return (
      '<div class="grid gap-2 rounded-2xl bg-slate-50 p-3">' +
        '<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Criar novo usuario</p>' +
        '<input id="usuario-nome" placeholder="Nome" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base font-bold outline-none" />' +
        '<div class="grid gap-2">' +
          '<input id="usuario-login" placeholder="Login" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base font-bold outline-none" />' +
          '<input id="usuario-senha" type="password" placeholder="Senha" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base font-bold outline-none" />' +
        '</div>' +
        '<select id="usuario-perfil" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base font-bold outline-none"><option value="">Perfil</option>' + opcoesPerfilHtml('', false) + '</select>' +
        '<button id="criar-usuario-mobile" type="button" class="h-10 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Criar usuario') + '</button>' +
      '</div>'
    );
  }

  function usuarioExistenteHtml() {
    var usuario = state.usuarioExistenteResultado;

    return (
      '<div class="grid gap-2 rounded-2xl bg-slate-50 p-3">' +
        '<div>' +
          '<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Adicionar usuario existente</p>' +
          '<p class="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Informe o email ou login do usuario ja cadastrado.</p>' +
        '</div>' +
        '<input id="usuario-existente-termo" value="' + escapeHtml(state.usuarioExistenteTermo || '') + '" placeholder="Email ou login" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base font-bold outline-none" />' +
        '<button id="pesquisar-usuario-existente-mobile" type="button" class="h-10 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wide text-white">' + (state.pesquisandoUsuarioExistente ? 'Pesquisando...' : 'Pesquisar usuario') + '</button>' +
        '<button id="cancelar-usuario-existente-mobile" type="button" class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wide text-slate-600">Cancelar</button>' +
        (usuario
          ? '<div class="mt-2 grid gap-2 rounded-2xl border border-cyan-100 bg-white p-3">' +
              '<p class="text-[10px] font-black uppercase tracking-wide text-cyan-800">Usuario encontrado</p>' +
              '<div class="grid gap-1 text-xs font-semibold text-slate-600">' +
                '<p><span class="font-black text-slate-900">Email:</span><br>' + escapeHtml(usuario.email || '-') + '</p>' +
                '<p><span class="font-black text-slate-900">Login:</span><br>' + escapeHtml(usuario.login || '-') + '</p>' +
              '</div>' +
              '<label class="text-[10px] font-black uppercase tracking-wide text-slate-400">Perfil de acesso</label>' +
              '<select id="usuario-existente-perfil" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base font-bold outline-none">' + opcoesPerfilHtml(state.usuarioExistentePerfil || 'operador_simples', true) + '</select>' +
              '<button id="confirmar-vinculo-usuario-existente-mobile" type="button" class="h-10 rounded-xl bg-cyan-600 px-4 text-xs font-black uppercase tracking-wide text-white">' + (state.vinculandoUsuarioExistente ? 'Vinculando...' : 'Confirmar vinculo') + '</button>' +
              '<button id="limpar-usuario-existente-mobile" type="button" class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wide text-slate-600">Cancelar</button>' +
            '</div>'
          : '') +
      '</div>'
    );
  }

  function editarUsuarioHtml(usuario) {
    return (
      '<div class="grid gap-2 rounded-2xl bg-cyan-50 p-3">' +
        '<div class="flex items-center justify-between gap-2"><p class="text-[10px] font-black uppercase tracking-wide text-cyan-900">Editar usuario</p><button id="cancelar-edicao-usuario" type="button" class="text-[10px] font-black text-slate-500">Cancelar</button></div>' +
        '<input id="edit-usuario-nome" value="' + escapeHtml(usuario.nome || '') + '" placeholder="Nome" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none" />' +
        '<input id="edit-usuario-login" value="' + escapeHtml(usuario.login || usuario.email || '') + '" placeholder="Login ou email" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none" />' +
        '<select id="edit-usuario-perfil" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none">' + opcoesPerfilHtml(usuario.perfil || 'operador_simples', usuario.perfil === 'gestor_master' || (state.empresa && state.empresa.perfil === 'gestor_master')) + '</select>' +
        '<button id="salvar-usuario-mobile" type="button" class="h-10 rounded-xl bg-cyan-600 px-4 text-xs font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Salvar usuario') + '</button>' +
      '</div>'
    );
  }

  function trocarEmpresaHtml() {
    if (state.empresas.length <= 1) {
      return '<p class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">Seu usuario esta vinculado a apenas um perfil financeiro.</p>';
    }

    return (
      '<div class="grid gap-2">' +
        state.empresas.map(function (empresa) {
          var tipo = rotuloTipoPerfil(empresa.tipo_perfil);
          return '<button type="button" data-empresa-id="' + escapeHtml(empresa.id) + '" class="empresa-opcao rounded-2xl border border-slate-200 px-4 py-3 text-left ' + (state.empresa && empresa.id === state.empresa.id ? 'bg-cyan-50 text-cyan-800' : 'bg-white text-slate-800') + '"><span class="block text-sm font-black">' + escapeHtml(nomeEmpresa(empresa)) + '</span><span class="text-xs font-semibold text-slate-500">' + escapeHtml(tipo) + ' &middot; ' + escapeHtml(perfilFormatado(empresa.perfil)) + '</span></button>';
        }).join('') +
      '</div>'
    );
  }

  function seletorTipoPerfilHtml(idPrefix, valorAtual) {
    var tipos = ['empresa', 'pessoal'];
    return (
      '<div class="grid grid-cols-2 gap-2">' +
        tipos.map(function (tipo) {
          var ativo = normalizarTipoPerfil(valorAtual) === tipo;
          return '<button type="button" id="' + idPrefix + '-' + tipo + '" class="h-10 rounded-xl border text-xs font-black uppercase tracking-wide ' +
            (ativo ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-slate-200 bg-white text-slate-600') + '">' +
            rotuloTipoPerfil(tipo) + '</button>';
        }).join('') +
      '</div>'
    );
  }

  function gerenciarEmpresaHtml() {
    var gestorMaster = state.empresa && state.empresa.perfil === 'gestor_master';
    var podeEditar = podeGerenciarUsuarios();
    var podeTrocar = state.empresas.length > 1;
    var tipoAtual = normalizarTipoPerfil(state.empresa && state.empresa.tipo_perfil);
    var tipoEdicao = normalizarTipoPerfil(state.editEmpresaTipoPerfil);
    var tipoNovo = normalizarTipoPerfil(state.novaEmpresaTipoPerfil);
    var algumAberto = state.empresaEdicaoAberta || state.empresaCriarAberta || state.empresaExclusaoAberta;

    var cabecalho = (
      '<div class="rounded-2xl bg-slate-50 p-4">' +
        '<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Perfil atual</p>' +
        '<p class="mt-1 font-black">' + escapeHtml(nomeEmpresa(state.empresa)) + '</p>' +
        '<p class="mt-1 text-xs font-semibold text-slate-500">Tipo: ' + escapeHtml(rotuloTipoPerfil(tipoAtual)) + ' &middot; Acesso: ' + escapeHtml(perfilFormatado(state.empresa && state.empresa.perfil)) + '</p>' +
      '</div>'
    );

    // ── Vista: lista de ações (estado neutro) ──────────────────────────────
    if (!algumAberto) {
      return (
        '<div class="grid gap-3 text-sm">' +
          cabecalho +
          '<div class="grid gap-2">' +
            (podeEditar
              ? '<button id="abrir-edicao-empresa-mobile" type="button" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-800 transition active:scale-[0.99]">✏️  Editar dados</button>'
              : '') +
            '<button id="abrir-criar-empresa-mobile" type="button" class="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-black text-emerald-800 transition active:scale-[0.99]">＋  Criar novo perfil</button>' +
            '<button id="trocar-empresa-gerenciar" type="button" class="w-full rounded-xl border px-4 py-3 text-left text-sm font-black transition ' + (podeTrocar ? 'border-cyan-200 bg-cyan-50 text-cyan-800 active:scale-[0.99]' : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed') + '"' + (podeTrocar ? '' : ' disabled') + '>⇄  Trocar perfil</button>' +
            (gestorMaster
              ? '<button id="abrir-exclusao-empresa-mobile" type="button" class="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm font-black text-rose-700 transition active:scale-[0.99]">✕  Excluir perfil</button>'
              : '') +
          '</div>' +
          alertaHtml().replace('mt-4', '') +
        '</div>'
      );
    }

    // ── Vista: editar dados ────────────────────────────────────────────────
    if (state.empresaEdicaoAberta) {
      return (
        '<div class="grid gap-3 text-sm">' +
          cabecalho +
          '<div class="grid gap-2 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3">' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-cyan-800">Editar perfil atual</p>' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Tipo do perfil</p>' +
            seletorTipoPerfilHtml('edit-tipo', tipoEdicao) +
            '<input id="editar-empresa-nome" value="' + escapeHtml(state.editEmpresaNome) + '" placeholder="' + escapeHtml(rotuloNomePerfil(tipoEdicao)) + '" style="font-size:16px" class="h-11 rounded-md border border-cyan-100 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-cyan-500" />' +
            '<input id="editar-empresa-login" value="' + escapeHtml(state.editEmpresaLogin) + '" placeholder="Login ou email" style="font-size:16px" class="h-11 rounded-md border border-cyan-100 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-cyan-500" />' +
            '<input id="editar-empresa-senha" type="password" placeholder="Nova senha (opcional)" style="font-size:16px" class="h-11 rounded-md border border-cyan-100 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-cyan-500" />' +
            (gestorMaster ? '<p class="text-xs font-semibold leading-relaxed text-cyan-900">Para Gestor Master, a senha deve ser alterada pela recuperação de senha.</p>' : '') +
            '<div class="grid grid-cols-2 gap-2">' +
              '<button id="cancelar-edicao-empresa-mobile" type="button" class="h-10 rounded-xl bg-white border border-slate-200 px-3 text-xs font-black uppercase tracking-wide text-slate-600">Cancelar</button>' +
              '<button id="salvar-edicao-empresa-mobile" type="button" class="h-10 rounded-xl bg-cyan-700 px-3 text-xs font-black uppercase tracking-wide text-white">' + (state.empresaAcao === 'editar' ? 'Salvando...' : 'Salvar') + '</button>' +
            '</div>' +
          '</div>' +
          alertaHtml().replace('mt-4', '') +
        '</div>'
      );
    }

    // ── Vista: criar novo perfil ───────────────────────────────────────────
    if (state.empresaCriarAberta) {
      return (
        '<div class="grid gap-3 text-sm">' +
          cabecalho +
          '<div class="grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-emerald-800">Criar novo perfil</p>' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Tipo do perfil</p>' +
            seletorTipoPerfilHtml('novo-tipo', tipoNovo) +
            '<input id="nova-empresa-nome" placeholder="' + escapeHtml(rotuloNomePerfil(tipoNovo)) + '" style="font-size:16px" class="h-11 rounded-md border border-emerald-100 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-emerald-500" />' +
            '<div class="grid grid-cols-2 gap-2">' +
              '<button id="cancelar-criar-empresa-mobile" type="button" class="h-10 rounded-xl bg-white border border-slate-200 px-3 text-xs font-black uppercase tracking-wide text-slate-600">Cancelar</button>' +
              '<button id="criar-empresa-mobile" type="button" class="h-10 rounded-xl bg-emerald-600 px-3 text-xs font-black uppercase tracking-wide text-white">' + (state.empresaAcao === 'criar' ? 'Criando...' : 'Criar perfil') + '</button>' +
            '</div>' +
          '</div>' +
          alertaHtml().replace('mt-4', '') +
        '</div>'
      );
    }

    // ── Vista: excluir perfil ──────────────────────────────────────────────
    if (state.empresaExclusaoAberta) {
      return (
        '<div class="grid gap-3 text-sm">' +
          cabecalho +
          '<div class="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-rose-700">Excluir perfil atual</p>' +
            '<p class="mt-2 text-xs font-bold leading-relaxed text-rose-800">Esta ação remove o perfil e todos os seus dados. Para confirmar, digite exatamente o nome abaixo.</p>' +
            '<p class="mt-2 text-sm font-black text-rose-900">' + escapeHtml(nomeEmpresa(state.empresa)) + '</p>' +
            '<input id="excluir-empresa-confirmacao" placeholder="Digite o nome do perfil" style="font-size:16px" class="mt-3 h-11 w-full rounded-md border border-rose-100 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-rose-400" />' +
            '<div class="mt-3 grid gap-2">' +
              '<button id="excluir-empresa-mobile" type="button" class="h-11 w-full rounded-xl bg-rose-600 px-4 text-xs font-black uppercase tracking-wide text-white">' + (state.empresaAcao === 'excluir' ? 'Excluindo...' : 'Excluir definitivamente') + '</button>' +
              '<button id="cancelar-exclusao-empresa-mobile" type="button" class="h-10 w-full rounded-xl bg-white border border-slate-200 px-4 text-xs font-black uppercase tracking-wide text-slate-600">Cancelar</button>' +
            '</div>' +
          '</div>' +
          alertaHtml().replace('mt-4', '') +
        '</div>'
      );
    }

    return '<div class="text-sm text-slate-500 p-4">Carregando...</div>';
  }

  function organizarDashboardHtml() {
    var ordem = normalizarOrdemDashboard(state.dashboardOrdem);

    return (
      '<div class="grid gap-2">' +
        '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold leading-relaxed text-cyan-900">Use as setas ou segure o puxador do card no dashboard para reposicionar. A ordem fica salva neste celular.</p>' +
        ordem.map(function (id, index) {
          return '<div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">' +
            '<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-500">' + (index + 1) + '</span>' +
            '<span class="min-w-0 flex-1 truncate text-xs font-black text-slate-800">' + escapeHtml(tituloCardDashboard(id)) + '</span>' +
            '<button type="button" data-dashboard-move="' + escapeHtml(id) + '" data-dashboard-dir="-1" class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-700" aria-label="Subir">&uarr;</button>' +
            '<button type="button" data-dashboard-move="' + escapeHtml(id) + '" data-dashboard-dir="1" class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-700" aria-label="Descer">&darr;</button>' +
          '</div>';
        }).join('') +
        '<button id="reset-dashboard" type="button" class="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wide text-slate-700">Restaurar ordem padr&atilde;o</button>' +
      '</div>'
    );
  }

  function configurarResumoHtml() {
    var ordem = normalizarOrdemDashboard(state.dashboardOrdem);
    var ocultos = normalizarOcultosDashboard(state.dashboardOcultos);

    return (
      '<div class="grid gap-2">' +
        '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-cyan-900">Escolha quais cards aparecem no dashboard. A ordem continua no modo Organizar dashboard.</p>' +
        '<div class="grid gap-1.5">' +
          ordem.map(function (id) {
            var visivel = ocultos.indexOf(id) < 0;
            return '<button type="button" data-dashboard-toggle="' + escapeHtml(id) + '" class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left">' +
              '<div class="min-w-0 flex-1"><p class="truncate text-xs font-black text-slate-900">' + escapeHtml(tituloCardDashboard(id)) + '</p><p class="mt-0.5 text-[10px] font-semibold ' + (visivel ? 'text-emerald-600' : 'text-rose-600') + '">' + (visivel ? 'Ativado' : 'Desativado') + '</p></div>' +
              '<span class="relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ' + (visivel ? 'bg-emerald-500' : 'bg-rose-500') + '">' +
                '<span class="block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ' + (visivel ? 'translate-x-5' : 'translate-x-0') + '"></span>' +
              '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<button id="reset-resumo-dashboard" type="button" class="mt-1 h-10 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wide text-white">Restaurar padr&atilde;o inicial</button>' +
      '</div>'
    );
  }

  function alternarCardResumo(id) {
    var ocultos = normalizarOcultosDashboard(state.dashboardOcultos);
    var index = ocultos.indexOf(id);
    if (index >= 0) {
      ocultos.splice(index, 1);
    } else {
      ocultos.push(id);
    }
    state.dashboardOcultos = ocultos;
    salvarResumoDashboard();
    render();
  }

  function restaurarResumoPadrao() {
    state.dashboardOrdem = ordemDashboardPadrao();
    state.dashboardOcultos = [];
    salvarResumoDashboard();
    render();
    mostrarToast('Resumo padrao restaurado.');
  }

  function moverCardDashboard(id, direcao) {
    var ordem = normalizarOrdemDashboard(state.dashboardOrdem);
    var index = ordem.indexOf(id);
    var destino = index + direcao;

    if (index < 0 || destino < 0 || destino >= ordem.length) return;

    var item = ordem.splice(index, 1)[0];
    ordem.splice(destino, 0, item);
    state.dashboardOrdem = ordem;
    salvarResumoDashboard();
    render();
  }

  function moverCardDashboardPara(idOrigem, idDestino, depois) {
    var ordem = normalizarOrdemDashboard(state.dashboardOrdem);
    var origem = ordem.indexOf(idOrigem);
    var destinoOriginal = ordem.indexOf(idDestino);

    if (origem < 0 || destinoOriginal < 0 || origem === destinoOriginal) {
      state.dragDashboardId = '';
      render();
      return;
    }

    var item = ordem.splice(origem, 1)[0];
    var destino = ordem.indexOf(idDestino);
    if (destino < 0) destino = ordem.length;
    ordem.splice(depois ? destino + 1 : destino, 0, item);
    state.dashboardOrdem = ordem;
    state.dragDashboardId = '';
    salvarResumoDashboard();
    render();
  }

  // ── Despesas Fixas Mobile ──────────────────────────────────────────────

  function formatarValorRecorrMobile(str) {
    var digits = str.replace(/\D/g, '');
    if (!digits) return '';
    var cents = parseInt(digits, 10);
    var val = cents / 100;
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function abrirModalMenuDespesasFixas() {
    abrirModalMenu('despesasFixas');
    await carregarRecorrencias();
  }

  async function carregarRecorrencias() {
    if (!state.empresa) return;
    var empresaId = state.empresa.id || state.empresa.empresa_id;
    var resp = await db.from('recorrencias').select('*').eq('empresa_id', empresaId).order('dia', { ascending: true });
    if (!resp.error && resp.data) {
      state.recorrencias = resp.data;
      render();
    }
  }

  async function salvarNovaRecorrenciaMobile() {
    var nome = (document.getElementById('nova-recorr-nome') || {}).value || '';
    var dia = parseInt((document.getElementById('nova-recorr-dia') || {}).value || '0', 10);
    var descricao = (document.getElementById('nova-recorr-descricao') || {}).value || '';
    if (!nome || !dia || dia < 1 || dia > 31) {
      state.erro = 'Preencha a despesa e o dia (1-31).';
      render();
      return;
    }
    var empresaId = state.empresa.id || state.empresa.empresa_id;
    // find categoria from despesas list
    var despesaObj = (state.despesas || []).find(function(d) { return d.nome === nome; });
    var categoria = despesaObj ? (despesaObj.categoria || '') : '';
    state.recorrSalvando = true;
    state.erro = '';
    render();
    var resp = await db.from('recorrencias').insert({
      empresa_id: empresaId,
      nome: nome,
      categoria: categoria,
      descricao: descricao,
      dia: dia,
      ativo: true,
    }).select().single();
    if (resp.error) {
      state.erro = 'Erro ao salvar: ' + resp.error.message;
      state.recorrSalvando = false;
      render();
      return;
    }
    // if lancar agora checked and valor > 0, insert lancamento
    var lancarAgora = document.getElementById('nova-recorr-lancar-agora') && document.getElementById('nova-recorr-lancar-agora').checked;
    var valorNum = state.novaRecorrValorNumerico;
    if (lancarAgora && valorNum > 0) {
      var hoje = new Date();
      var anoAtual = String(hoje.getFullYear());
      var mesAtual = meses[hoje.getMonth()];
      await db.from('lancamentos').insert({
        empresa_id: empresaId,
        nome: nome,
        categoria: categoria,
        descricao: descricao,
        valor: valorNum,
        dia: dia,
        mes: mesAtual,
        ano: anoAtual,
        tipo: 'saida',
      });
    }
    state.recorrencias = [resp.data].concat(state.recorrencias || []);
    state.recorrSalvando = false;
    state.novaRecorrNome = '';
    state.novaRecorrDia = '';
    state.novaRecorrDescricao = '';
    state.novaRecorrValor = '';
    state.novaRecorrValorNumerico = 0;
    state.novaRecorrLancarAgora = false;
    state.mensagem = 'Despesa fixa adicionada!';
    render();
    setTimeout(function() { state.mensagem = ''; render(); }, 2000);
  }

  async function toggleRecorrenciaAtivoMobile(id, ativoAtual) {
    var novoAtivo = !ativoAtual;
    var resp = await db.from('recorrencias').update({ ativo: novoAtivo }).eq('id', id);
    if (!resp.error) {
      state.recorrencias = state.recorrencias.map(function(r) {
        return r.id === id ? Object.assign({}, r, { ativo: novoAtivo }) : r;
      });
      render();
    }
  }

  async function salvarEdicaoRecorrenciaMobile(id) {
    var nome = (document.getElementById('edit-recorr-nome-' + id) || {}).value || '';
    var dia = parseInt((document.getElementById('edit-recorr-dia-' + id) || {}).value || '0', 10);
    var descricao = (document.getElementById('edit-recorr-desc-' + id) || {}).value || '';
    if (!nome || !dia || dia < 1 || dia > 31) {
      state.erro = 'Preencha a despesa e o dia.';
      render();
      return;
    }
    var despesaObj = (state.despesas || []).find(function(d) { return d.nome === nome; });
    var categoria = despesaObj ? (despesaObj.categoria || '') : '';
    var resp = await db.from('recorrencias').update({ nome: nome, categoria: categoria, descricao: descricao, dia: dia }).eq('id', id).select().single();
    if (resp.error) {
      state.erro = 'Erro: ' + resp.error.message;
      render();
      return;
    }
    // lancar agora
    var lancarAgora = document.getElementById('edit-recorr-lancar-' + id) && document.getElementById('edit-recorr-lancar-' + id).checked;
    var valorNum = state.editRecorrValorNumerico;
    if (lancarAgora && valorNum > 0) {
      var hoje = new Date();
      var empresaId = state.empresa.id || state.empresa.empresa_id;
      await db.from('lancamentos').insert({
        empresa_id: empresaId,
        nome: nome,
        categoria: categoria,
        descricao: descricao,
        valor: valorNum,
        dia: dia,
        mes: meses[hoje.getMonth()],
        ano: String(hoje.getFullYear()),
        tipo: 'saida',
      });
    }
    state.recorrencias = state.recorrencias.map(function(r) {
      return r.id === id ? resp.data : r;
    });
    state.recorrEditandoId = null;
    state.editRecorrValorNumerico = 0;
    state.mensagem = 'Salvo!';
    render();
    setTimeout(function() { state.mensagem = ''; render(); }, 1500);
  }

  async function excluirRecorrenciaMobile(id, nome) {
    if (!window.confirm('Excluir a despesa fixa "' + nome + '"?')) return;
    var resp = await db.from('recorrencias').delete().eq('id', id);
    if (!resp.error) {
      state.recorrencias = state.recorrencias.filter(function(r) { return r.id !== id; });
      if (state.recorrEditandoId === id) state.recorrEditandoId = null;
      render();
    }
  }

  function despesasFixasMenuHtml() {
    var mesesNomes = { Jan: 'Janeiro', Fev: 'Fevereiro', Mar: 'Março', Abr: 'Abril', Mai: 'Maio', Jun: 'Junho', Jul: 'Julho', Ago: 'Agosto', Set: 'Setembro', Out: 'Outubro', Nov: 'Novembro', Dez: 'Dezembro' };
    var mesLabel = mesesNomes[state.mes] || state.mes;

    var despesaOptions = '<option value="">Selecione a despesa</option>' +
      (state.despesas || []).map(function(d) {
        return '<option value="' + escapeHtml(d.nome) + '">' + escapeHtml(d.nome) + '</option>';
      }).join('');

    var msgHtml = state.mensagem ? '<p class="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">' + escapeHtml(state.mensagem) + '</p>' : '';
    var erroHtml = state.erro ? '<p class="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700">' + escapeHtml(state.erro) + '</p>' : '';

    var listaHtml = (state.recorrencias || []).map(function(r) {
      var id = String(r.id);
      var editando = state.recorrEditandoId === id;
      var despOpts = (state.despesas || []).map(function(d) {
        return '<option value="' + escapeHtml(d.nome) + '"' + (d.nome === r.nome ? ' selected' : '') + '>' + escapeHtml(d.nome) + '</option>';
      }).join('');

      if (editando) {
        return '<div class="rounded-xl border border-cyan-200 bg-cyan-50 p-3 grid gap-2">' +
          '<div class="grid grid-cols-[64px_1fr] gap-2">' +
            '<input id="edit-recorr-dia-' + id + '" type="number" min="1" max="31" value="' + escapeHtml(String(r.dia)) + '" style="font-size:16px" class="h-10 rounded-md border border-cyan-200 bg-white px-2 text-center text-base font-bold text-slate-900 outline-none" placeholder="Dia" />' +
            '<select id="edit-recorr-nome-' + id + '" style="font-size:16px" class="h-10 rounded-md border border-cyan-200 bg-white px-2 text-base font-bold text-slate-900 outline-none">' +
              '<option value="">Selecione</option>' + despOpts +
            '</select>' +
          '</div>' +
          '<input id="edit-recorr-desc-' + id + '" value="' + escapeHtml(r.descricao || '') + '" placeholder="Descrição (opcional)" style="font-size:16px" class="h-10 rounded-md border border-cyan-200 bg-white px-3 text-base font-bold text-slate-900 outline-none" />' +
          '<div class="flex items-center gap-2">' +
            '<label class="flex flex-1 items-center gap-2 rounded-lg border border-cyan-200 bg-white px-3 h-10 min-w-0">' +
              '<input id="edit-recorr-lancar-' + id + '" type="checkbox" class="h-4 w-4 shrink-0" />' +
              '<span class="text-[10px] font-black text-slate-600 truncate">Incluir em ' + mesLabel + '</span>' +
            '</label>' +
            '<input id="edit-recorr-valor-' + id + '" type="text" inputmode="numeric" placeholder="0,00" value="' + escapeHtml(state.editRecorrValor || '') + '" class="h-10 w-24 shrink-0 rounded-md border border-cyan-200 bg-white px-2 text-right text-base font-bold text-slate-900 outline-none" />' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-1.5">' +
            '<button type="button" data-recorr-cancelar-edicao="' + id + '" class="h-9 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-600">Cancelar</button>' +
            '<button type="button" data-recorr-salvar-edicao="' + id + '" class="h-9 rounded-lg bg-slate-950 text-[10px] font-black uppercase text-white">Salvar</button>' +
          '</div>' +
        '</div>';
      }

      var nomeExib = r.descricao || r.nome;
      var ativoClass = r.ativo ? 'bg-emerald-500' : 'bg-slate-300';
      var ativoTranslate = r.ativo ? 'translate-x-4' : 'translate-x-0';

      return '<div class="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2">' +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-xs font-black text-slate-900 truncate">' + escapeHtml(nomeExib) + '</p>' +
          '<p class="text-[10px] font-semibold text-slate-500">Dia ' + escapeHtml(String(r.dia)) + (r.descricao && r.nome !== r.descricao ? ' · ' + escapeHtml(r.nome) : '') + '</p>' +
        '</div>' +
        '<button type="button" data-recorr-toggle="' + id + '" data-recorr-ativo="' + (r.ativo ? '1' : '0') + '" class="relative h-6 w-10 shrink-0 rounded-full p-0.5 ' + ativoClass + '">' +
          '<span class="block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ' + ativoTranslate + '"></span>' +
        '</button>' +
        '<button type="button" data-recorr-editar="' + id + '" class="shrink-0 rounded-lg bg-cyan-600 px-2 py-1 text-[10px] font-black uppercase text-white">Editar</button>' +
        '<button type="button" data-recorr-excluir="' + id + '" data-recorr-excluir-nome="' + escapeHtml(r.nome) + '" class="shrink-0 rounded-lg border border-rose-100 bg-white px-2 py-1 text-[10px] font-black uppercase text-rose-600">&#215;</button>' +
      '</div>';
    }).join('');

    return (
      '<div class="grid gap-3">' +
        msgHtml +
        erroHtml +
        '<div class="rounded-xl border border-slate-200 bg-slate-50 p-3 grid gap-2">' +
          '<p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Nova despesa fixa</p>' +
          '<div class="grid grid-cols-[64px_1fr] gap-2">' +
            '<input id="nova-recorr-dia" type="number" min="1" max="31" placeholder="Dia" value="' + escapeHtml(state.novaRecorrDia) + '" style="font-size:16px" class="h-11 rounded-md border border-slate-300 bg-white px-2 text-center text-base font-bold text-slate-900 outline-none focus:border-cyan-500" />' +
            '<select id="nova-recorr-nome" style="font-size:16px" class="h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-cyan-500">' +
              despesaOptions +
            '</select>' +
          '</div>' +
          '<input id="nova-recorr-descricao" placeholder="Descrição (opcional)" value="' + escapeHtml(state.novaRecorrDescricao) + '" style="font-size:16px" class="h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-cyan-500" />' +
          '<div class="flex items-center gap-2">' +
            '<label class="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-11 min-w-0">' +
              '<input id="nova-recorr-lancar-agora" type="checkbox"' + (state.novaRecorrLancarAgora ? ' checked' : '') + ' class="h-4 w-4 shrink-0" />' +
              '<span class="text-[10px] font-black text-slate-600 truncate">Incluir em ' + mesLabel + '</span>' +
            '</label>' +
            '<input id="nova-recorr-valor" type="text" inputmode="numeric" placeholder="0,00" value="' + escapeHtml(state.novaRecorrValor) + '" class="h-11 w-24 shrink-0 rounded-md border border-slate-300 bg-white px-2 text-right text-base font-bold text-slate-900 outline-none focus:border-cyan-500" />' +
          '</div>' +
          '<button id="salvar-nova-recorrencia" type="button" class="h-11 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase text-white">' + (state.recorrSalvando ? 'Salvando...' : '+ Adicionar') + '</button>' +
        '</div>' +
        (state.recorrencias && state.recorrencias.length > 0
          ? '<div class="grid gap-1.5">' + listaHtml + '</div>'
          : '<p class="text-center text-[11px] font-semibold text-slate-400 py-2">Nenhuma despesa fixa cadastrada</p>') +
      '</div>'
    );
  }

  function categoriasMenuHtml() {
    return (
      '<div class="grid gap-2">' +
        '<label class="grid gap-1 text-[10px] font-black uppercase tracking-wide text-slate-600">Tipo de despesa' +
          '<input id="categoria-nome" placeholder="Ex: Energia" style="font-size:16px" class="h-10 rounded-md border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal text-slate-900 outline-none focus:border-cyan-500" />' +
        '</label>' +
        '<label class="grid gap-1 text-[10px] font-black uppercase tracking-wide text-slate-600">Categoria' +
          '<select id="categoria-tipo" style="font-size:16px" class="h-10 rounded-md border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal text-slate-900 outline-none focus:border-cyan-500">' +
            '<option value="">Selecione</option>' +
            categoriasPadrao().map(function (categoria) {
              return '<option value="' + escapeHtml(categoria) + '">' + escapeHtml(categoria) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
        alertaHtml().replace('mt-4', '') +
        '<button id="salvar-categoria" type="button" class="h-10 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Cadastrar despesa') + '</button>' +
        '<div id="categorias-lista-scroll" data-preserve-scroll class="mt-1 max-h-[42vh] overflow-y-auto rounded-xl border border-slate-100 p-1 grid gap-1.5">' +
          state.despesas.map(function (despesa) {
            return categoriaLinhaHtml(despesa);
          }).join('') +
        '</div>' +
      '</div>'
    );
  }

  function categoriaLinhaHtml(despesa) {
    var id = String(despesa.id || '');
    var acoesAberta = state.categoriaAcoesId === id;
    var editando = state.categoriaEditandoId === id;

    if (editando) {
      return (
        '<div class="grid gap-2 rounded-xl bg-cyan-50 p-2 text-[11px]">' +
          '<input id="edit-categoria-nome-' + escapeHtml(id) + '" value="' + escapeHtml(despesa.nome) + '" style="font-size:16px" class="h-10 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold text-slate-900 outline-none" />' +
          '<select id="edit-categoria-tipo-' + escapeHtml(id) + '" style="font-size:16px" class="h-10 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold text-slate-900 outline-none">' +
            categoriasPadrao().map(function (categoria) {
              return '<option value="' + escapeHtml(categoria) + '"' + (categoria === despesa.categoria ? ' selected' : '') + '>' + escapeHtml(categoria) + '</option>';
            }).join('') +
          '</select>' +
          '<div class="grid grid-cols-3 gap-1.5">' +
            '<button type="button" data-categoria-cancelar="' + escapeHtml(id) + '" class="h-9 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-600">Cancelar</button>' +
            '<button type="button" data-categoria-excluir="' + escapeHtml(id) + '" class="h-9 rounded-lg border border-rose-100 bg-white text-[10px] font-black uppercase text-rose-600">Excluir</button>' +
            '<button type="button" data-categoria-salvar="' + escapeHtml(id) + '" class="h-9 rounded-lg bg-slate-950 text-[10px] font-black uppercase text-white">' + (state.carregando ? 'Salvando' : 'Salvar') + '</button>' +
          '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="relative h-10 overflow-hidden rounded-lg bg-slate-50 ' + (acoesAberta ? 'ring-2 ring-cyan-400/60 shadow-sm shadow-cyan-100' : '') + '">' +
        '<div class="absolute inset-y-0 right-0 grid w-[192px] grid-cols-3 items-center gap-1 pr-1" style="height:40px;">' +
          '<button type="button" data-categoria-editar="' + escapeHtml(id) + '" class="rounded bg-cyan-600 px-1 font-black uppercase text-white" style="box-sizing:border-box;display:flex;height:22px;align-items:center;justify-content:center;font-size:7.5px;line-height:1;">Editar</button>' +
          '<button type="button" data-categoria-excluir="' + escapeHtml(id) + '" class="rounded border border-rose-100 bg-white px-1 font-black uppercase text-rose-600" style="box-sizing:border-box;display:flex;height:22px;align-items:center;justify-content:center;font-size:7.5px;line-height:1;">Excluir</button>' +
          '<button type="button" data-categoria-cancelar="' + escapeHtml(id) + '" class="rounded border border-slate-200 bg-white px-1 font-black uppercase text-slate-500" style="box-sizing:border-box;display:flex;height:22px;align-items:center;justify-content:center;font-size:7.5px;line-height:1;">Cancelar</button>' +
        '</div>' +
        '<button type="button" data-categoria-opcoes="' + escapeHtml(id) + '" class="relative z-10 flex h-10 w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 text-left text-[11px] text-slate-800 transition-transform duration-200 ease-out" style="transform:' + (acoesAberta ? 'translateX(-192px)' : 'translateX(0)') + '">' +
          '<span class="flex h-full min-w-0 items-center truncate font-bold">' + escapeHtml(despesa.nome) + '</span>' +
          '<span class="flex h-full max-w-[150px] shrink-0 items-center truncate font-semibold text-slate-500">' + escapeHtml(acoesAberta ? despesa.nome : despesa.categoria) + '</span>' +
        '</button>' +
      '</div>'
    );
  }

  function ajudaCategoriasHtml() {
    var tipoPerfil = normalizarTipoPerfil(state.empresa && state.empresa.tipo_perfil);
    var categorias = categoriasDoPerfil(tipoPerfil);
    var rodape = tipoPerfil === 'pessoal'
      ? 'Estes exemplos ajudam a organizar suas financas pessoais.'
      : 'Na duvida, consulte o contador. Estes exemplos ajudam a organizar.';

    return (
      '<div class="grid gap-1.5 text-[11px] leading-snug text-slate-600">' +
        categorias.map(function (item) {
          return '<div class="rounded-xl bg-slate-50 px-3 py-2"><strong class="block text-[10px] font-black uppercase tracking-wide text-slate-900">' + escapeHtml(item.nome.toUpperCase()) + '</strong><p class="mt-0.5">' + escapeHtml(item.descricao) + ' <span class="font-semibold text-slate-500">Ex.: ' + escapeHtml(item.exemplos) + '</span></p></div>';
        }).join('') +
        '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-[10px] font-semibold text-cyan-900">' + rodape + '</p>' +
      '</div>'
    );
  }

  function instalarIosHtml() {
    return '<div class="space-y-3 text-sm leading-relaxed text-slate-600"><p>No iPhone, toque no botao de compartilhar do navegador.</p><p>Depois escolha <strong>Adicionar a Tela de Inicio</strong>.</p><p>Confirme o nome AvantaLab Gestao para abrir como aplicativo.</p><p class="text-xs font-semibold text-slate-500">Se essa opcao nao aparecer, procure no menu do navegador por compartilhar ou adicionar a tela inicial.</p></div>';
  }

  function instalarAndroidHtml() {
    return '<div class="space-y-3 text-sm leading-relaxed text-slate-600"><p>Quando o navegador permitir, use a opcao <strong>Instalar app</strong> ou <strong>Adicionar a tela inicial</strong>.</p><p>Se nao aparecer agora, abra o menu do navegador e procure por <strong>Instalar app</strong> ou <strong>Adicionar a tela inicial</strong>.</p></div>';
  }

  function termosMobileHtml() {
    return (
      '<div class="space-y-4 text-sm leading-relaxed text-slate-600">' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">1. Aceita&ccedil;&atilde;o dos termos</h3><p>Ao acessar e utilizar o AvantaLab Gest&atilde;o, o usu&aacute;rio declara estar ciente e de acordo com estes Termos de Uso. Caso n&atilde;o concorde com qualquer condi&ccedil;&atilde;o aqui apresentada, recomenda-se n&atilde;o utilizar o sistema.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">2. Finalidade do sistema</h3><p>O AvantaLab Gest&atilde;o &eacute; uma ferramenta destinada ao apoio na organiza&ccedil;&atilde;o, controle e an&aacute;lise de informa&ccedil;&otilde;es financeiras e administrativas, incluindo lan&ccedil;amentos, faturamentos, despesas, relat&oacute;rios e indicadores gerenciais.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">3. Responsabilidade pelas informa&ccedil;&otilde;es</h3><p>O usu&aacute;rio &eacute; respons&aacute;vel pela veracidade, atualiza&ccedil;&atilde;o e confer&ecirc;ncia dos dados inseridos no sistema. As informa&ccedil;&otilde;es apresentadas nos relat&oacute;rios dependem diretamente dos dados cadastrados pelo pr&oacute;prio usu&aacute;rio.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">4. Uso adequado</h3><p>O usu&aacute;rio compromete-se a utilizar o sistema de forma l&iacute;cita, &eacute;tica e adequada, n&atilde;o realizando a&ccedil;&otilde;es que possam comprometer a seguran&ccedil;a, estabilidade, funcionamento ou integridade da plataforma.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">5. Disponibilidade do sistema</h3><p>Embora sejam adotados esfor&ccedil;os para manter o sistema dispon&iacute;vel e funcional, podem ocorrer interrup&ccedil;&otilde;es tempor&aacute;rias por manuten&ccedil;&atilde;o, atualiza&ccedil;&otilde;es, falhas t&eacute;cnicas, instabilidades de servi&ccedil;os externos ou outros fatores operacionais.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">6. Limita&ccedil;&atilde;o de responsabilidade</h3><p>O AvantaLab Gest&atilde;o &eacute; uma ferramenta de apoio gerencial. As decis&otilde;es tomadas com base nas informa&ccedil;&otilde;es exibidas no sistema s&atilde;o de responsabilidade exclusiva do usu&aacute;rio.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">7. Altera&ccedil;&otilde;es nos termos</h3><p>Estes Termos de Uso poder&atilde;o ser atualizados periodicamente para refletir melhorias, mudan&ccedil;as operacionais, legais ou funcionais do sistema.</p></section>' +
      '</div>'
    );
  }

  function privacidadeMobileHtml() {
    return (
      '<div class="space-y-4 text-sm leading-relaxed text-slate-600">' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">1. Objetivo desta pol&iacute;tica</h3><p>Esta Pol&iacute;tica de Privacidade tem como objetivo explicar, de forma clara e transparente, como o AvantaLab Gest&atilde;o pode coletar, utilizar, armazenar e proteger informa&ccedil;&otilde;es fornecidas pelos usu&aacute;rios durante o uso do sistema.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">2. Informa&ccedil;&otilde;es coletadas</h3><p>O sistema pode coletar informa&ccedil;&otilde;es necess&aacute;rias para cadastro, autentica&ccedil;&atilde;o e funcionamento da plataforma, como nome, email, perfil financeiro vinculado, prefer&ecirc;ncias de configura&ccedil;&atilde;o, al&eacute;m dos dados financeiros e administrativos inseridos voluntariamente pelo usu&aacute;rio.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">3. Uso das informa&ccedil;&otilde;es</h3><p>As informa&ccedil;&otilde;es s&atilde;o utilizadas para permitir o acesso ao sistema, salvar configura&ccedil;&otilde;es, organizar lan&ccedil;amentos, gerar relat&oacute;rios, exibir indicadores, manter a seguran&ccedil;a da conta e melhorar a experi&ecirc;ncia de uso da plataforma.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">4. Armazenamento dos dados</h3><p>Os dados do sistema s&atilde;o armazenados em ambiente digital seguro, utilizando servi&ccedil;os de banco de dados e autentica&ccedil;&atilde;o. O acesso &agrave;s informa&ccedil;&otilde;es &eacute; controlado conforme o v&iacute;nculo do usu&aacute;rio com sua respectivo perfil financeiro.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">5. Cookies e tecnologias semelhantes</h3><p>O AvantaLab Gest&atilde;o pode utilizar cookies, armazenamento local ou tecnologias semelhantes necess&aacute;rios ao funcionamento da plataforma, como autentica&ccedil;&atilde;o, seguran&ccedil;a, manuten&ccedil;&atilde;o da sess&atilde;o, prefer&ecirc;ncias de uso e configura&ccedil;&otilde;es do sistema. Caso sejam utilizados cookies n&atilde;o essenciais, como ferramentas de an&aacute;lise, marketing ou rastreamento, o usu&aacute;rio ser&aacute; informado e poder&aacute; gerenciar suas prefer&ecirc;ncias quando aplic&aacute;vel.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">6. Compartilhamento de informa&ccedil;&otilde;es</h3><p>O AvantaLab Gest&atilde;o n&atilde;o vende informa&ccedil;&otilde;es dos usu&aacute;rios. Os dados poder&atilde;o ser compartilhados apenas quando necess&aacute;rio para o funcionamento t&eacute;cnico da plataforma, cumprimento de obriga&ccedil;&otilde;es legais ou mediante solicita&ccedil;&atilde;o ou autoriza&ccedil;&atilde;o do pr&oacute;prio usu&aacute;rio.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">7. Seguran&ccedil;a</h3><p>S&atilde;o adotadas medidas t&eacute;cnicas e organizacionais para proteger as informa&ccedil;&otilde;es contra acessos n&atilde;o autorizados, perda, altera&ccedil;&atilde;o, divulga&ccedil;&atilde;o indevida ou uso inadequado. Ainda assim, nenhum sistema digital &eacute; totalmente imune a riscos.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">8. Responsabilidade do usu&aacute;rio</h3><p>O usu&aacute;rio &eacute; respons&aacute;vel por manter seus dados de acesso em seguran&ccedil;a, utilizar senhas fortes, n&atilde;o compartilhar credenciais e conferir as informa&ccedil;&otilde;es inseridas no sistema.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">9. Direitos do usu&aacute;rio</h3><p>O usu&aacute;rio poder&aacute; solicitar informa&ccedil;&otilde;es sobre seus dados, corre&ccedil;&otilde;es, atualiza&ccedil;&otilde;es ou exclus&atilde;o, quando aplic&aacute;vel, respeitadas as obriga&ccedil;&otilde;es legais, fiscais, contratuais e operacionais relacionadas ao uso da plataforma.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">10. Altera&ccedil;&otilde;es nesta pol&iacute;tica</h3><p>Esta Pol&iacute;tica de Privacidade poder&aacute; ser atualizada periodicamente para refletir melhorias no sistema, mudan&ccedil;as operacionais, requisitos legais ou novas funcionalidades.</p></section>' +
      '</div>'
    );
  }

  function vincularAcoesLancamentosLista() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lancamento-id]'), function (botao) {
      botao.addEventListener('click', function () {
        abrirAcaoLancamento(botao.getAttribute('data-tipo-lancamento'), botao.getAttribute('data-lancamento-id'));
      });
    });
  }

  function atualizarBuscaListaMobile() {
    var termo = String(state.busca || '').toLowerCase();
    var visiveis = 0;

    Array.prototype.forEach.call(document.querySelectorAll('[data-busca-lancamento]'), function (item) {
      var texto = item.getAttribute('data-busca-lancamento') || '';
      var corresponde = !termo || texto.indexOf(termo) >= 0;
      item.style.display = corresponde ? '' : 'none';
      if (corresponde) visiveis += 1;
    });

    var limpar = document.getElementById('limpar-busca-lista');
    if (limpar) {
      limpar.style.display = state.busca ? 'flex' : 'none';
    }

    var vazio = document.getElementById('lista-detalhada-vazia');
    if (vazio) {
      vazio.style.display = visiveis > 0 ? 'none' : 'block';
    }
  }

  function atualizarBuscaUltimasMobile(tipo) {
    var chave = tipo === 'receitas' ? 'ultimasReceitasBusca' : 'ultimasDespesasBusca';
    var seletor = tipo === 'receitas' ? '[data-busca-ultimas-receitas]' : '[data-busca-ultimas-despesas]';
    var vazioId = tipo === 'receitas' ? 'ultimas-receitas-vazia' : 'ultimas-despesas-vazia';
    var termo = textoBusca(state[chave]);
    var visiveis = 0;

    Array.prototype.forEach.call(document.querySelectorAll(seletor), function (item) {
      var texto = item.getAttribute(tipo === 'receitas' ? 'data-busca-ultimas-receitas' : 'data-busca-ultimas-despesas') || '';
      var corresponde = !termo || texto.indexOf(termo) >= 0;
      item.style.display = corresponde ? '' : 'none';
      if (corresponde) visiveis += 1;
    });

    var vazio = document.getElementById(vazioId);
    if (vazio) {
      vazio.style.display = visiveis > 0 ? 'none' : 'block';
    }
  }

  function render() {
    // Captura o scroll real do usuario ANTES de reconstruir o innerHTML.
    // Se o body ja estiver travado, scrollY vale 0, entao usa o valor salvo.
    var _scrollPrevio = window._avaBodyLocked
      ? (window._avaScrollY || 0)
      : (window.scrollY || document.documentElement.scrollTop || 0);
    // Salva o scrollTop de containers internos rolaveis (ex.: lista do
    // cadastro de despesas dentro do modal) ANTES de reconstruir o DOM,
    // para restaurar logo apos e a lista nao voltar ao topo ao editar.
    var _scrollContainers = {};
    var _preservaveis = document.querySelectorAll('[data-preserve-scroll]');
    for (var _i = 0; _i < _preservaveis.length; _i++) {
      if (_preservaveis[_i].id) {
        _scrollContainers[_preservaveis[_i].id] = _preservaveis[_i].scrollTop;
      }
    }
    root.setAttribute('data-avantalab-mobile-ready', '1');
    if (!state.chatIAAberto) configurarCamadaFundoChatIA(false);
    removerChatIAOverlay();
    var telaAtual = !state.pronto
      ? telaCarregandoMobile()
      : (state.autenticado
        ? (ehFuncionarioPontoMobile() ? telaPonto() : (state.validacaoTelefoneObrigatoria ? telaTelefoneObrigatorioMobile() : (state.modoCriarPerfil ? telaLoginWrapper(telaCriarPerfilInicial(), 'Criar perfil financeiro', 'Informe os dados do seu primeiro perfil.') : telaApp())))
        : (state.modoCriarPerfil ? telaLoginWrapper(telaCriarPerfilInicial(), 'Criar perfil financeiro', 'Informe os dados do seu primeiro perfil.') : telaLogin()));
    root.innerHTML = telaAtual + (state.chatIAAberto ? chatIAModalHtml() : '') + (state.mostrarPromptNotificacoes ? promptNotificacoesHtml() : '') + (state.tourAberto ? tourHtml() : '');
    atualizarScrollBloqueado(_scrollPrevio);
    // Restaura o scrollTop dos containers internos preservados.
    for (var _id in _scrollContainers) {
      var _alvo = document.getElementById(_id);
      if (_alvo) _alvo.scrollTop = _scrollContainers[_id];
    }

    if (state.chatIAAberto) {
      var ov = document.getElementById('chat-ia-overlay');
      if (ov) configurarCamadaFundoChatIA(true);
      if (ov && window.visualViewport) {
        if (!window._avaVVbound) {
          window._avaVVbound = true;
          window.visualViewport.addEventListener('resize', _avaPinViewport);
          window.visualViewport.addEventListener('scroll', _avaPinViewport);
        }
        _avaPinViewport();
      }
    }

    bind('confirmar-telefone-obrigatorio', confirmarTelefoneObrigatorioMobile);
    bind('reenviar-telefone-obrigatorio', enviarCodigoTelefoneObrigatorioMobile);
    bind('sair-telefone-obrigatorio', sair);

    bind('entrar', entrar);
    bind('entrar-google', entrarGoogle);
    bindChange('manter-conectado', function () {
      state.manterConectado = Boolean(this.checked);
    });
    bind('instalar-login', instalarApp);
    bind('boas-vindas-login', function () {
      state.telaAcesso = 'login';
      state.modoSenha = false;
      state.modoCadastro = false;
      state.erro = '';
      state.mensagem = '';
      render();
    });
    bind('boas-vindas-cadastro', function () {
      state.telaAcesso = 'login';
      state.modoCadastro = true;
      state.modoSenha = false;
      state.smsCadastroEnviado = false;
      state.erro = '';
      state.mensagem = '';
      render();
    });
    bind('esqueci-senha', function () {
      state.telaAcesso = 'login';
      state.loginRecuperacao = campo('login').trim();
      state.modoSenha = true;
      state.modoCadastro = false;
      state.smsSenhaEnviado = false;
      state.erro = '';
      state.mensagem = '';
      render();
    });
    bind('abrir-cadastro', function () {
      state.telaAcesso = 'login';
      state.modoCadastro = true;
      state.modoSenha = false;
      state.smsCadastroEnviado = false;
      state.erro = '';
      state.mensagem = '';
      render();
    });
    bind('voltar-login-cadastro', function () {
      state.telaAcesso = 'login';
      state.modoCadastro = false;
      state.smsCadastroEnviado = false;
      state.erro = '';
      state.mensagem = '';
      render();
    });
    bind('cadastro-submit', function () {
      if (state.smsCadastroEnviado) {
        concluirCadastro();
      } else {
        enviarCodigoCadastro();
      }
    });
    bind('reenviar-cadastro', enviarCodigoCadastro);
    bind('cadastro-tipo-empresa', function () { state.cadastroTipoPerfil = 'empresa'; render(); });
    bind('cadastro-tipo-pessoal', function () { state.cadastroTipoPerfil = 'pessoal'; render(); });
    bind('criar-perfil-inicial-submit', criarPerfilInicial);
    bind('sair-criar-perfil', function () { state.modoCriarPerfil = false; sair(); });
    bind('criar-perfil-empresa', function () { state.criarPerfilTipo = 'empresa'; render(); });
    bind('criar-perfil-pessoal', function () { state.criarPerfilTipo = 'pessoal'; render(); });
    bind('toggle-senha-login', function () {
      alternarSenha('mostrarSenhaLogin', 'senha', 'toggle-senha-login');
    });
    bind('toggle-nova-senha', function () {
      alternarSenha('mostrarNovaSenha', 'nova-senha', 'toggle-nova-senha');
    });
    bind('toggle-confirmar-senha', function () {
      alternarSenha('mostrarConfirmarSenha', 'confirmar-senha', 'toggle-confirmar-senha');
    });
    bind('toggle-senha-cadastro', function () {
      alternarSenha('mostrarSenhaCadastro', 'cadastro-senha', 'toggle-senha-cadastro');
    });
    bind('toggle-confirmar-cadastro', function () {
      alternarSenha('mostrarConfirmarSenhaCadastro', 'cadastro-confirmar-senha', 'toggle-confirmar-cadastro');
    });
    bind('voltar-login', function () {
      state.telaAcesso = 'login';
      state.modoSenha = false;
      state.modoCadastro = false;
      state.smsSenhaEnviado = false;
      state.erro = '';
      state.mensagem = '';
      render();
    });
    bind('redefinir-senha', redefinirSenha);
    bind('reenviar-senha', enviarCodigoSenha);
    bind('sair', sair);

    // Controle de Ponto (funcionário)
    if (ehFuncionarioPontoMobile() && !state.pontoCarregado) {
      state.pontoCarregado = true;
      carregarPontoHoje();
    }
    bind('ponto-acao', function () {
      var el = document.getElementById('ponto-acao');
      if (el) baterPonto(el.getAttribute('data-tipo'));
    });
    bind('ponto-encerrar', function () { baterPonto('saida'); });
    bind('ponto-comprovante-ok', function () { state.pontoComprovante = null; render(); });
    bind('ponto-sair', sair);
    bind('ponto-meus-registros', function () { state.pontoView = 'registros'; carregarPontoRegistros('dia'); });
    bind('ponto-voltar', function () { state.pontoView = 'bater'; render(); });
    bind('ponto-periodo-dia', function () { carregarPontoRegistros('dia'); });
    bind('ponto-periodo-semana', function () { carregarPontoRegistros('semana'); });
    bind('ponto-periodo-mes', function () { carregarPontoRegistros('mes'); });
    bind('ponto-periodo-ano', function () { carregarPontoRegistros('ano'); });
    bind('ponto-gerar-pdf', function () { try { window.print(); } catch (e) {} });
    bind('menu-toggle', function () {
      state.menuAberto = true;
      render();
    });
    bind('fechar-menu', function () {
      state.menuAberto = false;
      render();
    });
    var menuOverlay = document.getElementById('menu-overlay');
    if (menuOverlay) {
      menuOverlay.addEventListener('click', function (event) {
        if (event.target !== menuOverlay) return;
        state.menuAberto = false;
        render();
      });
    }
    bind('menu-configurar-resumo', function () { abrirModalMenu('configurarResumo'); });
    bind('menu-usuario', abrirUsuariosMobile);
    bind('menu-gerenciar', function () { abrirModalMenu('gerenciar'); });
    bind('menu-organizar-dashboard', function () { abrirModalMenu('organizarDashboard'); });
    bind('menu-agenda', abrirAgendaMobile);
    bind('menu-notificacoes', function () { state.menuAberto = false; render(); alternarNotificacoesMobile(); });
    bind('prompt-notif-ativar', function () {
      marcarPromptNotifVisto();
      state.mostrarPromptNotificacoes = false;
      render();
      ativarNotificacoesMobile();
    });
    bind('prompt-notif-agora-nao', function () {
      marcarPromptNotifVisto();
      state.mostrarPromptNotificacoes = false;
      render();
    });
    bind('menu-tutorial', function () { state.menuAberto = false; abrirTourMobile(); });
    bind('tour-pular', fecharTourMobile);
    bind('tour-concluir', fecharTourMobile);
    bind('tour-anterior', function () { tourIr(-1); });
    bind('tour-proximo', function () { tourIr(1); });
    bind('menu-categorias', function () { abrirModalMenu('categorias'); });
    bind('menu-despesas-fixas', function () { abrirModalMenuDespesasFixas(); });
    bind('menu-ajuda-categorias', function () { abrirModalMenu('ajudaCategorias'); });
    bind('menu-instalar', instalarApp);
    bind('menu-duplicados', alternarDuplicados);
    bind('menu-tema', trocarTema);
    bind('menu-config-toggle', function () {
      state.menuConfigAberto = !state.menuConfigAberto;
      render();
      if (state.menuConfigAberto) {
        setTimeout(function () {
          var toggle = document.getElementById('menu-config-toggle');
          var aside = document.getElementById('menu-aside');
          if (toggle && toggle.scrollIntoView) {
            // Leva o botao Configuracoes ao topo, deixando as opcoes visiveis
            toggle.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (aside) {
            aside.scrollTo({ top: aside.scrollHeight, behavior: 'smooth' });
          }
        }, 80);
      }
    });
    bind('menu-feedback', abrirFeedbackMobile);
    bind('fechar-modal-menu', fecharModalMenu);

    // Despesas fixas mobile
    bind('salvar-nova-recorrencia', salvarNovaRecorrenciaMobile);

    var novaRecorrValorEl = document.getElementById('nova-recorr-valor');
    if (novaRecorrValorEl) {
      novaRecorrValorEl.addEventListener('input', function(e) {
        var v = formatarValorRecorrMobile(e.target.value);
        state.novaRecorrValor = v;
        state.novaRecorrValorNumerico = v ? parseFloat(v.replace(/\./g,'').replace(',','.')) : 0;
        e.target.value = v;
        var len = v.length; e.target.setSelectionRange(len, len);
      });
      novaRecorrValorEl.addEventListener('focus', function(e) {
        var len = e.target.value.length; e.target.setSelectionRange(len, len);
      });
    }

    // list item delegates for recorrencias
    var recorrContainer = document.querySelector('[data-recorr-container]');
    // toggle, editar, excluir, cancelar-edicao, salvar-edicao via event delegation on modal content
    var modalContent = document.querySelector('#modal-menu-overlay .overflow-y-auto');
    if (modalContent && state.modalMenu === 'despesasFixas') {
      modalContent.addEventListener('click', function handler(e) {
        var btn = e.target.closest('[data-recorr-toggle],[data-recorr-editar],[data-recorr-excluir],[data-recorr-cancelar-edicao],[data-recorr-salvar-edicao]');
        if (!btn) return;
        if (btn.dataset.recorrToggle) {
          toggleRecorrenciaAtivoMobile(btn.dataset.recorrToggle, btn.dataset.recorrAtivo === '1');
        } else if (btn.dataset.recorrEditar) {
          var r = (state.recorrencias || []).find(function(x) { return String(x.id) === btn.dataset.recorrEditar; });
          state.recorrEditandoId = btn.dataset.recorrEditar;
          state.editRecorrValor = '';
          state.editRecorrValorNumerico = 0;
          state.erro = '';
          render();
          // re-bind valor input for edit form
          var editValorEl = document.getElementById('edit-recorr-valor-' + btn.dataset.recorrEditar);
          if (editValorEl) {
            editValorEl.addEventListener('input', function(ev) {
              var v = formatarValorRecorrMobile(ev.target.value);
              state.editRecorrValor = v;
              state.editRecorrValorNumerico = v ? parseFloat(v.replace(/\./g,'').replace(',','.')) : 0;
              ev.target.value = v;
              var l = v.length; ev.target.setSelectionRange(l, l);
            });
            editValorEl.addEventListener('focus', function(ev) {
              var l = ev.target.value.length; ev.target.setSelectionRange(l, l);
            });
          }
        } else if (btn.dataset.recorrExcluir) {
          excluirRecorrenciaMobile(btn.dataset.recorrExcluir, btn.dataset.recorrExcluirNome || '');
        } else if (btn.dataset.recorrCancelarEdicao) {
          state.recorrEditandoId = null;
          state.erro = '';
          render();
        } else if (btn.dataset.recorrSalvarEdicao) {
          salvarEdicaoRecorrenciaMobile(btn.dataset.recorrSalvarEdicao);
        }
      }, { once: true });
    }
    bind('trocar-empresa-gerenciar', function () { abrirModalMenu('empresa'); });
    bind('termos-mobile', function () { abrirModalMenu('termos'); });
    bind('privacidade-mobile', function () { abrirModalMenu('privacidade'); });
    bind('abrir-edicao-empresa-mobile', abrirEdicaoEmpresaMobile);
    bind('abrir-criar-empresa-mobile', abrirCriarEmpresaMobile);
    bind('cancelar-criar-empresa-mobile', cancelarCriarEmpresaMobile);
    bind('cancelar-edicao-empresa-mobile', cancelarEdicaoEmpresaMobile);
    bind('salvar-edicao-empresa-mobile', salvarEdicaoEmpresaMobile);
    bind('criar-empresa-mobile', criarEmpresaMobile);
    bind('edit-tipo-empresa', function () { selecionarTipoPerfilEdicao('empresa'); });
    bind('edit-tipo-pessoal', function () { selecionarTipoPerfilEdicao('pessoal'); });
    bind('novo-tipo-empresa', function () { selecionarTipoPerfilNovo('empresa'); });
    bind('novo-tipo-pessoal', function () { selecionarTipoPerfilNovo('pessoal'); });
    bind('abrir-exclusao-empresa-mobile', function () {
      state.empresaExclusaoAberta = true;
      state.erro = '';
      render();
    });
    bind('cancelar-exclusao-empresa-mobile', function () {
      state.empresaExclusaoAberta = false;
      state.erro = '';
      render();
    });
    bind('excluir-empresa-mobile', excluirEmpresaMobile);
    bind('abrir-criar-usuario-mobile', abrirCriarUsuarioMobile);
    bind('abrir-usuario-existente-mobile', abrirAdicionarUsuarioExistenteMobile);
    bind('pesquisar-usuario-existente-mobile', buscarUsuarioExistenteMobile);
    bind('confirmar-vinculo-usuario-existente-mobile', confirmarVinculoUsuarioExistenteMobile);
    bind('cancelar-usuario-existente-mobile', ocultarFormularioUsuarioMobile);
    bind('limpar-usuario-existente-mobile', function () {
      state.usuarioExistenteResultado = null;
      state.usuarioExistentePerfil = 'operador_simples';
      state.erro = '';
      render();
    });
    bind('criar-usuario-mobile', criarUsuarioMobile);
    bind('salvar-usuario-mobile', salvarUsuarioMobile);
    bind('feedback-sugestao', function () { abrirFormularioFeedbackMobile('sugestao'); });
    bind('feedback-duvida', function () { abrirFormularioFeedbackMobile('duvida'); });
    bind('feedback-abrir-ava', function () { state.modalMenu = ''; abrirChatIA(); });
    bind('feedback-voltar', voltarFeedbackMobile);
    bind('feedback-enviar', enviarFeedbackMobile);
    bind('feedback-outra', voltarFeedbackMobile);
    bind('abrir-agenda-card', abrirAgendaMobile);
    bind('avisos-dashboard', function () {
      marcarNotificacoesComoLidas();
      abrirAgendaMobile();
      var hoje = new Date();
      state.mes = meses[hoje.getMonth()];
      state.ano = String(hoje.getFullYear());
      state.agendaDiaSelecionado = hoje.getDate();
      render();
    });
    bind('abrir-agenda-item', abrirFormularioAgendaMobile);
    bind('cancelar-agenda-item', cancelarFormularioAgendaMobile);
    bind('cancelar-agenda-item-topo', cancelarFormularioAgendaMobile);
    bind('salvar-agenda-item', salvarItemAgendaMobile);
    bindChange('agenda-repetir', function () {
      state.agendaRepetir = Boolean(this.checked);
    });
    bindChange('agenda-repeticao', function () {
      state.agendaRepeticao = this.value || 'mensal';
    });
    bind('fechar-agenda-dia', function () {
      state.agendaDiaSelecionado = null;
      state.agendaFormAberto = false;
      render();
    });
    var agendaFormOverlay = document.getElementById('agenda-form-overlay');
    if (agendaFormOverlay) {
      agendaFormOverlay.addEventListener('click', function (event) {
        if (event.target !== agendaFormOverlay) return;
        cancelarFormularioAgendaMobile();
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-agenda-dia]'), function (botao) {
      botao.addEventListener('click', function () {
        state.agendaDiaSelecionado = Number(botao.getAttribute('data-agenda-dia')) || 1;
        state.agendaFormAberto = false;
        render();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-agenda-excluir]'), function (botao) {
      botao.addEventListener('click', function (evento) {
        evento.stopPropagation();
        excluirItemAgendaMobile(botao.getAttribute('data-agenda-excluir'));
      });
    });
    bind('cancelar-edicao-usuario', function () {
      state.usuarioEditandoId = '';
      state.erro = '';
      render();
    });
    bind('salvar-categoria', salvarCategoriaDespesa);
    bind('chat-ia-btn', abrirChatIA);
    bind('chat-ia-card', abrirChatIA);
    bind('chat-ia-fechar', fecharChatIA);
    bind('chat-ia-mic', function() { gravarVoz(); });
    bind('chat-ia-enviar', function() { enviarMensagemIA(); });
    var chatOverlay = document.getElementById('chat-ia-overlay');
    if (chatOverlay) {
      chatOverlay.addEventListener('touchmove', function(e) {
        if (e.target && e.target.closest && e.target.closest('#chat-ia-msgs')) return;
        e.preventDefault();
      }, { passive: false });
    }
    var _avaSug = ['Por onde inicio o uso do sistema?', 'Analise meus resultados.', 'Como reduzir gastos sem afetar o essencial?', 'Como montar uma reserva de emergência?'];
    for (var _si = 0; _si < _avaSug.length; _si++) {
      (function(idx) {
        bind('chat-ia-sug-' + idx, function() {
          if (state.chatIADigitando) return;
          var t = _avaSug[idx];
          state.chatIAInput = t;
          preencherInputChatIA(t);
          enviarMensagemIA();
        });
      })(_si);
    }
    var chatInput = document.getElementById('chat-ia-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagemIA(); } });
      chatInput.addEventListener('focus', function() { _avaManterTelaFixa(); setTimeout(_avaManterTelaFixa, 120); setTimeout(_avaManterTelaFixa, 350); });
      chatInput.addEventListener('blur', function() { setTimeout(_avaManterTelaFixa, 120); });
      chatInput.addEventListener('input', function() {
        state.chatIAInput = typeof this.value === 'string' ? this.value : (this.textContent || '');
        // Atualizar botão enviar dinamicamente sem re-render completo
        var envBtn = document.getElementById('chat-ia-enviar');
        if (envBtn) {
          var tem = state.chatIAInput.trim().length > 0;
          envBtn.disabled = !tem;
          var _dk = !!state.darkMode;
          envBtn.style.background = tem ? 'linear-gradient(135deg,#0ea5e9,#0369a1)' : 'transparent';
          envBtn.style.boxShadow = tem ? '0 3px 10px rgba(2,132,199,0.32)' : 'none';
          var svg = envBtn.querySelector('svg');
          if (svg) svg.querySelector('path').setAttribute('fill', tem ? '#fff' : (_dk ? '#5b6b82' : '#94a3b8'));
        }
        // Auto-resize textarea
        this.style.maxHeight = '96px';
      });
    }
    bind('salvar-despesa', salvarDespesa);
    var diaInputEl = document.getElementById('despesa-dia');
    if (diaInputEl) {
      diaInputEl.addEventListener('blur', function() {
        var val = Number(this.value);
        var limite = maxDias(state.mes, state.ano);
        if (this.value !== '' && (isNaN(val) || val < 1 || val > limite)) {
          var msg = 'Data invalida. Informe um dia entre 1 e ' + limite + '.';
          state.erro = msg;
          var alertaEl = document.getElementById('lancamento-alerta-dia');
          if (alertaEl) { alertaEl.textContent = msg; alertaEl.style.display = 'block'; }
          this.value = '';
          state._diaInvalido = true;
          var _self = this; setTimeout(function() { _self.focus(); }, 0);
        }
      });
      diaInputEl.addEventListener('input', function() {
        var val = Number(this.value);
        var limite = maxDias(state.mes, state.ano);
        if (this.value === '' || (!isNaN(val) && val >= 1 && val <= limite)) {
          state.erro = '';
          state._diaInvalido = false;
          var alertaEl = document.getElementById('lancamento-alerta-dia');
          if (alertaEl) alertaEl.style.display = 'none';
        }
      });
    }
    // Interceptar outros campos quando dia tem erro
    ['despesa-nome', 'despesa-descricao', 'despesa-valor'].forEach(function(fid) {
      var fel = document.getElementById(fid);
      if (!fel) return;
      function _guardarDia(e) {
        if (!state._diaInvalido) return;
        e.preventDefault();
        var dEl = document.getElementById('despesa-dia');
        if (dEl) dEl.focus();
      }
      fel.addEventListener('mousedown', _guardarDia);
      fel.addEventListener('touchstart', _guardarDia, { passive: false });
    });
    bind('toggle-parcelar-despesa', function() {
      var diaVal = campo('despesa-dia'); var nomeVal = campo('despesa-nome');
      var descVal = campo('despesa-descricao'); var valorVal = campo('despesa-valor');
      state.formParcelar = !state.formParcelar;
      if (state.formParcelar && state.formParcelas < 2) state.formParcelas = 2;
      render();
      var d = document.getElementById('despesa-dia'); if (d) d.value = diaVal;
      var n = document.getElementById('despesa-nome'); if (n) n.value = nomeVal;
      var desc = document.getElementById('despesa-descricao'); if (desc) desc.value = descVal;
      var v = document.getElementById('despesa-valor'); if (v) v.value = valorVal;
    });
    bind('parcelar-menos', function() {
      if (state.formParcelas <= 2) return;
      var diaVal = campo('despesa-dia'); var nomeVal = campo('despesa-nome');
      var descVal = campo('despesa-descricao'); var valorVal = campo('despesa-valor');
      state.formParcelas--;
      render();
      var d = document.getElementById('despesa-dia'); if (d) d.value = diaVal;
      var n = document.getElementById('despesa-nome'); if (n) n.value = nomeVal;
      var desc = document.getElementById('despesa-descricao'); if (desc) desc.value = descVal;
      var v = document.getElementById('despesa-valor'); if (v) v.value = valorVal;
    });
    bind('parcelar-mais', function() {
      var diaVal = campo('despesa-dia'); var nomeVal = campo('despesa-nome');
      var descVal = campo('despesa-descricao'); var valorVal = campo('despesa-valor');
      state.formParcelas++;
      render();
      var d = document.getElementById('despesa-dia'); if (d) d.value = diaVal;
      var n = document.getElementById('despesa-nome'); if (n) n.value = nomeVal;
      var desc = document.getElementById('despesa-descricao'); if (desc) desc.value = descVal;
      var v = document.getElementById('despesa-valor'); if (v) v.value = valorVal;
    });
    bind('salvar-entrada', salvarEntrada);
    bind('salvar-total-receita', salvarTotalReceita);
    bind('excluir-total-receita', excluirTotalMesMobile);
    bind('toggle-categorias', function () {
      state.categoriasExpandido = !state.categoriasExpandido;
      render();
    });
    bind('toggle-tipos-despesa', function () {
      state.tiposDespesaExpandido = !state.tiposDespesaExpandido;
      render();
    });
    bind('toggle-ultimas-despesas', function () {
      state.ultimasDespesasExpandido = !state.ultimasDespesasExpandido;
      render();
    });
    bind('toggle-ultimas-receitas', function () {
      state.ultimasReceitasExpandido = !state.ultimasReceitasExpandido;
      render();
    });
    bind('buscar-ultimas-despesas', function () {
      state.ultimasDespesasBuscaAberta = !state.ultimasDespesasBuscaAberta;
      if (!state.ultimasDespesasBuscaAberta) state.ultimasDespesasBusca = '';
      render();
    });
    bind('buscar-ultimas-receitas', function () {
      state.ultimasReceitasBuscaAberta = !state.ultimasReceitasBuscaAberta;
      if (!state.ultimasReceitasBuscaAberta) state.ultimasReceitasBusca = '';
      render();
    });
    bind('reset-dashboard', function () {
      state.dashboardOrdem = ordemDashboardPadrao();
      state.dashboardOcultos = [];
      salvarResumoDashboard();
      render();
    });
    bind('reset-resumo-dashboard', restaurarResumoPadrao);
    bind('mes-anterior', function () { mudarMes(-1); });
    bind('mes-proximo', function () { mudarMes(1); });
    bind('ver-despesas', function () {
      state.visao = 'despesas';
      state.busca = '';
      render();
    });
    bind('ver-receitas', function () {
      state.visao = 'receitas';
      state.busca = '';
      render();
    });
    bind('ver-despesas-total', function () {
      state.visao = 'despesas';
      state.busca = '';
      render();
    });
    bind('ver-receitas-total', function () {
      state.visao = 'receitas';
      state.busca = '';
      render();
    });
    bind('voltar-home', function () {
      state.visao = 'home';
      state.busca = '';
      render();
    });
    bind('abrir-lancamento', function () {
      state.modalLancamento = true;
      render();
    });
    bind('voltar-dashboard-topo', voltarDashboard);
    bind('fechar-lancamento', function () {
      state.modalLancamento = false;
      state.novaDespesaAberta = false;
      state.novaDespesaNome = '';
      state.novaDespesaCategoria = '';
      render();
    });
    var modalLancamentoOverlay = document.getElementById('modal-lancamento-overlay');
    if (modalLancamentoOverlay) {
      modalLancamentoOverlay.addEventListener('click', function (event) {
        if (event.target !== modalLancamentoOverlay) return;
        state.modalLancamento = false;
        state.erro = '';
        render();
      });
    }
    bind('tipo-despesa', function () {
      state.tipoLancamento = 'despesa';
      render();
    });
    bind('tipo-receita', function () {
      state.tipoLancamento = 'receita';
      state.novaDespesaAberta = false;
      state.novaDespesaNome = '';
      state.novaDespesaCategoria = '';
      render();
    });
    bind('abrir-nova-despesa', function () {
      var categorias = categoriasDoPerfil(state.empresa && state.empresa.tipo_perfil);
      state.novaDespesaAberta = true;
      state.novaDespesaNome = '';
      state.novaDespesaCategoria = categorias.length ? categorias[0].nome : '';
      state.erro = '';
      render();
    });
    bind('fechar-nova-despesa', function () {
      state.novaDespesaAberta = false;
      state.novaDespesaNome = '';
      state.novaDespesaCategoria = '';
      state.erro = '';
      render();
    });
    bind('salvar-nova-despesa', salvarNovaDespesaInline);
    bind('modo-receita-entrada', function () {
      state.modoReceita = 'entrada';
      state.erro = '';
      render();
    });
    bind('modo-receita-total', function () {
      state.modoReceita = 'total';
      state.erro = '';
      render();
    });
    bind('fechar-acao-lancamento', fecharAcaoLancamento);
    var modalAcaoOverlay = document.getElementById('modal-acao-overlay');
    if (modalAcaoOverlay) {
      modalAcaoOverlay.addEventListener('click', function (event) {
        if (event.target !== modalAcaoOverlay) return;
        fecharAcaoLancamento();
      });
    }
    var modalMenuOverlay = document.getElementById('modal-menu-overlay');
    if (modalMenuOverlay) {
      modalMenuOverlay.addEventListener('click', function (event) {
        if (event.target !== modalMenuOverlay) return;
        fecharModalMenu();
      });
    }
    bind('editar-lancamento', function () {
      if (!state.modalAcao) return;
      state.modalAcao.modo = 'editar';
      state.erro = '';
      render();
    });
    bind('excluir-lancamento', excluirLancamentoSelecionado);
    bind('salvar-edicao-lancamento', salvarEdicaoLancamentoSelecionado);
    ['despesa-valor', 'entrada-valor', 'receita-total', 'editar-valor'].forEach(function (id) {
      bindInput(id, function () {
        var item = document.getElementById(id);
        if (item) item.value = formatarMoedaDigitada(item.value);
      });
    });

    bindChange('mes', function () {
      state.mes = campo('mes');
      render();
    });

    bindChange('ano', function () {
      trocarAnoMobile(this.value);
    });

    bindChange('empresa', function () {
      var id = campo('empresa');
      selecionarEmpresaMobile(id, true);
      carregarDados();
    });

    var busca = document.getElementById('busca-lista');
    if (busca) {
      busca.addEventListener('input', function () {
        state.busca = busca.value;
      });
      busca.addEventListener('search', function () {
        state.busca = busca.value;
        atualizarBuscaListaMobile();
      });
      busca.addEventListener('change', function () {
        state.busca = busca.value;
        atualizarBuscaListaMobile();
      });
      busca.addEventListener('blur', function () {
        state.busca = busca.value;
        atualizarBuscaListaMobile();
      });
      busca.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        state.busca = busca.value;
        atualizarBuscaListaMobile();
      });
    }

    bind('limpar-busca-lista', function () {
      state.busca = '';
      var buscaAtual = document.getElementById('busca-lista');
      if (buscaAtual) {
        buscaAtual.value = '';
        buscaAtual.focus();
      }
      atualizarBuscaListaMobile();
    });

    var buscaUltimasDespesas = document.getElementById('busca-ultimas-despesas');
    if (buscaUltimasDespesas) {
      buscaUltimasDespesas.addEventListener('input', function () {
        state.ultimasDespesasBusca = buscaUltimasDespesas.value;
        atualizarBuscaUltimasMobile('despesas');
      });
      atualizarBuscaUltimasMobile('despesas');
    }
    bind('limpar-ultimas-despesas', function () {
      state.ultimasDespesasBusca = '';
      var campoBusca = document.getElementById('busca-ultimas-despesas');
      if (campoBusca) {
        campoBusca.value = '';
        campoBusca.focus();
      }
      atualizarBuscaUltimasMobile('despesas');
    });

    var buscaUltimasReceitas = document.getElementById('busca-ultimas-receitas');
    if (buscaUltimasReceitas) {
      buscaUltimasReceitas.addEventListener('input', function () {
        state.ultimasReceitasBusca = buscaUltimasReceitas.value;
        atualizarBuscaUltimasMobile('receitas');
      });
      atualizarBuscaUltimasMobile('receitas');
    }
    bind('limpar-ultimas-receitas', function () {
      state.ultimasReceitasBusca = '';
      var campoBusca = document.getElementById('busca-ultimas-receitas');
      if (campoBusca) {
        campoBusca.value = '';
        campoBusca.focus();
      }
      atualizarBuscaUltimasMobile('receitas');
    });

    var feedbackMensagem = document.getElementById('feedback-mensagem');
    if (feedbackMensagem) {
      feedbackMensagem.addEventListener('input', function () {
        state.feedbackMensagem = feedbackMensagem.value;
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('.empresa-opcao'), function (botao) {
      botao.addEventListener('click', function () {
        var id = botao.getAttribute('data-empresa-id');
        selecionarEmpresaMobile(id, true);
        state.modalMenu = '';
        state.visao = 'home';
        carregarDados();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-lancamento-id]'), function (botao) {
      botao.addEventListener('click', function () {
        abrirAcaoLancamento(botao.getAttribute('data-tipo-lancamento'), botao.getAttribute('data-lancamento-id'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-confirmar-id]'), function (botao) {
      botao.addEventListener('click', function () {
        confirmarDespesaPrevista(botao.getAttribute('data-confirmar-id'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ajustar-id]'), function (botao) {
      botao.addEventListener('click', function () {
        ajustarDespesaPrevista(botao.getAttribute('data-ajustar-id'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-excluir-prevista-id]'), function (botao) {
      botao.addEventListener('click', function () {
        excluirDespesaPrevista(botao.getAttribute('data-excluir-prevista-id'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-move]'), function (botao) {
      botao.addEventListener('click', function () {
        moverCardDashboard(botao.getAttribute('data-dashboard-move'), Number(botao.getAttribute('data-dashboard-dir')));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-toggle]'), function (botao) {
      botao.addEventListener('click', function () {
        alternarCardResumo(botao.getAttribute('data-dashboard-toggle'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-editar-usuario]'), function (botao) {
      botao.addEventListener('click', function () {
        editarUsuarioMobile(botao.getAttribute('data-editar-usuario'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-excluir-usuario]'), function (botao) {
      botao.addEventListener('click', function () {
        excluirUsuarioMobile(botao.getAttribute('data-excluir-usuario'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-categoria-opcoes]'), function (botao) {
      botao.addEventListener('click', function () {
        abrirCategoriaAcoes(botao.getAttribute('data-categoria-opcoes'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-categoria-editar]'), function (botao) {
      botao.addEventListener('click', function () {
        editarCategoriaDespesa(botao.getAttribute('data-categoria-editar'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-categoria-salvar]'), function (botao) {
      botao.addEventListener('click', function () {
        salvarEdicaoCategoriaDespesa(botao.getAttribute('data-categoria-salvar'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-categoria-excluir]'), function (botao) {
      botao.addEventListener('click', function () {
        excluirCategoriaDespesa(botao.getAttribute('data-categoria-excluir'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-categoria-cancelar]'), function (botao) {
      botao.addEventListener('click', function () {
        state.categoriaEditandoId = '';
        state.categoriaAcoesId = '';
        state.erro = '';
        render();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-evolucao-valor]'), function (botao) {
      botao.addEventListener('click', function () {
        var tipo = botao.getAttribute('data-evolucao-tipo');
        state.evolucaoSelecionada[tipo] = Number(botao.getAttribute('data-evolucao-valor') || 0);
        render();
      });
    });
    configurarDragDashboard();
    configurarGestosAgenda();
  }

  function configurarGestosAgenda() {
    var tela = document.getElementById('agenda-mobile-screen');
    if (!tela) return;

    var inicioX = 0;
    var inicioY = 0;
    var ativo = false;

    tela.addEventListener('touchstart', function (event) {
      if (!event.touches || !event.touches.length) return;
      inicioX = event.touches[0].clientX;
      inicioY = event.touches[0].clientY;
      ativo = true;
    }, { passive: true });

    tela.addEventListener('touchend', function (event) {
      if (!ativo || !event.changedTouches || !event.changedTouches.length) return;
      ativo = false;

      var fimX = event.changedTouches[0].clientX;
      var fimY = event.changedTouches[0].clientY;
      var deltaX = fimX - inicioX;
      var deltaY = fimY - inicioY;

      if (Math.abs(deltaX) < 64 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
      mudarMes(deltaX < 0 ? 1 : -1);
    }, { passive: true });
  }

  function configurarPullToRefresh() {
    var inicioY = 0;
    var acompanhando = false;
    var indicador = null;
    var limite = 95;

    function indicadorPullToRefresh() {
      if (indicador) return indicador;

      indicador = document.createElement('div');
      indicador.id = 'pull-refresh-indicator';
      indicador.className = 'pointer-events-none';
      indicador.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:9999;display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.75);border-radius:9999px;background:rgba(255,255,255,.96);padding:8px 14px;color:#334155;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;box-shadow:0 14px 30px rgba(15,23,42,.16);backdrop-filter:blur(10px);opacity:0;transform:translate(-50%,-64px);transition:opacity .15s ease,transform .15s ease;';
      indicador.innerHTML = '<span data-pull-icon class="block text-lg leading-none transition-transform duration-150">&#8635;</span><span data-pull-text>Puxe para recarregar</span>';
      document.body.appendChild(indicador);
      return indicador;
    }

    function atualizarIndicador(distancia, soltou) {
      var item = indicadorPullToRefresh();
      var progresso = Math.max(0, Math.min(distancia / limite, 1));
      var visivel = distancia > 8;
      var texto = item.querySelector('[data-pull-text]');
      var icone = item.querySelector('[data-pull-icon]');
      var deslocamento = -64 + Math.round(64 * progresso);

      item.style.opacity = visivel ? String(Math.max(0.25, progresso)) : '0';
      item.style.transform = 'translate(-50%, ' + deslocamento + 'px)';
      if (texto) texto.textContent = soltou ? 'Recarregando...' : (distancia >= limite ? 'Recarregar' : 'Puxe para recarregar');
      if (icone) icone.style.transform = 'rotate(' + Math.round(220 * progresso) + 'deg)';
    }

    function esconderIndicador() {
      if (!indicador) return;
      indicador.style.opacity = '0';
      indicador.style.transform = 'translate(-50%, -64px)';
    }

    window.addEventListener('touchstart', function (event) {
      if (deveBloquearScroll() || window.scrollY > 2 || !event.touches.length) {
        acompanhando = false;
        esconderIndicador();
        return;
      }

      acompanhando = true;
      inicioY = event.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', function (event) {
      if (!acompanhando || deveBloquearScroll() || !event.touches.length) return;

      var distancia = event.touches[0].clientY - inicioY;
      if (distancia <= 0 || window.scrollY > 2) {
        esconderIndicador();
        return;
      }

      atualizarIndicador(distancia, false);
    }, { passive: true });

    window.addEventListener('touchend', function (event) {
      if (!acompanhando || deveBloquearScroll()) return;
      acompanhando = false;

      var toque = event.changedTouches && event.changedTouches[0];
      if (toque && toque.clientY - inicioY > limite && window.scrollY <= 2) {
        atualizarIndicador(limite, true);
        window.location.reload();
      } else {
        esconderIndicador();
      }
    }, { passive: true });

    window.addEventListener('touchcancel', function () {
      acompanhando = false;
      esconderIndicador();
    }, { passive: true });
  }

  function configurarDragDashboard() {
    var timer = null;
    var cardAtivo = null;
    var idAtivo = '';
    var ghost = null;
    var marcador = null;
    var ultimoDestino = null;
    var iniciouDrag = false;
    var pointerId = null;
    var zonasDestino = [];
    var estilosOrigem = null;
    var pointerCardOffsetX = 0;
    var pointerCardOffsetY = 0;
    var ghostPointerOffsetX = 0;
    var ghostPointerOffsetY = 0;
    var ghostEscala = 0.94;

    function limparDrag() {
      if (timer) window.clearTimeout(timer);
      timer = null;

      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;

      if (marcador && marcador.parentNode) marcador.parentNode.removeChild(marcador);
      marcador = null;
      ultimoDestino = null;

      if (cardAtivo) {
        cardAtivo.classList.remove('select-none');
        if (estilosOrigem) {
          cardAtivo.style.opacity = estilosOrigem.opacity;
          cardAtivo.style.transform = estilosOrigem.transform;
          cardAtivo.style.filter = estilosOrigem.filter;
          cardAtivo.style.minHeight = estilosOrigem.minHeight;
          cardAtivo.style.outline = estilosOrigem.outline;
          cardAtivo.style.background = estilosOrigem.background;
        } else {
          cardAtivo.style.opacity = '';
          cardAtivo.style.transform = '';
          cardAtivo.style.filter = '';
          cardAtivo.style.minHeight = '';
          cardAtivo.style.outline = '';
          cardAtivo.style.background = '';
        }
      }

      cardAtivo = null;
      idAtivo = '';
      iniciouDrag = false;
      pointerId = null;
      zonasDestino = [];
      estilosOrigem = null;
      pointerCardOffsetX = 0;
      pointerCardOffsetY = 0;
      ghostPointerOffsetX = 0;
      ghostPointerOffsetY = 0;
      state.dragDashboardId = '';
    }

    function posicionarGhost(x, y) {
      if (!ghost) return;

      var largura = ghost.offsetWidth || 260;
      var altura = ghost.offsetHeight || 120;
      var ajusteEscalaX = (largura * (1 - ghostEscala)) / 2;
      var ajusteEscalaY = (altura * (1 - ghostEscala)) / 2;
      var left = x - (ghostPointerOffsetX * ghostEscala) - ajusteEscalaX;
      var top = y - (ghostPointerOffsetY * ghostEscala) - ajusteEscalaY;

      ghost.style.left = Math.max(12, Math.min(window.innerWidth - largura - 12, left)) + 'px';
      ghost.style.top = Math.max(12, Math.min(window.innerHeight - altura - 12, top)) + 'px';
    }

    function criarGhost(card, x, y) {
      var rect = card.getBoundingClientRect();
      var larguraGhost = Math.min(rect.width * 0.82, window.innerWidth - 56);
      var alturaMaximaGhost = Math.min(Math.max(rect.height * 0.86, 90), 198);
      ghost = document.createElement('div');
      ghost.className = 'pointer-events-none fixed z-[90] overflow-hidden rounded-2xl bg-transparent text-slate-900 shadow-2xl shadow-cyan-950/25';
      ghost.style.width = larguraGhost + 'px';
      ghost.style.maxHeight = alturaMaximaGhost + 'px';
      ghost.style.left = '12px';
      ghost.style.top = '12px';
      ghost.style.transform = 'rotate(-0.5deg) scale(' + ghostEscala + ')';
      ghost.style.transformOrigin = 'center center';
      ghost.style.transition = 'box-shadow .16s ease, transform .16s ease';
      ghostPointerOffsetX = Math.max(0, Math.min(larguraGhost, pointerCardOffsetX * (larguraGhost / Math.max(rect.width, 1))));

      var preview = card.cloneNode(true);
      preview.removeAttribute('data-dashboard-card');
      preview.style.paddingBottom = '0';
      preview.style.transform = 'none';
      preview.style.opacity = '1';
      preview.style.filter = 'none';
      preview.style.minHeight = '';
      Array.prototype.forEach.call(preview.querySelectorAll('[id]'), function (item) {
        item.removeAttribute('id');
      });
      Array.prototype.forEach.call(preview.querySelectorAll('[data-dashboard-handle]'), function (item) {
        item.parentNode.removeChild(item);
      });
      ghost.appendChild(preview);
      document.body.appendChild(ghost);
      var alturaGhost = ghost.offsetHeight || alturaMaximaGhost;
      ghostPointerOffsetY = Math.max(0, Math.min(alturaGhost, pointerCardOffsetY * (alturaGhost / Math.max(rect.height, 1))));
      posicionarGhost(x, y);
    }

    function garantirMarcador() {
      if (marcador) return marcador;

      marcador = document.createElement('div');
      marcador.className = 'pointer-events-none my-2 overflow-hidden rounded-2xl border border-dashed border-cyan-300 bg-white/75 shadow-inner shadow-cyan-100 transition-all duration-150 ease-out';
      marcador.style.height = '74px';
      marcador.innerHTML = '<div class="flex h-full items-center justify-center rounded-2xl bg-cyan-50/70 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Soltar aqui</div>';
      return marcador;
    }

    function calcularZonasDestino() {
      var cards = Array.prototype.slice.call(document.querySelectorAll('[data-dashboard-card]'))
        .filter(function (card) {
          return card.getAttribute('data-dashboard-card') !== idAtivo;
        });

      zonasDestino = cards.map(function (card) {
        var rect = card.getBoundingClientRect();
        return {
          id: card.getAttribute('data-dashboard-card'),
          depois: false,
          limite: rect.top + window.scrollY + rect.height / 2,
          card: card,
        };
      });

      if (cards.length) {
        zonasDestino.push({
          id: cards[cards.length - 1].getAttribute('data-dashboard-card'),
          depois: true,
          limite: Infinity,
          card: cards[cards.length - 1],
        });
      }
    }

    function moverGhost(x, y) {
      posicionarGhost(x, y);
    }

    function destacarDestino(x, y) {
      if (!zonasDestino.length) {
        if (marcador && marcador.parentNode) marcador.parentNode.removeChild(marcador);
        ultimoDestino = null;
        return null;
      }

      var destino = zonasDestino[zonasDestino.length - 1];
      var indiceDestino = zonasDestino.length - 1;
      var yPagina = y + window.scrollY;

      for (var i = 0; i < zonasDestino.length; i += 1) {
        if (yPagina < zonasDestino[i].limite) {
          destino = zonasDestino[i];
          indiceDestino = i;
          break;
        }
      }

      if (ultimoDestino && ultimoDestino.indice !== undefined && Math.abs(indiceDestino - ultimoDestino.indice) === 1) {
        var limiteTroca = zonasDestino[Math.min(indiceDestino, ultimoDestino.indice)].limite;
        var margem = 20;
        if (ultimoDestino.indice < indiceDestino && yPagina < limiteTroca + margem) {
          destino = zonasDestino[ultimoDestino.indice];
          indiceDestino = ultimoDestino.indice;
        } else if (ultimoDestino.indice > indiceDestino && yPagina > limiteTroca - margem) {
          destino = zonasDestino[ultimoDestino.indice];
          indiceDestino = ultimoDestino.indice;
        }
      }

      var itemMarcador = garantirMarcador();
      var cardDestino = destino.card;

      if (destino.depois) {
        if (itemMarcador.previousSibling !== cardDestino) {
          cardDestino.parentNode.insertBefore(itemMarcador, cardDestino.nextSibling);
        }
      } else if (itemMarcador.nextSibling !== cardDestino) {
        cardDestino.parentNode.insertBefore(itemMarcador, cardDestino);
      }

      ultimoDestino = {
        id: destino.id,
        depois: destino.depois,
        indice: indiceDestino,
      };

      return ultimoDestino;
    }

    function rolarSeNecessario(y) {
      var limiteSuperior = 176;
      var limiteInferior = 120;
      var velocidadeMaxima = 24;

      if (y < limiteSuperior && window.scrollY > 0) {
        var intensidadeSubida = Math.max(0, limiteSuperior - y) / limiteSuperior;
        var velocidadeSubida = Math.max(8, Math.round(velocidadeMaxima * intensidadeSubida));
        window.scrollBy({ top: -velocidadeSubida, behavior: 'auto' });
        return;
      }

      if (y > window.innerHeight - limiteInferior) {
        var distanciaInferior = Math.max(0, y - (window.innerHeight - limiteInferior));
        var intensidadeDescida = distanciaInferior / limiteInferior;
        var velocidadeDescida = Math.max(8, Math.round(velocidadeMaxima * intensidadeDescida));
        window.scrollBy({ top: velocidadeDescida, behavior: 'auto' });
      }
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-handle]'), function (handle) {
      handle.addEventListener('pointerdown', function (event) {
        if (deveBloquearScroll() || state.visao !== 'home') return;

        event.preventDefault();
        pointerId = event.pointerId;
        idAtivo = handle.getAttribute('data-dashboard-handle') || '';
        cardAtivo = handle.closest('[data-dashboard-card]');
        if (cardAtivo) {
          var rectInicial = cardAtivo.getBoundingClientRect();
          pointerCardOffsetX = event.clientX - rectInicial.left;
          pointerCardOffsetY = event.clientY - rectInicial.top;
        }
        try {
          handle.setPointerCapture(event.pointerId);
        } catch (error) {}

        timer = window.setTimeout(function () {
          state.dragDashboardId = idAtivo;
          iniciouDrag = true;
          calcularZonasDestino();
          if (cardAtivo) {
            var rect = cardAtivo.getBoundingClientRect();
            estilosOrigem = {
              opacity: cardAtivo.style.opacity,
              transform: cardAtivo.style.transform,
              filter: cardAtivo.style.filter,
              minHeight: cardAtivo.style.minHeight,
              outline: cardAtivo.style.outline,
              background: cardAtivo.style.background,
            };
            cardAtivo.classList.add('select-none');
            cardAtivo.style.minHeight = rect.height + 'px';
            cardAtivo.style.opacity = '0.32';
            cardAtivo.style.transform = 'scale(0.985)';
            cardAtivo.style.filter = 'saturate(0.85)';
            cardAtivo.style.outline = '1px dashed rgba(8, 145, 178, .32)';
            cardAtivo.style.background = 'rgba(236, 254, 255, .55)';
            criarGhost(cardAtivo, event.clientX, event.clientY);
          }
        }, 520);
      });

      handle.addEventListener('pointermove', function (event) {
        if (pointerId !== event.pointerId) return;
        if (!iniciouDrag) return;

        event.preventDefault();
        moverGhost(event.clientX, event.clientY);
        destacarDestino(event.clientX, event.clientY);
        rolarSeNecessario(event.clientY);
      });

      handle.addEventListener('pointerup', function (event) {
        if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }

        if (!state.dragDashboardId || !iniciouDrag) {
          limparDrag();
          return;
        }

        var destino = destacarDestino(event.clientX, event.clientY) || ultimoDestino;

        if (destino && destino.id && destino.id !== state.dragDashboardId) {
          var origem = state.dragDashboardId;
          var idDestino = destino.id;
          var depois = destino.depois;
          limparDrag();
          moverCardDashboardPara(origem, idDestino, depois);
        } else {
          limparDrag();
          render();
        }
      });

      handle.addEventListener('lostpointercapture', function () {
        if (!iniciouDrag) {
          limparDrag();
        }
      });

      handle.addEventListener('pointercancel', function () {
        limparDrag();
      });
    });
  }
  async function iniciar() {
    try {
      state.darkMode = localStorage.getItem('avantalab_mobile_dark') === '1';
      state.dashboardOrdem = normalizarOrdemDashboard(JSON.parse(localStorage.getItem('avantalab_mobile_dashboard_ordem') || '[]'));
      state.dashboardOcultos = normalizarOcultosDashboard(JSON.parse(localStorage.getItem('avantalab_mobile_dashboard_ocultos') || '[]'));
      state.agendaItens = JSON.parse(localStorage.getItem(CHAVE_AGENDA_ITENS) || '[]');
      if (!Array.isArray(state.agendaItens)) state.agendaItens = [];
    } catch (error) {}

    if (window.caches && caches.keys) {
      caches
        .keys()
        .then(function (keys) {
          return Promise.all(
            keys
              .filter(function (key) {
                return key.indexOf('avantalab-mobile-') === 0 && key !== 'avantalab-mobile-v118';
              })
              .map(function (key) {
                return caches.delete(key);
              })
          );
        })
        .catch(function () {});
    }

    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      state.installPrompt = event;
      render();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/mobile-sw.js?v=139').then(function (registro) {
        if (registro && registro.update) registro.update();
      }).catch(function () {});
    }

    configurarPullToRefresh();

    // Ao voltar ao app (apos receber um push), reconfere as nao lidas
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) carregarNotificacoesNaoLidas();
    });

    // Android: ao focar um campo dentro de qualquer modal/formulario, rola
    // ate ele ficar visivel acima do teclado (cobre todos os cards de uma vez).
    // O chat da Ava usa contenteditable, entao nao e afetado por este seletor.
    document.addEventListener('focusin', function (e) {
      // No iOS o Safari ja rola o campo sozinho; nao mexemos pra nao conflitar.
      if (state.isIos) return;
      var el = e.target;
      if (!el || typeof el.matches !== 'function') return;
      if (!el.matches('input, select, textarea')) return;
      if (!(deveBloquearScroll() || state.agendaFormAberto)) return;
      setTimeout(function () {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) {}
      }, 300);
    });

    render();

    try {
      if (deveEncerrarSessaoSalvaMobile()) {
        await db.auth.signOut();
      }

      var sessao = await db.auth.getSession();
      if (sessao.data.session && sessao.data.session.user) {
        state.usuario = sessao.data.session.user;
        state.autenticado = true;
        await carregarEmpresas(state.usuario.id);
        await carregarDados();
      }
      state.pronto = true;
      render();
    } catch (error) {
      state.pronto = true;
      state.erro = 'Nao foi possivel recuperar a sessao. Entre novamente.';
      render();
    }
  }


  function garantirRenderDepoisDaHidratacao() {
    [900, 1800, 3200].forEach(function (tempo) {
      window.setTimeout(function () {
        var textoAtual = root.textContent || '';

        if (state.pronto && textoAtual.indexOf('Preparando acesso') >= 0) {
          render();
        }
      }, tempo);
    });
  }

  function iniciarQuandoPaginaEstiverPronta() {
    var iniciarComAtraso = function () {
      window.setTimeout(function () {
        iniciar();
        garantirRenderDepoisDaHidratacao();
      }, 650);
    };

    if (document.readyState === 'complete') {
      iniciarComAtraso();
    } else {
      window.addEventListener('load', iniciarComAtraso, { once: true });
    }
  }

  iniciarQuandoPaginaEstiverPronta();
})();
