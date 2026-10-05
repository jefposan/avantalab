import 'server-only';
import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';
import { uuidIsValid } from './listing-model';

export class MarketplaceError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
export function managementFailure(error: unknown) {
  return NextResponse.json({ message: error instanceof MarketplaceError ? error.message : 'Não foi possível concluir. Verifique a configuração do módulo ou tente novamente.', code: error instanceof MarketplaceError ? error.code : 'integration_unavailable' },
    { status: error instanceof MarketplaceError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
}
export async function authorizeMarketplace(request: Request, empresaId: unknown, permission: 'view' | 'manage' | 'connections' = 'view') {
  if (!uuidIsValid(empresaId)) throw new MarketplaceError(400, 'invalid_company', 'Empresa inválida.');
  const access = await autenticarPerfilCobranca(request, empresaId);
  const roles = permission === 'connections' ? ['gestor_master', 'administrador'] : permission === 'manage' ? ['gestor_master', 'administrador', 'operador_completo'] : ['gestor_master', 'administrador', 'operador_completo', 'operador_simples'];
  if (!access || !roles.includes(access.vinculo.perfil || '')) throw new MarketplaceError(403, 'forbidden', 'Seu perfil não permite esta operação na empresa selecionada.');
  const { data, error } = await access.db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'marketplaces').maybeSingle();
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível verificar o acesso ao módulo.');
  if (!data?.ativo || (data.expira_em && new Date(data.expira_em).getTime() <= Date.now())) throw new MarketplaceError(403, 'module_inactive', 'Módulo indisponível nesta empresa.');
  return { ...access, empresaId };
}
