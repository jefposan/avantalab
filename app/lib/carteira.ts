export const VALORES_RECARGA_CENTAVOS = [3000, 5000, 10000, 20000, 50000] as const;

export const CONSULTAS_CREDITO = {
  credito_essencial: { nome: 'Crédito Essencial', precoCentavos: 1199 },
  credito_avancada: { nome: 'Crédito Avançado', precoCentavos: 2099 },
  credito_completa: { nome: 'Crédito Completa', precoCentavos: 3199 },
} as const;

export type TipoConsultaCredito = keyof typeof CONSULTAS_CREDITO;

export function formatarCentavos(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor / 100);
}
