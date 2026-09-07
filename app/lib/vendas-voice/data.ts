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

function searchTokens(reference: string) {
  return normalizeVoiceSearch(reference).split(' ').filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function safeSearchToken(reference: string, preferLongest = false) {
  const tokens = String(reference || '').toLocaleLowerCase('pt-BR').match(/[\p{L}\p{N}]+/gu) || [];
  const meaningful = tokens.filter((token) => token.length >= 2 && !STOP_WORDS.has(normalizeVoiceSearch(token)));
  const selected = preferLongest ? [...meaningful].sort((a, b) => b.length - a.length)[0] : meaningful[0];
  return String(selected || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 48);
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

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? 'data não informada' : new Intl.DateTimeFormat('pt-BR').format(date);
}

function customerFields(customer: CustomerRow) {
  const address = customer.endereco && typeof customer.endereco === 'object' ? customer.endereco : {};
  return [customer.nome, customer.telefone, customer.email, customer.observacoes, customer.endereco, ...Object.values(address)];
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

export async function resolveCustomer(db: SupabaseClient, accountId: string, reference: string, selectedId = '') {
  const token = safeSearchToken(reference);
  if (!token) return { status: 'missing' as const, candidates: [] as VoiceEntityCandidate[] };
  const { data, error } = await db.from('vendas_mobile_clientes')
    .select('id,nome,telefone,email,observacoes,endereco,ativo')
    .eq('conta_id', accountId)
    .eq('ativo', true)
    .or(`nome.ilike.%${token}%,observacoes.ilike.%${token}%,email.ilike.%${token}%,telefone.ilike.%${token}%`)
    .limit(12);
  if (error) throw new Error('Não foi possível pesquisar clientes.');
  const ranked = (data as CustomerRow[] || [])
    .map((row) => ({ row, score: score(reference, customerFields(row)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.row.nome.localeCompare(b.row.nome, 'pt-BR'));
  const lastOrders = await customerLastOrders(db, accountId, ranked.slice(0, 6).map(({ row }) => row.id));
  const candidates = ranked.slice(0, 4).map(({ row }) => {
    const address = row.endereco && typeof row.endereco === 'object' ? row.endereco : {};
    const place = [address.cidade, address.bairro, address.complemento].filter(Boolean).join(' · ');
    const lastOrder = lastOrders.get(row.id);
    const details = [
      place,
      row.observacoes ? String(row.observacoes).slice(0, 70) : '',
      lastOrder ? `Último pedido: ${formatDate(lastOrder.criado_em)} · ${formatMoney(Number(lastOrder.total || 0))}` : 'Sem pedido anterior',
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
  const token = safeSearchToken(reference, true);
  if (!token) return { status: 'missing' as const, candidates: [] as VoiceEntityCandidate[] };
  const { data, error } = await db.from('vendas_mobile_produtos')
    .select('id,nome,sku,marca,categoria,descricao,preco,preco_custo,ativo')
    .eq('conta_id', accountId)
    .eq('ativo', true)
    .or(`nome.ilike.%${token}%,sku.ilike.%${token}%,marca.ilike.%${token}%,categoria.ilike.%${token}%,descricao.ilike.%${token}%`)
    .limit(16);
  if (error) throw new Error('Não foi possível pesquisar produtos.');
  const ranked = (data as ProductRow[] || [])
    .map((row) => ({ row, score: score(reference, [row.nome, row.sku, row.marca, row.categoria, row.descricao]) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.row.nome.localeCompare(b.row.nome, 'pt-BR'));
  const candidates = ranked.slice(0, 5).map(({ row }) => ({
    id: row.id,
    label: row.nome,
    detail: [row.sku ? `SKU ${row.sku}` : '', row.marca, row.categoria, formatMoney(Number(row.preco || 0))].filter(Boolean).join(' · '),
  }));
  if (!ranked.length) return { status: 'missing' as const, candidates };
  const selected = selectedId && candidates.some((candidate) => candidate.id === selectedId)
    ? ranked.find(({ row }) => row.id === selectedId)?.row
    : null;
  if (selected) return { status: 'resolved' as const, product: selected, candidates };
  const tokenCount = searchTokens(reference).length;
  const clearWinner = ranked.length === 1
    || (ranked[0].score === 120 && (ranked[1]?.score || 0) < 100)
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
): VoiceProcessResponse {
  return { kind: 'clarification', question, candidates, entity, draft, transcription, metrics };
}

async function resolveRequiredCustomer(
  db: SupabaseClient,
  accountId: string,
  draft: VoiceIntentPayload,
  transcription: string,
  metrics: VoiceMetrics,
  selection: VoiceEntitySelection | null,
) {
  if (!draft.customerReference) return { response: clarification(draft, transcription, metrics, 'Para qual cliente?') };
  const selectedId = selection?.type === 'customer'
    && normalizeVoiceSearch(selection.reference) === normalizeVoiceSearch(draft.customerReference)
    ? selection.id : '';
  const result = await resolveCustomer(db, accountId, draft.customerReference, selectedId);
  const entity = { type: 'customer' as const, reference: draft.customerReference };
  if (result.status === 'missing') return { response: clarification(draft, transcription, metrics, `Não encontrei “${draft.customerReference}”. Pode dizer o nome de outra forma?`, [], entity) };
  if (result.status === 'ambiguous') return { response: clarification(draft, transcription, metrics, `Encontrei mais de um cliente para “${draft.customerReference}”. Qual deles?`, result.candidates, entity) };
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
  selection?: VoiceEntitySelection | null;
}): Promise<VoiceProcessResponse> {
  const { db, accountId, draft, transcription, metrics, selection = null } = args;
  if (draft.intent === 'unsupported') {
    return { kind: 'unsupported', title: 'Comando ainda não disponível', message: draft.unsupportedReason || 'Essa ação ainda não está disponível por voz neste laboratório.', draft, transcription, metrics };
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
    return { kind: 'answer', title: 'Consulta concluída', message: `Você registrou ${sales.length} pedido${sales.length === 1 ? '' : 's'} ${labels[period]}, totalizando ${formatMoney(total)}.`, draft, transcription, metrics };
  }

  const customerResult = await resolveRequiredCustomer(db, accountId, draft, transcription, metrics, selection);
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
    return { kind: 'answer', title: customer.nome, message: `${lastOrderText} ${balanceText}`, draft, transcription, metrics };
  }

  if (draft.intent === 'register_payment') {
    if (!draft.amount) return clarification(draft, transcription, metrics, `Qual é o valor do pagamento de ${customer.nome}?`);
    if (!draft.paymentMethod) return clarification(
      draft,
      transcription,
      metrics,
      `Selecione a forma de pagamento de ${customer.nome}.`,
      ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Outro']
        .map((label) => ({ id: '', label, detail: '' })),
    );
    const financial = await customerBalance(db, accountId, customer.id);
    const action: VoiceConfirmationAction = {
      operationId: crypto.randomUUID(), intent: 'register_payment', accountId,
      customerId: customer.id, customerName: customer.nome, items: [], amount: draft.amount,
      expectedTotal: null, expectedBalance: financial.balance, paymentMethod: draft.paymentMethod,
      paymentDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    };
    return { kind: 'confirmation', title: 'Registrar pagamento', message: `Cliente: ${customer.nome}\nValor: ${formatMoney(draft.amount)}\nForma: ${draft.paymentMethod}\nSaldo anterior: ${formatMoney(financial.balance)}\nSaldo após pagamento: ${formatMoney(Math.max(0, financial.balance - draft.amount))}`, action, draft, transcription, metrics };
  }

  if (!draft.items.length) return clarification(draft, transcription, metrics, `Quais produtos e quantidades entram no pedido de ${customer.nome}?`);
  const resolvedItems: VoiceResolvedItem[] = [];
  for (const item of draft.items) {
    const selectedId = selection?.type === 'product'
      && normalizeVoiceSearch(selection.reference) === normalizeVoiceSearch(item.productReference)
      ? selection.id : '';
    const result = await resolveProduct(db, accountId, item.productReference, selectedId);
    const entity = { type: 'product' as const, reference: item.productReference };
    if (result.status === 'missing') return clarification(draft, transcription, metrics, `Não encontrei “${item.productReference}”. Pode dizer o produto de outra forma?`, [], entity);
    if (result.status === 'ambiguous') return clarification(draft, transcription, metrics, `Encontrei mais de um produto para “${item.productReference}”. Qual deles?`, result.candidates, entity);
    const product = result.product;
    const unitPrice = Number(product.preco || 0);
    resolvedItems.push({ productId: product.id, name: product.nome, sku: product.sku || null, quantity: item.quantity, unitPrice, lineTotal: Math.round(unitPrice * item.quantity * 100) / 100 });
  }
  const total = Math.round(resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const action: VoiceConfirmationAction = {
    operationId: crypto.randomUUID(), intent: 'create_order', accountId,
    customerId: customer.id, customerName: customer.nome, items: resolvedItems,
    amount: null, expectedTotal: total, expectedBalance: null,
    paymentMethod: 'Não informado', paymentDate: null,
  };
  return { kind: 'confirmation', title: 'Criar pedido', message: `Cliente: ${customer.nome}\n${resolvedItems.map((item) => `${item.name} — ${item.quantity} × ${formatMoney(item.unitPrice)}`).join('\n')}\nTotal: ${formatMoney(total)}`, action, draft, transcription, metrics };
}
