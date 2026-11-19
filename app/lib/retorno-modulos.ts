import type { PerfilModulos } from '@/app/modulos/MeusModulos';

type Previa = { usuarioId: string; expiraEm: number; perfis: PerfilModulos[]; revisoes?: Record<string, number> };
export const CHAVE_PREVIA_MODULOS = 'avantalab.previa-meus-modulos.v1';
const CHAVE = CHAVE_PREVIA_MODULOS;
let memoria: Previa | null = null;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach(ouvinte => ouvinte());
export function observarPreviaModulos(ouvinte: () => void) { ouvintes.add(ouvinte); return () => { ouvintes.delete(ouvinte); }; }
export function sincronizarPreviaModulos() { memoria = null; emitir(); }

/** Só apresentação e destino de retorno: nunca autoriza uma operação. */
function lerPrevia(): Previa | null {
  if (typeof window === 'undefined') return null;
  try {
    const previa = memoria || JSON.parse(window.sessionStorage.getItem(CHAVE) || 'null') as Previa | null;
    if (!previa || typeof previa.usuarioId !== 'string' || !Number.isFinite(previa.expiraEm) || previa.expiraEm < Date.now() || !Array.isArray(previa.perfis)) return null;
    if (previa.perfis.some(p => !p?.empresa || typeof p.empresa.id !== 'string' || typeof p.dashboard !== 'boolean' || !Array.isArray(p.modulos))) return null;
    memoria = previa;
    return previa;
  } catch { return null; }
}

export function guardarPreviaModulos(usuarioId: string, perfis: PerfilModulos[], empresaId?: string, consultaIniciadaEm = Date.now()) {
  if (typeof window === 'undefined') return;
  const anterior = lerPrevia();
  const mesmaPessoa = anterior?.usuarioId === usuarioId;
  if (empresaId && mesmaPessoa && (anterior.revisoes?.[empresaId] || 0) > consultaIniciadaEm) return;
  const demais = empresaId && mesmaPessoa ? anterior.perfis.filter(p => p.empresa.id !== empresaId) : [];
  const revisoes = mesmaPessoa ? { ...anterior.revisoes } : {};
  const recebidos = perfis.flatMap(perfil => {
    const id = perfil.empresa.id;
    if (mesmaPessoa && (revisoes[id] || 0) > consultaIniciadaEm) {
      const vigente = anterior.perfis.find(p => p.empresa.id === id);
      return vigente ? [vigente] : [];
    }
    revisoes[id] = consultaIniciadaEm;
    return [perfil];
  });
  if (!empresaId && mesmaPessoa) {
    for (const perfil of anterior.perfis) if ((revisoes[perfil.empresa.id] || 0) > consultaIniciadaEm && !recebidos.some(p => p.empresa.id === perfil.empresa.id)) recebidos.push(perfil);
  }
  if (empresaId) revisoes[empresaId] = consultaIniciadaEm;
  memoria = { usuarioId, expiraEm: Date.now() + 30 * 60 * 1000, perfis: [...demais, ...recebidos], revisoes };
  try { window.sessionStorage.setItem(CHAVE, JSON.stringify(memoria)); } catch { /* A prévia em memória continua disponível. */ }
  emitir();
}

export function lerPreviaModulos(empresaId: string, usuarioId?: string) {
  const previa = lerPrevia();
  if (usuarioId && previa?.usuarioId !== usuarioId) return null;
  const perfil = previa?.perfis.find(p => p.empresa.id === empresaId);
  return perfil && previa ? { perfil, perfis: previa.perfis } : null;
}

export function atualizacaoPreviaModulos(empresaId: string, usuarioId: string) {
  const previa = lerPrevia();
  return previa?.usuarioId === usuarioId ? previa.revisoes?.[empresaId] || 0 : 0;
}

export function destinoInicioModulo(empresaId: string) {
  const perfil = lerPreviaModulos(empresaId)?.perfil;
  return perfil && !perfil.dashboard
    ? `/modulos?empresaId=${encodeURIComponent(empresaId)}&retorno=1`
    : `/gestao?inicio=1&empresaId=${encodeURIComponent(empresaId)}`;
}

export function limparPreviaModulos() {
  memoria = null;
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(CHAVE); } catch { /* Sem persistência disponível. */ }
  emitir();
}
