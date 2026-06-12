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
    erro: '',
    mensagem: '',
    carregando: false,
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
    tipoLancamento: 'despesa',
    menuAberto: false,
    modalMenu: '',
    darkMode: false,
    installPrompt: null,
    isIos: /iphone|ipad|ipod/i.test(navigator.userAgent),
    novaCategoriaNome: '',
    novaCategoriaTipo: '',
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

  function dadosMes(mes) {
    var lancamentos = state.lancamentos.filter(function (item) { return item.mes === mes; });
    var entradas = state.entradas.filter(function (item) { return item.mes === mes; });
    var despesas = lancamentos.reduce(function (total, item) { return total + item.valor; }, 0);
    var receitas = state.faturamentos[mes] || entradas.reduce(function (total, item) { return total + item.valor; }, 0);

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
    var login = campo('login').trim();
    var senha = campo('senha');

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
    setMensagem('Despesa lancada.');
    await carregarDados();
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
    setMensagem('Entrada lancada.');
    await carregarDados();
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
    setMensagem('Categoria adicionada.');
    await carregarDados();
  }

  function telaLogin() {
    return (
      '<section class="flex min-h-screen flex-col justify-start px-4 pb-8 pt-8" style="min-height:100dvh;background-color:#eef6fb;background-image:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,0)),url(/images/bg-avantalab-mobile-1080x1920.png);background-size:100% auto;background-repeat:no-repeat;background-position:center bottom;background-attachment:scroll;">' +
        '<div class="mx-auto w-full max-w-md rounded-3xl border border-white/35 p-5 text-slate-900 shadow-2xl backdrop-blur-xl" style="background-color:rgba(255,255,255,.18)">' +
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

  function cardInstalarLoginHtml() {
    return (
      '<div class="mx-auto mt-3 w-full max-w-md rounded-2xl border border-white/25 p-3 text-slate-800 shadow-lg backdrop-blur-lg" style="background-color:rgba(255,255,255,.14)">' +
        '<div class="flex items-center justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<p class="text-xs font-black uppercase tracking-wide text-sky-800">Acesso rapido</p>' +
            '<p class="mt-0.5 text-xs font-semibold leading-snug text-slate-600">Instale o AvantaLab como app no celular.</p>' +
          '</div>' +
          '<button id="instalar-login" type="button" class="shrink-0 rounded-xl bg-slate-900/90 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-md">' +
            (isStandalone() ? 'Instalado' : 'Instalar') +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function telaLoginCampos() {
    return (
      '<div class="grid gap-4">' +
        inputHtml('login', 'Email ou login', 'text', 'seuemail@exemplo.com ou seu login') +
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

  function telaApp() {
    var atual = dadosMes(state.mes);
    var anterior = dadosMesAnterior();

    return (
      '<div class="min-h-screen ' + (state.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900') + ' pb-24">' +
        '<header class="sticky top-0 z-20 border-b ' + (state.darkMode ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200/80 bg-white/95') + ' px-4 py-3 backdrop-blur">' +
          '<div class="mx-auto grid max-w-md grid-cols-[40px_1fr_40px] items-center gap-2">' +
            '<button id="menu-toggle" type="button" class="flex h-10 w-10 items-center justify-center rounded-full ' + (state.darkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700') + '" aria-label="Abrir menu">☰</button>' +
            '<div class="min-w-0 text-center">' +
              '<p class="truncate text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">' + escapeHtml(nomeEmpresa(state.empresa)) + '</p>' +
              '<div class="mt-1 flex items-center justify-center gap-2">' +
                '<button id="mes-anterior" type="button" class="flex h-7 w-7 items-center justify-center rounded-full ' + (state.darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700') + ' text-lg font-black">&lsaquo;</button>' +
                '<h1 class="truncate text-sm font-black">' + escapeHtml(state.mes.charAt(0) + state.mes.slice(1).toLowerCase()) + ' ' + escapeHtml(state.ano) + '</h1>' +
                '<button id="mes-proximo" type="button" class="flex h-7 w-7 items-center justify-center rounded-full ' + (state.darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700') + ' text-lg font-black">&rsaquo;</button>' +
              '</div>' +
            '</div>' +
            (state.visao === 'home'
              ? '<button id="abrir-lancamento-topo" type="button" class="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500 text-xl font-light text-white">+</button>'
              : '<button id="voltar-dashboard-topo" type="button" class="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500 text-lg font-black text-white">⌂</button>') +
          '</div>' +
        '</header>' +
        '<div class="mx-auto grid max-w-md gap-3 px-4 pt-3">' +
          empresaHtml() +
          alertaHtml().replace('mt-4', '') +
          (state.visao === 'home' ? homeHtml(atual, anterior) : listaDetalhadaHtml(atual)) +
        '</div>' +
        '<button id="abrir-lancamento" type="button" class="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-3xl font-light leading-none text-white shadow-2xl shadow-cyan-900/30">+</button>' +
        (state.modalLancamento ? modalLancamentoHtml() : '') +
        (state.menuAberto ? menuLateralHtml() : '') +
        (state.modalMenu ? modalMenuHtml() : '') +
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

  function homeHtml(atual, anterior) {
    return (
      saldoTopoHtml(atual, anterior) +
      perguntaIaHtml() +
      graficoCategoriaHtml(atual) +
      visaoGeralHtml(atual) +
      ultimasDespesasHtml(atual.lancamentos) +
      totaisHtml(atual) +
      evolucaoHtml('despesas') +
      evolucaoHtml('receitas')
    );
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

  function graficoCategoriaHtml(atual) {
    var categorias = categoriasDoMes(atual);
    var total = atual.despesas || 0;
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

    return (
      '<section class="rounded-2xl bg-white p-4 shadow-sm">' +
        '<div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-black">Despesas por categoria</h2><span class="text-xs font-bold text-slate-400">' + dinheiro(total) + '</span></div>' +
        '<div class="grid grid-cols-[136px_1fr] items-center gap-3">' +
          '<div class="relative h-32 w-32 rounded-full" style="background:' + fundo + '">' +
            '<div class="absolute left-1/2 top-1/2 flex h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white px-1 text-center shadow-inner">' +
              '<span class="text-[9px] font-bold leading-none text-slate-400">Total</span><strong class="mt-1 block max-w-[78px] truncate leading-none ' + classeValorCentral + ' font-black text-slate-900">' + totalFormatado + '</strong>' +
            '</div>' +
          '</div>' +
          '<div class="grid gap-2">' +
            (categorias.length ? categorias.slice(0, 5).map(function (item, index) {
              return '<div class="flex min-w-0 items-center justify-between gap-2 text-xs">' +
                '<span class="min-w-0 truncate font-bold text-slate-600"><i class="mr-2 inline-block h-2.5 w-2.5 rounded-full" style="background:' + cores[index % cores.length] + '"></i>' + escapeHtml(item.categoria) + '</span>' +
                '<strong class="shrink-0 text-slate-900">' + dinheiro(item.valor) + '</strong>' +
              '</div>';
            }).join('') : '<p class="text-xs text-slate-500">Sem despesas no mes.</p>') +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function visaoGeralHtml(atual) {
    return (
      '<section class="rounded-2xl bg-white p-4 shadow-sm">' +
        '<h2 class="mb-2 text-sm font-black">Visao geral</h2>' +
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
    var itens = lancamentos.slice().sort(function (a, b) { return b.dia - a.dia; }).slice(0, 5);

    return (
      '<section class="rounded-2xl bg-white p-4 shadow-sm">' +
        '<div class="mb-2 flex items-center justify-between"><h2 class="text-sm font-black">Ultimas despesas</h2><button id="ver-despesas-lista" type="button" class="text-xs font-black text-cyan-700">Ver todas</button></div>' +
        '<div class="grid gap-1">' +
          (itens.length ? itens.map(function (item) {
            return '<div class="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">' +
              '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.despesa) + '</p><p class="truncate text-xs text-slate-500">Dia ' + item.dia + (item.descricao ? ' - ' + escapeHtml(item.descricao) : '') + '</p></div>' +
              '<strong class="shrink-0 text-sm font-black text-red-600">' + dinheiro(item.valor) + '</strong>' +
            '</div>';
          }).join('') : '<p class="text-xs text-slate-500">Nenhuma despesa neste mes.</p>') +
        '</div>' +
      '</section>'
    );
  }

  function totaisHtml(atual) {
    return (
      '<section class="grid grid-cols-3 gap-2">' +
        totalBoxHtml('Despesas', atual.despesas, 'text-red-600') +
        totalBoxHtml('Receitas', atual.receitas, 'text-emerald-600') +
        totalBoxHtml('Saldo', atual.saldo, atual.saldo >= 0 ? 'text-cyan-700' : 'text-red-600') +
      '</section>'
    );
  }

  function totalBoxHtml(titulo, valor, cor) {
    return '<div class="rounded-2xl bg-white p-3 shadow-sm"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">' + titulo + '</p><strong class="mt-1 block truncate text-xs font-black ' + cor + '">' + dinheiro(valor) + '</strong></div>';
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

    return (
      '<section class="rounded-2xl bg-white p-4 shadow-sm">' +
        '<h2 class="mb-3 text-sm font-black">Evolucao das ' + (tipo === 'despesas' ? 'despesas' : 'receitas') + '</h2>' +
        '<div class="flex h-28 items-end gap-2">' +
          lista.map(function (item) {
            var altura = Math.max(8, Math.round((item.valor / max) * 100));
            return '<div class="flex min-w-0 flex-1 flex-col items-center gap-1"><div class="w-full rounded-t-md ' + cor + '" style="height:' + altura + '%"></div><span class="text-[9px] font-bold text-slate-400">' + item.mes.slice(0, 3) + '</span></div>';
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
            titulo: item.origem,
            detalhe: 'Dia ' + item.dia,
            valor: item.valor,
            dia: item.dia,
          };
        })
      : atual.lancamentos.map(function (item) {
          return {
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
            return '<div class="flex items-center justify-between gap-3 border-b border-slate-100 px-1 py-3 last:border-b-0">' +
              '<div class="min-w-0"><p class="truncate text-sm font-bold text-slate-800">' + escapeHtml(item.titulo) + '</p><p class="truncate text-xs text-slate-500">' + escapeHtml(item.detalhe) + '</p></div>' +
              '<strong class="shrink-0 text-sm font-black ' + cor + '">' + dinheiro(item.valor) + '</strong>' +
            '</div>';
          }).join('') : '<p class="p-3 text-sm text-slate-500">Nenhum item encontrado.</p>') +
        '</div>' +
      '</section>'
    );
  }

  function modalLancamentoHtml() {
    var despesaAtiva = state.tipoLancamento === 'despesa';

    return (
      '<div class="fixed inset-0 z-40 flex items-end bg-slate-950/45 px-3 pb-3">' +
        '<section class="mx-auto w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl">' +
          '<div class="mb-3 flex items-center justify-between">' +
            '<h2 class="text-base font-black">Novo lancamento</h2>' +
            '<button id="fechar-lancamento" type="button" class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600">&times;</button>' +
          '</div>' +
          '<div class="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">' +
            '<button id="tipo-despesa" type="button" class="h-9 rounded-lg text-sm font-black ' + (despesaAtiva ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500') + '">Despesa</button>' +
            '<button id="tipo-receita" type="button" class="h-9 rounded-lg text-sm font-black ' + (!despesaAtiva ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500') + '">Receita</button>' +
          '</div>' +
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
        campoClaro('despesa-valor', 'Valor', 'inputmode="decimal"') +
        '<button id="salvar-despesa" type="button" class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Salvar despesa') + '</button>' +
      '</div>'
    );
  }

  function modalReceitaCamposHtml() {
    return (
      '<div class="grid gap-3">' +
        '<div class="grid grid-cols-[82px_1fr] gap-3">' +
          campoClaro('entrada-dia', 'Dia', 'inputmode="numeric"') +
          campoClaro('entrada-origem', 'Origem') +
        '</div>' +
        campoClaro('entrada-valor', 'Valor', 'inputmode="decimal"') +
        '<button id="salvar-entrada" type="button" class="h-11 rounded-xl bg-cyan-500 px-4 text-sm font-black uppercase tracking-wide text-slate-950">' + (state.carregando ? 'Salvando...' : 'Salvar receita') + '</button>' +
      '</div>'
    );
  }

  function menuLateralHtml() {
    return (
      '<div class="fixed inset-0 z-50 bg-slate-950/45">' +
        '<aside class="h-full w-[82vw] max-w-[320px] ' + (state.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900') + ' p-4 shadow-2xl">' +
          '<div class="mb-5 flex items-start justify-between gap-3">' +
            '<div class="min-w-0"><p class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">AvantaLab</p><h2 class="mt-1 truncate text-lg font-black">' + escapeHtml(nomeEmpresa(state.empresa)) + '</h2><p class="mt-1 truncate text-xs font-semibold text-slate-500">' + escapeHtml(state.usuario && state.usuario.email ? state.usuario.email : 'Usuario logado') + '</p></div>' +
            '<button id="fechar-menu" type="button" class="flex h-9 w-9 items-center justify-center rounded-full ' + (state.darkMode ? 'bg-slate-800' : 'bg-slate-100') + ' text-xl">&times;</button>' +
          '</div>' +
          '<div class="grid gap-2">' +
            menuBotaoHtml('menu-dashboard', 'Dashboard', 'Visao principal do mes') +
            menuBotaoHtml('menu-usuario', 'Usuario', perfilFormatado(state.empresa && state.empresa.perfil)) +
            menuBotaoHtml('menu-trocar-empresa', 'Trocar empresa', state.empresas.length > 1 ? 'Selecionar outro ambiente' : 'Somente uma empresa') +
            menuBotaoHtml('menu-gerenciar', 'Gerenciar empresa', 'Dados e acesso da empresa') +
            menuBotaoHtml('menu-categorias', 'Categorias de despesas', 'Adicionar despesa base') +
            menuBotaoHtml('menu-ajuda-categorias', 'Instrucoes sobre categorias', 'Como organizar seus gastos') +
            menuBotaoHtml('menu-instalar', 'Instalar app', isStandalone() ? 'App ja instalado' : 'Adicionar a tela inicial') +
            '<button id="menu-tema" type="button" class="rounded-2xl border ' + (state.darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50') + ' px-4 py-3 text-left"><div class="flex items-center justify-between"><span class="text-sm font-black">Modo escuro</span><span class="text-xs font-bold text-cyan-700">' + (state.darkMode ? 'Ativo' : 'Inativo') + '</span></div></button>' +
            '<button id="sair" type="button" class="mt-2 rounded-2xl bg-red-600 px-4 py-3 text-left text-sm font-black text-white">Sair</button>' +
          '</div>' +
        '</aside>' +
      '</div>'
    );
  }

  function menuBotaoHtml(id, titulo, subtitulo) {
    return '<button id="' + id + '" type="button" class="rounded-2xl border ' + (state.darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50') + ' px-4 py-3 text-left"><span class="block text-sm font-black">' + escapeHtml(titulo) + '</span><span class="mt-0.5 block text-xs font-semibold text-slate-500">' + escapeHtml(subtitulo || '') + '</span></button>';
  }

  function modalMenuHtml() {
    var titulo = {
      usuario: 'Usuario',
      empresa: 'Trocar empresa',
      gerenciar: 'Gerenciar empresa',
      categorias: 'Categorias',
      ajudaCategorias: 'Instrucoes',
      'instalar-ios': 'Instalar no iPhone',
      'instalar-android': 'Instalar app',
    }[state.modalMenu] || 'Menu';

    return (
      '<div class="fixed inset-0 z-[60] flex items-end bg-slate-950/45 px-3 pb-3">' +
        '<section class="mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl ' + (state.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900') + ' p-4 shadow-2xl">' +
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
    if (state.modalMenu === 'categorias') return categoriasMenuHtml();
    if (state.modalMenu === 'ajudaCategorias') return ajudaCategoriasHtml();
    if (state.modalMenu === 'instalar-ios') return instalarIosHtml();
    if (state.modalMenu === 'instalar-android') return instalarAndroidHtml();
    return '';
  }

  function usuarioHtml() {
    return (
      '<div class="grid gap-3 text-sm">' +
        '<div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Email</p><p class="mt-1 font-bold">' + escapeHtml(state.usuario && state.usuario.email ? state.usuario.email : '-') + '</p></div>' +
        '<div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Perfil</p><p class="mt-1 font-bold">' + escapeHtml(perfilFormatado(state.empresa && state.empresa.perfil)) + '</p></div>' +
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
        '<p class="rounded-2xl bg-cyan-50 p-4 text-xs font-semibold leading-relaxed text-cyan-900">Nesta primeira versao mobile, o gerenciamento completo continua no desktop. Aqui voce pode conferir a empresa ativa, trocar de empresa e organizar categorias.</p>' +
      '</div>'
    );
  }

  function categoriasMenuHtml() {
    return (
      '<div class="grid gap-3">' +
        campoClaro('categoria-nome', 'Despesa', 'placeholder="Ex: Energia"') +
        campoClaro('categoria-tipo', 'Categoria', 'placeholder="Ex: Operacional"') +
        alertaHtml() +
        '<button id="salvar-categoria" type="button" class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white">' + (state.carregando ? 'Salvando...' : 'Adicionar categoria') + '</button>' +
        '<div class="mt-2 grid gap-2">' +
          state.despesas.slice(0, 12).map(function (despesa) {
            return '<div class="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs"><span class="truncate font-bold">' + escapeHtml(despesa.nome) + '</span><span class="shrink-0 font-semibold text-slate-500">' + escapeHtml(despesa.categoria) + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>'
    );
  }

  function ajudaCategoriasHtml() {
    return '<div class="space-y-3 text-sm leading-relaxed text-slate-600"><p>Categorias agrupam despesas semelhantes para o grafico e os totais ficarem claros.</p><p>Exemplos: aluguel, energia e internet podem ficar em <strong>Estrutura</strong>. Anuncios, designer e campanhas podem ficar em <strong>Marketing</strong>.</p><p>Use nomes curtos e consistentes. Isso deixa a busca e a leitura mensal muito mais rapidas.</p></div>';
  }

  function instalarIosHtml() {
    return '<div class="space-y-3 text-sm leading-relaxed text-slate-600"><p>No iPhone, toque no botao de compartilhar do navegador.</p><p>Depois escolha <strong>Adicionar a Tela de Inicio</strong>.</p><p>Confirme o nome AvantaLab Gestao para abrir como aplicativo.</p><p class="text-xs font-semibold text-slate-500">Se essa opcao nao aparecer, procure no menu do navegador por compartilhar ou adicionar a tela inicial.</p></div>';
  }

  function instalarAndroidHtml() {
    return '<div class="space-y-3 text-sm leading-relaxed text-slate-600"><p>Quando o navegador permitir, use a opcao <strong>Instalar app</strong> ou <strong>Adicionar a tela inicial</strong>.</p><p>Se nao aparecer agora, abra o menu do Chrome e escolha <strong>Adicionar a tela inicial</strong>.</p></div>';
  }

  function render() {
    root.setAttribute('data-avantalab-mobile-ready', '1');
    root.innerHTML = state.autenticado ? telaApp() : telaLogin();

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
    bind('menu-dashboard', voltarDashboard);
    bind('menu-usuario', function () { abrirModalMenu('usuario'); });
    bind('menu-trocar-empresa', function () { abrirModalMenu('empresa'); });
    bind('menu-gerenciar', function () { abrirModalMenu('gerenciar'); });
    bind('menu-categorias', function () { abrirModalMenu('categorias'); });
    bind('menu-ajuda-categorias', function () { abrirModalMenu('ajudaCategorias'); });
    bind('menu-instalar', instalarApp);
    bind('menu-tema', trocarTema);
    bind('fechar-modal-menu', fecharModalMenu);
    bind('salvar-categoria', salvarCategoriaDespesa);
    bind('salvar-despesa', salvarDespesa);
    bind('salvar-entrada', salvarEntrada);
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
    bind('voltar-home', function () {
      state.visao = 'home';
      state.busca = '';
      render();
    });
    bind('abrir-lancamento', function () {
      state.modalLancamento = true;
      render();
    });
    bind('abrir-lancamento-topo', function () {
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
  }

  async function iniciar() {
    state.pronto = true;
    try {
      state.darkMode = localStorage.getItem('avantalab_mobile_dark') === '1';
    } catch (error) {}

    if (window.caches && caches.keys) {
      caches
        .keys()
        .then(function (keys) {
          return Promise.all(
            keys
              .filter(function (key) {
                return key.indexOf('avantalab-mobile-') === 0 && key !== 'avantalab-mobile-v13';
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

    render();

    try {
      var sessao = await db.auth.getSession();
      if (sessao.data.session && sessao.data.session.user) {
        state.usuario = sessao.data.session.user;
        state.autenticado = true;
        await carregarEmpresas(state.usuario.id);
        await carregarDados();
      }
    } catch (error) {
      state.erro = 'Nao foi possivel recuperar a sessao. Entre novamente.';
      render();
    }
  }

  function garantirRenderDepoisDaHidratacao() {
    [900, 1800, 3200].forEach(function (tempo) {
      window.setTimeout(function () {
        var textoAtual = root.textContent || '';

        if (textoAtual.indexOf('Preparando acesso mobile') >= 0) {
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
