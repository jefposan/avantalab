import type { PlanoComercial } from './planos-comerciais';
import type { TipoPerfil } from './cobranca';

export type SubAcaoGerenciarPerfil = null | 'editar' | 'criar';

export type DireitoPerfisQuota = {
  plano: PlanoComercial;
  usados: number;
  limite: number;
  origemEmpresaId: string | null;
};

export function ehCriacaoDePerfilAdicional(
  criandoNovaEmpresaLogada: boolean,
  subAcaoGerenciar: SubAcaoGerenciarPerfil,
) {
  return criandoNovaEmpresaLogada || subAcaoGerenciar === 'criar';
}

export function resolverEmpresaOrigemDaCriacao(
  empresaId: string | null | undefined,
  criandoPerfilAdicional: boolean,
) {
  const id = String(empresaId || '').trim();
  return criandoPerfilAdicional && id ? id : undefined;
}

export function papelPodeConsumirQuotaDePerfis(papel: string | null | undefined) {
  return papel === 'gestor_master' || papel === 'administrador';
}

export function avaliarQuotaParaCriacao(
  direito: DireitoPerfisQuota,
  tipoPerfil: TipoPerfil,
  tiposPermitidos: readonly TipoPerfil[],
) {
  const tipoPermitido = tiposPermitidos.includes(tipoPerfil);
  const temVaga = direito.usados < direito.limite;
  const possuiAssinaturaOrigem = Boolean(direito.origemEmpresaId);

  return {
    tipoPermitido,
    temVaga,
    possuiAssinaturaOrigem,
    compartilhaAssinatura: possuiAssinaturaOrigem && tipoPermitido && temVaga,
  };
}
