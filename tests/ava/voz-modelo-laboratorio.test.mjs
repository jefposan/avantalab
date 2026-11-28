import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
test('AvantaVendas e laboratório selecionam Luna no servidor; o corpo e os demais módulos não escolhem esse modelo', () => {
  assert.match(read('app/api/teste/solicitacao-voz/processar/route.ts'), /processarVozNoLaboratorio as POST/);
  assert.match(read('app/api/vendas/solicitacao-voz/processar/route.ts'), /export \{ POST \}/);
  const handler = read('app/api/vendas/solicitacao-voz/_handlers/processar.ts');
  assert.match(handler, /function POST\(request: Request\) \{\s+return processarSolicitacaoVoz\(request, 'gpt-6-luna'\);/);
  assert.match(handler, /function processarVozNoLaboratorio\(request: Request\) \{\s+return processarSolicitacaoVoz\(request, 'gpt-6-luna'\);/);
  assert.doesNotMatch(handler, /body\??\.(?:model|modelOverride)\b/);
  assert.doesNotMatch(read('app/recebimentos/voice/interpreter.ts'), /gpt-6-luna/);
});

test('Luna usa o formato avaliado sem mudar parâmetros do interpretador padrão', () => {
  const source = read('app/lib/vendas-voice/interpreter.ts');
  assert.match(source, /modelOverride \|\| process\.env\.OPENAI_VOICE_COMMAND_MODEL \|\| 'gpt-4o-mini'/);
  assert.match(source, /model === 'gpt-6-luna'\s+\? \{ reasoning_effort: 'none', max_completion_tokens: 500, store: false \}\s+: \{ temperature: 0, max_tokens: 500 \}/);
  assert.match(source, /validateVoiceIntentPayload\(parsed\)/);
});
