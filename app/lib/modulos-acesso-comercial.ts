import {
  assinaturaVigente,
  COBRANCA_ATIVA,
  type EstadoAcesso,
} from './cobranca';
import { normalizarPlanoComercial } from './planos-comerciais';

export type AcessoComercialModulo =
  | 'business'
  | 'business_pro'
  | 'business_premium'
  | 'cortesia'
  | 'liberado'
  | null;

export function resolverAcessoComercialModulo(
  estado: EstadoAcesso | null,
  cobrancaAtiva = COBRANCA_ATIVA,
): AcessoComercialModulo {
  if (!cobrancaAtiva) return 'liberado';
  if (!estado || estado.tipoPerfil !== 'empresa' || !assinaturaVigente(estado)) return null;
  const plano = normalizarPlanoComercial(estado.plano);
  if (estado.status === 'cortesia') {
    return plano === 'business' || plano === 'business_pro' || plano === 'business_premium'
      ? plano
      : 'cortesia';
  }
  return plano === 'business' || plano === 'business_pro' || plano === 'business_premium' ? plano : null;
}

export function permiteInstalacaoModuloSemCobranca(acesso: AcessoComercialModulo): boolean {
  return acesso === 'business_pro' || acesso === 'business_premium' || acesso === 'cortesia' || acesso === 'liberado';
}
