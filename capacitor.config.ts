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
    // Faz o WKWebView respeitar a área segura do iPhone (Dynamic Island/notch).
    contentInset: 'always',
  },

  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
    },
  },
};

export default config;
