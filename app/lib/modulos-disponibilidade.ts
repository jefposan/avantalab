export const VENDAS_MODULO_ID = 'vendas';

// Piloto de finalização: a liberação é vinculada ao perfil empresarial, nunca
// ao login que o acessa. Remover esta exceção quando o módulo for publicado.
export const VENDAS_PILOTO_EMPRESA_ID = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';

export function moduloDisponivelParaEmpresa(moduloId: string, empresaId: string) {
  return moduloId !== VENDAS_MODULO_ID || empresaId === VENDAS_PILOTO_EMPRESA_ID;
}

export function filtrarModulosDisponiveisParaEmpresa<T extends { id: unknown }>(
  modulos: readonly T[],
  empresaId: string,
) {
  return modulos.filter((modulo) => moduloDisponivelParaEmpresa(String(modulo.id), empresaId));
}

export const MENSAGEM_MODULO_EM_FINALIZACAO = 'Este módulo ainda está restrito ao perfil empresarial piloto.';
