export const BASE_PAYMENT_METHODS = Object.freeze({
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  dinheiro: 'Dinheiro',
  prazo: 'A prazo',
  consignado: 'Consignado',
  outro: 'Outro',
});
export const PAYMENT_METHOD_MAX_LENGTH = 40;
const MAX_CUSTOM_METHODS = 50;
const baseValues = Object.keys(BASE_PAYMENT_METHODS);
const cleanName = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const normalized = value => cleanName(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const keys = new Map(Object.entries(BASE_PAYMENT_METHODS).flatMap(([key, label]) => [[key, key], [normalized(label), key]]));
for (const [alias, key] of [['a_prazo', 'prazo'], ['transferencia bancaria', 'transferencia'], ['outros', 'outro']]) keys.set(alias, key);

export function paymentMethodKey(value) {
  const key = normalized(value);
  return keys.get(key) ?? key;
}

export function paymentMethodLabel(value) {
  const key = paymentMethodKey(value);
  return Object.hasOwn(BASE_PAYMENT_METHODS, key) ? BASE_PAYMENT_METHODS[key] : cleanName(value);
}

export function normalizePaymentSettings(input) {
  const source = input && typeof input === 'object' ? input : {};
  const methods = new Map(baseValues.map(value => [value, value]));
  const customMethods = [];
  for (const raw of Array.isArray(source.customMethods) ? source.customMethods.slice(0, MAX_CUSTOM_METHODS) : []) {
    const label = cleanName(raw);
    const key = paymentMethodKey(label);
    if (!label || label.length > PAYMENT_METHOD_MAX_LENGTH || !/[\p{L}\p{N}]/u.test(label) || methods.has(key)) continue;
    methods.set(key, label);
    customMethods.push(label);
  }
  const requested = Array.isArray(source.enabledMethods) ? source.enabledMethods : baseValues;
  // Older browsers exposed Consignado in orders without storing it in settings.
  const selected = !Array.isArray(source.customMethods) ? [...requested, 'consignado'] : requested;
  const enabled = new Set(selected.map(paymentMethodKey));
  const enabledMethods = [...methods].filter(([key]) => enabled.has(key)).map(([, value]) => value);
  if (!enabledMethods.length) enabledMethods.push('pix');
  const defaultMethod = enabledMethods.find(value => paymentMethodKey(value) === paymentMethodKey(source.defaultMethod)) ?? enabledMethods[0];
  const installments = Number(source.defaultInstallments ?? 1);
  const days = Number(source.firstDueDays ?? 0);
  return { customMethods, enabledMethods, defaultMethod,
    defaultInstallments: Number.isInteger(installments) && installments >= 1 && installments <= 120 ? installments : 1,
    firstDueDays: Number.isInteger(days) && days >= 0 && days <= 365 ? days : 0 };
}

export function addCustomPaymentMethod(settings, value) {
  const label = cleanName(value);
  if (!/[\p{L}\p{N}]/u.test(label) || label.length > PAYMENT_METHOD_MAX_LENGTH) throw Error('Informe um nome de até 40 caracteres.');
  const key = paymentMethodKey(label);
  if ([...baseValues, ...settings.customMethods].some(method => paymentMethodKey(method) === key)) throw Error('Essa forma de pagamento já existe.');
  if (settings.customMethods.length >= MAX_CUSTOM_METHODS) throw Error('O limite de 50 formas personalizadas foi atingido.');
  return normalizePaymentSettings({ ...settings, customMethods: [...settings.customMethods, label], enabledMethods: [...settings.enabledMethods, label] });
}

export function paymentFilterOptions(settings, historical = []) {
  const options = new Map();
  for (const method of [...settings.enabledMethods, ...historical]) {
    const key = paymentMethodKey(method);
    if (key && !options.has(key)) options.set(key, { value: key, label: paymentMethodLabel(method) });
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}
