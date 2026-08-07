import type { ProfileRole } from './types';

export type ProjectPermission =
  | 'project.read'
  | 'project.create'
  | 'project.update'
  | 'project.archive'
  | 'project.restore'
  | 'project.delete'
  | 'project.members.manage'
  | 'node.create'
  | 'node.update'
  | 'node.delete';

const permissions: Record<ProfileRole, ReadonlySet<ProjectPermission>> = {
  gestor_master: new Set([
    'project.read', 'project.create', 'project.update', 'project.archive', 'project.restore',
    'project.delete', 'project.members.manage', 'node.create', 'node.update', 'node.delete',
  ]),
  administrador: new Set([
    'project.read', 'project.create', 'project.update', 'project.archive', 'project.restore',
    'project.delete', 'project.members.manage', 'node.create', 'node.update', 'node.delete',
  ]),
  operador_completo: new Set([
    'project.read', 'project.create', 'project.update', 'project.archive', 'project.restore',
    'project.delete', 'project.members.manage', 'node.create', 'node.update', 'node.delete',
  ]),
  operador_simples: new Set(['project.read']),
};

export function can(role: ProfileRole, permission: ProjectPermission) {
  return permissions[role].has(permission);
}

export function assertCompanyScope(resourceCompanyId: string, activeCompanyId: string) {
  if (!activeCompanyId || resourceCompanyId !== activeCompanyId) {
    throw new Error('Este projeto não pertence à empresa selecionada.');
  }
}
