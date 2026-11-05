import type { PerfilModulos } from '@/app/modulos/MeusModulos';

type Previa = { usuarioId: string; expiraEm: number; perfis: PerfilModulos[] };
const CHAVE = 'avantalab.previa-meus-modulos.v1';
let memoria: Previa | null = null;

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

export function guardarPreviaModulos(usuarioId: string, perfis: PerfilModulos[], empresaId?: string) {
  if (typeof window === 'undefined') return;
  const anterior = lerPrevia();
  const demais = empresaId && anterior?.usuarioId === usuarioId ? anterior.perfis.filter(p => p.empresa.id !== empresaId) : [];
  memoria = { usuarioId, expiraEm: Date.now() + 30 * 60 * 1000, perfis: [...demais, ...perfis] };
  try { window.sessionStorage.setItem(CHAVE, JSON.stringify(memoria)); } catch { /* A prévia em memória continua disponível. */ }
}

export function lerPreviaModulos(empresaId: string) {
  const previa = lerPrevia();
  const perfil = previa?.perfis.find(p => p.empresa.id === empresaId);
  return perfil && previa ? { perfil, perfis: previa.perfis } : null;
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
}
