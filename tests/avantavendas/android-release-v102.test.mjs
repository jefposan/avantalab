import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const config = readFileSync(resolve(raiz, 'capacitor.config.ts'), 'utf8');
const packageJson = readFileSync(resolve(raiz, 'package.json'), 'utf8');
const gradle = readFileSync(resolve(raiz, 'android/app/build.gradle'), 'utf8');
const pluginsGradle = readFileSync(resolve(raiz, 'android/app/capacitor.build.gradle'), 'utf8');
const bridge = readFileSync(resolve(raiz, 'app/avantavendas/NativePushNotificationsBridge.tsx'), 'utf8');

test('pacote Android de avaliação abre o AvantaVendas e possui uma nova versão', () => {
  assert.match(config, /AVANTA_CAPACITOR_TARGET === 'vendas'/);
  assert.match(config, /appName: pacoteAvantaVendas \? 'AvantaVendas' : 'AvantaLab'/);
  assert.match(config, /\? 'https:\/\/vendas\.avantalab\.com\.br'/);
  assert.match(packageJson, /"android:sync:vendas": "AVANTA_CAPACITOR_TARGET=vendas npx cap sync android"/);
  assert.match(gradle, /versionCode 3/);
  assert.match(gradle, /versionName "1\.0\.2"/);
});

test('build Android não embute FCM sem configuração Firebase e a ponte trata sua ausência', () => {
  assert.match(config, /android: pacoteAvantaVendas \? \{[\s\S]*includePlugins:/);
  assert.doesNotMatch(config, /includePlugins:[\s\S]*@capacitor\/push-notifications/);
  assert.doesNotMatch(pluginsGradle, /capacitor-push-notifications/);
  assert.match(bridge, /Capacitor\.isPluginAvailable\('PushNotifications'\)/);
});
