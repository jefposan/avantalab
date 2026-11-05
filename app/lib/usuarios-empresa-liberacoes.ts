import { liberacoesDoVinculo, type LiberacoesUsuario, type VinculoComLiberacoes } from './acessos-usuario';

export function liberacoesPersistidasIguais(vinculo: VinculoComLiberacoes, esperado: LiberacoesUsuario) {
  if (typeof vinculo.dashboard_liberada !== 'boolean' || (vinculo.modulos_liberados !== null && !Array.isArray(vinculo.modulos_liberados))) return false;
  const salvo = liberacoesDoVinculo(vinculo);
  return salvo.dashboard === esperado.dashboard &&
    JSON.stringify([...new Set(salvo.modulos)].sort()) === JSON.stringify([...new Set(esperado.modulos)].sort());
}

export function anexarLiberacoesUsuarios<T extends { id: string }>(usuarios: T[], vinculos: (VinculoComLiberacoes & { id: string })[]) {
  const porId = new Map(vinculos.map(v => [v.id, v]));
  return usuarios.map(usuario => {
    const salvo = porId.get(usuario.id);
    if (!salvo || typeof salvo.dashboard_liberada !== 'boolean' || (salvo.modulos_liberados !== null && !Array.isArray(salvo.modulos_liberados))) {
      throw new Error('Não foi possível confirmar as liberações dos usuários. Atualize a lista e tente novamente.');
    }
    return { ...usuario, dashboard_liberada: salvo.dashboard_liberada, modulos_liberados: salvo.modulos_liberados };
  });
}
