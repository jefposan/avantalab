(() => {
  'use strict';

  const SESSION_PREFIX = 'avantalab.vendas.voice_command.official.v1';
  const MAX_RECORDING_MS = 45000;
  const state = {
    host: null, root: null, options: null, mount: null, phase: 'idle', current: null, error: '',
    recorder: null, stream: null, chunks: [], timer: 0,
    audioContext: null, analyser: null, source: null, frame: 0, canvas: null,
    noiseFloor: 0.012, lastVoiceActive: null, canvasSize: 0,
  };

  const styles = `
    :host{all:initial;display:block;width:100%;color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#092847}
    *{box-sizing:border-box}button{font:inherit}.dock{display:grid;min-height:118px;place-items:center;align-content:center;gap:5px;text-align:center}.dock strong{color:#35536c;font-size:12px;line-height:1.2}.overlay{position:fixed;inset:0;z-index:var(--vendas-layer-modal,100000);background:rgba(3,18,34,.58);display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}
    .panel{width:min(100%,440px);max-height:calc(100svh - 24px);overflow:auto;background:linear-gradient(180deg,#fafdff,#eef7fc);border-radius:26px;box-shadow:0 24px 80px rgba(0,23,45,.34);padding:17px 17px 20px;overscroll-behavior:contain}
    .header{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{display:flex;align-items:center;gap:9px;font-weight:900;color:#063d70}.lab{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#61758a}.close{width:44px;height:44px;border:0;border-radius:50%;background:#e4eef5;color:#173b5d;font-size:25px;cursor:pointer}
    .heading{text-align:center;margin:8px 0 4px}.heading small{color:#60758a}.heading h1{font-size:clamp(20px,6vw,27px);margin:5px 0 0;color:#082e53}.status{margin:13px 0 0;text-align:center;color:#5d7185;font-size:13px;min-height:18px}
    .capture{position:relative;width:142px;height:142px;display:grid;place-items:center;margin:0 auto}.capture.small{width:132px;height:132px;margin:8px auto 0}.visualizer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.voice{position:relative;z-index:1;width:88px;height:88px;border:0;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 36% 30%,#2498de,#07518b 72%);box-shadow:0 12px 27px rgba(4,70,123,.30);color:#fff;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.small .voice{width:82px;height:82px}.voice.listening{background:radial-gradient(circle at 36% 30%,#f36a72,#c51e32 72%);box-shadow:0 14px 34px rgba(191,27,48,.42)}.voice:disabled{opacity:.8;cursor:wait}.mic{width:38px;height:38px}.small .mic{width:34px;height:34px}.mic svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}.stop{width:27px;height:27px;border-radius:7px;background:#fff}.small .stop{width:25px;height:25px}.spinner{width:32px;height:32px;border:4px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
    .card{margin-top:16px;background:#fff;border-radius:22px;padding:18px;box-shadow:0 12px 32px rgba(4,43,77,.1)}.eyebrow{display:block;color:#1474ae;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.card h2{font-size:21px;line-height:1.2;margin:8px 0;color:#082e53}.summary{font-size:16px;line-height:1.5;white-space:pre-line}.notice{padding:11px 13px;border-radius:14px;background:#eef8ff;color:#1c557c;font-size:13px}.candidates{display:grid;gap:10px;margin:16px 0}.candidate{width:100%;border:1px solid #c8ddeb;border-radius:16px;padding:14px;text-align:left;background:#f8fcff;color:#0b3356;cursor:pointer}.candidate strong,.candidate small{display:block}.candidate strong{font-size:16px}.candidate small{margin-top:4px;color:#60758a;line-height:1.35}.helper{text-align:center;color:#667a8d;font-size:13px;margin:2px 0 10px}.actions{display:grid;grid-template-columns:1fr 1.35fr;gap:10px;margin-top:17px}.primary,.secondary,.text{min-height:50px;border-radius:15px;padding:10px 14px;font-weight:800;cursor:pointer}.primary{border:0;background:#086aaa;color:#fff}.secondary{border:1px solid #bdd3e2;background:#f5fafc;color:#244a69}.text{width:100%;border:0;background:transparent;color:#526b80}.result{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#dff7e8;color:#187544;font-weight:1000;font-size:23px}.error .result{background:#ffe5e6;color:#b51f31}.proof{margin-top:14px;padding:14px;border-radius:16px;background:#f2f9fd}.proof header{display:flex;justify-content:space-between;gap:10px;align-items:center}.badge{font-size:10px;font-weight:900;text-transform:uppercase;color:#187544}.proof dl{display:grid;grid-template-columns:auto 1fr;gap:7px 12px;margin:12px 0 0;font-size:13px}.proof dt{color:#61758a}.proof dd{margin:0;text-align:right;font-weight:800;overflow-wrap:anywhere}.footer{text-align:center;color:#778a9b;font-size:11px;margin-top:14px}
    @media(max-width:520px){.overlay{place-items:end center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))}.panel{width:100%;max-height:calc(100svh - max(24px,env(safe-area-inset-top)) - max(24px,env(safe-area-inset-bottom)));border-radius:24px;padding:16px}.dock{min-height:108px}}
    @media(prefers-reduced-motion:reduce){.spinner{animation-duration:1.6s}}
  `;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, className, action) {
    const node = el('button', className, label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  function sessionKey() { return `${SESSION_PREFIX}:${state.options?.account?.id || 'none'}`; }

  function saveSession() {
    if (!state.options?.account?.id) return;
    try {
      if (state.current && ['clarification', 'confirmation'].includes(state.current.kind)) {
        localStorage.setItem(sessionKey(), JSON.stringify({ current: state.current }));
      } else localStorage.removeItem(sessionKey());
    } catch { /* armazenamento indisponível */ }
  }

  function restoreSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(sessionKey()) || 'null');
      if (saved?.current && ['clarification', 'confirmation'].includes(saved.current.kind)) {
        state.current = saved.current;
        state.phase = saved.current.kind;
        return;
      }
    } catch { /* rascunho inválido */ }
    state.current = null;
    state.phase = 'idle';
  }

  function statusText() {
    if (state.phase === 'recording') return 'Ouvindo...';
    if (state.phase === 'transcribing') return 'Entendendo seu áudio...';
    if (state.phase === 'processing') return state.current?.kind === 'confirmation' ? 'Executando com segurança...' : 'Preparando sua solicitação...';
    if (state.phase === 'clarification') return 'Responda por voz ou toque em uma opção';
    if (state.phase === 'confirmation') return 'Confira antes de confirmar';
    if (state.phase === 'done') return 'Solicitação concluída';
    if (state.phase === 'error') return 'Não foi possível continuar';
    return 'Toque para falar';
  }

  function micIcon(stopping = false) {
    if (stopping) return el('span', 'stop');
    const icon = el('span', 'mic');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 15.4a3.9 3.9 0 0 0 3.9-3.9V6.4a3.9 3.9 0 1 0-7.8 0v5.1a3.9 3.9 0 0 0 3.9 3.9Z"/><path d="M5.7 10.9v.7a6.3 6.3 0 0 0 12.6 0v-.7M12 17.9V21M9.2 21h5.6"/></svg>';
    return icon;
  }

  function voiceControl(small = false) {
    const listening = state.phase === 'recording';
    const busy = ['transcribing', 'processing'].includes(state.phase);
    const wrap = el('div', `capture${small ? ' small' : ''}`);
    if (listening) {
      const canvas = el('canvas', 'visualizer');
      canvas.setAttribute('aria-hidden', 'true');
      state.canvas = canvas;
      wrap.append(canvas);
    }
    const control = button('', `voice${listening ? ' listening' : ''}`, toggleRecording);
    control.disabled = busy;
    control.setAttribute('aria-label', listening ? 'Encerrar gravação' : 'Iniciar gravação');
    control.setAttribute('aria-pressed', String(listening));
    control.append(busy ? el('span', 'spinner') : micIcon(listening));
    wrap.append(control);
    return wrap;
  }

  function selectionFor(candidate) {
    let entity = state.current?.entity;
    if (!entity) {
      const product = /produto/i.test(String(state.current?.question || ''));
      const quoted = String(state.current?.question || '').match(/“([^”]+)”/)?.[1] || '';
      entity = product
        ? { type: 'product', reference: quoted }
        : { type: 'customer', reference: state.current?.draft?.customerReference || quoted };
    }
    return entity?.reference && candidate?.id ? { type: entity.type, reference: entity.reference, id: candidate.id } : null;
  }

  function money(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0)); }
  function dateTime(value) { const date = new Date(String(value || '')); return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR'); }

  function ensureMount() {
    const mount = document.getElementById(state.options?.mountId || '') || state.mount || state.options?.mount;
    if (!mount?.isConnected) return null;
    state.mount = mount;
    mount.classList.add('is-active');
    if (state.host && state.host.parentElement !== mount) mount.appendChild(state.host);
    return mount;
  }

  function render() {
    if (!state.root) return;
    ensureMount();
    state.root.replaceChildren();
    if (['idle', 'recording', 'transcribing', 'processing'].includes(state.phase)) {
      const dock = el('section', 'dock');
      dock.setAttribute('aria-live', 'polite');
      dock.append(voiceControl(), el('strong', '', state.phase === 'recording' ? 'Toque para encerrar' : statusText()));
      state.root.append(dock);
      return;
    }
    const overlay = el('div', 'overlay');
    const panel = el('main', 'panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Solicitação por Voz');
    const header = el('header', 'header');
    const brand = el('div', 'brand'); brand.append(el('span', '', 'Avanta Vendas'), el('span', 'lab', 'Experimental'));
    header.append(brand, button('×', 'close', close)); panel.append(header);
    const heading = el('div', 'heading'); heading.append(el('small', '', state.options?.account?.label || 'Conta ativa'), el('h1', '', 'Solicitação por Voz')); panel.append(heading);

    if (state.phase === 'clarification' && state.current?.kind === 'clarification') {
      const card = el('section', 'card'); card.append(el('span', 'eyebrow', 'Preciso confirmar uma informação'), el('h2', '', state.current.question));
      if (Array.isArray(state.current.candidates) && state.current.candidates.length) {
        const list = el('div', 'candidates');
        state.current.candidates.forEach((candidate) => {
          const option = button('', 'candidate', () => processTranscription(`Seleção confirmada: ${candidate.label}`, state.current, selectionFor(candidate)));
          option.append(el('strong', '', candidate.label), el('small', '', candidate.detail)); list.append(option);
        }); card.append(list);
      }
      card.append(voiceControl(true), el('p', 'helper', 'Ou responda por voz'));
      const actions = el('div', 'actions'); actions.append(button('Cancelar', 'secondary', cancel), button('Salvar para depois', 'primary', saveForLater)); card.append(actions); panel.append(card);
    }

    if (state.phase === 'confirmation' && state.current?.kind === 'confirmation') {
      const card = el('section', 'card'); card.append(el('span', 'eyebrow', 'Confirmação obrigatória'), el('h2', '', state.current.title), el('p', 'summary', state.current.message), el('p', 'notice', 'O lançamento só será gravado depois da sua confirmação.'));
      const actions = el('div', 'actions'); actions.append(button('Cancelar', 'secondary', cancel), button('Confirmar', 'primary', execute)); card.append(actions); card.append(button('Salvar para depois', 'text', saveForLater)); panel.append(card);
    }

    if (state.phase === 'done' && state.current) {
      const card = el('section', 'card'); card.append(el('span', 'result', state.current.kind === 'unsupported' ? '!' : '✓'), el('h2', '', state.current.title), el('p', 'summary', state.current.message));
      const evidence = state.current.evidence;
      if (evidence) {
        const proof = el('section', 'proof'); const proofHeader = el('header'); proofHeader.append(el('strong', '', 'Conferência no banco'), el('span', 'badge', 'Verificado agora')); proof.append(proofHeader);
        const rows = el('dl'); [['Conta', state.options.account.label], ['Lançamento', evidence.recordType], ['Cliente', evidence.customerName], ['Valor', money(evidence.amount)], ['Situação', evidence.status], ['Gravado em', dateTime(evidence.createdAt)], ['Código', evidence.recordId]].forEach(([label, value]) => rows.append(el('dt', '', label), el('dd', '', String(value || '')))); proof.append(rows); card.append(proof);
      }
      const actions = el('div', 'actions'); actions.append(button('Fechar', 'secondary', close));
      if (evidence && ['create_order', 'register_payment'].includes(state.current.intent)) actions.append(button('Compartilhar comprovante', 'primary', shareReceipt));
      else actions.append(button('Nova solicitação', 'primary', reset));
      card.append(actions); if (evidence) card.append(button('Nova solicitação', 'text', reset)); panel.append(card);
    }

    if (state.phase === 'error') {
      const card = el('section', 'card error'); card.setAttribute('role', 'alert'); card.append(el('span', 'result', '!'), el('h2', '', statusText()), el('p', 'summary', state.error));
      const actions = el('div', 'actions'); actions.append(button('Cancelar', 'secondary', close), button('Tentar novamente', 'primary', () => state.current?.kind === 'confirmation' ? execute() : startRecording())); card.append(actions); panel.append(card);
    }
    panel.append(el('p', 'status', statusText()), el('p', 'footer', 'A IA interpreta; as funções seguras do Avanta Vendas executam.'));
    overlay.append(panel); state.root.append(overlay);
  }

  function setPhase(phase, error = '') {
    if (state.phase === 'recording' && phase !== 'recording') stopVisualization();
    state.phase = phase; state.error = error; saveSession(); render();
  }

  async function processTranscription(transcription, previous = state.current, selection = null) {
    setPhase('processing');
    try {
      const result = await state.options.request('process', { transcription, previousDraft: previous?.draft || null, candidates: previous?.kind === 'clarification' ? previous.candidates : [], selection });
      state.current = result;
      setPhase(result.kind === 'clarification' ? 'clarification' : result.kind === 'confirmation' ? 'confirmation' : 'done');
    } catch (error) { setPhase('error', error instanceof Error ? error.message : 'Não foi possível entender sua solicitação.'); }
  }

  async function transcribe(audio, extension) {
    setPhase('transcribing');
    try {
      const result = await state.options.request('transcribe', { audio, extension });
      if (!result?.transcription) throw new Error('Não foi possível transcrever o áudio.');
      await processTranscription(String(result.transcription));
    } catch (error) { setPhase('error', error instanceof Error ? error.message : 'Não foi possível transcrever o áudio.'); }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setPhase('error', 'A gravação de áudio não está disponível neste navegador.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
      const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      state.stream = stream; state.recorder = recorder; state.chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) state.chunks.push(event.data); };
      recorder.onerror = () => { stopMedia(true); setPhase('error', 'A gravação foi interrompida. Tente novamente.'); };
      recorder.onstop = () => {
        window.clearTimeout(state.timer); state.timer = 0; stopVisualization(); stream.getTracks().forEach((track) => track.stop()); state.stream = null;
        const chunks = state.chunks; state.chunks = [];
        if (!chunks.length) { setPhase('error', 'Não identificamos áudio. Tente novamente.'); return; }
        const type = recorder.mimeType || mimeType || 'audio/webm'; transcribe(new Blob(chunks, { type }), type.includes('mp4') ? 'mp4' : 'webm');
      };
      if (state.current?.kind !== 'clarification') state.current = null;
      setPhase('recording'); startVisualization(stream); recorder.start(250);
      state.timer = window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, MAX_RECORDING_MS);
    } catch (error) {
      const denied = error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name);
      setPhase('error', denied ? 'Autorize o microfone nos ajustes do navegador e tente novamente.' : 'Não foi possível iniciar o microfone.');
    }
  }

  function toggleRecording() { if (state.phase === 'recording') { if (state.recorder?.state === 'recording') state.recorder.stop(); } else if (['idle', 'clarification', 'error'].includes(state.phase)) startRecording(); }
  function stopMedia(discard = false) {
    window.clearTimeout(state.timer); state.timer = 0;
    const recorder = state.recorder;
    if (discard && recorder) { recorder.ondataavailable = null; recorder.onstop = null; recorder.onerror = null; }
    if (recorder?.state === 'recording') recorder.stop();
    state.recorder = null; state.chunks = [];
    state.stream?.getTracks().forEach((track) => track.stop()); state.stream = null; stopVisualization();
  }

  function startVisualization(stream) {
    const canvas = state.canvas; stopVisualization(); state.canvas = canvas;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext; if (!AudioContextClass || !canvas) return;
    try {
      const context = new AudioContextClass(); const analyser = context.createAnalyser(); const source = context.createMediaStreamSource(stream);
      analyser.fftSize = 512; analyser.smoothingTimeConstant = .38; source.connect(analyser);
      Object.assign(state, { audioContext: context, analyser, source, noiseFloor: .012, lastVoiceActive: null });
      const samples = new Uint8Array(analyser.fftSize);
      const analyze = () => {
        if (state.analyser !== analyser || state.phase !== 'recording') return;
        analyser.getByteTimeDomainData(samples); let sum = 0;
        for (const value of samples) { const normalized = (value - 128) / 128; sum += normalized * normalized; }
        const rms = Math.sqrt(sum / samples.length); if (rms < state.noiseFloor * 1.35) state.noiseFloor = state.noiseFloor * .97 + rms * .03;
        const threshold = Math.max(.016, state.noiseFloor * 1.55); const activity = Math.min(1, Math.max(0, (rms - threshold) / .12)); const active = activity >= .02;
        drawVisualizer(samples, activity, active); state.frame = requestAnimationFrame(analyze);
      };
      if (context.state === 'suspended') void context.resume(); analyze();
    } catch { stopVisualization(); }
  }

  function drawVisualizer(samples, activity, active) {
    const canvas = state.canvas; if (!canvas) return;
    const size = Math.max(1, Math.round(canvas.getBoundingClientRect().width)); const resized = size !== state.canvasSize;
    if (!active && state.lastVoiceActive === false && !resized) return;
    state.lastVoiceActive = active; state.canvasSize = size; const ratio = Math.min(devicePixelRatio || 1, 2); const target = Math.round(size * ratio);
    if (canvas.width !== target || canvas.height !== target) { canvas.width = target; canvas.height = target; }
    const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, size, size);
    const center = size / 2; const buttonSize = canvas.parentElement.querySelector('.voice').getBoundingClientRect().width; const base = buttonSize / 2 + 9; let peak = 0;
    if (active) for (const value of samples) peak = Math.max(peak, Math.abs((value - 128) / 128));
    const normalization = Math.max(peak, .015); const strength = 17 + activity * 30;
    for (let ring = 0; ring < 4; ring += 1) {
      ctx.beginPath();
      for (let point = 0; point <= 128; point += 1) {
        const angle = point / 128 * Math.PI * 2 - Math.PI / 2; const index = (Math.floor(point / 128 * samples.length) + ring * 13) % samples.length;
        const wave = active ? ((samples[index] - 128) / 128) / normalization * strength * (1 - ring * .14) : 0; const radius = base + ring * 7 + wave;
        const x = center + Math.cos(angle) * radius; const y = center + Math.sin(angle) * radius; if (!point) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.lineWidth = active ? 3.5 - ring * .45 : 1.4; ctx.strokeStyle = `rgba(211,37,57,${active ? .9 - ring * .13 : .14 - ring * .02})`; ctx.shadowColor = active ? 'rgba(211,37,57,.5)' : 'transparent'; ctx.shadowBlur = active ? 11 : 0; ctx.stroke();
    }
  }

  function stopVisualization() {
    if (state.frame) cancelAnimationFrame(state.frame); state.frame = 0;
    try { state.source?.disconnect(); state.analyser?.disconnect(); } catch { /* já desconectado */ }
    if (state.audioContext && state.audioContext.state !== 'closed') void state.audioContext.close();
    Object.assign(state, { audioContext: null, analyser: null, source: null, canvas: null, lastVoiceActive: null, canvasSize: 0 });
  }

  async function execute() {
    if (state.current?.kind !== 'confirmation') return;
    const confirmation = state.current; setPhase('processing');
    try {
      const result = await state.options.request('execute', { action: confirmation.action });
      state.current = { ...confirmation, ...result, kind: 'answer', intent: confirmation.action.intent };
      try { await state.options.afterExecute?.(result); } catch (error) { console.warn('Lançamento por voz confirmado, mas a tela ainda não foi atualizada.', error); }
      setPhase('done');
    } catch (error) { state.current = confirmation; setPhase('error', error instanceof Error ? error.message : 'Não foi possível executar a solicitação.'); }
  }

  async function shareReceipt() {
    const evidence = state.current?.evidence; if (!evidence) return;
    try { const shared = await state.options.shareReceipt?.(evidence.recordId, state.current.intent); if (shared) close(); }
    catch (error) { setPhase('error', error instanceof Error ? error.message : 'Não foi possível compartilhar o comprovante.'); }
  }

  function reset() {
    try { localStorage.removeItem(sessionKey()); } catch { /* indisponível */ }
    state.current = null;
    setPhase('idle');
    void startRecording();
  }
  function cancel() {
    const current = state.current;
    const request = state.options?.request;
    try { localStorage.removeItem(sessionKey()); } catch { /* indisponível */ }
    state.current = null;
    close();
    if (current && request) void request('log', { event: 'cancelled', transcription: current.transcription, intent: current.draft?.intent }).catch(() => undefined);
  }
  function saveForLater() { saveSession(); close(); }
  function close() {
    saveSession();
    stopMedia(true);
    const mount = ensureMount() || state.mount;
    const trigger = mount?.querySelector?.('.mobile-voice-command-trigger');
    state.host?.remove();
    mount?.classList?.remove('is-active');
    Object.assign(state, { host: null, root: null, options: null, mount: null, phase: 'idle', current: null, error: '' });
    requestAnimationFrame(() => trigger?.isConnected && trigger.focus({ preventScroll: true }));
  }

  function open(options) {
    if (!options?.account?.id || typeof options.request !== 'function') throw new Error('A conta ativa não está pronta para usar comandos por voz.');
    if (!options.mount?.isConnected) throw new Error('A Sala de Botões não está pronta para iniciar a gravação.');
    if (state.host) close();
    const host = document.createElement('avanta-voice-command'); const shadow = host.attachShadow({ mode: 'open' }); const style = document.createElement('style'); style.textContent = styles; const root = document.createElement('div'); shadow.append(style, root); options.mount.append(host);
    Object.assign(state, { host, root, options, mount: options.mount, phase: 'idle', current: null, error: '' });
    restoreSession();
    render();
    if (options.autoStart && state.phase === 'idle') void startRecording();
    else requestAnimationFrame(() => shadow.querySelector('.voice,.candidate,.primary,.close')?.focus());
  }

  window.AvantaVoiceCommand = Object.freeze({ open, close });
  window.addEventListener('pagehide', () => stopMedia(true));
})();
