const VOICE_INTENTS = new Set(['create_order', 'register_payment', 'query_customer_history', 'query_sales', 'unsupported']);
const MAX_REFERENCE_LENGTH = 160;
const PAYMENT_METHODS = new Set(['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Outro']);

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const valueAsText = String(value).trim().slice(0, MAX_REFERENCE_LENGTH);
  return valueAsText || null;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateVoiceIntent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !VOICE_INTENTS.has(value.intent)) return null;
  const rawItems = Array.isArray(value.items) ? value.items : [];
  if (rawItems.length > 20) return null;
  const items = rawItems.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const productReference = textOrNull(item.product_reference ?? item.productReference);
    const quantity = numberOrNull(item.quantity);
    if (!productReference || quantity === null || quantity <= 0 || quantity > 9999) return null;
    return { productReference, quantity: Math.round(quantity * 1000) / 1000 };
  });
  if (items.some((item) => !item)) return null;
  const periodValue = textOrNull(value.period);
  const period = periodValue && ['today', 'this_month', 'last_month', 'all'].includes(periodValue) ? periodValue : null;
  const amount = numberOrNull(value.amount);
  const paymentMethodValue = textOrNull(value.payment_method ?? value.paymentMethod);
  const paymentMethod = paymentMethodValue && PAYMENT_METHODS.has(paymentMethodValue) ? paymentMethodValue : null;
  if (amount !== null && (amount <= 0 || amount > 9_999_999.99)) return null;
  return {
    intent: value.intent,
    customerReference: textOrNull(value.customer_reference ?? value.customerReference),
    items,
    amount: amount === null ? null : Math.round(amount * 100) / 100,
    paymentMethod,
    period,
    unsupportedReason: textOrNull(value.unsupported_reason ?? value.unsupportedReason),
  };
}

export function normalizeVoiceSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
