import type { PerfilModulo } from '@/app/lib/modulos-registro';
import { MARKETPLACE_PERMISSION_GROUPS, MARKETPLACE_PERMISSIONS_BY_PROFILE } from './permissions';

export const MARKETPLACES_MODULE_ID = 'marketplaces';

export const MARKETPLACES_MANIFEST = {
  id: MARKETPLACES_MODULE_ID,
  technicalName: 'marketplaces',
  commercialName: 'Anúncios em marketplaces',
  featureName: 'Conexões, publicação e consulta de preços',
  version: '0.3.0',
  audience: ['empresas-assinantes-avantalab'],
  route: '/marketplaces',
  navigationMode: 'full-page',
  supportedSurfaces: ['web', 'pwa'],
  dataScope: 'empresa',
  dataRetention: 'preserve-on-module-removal',
  pricing: { monthlyPrice: 14.9, business: 'standalone', businessPro: 'included', businessPremium: 'included' },
  permissions: {
    groups: MARKETPLACE_PERMISSION_GROUPS,
    defaults: MARKETPLACE_PERMISSIONS_BY_PROFILE satisfies Readonly<Record<PerfilModulo, readonly string[]>>,
  },
  integrations: {
    initialProvider: 'mercado_livre',
    credentials: 'oauth_only',
    publication: 'server_side_with_explicit_confirmation',
    priceConsultation: 'reuse_company_oauth_connection',
  },
  ava: {
    enabled: true,
    scope: 'Orientar conexão, validar dados faltantes e explicar o status de publicações.',
    restrictedData: ['tokens OAuth', 'segredos de aplicação', 'credenciais de marketplaces'],
  },
} as const;
