import type { PerfilModulo } from '@/app/lib/modulos-registro';

export const MARKETPLACE_PERMISSION_GROUPS = [
  {
    id: 'consulta',
    name: 'Consulta',
    permissions: [{ code: 'marketplaces.view', name: 'Visualizar conexões e anúncios' }],
  },
  {
    id: 'publicacao',
    name: 'Publicação',
    permissions: [
      { code: 'marketplaces.drafts.create', name: 'Preparar anúncio' },
      { code: 'marketplaces.publish', name: 'Publicar anúncio' },
    ],
  },
  {
    id: 'conexoes',
    name: 'Conexões',
    permissions: [
      { code: 'marketplaces.connections.manage', name: 'Conectar e desconectar contas' },
      { code: 'marketplaces.settings.manage', name: 'Gerenciar configurações do módulo' },
    ],
  },
] as const;

export const MARKETPLACE_PERMISSION_CODES = MARKETPLACE_PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.code),
);

const all = [...MARKETPLACE_PERMISSION_CODES];

export const MARKETPLACE_PERMISSIONS_BY_PROFILE: Readonly<Record<PerfilModulo, readonly string[]>> = {
  gestor_master: all,
  administrador: all,
  operador_completo: ['marketplaces.view', 'marketplaces.drafts.create', 'marketplaces.publish'],
  operador_simples: ['marketplaces.view'],
};

export function marketplacePermissionIsKnown(permission: string) {
  return MARKETPLACE_PERMISSION_CODES.some((knownPermission) => knownPermission === permission);
}
