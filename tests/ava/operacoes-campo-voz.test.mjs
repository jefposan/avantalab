import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { resolverClienteVozCampo } from '../../app/recebimentos/voice/customer-resolution.ts';
import { resolverServicoRegistroVoz } from '../../app/recebimentos/voice/service-resolution.ts';

const clientes = [
  {
    id: 'damilles',
    companyId: 'empresa-damilles',
    subcompanyId: null,
    label: 'Damilles Centro',
    detail: 'Centro · São Paulo',
    searchable: 'Damilles Centro Paula São Paulo',
  },
  {
    id: 'daniela',
    companyId: 'empresa-daniela',
    subcompanyId: null,
    label: 'Daniela Sul',
    detail: 'Santo Amaro · São Paulo',
    searchable: 'Daniela Sul Santo Amaro São Paulo',
  },
  {
    id: 'tridium',
    companyId: 'empresa-tridium',
    subcompanyId: null,
    label: 'Tridium',
    detail: 'Moema · São Paulo',
    searchable: 'Tridium Moema São Paulo',
  },
  {
    id: 'loja-morumbi',
    companyId: 'rede-lojas',
    subcompanyId: 'loja-morumbi',
    label: 'Loja Vinte e Três',
    detail: 'Rede de Lojas · Shopping Morumbi · Sala 23',
    searchable: 'Loja Vinte e Três Rede de Lojas Shopping Morumbi Sala 23',
  },
];

test('resolvedor reconhece nomes comerciais próximos sem confundir outro cadastro', () => {
  assert.equal(resolverClienteVozCampo('Damiles', clientes).selected?.id, 'damilles');
  assert.equal(resolverClienteVozCampo('Damillis', clientes).selected?.id, 'damilles');
  assert.equal(resolverClienteVozCampo('Tridion', clientes).selected?.id, 'tridium');
  assert.notEqual(resolverClienteVozCampo('Damiles', clientes).selected?.id, 'daniela');
});

test('resolvedor usa local e contexto do cadastro sem exigir alias manual', () => {
  assert.equal(resolverClienteVozCampo('Shopping Morumbi', clientes).selected?.id, 'loja-morumbi');
  assert.equal(resolverClienteVozCampo('Loja 23 Morumbi', clientes).selected?.id, 'loja-morumbi');
});

test('nomes realmente ambíguos continuam exigindo escolha explícita', () => {
  const homonimos = [
    { ...clientes[0], id: 'maria-norte', label: 'Maria Norte', searchable: 'Maria Norte Santana' },
    { ...clientes[1], id: 'maria-sul', label: 'Maria Sul', searchable: 'Maria Sul Moema' },
  ];
  const resultado = resolverClienteVozCampo('Maria', homonimos);
  assert.equal(resultado.selected, null);
  assert.deepEqual(resultado.candidates.map((item) => item.id).sort(), ['maria-norte', 'maria-sul']);
});

test('escolha humana validada prevalece e encerra a desambiguação', () => {
  assert.equal(resolverClienteVozCampo('Maria', clientes, 'tridium').selected?.id, 'tridium');
});

test('interpretação declara funções fixas e distingue complemento de nova solicitação', async () => {
  const [interpreter, schema, controller] = await Promise.all([
    readFile(new URL('../../app/recebimentos/voice/interpreter.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/recebimentos/voice/schema.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js', import.meta.url), 'utf8'),
  ]);
  assert.match(interpreter, /CATÁLOGO FIXO DE FUNÇÕES/);
  assert.match(interpreter, /register_receipt/);
  assert.match(interpreter, /schedule_service/);
  assert.match(interpreter, /resposta curta[\s\S]*replace_previous false/);
  assert.match(interpreter, /nova solicitação completa[\s\S]*replace_previous true/);
  assert.match(interpreter, /Boolean\(input\.previousDraft && draft\.replacePrevious\)/);
  assert.match(schema, /replace_previous: \{ type: 'boolean' \}/);
  assert.match(schema, /required: \[[^\]]*'replace_previous'/);
  assert.match(controller, /if \(result\?\.replacesPrevious\) discardCurrentPending\(\)/);
});

test('cadastros novos atualizam o resolvedor e ajudam a próxima transcrição', async () => {
  const [repo, transcriber] = await Promise.all([
    readFile(new URL('../../app/recebimentos/data/repo.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/recebimentos/solicitacao-voz/transcrever/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(repo, /table: 'recebimentos_empresas'/);
  assert.match(repo, /table: 'recebimentos_subempresas'/);
  assert.match(transcriber, /order\('atualizado_em', \{ ascending: false \}\)\.limit\(36\)/);
  assert.match(transcriber, /nomesUnicos\.values\(\)\]\.slice\(0, 48\)/);
  assert.match(transcriber, /Nomes comerciais cadastrados recentemente/);
  assert.doesNotMatch(transcriber, /select\('\*'\)/);
});

test('listas curtas usam o card sem scroll e sem salvar pendências', async () => {
  const [controller, dock] = await Promise.all([
    readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/recebimentos/components/OperacoesCampoVoiceDock.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(controller, /state\.current\.entity\?\.type === 'choice'/);
  assert.match(controller, /candidates\.length <= 5/);
  assert.match(controller, /state\.options\?\.compactShortLists === true/);
  assert.match(controller, /compactChoices \? 'candidates compact' : 'candidates'/);
  assert.match(controller, /\.candidates\.compact\{[^}]*max-height:none;[^}]*overflow:visible/);
  assert.match(controller, /\.candidates\.compact \.candidate\{[^}]*min-height:44px/);
  assert.match(controller, /state\.options\?\.allowSaveForLater === false/);
  assert.match(dock, /allowSaveForLater=\{false\}/);
  assert.match(dock, /compactShortLists/);
});

test('resposta por voz permanece ancorada dentro do card da pergunta', async () => {
  const controller = await readFile(
    new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js', import.meta.url),
    'utf8',
  );
  assert.match(controller, /inlineClarification: false/);
  assert.match(controller, /state\.inlineClarification = state\.phase === 'clarification' && state\.current\?\.kind === 'clarification'/);
  assert.match(controller, /\['recording', 'transcribing', 'processing'\]\.includes\(state\.phase\)/);
  assert.match(controller, /\(state\.phase === 'clarification' \|\| inlineClarification\)/);
  assert.match(controller, /card\.append\(voiceControl\(true\)\)/);
  assert.match(controller, /\.helper\{min-height:2\.7em/);
  assert.match(controller, /setPhase\(returnToClarification \? 'clarification' : 'idle'\)/);
});

test('registro por voz escolhe somente execução pendente e já disponível', () => {
  const services = [
    { id: 'rotina', companyId: 'empresa', subcompanyId: null, scheduledDate: '2026-09-11', status: 'pendente', serviceType: 'rotina' },
    { id: 'revisao', companyId: 'empresa', subcompanyId: null, scheduledDate: '2026-09-11', status: 'pendente', serviceType: 'revisao' },
    { id: 'futuro', companyId: 'empresa', subcompanyId: null, scheduledDate: '2026-09-12', status: 'pendente', serviceType: 'extra' },
    { id: 'realizado', companyId: 'empresa', subcompanyId: null, scheduledDate: '2026-09-11', status: 'realizado', serviceType: 'interna' },
  ];
  const ambiguous = resolverServicoRegistroVoz({ services, companyId: 'empresa', subcompanyId: null, today: '2026-09-11' });
  assert.equal(ambiguous.selected, null);
  assert.deepEqual(ambiguous.candidates.map((item) => item.id), ['rotina', 'revisao']);
  assert.equal(resolverServicoRegistroVoz({ services, companyId: 'empresa', subcompanyId: null, today: '2026-09-11', transcription: 'o serviço padrão' }).selected?.id, 'rotina');
  assert.equal(resolverServicoRegistroVoz({ services, companyId: 'empresa', subcompanyId: null, today: '2026-09-11', serviceType: 'revisao' }).selected?.id, 'revisao');
});

test('registro por voz entrega a seleção ao formulário oficial sem gravar o serviço', async () => {
  const [dock, controller, form, panel] = await Promise.all([
    readFile(new URL('../../app/recebimentos/components/OperacoesCampoVoiceDock.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/recebimentos/components/FormularioServico.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/recebimentos/components/PainelServicosColaborador.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(dock, /intent: 'prepare_service_registration'/);
  assert.match(dock, /kind: 'handoff'/);
  assert.match(dock, /onPrepararRegistroServico\(response\.action\.companyId/);
  assert.doesNotMatch(dock, /onRegistrarServico/);
  assert.match(controller, /result\?\.kind === 'handoff'/);
  assert.match(controller, /close\(\{ persist: false \}\)/);
  assert.match(form, /selecaoInicial\?\.companyId/);
  assert.match(form, /setProximoCampoEmDestaque\('assinador'\)/);
  assert.match(form, /querySelector<HTMLInputElement>\('input'\)\?\.focus/);
  assert.match(panel, /selecaoInicial=\{registroPreparado\}/);
});

test('ajuda de Serviços explica registro e agendamento de forma curta', async () => {
  const dock = await readFile(new URL('../../app/recebimentos/components/OperacoesCampoVoiceDock.tsx', import.meta.url), 'utf8');
  assert.match(dock, /Para registrar, diga “registrar serviço” e o cliente; depois, informe o nome e colete a assinatura\./);
  assert.match(dock, /Para agendar, diga “agendar” com cliente, data e tipo\./);
});
