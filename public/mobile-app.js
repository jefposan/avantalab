(function () {
  var root = document.getElementById('mobile-root');
  var config = window.AVANTALAB_MOBILE_CONFIG || {};
  var supabaseGlobal = window.supabase;

  if (!root) return;

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    config = {
      supabaseUrl: root.getAttribute('data-supabase-url') || '',
      supabaseAnonKey: root.getAttribute('data-supabase-anon-key') || '',
    };
  }

  if (!supabaseGlobal || !config.supabaseUrl || !config.supabaseAnonKey) {
    root.innerHTML = telaBase(
      '<h1>Mobile indisponivel</h1><p>Nao foi possivel carregar a conexao com o Supabase.</p>'
    );
    return;
  }

  var db = supabaseGlobal.createClient(config.supabaseUrl, config.supabaseAnonKey);
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
    usuarioEditandoId: '',
    erro: '',
    mensagem: '',
    carregando: false,
    loginValor: '',
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
    modalMenu: '',
    darkMode: false,
    installPrompt: null,
    isIos: /iphone|ipad|ipod/i.test(navigator.userAgent),
    novaCategoriaNome: '',
    novaCategoriaTipo: '',
    categoriasExpandido: false,
    tiposDespesaExpandido: false,
    ultimasDespesasExpandido: false,
    ultimasReceitasExpandido: false,
    dashboardOrdem: ordemDashboardPadrao(),
    dragDashboardId: '',
    evolucaoSelecionada: {},
    toast: '',
  };

  function dinheiro(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor || 0));
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
    if (error.message.indexOf('row-level security') >= 0 || error.message.indexOf('violates row-level security policy') >= 0 || error.code === '42501') {
      return 'Voce nao tem permissao para realizar esta acao.';
    }
    if (error.message.indexOf('duplicate key') >= 0 || error.code === '23505') return 'Este registro ja existe.';
    return error.message;
  }

  function formatarDescricao(texto) {
    var limpo = String(texto || '').trim().toLowerCase();
    return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : '';
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

  function nomeEmpresa(empresa) {
    return (empresa && (empresa.nome || empresa.empresa_nome)) || 'Empresa';
  }

  function ordemDashboardPadrao() {
    return [
      'saldo',
      'ia',
      'categorias',
      'tipos',
      'ultimasDespesas',
      'ultimasReceitas',
      'totais',
      'evolucaoDespesas',
      'evolucaoReceitas',
    ];
  }

  function tituloCardDashboard(id) {
    return {
      saldo: 'Resumo inicial',
      ia: 'Perguntas para IA',
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

  function salvarOrdemDashboard() {
    try {
      localStorage.setItem('avantalab_mobile_dashboard_ordem', JSON.stringify(state.dashboardOrdem));
    } catch (error) {}
  }

  function categoriasPadrao() {
    return [
      'Amortizacao',
      'Custos Variaveis',
      'Depreciacao',
      'Despesas Financeiras',
      'Despesas Operacionais',
      'Impostos Sobre Lucro',
    ];
  }

  function indiceMes(mes) {
    var indice = meses.indexOf(mes);
    return indice < 0 ? 0 : indice;
  }

  function mudarMes(delta) {
    var indice = indiceMes(state.mes) + delta;
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
      '<select id="ano" aria-label="Selecionar ano" style="font-size:16px" class="h-9 rounded-full border ' +
      (state.darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-slate-100 text-slate-800') +
      ' px-2 text-center text-xs font-black outline-none">' +
        opcoes.join('') +
      '</select>'
    );
  }

  function dadosMes(mes) {
    var lancamentos = state.lancamentos.filter(function (item) { return item.mes === mes; });
    var entradas = state.entradas.filter(function (item) { return item.mes === mes; });
    var despesas = lancamentos.reduce(function (total, item) { return total + item.valor; }, 0);
    var temTotalDefinido = Object.prototype.hasOwnProperty.call(state.faturamentos, mes);
    var receitas = temTotalDefinido ? state.faturamentos[mes] : entradas.reduce(function (total, item) { return total + item.valor; }, 0);

    return {
      lancamentos: lancamentos,
      entradas: entradas,
      despesas: despesas,
      receitas: receitas,
      saldo: receitas - despesas,
    };
  }

  function dadosMesAnterior() {
    var indice = indiceMes(state.mes) - 1;
    if (indice < 0) indice = 11;
    return dadosMes(meses[indice]);
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
    render();
  }

  function fecharModalMenu() {
    state.modalMenu = '';
    render();
  }

  function voltarDashboard() {
    state.visao = 'home';
    state.busca = '';
    state.modalMenu = '';
    state.menuAberto = false;
    render();
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
    return Boolean(state.modalLancamento || state.modalMenu || state.menuAberto || state.modalAcao);
  }

  function atualizarScrollBloqueado() {
    if (deveBloquearScroll()) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      return;
    }

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
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

    var resposta = await db.rpc('atualizar_usuario_empresa_rpc', {
      p_acesso_id: state.usuarioEditandoId,
      p_nome: nome,
      p_email: login,
      p_perfil: perfil,
    });

    state.carregando = false;

    if (resposta.error) {
      setErro(mensagemErro(resposta.error, 'Nao foi possivel atualizar o usuario.'));
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
      .select('id, empresa_id, nome, email, perfil, status, telefone, telefone_confirmado')
      .eq('user_id', usuarioId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true });

    if (vinculos.error || !vinculos.data || !vinculos.data.length) {
      state.empresas = [];
      state.empresa = null;
      return;
    }

    var ids = vinculos.data.map(function (vinculo) { return vinculo.empresa_id; }).filter(Boolean);
    var empresas = await db.from('empresas').select('id, nome').in('id', ids);

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
          perfil: vinculo.perfil,
          acessoId: vinculo.id,
        };
      })
      .filter(Boolean);

    state.empresa = state.empresas[0] || null;
  }

  async function carregarDados() {
    if (!state.empresa) return;

    state.carregando = true;
    render();

    var empresaId = state.empresa.id;
    var ano = Number(state.ano);

    var resultados = await Promise.all([
      db.from('lancamentos').select('*').eq('empresa_id', empresaId).eq('ano', ano).order('dia', { ascending: true }),
      db.from('faturamentos').select('*').eq('empresa_id', empresaId).eq('ano', ano),
      db.from('faturamentos_entradas').select('*').eq('empresa_id', empresaId).eq('ano', ano).order('dia', { ascending: true }),
      db.from('despesas_cadastradas').select('*').eq('empresa_id', empresaId).order('nome', { ascending: true }),
    ]);

    state.lancamentos = (resultados[0].data || []).map(function (item) {
      return {
        id: item.id,
        mes: item.mes,
        dia: Number(item.dia),
        despesa: item.despesa_nome,
        descricao: item.descricao || '',
        valor: Number(item.valor || 0),
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
        nome: item.nome,
        categoria: item.categoria || 'Sem categoria',
      };
    });

    state.carregando = false;
    render();
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
    state.erro = '';
    render();

    var email = login;
    if (login.indexOf('@') < 0) {
      email = await buscarEmailPorLogin(login);
      if (!email) {
        state.carregando = false;
        setErro('Login nao encontrado.');
        return;
      }
    }

    var resposta = await db.auth.signInWithPassword({ email: email, password: senha });
    if (resposta.error || !resposta.data.user) {
      state.carregando = false;
      setErro('Nao foi possivel entrar. Confira seus dados.');
      return;
    }

    state.usuario = resposta.data.user;
    state.autenticado = true;
    await carregarEmpresas(resposta.data.user.id);

    if (!state.empresa) {
      state.carregando = false;
      state.autenticado = false;
      state.usuario = null;
      await db.auth.signOut();
      setErro('Nenhuma empresa vinculada a este usuario.');
      return;
    }

    await carregarDados();
  }

  async function entrarGoogle() {
    state.erro = '';
    state.mensagem = '';
    state.carregando = true;
    render();

    var resposta = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/mobile',
      },
    });

    if (resposta.error) {
      state.carregando = false;
      setErro('Erro Google: ' + resposta.error.message);
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
      setErro(cadastro.error.message || 'Nao foi possivel criar o cadastro.');
      return;
    }

    state.modoCadastro = false;
    state.smsCadastroEnviado = false;
    state.telefoneCadastroConfirmado = '';
    state.cadastro = {
      nome: '',
      email: '',
      telefone: '',
      senha: '',
      confirmarSenha: '',
    };
    setMensagem('Cadastro criado e celular confirmado. Faca login para acessar.');
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
    state.autenticado = false;
    state.usuario = null;
    state.empresas = [];
    state.empresa = null;
    state.lancamentos = [];
    state.entradas = [];
    state.faturamentos = {};
    render();
  }

  async function salvarDespesa() {
    if (!state.empresa) return;

    var dia = Number(campo('despesa-dia'));
    var nome = campo('despesa-nome');
    var descricao = campo('despesa-descricao');
    var valor = normalizarValor(campo('despesa-valor'));
    var limite = maxDias(state.mes, state.ano);

    if (!dia || dia < 1 || dia > limite || !nome || valor <= 0) {
      setErro('Informe dia, despesa e valor validos.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await db
      .from('lancamentos')
      .insert({
        empresa_id: state.empresa.id,
        ano: Number(state.ano),
        mes: state.mes,
        dia: dia,
        despesa_nome: nome,
        descricao: formatarDescricao(descricao),
        valor: valor,
      })
      .select()
      .single();

    if (resposta.error) {
      state.carregando = false;
      setErro('Nao foi possivel salvar a despesa.');
      return;
    }

    state.modalLancamento = false;
    await carregarDados();
    mostrarToast('Despesa lancada.');
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
    await carregarDados();
    mostrarToast('Total do mes atualizado.');
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
      setErro('Nao foi possivel adicionar a categoria.');
      return;
    }

    state.modalMenu = '';
    await carregarDados();
    mostrarToast('Categoria adicionada.');
  }

  async function criarEmpresaMobile() {
    var nome = campo('nova-empresa-nome').trim();

    if (!nome) {
      setErro('Informe o nome da empresa.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await db.rpc('criar_empresa_inicial_rpc', {
      p_nome_empresa: nome,
    });

    if (resposta.error || !resposta.data) {
      state.carregando = false;
      setErro(mensagemErro(resposta.error, 'Nao foi possivel criar a empresa.'));
      return;
    }

    var criada = Array.isArray(resposta.data) ? resposta.data[0] : resposta.data;
    var criadaId = criada && (criada.id || criada.empresa_id);

    if (criadaId) {
      await db
        .from('configuracoes')
        .upsert({ empresa_id: criadaId, duplicados_ativo: true }, { onConflict: 'empresa_id' });
    }

    state.modalMenu = '';
    await carregarEmpresas(state.usuario.id);
    await carregarDados();
    mostrarToast('Empresa criada.');
  }

  async function excluirEmpresaMobile() {
    if (!state.empresa) return;

    if (state.empresa.perfil !== 'gestor_master') {
      setErro('Somente o Gestor Master pode excluir a empresa atual.');
      return;
    }

    var confirmacao = campo('excluir-empresa-confirmacao').trim();
    var nome = nomeEmpresa(state.empresa);

    if (confirmacao !== nome) {
      setErro('Digite exatamente o nome da empresa para confirmar.');
      return;
    }

    state.carregando = true;
    state.erro = '';
    render();

    var resposta = await db.rpc('excluir_empresa_rpc', {
      p_empresa_id: state.empresa.id,
      p_nome_confirmacao: confirmacao,
    });

    if (resposta.error) {
      state.carregando = false;
      setErro(mensagemErro(resposta.error, 'Nao foi possivel excluir a empresa.'));
      return;
    }

    state.modalMenu = '';
    await carregarEmpresas(state.usuario.id);

    if (!state.empresa) {
      await sair();
      return;
    }

    await carregarDados();
    mostrarToast('Empresa excluida.');
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

  function telaLogin() {
    return (
      '<section class="fixed inset-0 flex flex-col overflow-hidden px-4 pb-4 pt-8" style="height:100dvh;background-color:#eef6fb;background-image:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0)),url(/images/bg-avantalab-mobile-1080x1920.png);background-size:100% auto;background-repeat:no-repeat;background-position:center bottom;background-attachment:fixed;">' +
        '<div class="mx-auto w-full max-w-md overflow-y-auto rounded-3xl border border-white/35 p-5 text-slate-900 shadow-2xl backdrop-blur-xl" style="background-color:rgba(255,255,255,.18);max-height:calc(100dvh - 8.5rem);overscroll-behavior:contain;">' +
          '<div class="mb-5">' +
            '<p class="mb-2 text-xs font-bold uppercase tracking-[0.32em] text-sky-700">AvantaLab Gestao</p>' +
            '<h1 class="text-3xl font-black text-slate-900">' + (state.modoCadastro ? 'Criar cadastro' : state.modoSenha ? 'Recuperar senha' : 'Acesse sua conta') + '</h1>' +
            '<p class="mt-2 text-sm leading-relaxed text-slate-600">' +
              (state.modoCadastro ? 'Preencha seus dados e confirme o celular por SMS.' : state.modoSenha ? 'Digite seu login, receba o codigo por SMS e defina uma nova senha.' : 'Entre para acompanhar sua gestao financeira, lancamentos e resultados.') +
            '</p>' +
          '</div>' +
          (state.modoCadastro ? telaCadastro() : state.modoSenha ? telaSenha() : telaLoginCampos()) +
        '</div>' +
        (!state.modoCadastro && !state.modoSenha ? cardInstalarLoginHtml() : '') +
        (state.modalMenu ? modalMenuHtml() : '') +
      '</section>'
    );
  }

  function telaCarregandoMobile() {
    return (
      '<section class="fixed inset-0 flex items-center justify-center overflow-hidden px-4" style="height:100dvh;background-color:#eef6fb;background-image:url(/images/bg-avantalab-mobile-1080x1920.png);background-size:100% auto;background-repeat:no-repeat;background-position:center bottom;background-attachment:fixed;">' +
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
      '<div class="grid gap-4">' +
        inputHtml('login', 'Email ou login', 'text', 'seuemail@exemplo.com ou seu login', state.loginValor) +
        senhaInputHtml('senha', 'Senha', 'Digite sua senha', 'mostrarSenhaLogin', 'toggle-senha-login') +
        '<div class="text-right">' +
          '<button id="esqueci-senha" type="button" class="text-xs font-bold text-sky-700 underline">Esqueci minha senha</button>' +
        '</div>' +
        alertaHtml() +
        '<button id="entrar" type="button" class="h-12 rounded-xl bg-slate-900 px-4 text-sm font-black uppercase tracking-wide text-white shadow-lg">' +
          (state.carregando ? 'Entrando...' : 'Entrar') +
        '</button>' +
        '<button id="entrar-google" type="button" class="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white/90 px-4 text-sm font-bold text-slate-700 shadow-sm">' +
          '<img src="/images/google-logo.svg" alt="Google" class="h-5 w-5" />' +
          '<span>' + (state.carregando ? 'Conectando...' : 'Entrar ou cadastrar com Google') + '</span>' +
        '</button>' +
        '<div class="pt-2 text-center text-sm text-slate-600">Ainda nao tem conta? <button id="abrir-cadastro" type="button" class="font-bold text-sky-700 underline">Criar cadastro</button></div>' +
      '</div>'
    );
  }

  function telaCadastro() {
    return (
      '<div class="grid gap-3">' +
        inputHtml('cadastro-nome', 'Nome', 'text', 'Seu nome completo', state.cadastro.nome) +
        inputHtml('cadastro-email', 'Email', 'email', 'seuemail@exemplo.com', state.cadastro.email) +
        inputHtml('cadastro-telefone', 'Celular', 'tel', 'DDD + numero. Ex: 11999999999', state.cadastro.telefone) +
        senhaInputHtml('cadastro-senha', 'Senha', 'Crie uma senha', 'mostrarSenhaCadastro', 'toggle-senha-cadastro', state.cadastro.senha) +
        senhaInputHtml('cadastro-confirmar-senha', 'Confirmar senha', 'Repita a senha', 'mostrarConfirmarSenhaCadastro', 'toggle-confirmar-cadastro', state.cadastro.confirmarSenha) +
        (state.smsCadastroEnviado ? inputHtml('cadastro-codigo', 'Codigo recebido por SMS', 'text', 'Digite o codigo recebido') + '<p class="-mt-1 text-[11px] font-semibold text-slate-500">Enviamos o codigo para o celular informado.</p>' : '') +
        alertaHtml() +
        '<button id="cadastro-submit" type="button" class="h-12 rounded-xl bg-slate-900 px-4 text-sm font-black uppercase tracking-wide text-white shadow-lg">' +
          (state.carregando ? (state.smsCadastroEnviado ? 'Validando...' : 'Enviando...') : (state.smsCadastroEnviado ? 'Concluir cadastro' : 'Enviar codigo por SMS')) +
        '</button>' +
        (state.smsCadastroEnviado ? '<button id="reenviar-cadastro" type="button" class="text-xs font-bold text-sky-700 underline">Reenviar codigo</button>' : '') +
        '<div class="pt-1 text-center text-sm text-slate-600">Ja tem conta? <button id="voltar-login-cadastro" type="button" class="font-bold text-sky-700 underline">Entrar</button></div>' +
      '</div>'
    );
  }

  function telaSenha() {
    return (
      '<div class="grid gap-4">' +
        inputHtml('login-senha', 'Email ou login', 'text', 'Informe seu email ou login', state.loginRecuperacao) +
        (state.smsSenhaEnviado
          ? inputHtml('codigo-senha', 'Codigo recebido por SMS', 'text', 'Digite o codigo recebido') +
            senhaInputHtml('nova-senha', 'Nova senha', 'Digite a nova senha', 'mostrarNovaSenha', 'toggle-nova-senha') +
            senhaInputHtml('confirmar-senha', 'Confirmar nova senha', 'Repita a nova senha', 'mostrarConfirmarSenha', 'toggle-confirmar-senha')
          : '') +
        alertaHtml() +
        '<button id="redefinir-senha" type="button" class="h-12 rounded-xl bg-slate-900 px-4 text-sm font-black uppercase tracking-wide text-white shadow-lg">' +
          (state.carregando ? (state.smsSenhaEnviado ? 'Redefinindo...' : 'Enviando...') : (state.smsSenhaEnviado ? 'Redefinir senha' : 'Enviar codigo por SMS')) +
        '</button>' +
        (state.smsSenhaEnviado
          ? '<button id="reenviar-senha" type="button" class="text-xs font-bold text-sky-700 underline">Reenviar codigo</button>'
          : '') +
        '<button id="voltar-login" type="button" class="text-sm font-bold text-slate-600 underline">Voltar para login</button>' +
      '</div>'
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
      '<label class="grid gap-2 text-sm font-semibold text-slate-700">' +
        escapeHtml(label) +
        '<input id="' + id + '" type="' + type + '" placeholder="' + escapeHtml(placeholder || '') + '" value="' + escapeHtml(value || '') + '" style="font-size:16px;background-color:rgba(255,255,255,.62)" class="h-12 rounded-xl border border-white/60 px-4 text-base text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20" />' +
      '</label>'
    );
  }

  function senhaInputHtml(id, label, placeholder, stateKey, toggleId, value) {
    var visivel = !!state[stateKey];

    return (
      '<label class="grid gap-2 text-sm font-semibold text-slate-700">' +
        escapeHtml(label) +
        '<span class="relative block">' +
          '<input id="' + id + '" type="' + (visivel ? 'text' : 'password') + '" placeholder="' + escapeHtml(placeholder || '') + '" value="' + escapeHtml(value || '') + '" style="font-size:16px;background-color:rgba(255,255,255,.62)" class="h-12 w-full rounded-xl border border-white/60 px-4 pr-12 text-base text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20" />' +
          '<button id="' + toggleId + '" type="button" class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/35 text-sm font-black text-slate-600 backdrop-blur-sm" aria-label="' + (visivel ? 'Ocultar senha' : 'Exibir senha') + '">' +
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
        '<input id="' + id + '" ' + (extra || '') + ' style="font-size:16px" class="h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal text-slate-900 outline-none focus:border-cyan-500" />' +
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

  function telaApp() {
    var atual = dadosMes(state.mes);
    var anterior = dadosMesAnterior();

    return (
      '<div class="min-h-screen ' + (state.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900') + ' pb-24">' +
        '<header class="sticky top-0 z-20 border-b ' + (state.darkMode ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200/80 bg-white/95') + ' px-4 py-3 backdrop-blur">' +
          '<div class="mx-auto grid max-w-md grid-cols-[40px_70px_1fr_40px] items-center gap-2">' +
            '<button id="menu-toggle" type="button" class="flex h-10 w-10 items-center justify-center rounded-full ' + (state.darkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700') + '" aria-label="Abrir menu">☰</button>' +
            anoHeaderHtml() +
            '<div class="min-w-0 text-center">' +
              '<p class="truncate text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">' + escapeHtml(nomeEmpresa(state.empresa)) + '</p>' +
              '<div class="mt-2 flex items-center justify-center gap-4">' +
                '<button id="mes-anterior" type="button" class="flex h-7 w-8 items-center justify-center ' + (state.darkMode ? 'text-slate-200' : 'text-slate-700') + ' text-2xl font-black leading-none" aria-label="Mes anterior">&lsaquo;</button>' +
                '<h1 class="truncate text-sm font-black">' + escapeHtml(state.mes.charAt(0) + state.mes.slice(1).toLowerCase()) + '</h1>' +
                '<button id="mes-proximo" type="button" class="flex h-7 w-8 items-center justify-center ' + (state.darkMode ? 'text-slate-200' : 'text-slate-700') + ' text-2xl font-black leading-none" aria-label="Proximo mes">&rsaquo;</button>' +
              '</div>' +
            '</div>' +
            (state.visao === 'home'
              ? '<span aria-hidden="true"></span>'
              : '<button id="voltar-dashboard-topo" type="button" class="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500 text-lg font-black text-white">⌂</button>') +
          '</div>' +
        '</header>' +
        '<div class="mx-auto grid max-w-md gap-3 px-4 pt-3">' +
          empresaHtml() +
          alertaHtml().replace('mt-4', '') +
          (state.visao === 'home' ? homeHtml(atual, anterior) : listaDetalhadaHtml(atual)) +
          rodapeMobileHtml() +
        '</div>' +
        '<button id="abrir-lancamento" type="button" class="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-3xl font-light leading-none text-white shadow-2xl shadow-cyan-900/30">+</button>' +
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
        '<label class="grid gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Empresa' +
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
    return (
      '<footer class="mt-2 rounded-2xl border ' + (state.darkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500') + ' px-4 py-4 text-center text-[11px] shadow-sm">' +
        '<div class="font-black tracking-wide"><span style="color:#003E73">AVANTA</span><span style="color:#00A6C8">LAB</span></div>' +
        '<p class="mt-1 font-semibold">&copy; ' + ano + ' Todos os direitos reservados.</p>' +
        '<div class="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-bold">' +
          '<a href="https://www.instagram.com/avanta.lab" target="_blank" rel="noopener noreferrer" style="color:#00A6C8">@avanta.lab</a>' +
          '<button id="termos-mobile" type="button" class="text-slate-500">Termos de Uso</button>' +
          '<button id="privacidade-mobile" type="button" class="text-slate-500">Privacidade</button>' +
        '</div>' +
      '</footer>'
    );
  }

  function homeHtml(atual, anterior) {
    var cards = {
      saldo: saldoTopoHtml(atual, anterior),
      ia: perguntaIaHtml(),
      categorias: graficoCategoriaHtml(atual),
      tipos: graficoTipoDespesaHtml(atual),
      ultimasDespesas: ultimasDespesasHtml(atual.lancamentos),
      ultimasReceitas: ultimasReceitasHtml(atual.entradas),
      totais: totaisHtml(atual),
      evolucaoDespesas: evolucaoHtml('despesas'),
      evolucaoReceitas: evolucaoHtml('receitas'),
    };

    return normalizarOrdemDashboard(state.dashboardOrdem)
      .map(function (id) {
        if (!cards[id]) return '';
        return '<div data-dashboard-card="' + escapeHtml(id) + '" class="relative pb-2">' +
          cards[id] +
          '<button type="button" data-dashboard-handle="' + escapeHtml(id) + '" class="absolute bottom-1 right-3 flex h-7 w-8 select-none touch-none items-center justify-center rounded-full bg-transparent text-[11px] font-black leading-none text-slate-400" aria-label="Mover card">&vellip;&vellip;</button>' +
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
          miniSaldoHtml('Previsto', atual.saldo, atual.saldo >= 0 ? 'text-cyan-300' : 'text-red-300') +
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
      '<section class="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm">' +
        '<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-sm font-black text-cyan-700">IA</span>' +
        '<div class="min-w-0 flex-1 text-xs font-semibold text-slate-500">Pergunte sobre suas financas em breve</div>' +
        '<span class="text-lg text-slate-400">&#128269;</span>' +
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
      '<section class="rounded-2xl bg-white p-4 shadow-sm">' +
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
      '<section class="rounded-2xl bg-white p-4 shadow-sm">' +
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

  function ultimasDespesasHtml(lancamentos) {
    var todos = lancamentos.slice().sort(function (a, b) { return b.dia - a.dia; });
    var itens = state.ultimasDespesasExpandido ? todos : todos.slice(0, 3);

    return (
      '<section class="overflow-hidden rounded-2xl bg-white shadow-sm">' +
        '<div class="flex items-center justify-between bg-red-50 px-4 py-3"><h2 class="text-sm font-black text-red-900">Ultimas despesas</h2><button id="ver-despesas-lista" type="button" class="text-xs font-black text-red-700">Lista</button></div>' +
        '<div class="grid gap-1 p-4">' +
          (itens.length ? itens.map(function (item) {
            return '<button type="button" data-tipo-lancamento="despesa" data-lancamento-id="' + escapeHtml(item.id) + '" class="flex w-full items-center justify-between gap-3 border-b border-slate-100 py-2 text-left last:border-b-0">' +
              '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.despesa) + '</p><p class="truncate text-xs text-slate-500">Dia ' + item.dia + (item.descricao ? ' - ' + escapeHtml(item.descricao) : '') + '</p></div>' +
              '<strong class="shrink-0 text-sm font-black text-red-600">' + dinheiro(item.valor) + '</strong>' +
            '</button>';
          }).join('') : '<p class="text-xs text-slate-500">Nenhuma despesa neste mes.</p>') +
          (todos.length > 3 ? '<button id="toggle-ultimas-despesas" type="button" class="pt-2 text-left text-xs font-black text-cyan-700">' + (state.ultimasDespesasExpandido ? 'Recolher' : 'Expandir despesas') + '</button>' : '') +
        '</div>' +
      '</section>'
    );
  }

  function ultimasReceitasHtml(entradas) {
    var todos = entradas.slice().sort(function (a, b) { return b.dia - a.dia; });
    var itens = state.ultimasReceitasExpandido ? todos : todos.slice(0, 3);

    return (
      '<section class="overflow-hidden rounded-2xl bg-white shadow-sm">' +
        '<div class="flex items-center justify-between bg-emerald-50 px-4 py-3"><h2 class="text-sm font-black text-emerald-900">Ultimas receitas</h2><button id="ver-receitas-lista" type="button" class="text-xs font-black text-emerald-700">Lista</button></div>' +
        '<div class="grid gap-1 p-4">' +
          (itens.length ? itens.map(function (item) {
            return '<button type="button" data-tipo-lancamento="receita" data-lancamento-id="' + escapeHtml(item.id) + '" class="flex w-full items-center justify-between gap-3 border-b border-slate-100 py-2 text-left last:border-b-0">' +
              '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.origem) + '</p><p class="truncate text-xs text-slate-500">Dia ' + item.dia + '</p></div>' +
              '<strong class="shrink-0 text-sm font-black text-emerald-600">' + dinheiro(item.valor) + '</strong>' +
            '</button>';
          }).join('') : '<p class="text-xs text-slate-500">Nenhuma receita neste mes.</p>') +
          (todos.length > 3 ? '<button id="toggle-ultimas-receitas" type="button" class="pt-2 text-left text-xs font-black text-cyan-700">' + (state.ultimasReceitasExpandido ? 'Recolher' : 'Expandir receitas') + '</button>' : '') +
        '</div>' +
      '</section>'
    );
  }

  function totaisHtml(atual) {
    return (
      '<section class="rounded-2xl bg-white p-4 shadow-sm">' +
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

  function listaDetalhadaHtml(atual) {
    var tipo = state.visao;
    var termo = String(state.busca || '').toLowerCase();
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

    itens = itens
      .filter(function (item) {
        return !termo || (item.titulo + ' ' + item.detalhe + ' ' + item.valor).toLowerCase().indexOf(termo) >= 0;
      })
      .sort(function (a, b) { return b.dia - a.dia; });

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
          '<label class="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">' +
            '<span class="text-slate-400">&#128269;</span>' +
            '<input id="busca-lista" value="' + escapeHtml(state.busca) + '" placeholder="Procurar" style="font-size:16px" class="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-700 outline-none" />' +
          '</label>' +
        '</div>' +
        '<div class="rounded-2xl bg-white p-3 shadow-sm">' +
          (itens.length ? itens.map(function (item) {
            return '<button type="button" data-tipo-lancamento="' + escapeHtml(item.tipo) + '" data-lancamento-id="' + escapeHtml(item.id) + '" class="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-1 py-3 text-left last:border-b-0">' +
              '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.titulo) + '</p><p class="truncate text-xs text-slate-500">' + escapeHtml(item.detalhe) + '</p></div>' +
              '<strong class="shrink-0 text-sm font-black ' + cor + '">' + dinheiro(item.valor) + '</strong>' +
            '</button>';
          }).join('') : '<p class="p-3 text-sm text-slate-500">Nenhum item encontrado.</p>') +
        '</div>' +
      '</section>'
    );
  }

  function modalLancamentoHtml() {
    var despesaAtiva = state.tipoLancamento === 'despesa';

    return (
      '<div class="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-slate-950/45 px-3 py-4">' +
        '<section class="mx-auto max-h-[calc(100dvh-32px)] w-full max-w-md overflow-x-hidden overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl overscroll-contain">' +
          '<div class="mb-3 flex items-center justify-between">' +
            '<h2 class="text-base font-black">Novo lancamento</h2>' +
            '<button id="fechar-lancamento" type="button" class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600">&times;</button>' +
          '</div>' +
          '<div class="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">' +
            '<button id="tipo-despesa" type="button" class="h-9 rounded-lg text-sm font-black ' + (despesaAtiva ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500') + '">Despesa</button>' +
            '<button id="tipo-receita" type="button" class="h-9 rounded-lg text-sm font-black ' + (!despesaAtiva ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500') + '">Receita</button>' +
          '</div>' +
          alertaHtml().replace('mt-4', 'mb-3') +
          (despesaAtiva ? modalDespesaCamposHtml() : modalReceitaCamposHtml()) +
        '</section>' +
      '</div>'
    );
  }

  function modalDespesaCamposHtml() {
    return (
      '<div class="grid gap-3">' +
        '<div class="grid grid-cols-[82px_1fr] gap-3">' +
          campoClaro('despesa-dia', 'Dia', 'inputmode="numeric"') +
          '<label class="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-600">Despesa' +
            '<select id="despesa-nome" style="font-size:16px" class="h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-bold normal-case tracking-normal">' +
              '<option value="">Selecione</option>' +
              state.despesas.map(function (despesa) {
                return '<option value="' + escapeHtml(despesa.nome) + '">' + escapeHtml(despesa.nome) + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
        '</div>' +
        campoClaro('despesa-descricao', 'Descricao') +
        campoValor('despesa-valor', 'Valor') +
        '<button id="salvar-despesa" type="button" class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Salvar despesa') + '</button>' +
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
              '<div class="grid grid-cols-[82px_1fr] gap-3">' +
                campoClaro('entrada-dia', 'Dia', 'inputmode="numeric"') +
                campoClaro('entrada-origem', 'Origem') +
              '</div>' +
              campoValor('entrada-valor', 'Valor') +
              '<button id="salvar-entrada" type="button" class="h-11 rounded-xl bg-cyan-500 px-4 text-sm font-black uppercase tracking-wide text-slate-950">' + (state.carregando ? 'Salvando...' : 'Salvar receita') + '</button>' +
            '</div>'
          : '<div class="grid gap-3">' +
              '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900">Define o faturamento total do mes selecionado, substituindo o valor atual.</p>' +
              campoValor('receita-total', 'Total do mes', dinheiro(state.faturamentos[state.mes] || 0)) +
              '<button id="salvar-total-receita" type="button" class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Definir total') + '</button>' +
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
      '<div class="fixed inset-0 z-[55] flex items-center justify-center overflow-hidden bg-slate-950/45 px-3 py-4">' +
        '<section class="mx-auto max-h-[calc(100dvh-32px)] w-full max-w-md overflow-x-hidden overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl overscroll-contain">' +
          '<div class="mb-3 flex items-center justify-between gap-3">' +
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
          '<div class="grid grid-cols-[82px_1fr] gap-3">' +
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
        '<div class="grid grid-cols-[82px_1fr] gap-3">' +
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
    return (
      '<div id="menu-overlay" class="fixed inset-0 z-50 bg-slate-950/45">' +
        '<aside class="h-full w-[82vw] max-w-[320px] overflow-y-auto ' + (state.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900') + ' p-3 shadow-2xl">' +
          '<div class="mb-3 flex items-start justify-between gap-3">' +
            '<div class="min-w-0"><p class="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-700">AvantaLab</p><h2 class="mt-0.5 truncate text-base font-black">' + escapeHtml(nomeEmpresa(state.empresa)) + '</h2><p class="mt-0.5 truncate text-[11px] font-semibold text-slate-500">' + escapeHtml(state.usuario && state.usuario.email ? state.usuario.email : 'Usuario logado') + '</p></div>' +
            '<button id="fechar-menu" type="button" class="flex h-8 w-8 items-center justify-center rounded-full ' + (state.darkMode ? 'bg-slate-800' : 'bg-slate-100') + ' text-lg">&times;</button>' +
          '</div>' +
          '<div class="grid gap-1.5">' +
            menuBotaoHtml('menu-dashboard', 'Dashboard', 'Visao principal do mes') +
            menuBotaoHtml('menu-usuario', 'Usuario', perfilFormatado(state.empresa && state.empresa.perfil)) +
            menuBotaoHtml('menu-trocar-empresa', 'Trocar empresa', state.empresas.length > 1 ? 'Selecionar outro ambiente' : 'Somente uma empresa') +
            menuBotaoHtml('menu-gerenciar', 'Gerenciar empresa', 'Dados e acesso da empresa') +
            menuBotaoHtml('menu-organizar-dashboard', 'Organizar dashboard', 'Definir ordem dos cards') +
            menuBotaoHtml('menu-categorias', 'Cadastrar despesas', 'Adicionar tipo de despesa') +
            menuBotaoHtml('menu-ajuda-categorias', 'Instrucoes sobre categorias', 'Como organizar seus gastos') +
            (isStandalone() ? '' : menuBotaoHtml('menu-instalar', 'Instalar app', 'Adicionar a tela inicial')) +
            '<button id="menu-tema" type="button" class="rounded-xl border ' + (state.darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50') + ' px-3 py-2 text-left"><div class="flex items-center justify-between"><span class="text-xs font-black">Modo escuro</span><span class="text-[10px] font-bold text-cyan-700">' + (state.darkMode ? 'Ativo' : 'Inativo') + '</span></div></button>' +
            '<button id="sair" type="button" class="mt-1 rounded-xl bg-red-600 px-3 py-2 text-left text-xs font-black text-white">Sair</button>' +
          '</div>' +
        '</aside>' +
      '</div>'
    );
  }

  function menuBotaoHtml(id, titulo, subtitulo) {
    return '<button id="' + id + '" type="button" class="rounded-xl border ' + (state.darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50') + ' px-3 py-2 text-left"><span class="block text-xs font-black">' + escapeHtml(titulo) + '</span><span class="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">' + escapeHtml(subtitulo || '') + '</span></button>';
  }

  function modalMenuHtml() {
    var titulo = {
      usuario: 'Usuario',
      empresa: 'Trocar empresa',
      gerenciar: 'Gerenciar empresa',
      organizarDashboard: 'Organizar dashboard',
      categorias: 'Cadastrar despesas',
      ajudaCategorias: 'Instrucoes',
      'instalar-ios': 'Instalar no iPhone',
      'instalar-android': 'Instalar app',
      termos: 'Termos de Uso',
      privacidade: 'Privacidade',
    }[state.modalMenu] || 'Menu';

    return (
      '<div class="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-slate-950/45 px-3 py-4">' +
        '<section class="mx-auto max-h-[calc(100dvh-32px)] w-full max-w-md overflow-x-hidden overflow-y-auto rounded-3xl ' + (state.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900') + ' p-4 shadow-2xl overscroll-contain">' +
          '<div class="mb-3 flex items-center justify-between gap-3">' +
            '<h2 class="text-base font-black">' + escapeHtml(titulo) + '</h2>' +
            '<button id="fechar-modal-menu" type="button" class="flex h-9 w-9 items-center justify-center rounded-full ' + (state.darkMode ? 'bg-slate-800' : 'bg-slate-100') + ' text-xl">&times;</button>' +
          '</div>' +
          conteudoModalMenuHtml() +
        '</section>' +
      '</div>'
    );
  }

  function conteudoModalMenuHtml() {
    if (state.modalMenu === 'usuario') return usuarioHtml();
    if (state.modalMenu === 'empresa') return trocarEmpresaHtml();
    if (state.modalMenu === 'gerenciar') return gerenciarEmpresaHtml();
    if (state.modalMenu === 'organizarDashboard') return organizarDashboardHtml();
    if (state.modalMenu === 'categorias') return categoriasMenuHtml();
    if (state.modalMenu === 'ajudaCategorias') return ajudaCategoriasHtml();
    if (state.modalMenu === 'instalar-ios') return instalarIosHtml();
    if (state.modalMenu === 'instalar-android') return instalarAndroidHtml();
    if (state.modalMenu === 'termos') return termosMobileHtml();
    if (state.modalMenu === 'privacidade') return privacidadeMobileHtml();
    return '';
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

    return (
      '<div class="grid w-full min-w-0 gap-3 overflow-x-hidden text-sm">' +
        alertaHtml().replace('mt-4', '') +
        (usuarioEditando ? editarUsuarioHtml(usuarioEditando) : criarUsuarioHtml()) +
        '<div class="grid min-w-0 gap-1.5">' +
          '<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Usuarios cadastrados</p>' +
          (state.usuariosCarregando ? '<p class="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Carregando usuarios...</p>' : '') +
          (state.usuariosEmpresa.length ? state.usuariosEmpresa.map(function (usuario) {
            var atual = state.empresa && state.empresa.acessoId === usuario.id;
            var bloqueado = usuario.status === 'bloqueado';
            var protegido = usuario.perfil === 'gestor_master' && !atual;
            return '<div class="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">' +
              '<div class="grid min-w-0 gap-2">' +
                '<div class="min-w-0"><p class="truncate text-xs font-black text-slate-900">' + escapeHtml(usuario.nome || usuario.login || usuario.email || 'Usuario') + '</p><p class="truncate text-[10px] font-semibold text-slate-500">' + escapeHtml(usuario.login || usuario.email || '-') + ' · ' + escapeHtml(perfilFormatado(usuario.perfil)) + (bloqueado ? ' · Bloqueado' : '') + '</p></div>' +
                '<div class="flex min-w-0 gap-1">' +
                  '<button type="button" data-editar-usuario="' + escapeHtml(usuario.id) + '" class="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-cyan-700">Editar</button>' +
                  (protegido ? '' : '<button type="button" data-excluir-usuario="' + escapeHtml(usuario.id) + '" class="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-black text-white">Excluir</button>') +
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

  function editarUsuarioHtml(usuario) {
    return (
      '<div class="grid gap-2 rounded-2xl bg-cyan-50 p-3">' +
        '<div class="flex items-center justify-between gap-2"><p class="text-[10px] font-black uppercase tracking-wide text-cyan-900">Editar usuario</p><button id="cancelar-edicao-usuario" type="button" class="text-[10px] font-black text-slate-500">Cancelar</button></div>' +
        '<input id="edit-usuario-nome" value="' + escapeHtml(usuario.nome || '') + '" placeholder="Nome" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none" />' +
        '<input id="edit-usuario-login" value="' + escapeHtml(usuario.login || usuario.email || '') + '" placeholder="Login ou email" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none" />' +
        '<select id="edit-usuario-perfil" style="font-size:16px" class="h-10 w-full min-w-0 rounded-lg border border-cyan-100 bg-white px-3 text-base font-bold outline-none">' + opcoesPerfilHtml(usuario.perfil || 'operador_simples', usuario.perfil === 'gestor_master') + '</select>' +
        '<button id="salvar-usuario-mobile" type="button" class="h-10 rounded-xl bg-cyan-600 px-4 text-xs font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Salvar usuario') + '</button>' +
      '</div>'
    );
  }

  function trocarEmpresaHtml() {
    if (state.empresas.length <= 1) {
      return '<p class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">Seu usuario esta vinculado a apenas uma empresa.</p>';
    }

    return (
      '<div class="grid gap-2">' +
        state.empresas.map(function (empresa) {
          return '<button type="button" data-empresa-id="' + escapeHtml(empresa.id) + '" class="empresa-opcao rounded-2xl border border-slate-200 px-4 py-3 text-left ' + (state.empresa && empresa.id === state.empresa.id ? 'bg-cyan-50 text-cyan-800' : 'bg-white text-slate-800') + '"><span class="block text-sm font-black">' + escapeHtml(nomeEmpresa(empresa)) + '</span><span class="text-xs font-semibold text-slate-500">' + escapeHtml(perfilFormatado(empresa.perfil)) + '</span></button>';
        }).join('') +
      '</div>'
    );
  }

  function gerenciarEmpresaHtml() {
    return (
      '<div class="grid gap-3 text-sm">' +
        '<div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa atual</p><p class="mt-1 font-black">' + escapeHtml(nomeEmpresa(state.empresa)) + '</p></div>' +
        campoClaro('nova-empresa-nome', 'Criar nova empresa', 'placeholder="Nome da empresa"') +
        '<button id="criar-empresa-mobile" type="button" class="h-11 rounded-xl bg-cyan-500 px-4 text-sm font-black uppercase tracking-wide text-slate-950">' + (state.carregando ? 'Processando...' : 'Criar empresa') + '</button>' +
        '<div class="rounded-2xl border border-red-100 bg-red-50 p-4">' +
          '<p class="text-xs font-bold leading-relaxed text-red-800">Para excluir a empresa atual, digite exatamente o nome abaixo. Esta acao remove o ambiente e seus dados.</p>' +
          '<p class="mt-2 text-sm font-black text-red-900">' + escapeHtml(nomeEmpresa(state.empresa)) + '</p>' +
          '<input id="excluir-empresa-confirmacao" placeholder="Digite o nome da empresa" style="font-size:16px" class="mt-3 h-11 w-full rounded-md border border-red-200 bg-white px-3 text-base font-bold text-slate-900 outline-none" />' +
          '<button id="excluir-empresa-mobile" type="button" class="mt-3 h-11 w-full rounded-xl bg-red-600 px-4 text-sm font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Excluindo...' : 'Excluir empresa') + '</button>' +
        '</div>' +
        alertaHtml() +
      '</div>'
    );
  }

  function organizarDashboardHtml() {
    var ordem = normalizarOrdemDashboard(state.dashboardOrdem);

    return (
      '<div class="grid gap-2">' +
        '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold leading-relaxed text-cyan-900">Use as setas ou segure um card no dashboard para reposicionar. A ordem fica salva neste celular.</p>' +
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

  function moverCardDashboard(id, direcao) {
    var ordem = normalizarOrdemDashboard(state.dashboardOrdem);
    var index = ordem.indexOf(id);
    var destino = index + direcao;

    if (index < 0 || destino < 0 || destino >= ordem.length) return;

    var item = ordem.splice(index, 1)[0];
    ordem.splice(destino, 0, item);
    state.dashboardOrdem = ordem;
    salvarOrdemDashboard();
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
    salvarOrdemDashboard();
    render();
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
        '<div class="mt-1 max-h-[42vh] overflow-y-auto rounded-xl border border-slate-100 p-1 grid gap-1.5">' +
          state.despesas.map(function (despesa) {
            return '<div class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px]"><span class="truncate font-bold">' + escapeHtml(despesa.nome) + '</span><span class="shrink-0 font-semibold text-slate-500">' + escapeHtml(despesa.categoria) + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>'
    );
  }

  function ajudaCategoriasHtml() {
    var categorias = [
      ['AMORTIZACAO', 'Custos nao fisicos.', 'Softwares, patente.'],
      ['CUSTOS VARIAVEIS', 'Variam com venda/producao.', 'Embalagem, materia-prima, frete, comissao.'],
      ['DEPRECIACAO', 'Uso/desgaste de bens fisicos.', 'Maquinas, veiculos, equipamentos.'],
      ['DESPESAS FINANCEIRAS', 'Bancos, juros e operacoes.', 'Juros, tarifas, taxas, cambio.'],
      ['DESPESAS OPERACIONAIS', 'Mantem a empresa funcionando.', 'Aluguel, agua, luz, salarios, manutencao, pro-labore, publicidade.'],
      ['IMPOSTOS SOBRE LUCRO', 'Tributos sobre lucro.', 'IR e CSLL.'],
    ];

    return (
      '<div class="grid gap-1.5 text-[11px] leading-snug text-slate-600">' +
        categorias.map(function (item) {
          return '<div class="rounded-xl bg-slate-50 px-3 py-2"><strong class="block text-[10px] font-black uppercase tracking-wide text-slate-900">' + item[0] + '</strong><p class="mt-0.5">' + item[1] + ' <span class="font-semibold text-slate-500">Ex.: ' + item[2] + '</span></p></div>';
        }).join('') +
        '<p class="rounded-xl bg-cyan-50 px-3 py-2 text-[10px] font-semibold text-cyan-900">Na duvida, consulte o contador. Estes exemplos ajudam a organizar.</p>' +
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
    return '<div class="space-y-3 text-sm leading-relaxed text-slate-600"><p>O AvantaLab Gestao apoia a organizacao, controle e analise de informacoes financeiras e administrativas da empresa.</p><p>O usuario e responsavel pela veracidade dos dados cadastrados e pelo uso adequado das informacoes geradas pelo sistema.</p><p>As funcionalidades podem evoluir ao longo do tempo para melhorar seguranca, desempenho e experiencia de uso.</p></div>';
  }

  function privacidadeMobileHtml() {
    return '<div class="space-y-3 text-sm leading-relaxed text-slate-600"><p>Tratamos os dados informados no sistema apenas para viabilizar o funcionamento da plataforma e seus recursos de gestao.</p><p>As informacoes de acesso, empresas, lancamentos e configuracoes sao usadas para identificar o usuario e exibir os dados corretos de cada ambiente.</p><p>Use senhas seguras e mantenha o acesso restrito a pessoas autorizadas.</p></div>';
  }

  function render() {
    root.setAttribute('data-avantalab-mobile-ready', '1');
    root.innerHTML = !state.pronto ? telaCarregandoMobile() : (state.autenticado ? telaApp() : telaLogin());
    atualizarScrollBloqueado();

    bind('entrar', entrar);
    bind('entrar-google', entrarGoogle);
    bind('instalar-login', instalarApp);
    bind('esqueci-senha', function () {
      state.loginRecuperacao = campo('login').trim();
      state.modoSenha = true;
      state.modoCadastro = false;
      state.smsSenhaEnviado = false;
      state.erro = '';
      state.mensagem = '';
      render();
    });
    bind('abrir-cadastro', function () {
      state.modoCadastro = true;
      state.modoSenha = false;
      state.smsCadastroEnviado = false;
      state.erro = '';
      state.mensagem = '';
      render();
    });
    bind('voltar-login-cadastro', function () {
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
    bind('menu-dashboard', voltarDashboard);
    bind('menu-usuario', abrirUsuariosMobile);
    bind('menu-trocar-empresa', function () { abrirModalMenu('empresa'); });
    bind('menu-gerenciar', function () { abrirModalMenu('gerenciar'); });
    bind('menu-organizar-dashboard', function () { abrirModalMenu('organizarDashboard'); });
    bind('menu-categorias', function () { abrirModalMenu('categorias'); });
    bind('menu-ajuda-categorias', function () { abrirModalMenu('ajudaCategorias'); });
    bind('menu-instalar', instalarApp);
    bind('menu-tema', trocarTema);
    bind('fechar-modal-menu', fecharModalMenu);
    bind('termos-mobile', function () { abrirModalMenu('termos'); });
    bind('privacidade-mobile', function () { abrirModalMenu('privacidade'); });
    bind('criar-empresa-mobile', criarEmpresaMobile);
    bind('excluir-empresa-mobile', excluirEmpresaMobile);
    bind('criar-usuario-mobile', criarUsuarioMobile);
    bind('salvar-usuario-mobile', salvarUsuarioMobile);
    bind('cancelar-edicao-usuario', function () {
      state.usuarioEditandoId = '';
      state.erro = '';
      render();
    });
    bind('salvar-categoria', salvarCategoriaDespesa);
    bind('salvar-despesa', salvarDespesa);
    bind('salvar-entrada', salvarEntrada);
    bind('salvar-total-receita', salvarTotalReceita);
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
    bind('reset-dashboard', function () {
      state.dashboardOrdem = ordemDashboardPadrao();
      salvarOrdemDashboard();
      render();
    });
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
    bind('ver-despesas-lista', function () {
      state.visao = 'despesas';
      state.busca = '';
      render();
    });
    bind('ver-receitas-lista', function () {
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
      render();
    });
    bind('tipo-despesa', function () {
      state.tipoLancamento = 'despesa';
      render();
    });
    bind('tipo-receita', function () {
      state.tipoLancamento = 'receita';
      render();
    });
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
      state.ano = campo('ano').replace(/\D/g, '').slice(0, 4) || String(new Date().getFullYear());
      carregarDados();
    });

    bindChange('empresa', function () {
      var id = campo('empresa');
      state.empresa = state.empresas.find(function (empresa) { return empresa.id === id; }) || state.empresa;
      carregarDados();
    });

    var busca = document.getElementById('busca-lista');
    if (busca) {
      busca.addEventListener('input', function () {
        state.busca = busca.value;
        render();
        var foco = document.getElementById('busca-lista');
        if (foco) {
          foco.focus();
          foco.setSelectionRange(foco.value.length, foco.value.length);
        }
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('.empresa-opcao'), function (botao) {
      botao.addEventListener('click', function () {
        var id = botao.getAttribute('data-empresa-id');
        state.empresa = state.empresas.find(function (empresa) { return empresa.id === id; }) || state.empresa;
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
    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-move]'), function (botao) {
      botao.addEventListener('click', function () {
        moverCardDashboard(botao.getAttribute('data-dashboard-move'), Number(botao.getAttribute('data-dashboard-dir')));
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
    Array.prototype.forEach.call(document.querySelectorAll('[data-evolucao-valor]'), function (botao) {
      botao.addEventListener('click', function () {
        var tipo = botao.getAttribute('data-evolucao-tipo');
        state.evolucaoSelecionada[tipo] = Number(botao.getAttribute('data-evolucao-valor') || 0);
        render();
      });
    });
    configurarDragDashboard();
  }

  function configurarPullToRefresh() {
    var inicioY = 0;
    var acompanhando = false;

    window.addEventListener('touchstart', function (event) {
      if (!isStandalone() || deveBloquearScroll() || window.scrollY > 2 || !event.touches.length) {
        acompanhando = false;
        return;
      }

      acompanhando = true;
      inicioY = event.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', function (event) {
      if (!acompanhando || !isStandalone() || deveBloquearScroll()) return;
      acompanhando = false;

      var toque = event.changedTouches && event.changedTouches[0];
      if (toque && toque.clientY - inicioY > 95 && window.scrollY <= 2) {
        window.location.reload();
      }
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

    function limparDrag() {
      if (timer) window.clearTimeout(timer);
      timer = null;

      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;

      if (marcador && marcador.parentNode) marcador.parentNode.removeChild(marcador);
      marcador = null;
      ultimoDestino = null;

      if (cardAtivo) cardAtivo.classList.remove('scale-[0.98]', 'opacity-70', 'ring-2', 'ring-cyan-400', 'select-none');

      cardAtivo = null;
      idAtivo = '';
      iniciouDrag = false;
      pointerId = null;
      zonasDestino = [];
      state.dragDashboardId = '';
    }

    function criarGhost(card, x, y) {
      var rect = card.getBoundingClientRect();
      ghost = document.createElement('div');
      ghost.className = 'pointer-events-none fixed z-[90] max-w-[340px] rounded-2xl border border-cyan-200 bg-white/95 px-4 py-3 text-sm font-black text-slate-900 shadow-2xl shadow-cyan-950/25 backdrop-blur';
      ghost.style.width = Math.min(rect.width, window.innerWidth - 32) + 'px';
      ghost.style.left = Math.max(12, Math.min(window.innerWidth - rect.width - 12, x - rect.width / 2)) + 'px';
      ghost.style.top = Math.max(12, y - 28) + 'px';
      ghost.textContent = tituloCardDashboard(idAtivo);
      document.body.appendChild(ghost);
    }

    function garantirMarcador() {
      if (marcador) return marcador;

      marcador = document.createElement('div');
      marcador.className = 'pointer-events-none my-2 h-5 rounded-xl border-2 border-dashed border-cyan-400 bg-cyan-50/90';
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
      if (!ghost) return;
      var largura = ghost.offsetWidth || 260;
      ghost.style.left = Math.max(12, Math.min(window.innerWidth - largura - 12, x - largura / 2)) + 'px';
      ghost.style.top = Math.max(12, Math.min(window.innerHeight - 64, y - 28)) + 'px';
    }

    function destacarDestino(x, y) {
      if (!zonasDestino.length) {
        if (marcador && marcador.parentNode) marcador.parentNode.removeChild(marcador);
        ultimoDestino = null;
        return null;
      }

      var destino = zonasDestino[zonasDestino.length - 1];
      var yPagina = y + window.scrollY;

      for (var i = 0; i < zonasDestino.length; i += 1) {
        if (yPagina < zonasDestino[i].limite) {
          destino = zonasDestino[i];
          break;
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
      };

      return ultimoDestino;
    }

    function rolarSeNecessario(y) {
      if (y < 84) {
        window.scrollBy({ top: -14, behavior: 'auto' });
      } else if (y > window.innerHeight - 92) {
        window.scrollBy({ top: 14, behavior: 'auto' });
      }
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-handle]'), function (handle) {
      handle.addEventListener('pointerdown', function (event) {
        if (deveBloquearScroll() || state.visao !== 'home') return;

        event.preventDefault();
        pointerId = event.pointerId;
        idAtivo = handle.getAttribute('data-dashboard-handle') || '';
        cardAtivo = handle.closest('[data-dashboard-card]');
        try {
          handle.setPointerCapture(event.pointerId);
        } catch (error) {}

        timer = window.setTimeout(function () {
          state.dragDashboardId = idAtivo;
          iniciouDrag = true;
          calcularZonasDestino();
          if (cardAtivo) {
            cardAtivo.classList.add('scale-[0.98]', 'opacity-70', 'select-none');
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
    } catch (error) {}

    if (window.caches && caches.keys) {
      caches
        .keys()
        .then(function (keys) {
          return Promise.all(
            keys
              .filter(function (key) {
                return key.indexOf('avantalab-mobile-') === 0 && key !== 'avantalab-mobile-v23';
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
      navigator.serviceWorker.register('/mobile-sw.js').catch(function () {});
    }

    configurarPullToRefresh();

    render();

    try {
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
