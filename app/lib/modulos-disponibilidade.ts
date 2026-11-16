export const VENDAS_MODULO_ID = 'vendas';

// Disponibilidade geral. Instalação, plano, vínculo e permissões continuam
// validados pelos consumidores antes de permitir operações no módulo.
export function moduloDisponivelParaEmpresa(_moduloId: string, _empresaId: string) {
  return true;
}

export function filtrarModulosDisponiveisParaEmpresa<T extends { id: unknown }>(
  modulos: readonly T[],
  empresaId: string,
) {
  return modulos.filter((modulo) => moduloDisponivelParaEmpresa(String(modulo.id), empresaId));
}

export const MENSAGEM_MODULO_EM_FINALIZACAO = 'Este módulo não está disponível para este perfil.';
