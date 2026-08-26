import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const ler = (caminho) => readFileSync(resolve(raiz, caminho), 'utf8');
const exigir = (condicao, mensagem) => {
  if (!condicao) throw new Error(`Android Gestão: ${mensagem}`);
};

const versao = ler('app/lib/version.ts').match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1] || '';
const capacitor = ler('capacitor.config.ts');
const gradle = ler('android/app/build.gradle');
const manifesto = ler('android/app/src/main/AndroidManifest.xml');
const configGerada = ler('android/app/src/main/assets/capacitor.config.json');
const pluginsGerados = ler('android/capacitor.settings.gradle');
const mobile = ler('public/mobile-app.js');

exigir(Boolean(versao), 'não foi possível identificar APP_VERSION.');
exigir(capacitor.includes("url: 'https://app.avantalab.com.br/mobile'"), 'capacitor.config.ts precisa abrir diretamente /mobile.');
exigir(configGerada.includes('"url": "https://app.avantalab.com.br/mobile"'), 'arquivos Android estão desatualizados; execute npm run android:sincronizar.');
exigir(gradle.includes(`versionName "${versao}"`), `versionName deve acompanhar a versão do sistema (${versao}).`);
exigir(/versionCode\s+[1-9]\d*/.test(gradle), 'versionCode precisa ser positivo e monotônico a cada envio ao Play Console.');
exigir(manifesto.includes('android.permission.POST_NOTIFICATIONS'), 'permissão de notificações Android ausente.');
exigir(manifesto.includes('android.permission.RECORD_AUDIO'), 'permissão de microfone ausente.');
exigir(manifesto.includes('android.permission.MODIFY_AUDIO_SETTINGS'), 'permissão de áudio complementar ausente.');
exigir(pluginsGerados.includes('@capacitor/push-notifications'), 'plugin de Push Notifications não foi sincronizado.');
exigir(pluginsGerados.includes('@revenuecat/purchases-capacitor'), 'plugin de compras Google Play não foi sincronizado.');
exigir(mobile.includes('__avantalabBillingNativoMobile'), 'ponte de cobrança nativa ausente na Gestão Mobile.');
exigir(mobile.includes('fcm_token'), 'persistência de token FCM ausente na Gestão Mobile.');

console.log(`Android Gestão verificado: versão ${versao}, rota /mobile e plugins nativos sincronizados.`);
