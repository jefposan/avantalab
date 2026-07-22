import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.avantalab.app',
  appName: 'AvantaLab',
  webDir: 'public',

  server: {
    url: 'https://app.avantalab.com.br',
    cleartext: false,
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
