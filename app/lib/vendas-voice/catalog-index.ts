import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeVoiceSearch } from './validation.mjs';

type CatalogProduct = {
  id: string;
  nome: string;
  marca?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  sku?: string | null;
  unidade?: string | null;
};

type QueueRow = {
  catalogo_produto_id: string;
  entrada_hash: string;
  tentativas?: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERIC_SINGLE_TOKENS = new Set([
  'produto', 'kit', 'shampoo', 'mascara', 'creme', 'tratamento', 'progressiva',
  'redutor', 'organico', 'organica', 'oxidante', 'tintura', 'litro', 'ml',
]);
const EQUIVALENT_TOKENS: Record<string, string[]> = {
  redutor: ['progressiva', 'alisamento'],
  progressiva: ['redutor', 'alisamento'],
  alisamento: ['redutor', 'progressiva'],
  organico: ['organica'],
  organica: ['organico'],
  mascara: ['mask'],
  condicionador: ['conditioner'],
  shampoo: ['xampu'],
  xampu: ['shampoo'],
  litro: ['litros', 'l'],
  litros: ['litro', 'l'],
};

const ALIAS_SCHEMA = {
  name: 'avanta_voice_catalog_aliases',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      products: {
        type: 'array',
        maxItems: 24,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            aliases: {
              type: 'array',
              maxItems: 16,
              items: { type: 'string', minLength: 2, maxLength: 100 },
            },
          },
          required: ['id', 'aliases'],
        },
      },
    },
    required: ['products'],
  },
};

const SYSTEM_PROMPT = `Você cria formas alternativas de localizar produtos por voz em português do Brasil.
Receberá somente produtos reais do catálogo. Para cada produto, devolva de 4 a 12 expressões curtas que uma pessoa poderia falar.
Inclua variações naturais de nome, marca, categoria, apresentação e pequenas variações de escrita ou pronúncia.
Não invente características, composição, benefício, tamanho, volume, marca ou categoria ausentes nos dados recebidos.
Não use frases de pedido, quantidades de compra, nomes de clientes nem explicações.
Não devolva termos genéricos isolados, como “produto”, “kit”, “shampoo”, “máscara” ou “progressiva”.
Preserve a identidade comercial: uma expressão deve continuar distinguindo o produto dos demais.
Retorne somente o JSON exigido pelo schema.`;

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

function similarToken(left: string, right: string) {
  const maximum = Math.max(left.length, right.length);
  if (!maximum) return false;
  const edit = 1 - editDistance(left, right) / maximum;
  const distance = Math.max(Math.floor(maximum / 2) - 1, 0);
  const leftMatches = new Array(left.length).fill(false);
  const rightMatches = new Array(right.length).fill(false);
  let matches = 0;
  for (let index = 0; index < left.length; index += 1) {
    for (let candidate = Math.max(0, index - distance); candidate < Math.min(index + distance + 1, right.length); candidate += 1) {
      if (!rightMatches[candidate] && left[index] === right[candidate]) {
        leftMatches[index] = true; rightMatches[candidate] = true; matches += 1; break;
      }
    }
  }
  if (!matches) return edit >= 0.76;
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
  const jaroWinkler = jaro + prefix * .1 * (1 - jaro);
  return Math.max(edit, jaroWinkler) >= 0.86;
}

function tokens(value: unknown) {
  return normalizeVoiceSearch(String(value || '')).split(' ').filter((token: string) => token.length >= 1);
}

function groundedAlias(alias: string, product: CatalogProduct) {
  const normalized = normalizeVoiceSearch(alias);
  const aliasTokens = tokens(normalized);
  if (normalized.length < 2 || normalized.length > 100 || !aliasTokens.length) return false;
  if (aliasTokens.length === 1 && GENERIC_SINGLE_TOKENS.has(aliasTokens[0])) return false;
  const sourceTokens = new Set([
    ...tokens(product.nome), ...tokens(product.marca), ...tokens(product.categoria),
    ...tokens(product.descricao), ...tokens(product.sku), ...tokens(product.unidade),
  ]);
  const source = [...sourceTokens];
  const aliasCompact = aliasTokens.join('');
  const nameCompact = tokens(product.nome).join('');
  if (aliasCompact.length >= 5 && (nameCompact.includes(aliasCompact) || aliasCompact.includes(nameCompact))) return true;
  return aliasTokens.every((aliasToken) => {
    if (sourceTokens.has(aliasToken)) return true;
    if (source.some((sourceToken) => similarToken(aliasToken, sourceToken))) return true;
    return source.some((sourceToken) => EQUIVALENT_TOKENS[sourceToken]?.includes(aliasToken));
  });
}

function publicCatalogDescription(value: unknown) {
  const description = String(value || '').trim();
  return /\b(?:mysql|tridium|registro legado|origem tecnica|origem técnica)\b/i.test(description)
    ? null
    : description || null;
}

function safeAliases(value: unknown, product: CatalogProduct) {
  if (!Array.isArray(value)) return [];
  const aliases = new Map<string, string>();
  for (const item of value.slice(0, 16)) {
    const alias = String(item || '').trim().replace(/\s+/g, ' ').slice(0, 100);
    const normalized = normalizeVoiceSearch(alias);
    if (!aliases.has(normalized) && groundedAlias(alias, product)) aliases.set(normalized, alias);
  }
  return [...aliases.values()].slice(0, 16);
}

async function requestAliases(products: CatalogProduct[]) {
  if (!products.length) return { aliases: new Map<string, string[]>(), model: 'sem-produto-ativo' };
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_AVA || '';
  if (!apiKey) throw new Error('Integração da OpenAI indisponível para indexação de voz.');
  const model = process.env.OPENAI_VOICE_CATALOG_MODEL || process.env.OPENAI_VOICE_COMMAND_MODEL || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 2400,
      response_format: { type: 'json_schema', json_schema: ALIAS_SCHEMA },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify(products.map((product) => ({
            id: product.id,
            nome: product.nome,
            marca: product.marca || null,
            categoria: product.categoria || null,
            descricao: publicCatalogDescription(product.descricao),
            sku: product.sku || null,
            unidade: product.unidade || null,
          }))),
        },
      ],
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    console.error('[voice-catalog-index] OpenAI:', result?.error?.message || response.status);
    throw new Error('Não foi possível enriquecer o índice de voz agora.');
  }
  let parsed: unknown;
  try { parsed = JSON.parse(String(result?.choices?.[0]?.message?.content || '')); }
  catch { throw new Error('A indexação de voz retornou um formato inválido.'); }
  const rows = parsed && typeof parsed === 'object' && Array.isArray((parsed as { products?: unknown }).products)
    ? (parsed as { products: Array<{ id?: unknown; aliases?: unknown }> }).products
    : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  const aliases = new Map<string, string[]>();
  for (const row of rows) {
    const id = String(row?.id || '');
    const product = byId.get(id);
    if (product) aliases.set(id, safeAliases(row.aliases, product));
  }
  console.info('[voice-catalog-index]', JSON.stringify({
    products: products.length,
    aliases: [...aliases.values()].reduce((sum, list) => sum + list.length, 0),
    model,
    inputTokens: Number(result?.usage?.prompt_tokens || 0) || null,
    outputTokens: Number(result?.usage?.completion_tokens || 0) || null,
  }));
  return { aliases, model };
}

async function markQueueError(admin: SupabaseClient, rows: QueueRow[], error: unknown) {
  const message = error instanceof Error ? error.message : 'Falha temporária na indexação de voz.';
  await Promise.all(rows.map((row) => admin.from('vendas_mobile_catalogo_busca_voz_fila').update({
    status: 'erro',
    tentativas: Number(row.tentativas || 0) + 1,
    ultimo_erro: message.slice(0, 240),
    processar_apos: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq('catalogo_produto_id', row.catalogo_produto_id).eq('entrada_hash', row.entrada_hash)));
}

export async function enrichCatalogVoiceIndex(args: {
  admin: SupabaseClient;
  companyId?: string;
  productIds?: string[];
  limit?: number;
}) {
  const { admin } = args;
  const productIds = [...new Set((args.productIds || []).filter((id) => UUID.test(id)))].slice(0, 24);
  const limit = Math.max(1, Math.min(24, Number(args.limit || 12)));
  let queue = admin.from('vendas_mobile_catalogo_busca_voz_fila')
    .select('catalogo_produto_id,entrada_hash,tentativas')
    // Uma execução interrompida volta a ficar elegível depois do prazo de
    // segurança. Isso evita produtos presos indefinidamente em "processando".
    .in('status', ['pendente', 'erro', 'processando'])
    .lte('processar_apos', new Date().toISOString())
    .order('atualizado_em', { ascending: true })
    .limit(limit);
  if (args.companyId) queue = queue.eq('empresa_id', args.companyId);
  if (productIds.length) queue = queue.in('catalogo_produto_id', productIds);
  const { data: queued, error: queueError } = await queue;
  if (queueError) throw new Error('Não foi possível consultar a fila do índice de voz.');
  const rows = (queued || []) as QueueRow[];
  if (!rows.length) return { processed: 0, aliases: 0 };
  const ids = rows.map((row) => row.catalogo_produto_id);
  await admin.from('vendas_mobile_catalogo_busca_voz_fila')
    .update({
      status: 'processando',
      processar_apos: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .in('catalogo_produto_id', ids);
  const { data, error } = await admin.from('vendas_mobile_catalogo_produtos')
    .select('id,nome,marca,categoria,descricao,sku,unidade')
    .in('id', ids)
    .eq('ativo', true)
    .eq('disponivel_catalogo', true);
  if (error) {
    await markQueueError(admin, rows, error);
    throw new Error('Não foi possível ler os produtos para indexação de voz.');
  }
  const products = (data || []) as CatalogProduct[];
  try {
    const generated = await requestAliases(products);
    let total = 0;
    for (const row of rows) {
      const aliases = generated.aliases.get(row.catalogo_produto_id) || [];
      const { data: saved, error: saveError } = await admin.rpc('vendas_mobile_salvar_aliases_catalogo_voz_rpc', {
        p_catalogo_produto_id: row.catalogo_produto_id,
        p_aliases: aliases,
        p_modelo: generated.model,
        p_entrada_hash: row.entrada_hash,
      });
      if (saveError) throw saveError;
      total += Number((saved as { aliases?: number } | null)?.aliases || 0);
    }
    return { processed: rows.length, aliases: total };
  } catch (error) {
    await markQueueError(admin, rows, error);
    throw error;
  }
}

export async function enrichPendingCatalogForAccount(admin: SupabaseClient, accountId: string, limit = 8) {
  if (!UUID.test(accountId)) return { processed: 0, aliases: 0 };
  const { data, error } = await admin.from('vendas_mobile_produtos')
    .select('catalogo_produto_origem_id')
    .eq('conta_id', accountId)
    .eq('ativo', true)
    .not('catalogo_produto_origem_id', 'is', null)
    .limit(200);
  if (error) return { processed: 0, aliases: 0 };
  const ids = [...new Set((data || []).map((row) => String(row.catalogo_produto_origem_id || '')).filter((id) => UUID.test(id)))];
  if (!ids.length) return { processed: 0, aliases: 0 };
  return enrichCatalogVoiceIndex({ admin, productIds: ids, limit });
}
