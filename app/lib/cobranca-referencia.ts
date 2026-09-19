import type { CicloComercial, PlanoComercial } from './planos-comerciais';

type PlanoAssinatura = Exclude<PlanoComercial, 'free'>;

export type ReferenciaAssinatura = {
  empresaId: string;
  plano: PlanoAssinatura;
  ciclo: CicloComercial;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLANOS_ASSINAVEIS = new Set<PlanoAssinatura>([
  'pessoal_premium',
  'business',
  'business_pro',
  'business_premium',
]);

function normalizarPlanoAssinatura(plano: unknown): PlanoAssinatura | null {
  const valor = plano === 'empresa' ? 'business' : String(plano || '');
  return PLANOS_ASSINAVEIS.has(valor as PlanoAssinatura) ? valor as PlanoAssinatura : null;
}

/**
 * Referência persistida na Asaas para que a confirmação de pagamento possa
 * validar o perfil, o plano e o ciclo que originaram a cobrança.
 */
export function criarReferenciaAssinatura({ empresaId, plano, ciclo }: ReferenciaAssinatura): string {
  if (!UUID.test(empresaId) || !PLANOS_ASSINAVEIS.has(plano) || !['mensal', 'anual'].includes(ciclo)) {
    throw new Error('Referência de assinatura inválida.');
  }
  return `assinatura:${empresaId}:${plano}:${ciclo}`;
}

export function lerReferenciaAssinatura(valor: unknown): ReferenciaAssinatura | null {
  const partes = String(valor || '').trim().split(':');
  if (partes.length !== 4 || partes[0] !== 'assinatura') return null;
  const empresaId = partes[1];
  const plano = normalizarPlanoAssinatura(partes[2]);
  const ciclo = partes[3];
  if (
    !UUID.test(empresaId)
    || !plano
    || (ciclo !== 'mensal' && ciclo !== 'anual')
  ) return null;
  return { empresaId, plano, ciclo };
}

export function referenciaConfereAssinatura(
  referencia: ReferenciaAssinatura,
  assinatura: { empresaId: string; plano: string | null | undefined; ciclo: string | null | undefined },
): boolean {
  return referencia.empresaId === assinatura.empresaId
    && referencia.plano === normalizarPlanoAssinatura(assinatura.plano)
    && referencia.ciclo === assinatura.ciclo;
}
