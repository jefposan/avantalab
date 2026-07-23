(function () {
  var root = document.getElementById('mobile-root');
  var config = window.AVANTALAB_MOBILE_CONFIG || {};
  var supabaseGlobal = window.supabase;
  var previaConfirmacaoCelular = new URLSearchParams(window.location.search).get('preview') === 'confirmar-celular';

  if (!root) return;

  // Flag da versão paga (espelha NEXT_PUBLIC_COBRANCA_ATIVA no web).
  var COBRANCA_ATIVA_MOBILE = root.getAttribute('data-cobranca-ativa') === 'true';

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

  var db = supabaseGlobal.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  var CHAVE_ULTIMO_PERFIL_MOBILE = 'avantalab_mobile_ultimo_perfil_id';
  var CHAVE_RASCUNHO_CADASTRO_MOBILE = 'avantalab_mobile_rascunho_cadastro';
  var CHAVE_SISTEMA_INICIAL_MOBILE = 'avantalab_mobile_sistema_inicial_';
  var CHAVE_SISTEMA_SESSAO_MOBILE = 'avantalab_mobile_sistema_sessao_';
  var CHAVE_CONTEXTO_SISTEMA_MOBILE = 'avantalab_mobile_sistema_contexto';
  var CHAVE_ORIGEM_ACESSO_MOBILE = 'avantalab_mobile_origem_acesso';
  var EMAIL_CONTA_REVISAO_APPLE = 'teste@teste.com.br';

  function ehContaRevisaoAppAppleMobile(usuario) {
    return String(usuario && usuario.email || '').trim().toLowerCase() === EMAIL_CONTA_REVISAO_APPLE;
  }

  async function prepararDadosContaRevisaoMobile() {
    if (!ehContaRevisaoAppAppleMobile(state.usuario) || !state.empresa) return;
    var empresaId = state.empresa.id;
    var marcador = await db.from('lancamentos').select('id').eq('empresa_id', empresaId).eq('tipo_obs', 'demo_app_review').limit(1).maybeSingle();
    if (marcador.error || marcador.data) return;
    var agora = new Date();
    var ano = agora.getFullYear();
    var mes = meses[agora.getMonth()];
    var lancamentos = [
      { empresa_id: empresaId, ano: ano, mes: mes, dia: 3, despesa_nome: 'Mercado', descricao: 'Compras do mês', valor: 480, status: 'paga', tipo_obs: 'demo_app_review' },
      { empresa_id: empresaId, ano: ano, mes: mes, dia: 8, despesa_nome: 'Internet', descricao: 'Plano mensal', valor: 120, status: 'paga', tipo_obs: 'demo_app_review' },
      { empresa_id: empresaId, ano: ano, mes: mes, dia: 15, despesa_nome: 'Transporte', descricao: 'Deslocamentos', valor: 210, status: 'paga', tipo_obs: 'demo_app_review' },
      { empresa_id: empresaId, ano: ano, mes: mes, dia: 25, despesa_nome: 'Lazer e consumo', descricao: 'Atividades do mês', valor: 160, status: 'prevista', tipo_obs: 'demo_app_review' }
    ];
    var erroLancamentos = await db.from('lancamentos').insert(lancamentos);
    if (erroLancamentos.error) return;
    var entradas = [
      { empresa_id: empresaId, ano: ano, mes: mes, dia: 5, origem: 'Serviços', valor: 2400, status: 'recebida', tipo_obs: 'demo_app_review', criado_por: state.usuario.id },
      { empresa_id: empresaId, ano: ano, mes: mes, dia: 18, origem: 'Projeto Avanta', valor: 1850, status: 'recebida', tipo_obs: 'demo_app_review', criado_por: state.usuario.id },
      { empresa_id: empresaId, ano: ano, mes: mes, dia: 28, origem: 'Contrato mensal', valor: 1200, status: 'prevista', tipo_obs: 'demo_app_review', criado_por: state.usuario.id }
    ];
    await db.from('faturamentos_entradas').insert(entradas);
    await db.from('faturamentos').upsert({ empresa_id: empresaId, ano: ano, mes: mes, valor: 5450 }, { onConflict: 'empresa_id,ano,mes' });
  }
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
    loginConta: '',
    empresas: [],
    empresa: null,
    // Cobrança (paywall do perfil empresa sem acesso vigente)
    paywallAtivo: false,
    paywallVerificado: false,
    paywallNome: '',
    paywallEstado: null,
    paywallPrecos: null,
    paywallFaturaUrl: '',
    paywallMsg: '',
    paywallCupomMsg: '',
    paywallProcessando: false,
    paywallCupomProcessando: false,
    paywallSelecionando: false,
    paywallCadastroCiclo: '',
    cadastroPerfilStatus: null,
    cadastroPerfilDados: null,
    cadastroPerfilAdiado: false,
    cadastroPerfilEmpresaId: '',
    cadastroPerfilSalvando: false,
    cadastroPerfilVerificado: false,
    cadastroPerfilErro: '',
    cadastroPerfilEditando: false,
    cadastroPerfilRetornoGerenciar: false,
    // Perfil já verificado pelo paywall (evita a tela cheia de carregamento
    // nas recargas de dados) e dia da última carga (só recarrega ao voltar
    // ao app quando o dia virou).
    paywallPerfilVerificado: '',
    diaUltimoCarregamento: '',
    // Premium Pessoal: recurso premium tocado no plano grátis (destaque no modal de upgrade)
    premiumRecursoDestaque: '',
    premiumCupomProcessando: false,
    assinaturaDetalhes: null,
    assinaturaCarregando: false,
    assinaturaAcao: '',
    assinaturaErro: '',
    assinaturaCpf: '',
    assinaturaNome: '',
    assinaturaEmail: '',
    assinaturaTelefone: '',
    assinaturaConfirmarCancelamento: false,
    mes: meses[new Date().getMonth()],
    ano: String(new Date().getFullYear()),
    faturamentos: {},
    lancamentos: [],
    notaArquivoPendente: null,
    notaLendo: false,
    notaBaixando: false,
    notaVisualizandoUrl: '',
    caixinhaMovimentos: [],
    entradas: [],
    despesas: [],
    usuariosEmpresa: [],
    usuariosCarregando: false,
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
    // Falha bloqueante durante a preparação inicial. Mantém uma saída clara
    // para o usuário em vez de deixar a tela de progresso parada.
    falhaAcesso: '',
    preparacaoAcessoInterrompida: false,
    mensagem: '',
    carregando: false,
    loginAcao: '',
    tentativaLogin: 0,
    empresaAcao: '',
    perfilSelecionandoId: '',
    loginValor: '',
    loginTipo: 'email',
    telaAcesso: 'boasVindas',
    modoSenha: false,
    modoCadastro: false,
    smsSenhaEnviado: false,
    smsCadastroEnviado: false,
    aceitouTermos: false,
    aceiteTermosEm: null,
    cadastroDdi: '55',
    cadastroCupom: '',
    inicioEmpresaModo: 'trial',
    mostrarSenhaLogin: false,
    mostrarNovaSenha: false,
    mostrarConfirmarSenha: false,
    mostrarSenhaCadastro: false,
    mostrarConfirmarSenhaCadastro: false,
    loginRecuperacao: '',
    telefoneCadastroConfirmado: '',
    validacaoTelefoneObrigatoria: false,
    telefoneObrigatorio: '',
    ddiTelefoneObrigatorio: '55',
    telefoneObrigatorioConfirmado: '',
    codigoTelefoneObrigatorio: '',
    smsTelefoneObrigatorioEnviado: false,
    validandoTelefoneObrigatorio: false,
    cadastro: {
      nome: '',
      nomeEmpresa: '',
      email: '',
      telefone: '',
      senha: '',
      confirmarSenha: '',
    },
    visao: 'home',
    busca: '',
    modalLancamento: false,
    modalAcao: null,
    exclusaoRecorrencia: null,
    caixinhaResetConfirmacao: false,
    tipoLancamento: 'despesa',
    modoReceita: 'entrada',
    despesaDia: '',
    despesaDiaAutoHoje: false,
    despesaNome: '',
    despesaDescricao: '',
    despesaValor: '',
    entradaDia: '',
    entradaDiaAutoHoje: false,
    entradaOrigem: '',
    entradaValor: '',
    receitaTotal: '',
    menuAberto: false,
    menuConfigAberto: false,
    menuConfigAnimacao: '',
    menuAnimacao: '',
    modalMenu: '',
    modalMenuRetorno: '',
    changelog: null,
    changelogCarregando: false,
    darkMode: false,
    notificacoesAtivas: false,
    installPrompt: null,
    isIos: /iphone|ipad|ipod/i.test(navigator.userAgent),
    novaCategoriaNome: '',
    novaCategoriaTipo: '',
    novaDespesaAberta: false,
    novaDespesaNome: '',
    novaDespesaCategoria: '',
    categoriasExpandido: false,
    tipoDespesaDetalhe: '',
    tiposDespesaExpandido: false,
    ultimasDespesasExpandido: false,
    ultimasReceitasExpandido: false,
    ultimasDespesasBuscaAberta: false,
    ultimasReceitasBuscaAberta: false,
    ultimasDespesasBusca: '',
    ultimasReceitasBusca: '',
    dashboardOrdem: ordemDashboardPadrao(),
    dashboardOcultos: [],
    dashboardOpcoesId: '',
    dashboardOpcoesPos: null,
    dashboardValoresVisiveis: {},
    resumoPerfis: [],
    resumoPerfisCarregando: false,
    resumoPerfisSolicitacao: 0,
    resumoPerfilDestaqueId: '',
    resumoPerfilExibidoId: '',
    meusPerfisExpandido: false,
    caixinhaDia: String(new Date().getDate()),
    caixinhaDescricao: 'Reserva',
    caixinhaValor: '',
    caixinhaSaldoInicialValor: '',
    caixinhaSalvando: false,
    caixinhaSaldoInicialSalvando: false,
    iniciarValoresOcultos: true,
    pontoModuloAtivo: false,
    vendasMobileModuloAtivo: false,
    vendasMobileModuloVerificando: false,
    // Resultado da validação feita antes do seletor de sistemas. É consumido
    // pela primeira carga do Gestão para não repetir as mesmas RPCs.
    preparacaoSistemaVendas: null,
    seletorSistemaAberto: false,
    seletorSistemaInicialBloqueante: false,
    ativacaoVendasMobileAberta: false,
    ativacaoVendasMobileCarregando: false,
    ativacaoVendasMobileErro: '',
    lembrarSistemaInicial: false,
    sistemaInicialAvaliadoPerfilId: '',
    pontoResumo: [],
    pontoFuncionariosHoje: 0,
    pontoResumoCarregando: false,
    pontoRelatorioUsuarioId: '',
    pontoRelatorioNome: '',
    pontoRelatorioRegistros: [],
    pontoRelatorioCarregando: false,
    atalhoInferiorEsquerdo: 'perfil',
    atalhoInferiorDireito: 'agenda',
    dragDashboardId: '',
    evolucaoSelecionada: {},
    evolucaoSelecionadaMes: {},
    sobreAbertos: {},
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
    criarPerfilErro: '',
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
    novaRecorrMesesFrente: 1,
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
    agendaAnimar: null,
    agendaItens: [],
    notificacoesNaoLidas: 0,
    notificacoesLista: [],
    notificacoesCarregando: false,
    mostrarPromptNotificacoes: false,
    tourAberto: false,
    tourPasso: 0,
    avisoAssinanteAberto: false,
    avisoAssinanteTitulo: '',
    avisoAssinanteMensagem: '',
    duplicadoConfirmacaoAberta: false,
    agendaTipoItem: 'lembrete',
    agendaTitulo: '',
    agendaDescricao: '',
    agendaRepetir: false,
    agendaRepeticao: 'mensal',
  };
  var temporizadorLiberacaoAcessoMobile = null;

  function restaurarRascunhoCadastroMobile() {
    try {
      var rascunho = JSON.parse(sessionStorage.getItem(CHAVE_RASCUNHO_CADASTRO_MOBILE) || 'null');
      if (!rascunho || typeof rascunho !== 'object') return;
      var dadosCadastro = rascunho.cadastro || {};
      state.cadastro.nome = String(dadosCadastro.nome || '');
      state.cadastro.nomeEmpresa = String(dadosCadastro.nomeEmpresa || '');
      state.cadastro.email = String(dadosCadastro.email || '');
      state.cadastro.telefone = String(dadosCadastro.telefone || '');
      state.cadastroDdi = String(rascunho.ddi || state.cadastroDdi).replace(/\D/g, '') || '55';
      state.cadastroCupom = String(rascunho.cupom || '');
      state.cadastroTipoPerfil = normalizarTipoPerfil(rascunho.tipoPerfil);
      state.aceitouTermos = !!rascunho.aceitouTermos;
    } catch (error) {}
  }

  function salvarRascunhoCadastroMobile() {
    try {
      sessionStorage.setItem(CHAVE_RASCUNHO_CADASTRO_MOBILE, JSON.stringify({
        cadastro: {
          nome: state.cadastro.nome,
          nomeEmpresa: state.cadastro.nomeEmpresa,
          email: state.cadastro.email,
          telefone: state.cadastro.telefone,
        },
        ddi: state.cadastroDdi,
        cupom: state.cadastroCupom,
        tipoPerfil: state.cadastroTipoPerfil,
        aceitouTermos: state.aceitouTermos,
      }));
    } catch (error) {}
  }

  function limparRascunhoCadastroMobile() {
    try { sessionStorage.removeItem(CHAVE_RASCUNHO_CADASTRO_MOBILE); } catch (error) {}
  }

  restaurarRascunhoCadastroMobile();

  var CHAVE_MANTER_CONECTADO_ATE = 'avantalab_mobile_manter_conectado_ate';
  var CHAVE_SESSAO_TEMPORARIA = 'avantalab_mobile_sessao_temporaria';
  var CHAVE_OAUTH_TEMPORARIO_ATE = 'avantalab_mobile_oauth_temporario_ate';
  var CHAVE_AGENDA_ITENS = 'avantalab_mobile_agenda_itens';
  var CHAVE_PROMPT_NOTIF = 'avantalab_mobile_prompt_notif';
  var CHAVE_ATALHOS_INFERIORES = 'avantalab_mobile_atalhos_inferiores';
  var CHAVE_INICIAR_VALORES_OCULTOS = 'avantalab_mobile_iniciar_valores_ocultos';
  var TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;
  var DEZ_MINUTOS_MS = 10 * 60 * 1000;
  var CARDS_COM_VALORES = ['saldo', 'caixinha', 'totais', 'categorias', 'tipos', 'meusPerfis'];

  // --- Helpers de tipo de perfil ---
  var CATEGORIAS_EMPRESA_MOBILE = [
    { nome: 'Amortizacao', descricao: 'Custos nao fisicos.', exemplos: 'Softwares, patente.' },
    { nome: 'Custos variaveis', descricao: 'Variam com venda/producao.', exemplos: 'Embalagem, materia-prima, frete, comissao.' },
    { nome: 'Depreciacao', descricao: 'Uso/desgaste de bens fisicos.', exemplos: 'Maquinas, veiculos, equipamentos.' },
    { nome: 'Despesas financeiras', descricao: 'Bancos, juros e operacoes.', exemplos: 'Juros, tarifas, taxas, cambio.' },
    { nome: 'Despesas operacionais', descricao: 'Mantem o negocio funcionando.', exemplos: 'Aluguel, agua, luz, salarios, manutencao, pro-labore, publicidade.' },
    { nome: 'Imposto sobre lucro', descricao: 'Tributos sobre lucro.', exemplos: 'IR e CSLL.' },
  ];

  var CATEGORIAS_PESSOAL_MOBILE = [
    { nome: 'Moradia', descricao: 'Gastos com sua casa ou local onde mora.', exemplos: 'Aluguel, condominio, financiamento, manutencao.' },
    { nome: 'Custos de vida', descricao: 'Despesas essenciais do dia a dia.', exemplos: 'Mercado, agua, luz, internet, transporte, saude, educacao.' },
    { nome: 'Lazer e consumo', descricao: 'Gastos nao essenciais e experiencias.', exemplos: 'Restaurantes, viagens, compras, assinaturas, presentes.' },
    { nome: 'Financeiro e impostos', descricao: 'Custos financeiros e obrigacoes.', exemplos: 'Tarifas bancarias, juros, cartao, seguros, impostos, multas.' },
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
    return normalizarTipoPerfil(tipoPerfil) === 'pessoal' ? 'Nome do perfil' : 'Nome fantasia';
  }

  function placeholderNomePerfil(tipoPerfil) {
    return normalizarTipoPerfil(tipoPerfil) === 'pessoal' ? 'Ex: Minha vida financeira' : 'Ex: Avanta Comercio';
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
    var limpo = String(texto || '').trim().replace(/\s+/g, ' ');
    if (!limpo) return '';

    var siglas = {
      cnpj: 'CNPJ',
      cofins: 'COFINS',
      cpf: 'CPF',
      csll: 'CSLL',
      darf: 'DARF',
      doc: 'DOC',
      fgts: 'FGTS',
      gps: 'GPS',
      icms: 'ICMS',
      inss: 'INSS',
      iptu: 'IPTU',
      ir: 'IR',
      irpf: 'IRPF',
      irpj: 'IRPJ',
      iss: 'ISS',
      issqn: 'ISSQN',
      mei: 'MEI',
      nf: 'NF',
      nfe: 'NF-e',
      'nf-e': 'NF-e',
      nfse: 'NFS-e',
      'nfs-e': 'NFS-e',
      pis: 'PIS',
      pix: 'PIX',
      ted: 'TED',
    };
    var especiais = {
      esocial: 'eSocial',
      ifood: 'iFood',
      mcdonalds: "McDonald's",
      "mcdonald's": "McDonald's",
      netflix: 'Netflix',
      nubank: 'Nubank',
      picpay: 'PicPay',
      prolabore: 'Pró-labore',
      'pro-labore': 'Pró-labore',
      youtube: 'YouTube',
    };
    var conectivos = {
      a: true,
      ao: true,
      aos: true,
      as: true,
      com: true,
      da: true,
      das: true,
      de: true,
      do: true,
      dos: true,
      e: true,
      em: true,
      na: true,
      nas: true,
      no: true,
      nos: true,
      o: true,
      os: true,
      para: true,
      por: true,
      sem: true,
    };
    var semAcento = function (valor) {
      return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };
    var capitalizar = function (valor) {
      return String(valor || '').toLocaleLowerCase('pt-BR').split('-').map(function (parte) {
        return parte ? parte.charAt(0).toLocaleUpperCase('pt-BR') + parte.slice(1) : parte;
      }).join('-');
    };
    var contextoFiscal = limpo.split(' ').some(function (palavra) {
      var chave = semAcento(palavra).toLocaleLowerCase('pt-BR');
      return ['guia', 'imposto', 'mei', 'nacional', 'receita', 'simples', 'tributo', 'tributos'].indexOf(chave) >= 0;
    });

    return limpo.split(' ').map(function (palavra, indice) {
      var partes = palavra.match(/^([^A-Za-zÀ-ÖØ-öø-ÿ0-9]*)(.*?)([^A-Za-zÀ-ÖØ-öø-ÿ0-9]*)$/);
      if (!partes) return palavra;

      var prefixo = partes[1];
      var miolo = partes[2];
      var sufixo = partes[3];
      if (!miolo) return palavra;

      var chave = semAcento(miolo).toLocaleLowerCase('pt-BR');
      var originalMaiusculo = miolo === miolo.toLocaleUpperCase('pt-BR') && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(miolo);

      if (chave === 'das' && (originalMaiusculo || contextoFiscal)) return prefixo + 'DAS' + sufixo;
      if (siglas[chave]) return prefixo + siglas[chave] + sufixo;
      if (especiais[chave]) return prefixo + especiais[chave] + sufixo;
      if (/[a-zà-öø-ÿ][A-ZÀ-ÖØ-Þ]/.test(miolo)) return palavra;
      if (indice > 0 && conectivos[chave]) return prefixo + chave + sufixo;

      return prefixo + capitalizar(miolo) + sufixo;
    }).join(' ');
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

  function renovarSessaoPersistenteMobile() {
    if (!sessaoPersistenteValidaMobile()) return;
    try {
      localStorage.setItem(CHAVE_MANTER_CONECTADO_ATE, String(Date.now() + TRINTA_DIAS_MS));
      state.manterConectado = true;
    } catch (error) {}
  }

  db.auth.onAuthStateChange(function (evento, sessao) {
    if (sessao && (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED')) {
      renovarSessaoPersistenteMobile();
    } else if (evento === 'SIGNED_OUT' && state.pronto) {
      window.location.replace('/?entrar=1');
    }
  });

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

      // Sem marcador customizado, respeita a sessao valida persistida pelo Supabase.
      return false;
    } catch (error) {
      return false;
    }
  }

  async function consultaMobileComRetry(executar) {
    var ultimaResposta = null;
    for (var tentativa = 0; tentativa < 3; tentativa++) {
      try {
        ultimaResposta = await promessaMobileComPrazo(
          Promise.resolve().then(executar),
          7000,
          'A consulta de acesso demorou mais que o esperado.'
        );
      } catch (error) {
        ultimaResposta = { data: null, error: error };
      }
      if (ultimaResposta && !ultimaResposta.error) return ultimaResposta;
      await new Promise(function (resolve) {
        window.setTimeout(resolve, 300 * (tentativa + 1));
      });
    }
    return ultimaResposta;
  }

  function promessaMobileComPrazo(promessa, limiteMs, mensagem) {
    var temporizador = null;
    return Promise.race([
      Promise.resolve(promessa),
      new Promise(function (_, rejeitar) {
        temporizador = window.setTimeout(function () {
          var erro = new Error(mensagem || 'A conexão demorou mais que o esperado.');
          erro.codigo = 'AVANTALAB_TIMEOUT';
          rejeitar(erro);
        }, limiteMs || 12000);
      }),
    ]).finally(function () {
      if (temporizador) window.clearTimeout(temporizador);
    });
  }

  function exibirFalhaDeAcessoMobile(texto) {
    state.carregando = false;
    state.pronto = true;
    state.falhaAcesso = texto || 'Não foi possível concluir a preparação do acesso. Confira sua internet e tente novamente.';
    render();
  }

  async function requisitarJsonMobile(url, opcoes, limiteMs) {
    var controlador = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var temporizador = controlador
      ? window.setTimeout(function () { controlador.abort(); }, limiteMs || 9000)
      : null;
    try {
      var configuracao = Object.assign({}, opcoes || {});
      if (controlador) configuracao.signal = controlador.signal;
      var resposta = await fetch(url, configuracao);
      var json = await resposta.json();
      return { resposta: resposta, json: json };
    } finally {
      if (temporizador) window.clearTimeout(temporizador);
    }
  }

  async function requisitarJsonMobileComRetry(url, opcoes) {
    var ultimoErro = null;
    for (var tentativa = 0; tentativa < 2; tentativa++) {
      try {
        return await requisitarJsonMobile(url, opcoes, 9000);
      } catch (error) {
        ultimoErro = error;
        if (tentativa === 0) {
          await new Promise(function (resolver) { window.setTimeout(resolver, 350); });
        }
      }
    }
    throw ultimoErro || new Error('Não foi possível concluir a conexão.');
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

  var APP_VERSION = root.getAttribute('data-app-version') || '1.3.6';
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

  function emailUsuarioAtualMobile() {
    return (state.usuario && state.usuario.email) || state.cadastro.email || '';
  }

  function telefonePadraoMobile() {
    return (state.empresa && state.empresa.telefone) || state.cadastro.telefone || state.telefoneObrigatorio || '';
  }

  // ── Cobrança: paywall do perfil empresa sem acesso vigente ───
  function telaPaywallSelecaoMobile() {
    var itens = (state.empresas || []).map(function (emp) {
      var atual = state.empresa && state.empresa.id === emp.id;
      return (
        '<button type="button" onclick="window._avaPaywallEscolher(\'' + emp.id + '\')" class="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ' + (atual ? 'border-sky-600 bg-sky-50' : 'border-slate-200 bg-white active:scale-[0.99]') + '">' +
          '<span class="min-w-0"><span class="block truncate text-sm font-black text-slate-900">' + escapeHtml(nomeEmpresa(emp)) + '</span>' +
          '<span class="block text-[11px] font-bold uppercase tracking-wide text-slate-400">' + escapeHtml(normalizarTipoPerfil(emp.tipo_perfil) === 'pessoal' ? 'Pessoal' : 'Empresa') + '</span></span>' +
          (atual ? '<span class="shrink-0 text-[10px] font-black uppercase text-sky-700">Atual</span>' : '') +
        '</button>'
      );
    }).join('');
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex items-start justify-center overflow-auto px-4 py-8" style="min-height:100dvh;">' +
        '<div class="w-full max-w-md rounded-3xl border border-white/40 bg-white/85 p-5 text-slate-900 shadow-2xl backdrop-blur-xl">' +
          '<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Perfis</p>' +
          '<h1 class="mt-1 text-xl font-black">Selecione um perfil</h1>' +
          '<div class="mt-4 grid gap-2">' + itens + '</div>' +
          '<button type="button" onclick="window._avaPaywallVoltarSelecao()" class="mt-5 h-12 w-full rounded-xl border border-slate-300 bg-white text-xs font-black uppercase tracking-wide text-slate-700 active:scale-[0.98]">Voltar</button>' +
        '</div>' +
      '</section>'
    );
  }

  function telaPaywallMobile() {
    if (state.paywallSelecionando) return telaPaywallSelecaoMobile();
    var precos = state.paywallPrecos || { empresa: { mensal: 34.9, anual: 348 } };
    var mensal = (precos.empresa && precos.empresa.mensal) || 34.9;
    var anualAno = (precos.empresa && precos.empresa.anual) || 348;
    var anualMes = anualAno / 12;
    function brl(v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }
    var nome = state.paywallNome ? escapeHtml(state.paywallNome) : 'Este perfil';
    var temTrocar = (state.empresas && state.empresas.length > 1);
    var estado = state.paywallEstado || {};
    var trialVencido = (estado.status === 'trial' || estado.status === 'expirada') && estado.trialFim && new Date(estado.trialFim).getTime() <= Date.now();
    var tituloBloqueio = trialVencido
      ? 'Seu teste de 7 dias terminou'
      : estado.status === 'inadimplente'
        ? 'H&aacute; um pagamento pendente'
        : estado.status === 'cancelada'
          ? 'Sua assinatura foi cancelada'
          : estado.status === 'expirada'
            ? 'Este perfil aguarda uma assinatura ativa'
            : 'Este perfil precisa de uma assinatura ativa';
    var textoBloqueio = trialVencido
      ? 'Assine para continuar. Seus dados permanecem guardados.'
      : estado.status === 'inadimplente'
        ? 'Regularize o pagamento para liberar novamente o acesso ao perfil.'
        : 'Escolha um plano para ativar o perfil. Seus dados permanecem guardados.';
    var faturaUrl = state.paywallFaturaUrl || '';
    var blocoCobranca = faturaUrl
      ? '<div class="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 shadow-sm">' +
          '<p class="text-xs font-black text-slate-900">Cobrança disponível</p>' +
          '<p class="mt-1 text-[10px] font-semibold leading-relaxed text-slate-600">Já existe uma cobrança pendente para este perfil.</p>' +
          '<button type="button" onclick="window._avaPaywallPagarCobranca()" class="mt-2 h-8 w-full rounded-lg bg-sky-700 text-[10px] font-black uppercase tracking-wide text-white active:scale-[0.98]">Pagar cobrança</button>' +
        '</div>'
      : '<div class="mt-2 grid grid-cols-2 gap-1.5">' +
          '<input id="paywall-nome" type="text" placeholder="Nome ou razão social" value="' + escapeHtml(state.paywallNome || '') + '" class="h-8 rounded-lg border border-slate-300 bg-white/90 px-2 text-[11px] font-semibold text-slate-800 outline-none" />' +
          '<input id="paywall-cpf" type="text" inputmode="numeric" placeholder="CPF/CNPJ" class="h-8 rounded-lg border border-slate-300 bg-white/90 px-2 text-[11px] font-semibold text-slate-800 outline-none" />' +
          '<input id="paywall-email" type="email" placeholder="E-mail cobrança" value="' + escapeHtml(emailUsuarioAtualMobile()) + '" class="h-8 rounded-lg border border-slate-300 bg-white/90 px-2 text-[11px] font-semibold text-slate-800 outline-none" />' +
          '<input id="paywall-telefone" type="tel" inputmode="tel" placeholder="Telefone" value="' + escapeHtml(telefonePadraoMobile()) + '" class="h-8 rounded-lg border border-slate-300 bg-white/90 px-2 text-[11px] font-semibold text-slate-800 outline-none" />' +
        '</div>' +
        '<div class="mt-2 grid grid-cols-2 gap-2">' +
          '<div class="rounded-xl border border-slate-200 bg-white/80 p-2.5">' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Mensal</p>' +
            '<p class="mt-0.5 text-base font-black">' + brl(mensal) + '<span class="text-[10px] font-bold text-slate-500">/mês</span></p>' +
            '<button type="button" onclick="window._avaPaywallEscolherPlano(\'mensal\')" class="mt-1.5 h-8 w-full rounded-lg border border-slate-300 bg-white text-[9px] font-black uppercase tracking-wide text-slate-700 active:scale-[0.98] active:bg-sky-700 active:text-white">Continuar mensal</button>' +
          '</div>' +
          '<div class="rounded-xl border-2 border-sky-600 bg-white/85 p-2.5">' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Anual</p>' +
            '<p class="mt-0.5 text-base font-black">' + brl(anualMes) + '<span class="text-[10px] font-bold text-slate-500">/mês</span></p>' +
            '<p class="text-[9px] font-semibold text-slate-500">' + brl(anualAno) + '/ano</p>' +
            '<button type="button" onclick="window._avaPaywallEscolherPlano(\'anual\')" class="mt-1.5 h-8 w-full rounded-lg bg-sky-700 text-[9px] font-black uppercase tracking-wide text-white active:scale-[0.98]">Continuar anual</button>' +
          '</div>' +
        '</div>';
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex flex-col items-center overflow-x-hidden overflow-y-auto px-4 pb-4" style="height:100dvh;padding-top:clamp(6.5rem,14dvh,9rem);background-position:center bottom;background-size:auto 108%;overscroll-behavior:contain;--avantalab-mobile-bg-overlay:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0));">' +
        '<div class="mx-auto w-full max-w-md shrink-0 overflow-y-auto rounded-3xl border border-white/40 bg-white/85 p-3.5 text-slate-900 shadow-2xl backdrop-blur-xl" style="max-height:calc(100dvh - 7.5rem);overscroll-behavior:contain;">' +
          '<p class="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">Assinatura</p>' +
          '<h1 class="mt-0.5 text-base font-black leading-tight">' + tituloBloqueio + '</h1>' +
          // Perfil bloqueado — destaque forte
          '<div class="mt-1.5 rounded-xl border-2 border-sky-400 px-3 py-1.5 text-center shadow-md" style="background:linear-gradient(135deg,#003E73,#00A6C8);">' +
            '<span class="block text-[9px] font-black uppercase tracking-[0.22em] text-white/80">Perfil bloqueado</span>' +
            '<span class="mt-0.5 block truncate text-base font-black text-white">' + nome + '</span>' +
          '</div>' +
          '<p class="mt-1.5 text-[11px] font-semibold leading-snug text-slate-600">' + textoBloqueio + '</p>' +
          '<p id="paywall-msg" class="mt-1.5 text-xs font-bold text-red-600"></p>' +
          '<button type="button" onclick="window._avaPaywallAtualizar()" class="mt-1.5 h-7 w-full rounded-lg border border-sky-200 bg-sky-50 text-[9px] font-black uppercase text-sky-700">Ja paguei - atualizar</button>' +
          blocoCobranca +
          '<div class="mt-2.5 border-t border-slate-200 pt-2">' +
            '<label class="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Tem um cupom?</label>' +
            '<div class="flex gap-2">' +
              '<input id="paywall-cupom" type="text" placeholder="Código" class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white/90 px-3 py-1.5 text-sm font-semibold uppercase text-slate-800 outline-none" />' +
              '<button type="button" onclick="window._avaPaywallCupom()" class="shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-black uppercase text-slate-700 active:scale-[0.98]">Aplicar</button>' +
            '</div>' +
            '<p id="paywall-cupom-msg" class="mt-1.5 text-[11px] font-bold text-red-600"></p>' +
          '</div>' +
          // Rodapé com botões estruturados — três na mesma linha, com cor
          '<div class="mt-2.5 flex gap-2 border-t border-slate-200 pt-2">' +
            (temTrocar ? '<button type="button" onclick="window._avaPaywallTrocar()" class="h-7 flex-1 rounded-lg border border-sky-300 bg-sky-50 px-1 text-[9px] font-black uppercase tracking-wide text-sky-700 shadow-sm active:scale-[0.98] active:bg-sky-700 active:text-white">Trocar</button>' : '') +
            '<button type="button" onclick="window._avaPaywallCriar()" class="h-7 flex-1 rounded-lg border border-sky-300 bg-sky-50 px-1 text-[9px] font-black uppercase tracking-wide text-sky-700 shadow-sm active:scale-[0.98] active:bg-sky-700 active:text-white">Criar</button>' +
            '<button type="button" onclick="window._avaPaywallSair()" class="h-7 flex-1 rounded-lg border border-red-200 bg-red-50 px-1 text-[9px] font-black uppercase tracking-wide text-red-600 shadow-sm active:scale-[0.98] active:bg-red-600 active:text-white">Sair</button>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function deveExibirCadastroPerfilMobile() {
    if (ehContaRevisaoAppAppleMobile(state.usuario)) return false;
    var status = state.cadastroPerfilStatus;
    return !!(status && !status.completo && (status.obrigatorio || !state.cadastroPerfilAdiado));
  }

  function telaErroCadastroPerfilMobile() {
    return telaLoginWrapper(
      '<div class="px-5 py-6 text-center">' +
        '<h2 class="text-base font-black text-slate-900">Não foi possível verificar o cadastro</h2>' +
        '<p class="mt-2 text-sm font-semibold leading-relaxed text-slate-600">' + escapeHtml(state.cadastroPerfilErro || 'Confira sua conexão e tente novamente.') + '</p>' +
        '<button id="cp-tentar-novamente" type="button" class="mt-4 h-10 rounded-xl bg-[#003E73] px-5 text-xs font-black uppercase tracking-wide text-white">Tentar novamente</button>' +
      '</div>',
      'AvantaLab Gestão',
      ''
    );
  }

  function opcoesCadastroMobile(opcoes, atual) {
    return '<option value="">Selecione</option>' + opcoes.map(function (item) {
      return '<option value="' + item[0] + '"' + (item[0] === atual ? ' selected' : '') + '>' + item[1] + '</option>';
    }).join('');
  }

  function telaCadastroPerfilMobile(contexto) {
    var status = state.cadastroPerfilStatus || {};
    var d = state.cadastroPerfilDados || {};
    var pessoal = status.tipoPerfil === 'pessoal';
    var autonomo = d.tipo_empresa === 'autonomo';
    var podeEditar = status.podeEditar === true;
    var titulo = contexto === 'edicao'
      ? 'Editar dados cadastrais'
      : contexto === 'lembrete'
      ? 'Complete o cadastro do perfil'
      : contexto === 'paywall'
        ? 'Dados para cadastro e assinatura'
        : 'Complete seu cadastro para continuar o uso do sistema AvantaLab Gest&atilde;o';
    var tipos = [['autonomo','Aut&ocirc;nomo'],['mei','MEI'],['me','ME'],['epp','EPP'],['ltda','LTDA'],['sa','S/A'],['associacao','Associa&ccedil;&atilde;o'],['cooperativa','Cooperativa'],['outro','Outro Segmento']];
    var regimes = [['mei_simei','MEI / SIMEI'],['simples_nacional','Simples Nacional'],['lucro_presumido','Lucro Presumido'],['lucro_real','Lucro Real'],['lucro_arbitrado','Lucro Arbitrado'],['imune','Imune'],['isenta','Isenta'],['nao_aplicavel','N&atilde;o se aplica'],['outro','Outro']];
    var ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
    var campo = function (id, rotulo, valor, tipo, extra) {
      return '<label class="grid gap-1 text-[10px] font-black text-slate-600">' + rotulo + '<input id="' + id + '" type="' + (tipo || 'text') + '" value="' + escapeHtml(valor || '') + '" ' + (extra || '') + ' style="font-size:16px" class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-600" /></label>';
    };
    var formulario = !podeEditar
      ? '<div class="py-10 text-center"><p class="font-black">Cadastro pendente</p><p class="mt-2 text-sm text-slate-600">O cadastro deste perfil precisa ser conclu&iacute;do por um Gestor Master ou Administrador para continuar.</p></div>'
      : '<div class="grid gap-4">' +
          '<div><h3 class="mb-2 border-b border-slate-200 pb-1 text-[11px] font-black uppercase text-sky-800">Dados Gerais</h3><div class="grid gap-2">' +
            campo('cp-nome-fantasia', pessoal ? 'Nome do perfil' : 'Nome Fantasia', d.nome_fantasia) +
            campo('cp-responsavel', pessoal ? 'Nome completo' : 'Respons&aacute;vel', d.nome_responsavel) +
            (!pessoal ? campo('cp-razao-social', 'Raz&atilde;o Social', d.razao_social) + '<label class="grid gap-1 text-[10px] font-black text-slate-600">Tipo de Empresa<select id="cp-tipo-empresa" class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800">' + opcoesCadastroMobile(tipos, d.tipo_empresa) + '</select></label>' : '') +
            campo('cp-documento', pessoal || autonomo ? 'CPF' : 'CNPJ', d.documento, 'text', 'inputmode="numeric"') +
          '</div></div>' +
          '<div><h3 class="mb-2 border-b border-slate-200 pb-1 text-[11px] font-black uppercase text-sky-800">Endere&ccedil;o</h3><div class="grid gap-2">' +
            '<label class="grid gap-1 text-[10px] font-black text-slate-600">CEP<span class="flex gap-1"><input id="cp-cep" inputmode="numeric" value="' + escapeHtml(d.cep || '') + '" style="font-size:16px" class="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm"/><button id="cp-buscar-cep" type="button" class="h-9 rounded-lg bg-sky-700 px-3 text-[10px] font-black text-white">Buscar</button></span></label>' +
            campo('cp-rua', 'Rua', d.rua) + campo('cp-numero', 'N&uacute;mero', d.numero) + campo('cp-complemento', 'Complemento (opcional)', d.complemento) + campo('cp-bairro', 'Bairro', d.bairro) + campo('cp-cidade', 'Cidade', d.cidade) +
            '<label class="grid gap-1 text-[10px] font-black text-slate-600">Estado<select id="cp-estado" class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">UF</option>' + ufs.map(function (uf) { return '<option' + (uf === d.estado ? ' selected' : '') + '>' + uf + '</option>'; }).join('') + '</select></label>' +
          '</div></div>' +
          '<div><h3 class="mb-2 border-b border-slate-200 pb-1 text-[11px] font-black uppercase text-sky-800">Contato</h3><div class="grid gap-2">' +
            campo('cp-telefone', 'Telefone', d.telefone, 'tel', 'inputmode="tel"') + campo('cp-whatsapp', 'WhatsApp', d.whatsapp, 'tel', 'inputmode="tel"') + campo('cp-email', pessoal ? 'E-mail' : 'E-mail da empresa', d.email_empresa, 'email') + campo('cp-site', 'Site (opcional)', d.site) + campo('cp-instagram', 'Instagram (opcional)', d.instagram) +
          '</div></div>' +
          (!pessoal ? '<div><h3 class="mb-2 border-b border-slate-200 pb-1 text-[11px] font-black uppercase text-sky-800">Dados Fiscais</h3><div class="grid gap-2">' +
            campo('cp-ie', 'Inscri&ccedil;&atilde;o Estadual', d.inscricao_estadual, 'text', d.inscricao_estadual_isento ? 'disabled' : '') + '<label class="flex items-center gap-2 text-xs font-bold text-slate-600"><input id="cp-ie-isento" type="checkbox"' + (d.inscricao_estadual_isento ? ' checked' : '') + '/> Isento</label>' +
            campo('cp-im', 'Inscri&ccedil;&atilde;o Municipal', d.inscricao_municipal, 'text', d.inscricao_municipal_isento ? 'disabled' : '') + '<label class="flex items-center gap-2 text-xs font-bold text-slate-600"><input id="cp-im-isento" type="checkbox"' + (d.inscricao_municipal_isento ? ' checked' : '') + '/> Isento</label>' +
            '<label class="grid gap-1 text-[10px] font-black text-slate-600">Regime Tribut&aacute;rio<select id="cp-regime" class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm">' + opcoesCadastroMobile(regimes, d.regime_tributario) + '</select></label>' +
          '</div></div>' : '') +
        '</div>';
    return '<section class="avantalab-mobile-bg fixed inset-0 z-[12000] flex items-start justify-center overflow-y-auto bg-black/85 px-3 py-4">' +
      '<div class="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white text-slate-900 shadow-2xl">' +
        '<header class="flex shrink-0 items-start gap-3 bg-[#003E73] px-4 py-3 text-white"><div class="min-w-0 flex-1"><p class="text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">Cadastro do perfil</p><h2 class="mt-0.5 text-base font-black leading-tight">' + titulo + '</h2>' + (contexto === 'lembrete' ? '<p class="mt-1 text-[11px] text-white/80">Faltam ' + Number(status.diasRestantes || 0) + ' dias para se tornar obrigat&oacute;rio.</p>' : '') + '</div>' + (contexto === 'edicao' ? '<button id="cp-fechar-edicao" type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition active:scale-95" aria-label="Fechar">' + iconeFecharGeometricoMobile() + '</button>' : '') + '</header>' +
        '<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">' + formulario + '<p id="cp-erro" class="mt-3 text-xs font-bold text-red-600"></p><p id="cp-autosave-status" class="mt-2 text-[10px] font-bold text-slate-500"></p></div>' +
        '<footer class="' + (contexto === 'lembrete' ? 'grid grid-cols-3' : 'flex justify-end') + ' shrink-0 gap-1.5 border-t border-slate-200 bg-slate-50 px-4 py-3">' +
          (contexto === 'lembrete' ? '<button id="cp-depois" type="button" class="h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-1 text-[10px] font-bold text-slate-600 transition active:scale-95">Lembrar depois</button><button id="cp-salvar-parcial" type="button" class="h-9 min-w-0 rounded-lg border border-sky-200 bg-sky-50 px-1 text-[10px] font-black text-sky-800 transition active:scale-95">Salvar inclusões</button>' : '') +
          (contexto === 'paywall' ? '<button id="cp-voltar" type="button" class="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-600">Voltar aos planos</button>' : '') +
          (contexto === 'edicao' ? '<button id="cp-cancelar-edicao" type="button" class="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-600 transition active:scale-95">Cancelar</button>' : '') +
          (podeEditar ? '<button id="cp-salvar" type="button" class="h-9 min-w-0 rounded-lg bg-[#003E73] ' + (contexto === 'lembrete' ? 'px-1 text-[10px]' : 'px-5 text-xs') + ' font-black text-white transition active:scale-95">' + (contexto === 'paywall' ? 'Salvar e continuar' : (contexto === 'edicao' ? 'Salvar alterações' : 'Concluir cadastro')) + '</button>' : '') +
        '</footer>' +
      '</div></section>';
  }

  async function _avaPaywallToken() {
    var sessao = await db.auth.getSession();
    return sessao && sessao.data && sessao.data.session ? sessao.data.session.access_token : '';
  }

  window._avaPaywallEscolherPlano = function (ciclo) {
    state.paywallCadastroCiclo = ciclo === 'anual' ? 'anual' : 'mensal';
    render();
  };

  function capturarCadastroPerfilMobile() {
    var d = Object.assign({}, state.cadastroPerfilDados || {});
    var valor = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
    var marcado = function (id) { var el = document.getElementById(id); return !!(el && el.checked); };
    d.nome_fantasia = valor('cp-nome-fantasia');
    d.nome_responsavel = valor('cp-responsavel');
    d.razao_social = valor('cp-razao-social');
    d.tipo_empresa = valor('cp-tipo-empresa');
    d.documento = valor('cp-documento').replace(/\D/g, '');
    d.cep = valor('cp-cep').replace(/\D/g, '');
    d.rua = valor('cp-rua'); d.numero = valor('cp-numero'); d.complemento = valor('cp-complemento');
    d.bairro = valor('cp-bairro'); d.cidade = valor('cp-cidade'); d.estado = valor('cp-estado');
    d.telefone = valor('cp-telefone'); d.whatsapp = valor('cp-whatsapp'); d.email_empresa = valor('cp-email');
    d.site = valor('cp-site'); d.instagram = valor('cp-instagram');
    d.inscricao_estadual = valor('cp-ie'); d.inscricao_estadual_isento = marcado('cp-ie-isento');
    d.inscricao_municipal = valor('cp-im'); d.inscricao_municipal_isento = marcado('cp-im-isento');
    d.regime_tributario = valor('cp-regime');
    state.cadastroPerfilDados = d;
    return d;
  }

  var cadastroPerfilAutoSaveTimer = null;
  var cadastroPerfilAutoSaveEmAndamento = false;
  var cadastroPerfilAutoSavePendente = false;

  function atualizarStatusAutoSaveCadastroPerfilMobile(texto, erro) {
    var statusEl = document.getElementById('cp-autosave-status');
    if (!statusEl) return;
    statusEl.textContent = texto || '';
    statusEl.className = 'mt-2 text-[10px] font-bold ' + (erro ? 'text-red-600' : 'text-slate-500');
  }

  function agendarAutoSaveCadastroPerfilMobile() {
    capturarCadastroPerfilMobile();
    if (state.cadastroPerfilEditando) return;
    cadastroPerfilAutoSavePendente = true;
    atualizarStatusAutoSaveCadastroPerfilMobile('Alterações pendentes...');
    if (cadastroPerfilAutoSaveTimer) window.clearTimeout(cadastroPerfilAutoSaveTimer);
    cadastroPerfilAutoSaveTimer = window.setTimeout(salvarAutomaticamenteCadastroPerfilMobile, 350);
  }

  async function salvarAutomaticamenteCadastroPerfilMobile() {
    if (!state.empresa || !cadastroPerfilAutoSavePendente || cadastroPerfilAutoSaveEmAndamento) return;
    cadastroPerfilAutoSavePendente = false;
    cadastroPerfilAutoSaveEmAndamento = true;
    atualizarStatusAutoSaveCadastroPerfilMobile('Salvando alterações...');
    try {
      var token = await tokenSessao();
      var resposta = await fetch('/api/perfil-cadastro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ empresaId: state.empresa.id, dados: capturarCadastroPerfilMobile(), concluir: false }),
      });
      var json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível salvar o rascunho.');
      state.cadastroPerfilStatus = json;
      atualizarStatusAutoSaveCadastroPerfilMobile('Alterações salvas automaticamente.');
    } catch (e) {
      atualizarStatusAutoSaveCadastroPerfilMobile(e && e.message ? e.message : 'Não foi possível salvar automaticamente.', true);
    } finally {
      cadastroPerfilAutoSaveEmAndamento = false;
      if (cadastroPerfilAutoSavePendente) salvarAutomaticamenteCadastroPerfilMobile();
    }
  }

  async function buscarCepCadastroPerfilMobile() {
    var erroEl = document.getElementById('cp-erro');
    var cep = (document.getElementById('cp-cep') && document.getElementById('cp-cep').value || '').replace(/\D/g, '');
    if (cep.length !== 8) { if (erroEl) erroEl.textContent = 'Informe um CEP com 8 dígitos.'; return; }
    try {
      var resposta = await fetch('/api/cep?cep=' + cep);
      var json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem);
      var mapa = { 'cp-rua': json.rua, 'cp-bairro': json.bairro, 'cp-cidade': json.cidade, 'cp-estado': json.estado };
      Object.keys(mapa).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = mapa[id] || ''; });
      if (erroEl) erroEl.textContent = '';
      capturarCadastroPerfilMobile();
    } catch (e) {
      if (erroEl) erroEl.textContent = e.message || 'CEP não encontrado. Preencha manualmente.';
    }
  }

  async function salvarCadastroPerfilMobile() {
    if (state.cadastroPerfilSalvando || !state.empresa) return;
    if (cadastroPerfilAutoSaveTimer) window.clearTimeout(cadastroPerfilAutoSaveTimer);
    cadastroPerfilAutoSaveTimer = null;
    cadastroPerfilAutoSavePendente = false;
    while (cadastroPerfilAutoSaveEmAndamento) {
      await new Promise(function (resolve) { window.setTimeout(resolve, 50); });
    }
    var contextoPaywall = !!state.paywallCadastroCiclo;
    var janelaPagamento = contextoPaywall ? window.open('', '_blank') : null;
    var erroEl = document.getElementById('cp-erro');
    state.cadastroPerfilSalvando = true;
    if (erroEl) erroEl.textContent = 'Salvando...';
    try {
      var token = await tokenSessao();
      var resposta = await fetch('/api/perfil-cadastro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ empresaId: state.empresa.id, dados: capturarCadastroPerfilMobile(), concluir: true }),
      });
      var json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível concluir o cadastro.');
      state.cadastroPerfilStatus = json;
      state.cadastroPerfilDados = json.cadastro;
      state.empresa.nome = json.cadastro.nome_fantasia || state.empresa.nome;
      state.empresas = (state.empresas || []).map(function (empresa) {
        return empresa.id === state.empresa.id ? Object.assign({}, empresa, { nome: state.empresa.nome, empresa_nome: state.empresa.nome }) : empresa;
      });
      if (contextoPaywall) {
        await window._avaPaywallAssinar(state.paywallCadastroCiclo, json.cobranca, janelaPagamento);
      } else {
        state.cadastroPerfilAdiado = true;
        concluirNavegacaoCadastroPerfilMobile();
        render();
      }
    } catch (e) {
      if (janelaPagamento) janelaPagamento.close();
      if (erroEl) erroEl.textContent = e.message || 'Não foi possível concluir o cadastro.';
    } finally {
      state.cadastroPerfilSalvando = false;
    }
  }

  async function adiarCadastroPerfilMobile() {
    if (!state.empresa) return;
    state.cadastroPerfilAdiado = true;
    render();
  }

  async function salvarCadastroPerfilParcialMobile() {
    if (state.cadastroPerfilSalvando || !state.empresa) return;
    var erroEl = document.getElementById('cp-erro');
    state.cadastroPerfilSalvando = true;
    if (erroEl) erroEl.textContent = 'Salvando...';
    try {
      var token = await tokenSessao();
      var resposta = await fetch('/api/perfil-cadastro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ empresaId: state.empresa.id, dados: capturarCadastroPerfilMobile(), concluir: false }),
      });
      var json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Nao foi possivel salvar as informacoes.');
      state.cadastroPerfilStatus = json;
      state.cadastroPerfilDados = json.cadastro;
      state.cadastroPerfilAdiado = true;
      render();
    } catch (e) {
      if (erroEl) erroEl.textContent = e.message || 'Nao foi possivel salvar as informacoes.';
    } finally {
      state.cadastroPerfilSalvando = false;
    }
  }

  window._avaPaywallAssinar = async function (ciclo, dadosInformados, janelaInformada) {
    if (state.paywallProcessando) return;
    var msgEl = document.getElementById('paywall-msg');
    var nomeEl = document.getElementById('paywall-nome');
    var cpfEl = document.getElementById('paywall-cpf');
    var emailEl = document.getElementById('paywall-email');
    var telefoneEl = document.getElementById('paywall-telefone');
    var nome = String(dadosInformados && dadosInformados.nome || (nomeEl ? nomeEl.value : '')).trim().replace(/\s+/g, ' ');
    var cpf = String(dadosInformados && dadosInformados.cpfCnpj || (cpfEl ? cpfEl.value : '')).replace(/\D/g, '');
    var email = String(dadosInformados && dadosInformados.email || (emailEl ? emailEl.value : '')).trim().toLowerCase();
    var telefone = String(dadosInformados && dadosInformados.telefone || (telefoneEl ? telefoneEl.value : '')).replace(/\D/g, '');
    if (nome.length < 3) { if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-red-600'; msgEl.textContent = 'Informe nome ou razão social.'; } return; }
    if (cpf.length !== 11 && cpf.length !== 14) { if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-red-600'; msgEl.textContent = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).'; } return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-red-600'; msgEl.textContent = 'Informe um e-mail de cobrança válido.'; } return; }
    if (telefone.length < 10 || telefone.length > 13) { if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-red-600'; msgEl.textContent = 'Informe um telefone válido.'; } return; }
    var janelaPagamento = janelaInformada || window.open('', '_blank');
    state.paywallProcessando = true;
    if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-slate-600'; msgEl.textContent = 'Processando...'; }
    try {
      var token = await _avaPaywallToken();
      if (!token || !state.empresa) { if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-red-600'; msgEl.textContent = 'Sessão não encontrada.'; } return; }
      var resp = await fetch('/api/cobranca/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ empresaId: state.empresa.id, plano: 'empresa', ciclo: ciclo, cobranca: { nome: nome, cpfCnpj: cpf, email: email, telefone: telefone } }),
      });
      var json = await resp.json();
      if (resp.ok && json.invoiceUrl) {
        state.paywallFaturaUrl = json.invoiceUrl;
        if (janelaPagamento) janelaPagamento.location.href = json.invoiceUrl;
        else window.open(json.invoiceUrl, '_blank');
        if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-sky-700'; msgEl.textContent = 'Abrimos o pagamento em outra aba. Depois de pagar, recarregue esta tela.'; }
        return;
      }
      if (janelaPagamento) janelaPagamento.close();
      if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-red-600'; msgEl.textContent = json.mensagem || 'Não foi possível iniciar a assinatura.'; }
    } catch (e) {
      if (janelaPagamento) janelaPagamento.close();
      if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-red-600'; msgEl.textContent = 'Não foi possível iniciar a assinatura agora.'; }
    } finally {
      state.paywallProcessando = false;
    }
  };

  window._avaPaywallPagarCobranca = function () {
    if (!state.paywallFaturaUrl) return;
    window.open(state.paywallFaturaUrl, '_blank', 'noopener,noreferrer');
    var msgEl = document.getElementById('paywall-msg');
    if (msgEl) { msgEl.className = 'mt-3 text-sm font-bold text-sky-700'; msgEl.textContent = 'Abrimos a cobrança em outra aba. Depois de pagar, toque em atualizar.'; }
  };

  window._avaPaywallCupom = async function () {
    if (state.paywallCupomProcessando) return;
    var msgEl = document.getElementById('paywall-cupom-msg');
    var el = document.getElementById('paywall-cupom');
    var codigo = (el ? el.value : '').trim();
    if (!codigo) { if (msgEl) msgEl.textContent = 'Digite o código.'; return; }
    state.paywallCupomProcessando = true;
    if (msgEl) { msgEl.className = 'mt-2 text-xs font-bold text-slate-600'; msgEl.textContent = 'Aplicando...'; }
    try {
      var token = await _avaPaywallToken();
      if (!token || !state.empresa) { if (msgEl) { msgEl.className = 'mt-2 text-xs font-bold text-red-600'; msgEl.textContent = 'Sessão não encontrada.'; } return; }
      var resp = await fetch('/api/cobranca/resgatar-cupom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ empresaId: state.empresa.id, codigo: codigo }),
      });
      var json = await resp.json();
      if (resp.ok && json.ok) { state.paywallAtivo = false; render(); carregarDados(); return; }
      if (msgEl) { msgEl.className = 'mt-2 text-xs font-bold text-red-600'; msgEl.textContent = json.mensagem || 'Não foi possível aplicar o cupom.'; }
    } catch (e) {
      if (msgEl) { msgEl.className = 'mt-2 text-xs font-bold text-red-600'; msgEl.textContent = 'Não foi possível aplicar o cupom agora.'; }
    } finally {
      state.paywallCupomProcessando = false;
    }
  };

  window._avaPaywallSair = function () { sair(); };
  window._avaPaywallAtualizar = async function () {
    if (state.paywallProcessando) return;
    var msgEl = document.getElementById('paywall-msg');
    state.paywallProcessando = true;
    if (msgEl) { msgEl.className = 'mt-1.5 text-xs font-bold text-slate-600'; msgEl.textContent = 'Atualizando pagamento...'; }
    try {
      var token = await _avaPaywallToken();
      if (!token || !state.empresa) {
        if (msgEl) { msgEl.className = 'mt-1.5 text-xs font-bold text-red-600'; msgEl.textContent = 'Sessao nao encontrada.'; }
        return;
      }
      var resp = await fetch('/api/cobranca/estado?empresaId=' + encodeURIComponent(state.empresa.id), {
        headers: { Authorization: 'Bearer ' + token },
      });
      var json = await resp.json();
      if (!resp.ok) {
        if (msgEl) { msgEl.className = 'mt-1.5 text-xs font-bold text-red-600'; msgEl.textContent = json.mensagem || 'Nao foi possivel atualizar o pagamento agora.'; }
        return;
      }
      state.paywallAtivo = Boolean(json.precisaPaywall);
      state.paywallNome = nomeEmpresa(state.empresa);
      state.paywallEstado = json.estado || null;
      state.paywallPrecos = json.precos || state.paywallPrecos;
      state.paywallFaturaUrl = (json.faturaPendente && json.faturaPendente.invoiceUrl) || '';
      state.paywallVerificado = true;
      state.paywallPerfilVerificado = state.empresa && state.empresa.id;
      if (!state.paywallAtivo) {
        render();
        carregarDados();
        return;
      }
      if (msgEl) {
        msgEl.className = 'mt-1.5 text-xs font-bold text-sky-700';
        msgEl.textContent = 'Pagamento ainda nao confirmado pela Asaas. Tente novamente em instantes.';
      }
    } catch (e) {
      if (msgEl) { msgEl.className = 'mt-1.5 text-xs font-bold text-red-600'; msgEl.textContent = 'Nao foi possivel consultar a Asaas agora.'; }
    } finally {
      state.paywallProcessando = false;
    }
  };
  window._avaPaywallCriar = function () {
    state.paywallAtivo = false;
    state.paywallSelecionando = false;
    state.modoCriarPerfil = true;
    render();
  };
  window._avaPaywallTrocar = function () {
    state.paywallSelecionando = true;
    render();
  };
  window._avaPaywallVoltarSelecao = function () {
    state.paywallSelecionando = false;
    render();
  };
  window._avaPaywallEscolher = function (id) {
    if (!selecionarEmpresaMobile(id, true)) return;
    state.paywallSelecionando = false;
    state.paywallAtivo = false;
    carregarDados();
  };

  function assinaturaEmCarenciaMobile() {
    var estado = state.paywallEstado;
    return !!(estado && estado.status === 'inadimplente' && estado.validoAte && new Date(estado.validoAte).getTime() > Date.now());
  }

  // ── Premium Pessoal (espelha app/lib/cobranca.ts) ─────────────
  // A assinatura está vigente (paga, trial válido ou cortesia ativa)?
  function assinaturaVigenteMobile(estado) {
    if (!estado) return false;
    var agora = Date.now();
    if (estado.status === 'ativa') return true;
    if (estado.status === 'cortesia') return !estado.validoAte || new Date(estado.validoAte).getTime() > agora;
    if (estado.status === 'trial') return !!estado.trialFim && new Date(estado.trialFim).getTime() > agora;
    if (estado.status === 'inadimplente' || estado.status === 'cancelada') {
      return !!estado.validoAte && new Date(estado.validoAte).getTime() > agora;
    }
    return false;
  }

  // Perfil PESSOAL grátis tentando usar recurso premium? (flag off → nunca bloqueia)
  function premiumPessoalBloqueadoMobile() {
    if (!COBRANCA_ATIVA_MOBILE) return false;
    var estado = state.paywallEstado;
    if (!estado) return false; // sem info → fail-open
    return estado.tipoPerfil === 'pessoal' && !assinaturaVigenteMobile(estado);
  }

  function recursoExclusivoAssinanteMobile() {
    return COBRANCA_ATIVA_MOBILE && !assinaturaVigenteMobile(state.paywallEstado);
  }

  function mostrarAvisoAssinanteMobile(titulo, mensagem) {
    state.avisoAssinanteTitulo = titulo;
    state.avisoAssinanteMensagem = mensagem;
    state.avisoAssinanteAberto = true;
    render();
  }

  function avisoAssinanteMobileHtml() {
    if (!state.avisoAssinanteAberto) return '';
    return (
      '<div class="fixed inset-0 z-[13000] flex items-center justify-center bg-slate-950/85 px-4" role="dialog" aria-modal="true">' +
        '<section class="w-full max-w-sm overflow-hidden rounded-3xl border border-sky-300 bg-white shadow-2xl">' +
          '<div class="bg-[#003E73] px-5 py-4 text-white">' +
            '<p class="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Recurso exclusivo</p>' +
            '<h2 class="mt-1 text-base font-black">' + escapeHtml(state.avisoAssinanteTitulo) + '</h2>' +
          '</div>' +
          '<div class="p-5">' +
            '<div class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold leading-relaxed text-sky-950">' + escapeHtml(state.avisoAssinanteMensagem) + '</div>' +
            '<button id="fechar-aviso-assinante" type="button" class="mt-4 h-11 w-full rounded-xl bg-[#003E73] text-xs font-black uppercase tracking-wide text-white">Entendi</button>' +
          '</div>' +
        '</section>' +
      '</div>'
    );
  }

  function avisoDuplicadoMobileHtml() {
    if (!state.duplicadoConfirmacaoAberta) return '';
    var card = state.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
    var detalhe = state.darkMode
      ? 'border-amber-400/35 bg-amber-400/10 text-amber-50'
      : 'border-amber-200 bg-amber-50 text-amber-950';
    return (
      '<div id="aviso-duplicado-overlay" class="fixed inset-0 flex items-center justify-center bg-slate-950/90 px-4" style="z-index:13010" role="dialog" aria-modal="true" aria-labelledby="aviso-duplicado-titulo">' +
        '<section class="w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl ' + card + '">' +
          '<header class="flex items-center gap-3 bg-[#003E73] px-4 py-3 text-white">' +
            '<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-black">!</span>' +
            '<div><p class="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">Conferência de lançamento</p><h2 id="aviso-duplicado-titulo" class="text-base font-black">Valor já existente</h2></div>' +
          '</header>' +
          '<div class="p-4">' +
            '<div class="rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed ' + detalhe + '">Já existe uma despesa com este valor neste mês. Deseja adicioná-la mesmo assim?</div>' +
          '</div>' +
          '<footer class="grid grid-cols-2 gap-2 border-t border-slate-200 p-3 ' + (state.darkMode ? 'border-slate-700' : '') + '">' +
            '<button id="cancelar-aviso-duplicado" type="button" class="h-11 rounded-xl border border-slate-300 bg-white text-xs font-black uppercase tracking-wide text-slate-700 active:bg-slate-50">Revisar</button>' +
            '<button id="confirmar-aviso-duplicado" type="button" class="h-11 rounded-xl bg-[#003E73] text-xs font-black uppercase tracking-wide text-white active:bg-[#002e56]">Adicionar</button>' +
          '</footer>' +
        '</section>' +
      '</div>'
    );
  }

  // Criar mais um perfil PESSOAL é premium (grátis = 1). Perfil empresa é livre.
  // Quem assina a Empresa ganha o Premium (o servidor devolve cortesia).
  function criarPerfilPessoalBloqueadoMobile() {
    if (!COBRANCA_ATIVA_MOBILE) return false;
    var estado = state.paywallEstado;
    if (!estado) return false;
    var jaTemPessoal = (state.empresas || []).some(function (emp) {
      return normalizarTipoPerfil(emp.tipo_perfil) === 'pessoal';
    });
    if (!jaTemPessoal) return false; // o primeiro pessoal é o grátis
    if (estado.tipoPerfil === 'pessoal') return !assinaturaVigenteMobile(estado);
    return estado.status !== 'ativa'; // empresa: só assinatura paga libera
  }

  // Catálogo dos benefícios (mesma ordem de app/lib/cobranca.ts).
  var RECURSOS_PREMIUM_PESSOAL_MOBILE = [
    { recurso: 'ava', icone: '🤖', titulo: 'Ava (IA)', descricao: 'Assistente que analisa seus resultados e tira dúvidas.' },
    { recurso: 'analises', icone: '📊', titulo: 'Análises avançadas', descricao: 'Aba Relatório e Gráficos completos.' },
    { recurso: 'exportacao', icone: '💾', titulo: 'Backup e exportação', descricao: 'Exporte e restaure seus dados em Excel.' },
    { recurso: 'busca_lancamentos', icone: '🔎', titulo: 'Busca nos lançamentos', descricao: 'Encontre qualquer lançamento na hora.' },
    { recurso: 'multiplos_perfis', icone: '👥', titulo: 'Múltiplos perfis pessoais', descricao: 'Crie mais perfis pessoais (grátis = 1).' },
    { recurso: 'notificacoes', icone: '🔔', titulo: 'Notificações', descricao: 'Lembretes e avisos de pagamentos.' },
    { recurso: 'organizar_dashboard', icone: '🧩', titulo: 'Ordenar cards', descricao: 'Reordene os cards do seu jeito.' },
    { recurso: 'organizar_atalhos', icone: '↔️', titulo: 'Organizar atalhos', descricao: 'Personalize os atalhos do app.' },
    { recurso: 'usuarios_internos', icone: '🧑‍💼', titulo: 'Usuários internos', descricao: 'Convide outras pessoas para o perfil.' },
    { recurso: 'vendas_mobile', icone: '🛍️', titulo: 'Vendas Mobile', descricao: 'Clientes, produtos, pedidos e pagamentos integrados à Gestão.' },
  ];

  // Abre o modal de upgrade destacando o recurso tocado.
  function abrirPremiumMobile(recurso) {
    state.premiumRecursoDestaque = recurso || '';
    state.menuAberto = false;
    state.modalMenu = 'premium';
    render();
  }

  function premiumPessoalHtml() {
    var destaque = state.premiumRecursoDestaque;
    return (
      '<div class="grid gap-2">' +
        '<p class="text-xs font-semibold leading-relaxed text-slate-500">Este recurso faz parte do <b>Premium Pessoal</b>. O essencial continua grátis para sempre — o Premium desbloqueia os recursos avançados:</p>' +
        RECURSOS_PREMIUM_PESSOAL_MOBILE.map(function (item) {
          var ativo = item.recurso === destaque;
          return '<div class="flex items-start gap-2.5 rounded-xl border px-3 py-2 ' + (ativo ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50') + '">' +
            '<span class="mt-0.5 text-base leading-none">' + item.icone + '</span>' +
            '<div class="min-w-0">' +
              '<p class="text-xs font-black text-slate-900">' + escapeHtml(item.titulo) +
                (ativo ? ' <span class="ml-1 rounded-full bg-sky-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">Você tentou usar</span>' : '') +
              '</p>' +
              '<p class="mt-0.5 text-[11px] font-semibold leading-snug text-slate-500">' + escapeHtml(item.descricao) + '</p>' +
            '</div>' +
          '</div>';
        }).join('') +
        '<div class="mt-1 flex items-center justify-between gap-3 rounded-2xl border-2 border-sky-400 px-4 py-3" style="background:linear-gradient(135deg,#003E73,#00A6C8)">' +
          '<div>' +
            '<p class="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">A partir de</p>' +
            '<p class="text-xl font-black text-white">R$ 8,25<span class="text-xs font-bold text-white/80">/mês</span></p>' +
            '<p class="text-[10px] font-semibold text-white/80">no anual (R$ 99,00/ano) · ou R$ 9,90/mês</p>' +
          '</div>' +
          '<button id="premium-assinar" type="button" class="shrink-0 rounded-xl bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-sky-800 shadow-lg active:scale-[0.98]">Assinar</button>' +
        '</div>' +
        '<div class="mt-1">' +
          '<p class="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Tem um cupom?</p>' +
          '<div class="flex gap-2">' +
            '<input id="premium-cupom" type="text" placeholder="Digite o código" style="font-size:16px;text-transform:uppercase" class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none" />' +
            '<button id="premium-cupom-aplicar" type="button" class="shrink-0 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black uppercase tracking-wide text-slate-700 active:scale-[0.98]">Aplicar</button>' +
          '</div>' +
          '<p id="premium-cupom-msg" class="mt-1.5 text-[11px] font-bold text-red-600"></p>' +
        '</div>' +
      '</div>'
    );
  }

  async function aplicarCupomPremiumMobile() {
    if (state.premiumCupomProcessando) return;
    var msgEl = document.getElementById('premium-cupom-msg');
    var el = document.getElementById('premium-cupom');
    var codigo = (el ? el.value : '').trim().toUpperCase();
    if (!codigo) { if (msgEl) msgEl.textContent = 'Digite o código.'; return; }
    state.premiumCupomProcessando = true;
    if (msgEl) { msgEl.className = 'mt-1.5 text-[11px] font-bold text-slate-600'; msgEl.textContent = 'Aplicando...'; }
    try {
      var token = await _avaPaywallToken();
      if (!token || !state.empresa) { if (msgEl) { msgEl.className = 'mt-1.5 text-[11px] font-bold text-red-600'; msgEl.textContent = 'Sessão não encontrada.'; } return; }
      var resp = await fetch('/api/cobranca/resgatar-cupom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ empresaId: state.empresa.id, codigo: codigo }),
      });
      var json = await resp.json();
      if (resp.ok && json.ok) {
        state.modalMenu = '';
        state.premiumRecursoDestaque = '';
        mostrarToast('Cupom aplicado! Premium liberado.');
        state.paywallVerificado = false;
        render();
        verificarPaywallMobile();
        return;
      }
      if (msgEl) { msgEl.className = 'mt-1.5 text-[11px] font-bold text-red-600'; msgEl.textContent = json.mensagem || 'Não foi possível aplicar o cupom.'; }
    } catch (e) {
      if (msgEl) { msgEl.className = 'mt-1.5 text-[11px] font-bold text-red-600'; msgEl.textContent = 'Não foi possível aplicar o cupom agora.'; }
    } finally {
      state.premiumCupomProcessando = false;
    }
  }

  function assinaturaCanceladaNoFimMobile(estado) {
    return !!(estado && estado.status === 'cancelada' && estado.validoAte && new Date(estado.validoAte).getTime() > Date.now());
  }

  function dataAssinaturaMobile(valor) {
    if (!valor) return '—';
    var data = new Date(String(valor).length === 10 ? valor + 'T12:00:00' : valor);
    return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
  }

  function rotuloFaturaMobile(status) {
    if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].indexOf(status) >= 0) return ['Paga', 'background:#DCFCE7;color:#15803D'];
    if (status === 'OVERDUE') return ['Vencida', 'background:#FEE2E2;color:#B91C1C'];
    if (status === 'PENDING') return ['Pendente', 'background:#FEF3C7;color:#B45309'];
    if (status === 'REFUNDED') return ['Estornada', 'background:#E2E8F0;color:#475569'];
    return ['Em analise', 'background:#DBEAFE;color:#1D4ED8'];
  }

  async function carregarAssinaturaMobile() {
    if (!state.empresa || state.assinaturaCarregando) return;
    state.assinaturaCarregando = true;
    state.assinaturaErro = '';
    render();
    try {
      var token = await _avaPaywallToken();
      if (!token) throw new Error('Sessao nao encontrada.');
      var resposta = await fetch('/api/cobranca/gerenciar?empresaId=' + encodeURIComponent(state.empresa.id), {
        headers: { Authorization: 'Bearer ' + token },
      });
      var json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Nao foi possivel carregar a assinatura.');
      state.assinaturaDetalhes = json;
      state.paywallEstado = json.estado || state.paywallEstado;
    } catch (erro) {
      state.assinaturaErro = erro && erro.message ? erro.message : 'Nao foi possivel carregar a assinatura.';
    }
    state.assinaturaCarregando = false;
    render();
  }

  function abrirAssinaturaMobile() {
    state.modalMenu = 'assinatura';
    state.assinaturaDetalhes = null;
    state.assinaturaErro = '';
    state.assinaturaConfirmarCancelamento = false;
    render();
    carregarAssinaturaMobile();
  }

  async function alterarAssinaturaMobile(ciclo) {
    if (!state.empresa || state.assinaturaAcao) return;
    state.assinaturaAcao = ciclo;
    state.assinaturaErro = '';
    render();
    try {
      var token = await _avaPaywallToken();
      var resposta = await fetch('/api/cobranca/gerenciar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ empresaId: state.empresa.id, ciclo: ciclo }),
      });
      var json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Nao foi possivel alterar o plano.');
      state.assinaturaAcao = '';
      await carregarAssinaturaMobile();
      mostrarToast('Novo ciclo aplicado a proxima renovacao.');
      return;
    } catch (erro) {
      state.assinaturaErro = erro && erro.message ? erro.message : 'Nao foi possivel alterar o plano.';
    }
    state.assinaturaAcao = '';
    render();
  }

  async function assinarPeloPainelMobile(ciclo) {
    if (!state.empresa || state.assinaturaAcao) return;
    if (state.cadastroPerfilStatus && !state.cadastroPerfilStatus.completo) {
      state.modalMenu = '';
      state.paywallCadastroCiclo = ciclo === 'anual' ? 'anual' : 'mensal';
      render();
      return;
    }
    state.assinaturaNome = campo('assinatura-nome').trim().replace(/\s+/g, ' ');
    state.assinaturaCpf = campo('assinatura-cpf');
    state.assinaturaEmail = campo('assinatura-email').trim().toLowerCase();
    state.assinaturaTelefone = campo('assinatura-telefone');
    var telefone = state.assinaturaTelefone.replace(/\D/g, '');
    var documento = state.assinaturaCpf.replace(/\D/g, '');
    if (state.assinaturaNome.length < 3) {
      state.assinaturaErro = 'Informe nome ou razão social.';
      render();
      return;
    }
    if (documento.length !== 11 && documento.length !== 14) {
      state.assinaturaErro = 'Informe um CPF ou CNPJ valido.';
      render();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.assinaturaEmail)) {
      state.assinaturaErro = 'Informe um e-mail de cobrança válido.';
      render();
      return;
    }
    if (telefone.length < 10 || telefone.length > 13) {
      state.assinaturaErro = 'Informe um telefone válido.';
      render();
      return;
    }
    var janela = window.open('', '_blank');
    state.assinaturaAcao = 'assinar-' + ciclo;
    state.assinaturaErro = '';
    render();
    try {
      var token = await _avaPaywallToken();
      var resposta = await fetch('/api/cobranca/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          empresaId: state.empresa.id,
          plano: normalizarTipoPerfil(state.empresa.tipo_perfil) === 'pessoal' ? 'pessoal_premium' : 'empresa',
          ciclo: ciclo,
          cobranca: { nome: state.assinaturaNome, cpfCnpj: documento, email: state.assinaturaEmail, telefone: telefone }
        }),
      });
      var json = await resposta.json();
      if (!resposta.ok || !json.invoiceUrl) throw new Error(json.mensagem || 'Nao foi possivel iniciar a assinatura.');
      if (janela) janela.location.href = json.invoiceUrl;
      else window.open(json.invoiceUrl, '_blank');
      state.assinaturaAcao = '';
      await carregarAssinaturaMobile();
      return;
    } catch (erro) {
      if (janela) janela.close();
      state.assinaturaErro = erro && erro.message ? erro.message : 'Nao foi possivel iniciar a assinatura.';
    }
    state.assinaturaAcao = '';
    render();
  }

  async function cancelarAssinaturaMobile() {
    if (!state.empresa || state.assinaturaAcao) return;
    state.assinaturaAcao = 'cancelar';
    state.assinaturaErro = '';
    render();
    try {
      var token = await _avaPaywallToken();
      var resposta = await fetch('/api/cobranca/gerenciar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ empresaId: state.empresa.id }),
      });
      var json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Nao foi possivel cancelar a assinatura.');
      state.assinaturaConfirmarCancelamento = false;
      state.assinaturaAcao = '';
      await carregarAssinaturaMobile();
      mostrarToast('Renovacao cancelada.');
      return;
    } catch (erro) {
      state.assinaturaErro = erro && erro.message ? erro.message : 'Nao foi possivel cancelar a assinatura.';
    }
    state.assinaturaAcao = '';
    render();
  }

  function avisoCarenciaMobileHtml() {
    if (!assinaturaEmCarenciaMobile()) return '';
    return '<button id="aviso-carencia-assinatura" type="button" class="w-full rounded-[12px_22px_22px_22px] border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-[11px] font-semibold leading-snug text-amber-900 shadow-sm"><strong>Pagamento pendente.</strong> Regularize ate ' + dataAssinaturaMobile(state.paywallEstado.validoAte) + ' para evitar o bloqueio. <span class="font-black underline">Ver assinatura</span></button>';
  }

  function ordemDashboardPadrao() {
    return [
      'ia',
      'agenda',
      'meusPerfis',
      'insightsAva',
      'saldo',
      'caixinha',
      'totais',
      'controlePonto',
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
      insightsAva: 'Insights da Ava',
      caixinha: 'Caixinha',
      ia: 'Perguntas para IA',
      agenda: 'Agenda',
      meusPerfis: 'Meus perfis',
      categorias: 'Despesas por categoria',
      tipos: 'Total por tipo de despesa',
      ultimasDespesas: 'Despesas do mês',
      ultimasReceitas: 'Receitas do mês',
      totais: 'Totais',
      controlePonto: 'Controle de ponto',
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
    // Premium Pessoal: no grátis o dashboard fica sempre no padrão (sem
    // ordem personalizada e sem cards ocultos).
    if (premiumPessoalBloqueadoMobile()) {
      return normalizarOrdemDashboard(ordemDashboardPadrao()).filter(cardDashboardPermitido);
    }
    var ocultos = normalizarOcultosDashboard(state.dashboardOcultos);
    return normalizarOrdemDashboard(state.dashboardOrdem).filter(function (id) {
      return ocultos.indexOf(id) < 0 && cardDashboardPermitido(id);
    });
  }

  function podeGerenciarPontoMobile() {
    return !!(
      state.empresa
      && normalizarTipoPerfil(state.empresa.tipo_perfil) === 'empresa'
      && (state.empresa.perfil === 'gestor_master' || state.empresa.perfil === 'administrador')
      && state.pontoModuloAtivo
    );
  }

  function cardDashboardPermitido(id) {
    return id !== 'controlePonto' || podeGerenciarPontoMobile();
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

  function iniciarValoresOcultosAtivo() {
    return state.iniciarValoresOcultos !== false;
  }

  function aplicarPreferenciaInicialValores() {
    state.dashboardValoresVisiveis = {};
    if (iniciarValoresOcultosAtivo()) return;
    CARDS_COM_VALORES.forEach(function (cardId) {
      state.dashboardValoresVisiveis[cardId] = true;
    });
  }

  function salvarPreferenciaInicialValores() {
    try {
      localStorage.setItem(CHAVE_INICIAR_VALORES_OCULTOS, iniciarValoresOcultosAtivo() ? '1' : '0');
    } catch (error) {}
  }

  function alternarInicioValoresOcultos() {
    state.iniciarValoresOcultos = !iniciarValoresOcultosAtivo();
    salvarPreferenciaInicialValores();
    aplicarPreferenciaInicialValores();
    render();
    mostrarToast(iniciarValoresOcultosAtivo() ? 'Valores iniciam ocultos.' : 'Valores iniciam visiveis.');
  }

  function atalhosInferioresDisponiveis() {
    var atalhos = ['perfil', 'agenda', 'tema', 'despesasFixas'];
    if (podeGerenciarUsuarios()) atalhos.push('sistemas');
    return atalhos;
  }

  function podeTrocarSistemaMobile() {
    return !!(state.vendasMobileModuloAtivo && podeGerenciarUsuarios());
  }

  function chaveSistemaPerfilMobile(prefixo) {
    return prefixo + (state.empresa && state.empresa.id ? state.empresa.id : 'sem-perfil');
  }

  function registrarContextoSistemaMobile(sistema) {
    if (!state.empresa || !state.empresa.id) return;
    try {
      localStorage.setItem(CHAVE_CONTEXTO_SISTEMA_MOBILE, JSON.stringify({
        empresaId: state.empresa.id,
        sistema: sistema,
        atualizadoEm: new Date().toISOString(),
      }));
    } catch (error) {}
  }

  function prepararOrigemAcessoMobile() {
    try {
      var origem = new URLSearchParams(window.location.search).get('origem');
      sessionStorage.setItem(CHAVE_ORIGEM_ACESSO_MOBILE, origem === 'vendas' ? 'vendas' : 'gestao');
    } catch (error) {}
  }

  function destinoLogoutMobile() {
    try {
      return sessionStorage.getItem(CHAVE_ORIGEM_ACESSO_MOBILE) === 'vendas'
        ? '/avantavendas?entrar=1'
        : '/?entrar=1';
    } catch (error) {
      return '/?entrar=1';
    }
  }

  function abrirVendasMobile() {
    if (!podeTrocarSistemaMobile()) {
      mostrarToast('Vendas Mobile indisponivel para este usuario.');
      return;
    }
    registrarContextoSistemaMobile('vendas');
    try {
      sessionStorage.setItem(chaveSistemaPerfilMobile(CHAVE_SISTEMA_SESSAO_MOBILE), 'vendas');
      sessionStorage.setItem('avantalab_vendas_entrada_gestao', '1');
      sessionStorage.removeItem('avantalab_vendas_perfil_ativo');
    } catch (error) {}
    window.location.assign('/avantavendas?origem=gestao');
  }

  function escolherSistemaInicialMobile(sistema) {
    if (sistema !== 'gestao' && sistema !== 'vendas') return;
    if (sistema === 'vendas' && !podeTrocarSistemaMobile()) return;
    state.seletorSistemaAberto = false;
    state.seletorSistemaInicialBloqueante = false;
    state.sistemaInicialAvaliadoPerfilId = state.empresa && state.empresa.id ? state.empresa.id : '';
    registrarContextoSistemaMobile(sistema);
    try {
      sessionStorage.setItem(chaveSistemaPerfilMobile(CHAVE_SISTEMA_SESSAO_MOBILE), sistema);
      if (state.lembrarSistemaInicial) {
        localStorage.setItem(chaveSistemaPerfilMobile(CHAVE_SISTEMA_INICIAL_MOBILE), sistema);
      } else localStorage.removeItem(chaveSistemaPerfilMobile(CHAVE_SISTEMA_INICIAL_MOBILE));
    } catch (error) {}
    if (sistema === 'vendas') {
      state.carregando = true;
      state.paywallVerificado = false;
      render();
      window.setTimeout(abrirVendasMobile, 60);
    } else {
      state.carregando = true;
      state.paywallVerificado = false;
      render();
      carregarDados();
    }
  }

  async function confirmarModuloVendasMobileNoPerfil(empresaId, repararAcesso) {
    if (!empresaId) return { data: false, error: new Error('Perfil não identificado.') };
    // A instalação salva em empresa_modulos é a fonte de verdade. A permissão
    // operacional do gestor é reparada separadamente e nunca pode fazer um
    // módulo já instalado voltar a aparecer como desativado.
    var instalacao = await db
      .from('empresa_modulos')
      .select('ativo')
      .eq('empresa_id', empresaId)
      .eq('modulo_id', 'vendas_mobile')
      .maybeSingle();
    var confirmacao = instalacao.error || !instalacao.data
      ? await db.rpc('modulo_vendas_mobile_ativo_rpc', { p_empresa_id: empresaId })
      : { data: instalacao.data.ativo === true, error: null };

    if (!confirmacao.error && confirmacao.data === true && repararAcesso && podeGerenciarUsuarios()) {
      var reparo = await db.rpc('garantir_acessos_gestor_vendas_mobile_rpc');
      if (reparo.error) {
        console.warn('Não foi possível reparar o acesso do gestor ao Vendas Mobile:', reparo.error);
      }
    }
    return confirmacao;
  }

  async function abrirFluxoSistemasMobile() {
    if (!podeGerenciarUsuarios()) {
      mostrarToast('A troca de sistemas nao esta disponivel para este usuario.');
      return;
    }
    if (state.vendasMobileModuloVerificando || !state.empresa || !state.empresa.id) {
      return;
    }

    var empresaIdVerificada = state.empresa.id;
    state.vendasMobileModuloVerificando = true;

    try {
      // O estado carregado na entrada pode ficar desatualizado se a primeira
      // consulta sofrer uma falha temporária. Confirma novamente no servidor
      // antes de oferecer uma ativação que talvez já exista.
      var acessoAtivo = await confirmarModuloVendasMobileNoPerfil(empresaIdVerificada, true);
      if (acessoAtivo.error) throw acessoAtivo.error;
      if (!state.empresa || state.empresa.id !== empresaIdVerificada) return;

      state.vendasMobileModuloAtivo = acessoAtivo.data === true;
      if (state.vendasMobileModuloAtivo) {
        abrirVendasMobile();
        return;
      }

      state.menuAberto = false;
      state.ativacaoVendasMobileAberta = true;
      state.ativacaoVendasMobileCarregando = false;
      state.ativacaoVendasMobileErro = '';
      render();
    } catch (error) {
      console.warn('Não foi possível confirmar o módulo Vendas Mobile:', error);
      mostrarToast('Nao foi possivel verificar o Vendas agora. Tente novamente.');
    } finally {
      state.vendasMobileModuloVerificando = false;
    }
  }

  function fecharAtivacaoVendasMobile() {
    if (state.ativacaoVendasMobileCarregando) return;
    state.ativacaoVendasMobileAberta = false;
    state.ativacaoVendasMobileErro = '';
    render();
  }

  async function ativarVendasMobileNoPerfil() {
    if (state.ativacaoVendasMobileCarregando || !state.empresa || !state.empresa.id) return;
    if (!podeGerenciarUsuarios()) {
      state.ativacaoVendasMobileErro = 'Voce nao tem permissao para ativar modulos neste perfil.';
      render();
      return;
    }
    if (premiumPessoalBloqueadoMobile()) {
      state.ativacaoVendasMobileAberta = false;
      abrirPremiumMobile('vendas_mobile');
      return;
    }

    state.ativacaoVendasMobileCarregando = true;
    state.ativacaoVendasMobileErro = '';
    render();

    var empresaIdAtivacao = state.empresa.id;
    try {
      var ativacao = await db.rpc('ativar_modulo_vendas_mobile_rpc', {
        p_empresa_id: empresaIdAtivacao,
      });
      if (ativacao.error || ativacao.data !== true) {
        throw (ativacao.error || new Error('A ativação do módulo não foi confirmada.'));
      }

      var acessoAtivo = await confirmarModuloVendasMobileNoPerfil(empresaIdAtivacao, true);
      if (acessoAtivo.error || acessoAtivo.data !== true) {
        throw (acessoAtivo.error || new Error('Nao foi possivel validar o acesso ao Vendas Mobile.'));
      }
      if (!state.empresa || state.empresa.id !== empresaIdAtivacao) return;

      state.vendasMobileModuloAtivo = true;
      state.ativacaoVendasMobileAberta = false;
      state.ativacaoVendasMobileCarregando = false;
      state.ativacaoVendasMobileErro = '';
      abrirVendasMobile();
    } catch (error) {
      console.error('Erro ao ativar o módulo Vendas Mobile:', error);
      state.ativacaoVendasMobileCarregando = false;
      state.ativacaoVendasMobileErro = (error && error.message) || 'Nao foi possivel ativar o modulo agora. Tente novamente.';
      render();
    }
  }

  function ativacaoVendasMobileHtml() {
    if (!state.ativacaoVendasMobileAberta) return '';
    var dk = !!state.darkMode;
    return (
      '<div class="fixed inset-0 z-[14100] flex items-center justify-center bg-slate-950/90 px-4" role="dialog" aria-modal="true" aria-labelledby="ativar-vendas-titulo">' +
        '<section class="w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl ' + (dk ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900') + '">' +
          '<div class="px-5 py-4 text-white" style="background:linear-gradient(135deg,#003E73,#00A6C8)">' +
            '<p class="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">Sistemas AvantaLab</p>' +
            '<h2 id="ativar-vendas-titulo" class="mt-1 text-lg font-black">Vendas Mobile não instalado</h2>' +
          '</div>' +
          '<div class="grid gap-4 p-5">' +
            '<div class="rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed ' + (dk ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-sky-200 bg-sky-50 text-sky-950') + '">' +
              'Este perfil ainda não possui o módulo Vendas Mobile. Para acessar clientes, produtos, pedidos e pagamentos, é necessário ativá-lo primeiro.' +
            '</div>' +
            '<p class="text-center text-sm font-black">Quer ativar este módulo agora?</p>' +
            (state.ativacaoVendasMobileErro ? '<p class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">' + escapeHtml(state.ativacaoVendasMobileErro) + '</p>' : '') +
            '<div class="grid grid-cols-2 gap-2">' +
              '<button id="cancelar-ativacao-vendas" type="button" ' + (state.ativacaoVendasMobileCarregando ? 'disabled ' : '') + 'class="h-11 rounded-xl border border-slate-300 bg-white text-xs font-black uppercase tracking-wide text-slate-700 disabled:opacity-50">Agora não</button>' +
              '<button id="confirmar-ativacao-vendas" type="button" ' + (state.ativacaoVendasMobileCarregando ? 'disabled ' : '') + 'class="h-11 rounded-xl bg-cyan-600 text-xs font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-60">' + (state.ativacaoVendasMobileCarregando ? 'Ativando...' : 'Ativar') + '</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
      '</div>'
    );
  }

  function avaliarSistemaInicialMobile() {
    // A rota /mobile abre sempre a Gestão. Preferências antigas de sistema
    // permanecem apenas para contexto de navegação e nunca redirecionam a
    // entrada automaticamente para o Vendas.
    state.seletorSistemaAberto = false;
    state.seletorSistemaInicialBloqueante = false;
    return false;
  }

  async function prepararSistemaInicialAntesDosDadosMobile() {
    state.vendasMobileModuloAtivo = false;
    state.preparacaoSistemaVendas = null;
    if (!state.empresa || !podeGerenciarUsuarios()) {
      atualizarProgressoAcessoMobile('access', 3, 3, 'Permissões confirmadas');
      return false;
    }

    var acessoGestor = await promessaMobileComPrazo(
      db.rpc('garantir_acessos_gestor_vendas_mobile_rpc'),
      10000,
      'A validação da integração com o Vendas demorou mais que o esperado.'
    );
    atualizarProgressoAcessoMobile('access', 1, 3, 'Verificando módulo do perfil');
    if (acessoGestor.error) {
      console.warn('Não foi possível preparar o acesso integrado ao Vendas Mobile:', acessoGestor.error);
    }

    atualizarProgressoAcessoMobile('access', 2, 3, 'Validando integração com o Vendas');
    var acessoAtivo = await promessaMobileComPrazo(
      confirmarModuloVendasMobileNoPerfil(state.empresa.id, false),
      10000,
      'A confirmação do módulo Vendas demorou mais que o esperado.'
    );
    state.vendasMobileModuloAtivo = !acessoAtivo.error && acessoAtivo.data === true;
    state.preparacaoSistemaVendas = {
      empresaId: state.empresa.id,
      acessoVendasAtivo: state.vendasMobileModuloAtivo,
      integracaoValidada: true,
    };
    atualizarProgressoAcessoMobile('access', 3, 3, 'Acesso aos sistemas confirmado');
    return avaliarSistemaInicialMobile();
  }

  function seletorSistemaInicialHtml() {
    if (!state.seletorSistemaAberto || !state.seletorSistemaInicialBloqueante || !podeTrocarSistemaMobile()) return '';
    var card = (
      '<section class="w-full max-w-sm overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="seletor-sistema-titulo">' +
          '<div class="relative px-5 py-4 text-white" style="background:linear-gradient(135deg,#003E73,#00A6C8)">' +
            '<p class="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">AvantaLab</p>' +
            '<h2 id="seletor-sistema-titulo" class="mt-1 text-xl font-black">Por onde deseja começar?</h2>' +
            '<p class="mt-1 text-xs font-semibold text-cyan-50/90">Escolha o sistema para abrir neste acesso.</p>' +
          '</div>' +
          '<div class="grid gap-3 p-4">' +
            '<button id="escolher-sistema-gestao" type="button" class="flex min-h-[82px] items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 text-left active:scale-[0.99]">' +
              iconeSeletorSistema('gestao') +
              '<span><strong class="block text-base font-black">Gestão Mobile</strong><small class="mt-1 block text-xs font-semibold text-slate-500">Finanças, indicadores e administração.</small></span>' +
            '</button>' +
            '<button id="escolher-sistema-vendas" type="button" class="flex min-h-[82px] items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 text-left active:scale-[0.99]">' +
              iconeSeletorSistema('vendas') +
              '<span><strong class="block text-base font-black">Vendas Mobile</strong><small class="mt-1 block text-xs font-semibold text-slate-500">Clientes, produtos, pedidos e pagamentos.</small></span>' +
            '</button>' +
            '<label class="mt-1 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold">' +
              '<input id="lembrar-sistema-inicial" type="checkbox" class="h-5 w-5 accent-cyan-600"' + (state.lembrarSistemaInicial ? ' checked' : '') + '>' +
              '<span>Memorizar minha escolha nos próximos acessos</span>' +
            '</label>' +
          '</div>' +
      '</section>'
    );
    return '<section class="avantalab-mobile-bg fixed inset-0 z-[14000] flex items-center justify-center overflow-hidden px-4" style="height:100dvh;background-position:center bottom;background-size:cover;">' + card + '</section>';
  }

  function normalizarAtalhoInferior(valor, padrao) {
    return atalhosInferioresDisponiveis().indexOf(valor) >= 0 ? valor : (valor === 'nenhum' ? 'nenhum' : padrao);
  }

  function salvarAtalhosInferiores() {
    try {
      localStorage.setItem(CHAVE_ATALHOS_INFERIORES, JSON.stringify({
        esquerdo: state.atalhoInferiorEsquerdo,
        direito: state.atalhoInferiorDireito,
      }));
    } catch (error) {}
  }

  function definirAtalhoInferior(lado, valor) {
    valor = normalizarAtalhoInferior(valor, 'nenhum');
    var outroLado = lado === 'esquerdo' ? 'direito' : 'esquerdo';
    var chave = lado === 'esquerdo' ? 'atalhoInferiorEsquerdo' : 'atalhoInferiorDireito';
    var chaveOutro = outroLado === 'esquerdo' ? 'atalhoInferiorEsquerdo' : 'atalhoInferiorDireito';
    var anterior = state[chave];

    if (valor !== 'nenhum' && state[chaveOutro] === valor) {
      state[chaveOutro] = anterior === valor ? 'nenhum' : anterior;
    }

    state[chave] = valor;
    salvarAtalhosInferiores();
    render();
  }

  function restaurarAtalhosInferiores() {
    state.atalhoInferiorEsquerdo = 'perfil';
    state.atalhoInferiorDireito = 'agenda';
    salvarAtalhosInferiores();
    render();
    mostrarToast('Atalhos restaurados.');
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
    state.resumoPerfilDestaqueId = empresaSelecionada.id;
    state.resumoPerfilExibidoId = '';
    window._avaProfilePillHidden = false;
    state.pontoModuloAtivo = false;
    state.vendasMobileModuloAtivo = false;
    state.preparacaoSistemaVendas = null;
    state.pontoResumo = [];
    state.pontoFuncionariosHoje = 0;
    state.pontoResumoCarregando = false;

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
    state.menuConfigAnimacao = '';
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

  function receitasPrevistasDoDia(ano, mes, dia) {
    return (state.entradas || []).filter(function (item) {
      return item && item.mes === mes && Number(item.dia) === Number(dia) && item.status === 'prevista';
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

  function configurarRealtimeFinanceiroMobile() {
    try {
      if (!state.empresa || !state.empresa.id) return;
      var empresaId = state.empresa.id;
      if (window._avaRealtimeFinanceiroEmpresaId === empresaId) return;
      if (window._avaRealtimeFinanceiro) db.removeChannel(window._avaRealtimeFinanceiro);

      window._avaRealtimeFinanceiroEmpresaId = empresaId;
      window._avaRealtimeFinanceiro = db
        .channel('financeiro_sync_' + empresaId)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'lancamentos', filter: 'empresa_id=eq.' + empresaId },
          function () { carregarDados(); })
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'caixinhas_movimentos', filter: 'empresa_id=eq.' + empresaId },
          function () { carregarDados(); })
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'recorrencias', filter: 'empresa_id=eq.' + empresaId },
          function () { carregarRecorrencias(); carregarDados(); })
        .on('broadcast',
          { event: 'financeiro_atualizado' },
          function () { carregarRecorrencias(); carregarDados(); })
        .subscribe();
    } catch (e) {}
  }

  function atualizarNotificacoesTempoRealMobile() {
    try {
      if (state.modalMenu === 'notificacoes') {
        carregarNotificacoesLista().then(function () {
          carregarNotificacoesNaoLidas();
          render();
        });
        return;
      }
      carregarNotificacoesNaoLidas();
    } catch (e) {}
  }

  function configurarRealtimeNotificacoesMobile() {
    try {
      if (!state.usuario || !state.usuario.id) return;
      var empresaId = state.empresa && state.empresa.id ? state.empresa.id : 'sem_empresa';
      var chave = state.usuario.id + '_' + empresaId;
      if (window._avaRealtimeNotificacoesChave === chave) return;
      if (window._avaRealtimeNotificacoes) db.removeChannel(window._avaRealtimeNotificacoes);

      window._avaRealtimeNotificacoesChave = chave;
      var canal = db
        .channel('notificacoes_mobile_' + chave)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notificacoes', filter: 'user_id=eq.' + state.usuario.id },
          atualizarNotificacoesTempoRealMobile);
      if (state.empresa && state.empresa.id) {
        canal = canal.on('postgres_changes',
          { event: '*', schema: 'public', table: 'notificacoes', filter: 'empresa_id=eq.' + state.empresa.id },
          atualizarNotificacoesTempoRealMobile);
      }
      window._avaRealtimeNotificacoes = canal.subscribe();
    } catch (e) {}
  }

  function dataHoraPontoMobile() {
    var agora = new Date();
    var dataPartes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(agora);
    var horaPartes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(agora);
    function parte(lista, tipo) {
      return Number((lista.find(function (item) { return item.type === tipo; }) || {}).value || 0);
    }
    var ano = parte(dataPartes, 'year');
    var mes = parte(dataPartes, 'month');
    var dia = parte(dataPartes, 'day');
    return {
      data: String(ano) + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0'),
      diaSemana: new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay(),
      minutos: parte(horaPartes, 'hour') * 60 + parte(horaPartes, 'minute'),
    };
  }

  function minutosHorarioPontoMobile(valor) {
    var match = String(valor || '').match(/^(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function diaNaoUtilPontoMobile(iso, lista) {
    var md = String(iso || '').slice(5);
    return (lista || []).some(function (item) {
      if (!item.recorrente_anual) return iso >= item.data_inicio && iso <= item.data_fim;
      var inicio = String(item.data_inicio || '').slice(5);
      var fim = String(item.data_fim || '').slice(5);
      return inicio <= fim ? md >= inicio && md <= fim : md >= inicio || md <= fim;
    });
  }

  async function carregarResumoPontoMobile() {
    if (!podeGerenciarPontoMobile()) {
      state.pontoResumo = [];
      state.pontoFuncionariosHoje = 0;
      state.pontoResumoCarregando = false;
      return;
    }

    state.pontoResumoCarregando = true;
    var periodo = dataHoraPontoMobile();
    var empresaId = state.empresa.id;
    var respostas = await Promise.all([
      db.from('ponto_funcionarios')
        .select('user_id, nome, hora_entrada, hora_saida, dias_trabalho')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome', { ascending: true }),
      db.from('ponto_registros')
        .select('user_id, tipo, registrado_em')
        .eq('empresa_id', empresaId)
        .eq('dia', periodo.data)
        .order('registrado_em', { ascending: true }),
      db.from('ponto_dias_nao_uteis')
        .select('data_inicio, data_fim, recorrente_anual')
        .eq('empresa_id', empresaId),
    ]);

    if (respostas[0].error || respostas[1].error) {
      state.pontoResumoCarregando = false;
      render();
      return;
    }
    var diasNaoUteis = respostas[2].error ? [] : (respostas[2].data || []);
    if (diaNaoUtilPontoMobile(periodo.data, diasNaoUteis)) {
      state.pontoFuncionariosHoje = 0;
      state.pontoResumo = [];
      state.pontoResumoCarregando = false;
      render();
      return;
    }

    var funcionariosHoje = (respostas[0].data || []).filter(function (funcionario) {
      return funcionario.user_id
        && Array.isArray(funcionario.dias_trabalho)
        && funcionario.dias_trabalho.length > 0
        && funcionario.dias_trabalho.indexOf(periodo.diaSemana) >= 0;
    });
    var registrosPorUsuario = {};
    (respostas[1].data || []).forEach(function (registro) {
      if (!registrosPorUsuario[registro.user_id]) registrosPorUsuario[registro.user_id] = [];
      registrosPorUsuario[registro.user_id].push(registro);
    });

    var tiposObrigatorios = ['entrada', 'saida_refeicao', 'retorno_refeicao', 'saida'];
    var resumo = [];
    funcionariosHoje.forEach(function (funcionario) {
      var entradaPrevista = minutosHorarioPontoMobile(funcionario.hora_entrada);
      var saidaPrevista = minutosHorarioPontoMobile(funcionario.hora_saida);
      var registros = registrosPorUsuario[funcionario.user_id] || [];
      var tipos = registros.map(function (registro) { return registro.tipo; });

      if (saidaPrevista !== null && periodo.minutos > saidaPrevista + 10) {
        if (!registros.length) {
          resumo.push({ userId: funcionario.user_id, nome: funcionario.nome, status: 'falta' });
          return;
        }
        if (tiposObrigatorios.some(function (tipo) { return tipos.indexOf(tipo) < 0; })) {
          resumo.push({ userId: funcionario.user_id, nome: funcionario.nome, status: 'incompleto' });
          return;
        }
      }

      var entrada = registros.find(function (registro) { return registro.tipo === 'entrada'; });
      if (entradaPrevista !== null) {
        if (!entrada && periodo.minutos > entradaPrevista + 10) {
          resumo.push({ userId: funcionario.user_id, nome: funcionario.nome, status: 'atraso' });
          return;
        }
        if (entrada) {
          var partesEntrada = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
          }).formatToParts(new Date(entrada.registrado_em));
          var hora = Number((partesEntrada.find(function (item) { return item.type === 'hour'; }) || {}).value || 0);
          var minuto = Number((partesEntrada.find(function (item) { return item.type === 'minute'; }) || {}).value || 0);
          if (hora * 60 + minuto > entradaPrevista + 10) {
            resumo.push({ userId: funcionario.user_id, nome: funcionario.nome, status: 'atraso' });
          }
        }
      }
    });

    state.pontoFuncionariosHoje = funcionariosHoje.length;
    state.pontoResumo = resumo;
    state.pontoResumoCarregando = false;
    render();
  }

  function configurarRealtimePontoMobile() {
    try {
      if (!podeGerenciarPontoMobile()) {
        if (window._avaRealtimePonto) db.removeChannel(window._avaRealtimePonto);
        window._avaRealtimePonto = null;
        window._avaRealtimePontoEmpresaId = '';
        if (window._avaIntervaloPonto) window.clearInterval(window._avaIntervaloPonto);
        window._avaIntervaloPonto = null;
        return;
      }
      var empresaId = state.empresa.id;
      if (window._avaRealtimePontoEmpresaId === empresaId) return;
      if (window._avaRealtimePonto) db.removeChannel(window._avaRealtimePonto);
      if (window._avaIntervaloPonto) window.clearInterval(window._avaIntervaloPonto);
      window._avaRealtimePontoEmpresaId = empresaId;
      window._avaRealtimePonto = db
        .channel('ponto_dashboard_mobile_' + empresaId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ponto_registros', filter: 'empresa_id=eq.' + empresaId }, carregarResumoPontoMobile)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ponto_funcionarios', filter: 'empresa_id=eq.' + empresaId }, carregarResumoPontoMobile)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ponto_dias_nao_uteis', filter: 'empresa_id=eq.' + empresaId }, carregarResumoPontoMobile)
        .subscribe();
      window._avaIntervaloPonto = window.setInterval(carregarResumoPontoMobile, 30000);
    } catch (e) {}
  }

  function notificarFinanceiroAtualizadoMobile() {
    try {
      if (!state.empresa || !state.empresa.id || !window._avaRealtimeFinanceiro) return;
      window._avaRealtimeFinanceiro.send({
        type: 'broadcast',
        event: 'financeiro_atualizado',
        payload: { empresaId: state.empresa.id, origem: 'mobile', ts: Date.now() },
      });
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
      '<div class="relative flex h-7 w-[84px] shrink-0 items-center justify-center gap-1.5 px-2">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0 text-[#082B57]"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="M3.5 9h17M8 3v3M16 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<p class="text-sm font-black leading-none text-[#082B57]">' + escapeHtml(String(state.ano)) + '</p>' +
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

  // A data do item (ano/mes/dia) e exatamente hoje?
  function ehDataHoje(ano, mesIndice, dia) {
    var hoje = new Date();
    return Number(ano) === hoje.getFullYear() && Number(mesIndice) === hoje.getMonth() && Number(dia) === hoje.getDate();
  }
  function ehDespesaHoje(item) {
    return item && ehDataHoje(Number(state.ano), indiceMes(item.mes), item.dia);
  }

  // Tipos que pedem confirmacao na data (parcela NAO pede).
  function tipoPedeConfirmacao(tipo) {
    return tipo === 'previsto' || tipo === 'fixa';
  }

  // Permanece pendente desde a data programada ate confirmar ou excluir.
  function ehDespesaAConfirmar(item) {
    return item && item.status === 'prevista' && tipoPedeConfirmacao(item.tipo) && !dataFutura(Number(state.ano), indiceMes(item.mes), item.dia);
  }

  // Receita prevista tambem permanece pendente ate uma acao explicita.
  function ehReceitaAConfirmar(item) {
    return item && item.status === 'prevista' && !dataFutura(Number(state.ano), indiceMes(item.mes), item.dia);
  }

  // Receitas criadas por módulos conectados pertencem ao sistema de origem.
  // No Gestão elas são apenas informativas: não podem abrir o card de ação,
  // nem ser editadas ou excluídas por esta interface.
  function ehReceitaSincronizada(item) {
    if (!item) return false;
    var tipo = String(item.tipo || '').toLowerCase();
    return tipo === 'vendas_mobile_sistema' || tipo === 'recebimentos_sistema';
  }

  // Selo colorido por tipo de despesa (previsto/fixa/parcela).
  function seloTipoHtml(item) {
    if (!item || !item.tipo) return '';
    var mapa = {
      previsto: { txt: 'Previsto', cls: 'bg-amber-100 text-amber-700' },
      fixa: { txt: 'Fixa', cls: 'bg-indigo-100 text-indigo-700' },
      parcela: { txt: 'Parcela', cls: 'bg-violet-100 text-violet-700' },
    };
    var s = mapa[item.tipo];
    if (!s) return '';
    return ' <span class="ml-1 inline-block rounded-full px-1.5 align-middle text-[10px] font-black ' + s.cls + '">' + s.txt + '</span>';
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
    // Receita "prevista" (data futura, nao confirmada) nao entra no efetivado, so na previsao.
    // Passando o dia sem confirmar, e considerada efetivada (lazy, igual as despesas).
    var receitasNaoPrevistas = 0;
    var receitasPrevistasFuturas = 0;
    var receitasPrevistasPassadas = 0;
    entradas.forEach(function (item) {
      if (item.status === 'prevista') {
        var noDiaOuFuturo = ehDespesaFutura(mesIndice, item.dia) || ehDataHoje(Number(state.ano), mesIndice, item.dia);
        if (noDiaOuFuturo) receitasPrevistasFuturas += item.valor;
        else receitasPrevistasPassadas += item.valor;
      } else {
        receitasNaoPrevistas += item.valor;
      }
    });
    var receitasBase = temTotalDefinido ? state.faturamentos[mes] : receitasNaoPrevistas;
    var receitas = receitasBase + receitasPrevistasPassadas;
    var receitasPrevistas = receitasPrevistasFuturas;

    return {
      mes: mes,
      lancamentos: lancamentos,
      entradas: entradas,
      despesas: despesasRealizadas,
      despesasFuturas: despesasFuturas,
      despesasTotais: despesasRealizadas + despesasFuturas,
      receitas: receitas,
      receitasPrevistas: receitasPrevistas,
      saldo: receitas - despesasRealizadas,
      saldoPrevisto: (receitas + receitasPrevistas) - (despesasRealizadas + despesasFuturas),
    };
  }

  function dadosMesAnterior() {
    var indice = indiceMes(state.mes) - 1;
    if (indice < 0) indice = 11;
    return dadosMes(meses[indice]);
  }

  function entradasReceitaVisiveis(atual) {
    var mes = atual && atual.mes ? atual.mes : state.mes;
    var entradas = (atual && atual.entradas ? atual.entradas : []).slice();
    var temTotalDefinido = Object.prototype.hasOwnProperty.call(state.faturamentos, mes);
    var totalMensal = Number(state.faturamentos[mes] || 0);
    var totalEntradasRealizadas = entradas.reduce(function (acc, item) {
      return item.status === 'prevista' ? acc : acc + Number(item.valor || 0);
    }, 0);
    var totalBase = Math.max(0, totalMensal - totalEntradasRealizadas);
    var totalNaoRepresentado = temTotalDefinido && totalBase > 0.009;

    if (!totalNaoRepresentado) return entradas;

    return [{
      id: '__total_mensal__-' + mes,
      mes: mes,
      dia: 0,
      origem: 'Total do mes',
      valor: totalBase,
      status: 'total_mensal',
      tipo: 'total_mensal',
      totalMensal: true,
    }].concat(entradas);
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

  function limparAlertasAcessoMobile() {
    state.tentativaLogin = Number(state.tentativaLogin || 0) + 1;
    state.loginAcao = '';
    state.erro = '';
    state.mensagem = '';
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

  // Lista curada de países + DDI (espelho de app/lib/paises.ts).
  var PAISES_MOBILE = [
    ['Brasil','55','🇧🇷'],['Portugal','351','🇵🇹'],['Estados Unidos / Canadá','1','🇺🇸'],
    ['Argentina','54','🇦🇷'],['Uruguai','598','🇺🇾'],['Paraguai','595','🇵🇾'],['Chile','56','🇨🇱'],
    ['Bolívia','591','🇧🇴'],['Peru','51','🇵🇪'],['Colômbia','57','🇨🇴'],['Equador','593','🇪🇨'],
    ['Venezuela','58','🇻🇪'],['México','52','🇲🇽'],['Panamá','507','🇵🇦'],['Costa Rica','506','🇨🇷'],
    ['Guatemala','502','🇬🇹'],['Honduras','504','🇭🇳'],['El Salvador','503','🇸🇻'],['Nicarágua','505','🇳🇮'],
    ['Cuba','53','🇨🇺'],['Angola','244','🇦🇴'],['Moçambique','258','🇲🇿'],['Cabo Verde','238','🇨🇻'],
    ['Espanha','34','🇪🇸'],['França','33','🇫🇷'],['Itália','39','🇮🇹'],['Alemanha','49','🇩🇪'],
    ['Reino Unido','44','🇬🇧'],['Irlanda','353','🇮🇪'],['Países Baixos','31','🇳🇱'],['Bélgica','32','🇧🇪'],
    ['Suíça','41','🇨🇭'],['Áustria','43','🇦🇹'],['Suécia','46','🇸🇪'],['Noruega','47','🇳🇴'],
    ['Dinamarca','45','🇩🇰'],['Finlândia','358','🇫🇮'],['Polônia','48','🇵🇱'],['Rússia','7','🇷🇺'],
    ['Ucrânia','380','🇺🇦'],['Grécia','30','🇬🇷'],['Turquia','90','🇹🇷'],['Israel','972','🇮🇱'],
    ['Emirados Árabes Unidos','971','🇦🇪'],['Arábia Saudita','966','🇸🇦'],['Catar','974','🇶🇦'],
    ['Índia','91','🇮🇳'],['China','86','🇨🇳'],['Japão','81','🇯🇵'],['Coreia do Sul','82','🇰🇷'],
    ['Singapura','65','🇸🇬'],['Malásia','60','🇲🇾'],['Tailândia','66','🇹🇭'],['Indonésia','62','🇮🇩'],
    ['Filipinas','63','🇵🇭'],['Vietnã','84','🇻🇳'],['Austrália','61','🇦🇺'],['Nova Zelândia','64','🇳🇿'],
    ['África do Sul','27','🇿🇦'],['Nigéria','234','🇳🇬'],['Egito','20','🇪🇬'],['Marrocos','212','🇲🇦']
  ];

  function opcoesDdiHtml(selecionado) {
    var sel = selecionado || '55';
    return PAISES_MOBILE.map(function (p) {
      return '<option value="' + p[1] + '"' + (p[1] === sel ? ' selected' : '') + '>' + p[2] + ' +' + p[1] + '</option>';
    }).join('');
  }

  function campo(id) {
    var item = document.getElementById(id);
    return item ? item.value : '';
  }

  function diaHojeLancamentoMobile() {
    return String(new Date().getDate());
  }

  function prepararNovoLancamentoMobile() {
    if (!state.despesaDia) {
      state.despesaDia = diaHojeLancamentoMobile();
      state.despesaDiaAutoHoje = true;
    }
    if (!state.entradaDia) {
      state.entradaDia = diaHojeLancamentoMobile();
      state.entradaDiaAutoHoje = true;
    }
  }

  function limparRascunhoLancamentoMobile() {
    state.despesaDia = '';
    state.despesaDiaAutoHoje = false;
    state.despesaNome = '';
    state.despesaDescricao = '';
    state.despesaValor = '';
    state.entradaDia = '';
    state.entradaDiaAutoHoje = false;
    state.entradaOrigem = '';
    state.entradaValor = '';
    state.receitaTotal = '';
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

  function abrirSobreMobile() {
    state.menuAberto = false;
    state.modalMenu = 'sobre';
    render();
    if (!state.changelog && !state.changelogCarregando) {
      state.changelogCarregando = true;
      fetch('/changelog.json')
        .then(function (r) { return r.json(); })
        .then(function (d) { state.changelog = d; })
        .catch(function () {})
        .finally(function () {
          state.changelogCarregando = false;
          if (state.modalMenu === 'sobre') render();
        });
    }
  }

  function fecharModalMenu() {
    if (state.modalMenu === 'gerenciar') {
      if (state.empresaEdicaoAberta) { cancelarEdicaoEmpresaMobile(); return; }
      if (state.empresaCriarAberta) { cancelarCriarEmpresaMobile(); return; }
      if (state.empresaExclusaoAberta) {
        state.empresaExclusaoAberta = false;
        state.erro = '';
        render();
        return;
      }
    }
    if (state.modalMenuRetorno) {
      state.modalMenu = state.modalMenuRetorno;
      state.modalMenuRetorno = '';
      render();
      return;
    }
    if (state.modalMenu === 'categorias') {
      state.categoriaEditandoId = '';
      state.categoriaAcoesId = '';
    }
    if (state.modalMenu === 'feedback') {
      limparFeedbackMobile();
    }
    state.empresaExclusaoAberta = false;
    state.modalMenuRetorno = '';
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

  function cancelarJanelasMobile() {
    state.cadastroPerfilEditando = false;
    state.cadastroPerfilRetornoGerenciar = false;
    state.modalMenu = '';
    state.modalMenuRetorno = '';
    state.menuAberto = false;
    state.menuConfigAberto = false;
    state.menuConfigAnimacao = '';
    state.modalLancamento = false;
    state.modalAcao = null;
    state.exclusaoRecorrencia = null;
    state.agendaFormAberto = false;
    state.novaDespesaAberta = false;
    state.empresaExclusaoAberta = false;
    state.empresaEdicaoAberta = false;
    state.empresaCriarAberta = false;
    state.categoriaAcoesId = null;
    state.recorrEditandoId = null;
    state.usuarioEditandoId = null;
    state.usuarioModo = '';
    state.usuarioExistenteResultado = null;
    state.feedbackEtapa = 'inicio';
    state.mostrarPromptNotificacoes = false;
    state.tourAberto = false;
    state.erro = '';
  }

  function voltarDashboard() {
    cancelarJanelasMobile();
    state.visao = 'home';
    state.busca = '';
    state.agendaDiaSelecionado = null;
    render();
    requestAnimationFrame(function () {
      var scroll = document.getElementById('mobile-main-scroll');
      if (scroll) scroll.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function abrirLancamentoPelaNavegacao() {
    cancelarJanelasMobile();
    state.visao = 'home';
    state.busca = '';
    state.agendaDiaSelecionado = null;
    prepararNovoLancamentoMobile();
    state.modalLancamento = true;
    render();
  }

  function abrirMenuPelaNavegacao() {
    if (state.menuAberto) {
      fecharMenuLateralAnimado();
      return;
    }
    cancelarJanelasMobile();
    state.visao = 'home';
    state.busca = '';
    state.agendaDiaSelecionado = null;
    state.menuAberto = true;
    state.menuAnimacao = 'entrar';
    render();
    atualizarEstadoNotificacoesMobile(false);
    setTimeout(function () {
      if (state.menuAberto && state.menuAnimacao === 'entrar') state.menuAnimacao = '';
    }, 390);
  }

  function fecharMenuLateralAnimado(acaoDepois) {
    if (!state.menuAberto) {
      if (typeof acaoDepois === 'function') acaoDepois();
      return;
    }
    if (state.menuAnimacao === 'sair') return;
    state.menuAnimacao = 'sair';
    render();
    setTimeout(function () {
      state.menuAberto = false;
      state.menuConfigAberto = false;
      state.menuConfigAnimacao = '';
      state.menuAnimacao = '';
      if (typeof acaoDepois === 'function') acaoDepois();
      else render();
    }, 315);
  }

  function executarAposFecharMenu(acao) {
    if (state.menuAberto) fecharMenuLateralAnimado(acao);
    else acao();
  }

  async function executarAtalhoInferior(tipo) {
    cancelarJanelasMobile();
    state.visao = 'home';
    state.busca = '';
    state.agendaDiaSelecionado = null;
    if (tipo === 'perfil') {
      state.modalMenu = 'empresa';
      render();
      return;
    }
    if (tipo === 'agenda') {
      state.visao = 'agenda';
      state.busca = '';
      state.agendaDiaSelecionado = null;
      state.agendaFormAberto = false;
      render();
      return;
    }
    if (tipo === 'tema') {
      state.darkMode = !state.darkMode;
      try {
        localStorage.setItem('avantalab_mobile_dark', state.darkMode ? '1' : '0');
      } catch (error) {}
      render();
      return;
    }
    if (tipo === 'despesasFixas') {
      state.modalMenu = 'despesasFixas';
      render();
      await carregarRecorrencias();
      return;
    }
    if (tipo === 'sistemas') abrirFluxoSistemasMobile();
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
    // background-image (em vez de <img>) para nao "piscar" ao reconstruir o innerHTML a cada render.
    return '<span class="ava-logo-principal" role="img" aria-label="Ava" style="display:block;width:' + width + 'px;height:' + height + 'px;background-image:url(/images/ava-logo-principal.png);background-size:contain;background-position:center;background-repeat:no-repeat;flex-shrink:0;transform:translateZ(0);backface-visibility:hidden;-webkit-backface-visibility:hidden;contain:paint;"></span>';
  }

  function avaLogoArquivoHtml(width, height, src) {
    // O root mobile é reconstruído a cada ação. Backgrounds reutilizam a
    // imagem já decodificada e evitam o flicker causado pela recriação de <img>.
    return '<span role="img" aria-label="Ava" style="display:block;width:' + width + 'px;height:' + height + 'px;background-image:url(' + escapeHtml(src) + ');background-size:contain;background-position:center;background-repeat:no-repeat;flex-shrink:0;transform:translateZ(0);backface-visibility:hidden;-webkit-backface-visibility:hidden;contain:paint;"></span>';
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
    if (recursoExclusivoAssinanteMobile()) {
      mostrarAvisoAssinanteMobile('Ava IA', 'A Ava IA é uma função exclusiva para assinantes. Assine um plano para conversar com a assistente.');
      return;
    }
    var parametros = new URLSearchParams();
    parametros.set('ano', String(state.ano || new Date().getFullYear()));
    parametros.set('mes', String(state.mes || ''));
    var evento = new CustomEvent('avantalab:open-ava', {
      cancelable: true,
      detail: { ano: state.ano, mes: state.mes }
    });
    var tratadoPeloPortal = !window.dispatchEvent(evento);
    if (!tratadoPeloPortal) window.location.assign('/mobile/ava?' + parametros.toString());
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

  function fecharChatIAParaHome() {
    state.visao = 'home';
    state.busca = '';
    state.modalMenu = '';
    state.menuAberto = false;
    state.modalLancamento = false;
    state.modalAcao = null;
    fecharChatIA();
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

  function saudacaoPeriodoMobile() {
    var horaAtual = new Date().getHours();
    if (horaAtual < 12) return 'Bom dia!';
    if (horaAtual < 18) return 'Boa tarde!';
    return 'Boa noite!';
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
    return Boolean(state.visao === 'agenda' || state.modalLancamento || state.modalMenu || state.menuAberto || state.modalAcao || state.exclusaoRecorrencia || state.chatIAAberto || state.tourAberto);
  }

  function podeAtualizarDadosAoRetornar() {
    var ativo = document.activeElement;
    if (ativo && ativo.matches && ativo.matches('input, select, textarea, [contenteditable="true"]')) return false;
    if (state.carregando || state.lancandoDespesa || state.recorrSalvando || state.empresaAcao || state.assinaturaAcao) return false;
    if (state.modalLancamento || state.modalMenu || state.menuAberto || state.modalAcao || state.exclusaoRecorrencia || state.chatIAAberto || state.tourAberto) return false;
    if (state.agendaFormAberto || state.empresaEdicaoAberta || state.empresaCriarAberta || state.empresaExclusaoAberta) return false;
    return true;
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
        app_origem: 'mobile',
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

      if (resultado.error) {
        mostrarToast('Nao foi possivel salvar a inscricao.');
        return;
      }
      state.notificacoesAtivas = true;
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
      state.notificacoesAtivas = false;
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
  async function alternarNotificacoesMobile() {
    // Premium Pessoal: notificações são recurso pago no plano grátis.
    if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('notificacoes'); return; }
    if (!('Notification' in window)) return ativarNotificacoesMobile();
    if (Notification.permission === 'granted') return desativarOuReativarNotificacoes();
    return ativarNotificacoesMobile();
  }

  async function atualizarEstadoNotificacoesMobile(renderizar) {
    var ativas = false;
    try {
      if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator && 'PushManager' in window) {
        var registro = await navigator.serviceWorker.ready;
        var inscricao = await registro.pushManager.getSubscription();
        ativas = Boolean(inscricao);
        if (inscricao && state.usuario && state.usuario.id) {
          await db.from('push_subscriptions').update({ app_origem: 'mobile', atualizado_em: new Date().toISOString() }).eq('endpoint', inscricao.endpoint);
        }
      }
    } catch (e) {}
    state.notificacoesAtivas = ativas;
    if (renderizar && state.menuAberto) render();
  }

  // Na primeira abertura (uma vez por aparelho), oferece ativar as
  // notificacoes. O toque no botao "Ativar" e o gesto que o iOS exige
  // para disparar o pedido de permissao do sistema.
  function avaliarPromptNotificacoes() {
    try {
      if (premiumPessoalBloqueadoMobile()) return; // premium: não oferece no grátis
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
      '<div id="prompt-notif-overlay" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 px-5 pt-4" style="padding-bottom:calc(env(safe-area-inset-bottom) + 78px)">' +
        '<div class="w-full max-w-xs overflow-y-auto rounded-3xl bg-white text-center shadow-2xl" style="max-height:calc(100dvh - env(safe-area-inset-bottom) - 102px)">' +
          '<div class="flex items-center gap-3 px-5 py-4 text-left text-white" style="background-color:#003E73">' +
            '<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">&#128276;</div>' +
            '<h2 class="text-base font-black">Ativar notificacoes?</h2>' +
          '</div>' +
          '<div class="p-5">' +
            '<p class="text-xs font-semibold text-slate-500">Receba no celular os lembretes e avisos da sua agenda, mesmo com o app fechado.</p>' +
            '<div class="mt-4 grid gap-2">' +
            '<button id="prompt-notif-ativar" type="button" class="h-11 rounded-xl bg-slate-950 text-sm font-black uppercase tracking-wide text-white">Ativar</button>' +
            '<button id="prompt-notif-agora-nao" type="button" class="h-10 rounded-xl text-xs font-bold text-slate-500">Agora nao</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ─── Tutorial (tour de primeiro acesso) ─────────────────────
  var PASSOS_TOUR = [
    { icone: '👋', local: '', titulo: 'Bem-vindo ao AvantaLab!', descricao: 'Este tour mostra como o app funciona hoje. Você pode pular e rever quando quiser em Menu → Tutorial.' },
    { icone: '🏢', local: 'Atalho Perfil / Menu → Gerenciar perfil', titulo: 'Perfis financeiros', descricao: 'Alterne entre os perfis Empresa ou Pessoal ligados ao seu login. Pelo mesmo local você cria outro perfil e completa ou edita seus dados cadastrais.' },
    { icone: '➕', local: 'Botão Lançar, no centro da barra inferior', titulo: 'Novo lançamento', descricao: 'O cabeçalho mostra o mês selecionado. Escolha Despesa ou Receita, informe os dados e salve: tudo fica sincronizado com a versão web.' },
    { icone: '📷', local: 'Novo lançamento → Despesa', titulo: 'Foto e arquivo da nota', descricao: 'Assinantes podem enviar uma foto ou arquivo da nota para preencher o lançamento com ajuda da leitura inteligente.' },
    { icone: '✅', local: 'Menu → Cadastrar despesas', titulo: 'Tipos de despesa', descricao: 'Cadastre os tipos de despesa que você usa e vincule cada um à categoria correta. Assim os totais e gráficos ficam organizados.' },
    { icone: '🔁', local: 'Menu → Despesas fixas', titulo: 'Despesas recorrentes', descricao: 'Crie despesas fixas para projetar os próximos meses. Use a edição do lançamento para um mês específico e Despesas fixas para administrar toda a recorrência.' },
    { icone: '💰', local: 'Card Caixinha', titulo: 'Construa sua reserva', descricao: 'Defina um aporte inicial e registre novos aportes. Cada aporte também cria a despesa correspondente no mês selecionado.' },
    { icone: '🤖', local: 'Cards Ava e Insights da Ava', titulo: 'Ava e Insights', descricao: 'A Ava IA e os Insights analisam seus resultados e ajudam a interpretar o mês. Esses recursos são exclusivos para assinantes.', destaque: true },
    { icone: '🧩', local: 'Menu → Mostrar/ocultar cards', titulo: 'Organize o dashboard', descricao: 'Escolha os cards exibidos, altere sua ordem e revele valores pelo ícone de olho. Os dois atalhos laterais também podem ser personalizados.' },
    { icone: '📅', local: 'Agenda e sininho', titulo: 'Agenda e notificações', descricao: 'A agenda reúne lembretes, compromissos e lançamentos futuros. Ative as notificações para receber os avisos no celular.' },
    { icone: '💾', local: 'Menu → Configurações', titulo: 'Backup e configurações', descricao: 'Em Configurações você encontra backup, restauração, tema, segurança e outras opções do perfil.' },
    { icone: '🚀', local: '', titulo: 'Tudo pronto!', descricao: 'Comece pelos lançamentos do mês e acompanhe os cards do dashboard. Este tutorial continua disponível em Menu → Tutorial.' },
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
      '<div id="tour-overlay" class="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/85 px-4 pt-4" style="padding-bottom:calc(env(safe-area-inset-bottom) + 78px)">' +
        '<div class="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" style="max-height:calc(100dvh - env(safe-area-inset-bottom) - 102px);">' +
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

  // ── Painel de notificacoes (lista as mensagens do sininho) ──
  async function abrirNotificacoesMobile() {
    state.menuAberto = false;
    state.modalMenu = 'notificacoes';
    state.notificacoesCarregando = true;
    render();
    await carregarNotificacoesLista();
    render();
    // marca como lidas (zera a bolinha) mantendo as mensagens visiveis no painel
    marcarNotificacoesComoLidas();
  }

  async function carregarNotificacoesLista() {
    state.notificacoesCarregando = true;
    try {
      var resp = await db
        .from('notificacoes')
        .select('id, titulo, corpo, url, tipo, lida, criado_em')
        .order('criado_em', { ascending: false })
        .limit(50);
      state.notificacoesLista = (resp && resp.data) ? resp.data : [];
    } catch (e) {
      state.notificacoesLista = [];
    }
    state.notificacoesCarregando = false;
  }

  function quandoNotificacaoTexto(criadoEm) {
    if (!criadoEm) return '';
    var d = new Date(criadoEm);
    if (isNaN(d.getTime())) return '';
    var agora = new Date();
    var difMin = Math.floor((agora.getTime() - d.getTime()) / 60000);
    if (difMin < 1) return 'Agora';
    if (difMin < 60) return 'Ha ' + difMin + ' min';
    if (difMin < 1440 && agora.getDate() === d.getDate()) return 'Hoje ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function notificacoesMobileHtml() {
    if (state.notificacoesCarregando) {
      return '<p class="py-8 text-center text-sm font-semibold text-slate-500">Carregando...</p>';
    }
    var lista = state.notificacoesLista || [];
    if (!lista.length) {
      return '<div class="py-10 text-center"><p class="text-sm font-semibold text-slate-500">Nenhuma notificacao por aqui ainda.</p></div>';
    }
    var coresTipo = {
      despesa: 'bg-amber-100 text-amber-700',
      agenda: 'bg-cyan-100 text-cyan-700',
      novidade: 'bg-emerald-100 text-emerald-700',
      sistema: 'bg-slate-100 text-slate-600'
    };
    var rotulosTipo = { despesa: 'Despesa', agenda: 'Agenda', novidade: 'Novidade', sistema: 'Sistema' };
    var lixeiraSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
    var header = '<div class="mb-2 flex items-center justify-between gap-2">' +
      '<span class="text-[11px] font-bold text-slate-500">' + lista.length + ' notifica&ccedil;' + (lista.length > 1 ? '&otilde;es' : '&atilde;o') + '</span>' +
      '<button id="limpar-notificacoes" type="button" class="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-black text-rose-600 active:bg-rose-50">Limpar todas</button>' +
    '</div>';
    return header + '<div class="grid gap-2">' + lista.map(function (n) {
      var naoLida = n.lida === false;
      var selo = coresTipo[n.tipo] || coresTipo.sistema;
      var rotulo = rotulosTipo[n.tipo] || 'Aviso';
      return '<div class="rounded-2xl border p-3 ' + (naoLida ? 'border-cyan-200 bg-cyan-50/60' : 'border-slate-200 bg-white') + '">' +
          '<div class="mb-1 flex items-center gap-2">' +
            (naoLida ? '<span class="h-2 w-2 shrink-0 rounded-full bg-cyan-500"></span>' : '') +
            '<span class="inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ' + selo + '">' + escapeHtml(rotulo) + '</span>' +
            '<span class="ml-auto shrink-0 text-[10px] font-bold text-slate-400">' + escapeHtml(quandoNotificacaoTexto(n.criado_em)) + '</span>' +
            '<button type="button" data-excluir-notificacao="' + escapeHtml(n.id) + '" class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 active:bg-slate-100" aria-label="Excluir">' + lixeiraSvg + '</button>' +
          '</div>' +
          '<p class="text-sm font-black text-slate-900">' + escapeHtml(n.titulo || '') + '</p>' +
          (n.corpo ? '<p class="mt-0.5 whitespace-pre-line text-xs font-semibold text-slate-600">' + escapeHtml(n.corpo) + '</p>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  async function excluirNotificacaoMobile(id) {
    state.notificacoesLista = (state.notificacoesLista || []).filter(function (n) { return String(n.id) !== String(id); });
    render();
    try { await db.from('notificacoes').delete().eq('id', id); } catch (e) {}
    carregarNotificacoesNaoLidas();
  }

  async function limparNotificacoesMobile() {
    var ids = (state.notificacoesLista || []).map(function (n) { return n.id; });
    if (!ids.length) return;
    state.notificacoesLista = [];
    state.notificacoesNaoLidas = 0;
    atualizarBadgeApp(0);
    render();
    try { await db.from('notificacoes').delete().in('id', ids); } catch (e) {}
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

  function podeGerenciarConteudoVendas() {
    return state.empresa && ['gestor_master', 'administrador', 'operador_completo'].includes(state.empresa.perfil);
  }

  async function tokenSessao() {
    var sessao = await promessaMobileComPrazo(
      db.auth.getSession(),
      8000,
      'Não foi possível confirmar a sessão no tempo esperado.'
    );
    return sessao.data && sessao.data.session ? sessao.data.session.access_token : '';
  }

  async function lerNotaPorFotoMobile(arquivo) {
    if (recursoExclusivoAssinanteMobile()) {
      mostrarAvisoAssinanteMobile('Leitura de nota', 'O envio de foto ou arquivo para leitura da nota é uma função exclusiva para assinantes.');
      return;
    }
    if (!arquivo || !state.empresa || state.notaLendo) return;
    var dia = campo('despesa-dia');
    var nome = campo('despesa-nome');
    var descricao = campo('despesa-descricao');
    var valor = campo('despesa-valor');
    state.notaLendo = true;
    state.erro = '';
    render();
    try {
      var token = await tokenSessao();
      if (!token) throw new Error('Sua sessao expirou. Entre novamente.');
      var form = new FormData();
      form.append('empresaId', state.empresa.id);
      form.append('arquivo', arquivo, arquivo.name || 'nota.jpg');
      var resposta = await fetch('/api/lancamentos/ler-foto', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: form,
      });
      var json = await resposta.json().catch(function () { return null; });
      if (!resposta.ok || (json && json.erro)) throw new Error((json && json.mensagem) || 'Nao foi possivel ler a nota.');
      var leitura = json && json.leitura;
      state.despesaDia = dia;
      state.despesaNome = nome;
      state.despesaDescricao = descricao;
      state.despesaValor = valor;
      if (leitura && leitura.data_documento) {
        var partes = String(leitura.data_documento).split('-').map(Number);
        if (partes.length === 3 && partes[0] && partes[1] && partes[2]) {
          state.ano = String(partes[0]);
          state.mes = meses[partes[1] - 1] || state.mes;
          state.despesaDia = String(partes[2]);
          state.despesaDiaAutoHoje = false;
        }
      }
      if (leitura && leitura.valor_total) {
        state.despesaValor = Number(leitura.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (leitura && leitura.despesa_sugerida) state.despesaNome = String(leitura.despesa_sugerida);
      state.notaArquivoPendente = arquivo;
    } catch (e) {
      state.erro = e && e.message ? e.message : 'Nao foi possivel ler a nota.';
    }
    state.notaLendo = false;
    render();
  }

  async function arquivarNotaLancamentoMobile(lancamentoId, arquivo) {
    var token = await tokenSessao();
    if (!token) return { erro: true, mensagem: 'Sua sessao expirou. Entre novamente.' };
    var form = new FormData();
    form.append('lancamentoId', String(lancamentoId));
    form.append('arquivo', arquivo, arquivo.name || 'nota.jpg');
    var resposta = await fetch('/api/lancamentos/nota', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
    var json = await resposta.json().catch(function () { return null; });
    return resposta.ok && json && !json.erro ? { erro: false, caminho: json.caminho || '' } : { erro: true, mensagem: (json && json.mensagem) || 'Nao foi possivel arquivar a nota.' };
  }

  async function removerNotaLancamentoMobile(lancamentoId) {
    var token = await tokenSessao();
    if (!token) return false;
    var resposta = await fetch('/api/lancamentos/nota', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lancamentoId: String(lancamentoId) }),
    });
    var json = await resposta.json().catch(function () { return null; });
    return Boolean(resposta.ok && json && !json.erro);
  }

  async function abrirNotaLancamentoMobile(lancamentoId) {
    state.notaBaixando = true;
    render();
    try {
      var token = await tokenSessao();
      if (!token) throw new Error('Sua sessao expirou. Entre novamente.');
      var resposta = await fetch('/api/lancamentos/nota?lancamentoId=' + encodeURIComponent(String(lancamentoId)), { headers: { Authorization: 'Bearer ' + token } });
      var json = await resposta.json().catch(function () { return null; });
      if (!resposta.ok || !json || json.erro || !json.url) throw new Error((json && json.mensagem) || 'Nao foi possivel abrir a nota.');
      state.notaVisualizandoUrl = json.url;
      render();
    } catch (e) {
      setErro(e && e.message ? e.message : 'Nao foi possivel abrir a nota.');
    } finally {
      state.notaBaixando = false;
      render();
    }
  }

  function notaVisualizacaoHtml() {
    if (!state.notaVisualizandoUrl) return '';
    return '<div id="nota-visualizacao-overlay" class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/90 px-3 py-5">' +
      '<section class="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">' +
      '<header class="flex items-center justify-between px-4 py-3 text-white" style="background:#003E73"><h2 class="text-sm font-black">Nota do lancamento</h2><button id="fechar-nota-lancamento" type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white" aria-label="Fechar nota">' + iconeFecharGeometricoMobile() + '</button></header>' +
      '<div class="min-h-0 flex-1 overflow-auto bg-slate-100 p-3"><img src="' + escapeHtml(state.notaVisualizandoUrl) + '" alt="Nota do lancamento" class="mx-auto max-h-[68vh] max-w-full rounded-xl object-contain shadow-lg" /></div>' +
      '<footer class="border-t border-slate-200 p-3"><button id="compartilhar-nota-lancamento" type="button" class="h-10 w-full rounded-xl bg-[#003E73] text-xs font-black uppercase text-white transition active:scale-[0.98]">Compartilhar</button></footer>' +
      '</section></div>';
  }

  function processandoNotaHtml() {
    if (!state.notaLendo && !state.notaBaixando) return '';
    return '<div class="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/90 px-4" role="status" aria-live="polite">' +
      '<section class="w-full max-w-xs overflow-hidden rounded-3xl bg-white shadow-2xl">' +
      '<div class="flex items-center gap-3 px-4 py-3 text-white" style="background:#003E73"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="animation:avaSpin 1s linear infinite"><path d="M12 3a9 9 0 1 1-6.36 2.64" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span><div><p class="text-sm font-black">' + (state.notaBaixando ? 'Baixando imagem' : 'Processando imagem') + '</p><p class="text-[11px] font-semibold text-cyan-100/80">Aguarde um instante.</p></div></div>' +
      '</section></div>';
  }

  function salvarNotaVisualizadaMobile() {
    var link = document.createElement('a');
    link.href = state.notaVisualizandoUrl;
    link.download = 'nota-lancamento';
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
  }

  async function compartilharNotaVisualizadaMobile() {
    try {
      var resposta = await fetch(state.notaVisualizandoUrl);
      var blob = await resposta.blob();
      var arquivo = new File([blob], 'nota-lancamento.jpg', { type: blob.type || 'image/jpeg' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Nota do lancamento' });
      } else {
        salvarNotaVisualizadaMobile();
      }
    } catch (e) {
      salvarNotaVisualizadaMobile();
    }
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

    var resposta = await db.rpc('listar_usuarios_empresa_contas_rpc', {
      p_empresa_id: state.empresa.id,
    });

    // Funcionários do Controle de Ponto não são usuários do sistema — não listar.
    state.usuariosEmpresa = resposta.error ? [] : (resposta.data || []).filter(function (u) { return u && u.perfil !== 'funcionario_ponto'; });
    state.usuariosCarregando = false;
    render();
  }

  function abrirCriarUsuarioMobile() {
    // Premium Pessoal: usuários internos são recurso pago no plano grátis.
    if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('usuarios_internos'); return; }
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
    // Premium Pessoal: usuários internos são recurso pago no plano grátis.
    if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('usuarios_internos'); return; }
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
    if (!state.usuarioEditandoId) return;

    var nome = campo('edit-usuario-nome').trim();
    var login = campo('edit-usuario-login').trim().toLowerCase();
    var email = campo('edit-usuario-email').trim().toLowerCase();
    var usuarioEmEdicao = state.usuariosEmpresa.find(function (usuario) { return String(usuario.id) === String(state.usuarioEditandoId); });
    if (!usuarioEmEdicao && state.empresa && String(state.empresa.acessoId) === String(state.usuarioEditandoId)) {
      usuarioEmEdicao = { perfil: state.empresa.perfil || 'operador_simples' };
    }
    var perfil = campo('edit-usuario-perfil') || (usuarioEmEdicao && usuarioEmEdicao.perfil) || 'operador_simples';
    var senha = campo('edit-usuario-senha').trim();
    var confirmarSenha = campo('edit-usuario-confirmar-senha').trim();

    if (!nome || !login) {
      setErro('Informe nome e login. O perfil atual será mantido.');
      return;
    }
    if (senha && senha.length < 8) { setErro('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (senha !== confirmarSenha) { setErro('A confirmação da nova senha não confere.'); return; }

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
        login: login,
        email: email,
        perfil: perfil,
        novaSenha: senha,
      }),
    });
    var resposta = await lerResposta(respostaHttp);

    state.carregando = false;

    if (!respostaHttp.ok || resposta.erro) {
      setErro(resposta.mensagem || 'Nao foi possivel atualizar o usuario.');
      return;
    }

    var acessoEditadoId = state.usuarioEditandoId;
    state.usuarioEditandoId = '';
    state.loginConta = login;
    if (state.empresa && String(state.empresa.acessoId) === String(acessoEditadoId)) {
      state.empresa.login = login;
      state.empresa.email = email;
      state.empresa.usuario_nome = nome;
    }
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

  async function carregarEmpresas(usuarioId, usuarioAutenticado) {
    var usuarioAtual = usuarioAutenticado
      ? { data: { user: usuarioAutenticado } }
      : await consultaMobileComRetry(function () { return db.auth.getUser(); });
    atualizarProgressoAcessoMobile('profiles', 1, 5, 'Identificando seus perfis');
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

      // A conta exclusiva de revisão pode ter sido criada manualmente no
      // Supabase antes do vínculo com o usuário Auth atual.
      if (emailUsuario === EMAIL_CONTA_REVISAO_APPLE) {
        var perfilRevisao = await db
          .from('usuarios_empresa')
          .select('id, user_id, status')
          .ilike('email', emailUsuario)
          .in('status', ['pendente', 'ativo'])
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!perfilRevisao.error && perfilRevisao.data && perfilRevisao.data.user_id !== usuarioId) {
          await db
            .from('usuarios_empresa')
            .update({
              user_id: usuarioId,
              status: 'ativo',
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', perfilRevisao.data.id);
        }
      }
    }
    atualizarProgressoAcessoMobile('profiles', 2, 5, 'Conferindo convites e vínculos');

    var vinculos = await consultaMobileComRetry(function () {
      return db
        .from('usuarios_empresa')
        .select('id, empresa_id, nome, email, login, perfil, status, telefone, telefone_confirmado')
        .eq('user_id', usuarioId)
        .eq('status', 'ativo')
        .order('nome', { ascending: true });
    });

    if (!vinculos || vinculos.error) {
      console.error('Falha ao carregar perfis apos novas tentativas:', vinculos && vinculos.error);
      return false;
    }
    atualizarProgressoAcessoMobile('profiles', 3, 5, 'Carregando perfis ativos');

    if (!vinculos.data || !vinculos.data.length) {
      state.empresas = [];
      state.empresa = null;
      atualizarProgressoAcessoMobile('profiles', 5, 5, 'Nenhum perfil encontrado');
      return true;
    }

    state.loginConta = String((vinculos.data.find(function (vinculo) { return vinculo.login; }) || {}).login || '');

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
    var empresas = await consultaMobileComRetry(function () {
      return db.from('empresas').select('id, nome, tipo_perfil').in('id', ids);
    });

    if (!empresas || empresas.error || !empresas.data) {
      console.error('Falha ao carregar dados dos perfis apos novas tentativas:', empresas && empresas.error);
      return false;
    }
    atualizarProgressoAcessoMobile('profiles', 4, 5, 'Carregando dados dos perfis');

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
    atualizarProgressoAcessoMobile('profiles', 5, 5, 'Perfil selecionado');
    return true;
  }

  // Valor da mesma fixa no mes anterior mais proximo (dentro do ano carregado).
  function valorAnteriorFixa(recorrenciaId, mesAtualIdx) {
    var melhor = null;
    (state.lancamentos || []).forEach(function (l) {
      if (l.recorrenciaId !== recorrenciaId) return;
      var idx = indiceMes(l.mes);
      if (idx < mesAtualIdx && (melhor === null || idx > melhor.idx)) {
        melhor = { idx: idx, valor: Number(l.valor || 0) };
      }
    });
    return melhor ? melhor.valor : 0;
  }

  // Garante que cada despesa fixa ativa tenha lancamento no mes corrente real e no proximo mes.
  // Idempotente (checa recorrencia_id no banco, inclusive meses cancelados pelo usuario).
  async function garantirFixasDoMes(empresaId, anoCarregado) {
    try {
      var hoje = new Date();
      var anoAtual = hoje.getFullYear();
      var mesAtualIdx = hoje.getMonth();
      if (Number(anoCarregado) !== anoAtual) return;
      var alvos = [0, 1].map(function(offset) {
        var idxTotal = mesAtualIdx + offset;
        return {
          ano: anoAtual + Math.floor(idxTotal / 12),
          mesIdx: idxTotal % 12,
          mesNome: meses[idxTotal % 12],
        };
      });

      var recsResp = await db.from('recorrencias').select('*').eq('empresa_id', empresaId).eq('ativo', true);
      var recs = recsResp.data || [];
      if (!recs.length) return;

      var anosAlvo = alvos.map(function(alvo) { return alvo.ano; }).filter(function(ano, idx, arr) {
        return arr.indexOf(ano) === idx;
      });
      var lancsResp = await db.from('lancamentos').select('id, ano, mes, valor, status, recorrencia_id').eq('empresa_id', empresaId).in('ano', anosAlvo);
      var lancsBanco = lancsResp.data || [];
      var novos = [];
      for (var i = 0; i < recs.length; i++) {
        var rec = recs[i];
        var dia = Number(rec.dia);
        if (!dia || dia < 1 || dia > 31) continue;
        for (var a = 0; a < alvos.length; a++) {
          var alvo = alvos[a];
          var jaExiste = lancsBanco.some(function (l) {
            return Number(l.ano) === alvo.ano && l.mes === alvo.mesNome && l.recorrencia_id === rec.id;
          });
          if (jaExiste) continue;
          var anteriores = lancsBanco.filter(function(l) {
            var idxMes = indiceMes(l.mes);
            if (l.recorrencia_id !== rec.id || l.status === 'cancelada' || idxMes < 0) return false;
            return Number(l.ano) < alvo.ano || (Number(l.ano) === alvo.ano && idxMes < alvo.mesIdx);
          }).sort(function(x, y) {
            return (Number(y.ano) * 12 + indiceMes(y.mes)) - (Number(x.ano) * 12 + indiceMes(x.mes));
          });
          var valorBase = anteriores.length ? Number(anteriores[0].valor || 0) : valorAnteriorFixa(rec.id, alvo.mesIdx);
          var ins = await db.from('lancamentos').insert({
            empresa_id: empresaId,
            ano: alvo.ano,
            mes: alvo.mesNome,
            dia: dia,
            despesa_nome: rec.nome,
            descricao: rec.descricao || '',
            valor: valorBase,
            status: 'prevista',
            tipo_obs: 'fixa',
            recorrencia_id: rec.id,
          }).select().single();
          if (ins.data) {
            lancsBanco.push(ins.data);
            if (Number(ins.data.ano) === Number(anoCarregado)) {
              novos.push({
                id: ins.data.id, mes: ins.data.mes, dia: Number(ins.data.dia),
                despesa: ins.data.despesa_nome, descricao: ins.data.descricao || '',
                valor: Number(ins.data.valor || 0), status: ins.data.status || null,
                tipo: ins.data.tipo_obs || null, recorrenciaId: ins.data.recorrencia_id || null,
              });
            }
          }
        }
      }
      if (novos.length) state.lancamentos = (state.lancamentos || []).concat(novos);
    } catch (e) {}
  }

  // Cobrança: verifica no servidor se o perfil empresa vencido precisa de paywall.
  // Fail-open: qualquer falha não bloqueia o acesso.
  async function verificarPaywallMobile(silencioso, tokenCompartilhado) {
    if (!state.empresa || !state.empresa.id) { state.paywallAtivo = false; state.paywallVerificado = true; if (!silencioso) render(); return; }
    try {
      var token = tokenCompartilhado
        ? await Promise.resolve(tokenCompartilhado)
        : await tokenSessao();
      if (!token) { state.paywallAtivo = false; state.paywallVerificado = true; render(); return; }
      var retorno = await requisitarJsonMobileComRetry('/api/cobranca/estado?empresaId=' + encodeURIComponent(state.empresa.id), {
        headers: { Authorization: 'Bearer ' + token },
      });
      var resp = retorno.resposta;
      var json = retorno.json;
      if (resp.ok) {
        state.paywallAtivo = Boolean(json.precisaPaywall);
        state.paywallNome = nomeEmpresa(state.empresa);
        state.paywallEstado = json.estado || null;
        state.paywallPrecos = json.precos || null;
        state.paywallFaturaUrl = (json.faturaPendente && json.faturaPendente.invoiceUrl) || '';
      } else {
        state.paywallAtivo = false;
        state.paywallFaturaUrl = '';
      }
    } catch (e) {
      state.paywallAtivo = false;
      state.paywallFaturaUrl = '';
    }
    state.paywallVerificado = true;
    // Marca o perfil como verificado: próximas chamadas de carregarDados
    // reconferem em silêncio, sem a tela cheia de carregamento.
    state.paywallPerfilVerificado = state.empresa && state.empresa.id;
    if (!silencioso) render();
  }

  async function carregarCadastroPerfilMobile(tokenCompartilhado) {
    if (!state.empresa || !state.empresa.id) return false;
    if (state.cadastroPerfilEmpresaId !== state.empresa.id) {
      state.cadastroPerfilEmpresaId = state.empresa.id;
      state.cadastroPerfilAdiado = false;
      state.paywallCadastroCiclo = '';
      state.cadastroPerfilStatus = null;
      state.cadastroPerfilDados = null;
    }
    state.cadastroPerfilVerificado = false;
    state.cadastroPerfilErro = '';
    try {
      var token = tokenCompartilhado
        ? await Promise.resolve(tokenCompartilhado)
        : await tokenSessao();
      if (!token) throw new Error('Sessão indisponível. Entre novamente.');
      var retorno = await requisitarJsonMobileComRetry('/api/perfil-cadastro?empresaId=' + encodeURIComponent(state.empresa.id), {
        headers: { Authorization: 'Bearer ' + token },
      });
      var resposta = retorno.resposta;
      var json = retorno.json;
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível verificar o cadastro deste perfil.');
      state.cadastroPerfilStatus = json;
      state.cadastroPerfilDados = json.cadastro;
      state.cadastroPerfilVerificado = true;
      return true;
    } catch (e) {
      console.error('Erro ao carregar cadastro do perfil:', e);
      state.cadastroPerfilErro = e && e.message ? e.message : 'Não foi possível verificar o cadastro deste perfil.';
      return false;
    }
  }

  async function abrirEdicaoCadastroPerfilMobile(retornarGerenciar) {
    if (!state.empresa || !state.empresa.id) return;
    state.cadastroPerfilRetornoGerenciar = retornarGerenciar === true;
    state.menuAberto = false;
    state.modalMenu = '';
    state.cadastroPerfilErro = '';
    var carregado = await carregarCadastroPerfilMobile();
    if (!carregado) {
      render();
      return;
    }
    if (!state.cadastroPerfilStatus || state.cadastroPerfilStatus.podeEditar !== true) {
      mostrarToast('Somente Gestor Master ou Administrador pode editar o cadastro.');
      return;
    }
    state.cadastroPerfilEditando = true;
    render();
  }

  function concluirNavegacaoCadastroPerfilMobile() {
    var retornarGerenciar = state.cadastroPerfilRetornoGerenciar;
    state.cadastroPerfilEditando = false;
    state.cadastroPerfilRetornoGerenciar = false;
    if (retornarGerenciar) {
      state.empresaEdicaoAberta = false;
      state.empresaCriarAberta = false;
      state.empresaExclusaoAberta = false;
      state.modalMenu = 'gerenciar';
    }
  }

  async function fecharEdicaoCadastroPerfilMobile() {
    if (state.cadastroPerfilSalvando) return;
    concluirNavegacaoCadastroPerfilMobile();
    cadastroPerfilAutoSavePendente = false;
    if (cadastroPerfilAutoSaveTimer) window.clearTimeout(cadastroPerfilAutoSaveTimer);
    cadastroPerfilAutoSaveTimer = null;
    await carregarCadastroPerfilMobile();
    render();
  }

  async function carregarResumoPerfisMobile() {
    var solicitacao = ++state.resumoPerfisSolicitacao;
    var perfis = state.empresas || [];
    var ids = perfis.map(function (empresa) { return empresa.id; }).filter(Boolean);
    if (!ids.length) {
      if (solicitacao !== state.resumoPerfisSolicitacao) return false;
      state.resumoPerfis = [];
      state.resumoPerfisCarregando = false;
      return true;
    }

    state.resumoPerfisCarregando = true;
    var ano = Number(state.ano);
    var mes = state.mes;
    var respostas = await Promise.all([
      db.from('faturamentos').select('empresa_id, mes, ano, valor').in('empresa_id', ids).eq('ano', ano).eq('mes', mes),
      db.from('lancamentos').select('empresa_id, mes, ano, dia, valor, status').in('empresa_id', ids).eq('ano', ano).eq('mes', mes),
    ]);

    if (respostas[0].error || respostas[1].error) {
      console.error('Erro ao carregar resumo dos perfis mobile:', respostas[0].error || respostas[1].error);
      if (solicitacao !== state.resumoPerfisSolicitacao) return false;
      state.resumoPerfis = [];
      state.resumoPerfisCarregando = false;
      return false;
    }

    var receitas = {};
    var despesas = {};
    (respostas[0].data || []).forEach(function (item) {
      receitas[item.empresa_id] = (receitas[item.empresa_id] || 0) + Number(item.valor || 0);
    });
    (respostas[1].data || []).forEach(function (item) {
      if (item.status === 'cancelada' || dataFutura(Number(item.ano || ano), indiceMes(item.mes), Number(item.dia || 1))) return;
      despesas[item.empresa_id] = (despesas[item.empresa_id] || 0) + Number(item.valor || 0);
    });

    if (solicitacao !== state.resumoPerfisSolicitacao) return false;
    state.resumoPerfis = perfis.map(function (perfil) {
      var totalReceitas = Number(receitas[perfil.id] || 0);
      var totalDespesas = Number(despesas[perfil.id] || 0);
      return {
        id: perfil.id,
        nome: nomeEmpresa(perfil),
        tipoPerfil: normalizarTipoPerfil(perfil.tipo_perfil),
        receitas: totalReceitas,
        despesas: totalDespesas,
        resultado: totalReceitas - totalDespesas,
      };
    }).sort(function (a, b) { return b.resultado - a.resultado; });
    state.resumoPerfisCarregando = false;
    return true;
  }

  async function buscarLancamentosAnoMobile(empresaId, ano) {
    var pageSize = 1000;
    var inicio = 0;
    var todos = [];

    while (true) {
      var resposta = await db
        .from('lancamentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ano', ano)
        .order('dia', { ascending: true })
        .range(inicio, inicio + pageSize - 1);

      if (resposta.error) {
        console.error('Erro ao buscar lancamentos mobile:', resposta.error);
        return todos;
      }

      var pagina = resposta.data || [];
      todos = todos.concat(pagina);

      if (pagina.length < pageSize) break;
      inicio += pageSize;
    }

    return todos;
  }

  async function carregarDados() {
    if (!state.empresa) return;
    var exibeTelaPreparacao = !state.pronto || state.paywallPerfilVerificado !== state.empresa.id;
    // O resumo comparativo roda após a entrada e não integra a preparação
    // bloqueante; o percentual representa somente o que libera o perfil.
    var totalEtapasDados = 13;
    // O início da carga é uma etapa real: as verificações foram disparadas.
    // Isso impede que a barra pareça presa nos 60% enquanto elas respondem.
    var etapasDadosConcluidas = 1;
    var avancarEtapaDados = function (rotulo) {
      etapasDadosConcluidas += 1;
      atualizarProgressoAcessoMobile('data', etapasDadosConcluidas, totalEtapasDados, rotulo);
    };
    var acompanharEtapaDados = function (promessa, rotulo) {
      return promessaMobileComPrazo(
        promessa,
        25000,
        rotulo + ' demorou mais que o esperado.'
      ).then(function (resultado) {
        avancarEtapaDados(rotulo);
        return resultado;
      }, function (erro) {
        avancarEtapaDados(rotulo);
        throw erro;
      });
    };

    if (state.pronto && exibeTelaPreparacao && typeof window.__avantalabReiniciarProgressoMobile === 'function') {
      window.__avantalabReiniciarProgressoMobile('Atualizando o perfil selecionado');
      atualizarProgressoAcessoMobile('auth', 1, 1, 'Sessão confirmada');
      atualizarProgressoAcessoMobile('profiles', 1, 1, 'Perfil selecionado');
      atualizarProgressoAcessoMobile('access', 1, 1, 'Permissões confirmadas');
    }

    // Funcionário de ponto usa somente o fluxo oficial em /ponto.
    if (ehFuncionarioPontoMobile()) {
      state.validacaoTelefoneObrigatoria = false;
      state.carregando = false;
      redirecionarParaPonto();
      render();
      return;
    }

    if (state.empresa.telefone_confirmado !== true && !ehContaRevisaoAppAppleMobile(state.usuario)) {
      state.validacaoTelefoneObrigatoria = true;
      state.telefoneObrigatorio = state.empresa.telefone || '';
      state.telefoneObrigatorioConfirmado = '';
      state.codigoTelefoneObrigatorio = '';
      state.smsTelefoneObrigatorioEnviado = false;
      state.carregando = false;
      render();
      return;
    }

    // Cobrança: checa o paywall ANTES de liberar o app (evita flash do conteúdo).
    // A tela cheia "Preparando acesso" só aparece na PRIMEIRA verificação de
    // cada perfil (carga inicial / troca de perfil). Nas demais chamadas de
    // carregarDados (lançamentos, alterações, retorno ao app), a verificação
    // roda em silêncio, sem sair da tela.
    if (state.paywallPerfilVerificado !== state.empresa.id) {
      state.paywallVerificado = false;
    }
    var empresaId = state.empresa.id;
    var ano = Number(state.ano);
    var preparacaoSistemaVendas = state.preparacaoSistemaVendas;
    await prepararDadosContaRevisaoMobile();
    var podeReaproveitarPreparacaoVendas = !!(
      preparacaoSistemaVendas &&
      preparacaoSistemaVendas.empresaId === empresaId
    );
    // O contexto só é válido para a primeira carga do perfil já validado.
    state.preparacaoSistemaVendas = null;

    atualizarProgressoAcessoMobile(
      'data',
      etapasDadosConcluidas,
      totalEtapasDados,
      'Carregando informações financeiras'
    );
    // Garante que a passagem dos 60% seja realmente pintada antes de disparar
    // a fase mais pesada. Não é progresso artificial: esta etapa representa
    // a preparação e o envio das consultas indispensáveis.
    await aguardarPinturaProgressoMobile(0);

    state.carregando = true;
    render();

    // Assinatura, cadastro, integração e dados financeiros são independentes.
    // Dispará-los juntos reduz o tempo total para o da consulta mais lenta,
    // em vez de somar blocos sequenciais atrás do marco visual de 60%.
    var tokenPerfilCompartilhado = tokenSessao();
    var verificacoesPerfilPromise = promessaMobileComPrazo(
      Promise.all([
        verificarPaywallMobile(true, tokenPerfilCompartilhado).then(function (resultado) {
          avancarEtapaDados('Assinatura e acesso verificados');
          return resultado;
        }),
        carregarCadastroPerfilMobile(tokenPerfilCompartilhado).then(function (resultado) {
          avancarEtapaDados('Cadastro do perfil verificado');
          return resultado;
        }),
      ]),
      18000,
      'A verificação de assinatura e cadastro demorou mais que o esperado.'
    );

    var integracaoVendasPromise = Promise.resolve().then(async function () {
      // Instalar o módulo já autoriza Gestor Master e Administrador a alternar
      // entre os sistemas. Uma falha desta reparação nunca bloqueia a Gestão.
      if (podeGerenciarUsuarios() && !podeReaproveitarPreparacaoVendas) {
        try {
          var acessoGestorVendas = await promessaMobileComPrazo(
            db.rpc('garantir_acessos_gestor_vendas_mobile_rpc'),
            10000,
            'A preparação da integração com o Vendas demorou mais que o esperado.'
          );
          if (acessoGestorVendas.error) {
            console.warn('Não foi possível preparar o acesso integrado ao Vendas Mobile:', acessoGestorVendas.error);
          }
        } catch (error) {
          console.warn('A integração com o Vendas não respondeu durante a carga:', error);
        }
      }
      avancarEtapaDados('Integração entre sistemas verificada');
      return true;
    });

    var resultadosPromise = Promise.all([
      acompanharEtapaDados(buscarLancamentosAnoMobile(empresaId, ano), 'Carregando despesas e lançamentos'),
      acompanharEtapaDados(db.from('faturamentos').select('*').eq('empresa_id', empresaId).eq('ano', ano), 'Carregando faturamentos'),
      acompanharEtapaDados(db.from('faturamentos_entradas').select('*').eq('empresa_id', empresaId).eq('ano', ano).order('dia', { ascending: true }), 'Carregando receitas'),
      acompanharEtapaDados(db.from('despesas_cadastradas').select('*').eq('empresa_id', empresaId).order('nome', { ascending: true }), 'Carregando categorias de despesas'),
      acompanharEtapaDados(db.from('configuracoes').select('duplicados_ativo').eq('empresa_id', empresaId).maybeSingle(), 'Carregando preferências'),
      acompanharEtapaDados(db.from('empresa_modulos').select('modulo_id').eq('empresa_id', empresaId).eq('ativo', true), 'Carregando módulos'),
      acompanharEtapaDados(db.from('caixinhas_movimentos').select('*').eq('empresa_id', empresaId).order('data_movimento', { ascending: false }).order('criado_em', { ascending: false }), 'Carregando caixinhas'),
      acompanharEtapaDados(
        podeReaproveitarPreparacaoVendas
          ? Promise.resolve({ data: preparacaoSistemaVendas.acessoVendasAtivo, error: null })
          : confirmarModuloVendasMobileNoPerfil(empresaId, false),
        'Confirmando acesso ao Vendas'
      ),
    ]);

    var cargaCritica;
    try {
      cargaCritica = await promessaMobileComPrazo(
        Promise.all([
          verificacoesPerfilPromise,
          integracaoVendasPromise,
          resultadosPromise,
        ]),
        28000,
        'A carga das informações do perfil demorou mais que o esperado.'
      );
    } catch (error) {
      state.carregando = false;
      if (
        error && error.codigo === 'AVANTALAB_TIMEOUT' &&
        typeof window.__avantalabRecuperarAcessoMobile === 'function' &&
        window.__avantalabRecuperarAcessoMobile()
      ) {
        state.preparacaoAcessoInterrompida = true;
        return;
      }
      exibirFalhaDeAcessoMobile(
        'A conexão não respondeu no tempo esperado. Confira sua internet e tente novamente.'
      );
      return;
    }

    var verificacoesPerfil = cargaCritica[0];
    var cadastroPerfilOk = verificacoesPerfil[1];
    if (!cadastroPerfilOk && !state.paywallAtivo) {
      state.carregando = false;
      render();
      return;
    }
    var resultados = cargaCritica[2];

    // Guarda o dia da carga (São Paulo) — usado para só recarregar ao voltar
    // ao app quando o dia virou (despesas previstas do novo dia).
    try { state.diaUltimoCarregamento = dataHoraPontoMobile().data; } catch (e) {}

    state.lancamentos = (resultados[0] || []).filter(function(item) {
      return item.status !== 'cancelada';
    }).map(function (item) {
      return {
        id: item.id,
        mes: item.mes,
        dia: Number(item.dia),
        despesa: formatarDescricao(item.despesa_nome),
        descricao: item.descricao || '',
        valor: Number(item.valor || 0),
        status: item.status || null,
        tipo: item.tipo_obs || null,
        recorrenciaId: item.recorrencia_id || null,
        notaArquivoPath: item.nota_arquivo_path || null,
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
        status: item.status || null,
        tipo: item.tipo_obs || null,
      };
    });

    state.despesas = (resultados[3].data || []).map(function (item) {
      return {
        id: item.id,
        nome: formatarDescricao(item.nome),
        categoria: formatarDescricao(item.categoria || 'Sem categoria'),
      };
    });

    if (resultados[4].data && resultados[4].data.duplicados_ativo !== undefined) {
      state.duplicadosAtivo = resultados[4].data.duplicados_ativo !== false;
    } else {
      state.duplicadosAtivo = true;
    }

    var modulosAtivosMobile = (resultados[5] && resultados[5].data) || [];
    state.pontoModuloAtivo = modulosAtivosMobile.some(function (item) { return item.modulo_id === 'ponto'; });
    state.vendasMobileModuloAtivo = !resultados[7].error && resultados[7].data === true;
    state.caixinhaMovimentos = ((resultados[6] && resultados[6].data) || []).map(function (item) {
      return {
        id: item.id,
        lancamentoId: item.lancamento_id || null,
        tipo: item.tipo || 'aporte',
        descricao: item.descricao || '',
        valor: Number(item.valor || 0),
        dataMovimento: item.data_movimento || '',
        criadoEm: item.criado_em || '',
      };
    });
    if (!podeGerenciarPontoMobile()) {
      state.pontoResumo = [];
      state.pontoFuncionariosHoje = 0;
      state.pontoResumoCarregando = false;
    }

    // O resumo compara todos os perfis do usuário e pode ser bem maior que
    // os dados do perfil aberto. A tela principal é liberada primeiro; o
    // card recebe o resumo logo em seguida, sem bloquear o acesso.
    state.resumoPerfisCarregando = true;
    avancarEtapaDados('Acesso pronto');
    // Tudo que bloqueia o primeiro acesso já terminou. Mantém os 100% visíveis
    // por um instante curto e real antes de liberar a interface.
    await aguardarPinturaProgressoMobile(180);
    state.pronto = true;
    state.carregando = false;
    render();
    if (!telaPreparacaoAcessoMobileVisivel() && typeof window.__avantalabConfirmarAcessoMobile === 'function') {
      window.__avantalabConfirmarAcessoMobile();
    }

    var empresaIdResumo = empresaId;
    var anoResumo = String(state.ano);
    var mesResumo = state.mes;
    window.setTimeout(function () {
      carregarResumoPerfisMobile().then(function () {
        if (
          state.empresa && state.empresa.id === empresaIdResumo &&
          String(state.ano) === anoResumo && state.mes === mesResumo
        ) render();
      }).catch(function (erro) {
        console.warn('Não foi possível atualizar o resumo dos perfis em segundo plano:', erro);
      });
    }, 80);

    // Sincronizações complementares começam somente depois de a tela principal
    // estar disponível. Uma falha isolada aqui não interrompe o acesso.
    window.setTimeout(function () {
      var executarSegundoPlano = function (descricao, tarefa) {
        try {
          Promise.resolve(tarefa()).catch(function (erro) {
            console.warn(descricao + ':', erro);
          });
        } catch (erro) {
          console.warn(descricao + ':', erro);
        }
      };
      executarSegundoPlano('Falha ao atualizar despesas fixas', function () {
        return garantirFixasDoMes(empresaIdResumo, Number(anoResumo)).then(function () {
          if (
            state.empresa && state.empresa.id === empresaIdResumo &&
            String(state.ano) === anoResumo
          ) render();
        });
      });
      executarSegundoPlano('Falha ao sincronizar agenda em segundo plano', sincronizarAgendaSupabase);
      executarSegundoPlano('Falha ao iniciar agenda em tempo real', configurarRealtimeAgendaMobile);
      executarSegundoPlano('Falha ao iniciar financeiro em tempo real', configurarRealtimeFinanceiroMobile);
      executarSegundoPlano('Falha ao iniciar notificações em tempo real', configurarRealtimeNotificacoesMobile);
      executarSegundoPlano('Falha ao iniciar ponto em tempo real', configurarRealtimePontoMobile);
      executarSegundoPlano('Falha ao carregar resumo do ponto', carregarResumoPontoMobile);
      executarSegundoPlano('Falha ao carregar notificações', carregarNotificacoesNaoLidas);
      executarSegundoPlano('Falha ao avaliar tutorial', avaliarTourMobile);
      executarSegundoPlano('Falha ao avaliar permissão de notificações', avaliarPromptNotificacoes);
    }, 0);
  }

  async function entrar() {
    if (state.carregando) return;

    var checkboxManterConectado = document.getElementById('manter-conectado');
    if (checkboxManterConectado) {
      state.manterConectado = Boolean(checkboxManterConectado.checked);
    }

    var login = campo('login').trim();
    var senha = campo('senha');
    state.loginValor = login;

    if (!login || !senha) {
      setErro(state.loginTipo === 'telefone' ? 'Informe telefone e senha.' : 'Informe e-mail ou login e senha.');
      return;
    }

    var tentativaLogin = Number(state.tentativaLogin || 0) + 1;
    state.tentativaLogin = tentativaLogin;
    state.carregando = true;
    state.loginAcao = 'senha';
    state.erro = '';
    render();

    var resposta;
    if (state.loginTipo === 'telefone') {
      var telefone = login.replace(/\D/g, '');
      if (telefone.length < 10 || telefone.length > 11) {
        state.carregando = false;
        state.loginAcao = '';
        setErro('Informe um telefone brasileiro válido com DDD.');
        return;
      }
      resposta = await db.auth.signInWithPassword({ phone: '+55' + telefone, password: senha });
    } else {
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
      resposta = await db.auth.signInWithPassword({ email: email, password: senha });
    }
    if (tentativaLogin !== state.tentativaLogin) return;
    if (resposta.error || !resposta.data.user) {
      state.carregando = false;
      state.loginAcao = '';
      setErro('Nao foi possivel entrar. Confira seus dados.');
      return;
    }

    // Funcionario do Controle de Ponto nao entra no sistema (usa o app /ponto).
    var mdLogin = (resposta.data.user && resposta.data.user.user_metadata) || {};
    if (mdLogin.tipo === 'funcionario_ponto') {
      try { await db.auth.signOut({ scope: 'local' }); } catch (e) {}
      state.carregando = false;
      state.loginAcao = '';
      setErro('Este acesso e do Controle de Ponto. Registre seu horario pelo app de ponto.');
      return;
    }

    registrarPreferenciaSessaoMobile(state.manterConectado, false);
    state.usuario = resposta.data.user;
    state.autenticado = true;
    var perfisCarregados = await carregarEmpresas(resposta.data.user.id, resposta.data.user);
    if (tentativaLogin !== state.tentativaLogin) return;

    if (perfisCarregados === false) {
      state.carregando = false;
      state.loginAcao = '';
      setErro('Sua sessao foi iniciada, mas os perfis demoraram para responder. Tente novamente.');
      return;
    }

    if (!state.empresa) {
      state.carregando = false;
      state.loginAcao = '';
      if (ehContaRevisaoAppAppleMobile(resposta.data.user)) {
        var perfilRevisaoCriado = await criarPerfilInicial({
          nome: 'AvantaLab — Conta de teste',
          tipoPerfil: 'pessoal',
        });
        if (perfilRevisaoCriado) return;
      }
      var perfilCriadoNoCadastro = await criarPerfilInicialDoCadastroMobile(mdLogin);
      if (perfilCriadoNoCadastro) return;
      state.criarPerfilNome = String(mdLogin.nome_perfil_inicial || '');
      state.criarPerfilTipo = normalizarTipoPerfil(mdLogin.tipo_perfil_inicial || state.cadastroTipoPerfil);
      state.modoCriarPerfil = true;
      render();
      return;
    }

    state.carregando = false;
    state.loginAcao = '';
    if (await prepararSistemaInicialAntesDosDadosMobile()) {
      render();
      return;
    }
    state.carregando = true;
    render();
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
    var campoEmpresaCadastro = document.getElementById('cadastro-empresa');
    state.cadastro = {
      nome: campo('cadastro-nome').trim(),
      nomeEmpresa: campoEmpresaCadastro
        ? String(campoEmpresaCadastro.value || '').trim()
        : String(state.cadastro.nomeEmpresa || '').trim(),
      email: campo('cadastro-email').trim().toLowerCase(),
      telefone: campo('cadastro-telefone').replace(/\D/g, ''),
      senha: campo('cadastro-senha'),
      confirmarSenha: campo('cadastro-confirmar-senha'),
    };
    var ddiEl = document.getElementById('cadastro-ddi');
    if (ddiEl && ddiEl.value) state.cadastroDdi = ddiEl.value.replace(/\D/g, '');
    var cupomEl = document.getElementById('cadastro-cupom');
    if (cupomEl) state.cadastroCupom = cupomEl.value.trim().toUpperCase();
    // preserva o tipo selecionado (já está em state.cadastroTipoPerfil via botão)
  }

  // Número do cadastro no formato internacional E.164 (+DDI + nacional).
  function formatarTelefoneCadastroMobile(valor, ddi) {
    var digitos = String(valor || '').replace(/\D/g, '');
    if (String(ddi || '55') !== '55') return digitos.slice(0, 15);

    var telefone = digitos.slice(0, 11);
    if (telefone.length <= 2) return telefone ? '(' + telefone : '';

    var ddd = telefone.slice(0, 2);
    var numero = telefone.slice(2);
    if (numero.length <= 4) return '(' + ddd + ') ' + numero;

    var tamanhoPrefixo = numero.length <= 8 ? 4 : 5;
    return '(' + ddd + ') ' + numero.slice(0, tamanhoPrefixo) + '-' + numero.slice(tamanhoPrefixo);
  }

  function telefoneCadastroE164() {
    var ddi = (state.cadastroDdi || '55').replace(/\D/g, '') || '55';
    return '+' + ddi + (state.cadastro.telefone || '');
  }

  function telefoneConfirmadoDoUsuarioMobile() {
    var md = state.usuario && state.usuario.user_metadata ? state.usuario.user_metadata : {};
    var digitos = String(md.telefone || '').replace(/\D/g, '');
    if (!digitos) return '';
    if (digitos.indexOf('55') === 0 && (digitos.length === 12 || digitos.length === 13)) {
      return digitos.slice(2);
    }
    return digitos;
  }

  async function enviarCodigoCadastro() {
    lerCadastroDaTela();

    if (!validarCadastroBase()) return;

    // Aceite implícito dos Termos/Privacidade: o card informa que, ao se
    // cadastrar, o usuário declara aceitar os termos (links disponíveis).
    state.aceitouTermos = true;
    state.aceiteTermosEm = new Date().toISOString();

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
        telefone: telefoneCadastroE164(),
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
        telefone: telefoneCadastroE164(),
        codigo: codigo,
      }),
    });

    var resultadoVerificacao = await lerResposta(verificacao);

    if (!verificacao.ok || resultadoVerificacao.erro) {
      state.carregando = false;
      setErro(resultadoVerificacao.mensagem || 'Codigo invalido ou expirado.');
      return;
    }

    var aceiteLegalEm = state.aceiteTermosEm || new Date().toISOString();
    var termosVersao = window.__TERMOS_VERSAO || '2026-07-08';

    var cadastro = await db.auth.signUp({
      email: state.cadastro.email,
      password: state.cadastro.senha,
      options: {
        data: {
          nome: state.cadastro.nome,
          telefone: telefoneCadastroE164(),
          nome_perfil_inicial: normalizarTipoPerfil(state.cadastroTipoPerfil) === 'empresa'
            ? state.cadastro.nomeEmpresa
            : state.cadastro.nome,
          tipo_perfil_inicial: normalizarTipoPerfil(state.cadastroTipoPerfil),
          cupom_perfil_inicial: (state.cadastroCupom || '').trim().toUpperCase() || null,
          inicio_empresa_modo: state.inicioEmpresaModo,
          // Prova de consentimento (LGPD): versao, data/hora e origem do aceite.
          aceite_termos_versao: termosVersao,
          aceite_termos_em: aceiteLegalEm,
          aceite_privacidade_versao: termosVersao,
          aceite_privacidade_em: aceiteLegalEm,
          aceite_origem: 'mobile',
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
    state.aceitouTermos = false;
    state.aceiteTermosEm = null;
    state.cadastroDdi = '55';
    state.telefoneCadastroConfirmado = '';
    // criarPerfilTipo guarda a escolha para usar na criação do primeiro perfil
    state.criarPerfilTipo = normalizarTipoPerfil(state.cadastroTipoPerfil);
    state.cadastro = {
      nome: '',
      nomeEmpresa: '',
      email: '',
      telefone: '',
      senha: '',
      confirmarSenha: '',
    };
    limparRascunhoCadastroMobile();
    setMensagem('Cadastro criado e celular confirmado. Faca login para acessar.');
  }

  var DESPESAS_PADRAO_EMPRESA_MOBILE = [
    { nome: 'Aluguel', categoria: 'Despesas operacionais' },
    { nome: 'Agua', categoria: 'Despesas operacionais' },
    { nome: 'Energia', categoria: 'Despesas operacionais' },
    { nome: 'Internet', categoria: 'Despesas operacionais' },
    { nome: 'Telefone', categoria: 'Despesas operacionais' },
    { nome: 'Folha de pagamento', categoria: 'Despesas operacionais' },
    { nome: 'Pro-labore', categoria: 'Despesas operacionais' },
    { nome: 'Contabilidade', categoria: 'Despesas operacionais' },
    { nome: 'Manutencao', categoria: 'Despesas operacionais' },
    { nome: 'Publicidade', categoria: 'Despesas operacionais' },
    { nome: 'Materia-prima', categoria: 'Custos variaveis' },
    { nome: 'Embalagens', categoria: 'Custos variaveis' },
    { nome: 'Fretes', categoria: 'Custos variaveis' },
    { nome: 'Comissoes', categoria: 'Custos variaveis' },
    { nome: 'Tarifas bancarias', categoria: 'Despesas financeiras' },
    { nome: 'Juros', categoria: 'Despesas financeiras' },
    { nome: 'Impostos', categoria: 'Imposto sobre lucro' },
  ];

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
    { nome: 'Mercado',            categoria: 'Custos de vida' },
    { nome: 'Saude',              categoria: 'Custos de vida' },
    { nome: 'Farmacia',           categoria: 'Custos de vida' },
    { nome: 'Educacao',           categoria: 'Custos de vida' },
    { nome: 'Celular',            categoria: 'Custos de vida' },
    { nome: 'Combustivel',        categoria: 'Custos de vida' },
    { nome: 'Transporte',         categoria: 'Custos de vida' },
    { nome: 'Gastos com veiculo', categoria: 'Custos de vida' },
    { nome: 'Parcela veiculo',    categoria: 'Custos de vida' },
    { nome: 'Alimentacao',        categoria: 'Lazer e consumo' },
    { nome: 'Passeios',           categoria: 'Lazer e consumo' },
    { nome: 'Assinaturas',        categoria: 'Lazer e consumo' },
    { nome: 'Vestuario',          categoria: 'Lazer e consumo' },
    { nome: 'Viagem',             categoria: 'Lazer e consumo' },
    { nome: 'Taxas bancarias',    categoria: 'Financeiro e impostos' },
    { nome: 'Cartao de credito',  categoria: 'Financeiro e impostos' },
    { nome: 'Seguro',             categoria: 'Financeiro e impostos' },
    { nome: 'IPVA',               categoria: 'Financeiro e impostos' },
    { nome: 'IPTU',               categoria: 'Financeiro e impostos' },
    { nome: 'Investimento',       categoria: 'Investimentos' },
  ];

  async function inserirDespesasPadraoMobile(empresaId, tipoPerfil) {
    var despesasPadrao = normalizarTipoPerfil(tipoPerfil) === 'pessoal'
      ? DESPESAS_PADRAO_PESSOAL_MOBILE
      : DESPESAS_PADRAO_EMPRESA_MOBILE;
    var rows = despesasPadrao.map(function (d) {
      return { empresa_id: empresaId, nome: d.nome, categoria: d.categoria };
    });
    var resp = await db.from('despesas_cadastradas').insert(rows);
    if (resp.error) {
      console.error('Erro ao inserir despesas padrao do perfil:', resp.error);
    }
  }

  async function criarPerfilInicial(dadosCadastro) {
    var criacaoAutomatica = dadosCadastro && typeof dadosCadastro.nome === 'string';
    if (state.carregando && !criacaoAutomatica) return false;
    var nome = criacaoAutomatica ? dadosCadastro.nome.trim() : campo('criar-perfil-inicial-nome').trim();
    var tipo = normalizarTipoPerfil(criacaoAutomatica ? dadosCadastro.tipoPerfil : state.criarPerfilTipo);
    var cupomCriacao = criacaoAutomatica
      ? String(dadosCadastro.cupom || '').trim().toUpperCase()
      : String(state.cadastroCupom || '').trim().toUpperCase();
    var modoInicioEmpresa = criacaoAutomatica
      ? (dadosCadastro.inicioEmpresaModo === 'assinar' ? 'assinar' : 'trial')
      : state.inicioEmpresaModo;

    if (!nome) {
      setErroCriarPerfil(rotuloNomePerfil(tipo) + ' e obrigatorio.');
      return false;
    }

    // Premium Pessoal: 2º perfil pessoal é pago (o primeiro e o empresa são livres).
    if (tipo === 'pessoal' && criarPerfilPessoalBloqueadoMobile()) {
      state.modoCriarPerfil = false;
      abrirPremiumMobile('multiplos_perfis');
      return false;
    }

    state.carregando = true;
    state.criarPerfilErro = '';
    render();

    var resposta = criacaoAutomatica
      ? await db.rpc('criar_primeiro_perfil_cadastro_rpc', {
          p_nome_empresa: nome,
          p_tipo_perfil: tipo,
        })
      : await db.rpc('criar_empresa_inicial_rpc', { p_nome_empresa: nome });

    if (resposta.error || !resposta.data) {
      state.carregando = false;
      setErroCriarPerfil(mensagemErro(resposta.error, 'Nao foi possivel criar o perfil financeiro.'));
      return false;
    }

    var retornoPrimeiroPerfil = criacaoAutomatica ? resposta.data : null;
    var criada = criacaoAutomatica
      ? retornoPrimeiroPerfil && retornoPrimeiroPerfil.empresa
      : (Array.isArray(resposta.data) ? resposta.data[0] : resposta.data);
    var perfilCriadoAgora = !criacaoAutomatica || !!(retornoPrimeiroPerfil && retornoPrimeiroPerfil.criado);
    var criadaId = criada && (criada.id || criada.empresa_id);

    if (!criadaId) {
      state.carregando = false;
      setErroCriarPerfil('O perfil foi criado sem um identificador válido. Recarregue a página antes de tentar novamente.');
      return false;
    }

    if (criadaId && perfilCriadoAgora) {
      var telefoneConfirmado = telefoneConfirmadoDoUsuarioMobile();
      if (telefoneConfirmado) {
        var agoraTelefone = new Date().toISOString();
        var atualizacaoTelefone = await db
          .from('usuarios_empresa')
          .update({
            telefone: telefoneConfirmado,
            telefone_confirmado: true,
            telefone_confirmado_em: agoraTelefone,
            atualizado_em: agoraTelefone,
          })
          .eq('empresa_id', criadaId)
          .eq('user_id', state.usuario.id);
        if (atualizacaoTelefone.error) {
          console.error('Erro ao aplicar telefone confirmado do cadastro:', atualizacaoTelefone.error);
        }
      }

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

    if (criadaId && perfilCriadoAgora) {
      await inserirDespesasPadraoMobile(criadaId, tipo);
    }

    // Cupom informado no cadastro: concede cortesia ao novo perfil (opcional).
    // Falha silenciosa — se o cupom for inválido, segue no trial normal.
    if (criadaId && perfilCriadoAgora && cupomCriacao) {
      try {
        var tokCupom = await tokenSessao();
        if (tokCupom) {
          await fetch('/api/cobranca/resgatar-cupom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokCupom },
            body: JSON.stringify({ empresaId: criadaId, codigo: cupomCriacao }),
          });
        }
      } catch (e) { /* silencioso */ }
      state.cadastroCupom = '';
    } else if (criadaId && perfilCriadoAgora && COBRANCA_ATIVA_MOBILE && tipo === 'empresa') {
      // Sem cupom: define o início do perfil empresa (7 dias grátis x assinar agora).
      try {
        var tokInicio = await tokenSessao();
        if (tokInicio) {
          await fetch('/api/cobranca/definir-inicio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokInicio },
            body: JSON.stringify({ empresaId: criadaId, modo: modoInicioEmpresa }),
          });
        }
      } catch (e) { /* silencioso */ }
    }

    state.modoCriarPerfil = false;
    state.criarPerfilNome = '';
    state.cadastroCupom = '';
    if (criacaoAutomatica) {
      var limpezaMetadata = await db.auth.updateUser({
        data: {
          nome_perfil_inicial: null,
          tipo_perfil_inicial: null,
          cupom_perfil_inicial: null,
          inicio_empresa_modo: null,
        },
      });
      if (limpezaMetadata.error) {
        console.error('Erro ao limpar dados temporarios do primeiro perfil:', limpezaMetadata.error);
      }
    }
    await carregarEmpresas(state.usuario.id);
    await carregarDados();
    return true;
  }

  async function criarPerfilInicialDoCadastroMobile(metadata) {
    var nome = String(metadata && metadata.nome_perfil_inicial || '').trim();
    if (!nome) return false;

    var tipo = normalizarTipoPerfil(metadata.tipo_perfil_inicial || 'empresa');
    var modo = metadata.inicio_empresa_modo === 'assinar' ? 'assinar' : 'trial';
    state.criarPerfilNome = nome;
    state.criarPerfilTipo = tipo;
    state.inicioEmpresaModo = modo;
    state.carregando = false;

    return criarPerfilInicial({
      nome: nome,
      tipoPerfil: tipo,
      cupom: metadata.cupom_perfil_inicial || '',
      inicioEmpresaModo: modo,
    });
  }

  function telaCriarPerfilInicial() {
    var tipo = normalizarTipoPerfil(state.criarPerfilTipo);
    return (
      '<div class="grid gap-3">' +
        '<p class="text-sm font-semibold text-slate-600">Bem-vindo! Crie seu primeiro perfil financeiro para comecar.</p>' +
        inputHtml('criar-perfil-inicial-nome', rotuloNomePerfil(tipo), 'text', placeholderNomePerfil(tipo), state.criarPerfilNome) +
        '<div>' +
          '<p class="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-600">Tipo do perfil</p>' +
          seletorTipoPerfilHtml('criar-perfil', tipo) +
        '</div>' +
        ((COBRANCA_ATIVA_MOBILE && tipo === 'empresa') ?
          '<div class="rounded-xl border border-sky-200 bg-sky-50 p-3">' +
            '<p class="text-[11px] font-bold leading-snug text-sky-900">Perfil empresa tem <b>7 dias gr&aacute;tis</b>. Depois: R$ 34,90/m&ecirc;s, ou R$ 29,00/m&ecirc;s no plano anual.</p>' +
            '<div class="mt-2 grid grid-cols-2 gap-2">' +
              '<button id="inicio-empresa-trial" type="button" class="rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-wide transition ' + (state.inicioEmpresaModo === 'trial' ? 'bg-sky-700 text-white shadow' : 'bg-white text-slate-600') + '">7 dias gr&aacute;tis</button>' +
              '<button id="inicio-empresa-assinar" type="button" class="rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-wide transition ' + (state.inicioEmpresaModo === 'assinar' ? 'bg-sky-700 text-white shadow' : 'bg-white text-slate-600') + '">Assinar agora</button>' +
            '</div>' +
          '</div>'
        : '') +
        alertaCriarPerfilHtml() +
        '<button id="criar-perfil-inicial-submit" type="button" ' + (state.carregando ? 'disabled ' : '') + 'class="h-12 rounded-xl bg-slate-900 px-4 text-sm font-black uppercase tracking-wide text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60">' +
          (state.carregando ? 'Criando...' : 'Criar perfil') +
        '</button>' +
        '<button id="sair-criar-perfil" type="button" class="text-xs font-bold text-slate-500 underline">Cancelar e sair</button>' +
      '</div>'
    );
  }

  async function enviarCodigoTelefoneObrigatorioMobile() {
    if (state.validandoTelefoneObrigatorio) return;

    var telefone = campo('telefone-obrigatorio').replace(/\D/g, '');
    var ddiO = (campo('ddi-telefone-obrigatorio') || state.ddiTelefoneObrigatorio || '55').replace(/\D/g, '') || '55';
    state.ddiTelefoneObrigatorio = ddiO;
    var telE164 = '+' + ddiO + telefone;
    var ehBrO = ddiO === '55';

    if (!telefone || (ehBrO ? (telefone.length < 10 || telefone.length > 11) : (telefone.length < 6 || telefone.length > 15))) {
      setErro(ehBrO ? 'Informe um celular valido com DDD.' : 'Informe um numero de celular valido para o pais selecionado.');
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
        telefone: telE164,
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
    var ddiO = (campo('ddi-telefone-obrigatorio') || state.ddiTelefoneObrigatorio || '55').replace(/\D/g, '') || '55';
    state.ddiTelefoneObrigatorio = ddiO;
    var telE164 = '+' + ddiO + telefone;
    var ehBrO = ddiO === '55';

    if (!telefone || (ehBrO ? (telefone.length < 10 || telefone.length > 11) : (telefone.length < 6 || telefone.length > 15))) {
      setErro(ehBrO ? 'Informe um celular valido com DDD.' : 'Informe um numero de celular valido para o pais selecionado.');
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
        telefone: telE164,
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
    state.ddiTelefoneObrigatorio = '55';
    state.telefoneObrigatorioConfirmado = '';
    state.codigoTelefoneObrigatorio = '';
    state.smsTelefoneObrigatorioEnviado = false;
    state.validandoTelefoneObrigatorio = false;
    await carregarDados();
  }

  function validarCadastroBase() {
    if (normalizarTipoPerfil(state.cadastroTipoPerfil) === 'empresa' && !state.cadastro.nomeEmpresa) {
      setErro('Informe o nome fantasia da empresa.');
      return false;
    }

    if (!state.cadastro.nome) {
      setErro('Informe o nome completo do responsavel.');
      return false;
    }

    if (!state.cadastro.email || state.cadastro.email.indexOf('@') < 0 || state.cadastro.email.indexOf('.') < 0) {
      setErro('Informe um email valido.');
      return false;
    }

    var ehBrasilCad = (state.cadastroDdi || '55').replace(/\D/g, '') === '55';
    var lenTel = (state.cadastro.telefone || '').length;
    if (ehBrasilCad ? (lenTel < 10 || lenTel > 11) : (lenTel < 6 || lenTel > 15)) {
      setErro(ehBrasilCad ? 'Informe um celular valido com DDD.' : 'Informe um numero de celular valido para o pais selecionado.');
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
    var destinoLogout = destinoLogoutMobile();
    await db.auth.signOut({ scope: 'local' });
    try {
      Object.keys(sessionStorage).forEach(function (chave) {
        if (chave.indexOf(CHAVE_SISTEMA_SESSAO_MOBILE) === 0) sessionStorage.removeItem(chave);
      });
    } catch (error) {}
    limparPreferenciaSessaoMobile();
    window.location.replace(destinoLogout);
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
    if (vv) {
      var topo = Math.max(0, Math.round(vv.offsetTop || 0));
      ov.style.top = topo + 'px';
      ov.style.height = Math.max(320, Math.round(vv.height || window.innerHeight || 0)) + 'px';
    } else {
      ov.style.top = '0px';
      ov.style.height = '100dvh';
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
      var sessaoIA = await db.auth.getSession();
      var tokenIA = sessaoIA && sessaoIA.data && sessaoIA.data.session ? sessaoIA.data.session.access_token : '';
      var headersIA = { 'Content-Type': 'application/json' };
      if (tokenIA) headersIA['Authorization'] = 'Bearer ' + tokenIA;
      var res = await fetch('/api/ava/chat', {
        method: 'POST',
        headers: headersIA,
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

  async function salvarDespesa(ignorarAvisoDuplicado) {
    if (!state.empresa || state.lancandoDespesa) return;

    var dia = Number(campo('despesa-dia'));
    var nome = campo('despesa-nome');
    var descricao = campo('despesa-descricao');
    var valorTexto = campo('despesa-valor');
    var valor = normalizarValor(valorTexto);
    var limite = maxDias(state.mes, state.ano);
    state.despesaDia = campo('despesa-dia');
    state.despesaDiaAutoHoje = false;
    state.despesaNome = nome;
    state.despesaDescricao = descricao;
    state.despesaValor = valorTexto;

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
        return item.mes === state.mes && Number(item.valor) === Number(valor);
      });

      if (existeIgual && !ignorarAvisoDuplicado) {
        state.duplicadoConfirmacaoAberta = true;
        render();
        return;
      }
    }

    state.lancandoDespesa = true;
    state.carregando = true;
    state.erro = '';
    render();

    var totalParcelas = (state.formParcelar && state.formParcelas >= 2) ? state.formParcelas : 1;
    var mesIndex = indiceMes(state.mes);
    var ok = true;
    var primeiroLancamentoId = null;

    for (var p = 0; p < totalParcelas; p++) {
      var idxMes = (mesIndex + p) % 12;
      var anosExtra = Math.floor((mesIndex + p) / 12);
      var mesParc = meses[idxMes];
      var anoParc = Number(state.ano) + anosExtra;
      var descBase = formatarDescricao(descricao);
      var descParc = totalParcelas > 1
        ? (descBase ? descBase + ' (' + (p + 1) + '/' + totalParcelas + ')' : '(' + (p + 1) + '/' + totalParcelas + ')')
        : descBase;

      var ehFuturo = dataFutura(anoParc, idxMes, dia);
      var ehParcelado = totalParcelas > 1;
      // Parcela: valor e data definidos -> nao pede confirmacao (so badge).
      // Avulso futuro: "previsto" -> pede confirmacao na data.
      var tipoLanc = ehParcelado ? 'parcela' : (ehFuturo ? 'previsto' : null);
      var statusLanc = (!ehParcelado && ehFuturo) ? 'prevista' : null;

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
          status: statusLanc,
          tipo_obs: tipoLanc,
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
      if (!primeiroLancamentoId && resposta.data) primeiroLancamentoId = resposta.data.id;
    }

    if (primeiroLancamentoId && state.notaArquivoPendente) {
      var nota = await arquivarNotaLancamentoMobile(primeiroLancamentoId, state.notaArquivoPendente);
      if (nota.erro) mostrarToast('Despesa salva, mas a nota nao foi arquivada.');
    }

    state.lancandoDespesa = false;
    state.formParcelar = false;
    state.formParcelas = 2;
    state.notaArquivoPendente = null;
    limparRascunhoLancamentoMobile();
    state.modalLancamento = false;
    state.tipoLancamento = 'despesa';
    state.modoReceita = 'entrada';
    state.erro = '';
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
    mostrarToast(totalParcelas > 1 ? 'Despesa parcelada em ' + totalParcelas + 'x.' : 'Despesa lancada.');
  }

  async function salvarAporteCaixinhaMobile() {
    if (!state.empresa || state.caixinhaSalvando) return;

    var dia = Number(campo('caixinha-dia'));
    var descricao = campo('caixinha-descricao') || 'Reserva';
    var valorTexto = campo('caixinha-valor');
    var valor = normalizarValor(valorTexto);
    var limite = maxDias(state.mes, state.ano);

    state.caixinhaDia = campo('caixinha-dia') || state.caixinhaDia;
    state.caixinhaDescricao = descricao;
    state.caixinhaValor = valorTexto;

    if (!dia || dia < 1 || dia > limite) {
      setErro('Informe um dia entre 1 e ' + limite + '.');
      return;
    }
    if (valor <= 0) {
      setErro('Informe um valor valido para aportar.');
      return;
    }

    state.caixinhaSalvando = true;
    state.carregando = true;
    state.erro = '';
    render();

    var mesIndice = indiceMes(state.mes);
    var ano = Number(state.ano);
    var descricaoFinal = formatarDescricao(descricao) || 'Aporte na caixinha';
    var ehFuturo = dataFutura(ano, mesIndice, dia);
    var dataMovimento = ano + '-' + String(mesIndice + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');

    var lancamento = await db
      .from('lancamentos')
      .insert({
        empresa_id: state.empresa.id,
        ano: ano,
        mes: state.mes,
        dia: dia,
        despesa_nome: 'Caixinha',
        descricao: descricaoFinal,
        valor: valor,
        status: ehFuturo ? 'prevista' : null,
        tipo_obs: ehFuturo ? 'previsto' : null,
      })
      .select()
      .single();

    if (lancamento.error || !lancamento.data) {
      state.caixinhaSalvando = false;
      state.carregando = false;
      setErro(mensagemErro(lancamento.error, 'Nao foi possivel salvar a despesa da caixinha.'));
      return;
    }

    var movimento = await db
      .from('caixinhas_movimentos')
      .insert({
        empresa_id: state.empresa.id,
        lancamento_id: lancamento.data.id,
        tipo: 'aporte',
        descricao: descricaoFinal,
        valor: valor,
        data_movimento: dataMovimento,
      })
      .select()
      .single();

    if (movimento.error || !movimento.data) {
      await db.from('lancamentos').delete().eq('id', lancamento.data.id).eq('empresa_id', state.empresa.id);
      state.caixinhaSalvando = false;
      state.carregando = false;
      setErro(mensagemErro(movimento.error, 'Nao foi possivel salvar o aporte na caixinha.'));
      return;
    }

    state.caixinhaValor = '';
    state.caixinhaSalvando = false;
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
    mostrarToast('Aporte adicionado na caixinha.');
  }

  async function salvarSaldoInicialCaixinhaMobile() {
    if (!state.empresa || state.caixinhaSaldoInicialSalvando) return;

    var valorTexto = campo('caixinha-saldo-inicial');
    var valor = normalizarValor(valorTexto);
    state.caixinhaSaldoInicialValor = valorTexto;

    if (valor < 0) {
      setErro('Informe um valor valido.');
      return;
    }

    state.caixinhaSaldoInicialSalvando = true;
    state.carregando = true;
    state.erro = '';
    render();

    var existente = (state.caixinhaMovimentos || []).find(function (mov) {
      return mov.tipo === 'saldo_inicial';
    });

    var resposta = existente
      ? await db
          .from('caixinhas_movimentos')
          .update({
            descricao: 'Saldo inicial',
            valor: valor,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', existente.id)
          .eq('empresa_id', state.empresa.id)
          .select()
          .single()
      : await db
          .from('caixinhas_movimentos')
          .insert({
            empresa_id: state.empresa.id,
            lancamento_id: null,
            tipo: 'saldo_inicial',
            descricao: 'Saldo inicial',
            valor: valor,
            data_movimento: dataHoraPontoMobile().data,
          })
          .select()
          .single();

    if (resposta.error || !resposta.data) {
      state.caixinhaSaldoInicialSalvando = false;
      state.carregando = false;
      setErro(mensagemErro(resposta.error, 'Nao foi possivel salvar o saldo inicial.'));
      return;
    }

    state.caixinhaSaldoInicialValor = '';
    state.caixinhaSaldoInicialSalvando = false;
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
    mostrarToast('Saldo inicial da caixinha salvo.');
  }

  function solicitarResetCaixinhaMobile() {
    state.dashboardOpcoesId = '';
    state.dashboardOpcoesPos = null;
    state.caixinhaResetConfirmacao = true;
    render();
  }

  function cancelarResetCaixinhaMobile() {
    state.caixinhaResetConfirmacao = false;
    state.dashboardOpcoesId = '';
    state.dashboardOpcoesPos = null;
    render();
  }

  async function resetarCaixinhaMobile() {
    if (!state.empresa || state.carregando) return;

    var movimentos = state.caixinhaMovimentos || [];
    if (!movimentos.length) {
      state.caixinhaResetConfirmacao = false;
      state.dashboardOpcoesId = '';
      state.dashboardOpcoesPos = null;
      render();
      mostrarToast('Caixinha ja esta zerada.');
      return;
    }

    var lancamentoIds = movimentos
      .map(function (mov) { return mov.lancamentoId; })
      .filter(function (id, index, lista) { return id && lista.indexOf(id) === index; });

    state.carregando = true;
    state.erro = '';
    state.caixinhaResetConfirmacao = true;
    state.dashboardOpcoesId = '';
    state.dashboardOpcoesPos = null;
    render();

    if (lancamentoIds.length) {
      var despesas = await db
        .from('lancamentos')
        .delete()
        .eq('empresa_id', state.empresa.id)
        .in('id', lancamentoIds);

      if (despesas.error) {
        state.carregando = false;
        state.caixinhaResetConfirmacao = false;
        setErro(mensagemErro(despesas.error, 'Nao foi possivel remover as despesas vinculadas a caixinha.'));
        return;
      }
    }

    var limpeza = await db
      .from('caixinhas_movimentos')
      .delete()
      .eq('empresa_id', state.empresa.id);

    if (limpeza.error) {
      state.carregando = false;
      state.caixinhaResetConfirmacao = false;
      setErro(mensagemErro(limpeza.error, 'Nao foi possivel resetar a caixinha.'));
      return;
    }

    state.caixinhaResetConfirmacao = false;
    state.caixinhaSaldoInicialValor = '';
    state.caixinhaValor = '';
    state.caixinhaDescricao = 'Reserva';
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
    mostrarToast('Caixinha resetada.');
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
    var valorTexto = campo('entrada-valor');
    var valor = normalizarValor(valorTexto);
    var limite = maxDias(state.mes, state.ano);
    state.entradaDia = campo('entrada-dia');
    state.entradaDiaAutoHoje = false;
    state.entradaOrigem = origem;
    state.entradaValor = valorTexto;

    if (!dia || dia < 1 || dia > limite || !origem.trim() || valor <= 0) {
      setErro('Informe dia, origem e valor validos.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    // Receita com data futura -> "prevista": nao entra no total efetivado agora
    // (entra so na previsao). Ao confirmar, e somada ao total do mes.
    var ehFutura = dataFutura(Number(state.ano), indiceMes(state.mes), dia);

    var resposta = await db
      .from('faturamentos_entradas')
      .insert({
        empresa_id: state.empresa.id,
        ano: Number(state.ano),
        mes: state.mes,
        dia: dia,
        origem: formatarDescricao(origem),
        valor: valor,
        status: ehFutura ? 'prevista' : null,
        tipo_obs: ehFutura ? 'previsto' : null,
        criado_por: state.usuario ? state.usuario.id : null,
      })
      .select()
      .single();

    if (resposta.error) {
      state.carregando = false;
      setErro('Nao foi possivel salvar a entrada.');
      return;
    }

    if (!ehFutura) {
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
    }

    state.modalLancamento = false;
    state.tipoLancamento = 'despesa';
    state.modoReceita = 'entrada';
    limparRascunhoLancamentoMobile();
    state.erro = '';
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
    mostrarToast('Entrada lancada.');
  }

  async function salvarTotalReceita() {
    if (!state.empresa) return;

    var valorTexto = campo('receita-total');
    var valor = normalizarValor(valorTexto);
    state.receitaTotal = valorTexto;

    if (valor < 0) {
      setErro('Informe um total valido.');
      return;
    }

    var entradasAvulsas = state.entradas.filter(function (e) { return e.mes === state.mes; });
    var totalEntradasRealizadas = entradasAvulsas.reduce(function (acc, e) {
      return e.status === 'prevista' ? acc : acc + Number(e.valor || 0);
    }, 0);
    var apagarAvulsas = false;

    if (entradasAvulsas.length > 0) {
      apagarAvulsas = window.confirm(
        'Este mes ja possui receitas avulsas lancadas.\n\n' +
        'OK: apagar todos os lancamentos de receita do mes e manter somente este total.\n' +
        'Cancelar: manter as receitas avulsas e somar este total a elas.'
      );
    }

    state.carregando = true;
    state.erro = '';
    render();

    if (apagarAvulsas) {
      var exclusaoEntradas = await db
        .from('faturamentos_entradas')
        .delete()
        .eq('empresa_id', state.empresa.id)
        .eq('ano', Number(state.ano))
        .eq('mes', state.mes);

      if (exclusaoEntradas.error) {
        state.carregando = false;
        setErro('Nao foi possivel apagar as receitas avulsas deste mes.');
        return;
      }
    }

    var resposta = await db
      .from('faturamentos')
      .upsert(
        {
          empresa_id: state.empresa.id,
          ano: Number(state.ano),
          mes: state.mes,
          valor: apagarAvulsas ? valor : valor + totalEntradasRealizadas,
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
    limparRascunhoLancamentoMobile();
    state.erro = '';
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
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
    notificarFinanceiroAtualizadoMobile();
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
    if (state.carregando || state.empresaAcao === 'criar') return;

    var nome = campo('nova-empresa-nome').trim();
    var tipoPerfil = normalizarTipoPerfil(state.novaEmpresaTipoPerfil);

    // Premium Pessoal: 2º perfil pessoal é pago (criar perfil empresa é livre).
    if (tipoPerfil === 'pessoal' && criarPerfilPessoalBloqueadoMobile()) {
      abrirPremiumMobile('multiplos_perfis');
      return;
    }

    if (!nome) {
      setErroCriarPerfil('Informe o nome do perfil financeiro.');
      return;
    }

    state.carregando = true;
    state.empresaAcao = 'criar';
    state.criarPerfilErro = '';
    render();

    var resposta = await db.rpc('criar_empresa_inicial_rpc', {
      p_nome_empresa: nome,
    });

    if (resposta.error) {
      state.carregando = false;
      state.empresaAcao = '';
      setErroCriarPerfil(mensagemErro(resposta.error, 'Não foi possível criar o perfil financeiro.'));
      return;
    }

    var dadosBrutos = resposta.data;
    var semDados = !dadosBrutos || (Array.isArray(dadosBrutos) && dadosBrutos.length === 0);
    if (semDados) {
      state.carregando = false;
      state.empresaAcao = '';
      setErroCriarPerfil('O servidor criou o perfil mas não retornou os dados. Recarregue a página e verifique se o perfil foi criado antes de tentar novamente.');
      return;
    }

    var criada = Array.isArray(dadosBrutos) ? dadosBrutos[0] : dadosBrutos;
    var criadaId = criada && (criada.id || criada.empresa_id);

    if (!criadaId) {
      state.carregando = false;
      state.empresaAcao = '';
      setErroCriarPerfil('Perfil criado, mas o identificador não foi reconhecido. Recarregue a página para verificar.');
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

    await inserirDespesasPadraoMobile(criadaId, tipoPerfil);

    state.modalMenu = '';
    state.empresaAcao = '';
    state.empresaExclusaoAberta = false;
    state.empresaCriarAberta = false;
    state.criarPerfilErro = '';
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
    state.criarPerfilErro = '';
    state.erro = '';
    render();
  }

  function cancelarCriarEmpresaMobile() {
    if (state.carregando) return;
    state.empresaCriarAberta = false;
    state.novaEmpresaTipoPerfil = 'empresa';
    state.criarPerfilErro = '';
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
        await carregarEmpresas(state.usuario.id, state.usuario);
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
    if (tipo === 'receita' && ehReceitaSincronizada(item)) return;

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

    if (tipo === 'receita' && ehReceitaSincronizada(item)) {
      state.modalAcao = null;
      render();
      return;
    }

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
          var parcelasParaExcluir = resp ? parcelasGrupo : [item];
          for (var i = 0; i < parcelasParaExcluir.length; i++) {
            var parcela = parcelasParaExcluir[i];
            if (!(await removerNotaLancamentoMobile(parcela.id))) {
              state.carregando = false;
              setErro('Nao foi possivel remover a nota da despesa.');
              return;
            }
            var exclusaoParcela = await db.from('lancamentos').delete().eq('id', parcela.id).eq('empresa_id', state.empresa.id);
            if (exclusaoParcela.error) {
              state.carregando = false;
              setErro('Nao foi possivel excluir a despesa.');
              return;
            }
          }
          state.modalAcao = null;
          await carregarDados();
          notificarFinanceiroAtualizadoMobile();
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

      // Prevista nao entrou no total efetivado; nao subtrair.
      if (item.status !== 'prevista') {
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
      }
    } else {
      var ehFixa = item.tipo === 'fixa' || item.recorrenciaId;
      if (ehFixa) {
        var confirmarFixa = window.confirm(
          'Esta exclusao remove somente o lancamento deste mes.\n\n' +
          'Para remover a despesa fixa de todos os meses, acesse "Despesas fixas".\n\n' +
          'OK = Excluir este mes\n' +
          'Cancelar = Abrir Despesas fixas'
        );
        if (!confirmarFixa) {
          state.carregando = false;
          state.modalAcao = null;
          abrirModalMenuDespesasFixas();
          return;
        }
      }
      var removida = ehFixa
        ? (await removerNotaLancamentoMobile(item.id)
          ? await db.from('lancamentos').update({ status: 'cancelada' }).eq('id', item.id).eq('empresa_id', state.empresa.id)
          : { error: { message: 'Nao foi possivel remover a nota.' } })
        : (await removerNotaLancamentoMobile(item.id)
          ? await db.from('lancamentos').delete().eq('id', item.id).eq('empresa_id', state.empresa.id)
          : { error: { message: 'Nao foi possivel remover a nota.' } });
      if (removida.error) {
        state.carregando = false;
        setErro('Nao foi possivel excluir a despesa.');
        return;
      }
    }

    state.modalAcao = null;
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
    mostrarToast(tipo === 'receita' ? 'Receita excluida.' : 'Despesa excluida.');
  }

  async function salvarEdicaoLancamentoSelecionado() {
    if (!state.modalAcao || !state.modalAcao.item || !state.empresa) return;

    var tipo = state.modalAcao.tipo;
    var item = state.modalAcao.item;

    if (tipo === 'receita' && ehReceitaSincronizada(item)) {
      state.modalAcao = null;
      render();
      return;
    }
    var limite = maxDias(state.mes, state.ano);

    // Lê TODOS os campos ANTES do render() — o render reconstrói o DOM e zera os inputs.
    var dia = Number(campo('editar-dia'));
    var valor = normalizarValor(campo('editar-valor'));
    var origem = tipo === 'receita' ? campo('editar-origem').trim() : '';
    var despesaNome = tipo === 'receita' ? '' : campo('editar-despesa').trim();
    var descricao = tipo === 'receita' ? '' : campo('editar-descricao');

    if (!dia || dia < 1 || dia > limite || valor <= 0) {
      setErro('Informe dia e valor validos.');
      return;
    }
    if (tipo === 'receita' && !origem) { setErro('Informe a origem.'); return; }
    if (tipo !== 'receita' && !despesaNome) { setErro('Informe a despesa.'); return; }

    // O render de "Salvando..." reconstrói o formulário. Mantém no modal os
    // valores recém-digitados para não exibir novamente os dados antigos
    // enquanto a atualização é enviada ao banco. `item` continua apontando
    // para o registro original, necessário para calcular diferenças de receita.
    state.modalAcao.item = Object.assign({}, item, tipo === 'receita'
      ? {
          dia: dia,
          origem: formatarDescricao(origem),
          valor: valor,
        }
      : {
          dia: dia,
          despesa: despesaNome,
          descricao: formatarDescricao(descricao),
          valor: valor,
        });
    state.carregando = true;
    state.erro = '';
    render();

    if (tipo === 'receita') {
      // Receita prevista nao entra no total efetivado; entao ao editar uma prevista
      // nao mexemos no total do mes (so quando ela ja esta efetivada).
      var eraPrevista = item.status === 'prevista';
      var receita = await db
        .from('faturamentos_entradas')
        .update({
          dia: dia,
          origem: formatarDescricao(origem),
          valor: valor,
          status: eraPrevista ? 'prevista' : (item.status || null),
          tipo_obs: eraPrevista ? 'previsto' : (item.tipo || null),
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

      if (!eraPrevista) {
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
      }
    } else {
      var mesItem = item.mes || state.mes;
      var ehFixaEditada = item.tipo === 'fixa' || Boolean(item.recorrenciaId);
      var ehParcelaEditada = item.tipo === 'parcela';
      var ehFuturaEditada = dataFutura(Number(state.ano), indiceMes(mesItem), dia);
      var tipoEditado = ehFixaEditada ? 'fixa' : (ehParcelaEditada ? 'parcela' : (ehFuturaEditada ? 'previsto' : null));
      var statusEditado = ehParcelaEditada
        ? (item.status || null)
        : (ehFuturaEditada ? 'prevista' : (ehFixaEditada && item.status === 'prevista' ? 'confirmada' : null));
      var despesa = await db
        .from('lancamentos')
        .update({
          dia: dia,
          despesa_nome: despesaNome,
          descricao: formatarDescricao(descricao),
          valor: valor,
          status: statusEditado,
          tipo_obs: tipoEditado,
        })
        .eq('id', item.id)
        .eq('empresa_id', state.empresa.id)
        .select()
        .single();

      if (despesa.error) {
        state.carregando = false;
        setErro('Nao foi possivel editar a despesa: ' + (despesa.error.message || despesa.error.code || 'erro'));
        return;
      }
    }

    state.modalAcao = null;
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
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
    notificarFinanceiroAtualizadoMobile();
    mostrarToast('Despesa confirmada.');
  }

  async function excluirDespesaPrevista(id) {
    if (!state.empresa) return;
    var despesaPrevista = (state.lancamentos || []).find(function(l) { return String(l.id) === String(id); });
    var ehFixaPrevista = despesaPrevista && (despesaPrevista.tipo === 'fixa' || despesaPrevista.recorrenciaId);
    if (ehFixaPrevista) {
      var confirmarFixa = window.confirm(
        'Esta exclusao remove somente o lancamento deste mes.\n\n' +
        'Para remover a despesa fixa de todos os meses, acesse "Despesas fixas".\n\n' +
        'OK = Excluir este mes\n' +
        'Cancelar = Abrir Despesas fixas'
      );
      if (!confirmarFixa) {
        abrirModalMenuDespesasFixas();
        return;
      }
    } else if (!window.confirm('Excluir esta despesa prevista? Ela nao ocorreu e sera removida.')) {
      return;
    }
    state.carregando = true;
    render();
    var resp = ehFixaPrevista
      ? (await removerNotaLancamentoMobile(id)
        ? await db.from('lancamentos').update({ status: 'cancelada' }).eq('id', id).eq('empresa_id', state.empresa.id)
        : { error: { message: 'Nao foi possivel remover a nota.' } })
      : (await removerNotaLancamentoMobile(id)
        ? await db.from('lancamentos').delete().eq('id', id).eq('empresa_id', state.empresa.id)
        : { error: { message: 'Nao foi possivel remover a nota.' } });
    if (resp.error) {
      state.carregando = false;
      setErro('Nao foi possivel excluir a despesa.');
      return;
    }
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
    mostrarToast('Despesa excluida.');
  }

  function ajustarDespesaPrevista(id) {
    abrirAcaoLancamento('despesa', id);
    if (state.modalAcao) state.modalAcao.modo = 'editar';
    render();
  }

  async function confirmarReceitaPrevista(id) {
    if (!state.empresa) return;
    var entrada = (state.entradas || []).find(function (e) { return String(e.id) === String(id); });
    if (!entrada) return;
    if (ehReceitaSincronizada(entrada)) return;
    state.carregando = true;
    render();
    var resp = await db.from('faturamentos_entradas').update({ status: 'confirmada', tipo_obs: null }).eq('id', id).eq('empresa_id', state.empresa.id);
    if (resp.error) {
      state.carregando = false;
      setErro('Nao foi possivel confirmar a receita.');
      return;
    }
    // Efetiva a receita: soma no total do mes.
    var totalAtual = state.faturamentos[entrada.mes] || 0;
    await db.from('faturamentos').upsert(
      { empresa_id: state.empresa.id, ano: Number(state.ano), mes: entrada.mes, valor: totalAtual + Number(entrada.valor || 0) },
      { onConflict: 'empresa_id,ano,mes' }
    );
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
    mostrarToast('Receita confirmada.');
  }

  async function excluirReceitaPrevista(id) {
    if (!state.empresa) return;
    var entrada = (state.entradas || []).find(function (e) { return String(e.id) === String(id); });
    if (!entrada || ehReceitaSincronizada(entrada)) return;
    if (!window.confirm('Excluir esta receita prevista? Ela nao ocorreu e sera removida.')) return;
    state.carregando = true;
    render();
    var resp = await db.from('faturamentos_entradas').delete().eq('id', id).eq('empresa_id', state.empresa.id);
    if (resp.error) {
      state.carregando = false;
      setErro('Nao foi possivel excluir a receita.');
      return;
    }
    await carregarDados();
    notificarFinanceiroAtualizadoMobile();
    mostrarToast('Receita excluida.');
  }

  function editarReceitaPrevista(id) {
    var entrada = (state.entradas || []).find(function (e) { return String(e.id) === String(id); });
    if (!entrada || ehReceitaSincronizada(entrada)) return;
    abrirAcaoLancamento('receita', id);
    if (state.modalAcao) state.modalAcao.modo = 'editar';
    render();
  }

  function telaLoginWrapper(conteudo, titulo, subtitulo) {
    return (
      '<section class="avantalab-mobile-bg avantalab-mobile-bg-login fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-4 py-5" style="height:100dvh;--avantalab-mobile-bg-overlay:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0));">' +
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
    if (!boasVindas && !state.modoCadastro && !state.modoSenha) {
      return (
        '<section class="gestao-login-screen">' +
          '<div class="gestao-login-brand"><img src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" /></div>' +
          '<form class="gestao-login-form" onsubmit="return false"><div class="gestao-login-heading"><h1>Gestão Financeira</h1><p>Entre para acompanhar sua gestão financeira, lançamentos, relatórios e evolução operacional.</p></div>' + telaLoginCampos() + '</form>' +
        '</section>'
      );
    }
    var maxH = boasVindas
      ? 'none'
      : ((state.modoCadastro || state.modoSenha)
        ? 'calc(80dvh - 1.5rem)'
        : 'calc(80dvh - 5.5rem)');
    var padClass = state.modoCadastro ? 'p-3' : 'p-3';

    var topLogin = boasVindas
      ? 'clamp(12rem,28dvh,14rem)'
      : (state.modoCadastro ? 'clamp(5rem,12dvh,7rem)' : 'clamp(7rem,18dvh,10rem)');

    return (
      '<section class="avantalab-mobile-bg avantalab-mobile-bg-login fixed inset-0 flex flex-col items-center overflow-x-hidden overflow-y-auto px-4 pb-4" style="height:100dvh;padding-top:' + topLogin + ';background-position:center bottom;background-size:auto 108%;overscroll-behavior:contain;--avantalab-mobile-bg-overlay:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0));">' +
        '<div class="mx-auto w-full max-w-md shrink-0 overflow-y-auto rounded-3xl border border-white/35 ' + padClass + ' text-slate-900 shadow-2xl backdrop-blur-xl" style="background-color:rgba(255,255,255,.18);max-height:' + maxH + ';overscroll-behavior:contain;">' +
          (boasVindas
            ? telaBoasVindas()
            : '<div class="' + (state.modoCadastro ? 'mb-2' : 'mb-3') + '">' +
                ((state.modoCadastro || state.modoSenha) ? '<p class="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-800">Gestão Financeira</p>' : '') +
                '<h1 class="' + (state.modoCadastro ? 'text-xl' : 'text-2xl') + ' font-black text-slate-900">' + (state.modoCadastro ? 'Criar cadastro' : state.modoSenha ? 'Recuperar senha' : 'Gestão Financeira') + '</h1>' +
                '<p class="mt-1 text-xs leading-snug text-slate-600">' +
                  (state.modoCadastro ? 'Preencha seus dados e confirme o celular por SMS.' : state.modoSenha ? 'Digite seu login, receba o codigo por SMS e defina uma nova senha.' : 'Entre para acompanhar sua gestão financeira, lançamentos, relatórios e evolução operacional.') +
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
      '<div class="grid gap-3">' +
        '<div>' +
          '<h1 class="text-2xl font-black leading-tight text-slate-900">Gestão empresarial integrada, segura e simples de operar.</h1>' +
          '<p class="mt-2 text-xs font-semibold leading-snug text-slate-600">O AvantaLab Gestão centraliza rotinas financeiras e operacionais em uma plataforma prática, moderna e fácil de usar, com estrutura segura para organizar informações, acompanhar indicadores e apoiar decisões do dia a dia empresarial.</p>' +
        '</div>' +
        '<div class="grid gap-1.5 rounded-2xl bg-white/22 p-3 text-[11px] font-bold leading-snug text-slate-700">' +
          '<p class="text-[9px] font-black uppercase tracking-[0.18em] text-sky-800">Principais benefícios</p>' +
          '<p>&#10003; Controle receitas, despesas e pagamentos programados.</p>' +
          '<p>&#10003; Acompanhe gráficos e comparativos mês a mês.</p>' +
          '<p>&#10003; Receba avisos e notificações sobre compromissos financeiros.</p>' +
          '<p>&#10003; Use IA para entender seus números e tirar dúvidas do sistema.</p>' +
          '<p>&#10003; Gerencie ponto e rotinas operacionais.</p>' +
          '<p>&#10003; Acesse pelo computador ou celular.</p>' +
        '</div>' +
        '<button id="boas-vindas-cadastro" type="button" class="h-12 rounded-xl px-4 text-sm font-black uppercase tracking-wide text-white shadow-lg" style="background:linear-gradient(135deg,#003E73,#00A6C8)">' +
          'Criar conta gratis' +
        '</button>' +
        '<div class="text-center text-sm text-slate-600">Ja tem conta? <button id="boas-vindas-login" type="button" class="font-bold text-sky-700 underline">Entrar</button></div>' +
      '</div>'
    );
  }

  function telaCarregandoMobile() {
    var progresso = window.__AVANTALAB_MOBILE_PROGRESSO__ || {
      valor: 5,
      rotulo: 'Preparando recursos do aplicativo',
    };
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex items-center justify-center overflow-hidden px-4" style="height:100dvh;background-position:center bottom;background-size:cover;">' +
        '<div class="w-full max-w-xs rounded-3xl border border-white/40 bg-white/25 p-5 text-center text-slate-900 shadow-2xl backdrop-blur-xl">' +
          '<p class="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">AvantaLab</p>' +
          '<h1 class="mt-2 text-xl font-black">Preparando acesso</h1>' +
          '<p id="mobileAccessProgressLabel" class="mt-2 text-sm font-semibold text-slate-600">' + escapeHtml(progresso.rotulo || 'Preparando recursos do aplicativo') + '</p>' +
          '<div class="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-900/10" aria-label="Carregando acesso"><i id="mobileAccessProgressBar" class="block h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 transition-[width] duration-200" style="width:' + Number(progresso.valor || 5) + '%"></i></div>' +
          '<b id="mobileAccessProgressValue" class="mt-1 block text-[11px] font-black text-cyan-700">' + Number(progresso.valor || 5) + '%</b>' +
          '<button id="mobileAccessContinueButton" type="button" onclick="window.__avantalabConcluirAcessoMobile && window.__avantalabConcluirAcessoMobile()" class="mt-3 hidden h-10 w-full rounded-xl bg-cyan-700 px-4 text-xs font-black uppercase tracking-wide text-white">Continuar</button>' +
        '</div>' +
      '</section>'
    );
  }

  function telaPreparacaoAcessoMobileVisivel() {
    return String(root.textContent || '').indexOf('Preparando acesso') >= 0;
  }

  function concluirAcessoMobile() {
    var progresso = window.__AVANTALAB_MOBILE_PROGRESSO__ || {};
    if (
      Number(progresso.valor || 0) < 100 ||
      !state.autenticado ||
      !state.empresa ||
      !state.paywallVerificado
    ) {
      return false;
    }

    state.pronto = true;
    state.carregando = false;

    try {
      render();
    } catch (erro) {
      console.error('Não foi possível abrir a Gestão após concluir o acesso:', erro);
      root.innerHTML = telaAvisoMobile(
        'Acesso concluído',
        'Seus dados foram carregados, mas a tela não conseguiu abrir. Toque abaixo para tentar novamente.'
      );
      return false;
    }

    var acessoAberto = !telaPreparacaoAcessoMobileVisivel();
    if (acessoAberto && typeof window.__avantalabConfirmarAcessoMobile === 'function') {
      window.__avantalabConfirmarAcessoMobile();
    }
    return acessoAberto;
  }

  function garantirLiberacaoAcessoMobile() {
    if (temporizadorLiberacaoAcessoMobile) {
      window.clearTimeout(temporizadorLiberacaoAcessoMobile);
    }

    temporizadorLiberacaoAcessoMobile = window.setTimeout(function () {
      temporizadorLiberacaoAcessoMobile = null;
      if (!telaPreparacaoAcessoMobileVisivel()) return;
      if (concluirAcessoMobile()) return;

      var botaoContinuar = document.getElementById('mobileAccessContinueButton');
      if (botaoContinuar) botaoContinuar.classList.remove('hidden');
    }, 900);
  }

  window.__avantalabConcluirAcessoMobile = concluirAcessoMobile;

  function atualizarProgressoAcessoMobile(grupo, concluido, total, rotulo) {
    if (typeof window.__avantalabAtualizarProgressoMobile === 'function') {
      window.__avantalabAtualizarProgressoMobile(grupo, concluido, total, rotulo);
    }
    var progresso = window.__AVANTALAB_MOBILE_PROGRESSO__ || {};
    if (Number(progresso.valor || 0) >= 100) garantirLiberacaoAcessoMobile();
  }

  function sincronizarProgressoAcessoMobile() {
    var progresso = window.__AVANTALAB_MOBILE_PROGRESSO__;
    if (!progresso) return;
    var barra = document.getElementById('mobileAccessProgressBar');
    var texto = document.getElementById('mobileAccessProgressValue');
    var etapa = document.getElementById('mobileAccessProgressLabel');
    if (barra) barra.style.width = progresso.valor + '%';
    if (texto) texto.textContent = progresso.valor + '%';
    if (etapa) etapa.textContent = progresso.rotulo;
  }

  function aguardarPinturaProgressoMobile(tempoVisivelMs) {
    var espera = Math.max(0, Number(tempoVisivelMs || 0));
    return new Promise(function (resolver) {
      var concluido = false;
      var fallback = null;
      var finalizar = function () {
        if (concluido) return;
        concluido = true;
        if (fallback) window.clearTimeout(fallback);
        resolver();
      };
      var aposPintura = function () {
        window.setTimeout(finalizar, espera);
      };

      // Em segundo plano o requestAnimationFrame pode ficar suspenso. O
      // fallback mantém a inicialização finita sem pular a espera visual
      // quando a página está realmente visível.
      fallback = window.setTimeout(finalizar, Math.max(600, espera + 400));
      if (document.hidden || typeof window.requestAnimationFrame !== 'function') {
        aposPintura();
        return;
      }
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(aposPintura);
      });
    });
  }

  function cardInstalarLoginHtml() {
    if (isStandalone()) return '';

    return (
      '<div class="mx-auto mt-3 w-full max-w-md shrink-0 rounded-2xl border border-white/25 p-3 text-slate-800 shadow-lg backdrop-blur-lg" style="background-color:rgba(255,255,255,.14)">' +
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
    var loginPorTelefone = state.loginTipo === 'telefone';
    var iconeContato = loginPorTelefone
      ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.6 3.8 9.1 3a1.8 1.8 0 0 1 2.1.9l1.2 2.8a1.8 1.8 0 0 1-.4 2l-1.3 1.3a13 13 0 0 0 3.4 3.4l1.3-1.3a1.8 1.8 0 0 1 2-.4l2.8 1.2a1.8 1.8 0 0 1 .9 2.1l-.8 2.5a2 2 0 0 1-2 1.4C10.4 18.4 5.6 13.6 5.2 5.8a2 2 0 0 1 1.4-2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var iconeSenha = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 14v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    var iconeEmail = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var iconeTelefone = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.6 3.8 9.1 3a1.8 1.8 0 0 1 2.1.9l1.2 2.8a1.8 1.8 0 0 1-.4 2l-1.3 1.3a13 13 0 0 0 3.4 3.4l1.3-1.3a1.8 1.8 0 0 1 2-.4l2.8 1.2a1.8 1.8 0 0 1 .9 2.1l-.8 2.5a2 2 0 0 1-2 1.4C10.4 18.4 5.6 13.6 5.2 5.8a2 2 0 0 1 1.4-2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return (
      '<div class="gestao-login-methods">' +
        '<button id="login-tipo-email" type="button" class="' + (!loginPorTelefone ? 'active' : '') + '">' + iconeEmail + 'E-mail</button>' +
        '<button id="login-tipo-telefone" type="button" class="' + (loginPorTelefone ? 'active' : '') + '">' + iconeTelefone + 'Telefone</button>' +
      '</div>' +
      '<label class="gestao-login-label">' + (loginPorTelefone ? 'Telefone' : 'E-mail ou login') +
        '<span class="gestao-login-field">' + iconeContato +
          '<input id="login" type="' + (loginPorTelefone ? 'tel' : 'text') + '" inputmode="' + (loginPorTelefone ? 'tel' : 'email') + '" autocomplete="' + (loginPorTelefone ? 'tel' : 'username') + '" placeholder="' + (loginPorTelefone ? 'Digite seu telefone' : 'Digite seu e-mail ou login') + '" value="' + escapeHtml(state.loginValor || '') + '" />' +
        '</span>' +
      '</label>' +
      '<label class="gestao-login-label">Senha' +
        '<span class="gestao-login-field gestao-login-password">' + iconeSenha +
          '<input id="senha" type="' + (state.mostrarSenhaLogin ? 'text' : 'password') + '" autocomplete="current-password" placeholder="Digite sua senha" />' +
          '<button id="toggle-senha-login" type="button" aria-label="' + (state.mostrarSenhaLogin ? 'Ocultar senha' : 'Exibir senha') + '">' + (state.mostrarSenhaLogin ? '◉' : '◎') + '</button>' +
        '</span>' +
      '</label>' +
      '<div class="gestao-login-options">' +
        '<label class="gestao-remember-option"><input id="manter-conectado" type="checkbox"' + (state.manterConectado ? ' checked' : '') + ' /><span></span>Lembrar-me</label>' +
        '<button id="esqueci-senha" type="button" class="gestao-forgot-link">Esqueceu a senha?</button>' +
      '</div>' +
        alertaHtml() +
        '<button id="entrar" type="button" class="gestao-login-submit">' +
          (state.loginAcao === 'senha' ? 'Entrando...' : 'Entrar') +
        '</button>' +
        '<button id="entrar-google" type="button" class="gestao-google-login-button">' +
          '<span class="gestao-google-login-mark" aria-hidden="true">G</span>' +
          '<span>' + (state.loginAcao === 'google' ? 'Conectando...' : 'Continuar com Google') + '</span>' +
        '</button>' +
        '<p class="gestao-login-register">Não tem conta? <button id="abrir-cadastro" type="button">Cadastre-se</button></p>'
    );
  }

  function telaCadastro() {
    var tipoCadastro = normalizarTipoPerfil(state.cadastroTipoPerfil);
    return (
      '<div class="grid gap-2">' +
        '<div>' +
          '<p class="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-600">Tipo do primeiro perfil</p>' +
          seletorTipoPerfilHtml('cadastro-tipo', tipoCadastro) +
        '</div>' +
        (tipoCadastro === 'empresa'
          ? inputHtml('cadastro-empresa', 'Empresa', 'text', 'Nome fantasia', state.cadastro.nomeEmpresa)
          : '') +
        inputHtml('cadastro-nome', tipoCadastro === 'empresa' ? 'Responsável' : 'Nome completo', 'text', 'Nome completo', state.cadastro.nome) +
        inputHtml('cadastro-email', 'Email', 'email', 'seuemail@exemplo.com', state.cadastro.email) +
        '<div class="grid grid-cols-[7rem_1fr] gap-2">' +
          '<div><p class="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-600">País</p><select id="cadastro-ddi" class="h-[38px] w-full rounded-xl border border-slate-300 bg-white/90 px-2 text-sm text-slate-800 outline-none">' + opcoesDdiHtml(state.cadastroDdi) + '</select></div>' +
          '<div>' + inputHtml('cadastro-telefone', 'Celular', 'tel', '(11) 99999-9999', formatarTelefoneCadastroMobile(state.cadastro.telefone, state.cadastroDdi)) + '</div>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<div>' + senhaInputHtml('cadastro-senha', 'Senha', 'Crie uma senha', 'mostrarSenhaCadastro', 'toggle-senha-cadastro', state.cadastro.senha) + '</div>' +
          '<div>' + senhaInputHtml('cadastro-confirmar-senha', 'Confirmar senha', 'Repita a senha', 'mostrarConfirmarSenhaCadastro', 'toggle-confirmar-cadastro', state.cadastro.confirmarSenha) + '</div>' +
        '</div>' +
        (state.smsCadastroEnviado ?
          '<div class="rounded-xl border-2 border-sky-400 bg-sky-50 px-3 py-2.5 shadow-sm">' +
            '<p class="mb-1 text-[11px] font-black uppercase tracking-wide text-sky-700">Digite o c&oacute;digo recebido</p>' +
            '<input id="cadastro-codigo" type="text" inputmode="numeric" autofocus placeholder="Codigo recebido por SMS" class="w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-semibold tracking-widest text-slate-800 outline-none" />' +
            '<p class="mt-1 text-[11px] font-semibold text-sky-800">Enviamos o codigo para o celular informado.</p>' +
          '</div>'
        : '') +
        (!state.smsCadastroEnviado ?
          '<p class="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-center leading-tight text-slate-600 shadow-sm">' +
            '<span class="block whitespace-nowrap text-[10px]">Ao se cadastrar, voc&ecirc; declara aceitar nossos termos.</span>' +
            '<span class="mt-0.5 block text-[11px]"><button id="cadastro-termos-link" type="button" class="mr-2 font-bold text-sky-700 underline">Termos de Uso</button>' +
            '<button id="cadastro-privacidade-link" type="button" class="font-bold text-sky-700 underline">Pol&iacute;tica de Privacidade</button></span>' +
          '</p>'
        : '') +
        alertaHtml() +
        '<input id="cadastro-cupom" type="text" placeholder="Cupom (opcional)" value="' + (state.cadastroCupom || '') + '" class="h-10 w-full rounded-xl border border-slate-300 bg-white/90 px-3 text-sm font-semibold uppercase tracking-wide text-slate-800 outline-none" />' +
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

  function telaTelefoneObrigatorioMobile(modoPrevia) {
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-4 py-5" style="height:100dvh;--avantalab-mobile-bg-overlay:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0));">' +
        '<div class="mx-auto w-full max-w-md overflow-y-auto rounded-3xl border border-white/35 p-3 text-slate-900 shadow-2xl backdrop-blur-xl" style="background-color:rgba(255,255,255,.18);max-height:calc(100dvh - 2.5rem);overscroll-behavior:contain;">' +
          '<div class="mb-3">' +
            '<h1 class="text-2xl font-black text-slate-900">Confirme seu celular</h1>' +
            '<p class="mt-1 text-xs leading-snug text-slate-600">Para manter seu acesso seguro, confirme um celular com DDD por SMS.</p>' +
          '</div>' +
          '<div class="grid min-w-0 gap-1">' +
            '<div class="grid min-w-0 grid-cols-[7rem_minmax(0,1fr)] gap-2">' +
              '<div class="min-w-0"><p class="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-600">País</p><select id="ddi-telefone-obrigatorio" class="h-[38px] w-full min-w-0 rounded-xl border border-slate-300 bg-white/90 px-2 text-sm text-slate-800 outline-none">' + opcoesDdiHtml(state.ddiTelefoneObrigatorio) + '</select></div>' +
              '<div class="min-w-0">' + inputHtml('telefone-obrigatorio', 'Celular', 'tel', '(xx) xxxxx-xxxx', state.telefoneObrigatorio) + '</div>' +
            '</div>' +
            (state.smsTelefoneObrigatorioEnviado
              ? inputHtml('codigo-telefone-obrigatorio', 'Codigo recebido por SMS', 'text', 'Digite o codigo recebido', state.codigoTelefoneObrigatorio) +
                '<p class="-mt-1 text-[11px] font-semibold text-slate-500">Enviamos o codigo para o celular informado.</p>'
              : '') +
            alertaHtml() +
            '<button id="confirmar-telefone-obrigatorio" type="button"' + (modoPrevia ? ' disabled aria-disabled="true"' : '') + ' class="h-10 rounded-xl bg-slate-900 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70">' +
              (state.validandoTelefoneObrigatorio
                ? (state.smsTelefoneObrigatorioEnviado ? 'Validando...' : 'Enviando...')
                : (state.smsTelefoneObrigatorioEnviado ? 'Confirmar celular' : 'Enviar codigo por SMS')) +
            '</button>' +
            (state.smsTelefoneObrigatorioEnviado
              ? '<button id="reenviar-telefone-obrigatorio" type="button" class="text-xs font-bold text-sky-700 underline">Reenviar codigo</button>'
              : '') +
            (modoPrevia
              ? '<a href="/mobile" class="text-center text-xs font-bold text-slate-600 underline">Fechar prévia</a>'
              : '<button id="sair-telefone-obrigatorio" type="button" class="text-xs font-bold text-slate-600 underline">Sair</button>') +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  // Aviso isolado do card de criar perfil (nao vaza para a dashboard).
  function setErroCriarPerfil(texto) {
    state.criarPerfilErro = texto || '';
    render();
  }
  function alertaCriarPerfilHtml() {
    if (!state.criarPerfilErro) return '';
    return '<p class="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">' + escapeHtml(state.criarPerfilErro) + '</p>';
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
        '<input id="' + id + '" type="' + type + '" placeholder="' + escapeHtml(placeholder || '') + '" value="' + escapeHtml(value || '') + '" style="font-size:16px;background-color:rgba(255,255,255,.94)" class="h-10 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:ring-2 focus:ring-sky-600/20" />' +
      '</label>'
    );
  }

  function senhaInputHtml(id, label, placeholder, stateKey, toggleId, value) {
    var visivel = !!state[stateKey];

    return (
      '<label class="grid gap-1 text-xs font-semibold text-slate-700">' +
        escapeHtml(label) +
        '<span class="relative block">' +
          '<input id="' + id + '" type="' + (visivel ? 'text' : 'password') + '" placeholder="' + escapeHtml(placeholder || '') + '" value="' + escapeHtml(value || '') + '" style="font-size:16px;background-color:rgba(255,255,255,.94)" class="h-10 w-full rounded-xl border border-slate-300 px-4 pr-10 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:ring-2 focus:ring-sky-600/20" />' +
          '<button id="' + toggleId + '" type="button" class="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/35 text-xs font-black text-slate-600 backdrop-blur-sm" aria-label="' + (visivel ? 'Ocultar senha' : 'Exibir senha') + '">' +
            (visivel ? '◉' : '◎') +
          '</button>' +
        '</span>' +
      '</label>'
    );
  }

  function campoClaro(id, label, extra, value) {
    var escuro = !!state.darkMode;
    return (
      '<label class="grid gap-1 text-xs font-black uppercase tracking-wide ' + (escuro ? 'text-slate-300' : 'text-slate-600') + '">' +
        escapeHtml(label) +
        '<input id="' + id + '" ' + (extra || '') + ' value="' + escapeHtml(value || '') + '" style="font-size:16px" class="h-11 w-full min-w-0 rounded-md border px-3 text-base font-bold normal-case tracking-normal outline-none focus:border-cyan-400 ' + (escuro ? 'border-slate-500 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900') + '" />' +
      '</label>'
    );
  }

  function campoValor(id, label, value) {
    var escuro = !!state.darkMode;
    return (
      '<label class="grid gap-1 text-xs font-black uppercase tracking-wide ' + (escuro ? 'text-slate-300' : 'text-slate-600') + '">' +
        escapeHtml(label) +
        '<input id="' + id + '" inputmode="decimal" value="' + escapeHtml(value || '') + '" placeholder="R$ 0,00" style="font-size:16px" class="h-11 rounded-md border px-3 text-right text-base font-black normal-case tracking-normal outline-none focus:border-cyan-400 ' + (escuro ? 'border-slate-500 bg-slate-800 text-slate-100 placeholder:text-slate-400' : 'border-slate-300 bg-white text-slate-900') + '" />' +
      '</label>'
    );
  }

  // ─── Controle de Ponto (funcionário) ───────────────────────
  function ehFuncionarioPontoMobile() {
    if (state.empresa && state.empresa.perfil === 'funcionario_ponto') return true;
    var md = state.usuario && state.usuario.user_metadata;
    return !!(md && md.tipo === 'funcionario_ponto');
  }

  function redirecionarParaPonto() {
    try {
      if (window.location.pathname !== '/ponto') {
        setTimeout(function () { window.location.replace('/ponto'); }, 0);
      }
    } catch (e) {}
  }

  function telaRedirecionandoPonto() {
    redirecionarParaPonto();
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex items-center justify-center overflow-hidden px-4" style="height:100dvh;">' +
        '<div class="w-full max-w-xs rounded-3xl border border-white/40 bg-white/25 p-5 text-center text-slate-900 shadow-2xl backdrop-blur-xl">' +
          '<p class="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">AvantaLab</p>' +
          '<h1 class="mt-2 text-xl font-black">Controle de Ponto</h1>' +
          '<p class="mt-2 text-sm font-semibold text-slate-600">Abrindo acesso seguro...</p>' +
        '</div>' +
      '</section>'
    );
  }

  function sincronizarGradienteHeaderPerfil() {
    var wrapper = document.getElementById('mobile-header-wrap');
    var header = document.getElementById('mobile-main-header');
    var pill = document.getElementById('mobile-profile-pill');
    if (!wrapper || !header || !pill) return;

    var wrapperRect = wrapper.getBoundingClientRect();
    var headerRect = header.getBoundingClientRect();
    var largura = Math.max(1, wrapperRect.width);
    var pillX = pill.offsetLeft - (pill.offsetWidth / 2);
    var pillY = pill.offsetTop;
    var alturaTotal = Math.max(headerRect.height, pillY + pill.offsetHeight);
    var gradiente = 'linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%)';
    var tamanho = largura + 'px ' + alturaTotal + 'px';

    header.style.backgroundImage = gradiente;
    header.style.backgroundSize = tamanho;
    header.style.backgroundPosition = '0 0';
    header.style.backgroundRepeat = 'no-repeat';
    wrapper.style.backgroundImage = gradiente;
    wrapper.style.backgroundSize = largura + 'px ' + Math.max(wrapperRect.height, headerRect.height) + 'px';
    wrapper.style.backgroundPosition = '0 0';
    wrapper.style.backgroundRepeat = 'no-repeat';
    pill.style.backgroundImage = gradiente;
    pill.style.backgroundSize = tamanho;
    pill.style.backgroundPosition = (-pillX) + 'px ' + (-pillY) + 'px';
    pill.style.backgroundRepeat = 'no-repeat';
    pill.style.opacity = window._avaProfilePillTranslucent ? '0.25' : '1';

    if (!window._avaHeaderGradientResizeBound) {
      window._avaHeaderGradientResizeBound = true;
      window.addEventListener('resize', function () {
        window.requestAnimationFrame(sincronizarGradienteHeaderPerfil);
      });
    }
  }

  function configurarRecolhimentoPerfilHeader() {
    var scroll = document.getElementById('mobile-main-scroll');
    var pill = document.getElementById('mobile-profile-pill');
    if (!scroll || !pill) return;
    window._avaProfilePillHidden = false;
    pill.style.setProperty('--profile-pill-y', '0%');

    var aplicarTransparencia = function () {
      var pillAtual = document.getElementById('mobile-profile-pill');
      if (!pillAtual) return;
      var translucida = scroll.scrollTop > 8;
      window._avaProfilePillTranslucent = translucida;
      pillAtual.style.opacity = translucida ? '0.25' : '1';
    };

    aplicarTransparencia();
    scroll.addEventListener('scroll', aplicarTransparencia, { passive: true });
  }

  function acoesHeaderMobileHtml() {
    var avisosHtml = '';
    if (state.visao === 'home' && (agendaTemAvisoHoje() || state.notificacoesNaoLidas > 0)) {
      avisosHtml = '<button id="avisos-dashboard" type="button" class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/15 text-white shadow-sm backdrop-blur" aria-label="Notificacoes">' + sinoAvisoSvg() +
        (state.notificacoesNaoLidas > 0
          ? '<span class="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white/60">' + (state.notificacoesNaoLidas > 99 ? '99+' : state.notificacoesNaoLidas) + '</span>'
          : '<span class="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-white/60"></span>') +
        '</button>';
    }
    var sistemasHtml = podeTrocarSistemaMobile()
      ? '<button id="ir-vendas-header" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 p-0 shadow-sm backdrop-blur active:scale-95" aria-label="Ir para Vendas Mobile" title="Ir para Vendas Mobile"><img src="/avantavendas/recursos/assets/icone-troca-gestao.png" alt="" aria-hidden="true" class="h-full w-full object-cover"></button>'
      : '';
    return avisosHtml || sistemasHtml
      ? '<div class="flex shrink-0 items-center gap-2">' + avisosHtml + sistemasHtml + '</div>'
      : '<span class="h-10 w-10 shrink-0" aria-hidden="true"></span>';
  }

  function telaApp() {
    var atual = dadosMes(state.mes);
    var anterior = dadosMesAnterior();
    var opcoesDashboardAberta = state.visao === 'home' && state.dashboardOpcoesId && state.dashboardOpcoesId !== 'ia';

    // Agenda: tela cheia, sem o cabeçalho global (que mostra outro mês e confunde).
    if (state.visao === 'agenda') {
      return (
        '<div class="mobile-app-shell ' + (state.darkMode ? 'mobile-dark bg-slate-950 text-slate-100' : 'mobile-light bg-slate-100 text-slate-900') + '" style="position:fixed;inset:0;overflow:hidden;overscroll-behavior:none;">' +
          agendaMobileHtml(atual) +
          (state.modalLancamento ? modalLancamentoHtml() : '') +
          (state.modalAcao ? modalAcaoLancamentoHtml() : '') +
          (state.menuAberto ? menuLateralHtml() : '') +
          (state.modalMenu ? modalMenuHtml() : '') +
          (state.exclusaoRecorrencia ? confirmacaoExclusaoRecorrenciaHtml() : '') +
          (state.caixinhaResetConfirmacao ? confirmacaoResetCaixinhaHtml() : '') +
          notaVisualizacaoHtml() +
          processandoNotaHtml() +
          navegacaoInferiorHtml() +
          toastHtml() +
        '</div>'
      );
    }

    return (
      '<div class="mobile-app-shell fixed inset-0 flex min-w-0 flex-col overflow-hidden ' + (state.darkMode ? 'mobile-dark bg-slate-950 text-slate-100' : 'mobile-light bg-slate-100 text-slate-900') + '" style="overscroll-behavior:none;">' +
        '<div id="mobile-header-wrap" class="relative z-40 shrink-0" style="background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);isolation:isolate;">' +
        '<header id="mobile-main-header" class="relative z-10 overflow-hidden rounded-[0_0_28px_28px] px-3 pb-3 text-white sm:px-4" style="padding-top:calc(env(safe-area-inset-top) + 10px);background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);border-radius:0 0 28px 28px;clip-path:inset(0 round 0 0 28px 28px);-webkit-mask-image:-webkit-radial-gradient(white, black);box-shadow:0 10px 10px rgba(8,47,73,0.18);contain:paint;">' +
          '<div class="mx-auto max-w-md">' +
            '<div class="flex items-center gap-3">' +
              '<div class="min-w-0 flex-1">' +
                '<h1 class="truncate text-lg font-black leading-tight text-white">' + (function(){ var pn = primeiroNomeUsuarioAva(); return 'Ol&aacute;' + (pn ? ', ' + escapeHtml(pn) : '') + '. ' + saudacaoPeriodoMobile(); })() + '</h1>' +
                '<p class="truncate text-[11px] font-semibold text-cyan-100/75">Bem-vindo ao AvantaLab</p>' +
              '</div>' +
              acoesHeaderMobileHtml() +
            '</div>' +
            '<div class="mt-3 flex h-7 items-center overflow-hidden rounded-lg border shadow-[0_8px_18px_rgba(15,23,42,0.16)] backdrop-blur-md" style="background:rgba(255,255,255,0.94);color:#082B57;border-color:rgba(255,255,255,0.75);backdrop-filter:blur(10px);">' +
              anoHeaderHtml() +
              '<span class="h-4 w-px shrink-0" style="background:rgba(8,43,87,0.18)" aria-hidden="true"></span>' +
              '<div class="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-center">' +
                '<button id="mes-anterior" type="button" class="flex h-7 w-full items-center justify-center text-[#082B57] active:bg-[#082B57]/10" aria-label="Mes anterior"><span class="text-lg font-black leading-none">&lsaquo;</span></button>' +
                '<h2 class="w-24 truncate text-center text-sm font-black tracking-wide text-[#082B57]">' + escapeHtml(state.mes.charAt(0) + state.mes.slice(1).toLowerCase()) + '</h2>' +
                '<button id="mes-proximo" type="button" class="flex h-7 w-full items-center justify-center text-[#082B57] active:bg-[#082B57]/10" aria-label="Proximo mes"><span class="text-lg font-black leading-none">&rsaquo;</span></button>' +
              '</div>' +
            '</div>' +
            insightDespesasHtml(atual, anterior) +
          '</div>' +
        '</header>' +
        '<div id="mobile-profile-pill" class="pointer-events-none absolute left-1/2 z-0 flex w-max items-center gap-1.5 rounded-[0_0_14px_14px] border-0 px-5 py-1.5 text-white shadow-[0_8px_18px_rgba(8,47,73,0.24)]" style="top:calc(100% - 6px);max-width:calc(100% - 48px);opacity:1;transform:translate(-50%,var(--profile-pill-y,0%));transition:opacity .24s ease,transform .28s cubic-bezier(.22,1,.36,1);will-change:opacity,transform;">' +
          '<span class="relative z-10 shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/80">Perfil ativo</span>' +
          '<span class="relative z-10 shrink-0 text-white/55" aria-hidden="true">&middot;</span>' +
          '<strong class="relative z-10 min-w-0 truncate text-[13px] font-black leading-tight">' + escapeHtml(nomeEmpresa(state.empresa)) + '</strong>' +
        '</div>' +
        '</div>' +
        (opcoesDashboardAberta
          ? '<button type="button" data-dashboard-fechar-opcoes="' + escapeHtml(state.dashboardOpcoesId) + '" class="fixed inset-0 cursor-default bg-slate-950/90 backdrop-blur-[1px]" style="z-index:9000;" aria-label="Fechar opcoes do card"></button>'
          : '') +
        '<div id="mobile-main-scroll" data-preserve-scroll class="min-h-0 flex-1 overflow-y-auto overscroll-contain" style="padding-bottom:calc(env(safe-area-inset-bottom) + 82px);-webkit-overflow-scrolling:touch;">' +
        '<div class="mx-auto grid w-full min-w-0 max-w-md gap-3 px-3 pt-11 sm:px-4">' +
          avisoCarenciaMobileHtml() +
          alertaHtml().replace('mt-4', '') +
          (state.visao === 'home' ? homeHtml(atual, anterior) : (state.visao === 'agenda' ? agendaMobileHtml(atual) : listaDetalhadaHtml(atual))) +
          (state.visao === 'agenda' ? '' : rodapeMobileHtml()) +
        '</div></div>' +
        (opcoesDashboardAberta ? menuOpcoesCardDashboardHtml() : '') +
        (state.modalLancamento ? modalLancamentoHtml() : '') +
        (state.modalAcao ? modalAcaoLancamentoHtml() : '') +
        (state.menuAberto ? menuLateralHtml() : '') +
        (state.modalMenu ? modalMenuHtml() : '') +
        (state.exclusaoRecorrencia ? confirmacaoExclusaoRecorrenciaHtml() : '') +
        (state.caixinhaResetConfirmacao ? confirmacaoResetCaixinhaHtml() : '') +
        notaVisualizacaoHtml() +
        processandoNotaHtml() +
        navegacaoInferiorHtml() +
        toastHtml() +
      '</div>'
    );
  }

  function toastHtml() {
    if (!state.toast) return '';

    return (
      '<div class="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center px-6">' +
        '<div class="rounded-2xl border border-cyan-200/50 bg-[#0b80bd]/95 px-5 py-3 text-center text-sm font-black text-white shadow-2xl backdrop-blur">' +
          escapeHtml(state.toast) +
        '</div>' +
      '</div>'
    );
  }

  function iconeNavegacaoInferior(tipo) {
    var base = 'width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"';
    if (tipo === 'home') return '<svg ' + base + '><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 21v-7h6v7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    if (tipo === 'perfil') return '<svg ' + base + '><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="2"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    if (tipo === 'agenda') return iconeAgendaSvg().replace('width="18" height="18"', 'width="22" height="22"');
    if (tipo === 'tema') return '<svg ' + base + '><path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    if (tipo === 'despesasFixas') return '<svg ' + base + '><path d="M4 7h16M6 3v4m12-4v4M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 12h3m2 0h3m-8 4h3m2 0h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    if (tipo === 'sistemas') return '<svg ' + base + '><rect x="3" y="4" width="8" height="7" rx="2"/><rect x="13" y="13" width="8" height="7" rx="2"/><path d="M15 7h4a2 2 0 0 1 2 2v1M9 17H5a2 2 0 0 1-2-2v-1M18 7l-2-2m2 2-2 2M6 17l2-2m-2 2 2 2"/></svg>';
    if (tipo === 'menu') return '<svg ' + base + '><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    return '';
  }

  // Traços desenhados por CSS: o alinhamento não varia entre fontes, sistemas
  // ou navegadores. Mantém os controles circulares iguais ao Vendas Mobile.
  function iconeFecharGeometricoMobile() {
    return '<span class="avanta-mobile-geometric-x" aria-hidden="true"></span>';
  }

  function iconeMaisGeometricoMobile() {
    return '<span class="avanta-mobile-geometric-plus" aria-hidden="true"></span>';
  }

  function iconeSeletorSistema(tipo) {
    var arquivo = tipo === 'gestao' ? '/images/icone-gestao-mobile-44.png' : '/images/icone-vendas-mobile-44.png';
    var rotulo = tipo === 'gestao' ? 'Ícone Gestão Mobile' : 'Ícone Vendas Mobile';
    return '<img src="' + arquivo + '" width="44" height="44" alt="' + rotulo + '" class="h-11 w-11 shrink-0 rounded-[14px] object-contain" draggable="false">';
  }

  function rotuloAtalhoInferior(tipo) {
    return {
      perfil: 'Perfil',
      agenda: 'Agenda',
      tema: 'Tema',
      despesasFixas: 'Fixas',
      sistemas: 'Ir para Vendas',
    }[tipo] || '';
  }

  function itemNavegacaoInferiorHtml(id, tipo, rotulo, ativo) {
    if (tipo === 'nenhum') return '<span class="min-w-0" aria-hidden="true"></span>';
    return '<button id="' + id + '" type="button" class="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-black transition-colors ' + (ativo ? 'text-cyan-700' : 'text-slate-400') + '" aria-label="' + escapeHtml(rotulo) + '">' +
      '<span class="flex h-7 items-center justify-center">' + iconeNavegacaoInferior(tipo) + '</span>' +
      '<span class="max-w-full truncate">' + escapeHtml(rotulo) + '</span>' +
    '</button>';
  }

  function navegacaoInferiorHtml() {
    if (state.chatIAAberto) return '';
    // Premium Pessoal: no grátis os atalhos ficam sempre no padrão.
    var atalhosBloqueados = premiumPessoalBloqueadoMobile();
    var esquerdo = atalhosBloqueados ? 'perfil' : normalizarAtalhoInferior(state.atalhoInferiorEsquerdo, 'perfil');
    var direito = atalhosBloqueados ? 'agenda' : normalizarAtalhoInferior(state.atalhoInferiorDireito, 'agenda');
    var agendaAtiva = state.visao === 'agenda';
    var perfilAtivo = state.modalMenu === 'empresa';
    var fixasAtivo = state.modalMenu === 'despesasFixas';

    var indiceAtivo = 0;
    if (state.menuAberto) indiceAtivo = 4;
    else if (state.modalLancamento) indiceAtivo = 2;
    else if (agendaAtiva) indiceAtivo = esquerdo === 'agenda' ? 1 : (direito === 'agenda' ? 3 : 0);
    else if (perfilAtivo) indiceAtivo = esquerdo === 'perfil' ? 1 : (direito === 'perfil' ? 3 : 0);
    else if (fixasAtivo) indiceAtivo = esquerdo === 'despesasFixas' ? 1 : (direito === 'despesasFixas' ? 3 : 0);
    var indiceAnterior = typeof window._avaNavIndice === 'number' ? window._avaNavIndice : indiceAtivo;

    return '<nav class="fixed inset-x-0 bottom-0 z-[90] border-t ' + (state.darkMode ? 'border-slate-700 bg-slate-900/95' : 'border-slate-200 bg-white/95') + ' shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur-xl" style="padding-bottom:env(safe-area-inset-bottom);" aria-label="Navegacao principal">' +
      '<div class="relative mx-auto grid h-[66px] max-w-md grid-cols-5 items-end px-2">' +
        '<span class="pointer-events-none absolute left-2 right-2 top-0 h-0.5 overflow-visible"><span data-nav-indicador data-nav-destino="' + indiceAtivo + '" class="block h-0.5 w-1/5 rounded-full bg-cyan-600 transition-transform duration-300 ease-out" style="transform:translateX(' + (indiceAnterior * 100) + '%)"></span></span>' +
        itemNavegacaoInferiorHtml('nav-home', 'home', 'Início', indiceAtivo === 0) +
        itemNavegacaoInferiorHtml('nav-atalho-esquerdo', esquerdo, rotuloAtalhoInferior(esquerdo), indiceAtivo === 1) +
        '<button id="nav-lancamento" type="button" class="relative flex min-w-0 flex-col items-center justify-end pb-1 text-[10px] font-black text-cyan-700" aria-label="Lançar despesa ou receita">' +
          '<span class="absolute bottom-[22px] flex h-[58px] w-[58px] items-center justify-center rounded-full border-4 ' + (state.darkMode ? 'border-slate-900' : 'border-white') + ' bg-cyan-600 text-white shadow-lg shadow-cyan-900/25">' + iconeMaisGeometricoMobile() + '</span>' +
          '<span>Lançar</span>' +
        '</button>' +
        itemNavegacaoInferiorHtml('nav-atalho-direito', direito, rotuloAtalhoInferior(direito), indiceAtivo === 3) +
        itemNavegacaoInferiorHtml('nav-menu', 'menu', 'Menu', indiceAtivo === 4) +
      '</div>' +
    '</nav>';
  }

  function rodapeMobileHtml() {
    var ano = new Date().getFullYear();
    return (
      '<footer class="mt-2 overflow-hidden rounded-2xl border border-white/15 px-3 py-2.5 text-center text-[11px] text-white shadow-lg shadow-sky-950/15" style="background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);">' +
        '<div class="text-[11px] font-black tracking-[0.16em] text-white">' + APP_VERSION_LABEL + '</div>' +
        '<p class="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 font-semibold text-cyan-50/90">&copy; ' + ano + ' Todos os direitos reservados.</p>' +
        '<div class="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 font-bold text-cyan-50/90">' +
          '<button id="sobre-mobile" type="button" class="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/20 px-3 py-1 text-cyan-50 backdrop-blur"><span class="text-[12px] leading-none">&#9432;</span>Sobre</button>' +
          '<a href="https://www.instagram.com/avanta.lab" target="_blank" rel="noopener noreferrer" class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-cyan-50 backdrop-blur">@avanta.lab</a>' +
          '<button id="termos-mobile" type="button" class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-cyan-50 backdrop-blur">Termos</button>' +
          '<button id="privacidade-mobile" type="button" class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-cyan-50 backdrop-blur">Privacidade</button>' +
        '</div>' +
      '</footer>'
    );
  }

  function avisoConfirmarHtml() {
    var pDesp = (state.lancamentos || []).filter(ehDespesaAConfirmar).map(function (i) { return { rec: false, item: i }; });
    var pRec = (state.entradas || []).filter(function (i) { return ehReceitaAConfirmar(i) && !ehReceitaSincronizada(i); }).map(function (i) { return { rec: true, item: i }; });
    var pendentes = pDesp.concat(pRec);
    if (!pendentes.length) return '';
    var plural = pendentes.length > 1;
    var sino = '<svg class="h-5 w-5 shrink-0" style="color:#d97706" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>';
    return (
      '<section class="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">' +
        '<div class="flex items-center gap-2 border-b border-amber-100 px-4 py-3">' +
          sino +
          '<h2 class="min-w-0 flex-1 text-sm font-black text-slate-900">' + pendentes.length + ' lan&ccedil;amento' + (plural ? 's' : '') + ' para confirmar</h2>' +
        '</div>' +
        '<div class="grid gap-2 overflow-y-auto p-3" style="max-height:42vh;">' +
          pendentes.map(function (p) {
            var item = p.item;
            var nome = p.rec ? item.origem : item.despesa;
            var corValor = p.rec ? 'text-emerald-600' : 'text-red-600';
            var attrConfirmar = p.rec ? 'data-confirmar-receita-id' : 'data-confirmar-id';
            var attrEditar = p.rec ? 'data-editar-receita-id' : 'data-ajustar-id';
            var attrExcluir = p.rec ? 'data-excluir-receita-id' : 'data-excluir-prevista-id';
            return '<div class="rounded-xl border border-slate-200 bg-white p-2.5">' +
              '<div class="flex items-center justify-between gap-2">' +
                '<p class="min-w-0 truncate text-sm font-bold text-slate-800">' + escapeHtml(nome) + ' <span class="text-xs font-semibold text-slate-400">&middot; ' + (p.rec ? 'receita &middot; ' : '') + 'dia ' + item.dia + '</span></p>' +
                '<strong class="shrink-0 text-sm font-black ' + corValor + '">' + dinheiro(item.valor) + '</strong>' +
              '</div>' +
              '<div class="mt-2 grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-3">' +
                '<button type="button" ' + attrConfirmar + '="' + escapeHtml(item.id) + '" class="h-8 rounded-lg bg-emerald-600 text-[11px] font-black text-white active:bg-emerald-700">Confirmar</button>' +
                '<button type="button" ' + attrEditar + '="' + escapeHtml(item.id) + '" class="h-8 rounded-lg border border-slate-300 bg-white text-[11px] font-black text-slate-700 active:bg-slate-50">Editar</button>' +
                '<button type="button" ' + attrExcluir + '="' + escapeHtml(item.id) + '" class="h-8 rounded-lg border border-red-200 bg-white text-[11px] font-black text-red-600 active:bg-red-50">Excluir</button>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</section>'
    );
  }

  function controlePontoCardHtml() {
    if (!podeGerenciarPontoMobile()) return '';
    var corpo = '';
    if (state.pontoResumoCarregando) {
      corpo = '<p class="py-4 text-center text-xs font-semibold text-slate-500">Atualizando resumo...</p>';
    } else if (!state.pontoFuncionariosHoje) {
      corpo = '<p class="py-4 text-center text-xs font-semibold text-slate-500">Nenhum funcionario previsto para hoje.</p>';
    } else if (!state.pontoResumo.length) {
      corpo = '<div class="flex items-center justify-center gap-2 py-4 text-sm font-bold text-emerald-600"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">&#10003;</span>Equipe em dia</div>';
    } else {
      corpo = '<div class="relative">' +
        '<div class="grid max-h-56 gap-1 overflow-y-auto pr-1">' +
          state.pontoResumo.map(function (item) {
            var visual = {
              atraso: ['Atraso', 'bg-amber-100 text-amber-700'],
              falta: ['Falta', 'bg-red-100 text-red-700'],
              incompleto: ['Incompleto', 'bg-violet-100 text-violet-700'],
            }[item.status] || ['Aviso', 'bg-slate-100 text-slate-700'];
            return '<button type="button" data-ponto-relatorio-user="' + escapeHtml(item.userId) + '" data-ponto-relatorio-nome="' + escapeHtml(item.nome) + '" class="flex min-h-8 w-full items-center justify-between gap-2 rounded-lg ' + (state.darkMode ? 'bg-slate-800' : 'bg-slate-50') + ' px-2.5 py-1.5 text-left active:brightness-95">' +
              '<span class="min-w-0 flex-1 truncate text-[11px] font-bold ' + (state.darkMode ? 'text-slate-100' : 'text-slate-800') + '">' + escapeHtml(item.nome) + '</span>' +
              '<span class="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase leading-tight ' + visual[1] + '">' + visual[0] + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        (state.pontoResumo.length > 5 ? '<div class="pointer-events-none absolute inset-x-0 bottom-0 flex h-8 items-end justify-center bg-gradient-to-t ' + (state.darkMode ? 'from-slate-900' : 'from-white') + ' to-transparent pb-0.5 text-cyan-600"><span class="animate-bounce text-sm">&#8964;</span></div>' : '') +
      '</div>';
    }

    return '<section class="overflow-hidden rounded-2xl border-2 shadow-lg ' + (state.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900') + '" style="border-color:#003E73">' +
      '<div class="flex items-center justify-between gap-3 px-4 py-3 text-white" style="background:#003E73">' +
        '<div class="min-w-0"><p class="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-100/75">Resumo diario</p><h2 class="truncate text-sm font-black">Controle de ponto</h2></div>' +
        '<span class="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10">' + iconeMenuLateralSvg('menu-usuario') + '</span>' +
      '</div>' +
      '<div class="p-3">' + corpo +
        '<button id="abrir-resumo-ponto-mobile" type="button" class="mt-2 w-full border-t border-slate-200/30 pt-2.5 text-left text-[11px] font-black text-cyan-700">Ver controle de ponto</button>' +
      '</div>' +
    '</section>';
  }

  function meusPerfisCardHtml() {
    var perfis = state.resumoPerfis || [];
    var cardId = 'meusPerfis';
    var totalReceitas = perfis.reduce(function (total, perfil) { return total + Number(perfil.receitas || 0); }, 0);
    var totalDespesas = perfis.reduce(function (total, perfil) { return total + Number(perfil.despesas || 0); }, 0);
    var consolidado = totalReceitas - totalDespesas;
    var escuro = !!state.darkMode;
    var fundo = escuro ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
    var fundoLinha = escuro ? 'bg-slate-800/55' : 'bg-white';
    var textoSecundario = escuro ? 'text-slate-400' : 'text-slate-500';
    var expandido = !!state.meusPerfisExpandido;
    var destaqueId = state.resumoPerfilDestaqueId || (state.empresa && state.empresa.id) || '';
    var perfilDestaque = perfis.find(function (perfil) { return perfil.id === destaqueId; }) || null;
    var receitasResumo = perfilDestaque ? Number(perfilDestaque.receitas || 0) : totalReceitas;
    var despesasResumo = perfilDestaque ? Number(perfilDestaque.despesas || 0) : totalDespesas;
    var resultadoResumo = perfilDestaque ? Number(perfilDestaque.resultado || 0) : consolidado;
    var valorPerfilHtml = function (valor, perfilId) {
      var revelarIndividual = !!(perfilId && state.resumoPerfilExibidoId === perfilId);
      return valoresCardVisiveis(cardId) || revelarIndividual
        ? dinheiro(valor)
        : 'R$ &bull;&bull;&bull;&bull;&bull;&bull;';
    };

    var corpo = state.resumoPerfisCarregando
      ? '<p class="py-5 text-center text-xs font-semibold ' + textoSecundario + '">Atualizando perfis...</p>'
      : perfis.length
        ? '<div id="meus-perfis-lista" class="grid ' + (expandido ? 'max-h-[52dvh]' : 'max-h-[190px]') + ' gap-2 overflow-y-auto overscroll-contain p-0.5">' + perfis.map(function (perfil) {
            var atual = state.empresa && perfil.id === state.empresa.id;
            var destacado = perfil.id === destaqueId;
            var positivo = Number(perfil.resultado || 0) >= 0;
            return '<button type="button" data-meu-perfil-id="' + escapeHtml(perfil.id) + '" aria-pressed="' + (destacado ? 'true' : 'false') + '" class="w-full rounded-xl border-2 px-3 py-2 text-left shadow-sm transition active:scale-[0.98] ' + fundoLinha + ' ' + (destacado ? 'border-cyan-500 shadow-[inset_0_0_0_1px_rgba(6,182,212,.18)]' : (escuro ? 'border-slate-700' : 'border-slate-200')) + '">' +
              '<div class="flex items-center justify-between gap-3"><div class="min-w-0 flex-1"><p class="truncate text-xs font-black">' + escapeHtml(perfil.nome) + '</p><p class="mt-0.5 truncate text-[9px] font-semibold ' + textoSecundario + '">' + (atual ? 'Perfil atual · ' : '') + escapeHtml(rotuloTipoPerfil(perfil.tipoPerfil)) + '</p></div>' +
              '<strong class="shrink-0 text-xs font-black ' + (positivo ? 'text-emerald-500' : 'text-red-500') + '">' + valorPerfilHtml(perfil.resultado, perfil.id) + '</strong></div>' +
              '<div class="mt-1.5 grid grid-cols-2 gap-2 text-[9px] font-bold ' + textoSecundario + '"><span class="truncate">Receitas <b class="text-emerald-500">' + valorPerfilHtml(perfil.receitas, perfil.id) + '</b></span><span class="truncate text-right">Despesas <b class="text-red-500">' + valorPerfilHtml(perfil.despesas, perfil.id) + '</b></span></div>' +
            '</button>';
          }).join('') + '</div>'
        : '<p class="py-5 text-center text-xs font-semibold ' + textoSecundario + '">Nenhum perfil vinculado.</p>';

    return '<section class="flex flex-col overflow-hidden rounded-2xl border-2 shadow-lg ' + fundo + '" style="border-color:#003E73;' + (expandido ? 'min-height:min(68dvh,560px);' : '') + '">' +
      '<div class="flex items-center justify-between gap-3 px-4 py-3 text-white" style="background:#003E73"><div class="min-w-0"><p class="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-100/75">' + escapeHtml(nomeMesCompleto(state.mes)) + '</p><h2 class="truncate text-sm font-black">Meus perfis</h2></div><div class="flex items-center gap-2"><span class="rounded-full bg-white/15 px-2 py-1 text-[9px] font-black">' + perfis.length + ' perfil' + (perfis.length === 1 ? '' : 's') + '</span>' + botaoVisibilidadeValoresHtml(cardId, true) + '</div></div>' +
      '<div class="min-h-0 flex-1 p-3">' + (perfilDestaque ? '<p class="mb-1.5 truncate px-1 text-[9px] font-black uppercase tracking-wide ' + textoSecundario + '">Valores de ' + escapeHtml(perfilDestaque.nome) + '</p>' : '') + '<div class="mb-2 grid grid-cols-3 gap-1.5 rounded-xl ' + (escuro ? 'bg-slate-800/55' : 'bg-slate-50') + ' p-1.5"><div class="rounded-lg bg-[#003E73] px-2 py-2 text-white"><span class="block truncate text-[8px] font-black uppercase text-cyan-100/75">' + (perfilDestaque ? 'Resultado' : 'Consolidado') + '</span><strong class="mt-0.5 block truncate text-[11px] font-black">' + valorPerfilHtml(resultadoResumo, perfilDestaque && perfilDestaque.id) + '</strong></div><div class="rounded-lg px-2 py-2 ' + (escuro ? 'bg-slate-900/60' : 'bg-white') + '"><span class="block truncate text-[8px] font-black uppercase ' + textoSecundario + '">Receitas</span><strong class="mt-0.5 block truncate text-[11px] font-black text-emerald-500">' + valorPerfilHtml(receitasResumo, perfilDestaque && perfilDestaque.id) + '</strong></div><div class="rounded-lg px-2 py-2 text-right ' + (escuro ? 'bg-slate-900/60' : 'bg-white') + '"><span class="block truncate text-[8px] font-black uppercase ' + textoSecundario + '">Despesas</span><strong class="mt-0.5 block truncate text-[11px] font-black text-red-500">' + valorPerfilHtml(despesasResumo, perfilDestaque && perfilDestaque.id) + '</strong></div></div>' + corpo + '</div>' +
      '<button id="toggle-esticar-meus-perfis" type="button" class="flex h-8 w-full items-center justify-center gap-2 border-t ' + (escuro ? 'border-slate-700 bg-slate-800/60 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-500') + ' text-[9px] font-black uppercase tracking-[0.14em] transition active:brightness-95"><span>' + (expandido ? 'Recolher' : 'Esticar') + '</span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="' + (expandido ? 'm7 14 5-5 5 5' : 'm7 10 5 5 5-5') + '" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '</section>';
  }

  function rolarCardMeusPerfisAoTopo() {
    window.requestAnimationFrame(function () {
      var scroll = document.getElementById('mobile-main-scroll');
      var card = document.querySelector('[data-dashboard-card="meusPerfis"]');
      if (!scroll || !card) return;
      var scrollRect = scroll.getBoundingClientRect();
      var cardRect = card.getBoundingClientRect();
      scroll.scrollTo({
        top: Math.max(0, scroll.scrollTop + cardRect.top - scrollRect.top),
        behavior: 'smooth',
      });
    });
  }

  function centralizarPerfilDestacadoNoCard(id) {
    window.requestAnimationFrame(function () {
      var lista = document.getElementById('meus-perfis-lista');
      if (!lista) return;
      var selecionado = null;
      Array.prototype.some.call(lista.querySelectorAll('[data-meu-perfil-id]'), function (item) {
        if (item.getAttribute('data-meu-perfil-id') !== id) return false;
        selecionado = item;
        return true;
      });
      if (!selecionado) return;
      var listaRect = lista.getBoundingClientRect();
      var itemRect = selecionado.getBoundingClientRect();
      lista.scrollTo({
        top: Math.max(0, lista.scrollTop + itemRect.top - listaRect.top - (lista.clientHeight - itemRect.height) / 2),
        behavior: 'smooth',
      });
    });
  }

  async function abrirRelatorioPontoMobile(userId, nome) {
    if (!podeGerenciarPontoMobile()) return;
    state.pontoRelatorioUsuarioId = userId || '';
    state.pontoRelatorioNome = nome || '';
    state.pontoRelatorioRegistros = [];
    state.pontoRelatorioCarregando = !!userId;
    state.modalMenu = 'pontoRelatorio';
    render();
    if (!userId) return;

    var resposta = await db.from('ponto_registros')
      .select('id, tipo, registrado_em')
      .eq('empresa_id', state.empresa.id)
      .eq('user_id', userId)
      .eq('dia', dataHoraPontoMobile().data)
      .order('registrado_em', { ascending: true });
    state.pontoRelatorioRegistros = resposta.error ? [] : (resposta.data || []);
    state.pontoRelatorioCarregando = false;
    if (state.modalMenu === 'pontoRelatorio') render();
  }

  function pontoRelatorioMobileHtml() {
    if (!state.pontoRelatorioUsuarioId) {
      return '<div class="grid gap-2">' +
        '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900">Resumo de ocorrencias do dia. Toque em um funcionario para ver os registros.</p>' +
        (state.pontoResumo.length ? state.pontoResumo.map(function (item) {
          return '<button type="button" data-ponto-relatorio-user="' + escapeHtml(item.userId) + '" data-ponto-relatorio-nome="' + escapeHtml(item.nome) + '" class="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-left"><span class="truncate text-xs font-bold text-slate-800">' + escapeHtml(item.nome) + '</span><span class="text-[10px] font-black uppercase text-cyan-700">' + escapeHtml(item.status) + '</span></button>';
        }).join('') : '<p class="py-5 text-center text-sm font-semibold text-emerald-600">Equipe em dia.</p>') +
      '</div>';
    }

    if (state.pontoRelatorioCarregando) return '<p class="py-6 text-center text-sm font-semibold text-slate-500">Carregando registros...</p>';
    var rotulos = {
      entrada: 'Entrada',
      saida_refeicao: 'Saida para almoco',
      retorno_refeicao: 'Retorno do almoco',
      saida: 'Saida',
    };
    return '<div class="grid gap-2">' +
      '<div class="rounded-xl bg-slate-50 px-3 py-2"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Funcionario</p><p class="mt-0.5 text-sm font-black text-slate-900">' + escapeHtml(state.pontoRelatorioNome) + '</p></div>' +
      (state.pontoRelatorioRegistros.length ? state.pontoRelatorioRegistros.map(function (registro) {
        var horario = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(registro.registrado_em));
        return '<div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5"><span class="text-xs font-bold text-slate-700">' + escapeHtml(rotulos[registro.tipo] || registro.tipo) + '</span><strong class="text-sm font-black text-cyan-700">' + escapeHtml(horario) + '</strong></div>';
      }).join('') : '<p class="py-5 text-center text-sm font-semibold text-slate-500">Nenhum registro realizado hoje.</p>') +
    '</div>';
  }

  function homeHtml(atual, anterior) {
    var banner = avisoConfirmarHtml();
    var cards = {
      saldo: saldoTopoHtml(atual, anterior),
      meusPerfis: meusPerfisCardHtml(),
      insightsAva: insightsAvaHtml(atual),
      caixinha: caixinhaCardHtml(atual),
      ia: perguntaIaHtml(),
      agenda: agendaResumoHtml(),
      categorias: graficoCategoriaHtml(atual),
      tipos: graficoTipoDespesaHtml(atual),
      ultimasDespesas: ultimasDespesasHtml(atual.lancamentos),
	      ultimasReceitas: ultimasReceitasHtml(entradasReceitaVisiveis(atual)),
      totais: totaisHtml(atual),
      controlePonto: controlePontoCardHtml(),
      evolucaoDespesas: evolucaoHtml('despesas'),
      evolucaoReceitas: evolucaoHtml('receitas'),
    };

    var visiveis = cardsDashboardVisiveis();
    if (!visiveis.length) {
      return (
        banner +
        '<section class="rounded-2xl border border-cyan-100 bg-white p-4 text-center shadow-sm">' +
          '<p class="text-sm font-black text-slate-900">Nenhum card visivel</p>' +
          '<p class="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Abra o menu e use Mostrar/ocultar cards para reexibir os cards.</p>' +
        '</section>'
      );
    }

    return banner +
      visiveis
      .map(function (id) {
        if (!cards[id]) return '';
        var menuDisponivel = id !== 'ia';
        return '<div data-dashboard-card="' + escapeHtml(id) + '" class="relative pb-2 transition-[transform,opacity,filter] duration-200 ease-out">' +
          cards[id] +
          (menuDisponivel ? '<button type="button" data-dashboard-opcoes="' + escapeHtml(id) + '" class="absolute bottom-1 right-12 z-40 flex h-7 w-8 items-center justify-center rounded-full bg-transparent text-[13px] font-black leading-none text-slate-600 active:bg-slate-100" aria-label="Opcoes do bloco">...</button>' : '') +
          (id === 'ia' ? '' : '<button type="button" data-dashboard-handle="' + escapeHtml(id) + '" class="absolute bottom-1 right-3 z-40 flex h-7 w-8 select-none touch-none items-center justify-center rounded-full bg-transparent text-[11px] font-black leading-none text-slate-600" aria-label="Mover card">&vellip;&vellip;</button>') +
        '</div>';
      })
      .join('');
  }

  function menuOpcoesCardDashboardHtml() {
    var pos = state.dashboardOpcoesPos || {};
    var resetCaixinha = state.dashboardOpcoesId === 'caixinha';
    var largura = resetCaixinha ? 188 : 160;
    var arrowLeft = Number(pos.arrowLeft);
    var thoughtCenter = 0;
    var margem = 12;
    var left = Number(pos.left);
    var bottom = Number(pos.bottom);
    if (!Number.isFinite(left)) left = Math.max(margem, Math.min(window.innerWidth - largura - margem, window.innerWidth - largura - 24));
    if (!Number.isFinite(bottom)) bottom = 120;
    if (!Number.isFinite(arrowLeft)) arrowLeft = largura / 2 - 6;
    thoughtCenter = arrowLeft + 6;
    left = Math.max(margem, Math.min(window.innerWidth - largura - margem, left));
    bottom = Math.max(margem, bottom);
    return (
      '<div data-dashboard-menu-card="' + escapeHtml(state.dashboardOpcoesId) + '" class="fixed overflow-visible rounded-[24px] border border-cyan-100 bg-white p-1 text-slate-800 shadow-2xl shadow-slate-950/25" style="z-index:9010;left:' + left + 'px;bottom:' + bottom + 'px;">' +
        '<span aria-hidden="true" class="pointer-events-none absolute rounded-full border border-cyan-100 bg-white shadow-md shadow-slate-950/15" style="left:' + (thoughtCenter - 7) + 'px;bottom:-15px;width:14px;height:14px;"></span>' +
        '<span aria-hidden="true" class="pointer-events-none absolute rounded-full border border-cyan-100 bg-white shadow-sm shadow-slate-950/10" style="left:' + (thoughtCenter - 3) + 'px;bottom:-26px;width:8px;height:8px;"></span>' +
        '<div class="relative z-10 flex flex-col gap-1">' +
          '<button type="button" data-dashboard-remover="' + escapeHtml(state.dashboardOpcoesId) + '" class="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-cyan-600 px-4 text-[11px] font-black text-white shadow-lg shadow-cyan-900/25 active:bg-cyan-700">- Ocultar card</button>' +
          (resetCaixinha ? '<button type="button" data-dashboard-reset-caixinha class="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-rose-600 px-4 text-[11px] font-black text-white shadow-lg shadow-rose-900/20 active:bg-rose-700">- Resetar total</button>' : '') +
        '</div>' +
      '</div>'
    );
  }

  function insightsAvaHtml(atual) {
    if (recursoExclusivoAssinanteMobile()) {
      return '<section class="w-full overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">' +
        '<div class="flex items-center justify-between gap-3 bg-[#003E73] px-4 py-3 text-white"><h2 class="text-sm font-black tracking-wide">Insights da Ava</h2><span class="rounded-full bg-white/15 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-cyan-100">Assinantes</span></div>' +
        '<div class="p-4"><div class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold leading-relaxed text-sky-950">Os Insights da Ava analisam receitas, despesas e sua reserva. Este recurso é exclusivo para assinantes.</div><button id="abrir-insights-ava" type="button" class="mt-3 h-10 w-full rounded-xl bg-[#003E73] text-xs font-black uppercase tracking-wide text-white">Saiba mais</button></div>' +
      '</section>';
    }
    var receitas = Number(atual.receitas || 0);
    var despesas = Number(atual.despesasTotais || atual.despesas || 0);
    var resultado = receitas - despesas;
    var caixinha = caixinhaResumo(atual);
    var porDespesa = {};

    (atual.lancamentos || []).forEach(function (item) {
      if (!item || item.status === 'cancelada') return;
      var nome = item.despesa || 'Despesa';
      porDespesa[nome] = (porDespesa[nome] || 0) + Number(item.valor || 0);
    });

    var maior = Object.keys(porDespesa).map(function (nome) {
      return { nome: nome, valor: porDespesa[nome] };
    }).sort(function (a, b) { return b.valor - a.valor; })[0];

    var insights = [];
    if (!receitas && !despesas) {
      insights.push({ tom: 'neutro', titulo: 'Comece pelo basico', texto: 'Registre receitas e despesas para a Ava enxergar padroes e sugerir proximos passos.' });
    } else if (resultado >= 0) {
      insights.push({ tom: 'bom', titulo: 'Resultado positivo', texto: 'Voce esta com ' + dinheiro(resultado) + ' de sobra em ' + nomeMesCompleto(atual.mes) + '. Avalie separar parte para a Caixinha.' });
    } else {
      insights.push({ tom: 'alerta', titulo: 'Atencao ao resultado', texto: 'As despesas superam as receitas em ' + dinheiro(Math.abs(resultado)) + '. Revise os maiores gastos primeiro.' });
    }

    if (maior && despesas > 0) {
      var percentual = (maior.valor / despesas) * 100;
      insights.push({
        tom: percentual >= 35 ? 'alerta' : 'neutro',
        titulo: 'Maior concentracao',
        texto: maior.nome + ' representa ' + percentual.toFixed(1) + '% das despesas do mes.',
      });
    }

    if (caixinha.saldo > 0) {
      insights.push({ tom: 'bom', titulo: 'Reserva em andamento', texto: 'Sua Caixinha ja soma ' + dinheiro(caixinha.saldo) + '. Aportes recorrentes ajudam a transformar sobra em patrimonio.' });
    } else if (resultado > 0) {
      insights.push({ tom: 'neutro', titulo: 'Proximo passo', texto: 'Como houve sobra no mes, este pode ser um bom momento para iniciar sua Caixinha.' });
    }

    var dk = state.darkMode;
    var cardBaseStyle = dk
      ? 'border-color:rgba(125,211,252,.22);background:linear-gradient(180deg,rgba(15,23,42,.98),rgba(2,6,23,.96));box-shadow:0 16px 36px rgba(2,6,23,.36);'
      : 'border-color:#C9E3EE;background:#FFFFFF;box-shadow:0 10px 24px rgba(15,23,42,.08);';
    var headerStyle = dk
      ? 'background:#071A2B;'
      : 'background:#FFFFFF;';
    var logoInsightsSrc = dk ? '/images/ava-logo-fundo-escuro.png' : '/images/ava-logo-fundo-claro.png';
    var tituloStyle = dk ? 'color:#F8FAFC;text-shadow:0 1px 8px rgba(0,0,0,.36);' : 'color:#0F172A;';
    var subtituloStyle = dk ? 'color:#CBEAF5;' : 'color:#475569;';
    var descricaoStyle = dk ? 'color:#CBD5E1;' : 'color:#64748B;';
    var botaoStyle = dk
      ? 'border-color:rgba(125,211,252,.45);background:rgba(15,23,42,.72);color:#E0F2FE;'
      : 'border-color:#0E7490;background:#FFFFFF;color:#0E7490;';

    var cards = insights.slice(0, 3).map(function (insight) {
      var visual = insight.tom === 'bom'
        ? {
            dot: '#14B8A6',
            border: dk ? 'rgba(45,212,191,.34)' : '#BFECE5',
            bg: dk ? 'rgba(20,184,166,.12)' : '#ECFDF8',
            title: dk ? '#99F6E4' : '#0F766E',
          }
        : (insight.tom === 'alerta'
          ? {
              dot: '#F43F5E',
              border: dk ? 'rgba(251,113,133,.36)' : '#FFE0E6',
              bg: dk ? 'rgba(244,63,94,.13)' : '#FFF1F4',
              title: dk ? '#FDA4AF' : '#BE123C',
            }
          : {
              dot: '#0EA5E9',
              border: dk ? 'rgba(56,189,248,.34)' : '#C8EAF8',
              bg: dk ? 'rgba(14,165,233,.12)' : '#F0F9FF',
              title: dk ? '#7DD3FC' : '#0369A1',
            });
      return '<div class="rounded-2xl border px-3 py-2.5" style="border-color:' + visual.border + ';background:' + visual.bg + ';">' +
        '<div class="flex items-center gap-2"><span class="h-2 w-2 shrink-0 rounded-full" style="background:' + visual.dot + ';"></span><strong class="min-w-0 truncate text-[11px] font-black uppercase tracking-wide" style="color:' + visual.title + ';">' + escapeHtml(insight.titulo) + '</strong></div>' +
        '<p class="mt-1.5 text-xs font-semibold leading-relaxed" style="' + descricaoStyle + '">' + escapeHtml(insight.texto) + '</p>' +
      '</div>';
    }).join('');

    return '<section class="w-full overflow-hidden rounded-2xl border shadow-sm" style="' + cardBaseStyle + '">' +
      '<div class="mb-3 flex items-center justify-between gap-3 px-3 py-3" style="' + headerStyle + '">' +
        '<span class="flex h-10 w-[92px] shrink-0 items-center justify-center rounded-full">' + avaLogoArquivoHtml(84, 40, logoInsightsSrc) + '</span>' +
        '<div class="min-w-0 flex-1 text-right"><h2 class="truncate text-sm font-black tracking-wide" style="' + tituloStyle + '">Insights da Ava</h2><p class="mt-0.5 truncate text-[11px] font-semibold" style="' + subtituloStyle + '">Atualiza ao mudar dados ou mes</p></div>' +
      '</div>' +
      '<div class="grid gap-2 px-4">' + cards + '</div>' +
      '<div class="px-4 pb-4"><button id="abrir-insights-ava" type="button" class="mt-3 h-10 w-full rounded-xl border px-3 text-xs font-black uppercase tracking-wide active:scale-[0.99]" style="' + botaoStyle + '">Conversar com a Ava</button></div>' +
    '</section>';
  }

  function saldoTopoHtml(atual, anterior) {
    var cardId = 'saldo';
    // Inicial = saldo do mes anterior. Final = Inicial + (receitas - despesas realizadas).
    // Previsto = Final - despesas futuras do mes.
    var inicial = anterior.saldo;
    var final = inicial + atual.saldo;
    var previsto = inicial + atual.saldoPrevisto;
    return (
      '<section class="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">' +
        '<div class="mb-3 flex items-center justify-between gap-3">' +
          '<h2 class="text-sm font-black tracking-wide text-white">Saldo do m&ecirc;s</h2>' +
          botaoVisibilidadeValoresHtml(cardId, true) +
        '</div>' +
        '<div class="grid grid-cols-3 gap-2 text-center">' +
          miniSaldoHtml('Inicial', inicial, 'text-slate-200', cardId) +
          miniSaldoHtml('Final', final, final >= 0 ? 'text-emerald-300' : 'text-red-300', cardId) +
          miniSaldoHtml('Previsto', previsto, previsto >= 0 ? 'text-cyan-300' : 'text-red-300', cardId) +
        '</div>' +
      '</section>'
    );
  }

  function caixinhaResumo(atual) {
    var saldo = 0;
    var saldoInicial = 0;
    var aportesMes = 0;
    var mesAtual = indiceMes(atual && atual.mes ? atual.mes : state.mes) + 1;
    var anoAtual = Number(state.ano);
    (state.caixinhaMovimentos || []).forEach(function (mov) {
      var valor = Number(mov.valor || 0);
      saldo += mov.tipo === 'resgate' ? -valor : valor;
      if (mov.tipo === 'saldo_inicial') saldoInicial = valor;
      var partes = String(mov.dataMovimento || '').split('-').map(Number);
      if (mov.tipo === 'aporte' && partes[0] === anoAtual && partes[1] === mesAtual) {
        aportesMes += valor;
      }
    });
    var ultimos = (state.caixinhaMovimentos || []).slice().sort(function (a, b) {
      return String(b.dataMovimento || '').localeCompare(String(a.dataMovimento || '')) ||
        String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));
    }).slice(0, 2);
    return { saldo: saldo, saldoInicial: saldoInicial, aportesMes: aportesMes, ultimos: ultimos };
  }

  function caixinhaCardHtml(atual) {
    var cardId = 'caixinha';
    var resumo = caixinhaResumo(atual);
    var escuro = state.darkMode;
    var saldoInicialInput = state.caixinhaSaldoInicialValor || (resumo.saldoInicial > 0 ? dinheiro(resumo.saldoInicial).replace('R$', '').trim() : '');
    var ultimosHtml = resumo.ultimos.length
      ? resumo.ultimos.map(function (mov) {
          return '<div class="flex items-center justify-between gap-2 rounded-xl ' + (escuro ? 'bg-slate-800/60' : 'bg-slate-50') + ' px-3 py-2">' +
            '<span class="min-w-0 truncate text-xs font-bold text-slate-700">' + escapeHtml(mov.descricao || 'Aporte na caixinha') + '</span>' +
            '<strong class="shrink-0 text-xs font-black text-emerald-600">' + valorFinanceiroCardHtml(mov.valor, cardId) + '</strong>' +
          '</div>';
        }).join('')
      : '<p class="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-500">Nenhum aporte registrado.</p>';

    return (
      '<section class="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">' +
        '<div class="flex items-center justify-between gap-3 bg-cyan-700 px-4 py-3 text-white">' +
          '<div class="min-w-0">' +
            '<h2 class="text-sm font-black tracking-wide text-white">Caixinha</h2>' +
            '<p class="mt-0.5 truncate text-[11px] font-semibold text-cyan-100">Reserva e investimentos do perfil</p>' +
          '</div>' +
          botaoVisibilidadeValoresHtml(cardId, true) +
        '</div>' +
        '<div class="p-4">' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<div class="rounded-2xl border border-slate-100 bg-slate-50 p-3">' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Saldo</p>' +
            '<strong class="mt-1 block truncate text-base font-black text-emerald-600">' + valorFinanceiroCardHtml(resumo.saldo, cardId) + '</strong>' +
          '</div>' +
          '<div class="rounded-2xl border border-slate-100 bg-slate-50 p-3">' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Aportes no mês</p>' +
            '<strong class="mt-1 block truncate text-base font-black text-slate-900">' + valorFinanceiroCardHtml(resumo.aportesMes, cardId) + '</strong>' +
          '</div>' +
        '</div>' +
        '<div class="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">' +
          '<div class="mb-2 flex items-center justify-between gap-2">' +
            '<span class="min-w-0"><span class="block text-[10px] font-black uppercase tracking-wide text-slate-500">Aporte inicial</span><span class="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">Valor que ja existia antes do AvantaLab</span></span>' +
            '<strong class="shrink-0 text-xs font-black text-emerald-600">' + valorFinanceiroCardHtml(resumo.saldoInicial, cardId) + '</strong>' +
          '</div>' +
          '<div class="grid grid-cols-[minmax(0,1fr)_104px] gap-2">' +
            '<input id="caixinha-saldo-inicial" inputmode="decimal" value="' + escapeHtml(saldoInicialInput) + '" placeholder="0,00" style="font-size:16px" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-base font-black text-slate-900 outline-none">' +
            '<button id="salvar-caixinha-saldo-inicial" type="button" class="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[11px] font-black uppercase tracking-wide text-slate-700 active:scale-[0.99]">' + (state.caixinhaSaldoInicialSalvando ? 'Salvando...' : (resumo.saldoInicial > 0 ? 'Atualizar' : 'Definir')) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="mt-3 grid grid-cols-[70px_minmax(0,1fr)] gap-2">' +
          '<input id="caixinha-dia" type="number" min="1" max="31" value="' + escapeHtml(state.caixinhaDia || '') + '" placeholder="Dia" style="font-size:16px" class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-900 outline-none">' +
          '<input id="caixinha-descricao" type="text" value="' + escapeHtml(state.caixinhaDescricao || '') + '" placeholder="Descrição" style="font-size:16px" class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-900 outline-none">' +
        '</div>' +
        '<input id="caixinha-valor" inputmode="decimal" value="' + escapeHtml(state.caixinhaValor || '') + '" placeholder="0,00" style="font-size:16px" class="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-base font-black text-slate-900 outline-none">' +
        '<button id="salvar-caixinha-aporte" type="button" class="mt-2 h-10 w-full rounded-xl bg-cyan-700 text-xs font-black uppercase tracking-wide text-white shadow-sm active:scale-[0.99]">' + (state.caixinhaSalvando ? 'Adicionando...' : 'Adicionar aporte') + '</button>' +
        '<div class="mt-3 space-y-2">' + ultimosHtml + '</div></div>' +
      '</section>'
    );
  }

  function miniSaldoHtml(rotulo, valor, cor, cardId) {
    return (
      '<div class="min-w-0">' +
        '<p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">' + rotulo + '</p>' +
        '<strong class="mt-1 block truncate text-sm font-black ' + cor + '">' + valorFinanceiroCardHtml(valor, cardId) + '</strong>' +
      '</div>'
    );
  }

  function valoresCardVisiveis(cardId) {
    return !!state.dashboardValoresVisiveis[cardId];
  }

  function valorFinanceiroCardHtml(valor, cardId) {
    return valoresCardVisiveis(cardId) ? dinheiro(valor) : 'R$ &bull;&bull;&bull;&bull;&bull;&bull;';
  }

  function iconeVisibilidadeValoresHtml(visivel) {
    return visivel
      ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="1.8"/></svg>'
      : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.4 3.1M6.2 6.3C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function botaoVisibilidadeValoresHtml(cardId, escuro) {
    var visivel = valoresCardVisiveis(cardId);
    return '<button id="toggle-valores-' + escapeHtml(cardId) + '" type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ' + (escuro ? 'bg-white/10 text-slate-200 active:bg-white/20' : 'bg-slate-100 text-slate-500 active:bg-slate-200') + '" aria-label="' + (visivel ? 'Ocultar valores' : 'Exibir valores') + '">' + iconeVisibilidadeValoresHtml(visivel) + '</button>';
  }

  function alternarVisibilidadeValoresCard(cardId) {
    state.dashboardValoresVisiveis[cardId] = !valoresCardVisiveis(cardId);
    render();
  }

  function perguntaIaHtml() {
    var dk = state.darkMode;
    var logoAvaSrc = dk ? '/images/ava-logo-fundo-escuro.png' : '/images/ava-logo-fundo-claro.png';
    var cardAvaStyle = state.darkMode
      ? 'background:#071A2B;border-color:#334155;'
      : 'background:#FFFFFF;border-color:#E2E8F0;';
    var textoAvaStyle = state.darkMode ? 'color:#F8FAFC;' : '';
    return (
      '<button id="chat-ia-card" type="button" class="flex w-full items-center gap-2 rounded-full border px-3 py-2 text-left shadow-sm active:scale-[0.99]" style="' + cardAvaStyle + '">' +
        '<span class="flex h-9 w-[88px] shrink-0 items-center justify-center">' + avaLogoArquivoHtml(82, 40, logoAvaSrc) + '</span>' +
        '<span class="min-w-0 flex-1 overflow-hidden text-sm font-semibold ' + (state.darkMode ? '' : 'text-slate-400') + '"><span class="inline-block max-w-full truncate align-middle" style="' + textoAvaStyle + '">Pergunte para a Ava...</span></span>' +
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

  function agendaReceitaHtml(item) {
    return (
      '<div class="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<p class="truncate text-sm font-black text-slate-900">' + escapeHtml(item.origem || 'Receita') + '</p>' +
            '<p class="mt-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-600">Receita prevista</p>' +
          '</div>' +
          '<strong class="shrink-0 text-sm font-black tabular-nums text-emerald-600">' + Number(item.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '</strong>' +
        '</div>' +
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
      '<div id="agenda-form-overlay" class="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/90 px-4 pt-4 backdrop-blur-sm" style="padding-bottom:calc(env(safe-area-inset-bottom) + 78px)">' +
        '<div class="w-full max-w-sm overflow-y-auto rounded-[26px] border border-white/70 bg-white shadow-2xl shadow-slate-950/30" style="max-height:calc(100dvh - env(safe-area-inset-bottom) - 102px)">' +
          '<div class="flex items-center justify-between gap-3 px-4 py-3 text-white" style="background-color:#003E73">' +
            '<div>' +
              '<p class="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">Novo item</p>' +
              '<h3 class="mt-0.5 text-lg font-black">' + String(state.agendaDiaSelecionado || '').padStart(2, '0') + ' de ' + escapeHtml(nomeMesCompleto(state.mes)) + '</h3>' +
            '</div>' +
            '<button id="cancelar-agenda-item-topo" type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white" aria-label="Fechar agenda">' + iconeFecharGeometricoMobile() + '</button>' +
          '</div>' +
          '<div class="grid gap-2 p-4">' +
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
    // Animação de transição ao trocar de mês por arraste (usada uma vez e limpa).
    var animAgenda = state.agendaAnimar ? (' agenda-anim-' + state.agendaAnimar) : '';
    state.agendaAnimar = null;
    var ano = Number(state.ano) || new Date().getFullYear();
    var mesIndice = indiceMes(state.mes);
    var totalDias = maxDias(state.mes, state.ano);
    var primeiroDiaSemana = new Date(ano, mesIndice, 1).getDay();
    var hoje = new Date();
    var diaSelecionado = state.agendaDiaSelecionado ? Math.min(Math.max(Number(state.agendaDiaSelecionado), 1), totalDias) : null;
    var ehMesAtual = mesIndice === hoje.getMonth() && ano === hoje.getFullYear();
    var semana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    var celulas = [];

    semana.forEach(function (dia, idx) {
      var corCab = idx === 0 ? 'text-rose-500' : (idx === 6 ? 'text-sky-600' : 'text-slate-400');
      celulas.push('<div class="text-center text-[10px] font-black uppercase tracking-wide ' + corCab + '">' + dia + '</div>');
    });

    for (var vazio = 0; vazio < primeiroDiaSemana; vazio += 1) {
      celulas.push('<div class="min-h-0 rounded-2xl border border-transparent"></div>');
    }

    for (var dia = 1; dia <= totalDias; dia += 1) {
      var selecionado = dia === diaSelecionado;
      var hojeClasse = ehMesAtual && dia === hoje.getDate();
      var dataDia = new Date(ano, mesIndice, dia);
      var dsem = dataDia.getDay(); // 0 = domingo, 6 = sábado
      var estilo, textoNumero;
      if (selecionado) { estilo = 'border-cyan-500 bg-cyan-50 shadow-md shadow-cyan-900/10'; textoNumero = 'text-cyan-900'; }
      else if (dsem === 0) { estilo = 'border-rose-100 bg-rose-50 shadow-sm'; textoNumero = 'text-rose-600'; }
      else if (dsem === 6) { estilo = 'border-sky-100 bg-sky-50 shadow-sm'; textoNumero = 'text-sky-700'; }
      else { estilo = 'border-slate-200 bg-white shadow-sm'; textoNumero = 'text-slate-900'; }
      var temLembreteDia = itensAgendaDoDia(state.ano, state.mes, dia).length > 0;
      var temDespesaFuturaDia = despesasFuturasDoDia(state.ano, state.mes, dia).length > 0;
      var temReceitaPrevistaDia = receitasPrevistasDoDia(state.ano, state.mes, dia).length > 0;
      var indicadoresDia = (temLembreteDia || temDespesaFuturaDia || temReceitaPrevistaDia)
        ? '<span class="absolute right-1 top-1 flex items-center gap-0.5">' +
            (temLembreteDia ? '<span class="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-sm"></span>' : '') +
            (temDespesaFuturaDia ? '<span class="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-sm"></span>' : '') +
            (temReceitaPrevistaDia ? '<span class="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm"></span>' : '') +
          '</span>'
        : '';

      celulas.push(
        '<button type="button" data-agenda-dia="' + dia + '" class="relative flex min-h-0 items-center justify-center overflow-hidden rounded-xl border p-0.5 transition active:scale-[0.98] ' + estilo + '">' +
          '<span class="block text-base font-black leading-none ' + textoNumero + '">' + String(dia).padStart(2, '0') + '</span>' +
          indicadoresDia +
          (hojeClasse ? '<span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-slate-950 px-1 text-[6px] font-black uppercase leading-[1.4] text-white">Hoje</span>' : '') +
        '</button>'
      );
    }

    // Número real de linhas do mês (4, 5 ou 6) — a grade e o painel se ajustam a ele.
    var numLinhas = Math.ceil((primeiroDiaSemana + totalDias) / 7);
    while (celulas.length < 7 + numLinhas * 7) {
      celulas.push('<div class="min-h-0 rounded-2xl border border-transparent"></div>');
    }

    var itensDia = diaSelecionado ? itensAgendaDoDia(state.ano, state.mes, diaSelecionado) : [];
    var despesasDia = diaSelecionado ? despesasFuturasDoDia(state.ano, state.mes, diaSelecionado) : [];
    var receitasDia = diaSelecionado ? receitasPrevistasDoDia(state.ano, state.mes, diaSelecionado) : [];
    var painelDia = '';
    var formularioAgenda = state.agendaFormAberto ? formularioAgendaHtml() : '';
    // Grade sempre com altura natural (shrink-0); linhas com altura fixa.
    // Sem dia selecionado, as células ficam só um pouco maiores (não esticam
    // para preencher o card). Com dia selecionado, ficam compactas.
    var classeGrade = 'grid min-h-0 shrink-0 grid-cols-7 gap-1';
    var estiloGrade = 'style="grid-template-rows:auto repeat(' + numLinhas + ', ' + (diaSelecionado ? '40px' : '54px') + ');"';

    if (diaSelecionado) {
      painelDia =
        '<div class="mt-3 flex min-h-0 flex-1 flex-col rounded-[24px] border-2 border-cyan-200 bg-cyan-50/85 p-4 shadow-xl shadow-cyan-950/10">' +
          '<div class="sticky top-0 z-10 -mx-1 flex shrink-0 items-center justify-between gap-3 border-b border-cyan-200/70 bg-cyan-50/95 px-1 pb-2 backdrop-blur">' +
            '<h3 class="min-w-0 flex-1 truncate text-sm font-black text-slate-950">Dia selecionado: ' + String(diaSelecionado).padStart(2, '0') + ' de ' + escapeHtml(nomeMesCompleto(state.mes)) + '</h3>' +
            '<button id="fechar-agenda-dia" type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600" aria-label="Fechar dia">' + iconeFecharGeometricoMobile() + '</button>' +
          '</div>' +
          '<div data-agenda-scroll="true" class="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5" style="-webkit-overflow-scrolling:touch;">' +
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
            (receitasDia.length
              ? '<div class="mt-4">' +
                  '<h4 class="mb-2 text-xs font-black uppercase tracking-wide text-emerald-700">Receitas previstas para o dia:</h4>' +
                  '<div class="grid gap-2">' + receitasDia.map(agendaReceitaHtml).join('') + '</div>' +
                '</div>'
              : '') +
          '</div>' +
        '</div>';
    }

    return (
      '<div class="flex flex-col overflow-hidden" style="height:100dvh;overscroll-behavior:none;">' +
        '<div class="flex shrink-0 items-center px-3 pb-3 text-white shadow-lg" style="padding-top:calc(env(safe-area-inset-top) + 10px);background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);">' +
          '<div class="flex h-10 flex-1 items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-1 shadow-sm backdrop-blur">' +
            '<button id="agenda-mes-prev" type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xl font-black leading-none text-white active:bg-white/10" aria-label="M&ecirc;s anterior">&lsaquo;</button>' +
            '<h2 class="min-w-0 flex-1 truncate text-center text-sm font-black tracking-wide text-white">' + escapeHtml(nomeMesCompleto(state.mes)) + ' ' + escapeHtml(state.ano) + '</h2>' +
            '<button id="agenda-mes-prox" type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xl font-black leading-none text-white active:bg-white/10" aria-label="Pr&oacute;ximo m&ecirc;s">&rsaquo;</button>' +
          '</div>' +
        '</div>' +
        '<div class="min-h-0 flex-1 px-2 pt-2" style="padding-bottom:calc(env(safe-area-inset-bottom) + 76px);">' +
          '<section id="agenda-mobile-screen" class="relative flex h-full overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-3 shadow-sm" style="touch-action:pan-y;">' +
            '<div class="flex min-h-0 w-full flex-col' + animAgenda + '">' +
              '<h2 class="shrink-0 pb-2 text-center text-base font-black tracking-[0.22em] text-slate-700">AGENDA</h2>' +
              '<div class="' + classeGrade + '" ' + estiloGrade + '>' + celulas.join('') + '</div>' +
              painelDia +
            '</div>' +
            formularioAgenda +
          '</section>' +
        '</div>' +
      '</div>'
    );
  }

  function categoriasDoMes(atual) {
    var categoriasMap = {};
    lancamentosRealizadosDoMes(atual).forEach(function (lancamento) {
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
    lancamentosRealizadosDoMes(atual).forEach(function (lancamento) {
      var tipo = lancamento.despesa || 'Sem tipo';
      tiposMap[tipo] = (tiposMap[tipo] || 0) + lancamento.valor;
    });

    return Object.keys(tiposMap)
      .map(function (tipo) { return { categoria: tipo, valor: tiposMap[tipo] }; })
      .sort(function (a, b) { return b.valor - a.valor; });
  }

  function lancamentosRealizadosDoMes(atual) {
    var mesIndice = indiceMes(state.mes);
    return (atual.lancamentos || []).filter(function (lancamento) {
      return !ehDespesaFutura(mesIndice, lancamento.dia);
    });
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
      detalharTipos: true,
    });
  }

  function graficoPizzaHtml(configuracao) {
    var cardId = configuracao.toggleId === 'toggle-categorias' ? 'categorias' : 'tipos';
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
        '<div class="mb-3 flex items-center justify-between gap-2"><h2 class="min-w-0 flex-1 text-sm font-black">' + escapeHtml(configuracao.titulo) + '</h2><span class="text-xs font-bold text-slate-400">' + valorFinanceiroCardHtml(total, cardId) + '</span>' + botaoVisibilidadeValoresHtml(cardId, false) + '</div>' +
        '<div class="grid grid-cols-[136px_1fr] items-center gap-3">' +
          '<div class="relative h-32 w-32 rounded-full" style="background:' + fundo + '">' +
            '<div class="absolute left-1/2 top-1/2 flex h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white px-1 text-center shadow-inner">' +
              '<span class="text-[9px] font-bold leading-none text-slate-400">Total</span><strong class="mt-1 block max-w-[78px] truncate leading-none ' + classeValorCentral + ' font-black text-slate-900">' + valorFinanceiroCardHtml(total, cardId) + '</strong>' +
            '</div>' +
          '</div>' +
          '<div class="grid gap-2">' +
            (categorias.length ? categoriasVisiveis.map(function (item, index) {
              var tag = configuracao.detalharTipos ? 'button' : 'div';
              var atributoDetalhe = configuracao.detalharTipos ? ' type="button" data-detalhar-tipo-despesa="' + escapeHtml(item.categoria) + '"' : '';
              return '<' + tag + atributoDetalhe + ' class="flex min-w-0 w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left text-xs transition active:bg-cyan-50">' +
                '<span class="min-w-0 truncate font-bold text-slate-600"><i class="mr-2 inline-block h-2.5 w-2.5 rounded-full" style="background:' + cores[index % cores.length] + '"></i>' + escapeHtml(item.categoria) + '</span>' +
                '<span class="flex shrink-0 items-center gap-1"><strong class="text-slate-900">' + valorFinanceiroCardHtml(item.valor, cardId) + '</strong>' + (configuracao.detalharTipos ? '<span class="text-base leading-none text-cyan-700">&rsaquo;</span>' : '') + '</span>' +
              '</' + tag + '>';
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

  function recorteHeaderLancamentosHtml(tipo) {
    var fundoCard = state.darkMode ? '#0F172A' : '#FFFFFF';
    var corDetalhe = tipo === 'despesa' ? '#FB7185' : '#34D399';
    return '<svg class="pointer-events-none absolute inset-x-0 bottom-[-0.5px] h-4 w-full" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true" style="display:block;">' +
      '<path d="M0 16H70C78 16 80 3 87 3H100V16Z" fill="' + fundoCard + '"/>' +
      '<path d="M70 15.4C78 15.4 80 2.4 87 2.4H100" fill="none" stroke="' + corDetalhe + '" stroke-width="1.2" vector-effect="non-scaling-stroke"/>' +
    '</svg>';
  }

  function ultimasDespesasHtml(lancamentos) {
    var todos = lancamentos.slice().sort(function (a, b) { return b.dia - a.dia; });
    var pesquisando = state.ultimasDespesasBuscaAberta;
    var itens = pesquisando ? todos : (state.ultimasDespesasExpandido ? todos : todos.slice(0, 3));

    return (
      '<section class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70" style="background:' + (state.darkMode ? '#0F172A' : '#FFFFFF') + ';">' +
        '<div class="relative flex items-center justify-between gap-3 overflow-hidden px-4 py-3.5 text-white" style="background:linear-gradient(135deg,#A63D52 0%,#D65F6D 100%)"><div class="relative z-10 flex min-w-0 items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" stroke-linejoin="round"/><path d="M9 8h6M9 12h6" stroke-linecap="round"/></svg></span><div class="min-w-0"><h2 class="truncate text-sm font-black">Despesas do mês</h2><p class="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-white/65">Lançamentos do período</p></div></div><div class="relative z-10 flex -translate-y-1 items-center gap-2">' + (state.ultimasDespesasExpandido && todos.length > 3 ? '<button id="toggle-ultimas-despesas" type="button" class="flex h-8 items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 text-xs font-bold text-white shadow-sm backdrop-blur">Recolher</button>' : '') + '<button id="buscar-ultimas-despesas" type="button" class="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-black text-white shadow-sm backdrop-blur active:bg-white/20" aria-label="' + (pesquisando ? 'Fechar busca' : 'Buscar despesas') + '">' + iconeBuscaUltimas(pesquisando) + '</button></div>' + recorteHeaderLancamentosHtml('despesa') + '</div>' +
        (state.ultimasDespesasBuscaAberta ? '<div class="px-4 pt-3"><div class="flex h-10 items-center gap-2 rounded-xl border border-red-100 bg-red-50/60 px-3"><input id="busca-ultimas-despesas" type="search" autocomplete="off" enterkeyhint="search" value="' + escapeHtml(state.ultimasDespesasBusca) + '" placeholder="Buscar descricao ou valor" style="font-size:16px" class="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none" /><button id="limpar-ultimas-despesas" type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-red-600 shadow-sm" aria-label="Limpar busca">&times;</button></div></div>' : '') +
        '<div class="grid gap-1 p-4" id="ultimas-despesas-lista">' +
          (itens.length ? itens.map(function (item) {
            var valor = dinheiro(item.valor);
            var selo = seloTipoHtml(item);
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
	    var todos = entradas.slice().sort(function (a, b) {
	      if (a.totalMensal) return -1;
	      if (b.totalMensal) return 1;
	      return b.dia - a.dia;
	    });
    var pesquisando = state.ultimasReceitasBuscaAberta;
    var itens = pesquisando ? todos : (state.ultimasReceitasExpandido ? todos : todos.slice(0, 3));

    return (
      '<section class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70" style="background:' + (state.darkMode ? '#0F172A' : '#FFFFFF') + ';">' +
        '<div class="relative flex items-center justify-between gap-3 overflow-hidden px-4 py-3.5 text-white" style="background:linear-gradient(135deg,#14786F 0%,#2A9D8F 100%)"><div class="relative z-10 flex min-w-0 items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 16 10 10l4 4 6-7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7h5v5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div class="min-w-0"><h2 class="truncate text-sm font-black">Receitas do mês</h2><p class="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-white/65">Lançamentos do período</p></div></div><div class="relative z-10 flex -translate-y-1 items-center gap-2">' + (state.ultimasReceitasExpandido && todos.length > 3 ? '<button id="toggle-ultimas-receitas" type="button" class="flex h-8 items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 text-xs font-bold text-white shadow-sm backdrop-blur">Recolher</button>' : '') + '<button id="buscar-ultimas-receitas" type="button" class="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-black text-white shadow-sm backdrop-blur active:bg-white/20" aria-label="' + (pesquisando ? 'Fechar busca' : 'Buscar receitas') + '">' + iconeBuscaUltimas(pesquisando) + '</button></div>' + recorteHeaderLancamentosHtml('receita') + '</div>' +
        (state.ultimasReceitasBuscaAberta ? '<div class="px-4 pt-3"><div class="flex h-10 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3"><input id="busca-ultimas-receitas" type="search" autocomplete="off" enterkeyhint="search" value="' + escapeHtml(state.ultimasReceitasBusca) + '" placeholder="Buscar descricao ou valor" style="font-size:16px" class="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none" /><button id="limpar-ultimas-receitas" type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-emerald-600 shadow-sm" aria-label="Limpar busca">&times;</button></div></div>' : '') +
        '<div class="grid gap-1 p-4" id="ultimas-receitas-lista">' +
	          (itens.length ? itens.map(function (item) {
	            var valor = dinheiro(item.valor);
	            var totalMensal = item.totalMensal === true;
	            var receitaSincronizada = ehReceitaSincronizada(item);
	            var buscaItem = textoBusca([item.origem, item.descricao, totalMensal ? 'total mensal receita total' : '', valor, item.valor].join(' '));
	            var tag = totalMensal || receitaSincronizada ? 'div' : 'button';
	            var acao = totalMensal || receitaSincronizada ? '' : ' type="button" data-tipo-lancamento="receita" data-lancamento-id="' + escapeHtml(item.id) + '"';
	            var selo = totalMensal
	              ? ' <span class="ml-1 inline-block rounded-full bg-cyan-100 px-1.5 align-middle text-[10px] font-black text-cyan-700">Total mensal</span>'
	              : (receitaSincronizada
	                ? ' <span class="ml-1 inline-block rounded-full bg-slate-100 px-1.5 align-middle text-[10px] font-black text-slate-500">Sincronizada</span>'
	                : seloTipoHtml(item));
	            var detalhe = totalMensal ? 'Total do mes' : 'Dia ' + item.dia;
	            return '<' + tag + acao + ' data-busca-ultimas-receitas="' + escapeHtml(buscaItem) + '"' + (receitaSincronizada ? ' aria-disabled="true"' : '') + ' class="flex w-full items-center justify-between gap-3 border-b border-slate-100 py-2 text-left last:border-b-0' + (receitaSincronizada ? ' cursor-default opacity-80' : '') + '">' +
	              '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.origem) + selo + '</p><p class="truncate text-xs text-slate-500">' + escapeHtml(detalhe) + '</p></div>' +
	              '<strong class="shrink-0 text-sm font-black text-emerald-600">' + valor + '</strong>' +
	            '</' + tag + '>';
	          }).join('') + '<p id="ultimas-receitas-vazia" style="display:none" class="text-xs text-slate-500">Nenhuma receita encontrada.</p>' : '<p class="text-xs text-slate-500">Nenhuma receita neste mes.</p>') +
          (!pesquisando && !state.ultimasReceitasExpandido && todos.length > 3 ? '<button id="toggle-ultimas-receitas" type="button" class="pt-2 text-left text-xs font-black text-cyan-700">Expandir receitas</button>' : '') +
        '</div>' +
      '</section>'
    );
  }

  function totaisHtml(atual) {
    var cardId = 'totais';
    return (
      '<section class="rounded-2xl bg-white p-4 pb-12 shadow-sm">' +
        '<div class="mb-3 flex items-center justify-between gap-3"><h2 class="text-sm font-black">Vis&atilde;o geral do m&ecirc;s</h2>' + botaoVisibilidadeValoresHtml(cardId, false) + '</div>' +
        '<div class="grid grid-cols-3 gap-2">' +
          totalBoxHtml('Despesas', atual.despesas, 'text-red-600', 'ver-despesas-total', cardId) +
          totalBoxHtml('Receitas', atual.receitas, 'text-emerald-600', 'ver-receitas-total', cardId) +
          totalBoxHtml('Saldo', atual.saldo, atual.saldo >= 0 ? 'text-cyan-700' : 'text-red-600', '', cardId) +
        '</div>' +
      '</section>'
    );
  }

  function totalBoxHtml(titulo, valor, cor, id, cardId) {
    var tag = id ? 'button' : 'div';
    return '<' + tag + (id ? ' id="' + id + '" type="button"' : '') + ' class="min-w-0 rounded-2xl bg-slate-50 p-3 text-left shadow-sm"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">' + titulo + '</p><strong class="mt-1 block truncate text-xs font-black ' + cor + '">' + valorFinanceiroCardHtml(valor, cardId) + '</strong></' + tag + '>';
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
    var corForte = tipo === 'despesas' ? 'bg-red-600' : 'bg-emerald-600';
    var mesSelecionado = state.evolucaoSelecionadaMes[tipo] || state.mes;
    var itemSelecionado = lista.find(function (item) { return item.mes === mesSelecionado; }) || lista[lista.length - 1];
    mesSelecionado = itemSelecionado ? itemSelecionado.mes : mesSelecionado;
    var valorSelecionado = state.evolucaoSelecionada[tipo];
    if (valorSelecionado == null && itemSelecionado) valorSelecionado = itemSelecionado.valor;

    return (
      '<section class="rounded-2xl bg-white p-4 shadow-sm">' +
        '<div class="mb-3 flex items-center justify-between gap-3">' +
          '<h2 class="text-sm font-black">Evolucao das ' + (tipo === 'despesas' ? 'despesas' : 'receitas') + '</h2>' +
          '<span class="shrink-0 text-xs font-black ' + (tipo === 'despesas' ? 'text-red-600' : 'text-emerald-600') + '">' + (valorSelecionado != null ? dinheiro(valorSelecionado) : '') + '</span>' +
        '</div>' +
        '<div class="flex h-28 items-end gap-2">' +
          lista.map(function (item) {
            var altura = Math.max(8, Math.round((item.valor / max) * 100));
            var sel = item.mes === mesSelecionado;
            var corBarra = sel ? corForte : cor;
            var classeBtn = 'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-0.5 py-1 transition' + (sel ? (tipo === 'despesas' ? ' bg-red-50 ring-1 ring-red-200' : ' bg-emerald-50 ring-1 ring-emerald-200') : '');
            var classeLabel = 'text-[9px] font-bold ' + (sel ? (tipo === 'despesas' ? 'text-red-700' : 'text-emerald-700') : 'text-slate-400');
            return '<button type="button" data-evolucao-tipo="' + escapeHtml(tipo) + '" data-evolucao-mes="' + escapeHtml(item.mes) + '" data-evolucao-valor="' + escapeHtml(item.valor) + '" class="' + classeBtn + '"><div class="flex h-24 w-full items-end"><div class="w-full rounded-t-md ' + corBarra + '" style="height:' + altura + '%"></div></div><span class="' + classeLabel + '">' + item.mes.slice(0, 3) + '</span></button>';
          }).join('') +
        '</div>' +
      '</section>'
    );
  }

	  function itensListaDetalhadaHtml(atual) {
	    var tipo = state.visao;
	    var itens = tipo === 'receitas'
	      ? entradasReceitaVisiveis(atual).map(function (item) {
	          var totalMensal = item.totalMensal === true;
	          return {
	            id: item.id,
	            tipo: 'receita',
	            titulo: item.origem,
	            detalhe: totalMensal ? 'Total do mes' : 'Dia ' + item.dia,
	            valor: item.valor,
	            dia: totalMensal ? 999 : item.dia,
	            totalMensal: totalMensal,
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

	    itens = itens.sort(function (a, b) {
	      if (a.totalMensal) return -1;
	      if (b.totalMensal) return 1;
	      return b.dia - a.dia;
	    });

	    return itens.length ? itens.map(function (item) {
	      var buscaItem = String(item.titulo + ' ' + item.detalhe + ' ' + item.valor).toLowerCase();
	      var tag = item.totalMensal ? 'div' : 'button';
	      var acao = item.totalMensal ? '' : ' type="button" data-tipo-lancamento="' + escapeHtml(item.tipo) + '" data-lancamento-id="' + escapeHtml(item.id) + '"';
	      return '<' + tag + acao + ' data-busca-lancamento="' + escapeHtml(buscaItem) + '" class="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-1 py-3 text-left last:border-b-0">' +
	        '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.titulo) + '</p><p class="truncate text-xs text-slate-500">' + escapeHtml(item.detalhe) + '</p></div>' +
	        '<strong class="shrink-0 text-sm font-black ' + (tipo === 'receitas' ? 'text-emerald-600' : 'text-red-600') + '">' + dinheiro(item.valor) + '</strong>' +
	      '</' + tag + '>';
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
    var campoEscuro = !!state.darkMode;
    var corpoModal = campoEscuro ? 'bg-slate-900 text-slate-100' : 'bg-white';
    var abas = campoEscuro ? 'border border-slate-700 bg-slate-800/80' : 'bg-slate-100';
    var abaInativa = campoEscuro ? 'text-slate-300' : 'text-slate-500';
    var abaDespesaAtiva = campoEscuro ? 'border border-red-400/60 bg-red-600 text-white shadow-sm' : 'bg-red-600 text-white shadow-sm';
    var abaReceitaAtiva = campoEscuro ? 'border border-emerald-400/60 bg-emerald-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm';

    return (
      '<div id="modal-lancamento-overlay" class="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-slate-950/90 px-3 pt-4" style="padding-bottom:calc(env(safe-area-inset-bottom) + 78px)">' +
        '<section class="mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" style="max-height:calc(100dvh - env(safe-area-inset-bottom) - 102px)">' +
          '<div class="max-h-[inherit] overflow-y-auto overscroll-contain">' +
          (novaAberta
            ? '<div class="flex items-center gap-3 px-4 py-3 text-white" style="background-color:#003E73">' +
                '<button id="fechar-nova-despesa" type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-black text-white">&larr;</button>' +
                '<div class="min-w-0 flex-1">' +
                  '<p class="text-[10px] font-black uppercase tracking-wide text-cyan-100/75">Novo lan&ccedil;amento &rsaquo; Despesa</p>' +
                  '<h2 class="text-sm font-black">Cadastrar tipo de despesa</h2>' +
                '</div>' +
              '</div>' +
              '<div class="' + corpoModal + ' p-4">' +
              novaDespesaFormHtml() +
              '</div>'
            : '<div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 text-white" style="background-color:#003E73">' +
                '<h2 class="text-base font-black">Novo lan&ccedil;amento</h2>' +
                '<span class="justify-self-center rounded-full border border-white/25 bg-white/15 px-3 py-1 text-center text-base font-black leading-none tracking-wide text-white shadow-sm">' + escapeHtml(String(state.mes || '').toUpperCase()) + '</span>' +
                '<button id="fechar-lancamento" type="button" class="justify-self-end flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white" aria-label="Fechar lançamento">' + iconeFecharGeometricoMobile() + '</button>' +
              '</div>' +
              '<div class="' + corpoModal + ' p-4">' +
              '<div class="mb-3 grid grid-cols-2 gap-2 rounded-xl ' + abas + ' p-1">' +
                '<button id="tipo-despesa" type="button" class="h-9 rounded-lg text-sm font-black transition ' + (despesaAtiva ? abaDespesaAtiva : abaInativa) + '">Despesa</button>' +
                '<button id="tipo-receita" type="button" class="h-9 rounded-lg text-sm font-black transition ' + (!despesaAtiva ? abaReceitaAtiva : abaInativa) + '">Receita</button>' +
              '</div>' +
              '<p id="lancamento-alerta-dia" class="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700 mb-3"' + (state.erro ? '' : ' style="display:none"') + '>' + escapeHtml(state.erro) + '</p>' +
              (despesaAtiva ? modalDespesaCamposHtml() : modalReceitaCamposHtml()) +
              '</div>'
          ) +
          '</div>' +
        '</section>' +
      '</div>'
    );
  }

  function novaDespesaFormHtml() {
    var categorias = categoriasDoPerfil(state.empresa && state.empresa.tipo_perfil);
    var escuro = !!state.darkMode;
    var rotuloCampo = escuro ? 'text-slate-300' : 'text-slate-600';
    var campo = escuro ? 'border-slate-500 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900';
    return (
      '<div class="grid gap-4">' +
        '<label class="grid gap-1.5 text-xs font-black uppercase tracking-wide ' + rotuloCampo + '">Nome da despesa' +
          '<input id="nova-despesa-nome" type="text" value="' + escapeHtml(state.novaDespesaNome) + '" placeholder="Ex: Plano de saude" style="font-size:16px" autocomplete="off" class="h-11 w-full rounded-lg border px-3 text-base font-bold normal-case tracking-normal outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 ' + campo + '" />' +
        '</label>' +
        '<label class="grid gap-1.5 text-xs font-black uppercase tracking-wide ' + rotuloCampo + '">Categoria' +
          '<select id="nova-despesa-categoria" style="font-size:16px" class="h-11 w-full rounded-lg border px-3 text-base font-bold normal-case tracking-normal ' + campo + '">' +
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
    var escuro = !!state.darkMode;
    var rotuloCampo = escuro ? 'text-slate-300' : 'text-slate-600';
    var selectCampo = escuro ? 'border-slate-500 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900';
    var pilulaInativa = escuro ? 'border-slate-500 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-500';
    return (
      '<div class="grid gap-3">' +
        '<div class="flex items-end gap-6">' +
          '<div class="w-20 shrink-0">' + campoClaro('despesa-dia', 'Dia', 'type="number" min="1" max="' + maxDias(state.mes, state.ano) + '" inputmode="numeric" style="font-size:16px;text-align:center"', state.despesaDia) + '</div>' +
          '<label class="grid min-w-0 flex-1 gap-1 text-xs font-black uppercase tracking-wide ' + rotuloCampo + '">Despesa' +
            '<select id="despesa-nome" style="font-size:16px" class="h-11 w-full rounded-md border px-3 text-base font-bold normal-case tracking-normal ' + selectCampo + '">' +
              '<option value=""' + (!state.despesaNome ? ' selected' : '') + '>Selecione</option>' +
              state.despesas.map(function (despesa) {
                return '<option value="' + escapeHtml(despesa.nome) + '"' + (state.despesaNome === despesa.nome ? ' selected' : '') + '>' + escapeHtml(despesa.nome) + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
        '</div>' +
        '<button id="abrir-nova-despesa" type="button" class="flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-xs font-black transition ' + (escuro ? 'border-slate-500 text-slate-300 hover:border-slate-400 hover:text-white' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700') + '">+ Cadastrar despesa</button>' +
        campoClaro('despesa-descricao', 'Descricao', '', state.despesaDescricao) +
        campoValor('despesa-valor', 'Valor', state.despesaValor) +
        '<input id="nota-camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" class="hidden" /><input id="nota-arquivo" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" />' +
        // Linha parcelamento
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<button id="toggle-parcelar-despesa" type="button" class="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black uppercase tracking-wide transition-all ' +
            (state.formParcelar
              ? 'border-red-500 bg-red-600 text-white shadow-sm'
              : pilulaInativa) + '">' +
            '<span>' + (state.formParcelar ? '&#10003;' : '&divide;') + '</span>' +
            '<span>Parcelar</span>' +
          '</button>' +
          (state.formParcelar ? (
            '<div class="flex items-center gap-1">' +
              '<button id="parcelar-menos" type="button" class="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-black ' + selectCampo + '">&minus;</button>' +
              '<span class="w-7 text-center text-sm font-black ' + (escuro ? 'text-slate-100' : 'text-slate-900') + '">' + state.formParcelas + '</span>' +
              '<button id="parcelar-mais" type="button" class="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-black ' + selectCampo + '">+</button>' +
              '<span class="text-[10px] font-semibold ' + (escuro ? 'text-slate-400' : 'text-slate-500') + '">x</span>' +
            '</div>' +
            '<span class="text-[10px] font-semibold italic text-slate-400">nos meses seguintes</span>'
          ) : '') +
          '<span class="ml-auto flex items-center gap-1.5"><button id="abrir-nota-arquivo" type="button" class="flex h-8 items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 text-[10px] font-black uppercase text-sky-800 shadow-sm transition active:scale-95"' + (state.notaLendo ? ' disabled' : '') + '><svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 3v6h6M8 14h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Arquivo</button><button id="abrir-nota-camera" type="button" class="flex h-8 items-center gap-1 rounded-full border border-[#0878ad] bg-[#0b80bd] px-2 text-[10px] font-black uppercase text-white shadow-sm transition active:scale-95"' + (state.notaLendo ? ' disabled' : '') + '><svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l1.3-2h7.4L17 8h3v11H4V8Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" stroke="currentColor" stroke-width="2.2"/></svg>Foto</button></span>' +
        '</div>' +
        (state.notaLendo ? '<p class="text-[10px] font-bold text-slate-500">Lendo a nota...</p>' : (state.notaArquivoPendente ? '<p class="text-[10px] font-bold text-emerald-600">Nota pronta para salvar <button id="limpar-nota-pendente" type="button" class="ml-1 text-slate-400">&times;</button></p>' : '')) +
        '<button id="salvar-despesa" type="button" ' + (state.lancandoDespesa ? 'disabled ' : '') + 'class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white disabled:opacity-60">' + (state.lancandoDespesa ? 'Salvando...' : 'Salvar despesa') + '</button>' +
      '</div>'
    );
  }

  function modalReceitaCamposHtml() {
    var entradaAtiva = state.modoReceita !== 'total';
    var escuro = !!state.darkMode;
    var abas = escuro ? 'border border-slate-700 bg-slate-800/80' : 'bg-slate-100';
    var abaAtiva = escuro ? 'border border-slate-500 bg-slate-700 text-emerald-300 shadow-sm' : 'bg-white text-emerald-600 shadow-sm';
    var abaTotalAtiva = escuro ? 'border border-cyan-400/60 bg-slate-700 text-cyan-300 shadow-sm' : 'bg-white text-cyan-700 shadow-sm';
    var abaInativa = escuro ? 'text-slate-300' : 'text-slate-500';
    return (
      '<div class="grid gap-3">' +
        '<div class="grid grid-cols-2 gap-2 rounded-xl ' + abas + ' p-1">' +
          '<button id="modo-receita-entrada" type="button" class="h-9 rounded-lg text-xs font-black ' + (entradaAtiva ? abaAtiva : abaInativa) + '">Adicionar entrada</button>' +
          '<button id="modo-receita-total" type="button" class="h-9 rounded-lg text-xs font-black ' + (!entradaAtiva ? abaTotalAtiva : abaInativa) + '">Definir total</button>' +
        '</div>' +
        (entradaAtiva
          ? '<div class="grid gap-3">' +
              '<div class="flex items-end gap-6">' +
                '<div class="w-20 shrink-0">' + campoClaro('entrada-dia', 'Dia', 'inputmode="numeric"', state.entradaDia) + '</div>' +
                '<div class="min-w-0 flex-1">' + campoClaro('entrada-origem', 'Origem', '', state.entradaOrigem) + '</div>' +
              '</div>' +
              campoValor('entrada-valor', 'Valor', state.entradaValor) +
              '<button id="salvar-entrada" type="button" class="h-11 rounded-xl bg-cyan-500 px-4 text-sm font-black uppercase tracking-wide text-slate-950">' + (state.carregando ? 'Salvando...' : 'Salvar receita') + '</button>' +
            '</div>'
          : '<div class="grid gap-3">' +
              '<p class="rounded-xl border px-3 py-2 text-xs font-semibold ' + (escuro ? 'border-cyan-400/40 bg-cyan-950/35 text-cyan-100' : 'border-cyan-100 bg-cyan-50 text-cyan-900') + '">Define o faturamento total do mes selecionado, substituindo o valor atual.</p>' +
              campoValor('receita-total', 'Total do mes', state.receitaTotal) +
              (Object.prototype.hasOwnProperty.call(state.faturamentos, state.mes)
                ? '<button id="excluir-total-receita" type="button" class="h-10 rounded-xl border px-4 text-xs font-black uppercase tracking-wide ' + (escuro ? 'border-red-400/50 bg-red-950/35 text-red-300' : 'border-red-200 bg-red-50 text-red-600') + '">' + (state.carregando ? 'Excluindo...' : 'Excluir total do mes') + '</button>'
                : '') +
              '<button id="salvar-total-receita" type="button" class="h-11 rounded-xl bg-cyan-500 px-4 text-sm font-black uppercase tracking-wide text-slate-950">' + (state.carregando ? 'Salvando...' : 'Definir total') + '</button>' +
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
	      '<div id="modal-acao-overlay" class="fixed inset-0 z-[55] flex items-center justify-center overflow-hidden bg-slate-950/90 px-3 pt-4" style="padding-bottom:calc(env(safe-area-inset-bottom) + 78px)">' +
          '<section class="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-3xl ' + (state.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white') + ' shadow-2xl" style="max-height:calc(100dvh - env(safe-area-inset-bottom) - 102px)">' +
	          '<div class="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white" style="background-color:#003E73">' +
	            '<div class="min-w-0"><p class="text-[10px] font-black uppercase tracking-wide text-cyan-100/75">' + detalhe + '</p><h2 class="truncate text-base font-black">' + escapeHtml(titulo) + '</h2></div>' +
	            '<button id="fechar-acao-lancamento" type="button" class="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white" aria-label="Fechar lançamento">' + iconeFecharGeometricoMobile() + '</button>' +
	          '</div>' +
	          '<div class="min-h-0 overflow-y-auto p-4 overscroll-contain">' +
	            alertaHtml().replace('mt-4', 'mb-3') +
	            (acao.modo === 'editar'
	              ? modalEditarLancamentoHtml(acao)
	              : (acao.modo === 'excluir' ? modalConfirmarExclusaoLancamentoHtml(acao) : modalOpcoesLancamentoHtml(acao))) +
	          '</div>' +
	        '</section>' +
	      '</div>'
	    );
	  }

  function modalOpcoesLancamentoHtml(acao) {
    var receita = acao.tipo === 'receita';
    var temNota = !receita && acao.item.notaArquivoPath;
    return (
      '<div class="grid gap-2">' +
        '<div class="rounded-2xl bg-slate-50 p-4"><p class="text-xs font-semibold text-slate-500">Dia ' + escapeHtml(acao.item.dia) + '</p><strong class="mt-1 block text-lg font-black">' + dinheiro(acao.item.valor) + '</strong></div>' +
        '<div class="grid ' + (temNota ? 'grid-cols-3' : 'grid-cols-2') + ' gap-2">' +
        (temNota ? '<button id="ver-nota-lancamento" type="button" class="h-11 rounded-xl bg-cyan-600 px-2 text-xs font-black uppercase text-white shadow-sm transition active:scale-[0.98]">Ver nota</button>' : '') +
        '<button id="editar-lancamento" type="button" class="h-11 rounded-xl bg-[#003E73] px-2 text-xs font-black uppercase text-white shadow-sm transition active:scale-[0.98]">Editar</button>' +
        '<button id="excluir-lancamento" type="button" class="h-11 rounded-xl border border-red-200 bg-red-50 px-2 text-xs font-black uppercase text-red-700 shadow-sm transition active:scale-[0.98]">' + (state.carregando ? 'Excluindo...' : 'Excluir') + '</button>' +
        '</div>' +
      '</div>'
	    );
	  }

	  function modalConfirmarExclusaoLancamentoHtml(acao) {
	    var item = acao.item;
	    var receita = acao.tipo === 'receita';
	    var titulo = receita ? item.origem : item.despesa;
	    var subtitulo = receita ? 'Receita do mes' : 'Despesa do mes';
	    var temaEscuro = state.darkMode;
	    var fundoAlerta = temaEscuro ? '#172033' : '#fff';
	    var bordaAlerta = temaEscuro ? 'rgba(248, 113, 113, 0.38)' : '#fee2e2';
	    var fundoResumo = temaEscuro ? '#0f172a' : '#fff';
	    var bordaResumo = temaEscuro ? 'rgba(148, 163, 184, 0.26)' : '#e2e8f0';
	    var textoPrincipal = temaEscuro ? '#f8fafc' : '#0f172a';
	    var textoSecundario = temaEscuro ? '#cbd5e1' : '#64748b';
	    var textoDiscreto = temaEscuro ? '#94a3b8' : '#94a3b8';
	    var detalhe = 'Dia ' + escapeHtml(item.dia);
	    if (!receita && item.descricao) detalhe += ' - ' + escapeHtml(item.descricao);
	    var aviso = receita
	      ? 'A receita sera removida dos lancamentos e descontada do total do mes quando ja estiver efetivada.'
	      : 'A despesa sera removida dos lancamentos deste mes. Despesas fixas mantem a recorrencia original.';

	    return (
	      '<div class="grid gap-4">' +
	        '<div class="overflow-hidden rounded-3xl border shadow-sm" style="background:' + fundoAlerta + ';border-color:' + bordaAlerta + '">' +
	          '<div class="flex items-start gap-3 p-4">' +
	            '<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-inner">' +
	              '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 4.2 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.2a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
	            '</span>' +
	            '<div class="min-w-0 flex-1">' +
	              '<p class="text-[10px] font-black uppercase tracking-[0.16em]" style="color:' + (temaEscuro ? '#fda4af' : '#ef4444') + '">Confirmar exclusao</p>' +
	              '<h3 class="mt-1 text-base font-black leading-tight" style="color:' + textoPrincipal + '">Excluir este lancamento?</h3>' +
	              '<p class="mt-1 text-xs font-semibold leading-relaxed" style="color:' + textoSecundario + '">' + aviso + '</p>' +
	            '</div>' +
	          '</div>' +
	          '<div class="mx-4 mb-4 rounded-2xl border p-3 shadow-sm" style="background:' + fundoResumo + ';border-color:' + bordaResumo + '">' +
	            '<div class="flex items-start justify-between gap-3">' +
	              '<div class="min-w-0">' +
	                '<p class="text-[10px] font-black uppercase tracking-wide" style="color:' + textoDiscreto + '">' + subtitulo + '</p>' +
	                '<h4 class="mt-1 truncate text-sm font-black" style="color:' + textoPrincipal + '">' + escapeHtml(titulo) + '</h4>' +
	                '<p class="mt-1 truncate text-xs font-semibold" style="color:' + textoSecundario + '">' + detalhe + '</p>' +
	              '</div>' +
	              '<strong class="shrink-0 text-sm font-black ' + (receita ? 'text-emerald-600' : 'text-red-600') + '">' + dinheiro(item.valor) + '</strong>' +
	            '</div>' +
	          '</div>' +
	        '</div>' +
	        '<div class="grid grid-cols-2 gap-2">' +
	          '<button id="cancelar-exclusao-lancamento" type="button" class="h-11 rounded-xl bg-[#003E73] px-3 text-xs font-black uppercase tracking-wide text-white shadow-sm transition active:scale-[0.98]">Voltar</button>' +
	          '<button id="confirmar-exclusao-lancamento" type="button" class="h-11 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black uppercase tracking-wide text-red-700 shadow-sm transition active:scale-[0.98]">' + (state.carregando ? 'Excluindo...' : 'Excluir') + '</button>' +
	        '</div>' +
	      '</div>'
	    );
	  }

  function modalEditarLancamentoHtml(acao) {
    var item = acao.item;
    var escuro = !!state.darkMode;
    var rotuloCampo = escuro ? 'text-slate-300' : 'text-slate-600';
    var selectCampo = escuro ? 'border-slate-500 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900';
    if (acao.tipo === 'receita') {
      return (
        '<div class="grid gap-3">' +
          '<div class="grid grid-cols-[72px_minmax(0,1fr)] gap-6">' +
            campoClaro('editar-dia', 'Dia', 'inputmode="numeric" value="' + escapeHtml(item.dia) + '"') +
            campoClaro('editar-origem', 'Origem', 'value="' + escapeHtml(item.origem) + '"') +
          '</div>' +
          campoValor('editar-valor', 'Valor', dinheiro(item.valor)) +
          '<button id="salvar-edicao-lancamento" type="button" ' + (state.carregando ? 'disabled ' : '') + 'class="h-11 rounded-xl bg-cyan-500 px-4 text-sm font-black uppercase tracking-wide text-slate-950 disabled:opacity-60">' + (state.carregando ? 'Salvando...' : 'Salvar alteracoes') + '</button>' +
        '</div>'
      );
    }

    return (
      '<div class="grid gap-3">' +
        '<div class="grid grid-cols-[72px_minmax(0,1fr)] gap-6">' +
          campoClaro('editar-dia', 'Dia', 'inputmode="numeric" value="' + escapeHtml(item.dia) + '"') +
          '<label class="grid gap-1 text-xs font-black uppercase tracking-wide ' + rotuloCampo + '">Despesa' +
            '<select id="editar-despesa" style="font-size:16px" class="h-11 rounded-md border px-3 text-base font-bold normal-case tracking-normal ' + selectCampo + '">' +
              state.despesas.map(function (despesa) {
                return '<option value="' + escapeHtml(despesa.nome) + '"' + (despesa.nome === item.despesa ? ' selected' : '') + '>' + escapeHtml(despesa.nome) + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
        '</div>' +
        campoClaro('editar-descricao', 'Descricao', 'value="' + escapeHtml(item.descricao || '') + '"') +
        campoValor('editar-valor', 'Valor', dinheiro(item.valor)) +
        '<button id="salvar-edicao-lancamento" type="button" ' + (state.carregando ? 'disabled ' : '') + 'class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white disabled:opacity-60">' + (state.carregando ? 'Salvando...' : 'Salvar alteracoes') + '</button>' +
      '</div>'
    );
  }

  function menuLateralHtml() {
    var dk = state.darkMode;
    var bordaBase = dk ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
    var configAberto = !!state.menuConfigAberto;
    var configAnimacao = state.menuConfigAnimacao === 'sair'
      ? 'animation:configSubOut .22s ease-in forwards;transform-origin:top;'
      : (state.menuConfigAnimacao === 'entrar'
        ? 'animation:configSubIn .26s cubic-bezier(.22,1,.36,1) both;transform-origin:top;'
        : '');
    var saindo = state.menuAnimacao === 'sair';
    var entrando = state.menuAnimacao === 'entrar';
    var animacaoOverlay = saindo ? 'animation:menuOverlayOut .28s ease forwards;' : (entrando ? 'animation:menuOverlayIn .24s ease both;' : '');
    var animacaoPainel = saindo
      ? 'will-change:transform;animation:menuSlideOut .3s cubic-bezier(.4,0,1,1) forwards;'
      : (entrando ? 'will-change:transform;animation:menuSlideIn .38s cubic-bezier(.22,1,.36,1) both;' : '');

    var configSubItens = configAberto ? (
      '<div class="cfg-sub-group mt-1 grid gap-1 overflow-hidden rounded-[12px_24px_24px_24px] border p-1.5 pl-5 ' + (dk ? 'border-slate-700 bg-slate-800/60' : 'border-cyan-100') + '" style="' + configAnimacao + (dk ? '' : 'background:#FCFFFF;box-shadow:inset 0 1px 0 rgba(255,255,255,.8);') + '">' +
        '<button id="menu-duplicados" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)]" style="order:2;' + (dk ? '' : 'background:linear-gradient(90deg,#EAFBF3 0%,#FFFFFF 78%);border-color:#BFE8D5;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#DDF7EB;color:#0F8A6A">' + iconeMenuLateralSvg('menu-duplicados') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Duplicados</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">' + (state.duplicadosAtivo ? 'Avisar despesas repetidas' : 'Nao avisar repeticoes') + '</span></span>' +
            chaveMenuHtml(state.duplicadosAtivo) +
          '</div>' +
        '</button>' +
        '<button id="menu-avisos" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)] active:scale-[0.99]" style="order:6;' + (dk ? '' : 'background:linear-gradient(90deg,#E8F4FF 0%,#FFFFFF 78%);border-color:#C9E3FA;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:linear-gradient(135deg,#7DD3FC,#2563EB);color:#FFFFFF">' + iconeMenuLateralSvg('menu-avisos') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Avisos e notificacoes</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">Ver e apagar seus avisos</span></span>' +
            '<span class="flex h-6 w-6 shrink-0 items-center justify-center text-slate-500">' + chevronMenuSvg() + '</span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-gerenciar" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)] active:scale-[0.99]" style="order:8;' + (dk ? '' : 'background:linear-gradient(90deg,#EAF6FF 0%,#FFFFFF 78%);border-color:#C8E4F6;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#DDF0FF;color:#1783C7">' + iconeMenuLateralSvg('menu-gerenciar') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Gerenciar perfil</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">Editar, criar ou excluir perfil</span></span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-cadastro-perfil" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)] active:scale-[0.99]" style="order:10;' + (dk ? '' : 'background:linear-gradient(90deg,#E7F7FF 0%,#FFFFFF 78%);border-color:#BFE2F3;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#D7F1FC;color:#0878AD">' + iconeMenuLateralSvg('menu-cadastro-perfil') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Editar dados cadastrais</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">Cadastro completo do perfil</span></span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-tema" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)]" style="order:3;' + (dk ? '' : 'background:linear-gradient(90deg,#EFEEFF 0%,#FFFFFF 78%);border-color:#D5D3FA;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#E4E6FF;color:#2946A8">' + iconeMenuLateralSvg('menu-tema') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Modo escuro</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">' + (dk ? 'Ativo' : 'Inativo') + '</span></span>' +
            chaveMenuHtml(dk) +
          '</div>' +
        '</button>' +
        '<button id="menu-inicio-valores-ocultos" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)]" style="order:4;' + (dk ? '' : 'background:linear-gradient(90deg,#F0F9FF 0%,#FFFFFF 78%);border-color:#C9E9F7;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#DCF4FF;color:#0369A1">' + iconeVisibilidadeValoresHtml(!iniciarValoresOcultosAtivo()) + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Iniciar valores ocultos</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">' + (iniciarValoresOcultosAtivo() ? 'Privacidade ativa ao abrir' : 'Valores visiveis ao abrir') + '</span></span>' +
            chaveMenuHtml(iniciarValoresOcultosAtivo()) +
          '</div>' +
        '</button>' +
        '<button id="menu-notificacoes" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)] active:scale-[0.99]" style="order:5;' + (dk ? '' : 'background:linear-gradient(90deg,#E8F9FD 0%,#FFFFFF 78%);border-color:#C4EAF4;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#D7F2F8;color:#167FA0">' + iconeMenuLateralSvg('menu-notificacoes') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Notificacoes</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">' + (state.notificacoesAtivas ? 'Ativas neste aparelho' : 'Inativas neste aparelho') + '</span></span>' +
            chaveMenuHtml(state.notificacoesAtivas) +
          '</div>' +
        '</button>' +
        ((COBRANCA_ATIVA_MOBILE && podeGerenciarUsuarios()) ?
        '<button id="menu-assinatura" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)] active:scale-[0.99]" style="order:1;' + (dk ? '' : 'background:linear-gradient(90deg,#FFF5E8 0%,#FFFFFF 78%);border-color:#F1D7B5;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#FDE8C8;color:#9A5A12">' + iconeMenuLateralSvg('menu-assinatura') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Assinatura</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">Plano, faturas e renovacao</span></span>' +
          '</div>' +
        '</button>' : '') +
        '<button id="menu-organizar-dashboard" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)] active:scale-[0.99]" style="order:7;' + (dk ? '' : 'background:linear-gradient(90deg,#EAF4FF 0%,#FFFFFF 78%);border-color:#C9DEF6;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#E0EEFF;color:#2383F0">' + iconeMenuLateralSvg('menu-organizar-dashboard') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Organizar Dashboard</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">Definir a ordem dos cards</span></span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-usuario" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)] active:scale-[0.99]" style="order:9;' + (dk ? '' : 'background:linear-gradient(90deg,#E8FAF7 0%,#FFFFFF 78%);border-color:#BFE5E0;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#D5F3EF;color:#0F8A8C">' + iconeMenuLateralSvg('menu-usuario') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Usuarios</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">' + escapeHtml(perfilFormatado(state.empresa && state.empresa.perfil)) + '</span></span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-backup" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)] active:scale-[0.99]" style="order:11;' + (dk ? '' : 'background:linear-gradient(90deg,#EAF3FF 0%,#FFFFFF 78%);border-color:#C8DCF5;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#DFECFF;color:#2580E8">' + iconeMenuLateralSvg('menu-backup') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Backup</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">Exportar os dados do perfil</span></span>' +
          '</div>' +
        '</button>' +
        '<button id="menu-restauracao" type="button" class="rounded-[12px_24px_24px_24px] border ' + bordaBase + ' px-2.5 py-1 text-left shadow-[0_4px_11px_rgba(15,23,42,.05)] active:scale-[0.99]" style="order:12;' + (dk ? '' : 'background:linear-gradient(90deg,#EEEEFF 0%,#FFFFFF 78%);border-color:#D2D2F1;') + '">' +
          '<div class="flex items-center gap-2">' +
            '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style="background:#E3E7FF;color:#1480A1">' + iconeMenuLateralSvg('menu-restauracao') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block text-[11px] font-black">Restauracao</span><span class="mt-0.5 block truncate text-[9px] font-semibold text-slate-500">Importar um backup do AvantaLab</span></span>' +
          '</div>' +
        '</button>' +
      '</div>'
    ) : '';

    return (
      '<div id="menu-overlay" class="absolute inset-0 z-50 bg-slate-950/75" style="will-change:opacity;transform:translateZ(0);backface-visibility:hidden;-webkit-backface-visibility:hidden;isolation:isolate;' + animacaoOverlay + '">' +
        '<aside id="menu-aside" data-preserve-scroll class="h-full w-[84vw] max-w-[348px] overflow-y-auto rounded-r-3xl ' + (dk ? 'bg-slate-950 text-slate-100' : 'text-slate-900') + ' p-3 shadow-2xl" style="background:' + (dk ? '#020617' : 'linear-gradient(180deg,#F8FBFF 0%,#F4F8FC 100%)') + ';padding-bottom:calc(env(safe-area-inset-bottom) + 120px);backface-visibility:hidden;-webkit-backface-visibility:hidden;contain:paint;' + animacaoPainel + '">' +
          '<div class="relative mb-4 overflow-hidden rounded-[16px_32px_32px_32px] border border-white/20 p-4 text-white shadow-xl shadow-sky-950/15" style="background-image:radial-gradient(circle at 86% 18%,rgba(255,255,255,.2),transparent 28%),linear-gradient(135deg,#073B78 0%,#007EA7 55%,#00BFD1 100%);">' +
            '<div class="pointer-events-none absolute -bottom-8 -right-6 h-24 w-32 rounded-[50%] border border-white/10"></div>' +
            '<div class="flex items-start justify-between gap-3">' +
              '<div class="relative min-w-0"><p class="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-100">AvantaLab</p><h2 class="mt-1 truncate text-lg font-black">' + escapeHtml(nomeEmpresa(state.empresa)) + '</h2><p class="mt-1 truncate text-[11px] font-semibold text-cyan-50/90">' + escapeHtml(state.usuario && state.usuario.email ? state.usuario.email : 'Usuario logado') + '</p></div>' +
              '<button id="fechar-menu" type="button" class="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-sm backdrop-blur active:scale-95" aria-label="Fechar menu">' + iconeFecharGeometricoMobile() + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="grid gap-1.5">' +
            menuBotaoHtml('menu-agenda', 'Agenda', 'Lembretes e avisos') +
            menuBotaoHtml('menu-configurar-resumo', 'Mostrar/ocultar cards', 'Exibir ou remover blocos') +
            menuBotaoHtml('menu-organizar-atalhos', 'Organizar atalhos', 'Personalizar a barra inferior') +
            menuBotaoHtml('menu-categorias', 'Cadastrar despesas', 'Adicionar tipos de despesa') +
            menuBotaoHtml('menu-despesas-fixas', 'Despesas fixas', 'Lancamentos automaticos mensais') +
            menuBotaoHtml('menu-ajuda-categorias', 'Instrucoes sobre categorias', 'Como organizar seus gastos') +
            menuBotaoHtml('menu-tutorial', 'Tutorial', 'Como usar o AvantaLab') +
            menuBotaoHtml('menu-trocar-sistema', 'Ir para Vendas', state.vendasMobileModuloAtivo ? (podeTrocarSistemaMobile() ? 'Abrir o Vendas Mobile' : 'Indisponível para operadores') : (podeGerenciarUsuarios() ? 'Ativar e abrir o Vendas Mobile' : 'Indisponível para operadores'), !podeGerenciarUsuarios(), false) +
            ((state.vendasMobileModuloAtivo && podeGerenciarConteudoVendas()) ? menuBotaoHtml('menu-vendas-mobile', 'Conteúdo do Vendas', 'Novidades e divulgacao') : '') +
            '<button id="menu-config-toggle" type="button" class="mobile-config-main-btn rounded-[14px_26px_26px_26px] border border-slate-300 px-2.5 py-2 text-left text-slate-800 shadow-[0_5px_13px_rgba(15,23,42,.09)] transition active:scale-[0.99]" style="background:' + (configAberto ? 'linear-gradient(90deg,#B8C3D0 0%,#A5B2C1 100%)' : 'linear-gradient(90deg,#CBD5E1 0%,#B4C0CE 100%)') + '">' +
              '<div class="flex items-center gap-2">' +
                '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-slate-800 text-white shadow-sm">' + iconeMenuLateralSvg('menu-config-toggle') + '</span>' +
                '<span class="min-w-0 flex-1"><span class="mobile-config-main-title block text-xs font-black leading-none text-slate-800">Configuracoes</span><span class="mobile-config-main-subtitle mt-1 block truncate text-[10px] font-semibold leading-none text-slate-600">Perfil, tema e preferencias</span></span>' +
                '<span class="flex h-6 w-6 items-center justify-center text-slate-600 transition-transform ' + (configAberto ? 'rotate-90' : '') + '">' + chevronMenuSvg() + '</span>' +
              '</div>' +
            '</button>' +
            configSubItens +
            '<button id="menu-feedback" type="button" class="rounded-[14px_26px_26px_26px] border border-cyan-300 px-2.5 py-2 text-left shadow-[0_6px_15px_rgba(8,145,178,.13)] transition active:scale-[0.99]" style="background:radial-gradient(circle at 90% 50%,rgba(20,184,166,.18),transparent 28%),linear-gradient(135deg,#E6FFFB 0%,#CFFAFE 100%)"><div class="flex items-center gap-2"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm" style="background:linear-gradient(135deg,#06B6D4,#0891B2)">' + iconeMenuLateralSvg('menu-feedback') + '</span><span class="min-w-0 flex-1"><span class="block text-xs font-black leading-none text-sky-900">Duvidas e Sugestoes</span><span class="mt-1 block truncate text-[10px] font-semibold leading-none text-cyan-700">Ajude a melhorar o AvantaLab</span></span><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/75 text-cyan-700 shadow-sm">' + chevronMenuSvg() + '</span></div></button>' +
            '<button id="sair" type="button" class="rounded-[14px_26px_26px_26px] border border-rose-100 px-2.5 py-2 text-left text-xs font-black text-rose-700 shadow-sm transition active:scale-[0.99]" style="background:linear-gradient(90deg,#FFF1F2 0%,#FFFFFF 72%)"><span class="flex items-center gap-2"><span class="flex h-7 w-7 items-center justify-center text-rose-600">' + iconeMenuLateralSvg('sair') + '</span><span>Sair</span></span></button>' +
          '</div>' +
        '</aside>' +
      '</div>'
    );
  }

  function chatIAModalHtml() {
    var dark = !!state.darkMode;
    var logoChatSrc = dark ? '/images/ava-logo-fundo-escuro.png' : '/images/ava-logo-fundo-claro.png';
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
      '<div id="chat-ia-header" style="position:absolute;top:0;left:0;right:0;z-index:4;display:flex;align-items:center;gap:10px;' +
        'padding-top:calc(env(safe-area-inset-top,0px) + 12px);padding-left:8px;padding-right:14px;padding-bottom:12px;' +
        'background:' + C.bar + ';border-bottom:1px solid ' + C.border + ';">' +
        '<button id="chat-ia-fechar" type="button" aria-label="Voltar" style="background:transparent;border:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">' +
          '<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="' + C.text + '" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
        '</button>' +
        avaLogoArquivoHtml(96, 52, logoChatSrc) +
        '<span style="flex:1;min-width:0;"></span>' +
        '<button id="chat-ia-home" type="button" aria-label="Voltar para o início" style="background:' + C.pill + ';border:1px solid ' + C.pillBorder + ';width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="' + C.text + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9Z"/><path d="M9 21v-7h6v7"/></svg>' +
        '</button>' +
      '</div>';

    var body =
      '<div id="chat-ia-msgs" style="position:absolute;left:0;right:0;top:0;bottom:64px;z-index:2;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:calc(env(safe-area-inset-top,0px) + 82px) 14px 16px;">' +
        (firstUser < 0 ? welcome : '') + convoHtml +
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
      '<div id="chat-ia-input-bar" style="position:absolute;left:0;right:0;bottom:0;z-index:3;padding:5px 10px;' +
        'padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px);background:' + C.bg + ';">' +
        '<div id="chat-ia-composer" style="width:100%;display:flex;align-items:flex-end;gap:4px;background:' + fieldBg + ';border:1px solid ' + fieldBorder + ';border-radius:24px;padding:5px 6px 5px 14px;min-height:46px;box-shadow:' + (dark ? 'none' : '0 8px 20px rgba(15,35,61,0.08)') + ';">' +
          '<div id="chat-ia-input" role="textbox" aria-multiline="true" tabindex="0" inputmode="text" enterkeyhint="send" autocapitalize="sentences" autocomplete="off" autocorrect="on" spellcheck="true" contenteditable="true" data-placeholder="Como posso ajudar voce hoje?" style="position:relative;z-index:1;flex:1;min-width:0;min-height:36px;max-height:96px;overflow-y:auto;outline:none;border:none;background:transparent;font-size:16px;font-family:inherit;color:' + C.text + ';line-height:1.4;padding:7px 2px;margin:0;white-space:pre-wrap;word-break:break-word;-webkit-user-select:text;user-select:text;pointer-events:auto;touch-action:auto;cursor:text;">' + escapeHtml(state.chatIAInput) + '</div>' +
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
      '<div id="chat-ia-overlay" style="position:fixed;top:0;left:0;right:0;bottom:auto;width:100vw;height:100dvh;z-index:5000;display:block;background:' + C.bg + ';overflow:hidden;isolation:isolate;overscroll-behavior:contain;' + animacao + '">' +
        keyboardShield + header + body + inputBar +
      '</div>'
    );
  }


  function chevronMenuSvg() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function chaveMenuHtml(ativa) {
    return '<span class="relative h-5 w-9 shrink-0 rounded-full p-0.5 shadow-inner ' + (ativa ? 'bg-emerald-500' : 'bg-slate-300') + '"><span class="block h-4 w-4 rounded-full bg-white shadow-md transition-transform ' + (ativa ? 'translate-x-4' : 'translate-x-0') + '"></span></span>';
  }

  function iconeMenuLateralSvg(id) {
    var base = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    var caminhos = {
      'menu-agenda': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      'menu-avisos': '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
      'menu-configurar-resumo': '<path d="M4 6h16M4 12h16M4 18h16"/>',
      'menu-organizar-atalhos': '<path d="M7 7h13M17 3l4 4-4 4M17 17H4M7 13l-4 4 4 4"/>',
      'menu-categorias': '<path d="M12 5v14M5 12h14"/>',
      'menu-despesas-fixas': '<path d="M20 6v5h-5M4 18v-5h5M18 9a7 7 0 0 0-12-2l-2 4M6 15a7 7 0 0 0 12 2l2-4"/>',
      'menu-ajuda-categorias': '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 3.3 2.37c-.9.36-.9 1.13-.9 1.63M12 17h.01"/>',
      'menu-tutorial': '<path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 12.5V17c3 2 7 2 10 0v-4.5M21 10v6"/>',
      'menu-vendas-mobile': '<path d="m3 11 18-5v12L3 14zM11.5 16.5 13 21H8l-1.5-6"/><path d="M7 8.8v6.4"/>',
      'menu-trocar-sistema': '<rect x="3" y="4" width="8" height="7" rx="2"/><rect x="13" y="13" width="8" height="7" rx="2"/><path d="M15 7h4a2 2 0 0 1 2 2v1M9 17H5a2 2 0 0 1-2-2v-1M18 7l-2-2m2 2-2 2M6 17l2-2m-2 2 2 2"/>',
      'menu-config-toggle': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4V21a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1v-4H3a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1v-.1h4V3a1.7 1.7 0 0 0 1.1 1.6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.36.7.6 1 .27.28.62.4 1 .4h.1v4H21a1.7 1.7 0 0 0-1.6.6Z"/>',
      'menu-duplicados': '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M8 8h12v12H8z"/>',
      'menu-gerenciar': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      'menu-cadastro-perfil': '<path d="M4 21v-4a4 4 0 0 1 4-4h4"/><circle cx="10" cy="6" r="4"/><path d="m15 19 5-5 2 2-5 5-3 1 1-3Z"/>',
      'menu-tema': '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
      'menu-notificacoes': '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
      'menu-assinatura': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h2M12 15h2"/>',
      'menu-organizar-dashboard': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      'menu-usuario': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
      'menu-backup': '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
      'menu-restauracao': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
      'menu-feedback': '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-7a4 4 0 0 1-1-2.7V7a4 4 0 0 1 4-4h11a4 4 0 0 1 4 4v8Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
      'sair': '<path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
    };
    return '<svg ' + base + '>' + (caminhos[id] || '<circle cx="12" cy="12" r="2"/>') + '</svg>';
  }

  function menuBotaoHtml(id, titulo, subtitulo, desativado, visualInativo) {
    var estilos = {
      'menu-agenda': ['linear-gradient(90deg,#E5F9FC 0%,#F9FEFF 100%)', '#C4EEF4', '#D5F8FC', '#087B94'],
      'menu-avisos': ['linear-gradient(90deg,#E8F4FF 0%,#FAFCFF 100%)', '#C9E3FA', 'linear-gradient(135deg,#7DD3FC,#2563EB)', '#FFFFFF'],
      'menu-configurar-resumo': ['linear-gradient(90deg,#E8F3FF 0%,#FAFCFF 100%)', '#C5DEF7', 'linear-gradient(135deg,#67E8F9,#3B82F6)', '#FFFFFF'],
      'menu-organizar-atalhos': ['linear-gradient(90deg,#E3FAFC 0%,#F9FEFF 100%)', '#BDEBF0', 'linear-gradient(135deg,#22D3EE,#0891B2)', '#FFFFFF'],
      'menu-categorias': ['linear-gradient(90deg,#E3F8F3 0%,#FAFEFD 100%)', '#BDE9DD', 'linear-gradient(135deg,#2DD4BF,#0F766E)', '#FFFFFF'],
      'menu-despesas-fixas': ['linear-gradient(90deg,#E7F1FF 0%,#FAFCFF 100%)', '#C6DCF7', 'linear-gradient(135deg,#38BDF8,#1D4ED8)', '#FFFFFF'],
      'menu-ajuda-categorias': ['linear-gradient(90deg,#ECEBFF 0%,#FCFBFF 100%)', '#D4D5FA', 'linear-gradient(135deg,#818CF8,#4F46E5)', '#FFFFFF'],
      'menu-tutorial': ['linear-gradient(90deg,#F0EAFE 0%,#FCFAFF 100%)', '#DED4FA', 'linear-gradient(135deg,#A78BFA,#7C3AED)', '#FFFFFF'],
      'menu-vendas-mobile': ['linear-gradient(90deg,#E1F7FC 0%,#F8FDFF 100%)', '#B9E8F2', 'linear-gradient(135deg,#22D3EE,#0369A1)', '#FFFFFF'],
      'menu-trocar-sistema': ['linear-gradient(90deg,#E0F2FE 0%,#F8FDFF 100%)', '#BAE6FD', 'linear-gradient(135deg,#0284C7,#003E73)', '#FFFFFF'],
    };
    var visual = estilos[id] || ['#FFFFFF', '#E2E8F0', '#ECFEFF', '#0E7490'];
    var cardStyle = state.darkMode ? 'background:#0F172A;border-color:#334155;' : 'background:' + visual[0] + ';border-color:' + visual[1] + ';';
    return '<button id="' + id + '" type="button"' + (desativado ? ' disabled aria-disabled="true"' : '') + ' class="rounded-[14px_26px_26px_26px] border px-2.5 py-2 text-left shadow-[0_5px_13px_rgba(15,23,42,.07)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50' + (visualInativo ? ' opacity-60 saturate-50' : '') + '" style="' + cardStyle + '">' +
      '<div class="flex items-center gap-2">' +
        '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm" style="background:' + visual[2] + ';color:' + visual[3] + '">' + iconeMenuLateralSvg(id) + '</span>' +
        '<span class="min-w-0 flex-1"><span class="block text-xs font-black leading-none">' + escapeHtml(titulo) + '</span><span class="mt-1 block truncate text-[10px] font-semibold leading-none text-slate-500">' + escapeHtml(subtitulo || '') + '</span></span>' +
        '<span class="flex h-6 w-6 shrink-0 items-center justify-center text-slate-500">' + chevronMenuSvg() + '</span>' +
      '</div>' +
    '</button>';
  }

  function modalMenuHtml() {
    var titulo = {
      usuario: 'Usuario',
      empresa: 'Trocar perfil',
      gerenciar: 'Gerenciar perfil',
      configurarResumo: 'Mostrar/ocultar cards',
      organizarDashboard: 'Ordenar cards',
      organizarAtalhos: 'Organizar atalhos',
      categorias: 'Cadastrar despesas',
      ajudaCategorias: 'Instrucoes',
      'instalar-ios': 'Instalar no iPhone',
      'instalar-android': 'Instalar app',
      termos: 'Termos de Uso',
      privacidade: 'Privacidade',
      feedback: 'Dúvidas e Sugestões',
      despesasFixas: 'Gerenciar despesas fixas',
      assinatura: 'Assinatura',
      premium: 'Premium Pessoal',
      sobre: 'Sobre',
      notificacoes: 'Notificações',
      detalheTipoDespesa: state.tipoDespesaDetalhe || 'Lançamentos',
      pontoRelatorio: state.pontoRelatorioNome ? 'Relatorio do dia' : 'Controle de ponto',
    }[state.modalMenu] || 'Menu';

    return (
      '<div id="modal-menu-overlay" class="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-slate-950/90 px-3 pt-4" style="padding-bottom:calc(env(safe-area-inset-bottom) + 78px)">' +
        '<section class="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-3xl ' + (state.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900') + ' shadow-2xl" style="max-height:calc(100dvh - env(safe-area-inset-bottom) - 102px)">' +
          '<div class="shrink-0 flex items-center justify-between gap-3 px-4 py-3 text-white" style="background-color:#003E73">' +
            '<h2 class="text-base font-black">' + escapeHtml(titulo) + '</h2>' +
            '<button id="fechar-modal-menu" type="button" class="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white" aria-label="Fechar">' + iconeFecharGeometricoMobile() + '</button>' +
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
    if (state.modalMenu === 'organizarAtalhos') return organizarAtalhosHtml();
    if (state.modalMenu === 'categorias') return categoriasMenuHtml();
    if (state.modalMenu === 'ajudaCategorias') return ajudaCategoriasHtml();
    if (state.modalMenu === 'instalar-ios') return instalarIosHtml();
    if (state.modalMenu === 'instalar-android') return instalarAndroidHtml();
    if (state.modalMenu === 'termos') return termosMobileHtml();
    if (state.modalMenu === 'privacidade') return privacidadeMobileHtml();
    if (state.modalMenu === 'feedback') return feedbackMobileHtml();
    if (state.modalMenu === 'despesasFixas') return despesasFixasMenuHtml();
    if (state.modalMenu === 'assinatura') return assinaturaMobileHtml();
    if (state.modalMenu === 'premium') return premiumPessoalHtml();
    if (state.modalMenu === 'sobre') return sobreMobileHtml();
    if (state.modalMenu === 'notificacoes') return notificacoesMobileHtml();
    if (state.modalMenu === 'detalheTipoDespesa') return detalheTipoDespesaHtml();
    if (state.modalMenu === 'pontoRelatorio') return pontoRelatorioMobileHtml();
    return '';
  }

  function detalheTipoDespesaHtml() {
    var nome = state.tipoDespesaDetalhe || '';
    var atual = dadosMes(state.mes);
    var itens = lancamentosRealizadosDoMes(atual)
      .filter(function (item) { return item.despesa === nome; })
      .sort(function (a, b) { return Number(a.dia || 0) - Number(b.dia || 0); });
    var total = itens.reduce(function (soma, item) { return soma + Number(item.valor || 0); }, 0);
    var totalFundo = state.darkMode ? 'border border-cyan-400/35 bg-cyan-500/15' : 'bg-cyan-50';
    var totalRotulo = state.darkMode ? 'text-cyan-100' : 'text-cyan-900';
    var totalValor = state.darkMode ? 'text-cyan-50' : 'text-cyan-950';

    return (
      '<div class="grid gap-3">' +
        '<div class="flex items-center justify-between gap-3 rounded-xl px-3 py-2 ' + totalFundo + '">' +
          '<span class="text-xs font-bold ' + totalRotulo + '">' + escapeHtml(nomeMesCompleto(state.mes)) + ' de ' + escapeHtml(state.ano) + '</span>' +
          '<strong class="text-sm font-black ' + totalValor + '">' + dinheiro(total) + '</strong>' +
        '</div>' +
        (itens.length ? itens.map(function (item) {
          return '<div class="flex items-center justify-between gap-3 border-b border-slate-100 px-1 py-2.5 last:border-b-0">' +
            '<div class="min-w-0"><strong class="block text-sm text-slate-800">Dia ' + escapeHtml(String(item.dia || '-')) + '</strong>' +
            '<span class="block truncate text-xs font-semibold text-slate-500">' + escapeHtml(item.descricao || 'Sem descrição') + '</span></div>' +
            '<strong class="shrink-0 text-sm font-black text-red-600">' + dinheiro(item.valor) + '</strong>' +
          '</div>';
        }).join('') : '<p class="py-6 text-center text-sm font-semibold text-slate-500">Nenhum lançamento encontrado.</p>') +
      '</div>'
    );
  }

  function sobreMobileHtml() {
    var dk = !!state.darkMode;
    var muted = dk ? 'text-slate-400' : 'text-slate-500';
    var itemBorda = dk ? 'border-slate-700' : 'border-slate-200';
    var corLink = dk ? '#7dd3fc' : '#003E73';

    if (!state.changelog) {
      return '<p class="py-8 text-center text-sm font-semibold ' + muted + '">Carregando...</p>';
    }

    var emp = state.changelog.empresa || {};
    var versoes = state.changelog.versoes || [];

    var paragrafos = Array.isArray(emp.descricao) ? emp.descricao : (emp.descricao ? [emp.descricao] : []);
    var descricaoHtml = paragrafos.map(function (par) {
      return '<p class="mt-2 text-[12px] font-semibold leading-relaxed text-cyan-50/90">' + escapeHtml(par) + '</p>';
    }).join('');

    var topo =
      '<div class="overflow-hidden rounded-2xl border border-white/15 p-4 text-white shadow-lg" style="background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%);">' +
        '<h2 class="text-lg font-black text-white">' + escapeHtml(emp.nome || 'AvantaLab') + '</h2>' +
        (emp.subtitulo ? '<p class="mt-0.5 text-[12px] font-semibold text-cyan-50/90">' + escapeHtml(emp.subtitulo) + '</p>' : '') +
        descricaoHtml +
        '<div class="mt-3 flex flex-wrap gap-2 font-bold">' +
          (emp.site ? '<a href="' + escapeHtml(emp.site) + '" target="_blank" rel="noopener noreferrer" class="rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[11px] text-white">' + escapeHtml((emp.site || '').replace('https://', '')) + '</a>' : '') +
          (emp.instagramUrl ? '<a href="' + escapeHtml(emp.instagramUrl) + '" target="_blank" rel="noopener noreferrer" class="rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[11px] text-white">' + escapeHtml(emp.instagram || 'Instagram') + '</a>' : '') +
        '</div>' +
      '</div>';

    var cabVersoes =
      '<div class="mt-4 mb-2 flex items-baseline justify-between">' +
        '<h3 class="text-[11px] font-black uppercase tracking-wide ' + muted + '">Principais novidades</h3>' +
        '<span class="text-[11px] font-bold" style="color:' + corLink + '">Instalada: ' + escapeHtml(APP_VERSION) + '</span>' +
      '</div>';

    var lista = versoes.map(function (v) {
      var aberto = !!state.sobreAbertos[v.versao];
      var itens = (v.itens || []).map(function (it) {
        return '<li class="flex gap-2 text-[12px] ' + (dk ? 'text-slate-300' : 'text-slate-600') + '"><span style="color:#00A6C8">&bull;</span><span>' + escapeHtml(it) + '</span></li>';
      }).join('');
      return '<div class="rounded-xl border ' + itemBorda + ' p-3">' +
          '<button type="button" data-sobre-versao="' + escapeHtml(v.versao) + '" class="flex w-full items-start justify-between gap-3 text-left">' +
            '<span class="min-w-0"><span class="block text-sm font-black">v' + escapeHtml(v.versao) + ' &middot; ' + escapeHtml(v.titulo || '') + '</span><span class="mt-0.5 block text-[11px] font-bold ' + muted + '">' + escapeHtml(v.data || '') + '</span></span>' +
            '<span class="mt-0.5 flex shrink-0 items-center gap-1 text-[11px] font-black" style="color:' + corLink + '">' + (aberto ? 'Ocultar' : 'Ver melhorias') + '<span class="text-[9px] leading-none">' + (aberto ? '&#9650;' : '&#9660;') + '</span></span>' +
          '</button>' +
          (aberto ? '<ul class="mt-3 grid gap-1 border-t ' + itemBorda + ' pt-3">' + itens + '</ul>' : '') +
        '</div>';
    }).join('');

    return topo + cabVersoes + '<div class="grid gap-3">' + lista + '</div>';
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

  // Espelha a web: usuarios sem email real (login interno) mostram o login,
  // nunca o email sintetico do supabase (login+empresaId@usuarios.avantalab.local).
  function loginVisivelUsuario(u) {
    if (!u) return '-';
    if (u.login) return u.login;
    var email = String(u.email || '');
    if (email.indexOf('@usuarios.avantalab.local') >= 0) return email.split('+')[0];
    return email || '-';
  }
  function emailRealUsuario(u) {
    var email = String((u && u.email) || '');
    if (!email || email.indexOf('@usuarios.avantalab.local') >= 0) return '';
    return email;
  }

  function usuarioHtml() {
    if (!podeGerenciarUsuarios()) {
      var podeEditarProprio = state.empresa && state.empresa.perfil === 'operador_completo' && state.empresa.acessoId;
      var proprio = podeEditarProprio ? { id: state.empresa.acessoId, nome: state.empresa.usuario_nome || '', email: state.empresa.email || '', login: state.loginConta || state.empresa.login || '', perfil: state.empresa.perfil } : null;
      var editandoProprio = proprio && String(state.usuarioEditandoId) === String(proprio.id);
      return (
        '<div class="grid gap-3 text-sm">' +
          '<div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Email</p><p class="mt-1 font-bold">' + escapeHtml(state.usuario && state.usuario.email ? state.usuario.email : '-') + '</p></div>' +
          '<div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Perfil</p><p class="mt-1 font-bold">' + escapeHtml(perfilFormatado(state.empresa && state.empresa.perfil)) + '</p></div>' +
          (editandoProprio ? editarUsuarioHtml(proprio) : (podeEditarProprio ? '<button type="button" data-editar-usuario="' + escapeHtml(proprio.id) + '" class="h-11 rounded-xl bg-cyan-600 text-xs font-black uppercase tracking-wide text-white">Editar meus dados</button>' : '<p class="rounded-2xl bg-cyan-50 p-4 text-xs font-semibold text-cyan-900">Seu perfil não possui permissão para editar usuários.</p>')) +
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
                '<div class="min-w-0"><p class="truncate text-xs font-black text-slate-900">' + escapeHtml(usuario.nome || loginVisivelUsuario(usuario)) + '</p><p class="truncate text-[10px] font-semibold text-slate-500">' + escapeHtml(loginVisivelUsuario(usuario)) + ' · ' + escapeHtml(perfilFormatado(usuario.perfil)) + (bloqueado ? ' · Bloqueado' : '') + '</p></div>' +
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
                '<p><span class="font-black text-slate-900">Nome:</span><br>' + escapeHtml(usuario.nome || loginVisivelUsuario(usuario)) + '</p>' +
                (emailRealUsuario(usuario) ? '<p><span class="font-black text-slate-900">Email:</span><br>' + escapeHtml(emailRealUsuario(usuario)) + '</p>' : '') +
                '<p><span class="font-black text-slate-900">Login:</span><br>' + escapeHtml(loginVisivelUsuario(usuario)) + '</p>' +
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
        '<input id="edit-usuario-login" value="' + escapeHtml(usuario.login || (state.empresa && String(state.empresa.acessoId) === String(usuario.id) ? state.loginConta : '')) + '" placeholder="Login" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none" />' +
        '<input id="edit-usuario-email" type="email" value="' + escapeHtml(emailRealUsuario(usuario)) + '" placeholder="E-mail (opcional)" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none" />' +
        '<select id="edit-usuario-perfil" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none">' + opcoesPerfilHtml(usuario.perfil || 'operador_simples', usuario.perfil === 'gestor_master' || (state.empresa && state.empresa.perfil === 'gestor_master')) + '</select>' +
        '<input id="edit-usuario-senha" type="password" placeholder="Nova senha (opcional)" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none" />' +
        '<input id="edit-usuario-confirmar-senha" type="password" placeholder="Confirmar nova senha" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none" />' +
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
          var carregando = state.perfilSelecionandoId === empresa.id;
          var perfilAtual = !carregando && !!(state.empresa && empresa.id === state.empresa.id);
          var bloqueado = perfilAtual || !!state.perfilSelecionandoId;
          var classeVisual = carregando
            ? 'border-blue-600 bg-cyan-50 text-cyan-800 shadow-sm'
            : (perfilAtual
              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-80'
              : 'border-slate-200 bg-white text-slate-800');
          var status = carregando
            ? '<span class="shrink-0 text-[10px] font-black uppercase tracking-wide text-blue-700">Carregando perfil...</span>'
            : (perfilAtual ? '<span class="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">Perfil em uso</span>' : '');
          return '<button type="button" data-empresa-id="' + escapeHtml(empresa.id) + '" aria-pressed="' + (carregando ? 'true' : 'false') + '" aria-current="' + (perfilAtual ? 'page' : 'false') + '"' + (bloqueado ? ' disabled' : '') + ' class="empresa-opcao rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.98] active:translate-y-px disabled:active:translate-y-0 disabled:active:scale-100 ' + classeVisual + '"><span class="flex items-center justify-between gap-3"><span class="min-w-0 truncate text-sm font-black">' + escapeHtml(nomeEmpresa(empresa)) + '</span>' + status + '</span><span class="mt-0.5 block text-xs font-semibold text-slate-500">' + escapeHtml(tipo) + ' &middot; ' + escapeHtml(perfilFormatado(empresa.perfil)) + '</span></button>';
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
      var iconeEditarPerfil = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var iconeCadastroCompleto = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M4 21v-4a4 4 0 0 1 4-4h4" stroke-width="2.1" stroke-linecap="round"/><circle cx="10" cy="6" r="4" stroke-width="2.1"/><path d="m15 19 5-5 2 2-5 5-3 1 1-3Z" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var iconeCriarPerfil = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-width="2.4" stroke-linecap="round"/></svg>';
      var iconeTrocarPerfil = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var iconeExcluirPerfil = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M19 7l-.9 12.1A2 2 0 0 1 16.1 21H7.9a2 2 0 0 1-2-1.9L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      return (
        '<div class="grid gap-3 text-sm">' +
          cabecalho +
          '<div class="grid gap-2">' +
            (podeEditar
              ? '<button id="abrir-edicao-empresa-mobile" type="button" class="flex h-12 w-full items-center gap-3 rounded-lg border border-[#0A1F44] bg-[#0A1F44] px-4 text-left text-sm font-black text-white shadow-md transition active:scale-[0.98]">' + iconeEditarPerfil + '<span>Editar perfil atual</span></button>'
              : '') +
            (podeEditar
              ? '<button id="abrir-cadastro-completo-mobile" type="button" class="flex h-12 w-full items-center gap-3 rounded-lg border border-sky-700 bg-sky-600 px-4 text-left text-sm font-black text-white shadow-md transition active:scale-[0.98]">' + iconeCadastroCompleto + '<span>Editar dados cadastrais</span></button>'
              : '') +
            '<button id="abrir-criar-empresa-mobile" type="button" class="flex h-12 w-full items-center gap-3 rounded-lg border border-cyan-700 bg-cyan-700 px-4 text-left text-sm font-black text-white shadow-md transition active:scale-[0.98]">' + iconeCriarPerfil + '<span>Criar novo perfil</span></button>' +
            '<button id="trocar-empresa-gerenciar" type="button" class="flex h-12 w-full items-center gap-3 rounded-lg border px-4 text-left text-sm font-black shadow-md transition ' + (podeTrocar ? 'border-blue-700 bg-blue-600 text-white active:scale-[0.98]' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-80') + '"' + (podeTrocar ? '' : ' disabled') + '>' + iconeTrocarPerfil + '<span>Trocar perfil</span></button>' +
            '<button id="abrir-exclusao-empresa-mobile" type="button" class="flex h-12 w-full items-center gap-3 rounded-lg border px-4 text-left text-sm font-black shadow-md transition ' + (gestorMaster ? 'border-red-700 bg-red-600 text-white active:scale-[0.98]' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-80') + '"' + (gestorMaster ? '' : ' disabled title="Somente o Gestor Master pode excluir o perfil"') + '>' + iconeExcluirPerfil + '<span>Excluir perfil</span></button>' +
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
            '<input id="nova-empresa-nome" placeholder="' + escapeHtml(rotuloNomePerfil(tipoNovo)) + '" style="font-size:16px" class="h-11 rounded-md border border-emerald-100 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-emerald-500" />' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-slate-500">Tipo do perfil</p>' +
            seletorTipoPerfilHtml('novo-tipo', tipoNovo) +
            '<div class="grid grid-cols-2 gap-2">' +
              '<button id="cancelar-criar-empresa-mobile" type="button" class="h-10 rounded-xl bg-white border border-slate-200 px-3 text-xs font-black uppercase tracking-wide text-slate-600">Cancelar</button>' +
              '<button id="criar-empresa-mobile" type="button" ' + (state.empresaAcao === 'criar' ? 'disabled ' : '') + 'class="h-10 rounded-xl bg-emerald-600 px-3 text-xs font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60">' + (state.empresaAcao === 'criar' ? 'Criando...' : 'Criar perfil') + '</button>' +
            '</div>' +
          '</div>' +
          alertaCriarPerfilHtml() +
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

  function assinaturaMobileHtml() {
    var detalhes = state.assinaturaDetalhes;
    var estado = (detalhes && detalhes.estado) || state.paywallEstado || {};
    var assinatura = detalhes && detalhes.assinatura;
    var faturas = (detalhes && detalhes.faturas) || [];
    var podeGerenciar = !detalhes || detalhes.podeGerenciar !== false;
    var canceladaNoFim = assinaturaCanceladaNoFimMobile(estado);
    var statusRotulos = {
      ativa: 'Ativa', trial: 'Periodo de teste', expirada: 'Vencida',
      cancelada: canceladaNoFim ? 'Cancelada ao fim do periodo' : 'Cancelada',
      cortesia: 'Cortesia', inadimplente: 'Pagamento pendente'
    };
    var statusEstilo = estado.status === 'ativa' || estado.status === 'cortesia'
      ? 'background:#DCFCE7;color:#15803D'
      : (estado.status === 'trial' ? 'background:#DBEAFE;color:#1D4ED8' : (estado.status === 'inadimplente' ? 'background:#FEF3C7;color:#B45309' : 'background:#FEE2E2;color:#B91C1C'));
    var ciclo = estado.ciclo || '';
    var plano = estado.plano === 'pessoal_premium' ? 'Premium Pessoal' : (estado.plano ? 'Empresa' : '—');
    // Tipo do perfil: prioriza o perfil aberto no app (fonte confiável);
    // o tipoPerfil do estado é só fallback.
    var pessoal = state.empresa && state.empresa.tipo_perfil
      ? normalizarTipoPerfil(state.empresa.tipo_perfil) === 'pessoal'
      : estado.tipoPerfil === 'pessoal';
    // Cortesia (admin/benefício) e cupom: não exibem dados de cobrança do gateway.
    // Cortesia explícita, ou "ativa" sem cobrança e sem plano (cliente anterior
    // ao lançamento — acesso liberado de graça = cortesia na prática).
    var cortesiaAtiva = estado.status === 'cortesia'
      || (estado.status === 'ativa' && !assinatura && !ciclo && !estado.plano);
    var viaCupom = cortesiaAtiva && !!(detalhes && detalhes.viaCupom);
    var tipoLabel = pessoal ? 'Pessoal' : 'Empresa';
    // Atraso: pagamento pendente ou fatura vencida (cortesia tem prioridade).
    var temFaturaVencida = faturas.some(function (f) { return f.status === 'OVERDUE'; });
    var emAtraso = !cortesiaAtiva && (estado.status === 'inadimplente' || temFaturaVencida);
    var situacaoRotulo = viaCupom ? 'Cupom' : (emAtraso ? 'Atraso' : (cortesiaAtiva ? 'Cortesia' : (statusRotulos[estado.status] || 'Sem assinatura')));
    if (emAtraso) statusEstilo = 'background:#FEE2E2;color:#B91C1C';
    // Plano atual: "<Tipo> · mensal/anual" (pago) ou "<Tipo> · cortesia/cupom".
    var planoExibido = cortesiaAtiva
      ? tipoLabel + ' · ' + (viaCupom ? 'cupom' : 'cortesia')
      : (ciclo ? tipoLabel + ' · ' + ciclo : (estado.plano ? tipoLabel : '—'));
    // Valor e vencimento: só em plano pago (mensal/anual).
    var planoPago = !cortesiaAtiva && !!assinatura;
    var valorExibido = planoPago ? dinheiro(assinatura.valor) : '—';
    var vencimentoExibido = viaCupom
      ? (estado.validoAte ? dataAssinaturaMobile(estado.validoAte) : 'Sem prazo')
      : (planoPago ? dataAssinaturaMobile(assinatura.proximoVencimento) : '—');
    var podeContratar = !assinatura && (estado.status === 'trial' || (pessoal && estado.status === 'expirada'));
    var precoMensal = pessoal ? 'R$ 9,90' : 'R$ 34,90';
    var precoAnual = pessoal ? 'R$ 99,00' : 'R$ 348,00';
    var listaFaturas = faturas.map(function (fatura) {
      var rotulo = rotuloFaturaMobile(fatura.status);
      var paga = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].indexOf(fatura.status) >= 0;
      return '<div class="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">' +
        '<div class="min-w-0"><div class="flex flex-wrap items-center gap-1.5"><strong class="text-xs font-black text-slate-900">' + dinheiro(fatura.valor) + '</strong><span class="rounded-full px-2 py-0.5 text-[8px] font-black uppercase" style="' + rotulo[1] + '">' + rotulo[0] + '</span></div><p class="mt-1 text-[10px] font-semibold text-slate-500">Vencimento: ' + dataAssinaturaMobile(fatura.vencimento) + '</p></div>' +
        (fatura.invoiceUrl && !paga ? '<a href="' + escapeHtml(fatura.invoiceUrl) + '" target="_blank" rel="noreferrer" class="rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-2 text-[9px] font-black uppercase text-sky-700">2a via</a>' : '') +
      '</div>';
    }).join('');

    if (state.assinaturaCarregando && !detalhes) {
      return '<div class="py-12 text-center text-sm font-semibold text-slate-500">Carregando assinatura...</div>';
    }

    return '<div class="grid gap-4">' +
      (state.assinaturaErro ? '<div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">' + escapeHtml(state.assinaturaErro) + '</div>' : '') +
      (assinaturaEmCarenciaMobile() ? '<div class="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900"><strong>Pagamento pendente.</strong> Regularize ate ' + dataAssinaturaMobile(estado.validoAte) + ' para evitar o bloqueio.</div>' : '') +
      (canceladaNoFim ? '<div class="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900"><strong>Renovacao cancelada.</strong> O acesso continua ate ' + dataAssinaturaMobile(estado.validoAte) + '.</div>' : '') +
      '<div class="grid grid-cols-2 gap-2 rounded-[14px_24px_24px_24px] border border-slate-200 bg-slate-50 p-3">' +
        '<div><p class="text-[9px] font-black uppercase tracking-wide text-slate-400">Situacao</p><span class="mt-1 inline-flex rounded-full px-2 py-1 text-[9px] font-black" style="' + statusEstilo + '">' + escapeHtml(situacaoRotulo) + '</span></div>' +
        '<div><p class="text-[9px] font-black uppercase tracking-wide text-slate-400">Plano</p><strong class="mt-1 block text-xs text-slate-900">' + escapeHtml(planoExibido) + '</strong></div>' +
        '<div><p class="text-[9px] font-black uppercase tracking-wide text-slate-400">Valor</p><strong class="mt-1 block text-xs text-slate-900">' + valorExibido + '</strong></div>' +
        '<div><p class="text-[9px] font-black uppercase tracking-wide text-slate-400">Proximo vencimento</p><strong class="mt-1 block text-xs text-slate-900">' + vencimentoExibido + '</strong></div>' +
      '</div>' +
      (podeGerenciar && podeContratar ? '<div><h3 class="text-xs font-black text-slate-900">Contratar assinatura</h3><p class="mt-1 text-[10px] font-semibold leading-relaxed text-slate-500">' + (pessoal ? 'Ative os recursos Premium deste perfil.' : 'Contrate agora sem perder os dias restantes do teste.') + '</p><div class="mt-2 grid grid-cols-2 gap-1.5"><input id="assinatura-nome" type="text" value="' + escapeHtml(state.assinaturaNome || nomeEmpresa(state.empresa || {})) + '" placeholder="Nome/razão social" class="h-9 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-900 outline-none"/><input id="assinatura-cpf" type="text" inputmode="numeric" value="' + escapeHtml(state.assinaturaCpf || '') + '" placeholder="CPF/CNPJ" class="h-9 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-900 outline-none"/><input id="assinatura-email" type="email" value="' + escapeHtml(state.assinaturaEmail || emailUsuarioAtualMobile()) + '" placeholder="E-mail cobrança" class="h-9 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-900 outline-none"/><input id="assinatura-telefone" type="tel" inputmode="tel" value="' + escapeHtml(state.assinaturaTelefone || telefonePadraoMobile()) + '" placeholder="Telefone" class="h-9 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-900 outline-none"/></div><div class="mt-2 grid grid-cols-2 gap-2"><button id="assinatura-assinar-mensal" type="button" ' + (state.assinaturaAcao ? 'disabled ' : '') + 'class="h-10 rounded-xl border border-sky-300 bg-sky-50 text-[9px] font-black uppercase text-sky-700 disabled:opacity-60">' + (state.assinaturaAcao === 'assinar-mensal' ? 'Processando...' : 'Mensal · ' + precoMensal) + '</button><button id="assinatura-assinar-anual" type="button" ' + (state.assinaturaAcao ? 'disabled ' : '') + 'class="h-10 rounded-xl bg-sky-700 text-[9px] font-black uppercase text-white disabled:opacity-60">' + (state.assinaturaAcao === 'assinar-anual' ? 'Processando...' : 'Anual · ' + precoAnual) + '</button></div></div>' : '') +
      (podeGerenciar && assinatura && !canceladaNoFim && !cortesiaAtiva ? '<div><h3 class="text-xs font-black text-slate-900">Ciclo de cobranca</h3><p class="mt-1 text-[10px] font-semibold leading-relaxed text-slate-500">A mudanca vale para a proxima renovacao.</p><div class="mt-2 grid grid-cols-2 gap-2">' +
        '<button id="assinatura-mensal" type="button" ' + (state.assinaturaAcao || ciclo === 'mensal' ? 'disabled ' : '') + 'class="h-10 rounded-xl border text-[10px] font-black uppercase ' + (ciclo === 'mensal' ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-700') + ' disabled:opacity-70">' + (state.assinaturaAcao === 'mensal' ? 'Alterando...' : 'Mensal') + '</button>' +
        '<button id="assinatura-anual" type="button" ' + (state.assinaturaAcao || ciclo === 'anual' ? 'disabled ' : '') + 'class="h-10 rounded-xl border text-[10px] font-black uppercase ' + (ciclo === 'anual' ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-700') + ' disabled:opacity-70">' + (state.assinaturaAcao === 'anual' ? 'Alterando...' : 'Anual') + '</button>' +
      '</div></div>' : '') +
      '<div><div class="flex items-center justify-between"><h3 class="text-xs font-black text-slate-900">Faturas recentes</h3><button id="assinatura-atualizar" type="button" ' + (state.assinaturaCarregando ? 'disabled ' : '') + 'class="rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-sky-700 active:scale-[0.98] disabled:opacity-60">' + (state.assinaturaCarregando ? 'Atualizando...' : 'Atualizar') + '</button></div><div class="mt-2 grid gap-1.5">' + (listaFaturas || '<p class="rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-xs font-semibold text-slate-400">Nenhuma fatura disponivel.</p>') + '</div></div>' +
      (podeGerenciar && assinatura && !canceladaNoFim && !cortesiaAtiva ? (!state.assinaturaConfirmarCancelamento
        ? '<button id="assinatura-abrir-cancelamento" type="button" class="h-10 rounded-xl border border-red-200 bg-red-50 text-[10px] font-black uppercase text-red-600">Cancelar renovacao</button>'
        : '<div class="rounded-xl border border-red-200 bg-red-50 p-3"><p class="text-[10px] font-semibold leading-relaxed text-red-800">A renovacao sera interrompida. O acesso continua ate o fim do periodo pago.</p><div class="mt-2 grid grid-cols-2 gap-2"><button id="assinatura-voltar-cancelamento" type="button" class="h-9 rounded-lg border border-slate-300 bg-white text-[10px] font-black text-slate-600">Voltar</button><button id="assinatura-confirmar-cancelamento" type="button" ' + (state.assinaturaAcao ? 'disabled ' : '') + 'class="h-9 rounded-lg bg-red-600 text-[10px] font-black text-white disabled:opacity-60">' + (state.assinaturaAcao === 'cancelar' ? 'Cancelando...' : 'Confirmar') + '</button></div></div>') : '') +
    '</div>';
  }

  function organizarDashboardHtml() {
    var ordemCompleta = normalizarOrdemDashboard(state.dashboardOrdem).filter(cardDashboardPermitido);
    var ocultos = normalizarOcultosDashboard(state.dashboardOcultos);
    var ordem = ordemCompleta.filter(function (id) { return ocultos.indexOf(id) < 0; });
    var removidos = ordemCompleta.filter(function (id) { return ocultos.indexOf(id) >= 0; });

    return (
      '<div class="grid gap-2">' +
        '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold leading-relaxed text-cyan-900">Use as setas para reposicionar. Cards removidos pelo menu "..." podem ser reativados aqui.</p>' +
        (ordem.length
          ? ordem.map(function (id, index) {
          return '<div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">' +
            '<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-500">' + (index + 1) + '</span>' +
            '<span class="min-w-0 flex-1 truncate text-xs font-black text-slate-800">' + escapeHtml(tituloCardDashboard(id)) + '</span>' +
            '<button type="button" data-dashboard-move="' + escapeHtml(id) + '" data-dashboard-dir="-1" class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-700" aria-label="Subir">&uarr;</button>' +
            '<button type="button" data-dashboard-move="' + escapeHtml(id) + '" data-dashboard-dir="1" class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-700" aria-label="Descer">&darr;</button>' +
          '</div>';
        }).join('')
          : '<p class="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs font-semibold text-slate-500">Nenhum card visivel.</p>') +
        (removidos.length
          ? '<div class="mt-2 grid gap-1.5">' +
              '<p class="px-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Blocos removidos</p>' +
              removidos.map(function (id) {
                return '<div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">' +
                  '<span class="min-w-0 flex-1 truncate text-xs font-black text-slate-800">' + escapeHtml(tituloCardDashboard(id)) + '</span>' +
                  '<button type="button" data-dashboard-toggle="' + escapeHtml(id) + '" class="h-8 rounded-lg bg-cyan-600 px-3 text-[10px] font-black uppercase text-white">Reativar</button>' +
                '</div>';
              }).join('') +
            '</div>'
          : '') +
        '<button id="reset-dashboard" type="button" class="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wide text-slate-700">Restaurar ordem padr&atilde;o</button>' +
      '</div>'
    );
  }

  function organizarAtalhosHtml() {
    var opcoes = [
      { id: 'perfil', titulo: 'Trocar perfil' },
      { id: 'agenda', titulo: 'Agenda' },
      { id: 'tema', titulo: 'Modo escuro' },
      { id: 'despesasFixas', titulo: 'Despesas fixas' },
      { id: 'sistemas', titulo: 'Ir para Vendas Mobile', restrito: true },
      { id: 'nenhum', titulo: 'Nenhum' },
    ].filter(function (opcao) { return !opcao.restrito || podeTrocarSistemaMobile(); });

    function grupo(lado, titulo, selecionado) {
      return '<section class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">' +
        '<h3 class="sticky top-0 z-10 py-2 text-center text-[11px] font-black uppercase tracking-wide text-white shadow-sm" style="background-color:#003E73">' + titulo + '</h3>' +
        '<div id="atalhos-' + lado + '-scroll" data-preserve-scroll class="grid max-h-[156px] gap-1 overflow-y-auto p-1.5 overscroll-contain">' +
          opcoes.map(function (opcao) {
          var ativo = selecionado === opcao.id;
          var icone = opcao.id === 'nenhum' ? '&minus;' : iconeNavegacaoInferior(opcao.id).replace(/width="22" height="22"/g, 'width="17" height="17"');
          return '<button type="button" data-atalho-lado="' + lado + '" data-atalho-valor="' + opcao.id + '" class="flex min-h-[34px] items-center gap-2 rounded-lg border px-2.5 py-1 text-left ' + (ativo ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-white') + '">' +
            '<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md ' + (ativo ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500') + '">' + icone + '</span>' +
            '<span class="flex min-w-0 flex-1 items-center gap-2"><span class="truncate text-[11px] font-black text-slate-900">' + opcao.titulo + '</span>' + (ativo ? '<span class="shrink-0 text-[9px] font-semibold text-cyan-700">Selecionado</span>' : '') + '</span>' +
            '<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ' + (ativo ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 text-transparent') + ' text-[8px] font-black">&#10003;</span>' +
          '</button>';
          }).join('') +
        '</div>' +
      '</section>';
    }

    return '<div class="grid gap-3">' +
      '<p class="rounded-lg bg-cyan-50 px-3 py-1.5 text-[10px] font-semibold leading-relaxed text-cyan-900">Início, Lançar e Menu permanecem fixos. Escolha os atalhos laterais.</p>' +
      grupo('esquerdo', 'Atalho esquerdo', state.atalhoInferiorEsquerdo) +
      grupo('direito', 'Atalho direito', state.atalhoInferiorDireito) +
      '<button id="reset-atalhos-inferiores" type="button" class="h-9 rounded-lg bg-slate-950 px-4 text-[11px] font-black uppercase tracking-wide text-white">Restaurar Perfil e Agenda</button>' +
    '</div>';
  }

  function configurarResumoHtml() {
    var ordem = normalizarOrdemDashboard(state.dashboardOrdem).filter(cardDashboardPermitido);
    var ocultos = normalizarOcultosDashboard(state.dashboardOcultos);

    return (
      '<div class="grid gap-2">' +
        '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-cyan-900">Escolha quais cards aparecem no dashboard. Para mudar a posição, use Ordenar cards.</p>' +
        '<div class="grid gap-1">' +
          ordem.map(function (id) {
            var visivel = ocultos.indexOf(id) < 0;
            return '<button type="button" data-dashboard-toggle="' + escapeHtml(id) + '" class="flex min-h-[34px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-left">' +
              '<div class="flex min-w-0 flex-1 items-center gap-2"><p class="truncate text-[11px] font-black text-slate-900">' + escapeHtml(tituloCardDashboard(id)) + '</p><span class="shrink-0 text-[9px] font-semibold ' + (visivel ? 'text-emerald-600' : 'text-rose-600') + '">' + (visivel ? 'Ativado' : 'Desativado') + '</span></div>' +
              '<span class="relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ' + (visivel ? 'bg-emerald-500' : 'bg-rose-500') + '">' +
                '<span class="block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ' + (visivel ? 'translate-x-4' : 'translate-x-0') + '"></span>' +
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

  function abrirOpcoesCardDashboard(id, botao) {
    if (id === 'ia') return;
    if (state.dashboardOpcoesId === id) {
      state.dashboardOpcoesId = '';
      state.dashboardOpcoesPos = null;
      render();
      return;
    }
    var rect = botao && botao.getBoundingClientRect ? botao.getBoundingClientRect() : null;
    var largura = id === 'caixinha' ? 188 : 160;
    var margem = 12;
    var distancia = 10;
    var left = rect ? Math.max(margem, Math.min(window.innerWidth - largura - margem, rect.left + rect.width / 2 - largura / 2)) : margem;
    var centroBotao = rect ? rect.left + rect.width / 2 : left + largura / 2;
    state.dashboardOpcoesId = id;
    state.dashboardOpcoesPos = rect
      ? {
          left: left,
          bottom: Math.max(margem, window.innerHeight - rect.top + distancia),
          arrowLeft: Math.max(12, Math.min(largura - 20, centroBotao - left - 6)),
        }
      : null;
    render();
  }

  function removerCardDashboardMobile(id) {
    if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('organizar_dashboard'); return; }
    var ocultos = normalizarOcultosDashboard(state.dashboardOcultos);
    if (ocultos.indexOf(id) < 0) ocultos.push(id);
    state.dashboardOcultos = ocultos;
    state.dashboardOpcoesId = '';
    state.dashboardOpcoesPos = null;
    salvarResumoDashboard();
    render();
    mostrarToast('Bloco removido do resumo.');
  }

  function restaurarResumoPadrao() {
    state.dashboardOrdem = ordemDashboardPadrao();
    state.dashboardOcultos = [];
    state.dashboardOpcoesId = '';
    state.dashboardOpcoesPos = null;
    salvarResumoDashboard();
    render();
    mostrarToast('Resumo padrao restaurado.');
  }

  function moverCardDashboard(id, direcao) {
    // Premium Pessoal: organizar o dashboard é pago — avisa e mantém o padrão.
    if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('organizar_dashboard'); return; }
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
    // Premium Pessoal: organizar o dashboard é pago — avisa e mantém o padrão.
    if (premiumPessoalBloqueadoMobile()) {
      state.dragDashboardId = '';
      abrirPremiumMobile('organizar_dashboard');
      return;
    }
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
      state.recorrencias = (resp.data || []).map(function (item) {
        return Object.assign({}, item, { nome: formatarDescricao(item.nome) });
      });
      render();
    }
  }

  async function salvarNovaRecorrenciaMobile() {
    var nome = (document.getElementById('nova-recorr-nome') || {}).value || state.novaRecorrNome || '';
    var dia = parseInt((document.getElementById('nova-recorr-dia') || {}).value || state.novaRecorrDia || '0', 10);
    var descricao = (document.getElementById('nova-recorr-descricao') || {}).value || state.novaRecorrDescricao || '';
    var valorCampo = (document.getElementById('nova-recorr-valor') || {}).value || state.novaRecorrValor || '';
    var valorNum = normalizarValor(valorCampo);
    if (!valorNum && state.novaRecorrValorNumerico) valorNum = Number(state.novaRecorrValorNumerico || 0);
    var mesesFrente = parseInt((document.getElementById('nova-recorr-meses-frente') || {}).value || state.novaRecorrMesesFrente || '1', 10);
    mesesFrente = Math.max(1, Math.min(60, mesesFrente || 1));
    if (!nome || !dia || dia < 1 || dia > 31) {
      state.erro = 'Preencha a despesa e o dia (1-31).';
      render();
      return;
    }
    if (!(valorNum > 0)) {
      state.erro = 'Informe o valor da despesa fixa.';
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
    var lancarAgoraEl = document.getElementById('nova-recorr-lancar-agora');
    var lancarAgora = lancarAgoraEl ? lancarAgoraEl.checked : !!state.novaRecorrLancarAgora;
    var novosLancamentos = [];
    if (lancarAgora && valorNum > 0) {
      var hoje = new Date();
      var anoAtual = hoje.getFullYear();
      var mesAtual = meses[hoje.getMonth()];
      var lancAtual = await db.from('lancamentos').insert({
        empresa_id: empresaId,
        despesa_nome: nome,
        descricao: descricao,
        valor: valorNum,
        dia: dia,
        mes: mesAtual,
        ano: anoAtual,
        tipo_obs: 'fixa',
        status: 'prevista',
        recorrencia_id: resp.data.id,
      }).select().single();
      if (lancAtual.data && Number(lancAtual.data.ano) === Number(state.ano)) novosLancamentos.push(lancAtual.data);
    }
    if (valorNum > 0) {
      var baseIdx = indiceMes(state.mes);
      for (var mf = 1; mf <= mesesFrente; mf++) {
        var idx = (baseIdx + mf) % 12;
        var anoFuturo = Number(state.ano) + Math.floor((baseIdx + mf) / 12);
        var lancFuturo = await db.from('lancamentos').insert({
          empresa_id: empresaId,
          despesa_nome: nome,
          descricao: descricao,
          valor: valorNum,
          dia: dia,
          mes: meses[idx],
          ano: anoFuturo,
          tipo_obs: 'fixa',
          status: 'prevista',
          recorrencia_id: resp.data.id,
        }).select().single();
        if (lancFuturo.data && Number(lancFuturo.data.ano) === Number(state.ano)) novosLancamentos.push(lancFuturo.data);
      }
    }
    state.recorrencias = [resp.data].concat(state.recorrencias || []);
    if (novosLancamentos.length) {
      state.lancamentos = novosLancamentos.map(function(item) {
        return {
          id: item.id, mes: item.mes, dia: Number(item.dia), despesa: formatarDescricao(item.despesa_nome),
          descricao: item.descricao || '', valor: Number(item.valor || 0),
          status: item.status || null, tipo: item.tipo_obs || null, recorrenciaId: item.recorrencia_id || null,
        };
      }).concat(state.lancamentos || []);
    }
    state.recorrSalvando = false;
    state.novaRecorrNome = '';
    state.novaRecorrDia = '';
    state.novaRecorrDescricao = '';
    state.novaRecorrValor = '';
    state.novaRecorrValorNumerico = 0;
    state.novaRecorrLancarAgora = false;
    state.novaRecorrMesesFrente = 1;
    state.mensagem = 'Despesa fixa adicionada!';
    notificarFinanceiroAtualizadoMobile();
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
      notificarFinanceiroAtualizadoMobile();
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
    var empresaId = state.empresa.id || state.empresa.empresa_id;
    var resp = await db.from('recorrencias').update({ nome: nome, categoria: categoria, descricao: descricao, dia: dia }).eq('id', id).select().single();
    if (resp.error) {
      state.erro = 'Erro: ' + resp.error.message;
      render();
      return;
    }
    await db.from('lancamentos')
      .update({ despesa_nome: nome, descricao: descricao, dia: dia })
      .eq('empresa_id', empresaId)
      .eq('recorrencia_id', id);
    // lancar agora
    var lancarAgora = document.getElementById('edit-recorr-lancar-' + id) && document.getElementById('edit-recorr-lancar-' + id).checked;
    var valorNum = state.editRecorrValorNumerico;
    if (lancarAgora && valorNum > 0) {
      var hoje = new Date();
      await db.from('lancamentos').insert({
        empresa_id: empresaId,
        despesa_nome: nome,
        descricao: descricao,
        valor: valorNum,
        dia: dia,
        mes: meses[hoje.getMonth()],
        ano: hoje.getFullYear(),
        status: 'prevista',
        tipo_obs: 'fixa',
        recorrencia_id: id,
      });
    }
    state.recorrencias = state.recorrencias.map(function(r) {
      return r.id === id ? resp.data : r;
    });
    state.recorrEditandoId = null;
    state.editRecorrValorNumerico = 0;
    state.mensagem = 'Salvo!';
    notificarFinanceiroAtualizadoMobile();
    render();
    setTimeout(function() { state.mensagem = ''; render(); }, 1500);
  }

  async function excluirRecorrenciaMobile(id, nome) {
    if (!state.empresa) return;
    state.exclusaoRecorrencia = { id: id, nome: nome || 'Despesa fixa' };
    render();
  }

  function cancelarExclusaoRecorrenciaMobile() {
    state.exclusaoRecorrencia = null;
    render();
  }

  async function confirmarExclusaoRecorrenciaMobile() {
    if (!state.empresa || !state.exclusaoRecorrencia) return;
    var id = state.exclusaoRecorrencia.id;
    var empresaId = state.empresa.id || state.empresa.empresa_id;
    state.carregando = true;
    render();
    var lancamentosResp = await db.from('lancamentos').delete().eq('empresa_id', empresaId).eq('recorrencia_id', id);
    if (lancamentosResp.error) {
      state.carregando = false;
      state.exclusaoRecorrencia = null;
      state.erro = 'Nao foi possivel remover os lancamentos desta despesa fixa.';
      render();
      return;
    }
    var resp = await db.from('recorrencias').delete().eq('id', id);
    if (!resp.error) {
      state.recorrencias = state.recorrencias.filter(function(r) { return r.id !== id; });
      state.lancamentos = (state.lancamentos || []).filter(function(l) { return l.recorrenciaId !== id; });
      if (state.recorrEditandoId === id) state.recorrEditandoId = null;
      state.exclusaoRecorrencia = null;
      state.carregando = false;
      notificarFinanceiroAtualizadoMobile();
      render();
      mostrarToast('Despesa fixa excluida.');
      return;
    }
    state.carregando = false;
    state.exclusaoRecorrencia = null;
    state.erro = 'Nao foi possivel excluir esta despesa fixa.';
    render();
  }

  function confirmacaoExclusaoRecorrenciaHtml() {
    var item = state.exclusaoRecorrencia;
    if (!item) return '';
    return (
      '<div id="excluir-recorrencia-overlay" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 px-4 pt-4 backdrop-blur-sm" style="padding-bottom:calc(env(safe-area-inset-bottom) + 78px)">' +
        '<section class="w-full max-w-sm overflow-y-auto rounded-3xl bg-white shadow-2xl" style="max-height:calc(100dvh - env(safe-area-inset-bottom) - 102px)">' +
          '<div class="flex items-center justify-between gap-3 px-4 py-3 text-white" style="background-color:#003E73">' +
            '<div class="min-w-0">' +
              '<p class="text-[10px] font-black uppercase tracking-wide text-cyan-100/75">Confirmar exclusao</p>' +
              '<h2 class="truncate text-base font-black">Excluir despesa fixa</h2>' +
            '</div>' +
            '<button id="cancelar-exclusao-recorrencia-topo" type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white" aria-label="Fechar">' + iconeFecharGeometricoMobile() + '</button>' +
          '</div>' +
          '<div class="p-4">' +
            '<div class="rounded-2xl border border-red-100 bg-red-50 p-4">' +
              '<p class="text-sm font-black text-slate-900">' + escapeHtml(item.nome) + '</p>' +
              '<p class="mt-1.5 text-xs font-semibold leading-relaxed text-slate-600">Esta acao exclui a despesa fixa e todos os lancamentos mensais gerados por ela. A exclusao nao pode ser desfeita.</p>' +
            '</div>' +
            '<div class="mt-4 grid grid-cols-2 gap-2">' +
              '<button id="cancelar-exclusao-recorrencia" type="button" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase text-slate-600">Cancelar</button>' +
              '<button id="confirmar-exclusao-recorrencia" type="button" ' + (state.carregando ? 'disabled ' : '') + 'class="h-11 rounded-xl bg-red-600 px-3 text-xs font-black uppercase text-white shadow-sm disabled:opacity-60">' + (state.carregando ? 'Excluindo...' : 'Excluir') + '</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
      '</div>'
    );
  }

  function confirmacaoResetCaixinhaHtml() {
    return (
      '<div id="reset-caixinha-overlay" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 px-4 pt-4 backdrop-blur-sm" style="padding-bottom:calc(env(safe-area-inset-bottom) + 78px)">' +
        '<section class="w-full max-w-sm overflow-y-auto rounded-3xl bg-white shadow-2xl" style="max-height:calc(100dvh - env(safe-area-inset-bottom) - 102px)">' +
          '<div class="flex items-center justify-between gap-3 px-4 py-3 text-white" style="background-color:#003E73">' +
            '<div class="min-w-0">' +
              '<p class="text-[10px] font-black uppercase tracking-wide text-cyan-100/75">Confirmar ação</p>' +
              '<h2 class="truncate text-base font-black">Resetar Caixinha</h2>' +
            '</div>' +
            '<button id="cancelar-reset-caixinha-topo" type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white" aria-label="Fechar">' + iconeFecharGeometricoMobile() + '</button>' +
          '</div>' +
          '<div class="p-4">' +
            '<div class="rounded-2xl border border-red-100 bg-red-50 p-4">' +
              '<p class="text-sm font-black text-slate-900">Resetar total da Caixinha?</p>' +
              '<p class="mt-1.5 text-xs font-semibold leading-relaxed text-slate-600">Esta ação apaga o aporte inicial, remove todos os movimentos da Caixinha e exclui as despesas geradas pelos aportes. A ação não pode ser desfeita.</p>' +
            '</div>' +
            '<div class="mt-4 grid grid-cols-2 gap-2">' +
              '<button id="cancelar-reset-caixinha" type="button" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase text-slate-600">Cancelar</button>' +
              '<button id="confirmar-reset-caixinha" type="button" ' + (state.carregando ? 'disabled ' : '') + 'class="h-11 rounded-xl bg-red-600 px-3 text-xs font-black uppercase text-white shadow-sm disabled:opacity-60">' + (state.carregando ? 'Resetando...' : 'Resetar') + '</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
      '</div>'
    );
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
          '<label class="grid gap-1 text-[10px] font-black uppercase tracking-wide text-slate-600">Aplicar nos próximos meses' +
            '<input id="nova-recorr-meses-frente" type="number" min="1" max="60" value="' + escapeHtml(String(state.novaRecorrMesesFrente || 1)) + '" style="font-size:16px" class="h-10 rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-cyan-500" />' +
          '</label>' +
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
          '<div class="grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-3">' +
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

  function iconeCompartilharSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 12v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>';
  }

  function instalarIosHtml() {
    return '<div class="space-y-3 text-sm leading-relaxed text-slate-600">' +
      '<p>No seu navegador, toque no bot&atilde;o <strong>Compartilhar</strong> <span class="inline-flex h-5 w-5 align-middle items-center justify-center text-sky-600">' + iconeCompartilharSvg() + '</span>.</p>' +
      '<p>Depois escolha <strong>Adicionar &agrave; Tela de In&iacute;cio</strong>.</p>' +
      '<p>Confirme o nome para abrir como aplicativo.</p>' +
      '<p class="text-xs font-semibold text-slate-500">Se n&atilde;o aparecer, procure no menu do navegador por Compartilhar ou Adicionar &agrave; tela inicial.</p>' +
    '</div>';
  }

  function instalarAndroidHtml() {
    return '<div class="space-y-3 text-sm leading-relaxed text-slate-600"><p>Quando o navegador permitir, use a opcao <strong>Instalar app</strong> ou <strong>Adicionar a tela inicial</strong>.</p><p>Se nao aparecer agora, abra o menu do navegador e procure por <strong>Instalar app</strong> ou <strong>Adicionar a tela inicial</strong>.</p></div>';
  }

  function termosMobileHtml() {
    return (
      '<div class="space-y-4 text-sm leading-relaxed text-slate-600">' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">1. Aceitação e versão vigente</h3><p>Ao criar conta, acessar ou utilizar o AvantaLab Gestão, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso e com a Política de Privacidade vigente. O aceite poderá ser registrado com data, hora, versão do documento e dados técnicos necessários para comprovação.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">2. Finalidade da plataforma</h3><p>O AvantaLab Gestão é uma ferramenta de apoio à organização, controle e análise de informações financeiras, administrativas e operacionais, incluindo lançamentos, receitas, despesas, relatórios, indicadores, agenda, notificações, backup, restauração, controle de ponto quando habilitado e recursos de apoio por automação ou inteligência artificial.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">3. Conta e credenciais</h3><p>O usuário deve fornecer informações verdadeiras e manter a confidencialidade de suas credenciais. Cada acesso realizado com login e senha válidos poderá ser considerado como realizado pelo titular da conta, salvo prova de falha exclusiva da plataforma.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">4. Responsabilidade pelas informações</h3><p>O usuário e a empresa ou perfil financeiro vinculado são responsáveis pela veracidade, atualização, licitude, autorização de uso e conferência dos dados inseridos no sistema, incluindo dados financeiros, administrativos, de clientes, colaboradores, fornecedores, agenda, ponto e demais registros.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">5. Proteção de dados e LGPD</h3><p>O tratamento de dados pessoais observará a LGPD. Para dados de conta, autenticação, cobrança, suporte, segurança e relacionamento, o AvantaLab poderá atuar como controlador. Para dados operacionais inseridos pelo usuário, o AvantaLab atuará, em regra, como operador, conforme instruções do usuário ou da empresa responsável.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">6. Uso adequado</h3><p>É vedado inserir dados sem autorização legal, tentar acessar dados de terceiros sem permissão, burlar controles de acesso, explorar falhas, sobrecarregar a infraestrutura ou utilizar o sistema para finalidade ilícita.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">7. Disponibilidade e terceiros</h3><p>Podem ocorrer interrupções por manutenção, atualizações, falhas técnicas, internet, provedores de nuvem, banco de dados, autenticação, pagamento, notificações, SMS, email, inteligência artificial ou outros serviços de terceiros necessários à operação.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">8. Backup, restauração e guarda</h3><p>A plataforma pode oferecer backup e restauração, mas a conferência do arquivo, a guarda de cópias próprias e a escolha correta do modo de restauração são de responsabilidade do usuário. Importações e substituições podem alterar registros existentes conforme confirmação exibida na interface.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">9. Planos, cobrança e acesso</h3><p>Recursos poderão depender de plano, cortesia, cupom, teste ou pagamento vigente. Falta de pagamento, encerramento de cortesia, violação dos Termos ou uso indevido poderá resultar em limitação, suspensão ou bloqueio do acesso, preservadas as regras de guarda, exportação e retenção aplicáveis.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">10. Segurança da conta</h3><p>O usuário deve proteger dispositivos, senhas, códigos de acesso e sessões autenticadas. O AvantaLab poderá adotar validações, bloqueios preventivos, logs técnicos e controles de acesso para reduzir riscos.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">11. Limitação de responsabilidade</h3><p>O AvantaLab Gestão é uma ferramenta de apoio gerencial e não substitui contabilidade, auditoria, consultoria financeira, jurídica, trabalhista, fiscal ou previdenciária. Decisões tomadas com base nas informações exibidas são de responsabilidade do usuário.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">12. Propriedade intelectual</h3><p>Sistema, telas, layout, marca, textos, fluxos, componentes, códigos e identidade visual pertencem ao AvantaLab ou a seus licenciantes. O uso da plataforma não transfere direitos de propriedade intelectual ao usuário.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">13. Encerramento, exclusão e retenção</h3><p>O usuário poderá solicitar encerramento, exclusão de perfil ou eliminação de dados, quando aplicável. Algumas informações poderão ser mantidas para obrigações legais, fiscais, auditoria, segurança, prevenção a fraudes, exercício regular de direitos ou backups técnicos por prazo limitado.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">14. Alterações dos termos</h3><p>Estes Termos poderão ser atualizados para refletir melhorias, mudanças operacionais, comerciais, legais ou funcionais. Mudanças relevantes poderão exigir novo aceite.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">15. Legislação e contato</h3><p>Estes Termos são regidos pela legislação brasileira. Dúvidas, solicitações ou comunicações devem ser encaminhadas pelos canais oficiais de suporte ou contato do AvantaLab.</p></section>' +
      '</div>'
    );
  }

  function privacidadeMobileHtml() {
    return (
      '<div class="space-y-4 text-sm leading-relaxed text-slate-600">' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">1. Objetivo desta política</h3><p>Esta Política explica como o AvantaLab Gestão coleta, utiliza, armazena, compartilha, protege e elimina dados pessoais e informações fornecidas pelos usuários, em conformidade com a LGPD.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">2. Agentes de tratamento</h3><p>Para dados de conta, autenticação, cobrança, suporte, segurança e relacionamento, o AvantaLab poderá atuar como controlador. Para dados financeiros, administrativos, operacionais e de colaboradores inseridos pelo usuário, atuará, em regra, como operador. Provedores de nuvem, banco, hospedagem, autenticação, pagamento, mensagens, notificações e IA poderão atuar como suboperadores.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">3. Informações coletadas</h3><p>Poderemos tratar nome, email, telefone, credenciais, versão e data do aceite, perfil financeiro, empresa, preferências, identificadores técnicos, receitas, despesas, valores, descrições, categorias, agenda, relatórios, backups, usuários vinculados, cobrança e, quando usado o ponto, nome, CPF, cargo, horários, registros e localização configurada.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">4. Finalidades de uso</h3><p>Os dados são utilizados para criar e proteger contas, autenticar usuários, permitir o uso da plataforma, salvar configurações, gerar relatórios, executar backups, enviar avisos, prestar suporte, processar cobranças, cumprir obrigações legais, prevenir fraudes, investigar incidentes e manter a segurança do sistema.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">5. Bases legais</h3><p>O tratamento poderá se apoiar em execução de contrato, procedimentos preliminares, obrigação legal ou regulatória, exercício regular de direitos, legítimo interesse, prevenção a fraudes e segurança, proteção do crédito, consentimento quando exigido e demais hipóteses permitidas pela LGPD.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">6. Dados de terceiros</h3><p>Ao inserir dados de colaboradores, clientes, fornecedores ou terceiros, o usuário declara possuir base legal, autorização ou legitimidade para esse tratamento. A plataforma não deve ser usada para inserir dados sensíveis desnecessários.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">7. Compartilhamento</h3><p>O AvantaLab não vende dados pessoais. Dados poderão ser compartilhados apenas para operar a plataforma, hospedar dados, autenticar usuários, processar pagamentos, enviar comunicações, notificações, SMS ou emails, prestar suporte, acionar IA quando solicitada, cumprir obrigações legais ou proteger direitos.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">8. Armazenamento e transferência</h3><p>Os dados são armazenados em ambiente digital com banco de dados, autenticação, hospedagem e infraestrutura em nuvem. Alguns fornecedores podem manter infraestrutura no Brasil ou no exterior, o que pode envolver transferência internacional vinculada à prestação do serviço.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">9. Retenção, exclusão e backups</h3><p>Os dados serão mantidos enquanto a conta, perfil, contrato, cortesia, cupom ou relação operacional estiver ativo e pelo tempo necessário para obrigações legais, fiscais, contábeis, auditoria, prevenção a fraudes, segurança, suporte, cobrança ou exercício regular de direitos. Após exclusão válida, dados poderão sair da base ativa, ressalvadas retenções obrigatórias e backups técnicos até sua rotação.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">10. Segurança</h3><p>São adotadas medidas técnicas e organizacionais proporcionais, como controle de acesso, autenticação, permissões, registros técnicos, backups, criptografia de tráfego, segregação por perfil e práticas de desenvolvimento seguro. Ainda assim, nenhum sistema digital é totalmente imune a riscos.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">11. Cookies e tecnologias semelhantes</h3><p>Podemos utilizar cookies, armazenamento local e tecnologias semelhantes necessários ao funcionamento, autenticação, segurança, sessão, preferências, modo escuro e configurações. Cookies não essenciais serão informados e poderão ser gerenciados quando aplicável.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">12. IA, notificações e suporte</h3><p>Quando o usuário acionar assistente de IA, análises automáticas, notificações ou suporte, dados necessários ao contexto poderão ser processados para gerar resposta, orientação, aviso ou atendimento. O usuário deve evitar enviar dados pessoais excessivos ou sensíveis.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">13. Direitos dos titulares</h3><p>O titular poderá solicitar confirmação, acesso, correção, atualização, portabilidade, anonimização, bloqueio, eliminação, informação sobre compartilhamento, revogação de consentimento e oposição a tratamento irregular, respeitadas obrigações legais, contratuais, fiscais, segurança e demais hipóteses que autorizem retenção.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">14. Incidentes de segurança</h3><p>Em incidente que possa acarretar risco ou dano relevante aos titulares, o AvantaLab adotará medidas de apuração, contenção e comunicação cabíveis, incluindo comunicação aos titulares afetados e à ANPD quando exigido.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">15. Responsabilidade do usuário</h3><p>O usuário deve proteger credenciais e dispositivos, revisar permissões de usuários vinculados, conferir informações inseridas e garantir autorização para tratar dados pessoais de terceiros dentro da plataforma.</p></section>' +
        '<section><h3 class="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">16. Alterações e contato</h3><p>Esta Política poderá ser atualizada para refletir melhorias, novas funcionalidades ou mudanças legais. Mudanças relevantes poderão exigir novo aceite. Solicitações sobre privacidade ou proteção de dados devem ser encaminhadas pelos canais oficiais do AvantaLab.</p></section>' +
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
    if (typeof window._avaMenuScrollTravado === 'number') {
      _scrollContainers['menu-aside'] = window._avaMenuScrollTravado;
    }
    root.setAttribute('data-avantalab-mobile-ready', '1');
    if (!state.chatIAAberto) configurarCamadaFundoChatIA(false);
    removerChatIAOverlay();
    var telaAtual;
    if (previaConfirmacaoCelular) telaAtual = telaTelefoneObrigatorioMobile(true);
    else if (!state.pronto) telaAtual = telaCarregandoMobile();
    else if (state.falhaAcesso) telaAtual = telaAvisoMobile('Não foi possível concluir o acesso', state.falhaAcesso);
    else if (!state.autenticado) telaAtual = state.modoCriarPerfil ? telaLoginWrapper(telaCriarPerfilInicial(), 'Criar perfil financeiro', 'Informe os dados do seu primeiro perfil.') : telaLogin();
    else if (ehFuncionarioPontoMobile()) telaAtual = telaRedirecionandoPonto();
    else if (state.seletorSistemaAberto && state.seletorSistemaInicialBloqueante) telaAtual = seletorSistemaInicialHtml();
    else if (state.validacaoTelefoneObrigatoria) telaAtual = telaTelefoneObrigatorioMobile(false);
    else if (state.paywallCadastroCiclo) telaAtual = telaCadastroPerfilMobile('paywall');
    else if (state.paywallAtivo) telaAtual = telaPaywallMobile();
    else if (state.cadastroPerfilErro) telaAtual = telaErroCadastroPerfilMobile();
    else if (deveExibirCadastroPerfilMobile()) telaAtual = telaCadastroPerfilMobile(state.cadastroPerfilStatus.obrigatorio ? 'bloqueio' : 'lembrete');
    else if (state.cadastroPerfilEditando) telaAtual = telaCadastroPerfilMobile('edicao');
    else if (state.modoCriarPerfil) telaAtual = telaLoginWrapper(telaCriarPerfilInicial(), 'Criar perfil financeiro', 'Informe os dados do seu primeiro perfil.');
    else if (!state.paywallVerificado) telaAtual = telaCarregandoMobile();
    else telaAtual = telaApp();
    root.innerHTML = telaAtual + (state.chatIAAberto ? chatIAModalHtml() : '') + (state.mostrarPromptNotificacoes ? promptNotificacoesHtml() : '') + (state.tourAberto ? tourHtml() : '') + avisoAssinanteMobileHtml() + avisoDuplicadoMobileHtml() + ativacaoVendasMobileHtml() + (state.seletorSistemaInicialBloqueante ? '' : seletorSistemaInicialHtml());
    sincronizarProgressoAcessoMobile();
    sincronizarGradienteHeaderPerfil();
    configurarRecolhimentoPerfilHeader();
    var indicadorNav = document.querySelector('[data-nav-indicador]');
    if (indicadorNav) {
      var destinoNav = Number(indicadorNav.getAttribute('data-nav-destino')) || 0;
      window.requestAnimationFrame(function () {
        indicadorNav.style.transform = 'translateX(' + (destinoNav * 100) + '%)';
        window._avaNavIndice = destinoNav;
      });
    }
    atualizarScrollBloqueado(_scrollPrevio);
    // Restaura o scrollTop dos containers internos preservados.
    for (var _id in _scrollContainers) {
      var _alvo = document.getElementById(_id);
      if (_alvo) _alvo.scrollTop = _scrollContainers[_id];
      (function (idPreservado, scrollPreservado) {
        window.requestAnimationFrame(function () {
          var alvoPreservado = document.getElementById(idPreservado);
          if (alvoPreservado) alvoPreservado.scrollTop = scrollPreservado;
        });
      })(_id, _scrollContainers[_id]);
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
    bind('escolher-sistema-gestao', function () { escolherSistemaInicialMobile('gestao'); });
    bind('escolher-sistema-vendas', function () { escolherSistemaInicialMobile('vendas'); });
    bindChange('lembrar-sistema-inicial', function () { state.lembrarSistemaInicial = this.checked === true; });
    bind('cancelar-ativacao-vendas', fecharAtivacaoVendasMobile);
    bind('confirmar-ativacao-vendas', ativarVendasMobileNoPerfil);
    bind('reenviar-telefone-obrigatorio', enviarCodigoTelefoneObrigatorioMobile);
    bindChange('ddi-telefone-obrigatorio', function (e) { state.ddiTelefoneObrigatorio = (e.target && e.target.value ? e.target.value : '55').replace(/\D/g, ''); });
    bind('sair-telefone-obrigatorio', sair);
    bind('cp-depois', adiarCadastroPerfilMobile);
    bind('cp-salvar-parcial', salvarCadastroPerfilParcialMobile);
    bind('cp-voltar', function () { state.paywallCadastroCiclo = ''; render(); });
    bind('cp-buscar-cep', buscarCepCadastroPerfilMobile);
    bind('cp-salvar', salvarCadastroPerfilMobile);
    bind('cp-fechar-edicao', fecharEdicaoCadastroPerfilMobile);
    bind('cp-cancelar-edicao', fecharEdicaoCadastroPerfilMobile);
    bind('cp-tentar-novamente', carregarDados);
    bindChange('cp-tipo-empresa', function () { capturarCadastroPerfilMobile(); state.cadastroPerfilDados.documento = ''; render(); });
    bindChange('cp-ie-isento', function () { var el = document.getElementById('cp-ie'); if (el) { el.disabled = this.checked; if (this.checked) el.value = ''; } });
    bindChange('cp-im-isento', function () { var el = document.getElementById('cp-im'); if (el) { el.disabled = this.checked; if (this.checked) el.value = ''; } });
    Array.prototype.forEach.call(document.querySelectorAll('[id^="cp-"]'), function (elementoCadastro) {
      if (!/^(INPUT|SELECT)$/.test(elementoCadastro.tagName)) return;
      elementoCadastro.addEventListener('input', capturarCadastroPerfilMobile);
      elementoCadastro.addEventListener('change', capturarCadastroPerfilMobile);
      elementoCadastro.addEventListener('blur', agendarAutoSaveCadastroPerfilMobile);
    });

    bind('entrar', entrar);
    bind('entrar-google', entrarGoogle);
    bind('login-tipo-email', function () {
      state.loginValor = campo('login').trim();
      state.loginTipo = 'email';
      limparAlertasAcessoMobile();
      render();
    });
    bind('login-tipo-telefone', function () {
      state.loginValor = campo('login').trim();
      state.loginTipo = 'telefone';
      limparAlertasAcessoMobile();
      render();
    });
    bindInput('login', function () {
      if (state.loginTipo === 'telefone') this.value = formatarTelefoneCadastroMobile(this.value, '55');
      state.loginValor = this.value;
    });
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
      limparAlertasAcessoMobile();
      render();
    });
    bind('voltar-login-cadastro', function () {
      state.telaAcesso = 'login';
      state.modoCadastro = false;
      state.smsCadastroEnviado = false;
      limparAlertasAcessoMobile();
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
    bindChange('cadastro-aceite', function (e) { state.aceitouTermos = !!(e.target && e.target.checked); salvarRascunhoCadastroMobile(); });
    bindChange('cadastro-ddi', function (e) {
      state.cadastroDdi = (e.target && e.target.value ? e.target.value : '55').replace(/\D/g, '');
      var telefoneCadastro = document.getElementById('cadastro-telefone');
      if (telefoneCadastro) {
        telefoneCadastro.value = formatarTelefoneCadastroMobile(telefoneCadastro.value, state.cadastroDdi);
      }
      lerCadastroDaTela();
      salvarRascunhoCadastroMobile();
    });
    bindInput('cadastro-telefone', function () {
      this.value = formatarTelefoneCadastroMobile(this.value, state.cadastroDdi);
      state.cadastro.telefone = this.value.replace(/\D/g, '');
      salvarRascunhoCadastroMobile();
    });
    ['cadastro-empresa', 'cadastro-nome', 'cadastro-email', 'cadastro-senha', 'cadastro-confirmar-senha'].forEach(function (idCadastro) {
      bindInput(idCadastro, function () { lerCadastroDaTela(); salvarRascunhoCadastroMobile(); });
    });
    bindInput('cadastro-cupom', function () { lerCadastroDaTela(); salvarRascunhoCadastroMobile(); });
    bind('cadastro-termos-link', function () {
      lerCadastroDaTela();
      var chk = document.getElementById('cadastro-aceite');
      if (chk) state.aceitouTermos = chk.checked;
      abrirModalMenu('termos');
    });
    bind('cadastro-privacidade-link', function () {
      lerCadastroDaTela();
      var chk = document.getElementById('cadastro-aceite');
      if (chk) state.aceitouTermos = chk.checked;
      abrirModalMenu('privacidade');
    });
    bind('cadastro-tipo-empresa', function () { lerCadastroDaTela(); state.cadastroTipoPerfil = 'empresa'; salvarRascunhoCadastroMobile(); render(); });
    bind('cadastro-tipo-pessoal', function () { lerCadastroDaTela(); state.cadastroTipoPerfil = 'pessoal'; salvarRascunhoCadastroMobile(); render(); });
    bind('criar-perfil-inicial-submit', criarPerfilInicial);
    bind('sair-criar-perfil', function () { state.modoCriarPerfil = false; sair(); });
    bind('criar-perfil-empresa', function () { state.criarPerfilTipo = 'empresa'; render(); });
    bind('criar-perfil-pessoal', function () { state.criarPerfilTipo = 'pessoal'; render(); });
    bind('inicio-empresa-trial', function () { state.inicioEmpresaModo = 'trial'; render(); });
    bind('inicio-empresa-assinar', function () { state.inicioEmpresaModo = 'assinar'; render(); });
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

    bind('fechar-menu', fecharMenuLateralAnimado);
    var menuOverlay = document.getElementById('menu-overlay');
    if (menuOverlay) {
      menuOverlay.addEventListener('click', function (event) {
        if (event.target !== menuOverlay) return;
        fecharMenuLateralAnimado();
      });
    }
    bind('menu-configurar-resumo', function () { fecharMenuLateralAnimado(function () { if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('organizar_dashboard'); return; } abrirModalMenu('configurarResumo'); }); });
    bind('menu-usuario', function () { fecharMenuLateralAnimado(abrirUsuariosMobile); });
    bind('menu-gerenciar', function () { fecharMenuLateralAnimado(function () { abrirModalMenu('gerenciar'); }); });
    bind('menu-cadastro-perfil', function () { fecharMenuLateralAnimado(function () { abrirEdicaoCadastroPerfilMobile(false); }); });
    bind('menu-assinatura', function () { fecharMenuLateralAnimado(abrirAssinaturaMobile); });
    bind('menu-organizar-dashboard', function () { fecharMenuLateralAnimado(function () { if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('organizar_dashboard'); return; } abrirModalMenu('organizarDashboard'); }); });
    bind('menu-organizar-atalhos', function () { fecharMenuLateralAnimado(function () { if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('organizar_atalhos'); return; } abrirModalMenu('organizarAtalhos'); }); });
    // Premium Pessoal: CTA e cupom do modal de upgrade
    bind('premium-assinar', function () { state.modalMenu = ''; state.premiumRecursoDestaque = ''; abrirAssinaturaMobile(); });
    bind('premium-cupom-aplicar', aplicarCupomPremiumMobile);
    bind('menu-agenda', function () { fecharMenuLateralAnimado(abrirAgendaMobile); });
    bind('menu-avisos', function () { fecharMenuLateralAnimado(abrirNotificacoesMobile); });
    async function executarChaveMenuSemMover(id, acao) {
      var aside = document.getElementById('menu-aside');
      var scrollAtual = aside ? aside.scrollTop : 0;
      window._avaMenuScrollTravado = scrollAtual;
      try {
        await acao();
      } finally {
        if (state.menuAberto) render();
        var restaurarPosicao = function () {
          var asideAtual = document.getElementById('menu-aside');
          if (asideAtual) asideAtual.scrollTop = scrollAtual;
        };
        window.requestAnimationFrame(function () {
          restaurarPosicao();
          var botaoAtual = document.getElementById(id);
          if (botaoAtual) {
            try { botaoAtual.focus({ preventScroll: true }); }
            catch (e) { botaoAtual.focus(); restaurarPosicao(); }
          }
          window.requestAnimationFrame(restaurarPosicao);
        });
        setTimeout(function () {
          restaurarPosicao();
          delete window._avaMenuScrollTravado;
        }, 180);
      }
    }

    bind('menu-notificacoes', function () {
      executarChaveMenuSemMover('menu-notificacoes', alternarNotificacoesMobile);
    });
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
    bind('menu-tutorial', function () { fecharMenuLateralAnimado(abrirTourMobile); });
    bind('menu-trocar-sistema', function () { fecharMenuLateralAnimado(abrirFluxoSistemasMobile); });
    bind('tour-pular', fecharTourMobile);
    bind('tour-concluir', fecharTourMobile);
    bind('tour-anterior', function () { tourIr(-1); });
    bind('tour-proximo', function () { tourIr(1); });
    bind('menu-categorias', function () { fecharMenuLateralAnimado(function () { abrirModalMenu('categorias'); }); });
    bind('menu-despesas-fixas', function () { fecharMenuLateralAnimado(abrirModalMenuDespesasFixas); });
    bind('menu-ajuda-categorias', function () { fecharMenuLateralAnimado(function () { abrirModalMenu('ajudaCategorias'); }); });
    bind('menu-vendas-mobile', function () {
      fecharMenuLateralAnimado(function () {
        if (!state.empresa || !state.empresa.id || !podeGerenciarConteudoVendas()) return;
        window.dispatchEvent(new CustomEvent('avantalab:open-vendas-conteudo', {
          detail: {
            empresaId: state.empresa.id,
            nomeEmpresa: nomeEmpresa(state.empresa),
            darkMode: !!state.darkMode,
            corPrimaria: '#003E73'
          }
        }));
      });
    });
    bind('menu-instalar', function () { fecharMenuLateralAnimado(instalarApp); });
    bind('menu-duplicados', function () {
      executarChaveMenuSemMover('menu-duplicados', alternarDuplicados);
    });
    bind('menu-tema', function () {
      executarChaveMenuSemMover('menu-tema', trocarTema);
    });
    bind('menu-inicio-valores-ocultos', function () {
      executarChaveMenuSemMover('menu-inicio-valores-ocultos', alternarInicioValoresOcultos);
    });
    function acionarBackupMobile(acao) {
      // Premium Pessoal: backup/restauração é recurso pago no plano grátis.
      if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('exportacao'); return; }
      if (!podeGerenciarUsuarios()) {
        mostrarToast('Voce nao tem permissao para esta acao.');
        return;
      }
      var detalhe = {
        acao: acao,
        dados: {
          empresaId: state.empresa && state.empresa.id,
          nomePerfil: nomeEmpresa(state.empresa),
          tipoPerfil: state.empresa && state.empresa.tipo_perfil,
          despesasCadastradas: state.despesas.map(function (item) { return { nome: item.nome, categoria: item.categoria }; }),
          darkMode: state.darkMode,
          duplicadosAtivo: state.duplicadosAtivo
        }
      };
      fecharMenuLateralAnimado(function () {
        window.dispatchEvent(new CustomEvent('avantalab:mobile-backup', { detail: detalhe }));
      });
    }
    bind('menu-backup', function () { acionarBackupMobile('backup'); });
    bind('menu-restauracao', function () { acionarBackupMobile('restauracao'); });
    bind('menu-config-toggle', function () {
      if (state.menuConfigAberto) {
        if (state.menuConfigAnimacao === 'sair') return;
        state.menuConfigAnimacao = 'sair';
        render();
        setTimeout(function () {
          state.menuConfigAberto = false;
          state.menuConfigAnimacao = '';
          render();
        }, 225);
      } else {
        state.menuConfigAberto = true;
        state.menuConfigAnimacao = 'entrar';
        render();
        setTimeout(function () {
          if (state.menuConfigAberto && state.menuConfigAnimacao === 'entrar') state.menuConfigAnimacao = '';
        }, 270);
        setTimeout(function () {
          var aside = document.getElementById('menu-aside');
          if (!aside || !state.menuConfigAberto) return;
          window.requestAnimationFrame(function () {
            var limite = Math.max(0, aside.scrollHeight - aside.clientHeight);
            aside.scrollTo({ top: limite, behavior: 'smooth' });
          });
        }, 285);
      }
    });
    bind('menu-feedback', function () { fecharMenuLateralAnimado(abrirFeedbackMobile); });
    bind('fechar-modal-menu', fecharModalMenu);
    bind('aviso-carencia-assinatura', abrirAssinaturaMobile);
    bind('assinatura-atualizar', carregarAssinaturaMobile);
    bind('assinatura-mensal', function () { alterarAssinaturaMobile('mensal'); });
    bind('assinatura-anual', function () { alterarAssinaturaMobile('anual'); });
    bind('assinatura-assinar-mensal', function () { assinarPeloPainelMobile('mensal'); });
    bind('assinatura-assinar-anual', function () { assinarPeloPainelMobile('anual'); });
    bind('assinatura-abrir-cancelamento', function () { state.assinaturaConfirmarCancelamento = true; render(); });
    bind('assinatura-voltar-cancelamento', function () { state.assinaturaConfirmarCancelamento = false; render(); });
    bind('assinatura-confirmar-cancelamento', cancelarAssinaturaMobile);
    Array.prototype.forEach.call(document.querySelectorAll('[data-detalhar-tipo-despesa]'), function (item) {
      item.addEventListener('click', function () {
        state.tipoDespesaDetalhe = item.getAttribute('data-detalhar-tipo-despesa') || '';
        state.modalMenu = 'detalheTipoDespesa';
        render();
      });
    });
    bind('abrir-resumo-ponto-mobile', function () { abrirRelatorioPontoMobile('', ''); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ponto-relatorio-user]'), function (item) {
      item.addEventListener('click', function () {
        abrirRelatorioPontoMobile(
          item.getAttribute('data-ponto-relatorio-user') || '',
          item.getAttribute('data-ponto-relatorio-nome') || ''
        );
      });
    });

    // Despesas fixas mobile
    bind('salvar-nova-recorrencia', salvarNovaRecorrenciaMobile);

    var novaRecorrNomeEl = document.getElementById('nova-recorr-nome');
    if (novaRecorrNomeEl) {
      novaRecorrNomeEl.addEventListener('change', function(e) {
        state.novaRecorrNome = e.target.value || '';
      });
    }
    var novaRecorrDiaEl = document.getElementById('nova-recorr-dia');
    if (novaRecorrDiaEl) {
      novaRecorrDiaEl.addEventListener('input', function(e) {
        state.novaRecorrDia = e.target.value || '';
      });
    }
    var novaRecorrDescricaoEl = document.getElementById('nova-recorr-descricao');
    if (novaRecorrDescricaoEl) {
      novaRecorrDescricaoEl.addEventListener('input', function(e) {
        state.novaRecorrDescricao = e.target.value || '';
      });
    }
    var novaRecorrLancarEl = document.getElementById('nova-recorr-lancar-agora');
    if (novaRecorrLancarEl) {
      novaRecorrLancarEl.addEventListener('change', function(e) {
        state.novaRecorrLancarAgora = !!e.target.checked;
      });
    }
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
    var novaRecorrMesesEl = document.getElementById('nova-recorr-meses-frente');
    if (novaRecorrMesesEl) {
      novaRecorrMesesEl.addEventListener('input', function(e) {
        state.novaRecorrMesesFrente = Math.max(1, Math.min(60, parseInt(e.target.value || '1', 10) || 1));
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
    bind('trocar-empresa-gerenciar', function () { state.modalMenuRetorno = 'gerenciar'; abrirModalMenu('empresa'); });
    bind('termos-mobile', function () { abrirModalMenu('termos'); });
    bind('privacidade-mobile', function () { abrirModalMenu('privacidade'); });
    bind('sobre-mobile', function () { abrirSobreMobile(); });
    bind('abrir-edicao-empresa-mobile', abrirEdicaoEmpresaMobile);
    bind('abrir-cadastro-completo-mobile', function () { abrirEdicaoCadastroPerfilMobile(true); });
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
      abrirNotificacoesMobile();
    });
    bind('ir-vendas-header', abrirFluxoSistemasMobile);
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
    bind('abrir-insights-ava', function () {
      if (recursoExclusivoAssinanteMobile()) {
        mostrarAvisoAssinanteMobile('Insights da Ava', 'Os Insights da Ava são exclusivos para assinantes. Assine um plano para receber análises dos seus resultados.');
        return;
      }
      abrirChatIA();
    });
    bind('fechar-aviso-assinante', function () {
      state.avisoAssinanteAberto = false;
      render();
    });
    bind('cancelar-aviso-duplicado', function () {
      state.duplicadoConfirmacaoAberta = false;
      render();
    });
    bind('confirmar-aviso-duplicado', function () {
      state.duplicadoConfirmacaoAberta = false;
      salvarDespesa(true);
    });
    bind('chat-ia-fechar', fecharChatIA);
    bind('chat-ia-home', fecharChatIAParaHome);
    bind('chat-ia-mic', function() { gravarVoz(); });
    bind('chat-ia-enviar', function() { enviarMensagemIA(); });
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
      chatInput.addEventListener('focus', function() { _avaPinViewport(); setTimeout(_avaPinViewport, 120); setTimeout(_avaPinViewport, 350); });
      chatInput.addEventListener('blur', function() { setTimeout(_avaPinViewport, 120); });
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
        this.style.maxHeight = '96px';
      });
      var chatComposer = document.getElementById('chat-ia-composer');
      if (chatComposer) {
        chatComposer.addEventListener('click', function(e) {
          if (e.target && e.target.closest && e.target.closest('button')) return;
          chatInput.focus();
        });
      }
    }
    bind('salvar-despesa', function () { salvarDespesa(false); });
    bind('abrir-nota-camera', function () {
      if (recursoExclusivoAssinanteMobile()) {
        mostrarAvisoAssinanteMobile('Leitura de nota', 'O envio de foto para leitura da nota é uma função exclusiva para assinantes.');
        return;
      }
      var input = document.getElementById('nota-camera'); if (input) input.click();
    });
    bind('abrir-nota-arquivo', function () {
      if (recursoExclusivoAssinanteMobile()) {
        mostrarAvisoAssinanteMobile('Leitura de nota', 'O envio de arquivo para leitura da nota é uma função exclusiva para assinantes.');
        return;
      }
      var input = document.getElementById('nota-arquivo'); if (input) input.click();
    });
    bind('limpar-nota-pendente', function () { state.notaArquivoPendente = null; render(); });
    var notaCamera = document.getElementById('nota-camera');
    if (notaCamera) notaCamera.addEventListener('change', function () { var arquivo = this.files && this.files[0]; this.value = ''; if (arquivo) lerNotaPorFotoMobile(arquivo); });
    var notaArquivo = document.getElementById('nota-arquivo');
    if (notaArquivo) notaArquivo.addEventListener('change', function () { var arquivo = this.files && this.files[0]; this.value = ''; if (arquivo) lerNotaPorFotoMobile(arquivo); });
    var diaInputEl = document.getElementById('despesa-dia');
    if (diaInputEl) {
      diaInputEl.addEventListener('focus', function() {
        if (state.despesaDiaAutoHoje && this.value === diaHojeLancamentoMobile()) {
          this.value = '';
          state.despesaDia = '';
          state.despesaDiaAutoHoje = false;
        }
      });
      diaInputEl.addEventListener('input', function() {
        state.despesaDia = this.value;
        state.despesaDiaAutoHoje = false;
      });
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
    bindChange('despesa-nome', function () { state.despesaNome = this.value || ''; });
    bindInput('despesa-descricao', function () { state.despesaDescricao = this.value || ''; });
    bindInput('despesa-valor', function () {
      var item = document.getElementById('despesa-valor');
      if (!item) return;
      item.value = formatarMoedaDigitada(item.value);
      state.despesaValor = item.value;
    });
    var entradaDiaEl = document.getElementById('entrada-dia');
    if (entradaDiaEl) {
      entradaDiaEl.addEventListener('focus', function() {
        if (state.entradaDiaAutoHoje && this.value === diaHojeLancamentoMobile()) {
          this.value = '';
          state.entradaDia = '';
          state.entradaDiaAutoHoje = false;
        }
      });
      entradaDiaEl.addEventListener('input', function() {
        state.entradaDia = this.value;
        state.entradaDiaAutoHoje = false;
      });
    }
    bindInput('entrada-origem', function () { state.entradaOrigem = this.value || ''; });
    bindInput('entrada-valor', function () {
      var item = document.getElementById('entrada-valor');
      if (!item) return;
      item.value = formatarMoedaDigitada(item.value);
      state.entradaValor = item.value;
    });
    bindInput('receita-total', function () {
      var item = document.getElementById('receita-total');
      if (!item) return;
      item.value = formatarMoedaDigitada(item.value);
      state.receitaTotal = item.value;
    });
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
      state.despesaDia = diaVal; state.despesaDiaAutoHoje = false;
      state.despesaNome = nomeVal;
      state.despesaDescricao = descVal;
      state.despesaValor = valorVal;
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
      state.despesaDia = diaVal; state.despesaDiaAutoHoje = false;
      state.despesaNome = nomeVal;
      state.despesaDescricao = descVal;
      state.despesaValor = valorVal;
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
      state.despesaDia = diaVal; state.despesaDiaAutoHoje = false;
      state.despesaNome = nomeVal;
      state.despesaDescricao = descVal;
      state.despesaValor = valorVal;
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
    bind('toggle-valores-saldo', function () { alternarVisibilidadeValoresCard('saldo'); });
    bind('toggle-valores-caixinha', function () { alternarVisibilidadeValoresCard('caixinha'); });
    bind('toggle-valores-totais', function () { alternarVisibilidadeValoresCard('totais'); });
    bind('toggle-valores-categorias', function () { alternarVisibilidadeValoresCard('categorias'); });
    bind('toggle-valores-tipos', function () { alternarVisibilidadeValoresCard('tipos'); });
    bind('toggle-valores-meusPerfis', function () { alternarVisibilidadeValoresCard('meusPerfis'); });
    bind('toggle-esticar-meus-perfis', function () {
      state.meusPerfisExpandido = !state.meusPerfisExpandido;
      state.resumoPerfilExibidoId = '';
      state.resumoPerfilDestaqueId = (state.empresa && state.empresa.id) || '';
      render();
      if (state.meusPerfisExpandido) rolarCardMeusPerfisAoTopo();
    });
    bind('salvar-caixinha-saldo-inicial', salvarSaldoInicialCaixinhaMobile);
    bind('salvar-caixinha-aporte', salvarAporteCaixinhaMobile);
    var caixinhaSaldoInicialEl = document.getElementById('caixinha-saldo-inicial');
    if (caixinhaSaldoInicialEl) {
      caixinhaSaldoInicialEl.addEventListener('input', function () {
        state.caixinhaSaldoInicialValor = formatarMoedaDigitada(this.value);
        this.value = state.caixinhaSaldoInicialValor;
      });
    }
    var caixinhaValorEl = document.getElementById('caixinha-valor');
    if (caixinhaValorEl) {
      caixinhaValorEl.addEventListener('input', function () {
        state.caixinhaValor = formatarMoedaDigitada(this.value);
        this.value = state.caixinhaValor;
      });
    }
    var caixinhaDiaEl = document.getElementById('caixinha-dia');
    if (caixinhaDiaEl) caixinhaDiaEl.addEventListener('input', function () { state.caixinhaDia = this.value; });
    var caixinhaDescricaoEl = document.getElementById('caixinha-descricao');
    if (caixinhaDescricaoEl) caixinhaDescricaoEl.addEventListener('input', function () { state.caixinhaDescricao = this.value; });
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
      if (!state.ultimasDespesasExpandido) {
        state.ultimasDespesasBuscaAberta = false;
        state.ultimasDespesasBusca = '';
      }
      render();
    });
    bind('toggle-ultimas-receitas', function () {
      state.ultimasReceitasExpandido = !state.ultimasReceitasExpandido;
      if (!state.ultimasReceitasExpandido) {
        state.ultimasReceitasBuscaAberta = false;
        state.ultimasReceitasBusca = '';
      }
      render();
    });
    bind('buscar-ultimas-despesas', function () {
      if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('busca_lancamentos'); return; }
      state.ultimasDespesasBuscaAberta = !state.ultimasDespesasBuscaAberta;
      if (state.ultimasDespesasBuscaAberta) state.ultimasDespesasExpandido = true;
      if (!state.ultimasDespesasBuscaAberta) state.ultimasDespesasBusca = '';
      var deveFocarBusca = state.ultimasDespesasBuscaAberta;
      render();
      if (deveFocarBusca) {
        var campoBuscaDespesas = document.getElementById('busca-ultimas-despesas');
        if (campoBuscaDespesas) {
          campoBuscaDespesas.focus();
          var fimBuscaDespesas = campoBuscaDespesas.value.length;
          if (typeof campoBuscaDespesas.setSelectionRange === 'function') {
            campoBuscaDespesas.setSelectionRange(fimBuscaDespesas, fimBuscaDespesas);
          }
        }
      }
    });
    bind('buscar-ultimas-receitas', function () {
      if (premiumPessoalBloqueadoMobile()) { abrirPremiumMobile('busca_lancamentos'); return; }
      state.ultimasReceitasBuscaAberta = !state.ultimasReceitasBuscaAberta;
      if (state.ultimasReceitasBuscaAberta) state.ultimasReceitasExpandido = true;
      if (!state.ultimasReceitasBuscaAberta) state.ultimasReceitasBusca = '';
      var deveFocarBusca = state.ultimasReceitasBuscaAberta;
      render();
      if (deveFocarBusca) {
        var campoBuscaReceitas = document.getElementById('busca-ultimas-receitas');
        if (campoBuscaReceitas) {
          campoBuscaReceitas.focus();
          var fimBuscaReceitas = campoBuscaReceitas.value.length;
          if (typeof campoBuscaReceitas.setSelectionRange === 'function') {
            campoBuscaReceitas.setSelectionRange(fimBuscaReceitas, fimBuscaReceitas);
          }
        }
      }
    });
    bind('reset-dashboard', function () {
      state.dashboardOrdem = ordemDashboardPadrao();
      state.dashboardOcultos = [];
      salvarResumoDashboard();
      render();
    });
    bind('reset-resumo-dashboard', restaurarResumoPadrao);
    bind('reset-atalhos-inferiores', restaurarAtalhosInferiores);
    bind('nav-home', voltarDashboard);
    bind('nav-lancamento', function () { executarAposFecharMenu(abrirLancamentoPelaNavegacao); });
    bind('nav-menu', abrirMenuPelaNavegacao);
    bind('nav-atalho-esquerdo', function () { executarAposFecharMenu(function () { executarAtalhoInferior(premiumPessoalBloqueadoMobile() ? 'perfil' : state.atalhoInferiorEsquerdo); }); });
    bind('nav-atalho-direito', function () { executarAposFecharMenu(function () { executarAtalhoInferior(premiumPessoalBloqueadoMobile() ? 'agenda' : state.atalhoInferiorDireito); }); });
    bind('mes-anterior', function () { mudarMes(-1); });
    bind('mes-proximo', function () { mudarMes(1); });
    bind('agenda-mes-prev', function () { state.agendaAnimar = 'prev'; mudarMes(-1); });
    bind('agenda-mes-prox', function () { state.agendaAnimar = 'prox'; mudarMes(1); });
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
    bind('fechar-lancamento', function () {
      state.modalLancamento = false;
      state.novaDespesaAberta = false;
      state.novaDespesaNome = '';
      state.novaDespesaCategoria = '';
      limparRascunhoLancamentoMobile();
      render();
    });
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
    bind('ver-nota-lancamento', function () { if (state.modalAcao && state.modalAcao.item) abrirNotaLancamentoMobile(state.modalAcao.item.id); });
    bind('fechar-nota-lancamento', function () { state.notaVisualizandoUrl = ''; render(); });
    bind('compartilhar-nota-lancamento', compartilharNotaVisualizadaMobile);
    bind('cancelar-exclusao-recorrencia', cancelarExclusaoRecorrenciaMobile);
    bind('cancelar-exclusao-recorrencia-topo', cancelarExclusaoRecorrenciaMobile);
    bind('confirmar-exclusao-recorrencia', confirmarExclusaoRecorrenciaMobile);
    bind('cancelar-reset-caixinha', cancelarResetCaixinhaMobile);
    bind('cancelar-reset-caixinha-topo', cancelarResetCaixinhaMobile);
    bind('confirmar-reset-caixinha', resetarCaixinhaMobile);
    var modalAcaoOverlay = document.getElementById('modal-acao-overlay');
    if (modalAcaoOverlay) {
      modalAcaoOverlay.addEventListener('click', function (event) {
        if (event.target !== modalAcaoOverlay) return;
        fecharAcaoLancamento();
      });
    }
    var excluirRecorrenciaOverlay = document.getElementById('excluir-recorrencia-overlay');
    if (excluirRecorrenciaOverlay) {
      excluirRecorrenciaOverlay.addEventListener('click', function (event) {
        if (event.target !== excluirRecorrenciaOverlay || state.carregando) return;
        cancelarExclusaoRecorrenciaMobile();
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
	    bind('excluir-lancamento', function () {
	      if (!state.modalAcao) return;
	      state.modalAcao.modo = 'excluir';
	      state.erro = '';
	      render();
	    });
	    bind('cancelar-exclusao-lancamento', function () {
	      if (!state.modalAcao) return;
	      state.modalAcao.modo = 'opcoes';
	      state.erro = '';
	      render();
	    });
	    bind('confirmar-exclusao-lancamento', excluirLancamentoSelecionado);
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
        if (botao.disabled || state.perfilSelecionandoId) return;
        var id = botao.getAttribute('data-empresa-id');
        if (!id || (state.empresa && id === state.empresa.id)) return;
        state.perfilSelecionandoId = id || '';
        render();
        selecionarEmpresaMobile(id, true);
        state.modalMenuRetorno = '';
        state.modalMenu = '';
        state.visao = 'home';
        carregarDados().finally(function () {
          state.perfilSelecionandoId = '';
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-meu-perfil-id]'), function (botao) {
      botao.addEventListener('click', function () {
        var id = botao.getAttribute('data-meu-perfil-id');
        if (!id) return;
        state.resumoPerfilDestaqueId = id;
        state.resumoPerfilExibidoId = id;
        render();
        centralizarPerfilDestacadoNoCard(id);
      });
    });
    var scrollPrincipalPerfis = document.getElementById('mobile-main-scroll');
    if (scrollPrincipalPerfis) {
      scrollPrincipalPerfis.addEventListener('click', function (event) {
        if (!state.resumoPerfilExibidoId) return;
        var alvo = event.target && event.target.closest ? event.target.closest('[data-meu-perfil-id]') : null;
        if (alvo) return;
        state.resumoPerfilExibidoId = '';
        state.resumoPerfilDestaqueId = (state.empresa && state.empresa.id) || '';
        render();
      });
    }
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
    Array.prototype.forEach.call(document.querySelectorAll('[data-confirmar-receita-id]'), function (botao) {
      botao.addEventListener('click', function () {
        confirmarReceitaPrevista(botao.getAttribute('data-confirmar-receita-id'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-editar-receita-id]'), function (botao) {
      botao.addEventListener('click', function () {
        editarReceitaPrevista(botao.getAttribute('data-editar-receita-id'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-excluir-receita-id]'), function (botao) {
      botao.addEventListener('click', function () {
        excluirReceitaPrevista(botao.getAttribute('data-excluir-receita-id'));
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
    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-opcoes]'), function (botao) {
      botao.addEventListener('click', function (event) {
        event.stopPropagation();
        abrirOpcoesCardDashboard(botao.getAttribute('data-dashboard-opcoes'), botao);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-fechar-opcoes]'), function (botao) {
      botao.addEventListener('click', function (event) {
        event.stopPropagation();
        state.dashboardOpcoesId = '';
        state.dashboardOpcoesPos = null;
        render();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-remover]'), function (botao) {
      botao.addEventListener('click', function (event) {
        event.stopPropagation();
        removerCardDashboardMobile(botao.getAttribute('data-dashboard-remover'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-reset-caixinha]'), function (botao) {
      botao.addEventListener('click', function (event) {
        event.stopPropagation();
        solicitarResetCaixinhaMobile();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-atalho-lado]'), function (botao) {
      botao.addEventListener('click', function () {
        definirAtalhoInferior(botao.getAttribute('data-atalho-lado'), botao.getAttribute('data-atalho-valor'));
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
        state.evolucaoSelecionadaMes[tipo] = botao.getAttribute('data-evolucao-mes');
        render();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-sobre-versao]'), function (botao) {
      botao.addEventListener('click', function () {
        var v = botao.getAttribute('data-sobre-versao');
        state.sobreAbertos[v] = !state.sobreAbertos[v];
        render();
      });
    });
    bind('limpar-notificacoes', function () { limparNotificacoesMobile(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-excluir-notificacao]'), function (botao) {
      botao.addEventListener('click', function (event) {
        event.stopPropagation();
        excluirNotificacaoMobile(botao.getAttribute('data-excluir-notificacao'));
      });
    });
    configurarDragDashboard();
    configurarGestosAgenda();
    configurarScrollFixoAgenda();
  }

  function configurarScrollFixoAgenda() {
    var tela = document.getElementById('agenda-mobile-screen');
    if (!tela || state.visao !== 'agenda') return;

    var ultimoY = 0;

    tela.addEventListener('touchstart', function (event) {
      if (!event.touches || !event.touches.length) return;
      ultimoY = event.touches[0].clientY;
    }, { passive: true });

    tela.addEventListener('touchmove', function (event) {
      if (!event.touches || !event.touches.length) return;

      var alvo = event.target;
      var rolavel = alvo && typeof alvo.closest === 'function'
        ? alvo.closest('[data-agenda-scroll="true"]')
        : null;

      if (!rolavel) {
        event.preventDefault();
        return;
      }

      var yAtual = event.touches[0].clientY;
      var deltaY = yAtual - ultimoY;
      ultimoY = yAtual;

      var semScroll = rolavel.scrollHeight <= rolavel.clientHeight + 1;
      var noTopo = rolavel.scrollTop <= 0;
      var noFim = Math.ceil(rolavel.scrollTop + rolavel.clientHeight) >= rolavel.scrollHeight;

      if (semScroll || (noTopo && deltaY > 0) || (noFim && deltaY < 0)) {
        event.preventDefault();
      }
    }, { passive: false });
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

      if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
      // Define a direção da transição suave antes de trocar o mês.
      state.agendaAnimar = deltaX < 0 ? 'prox' : 'prev';
      mudarMes(deltaX < 0 ? 1 : -1);
    }, { passive: true });
  }

  function configurarPullToRefresh() {
    var inicioY = 0;
    var inicioX = 0;
    var acompanhando = false;
    var puxando = false;
    var recarregando = false;
    var indicador = null;
    var camada = null;
    var limite = 280;
    var exibirApos = 20;
    var opacoEm = 56;
    var opacidadeAtual = 0;
    var opacidadeDestino = 0;
    var frameOpacidade = null;
    var ultimoFrameOpacidade = 0;
    var solicitarFrame = window.requestAnimationFrame || function (callback) {
      return window.setTimeout(function () { callback(Date.now()); }, 16);
    };

    function scrollPrincipal() {
      return document.getElementById('mobile-main-scroll');
    }

    function posicionarIndicador() {
      if (!indicador) return;
      var header = document.getElementById('mobile-main-header');
      // Começa mais abaixo do header para o indicador ficar em área confortável.
      var topo = header ? Math.round(header.getBoundingClientRect().bottom + 64) : 72;
      indicador.style.top = topo + 'px';
    }

    function camadaPullToRefresh() {
      if (camada) return camada;

      camada = document.createElement('div');
      camada.id = 'pull-refresh-backdrop';
      camada.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;background:#020617;opacity:0;will-change:opacity;';
      document.body.appendChild(camada);
      return camada;
    }

    function animarOpacidadeFundo(destino) {
      camadaPullToRefresh();
      opacidadeDestino = Math.max(0, Math.min(Number(destino) || 0, 0.86));
      if (frameOpacidade !== null) return;

      ultimoFrameOpacidade = 0;
      function renderizarFrame(timestamp) {
        var agora = Number(timestamp) || Date.now();
        var intervalo = ultimoFrameOpacidade ? Math.min(40, Math.max(1, agora - ultimoFrameOpacidade)) : 16;
        ultimoFrameOpacidade = agora;
        var fator = 1 - Math.exp(-intervalo / 48);
        opacidadeAtual += (opacidadeDestino - opacidadeAtual) * fator;

        if (Math.abs(opacidadeDestino - opacidadeAtual) < 0.003) {
          opacidadeAtual = opacidadeDestino;
        }
        if (camada) camada.style.opacity = opacidadeAtual.toFixed(3);

        if (opacidadeAtual !== opacidadeDestino) {
          frameOpacidade = solicitarFrame(renderizarFrame);
        } else {
          frameOpacidade = null;
          ultimoFrameOpacidade = 0;
        }
      }

      frameOpacidade = solicitarFrame(renderizarFrame);
    }

    function indicadorPullToRefresh() {
      if (indicador) return indicador;

      indicador = document.createElement('div');
      indicador.id = 'pull-refresh-indicator';
      indicador.className = 'pointer-events-none';
      indicador.style.cssText = 'position:fixed;left:50%;top:0;z-index:9999;display:flex;width:220px;flex-direction:column;align-items:center;pointer-events:none;opacity:0;transform:translateX(-50%);transform-origin:top center;transition:opacity .12s ease;';
      indicador.innerHTML =
        '<span data-pull-ring style="position:relative;display:flex;width:88px;height:88px;align-items:center;justify-content:center;border-radius:999px;background:rgba(2,6,23,.58);box-shadow:0 12px 28px rgba(2,6,23,.26);backdrop-filter:blur(8px);transform:scale(.84);will-change:transform;">' +
          '<svg data-pull-svg width="88" height="88" viewBox="0 0 88 88" fill="none" style="position:absolute;inset:0;transform:rotate(-90deg);transform-origin:center;will-change:transform;">' +
            '<circle cx="44" cy="44" r="36" stroke="rgba(255,255,255,.22)" stroke-width="9"></circle>' +
            '<circle data-pull-progress cx="44" cy="44" r="36" stroke="#38bdf8" stroke-width="9" stroke-linecap="round" stroke-dasharray="226.2" stroke-dashoffset="226.2" style="will-change:stroke-dashoffset;"></circle>' +
          '</svg>' +
          '<span data-pull-symbol style="position:relative;color:#e0f2fe;font-size:33px;font-weight:900;line-height:1;will-change:transform;">&#8635;</span>' +
        '</span>' +
        '<span data-pull-text style="margin-top:12px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:rgba(2,6,23,.62);padding:8px 15px;color:#fff;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;box-shadow:0 10px 24px rgba(2,6,23,.22);opacity:0;white-space:nowrap;transition:opacity .12s ease;">Puxe para atualizar</span>';
      document.body.appendChild(indicador);
      posicionarIndicador();
      return indicador;
    }

    function atualizarIndicador(distancia, soltou) {
      var item = indicadorPullToRefresh();
      var progresso = Math.max(0, Math.min(distancia / limite, 1));
      var progressoAviso = Math.max(0, Math.min((distancia - exibirApos) / (opacoEm - exibirApos), 1));
      var progressoEscurecimentoRapido = Math.max(0, Math.min(distancia / opacoEm, 1));
      var visivel = distancia >= exibirApos;
      var texto = item.querySelector('[data-pull-text]');
      var anel = item.querySelector('[data-pull-ring]');
      var svg = item.querySelector('[data-pull-svg]');
      var progressoCirculo = item.querySelector('[data-pull-progress]');
      var simbolo = item.querySelector('[data-pull-symbol]');
      var circunferencia = 226.2; // 2π × r(36) do anel maior

      posicionarIndicador();
      var opacidadeFundo = distancia > 0
        ? 0.16 + (0.42 * progressoEscurecimentoRapido) + (0.18 * progresso)
        : 0;
      animarOpacidadeFundo(soltou ? 0.84 : opacidadeFundo);
      item.style.opacity = distancia > 2 ? String(Math.max(0.28, Math.min(distancia / 36, 1))) : '0';
      item.style.transform = 'translate(-50%, ' + Math.round(96 * progresso) + 'px)';
      if (texto) texto.textContent = soltou ? 'Recarregando...' : (distancia >= limite ? 'Recarregar' : 'Puxe para atualizar');
      if (texto) texto.style.opacity = soltou ? '1' : (visivel ? String(Math.max(0.35, progressoAviso)) : '0');
      if (anel) {
        anel.style.transform = 'scale(' + (0.84 + (0.16 * progressoAviso)).toFixed(3) + ')';
        anel.style.animation = !soltou && distancia >= limite ? 'pullRefreshReady .8s ease-in-out infinite' : 'none';
      }
      if (progressoCirculo) {
        if (soltou) {
          progressoCirculo.setAttribute('stroke-dasharray', '63 163.2');
          progressoCirculo.setAttribute('stroke-dashoffset', '0');
        } else {
          progressoCirculo.setAttribute('stroke-dasharray', String(circunferencia));
          progressoCirculo.setAttribute('stroke-dashoffset', (circunferencia * (1 - progresso)).toFixed(2));
        }
      }
      if (svg) svg.style.animation = soltou ? 'pullRefreshSpin .72s linear infinite' : 'none';
      if (simbolo) simbolo.style.transform = 'rotate(' + Math.round(260 * progresso) + 'deg)';
    }

    function esconderIndicador() {
      if (indicador) {
        indicador.style.opacity = '0';
        indicador.style.transform = 'translate(-50%, 0)';
      }
      if (camada) {
        camada.style.pointerEvents = 'none';
      }
      animarOpacidadeFundo(0);
    }

    function cancelarGesto() {
      acompanhando = false;
      puxando = false;
      esconderIndicador();
    }

    function iniciarRecarregamento() {
      var rolavel = scrollPrincipal();
      recarregando = true;
      acompanhando = false;
      puxando = false;
      atualizarIndicador(limite, true);
      if (camada) camada.style.pointerEvents = 'auto';
      if (rolavel) rolavel.style.overflow = 'hidden';
      window.setTimeout(function () {
        window.location.reload();
      }, 750);
    }

    window.addEventListener('touchstart', function (event) {
      if (recarregando) return;
      if (window.__avantaDashboardDragBloqueado || (event.target && event.target.closest && event.target.closest('[data-dashboard-handle]'))) {
        cancelarGesto();
        return;
      }
      var rolavel = scrollPrincipal();
      if (deveBloquearScroll() || !rolavel || !event.touches.length) {
        cancelarGesto();
        return;
      }

      acompanhando = true;
      puxando = rolavel.scrollTop <= 1;
      inicioY = event.touches[0].clientY;
      inicioX = event.touches[0].clientX;
    }, { passive: true });

    window.addEventListener('touchmove', function (event) {
      if (window.__avantaDashboardDragBloqueado) {
        cancelarGesto();
        return;
      }
      if (!acompanhando || recarregando || deveBloquearScroll() || !event.touches.length) return;

      var rolavel = scrollPrincipal();
      if (!rolavel) {
        cancelarGesto();
        return;
      }

      var yAtual = event.touches[0].clientY;
      var xAtual = event.touches[0].clientX;

      if (!puxando) {
        if (rolavel.scrollTop > 1) return;
        puxando = true;
        inicioY = yAtual;
        inicioX = xAtual;
      }

      var distancia = Math.max(0, yAtual - inicioY);
      var distanciaX = xAtual - inicioX;
      if (Math.abs(distanciaX) > Math.max(32, distancia * 0.8)) {
        cancelarGesto();
        return;
      }

      if (distancia > 0 && event.cancelable) event.preventDefault();

      atualizarIndicador(distancia, false);
    }, { passive: false });

    window.addEventListener('touchend', function (event) {
      if (!acompanhando || recarregando || deveBloquearScroll()) return;
      acompanhando = false;

      var toque = event.changedTouches && event.changedTouches[0];
      var rolavel = scrollPrincipal();
      if (puxando && toque && rolavel && rolavel.scrollTop <= 1 && toque.clientY - inicioY >= limite) {
        iniciarRecarregamento();
      } else {
        cancelarGesto();
      }
    }, { passive: true });

    window.addEventListener('touchcancel', function () {
      if (!recarregando) cancelarGesto();
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
    var autoScrollFrame = null;
    var ultimoPointerX = null;
    var ultimoPointerY = null;

    function limparDrag() {
      if (timer) window.clearTimeout(timer);
      timer = null;
      if (autoScrollFrame !== null) {
        window.cancelAnimationFrame(autoScrollFrame);
        autoScrollFrame = null;
      }
      ultimoPointerX = null;
      ultimoPointerY = null;

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
      window.__avantaDashboardDragBloqueado = false;
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
      preview.style.outline = 'none';
      preview.style.background = 'transparent';
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
      var yPagina = y;

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

    function scrollDashboardMobile() {
      return document.getElementById('mobile-main-scroll') || document.scrollingElement || document.documentElement;
    }

    function rolarSeNecessario(y) {
      var scroll = scrollDashboardMobile();
      if (!scroll) return false;
      var limiteSuperior = 176;
      var limiteInferior = 120;
      var velocidadeMaxima = 24;
      var delta = 0;

      if (y < limiteSuperior && scroll.scrollTop > 0) {
        var intensidadeSubida = Math.max(0, limiteSuperior - y) / limiteSuperior;
        delta = -Math.max(8, Math.round(velocidadeMaxima * intensidadeSubida));
      } else if (y > window.innerHeight - limiteInferior && scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 1) {
        var distanciaInferior = Math.max(0, y - (window.innerHeight - limiteInferior));
        var intensidadeDescida = distanciaInferior / limiteInferior;
        delta = Math.max(8, Math.round(velocidadeMaxima * intensidadeDescida));
      }

      if (!delta) return false;
      var antes = scroll.scrollTop;
      if (typeof scroll.scrollBy === 'function') {
        scroll.scrollBy({ top: delta, behavior: 'auto' });
      } else {
        scroll.scrollTop += delta;
      }
      return scroll.scrollTop !== antes;
    }

    function executarAutoScrollDrag() {
      autoScrollFrame = null;
      if (!iniciouDrag || ultimoPointerY === null) return;

      if (rolarSeNecessario(ultimoPointerY)) {
        calcularZonasDestino();
        if (ultimoPointerX !== null) destacarDestino(ultimoPointerX, ultimoPointerY);
      }

      autoScrollFrame = window.requestAnimationFrame(executarAutoScrollDrag);
    }

    function atualizarAutoScrollDrag(x, y) {
      ultimoPointerX = x;
      ultimoPointerY = y;
      if (autoScrollFrame === null) {
        autoScrollFrame = window.requestAnimationFrame(executarAutoScrollDrag);
      }
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-handle]'), function (handle) {
      handle.addEventListener('pointerdown', function (event) {
        if (deveBloquearScroll() || state.visao !== 'home') return;

        event.preventDefault();
        window.__avantaDashboardDragBloqueado = true;
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
            cardAtivo.style.opacity = '0';
            cardAtivo.style.transform = 'none';
            cardAtivo.style.filter = 'none';
            cardAtivo.style.outline = 'none';
            cardAtivo.style.background = 'transparent';
            criarGhost(cardAtivo, event.clientX, event.clientY);
            atualizarAutoScrollDrag(event.clientX, event.clientY);
          }
        }, 520);
      });

      handle.addEventListener('pointermove', function (event) {
        if (pointerId !== event.pointerId) return;
        if (!iniciouDrag) return;

        event.preventDefault();
        moverGhost(event.clientX, event.clientY);
        destacarDestino(event.clientX, event.clientY);
        atualizarAutoScrollDrag(event.clientX, event.clientY);
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
    state.falhaAcesso = '';
    state.preparacaoAcessoInterrompida = false;
    prepararOrigemAcessoMobile();
    window._avaProfilePillHidden = false;
    if (typeof window.__avantalabReiniciarProgressoMobile === 'function') {
      window.__avantalabReiniciarProgressoMobile('Validando sua sessão');
    }

    // Deep links da landing: /mobile?cadastro=1 abre direto a tela de criar
    // cadastro; /mobile?entrar=1 abre direto o card de login (pula boas-vindas).
    try {
      var parametrosLanding = new URLSearchParams(window.location.search);
      if (parametrosLanding.get('cadastro') === '1') {
        state.telaAcesso = 'login';
        state.modoCadastro = true;
        state.modoSenha = false;
        state.smsCadastroEnviado = false;
      } else if (parametrosLanding.get('entrar') === '1') {
        state.telaAcesso = 'login';
        state.modoCadastro = false;
        state.modoSenha = false;
      }
    } catch (error) {}

    try {
      window._avaLogosTemaPreload = window._avaLogosTemaPreload || [
        '/images/ava-logo-fundo-claro.png',
        '/images/ava-logo-fundo-escuro.png'
      ].map(function (src) {
        var imagem = new Image();
        imagem.decoding = 'async';
        imagem.src = src;
        if (imagem.decode) imagem.decode().catch(function () {});
        return imagem;
      });
    } catch (error) {}

    try {
      state.darkMode = localStorage.getItem('avantalab_mobile_dark') === '1';
      state.iniciarValoresOcultos = localStorage.getItem(CHAVE_INICIAR_VALORES_OCULTOS) !== '0';
      aplicarPreferenciaInicialValores();
      state.dashboardOrdem = normalizarOrdemDashboard(JSON.parse(localStorage.getItem('avantalab_mobile_dashboard_ordem') || '[]'));
      state.dashboardOcultos = normalizarOcultosDashboard(JSON.parse(localStorage.getItem('avantalab_mobile_dashboard_ocultos') || '[]'));
      var atalhosSalvos = JSON.parse(localStorage.getItem(CHAVE_ATALHOS_INFERIORES) || '{}');
      state.atalhoInferiorEsquerdo = normalizarAtalhoInferior(atalhosSalvos.esquerdo, 'perfil');
      state.atalhoInferiorDireito = normalizarAtalhoInferior(atalhosSalvos.direito, 'agenda');
      if (state.atalhoInferiorEsquerdo !== 'nenhum' && state.atalhoInferiorEsquerdo === state.atalhoInferiorDireito) {
        state.atalhoInferiorDireito = state.atalhoInferiorEsquerdo === 'agenda' ? 'perfil' : 'agenda';
      }
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
                return key.indexOf('avantalab-mobile-') === 0 && key !== 'avantalab-mobile-v283';
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
      navigator.serviceWorker.register('/mobile-sw.js?v=' + encodeURIComponent(APP_VERSION), { updateViaCache: 'none' }).then(function (registro) {
        if (registro && registro.update) registro.update();
      }).catch(function () {});
    }

    configurarPullToRefresh();

    window.setInterval(function () {
      if (state.autenticado && state.empresa && !ehFuncionarioPontoMobile()) verificarPaywallMobile();
    }, 5 * 60 * 1000);

    // Ao voltar ao app (apos receber um push), reconfere as nao lidas
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      carregarNotificacoesNaoLidas();
      // Congela a tela ao trocar de janela e voltar: só recarrega os dados se
      // o DIA virou desde a última carga (ex.: despesas previstas do novo dia
      // precisam aparecer). No mesmo dia, nada recarrega nem mostra loading.
      var diaVirou = false;
      try {
        diaVirou = !!state.diaUltimoCarregamento && dataHoraPontoMobile().data !== state.diaUltimoCarregamento;
      } catch (e) {}
      if (diaVirou && state.autenticado && state.empresa && !ehFuncionarioPontoMobile() && !state.validacaoTelefoneObrigatoria && podeAtualizarDadosAoRetornar()) {
        carregarDados();
      }
    });

    // Android: ao focar um campo dentro de qualquer modal/formulario, rola
    // ate ele ficar visivel acima do teclado (cobre todos os cards de uma vez).
    // A Ava controla o teclado e o viewport de forma independente.
    document.addEventListener('focusin', function (e) {
      // No iOS o Safari ja rola o campo sozinho; nao mexemos pra nao conflitar.
      if (state.isIos) return;
      var el = e.target;
      if (!el || typeof el.matches !== 'function') return;
      if (!el.matches('input, select, textarea')) return;
      if (el.id === 'chat-ia-input') return;
      if (!(deveBloquearScroll() || state.agendaFormAberto)) return;
      setTimeout(function () {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) {}
      }, 300);
    });

    render();

    try {
      if (deveEncerrarSessaoSalvaMobile()) {
        await db.auth.signOut({ scope: 'local' });
        window.location.replace(destinoLogoutMobile());
        return;
      }
      var sessao = await promessaMobileComPrazo(
        db.auth.getSession(),
        8000,
        'A restauração da sessão demorou mais que o esperado.'
      );
      atualizarProgressoAcessoMobile(
        'auth',
        1,
        1,
        sessao.data.session && sessao.data.session.user ? 'Sessão restaurada' : 'Sessão não encontrada'
      );
      if (sessao.data.session && sessao.data.session.user) {
        renovarSessaoPersistenteMobile();
        var mdSessao = sessao.data.session.user.user_metadata || {};
        // Funcionario do Controle de Ponto nao acessa o sistema: encaminha para /ponto.
        if (mdSessao.tipo === 'funcionario_ponto') {
          try { await db.auth.signOut({ scope: 'local' }); } catch (e) {}
          window.location.replace('/ponto');
          return;
        }
        state.usuario = sessao.data.session.user;
        state.autenticado = true;
        var perfisCarregados = await carregarEmpresas(state.usuario.id, state.usuario);
        if (!perfisCarregados) {
          var erroPerfis = new Error('Não foi possível carregar os perfis no tempo esperado.');
          erroPerfis.codigo = 'AVANTALAB_TIMEOUT';
          throw erroPerfis;
        }
        if (!state.empresa) {
          if (ehContaRevisaoAppAppleMobile(state.usuario)) {
            var perfilRevisaoInicializacao = await criarPerfilInicial({
              nome: 'AvantaLab — Conta de teste',
              tipoPerfil: 'pessoal',
            });
            if (perfilRevisaoInicializacao) {
              state.pronto = true;
              render();
              return;
            }
          }
          var perfilCriadoNaInicializacao = await criarPerfilInicialDoCadastroMobile(mdSessao);
          if (!perfilCriadoNaInicializacao) {
            state.criarPerfilNome = String(mdSessao.nome_perfil_inicial || '');
            state.criarPerfilTipo = normalizarTipoPerfil(mdSessao.tipo_perfil_inicial || 'empresa');
            state.modoCriarPerfil = true;
          }
        } else {
          var aguardandoEscolhaSistema = await prepararSistemaInicialAntesDosDadosMobile();
          if (!aguardandoEscolhaSistema) await carregarDados();
          if (state.preparacaoAcessoInterrompida) return;
        }
      } else {
        window.location.replace(destinoLogoutMobile());
        return;
      }
      state.pronto = true;
      render();
    } catch (error) {
      if (
        error && error.codigo === 'AVANTALAB_TIMEOUT' &&
        typeof window.__avantalabRecuperarAcessoMobile === 'function' &&
        window.__avantalabRecuperarAcessoMobile()
      ) {
        return;
      }
      exibirFalhaDeAcessoMobile('Não foi possível recuperar a sessão. Tente novamente para reconectar.');
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
    var iniciarAposRenderInicial = function () {
      window.requestAnimationFrame(function () {
        iniciar();
        garantirRenderDepoisDaHidratacao();
      });
    };

    if (document.readyState === 'complete') {
      iniciarAposRenderInicial();
    } else {
      window.addEventListener('load', iniciarAposRenderInicial, { once: true });
    }
  }

  iniciarQuandoPaginaEstiverPronta();
})();
