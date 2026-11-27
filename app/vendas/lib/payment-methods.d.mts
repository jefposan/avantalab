export type PaymentSettings = {
  customMethods: string[];
  enabledMethods: string[];
  defaultMethod: string;
  defaultInstallments: number;
  firstDueDays: number;
};
export const BASE_PAYMENT_METHODS: Readonly<Record<string, string>>;
export const PAYMENT_METHOD_MAX_LENGTH: number;
export function paymentMethodKey(value: unknown): string;
export function paymentMethodLabel(value: unknown): string;
export function normalizePaymentSettings(input?: unknown): PaymentSettings;
export function addCustomPaymentMethod(settings: PaymentSettings, value: string): PaymentSettings;
export function paymentFilterOptions(settings: Pick<PaymentSettings, 'enabledMethods'>, historical?: unknown[]): { value: string; label: string }[];
