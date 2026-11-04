import { REGISTRO_MODULOS } from './modulos-registro';

export type LiberacoesUsuario = { dashboard: boolean; modulos: string[] };
export type VinculoComLiberacoes = { perfil?: string | null; dashboard_liberada?: boolean; modulos_liberados?: string[] | null };
export const LIBERACOES_PADRAO: LiberacoesUsuario = { dashboard: true, modulos: REGISTRO_MODULOS.map(m => m.id) };

export function liberacoesDoVinculo(v: VinculoComLiberacoes): LiberacoesUsuario {
  if (v.perfil === 'gestor_master') return { ...LIBERACOES_PADRAO };
  return { dashboard: v.dashboard_liberada !== false, modulos: v.modulos_liberados === null || v.modulos_liberados === undefined ? [...LIBERACOES_PADRAO.modulos] : v.modulos_liberados.filter(id => REGISTRO_MODULOS.some(m => m.id === id)) };
}

export function validarLiberacoes(valor: unknown, perfil?: string): LiberacoesUsuario {
  if (!valor || typeof valor !== 'object') throw new Error('Informe as liberações do usuário.');
  const v = valor as Partial<LiberacoesUsuario>;
  if (typeof v.dashboard !== 'boolean' || !Array.isArray(v.modulos) || v.modulos.some(id => typeof id !== 'string' || !REGISTRO_MODULOS.some(m => m.id === id))) throw new Error('Liberações inválidas.');
  const modulos = [...new Set(v.modulos)].filter(id => !perfil || moduloPermitidoParaPapel(id, perfil));
  if (perfil === 'gestor_master') return { ...LIBERACOES_PADRAO };
  if (!v.dashboard && !modulos.length) throw new Error('Libere o Financeiro ou pelo menos um módulo.');
  return { dashboard: v.dashboard, modulos };
}

/** A concessão é adicional ao papel: não amplia as operações do módulo. */
export function moduloPermitidoParaPapel(id: string, perfil: string) {
  if (id === 'ponto') return ['gestor_master', 'administrador'].includes(perfil);
  if (id === 'recebimentos_presencial') return ['gestor_master', 'administrador'].includes(perfil);
  if (id === 'vendas_mobile') return ['gestor_master', 'administrador', 'operador_completo'].includes(perfil);
  return ['gestor_master', 'administrador', 'operador_completo', 'operador_simples'].includes(perfil);
}

export function hrefModulo(id: string, empresaId: string) {
  const modulo = REGISTRO_MODULOS.find(m => m.id === id);
  if (!modulo) throw new Error('Módulo inválido.');
  return modulo.navegacao.rota ? `${modulo.navegacao.rota}?empresaId=${encodeURIComponent(empresaId)}` : `/gestao?empresaId=${encodeURIComponent(empresaId)}&areaModulo=${id}`;
}

export function destinoAposLogin(empresaId: string, dashboard: boolean, modulos: string[]) {
  return dashboard ? `/gestao?empresaId=${encodeURIComponent(empresaId)}` : modulos.length === 1 ? hrefModulo(modulos[0], empresaId) : `/modulos?empresaId=${encodeURIComponent(empresaId)}`;
}

/** Compartilhado entre APIs e banco; endpoints sem módulo são da Gestão. */
export function areaDaApi(path: string, moduloId?: string | null): string {
  if (path === '/api/modulos/acesso' || path === '/api/modulos/permissoes') return moduloId || 'contexto';
  const modulo = path.match(/^\/api\/modulos\/([^/]+)/)?.[1];
  if (modulo) return modulo === 'marketplaces' ? 'marketplaces' : modulo;
  if (/^\/api\/(marketplaces)(\/|$)/.test(path)) return 'marketplaces';
  if (/^\/api\/(ponto|criar-funcionario-ponto|atualizar-funcionario-ponto|excluir-funcionario-ponto|redefinir-senha-ponto|admin-rep-p-afd)(\/|$)/.test(path)) return 'ponto';
  if (/^\/api\/recebimentos(\/|$)/.test(path)) return 'recebimentos_presencial';
  if (/^\/api\/(acessos-usuario|cobranca\/sessoes|cobranca\/estado)(\/|$)/.test(path)) return 'contexto';
  return 'dashboard';
}
