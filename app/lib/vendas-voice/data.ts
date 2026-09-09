import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  VoiceConfirmationAction,
  VoiceEntityCandidate,
  VoiceEntitySelection,
  VoiceIntentPayload,
  VoiceMetrics,
  VoiceProcessResponse,
  VoiceResolvedItem,
} from './types';
import { normalizeVoiceSearch } from './validation.mjs';

type CustomerRow = {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  observacoes?: string | null;
  endereco?: Record<string, unknown> | string | null;
  ativo?: boolean | null;
};

type ProductRow = {
  id: string;
  nome: string;
  sku?: string | null;
  marca?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  preco?: number | string | null;
  preco_custo?: number | string | null;
  ativo?: boolean | null;
};

const STOP_WORDS = new Set(['a', 'o', 'as', 'os', 'da', 'de', 'do', 'das', 'dos', 'para', 'um', 'uma', 'cliente', 'produto']);
const PRODUCT_GENERIC_TOKENS = new Set(['kit', 'progressiva', 'redutor', 'organico', 'organica', 'shampoo', 'mascara', 'oxidante', 'tintura', 'creme', 'tratamento']);
const PRODUCT_CATALOG_CACHE_TTL_MS = 30_000;
const productCatalogCache = new Map<string, { expiresAt: number; rows: ProductRow[] }>();
const productCatalogRequests = new Map<string, Promise<ProductRow[]>>();
const LEGACY_CUSTOMER_NOTE = /^Importado de tridium_mysql_20260715; cliente legado #\d+(?:; profissão: .+)?\.$/i;

function visibleCustomerNote(value: unknown) {
  const note = String(value || '').trim();
  return note && !LEGACY_CUSTOMER_NOTE.test(note) ? note.slice(0, 70) : '';
}

function searchTokens(reference: string) {
  return normalizeVoiceSearch(reference).split(' ').filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function safeSearchTokens(reference: string, maximum = 4) {
  const tokens = String(reference || '').toLocaleLowerCase('pt-BR').match(/[\p{L}\p{N}]+/gu) || [];
  return [...new Set(tokens
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 48))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(normalizeVoiceSearch(token))))]
    .slice(0, maximum);
}

function phoneticVoiceToken(value: string) {
  return normalizeVoiceSearch(value)
    .replace(/ph/g, 'f')
    .replace(/([a-z])\1+/g, '$1');
}

// A consulta ao banco também precisa sobreviver a pequenas trocas de dicção da
// transcrição. As variantes continuam sendo apenas filtros para obter poucos
// candidatos reais; a escolha final passa pelo score e, quando necessário,
// pela confirmação da pessoa.
function productSearchVariants(reference: string) {
  const variants = new Set<string>();
  for (const token of safeSearchTokens(reference, 5)) {
    const normalized = normalizeVoiceSearch(token);
    const phonetic = phoneticVoiceToken(token);
    [normalized, phonetic].filter((value) => value.length >= 3).forEach((value) => variants.add(value));
    // Prefixo curto absorve letras duplicadas comuns em marcas (Paladin /
    // Palladium). Ele só amplia a busca de candidatos; nunca confirma sozinho.
    if (phonetic.length >= 5) variants.add(phonetic.slice(0, 3));
  }
  return [...variants].slice(0, 8);
}

// Clientes também sofrem com vogais, letras dobradas e pequenas perdas da
// transcrição (por exemplo, Damilles/Damiles). As variantes servem somente para
// trazer uma lista curta da conta ativa; o score abaixo continua responsável por
// confirmar um resultado evidente ou pedir que a pessoa escolha.
function customerSearchVariants(reference: string) {
  const variants = new Set<string>();
  for (const token of safeSearchTokens(reference, 4)) {
    const normalized = normalizeVoiceSearch(token);
    const phonetic = phoneticVoiceToken(token);
    [normalized, phonetic].filter((value) => value.length >= 3).forEach((value) => variants.add(value));
    if (phonetic.length >= 5) variants.add(phonetic.slice(0, 4));
  }
  return [...variants].slice(0, 8);
}

function score(reference: string, fields: unknown[]) {
  const query = normalizeVoiceSearch(reference);
  const values = fields.map(normalizeVoiceSearch).filter(Boolean);
  const combined = values.join(' ');
  const tokens = searchTokens(reference);
  if (!query || !combined) return 0;
  if (values.some((value) => value === query)) return 120;
  if (values.some((value) => value.startsWith(query))) return 95;
  if (combined.includes(query)) return 85;
  const covered = tokens.filter((token) => combined.includes(token)).length;
  return covered ? Math.round((covered / Math.max(1, tokens.length)) * 70) : 0;
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function tokenSimilarity(left: string, right: string) {
  const longest = Math.max(left.length, right.length);
  return longest ? 1 - editDistance(left, right) / longest : 0;
}

// A transcrição de voz costuma preservar o início do nome comercial, mas pode
// trocar ou omitir parte do final (por exemplo, "Paladin" por "Palladium").
// Jaro-Winkler valoriza esse prefixo comum sem transformar a referência falada
// em uma resposta da IA nem escolher um produto fora do catálogo da conta.
function jaroWinklerSimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const distance = Math.max(Math.floor(Math.max(left.length, right.length) / 2) - 1, 0);
  const leftMatches = new Array(left.length).fill(false);
  const rightMatches = new Array(right.length).fill(false);
  let matches = 0;
  for (let index = 0; index < left.length; index += 1) {
    const start = Math.max(0, index - distance);
    const end = Math.min(index + distance + 1, right.length);
    for (let candidate = start; candidate < end; candidate += 1) {
      if (!rightMatches[candidate] && left[index] === right[candidate]) {
        leftMatches[index] = true; rightMatches[candidate] = true; matches += 1; break;
      }
    }
  }
  if (!matches) return 0;
  let transpositions = 0;
  for (let leftIndex = 0, rightIndex = 0; leftIndex < left.length; leftIndex += 1) {
    if (!leftMatches[leftIndex]) continue;
    while (!rightMatches[rightIndex]) rightIndex += 1;
    if (left[leftIndex] !== right[rightIndex]) transpositions += 1;
    rightIndex += 1;
  }
  const jaro = (matches / left.length + matches / right.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < Math.min(4, left.length, right.length) && left[prefix] === right[prefix]) prefix += 1;
  return jaro + prefix * .1 * (1 - jaro);
}

function voiceTokenSimilarity(left: string, right: string) {
  return Math.max(tokenSimilarity(left, right), jaroWinklerSimilarity(left, right));
}

// Palavras adicionais no cadastro não devem quebrar uma descrição humana mais
// curta. Assim, "kit cabelos normais" casa com "kit home care cabelos normais"
// e "triliss orgânica" casa com "triliss redutor orgânico" mantendo a ordem e
// exigindo que todos os termos falados estejam representados.
function orderedTokenCoverage(queryTokens: string[], candidateTokens: string[]) {
  if (!queryTokens.length || !candidateTokens.length) return 0;
  let cursor = 0;
  let total = 0;
  for (const queryToken of queryTokens) {
    let bestIndex = -1;
    let bestSimilarity = 0;
    for (let index = cursor; index < candidateTokens.length; index += 1) {
      const similarity = voiceTokenSimilarity(queryToken, candidateTokens[index]);
      if (similarity > bestSimilarity) { bestIndex = index; bestSimilarity = similarity; }
      if (similarity >= .98) break;
    }
    if (bestIndex < 0 || bestSimilarity < .78) return 0;
    cursor = bestIndex + 1;
    total += bestSimilarity;
  }
  return total / queryTokens.length;
}

function productScore(reference: string, product: ProductRow) {
  const fields = [product.nome, product.sku, product.marca, product.categoria, product.descricao];
  const base = score(reference, fields);
  const queryTokens = searchTokens(reference).filter((token) => token.length >= 4);
  const normalizedName = normalizeVoiceSearch(product.nome);
  const nameTokens = searchTokens(product.nome);
  const fieldTokens = fields.flatMap((field) => searchTokens(String(field || '')));
  if (queryTokens.includes(normalizedName)) return Math.max(base, 116);
  const exactNameMatches = queryTokens.filter((token) => nameTokens.includes(token)).length;
  const exactNameScore = exactNameMatches
    ? 70 + Math.round(exactNameMatches / Math.max(1, queryTokens.length) * 20)
    : 0;
  const similarities = queryTokens.map((queryToken) => fieldTokens
    .reduce((best, fieldToken) => Math.max(best, voiceTokenSimilarity(queryToken, fieldToken)), 0));
  const strongMatches = similarities.filter((similarity) => similarity >= .72).length;
  const averageSimilarity = similarities.length
    ? similarities.reduce((sum, similarity) => sum + similarity, 0) / similarities.length
    : 0;
  const fuzzyScore = strongMatches === queryTokens.length && queryTokens.length
    ? Math.round(96 + averageSimilarity * 12)
    : strongMatches
      ? Math.round(38 + averageSimilarity * 42)
      : 0;
  const spokenTokens = searchTokens(reference).filter((token) => token.length >= 3);
  const orderedCoverage = orderedTokenCoverage(spokenTokens, nameTokens);
  const orderedScore = orderedCoverage >= .78 ? Math.round(112 + orderedCoverage * 12) : 0;
  const descriptiveTokens = spokenTokens.filter((token) => !PRODUCT_GENERIC_TOKENS.has(token) && token !== 'que');
  const descriptiveCoverage = orderedTokenCoverage(descriptiveTokens, nameTokens);
  const descriptiveScore = descriptiveTokens.length && descriptiveCoverage >= .78
    ? Math.round(100 + descriptiveCoverage * 14)
    : 0;
  return Math.max(base, exactNameScore, fuzzyScore, orderedScore, descriptiveScore);
}

// Um único termo genérico, como “orgânico”, não é motivo para sugerir produtos
// sem relação com a marca ou o nome principal falado. O catálogo continua
// aberto para busca manual, mas as sugestões por voz precisam ter evidência
// suficiente para não desviar a pessoa para uma lista sem sentido.
function isRelevantProductCandidate(reference: string, product: ProductRow, scoreValue: number) {
  if (scoreValue >= 92) return true;
  const queryTokens = searchTokens(reference).filter((token) => token.length >= 3);
  const fieldTokens = [product.nome, product.sku, product.marca, product.categoria, product.descricao]
    .flatMap((field) => searchTokens(String(field || '')));
  if (!queryTokens.length || !fieldTokens.length || scoreValue < 58) return false;
  const matches = queryTokens.map((queryToken) => fieldTokens.reduce(
    (best, fieldToken) => Math.max(best, voiceTokenSimilarity(queryToken, fieldToken)),
    0,
  ));
  const strong = matches.filter((similarity) => similarity >= .78).length;
  // Uma marca/nome comercial muito próximo ainda é evidência suficiente quando
  // o outro termo é somente o tipo humano do produto ("Progressiva Paladin"
  // para "Palladium"). A exigência alta evita que "orgânico" sozinho passe.
  const namedVeryStrong = queryTokens.some((token, index) => !PRODUCT_GENERIC_TOKENS.has(token) && matches[index] >= .9);
  const namedApproximation = queryTokens.some((token, index) => token.length >= 5
    && !PRODUCT_GENERIC_TOKENS.has(token) && matches[index] >= .72);
  return queryTokens.length === 1 ? strong === 1 : strong >= 2 || namedVeryStrong || namedApproximation;
}

function productCandidate(row: ProductRow): VoiceEntityCandidate {
  return {
    id: row.id,
    label: row.nome,
    detail: [row.sku ? `SKU ${row.sku}` : '', row.marca, row.categoria, formatMoney(Number(row.preco || 0))].filter(Boolean).join(' · '),
  };
}

async function fetchActiveProducts(db: SupabaseClient, accountId: string, maximum = 1500) {
  const key = `${accountId}:${maximum}`;
  const cached = productCatalogCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  const inFlight = productCatalogRequests.get(key);
  if (inFlight) return inFlight;
  const load = async () => {
    const rows: ProductRow[] = [];
    const pageSize = 500;
    const readPage = async (from: number) => {
      const { data, error } = await db.from('vendas_mobile_produtos')
        .select('id,nome,sku,marca,categoria,descricao,preco,preco_custo,ativo')
        .eq('conta_id', accountId)
        .eq('ativo', true)
        .order('nome')
        .range(from, Math.min(from + pageSize - 1, maximum - 1));
      if (error) throw new Error('Não foi possível pesquisar sugestões no catálogo.');
      return data as ProductRow[] || [];
    };
    const first = await readPage(0);
    rows.push(...first);
    // A busca aprofundada só acontece para aproximações que não puderam ser
    // resolvidas pela consulta curta. A primeira página atende a maior parte
    // das contas; nas maiores, as páginas restantes viajam em paralelo.
    if (first.length === pageSize && maximum > pageSize) {
      const starts = [pageSize, pageSize * 2].filter((from) => from < maximum);
      const pages = await Promise.all(starts.map(readPage));
      pages.forEach((page) => rows.push(...page));
    }
    productCatalogCache.set(key, { expiresAt: Date.now() + PRODUCT_CATALOG_CACHE_TTL_MS, rows });
    if (productCatalogCache.size > 16) productCatalogCache.delete(productCatalogCache.keys().next().value!);
    return rows;
  };
  const request = load();
  productCatalogRequests.set(key, request);
  try { return await request; }
  finally { productCatalogRequests.delete(key); }
}

export async function listVoiceCatalogProducts(db: SupabaseClient, accountId: string, query = '', offset = 0, limit = 40) {
  const safeLimit = Math.max(1, Math.min(60, Math.floor(limit) || 40));
  const safeOffset = Math.max(0, Math.floor(offset) || 0);
  const normalized = normalizeVoiceSearch(query);
  if (normalized) {
    const products = await fetchActiveProducts(db, accountId);
    const ranked = products
      .map((row) => ({ row, score: productScore(normalized, row) }))
      .filter((entry) => isRelevantProductCandidate(normalized, entry.row, entry.score))
      .sort((left, right) => right.score - left.score || left.row.nome.localeCompare(right.row.nome, 'pt-BR'));
    const page = ranked.slice(safeOffset, safeOffset + safeLimit);
    return { products: page.map(({ row }) => productCandidate(row)), hasMore: ranked.length > safeOffset + safeLimit };
  }
  let request = db.from('vendas_mobile_produtos')
    .select('id,nome,sku,marca,categoria,descricao,preco,preco_custo,ativo')
    .eq('conta_id', accountId)
    .eq('ativo', true)
    .order('nome');
  const { data, error } = await request.range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw new Error('Não foi possível abrir o catálogo de produtos.');
  const ranked = (data as ProductRow[] || [])
    .map((row) => ({ row, score: 0 }))
    .sort((left, right) => left.row.nome.localeCompare(right.row.nome, 'pt-BR'));
  return { products: ranked.map(({ row }) => productCandidate(row)), hasMore: (data || []).length === safeLimit };
}

function customerScore(reference: string, customer: CustomerRow) {
  const fields = customerFields(customer);
  const base = score(reference, fields);
  const queryTokens = searchTokens(reference).filter((token) => token.length >= 3);
  const fieldTokens = fields.flatMap((field) => searchTokens(String(field || '')));
  if (!queryTokens.length || !fieldTokens.length) return base;
  const similarities = queryTokens.map((queryToken) => fieldTokens
    .reduce((best, fieldToken) => Math.max(best, voiceTokenSimilarity(queryToken, fieldToken)), 0));
  const strongMatches = similarities.filter((similarity) => similarity >= .82).length;
  const averageSimilarity = similarities.reduce((sum, similarity) => sum + similarity, 0) / similarities.length;
  const fuzzyScore = strongMatches === queryTokens.length
    ? Math.round(74 + averageSimilarity * 36)
    : strongMatches
      ? Math.round(30 + averageSimilarity * 42)
      : 0;
  return Math.max(base, fuzzyScore);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? 'data não informada' : new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatAppointmentDate(value: string, time: string | null) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const label = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  return time ? `${label}, ${time}` : label;
}

function customerFields(customer: CustomerRow) {
  const address = customer.endereco && typeof customer.endereco === 'object' ? customer.endereco : {};
  return [customer.nome, customer.telefone, customer.email, visibleCustomerNote(customer.observacoes), customer.endereco, ...Object.values(address)];
}

async function customerLastOrders(db: SupabaseClient, accountId: string, customerIds: string[]) {
  if (!customerIds.length) return new Map<string, { criado_em?: string; total?: number }>();
  const { data } = await db.from('vendas_mobile_pedidos')
    .select('cliente_id,criado_em,total,status')
    .eq('conta_id', accountId)
    .in('cliente_id', customerIds)
    .neq('status', 'cancelada')
    .order('criado_em', { ascending: false })
    .limit(60);
  const map = new Map<string, { criado_em?: string; total?: number }>();
  for (const order of data || []) {
    if (order.cliente_id && !map.has(order.cliente_id)) map.set(order.cliente_id, order);
  }
  return map;
}

async function customerCurrentBalances(db: SupabaseClient, accountId: string, customerIds: string[]) {
  const balances = new Map(customerIds.map((customerId) => [customerId, { debts: 0, credits: 0 }]));
  if (!customerIds.length) return new Map<string, number>();
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from('vendas_mobile_pedidos')
      .select('cliente_id,status,total,forma_pagamento')
      .eq('conta_id', accountId).in('cliente_id', customerIds)
      .range(from, from + 499);
    if (error) throw new Error('Não foi possível consultar os saldos dos clientes.');
    for (const order of data || []) {
      const balance = balances.get(String(order.cliente_id || ''));
      if (balance && order.status !== 'cancelada' && orderCreatesDebt(order)) balance.debts += Number(order.total || 0);
    }
    if ((data || []).length < 500) break;
  }
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from('vendas_mobile_pagamentos')
      .select('cliente_id,valor,desconto')
      .eq('conta_id', accountId).in('cliente_id', customerIds)
      .range(from, from + 499);
    if (error) throw new Error('Não foi possível consultar os saldos dos clientes.');
    for (const payment of data || []) {
      const balance = balances.get(String(payment.cliente_id || ''));
      if (balance) balance.credits += Number(payment.valor || 0) + Number(payment.desconto || 0);
    }
    if ((data || []).length < 500) break;
  }
  return new Map([...balances].map(([customerId, balance]) => [customerId, Math.max(0, balance.debts - balance.credits)]));
}

export async function resolveCustomer(db: SupabaseClient, accountId: string, reference: string, selectedId = '', detailMode: 'default' | 'payment' = 'default') {
  const variants = customerSearchVariants(reference);
  if (!variants.length) return { status: 'missing' as const, candidates: [] as VoiceEntityCandidate[] };
  const fields = ['nome', 'observacoes', 'email', 'telefone'];
  const expression = variants.flatMap((token) => fields.map((field) => `${field}.ilike.%${token}%`)).join(',');
  const { data, error } = await db.from('vendas_mobile_clientes')
    .select('id,nome,telefone,email,observacoes,endereco,ativo')
    .eq('conta_id', accountId)
    .eq('ativo', true)
    .or(expression)
    .limit(24);
  if (error) throw new Error('Não foi possível pesquisar clientes.');
  const ranked = (data as CustomerRow[] || [])
    .map((row) => ({ row, score: customerScore(reference, row) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.row.nome.localeCompare(b.row.nome, 'pt-BR'));
  const customerIds = ranked.slice(0, 6).map(({ row }) => row.id);
  const lastOrders = detailMode === 'payment' ? new Map() : await customerLastOrders(db, accountId, customerIds);
  const balances = detailMode === 'payment' ? await customerCurrentBalances(db, accountId, customerIds) : new Map();
  const candidates = ranked.slice(0, 4).map(({ row }) => {
    const address = row.endereco && typeof row.endereco === 'object' ? row.endereco : {};
    const place = [address.cidade, address.bairro, address.complemento].filter(Boolean).join(' · ');
    const lastOrder = lastOrders.get(row.id);
    const details = [
      place,
      visibleCustomerNote(row.observacoes),
      detailMode === 'payment'
        ? `Saldo devedor atual: ${formatMoney(Number(balances.get(row.id) || 0))}`
        : lastOrder ? `Último pedido: ${formatDate(lastOrder.criado_em)} · ${formatMoney(Number(lastOrder.total || 0))}` : 'Sem pedido anterior',
    ].filter(Boolean);
    return { id: row.id, label: row.nome, detail: details.join(' · ') };
  });
  if (!ranked.length) return { status: 'missing' as const, candidates };
  const selected = selectedId && candidates.some((candidate) => candidate.id === selectedId)
    ? ranked.find(({ row }) => row.id === selectedId)?.row
    : null;
  if (selected) return { status: 'resolved' as const, customer: selected, candidates };
  const tokenCount = searchTokens(reference).length;
  const clearWinner = ranked.length === 1 || (tokenCount >= 2 && ranked[0].score >= 85 && ranked[0].score - (ranked[1]?.score || 0) >= 15);
  return clearWinner
    ? { status: 'resolved' as const, customer: ranked[0].row, candidates }
    : { status: 'ambiguous' as const, candidates };
}

export async function resolveProduct(db: SupabaseClient, accountId: string, reference: string, selectedId = '') {
  const variants = productSearchVariants(reference);
  if (!variants.length) return { status: 'missing' as const, candidates: [] as VoiceEntityCandidate[] };
  const fields = ['nome', 'sku', 'marca', 'categoria', 'descricao'];
  const expression = variants.flatMap((token) => fields.map((field) => `${field}.ilike.%${token}%`)).join(',');
  let { data, error } = await db.from('vendas_mobile_produtos')
    .select('id,nome,sku,marca,categoria,descricao,preco,preco_custo,ativo')
    .eq('conta_id', accountId)
    .eq('ativo', true)
    .or(expression)
    .limit(24);
  if (error) throw new Error('Não foi possível pesquisar produtos.');
  const rank = (rows: ProductRow[]) => rows
    .map((row) => ({ row, score: productScore(reference, row) }))
    .filter((entry) => isRelevantProductCandidate(reference, entry.row, entry.score))
    .sort((a, b) => b.score - a.score || a.row.nome.localeCompare(b.row.nome, 'pt-BR'));
  let ranked = rank(data as ProductRow[] || []);
  // Quando o filtro inicial do banco não devolve uma correspondência clara,
  // percorremos o catálogo real da conta no servidor. Isso melhora abreviações,
  // grafias próximas e sinônimos sem enviar uma lista extensa para a IA.
  if (!ranked.length || ranked[0].score < 92) {
    const allProducts = await fetchActiveProducts(db, accountId);
    const byId = new Map<string, ProductRow>([...(data as ProductRow[] || []), ...allProducts].map((row) => [row.id, row]));
    ranked = rank([...byId.values()]);
  }
  const candidates = ranked.slice(0, 8).map(({ row }) => productCandidate(row));
  if (!ranked.length) return { status: 'missing' as const, candidates };
  const selected = selectedId && candidates.some((candidate) => candidate.id === selectedId)
    ? ranked.find(({ row }) => row.id === selectedId)?.row
    : null;
  if (selected) return { status: 'resolved' as const, product: selected, candidates };
  const tokenCount = searchTokens(reference).length;
  const clearWinner = ranked.length === 1
    || (ranked[0].score === 120 && (ranked[1]?.score || 0) < 100)
    || (ranked[0].score >= 122 && (ranked[1]?.score || 0) < 118)
    || (tokenCount >= 2 && ranked[0].score >= 85 && ranked[0].score - (ranked[1]?.score || 0) >= 15);
  return clearWinner
    ? { status: 'resolved' as const, product: ranked[0].row, candidates }
    : { status: 'ambiguous' as const, candidates };
}

async function fetchCustomerOrders(db: SupabaseClient, accountId: string, customerId: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from('vendas_mobile_pedidos')
      .select('id,status,total,forma_pagamento,criado_em,itens:vendas_mobile_pedido_itens(produto_nome,quantidade,total,desconto,preco_unitario)')
      .eq('conta_id', accountId).eq('cliente_id', customerId)
      .order('criado_em', { ascending: false }).range(from, from + 499);
    if (error) throw new Error('Não foi possível consultar os pedidos do cliente.');
    rows.push(...(data || []));
    if ((data || []).length < 500) break;
  }
  return rows;
}

async function fetchCustomerPayments(db: SupabaseClient, accountId: string, customerId: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from('vendas_mobile_pagamentos')
      .select('id,valor,desconto,data_pagamento,criado_em')
      .eq('conta_id', accountId).eq('cliente_id', customerId)
      .order('data_pagamento', { ascending: false }).range(from, from + 499);
    if (error) throw new Error('Não foi possível consultar os pagamentos do cliente.');
    rows.push(...(data || []));
    if ((data || []).length < 500) break;
  }
  return rows;
}

function orderCreatesDebt(order: Record<string, unknown>) {
  const method = normalizeVoiceSearch(order.forma_pagamento);
  return !method.includes('consign') && (!method || method === 'venda' || method.includes('a prazo'));
}

export async function customerBalance(db: SupabaseClient, accountId: string, customerId: string) {
  const [orders, payments] = await Promise.all([
    fetchCustomerOrders(db, accountId, customerId),
    fetchCustomerPayments(db, accountId, customerId),
  ]);
  const debts = orders.filter((order) => order.status !== 'cancelada' && orderCreatesDebt(order))
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const credits = payments.reduce((sum, payment) => sum + Number(payment.valor || 0) + Number(payment.desconto || 0), 0);
  return { balance: Math.max(0, debts - credits), credit: Math.max(0, credits - debts), orders, payments };
}

function clarification(
  draft: VoiceIntentPayload,
  transcription: string,
  metrics: VoiceMetrics,
  question: string,
  candidates: VoiceEntityCandidate[] = [],
  entity: Omit<VoiceEntitySelection, 'id'> | null = null,
  selections: VoiceEntitySelection[] = [],
): VoiceProcessResponse {
  return { kind: 'clarification', question, candidates, entity, selections, draft, transcription, metrics };
}

function selectedEntityId(selections: VoiceEntitySelection[], type: VoiceEntitySelection['type'], reference: string) {
  const normalizedReference = normalizeVoiceSearch(reference);
  return selections.find((selection) => selection.type === type
    && normalizeVoiceSearch(selection.reference) === normalizedReference)?.id || '';
}

async function resolveRequiredCustomer(
  db: SupabaseClient,
  accountId: string,
  draft: VoiceIntentPayload,
  transcription: string,
  metrics: VoiceMetrics,
  selections: VoiceEntitySelection[],
) {
  if (!draft.customerReference) return { response: clarification(draft, transcription, metrics, 'Para qual cliente?', [], null, selections) };
  const selectedId = selectedEntityId(selections, 'customer', draft.customerReference);
  const result = await resolveCustomer(db, accountId, draft.customerReference, selectedId, draft.intent === 'register_payment' ? 'payment' : 'default');
  const entity = { type: 'customer' as const, reference: draft.customerReference };
  if (result.status === 'missing') return { response: clarification(draft, transcription, metrics, `Não encontrei “${draft.customerReference}”. Pode dizer o nome de outra forma?`, [], entity, selections) };
  if (result.status === 'ambiguous') return { response: clarification(draft, transcription, metrics, `Encontrei mais de um cliente para “${draft.customerReference}”. Qual deles?`, result.candidates, entity, selections) };
  return { customer: result.customer };
}

function periodRange(period: VoiceIntentPayload['period']) {
  if (period === 'all') return null;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const [year, month] = today.split('-').map(Number);
  if (period === 'today') return { start: `${today}T00:00:00-03:00`, end: `${today}T23:59:59.999-03:00` };
  const selected = period === 'last_month' ? new Date(year, month - 2, 1) : new Date(year, month - 1, 1);
  const next = new Date(selected.getFullYear(), selected.getMonth() + 1, 1);
  const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-01T00:00:00-03:00`;
  return { start: date(selected), end: date(next) };
}

export async function buildVoiceResponse(args: {
  db: SupabaseClient;
  accountId: string;
  draft: VoiceIntentPayload;
  transcription: string;
  metrics: VoiceMetrics;
  selections?: VoiceEntitySelection[];
}): Promise<VoiceProcessResponse> {
  const { db, accountId, draft, transcription, metrics, selections = [] } = args;
  if (draft.intent === 'unsupported') {
    return { kind: 'unsupported', title: 'Comando ainda não disponível', message: draft.unsupportedReason || 'Essa ação ainda não está disponível por voz neste laboratório.', selections, draft, transcription, metrics };
  }

  if (draft.intent === 'query_sales') {
    const period = draft.period || 'this_month';
    const range = periodRange(period);
    let query = db.from('vendas_mobile_pedidos').select('id,total,status,forma_pagamento,itens:vendas_mobile_pedido_itens(total,desconto,preco_unitario,quantidade)').eq('conta_id', accountId);
    if (range) query = query.gte('criado_em', range.start).lt('criado_em', range.end);
    const { data, error } = await query.order('criado_em', { ascending: false });
    if (error) throw new Error('Não foi possível consultar as vendas.');
    const sales = (data || []).filter((order) => order.status !== 'cancelada' && !normalizeVoiceSearch(order.forma_pagamento).includes('consign') && Number(order.total || 0) > 0);
    const total = sales.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const labels = { today: 'hoje', this_month: 'neste mês', last_month: 'no mês passado', all: 'em todo o histórico' } as const;
    return { kind: 'answer', title: 'Consulta concluída', message: `Você registrou ${sales.length} pedido${sales.length === 1 ? '' : 's'} ${labels[period]}, totalizando ${formatMoney(total)}.`, selections, draft, transcription, metrics };
  }

  const customerResult = await resolveRequiredCustomer(db, accountId, draft, transcription, metrics, selections);
  if (customerResult.response) return customerResult.response;
  const customer = customerResult.customer as CustomerRow;

  if (draft.intent === 'query_customer_history') {
    const financial = await customerBalance(db, accountId, customer.id);
    const lastOrder = financial.orders[0];
    const itemNames = Array.isArray(lastOrder?.itens)
      ? (lastOrder.itens as Array<Record<string, unknown>>).slice(0, 3).map((item) => `${Number(item.quantidade || 0)}× ${item.produto_nome}`).join(', ')
      : '';
    const lastOrderText = lastOrder
      ? `Último pedido em ${formatDate(lastOrder.criado_em)}, no valor de ${formatMoney(Number(lastOrder.total || 0))}${itemNames ? ` (${itemNames})` : ''}.`
      : 'Não há pedidos registrados para este cliente.';
    const balanceText = financial.credit > 0 ? `Crédito atual: ${formatMoney(financial.credit)}.` : `Saldo pendente: ${formatMoney(financial.balance)}.`;
    return { kind: 'answer', title: customer.nome, message: `${lastOrderText} ${balanceText}`, selections, draft, transcription, metrics };
  }

  if (draft.intent === 'register_payment') {
    if (!draft.amount) return clarification(draft, transcription, metrics, `Qual é o valor do pagamento de ${customer.nome}?`, [], null, selections);
    if (!draft.paymentMethod) return clarification(
      draft,
      transcription,
      metrics,
      'Confirme a forma de pagamento.',
      ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Outro']
        .map((label) => ({ id: '', label, detail: '' })),
      null,
      selections,
    );
    const financial = await customerBalance(db, accountId, customer.id);
    const action: VoiceConfirmationAction = {
      operationId: crypto.randomUUID(), intent: 'register_payment', accountId,
      customerId: customer.id, customerName: customer.nome, items: [], amount: draft.amount,
      expectedTotal: null, expectedBalance: financial.balance, paymentMethod: draft.paymentMethod,
      paymentDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    };
    return { kind: 'confirmation', title: 'Registrar pagamento', message: `Cliente: ${customer.nome}\nValor: ${formatMoney(draft.amount)}\nForma: ${draft.paymentMethod}\nSaldo anterior: ${formatMoney(financial.balance)}\nSaldo após pagamento: ${formatMoney(Math.max(0, financial.balance - draft.amount))}`, action, selections, draft, transcription, metrics };
  }

  if (draft.intent === 'create_appointment') {
    if (!draft.scheduledDate) return clarification(draft, transcription, metrics, `Para qual dia devemos agendar ${customer.nome}?`, [], null, selections);
    const appointmentType = draft.appointmentType || 'Visita';
    const action: VoiceConfirmationAction = {
      operationId: crypto.randomUUID(), intent: 'create_appointment', accountId,
      customerId: customer.id, customerName: customer.nome, items: [], amount: null,
      expectedTotal: null, expectedBalance: null, paymentMethod: '', paymentDate: null,
      scheduledDate: draft.scheduledDate, scheduledTime: draft.scheduledTime,
      appointmentType, appointmentNotes: draft.appointmentNotes,
    };
    return {
      kind: 'confirmation', title: `Agendar ${appointmentType.toLocaleLowerCase('pt-BR')}`,
      message: `Cliente: ${customer.nome}\nQuando: ${formatAppointmentDate(draft.scheduledDate, draft.scheduledTime)}${draft.appointmentNotes ? `\nNotas: ${draft.appointmentNotes}` : ''}`,
      action, selections, draft, transcription, metrics,
    };
  }

  if (!draft.items.length) return clarification(draft, transcription, metrics, `Quais produtos e quantidades entram no ${draft.intent === 'create_consignment' ? 'consignado' : 'pedido'} de ${customer.nome}?`, [], null, selections);
  const productChecks = await Promise.all(draft.items.map(async (item) => ({
    item,
    result: await resolveProduct(db, accountId, item.productReference, selectedEntityId(selections, 'product', item.productReference)),
  })));
  const resolvedItems: VoiceResolvedItem[] = [];
  for (const { item, result } of productChecks) {
    const entity = { type: 'product' as const, reference: item.productReference };
    if (result.status === 'missing') return clarification(
      draft,
      transcription,
      metrics,
      result.candidates.length
        ? `Não encontrei uma correspondência exata para “${item.productReference}”. Você quis dizer algum destes produtos?`
        : `Não encontrei “${item.productReference}”. Pode dizer o produto de outra forma?`,
      result.candidates,
      entity,
      selections,
    );
    if (result.status === 'ambiguous') return clarification(draft, transcription, metrics, `Encontrei mais de um produto para “${item.productReference}”. Qual deles?`, result.candidates, entity, selections);
    const product = result.product;
    const unitPrice = Number(product.preco || 0);
    resolvedItems.push({ productId: product.id, name: product.nome, sku: product.sku || null, quantity: item.quantity, unitPrice, lineTotal: Math.round(unitPrice * item.quantity * 100) / 100 });
  }
  const total = Math.round(resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const action: VoiceConfirmationAction = {
    operationId: crypto.randomUUID(), intent: draft.intent === 'create_consignment' ? 'create_consignment' : 'create_order', accountId,
    customerId: customer.id, customerName: customer.nome, items: resolvedItems,
    amount: null, expectedTotal: total, expectedBalance: null,
    paymentMethod: draft.intent === 'create_consignment' ? 'Consignado' : 'Venda', paymentDate: null,
  };
  const consignment = draft.intent === 'create_consignment';
  return { kind: 'confirmation', title: consignment ? 'Criar consignado' : 'Criar pedido', message: `Cliente: ${customer.nome}\n${resolvedItems.map((item) => `${item.name} — ${item.quantity} × ${formatMoney(item.unitPrice)}`).join('\n')}\n${consignment ? 'Total consignado' : 'Total'}: ${formatMoney(total)}`, action, selections, draft, transcription, metrics };
}
