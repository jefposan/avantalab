import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { normalizeVoiceSearch, validateVoiceIntent } from '../../app/lib/vendas-voice/validation.mjs';
import { buildVoiceResponse, resolveCustomer, resolveProduct } from '../../app/lib/vendas-voice/data.ts';

const UUIDS = {
  fernandaInfluencer: '11111111-1111-4111-8111-111111111111',
  fernandaSilva: '22222222-2222-4222-8222-222222222222',
  damiles: '55555555-5555-4555-8555-555555555555',
  influencerLitro: '33333333-3333-4333-8333-333333333333',
  influencerCemMl: '44444444-4444-4444-8444-444444444444',
};

function voiceResolverDb(products = null, customers = null) {
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
  };
  return {
    from(table) {
      const query = {
        select() { return query; }, eq() { return query; }, or() { return query; }, in() { return query; },
        neq() { return query; }, order() { return query; },
        async range(from, to) { return { data: (tables[table] || []).slice(from, to + 1), error: null }; },
        async limit(limit) { return { data: (tables[table] || []).slice(0, limit), error: null }; },
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

test('executor usa o RPC oficial e não aceita SQL gerado pela IA', async () => {
  const source = await readFile(new URL('../../app/api/teste/solicitacao-voz/executar/route.ts', import.meta.url), 'utf8');
  assert.match(source, /salvar_pedido_vendas_mobile_rpc/);
  assert.match(source, /getVoiceSalesContext/);
  assert.match(source, /expectedTotal/);
  assert.match(source, /create_consignment/);
  assert.match(source, /forma_pagamento: consignment \? 'Consignado' : 'Venda'/);
  assert.doesNotMatch(source, /request[^\n]*sql|body[^\n]*query/i);
});

test('executor relê a escrita e devolve evidência verificável ao laboratório', async () => {
  const source = await readFile(new URL('../../app/api/teste/solicitacao-voz/executar/route.ts', import.meta.url), 'utf8');
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

test('função oficial de voz fica sob preferência da conta e carregamento isolado', async () => {
  const [officialApp, voiceModule] = await Promise.all([
    readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/voice-command.js', import.meta.url), 'utf8'),
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
  assert.match(officialApp, /\$\{svgIconEstavel\('info'\)\}/);
  assert.match(officialApp, /Como usar a Solicitação por Voz/);
  assert.match(officialApp, /lançar um pagamento, lançar um pedido ou lançar um agendamento/);
  assert.match(officialApp, /function fecharAjudaSolicitacaoVozVendas\(acionador, ajuda\)/);
  assert.match(officialApp, /document\.addEventListener\('pointerdown', fecharAoTocarFora, true\)/);
  assert.match(officialApp, /if \(ajuda\.contains\(alvo\) \|\| acionador\.contains\(alvo\)\) return/);
  assert.match(officialApp, /document\.removeEventListener\('pointerdown', fecharAoTocarFora, true\)/);
  assert.match(officialApp, /evento\.key !== 'Escape'/);
  const vendasStyles = await readFile(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8');
  assert.match(vendasStyles, /\.mobile-voice-command-help \{ position: absolute/);
  assert.match(vendasStyles, /left: clamp\(105px,calc\(75% - 3px\),calc\(100% - 54px\)\)/);
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
    readFile(new URL('../../app/api/teste/solicitacao-voz/transcrever/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/teste/solicitacao-voz/processar/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/teste/solicitacao-voz/executar/route.ts', import.meta.url), 'utf8'),
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
    readFile(new URL('../../app/api/teste/solicitacao-voz/processar/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/vendas-voice/data.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/voice-command.js', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /if \(selection && previousDraft\)/);
  assert.match(route, /const selections = mergeSelection/);
  assert.match(route, /buildVoiceResponse\(\{[^}]*selections/s);
  assert.match(resolver, /candidates\.some\(\(candidate\) => candidate\.id === selectedId\)/);
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
  const [voiceModule, styles] = await Promise.all([
    readFile(new URL('../../app/avantavendas/sistema/voice-command.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8'),
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
  assert.match(styles, /\.mobile-voice-command-body \{[^}]*align-content: center;[^}]*justify-items: center;/);
  assert.match(voiceModule, /@container \(max-height:150px\)/);
  assert.match(voiceModule, /@container \(max-height:112px\)/);
  assert.match(voiceModule, /\.dock \.voice\{width:84px;height:84px\}/);
  assert.match(voiceModule, /@media\(max-width:520px\).*\.dock \.voice\{width:80px;height:80px\}/);
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
    readFile(new URL('../../app/api/teste/solicitacao-voz/executar/route.ts', import.meta.url), 'utf8'),
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
  const source = await readFile(new URL('../../app/api/teste/solicitacao-voz/transcrever/route.ts', import.meta.url), 'utf8');
  assert.match(source, /OPENAI_VOICE_TRANSCRIPTION_MODEL \|\| 'gpt-transcribe'/);
  assert.match(source, /OPENAI_VOICE_TRANSCRIPTION_CONTEXT/);
  assert.match(source, /keywords\[\]/);
  assert.match(source, /audioSeconds/);
  assert.doesNotMatch(source, /vendas_mobile_produtos/);
});
