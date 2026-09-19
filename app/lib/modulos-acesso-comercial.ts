import {
  assinaturaVigente,
  COBRANCA_ATIVA,
  type EstadoAcesso,
} from './cobranca';
import { normalizarPlanoComercial } from './planos-comerciais';

export type AcessoComercialModulo =
  | 'business'
  | 'business_pro'
  | 'cortesia'
  | 'liberado'
  | null;

export function resolverAcessoComercialModulo(
  estado: EstadoAcesso | null,
  cobrancaAtiva = COBRANCA_ATIVA,
): AcessoComercialModulo {
  if (!cobrancaAtiva) return 'liberado';
  if (!estado || estado.tipoPerfil !== 'empresa' || !assinaturaVigente(estado)) return null;
  if (estado.status === 'cortesia') return 'cortesia';

  const plano = normalizarPlanoComercial(estado.plano);
  return plano === 'business' || plano === 'business_pro' ? plano : null;
}

export function permiteInstalacaoModuloSemCobranca(acesso: AcessoComercialModulo): boolean {
  return acesso === 'business_pro' || acesso === 'cortesia' || acesso === 'liberado';
}
