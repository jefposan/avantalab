(function () {
  var root = document.getElementById('ponto-root');
  if (!root) return;
  var supabaseGlobal = window.supabase;
  var config = {
    supabaseUrl: root.getAttribute('data-supabase-url') || '',
    supabaseAnonKey: root.getAttribute('data-supabase-anon-key') || '',
  };

  function avisoSimples(titulo, msg) {
    root.innerHTML =
      '<div class="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center">' +
        '<div class="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">' +
          '<h1 class="text-lg font-black text-slate-900">' + titulo + '</h1>' +
          '<p class="mt-2 text-sm font-semibold text-slate-500">' + msg + '</p>' +
        '</div>' +
      '</div>';
  }

  if (!supabaseGlobal || !config.supabaseUrl || !config.supabaseAnonKey) {
    avisoSimples('Conexao necessaria', 'Conecte-se a internet e tente novamente.');
    return;
  }

  var db = supabaseGlobal.createClient(config.supabaseUrl, config.supabaseAnonKey);
  var VAPID_PUBLIC_KEY = 'BL_wlTejki6TPH1TJSHw8q6VeeSoaoH5Ciiirjs0nSg0M4riD5jl-RnkUVArlGMuI5h-eshP98kQKFPsjjM7f4c';
  var canalConfiguracaoPonto = null;
  var intervaloConfiguracaoPonto = null;

  var ehIos = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  function ehStandalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  var installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installPrompt = e; render(); });

  var state = {
    pronto: false,
    autenticado: false,
    usuario: null,
    empresa: null,
    funcionario: null,
    pontoConfig: null,
    facial: { ativo: false, podeCadastrar: false },
    pontoHoje: [],
    batendo: false,
    comprovante: null,
    view: 'bater',
    registros: [],
    periodo: 'dia',
    carregandoReg: false,
    cpf: '',
    senha: '',
    verSenha: false,
    erro: '',
    entrando: false,
    etapaEntrada: '',
    tentativaEntrada: 0,
    carregando: false,
    toast: null,
    instalarInstrucao: false,
    confirmarTipo: null,
    localizacaoAtual: null,
    localizacaoAtualizadaEm: 0,
    localizacaoAtualizando: false,
    localizacaoMsg: '',
    notificacoesAtivas: false,
    notificacoesAtualizando: false,
    ajustesAberto: false,
    ajudaAberta: false,
    pontoAcessoMotivo: '',
    facialDepois: null,
  };

  async function iniciarFacial(tipo, depois) {
    var empresaId = (state.empresa && state.empresa.id) || (state.funcionario && state.funcionario.empresa_id);
    var sessao = await db.auth.getSession();
    var token = sessao && sessao.data && sessao.data.session && sessao.data.session.access_token;
    if (!empresaId || !token) { mostrarToast('Sessão não encontrada. Entre novamente.'); return; }
    state.facialDepois = depois || null;
    window.dispatchEvent(new CustomEvent('avantalab:facial-iniciar', { detail: { empresaId: empresaId, token: token, tipo: tipo } }));
  }
  window.addEventListener('avantalab:facial-concluido', function () { var depois = state.facialDepois; state.facialDepois = null; if (depois) depois(); });
  window.addEventListener('avantalab:facial-erro', function (e) { state.facialDepois = null; mostrarToast((e.detail && e.detail.mensagem) || 'Não foi possível confirmar a identidade.'); });
  window.addEventListener('avantalab:facial-cancelado', function () { state.facialDepois = null; });

  async function carregarStatusFacial(empresaId) {
    if (!empresaId) return { ativo: false, podeCadastrar: false };
    try {
      var sessao = await db.auth.getSession();
      var token = sessao && sessao.data && sessao.data.session && sessao.data.session.access_token;
      if (!token) return { ativo: false, podeCadastrar: false };
      var resposta = await buscarComPrazo('/api/ponto/reconhecimento-facial/status?empresaId=' + encodeURIComponent(empresaId), {
        headers: { Authorization: 'Bearer ' + token },
      }, 8000, 'consultar a habilitação facial');
      if (!resposta.ok) return { ativo: false, podeCadastrar: false };
      var dados = await resposta.json();
      return { ativo: dados && dados.ativo === true, podeCadastrar: dados && dados.podeCadastrar === true };
    } catch (e) {
      // A indisponibilidade do adicional nunca pode impedir a marcação comum.
      return { ativo: false, podeCadastrar: false };
    }
  }

  async function atualizarConfiguracaoPontoSilenciosa() {
    var empresaId = (state.funcionario && state.funcionario.empresa_id) || (state.empresa && state.empresa.id);
    if (!state.autenticado || !empresaId) return;
    try {
      var resposta = await db.from('ponto_config').select('latitude, longitude, raio_m, reconhecimento_facial_status, reconhecimento_facial_tipos').eq('empresa_id', empresaId).maybeSingle();
      if (!resposta.error && resposta.data) {
        state.pontoConfig = resposta.data;
        if (state.pronto && !state.entrando) render();
      }
    } catch (e) {}
  }

  function pararSincronizacaoConfiguracaoPonto() {
    if (intervaloConfiguracaoPonto) { clearInterval(intervaloConfiguracaoPonto); intervaloConfiguracaoPonto = null; }
    if (canalConfiguracaoPonto) { db.removeChannel(canalConfiguracaoPonto); canalConfiguracaoPonto = null; }
  }

  function iniciarSincronizacaoConfiguracaoPonto(empresaId) {
    pararSincronizacaoConfiguracaoPonto();
    if (!empresaId) return;
    // Realtime aplica mudanças assim que o gestor salva; a consulta periódica
    // cobre aparelhos/rede que ainda não tenham o canal realtime disponível.
    canalConfiguracaoPonto = db.channel('ponto-config-' + empresaId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ponto_config', filter: 'empresa_id=eq.' + empresaId }, atualizarConfiguracaoPontoSilenciosa)
      .subscribe();
    intervaloConfiguracaoPonto = setInterval(atualizarConfiguracaoPontoSilenciosa, 15000);
  }
  window.addEventListener('focus', atualizarConfiguracaoPontoSilenciosa);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) atualizarConfiguracaoPontoSilenciosa(); });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !state.ajudaAberta) return;
    state.ajudaAberta = false;
    render();
    var ajuda = document.getElementById('ponto-ajuda');
    if (ajuda) ajuda.focus();
  });

  // ---------- helpers ----------
  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function campo(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function fmtCpf(v) {
    var d = String(v || '').replace(/\D/g, '').slice(0, 11);
    if (d.length !== 11) return d;
    return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
  }
  function cpfValido(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    function calc(base) {
      var soma = 0;
      for (var i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
      var resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    }
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  }
  function mostrarToast(msg) {
    state.toast = msg; render();
    setTimeout(function () { state.toast = null; render(); }, 4500);
  }
  function diaPontoHoje() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); }
  function horaPonto(ts) { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hour12: false }); }
  function horaCurta(ts) { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hour12: false }); }
  function diaSemanaHoje() { var p = diaPontoHoje().split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
  var ROTULOS = { entrada: 'Entrada', saida_refeicao: 'Saída p/ refeição', retorno_refeicao: 'Retorno da refeição', saida: 'Saída' };
  function rotuloAcao(t) { return ROTULOS[t] || t; }
  function proximaAcao(tipos) {
    if (tipos.indexOf('saida') !== -1) return null;
    if (tipos.indexOf('entrada') === -1) return 'entrada';
    if (tipos.indexOf('saida_refeicao') === -1) return 'saida_refeicao';
    if (tipos.indexOf('retorno_refeicao') === -1) return 'retorno_refeicao';
    return 'saida';
  }
  function distanciaMetros(lat1, lon1, lat2, lon2) {
    var R = 6371000, toRad = function (g) { return (g * Math.PI) / 180; };
    var dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function numeroConfig(valor) {
    if (valor == null || valor === '') return NaN;
    if (typeof valor === 'number') return valor;
    return Number(String(valor).trim().replace(',', '.').replace(/[^\d.-]/g, ''));
  }
  function nomeEmpresa() { return (state.empresa && state.empresa.nome) || 'Empresa'; }
  function nomeFunc() { var f = state.funcionario || {}; var md = (state.usuario && state.usuario.user_metadata) || {}; return f.nome || md.nome || 'Funcionário'; }

  function erroDePrazo(etapa) {
    var erro = new Error('A conexão demorou mais que o normal ao ' + etapa + '.');
    erro.codigo = 'PONTO_TIMEOUT';
    return erro;
  }

  // Nenhuma etapa de acesso pode deixar a tela aguardando indefinidamente.
  // O prazo não concede acesso: apenas devolve o usuário à tela de login para
  // uma nova tentativa segura.
  function comPrazo(promessa, ms, etapa) {
    return new Promise(function (resolver, rejeitar) {
      var concluido = false;
      var temporizador = setTimeout(function () {
        if (concluido) return;
        concluido = true;
        rejeitar(erroDePrazo(etapa));
      }, ms);
      Promise.resolve(promessa).then(function (resultado) {
        if (concluido) return;
        concluido = true;
        clearTimeout(temporizador);
        resolver(resultado);
      }, function (erro) {
        if (concluido) return;
        concluido = true;
        clearTimeout(temporizador);
        rejeitar(erro);
      });
    });
  }

  async function buscarComPrazo(url, opcoes, ms, etapa) {
    var controlador = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var opcoesComSinal = Object.assign({}, opcoes || {});
    if (controlador) opcoesComSinal.signal = controlador.signal;
    try {
      return await comPrazo(fetch(url, opcoesComSinal), ms, etapa);
    } catch (erro) {
      // Não aborta após uma resposta válida: o corpo ainda será lido por json().
      // Interrompe somente a requisição que realmente ultrapassou o prazo.
      if (controlador) controlador.abort();
      throw erro;
    }
  }

  function bind(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
  function bindInput(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('input', fn); }
  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var result = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) result[i] = raw.charCodeAt(i);
    return result;
  }

  async function registroServiceWorkerPonto() {
    if (!('serviceWorker' in navigator)) return null;
    try { return await navigator.serviceWorker.register('/ponto-sw.js?v=8', { scope: '/ponto' }); }
    catch (e) { return null; }
  }

  async function verificarNotificacoesPonto() {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
      var registro = await registroServiceWorkerPonto();
      if (!registro) return;
      var inscricao = await registro.pushManager.getSubscription();
      state.notificacoesAtivas = Notification.permission === 'granted' && Boolean(inscricao);
      if (inscricao && state.usuario && state.usuario.id) {
        await db.from('push_subscriptions').update({ app_origem: 'ponto', atualizado_em: new Date().toISOString() }).eq('endpoint', inscricao.endpoint);
      }
    } catch (e) { state.notificacoesAtivas = false; }
  }

  // Preferencia do usuario (default = ativado). So marca opt-out quando o proprio desativa.
  function lembretesOptOut() { try { return localStorage.getItem('ponto_lembretes_optout') === '1'; } catch (e) { return false; } }
  function setLembretesOptOut(v) { try { if (v) localStorage.setItem('ponto_lembretes_optout', '1'); else localStorage.removeItem('ponto_lembretes_optout'); } catch (e) {} }

  async function ativarNotificacoesPonto(silencioso) {
    if (state.notificacoesAtualizando || !state.usuario) return false;
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
      if (!silencioso) mostrarToast('Este navegador nao suporta notificacoes push.');
      return false;
    }
    if (ehIos && !ehStandalone()) { if (!silencioso) { state.instalarInstrucao = true; render(); } return false; }

    state.notificacoesAtualizando = true; render();
    try {
      var registro = await registroServiceWorkerPonto();
      if (!registro) throw new Error('service-worker');
      var atual = await registro.pushManager.getSubscription();
      if (!atual) {
        var permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('permission');
        atual = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      var data = atual.toJSON();
      var empresaId = (state.funcionario && state.funcionario.empresa_id) || (state.empresa && state.empresa.id) || null;
      var saved = await db.from('push_subscriptions').upsert({
        user_id: state.usuario.id,
        empresa_id: empresaId,
        endpoint: data.endpoint,
        p256dh: data.keys ? data.keys.p256dh : '',
        auth: data.keys ? data.keys.auth : '',
        user_agent: navigator.userAgent,
        app_origem: 'ponto',
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'endpoint' });
      if (saved.error) throw saved.error;
      state.notificacoesAtivas = true;
      setLembretesOptOut(false);
      if (!silencioso) mostrarToast('Lembretes de entrada e saida ativados.');
      return true;
    } catch (e) {
      if (!silencioso) mostrarToast(e && e.message === 'permission' ? 'Permissao de notificacao nao concedida.' : 'Nao foi possivel ativar as notificacoes.');
      return false;
    } finally {
      state.notificacoesAtualizando = false; render();
    }
  }

  async function desativarNotificacoesPonto() {
    if (state.notificacoesAtualizando || !state.usuario) return;
    state.notificacoesAtualizando = true; render();
    try {
      var registro = await registroServiceWorkerPonto();
      if (registro) {
        var atual = await registro.pushManager.getSubscription();
        if (atual) {
          var endpoint = atual.endpoint;
          await atual.unsubscribe();
          await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
        }
      }
      state.notificacoesAtivas = false;
      setLembretesOptOut(true);
      mostrarToast('Lembretes de ponto desativados.');
    } catch (e) {
      mostrarToast('Nao foi possivel desativar as notificacoes.');
    } finally {
      state.notificacoesAtualizando = false; render();
    }
  }

  function alternarNotificacoesPonto() {
    if (state.notificacoesAtivas) return desativarNotificacoesPonto();
    return ativarNotificacoesPonto(false);
  }

  // Lembretes ligados por padrao: tenta ativar na entrada, a menos que o usuario tenha desativado.
  async function autoAtivarLembretes() {
    if (lembretesOptOut() || state.notificacoesAtivas) return;
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) return;
    if (ehIos && !ehStandalone()) return;
    if (Notification.permission === 'denied') return;
    await ativarNotificacoesPonto(true);
  }

  // ---------- login ----------
  async function entrar() {
    if (state.entrando) return;
    var tentativa = state.tentativaEntrada + 1;
    state.tentativaEntrada = tentativa;
    var cpf = String(campo('ponto-cpf') || state.cpf).replace(/\D/g, '');
    var senha = campo('ponto-senha') || state.senha;
    state.cpf = cpf; state.senha = senha;
    if (!cpfValido(cpf)) { state.erro = 'CPF inválido. Confira os dígitos antes de continuar.'; render(); return; }
    if (!senha) { state.erro = 'Informe a senha.'; render(); return; }
    state.entrando = true; state.etapaEntrada = 'Validando acesso...'; state.erro = ''; render();
    try {
      var resp = await buscarComPrazo('/api/ponto/resolver-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpf: cpf }),
      }, 10000, 'validar o acesso');
      var r = await resp.json();
      if (r && r.bloqueado) {
        state.entrando = false;
        state.erro = r.mensagem || 'O controle de ponto está indisponível para a sua empresa no momento. Fale com o gestor.';
        render(); return;
      }
      if (!resp.ok || r.erro || !r.email) {
        state.entrando = false; state.erro = 'CPF ou senha inválidos.'; render(); return;
      }
      state.etapaEntrada = 'Confirmando senha...'; render();
      var promessaLogin = db.auth.signInWithPassword({ email: r.email, password: senha });
      // Se o prazo vencer, uma resposta tardia não pode manter uma sessão parcial.
      promessaLogin.then(function () {
        if (state.tentativaEntrada !== tentativa) { try { db.auth.signOut(); } catch (e) {} }
      }).catch(function () {});
      var login = await comPrazo(promessaLogin, 12000, 'confirmar a senha');
      if (login.error || !login.data.user) {
        state.entrando = false; state.erro = 'CPF ou senha inválidos.'; render(); return;
      }
      state.usuario = login.data.user; state.autenticado = true;
      state.senha = ''; state.cpf = ''; state.erro = ''; state.verSenha = false;
      state.etapaEntrada = 'Preparando dados do ponto...'; render();
      await carregarTudo(tentativa);
    } catch (e) {
      if (state.tentativaEntrada !== tentativa) return;
      await bloquearPonto(e && e.codigo === 'PONTO_TIMEOUT'
        ? 'A conexão demorou mais que o normal. Confira a internet e tente novamente.'
        : 'Não foi possível entrar. Tente novamente.');
    }
  }

  async function sair() {
    pararSincronizacaoConfiguracaoPonto();
    try { await db.auth.signOut(); } catch (e) {}
    state.autenticado = false; state.usuario = null; state.empresa = null; state.funcionario = null;
    state.pontoConfig = null; state.facial = { ativo: false, podeCadastrar: false }; state.pontoHoje = []; state.comprovante = null; state.view = 'bater';
    state.cpf = ''; state.senha = ''; state.verSenha = false; state.erro = '';
    state.entrando = false; state.etapaEntrada = ''; state.tentativaEntrada += 1; state.batendo = false; state.registros = []; state.periodo = 'dia';
    state.localizacaoAtual = null; state.localizacaoAtualizadaEm = 0; state.localizacaoAtualizando = false; state.localizacaoMsg = '';
    state.notificacoesAtivas = false; state.notificacoesAtualizando = false;
    render();
  }

  // Verifica no servidor se o módulo Controle de Ponto continua ativo para a
  // empresa. Fail-open: em erro de rede/servidor, não bloqueia (retorna true).
  async function pontoAcessoAtivo(empresaId) {
    if (!empresaId) return true;
    try {
      var sessao = await comPrazo(db.auth.getSession(), 6000, 'confirmar a sessão');
      var token = sessao && sessao.data && sessao.data.session && sessao.data.session.access_token;
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = 'Bearer ' + token;
      var resp = await buscarComPrazo('/api/ponto/verificar-acesso', {
        method: 'POST', headers: headers, body: JSON.stringify({ empresaId: empresaId }),
      }, 8000, 'verificar o módulo de ponto');
      if (!resp.ok) return true;
      var r = await resp.json();
      state.pontoAcessoMotivo = r && r.motivo ? r.motivo : '';
      return r && r.ativo !== false;
    } catch (e) { return true; }
  }

  // Encerra a sessão e mostra a tela de login com a mensagem de bloqueio.
  async function bloquearPonto(msg) {
    pararSincronizacaoConfiguracaoPonto();
    try { await db.auth.signOut(); } catch (e) {}
    state.autenticado = false; state.usuario = null; state.empresa = null; state.funcionario = null;
    state.pontoConfig = null; state.pontoHoje = []; state.comprovante = null; state.view = 'bater';
    state.cpf = ''; state.senha = ''; state.verSenha = false;
    state.entrando = false; state.etapaEntrada = ''; state.tentativaEntrada += 1; state.batendo = false; state.registros = []; state.periodo = 'dia';
    state.carregando = false; state.pronto = true;
    state.notificacoesAtivas = false; state.notificacoesAtualizando = false;
    state.erro = msg || 'O controle de ponto está indisponível para a sua empresa no momento. Fale com o gestor.';
    render();
  }

  async function carregarTudo(tentativa) {
    var uid = state.usuario.id;
    var md = state.usuario.user_metadata || {};
    var empresaId = md.empresa_id || null;
    var vazio = Promise.resolve({ data: null, error: null });
    state.carregando = true;
    try {
      // Carrega tudo em paralelo (mais rápido e evita travar em sequência).
      var res = await Promise.all([
        comPrazo(db.from('ponto_funcionarios').select('nome, cpf, cargo, ativo, dias_trabalho, hora_entrada, hora_saida, empresa_id').eq('user_id', uid).maybeSingle(), 10000, 'carregar o cadastro do funcionário'),
        empresaId ? comPrazo(db.from('empresas').select('id, nome').eq('id', empresaId).maybeSingle(), 10000, 'carregar a empresa') : vazio,
        empresaId ? comPrazo(db.from('ponto_config').select('latitude, longitude, raio_m, reconhecimento_facial_status, reconhecimento_facial_tipos').eq('empresa_id', empresaId).maybeSingle(), 10000, 'carregar a configuração do ponto') : vazio,
        comPrazo(db.from('ponto_registros').select('id, tipo, registrado_em').eq('user_id', uid).eq('dia', diaPontoHoje()).order('registrado_em', { ascending: true }), 10000, 'carregar os registros de hoje'),
        carregarStatusFacial(empresaId),
      ]);
      var f = res[0], emp = res[1], cfg = res[2], hoje = res[3], facial = res[4];
      if (!f || f.error || !f.data || f.data.ativo !== true) {
        await bloquearPonto('Seu acesso ao Controle de Ponto está inativo. Fale com o gestor.');
        return;
      }
      // Bloqueio de sessão já aberta ("Manter conectado"): se o gestor removeu o
      // módulo, encerra a sessão em vez de carregar a tela de bater ponto.
      var empresaIdCheck = (f && f.data && f.data.empresa_id) || empresaId;
      if (!(await pontoAcessoAtivo(empresaIdCheck))) {
        await bloquearPonto(state.pontoAcessoMotivo === 'assinatura'
          ? 'A assinatura da empresa precisa ser regularizada. Fale com o gestor.'
          : state.pontoAcessoMotivo === 'funcionario'
            ? 'Seu acesso ao Controle de Ponto está inativo. Fale com o gestor.'
          : 'O controle de ponto foi desativado para a sua empresa. Fale com o gestor.');
        return;
      }
      if (f && !f.error && f.data) state.funcionario = f.data;
      if (emp && !emp.error && emp.data) state.empresa = emp.data;
      state.pontoConfig = (cfg && !cfg.error && cfg.data) ? cfg.data : null;
      iniciarSincronizacaoConfiguracaoPonto((f && f.data && f.data.empresa_id) || empresaId);
      state.facial = facial || { ativo: false, podeCadastrar: false };
      if (hoje && !hoje.error) state.pontoHoje = hoje.data || [];
      // Notificações não são requisito para abrir o ponto; não podem atrasar o acesso.
      await comPrazo(verificarNotificacoesPonto(), 5000, 'verificar notificações').catch(function (erro) {
        console.warn('Notificações do ponto indisponíveis nesta entrada:', erro);
      });
    } catch (e) {
      console.error('Erro ao carregar dados do ponto:', e);
      if (tentativa == null || state.tentativaEntrada === tentativa) {
        await bloquearPonto(e && e.codigo === 'PONTO_TIMEOUT'
          ? 'Não foi possível preparar o ponto a tempo. Tente novamente.'
          : 'Não foi possível preparar seu acesso ao ponto. Tente novamente.');
      }
      return;
    }
    if (tentativa != null && state.tentativaEntrada !== tentativa) return;
    state.carregando = false; state.entrando = false; state.etapaEntrada = ''; state.pronto = true; render();
    autoAtivarLembretes();
  }

  async function carregarHoje() {
    try {
      var resp = await db.from('ponto_registros').select('id, tipo, registrado_em').eq('user_id', state.usuario.id).eq('dia', diaPontoHoje()).order('registrado_em', { ascending: true });
      if (!resp.error) state.pontoHoje = resp.data || [];
    } catch (e) {}
  }

  // ---------- bater ponto ----------
  async function registrarComPos(tipo, pos) {
    var md = state.usuario.user_metadata || {};
    var empresaId = (state.empresa && state.empresa.id) || (state.funcionario && state.funcionario.empresa_id) || md.empresa_id;
    var cfg = state.pontoConfig;
    var latEmpresa = numeroConfig(cfg && cfg.latitude);
    var lngEmpresa = numeroConfig(cfg && cfg.longitude);
    var raio = Math.min(10000, Math.max(1, Math.round(numeroConfig(cfg && cfg.raio_m) || 100)));
    var latAtual = numeroConfig(pos && pos.coords && pos.coords.latitude);
    var lngAtual = numeroConfig(pos && pos.coords && pos.coords.longitude);
    var precisao = numeroConfig(pos && pos.coords && pos.coords.accuracy);

    if (!empresaId || !isFinite(latEmpresa) || !isFinite(lngEmpresa)) {
      state.batendo = false;
      mostrarToast('Local da empresa nao configurado. Solicite ao gestor para ajustar o ponto.');
      render();
      return;
    }
    if (!isFinite(latAtual) || !isFinite(lngAtual) || !isFinite(precisao)) {
      state.batendo = false;
      mostrarToast('Localizacao imprecisa. Ative o GPS e tente novamente.');
      render();
      return;
    }
    if (precisao > Math.max(raio, 100)) {
      state.batendo = false;
      mostrarToast('Localizacao com baixa precisao (' + Math.round(precisao) + 'm). Ative o GPS e tente novamente.');
      render();
      return;
    }

    var distancia = distanciaMetros(latEmpresa, lngEmpresa, latAtual, lngAtual);
    if (!isFinite(distancia) || distancia > raio) {
      state.batendo = false;
      mostrarToast('Voce esta a ' + Math.round(distancia || 0) + 'm da empresa. Aproxime-se (limite ' + raio + 'm).');
      render();
      return;
    }
    // Revalida o módulo antes de registrar (caso tenha sido removido durante a sessão).
    if (!(await pontoAcessoAtivo(empresaId))) {
      state.batendo = false;
      await bloquearPonto(state.pontoAcessoMotivo === 'assinatura'
        ? 'A assinatura da empresa precisa ser regularizada. Fale com o gestor.'
        : 'O controle de ponto foi desativado para a sua empresa. Fale com o gestor.');
      return;
    }
    var registro = {
      empresa_id: empresaId, user_id: state.usuario.id, tipo: tipo,
      latitude: latAtual, longitude: lngAtual,
      precisao_m: precisao, dispositivo: navigator.userAgent,
    };
    registro.distancia_m = distancia;
    var resp;
    try { resp = await db.from('ponto_registros').insert(registro).select().single(); }
    catch (e) { state.batendo = false; mostrarToast('Erro ao registrar: ' + ((e && e.message) ? e.message : 'tente novamente')); return; }
    state.batendo = false;
    if (resp.error) { mostrarToast('Nao registrou: ' + (resp.error.message || resp.error.code || 'erro')); return; }
    state.comprovante = { tipo: tipo, registrado_em: resp.data.registrado_em, codigo: resp.data.id, lat: latAtual, lng: lngAtual, distancia: distancia };
    await carregarHoje();
    render();
  }

  function guardarLocalizacao(pos) {
    state.localizacaoAtual = pos;
    state.localizacaoAtualizadaEm = Date.now();
    var precisao = numeroConfig(pos && pos.coords && pos.coords.accuracy);
    state.localizacaoMsg = 'Atualizada as ' + horaCurta(state.localizacaoAtualizadaEm) + (isFinite(precisao) ? ' - precisao ' + Math.round(precisao) + 'm' : '');
  }

  function localizacaoRecente() {
    return state.localizacaoAtual && state.localizacaoAtualizadaEm && (Date.now() - state.localizacaoAtualizadaEm < 120000);
  }

  function solicitarLocalizacao(sucesso, falha) {
    if (!navigator.geolocation) { falha('Geolocalizacao indisponivel neste aparelho.'); return; }

    var finalizado = false;
    var watchdog = setTimeout(function () {
      if (finalizado) return;
      finalizado = true;
      falha('Nao consegui a localizacao. Verifique a permissao de localizacao e tente de novo.');
    }, 14000);

    var concluir = function (pos) {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(watchdog);
      sucesso(pos);
    };
    var pedir = function (alta, aoFalhar) {
      try { navigator.geolocation.getCurrentPosition(concluir, aoFalhar, { enableHighAccuracy: alta, timeout: 12000, maximumAge: 0 }); }
      catch (e) { aoFalhar(e); }
    };
    pedir(true, function () {
      if (finalizado) return;
      pedir(false, function (err) {
        if (finalizado) return;
        finalizado = true;
        clearTimeout(watchdog);
        falha('Localizacao indisponivel: ' + ((err && err.message) ? err.message : 'permita a localizacao e tente de novo'));
      });
    });
  }

  function atualizarLocalizacao() {
    if (state.localizacaoAtualizando || state.batendo) return;
    state.localizacaoAtualizando = true;
    state.localizacaoMsg = 'Atualizando localizacao...';
    render();
    solicitarLocalizacao(function (pos) {
      guardarLocalizacao(pos);
      state.localizacaoAtualizando = false;
      mostrarToast('Localizacao atualizada.');
      render();
    }, function (msg) {
      state.localizacaoAtualizando = false;
      state.localizacaoMsg = msg;
      mostrarToast(msg);
      render();
    });
  }

  function bater(tipo) {
    if (state.batendo) return;
    state.confirmarTipo = null;
    var f = state.funcionario;
    if (f && Array.isArray(f.dias_trabalho) && f.dias_trabalho.length > 0 && f.dias_trabalho.indexOf(diaSemanaHoje()) === -1) {
      mostrarToast('Hoje nao e um dia de trabalho. Nao e possivel bater o ponto.'); return;
    }
    if (!navigator.geolocation) { mostrarToast('Geolocalizacao indisponivel neste aparelho.'); return; }
    state.batendo = true; render();

    if (localizacaoRecente()) {
      registrarComPos(tipo, state.localizacaoAtual);
      return;
    }

    solicitarLocalizacao(function (pos) {
      guardarLocalizacao(pos);
      registrarComPos(tipo, pos);
    }, function (msg) {
      state.batendo = false;
      mostrarToast(msg);
      render();
    });
  }

  // ---------- registros ----------
  function inicioPeriodo(p) {
    var d = new Date();
    if (p === 'semana') d.setDate(d.getDate() - 7);
    else if (p === 'mes') d.setMonth(d.getMonth() - 1);
    else if (p === 'ano') d.setFullYear(d.getFullYear() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  async function carregarRegistros(periodo) {
    state.periodo = periodo; state.view = 'registros'; state.carregandoReg = true; render();
    try {
      var consulta = db.from('ponto_registros').select('id, tipo, registrado_em, dia, distancia_m').eq('user_id', state.usuario.id);
      if (periodo !== 'todo') consulta = consulta.gte('dia', inicioPeriodo(periodo));
      var resp = await consulta.order('registrado_em', { ascending: true });
      state.registros = (!resp.error && resp.data) ? resp.data : [];
    } catch (e) { state.registros = []; }
    state.carregandoReg = false; render();
  }
  async function baixarComprovante(id) {
    try {
      var sessao = await db.auth.getSession();
      var token = sessao && sessao.data && sessao.data.session && sessao.data.session.access_token;
      if (!token || !id) throw new Error('Sessão não encontrada.');
      var resposta = await fetch('/api/ponto/comprovante/' + encodeURIComponent(id), { headers: { Authorization: 'Bearer ' + token } });
      if (!resposta.ok) { var corpo = await resposta.json().catch(function () { return {}; }); throw new Error(corpo.mensagem || 'Não foi possível gerar o PDF.'); }
      var arquivo = await resposta.blob();
      var urlArquivo = URL.createObjectURL(arquivo);
      var link = document.createElement('a');
      link.href = urlArquivo; link.download = 'comprovante-ponto-' + id + '.pdf';
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(urlArquivo);
    } catch (erro) { mostrarToast((erro && erro.message) || 'Não foi possível gerar o PDF.'); }
  }
  function calcHorasDia(regs) {
    function t(tp) { var r = regs.filter(function (x) { return x.tipo === tp; })[0]; return r ? new Date(r.registrado_em).getTime() : null; }
    var ent = t('entrada'), sai = t('saida'), sref = t('saida_refeicao'), rref = t('retorno_refeicao');
    if (ent == null || sai == null) return '';
    var ms = sai - ent;
    if (sref != null && rref != null) ms -= (rref - sref);
    if (ms < 0) return '';
    var min = Math.round(ms / 60000), h = Math.floor(min / 60);
    return h + 'h ' + String(min % 60).padStart(2, '0') + 'min';
  }

  function iconeCompartilhar() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 12v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>';
  }

  function instalarPonto() {
    if (ehStandalone()) return;
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(function () { installPrompt = null; render(); });
      return;
    }
    // iOS (ou navegador sem prompt nativo): mostra instruções com o ícone de compartilhar.
    state.instalarInstrucao = true;
    render();
  }

  function instrucaoInstalarHtml() {
    if (!state.instalarInstrucao) return '';
    return (
      '<div id="ponto-instalar-overlay" class="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-4">' +
        '<div class="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">' +
          '<h2 class="text-base font-black text-slate-900">Instalar o Controle de Ponto</h2>' +
          '<div class="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">' +
            '<p>No seu navegador, toque no botão <strong>Compartilhar</strong> <span class="inline-flex h-5 w-5 items-center justify-center align-middle text-sky-600">' + iconeCompartilhar() + '</span>.</p>' +
            '<p>Depois escolha <strong>Adicionar à Tela de Início</strong>.</p>' +
            '<p class="text-xs font-semibold text-slate-500">Assim o ponto abre como um app no seu celular.</p>' +
          '</div>' +
          '<button id="ponto-instalar-fechar" type="button" class="mt-4 h-11 w-full rounded-xl bg-slate-950 text-sm font-black uppercase tracking-wide text-white">Entendi</button>' +
        '</div>' +
      '</div>'
    );
  }

  function confirmacaoPontoHtml() {
    if (!state.confirmarTipo) return '';
    var rotulo = rotuloAcao(state.confirmarTipo);
    return (
      '<div id="ponto-confirmar-overlay" class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">' +
        '<section class="w-full max-w-sm rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">' +
          '<p class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">Confirmar registro</p>' +
          '<h2 class="mt-2 text-xl font-black">Registrar ' + escapeHtml(rotulo).toLowerCase() + '?</h2>' +
          '<p class="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Confirme somente se deseja registrar este ponto agora. Após salvar, o registro fica vinculado ao seu horário e localização.</p>' +
          '<div class="mt-5 grid grid-cols-2 gap-2">' +
            '<button id="ponto-confirmar-cancelar" type="button" class="h-12 rounded-2xl border border-slate-300 bg-white text-sm font-black uppercase tracking-wide text-slate-600">Cancelar</button>' +
            '<button id="ponto-confirmar-ok" type="button" class="h-12 rounded-2xl bg-cyan-600 text-sm font-black uppercase tracking-wide text-white shadow-lg">Confirmar</button>' +
          '</div>' +
        '</section>' +
      '</div>'
    );
  }

  function ajustesPontoHtml() {
    if (!state.ajustesAberto) return '';
    var ativo = state.notificacoesAtivas;
    var carregando = state.notificacoesAtualizando;
    return (
      '<div id="ponto-ajustes-overlay" class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">' +
        '<section class="my-auto w-full max-w-sm rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div>' +
              '<p class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">Ajustes</p>' +
              '<h2 class="mt-1 text-xl font-black">Preferências</h2>' +
            '</div>' +
            '<button id="ponto-ajustes-fechar" type="button" aria-label="Fechar" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">' +
              '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 6l12 12M18 6L6 18"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">' +
            '<div class="min-w-0">' +
              '<p class="text-sm font-black text-slate-800">Lembretes de ponto</p>' +
              '<p class="mt-0.5 text-xs font-semibold leading-snug text-slate-500">Avisos de entrada e saída — 10 min antes e no horário.</p>' +
            '</div>' +
            '<button id="ponto-lembretes-toggle" type="button" ' + (carregando ? 'disabled' : '') + ' role="switch" aria-checked="' + (ativo ? 'true' : 'false') + '" class="relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ' + (ativo ? 'bg-emerald-500' : 'bg-slate-300') + '">' +
              '<span class="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ' + (ativo ? 'left-[22px]' : 'left-0.5') + '"></span>' +
            '</button>' +
          '</div>' +
          (carregando ? '<p class="mt-2 text-center text-[11px] font-bold text-slate-400">Atualizando…</p>' : '') +
        '</section>' +
      '</div>'
    );
  }

  function ajudaPontoHtml() {
    if (!state.ajudaAberta) return '';
    var passos = [
      ['1', 'Confira a localização', 'Antes de registrar, confirme se a localização está atualizada. Se necessário, toque em Atualizar.'],
      ['2', 'Toque em Bater ponto', 'O sistema identifica automaticamente a próxima etapa: entrada, saída para refeição, retorno ou saída.'],
      ['3', 'Confirme o registro', 'Revise a etapa exibida e toque em Confirmar. Se a empresa exigir reconhecimento facial nessa batida, siga as instruções da câmera.'],
      ['4', 'Acompanhe o dia', 'Os cards mostram horários concluídos e a próxima batida. Em Meus registros você consulta o histórico e os comprovantes.'],
    ];
    return (
      '<div id="ponto-ajuda-overlay" class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4" role="presentation">' +
        '<section role="dialog" aria-modal="true" aria-labelledby="ponto-ajuda-titulo" class="my-auto w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 text-slate-900 shadow-2xl" style="max-height:calc(100dvh - 32px)">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div><p class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">Guia rápido</p><h2 id="ponto-ajuda-titulo" class="mt-1 text-xl font-black">Como usar o ponto</h2><p class="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Registre sua jornada em quatro passos simples.</p></div>' +
            '<button id="ponto-ajuda-fechar" type="button" aria-label="Fechar ajuda" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">' +
              '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 6l12 12M18 6L6 18"/></svg>' +
            '</button>' +
          '</div>' +
          '<ol class="mt-4 grid gap-2">' + passos.map(function (passo) {
            return '<li class="grid grid-cols-[36px_1fr] gap-3 rounded-2xl bg-slate-50 p-3"><span class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700" aria-hidden="true">' + passo[0] + '</span><div><h3 class="text-sm font-black text-slate-800">' + passo[1] + '</h3><p class="mt-1 text-xs font-semibold leading-relaxed text-slate-500">' + passo[2] + '</p></div></li>';
          }).join('') + '</ol>' +
          '<p class="mt-4 rounded-2xl bg-blue-50 p-3 text-xs font-semibold leading-relaxed text-blue-900"><strong>Dica:</strong> nunca feche a tela enquanto o registro ou a verificação facial estiverem em andamento.</p>' +
        '</section>' +
      '</div>'
    );
  }

  function cardInstalarHtml() {
    if (ehStandalone()) return '';
    return (
      '<div class="ponto-install-card mx-auto mt-3 h-fit w-full max-w-sm self-start rounded-2xl border border-white/30 p-3 text-slate-800 shadow-lg backdrop-blur-lg" style="background-color:rgba(255,255,255,.16)">' +
        '<div class="flex items-center justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<p class="text-xs font-black uppercase tracking-wide" style="color:#003E73">Controle de Ponto</p>' +
            '<p class="mt-0.5 text-xs font-semibold leading-snug text-slate-600">Instale como app no seu celular.</p>' +
          '</div>' +
          '<button id="ponto-instalar" type="button" class="shrink-0 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-md" style="background:linear-gradient(135deg,#003E73,#00A6C8)">Instalar</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ---------- telas ----------
  function marcaAcessoPonto() {
    return '<img src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" class="ponto-access-brand pointer-events-none">';
  }

  function telaLogin() {
    return (
      '<section class="avantalab-mobile-bg ponto-access-layout fixed inset-0 overflow-hidden" style="height:100dvh;--avantalab-mobile-bg-overlay:linear-gradient(rgba(255,255,255,.10),rgba(255,255,255,0));">' +
        marcaAcessoPonto() +
        '<div class="ponto-access-card mx-auto w-full max-w-sm overflow-y-auto rounded-3xl border border-white/35 p-6 text-slate-900 shadow-2xl backdrop-blur-xl" style="background-color:rgba(255,255,255,.22);max-height:calc(82dvh);overscroll-behavior:contain;">' +
          '<div class="mb-4">' +
            '<h1 class="text-2xl font-black text-slate-900">Controle de Ponto</h1>' +
            '<p class="mt-1 text-sm font-semibold text-slate-600">Entre com seu CPF e senha</p>' +
          '</div>' +
          '<div class="grid gap-3">' +
            '<label class="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">CPF' +
              '<input id="ponto-cpf" inputmode="numeric" autocomplete="off" value="' + escapeHtml(fmtCpf(state.cpf)) + '" placeholder="000.000.000-00" class="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-800 outline-none" />' +
              '<span id="ponto-cpf-aviso" class="text-xs font-bold text-red-600" style="display:' + (state.cpf.length === 11 && !cpfValido(state.cpf) ? 'block' : 'none') + '">CPF inválido — confira os dígitos.</span>' +
            '</label>' +
            '<label class="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Senha' +
              '<div class="relative">' +
                '<input id="ponto-senha" type="' + (state.verSenha ? 'text' : 'password') + '" value="' + escapeHtml(state.senha) + '" placeholder="Sua senha" class="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 pr-12 text-base text-slate-800 outline-none" />' +
                '<button id="ponto-ver-senha" type="button" aria-label="' + (state.verSenha ? 'Ocultar senha' : 'Mostrar senha') + '" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">' +
                  (state.verSenha
                    ? '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L3 3m6.88 6.88L21 21" /></svg>'
                    : '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>') +
                '</button>' +
              '</div>' +
            '</label>' +
            (state.erro ? '<p class="text-xs font-bold text-red-600">' + escapeHtml(state.erro) + '</p>' : '') +
            '<button id="ponto-entrar" type="button" ' + (state.entrando ? 'disabled' : '') + ' class="mt-1 h-12 w-full rounded-xl text-base font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-60" style="background:linear-gradient(135deg,#003E73,#00A6C8)">' + (state.entrando ? escapeHtml(state.etapaEntrada || 'Entrando...') : 'Entrar') + '</button>' +
          '</div>' +
        '</div>' +
        cardInstalarHtml() +
      '</section>'
    );
  }

  function telaComprovante() {
    var c = state.comprovante;
    return (
      '<div class="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto bg-slate-100 px-5 py-6">' +
        '<div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">' +
          '<div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl font-black text-emerald-600">&#10003;</div>' +
          '<h2 class="text-lg font-black text-slate-900">' + escapeHtml(rotuloAcao(c.tipo)) + ' registrada</h2>' +
          '<p class="mt-1 text-sm font-semibold text-slate-500">' + escapeHtml(horaPonto(c.registrado_em)) + ' &middot; ' + escapeHtml(diaPontoHoje().split('-').reverse().join('/')) + '</p>' +
          '<div class="mt-4 grid gap-1 rounded-xl bg-slate-50 p-3 text-left text-xs font-semibold text-slate-600">' +
            '<p>Funcionário: ' + escapeHtml(nomeFunc()) + '</p>' +
            '<p>Empresa: ' + escapeHtml(nomeEmpresa()) + '</p>' +
            '<p>Local: ' + Number(c.lat).toFixed(5) + ', ' + Number(c.lng).toFixed(5) + '</p>' +
            (c.distancia != null ? '<p>Distância da empresa: ' + Math.round(c.distancia) + 'm</p>' : '') +
            '<p>Código de confirmação: ' + escapeHtml(c.codigo) + '</p>' +
          '</div>' +
          '<button id="ponto-comprovante-pdf" type="button" class="mt-3 h-11 w-full rounded-xl bg-[#003E73] text-xs font-black uppercase tracking-wide text-white">Baixar PDF assinado</button>' +
          '<button id="ponto-comprovante-imprimir" type="button" class="mt-3 h-11 w-full rounded-xl border border-slate-300 bg-white text-xs font-black uppercase tracking-wide text-slate-700">Imprimir comprovante</button>' +
          '<button id="ponto-comprovante-ok" type="button" class="mt-5 h-12 w-full rounded-xl bg-slate-950 text-sm font-black uppercase tracking-wide text-white">Concluir</button>' +
        '</div>' +
      '</div>'
    );
  }

  function telaRegistros() {
    var grupos = {};
    state.registros.forEach(function (r) { (grupos[r.dia] = grupos[r.dia] || []).push(r); });
    var dias = Object.keys(grupos).sort().reverse();
    var periodos = [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano'], ['todo', 'Histórico']];
    var listaHtml = state.carregandoReg
      ? '<p class="py-8 text-center text-sm font-semibold text-slate-400">Carregando...</p>'
      : (dias.length === 0
        ? '<p class="py-8 text-center text-sm font-semibold text-slate-400">Nenhum registro no período.</p>'
        : dias.map(function (dia) {
            var regs = grupos[dia];
            var linhas = regs.map(function (r) {
              return '<div class="flex items-center justify-between gap-2 text-xs"><span class="font-bold text-slate-500">' + escapeHtml(rotuloAcao(r.tipo)) + '</span><span class="flex items-center gap-2"><span class="font-black text-slate-800">' + escapeHtml(horaPonto(r.registrado_em)) + '</span><button id="ponto-comprovante-' + escapeHtml(r.id) + '" type="button" class="rounded-md px-2 py-1 text-[10px] font-black text-cyan-800">PDF</button></span></div>';
            }).join('');
            var horas = calcHorasDia(regs);
            return '<div class="rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 hover:bg-slate-100"><div class="mb-1 flex items-center justify-between"><p class="text-sm font-black text-slate-900">' + escapeHtml(dia.slice(8, 10) + '/' + dia.slice(5, 7) + '/' + dia.slice(0, 4)) + '</p>' + (horas ? '<span class="text-[11px] font-black text-cyan-700">' + horas + '</span>' : '') + '</div><div class="grid gap-0.5">' + linhas + '</div></div>';
          }).join(''));

    return (
      '<div class="fixed inset-0 flex flex-col bg-slate-100">' +
        '<header class="no-print shrink-0 px-5 pb-4 text-white shadow-xl" style="padding-top:calc(env(safe-area-inset-top) + 18px);background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%)">' +
          '<div class="mx-auto flex max-w-md items-center gap-3">' +
            '<button id="ponto-voltar" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/15 text-lg font-black text-white" aria-label="Voltar">&lsaquo;</button>' +
            '<div><p class="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">Meus registros</p><h1 class="text-lg font-black text-white">' + escapeHtml(nomeFunc()) + '</h1></div>' +
          '</div>' +
        '</header>' +
        '<div class="flex-1 overflow-y-auto"><div class="mx-auto max-w-md px-5 pt-4" style="padding-bottom:calc(env(safe-area-inset-bottom) + 40px)">' +
          '<div class="no-print mb-3 grid grid-cols-2 gap-1 min-[380px]:grid-cols-5">' +
            periodos.map(function (p) {
              var ativo = state.periodo === p[0];
              return '<button id="ponto-periodo-' + p[0] + '" type="button" class="rounded-lg px-1 py-2 text-[11px] font-black ' + (ativo ? 'bg-cyan-600 text-white' : 'bg-white text-slate-500 border border-slate-200') + '">' + p[1] + '</button>';
            }).join('') +
          '</div>' +
          '<div id="ponto-relatorio-print" class="grid gap-2">' +
            '<div class="hidden print:block"><h2 style="font-weight:900">Relatório de Ponto</h2><p>' + escapeHtml(nomeFunc()) + ' · ' + escapeHtml(nomeEmpresa()) + '</p></div>' +
            listaHtml +
          '</div>' +
          '<button id="ponto-gerar-pdf" type="button" class="no-print mt-5 h-12 w-full rounded-xl bg-slate-950 text-sm font-black uppercase tracking-wide text-white">Gerar PDF</button>' +
        '</div></div>' +
      '</div>'
    );
  }

  function telaPontoPremium() {
    if (state.view === 'registros') return telaRegistros();
    if (state.comprovante) return telaComprovante();

    var tipos = (state.pontoHoje || []).map(function (r) { return r.tipo; });
    var proxima = proximaAcao(tipos);
    var podeEncerrar = tipos.indexOf('entrada') !== -1 && tipos.indexOf('saida') === -1;
    var agora = new Date();
    var diaSemana = agora.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
    var dataHoje = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' }).replace('.', '').toUpperCase();
    var partesNome = String(nomeFunc() || '').trim().split(/\s+/).filter(Boolean);
    var iniciais = ((partesNome[0] || 'A').charAt(0) + (partesNome.length > 1 ? partesNome[partesNome.length - 1].charAt(0) : '')).toUpperCase();
    var iconeRelogio = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path stroke-linecap="round" d="M12 7v5l3.5 2"/></svg>';
    var iconeAjustes = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1.1V21H9.6v-.1A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-.6-1A1.7 1.7 0 002.9 13.6H3V9.6h-.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.34-1.88l-.06-.06L7.06 4.2l.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-.6 1.7 1.7 0 00.4-1.1V3h4v-.1A1.7 1.7 0 0015 4.6a1.7 1.7 0 001.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0019.4 9a1.7 1.7 0 00.6 1 1.7 1.7 0 001.1.4H21v4h.1a1.7 1.7 0 00-1.7.6Z"/></svg>';
    var localOk = localizacaoRecente();
    var localizacaoHtml =
      '<section class="ponto-location" aria-label="Localização do registro">' +
        '<span class="ponto-location-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1116 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>' +
        '<div class="ponto-location-copy"><p>Localização</p><span><i class="' + (localOk ? 'is-ok' : '') + '"></i>' + escapeHtml(state.localizacaoAtualizando ? 'Atualizando localização…' : (localOk ? 'Localização atualizada' : 'Atualize antes de registrar')) + '</span><small>' + escapeHtml(state.localizacaoMsg || 'A precisão será conferida no registro.') + '</small></div>' +
        '<button id="ponto-atualizar-localizacao" type="button" ' + (state.localizacaoAtualizando || state.batendo ? 'disabled' : '') + '>' + (state.localizacaoAtualizando ? 'Atualizando…' : 'Atualizar') + '</button>' +
      '</section>';

    var etapas = [
      { tipo: 'entrada', titulo: 'Entrada', icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 12h14m-5-5 5 5-5 5"/></svg>' },
      { tipo: 'saida_refeicao', titulo: 'Saída almoço', icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M7 3v8m3-8v8M7 7h3m-1.5 4v10M16 3v18m0-18c2 2 2 6 0 8"/></svg>' },
      { tipo: 'retorno_refeicao', titulo: 'Retorno', icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path stroke-linecap="round" stroke-linejoin="round" d="M19 8V4m0 0h-4m4 0-3 3a7 7 0 10.7 9.2"/></svg>' },
      { tipo: 'saida', titulo: 'Saída', icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12h14m-5-5 5 5-5 5"/></svg>' },
    ];
    var etapasHtml = etapas.map(function (etapa) {
      var reg = (state.pontoHoje || []).filter(function (r) { return r.tipo === etapa.tipo; })[0];
      var classe = reg ? ' is-done' : (proxima === etapa.tipo ? ' is-next' : '');
      return '<article class="ponto-step' + classe + '"><span class="ponto-step-icon">' + (reg ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path stroke-linecap="round" stroke-linejoin="round" d="m6 12 4 4 8-9"/></svg>' : etapa.icone) + '</span><p>' + escapeHtml(etapa.titulo) + '</p><strong>' + (reg ? escapeHtml(horaPonto(reg.registrado_em)) : '--:--') + '</strong><small>' + (reg ? 'Concluído' : (proxima === etapa.tipo ? 'Próximo' : 'Pendente')) + '</small></article>';
    });
    var acaoCentral = proxima
      ? '<button id="ponto-acao" data-tipo="' + proxima + '" type="button" ' + (state.batendo ? 'disabled' : '') + ' aria-label="Registrar ' + escapeHtml(rotuloAcao(proxima)) + '"><span class="ponto-action-icon">' + iconeRelogio + '</span><strong>' + (state.batendo ? 'REGISTRANDO…' : 'BATER<br>PONTO') + '</strong><small>' + (state.batendo ? 'Aguarde um instante' : 'Toque para registrar') + '</small></button>'
      : '<div class="ponto-action is-complete" role="status"><span class="ponto-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12 4 4L19 6"/></svg></span><strong>JORNADA<br>CONCLUÍDA</strong><small>Registros completos</small></div>';
    var facialAtivo = state.facial && state.facial.ativo === true;
    var facialPodeCadastrar = state.facial && state.facial.podeCadastrar === true;
    var facialHtml = (facialAtivo || facialPodeCadastrar)
      ? '<button id="ponto-cadastrar-facial" type="button" class="ponto-facial-badge"><span class="ponto-facial-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M4 8V5a1 1 0 011-1h3m8 0h3a1 1 0 011 1v3M4 16v3a1 1 0 001 1h3m8 0h3a1 1 0 001-1v-3"/><circle cx="12" cy="11" r="3.5"/><path stroke-linecap="round" d="M8.5 17c.8-1.5 2-2.2 3.5-2.2s2.7.7 3.5 2.2"/></svg></span><span><strong>' + (facialAtivo ? 'Reconhecimento facial ativo' : 'Cadastro facial disponível') + '</strong><small>' + (facialAtivo ? 'Toque para atualizar' : 'Toque para cadastrar') + '</small></span><svg class="ponto-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/></svg></button>'
      : '';

    var cssPontoPremium = '<style>' +
      '.ponto-home{position:fixed;inset:0;overflow:hidden;background:#f5f7fa;color:#1b1f23;font-family:var(--av-font-family,Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);overscroll-behavior-y:contain}.ponto-shell{display:flex;width:100%;height:100%;max-width:460px;flex-direction:column;margin:0 auto;padding:calc(env(safe-area-inset-top) + 10px) 14px calc(env(safe-area-inset-bottom) + 10px)}' +
      '.ponto-hero{position:relative;overflow:hidden;min-height:126px;border-radius:24px;padding:20px;color:#fff;background:linear-gradient(135deg,#0b2c67 0%,#0a5ed7 64%,#187fd9 100%);box-shadow:0 12px 30px rgba(11,44,103,.18)}.ponto-hero:after{content:"";position:absolute;inset:auto -20% -70% 20%;height:130px;border-radius:50%;background:rgba(255,255,255,.08);transform:rotate(-8deg)}.ponto-hero-main{position:relative;z-index:1;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:13px}' +
      '.ponto-avatar{display:flex;width:58px;height:58px;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.82);border-radius:50%;background:rgba(255,255,255,.14);font-size:17px;font-weight:600;letter-spacing:.04em;box-shadow:0 5px 15px rgba(0,0,0,.12)}.ponto-identity{min-width:0}.ponto-identity h1{margin:0;font-size:clamp(20px,6vw,27px);font-weight:600;letter-spacing:-.025em;line-height:1.08;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ponto-identity p{margin:5px 0 0;color:rgba(255,255,255,.82);font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.ponto-date{position:relative;z-index:1;display:flex;align-items:center;gap:8px;margin:14px 0 0 71px;color:rgba(255,255,255,.78);font-size:11px;font-weight:500;text-transform:capitalize}.ponto-date strong{color:#fff;font-size:12px;font-weight:600;letter-spacing:.035em}.ponto-date svg{width:17px;height:17px}' +
      '.ponto-location{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;margin-top:12px;padding:12px 13px;border-radius:20px;background:#fff;box-shadow:0 5px 18px rgba(20,45,80,.06)}.ponto-location-icon{display:flex;width:42px;height:42px;align-items:center;justify-content:center;border-radius:50%;background:#edf6ff;color:#0a5ed7}.ponto-location-icon svg{width:22px;height:22px}.ponto-location-copy{min-width:0}.ponto-location-copy p{margin:0;color:#667085;font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}.ponto-location-copy span{display:flex;align-items:center;gap:6px;margin-top:2px;color:#24324a;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ponto-location-copy i{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#f59e0b}.ponto-location-copy i.is-ok{background:#24b36b}.ponto-location-copy small{display:block;margin-top:1px;color:#98a2b3;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ponto-location button{min-height:38px;padding:0 13px;border:0;border-radius:18px;background:#f0f6ff;color:#0a5ed7;font-size:10px;font-weight:600;text-transform:uppercase}.ponto-location button:disabled{opacity:.55}' +
      '.ponto-orbit{--action-size:clamp(150px,44vw,184px);display:grid;flex:0 1 auto;grid-template-columns:minmax(0,1fr) var(--action-size) minmax(0,1fr);grid-template-rows:repeat(2,minmax(76px,1fr));align-items:center;gap:8px 8px;margin-top:12px}.ponto-step{display:flex;min-width:0;min-height:74px;flex-direction:column;align-items:center;justify-content:center;padding:6px 3px;border-radius:20px;background:#fff;text-align:center;box-shadow:0 4px 14px rgba(20,45,80,.055)}.ponto-step:nth-child(1){grid-column:1;grid-row:1}.ponto-step:nth-child(2){grid-column:1;grid-row:2}.ponto-step:nth-child(3){grid-column:3;grid-row:1}.ponto-step:nth-child(4){grid-column:3;grid-row:2}.ponto-step-icon{display:flex;width:29px;height:29px;align-items:center;justify-content:center;border-radius:50%;background:#f3f5f8;color:#8b95a7}.ponto-step-icon svg{width:16px;height:16px}.ponto-step p{min-height:20px;margin:4px 0 0;color:#687386;font-size:8.5px;font-weight:600;line-height:1.2;text-transform:uppercase}.ponto-step strong{margin-top:1px;color:#aab1bd;font-size:12px;font-weight:600}.ponto-step small{margin-top:1px;color:#b1b7c1;font-size:7.5px;font-weight:500}.ponto-step.is-done{background:#f2fbf6}.ponto-step.is-done .ponto-step-icon{background:#dcf7e8;color:#24b36b}.ponto-step.is-done strong{color:#24a864}.ponto-step.is-done small{color:#5b9976}.ponto-step.is-next{box-shadow:inset 0 0 0 1.5px rgba(10,94,215,.16),0 5px 16px rgba(10,94,215,.08)}.ponto-step.is-next .ponto-step-icon{background:#eaf3ff;color:#0a5ed7}.ponto-step.is-next small{color:#0a5ed7}' +
      '#ponto-acao,.ponto-action{position:relative;grid-column:2;grid-row:1/3;display:flex;width:var(--action-size);height:var(--action-size);flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border:8px solid #fff;border-radius:50%;background:linear-gradient(145deg,#3aa8ff 0%,#0a5ed7 55%,#0b4fae 100%);color:#fff;box-shadow:0 0 0 7px rgba(10,94,215,.045),0 12px 22px rgba(10,94,215,.16);transition:transform .18s ease,box-shadow .2s ease}#ponto-acao:active{transform:scale(.96)}#ponto-acao:disabled{opacity:.72}.ponto-action-icon{display:flex;width:43px;height:43px;align-items:center;justify-content:center;margin-bottom:7px;border:1.5px solid rgba(255,255,255,.72);border-radius:50%}.ponto-action-icon svg{width:25px;height:25px}.ponto-action strong,#ponto-acao strong{font-size:clamp(20px,6vw,27px);font-weight:600;letter-spacing:.015em;line-height:1.03}.ponto-action small,#ponto-acao small{margin-top:8px;color:rgba(255,255,255,.82);font-size:10px;font-weight:500}.ponto-action.is-complete{background:linear-gradient(145deg,#42c981,#24b36b 64%,#198652);box-shadow:0 0 0 7px rgba(36,179,107,.045),0 12px 22px rgba(36,179,107,.14)}#ponto-acao.ponto-action-pulse{animation:ponto-action-tap .25s ease-out}.ponto-action-pulse:after{content:"";position:absolute;inset:25%;border:1px solid rgba(255,255,255,.5);border-radius:50%;animation:ponto-ripple .4s ease-out forwards}' +
      '.ponto-early-exit{display:block;margin:10px auto 0;padding:6px 10px;border:0;background:transparent;color:#8a94a4;font-size:10px;font-weight:500;text-decoration:underline;text-underline-offset:3px}.ponto-facial-badge{display:grid;width:min(100%,330px);min-height:52px;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;margin:14px auto 0;padding:8px 12px;border:0;border-radius:18px;background:#edf5ff;color:#0a5ed7;text-align:left}.ponto-facial-icon{display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:12px;background:#fff}.ponto-facial-icon svg{width:21px;height:21px}.ponto-facial-badge span:nth-child(2){min-width:0}.ponto-facial-badge strong{display:block;font-size:11px;font-weight:600}.ponto-facial-badge small{display:block;margin-top:1px;color:#6e8bb4;font-size:8.5px;font-weight:500}.ponto-chevron{width:16px;height:16px;color:#82a5d3}' +
      '.ponto-links{overflow:hidden;margin-top:14px;border-radius:20px;background:#fff;box-shadow:0 5px 18px rgba(20,45,80,.06)}.ponto-link-row{display:grid;width:100%;min-height:60px;grid-template-columns:auto 1fr auto;align-items:center;gap:11px;padding:8px 14px;border:0;background:#fff;color:#26354f;text-align:left}.ponto-link-row+.ponto-link-row{border-top:1px solid #edf0f4}.ponto-link-icon{display:flex;width:37px;height:37px;align-items:center;justify-content:center;border-radius:14px;background:#edf5ff;color:#0a5ed7}.ponto-link-icon svg{width:20px;height:20px}.ponto-link-row strong{display:block;font-size:12px;font-weight:600}.ponto-link-row small{display:block;margin-top:2px;color:#98a2b3;font-size:9px;font-weight:500}.ponto-link-row>.ponto-chevron{color:#a5aebb}' +
      '.ponto-bottom-nav{display:grid;grid-template-columns:1fr 1fr 1fr;align-items:end;gap:8px;margin-top:14px;padding:10px 12px 7px;border-radius:24px;background:#fff;box-shadow:0 5px 18px rgba(20,45,80,.07)}.ponto-nav-action{display:flex;min-height:48px;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;background:transparent;color:#7b8494;font-size:8.5px;font-weight:600}.ponto-nav-action svg{width:21px;height:21px}.ponto-nav-action.is-primary{color:#0a5ed7}.ponto-nav-action.is-primary span{display:flex;width:46px;height:46px;align-items:center;justify-content:center;border-radius:50%;background:#0a5ed7;color:#fff;box-shadow:0 7px 15px rgba(10,94,215,.2)}.ponto-nav-action.is-primary svg{width:23px;height:23px}.ponto-nav-action.is-logout{color:#9a5961}.ponto-home button{font-family:inherit;cursor:pointer}.ponto-home button:focus-visible{outline:3px solid rgba(58,168,255,.4);outline-offset:3px}' +
      '@keyframes ponto-action-tap{0%{transform:scale(1)}35%{transform:scale(.96)}70%{transform:scale(1.05)}100%{transform:scale(1)}}@keyframes ponto-ripple{from{opacity:.8;transform:scale(.5)}to{opacity:0;transform:scale(3)}}@media(max-width:350px){.ponto-shell{padding-left:10px;padding-right:10px}.ponto-hero{min-height:104px;padding:14px}.ponto-avatar{width:46px;height:46px}.ponto-date{margin-top:8px;margin-left:59px}.ponto-date span{display:none}.ponto-orbit{--action-size:148px;column-gap:7px}.ponto-step p{font-size:7.7px}.ponto-location{gap:7px;padding:9px}.ponto-location-icon{width:36px;height:36px}.ponto-location-copy small{display:none}.ponto-location button{padding:0 8px;font-size:8.5px}}@media(max-height:760px){.ponto-shell{padding-top:calc(env(safe-area-inset-top) + 7px);padding-bottom:calc(env(safe-area-inset-bottom) + 7px)}.ponto-hero{min-height:96px;padding:12px 15px}.ponto-avatar{width:46px;height:46px}.ponto-identity h1{font-size:20px}.ponto-identity p{margin-top:3px;font-size:11px}.ponto-date{margin-top:6px;margin-left:59px}.ponto-location{margin-top:7px;padding:8px 10px}.ponto-location-icon{width:36px;height:36px}.ponto-location-copy small{display:none}.ponto-location button{min-height:34px}.ponto-orbit{--action-size:152px;grid-template-rows:repeat(2,minmax(69px,1fr));gap:5px 8px;margin-top:7px}.ponto-step{min-height:67px;padding:4px 2px}.ponto-step-icon{width:25px;height:25px}.ponto-step p{min-height:17px;margin-top:3px}.ponto-step small{display:none}.ponto-action-icon{width:36px;height:36px;margin-bottom:5px}.ponto-action-icon svg{width:21px;height:21px}.ponto-action strong,#ponto-acao strong{font-size:20px}.ponto-action small,#ponto-acao small{margin-top:5px}.ponto-early-exit{margin-top:3px;padding:3px 8px}.ponto-facial-badge{min-height:44px;margin-top:6px;padding:5px 10px}.ponto-facial-icon{width:30px;height:30px}.ponto-links{margin-top:6px}.ponto-link-row{min-height:47px;padding:5px 12px}.ponto-link-icon{width:32px;height:32px}.ponto-link-row small{display:none}.ponto-bottom-nav{margin-top:6px;padding:3px 10px 2px}.ponto-nav-action{min-height:43px}.ponto-nav-action.is-primary span{width:38px;height:38px}}@media(max-height:610px){.ponto-shell{padding-top:calc(env(safe-area-inset-top) + 5px);padding-bottom:calc(env(safe-area-inset-bottom) + 5px)}.ponto-hero{min-height:78px;padding:9px 12px}.ponto-avatar{width:39px;height:39px;font-size:14px}.ponto-hero-main{gap:9px}.ponto-identity h1{font-size:17px}.ponto-identity p{font-size:10px}.ponto-date{margin-top:3px;margin-left:48px;font-size:9px}.ponto-date svg{width:14px;height:14px}.ponto-date strong{font-size:9px}.ponto-location{margin-top:5px;padding:6px 8px;border-radius:16px}.ponto-location-icon{width:32px;height:32px}.ponto-location-copy p{font-size:8px}.ponto-location-copy span{font-size:10px}.ponto-location button{min-height:30px;padding:0 8px;font-size:8px}.ponto-orbit{--action-size:136px;grid-template-rows:repeat(2,minmax(59px,1fr));gap:4px 7px;margin-top:5px}.ponto-step{min-height:57px;border-radius:15px}.ponto-step-icon{width:21px;height:21px}.ponto-step-icon svg{width:13px;height:13px}.ponto-step p{min-height:14px;margin-top:2px;font-size:7px}.ponto-step strong{font-size:10px}.ponto-action-icon{width:31px;height:31px}.ponto-action strong,#ponto-acao strong{font-size:17px}.ponto-action small,#ponto-acao small{font-size:8px}.ponto-early-exit{font-size:8px}.ponto-facial-badge{min-height:38px;margin-top:4px;padding:3px 9px}.ponto-facial-icon{width:27px;height:27px}.ponto-facial-badge strong{font-size:9px}.ponto-facial-badge small{display:none}.ponto-links{margin-top:4px;border-radius:16px}.ponto-link-row{min-height:38px;padding:3px 10px}.ponto-link-icon{width:27px;height:27px;border-radius:10px}.ponto-link-row strong{font-size:10px}.ponto-bottom-nav{margin-top:4px;border-radius:17px;padding:1px 9px}.ponto-nav-action{min-height:37px}.ponto-nav-action.is-primary span{width:30px;height:30px}.ponto-nav-action svg{width:17px;height:17px}}@media(prefers-reduced-motion:reduce){#ponto-acao,.ponto-action{transition:none}#ponto-acao.ponto-action-pulse,.ponto-action-pulse:after{animation:none}}' +
    '</style>';

    return cssPontoPremium + '<div class="ponto-home"><div class="ponto-shell">' +
      '<header class="ponto-hero"><div class="ponto-hero-main"><span class="ponto-avatar" aria-hidden="true">' + escapeHtml(iniciais) + '</span><div class="ponto-identity"><h1>Olá, ' + escapeHtml(partesNome[0] || nomeFunc()) + '</h1><p>' + escapeHtml(nomeEmpresa()) + '</p></div></div><div class="ponto-date"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path stroke-linecap="round" d="M8 3v4m8-4v4M3 10h18"/></svg><span>' + escapeHtml(diaSemana) + '</span><strong>' + escapeHtml(dataHoje) + '</strong></div></header>' +
      localizacaoHtml +
      '<section class="ponto-orbit" aria-label="Fluxo de registros do dia">' + etapasHtml.join('') + acaoCentral + '</section>' +
      (podeEncerrar && proxima !== 'saida' ? '<button id="ponto-encerrar" type="button" class="ponto-early-exit" ' + (state.batendo ? 'disabled' : '') + '>Encerrar expediente agora</button>' : '') +
      facialHtml +
      '<section class="ponto-links" aria-label="Consultas de ponto"><button id="ponto-meus-registros" type="button" class="ponto-link-row"><span class="ponto-link-icon">' + iconeRelogio + '</span><span><strong>Meus registros</strong><small>Confira seus horários registrados</small></span><svg class="ponto-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/></svg></button><button id="ponto-historico-dia" type="button" class="ponto-link-row"><span class="ponto-link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M5 20V10m7 10V4m7 16v-7"/></svg></span><span><strong>Histórico do dia</strong><small>Acompanhe seu resumo diário</small></span><svg class="ponto-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"/></svg></button></section>' +
      '<nav class="ponto-bottom-nav" aria-label="Ações do aplicativo"><button id="ponto-sair" type="button" class="ponto-nav-action is-logout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M10 5H6a2 2 0 00-2 2v10a2 2 0 002 2h4m5-4 4-3-4-3m4 3H9"/></svg>Sair</button><button id="ponto-ajustes" type="button" class="ponto-nav-action is-primary"><span>' + iconeAjustes + '</span>Ajustes</button><button id="ponto-ajuda" type="button" class="ponto-nav-action"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M9.8 9a2.4 2.4 0 014.7.7c0 1.8-2.5 2-2.5 3.8m0 3h.01"/></svg>Ajuda</button></nav>' +
    '</div></div>';
  }

  function telaPonto() {
    if (state.view === 'registros') return telaRegistros();
    if (state.comprovante) return telaComprovante();

    var tipos = (state.pontoHoje || []).map(function (r) { return r.tipo; });
    var proxima = proximaAcao(tipos);
    var podeEncerrar = tipos.indexOf('entrada') !== -1 && tipos.indexOf('saida') === -1;
    var dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
    var localizacaoHtml =
      '<div class="mb-4 rounded-2xl border border-cyan-100 bg-white p-3 shadow-sm">' +
        '<div class="flex items-center justify-between gap-3">' +
          '<div class="min-w-0">' +
            '<p class="text-[10px] font-black uppercase tracking-wide text-cyan-700">Localizacao</p>' +
            '<p class="mt-0.5 truncate text-xs font-semibold text-slate-500">' + escapeHtml(state.localizacaoMsg || 'Atualize antes de registrar se o GPS estiver desatualizado.') + '</p>' +
          '</div>' +
          '<button id="ponto-atualizar-localizacao" type="button" ' + (state.localizacaoAtualizando || state.batendo ? 'disabled' : '') + ' class="shrink-0 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-cyan-700 disabled:opacity-60">' +
            (state.localizacaoAtualizando ? 'Atualizando...' : 'Atualizar') +
          '</button>' +
        '</div>' +
      '</div>';
    var statusHtml = ['entrada', 'saida_refeicao', 'retorno_refeicao', 'saida'].map(function (t) {
      var reg = (state.pontoHoje || []).filter(function (r) { return r.tipo === t; })[0];
      return '<div class="flex items-center justify-between rounded-xl border px-3 py-2.5 ' + (reg ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white') + '">' +
          '<span class="text-xs font-bold ' + (reg ? 'text-emerald-800' : 'text-slate-500') + '">' + escapeHtml(rotuloAcao(t)) + '</span>' +
          '<span class="text-sm font-black ' + (reg ? 'text-emerald-700' : 'text-slate-300') + '">' + (reg ? escapeHtml(horaPonto(reg.registrado_em)) : '&mdash;') + '</span>' +
        '</div>';
    }).join('');

    var botoesHtml = '';
    var facialAtivo = state.facial && state.facial.ativo === true;
    var facialPodeCadastrar = state.facial && state.facial.podeCadastrar === true;
    if (facialAtivo || facialPodeCadastrar) botoesHtml += '<button id="ponto-cadastrar-facial" type="button" class="mb-2 min-h-11 w-full rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-black text-cyan-800">' + (facialAtivo ? 'Atualizar reconhecimento facial' : 'Cadastrar reconhecimento facial') + '</button>';
    if (proxima) {
      botoesHtml += '<button id="ponto-acao" data-tipo="' + proxima + '" type="button" ' + (state.batendo ? 'disabled' : '') + ' class="h-14 w-full rounded-2xl bg-cyan-600 text-base font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-60">' + (state.batendo ? 'Registrando...' : escapeHtml(rotuloAcao(proxima))) + '</button>';
      if (podeEncerrar && proxima !== 'saida') {
        botoesHtml += '<button id="ponto-encerrar" type="button" ' + (state.batendo ? 'disabled' : '') + ' class="mt-2 h-12 w-full rounded-2xl border-2 border-rose-300 bg-white text-sm font-black uppercase tracking-wide text-rose-600 disabled:opacity-60">Encerrar (Saída)</button>';
      }
    } else {
      botoesHtml += '<div class="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-sm font-black text-emerald-700">Expediente encerrado. Até amanhã! &#128075;</div>';
    }

    return (
      '<div class="fixed inset-0 flex flex-col bg-slate-100 text-slate-900">' +
        '<header class="shrink-0 px-5 pb-5 text-white shadow-xl" style="padding-top:calc(env(safe-area-inset-top) + 18px);background:linear-gradient(135deg,#003E73 0%,#075985 54%,#00A6C8 100%)">' +
          '<div class="mx-auto max-w-md">' +
            '<div class="flex items-start justify-between gap-3">' +
              '<div class="min-w-0">' +
                '<p class="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">Controle de Ponto</p>' +
                '<h1 class="mt-1 text-2xl font-black leading-tight text-white">Olá, ' + escapeHtml(String(nomeFunc()).split(' ')[0]) + '</h1>' +
                '<p class="mt-0.5 text-xs font-semibold text-cyan-50">' + escapeHtml(nomeEmpresa()) + '</p>' +
              '</div>' +
              '<button id="ponto-ajustes" type="button" aria-label="Ajustes" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white transition active:scale-95">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.451 2.451 1.724 1.724 0 001.066 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.451 2.451 1.724 1.724 0 00-2.573 1.066 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.451-2.451 1.724 1.724 0 00-1.066-2.573 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.451-2.451 1.724 1.724 0 002.573-1.066z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' +
              '</button>' +
            '</div>' +
            '<p class="mt-2 text-[11px] font-semibold text-cyan-50">' + escapeHtml(dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)) + '</p>' +
          '</div>' +
        '</header>' +
        '<div class="flex-1 overflow-y-auto">' +
          '<div class="mx-auto max-w-md px-5 pt-5" style="padding-bottom:calc(env(safe-area-inset-bottom) + 40px)">' +
            localizacaoHtml +
            '<p class="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Registros de hoje</p>' +
            '<div class="grid gap-2">' + statusHtml + '</div>' +
            '<div class="mt-6">' + botoesHtml + '</div>' +
            '<div class="mt-4 grid grid-cols-2 gap-2">' +
              '<button id="ponto-meus-registros" type="button" class="flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-xs font-black uppercase tracking-wide text-slate-600 shadow-sm">Meus registros</button>' +
              '<button id="ponto-sair" type="button" class="flex h-11 w-full items-center justify-center rounded-xl border border-rose-200 bg-white text-xs font-black uppercase tracking-wide text-rose-600 shadow-sm">Sair</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function telaCarregandoPonto() {
    return (
      '<section class="avantalab-mobile-bg ponto-access-layout fixed inset-0 overflow-hidden" style="height:100dvh;">' +
        marcaAcessoPonto() +
        '<div class="ponto-access-card w-full max-w-xs rounded-3xl border border-white/40 bg-white/25 p-5 text-center text-slate-900 shadow-2xl backdrop-blur-xl">' +
          '<p class="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">AvantaLab</p>' +
          '<h1 class="mt-2 text-xl font-black">Controle de Ponto</h1>' +
          '<p class="mt-2 text-sm font-semibold text-slate-600" aria-live="polite">' + escapeHtml(state.etapaEntrada || 'Preparando acesso...') + '</p>' +
        '</div>' +
      '</section>'
    );
  }

  function toastHtml() {
    if (!state.toast) return '';
    return '<div class="no-print fixed inset-x-0 bottom-6 z-50 flex justify-center px-5"><div class="max-w-sm rounded-xl border border-cyan-200/50 bg-[#0b80bd] px-4 py-3 text-center text-sm font-bold text-white shadow-2xl">' + escapeHtml(state.toast) + '</div></div>';
  }

  function render() {
    var tela;
    if (!state.pronto || (state.autenticado && state.entrando)) tela = telaCarregandoPonto();
    else if (!state.autenticado) tela = telaLogin();
    else tela = telaPontoPremium();
    root.innerHTML = tela + toastHtml() + instrucaoInstalarHtml() + confirmacaoPontoHtml() + ajustesPontoHtml() + ajudaPontoHtml();
    if (state.ajudaAberta) {
      var conteudoPonto = document.querySelector('.ponto-home');
      if (conteudoPonto) { conteudoPonto.setAttribute('inert', ''); conteudoPonto.setAttribute('aria-hidden', 'true'); }
    }

    bind('ponto-entrar', entrar);
    bind('ponto-instalar-fechar', function () { state.instalarInstrucao = false; render(); });
    var ovInstalar = document.getElementById('ponto-instalar-overlay');
    if (ovInstalar) ovInstalar.addEventListener('click', function (e) { if (e.target === ovInstalar) { state.instalarInstrucao = false; render(); } });
    bind('ponto-instalar', instalarPonto);
    bind('ponto-ver-senha', function () { state.senha = campo('ponto-senha'); state.cpf = String(campo('ponto-cpf') || state.cpf).replace(/\D/g, ''); state.verSenha = !state.verSenha; render(); });
    bindInput('ponto-cpf', function () {
      state.cpf = this.value.replace(/\D/g, '').slice(0, 11);
      var invalido = state.cpf.length === 11 && !cpfValido(state.cpf);
      var aviso = document.getElementById('ponto-cpf-aviso');
      if (aviso) aviso.style.display = invalido ? 'block' : 'none';
      this.style.borderColor = invalido ? '#ef4444' : '';
    });
    bindInput('ponto-senha', function () { state.senha = this.value; });
    var cpfEl = document.getElementById('ponto-cpf');
    if (cpfEl) cpfEl.addEventListener('blur', function () { this.value = fmtCpf(this.value); });

    bind('ponto-acao', function () {
      var el = document.getElementById('ponto-acao');
      if (!el || state.batendo) return;
      var tipo = el.getAttribute('data-tipo');
      el.classList.add('ponto-action-pulse');
      setTimeout(function () { state.confirmarTipo = tipo; render(); }, 250);
    });
    bind('ponto-encerrar', function () { state.confirmarTipo = 'saida'; render(); });
    bind('ponto-confirmar-cancelar', function () { state.confirmarTipo = null; render(); });
    bind('ponto-confirmar-ok', function () {
      var tipo = state.confirmarTipo;
      if (!tipo) return;
      var tiposFacial = (state.pontoConfig && state.pontoConfig.reconhecimento_facial_tipos) || ['entrada'];
      var facialAtivo = state.facial && state.facial.ativo === true && tiposFacial.indexOf(tipo) !== -1;
      if (facialAtivo) iniciarFacial('marcacao', function () { bater(tipo); }); else bater(tipo);
    });
    bind('ponto-cadastrar-facial', function () { iniciarFacial('cadastro', function () { mostrarToast('Reconhecimento facial cadastrado com sucesso.'); }); });
    bind('ponto-atualizar-localizacao', atualizarLocalizacao);
    bind('ponto-ajustes', function () { state.ajustesAberto = true; render(); });
    bind('ponto-ajuda', function () { state.ajudaAberta = true; render(); var fechar = document.getElementById('ponto-ajuda-fechar'); if (fechar) fechar.focus(); });
    bind('ponto-ajuda-fechar', function () { state.ajudaAberta = false; render(); var ajuda = document.getElementById('ponto-ajuda'); if (ajuda) ajuda.focus(); });
    var ovAjuda = document.getElementById('ponto-ajuda-overlay');
    if (ovAjuda) ovAjuda.addEventListener('click', function (e) { if (e.target === ovAjuda) { state.ajudaAberta = false; render(); var ajuda = document.getElementById('ponto-ajuda'); if (ajuda) ajuda.focus(); } });
    bind('ponto-ajustes-fechar', function () { state.ajustesAberto = false; render(); });
    var ovAjustes = document.getElementById('ponto-ajustes-overlay');
    if (ovAjustes) ovAjustes.addEventListener('click', function (e) { if (e.target === ovAjustes) { state.ajustesAberto = false; render(); } });
    bind('ponto-lembretes-toggle', alternarNotificacoesPonto);
    var ovConfirmar = document.getElementById('ponto-confirmar-overlay');
    if (ovConfirmar) ovConfirmar.addEventListener('click', function (e) { if (e.target === ovConfirmar) { state.confirmarTipo = null; render(); } });
    bind('ponto-comprovante-ok', function () { state.comprovante = null; render(); });
    bind('ponto-comprovante-pdf', async function () {
      try {
        var sessao = await db.auth.getSession(); var token = sessao && sessao.data && sessao.data.session && sessao.data.session.access_token;
        if (!token || !state.comprovante || !state.comprovante.codigo) throw new Error('Sessão não encontrada.');
        var resposta = await fetch('/api/ponto/comprovante/' + encodeURIComponent(state.comprovante.codigo), { headers: { Authorization: 'Bearer ' + token } });
        if (!resposta.ok) { var corpo = await resposta.json().catch(function () { return {}; }); throw new Error(corpo.mensagem || 'Não foi possível gerar o PDF.'); }
        var arquivo = await resposta.blob(); var urlArquivo = URL.createObjectURL(arquivo); var link = document.createElement('a'); link.href = urlArquivo; link.download = 'comprovante-ponto-' + state.comprovante.codigo + '.pdf'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(urlArquivo);
      } catch (erro) { mostrarToast((erro && erro.message) || 'Não foi possível gerar o PDF.'); }
    });
    bind('ponto-comprovante-imprimir', function () {
      try {
        var c = state.comprovante; if (!c) return;
        var janela = window.open('', '_blank', 'width=720,height=860'); if (!janela) throw new Error('Permita pop-ups para imprimir o comprovante.');
        janela.document.write('<!doctype html><html><head><title>Comprovante de ponto</title><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{font-family:Arial,sans-serif;padding:28px;padding-bottom:120px;color:#172033}h1{font-size:20px;color:#003E73}.tag{color:#64748b;font-size:12px}dl{margin-top:28px}dt{font-weight:bold;margin-top:15px}dd{margin:4px 0 0}.codigo{font-family:monospace;word-break:break-all}.acoes{position:fixed;left:0;right:0;bottom:0;display:flex;gap:10px;padding:14px;padding-bottom:calc(14px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #dbe3ec}.acoes button{flex:1;min-height:48px;border-radius:12px;font-weight:700;font-size:14px}.voltar{border:1px solid #94a3b8;background:#fff;color:#334155}.imprimir{border:0;background:#003E73;color:#fff}@media print{.acoes{display:none}body{padding:0}}</style></head><body><h1>Comprovante de registro de ponto</h1><p class="tag">AvantaLab · confirmação de marcação</p><dl><dt>Funcionário</dt><dd>' + escapeHtml(nomeFunc()) + '</dd><dt>Empresa</dt><dd>' + escapeHtml(nomeEmpresa()) + '</dd><dt>Marcação</dt><dd>' + escapeHtml(rotuloAcao(c.tipo)) + '</dd><dt>Data e hora</dt><dd>' + escapeHtml(horaPonto(c.registrado_em)) + ' · ' + escapeHtml(diaPontoHoje().split('-').reverse().join('/')) + '</dd><dt>Código do registro</dt><dd class="codigo">' + escapeHtml(c.codigo) + '</dd></dl><div class="acoes"><button class="voltar" onclick="window.close();setTimeout(function(){history.back()},150)">Voltar</button><button class="imprimir" onclick="window.print()">Imprimir</button></div></body></html>');
        janela.document.close(); janela.focus();
      } catch (e) { mostrarToast((e && e.message) || 'Não foi possível preparar a impressão.'); }
    });
    bind('ponto-meus-registros', function () { carregarRegistros('dia'); });
    bind('ponto-historico-dia', function () { carregarRegistros('dia'); });
    bind('ponto-voltar', function () { state.view = 'bater'; render(); });
    bind('ponto-periodo-dia', function () { carregarRegistros('dia'); });
    bind('ponto-periodo-semana', function () { carregarRegistros('semana'); });
    bind('ponto-periodo-mes', function () { carregarRegistros('mes'); });
    bind('ponto-periodo-ano', function () { carregarRegistros('ano'); });
    bind('ponto-periodo-todo', function () { carregarRegistros('todo'); });
    (state.registros || []).forEach(function (registro) {
      bind('ponto-comprovante-' + registro.id, function () { void baixarComprovante(registro.id); });
    });
    bind('ponto-gerar-pdf', function () { try { window.print(); } catch (e) {} });
    bind('ponto-sair', sair);
  }

  // ---------- init ----------
  (async function init() {
    try {
      await comPrazo(registroServiceWorkerPonto(), 5000, 'preparar o aplicativo').catch(function () { return null; });
      var sess = await comPrazo(db.auth.getSession(), 10000, 'restaurar a sessão');
      if (sess.data.session && sess.data.session.user) {
        var tipo = sess.data.session.user.user_metadata && sess.data.session.user.user_metadata.tipo;
        if (tipo === 'funcionario_ponto') {
          state.usuario = sess.data.session.user; state.autenticado = true; state.entrando = true; state.etapaEntrada = 'Restaurando acesso...';
          await carregarTudo();
          return;
        }
        // sessão de outro tipo de usuário: encerra para não misturar
        try { await db.auth.signOut(); } catch (e) {}
      }
    } catch (e) {}
    state.pronto = true; render();
  })();
})();
