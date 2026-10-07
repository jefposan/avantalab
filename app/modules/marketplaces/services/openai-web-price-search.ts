import 'server-only';
import { MarketplaceError } from './management-access';
import { selectReferencePriceCents } from './price-reference';

type JsonRecord = Record<string, unknown>;

export type WebPriceOffer = {
  title: string;
  seller: string;
  price: number;
  url: string;
};

export type OpenAIWebPriceSample = {
  pricesInCents: number[];
  offers: WebPriceOffer[];
  count: number;
  minimum: number;
  maximum: number;
};

export type OpenAIWebPriceLookup = { status: 'completed'; sample: OpenAIWebPriceSample | null };

type OpenAIResponse = {
  error?: { message?: string };
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
};

const offerSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    seller: { type: 'string' },
    price: { type: 'number' },
    url: { type: 'string' },
  },
  required: ['title', 'seller', 'price', 'url'],
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    offers: { type: 'array', maxItems: 12, items: offerSchema },
  },
  required: ['offers'],
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function apiKey() {
  return text(process.env.OPENAI_API_KEY) || text(process.env.OPENAI_API_KEY_AVA);
}

function outputText(response: OpenAIResponse | null) {
  for (const output of response?.output || []) {
    for (const content of output.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

function normalizedOffer(value: unknown): WebPriceOffer | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const offer = value as JsonRecord;
  const title = text(offer.title).slice(0, 240);
  const seller = text(offer.seller).slice(0, 120);
  const price = typeof offer.price === 'number' ? offer.price : Number.NaN;
  const rawUrl = text(offer.url);
  if (!title || !seller || !Number.isFinite(price) || price <= 0 || price >= 1_000_000 || !rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|gclid$|fbclid$|srsltid$)/i.test(key)) url.searchParams.delete(key);
    }
    return { title, seller, price: Math.round(price * 100) / 100, url: url.toString() };
  } catch {
    return null;
  }
}

type RequiredMarketplace = 'mercado_livre' | 'amazon';

function requiredMarketplace(offer: WebPriceOffer): RequiredMarketplace | null {
  let hostname = '';
  try {
    hostname = new URL(offer.url).hostname.toLocaleLowerCase('pt-BR');
  } catch {
    // normalizedOffer já valida a URL; o fallback por seller mantém a função defensiva.
  }
  const seller = offer.seller.toLocaleLowerCase('pt-BR');
  if (hostname === 'meli.la' || hostname === 'mercadolivre.com.br' || hostname.endsWith('.mercadolivre.com.br') || /mercado\s*livre/.test(seller)) {
    return 'mercado_livre';
  }
  if (hostname === 'amzn.to' || hostname === 'amazon.com.br' || hostname.endsWith('.amazon.com.br') || /\bamazon\b/.test(seller)) {
    return 'amazon';
  }
  return null;
}

function selectReferenceOffers(offers: WebPriceOffer[]) {
  const sorted = [...offers].sort((left, right) => left.price - right.price);
  const required = (['mercado_livre', 'amazon'] as const)
    .map((marketplace) => sorted.find((offer) => requiredMarketplace(offer) === marketplace))
    .filter((offer): offer is WebPriceOffer => Boolean(offer));
  const selected = [...required];
  for (const offer of sorted) {
    if (selected.length >= 5) break;
    if (!selected.includes(offer)) selected.push(offer);
  }
  return selected.sort((left, right) => left.price - right.price);
}

function priceSample(payload: unknown): OpenAIWebPriceSample | null {
  const record = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as JsonRecord : {};
  const offers = Array.isArray(record.offers) ? record.offers.map(normalizedOffer).filter((offer): offer is WebPriceOffer => Boolean(offer)) : [];
  const unique = offers.filter((offer, index) => {
    const key = `${offer.url}|${offer.seller.toLocaleLowerCase('pt-BR')}|${offer.price}`;
    return offers.findIndex((candidate) => `${candidate.url}|${candidate.seller.toLocaleLowerCase('pt-BR')}|${candidate.price}` === key) === index;
  });
  const selectedOffers = selectReferenceOffers(unique);
  const selectedPrices = selectReferencePriceCents(selectedOffers.map((offer) => Math.round(offer.price * 100)));
  if (!selectedPrices.length) return null;
  return {
    pricesInCents: selectedPrices,
    offers: selectedOffers,
    count: selectedPrices.length,
    minimum: selectedPrices[0] / 100,
    maximum: selectedPrices.at(-1)! / 100,
  };
}

export async function consultOpenAIWebPrices(input: { ean: string | null; productName: string }): Promise<OpenAIWebPriceLookup> {
  const key = apiKey();
  if (!key) throw new MarketplaceError(503, 'price_provider_not_configured', 'A pesquisa de preços com IA ainda não está configurada neste ambiente.');
  const productName = text(input.productName);
  if (!productName) throw new MarketplaceError(400, 'invalid_price_query', 'Não foi possível determinar o produto para pesquisar preços.');
  const model = text(process.env.OPENAI_PRICE_SEARCH_MODEL) || 'gpt-5.5';
  const prompt = [
    'Pesquise na web ofertas atuais no Brasil para o produto EXATO informado abaixo.',
    `Produto: ${productName}`,
    input.ean ? `EAN: ${input.ean}` : '',
    '',
    'Regras obrigatórias:',
    '- pesquise obrigatoriamente Mercado Livre e Amazon Brasil antes de completar a amostra com outras lojas brasileiras;',
    '- no Mercado Livre, se o produto exato estiver disponível, retorne o MENOR preço válido encontrado para produto novo;',
    '- na Amazon Brasil, se o produto exato estiver disponível, retorne o MENOR preço válido encontrado para produto novo;',
    '- as ofertas mais baratas válidas de Mercado Livre e Amazon têm prioridade e devem permanecer na resposta mesmo quando não estiverem entre os cinco menores preços gerais;',
    '- se o produto exato não existir em um desses marketplaces, não substitua por modelo parecido e não invente oferta; apenas omita esse marketplace;',
    '- quando houver EAN, use-o como identificador prioritário; confirme também marca, modelo, versão, voltagem, capacidade e demais características relevantes;',
    '- procure preços à vista/totais em reais (BRL), em lojas brasileiras e marketplaces;',
    '- retorne somente produto novo e disponível; exclua acessórios, peças, kits diferentes, usados, recondicionados, avariados, aluguel e produtos similares;',
    '- cada oferta precisa ter preço atual, nome da loja e URL HTTPS da página que comprova a oferta;',
    '- não use parcelas, frete, preço antigo riscado nem preço de produto indisponível;',
    '- encontre até 12 ofertas válidas; não calcule média e não invente valores;',
    '- se não houver comprovação suficiente, retorne menos ofertas ou a lista vazia.',
  ].filter(Boolean).join('\n');

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: 'low' },
        tools: [{ type: 'web_search', search_context_size: 'medium' }],
        tool_choice: 'required',
        include: ['web_search_call.action.sources'],
        input: prompt,
        max_output_tokens: 3_000,
        text: { format: { type: 'json_schema', name: 'ofertas_produto', strict: true, schema: responseSchema } },
      }),
    });
  } catch {
    throw new MarketplaceError(503, 'price_provider_unavailable', 'A pesquisa de preços com IA demorou mais que o esperado. Tente novamente.');
  }
  const body = await response.json().catch(() => null) as OpenAIResponse | null;
  if (!response.ok) {
    console.error('Falha na pesquisa web OpenAI:', response.status, body?.error?.message || 'sem detalhe');
    if (response.status === 401 || response.status === 403) throw new MarketplaceError(503, 'price_provider_authorization', 'A integração de pesquisa com IA não foi autorizada.');
    if (response.status === 429) throw new MarketplaceError(429, 'price_provider_limited', 'O limite da pesquisa de preços com IA foi atingido. Aguarde alguns instantes.');
    throw new MarketplaceError(503, 'price_provider_failed', 'Não foi possível concluir a pesquisa de preços com IA. Tente novamente.');
  }
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(outputText(body));
  } catch {
    throw new MarketplaceError(503, 'price_provider_invalid_response', 'A pesquisa de preços com IA retornou dados incompletos. Tente novamente.');
  }
  return { status: 'completed', sample: priceSample(parsed) };
}
