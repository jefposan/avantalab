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
  };

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
    try { return await navigator.serviceWorker.register('/ponto-sw.js?v=1', { scope: '/ponto' }); }
    catch (e) { return null; }
  }

  async function verificarNotificacoesPonto() {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
      var registro = await registroServiceWorkerPonto();
      if (!registro) return;
      state.notificacoesAtivas = Notification.permission === 'granted' && Boolean(await registro.pushManager.getSubscription());
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
    var cpf = String(campo('ponto-cpf') || state.cpf).replace(/\D/g, '');
    var senha = campo('ponto-senha') || state.senha;
    state.cpf = cpf; state.senha = senha;
    if (!cpfValido(cpf)) { state.erro = 'CPF inválido. Confira os dígitos antes de continuar.'; render(); return; }
    if (!senha) { state.erro = 'Informe a senha.'; render(); return; }
    state.entrando = true; state.erro = ''; render();
    try {
      var resp = await fetch('/api/ponto/resolver-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpf: cpf }),
      });
      var r = await resp.json();
      if (!resp.ok || r.erro || !r.email) {
        state.entrando = false; state.erro = 'CPF ou senha inválidos.'; render(); return;
      }
      var login = await db.auth.signInWithPassword({ email: r.email, password: senha });
      if (login.error || !login.data.user) {
        state.entrando = false; state.erro = 'CPF ou senha inválidos.'; render(); return;
      }
      state.usuario = login.data.user; state.autenticado = true;
      state.entrando = false; state.senha = ''; state.cpf = ''; state.erro = ''; state.verSenha = false;
      await carregarTudo();
    } catch (e) {
      state.entrando = false; state.erro = 'Não foi possível entrar. Tente novamente.'; render();
    }
  }

  async function sair() {
    try { await db.auth.signOut(); } catch (e) {}
    state.autenticado = false; state.usuario = null; state.empresa = null; state.funcionario = null;
    state.pontoConfig = null; state.pontoHoje = []; state.comprovante = null; state.view = 'bater';
    state.cpf = ''; state.senha = ''; state.verSenha = false; state.erro = '';
    state.entrando = false; state.batendo = false; state.registros = []; state.periodo = 'dia';
    state.localizacaoAtual = null; state.localizacaoAtualizadaEm = 0; state.localizacaoAtualizando = false; state.localizacaoMsg = '';
    state.notificacoesAtivas = false; state.notificacoesAtualizando = false;
    render();
  }

  async function carregarTudo() {
    var uid = state.usuario.id;
    var md = state.usuario.user_metadata || {};
    var empresaId = md.empresa_id || null;
    var vazio = Promise.resolve({ data: null, error: null });
    try {
      // Carrega tudo em paralelo (mais rápido e evita travar em sequência).
      var res = await Promise.all([
        db.from('ponto_funcionarios').select('nome, cpf, cargo, dias_trabalho, hora_entrada, hora_saida, empresa_id').eq('user_id', uid).maybeSingle(),
        empresaId ? db.from('empresas').select('id, nome').eq('id', empresaId).maybeSingle() : vazio,
        empresaId ? db.from('ponto_config').select('latitude, longitude, raio_m').eq('empresa_id', empresaId).maybeSingle() : vazio,
        db.from('ponto_registros').select('id, tipo, registrado_em').eq('user_id', uid).eq('dia', diaPontoHoje()).order('registrado_em', { ascending: true }),
      ]);
      var f = res[0], emp = res[1], cfg = res[2], hoje = res[3];
      if (f && !f.error && f.data) state.funcionario = f.data;
      if (emp && !emp.error && emp.data) state.empresa = emp.data;
      state.pontoConfig = (cfg && !cfg.error && cfg.data) ? cfg.data : null;
      if (hoje && !hoje.error) state.pontoHoje = hoje.data || [];
      await verificarNotificacoesPonto();
    } catch (e) {
      console.error('Erro ao carregar dados do ponto:', e);
    }
    state.carregando = false; state.pronto = true; render();
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
    var raio = Math.min(100, Math.max(1, Math.round(numeroConfig(cfg && cfg.raio_m) || 100)));
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
    var hash = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase();
    var registro = {
      empresa_id: empresaId, user_id: state.usuario.id, tipo: tipo,
      latitude: latAtual, longitude: lngAtual,
      precisao_m: precisao, dispositivo: navigator.userAgent, hash: hash,
    };
    registro.distancia_m = distancia;
    var resp;
    try { resp = await db.from('ponto_registros').insert(registro).select().single(); }
    catch (e) { state.batendo = false; mostrarToast('Erro ao registrar: ' + ((e && e.message) ? e.message : 'tente novamente')); return; }
    state.batendo = false;
    if (resp.error) { mostrarToast('Nao registrou: ' + (resp.error.message || resp.error.code || 'erro')); return; }
    state.comprovante = { tipo: tipo, registrado_em: resp.data.registrado_em, hash: hash, lat: latAtual, lng: lngAtual, distancia: distancia };
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
      var resp = await db.from('ponto_registros').select('tipo, registrado_em, dia, distancia_m').eq('user_id', state.usuario.id).gte('dia', inicioPeriodo(periodo)).order('registrado_em', { ascending: true });
      state.registros = (!resp.error && resp.data) ? resp.data : [];
    } catch (e) { state.registros = []; }
    state.carregandoReg = false; render();
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
      '<div id="ponto-ajustes-overlay" class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">' +
        '<section class="w-full max-w-sm rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">' +
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

  function cardInstalarHtml() {
    if (ehStandalone()) return '';
    return (
      '<div class="mx-auto mt-3 w-full max-w-sm rounded-2xl border border-white/30 p-3 text-slate-800 shadow-lg backdrop-blur-lg" style="background-color:rgba(255,255,255,.16)">' +
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
  function telaLogin() {
    return (
      '<section class="avantalab-mobile-bg fixed inset-0 flex flex-col items-center overflow-hidden px-4 pb-6" style="height:100dvh;padding-top:22dvh;--avantalab-mobile-bg-overlay:linear-gradient(rgba(255,255,255,.10),rgba(255,255,255,0));">' +
        '<div class="mx-auto w-full max-w-sm overflow-y-auto rounded-3xl border border-white/35 p-6 text-slate-900 shadow-2xl backdrop-blur-xl" style="background-color:rgba(255,255,255,.22);max-height:calc(82dvh);overscroll-behavior:contain;">' +
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
            '<button id="ponto-entrar" type="button" ' + (state.entrando ? 'disabled' : '') + ' class="mt-1 h-12 w-full rounded-xl text-base font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-60" style="background:linear-gradient(135deg,#003E73,#00A6C8)">' + (state.entrando ? 'Entrando...' : 'Entrar') + '</button>' +
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
            '<p>Código: ' + escapeHtml(c.hash) + '</p>' +
          '</div>' +
          '<button id="ponto-comprovante-ok" type="button" class="mt-5 h-12 w-full rounded-xl bg-slate-950 text-sm font-black uppercase tracking-wide text-white">Concluir</button>' +
        '</div>' +
      '</div>'
    );
  }

  function telaRegistros() {
    var grupos = {};
    state.registros.forEach(function (r) { (grupos[r.dia] = grupos[r.dia] || []).push(r); });
    var dias = Object.keys(grupos).sort().reverse();
    var periodos = [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']];
    var listaHtml = state.carregandoReg
      ? '<p class="py-8 text-center text-sm font-semibold text-slate-400">Carregando...</p>'
      : (dias.length === 0
        ? '<p class="py-8 text-center text-sm font-semibold text-slate-400">Nenhum registro no período.</p>'
        : dias.map(function (dia) {
            var regs = grupos[dia];
            var linhas = regs.map(function (r) {
              return '<div class="flex items-center justify-between text-xs"><span class="font-bold text-slate-500">' + escapeHtml(rotuloAcao(r.tipo)) + '</span><span class="font-black text-slate-800">' + escapeHtml(horaPonto(r.registrado_em)) + '</span></div>';
            }).join('');
            var horas = calcHorasDia(regs);
            return '<div class="rounded-xl border border-slate-200 bg-white p-3"><div class="mb-1 flex items-center justify-between"><p class="text-sm font-black text-slate-900">' + escapeHtml(dia.slice(8, 10) + '/' + dia.slice(5, 7) + '/' + dia.slice(0, 4)) + '</p>' + (horas ? '<span class="text-[11px] font-black text-cyan-700">' + horas + '</span>' : '') + '</div><div class="grid gap-0.5">' + linhas + '</div></div>';
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
          '<div class="no-print mb-3 grid grid-cols-2 gap-1 min-[380px]:grid-cols-4">' +
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
      '<section class="avantalab-mobile-bg fixed inset-0 flex items-center justify-center overflow-hidden px-4" style="height:100dvh;">' +
        '<div class="w-full max-w-xs rounded-3xl border border-white/40 bg-white/25 p-5 text-center text-slate-900 shadow-2xl backdrop-blur-xl">' +
          '<p class="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">AvantaLab</p>' +
          '<h1 class="mt-2 text-xl font-black">Controle de Ponto</h1>' +
          '<p class="mt-2 text-sm font-semibold text-slate-600">Preparando acesso...</p>' +
        '</div>' +
      '</section>'
    );
  }

  function toastHtml() {
    if (!state.toast) return '';
    return '<div class="no-print fixed inset-x-0 bottom-6 z-50 flex justify-center px-5"><div class="max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white shadow-2xl">' + escapeHtml(state.toast) + '</div></div>';
  }

  function render() {
    var tela;
    if (!state.pronto) tela = telaCarregandoPonto();
    else if (!state.autenticado) tela = telaLogin();
    else tela = telaPonto();
    root.innerHTML = tela + toastHtml() + instrucaoInstalarHtml() + confirmacaoPontoHtml() + ajustesPontoHtml();

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

    bind('ponto-acao', function () { var el = document.getElementById('ponto-acao'); if (el) { state.confirmarTipo = el.getAttribute('data-tipo'); render(); } });
    bind('ponto-encerrar', function () { state.confirmarTipo = 'saida'; render(); });
    bind('ponto-confirmar-cancelar', function () { state.confirmarTipo = null; render(); });
    bind('ponto-confirmar-ok', function () {
      var tipo = state.confirmarTipo;
      if (!tipo) return;
      bater(tipo);
    });
    bind('ponto-atualizar-localizacao', atualizarLocalizacao);
    bind('ponto-ajustes', function () { state.ajustesAberto = true; render(); });
    bind('ponto-ajustes-fechar', function () { state.ajustesAberto = false; render(); });
    var ovAjustes = document.getElementById('ponto-ajustes-overlay');
    if (ovAjustes) ovAjustes.addEventListener('click', function (e) { if (e.target === ovAjustes) { state.ajustesAberto = false; render(); } });
    bind('ponto-lembretes-toggle', alternarNotificacoesPonto);
    var ovConfirmar = document.getElementById('ponto-confirmar-overlay');
    if (ovConfirmar) ovConfirmar.addEventListener('click', function (e) { if (e.target === ovConfirmar) { state.confirmarTipo = null; render(); } });
    bind('ponto-comprovante-ok', function () { state.comprovante = null; render(); });
    bind('ponto-meus-registros', function () { carregarRegistros('dia'); });
    bind('ponto-voltar', function () { state.view = 'bater'; render(); });
    bind('ponto-periodo-dia', function () { carregarRegistros('dia'); });
    bind('ponto-periodo-semana', function () { carregarRegistros('semana'); });
    bind('ponto-periodo-mes', function () { carregarRegistros('mes'); });
    bind('ponto-periodo-ano', function () { carregarRegistros('ano'); });
    bind('ponto-gerar-pdf', function () { try { window.print(); } catch (e) {} });
    bind('ponto-sair', sair);
  }

  // ---------- init ----------
  (async function init() {
    // Watchdog: se o carregamento travar (rede), libera a tela em vez de ficar preso.
    var watchdog = setTimeout(function () {
      if (!state.pronto) { state.pronto = true; render(); }
    }, 9000);
    try {
      await registroServiceWorkerPonto();
      var sess = await db.auth.getSession();
      if (sess.data.session && sess.data.session.user) {
        var tipo = sess.data.session.user.user_metadata && sess.data.session.user.user_metadata.tipo;
        if (tipo === 'funcionario_ponto') {
          state.usuario = sess.data.session.user; state.autenticado = true;
          await carregarTudo();
          clearTimeout(watchdog);
          return;
        }
        // sessão de outro tipo de usuário: encerra para não misturar
        try { await db.auth.signOut(); } catch (e) {}
      }
    } catch (e) {}
    clearTimeout(watchdog);
    state.pronto = true; render();
  })();
})();
