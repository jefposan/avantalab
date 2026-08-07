import type { ProfileRole } from './types';

export const projetosManifest = {
  id: 'projetos',
  technicalName: 'projetos',
  commercialName: 'AvantaProjetos',
  featureName: 'Mapa de Projetos',
  version: '1.0.0',
  experimental: false,
  audience: ['assinantes-avantalab', 'equipes-empresariais'],
  route: '/projetos',
  menuEntries: [{ label: 'Projetos', route: '/projetos', navigationMode: 'full-page' }],
  cards: [],
  supportedSurfaces: ['web'],
  permissions: [
    'project.read',
    'project.create',
    'project.update',
    'project.archive',
    'project.delete',
    'project.members.manage',
    'node.create',
    'node.update',
    'node.delete',
  ],
  profiles: ['gestor_master', 'administrador', 'operador_completo', 'operador_simples'] satisfies ProfileRole[],
  preferences: { namespace: 'avantalab:projetos:preferences', version: 1 },
  financeIntegration: {
    business: { mode: 'standalone', monthlyPrice: 14.9 },
    businessPro: { mode: 'included' },
    cancellation: 'end-of-paid-period',
  },
  ava: {
    enabled: true,
    scope: 'Orientações de instalação, acesso, permissões e uso geral; sem incluir dados privados dos projetos no contexto.',
  },
} as const;
