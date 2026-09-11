import { OPERACOES_VOZ_CAMPO, type RascunhoVozCampo } from './types';

const FORMAS = new Set(['boleto', 'cartao_credito', 'cartao_debito', 'dinheiro', 'pix']);
const TIPOS = new Set(['interna', 'revisao', 'extra']);
const AVALIACOES = new Set(['bom', 'regular']);

const textoOpcional = (value: unknown, limite = 240) => {
  if (value == null) return null;
  const texto = String(value).trim().slice(0, limite);
  return texto || null;
};

export function validarRascunhoVozCampo(value: unknown): RascunhoVozCampo | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const intent = String(row.intent || '');
  if (!OPERACOES_VOZ_CAMPO.includes(intent as RascunhoVozCampo['intent'])) return null;
  const amount = row.amount == null ? null : Number(row.amount);
  const paymentMethod = row.payment_method ?? row.paymentMethod;
  const serviceType = row.service_type ?? row.serviceType;
  const evaluation = row.evaluation;
  const scheduledDate = textoOpcional(row.scheduled_date ?? row.scheduledDate, 10);
  if (amount != null && (!Number.isFinite(amount) || amount <= 0)) return null;
  if (paymentMethod != null && !FORMAS.has(String(paymentMethod))) return null;
  if (serviceType != null && !TIPOS.has(String(serviceType))) return null;
  if (evaluation != null && !AVALIACOES.has(String(evaluation))) return null;
  if (scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) return null;
  return {
    intent: intent as RascunhoVozCampo['intent'],
    replacePrevious: row.replace_previous === true || row.replacePrevious === true,
    customerReference: textoOpcional(row.customer_reference ?? row.customerReference, 160),
    amount,
    paymentMethod: paymentMethod == null ? null : String(paymentMethod) as RascunhoVozCampo['paymentMethod'],
    scheduledDate,
    serviceType: serviceType == null ? null : String(serviceType) as RascunhoVozCampo['serviceType'],
    receiverName: textoOpcional(row.receiver_name ?? row.receiverName, 160),
    evaluation: evaluation == null ? null : String(evaluation) as RascunhoVozCampo['evaluation'],
    notes: textoOpcional(row.notes, 500),
    unsupportedReason: textoOpcional(row.unsupported_reason ?? row.unsupportedReason, 300),
  };
}

export const VOICE_FIELD_OPERATION_SCHEMA = {
  name: 'avantalab_field_operation_voice_intent',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      intent: { type: 'string', enum: OPERACOES_VOZ_CAMPO },
      replace_previous: { type: 'boolean' },
      customer_reference: { type: ['string', 'null'] },
      amount: { type: ['number', 'null'], exclusiveMinimum: 0 },
      payment_method: { type: ['string', 'null'], enum: ['boleto', 'cartao_credito', 'cartao_debito', 'dinheiro', 'pix', null] },
      scheduled_date: { type: ['string', 'null'] },
      service_type: { type: ['string', 'null'], enum: ['interna', 'revisao', 'extra', null] },
      receiver_name: { type: ['string', 'null'] },
      evaluation: { type: ['string', 'null'], enum: ['bom', 'regular', null] },
      notes: { type: ['string', 'null'] },
      unsupported_reason: { type: ['string', 'null'] },
    },
    required: ['intent', 'replace_previous', 'customer_reference', 'amount', 'payment_method', 'scheduled_date', 'service_type', 'receiver_name', 'evaluation', 'notes', 'unsupported_reason'],
  },
} as const;
