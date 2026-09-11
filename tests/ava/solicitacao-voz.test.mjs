import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { normalizeVoiceSearch, validateVoiceIntent } from '../../app/lib/vendas-voice/validation.mjs';
import { buildVoiceResponse, listVoiceCatalogProducts, resolveCustomer, resolveProduct } from '../../app/lib/vendas-voice/data.ts';

const UUIDS = {
  fernandaInfluencer: '11111111-1111-4111-8111-111111111111',
  fernandaSilva: '22222222-2222-4222-8222-222222222222',
  damiles: '55555555-5555-4555-8555-555555555555',
  influencerLitro: '33333333-3333-4333-8333-333333333333',
  influencerCemMl: '44444444-4444-4444-8444-444444444444',
};

function voiceResolverDb(products = null, customers = null, extraTables = {}) {
  const tables = {
    vendas_mobile_clientes: customers || [
      { id: UUIDS.fernandaInfluencer, nome: 'Fernanda (influencer)', ativo: true, observacoes: 'observação manual útil' },
      { id: UUIDS.fernandaSilva, nome: 'Fernanda Silva', ativo: true, observacoes: null },
    ],
    vendas_mobile_produtos: products || [
      { id: UUIDS.influencerLitro, nome: 'Influencer 1 litro', ativo: true, preco: 120 },
      { id: UUIDS.influencerCemMl, nome: 'Influencer 100 ml', ativo: true, preco: 25 },
    ],
    vendas_mobile_pedidos: [],
    vendas_mobile_pagamentos: [],
    vendas_mobile_produtos_busca_voz: [],
    vendas_mobile_clientes_busca_voz: [],
    ...extraTables,
  };
  return {
    from(table) {
      let selectedId = '';
      const rows = () => (tables[table] || []).filter((row) => !selectedId || row.id === selectedId);
      const query = {
        select() { return query; }, eq(field, value) { if (field === 'id') selectedId = String(value); return query; }, or() { return query; }, in() { return query; },
        neq() { return query; }, order() { return query; },
        async range(from, to) { return { data: rows().slice(from, to + 1), error: null }; },
        async limit(limit) { return { data: rows().slice(0, limit), error: null }; },
        async maybeSingle() { return { data: rows()[0] || null, error: null }; },
      };
      return query;
    },
  };
}

test('schema de voz aceita somente intenções e valores previstos', () => {
  const valid = validateVoiceIntent({
    intent: 'create_order',
    customer_reference: 'Luciana da Renata',
    items: [{ product_reference: 'Overliss', quantity: 5 }],
    amount: null,
    period: null,
    unsupported_reason: null,
  });
  assert.equal(valid?.intent, 'create_order');
  assert.equal(valid?.items[0].quantity, 5);
  assert.equal(validateVoiceIntent({ ...valid, intent: 'run_sql' }), null);
  assert.equal(validateVoiceIntent({ ...valid, items: [{ productReference: 'Overliss', quantity: -1 }] }), null);
  const appointment = validateVoiceIntent({
    intent: 'create_appointment', customer_reference: 'Fernanda influencer', items: [], amount: null,
    payment_method: null, scheduled_date: '2026-09-08', scheduled_time: '14:00',
    appointment_type: 'Visita', appointment_notes: 'Levar catálogo', period: null, unsupported_reason: null,
  });
  assert.equal(appointment?.scheduledDate, '2026-09-08');
  assert.equal(appointment?.scheduledTime, '14:00');
  assert.equal(validateVoiceIntent({ ...appointment, scheduled_date: '08/09/2026' }), null);
});

test('busca de voz ignora acentos sem perder as referências humanas', () => {
  assert.equal(normalizeVoiceSearch('Máscara de Cronograma — 150 ml'), 'mascara de cronograma 150 ml');
  assert.equal(normalizeVoiceSearch('Luciána (Renata)'), 'luciana renata');
});

test('comando não suportado devolve uma resposta clara e renderizável', async () => {
  const result = await buildVoiceResponse({
    db: voiceResolverDb(),
    accountId: 'conta',
    transcription: 'edite o último pedido da Fernanda',
    metrics: { interpretationMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    draft: {
      intent: 'unsupported', customerReference: null, items: [], amount: null,
      paymentMethod: null, scheduledDate: null, scheduledTime: null, appointmentType: null,
      appointmentNotes: null, period: null,
      unsupportedReason: 'A edição de pedidos ainda não está disponível por voz.',
    },
  });
  assert.equal(result.kind, 'unsupported');
  assert.equal(result.title, 'Comando não disponível');
  assert.equal(result.message, 'A edição de pedidos ainda não está disponível por voz.');
});

test('executor usa o RPC oficial e não aceita SQL gerado pela IA', async () => {
  const source = await readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/executar.ts', import.meta.url), 'utf8');
  assert.match(source, /salvar_pedido_vendas_mobile_rpc/);
  assert.match(source, /getVoiceSalesContext/);
  assert.match(source, /expectedTotal/);
  assert.match(source, /create_consignment/);
  assert.match(source, /forma_pagamento: consignment \? 'Consignado' : 'Venda'/);
  assert.doesNotMatch(source, /request[^\n]*sql|body[^\n]*query/i);
});

test('executor relê a escrita e devolve evidência verificável ao laboratório', async () => {
  const source = await readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/executar.ts', import.meta.url), 'utf8');
  assert.match(source, /verifiedOrder/);
  assert.match(source, /verifiedPayment/);
  assert.match(source, /Registro relido do banco após a gravação/g);
  assert.match(source, /recordId: verifiedOrder\.id/);
  assert.match(source, /recordId: verifiedPayment\.id/);
});

test('rota experimental permanece fora dos menus oficiais', async () => {
  const [manifest, officialApp] = await Promise.all([
    readFile(new URL('../../app/modules/vendas/manifest.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(manifest, /teste\/solicitacao-voz/);
  assert.doesNotMatch(officialApp, /teste\/solicitacao-voz/);
});

test('rotas oficiais de voz não dependem da implementação experimental', async () => {
  const operations = ['catalogo', 'executar', 'log', 'processar', 'transcrever'];
  const [officialRoutes, compatibilityRoutes] = await Promise.all([
    Promise.all(operations.map((operation) => readFile(
      new URL(`../../app/api/vendas/solicitacao-voz/${operation}/route.ts`, import.meta.url),
      'utf8',
    ))),
    Promise.all(operations.map((operation) => readFile(
      new URL(`../../app/api/teste/solicitacao-voz/${operation}/route.ts`, import.meta.url),
      'utf8',
    ))),
  ]);

  for (const [index, source] of officialRoutes.entries()) {
    assert.doesNotMatch(source, /api\/teste\/solicitacao-voz/);
    assert.match(source, new RegExp(`api/vendas/solicitacao-voz/_handlers/${operations[index]}`));
  }
  for (const [index, source] of compatibilityRoutes.entries()) {
    assert.match(source, new RegExp(`api/vendas/solicitacao-voz/_handlers/${operations[index]}`));
  }
});

test('função oficial de voz fica sob preferência da conta e carregamento isolado', async () => {
  const [officialApp, voiceModule] = await Promise.all([
    readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js', import.meta.url), 'utf8'),
  ]);
  assert.match(officialApp, /solicitacaoVozAtiva: false/);
  assert.doesNotMatch(officialApp, /\['solicitacao_voz',\s*'10_Solicitacao_por_voz/);
  assert.match(officialApp, /mobile-voice-command-slot/);
  assert.match(officialApp, /Deixe aqui suas sugestões/);
  assert.match(officialApp, /mobile-suggestions-icon">\$\{svgIconEstavel\('lightbulb'\)\}/);
  assert.doesNotMatch(officialApp, /Dúvidas e Sugestões/);
  assert.match(officialApp, /state\.solicitacaoVozAtiva \? `<div class="mobile-voice-command-slot"/);
  assert.match(officialApp, /carregarModuloSolicitacaoVozVendas/);
  assert.match(officialApp, /\/api\/vendas\/solicitacao-voz\//);
  assert.match(voiceModule, /attachShadow/);
  assert.match(voiceModule, /options\.mount\.append\(host\)/);
  assert.match(voiceModule, /options\.autoStart && state\.phase === 'idle'/);
  assert.match(voiceModule, /const dock = el\('section', 'dock'\)/);
  assert.match(voiceModule, /function cancelSending\(\)/);
  assert.match(officialApp, /function alternarAjudaSolicitacaoVozVendas\(acionador\)/);
  assert.match(officialApp, /mobile-voice-command-help/);
  assert.match(officialApp, /mobile-voice-command-help-symbol/);
  assert.match(officialApp, /<i>i<\/i>/);
  assert.match(officialApp, /Como usar a Solicitação por Voz/);
  assert.match(officialApp, /lançar um pagamento, lançar um pedido ou lançar um agendamento/);
  assert.match(officialApp, /function fecharAjudaSolicitacaoVozVendas\(acionador, ajuda\)/);
  assert.match(officialApp, /document\.addEventListener\('pointerdown', fecharAoTocarFora, true\)/);
  assert.match(officialApp, /if \(ajuda\.contains\(alvo\) \|\| acionador\.contains\(alvo\)\) return/);
  assert.match(officialApp, /document\.removeEventListener\('pointerdown', fecharAoTocarFora, true\)/);
  assert.match(officialApp, /evento\.key !== 'Escape'/);
  const [vendasStyles, hostStyles] = await Promise.all([
    readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.css', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8'),
  ]);
  assert.match(vendasStyles, /\.mobile-voice-command-help \{ position: absolute/);
  assert.match(vendasStyles, /left: clamp\(105px,calc\(75% - 3px\),calc\(100% - 54px\)\)/);
  assert.match(vendasStyles, /\.mobile-voice-command-help-symbol \{ display: grid; width: 36px; height: 36px/);
  assert.match(vendasStyles, /font-size: 30px/);
  assert.match(vendasStyles, /\.mobile-voice-command-help \{[^}]*border: 0;[^}]*background: transparent;[^}]*box-shadow: none/);
  assert.match(vendasStyles, /\.dark-theme \.mobile-voice-command-help \{ color: #fff; \}/);
  assert.doesNotMatch(voiceModule, /function voiceHelp\(\)|voice-help-button/);
  assert.match(voiceModule, /state\.requestAbort\?\.abort\(\)/);
  assert.match(voiceModule, /function restorePending\(id\)/);
  assert.match(voiceModule, /pendencias: entries\.slice\(0, 30\)/);
  assert.doesNotMatch(voiceModule, /restoreSession\(/);
  assert.match(voiceModule, /Cancelar envio da solicitação/);
  assert.match(voiceModule, /Transcrevendo sua fala…/);
  assert.doesNotMatch(voiceModule, /Nova solicitação/);
  assert.match(voiceModule, /border:1px solid rgba\(219,229,239,.95\);border-radius:18px;background:#fff/);
  assert.match(voiceModule, /\.primary\{border:1px solid #1687D9;background:#1687D9/);
  assert.match(voiceModule, /voice-status-action', 'Toque para cancelar/);
  assert.match(voiceModule, /processing-ring/);
  assert.match(voiceModule, /options\?\.notify\?\.\(result\?\.message/);
  assert.match(voiceModule, /rotulo: 'Compartilhar comprovante'/);
  assert.match(voiceModule, /state\.phase === 'response'/);
  assert.match(voiceModule, /\['answer', 'unsupported'\]\.includes\(state\.current\?\.kind\)/);
  assert.match(voiceModule, /button\('Fechar', 'primary', close\)/);
  assert.match(voiceModule, /A solicitação retornou uma resposta inválida/);
  assert.match(officialApp, /notify: \(mensagem, opcoes\) => toast\(mensagem, opcoes\)/);
  assert.match(hostStyles, /\.toast-com-acao \{ grid-template-areas:/);
  assert.match(hostStyles, /\.toast-action \{ grid-area: action;/);
  assert.match(officialApp, /const signalExterno = payload\?\.signal/);
  assert.match(officialApp, /signalExterno\?\.aborted/);
  assert.match(officialApp, /function solicitacoesVozPendentes\(\)/);
  assert.match(officialApp, /function abrirPendenciasSolicitacaoVoz\(\)/);
  assert.match(officialApp, /autoStart: !pendenciaId/);
  assert.match(officialApp, /pendingId: pendenciaId/);
  assert.doesNotMatch(voiceModule, /Áudio pronto|sendPendingAudio|discardPendingAudio/);
  assert.match(voiceModule, /\.overlay\{place-items:center/);
  assert.doesNotMatch(voiceModule, /lastTranscription[^\n]*textContent|transcription[^\n]*append/i);
  assert.doesNotMatch(voiceModule, /Experimental/);
  assert.doesNotMatch(voiceModule, /A IA interpreta; as funções seguras/);
  assert.doesNotMatch(voiceModule, /O lançamento só será gravado depois da sua confirmação/);
  assert.doesNotMatch(voiceModule, /Preciso confirmar uma informação|Confirmação obrigatória/);
  assert.doesNotMatch(voiceModule, /Conferência no banco|Verificado agora|Ou responda por voz/);
  assert.match(voiceModule, /\.save-later\{[^}]*border-radius:999px/);
  assert.match(voiceModule, /button\('Salvar para depois', 'save-later', saveForLater\)/);
});

test('backend recusa comandos quando a função está desligada', async () => {
  const [auth, transcribe, process, execute] = await Promise.all([
    readFile(new URL('../../app/lib/vendas-voice/auth.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/transcrever.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/processar.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/executar.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(auth, /solicitacaoVozAtiva === true/);
  assert.match(transcribe, /isVoiceCommandEnabled/);
  assert.match(process, /isVoiceCommandEnabled/);
  assert.match(execute, /isVoiceCommandEnabled/);
});

test('pagamento sem forma escolhida pede esclarecimento antes da confirmação', async () => {
  const resolver = await readFile(new URL('../../app/lib/vendas-voice/data.ts', import.meta.url), 'utf8');
  assert.match(resolver, /if \(!draft\.paymentMethod\) return clarification/);
  assert.match(resolver, /'Confirme a forma de pagamento\.'/);
  assert.match(resolver, /Cartão de crédito/);
  assert.match(resolver, /paymentMethod: draft\.paymentMethod/);
});

test('clique de desambiguação usa candidato validado sem reinterpretar pela IA', async () => {
  const [route, resolver, voiceModule] = await Promise.all([
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/processar.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/vendas-voice/data.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /if \(selection && previousDraft\)/);
  assert.match(route, /const selections = mergeSelection/);
  assert.match(route, /buildVoiceResponse\(\{[^}]*selections/s);
  assert.match(resolver, /\.eq\('id', selectedId\)/);
  assert.match(resolver, /Não foi possível validar o produto escolhido/);
  assert.match(resolver, /selectedEntityId\(selections, 'customer'/);
  assert.match(resolver, /selectedEntityId\(selections, 'product'/);
  assert.match(voiceModule, /selections: previous\?\.selections \|\| \[\]/);
});

test('interpretação mantém qualificadores no nome do cliente e não os transforma em produto', async () => {
  const interpreter = await readFile(new URL('../../app/lib/vendas-voice/interpreter.ts', import.meta.url), 'utf8');
  assert.match(interpreter, /“Fernanda influencer”/);
  assert.match(interpreter, /Um qualificativo logo após o nome do cliente não é item de pedido/);
});

test('onda de voz usa área ampliada sem recorte e amplitude moderada', async () => {
  const [voiceModule, styles, voiceStyles] = await Promise.all([
    readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.css', import.meta.url), 'utf8'),
  ]);
  assert.match(voiceModule, /\.visualizer\{inset:-96px;width:calc\(100% \+ 192px\)/);
  assert.match(voiceModule, /overflow:visible/);
  assert.match(voiceModule, /const strength = 3 \+ activity \* 8/);
  assert.match(voiceModule, /for \(let ring = 0; ring < 3; ring \+= 1\)/);
  assert.match(voiceModule, /\.overlay\{display:flex;min-height:100svh;align-items:center;justify-content:center\}/);
  assert.match(voiceModule, /const body = el\('div', 'voice-body'\)/);
  assert.match(voiceModule, /body\.append\(voiceControl\(\), dockStatus\(\)\)/);
  assert.match(voiceModule, /\.dock \.voice-status\{position:relative;top:auto;left:auto/);
  assert.match(voiceModule, /:host\{position:absolute;inset:0;display:block;width:auto;height:auto;container-type:size\}/);
  assert.match(voiceModule, /\.dock\{position:absolute;inset:0;display:grid;width:auto;height:auto;place-items:center/);
  assert.match(voiceModule, /\.dock>\.voice-body\{display:grid;max-width:100%;align-content:center;justify-items:center/);
  assert.match(voiceModule, /\.dock>\.voice-body>\.capture\{position:relative;top:auto;left:auto;width:90px;height:90px/);
  assert.match(styles, /\.mobile-menu-assistance\.has-voice-command \{[^}]*margin-bottom: 0;/);
  assert.match(voiceStyles, /\.mobile-voice-command-body \{[^}]*align-content: center;[^}]*justify-items: center;/);
  assert.match(voiceModule, /@container \(max-height:150px\)/);
  assert.match(voiceModule, /@container \(max-height:112px\)/);
  assert.match(voiceModule, /\.dock \.voice\{width:84px;height:84px\}/);
  assert.match(voiceModule, /@media\(max-width:520px\).*\.dock \.voice\{width:80px;height:80px\}/);
});

test('Solicitação por Voz reutiliza o componente central do PADRÃO AVANTA', async () => {
  const [officialApp, resourceRoute, page, serviceWorker, standard, localStyles] = await Promise.all([
    readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/recursos/[...arquivo]/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sw.js/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/padrao-avanta/acoes-por-voz.md', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8'),
  ]);
  assert.match(officialApp, /window\.AvantaVoiceActions\?\.open/);
  assert.match(officialApp, /recursos\/avanta-voice-actions\.js/);
  assert.match(officialApp, /storageNamespace: 'avantalab\.vendas\.voice_command\.official\.v1'/);
  assert.match(resourceRoute, /app\/padrao-avanta\/acoes-por-voz\/avanta-voice-actions\.js/);
  assert.match(page, /avanta-voice-actions\.css/);
  assert.match(serviceWorker, /avanta-voice-actions\.css/);
  assert.match(standard, /É proibido copiar o JavaScript/);
  assert.doesNotMatch(localStyles, /\.mobile-voice-command-trigger\s*\{/);
});

test('clientes são sugeridos por aproximação de dicção e letras repetidas', async () => {
  const damiles = { id: UUIDS.damiles, nome: 'Damiles', ativo: true, observacoes: null };
  const result = await resolveCustomer(voiceResolverDb(null, [damiles]), 'conta', 'Damilles');
  assert.equal(result.status, 'resolved');
  assert.equal(result.customer.id, UUIDS.damiles);
  assert.equal(result.candidates[0].label, 'Damiles');
});

test('desambiguação de pagamento mostra o saldo devedor atual, não o último pedido', async () => {
  const result = await resolveCustomer(voiceResolverDb(null, [{
    id: UUIDS.damiles, nome: 'Mari (Lila)', ativo: true, observacoes: null,
  }]), 'conta', 'Mari', '', 'payment');
  assert.equal(result.status, 'resolved');
  assert.match(result.candidates[0].detail, /Saldo devedor atual: R\$/);
  assert.doesNotMatch(result.candidates[0].detail, /Último pedido/);
});

test('desambiguação oculta observação técnica e preserva a manual', async () => {
  const resolver = await readFile(new URL('../../app/lib/vendas-voice/data.ts', import.meta.url), 'utf8');
  assert.match(resolver, /LEGACY_CUSTOMER_NOTE/);
  assert.match(resolver, /visibleCustomerNote\(row\.observacoes\)/);
  assert.match(resolver, /const fields = \['nome', 'observacoes', 'email', 'telefone'\]/);
});

test('cliente e produto escolhidos permanecem resolvidos até a confirmação', async () => {
  const db = voiceResolverDb();
  const draft = {
    intent: 'create_order', customerReference: 'Fernanda',
    items: [{ productReference: 'Influencer', quantity: 1 }], amount: null,
    paymentMethod: null, period: null, unsupportedReason: null,
  };
  const common = { db, accountId: 'conta', draft, transcription: 'teste', metrics: { interpretationMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
  const customerQuestion = await buildVoiceResponse(common);
  assert.equal(customerQuestion.kind, 'clarification');
  assert.equal(customerQuestion.entity?.type, 'customer');
  assert.match(customerQuestion.candidates.find(({ id }) => id === UUIDS.fernandaInfluencer).detail, /observação manual útil/);

  const customerSelection = { type: 'customer', reference: 'Fernanda', id: UUIDS.fernandaInfluencer };
  const productQuestion = await buildVoiceResponse({ ...common, selections: [customerSelection] });
  assert.equal(productQuestion.kind, 'clarification');
  assert.equal(productQuestion.entity?.type, 'product');
  assert.deepEqual(productQuestion.selections, [customerSelection]);

  const productSelection = { type: 'product', reference: 'Influencer', id: UUIDS.influencerCemMl };
  const confirmation = await buildVoiceResponse({ ...common, selections: [customerSelection, productSelection] });
  assert.equal(confirmation.kind, 'confirmation');
  assert.equal(confirmation.action.customerId, UUIDS.fernandaInfluencer);
  assert.equal(confirmation.action.items[0].productId, UUIDS.influencerCemMl);
});

test('catálogo reconhece produto pelo nome humano composto e sugere por aproximação', async () => {
  const paladium = { id: UUIDS.influencerLitro, nome: 'Progressiva Palladium', ativo: true, preco: 180 };
  const outra = { id: UUIDS.influencerCemMl, nome: 'Progressiva Natural', ativo: true, preco: 150 };
  const exact = await resolveProduct(voiceResolverDb([paladium, outra]), 'conta', 'Progressiva Paladium');
  assert.equal(exact.status, 'resolved');
  assert.equal(exact.product.id, paladium.id);

  const approximate = await resolveProduct(voiceResolverDb([
    paladium,
    outra,
  ]), 'conta', 'Paladium');
  assert.ok(['resolved', 'ambiguous'].includes(approximate.status));
  assert.equal(approximate.candidates[0].id, paladium.id);

  const phoneticApproximate = await resolveProduct(voiceResolverDb([
    paladium,
    outra,
  ]), 'conta', 'Paladin');
  assert.ok(['resolved', 'ambiguous'].includes(phoneticApproximate.status));
  assert.equal(phoneticApproximate.candidates[0].id, paladium.id);
});

test('catálogo prioriza referência completa próxima e não sugere itens por palavra genérica', async () => {
  const triliss = { id: UUIDS.influencerLitro, nome: 'Triliss - Redutor Orgânico', ativo: true, preco: 220, categoria: 'Progressiva' };
  const ox = { id: UUIDS.influencerCemMl, nome: 'OX 10 vol.', ativo: true, preco: 18, categoria: 'Oxidante' };
  const shampoo = { id: UUIDS.damiles, nome: 'Shampoo Onix', ativo: true, preco: 42, categoria: 'Shampoo' };
  const resolved = await resolveProduct(voiceResolverDb([triliss, ox, shampoo]), 'conta-triliss', 'triliss organica');
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.product.id, triliss.id);
  assert.deepEqual(resolved.candidates.map(({ id }) => id), [triliss.id]);

  const catalog = await listVoiceCatalogProducts(voiceResolverDb([triliss, ox, shampoo]), 'conta-triliss', 'triliss organica');
  assert.equal(catalog.products[0].id, triliss.id);
});

test('Triliss não é confundida com descrição técnica parecida', async () => {
  const triliss = { id: UUIDS.influencerLitro, nome: 'Triliss - Redutor Orgânico', ativo: true, preco: 220 };
  const imported = { id: UUIDS.influencerCemMl, nome: 'Shampoo Onix', descricao: 'Importado do Tridium MySQL', ativo: true, preco: 42 };
  const result = await resolveProduct(voiceResolverDb([imported, triliss]), 'conta-triliss-tecnica', 'triliss');
  assert.equal(result.status, 'resolved');
  assert.equal(result.product.id, triliss.id);
  assert.deepEqual(result.candidates.map(({ id }) => id), [triliss.id]);
});

test('nome comercial falado junto encontra o mesmo nome separado no catálogo', async () => {
  const triliss = { id: UUIDS.influencerLitro, nome: 'Tri Liss - Redutor Orgânico', ativo: true, preco: 220 };
  const result = await resolveProduct(voiceResolverDb([triliss]), 'conta-tri-liss', 'triliss');
  assert.equal(result.status, 'resolved');
  assert.equal(result.product.id, triliss.id);
});

test('produto escolhido manualmente encerra a dúvida mesmo quando a fala não combina com o nome', async () => {
  const triliss = { id: UUIDS.influencerLitro, nome: 'Triliss - Redutor Orgânico', ativo: true, preco: 220 };
  const result = await resolveProduct(
    voiceResolverDb([triliss]),
    'conta-selecao-manual',
    'produto que o sistema não compreendeu',
    triliss.id,
  );
  assert.equal(result.status, 'resolved');
  assert.equal(result.product.id, triliss.id);
  assert.deepEqual(result.candidates.map(({ id }) => id), [triliss.id]);
});

test('catálogo aceita palavras intermediárias ausentes na fala', async () => {
  const homeCare = { id: UUIDS.influencerLitro, nome: 'Kit Home Care - Cabelos Normais', ativo: true, preco: 189 };
  const outro = { id: UUIDS.influencerCemMl, nome: 'Kit Home Care - Cabelos Danificados', ativo: true, preco: 199 };
  const exact = await resolveProduct(voiceResolverDb([homeCare, outro]), 'conta-home-care', 'kit cabelos normais');
  assert.equal(exact.status, 'resolved');
  assert.equal(exact.product.id, homeCare.id);

  const singular = await resolveProduct(voiceResolverDb([homeCare, outro]), 'conta-home-care', 'kit cabelo normal');
  assert.equal(singular.status, 'resolved');
  assert.equal(singular.product.id, homeCare.id);

  const noisyTranscription = await resolveProduct(voiceResolverDb([homeCare, outro]), 'conta-home-care', 'que cabelos normais');
  assert.equal(noisyTranscription.status, 'resolved');
  assert.equal(noisyTranscription.product.id, homeCare.id);
});

test('conciliação de palavras intermediárias funciona em qualquer segmento de catálogo', async () => {
  const drill = { id: UUIDS.influencerLitro, nome: 'Furadeira Profissional de Impacto 750W', ativo: true, preco: 349 };
  const saw = { id: UUIDS.influencerCemMl, nome: 'Serra Circular Profissional 1200W', ativo: true, preco: 529 };
  const result = await resolveProduct(voiceResolverDb([saw, drill]), 'conta-ferramentas', 'furadeira impacto');
  assert.equal(result.status, 'resolved');
  assert.equal(result.product.id, drill.id);
});

test('produto pode ser escolhido manualmente sem perder o rascunho e pedido pode ser editado com validação', async () => {
  const [voiceModule, route, catalogRoute] = await Promise.all([
    readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/processar.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/catalogo.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(voiceModule, /Procurar no catálogo/);
  assert.match(voiceModule, /Escolha um produto do catálogo/);
  assert.match(voiceModule, /manualEdit: true/);
  assert.match(voiceModule, /Editar pedido/);
  assert.match(voiceModule, /Diga apenas o produto que ficou em dúvida\. O restante do pedido será mantido\./);
  assert.match(voiceModule, /\.candidates,\.catalog-results\{[^}]*overflow-y:auto/);
  assert.match(voiceModule, /max-height:calc\(100svh - max\(132px/);
  assert.match(route, /body\?\.manualEdit === true/);
  assert.match(route, /manualDraft\.intent !== previousDraft\.intent/);
  assert.match(route, /manualDraft\.customerReference !== previousDraft\.customerReference/);
  assert.match(catalogRoute, /getVoiceSalesContext/);
  assert.match(catalogRoute, /listVoiceCatalogProducts/);
});

test('resolução de vários produtos prioriza resposta curta e compartilha a busca aprofundada', async () => {
  const resolver = await readFile(new URL('../../app/lib/vendas-voice/data.ts', import.meta.url), 'utf8');
  assert.match(resolver, /PRODUCT_CATALOG_CACHE_TTL_MS = 30_000/);
  assert.match(resolver, /productCatalogRequests/);
  assert.match(resolver, /const productChecks = await Promise\.all\(draft\.items\.map/);
  assert.match(resolver, /const pages = await Promise\.all\(starts\.map\(readPage\)\)/);
});

test('pesquisa manual atualiza resultados sem reconstruir o campo focado', async () => {
  const voiceModule = await readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js', import.meta.url), 'utf8');
  const loadCatalog = voiceModule.match(/async function loadCatalog[\s\S]*?\n  function openProductCatalog/)?.[0] || '';
  assert.match(voiceModule, /function refreshCatalogResults\(\)/);
  assert.match(voiceModule, /query !== state\.catalogQuery/);
  assert.match(voiceModule, /const offset = reset \? 0 : state\.catalogProducts\.length/);
  assert.doesNotMatch(loadCatalog, /\brender\(\)/);
});

test('pedido consignado usa o mesmo fluxo oficial com estoque e confirmação', async () => {
  const db = voiceResolverDb([{ id: UUIDS.influencerLitro, nome: 'Palladium', ativo: true, preco: 180 }]);
  const result = await buildVoiceResponse({
    db, accountId: 'conta', transcription: 'deixa duas Palladium em consignação para Fernanda influencer',
    metrics: { interpretationMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    draft: {
      intent: 'create_consignment', customerReference: 'Fernanda influencer',
      items: [{ productReference: 'Progressiva Paladin', quantity: 2 }], amount: null,
      paymentMethod: null, period: null, unsupportedReason: null,
    },
  });
  assert.equal(result.kind, 'confirmation');
  assert.equal(result.title, 'Criar consignado');
  assert.equal(result.action.intent, 'create_consignment');
  assert.equal(result.action.paymentMethod, 'Consignado');
  assert.equal(result.action.items[0].productId, UUIDS.influencerLitro);
});

test('agendamento por voz resolve cliente, exige data e prepara confirmação segura', async () => {
  const common = {
    db: voiceResolverDb(), accountId: 'conta', transcription: 'agenda uma visita para Fernanda influencer amanhã às duas',
    metrics: { interpretationMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    draft: {
      intent: 'create_appointment', customerReference: 'Fernanda influencer', items: [], amount: null,
      paymentMethod: null, scheduledDate: null, scheduledTime: null, appointmentType: null, appointmentNotes: null,
      period: null, unsupportedReason: null,
    },
  };
  const missingDate = await buildVoiceResponse(common);
  assert.equal(missingDate.kind, 'clarification');
  assert.match(missingDate.question, /qual dia/i);
  const confirmation = await buildVoiceResponse({
    ...common,
    draft: { ...common.draft, scheduledDate: '2026-09-08', scheduledTime: '14:00', appointmentType: 'Visita', appointmentNotes: 'Levar catálogo' },
  });
  assert.equal(confirmation.kind, 'confirmation');
  assert.equal(confirmation.action.intent, 'create_appointment');
  assert.equal(confirmation.action.scheduledTime, '14:00');
  assert.match(confirmation.message, /Levar catálogo/);
});

test('agenda e executor reutilizam a fonte oficial por conta', async () => {
  const [client, app, executor, interpreter] = await Promise.all([
    readFile(new URL('../../app/avantavendas/sistema/supabase-client.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/executar.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/vendas-voice/interpreter.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(client, /from\('vendas_mobile_agenda'\)/);
  assert.match(client, /saveAgendaItem/);
  assert.match(app, /normalizarAgendaItensServidor\(dados\.agenda/);
  assert.match(app, /migrarAgendaLocalLegadaParaServidor/);
  assert.match(executor, /action\.intent === 'create_appointment'/);
  assert.match(executor, /Registro relido do banco após a gravação/);
  assert.match(interpreter, /create_appointment: criar agendamento/);
});

test('transcrição de voz usa modelo especializado sem enviar o catálogo da conta', async () => {
  const source = await readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/transcrever.ts', import.meta.url), 'utf8');
  assert.match(source, /OPENAI_VOICE_TRANSCRIPTION_MODEL \|\| 'gpt-transcribe'/);
  assert.match(source, /OPENAI_VOICE_TRANSCRIPTION_CONTEXT/);
  assert.match(source, /keywords\[\]/);
  assert.match(source, /languages\[\].*'pt'/);
  assert.doesNotMatch(source, /append\('language',/);
  assert.match(source, /audioSeconds/);
  assert.doesNotMatch(source, /vendas_mobile_produtos/);
});

test('índice oculto de voz é aditivo, isolado por conta e sem campo manual no cadastro', async () => {
  const [migration, catalogComponent] = await Promise.all([
    readFile(new URL('../../supabase/migrations/20260909210000_busca_voz_catalogo_aprendizado.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../app/components/CatalogoProdutosVendas.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /create table if not exists public\.vendas_mobile_catalogo_produtos_busca_voz/);
  assert.match(migration, /create table if not exists public\.vendas_mobile_produtos_busca_voz/);
  assert.match(migration, /create table if not exists public\.vendas_mobile_clientes_busca_voz/);
  assert.match(migration, /vendas_mobile_pode_ler_conta\(conta_id\)/);
  assert.match(migration, /vendas_mobile_confirmar_aprendizado_busca_voz_rpc/);
  assert.match(migration, /revoke all on function public\.vendas_mobile_reconstruir_busca_produto_conta/);
  assert.doesNotMatch(catalogComponent, /Nomes para busca|Como este produto também pode ser chamado/i);
  assert.match(catalogComponent, /\/api\/conteudo-vendas\/produtos\/indexar-voz/);
});

test('catálogo gera aliases com IA em segundo plano e valida cada termo antes de salvar', async () => {
  const [indexer, route, processor] = await Promise.all([
    readFile(new URL('../../app/lib/vendas-voice/catalog-index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/conteudo-vendas/produtos/indexar-voz/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/processar.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(indexer, /response_format: \{ type: 'json_schema'/);
  assert.match(indexer, /strict: true/);
  assert.match(indexer, /groundedAlias/);
  assert.match(indexer, /Não invente características/);
  assert.match(indexer, /OPENAI_VOICE_CATALOG_MODEL/);
  assert.match(route, /after\(async \(\) =>/);
  assert.match(processor, /enrichPendingCatalogForAccount/);
  assert.match(processor, /after\(async \(\) =>/);
});

test('alias aprendido resolve uma expressão humana específica da conta', async () => {
  const triliss = { id: UUIDS.influencerLitro, nome: 'Triliss - Redutor Orgânico', ativo: true, preco: 220 };
  const firstConfirmation = await resolveProduct(voiceResolverDb([triliss], null, {
    vendas_mobile_produtos_busca_voz: [{
      conta_id: 'conta-alias-inicial', produto_id: triliss.id, termo: 'selagem rubi',
      termo_normalizado: 'selagem rubi', origem: 'aprendizado', confianca: 0.92, confirmacoes: 1,
    }],
  }), 'conta-alias-inicial', 'selagem rubi');
  assert.equal(firstConfirmation.status, 'missing');

  const result = await resolveProduct(voiceResolverDb([triliss], null, {
    vendas_mobile_produtos_busca_voz: [{
      conta_id: 'conta-alias', produto_id: triliss.id, termo: 'selagem rubi',
      termo_normalizado: 'selagem rubi', origem: 'aprendizado', confianca: 0.945, confirmacoes: 2,
    }],
  }), 'conta-alias', 'selagem rubi');
  assert.equal(result.status, 'resolved');
  assert.equal(result.product.id, triliss.id);
});

test('seleção manual só vira aprendizado depois da gravação oficial confirmada', async () => {
  const [resolver, executor] = await Promise.all([
    readFile(new URL('../../app/lib/vendas-voice/data.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/executar.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(resolver, /voiceLearnings: voiceLearningsForAction/);
  assert.match(executor, /vendas_mobile_confirmar_aprendizado_busca_voz_rpc/);
  assert.match(resolver, /Number\(alias\.confirmacoes \|\| 0\) >= 2/);
  const verificationPosition = executor.indexOf('verifiedOrder');
  const learningPosition = executor.indexOf('await confirmVoiceLearnings(context.db, action, productIds)');
  assert.ok(verificationPosition >= 0 && learningPosition > verificationPosition);
});

test('transcrição recebe só um vocabulário curto já aprendido, nunca o catálogo inteiro', async () => {
  const [transcription, resolver] = await Promise.all([
    readFile(new URL('../../app/api/vendas/solicitacao-voz/_handlers/transcrever.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/vendas-voice/data.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(transcription, /listVoiceTranscriptionHints/);
  assert.match(transcription, /listVoiceTranscriptionHints\(context\.db, accountId, 24\)/);
  assert.match(resolver, /Math\.min\(30/);
  assert.match(resolver, /Referências aprendidas de clientes ficam restritas à busca/);
  assert.doesNotMatch(transcription, /from\('vendas_mobile_produtos'\)/);
});
