import 'server-only';
import { MarketplaceError } from './management-access';

type JsonRecord = Record<string, unknown>;

export type GoogleShoppingPriceSample = {
  pricesInCents: number[];
  count: number;
  minimum: number;
  maximum: number;
};

const DEFAULT_BASE_URL = 'https://api.dataforseo.com';
const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 1_000;

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function tasksFrom(body: JsonRecord) {
  const tasks = body.tasks;
  return Array.isArray(tasks) ? tasks.map(record) : [];
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function amountInCents(value: unknown) {
  const amount = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(amount) && amount > 0 && amount < 1_000_000 ? Math.round(amount * 100) : null;
}

function normalizedWords(value: string) {
  return new Set(value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((word) => word.length >= 3));
}

function titleMatchesProduct(title: string, productName: string, ean?: string | null) {
  const normalizedTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (ean && normalizedTitle.includes(ean)) return true;
  const wanted = normalizedWords(productName);
  const actual = normalizedWords(title);
  if (!wanted.size || !actual.size) return false;
  let matches = 0;
  for (const word of wanted) if (actual.has(word)) matches++;
  return matches / wanted.size >= 0.6;
}

/**
 * The API returns product cards in `items`. Some layouts nest seller cards in
 * child arrays, therefore we walk the response defensively and deduplicate the
 * actual listing price instead of relying on one unstable presentation shape.
 */
export function extractGoogleShoppingPriceSample(payload: unknown, productName: string, ean?: string | null): GoogleShoppingPriceSample | null {
  const prices: number[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const item = record(value);
    if (!Object.keys(item).length) return;
    const currency = text(item.currency).toUpperCase();
    const price = amountInCents(item.price);
    const title = text(item.title);
    if (currency === 'BRL' && price != null && title && titleMatchesProduct(title, productName, ean)) prices.push(price);
    for (const child of Object.values(item)) {
      if (child && typeof child === 'object') visit(child);
    }
  };
  visit(payload);
  const values = prices.sort((left, right) => left - right);
  if (!values.length) return null;
  return {
    pricesInCents: values,
    count: values.length,
    minimum: values[0] / 100,
    maximum: values.at(-1)! / 100,
  };
}

function providerEnabled() {
  return process.env.DATAFORSEO_PRICE_LOOKUP_ENABLED === 'true';
}

function apiConfiguration() {
  if (!providerEnabled()) {
    throw new MarketplaceError(503, 'price_provider_not_enabled', 'A consulta automática de preços está sendo concluída. Tente novamente em alguns instantes.');
  }
  const login = text(process.env.DATAFORSEO_API_LOGIN);
  const password = text(process.env.DATAFORSEO_API_PASSWORD);
  if (!login || !password) {
    throw new MarketplaceError(503, 'price_provider_not_configured', 'A consulta automática de preços ainda não está configurada neste ambiente.');
  }
  const baseUrl = text(process.env.DATAFORSEO_API_BASE_URL) || DEFAULT_BASE_URL;
  if (!/^https:\/\/(api|sandbox)\.dataforseo\.com$/i.test(baseUrl)) {
    throw new MarketplaceError(503, 'price_provider_not_configured', 'A configuração da consulta de preços não é válida.');
  }
  return { baseUrl, authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}` };
}

async function providerRequest(path: string, init: RequestInit, fetcher: typeof fetch = fetch) {
  const config = apiConfiguration();
  let response: Response;
  try {
    response = await fetcher(`${config.baseUrl}${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'application/json', Authorization: config.authorization, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  } catch {
    throw new MarketplaceError(503, 'price_provider_unavailable', 'A consulta de preços está indisponível. Tente novamente.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new MarketplaceError(503, 'price_provider_authorization', 'A credencial da consulta de preços não foi aceita. Atualize as credenciais de API do provedor.');
    }
    if (response.status === 402) {
      throw new MarketplaceError(503, 'price_provider_balance', 'A consulta de preços precisa de saldo disponível no provedor.');
    }
    throw new MarketplaceError(response.status === 429 ? 429 : 503, response.status === 429 ? 'price_provider_limited' : 'price_provider_failed',
      response.status === 429 ? 'Limite de consultas de preços atingido. Aguarde alguns instantes.' : 'Não foi possível consultar os preços agora. Tente novamente.');
  }
  const task = tasksFrom(record(body))[0] || null;
  const status = Number(record(task).status_code);
  if (status === 40100 || status === 40101 || status === 40102 || status === 40301) {
    throw new MarketplaceError(503, 'price_provider_authorization', 'A credencial da consulta de preços não foi aceita. Atualize as credenciais de API do provedor.');
  }
  if (status === 40200 || status === 40201 || status === 40202 || status === 40203) {
    throw new MarketplaceError(503, 'price_provider_balance', 'A consulta de preços precisa de saldo disponível no provedor.');
  }
  if (!task || (Number.isFinite(status) && status >= 40000)) {
    throw new MarketplaceError(503, 'price_provider_failed', 'A consulta de preços não foi aceita. Tente novamente.');
  }
  return record(body);
}

function taskId(body: JsonRecord) {
  const id = text(tasksFrom(body)[0]?.id);
  if (!/^[0-9a-f-]{20,}$/i.test(id)) throw new MarketplaceError(503, 'price_provider_invalid_response', 'A consulta de preços retornou uma resposta incompleta. Tente novamente.');
  return id;
}

function taskHasResult(body: JsonRecord) {
  const result = tasksFrom(body)[0]?.result;
  return Array.isArray(result) && result.length > 0;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function consultGoogleShoppingPrices(input: { ean: string | null; productName: string }) {
  const keyword = input.ean || input.productName;
  const posted = await providerRequest('/v3/merchant/google/products/task_post', {
    method: 'POST',
    body: JSON.stringify([{ keyword, location_name: 'Brazil', language_code: 'pt', depth: 20 }]),
  });
  const id = taskId(posted);
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await wait(POLL_INTERVAL_MS);
    const result = await providerRequest(`/v3/merchant/google/products/task_get/advanced/${encodeURIComponent(id)}`, { method: 'GET' });
    if (!taskHasResult(result)) continue;
    return extractGoogleShoppingPriceSample(result, input.productName, input.ean);
  }
  throw new MarketplaceError(503, 'price_provider_timeout', 'A consulta de preços demorou mais que o esperado. Tente novamente.');
}
