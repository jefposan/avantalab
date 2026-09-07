import { normalizeAccessBoundary, SALES_MODULE_ID } from '../access-control.mjs';
import { COMMERCIAL_PERMISSION_DEFAULTS } from '../commercial-permissions.mjs';

export const AVANTALAB_MODULE_ACCESS_REFERENCE = '2026-09-03';

export const COMMERCIAL_PERMISSION_DEFAULTS_BY_PROFILE = COMMERCIAL_PERMISSION_DEFAULTS;
export const FISCAL_DOWNLOAD_PERMISSION_DEFAULTS = COMMERCIAL_PERMISSION_DEFAULTS_BY_PROFILE;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODULE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;
const PERMISSION_PATTERN = /^[a-z][a-z0-9_.]{2,99}$/;
const PROFILES = new Set(Object.keys(FISCAL_DOWNLOAD_PERMISSION_DEFAULTS));

function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }

function assertPool(pool) {
  if (!pool || (typeof pool.query !== 'function' && typeof pool.connect !== 'function')) throw new TypeError('Informe um pool PostgreSQL server-side para validar o acesso.');
}

async function withClient(pool, work) {
  const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
  try { return await work(client); } finally { if (client !== pool && typeof client.release === 'function') client.release(); }
}

function bearerToken(request) {
  const authorization = text(request?.headers?.get?.('authorization'));
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authorization);
  return match && match[1].length <= 8192 ? match[1] : '';
}

function decisions(rows) {
  return Object.fromEntries((rows || []).filter((row) => PERMISSION_PATTERN.test(text(row.permission_code))).map((row) => [text(row.permission_code), text(row.decision)]));
}

export function resolveModuleEffectivePermissions({ profile, roleOverrides = {}, userOverrides = {}, defaults = COMMERCIAL_PERMISSION_DEFAULTS_BY_PROFILE } = {}) {
  const baseline = defaults[profile] || {};
  const permissionIds = new Set([...Object.keys(baseline), ...Object.keys(roleOverrides), ...Object.keys(userOverrides)]);
  return Object.fromEntries([...permissionIds].filter((permission) => PERMISSION_PATTERN.test(permission)).map((permission) => {
    const roleDecision = roleOverrides[permission];
    const userDecision = userOverrides[permission];
    const inherited = roleDecision === 'allow' ? true : roleDecision === 'deny' ? false : baseline[permission] === true;
    return [permission, userDecision === 'allow' ? true : userDecision === 'deny' ? false : inherited];
  }));
}

export function createPostgresAvantaLabModuleAccessRepository({ pool, moduleId = SALES_MODULE_ID } = {}) {
  assertPool(pool);
  const normalizedModuleId = text(moduleId);
  if (!MODULE_PATTERN.test(normalizedModuleId)) throw new TypeError('O identificador do módulo é inválido.');
  return Object.freeze({
    id: 'avantalab-postgres-module-access-v1',
    configured: true,
    moduleId: normalizedModuleId,
    async findAccess({ companyId, userId, now = new Date().toISOString() } = {}) {
      if (!UUID_PATTERN.test(text(companyId)) || !UUID_PATTERN.test(text(userId))) return null;
      return withClient(pool, async (client) => {
        const base = await client.query(`select e.id as company_id,membership.perfil,membership.status as membership_status,installation.ativo as module_enabled,installation.expira_em from public.empresas e left join public.usuarios_empresa membership on membership.empresa_id=e.id and membership.user_id=$2 left join public.empresa_modulos installation on installation.empresa_id=e.id and installation.modulo_id=$3 where e.id=$1 limit 1`, [companyId, userId, normalizedModuleId]);
        const row = base.rows?.[0];
        if (!row) return null;
        const profile = text(row.perfil);
        const [roleResult, userResult] = await Promise.all([
          client.query(`select permission_code,decision from public.module_role_permission_overrides where company_id=$1 and module_id=$2 and profile=$3 and decision<>'inherit'`, [companyId, normalizedModuleId, profile]),
          client.query(`select permission_code,decision from public.module_user_permission_overrides where company_id=$1 and module_id=$2 and user_id=$3 and decision<>'inherit'`, [companyId, normalizedModuleId, userId]),
        ]);
        const expiresAt = row.expira_em ? new Date(row.expira_em) : null;
        const nowDate = new Date(now);
        return {
          companyId: text(row.company_id),
          userId: text(userId),
          profile,
          companyActive: true,
          membershipActive: row.membership_status === 'ativo' && PROFILES.has(profile),
          moduleActive: row.module_enabled === true && (!expiresAt || (Number.isFinite(nowDate.getTime()) && expiresAt > nowDate)),
          roleOverrides: decisions(roleResult.rows),
          userOverrides: decisions(userResult.rows),
        };
      });
    },
  });
}

export function createAvantaLabAccessResolver({ authClient, accessRepository, moduleId = SALES_MODULE_ID, defaults = COMMERCIAL_PERMISSION_DEFAULTS_BY_PROFILE, clock = () => new Date().toISOString() } = {}) {
  if (!authClient?.auth || typeof authClient.auth.getUser !== 'function') throw new TypeError('Informe o cliente oficial de autenticação do AvantaLab.');
  if (accessRepository?.configured !== true || typeof accessRepository.findAccess !== 'function') throw new TypeError('Informe o repositório server-side de acesso do módulo.');
  return Object.freeze({
    id: 'avantalab-module-access-resolver-v1',
    async resolve(request, { companyId } = {}) {
      const normalizedCompanyId = text(companyId);
      const emptyBoundary = normalizeAccessBoundary({ source: 'authenticated', companyId: normalizedCompanyId, moduleId });
      const token = bearerToken(request);
      if (!token || !UUID_PATTERN.test(normalizedCompanyId)) return { authenticated: false, reason: 'session_required', boundary: emptyBoundary, effectivePermissions: {}, profile: '' };
      const authentication = await authClient.auth.getUser(token);
      const userId = text(authentication?.data?.user?.id);
      if (authentication?.error || !UUID_PATTERN.test(userId)) return { authenticated: false, reason: 'session_required', boundary: emptyBoundary, effectivePermissions: {}, profile: '' };
      const access = await accessRepository.findAccess({ companyId: normalizedCompanyId, userId, now: clock() });
      const boundary = normalizeAccessBoundary({ source: 'authenticated', authenticated: true, userId, companyId: normalizedCompanyId, moduleId, userActive: access?.membershipActive === true, membershipActive: access?.membershipActive === true, companyActive: access?.companyActive === true, moduleActive: access?.moduleActive === true });
      const effectivePermissions = access ? resolveModuleEffectivePermissions({ profile: access.profile, roleOverrides: access.roleOverrides, userOverrides: access.userOverrides, defaults }) : {};
      return { authenticated: true, reason: access ? 'resolved' : 'company_missing', boundary, effectivePermissions, profile: access?.profile || '' };
    },
  });
}
