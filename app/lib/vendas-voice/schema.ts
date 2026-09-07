import { VOICE_INTENTS, type VoiceIntentPayload } from './types';
import { validateVoiceIntent } from './validation.mjs';

export function validateVoiceIntentPayload(value: unknown): VoiceIntentPayload | null {
  return validateVoiceIntent(value);
}

export const VOICE_INTENT_JSON_SCHEMA = {
  name: 'avantalab_voice_intent',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      intent: { type: 'string', enum: VOICE_INTENTS },
      customer_reference: { type: ['string', 'null'] },
      items: {
        type: 'array',
        maxItems: 20,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            product_reference: { type: 'string' },
            quantity: { type: 'number', exclusiveMinimum: 0 },
          },
          required: ['product_reference', 'quantity'],
        },
      },
      amount: { type: ['number', 'null'] },
      payment_method: { type: ['string', 'null'], enum: ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Outro', null] },
      period: { type: ['string', 'null'], enum: ['today', 'this_month', 'last_month', 'all', null] },
      unsupported_reason: { type: ['string', 'null'] },
    },
    required: ['intent', 'customer_reference', 'items', 'amount', 'payment_method', 'period', 'unsupported_reason'],
  },
} as const;
