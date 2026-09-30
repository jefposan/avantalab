import type { CapacitorConfig } from '@capacitor/cli';

// O repositório mantém a configuração padrão do AvantaLab para iOS e Gestão.
// A ficha Android do AvantaVendas é preparada explicitamente pelo comando
// android:sync:vendas, sem deixar a próxima sincronização do iOS apontar para
// outro produto.
const pacoteAvantaVendas = process.env.AVANTA_CAPACITOR_TARGET === 'vendas';

const config: CapacitorConfig = {
  appId: 'br.com.avantalab.app',
  appName: pacoteAvantaVendas ? 'AvantaVendas' : 'AvantaLab',
  webDir: 'public',

  server: {
    // O pacote do Vendas é escolhido explicitamente no build Android. A
    // configuração padrão preserva a abertura da Gestão Mobile no iOS.
    url: pacoteAvantaVendas
      ? 'https://vendas.avantalab.com.br'
      : 'https://app.avantalab.com.br/mobile',
    cleartext: false,
  },

  ios: {
    // O layout web já usa viewport-fit=cover e env(safe-area-inset-*).
    // Evita somar um segundo inset nativo ao mesmo conteúdo no WKWebView.
    contentInset: 'never',
  },

  android: pacoteAvantaVendas ? {
    // O Firebase ainda não está configurado para br.com.avantalab.app. Não
    // inclua o FCM até a credencial oficial existir: isso impede a inicialização
    // sem FirebaseApp que encerrou a versão recusada pelo Google Play.
    includePlugins: [
      '@capacitor/app',
      '@capacitor/browser',
      '@capacitor/status-bar',
      '@revenuecat/purchases-capacitor',
    ],
  } : undefined,

  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
    },
  },
};

export default config;
