export const COMMERCIAL_PERMISSION_CODES = Object.freeze([
  'dashboard.view',
  'sales.view', 'sales.create', 'sales.edit', 'sales.invoice', 'sales.approve_discount', 'sales.cancel', 'sales.share',
  'services.view', 'services.create', 'services.edit', 'services.complete',
  'clients.view', 'clients.create', 'clients.edit', 'clients.reports',
  'catalog.view', 'catalog.create', 'catalog.edit', 'catalog.view_cost',
  'stock.view', 'stock.entry', 'stock.exit', 'stock.inventory', 'stock.adjust',
  'fiscal.view', 'fiscal.prepare', 'fiscal.configure', 'fiscal.homologate', 'fiscal.issue', 'fiscal.cancel', 'fiscal.documents.xml.download', 'fiscal.documents.danfe.download',
  'receivables.view', 'receivables.receive', 'receivables.refund', 'receivables.export',
  'reports.view', 'reports.export', 'reports.view_financial',
  'settings.view', 'settings.edit', 'access.view', 'access.manage', 'access.audit',
]);

const OPERATOR_COMPLETE_BLOCKED = new Set([
  'settings.edit',
  'access.view',
  'access.manage',
  'access.audit',
  'fiscal.configure',
  'fiscal.homologate',
  'fiscal.cancel',
  'fiscal.documents.xml.download',
  'receivables.refund',
  'catalog.view_cost',
]);

const OPERATOR_SIMPLE_ALLOWED = new Set([
  'dashboard.view',
  'sales.view',
  'sales.create',
  'sales.share',
  'services.view',
  'services.create',
  'clients.view',
  'clients.create',
  'catalog.view',
  'stock.view',
]);

const all = Object.freeze([...COMMERCIAL_PERMISSION_CODES]);
const complete = Object.freeze(COMMERCIAL_PERMISSION_CODES.filter((permission) => !OPERATOR_COMPLETE_BLOCKED.has(permission)));
const simple = Object.freeze(COMMERCIAL_PERMISSION_CODES.filter((permission) => OPERATOR_SIMPLE_ALLOWED.has(permission)));

export const COMMERCIAL_PROFILE_PERMISSIONS = Object.freeze({
  gestor_master: all,
  administrador: all,
  operador_completo: complete,
  operador_simples: simple,
});

export const COMMERCIAL_PERMISSION_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(COMMERCIAL_PROFILE_PERMISSIONS).map(([profile, permissions]) => {
    const allowed = new Set(permissions);
    return [profile, Object.freeze(Object.fromEntries(COMMERCIAL_PERMISSION_CODES.map((permission) => [permission, allowed.has(permission)])))];
  }),
));
