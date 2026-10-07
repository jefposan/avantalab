import 'server-only';
import { MarketplaceError } from './management-access';
import { selectReferencePriceCents } from './price-reference';

type JsonRecord = Record<string, unknown>;

export type GoogleShoppingPriceSample = {
  pricesInCents: number[];
  count: number;
  minimum: number;
  maximum: number;
};

export type GoogleShoppingPriceLookup =
  | { status: 'pending'; taskId: string }
  | { status: 'completed'; sample: GoogleShoppingPriceSample | null };

type GoogleShoppingProductReference = {
  productId: string | null;
  dataDocId: string | null;
  gid: string | null;
};

type PendingLookup = {
  phase: 'products' | 'product_info';
  id: string;
  fallbackPricesInCents?: number[];
};

const DEFAULT_BASE_URL = 'https://api.dataforseo.com';
// A coleta do Merchant API é assíncrona. A fila normal contratada pelo provedor
// pode ultrapassar a duração de uma Function. A rota faz uma primeira espera
// curta e entrega uma continuação protegida ao PWA, que acompanha a MESMA
// tarefa automaticamente sem publicar uma segunda consulta cobrável.
// Mantemos cada requisição curta para não prender a Function. Caso a coleta
// ainda esteja na fila, o PWA continua consultando o MESMO task id.
const POLL_ATTEMPTS_PER_REQUEST = 3;
const POLL_INTERVAL_MS = 750;

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

function identifier(value: unknown) {
  if (typeof value === 'string') return value.trim();
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function amountInCents(value: unknown) {
  const amount = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(amount) && amount > 0 && amount < 1_000_000 ? Math.round(amount * 100) : null;
}

function priceFromListing(value: JsonRecord) {
  const details = record(value.price);
  // Merchant Products returns `price` directly. Product Info (sellers) returns
  // the current offer in `price.current`; regular is deliberately not used.
  const amount = amountInCents(value.price) ?? amountInCents(details.current);
  const currency = text(value.currency || details.currency).toUpperCase();
  return { amount, currency };
}

function normalizedWords(value: string) {
  return new Set(value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((word) => word.length >= 3));
}

function modelTokens(value: string) {
  return [...normalizedWords(value)].filter((word) => word.length >= 4 && /[a-z]/.test(word) && /\d/.test(word));
}

function productCodes(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return (normalized.match(/[a-z]*\d[a-z\d]*(?:[/-]\d[a-z\d]*)*/g) || [])
    .map((code) => code.replace(/[^a-z0-9]/g, ''))
    .filter((code) => code.length >= 4);
}

function compact(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titleMatchesProduct(title: string, productName: string, ean?: string | null) {
  const normalizedTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (ean && normalizedTitle.includes(ean)) return true;
  const wanted = normalizedWords(productName);
  const actual = normalizedWords(title);
  if (!wanted.size || !actual.size) return false;
  // Lojas e o próprio Google alternam, por exemplo, entre "69065/011" e
  // "69065011". O SKU é a evidência mais segura para títulos comerciais
  // encurtados e precisa sobreviver à remoção de pontuação.
  const compactTitle = compact(title);
  if (productCodes(productName).some((code) => compactTitle.includes(code))) return true;
  // Modelos como ME20B distinguem melhor produtos longos do que exigir que o
  // título de uma loja reproduza toda a descrição do catálogo Mercado Livre.
  if (modelTokens(productName).some((model) => actual.has(model))) return true;
  let matches = 0;
  for (const word of wanted) if (actual.has(word)) matches++;
  return matches / wanted.size >= (wanted.size >= 8 ? 0.45 : 0.6);
}

function productMatchScore(title: string, productName: string) {
  const wanted = normalizedWords(productName);
  const actual = normalizedWords(title);
  let score = 0;
  for (const word of wanted) if (actual.has(word)) score++;
  const compactTitle = compact(title);
  for (const code of productCodes(productName)) if (compactTitle.includes(code)) score += 100;
  for (const model of modelTokens(productName)) if (actual.has(model)) score += 100;
  return score;
}

function productReferenceFrom(payload: unknown, productName: string, ean?: string | null): GoogleShoppingProductReference | null {
  // A caixa mutável torna a atualização feita pelo visitante recursivo visível
  // ao analisador de fluxo do TypeScript usado pelo build do Next.js.
  const selected: { current: { value: GoogleShoppingProductReference; score: number } | null } = { current: null };
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const item = record(value);
    if (!Object.keys(item).length) return;
    const title = text(item.title);
    const productId = identifier(item.product_id) || null;
    const dataDocId = identifier(item.data_docid) || null;
    const gid = identifier(item.gid) || null;
    if (title && (productId || dataDocId || gid) && titleMatchesProduct(title, productName, ean)) {
      const candidate = {
        value: { productId, dataDocId, gid },
        score: productMatchScore(title, productName),
      };
      if (!selected.current || candidate.score > selected.current.score) selected.current = candidate;
    }
    for (const child of Object.values(item)) if (child && typeof child === 'object') visit(child);
  };
  visit(payload);
  return selected.current?.value || null;
}

function sellerIsAvailable(seller: JsonRecord) {
  const availability = text(seller.product_availability).toLowerCase();
  return !availability || availability === 'in_stock' || availability === 'limited_stock';
}

/**
 * Google Merchant uses a direct numeric `price` in product cards and
 * `price.current` in product-seller cards. We collect only active seller
 * offers for an identified product, never `price.regular` or delivery prices.
 */
export function extractGoogleShoppingPriceSample(payload: unknown, productName: string, ean?: string | null): GoogleShoppingPriceSample | null {
  const prices: number[] = [];
  const add = (item: JsonRecord) => {
    const { amount, currency } = priceFromListing(item);
    if (currency === 'BRL' && amount != null) prices.push(amount);
  };
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const item = record(value);
    if (!Object.keys(item).length) return;
    const title = text(item.title);
    const matches = title && titleMatchesProduct(title, productName, ean);
    if (matches) {
      add(item);
      const sellers = item.sellers;
      if (Array.isArray(sellers)) {
        for (const sellerValue of sellers) {
          const seller = record(sellerValue);
          if (sellerIsAvailable(seller)) add(seller);
        }
      }
    }
    for (const child of Object.values(item)) {
      if (child && typeof child === 'object') visit(child);
    }
  };
  visit(payload);
  const values = selectReferencePriceCents(prices);
  if (!values.length) return null;
  return {
    pricesInCents: values,
    count: values.length,
    minimum: values[0] / 100,
    maximum: values.at(-1)! / 100,
  };
}

/**
 * A tarefa `product_info` já foi criada a partir de uma ficha específica do
 * Google Shopping. Portanto, nesta etapa não devemos descartar os vendedores
 * porque o título resumido da ficha não repete integralmente o do Mercado
 * Livre: os preços pertencem à ficha escolhida na etapa anterior.
 */
export function extractGoogleShoppingSellerPriceSample(payload: unknown): GoogleShoppingPriceSample | null {
  const prices: number[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const item = record(value);
    if (!Object.keys(item).length) return;
    const sellers = item.sellers;
    if (Array.isArray(sellers)) {
      for (const sellerValue of sellers) {
        const seller = record(sellerValue);
        if (!sellerIsAvailable(seller)) continue;
        const { amount, currency } = priceFromListing(seller);
        if (currency === 'BRL' && amount != null) prices.push(amount);
      }
    }
    for (const child of Object.values(item)) if (child && typeof child === 'object') visit(child);
  };
  visit(payload);
  const values = selectReferencePriceCents(prices);
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
  const taskRecord = record(task);
  const status = Number(taskRecord.status_code);
  if (status === 40100 || status === 40301) {
    throw new MarketplaceError(503, 'price_provider_authorization', 'A credencial da consulta de preços não foi aceita. Atualize as credenciais de API do provedor.');
  }
  if (status === 40104) {
    throw new MarketplaceError(503, 'price_provider_account_verification', 'A conta do provedor de preços ainda precisa ser validada para realizar consultas.');
  }
  if (status === 40200 || status === 40201) {
    throw new MarketplaceError(503, 'price_provider_balance', 'A consulta de preços precisa de saldo disponível no provedor.');
  }
  if (status === 40202 || status === 40203 || status === 40205 || status === 40206) {
    throw new MarketplaceError(429, 'price_provider_limited', 'O limite de consultas de preços foi atingido. Aguarde alguns instantes antes de tentar novamente.');
  }
  // A leitura de uma tarefa recém-criada pode responder 40602 (Task In Queue)
  // antes de o Merchant API terminar a coleta. Esse é um estado transitório,
  // não uma recusa da credencial ou do produto: o loop abaixo deve aguardar e
  // consultar novamente o mesmo id, sem criar uma nova tarefa cobrável.
  const readingTask = path.includes('/task_get/advanced/');
  const pendingTask = readingTask && (status === 40601 || status === 40602);
  // 40102 significa que a pesquisa terminou sem resultados; 40106 conserva os
  // resultados parciais disponíveis. Ambos devem finalizar a tela com o estado
  // correto, não virar uma recusa genérica.
  const completedWithoutResults = readingTask && status === 40102;
  const completedWithPartialResults = readingTask && status === 40106 && Array.isArray(taskRecord.result);
  if (!task || (Number.isFinite(status) && status >= 40000 && !pendingTask && !completedWithoutResults && !completedWithPartialResults)) {
    if (status === 40101) throw new MarketplaceError(503, 'price_provider_search_unavailable', 'O Google Shopping não respondeu a esta consulta. Tente novamente em alguns instantes.');
    if (status === 40103) throw new MarketplaceError(503, 'price_provider_task_failed', 'O provedor não conseguiu concluir esta consulta de preços. Tente novamente em alguns instantes.');
    if (status === 40105) throw new MarketplaceError(503, 'price_provider_task_expired', 'Esta consulta de preços expirou. Faça uma nova consulta.');
    if (status === 40505 || status === 40506) throw new MarketplaceError(503, 'price_provider_request_invalid', 'A configuração da consulta de preços precisa ser atualizada. Tente novamente em alguns instantes.');
    if (status >= 50000) throw new MarketplaceError(503, 'price_provider_unavailable', 'O provedor de preços está indisponível no momento. Tente novamente em alguns instantes.');
    throw new MarketplaceError(503, 'price_provider_failed', `A consulta de preços foi recusada pelo provedor (código ${Number.isFinite(status) ? status : 'indisponível'}). Tente novamente.`);
  }
  return record(body);
}

function taskId(body: JsonRecord) {
  const id = text(tasksFrom(body)[0]?.id);
  if (!/^[0-9a-f-]{20,}$/i.test(id)) throw new MarketplaceError(503, 'price_provider_invalid_response', 'A consulta de preços retornou uma resposta incompleta. Tente novamente.');
  return id;
}

function validFallbackPrices(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const prices = value.filter((price): price is number => Number.isSafeInteger(price) && price > 0 && price < 100_000_000);
  return prices.length && prices.length === value.length ? selectReferencePriceCents(prices) : undefined;
}

function sampleFromPrices(prices: number[] | undefined) {
  const values = selectReferencePriceCents(prices || []);
  if (!values.length) return null;
  return {
    pricesInCents: values,
    count: values.length,
    minimum: values[0] / 100,
    maximum: values.at(-1)! / 100,
  } satisfies GoogleShoppingPriceSample;
}

function combinePriceSamples(...samples: Array<GoogleShoppingPriceSample | null>) {
  // A vitrine e a ficha detalhada podem repetir a mesma oferta. Unimos as
  // fontes sem duplicar valores idênticos e só depois selecionamos as cinco
  // menores. Assim, uma ficha com um único vendedor caro nunca substitui os
  // preços menores e válidos que o Google já exibiu na pesquisa do produto.
  const prices = [...new Set(samples.flatMap((sample) => sample?.pricesInCents || []))];
  return sampleFromPrices(prices);
}

function encodePendingLookup(value: PendingLookup) {
  // A continuação é posteriormente lacrada pela rota. Este envelope interno
  // conserva a amostra da vitrine enquanto a ficha de vendedores é processada,
  // evitando perder preços válidos quando o segundo endpoint volta vazio.
  return `v2.${Buffer.from(JSON.stringify({
    phase: value.phase,
    id: value.id,
    ...(value.fallbackPricesInCents?.length ? { fallbackPricesInCents: value.fallbackPricesInCents } : {}),
  })).toString('base64url')}`;
}

function pendingLookup(value: string | undefined): PendingLookup | null {
  if (!value) return null;
  if (/^v2\.[a-z0-9_-]{20,1200}$/i.test(value)) {
    try {
      const parsed = record(JSON.parse(Buffer.from(value.slice(3), 'base64url').toString('utf8')));
      const phase = text(parsed.phase).toLowerCase();
      const id = text(parsed.id);
      if ((phase !== 'products' && phase !== 'product_info') || !/^[0-9a-f-]{20,}$/i.test(id)) return null;
      const fallbackPricesInCents = validFallbackPrices(parsed.fallbackPricesInCents);
      return { phase, id, ...(fallbackPricesInCents ? { fallbackPricesInCents } : {}) };
    } catch {
      return null;
    }
  }
  const match = /^(products|product_info):([0-9a-f-]{20,})$/i.exec(value);
  if (match) return { phase: match[1].toLowerCase() as PendingLookup['phase'], id: match[2] };
  // Continuations emitted before this change were a bare products task id.
  return /^[0-9a-f-]{20,}$/i.test(value) ? { phase: 'products', id: value } : null;
}

function taskIsComplete(body: JsonRecord) {
  const task = tasksFrom(body)[0] || {};
  // `20000` significa que a tarefa terminou, inclusive quando o Google não
  // encontrou itens e devolve `result: []`. Antes esse caso era confundido com
  // fila e o cliente permanecia em “Calculando” indefinidamente.
  return Number(task.status_code) === 20000 || Number(task.status_code) === 40102 || Array.isArray(task.result);
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function postGoogleShoppingPriceLookup(input: { ean: string | null; productName: string }) {
  // O EAN serve para identificar com precisão a ficha no Mercado Livre. O
  // Google Shopping não o interpreta de forma confiável como uma pesquisa de
  // produto e pode devolver uma vitrine de itens aleatórios. A consulta de
  // preço usa o título já confirmado da ficha; o EAN continua na validação das
  // ofertas quando estiver presente no resultado.
  const keyword = text(input.productName) || text(input.ean);
  if (!keyword) throw new MarketplaceError(400, 'invalid_price_query', 'Não foi possível determinar o produto para consultar preços.');
  const posted = await providerRequest('/v3/merchant/google/products/task_post', {
    method: 'POST',
    // `udm=28` usa a vitrine atual do Google Shopping — a mesma exibida na
    // pesquisa pública — e retorna até 40 cards no primeiro lote. A ordem não
    // precisa vir do Google: filtramos o produto e selecionamos localmente as
    // cinco menores ofertas válidas, sem perder carrosséis patrocinados.
    body: JSON.stringify([{ keyword, location_name: 'Brazil', language_code: 'pt', depth: 40, search_param: '&udm=28' }]),
  });
  return taskId(posted);
}

async function postGoogleShoppingProductInfoLookup(reference: GoogleShoppingProductReference) {
  const posted = await providerRequest('/v3/merchant/google/product_info/task_post', {
    method: 'POST',
    body: JSON.stringify([{
      location_name: 'Brazil',
      language_code: 'pt',
      ...(reference.productId ? { product_id: reference.productId } : {}),
      ...(reference.dataDocId ? { data_docid: reference.dataDocId } : {}),
      ...(reference.gid ? { gid: reference.gid } : {}),
    }]),
  });
  return taskId(posted);
}

async function readGoogleShoppingPriceLookup(lookup: PendingLookup, input: { ean: string | null; productName: string }): Promise<GoogleShoppingPriceLookup> {
  const endpoint = lookup.phase === 'product_info' ? 'product_info' : 'products';
  const result = await providerRequest(`/v3/merchant/google/${endpoint}/task_get/advanced/${encodeURIComponent(lookup.id)}`, { method: 'GET' });
  if (!taskIsComplete(result)) return { status: 'pending', taskId: encodePendingLookup(lookup) };
  if (lookup.phase === 'products') {
    const productSample = extractGoogleShoppingPriceSample(result, input.productName, input.ean);
    const reference = productReferenceFrom(result, input.productName, input.ean);
    // If Google does not expose an individual product id, retain the useful
    // product-card sample rather than inventing a seller-level result.
    if (!reference) return { status: 'completed', sample: productSample };
    const productInfoTaskId = await postGoogleShoppingProductInfoLookup(reference);
    return {
      status: 'pending',
      taskId: encodePendingLookup({
        phase: 'product_info',
        id: productInfoTaskId,
        ...(productSample ? { fallbackPricesInCents: productSample.pricesInCents } : {}),
      }),
    };
  }
  const sellerSample = extractGoogleShoppingSellerPriceSample(result);
  return {
    status: 'completed',
    sample: combinePriceSamples(sampleFromPrices(lookup.fallbackPricesInCents), sellerSample),
  };
}

export async function consultGoogleShoppingPrices(
  input: { ean: string | null; productName: string },
  pendingTaskId?: string,
): Promise<GoogleShoppingPriceLookup> {
  let lookup = pendingLookup(pendingTaskId) || { phase: 'products' as const, id: await postGoogleShoppingPriceLookup(input) };
  for (let attempt = 0; attempt < POLL_ATTEMPTS_PER_REQUEST; attempt++) {
    await wait(POLL_INTERVAL_MS);
    const result = await readGoogleShoppingPriceLookup(lookup, input);
    if (result.status === 'completed') return result;
    const next = pendingLookup(result.taskId);
    if (!next) throw new MarketplaceError(503, 'price_provider_invalid_response', 'A consulta de preços retornou uma resposta incompleta. Tente novamente.');
    lookup = next;
  }
  return { status: 'pending', taskId: encodePendingLookup(lookup) };
}
