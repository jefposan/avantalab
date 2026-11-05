import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createLotPanelSession, LotPanelTimeoutError } from '../../app/marketplaces/price-lot-panel-session.ts';

test('fechar interrompe imediatamente consultas que ignoram AbortSignal e descarta resposta tardia', async () => {
  const session = createLotPanelSession();
  let resolve, signal;
  const waiting = session.run(current => { signal = current; return new Promise(done => { resolve = done; }); });
  await Promise.resolve();
  session.close();
  await assert.rejects(waiting, { name: 'AbortError' });
  assert.equal(signal.aborted, true);
  resolve('resposta antiga');
  assert.equal(session.isOpen(), false);
  let invoked = false;
  await assert.rejects(session.run(async () => { invoked = true; }), { name: 'AbortError' });
  assert.equal(invoked, false);
  session.close();
});

test('tempo limite libera a espera, não repete gravação e permite nova consulta explícita', async () => {
  const session = createLotPanelSession();
  let calls = 0;
  await assert.rejects(session.run(() => { calls++; return new Promise(() => {}); }, 10), LotPanelTimeoutError);
  assert.equal(calls, 1);
  assert.equal(await session.run(async () => 'salvo no servidor'), 'salvo no servidor');
  session.close();
});

test('sessões independentes não deixam operação antiga afetar painel reaberto; tarefas finalizadas são limpas', async () => {
  const old = createLotPanelSession(), fresh = createLotPanelSession();
  let signal;
  assert.equal(await old.run(async value => { signal = value; return 7; }), 7);
  old.close();
  assert.equal(signal.aborted, false, 'operação finalizada não fica registrada');
  assert.equal(await fresh.run(async () => 8), 8);
  fresh.close();
});

test('X, fundo e Escape usam o mesmo fechamento, sem depender de busy nem voltar só da escolha de PDF', () => {
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  assert.match(panel, /onFechar=\{dismiss\}/);
  assert.match(panel, /onClick=\{dismiss\} aria-label="Fechar lotes recebidos"/);
  assert.match(panel, /function dismiss\(\) \{[\s\S]*?live.current = false;[\s\S]*?session.current\?\.close\(\);[\s\S]*?setDismissed\(true\);[\s\S]*?onClose\(\);/);
  assert.match(panel, /if \(dismissed\) return null/);
  assert.match(panel, /session.current!\.run\(signal => request\(path, \{ \.\.\.options, signal \}\)\)/);
  assert.match(panel, /if \(!live.current\) return;\s*const url = URL.createObjectURL/);
  assert.ok(!panel.includes('await request('), 'todas as chamadas do painel têm cancelamento e tempo limite');
});

test('confirmação de remoção permite sair durante espera sem habilitar confirmação duplicada nem alterar outros consumidores', () => {
  const modal = readFileSync('app/components/ModalConfirmacao.tsx', 'utf8');
  const panel = readFileSync('app/marketplaces/PriceLotsPanel.tsx', 'utf8');
  assert.match(modal, /cancelarDuranteCarregamento = false/);
  assert.match(modal, /disabled=\{carregando && !cancelarDuranteCarregamento\}/);
  assert.match(modal, /onClick=\{aoConfirmar\}\s*disabled=\{carregando\}/);
  assert.match(panel, /cancelarDuranteCarregamento textoCancelar=\{busy \? 'Fechar painel' : 'Cancelar'\}/);
});
