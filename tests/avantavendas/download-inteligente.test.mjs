import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AVANTAVENDAS_APP_STORE_URL_PADRAO,
  AVANTAVENDAS_PLAY_STORE_URL_PADRAO,
  criarUrlEscolhaLojaAvantaVendas,
  executarRegistroDownloadSemBloquear,
  identificarDispositivoDownloadAvantaVendas,
  obterLinksDownloadAvantaVendas,
  planejarDownloadAvantaVendas,
} from '../../app/lib/avantavendas-download.ts';

const agentes = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1',
  ipadOsDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
  instagramIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 333.0.0.0.0',
  instagramAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 Instagram 333.0.0.0.0',
  facebookIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.0.0;]',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Mobile Safari/537.36 [FBAN/FB4A;FBAV/470.0.0.0.0;]',
};

test('identifica iPhone, iPad, iPadOS, Android, navegadores internos e desktop pelo User-Agent', () => {
  for (const nome of ['iphone', 'ipad', 'ipadOsDesktop', 'instagramIphone', 'facebookIphone']) {
    assert.equal(identificarDispositivoDownloadAvantaVendas(agentes[nome]), 'ios', nome);
  }
  for (const nome of ['android', 'instagramAndroid', 'facebookAndroid']) {
    assert.equal(identificarDispositivoDownloadAvantaVendas(agentes[nome]), 'android', nome);
  }
  assert.equal(identificarDispositivoDownloadAvantaVendas(agentes.desktop), 'outro');
  assert.equal(identificarDispositivoDownloadAvantaVendas(''), 'outro');
});

test('redireciona iOS e Android com UTMs preservadas e mantém desktop na página intermediária', () => {
  const parametros = new URLSearchParams('utm_source=instagram&utm_medium=paid_social&utm_campaign=avantavendas&utm_content=reels&utm_term=crm');
  const ios = planejarDownloadAvantaVendas({ userAgent: agentes.instagramIphone, parametros });
  const android = planejarDownloadAvantaVendas({ userAgent: agentes.instagramAndroid, parametros });
  const desktop = planejarDownloadAvantaVendas({ userAgent: agentes.desktop, parametros });

  assert.equal(ios.destino, 'app_store');
  assert.equal(new URL(ios.url).searchParams.get('utm_campaign'), 'avantavendas');
  assert.equal(android.destino, 'google_play');
  assert.equal(new URL(android.url).searchParams.get('utm_medium'), 'paid_social');
  assert.equal(new URL(android.url).searchParams.get('pcampaignid'), 'web_share');
  assert.equal(desktop.destino, 'pagina_intermediaria');
  assert.equal(desktop.url, null);
  assert.equal(planejarDownloadAvantaVendas({ userAgent: agentes.iphone, parametros: new URLSearchParams() }).destino, 'app_store');
  assert.match(criarUrlEscolhaLojaAvantaVendas('android', parametros), /utm_source=instagram/);
});

test('usa links oficiais seguros quando a configuração está ausente ou inválida', () => {
  assert.deepEqual(obterLinksDownloadAvantaVendas({}), {
    appStoreUrl: AVANTAVENDAS_APP_STORE_URL_PADRAO,
    playStoreUrl: AVANTAVENDAS_PLAY_STORE_URL_PADRAO,
  });
  assert.deepEqual(obterLinksDownloadAvantaVendas({
    AVANTAVENDAS_APP_STORE_URL: 'javascript:alert(1)',
    AVANTAVENDAS_PLAY_STORE_URL: 'https://example.com/app',
  }), {
    appStoreUrl: AVANTAVENDAS_APP_STORE_URL_PADRAO,
    playStoreUrl: AVANTAVENDAS_PLAY_STORE_URL_PADRAO,
  });
});

test('a falha de analytics é absorvida sem impedir o fluxo de download', async () => {
  assert.equal(await executarRegistroDownloadSemBloquear(async () => { throw new Error('indisponível'); }), false);
  assert.equal(await executarRegistroDownloadSemBloquear(async () => undefined), true);
});
