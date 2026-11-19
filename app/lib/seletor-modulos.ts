import { hrefModulo, moduloPermitidoParaPapel } from './acessos-usuario';
import { REGISTRO_MODULOS } from './modulos-registro';

export type PerfilSeletorModulos = {
  empresa: { id: string };
  perfil: string;
  planoAtivo: boolean;
  modulos: { id: string }[];
};

/** A resposta autenticada é a autoridade; nunca usa a prévia visual como concessão. */
export function opcoesSeletorModulos(perfis: PerfilSeletorModulos[], empresaId: string) {
  const perfil = perfis.find(item => item.empresa.id === empresaId);
  if (!perfil?.planoAtivo) return [];
  return REGISTRO_MODULOS.filter(modulo => perfil.modulos.some(item => item.id === modulo.id)
    && moduloPermitidoParaPapel(modulo.id, perfil.perfil)).map(modulo => ({
    id: modulo.id, nome: modulo.nome, descricao: modulo.descricao,
    href: hrefModulo(modulo.id, empresaId),
  }));
}
