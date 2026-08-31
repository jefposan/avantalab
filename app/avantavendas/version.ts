import { APP_VERSION } from '../lib/version';

// Revisão própria dos recursos do AvantaVendas. Ela muda a URL dos arquivos
// estáticos e o cache do service worker mesmo quando a versão global ainda não
// foi incrementada, evitando que o PWA reutilize JavaScript antigo imutável.
const AVANTAVENDAS_ASSET_REVISION = '105';

export const AVANTAVENDAS_VERSION = `${APP_VERSION}-av${AVANTAVENDAS_ASSET_REVISION}`;
