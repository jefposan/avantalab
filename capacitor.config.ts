import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.avantalab.app',
  appName: 'AvantaLab',
  webDir: 'public',

  server: {
    url: 'https://avantalab.com.br',
    cleartext: false,
  },
};

export default config;