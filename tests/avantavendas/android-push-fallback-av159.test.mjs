import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const bridge = readFileSync(resolve(raiz, 'app/avantavendas/NativePushNotificationsBridge.tsx'), 'utf8');
const version = readFileSync(resolve(raiz, 'app/avantavendas/version.ts'), 'utf8');

test('ponte de notificações não inicia plugin nativo ausente no Android', () => {
  assert.match(bridge, /Capacitor\.isPluginAvailable\('PushNotifications'\)/);
  assert.match(bridge, /Capacitor\.isNativePlatform\(\) \|\| !Capacitor\.isPluginAvailable/);
});

test('revisão de recursos do AvantaVendas invalida o JavaScript corrigido', () => {
  assert.match(version, /AVANTAVENDAS_ASSET_REVISION = '159'/);
});
