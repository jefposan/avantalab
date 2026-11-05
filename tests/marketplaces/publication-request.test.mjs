import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationRequest } from '../../app/marketplaces/publication-request.ts';

for (const kind of ['prepare', 'publish']) test(`${kind}: limite libera espera mesmo se sessão/fetch não resolver, sem nova tentativa automática`, async () => {
  let calls = 0, signal;
  await assert.rejects(publicationRequest(s => { calls++; signal = s; return new Promise(() => {}); }, kind, 10), error => {
    assert.equal(error.code, kind === 'publish' ? 'publication_uncertain' : 'preparation_timeout');
    assert.match(error.message, /dados foram mantidos/); return true;
  });
  assert.equal(signal.aborted, true); assert.equal(calls, 1);
});

test('sucesso e recusa propagam o resultado original e removem o temporizador', async () => {
  let signal;
  assert.equal(await publicationRequest(s => { signal = s; return Promise.resolve('ok'); }, 'publish', 10), 'ok');
  await new Promise(resolve => setTimeout(resolve, 15)); assert.equal(signal.aborted, false);
  const refused = Object.assign(new Error('Ajuste o preço'), { code: 'invalid_fields', fields: { price: 'Preço inválido' } });
  await assert.rejects(publicationRequest(() => Promise.reject(refused), 'publish', 10), error => error === refused);
});

test('abortar fetch no limite não mascara o aviso de publicação incerta com AbortError', async () => {
  await assert.rejects(publicationRequest(signal => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }), 'publish', 10), { code: 'publication_uncertain' });
});
