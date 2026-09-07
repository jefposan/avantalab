import { COMMERCIAL_PERMISSION_CODES, COMMERCIAL_PROFILE_PERMISSIONS } from './commercial-permissions.mjs';

const READY_TYPE = 'AVANTALAB_VENDAS_ACCESS_READY_V1';
const SNAPSHOT_TYPE = 'AVANTALAB_VENDAS_ACCESS_SNAPSHOT_V1';
const SAVE_REQUEST_TYPE = 'AVANTALAB_VENDAS_ACCESS_SAVE_REQUEST_V1';
const SAVE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_ACCESS_SAVE_RESPONSE_V1';
const REQUEST_ID = /^[A-Za-z0-9:_-]{8,120}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE_IDS = new Set(['gestor', 'administrador', 'operador_completo', 'operador_simples']);
const PERMISSIONS = new Set(COMMERCIAL_PERMISSION_CODES);

function text(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function role(value) {
  const id = text(value, 40);
  return ROLE_IDS.has(id) ? id : '';
}

function permissions(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, 100)).filter((item) => PERMISSIONS.has(item)))];
}

function overrides(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([permission, decision]) => {
    if (!PERMISSIONS.has(permission) || !['permitir', 'bloquear'].includes(decision)) return [];
    return [[permission, decision]];
  }));
}

export function parseAccessSnapshotMessage(data) {
  if (!data || data.type !== SNAPSHOT_TYPE || typeof data.snapshot !== 'object' || data.snapshot === null) return null;
  const source = data.snapshot;
  const available = source.available === true;
  if (!available) return { available: false, writable: false, loading: false, message: text(source.message) || 'Permissões indisponíveis neste ambiente.', activeUserId: '', roles: [], users: [], audit: [] };
  const roles = Array.isArray(source.roles) ? source.roles.flatMap((item) => {
    const id = role(item?.id);
    return id ? [{ id, permissions: permissions(item.permissions) }] : [];
  }) : [];
  const users = Array.isArray(source.users) ? source.users.flatMap((item) => {
    const id = text(item?.id, 80);
    const roleId = role(item?.roleId);
    if (!UUID.test(id) || !roleId) return [];
    return [{
      id,
      name: text(item?.name, 100) || 'Usuário',
      email: text(item?.email, 160),
      roleId,
      sector: text(item?.sector, 60) || 'Geral',
      active: item?.active === true,
      overrides: overrides(item?.overrides),
    }];
  }) : [];
  const audit = Array.isArray(source.audit) ? source.audit.slice(0, 100).flatMap((item) => {
    const id = text(item?.id, 100);
    const at = text(item?.at, 40);
    const summary = text(item?.summary, 300);
    return id && at && summary ? [{ id, at, actor: text(item?.actor, 100) || 'Sistema', summary }] : [];
  }) : [];
  if (roles.length !== 4 || !users.length) return null;
  const requestedActiveUserId = text(source.activeUserId, 80);
  const activeUserId = UUID.test(requestedActiveUserId) && users.some((user) => user.id === requestedActiveUserId)
    ? requestedActiveUserId
    : '';
  return { available: true, writable: source.writable === true, loading: false, message: text(source.message), activeUserId, roles, users, audit };
}

export function createAccessSaveRequest({ requestId, currentAccess, nextAccess }) {
  if (!REQUEST_ID.test(String(requestId || ''))) return null;
  const changes = [];
  const currentRoles = new Map((currentAccess?.roles || []).map((item) => [item.id, new Set(item.permissions || [])]));
  for (const nextRole of nextAccess?.roles || []) {
    if (!ROLE_IDS.has(nextRole.id)) continue;
    const current = currentRoles.get(nextRole.id) || new Set();
    const desired = new Set(nextRole.permissions || []);
    const defaults = new Set(COMMERCIAL_PROFILE_PERMISSIONS[nextRole.id === 'gestor' ? 'gestor_master' : nextRole.id] || []);
    for (const permission of COMMERCIAL_PERMISSION_CODES) {
      if (current.has(permission) === desired.has(permission)) continue;
      changes.push({ targetType: 'role', targetId: nextRole.id, permission, decision: desired.has(permission) === defaults.has(permission) ? 'inherit' : desired.has(permission) ? 'allow' : 'deny' });
    }
  }
  const currentUsers = new Map((currentAccess?.users || []).map((item) => [item.id, item]));
  for (const nextUser of nextAccess?.users || []) {
    if (!UUID.test(String(nextUser.id || ''))) continue;
    const current = currentUsers.get(nextUser.id);
    if (!current) continue;
    for (const permission of COMMERCIAL_PERMISSION_CODES) {
      const before = current.overrides?.[permission] || '';
      const after = nextUser.overrides?.[permission] || '';
      if (before === after) continue;
      changes.push({ targetType: 'user', targetId: nextUser.id, permission, decision: after === 'permitir' ? 'allow' : after === 'bloquear' ? 'deny' : 'inherit' });
    }
  }
  if (changes.length > 400) return null;
  return { type: SAVE_REQUEST_TYPE, requestId, changes };
}

export function parseAccessSaveResponse(data) {
  if (!data || data.type !== SAVE_RESPONSE_TYPE || !REQUEST_ID.test(String(data.requestId || '')) || typeof data.ok !== 'boolean') return null;
  return { requestId: data.requestId, ok: data.ok, message: text(data.message) || (data.ok ? 'Permissões salvas.' : 'Não foi possível salvar as permissões.') };
}

export const ACCESS_READY_MESSAGE_TYPE = READY_TYPE;
export const ACCESS_SNAPSHOT_MESSAGE_TYPE = SNAPSHOT_TYPE;
export const ACCESS_SAVE_REQUEST_MESSAGE_TYPE = SAVE_REQUEST_TYPE;
export const ACCESS_SAVE_RESPONSE_MESSAGE_TYPE = SAVE_RESPONSE_TYPE;
