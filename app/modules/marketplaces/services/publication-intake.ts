import type { PublicationPreparation } from '../types';
import { isValidEan, normalizeEan } from './ean.ts';

export function parseBrlToCents(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
  const normalized = String(value ?? '').trim().replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
}

export function preparePublicationInput(input: { ean?: unknown; price?: unknown; connectionId?: unknown }): PublicationPreparation {
  const ean = normalizeEan(input.ean);
  const priceInCents = parseBrlToCents(input.price);
  const requirements = [] as PublicationPreparation['requirements'];

  if (!isValidEan(ean)) requirements.push({
    field: 'ean', label: 'EAN válido', input: 'text',
    message: 'Informe um EAN/GTIN válido com dígito verificador.',
  });
  if (!priceInCents) requirements.push({
    field: 'price', label: 'Valor de venda', input: 'number',
    message: 'Informe um valor de venda maior que zero.',
  });
  if (!String(input.connectionId ?? '').trim()) requirements.push({
    field: 'connection', label: 'Conta conectada', input: 'select',
    message: 'Conecte ou selecione uma conta do marketplace para continuar.',
  });

  if (requirements.length) {
    return { status: 'needs_information', requirements, message: 'Complete as informações indicadas para preparar o anúncio.' };
  }
  return { status: 'draft', normalizedEan: ean, priceInCents: priceInCents!, requirements: [], message: 'Dados iniciais válidos. A conexão consultará o catálogo e pedirá apenas campos exigidos pelo marketplace.' };
}
