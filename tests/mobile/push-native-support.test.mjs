import assert from 'node:assert/strict';
import test from 'node:test';
import { pushNativoDisponivel } from '../../app/mobile/push-native-support.ts';

test('Android antigo sem verificador não toca na ponte nativa insegura', async () => {
  let chamadas = 0;
  assert.equal(await pushNativoDisponivel('android', false, async () => { chamadas++; throw new Error('não deve executar'); }), false);
  assert.equal(chamadas, 0);
});

test('Android sem Firebase ou com erro de verificação não autoriza registro', async () => {
  assert.equal(await pushNativoDisponivel('android', true, async () => ({ ready: false })), false);
  assert.equal(await pushNativoDisponivel('android', true, async () => { throw new Error('ponte indisponível'); }), false);
});

test('Android só autoriza notificações com confirmação positiva do pacote', async () => {
  assert.equal(await pushNativoDisponivel('android', true, async () => ({ ready: true })), true);
});

test('iPhone conserva APNs sem depender de Firebase ou do plugin Android', async () => {
  let chamadas = 0;
  assert.equal(await pushNativoDisponivel('ios', false, async () => { chamadas++; throw new Error('somente Android'); }), true);
  assert.equal(chamadas, 0);
});
