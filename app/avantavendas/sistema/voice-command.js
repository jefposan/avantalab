(() => {
  'use strict';

  const SESSION_PREFIX = 'avantalab.vendas.voice_command.official.v1';
  const MAX_RECORDING_MS = 45000;
  const state = {
    host: null, root: null, options: null, mount: null, phase: 'idle', current: null, error: '',
    recorder: null, stream: null, chunks: [], requestAbort: null, requestStage: null, pendingId: null, timer: 0,
    audioContext: null, analyser: null, source: null, frame: 0, canvas: null,
    noiseFloor: 0.012, lastVoiceActive: null, canvasSize: 0,
    catalogMode: '', catalogQuery: '', catalogProducts: [], catalogOffset: 0, catalogLoading: false, catalogHasMore: false, catalogError: '', catalogTimer: 0, catalogRequestId: 0,
    editDraft: null, editSelections: [],
  };

  const styles = `
    :host{all:initial;position:absolute;top:calc(50% - 5px);left:50%;display:block;width:0;height:0;overflow:visible;color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#092847}
    *{box-sizing:border-box}button,input{font:inherit}.dock{position:static;width:0;height:0;overflow:visible;text-align:center}.dock>.capture{position:absolute;top:0;left:0;margin:0;transform:translate(-50%,-50%)}.dock>strong{position:absolute;top:49px;left:0;width:240px;color:#35536c;font-size:12px;line-height:1.2;transform:translateX(-50%)}.overlay{position:fixed;inset:0;z-index:var(--vendas-layer-modal,100000);background:rgba(3,18,34,.58);display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(110px,calc(env(safe-area-inset-bottom) + 92px)) max(12px,env(safe-area-inset-left));-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}
    .panel{position:relative;width:min(100%,440px);max-height:calc(100svh - max(132px,calc(env(safe-area-inset-bottom) + 108px)));overflow:hidden;border:1px solid rgba(219,229,239,.95);border-radius:18px;background:#fff;box-shadow:0 18px 42px rgba(15,42,80,.28);overscroll-behavior:contain}.close{position:absolute;z-index:2;top:14px;right:14px;width:44px;height:44px;border:0;border-radius:50%;background:#eaf3f8;color:#173b5d;font-size:25px;cursor:pointer}
    .capture{position:relative;width:142px;height:142px;display:grid;place-items:center;margin:0 auto;overflow:visible}.capture.small{width:132px;height:132px;margin:8px auto 0}.visualizer{position:absolute;inset:-45px;width:calc(100% + 90px);height:calc(100% + 90px);pointer-events:none;overflow:visible}.voice{position:relative;z-index:1;width:88px;height:88px;border:0;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 36% 30%,#2498de,#07518b 72%);box-shadow:0 12px 27px rgba(4,70,123,.30);color:#fff;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.dock .voice{width:84px;height:84px}.small .voice{width:82px;height:82px}.voice.listening,.voice.cancelling{background:radial-gradient(circle at 36% 30%,#f36a72,#c51e32 72%);box-shadow:0 14px 34px rgba(191,27,48,.42)}.voice.cancelling::after{content:'';position:absolute;inset:-8px;border:2px solid rgba(211,37,57,.22);border-top-color:#e23f51;border-right-color:#f18a93;border-radius:50%;pointer-events:none;animation:processing-ring 1s linear infinite}.voice:disabled{opacity:.8;cursor:wait}.mic,.cancel-icon{width:38px;height:38px}.cancel-icon{position:relative;z-index:1}.dock .mic,.dock .cancel-icon{width:36px;height:36px}.small .mic,.small .cancel-icon{width:34px;height:34px}.mic svg,.cancel-icon svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}.stop{width:27px;height:27px;border-radius:7px;background:#fff}.small .stop{width:25px;height:25px}.spinner{width:32px;height:32px;border:4px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@keyframes processing-ring{to{transform:rotate(360deg)}}
    .card{margin:0;max-height:inherit;border-radius:18px;padding:22px;background:#fff;box-shadow:none}.card h2{margin:0 52px 14px 0;color:#0A1F44;font-size:21px;line-height:1.2;letter-spacing:-.025em}.summary{margin:0;color:#36516d;font-size:16px;line-height:1.5;white-space:pre-line}.candidates,.catalog-results{display:grid;gap:9px;max-height:min(34svh,300px);margin:16px 0;overflow-y:auto;overscroll-behavior:contain;padding-right:2px}.candidate{width:100%;border:1px solid #d7e2eb;border-radius:12px;padding:13px;text-align:left;background:#f8fbfe;color:#17324d;cursor:pointer}.candidate strong,.candidate small{display:block}.candidate strong{font-size:16px}.candidate small{margin-top:4px;color:#60758a;line-height:1.35}.helper{text-align:center;color:#667a8d;font-size:13px;margin:2px 0 10px}.actions{display:grid;grid-template-columns:1fr 1.35fr;gap:9px;margin-top:18px}.actions.single{grid-template-columns:1fr}.primary,.secondary,.text{min-height:48px;border-radius:12px;padding:10px 14px;font-size:14px;font-weight:800;line-height:1.2;cursor:pointer}.primary{border:1px solid #1687D9;background:#1687D9;color:#fff;box-shadow:0 6px 15px rgba(22,135,217,.24)}.secondary{border:1px solid #9fb7ca;background:#f8fbfe;color:#17324d}.text{width:100%;border:0;background:transparent;color:#526b80}.save-later{display:block;min-height:44px;margin:12px auto 0;border:1px solid #bdd3e2;border-radius:999px;padding:10px 18px;background:#f5fafc;color:#244a69;font-weight:800;cursor:pointer}.catalog-search{width:100%;min-height:48px;border:1px solid #b9cede;border-radius:12px;padding:10px 13px;color:#17324d;background:#fff;font-size:16px}.catalog-empty{margin:14px 0;color:#60758a;text-align:center}.edit-items{display:grid;gap:9px;margin:14px 0}.edit-item{display:grid;grid-template-columns:minmax(0,1fr) 78px 42px;gap:8px;align-items:center;border:1px solid #d7e2eb;border-radius:12px;padding:10px;background:#f8fbfe}.edit-item strong{min-width:0;font-size:14px;line-height:1.25}.edit-quantity{min-height:42px;width:100%;border:1px solid #b9cede;border-radius:10px;padding:7px;text-align:center;color:#17324d;background:#fff}.edit-remove{width:42px;height:42px;border:0;border-radius:10px;background:#ffe8ea;color:#b51f31;font-size:20px;cursor:pointer}.result{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#dff7e8;color:#187544;font-weight:1000;font-size:23px;margin-bottom:12px}.error .result{background:#ffe5e6;color:#b51f31}.proof{margin-top:14px;border:1px solid #d7e8f2;border-radius:12px;padding:14px;background:#f2f9fd}.proof header{display:flex;justify-content:space-between;gap:10px;align-items:center}.badge{font-size:10px;font-weight:900;text-transform:uppercase;color:#187544}.proof dl{display:grid;grid-template-columns:auto 1fr;gap:7px 12px;margin:12px 0 0;font-size:13px}.proof dt{color:#61758a}.proof dd{margin:0;text-align:right;font-weight:800;overflow-wrap:anywhere}
    @media(max-width:520px){.overlay{place-items:center;padding:max(12px,env(safe-area-inset-top)) 12px max(104px,calc(env(safe-area-inset-bottom) + 88px))}.panel{width:100%;max-height:calc(100svh - max(126px,calc(env(safe-area-inset-bottom) + 104px)));border-radius:18px}.card{padding:20px}.candidates,.catalog-results{max-height:min(32svh,260px)}.dock .voice{width:80px;height:80px}}
    @media(prefers-reduced-motion:reduce){.spinner{animation-duration:1.6s}.voice.cancelling::after{animation:none}}
    /* A superfície de desenho é bem maior que a onda real: ela nunca revela
       um limite quadrado, mesmo em uma fala mais alta. */
    /* O host ocupa somente a faixa livre da Sala. O grupo inteiro (botão e
       legenda) é centralizado nela, sem depender de coordenadas da viewport. */
    :host{position:absolute;inset:0;display:block;width:auto;height:auto;container-type:size}.dock{position:absolute;inset:0;display:grid;width:auto;height:auto;place-items:center;overflow:visible;text-align:center}.dock>.voice-body{display:grid;max-width:100%;align-content:center;justify-items:center;gap:8px}.dock>.voice-body>.capture{position:relative;top:auto;left:auto;width:90px;height:90px;margin:0;transform:none}.dock .voice-status{position:relative;top:auto;left:auto;z-index:2;width:min(84vw,310px);display:grid;gap:3px;white-space:normal;transform:none;text-align:center}.voice-status-main{font-weight:800}.voice-status-action{font-size:11px;font-weight:700}.visualizer{inset:-96px;width:calc(100% + 192px);height:calc(100% + 192px)}.overlay{display:flex;min-height:100svh;align-items:center;justify-content:center}.panel{margin:auto}
    @container (max-height:150px){.dock>.voice-body{gap:3px}.dock>.voice-body>.capture{width:76px;height:76px}.dock .voice{width:68px;height:68px}.dock .mic,.dock .cancel-icon{width:30px;height:30px}.dock .voice-status{gap:1px;font-size:11px}.voice-status-action{font-size:10px}.visualizer{transform:scale(.86)}}@container (max-height:112px){.dock .voice-status{display:none}.visualizer{transform:scale(.78)}}
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

  function newPendingId() {
    return crypto?.randomUUID?.() || `voz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function pendingEntries() {
    try {
      const saved = JSON.parse(localStorage.getItem(sessionKey()) || 'null');
      const entries = Array.isArray(saved?.pendencias)
        ? saved.pendencias
        : saved?.current ? [{ id: 'legado', current: saved.current, savedAt: saved.savedAt || new Date().toISOString() }] : [];
      return entries.filter((entry) => entry?.id && ['clarification', 'confirmation'].includes(entry?.current?.kind));
    } catch { return []; }
  }

  function persistPendingEntries(entries) {
    if (!state.options?.account?.id) return;
    try {
      if (entries.length) localStorage.setItem(sessionKey(), JSON.stringify({ pendencias: entries.slice(0, 30) }));
      else localStorage.removeItem(sessionKey());
    } catch { /* armazenamento indisponível */ }
  }

  function saveSession() {
    if (!state.options?.account?.id) return;
    const entries = pendingEntries();
    if (state.current && ['clarification', 'confirmation'].includes(state.current.kind)) {
      const id = state.pendingId || newPendingId();
      state.pendingId = id;
      const existing = entries.find((entry) => entry.id === id);
      const next = { id, current: state.current, savedAt: existing?.savedAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      persistPendingEntries([...entries.filter((entry) => entry.id !== id), next]);
    } else if (state.pendingId) {
      persistPendingEntries(entries.filter((entry) => entry.id !== state.pendingId));
      state.pendingId = null;
    }
  }

  function restorePending(id) {
    const entry = pendingEntries().find((item) => item.id === id);
    if (entry?.current) {
      state.current = entry.current;
      state.pendingId = entry.id;
      state.phase = entry.current.kind;
      return true;
    }
    state.current = null;
    state.phase = 'idle';
    state.pendingId = null;
    return false;
  }

  function discardCurrentPending() {
    if (!state.pendingId) return;
    persistPendingEntries(pendingEntries().filter((entry) => entry.id !== state.pendingId));
    state.pendingId = null;
  }

  function statusText() {
    if (state.phase === 'recording') return 'Ouvindo...';
    if (state.phase === 'transcribing') return 'Entendendo seu áudio...';
    if (state.phase === 'processing') return state.current?.kind === 'confirmation' ? 'Executando com segurança...' : 'Preparando sua solicitação...';
    if (state.phase === 'clarification') return state.current?.entity?.type === 'product' ? 'Diga somente o produto que ficou em dúvida' : 'Responda por voz ou toque em uma opção';
    if (state.phase === 'confirmation') return 'Confira antes de confirmar';
    if (state.phase === 'done') return 'Solicitação concluída';
    if (state.phase === 'error') return 'Não foi possível continuar';
    return 'Toque para falar';
  }

  function cancellationHint() {
    return state.requestStage === 'transcribe'
      ? 'Transcrevendo sua fala…'
      : 'Interpretando sua solicitação…';
  }

  function micIcon(stopping = false) {
    if (stopping) return el('span', 'stop');
    const icon = el('span', 'mic');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 15.4a3.9 3.9 0 0 0 3.9-3.9V6.4a3.9 3.9 0 1 0-7.8 0v5.1a3.9 3.9 0 0 0 3.9 3.9Z"/><path d="M5.7 10.9v.7a6.3 6.3 0 0 0 12.6 0v-.7M12 17.9V21M9.2 21h5.6"/></svg>';
    return icon;
  }

  function cancelIcon() {
    const icon = el('span', 'cancel-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>';
    return icon;
  }

  function voiceControl(small = false) {
    const listening = state.phase === 'recording';
    const busy = ['transcribing', 'processing'].includes(state.phase);
    const cancelable = busy && ['transcribe', 'process'].includes(state.requestStage);
    const wrap = el('div', `capture${small ? ' small' : ''}`);
    if (listening) {
      const canvas = el('canvas', 'visualizer');
      canvas.setAttribute('aria-hidden', 'true');
      state.canvas = canvas;
      wrap.append(canvas);
    }
    const control = button('', `voice${listening ? ' listening' : ''}${cancelable ? ' cancelling' : ''}`, toggleRecording);
    control.disabled = busy && !cancelable;
    control.setAttribute('aria-label', listening ? 'Encerrar gravação' : cancelable ? 'Cancelar envio da solicitação' : 'Iniciar gravação');
    control.setAttribute('aria-pressed', String(listening || cancelable));
    control.append(cancelable ? cancelIcon() : busy ? el('span', 'spinner') : micIcon(listening));
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

  function cloneDraft(draft) {
    return draft ? JSON.parse(JSON.stringify(draft)) : null;
  }

  function resetCatalog() {
    window.clearTimeout(state.catalogTimer);
    Object.assign(state, { catalogMode: '', catalogQuery: '', catalogProducts: [], catalogOffset: 0, catalogLoading: false, catalogHasMore: false, catalogError: '', catalogRequestId: state.catalogRequestId + 1 });
  }

  async function loadCatalog(reset = true) {
    const offset = reset ? 0 : state.catalogProducts.length;
    const query = state.catalogQuery;
    const requestId = state.catalogRequestId + 1;
    state.catalogRequestId = requestId;
    state.catalogLoading = true; state.catalogError = '';
    refreshCatalogResults();
    try {
      const result = await state.options.request('catalog', { query, offset });
      if (requestId !== state.catalogRequestId || query !== state.catalogQuery) return;
      const products = Array.isArray(result?.products) ? result.products : [];
      state.catalogProducts = reset ? products : [...state.catalogProducts, ...products];
      state.catalogOffset = offset; state.catalogHasMore = Boolean(result?.hasMore);
    } catch (error) {
      if (requestId !== state.catalogRequestId) return;
      state.catalogError = error instanceof Error ? error.message : 'Não foi possível abrir o catálogo de produtos.';
    } finally {
      if (requestId === state.catalogRequestId) { state.catalogLoading = false; refreshCatalogResults(); }
    }
  }

  function openProductCatalog(mode) {
    resetCatalog(); state.catalogMode = mode; render();
    void loadCatalog(true);
  }

  function scheduleCatalogSearch(value) {
    state.catalogQuery = String(value || '').slice(0, 120);
    window.clearTimeout(state.catalogTimer);
    state.catalogTimer = window.setTimeout(() => { void loadCatalog(true); }, 220);
  }

  function chooseCatalogProduct(candidate) {
    if (state.catalogMode === 'clarification') {
      const current = state.current;
      resetCatalog();
      void processTranscription(`Seleção manual: ${candidate.label}`, current, selectionFor(candidate));
      return;
    }
    if (state.catalogMode !== 'edit' || !state.editDraft) return;
    const reference = String(candidate.label || '').trim();
    if (!reference) return;
    const key = reference.toLocaleLowerCase('pt-BR');
    const items = Array.isArray(state.editDraft.items) ? state.editDraft.items : [];
    const existing = items.find((item) => String(item.productReference || '').toLocaleLowerCase('pt-BR') === key);
    if (existing) existing.quantity = Number(existing.quantity || 0) + 1;
    else items.push({ productReference: reference, quantity: 1 });
    state.editDraft.items = items;
    state.editSelections = [
      ...state.editSelections.filter((selection) => selection.type !== 'product' || String(selection.reference || '').toLocaleLowerCase('pt-BR') !== key),
      { type: 'product', reference, id: candidate.id },
    ];
    resetCatalog(); render();
  }

  function beginOrderEdit() {
    if (state.current?.kind !== 'confirmation' || !['create_order', 'create_consignment'].includes(state.current.action?.intent)) return;
    state.editDraft = cloneDraft(state.current.draft);
    state.editSelections = Array.isArray(state.current.selections) ? [...state.current.selections] : [];
    render();
  }

  function updateEditQuantity(index, value) {
    const item = state.editDraft?.items?.[index];
    const quantity = Number(String(value || '').replace(',', '.'));
    if (item && Number.isFinite(quantity) && quantity > 0) item.quantity = quantity;
  }

  function removeEditItem(index) {
    const item = state.editDraft?.items?.[index];
    if (!item || !state.editDraft) return;
    const reference = String(item.productReference || '').toLocaleLowerCase('pt-BR');
    state.editDraft.items.splice(index, 1);
    state.editSelections = state.editSelections.filter((selection) => selection.type !== 'product' || String(selection.reference || '').toLocaleLowerCase('pt-BR') !== reference);
    render();
  }

  async function applyOrderEdit() {
    const previous = state.current; const manualDraft = cloneDraft(state.editDraft);
    if (!previous?.draft || !manualDraft || !Array.isArray(manualDraft.items)) { render(); return; }
    state.editDraft = null; setPhase('processing');
    try {
      const result = await requestVoice('process', 'process', {
        transcription: 'Edição manual do pedido.', previousDraft: previous.draft, manualDraft, manualEdit: true, selections: state.editSelections,
      });
      state.current = result;
      setPhase(result.kind === 'clarification' ? 'clarification' : result.kind === 'confirmation' ? 'confirmation' : 'done');
    } catch (error) { if (!wasCancelled(error)) setPhase('error', error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.'); }
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

  function dockStatus() {
    const cancelable = ['transcribing', 'processing'].includes(state.phase) && ['transcribe', 'process'].includes(state.requestStage);
    const message = el('strong', 'voice-status');
    if (cancelable) {
      message.append(el('span', 'voice-status-main', cancellationHint()), el('span', 'voice-status-action', 'Toque para cancelar'));
    } else {
      message.textContent = state.phase === 'recording' ? 'Toque para encerrar' : statusText();
    }
    return message;
  }

  function fillCatalogResults(feedback, list, more) {
    feedback.replaceChildren(); list.replaceChildren(); more.replaceChildren();
    if (state.catalogLoading) feedback.append(el('p', 'helper', 'Buscando no catálogo...'));
    if (state.catalogError) feedback.append(el('p', 'catalog-empty', state.catalogError));
    state.catalogProducts.forEach((candidate) => {
      const option = button('', 'candidate', () => chooseCatalogProduct(candidate));
      option.append(el('strong', '', candidate.label), el('small', '', candidate.detail)); list.append(option);
    });
    if (!state.catalogLoading && !state.catalogError && !state.catalogProducts.length) {
      list.append(el('p', 'catalog-empty', state.catalogQuery ? 'Nenhum produto encontrado. Tente outro nome.' : 'Nenhum produto disponível no catálogo.'));
    }
    if (state.catalogHasMore) more.append(button('Mostrar mais produtos', 'text', () => { void loadCatalog(false); }));
  }

  function refreshCatalogResults() {
    if (!state.catalogMode || !state.root) return false;
    const feedback = state.root.querySelector('.catalog-feedback');
    const list = state.root.querySelector('.catalog-results');
    const more = state.root.querySelector('.catalog-more');
    if (!feedback || !list || !more) return false;
    fillCatalogResults(feedback, list, more);
    return true;
  }

  function renderCatalogPicker(panel) {
    const card = el('section', 'card');
    card.append(el('h2', '', 'Escolha um produto do catálogo'));
    const search = el('input', 'catalog-search');
    search.type = 'search'; search.autocomplete = 'off'; search.placeholder = 'Pesquisar produto'; search.value = state.catalogQuery;
    search.setAttribute('aria-label', 'Pesquisar produto no catálogo');
    search.addEventListener('input', () => scheduleCatalogSearch(search.value));
    card.append(search);
    const feedback = el('div', 'catalog-feedback'); feedback.setAttribute('aria-live', 'polite');
    const list = el('div', 'catalog-results');
    const more = el('div', 'catalog-more');
    fillCatalogResults(feedback, list, more);
    card.append(feedback, list, more);
    const actions = el('div', 'actions single'); actions.append(button('Voltar', 'secondary', () => { resetCatalog(); render(); }));
    card.append(actions); panel.append(card);
  }

  function renderOrderEditor(panel) {
    const card = el('section', 'card'); const draft = state.editDraft;
    card.append(el('h2', '', 'Editar pedido'), el('p', 'summary', `Cliente: ${state.current?.action?.customerName || draft?.customerReference || ''}`));
    const items = el('div', 'edit-items');
    (draft?.items || []).forEach((item, index) => {
      const row = el('div', 'edit-item'); const quantity = el('input', 'edit-quantity');
      quantity.type = 'number'; quantity.min = '0.01'; quantity.step = 'any'; quantity.inputMode = 'decimal'; quantity.value = String(item.quantity || 1);
      quantity.setAttribute('aria-label', `Quantidade de ${item.productReference}`);
      quantity.addEventListener('input', () => updateEditQuantity(index, quantity.value));
      row.append(el('strong', '', item.productReference), quantity, button('×', 'edit-remove', () => removeEditItem(index)));
      items.append(row);
    });
    card.append(items, button('Adicionar produto do catálogo', 'secondary', () => openProductCatalog('edit')));
    const actions = el('div', 'actions'); actions.append(button('Cancelar', 'secondary', () => { state.editDraft = null; state.editSelections = []; render(); }), button('Atualizar pedido', 'primary', applyOrderEdit));
    card.append(actions); panel.append(card);
  }

  function render() {
    if (!state.root) return;
    ensureMount();
    state.root.replaceChildren();
    if (['idle', 'recording', 'transcribing', 'processing'].includes(state.phase)) {
      const dock = el('section', 'dock');
      const body = el('div', 'voice-body');
      dock.setAttribute('aria-live', 'polite');
      body.append(voiceControl(), dockStatus());
      dock.append(body);
      state.root.append(dock);
      return;
    }
    const overlay = el('div', 'overlay');
    const panel = el('main', 'panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Solicitação por Voz');
    panel.append(button('×', 'close', close));

    if (state.catalogMode) {
      renderCatalogPicker(panel); overlay.append(panel); state.root.append(overlay); return;
    }

    if (state.phase === 'clarification' && state.current?.kind === 'clarification') {
      const card = el('section', 'card'); card.append(el('h2', '', state.current.question));
      if (Array.isArray(state.current.candidates) && state.current.candidates.length) {
        const list = el('div', 'candidates');
        state.current.candidates.forEach((candidate) => {
          const option = button('', 'candidate', () => processTranscription(`Seleção confirmada: ${candidate.label}`, state.current, selectionFor(candidate)));
          option.append(el('strong', '', candidate.label), el('small', '', candidate.detail)); list.append(option);
        }); card.append(list);
      }
      if (state.current.entity?.type === 'product') card.append(button('Procurar no catálogo', 'secondary', () => openProductCatalog('clarification')));
      card.append(el('p', 'helper', state.current.entity?.type === 'product' ? 'Diga apenas o produto que ficou em dúvida. O restante do pedido será mantido.' : 'Responda por voz ou escolha uma opção.'));
      card.append(voiceControl(true));
      const actions = el('div', 'actions single'); actions.append(button('Cancelar', 'secondary', cancel)); card.append(actions, button('Salvar para depois', 'save-later', saveForLater)); panel.append(card);
    }

    if (state.phase === 'confirmation' && state.current?.kind === 'confirmation') {
      if (state.editDraft) {
        renderOrderEditor(panel); overlay.append(panel); state.root.append(overlay); return;
      }
      const card = el('section', 'card'); card.append(el('h2', '', state.current.title), el('p', 'summary', state.current.message));
      const actions = el('div', 'actions'); actions.append(button('Cancelar', 'secondary', cancel), button('Confirmar', 'primary', execute)); card.append(actions, button('Salvar para depois', 'save-later', saveForLater)); panel.append(card);
      if (['create_order', 'create_consignment'].includes(state.current.action?.intent)) card.insertBefore(button('Editar pedido', 'text', beginOrderEdit), card.lastChild);
    }

    if (state.phase === 'done' && state.current) {
      const card = el('section', 'card'); card.append(el('h2', '', state.current.title), el('p', 'summary', state.current.message));
      const evidence = state.current.evidence;
      const actions = el('div', 'actions'); actions.append(button('Fechar', 'secondary', close));
      if (evidence && ['create_order', 'create_consignment', 'register_payment'].includes(state.current.intent)) actions.append(button('Compartilhar comprovante', 'primary', shareReceipt));
      card.append(actions); panel.append(card);
    }

    if (state.phase === 'error') {
      const card = el('section', 'card error'); card.setAttribute('role', 'alert'); card.append(el('h2', '', statusText()), el('p', 'summary', state.error));
      const actions = el('div', 'actions'); actions.append(button('Cancelar', 'secondary', close), button('Tentar novamente', 'primary', () => state.current?.kind === 'confirmation' ? execute() : startRecording())); card.append(actions); panel.append(card);
    }
    overlay.append(panel); state.root.append(overlay);
  }

  function setPhase(phase, error = '') {
    if (state.phase === 'recording' && phase !== 'recording') stopVisualization();
    state.phase = phase; state.error = error; saveSession(); render();
  }

  async function requestVoice(stage, operation, payload) {
    const controller = new AbortController();
    state.requestAbort = controller; state.requestStage = stage;
    render();
    try { return await state.options.request(operation, { ...payload, signal: controller.signal }); }
    finally {
      if (state.requestAbort === controller) { state.requestAbort = null; state.requestStage = null; }
    }
  }

  function wasCancelled(error) { return error?.name === 'AbortError'; }

  async function processTranscription(transcription, previous = state.current, selection = null) {
    setPhase('processing');
    try {
      const result = await requestVoice('process', 'process', { transcription, previousDraft: previous?.draft || null, candidates: previous?.kind === 'clarification' ? previous.candidates : [], selections: previous?.selections || [], selection });
      state.current = result;
      setPhase(result.kind === 'clarification' ? 'clarification' : result.kind === 'confirmation' ? 'confirmation' : 'done');
    } catch (error) { if (!wasCancelled(error)) setPhase('error', error instanceof Error ? error.message : 'Não foi possível entender sua solicitação.'); }
  }

  async function transcribe(audio, extension) {
    setPhase('transcribing');
    try {
      const result = await requestVoice('transcribe', 'transcribe', { audio, extension });
      if (!result?.transcription) throw new Error('Não foi possível transcrever o áudio.');
      await processTranscription(String(result.transcription));
    } catch (error) { if (!wasCancelled(error)) setPhase('error', error instanceof Error ? error.message : 'Não foi possível transcrever o áudio.'); }
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
        state.recorder = null;
        const chunks = state.chunks; state.chunks = [];
        if (!chunks.length) { setPhase('error', 'Não identificamos áudio. Tente novamente.'); return; }
        const type = recorder.mimeType || mimeType || 'audio/webm';
        void transcribe(new Blob(chunks, { type }), type.includes('mp4') ? 'mp4' : 'webm');
      };
      if (state.current?.kind !== 'clarification') state.current = null;
      setPhase('recording'); startVisualization(stream); recorder.start(250);
      state.timer = window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, MAX_RECORDING_MS);
    } catch (error) {
      const denied = error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name);
      setPhase('error', denied ? 'Autorize o microfone nos ajustes do navegador e tente novamente.' : 'Não foi possível iniciar o microfone.');
    }
  }

  function cancelSending() {
    if (!['transcribe', 'process'].includes(state.requestStage)) return;
    state.requestAbort?.abort(); state.requestAbort = null; state.requestStage = null;
    setPhase('idle');
  }
  function toggleRecording() {
    if (state.phase === 'recording') { if (state.recorder?.state === 'recording') state.recorder.stop(); }
    else if (['transcribing', 'processing'].includes(state.phase)) cancelSending();
    else if (['idle', 'clarification', 'error'].includes(state.phase)) startRecording();
  }
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
    const normalization = Math.max(peak, .015); const strength = 3 + activity * 8;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      for (let point = 0; point <= 128; point += 1) {
        const angle = point / 128 * Math.PI * 2 - Math.PI / 2; const index = (Math.floor(point / 128 * samples.length) + ring * 13) % samples.length;
        const wave = active ? ((samples[index] - 128) / 128) / normalization * strength * (1 - ring * .14) : 0; const radius = base + ring * 7 + wave;
        const x = center + Math.cos(angle) * radius; const y = center + Math.sin(angle) * radius; if (!point) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.lineWidth = active ? 1.65 - ring * .2 : 1; ctx.strokeStyle = `rgba(211,37,57,${active ? .48 - ring * .09 : .1 - ring * .02})`; ctx.shadowColor = active ? 'rgba(211,37,57,.18)' : 'transparent'; ctx.shadowBlur = active ? 3 : 0; ctx.stroke();
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
      const result = await requestVoice('execute', 'execute', { action: confirmation.action });
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
    discardCurrentPending();
    state.current = null;
    setPhase('idle');
    void startRecording();
  }
  function cancel() {
    const current = state.current;
    const request = state.options?.request;
    discardCurrentPending();
    resetCatalog(); state.editDraft = null; state.editSelections = [];
    state.current = null;
    close();
    if (current && request) void request('log', { event: 'cancelled', transcription: current.transcription, intent: current.draft?.intent }).catch(() => undefined);
  }
  function saveForLater() { saveSession(); close(); }
  function close() {
    saveSession();
    resetCatalog(); state.editDraft = null; state.editSelections = [];
    stopMedia(true);
    const mount = ensureMount() || state.mount;
    const trigger = mount?.querySelector?.('.mobile-voice-command-trigger');
    const onPendingChange = state.options?.onPendingChange;
    state.host?.remove();
    mount?.classList?.remove('is-active');
    Object.assign(state, { host: null, root: null, options: null, mount: null, phase: 'idle', current: null, error: '', requestAbort: null, requestStage: null, pendingId: null });
    requestAnimationFrame(() => { trigger?.isConnected && trigger.focus({ preventScroll: true }); onPendingChange?.(); });
  }

  function open(options) {
    if (!options?.account?.id || typeof options.request !== 'function') throw new Error('A conta ativa não está pronta para usar comandos por voz.');
    if (!options.mount?.isConnected) throw new Error('A Sala de Botões não está pronta para iniciar a gravação.');
    if (state.host) close();
    const host = document.createElement('avanta-voice-command'); const shadow = host.attachShadow({ mode: 'open' }); const style = document.createElement('style'); style.textContent = styles; const root = document.createElement('div'); shadow.append(style, root); options.mount.append(host);
    Object.assign(state, { host, root, options, mount: options.mount, phase: 'idle', current: null, error: '', pendingId: null, catalogMode: '', catalogQuery: '', catalogProducts: [], catalogOffset: 0, catalogLoading: false, catalogHasMore: false, catalogError: '', catalogRequestId: state.catalogRequestId + 1, editDraft: null, editSelections: [] });
    if (options.pendingId) restorePending(options.pendingId);
    render();
    if (options.autoStart && state.phase === 'idle') void startRecording();
    else requestAnimationFrame(() => shadow.querySelector('.voice,.candidate,.primary,.close')?.focus());
  }

  window.AvantaVoiceCommand = Object.freeze({ open, close });
  window.addEventListener('pagehide', () => stopMedia(true));
})();
