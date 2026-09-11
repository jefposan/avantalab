const VOICE_INTENTS = new Set(['create_order', 'create_consignment', 'register_payment', 'create_appointment', 'query_customer_history', 'query_sales', 'unsupported']);
const MAX_REFERENCE_LENGTH = 160;
const PAYMENT_METHODS = new Set(['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Outro']);
const APPOINTMENT_TYPES = new Set(['Visita', 'Entrega', 'Recebimento', 'Cobrar', 'Outro']);

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

function isoDateOrNull(value) {
  const text = textOrNull(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? text : null;
}

function timeOrNull(value) {
  const text = textOrNull(value);
  if (!text) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
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
  const discountAmount = numberOrNull(value.discount_amount ?? value.discountAmount);
  const discountPercent = numberOrNull(value.discount_percent ?? value.discountPercent);
  const paymentMethodValue = textOrNull(value.payment_method ?? value.paymentMethod);
  const paymentMethod = paymentMethodValue && PAYMENT_METHODS.has(paymentMethodValue) ? paymentMethodValue : null;
  const appointmentTypeValue = textOrNull(value.appointment_type ?? value.appointmentType);
  const appointmentType = appointmentTypeValue && APPOINTMENT_TYPES.has(appointmentTypeValue) ? appointmentTypeValue : null;
  const scheduledDateValue = value.scheduled_date ?? value.scheduledDate;
  const scheduledTimeValue = value.scheduled_time ?? value.scheduledTime;
  const scheduledDate = isoDateOrNull(scheduledDateValue);
  const scheduledTime = timeOrNull(scheduledTimeValue);
  if (textOrNull(scheduledDateValue) && !scheduledDate) return null;
  if (textOrNull(scheduledTimeValue) && !scheduledTime) return null;
  if (appointmentTypeValue && !appointmentType) return null;
  if (amount !== null && (amount <= 0 || amount > 9_999_999.99)) return null;
  if (discountAmount !== null && (discountAmount < 0 || discountAmount > 9_999_999.99)) return null;
  if (discountPercent !== null && (discountPercent < 0 || discountPercent > 100)) return null;
  if (discountAmount !== null && discountPercent !== null) return null;
  return {
    intent: value.intent,
    customerReference: textOrNull(value.customer_reference ?? value.customerReference),
    items,
    amount: amount === null ? null : Math.round(amount * 100) / 100,
    paymentMethod,
    discountAmount: discountAmount === null ? null : Math.round(discountAmount * 100) / 100,
    discountPercent: discountPercent === null ? null : Math.round(discountPercent * 100) / 100,
    scheduledDate,
    scheduledTime,
    appointmentType,
    appointmentNotes: textOrNull(value.appointment_notes ?? value.appointmentNotes),
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
