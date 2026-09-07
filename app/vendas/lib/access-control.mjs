export const SALES_MODULE_ID = 'vendas';
export const ACCESS_SESSION_VERSION = 1;

export const coreProfileByModuleRole = Object.freeze({
  gestor: 'gestor_master',
  administrador: 'administrador',
  operador_completo: 'operador_completo',
  operador_simples: 'operador_simples',
});

export function normalizeAccessBoundary(input = {}) {
  const source = input.source === 'authenticated' ? 'authenticated' : 'demo';
  return {
    version: ACCESS_SESSION_VERSION,
    source,
    authenticated: source === 'authenticated' && Boolean(input.authenticated),
    userId: String(input.userId ?? '').trim(),
    companyId: String(input.companyId ?? '').trim(),
    moduleId: String(input.moduleId ?? SALES_MODULE_ID).trim() || SALES_MODULE_ID,
    userActive: Boolean(input.userActive),
    membershipActive: Boolean(input.membershipActive),
    companyActive: Boolean(input.companyActive),
    moduleActive: Boolean(input.moduleActive),
  };
}

export function evaluateAccessDecision({ boundary, effectivePermissions, permission }) {
  const session = normalizeAccessBoundary(boundary);
  if (session.source === 'authenticated' && !session.authenticated) return { allowed: false, reason: 'session_required', session };
  if (!session.userId) return { allowed: false, reason: 'user_missing', session };
  if (!session.companyId) return { allowed: false, reason: 'company_missing', session };
  if (!session.companyActive) return { allowed: false, reason: 'company_inactive', session };
  if (!session.moduleActive) return { allowed: false, reason: 'module_inactive', session };
  if (!session.userActive || !session.membershipActive) return { allowed: false, reason: 'membership_inactive', session };
  if (!permission || !effectivePermissions?.[permission]) return { allowed: false, reason: 'permission_denied', session };
  return { allowed: true, reason: 'allowed', session };
}

export function accessDecisionMessage(reason) {
  const messages = {
    session_required: 'A sessão do AvantaLab precisa ser confirmada novamente.',
    user_missing: 'O usuário da sessão não foi identificado.',
    company_missing: 'Selecione uma empresa ou perfil ativo.',
    company_inactive: 'O perfil da empresa está inativo.',
    module_inactive: 'O módulo de Vendas e Serviços não está ativo para esta empresa.',
    membership_inactive: 'O vínculo deste usuário com a empresa está bloqueado.',
    permission_denied: 'Esta ação não está liberada no perfil ou nas exceções deste usuário.',
  };
  return messages[reason] ?? 'Não foi possível confirmar o acesso para esta ação.';
}
