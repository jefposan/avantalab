/**
 * Infraestrutura local e formatadores compartilhados pela tela de Vendas e
 * Serviços. Este módulo não executa leituras no carregamento: o acesso ao
 * navegador continua acontecendo somente quando as funções são chamadas.
 */

export const STORAGE_KEY = 'avantalab:prototipo-vendas-servicos:v1';
export const CLIENT_STORAGE_KEY = 'avantalab:prototipo-vendas-clientes:v2';
export const CLIENT_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-clientes:v1'];
export const SUPPLIER_STORAGE_KEY = 'avantalab:prototipo-vendas-fornecedores:v1';
export const CATALOG_STORAGE_KEY = 'avantalab:prototipo-vendas-catalogo:v3';
export const CATALOG_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-catalogo:v2', 'avantalab:prototipo-vendas-catalogo:v1'];
export const STOCK_STORAGE_KEY = 'avantalab:prototipo-vendas-estoque:v1';
export const RECEIVABLE_STORAGE_KEY = 'avantalab:prototipo-vendas-recebimentos:v1';
export const FISCAL_DRAFT_STORAGE_KEY = 'avantalab:prototipo-vendas-fiscal:v4';
export const FISCAL_DRAFT_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-fiscal:v3', 'avantalab:prototipo-vendas-fiscal:v2', 'avantalab:prototipo-vendas-fiscal:v1'];
export const FISCAL_HOMOLOGATION_STORAGE_KEY = 'avantalab:prototipo-vendas-homologacao-fiscal:v1';
export const FISCAL_INTEGRATION_EVALUATION_STORAGE_KEY = 'avantalab:prototipo-vendas-avaliacao-integracao-fiscal:v1';
export const FISCAL_ISSUER_REGISTRY_STORAGE_KEY = 'avantalab:prototipo-vendas-estabelecimentos-fiscais:v2';
export const FISCAL_ISSUER_REGISTRY_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-estabelecimentos-fiscais:v1'];
export const NFE_SP_HOMOLOGATION_STORAGE_KEY = 'avantalab:prototipo-vendas-nfe-sp-homologacao:v2';
export const NFE_SP_HOMOLOGATION_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-nfe-sp-homologacao:v1'];
export const FISCAL_NUMBERING_STORAGE_KEY = 'avantalab:prototipo-vendas-numeracao-fiscal:v1';
export const SETTINGS_STORAGE_KEY = 'avantalab:prototipo-vendas-configuracoes:v8';
export const SETTINGS_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-configuracoes:v7', 'avantalab:prototipo-vendas-configuracoes:v6', 'avantalab:prototipo-vendas-configuracoes:v5', 'avantalab:prototipo-vendas-configuracoes:v4', 'avantalab:prototipo-vendas-configuracoes:v3', 'avantalab:prototipo-vendas-configuracoes:v2', 'avantalab:prototipo-vendas-configuracoes:v1'];
export const ACTIVE_USER_STORAGE_KEY = 'avantalab:prototipo-vendas-sessao:v1';

export function companyStorageKey(key: string) {
  const companyId = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('companyId') || '';
  return companyId ? `${key}:empresa:${companyId}` : `${key}:demonstracao`;
}

export function isIntegratedManagementRuntime() {
  if (typeof window === 'undefined') return false;
  const bridge = new URLSearchParams(window.location.search).get('bridge') || '';
  return ['gestao', 'gestao-local'].includes(bridge) && window.parent !== window;
}

export function readCompanyStorage(key: string) {
  return window.localStorage.getItem(companyStorageKey(key));
}

export function writeCompanyStorage(key: string, value: string) {
  window.localStorage.setItem(companyStorageKey(key), value);
}

export function removeCompanyStorage(key: string) {
  window.localStorage.removeItem(companyStorageKey(key));
}

export const brazilStateCodes = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const;

export function ptBrDateToIso(value: string) {
  const [day, month, year] = value.split('/');
  return year && month && day ? `${year}-${month}-${day}` : value;
}

export function displayIsoDate(value: string) {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function displayDateTime(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function localDateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function formatDuration(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safe / 60);
  const remaining = safe % 60;
  if (!hours) return `${remaining} min`;
  return remaining ? `${hours}h${String(remaining).padStart(2, '0')}` : `${hours}h`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function isoAfterDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function paymentMethodLabel(value: string) {
  return ({ pix: 'PIX', boleto: 'Boleto', cartao: 'Cartão', prazo: 'A prazo' } as Record<string, string>)[value] ?? value;
}
