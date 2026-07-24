import type { CapacitorConfig } from '@capacitor/cli';

const usarServidorAndroidLocal = process.env.CAPACITOR_LOCAL === '1';

const config: CapacitorConfig = {
  appId: 'br.com.avantalab.app',
  appName: 'AvantaLab',
  webDir: 'public',

  server: {
    url: usarServidorAndroidLocal
      ? 'http://10.0.2.2:3000'
      : 'https://app.avantalab.com.br',
    cleartext: usarServidorAndroidLocal,
  },

  ios: {
    // O layout web já usa viewport-fit=cover e env(safe-area-inset-*).
    // Evita somar um segundo inset nativo ao mesmo conteúdo no WKWebView.
    contentInset: 'never',
  },

  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
    },
  },
};

export default config;
