import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { normalizeVoiceSearch, validateVoiceIntent } from '../../app/lib/vendas-voice/validation.mjs';

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
  assert.match(officialApp, /state\.solicitacaoVozAtiva \? `<div class="mobile-voice-command-slot"/);
  assert.match(officialApp, /carregarModuloSolicitacaoVozVendas/);
  assert.match(officialApp, /\/api\/vendas\/solicitacao-voz\//);
  assert.match(voiceModule, /attachShadow/);
  assert.match(voiceModule, /options\.mount\.append\(host\)/);
  assert.match(voiceModule, /options\.autoStart && state\.phase === 'idle'/);
  assert.match(voiceModule, /const dock = el\('section', 'dock'\)/);
  assert.doesNotMatch(voiceModule, /lastTranscription[^\n]*textContent|transcription[^\n]*append/i);
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
  assert.match(resolver, /Cartão de crédito/);
  assert.match(resolver, /paymentMethod: draft\.paymentMethod/);
});

test('clique de desambiguação usa candidato validado sem reinterpretar pela IA', async () => {
  const [route, resolver] = await Promise.all([
    readFile(new URL('../../app/api/teste/solicitacao-voz/processar/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/vendas-voice/data.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /if \(selection && previousDraft\)/);
  assert.match(route, /buildVoiceResponse\(\{[^}]*selection/s);
  assert.match(resolver, /candidates\.some\(\(candidate\) => candidate\.id === selectedId\)/);
});
