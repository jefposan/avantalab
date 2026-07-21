import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.avantalab.app',
  appName: 'AvantaLab',
  webDir: 'public',

  server: {
    url: 'https://app.avantalab.com.br',
    cleartext: false,
  },

  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
    },
  },
};

export default config;