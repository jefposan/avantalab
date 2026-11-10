import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {loadConnection,mlRequest} from './mercadolivre-management';
import {loadMagaluConnection,magaluRequest} from './magalu-request';
import {magaluPage} from '../magalu-sales-model';
import {objectValue,uuidIsValid} from './listing-model';
import {reportPeriod,type ReportFilters} from '../sales-report';
import {allocateFreight,emptyFinancialMonths,magaluFinancial,mlFees,mlSellerFreight,toCents,type FinancialValue,type FinancialEntry} from '../sales-financial';

type FinancialRow = Record<string, unknown>;
type StoredFinancial = { revision: string; value: FinancialValue; nextAttemptAt: number };
const selection = 'id,provider,connection_id,provider_order_id,status,updated_at,snapshot';
const ongoing = new Map<string, Promise<FinancialValue>>();
const unavailableRpc = (code?: string) => code === 'PGRST202' || code === '42883';

export async function readStoredFinancial(db: SupabaseClient, companyId: string, ids: string[]) {
  const bySale = new Map<string, StoredFinancial>();
  if (!ids.length) return bySale;
  const { data, error } = await db.rpc('marketplace_read_sale_financial', { p_empresa: companyId, p_sales: ids })
    .abortSignal(AbortSignal.timeout(5_000));
  if (error && !unavailableRpc(error.code)) console.error('marketplace_financial_read', error.code);
  for (const row of data || []) {
    bySale.set(row.sale_id, {
      revision: row.revision,
      nextAttemptAt: Date.parse(row.next_attempt_at ?? ''),
      value: { fees: row.fees, freight: row.freight, adjustments: row.adjustments, net: row.net, ...(row.issue ? { issue: row.issue } : {}) },
    });
  }
  return bySale;
}

export function sameFinancialRevision(saved: StoredFinancial | undefined, revision: unknown) {
  return saved && saved.revision === revision ? saved : undefined;
}

const pending=(issue:string):FinancialValue=>({fees:null,freight:null,adjustments:0,net:null,issue});
function safeIssue(error:unknown):string{
  if(!process.env.MARKETPLACE_SECRETS_KEY)return 'A chave de integração não está configurada neste ambiente.';
  if(error instanceof MarketplaceError&&['reconnect','vault_unavailable','provider_403','magalu_403','refresh_busy'].includes(error.code))return error.message;
  return 'O marketplace ainda não confirmou todos os custos de alguns pedidos.';
}
async function mlFinancial(db:SupabaseClient,companyId:string,row:Record<string,unknown>,deadline:number):Promise<FinancialValue>{
  const connection=await loadConnection(db,companyId,row.connection_id);
  if(!/^\d{1,24}$/.test(String(row.provider_order_id)))throw Error('invalid_order');
  const order=objectValue(await mlRequest(db,connection,`/orders/${row.provider_order_id}`)),snapshot=objectValue(row.snapshot);
  if(String(order.id)!==String(row.provider_order_id)||String(objectValue(order.seller).id)!==connection.seller_reference||order.status!=='paid'||order.currency_id!=='BRL'||toCents(order.total_amount)!==toCents(snapshot.total))throw Error('order_changed');
  const gross=toCents(order.total_amount);if(gross===null)throw Error('invalid_gross');
  const fees=mlFees(order),shippingId=String(objectValue(order.shipping).id||'');
  let freight:number|null=null,issue:string|undefined;
  try{
    if(!/^\d{1,24}$/.test(shippingId)||Date.now()>deadline-9000)throw Error('shipping_pending');
    const [costs,items]=await Promise.all([mlRequest(db,connection,`/shipments/${shippingId}/costs`),mlRequest(db,connection,`/shipments/${shippingId}/items`)]);
    const cost=mlSellerFreight(costs,connection.seller_reference);
    if(cost===null||!Array.isArray(items)||!items.length)throw Error('shipping_pending');
    const ids=[...new Set(items.map(objectValue).map(item=>String(item.order_id||'')))];
    if(!ids.includes(String(order.id))||ids.some(id=>!/^\d{1,24}$/.test(id))||ids.length>8)throw Error('shared_shipping');
    const orders=[{id:String(order.id),gross}];
    for(const id of ids.filter(id=>id!==String(order.id))){
      if(Date.now()>deadline-9000)throw Error('shared_shipping');
      const other=objectValue(await mlRequest(db,connection,`/orders/${id}`));
      if(String(other.id)!==id||String(objectValue(other.seller).id)!==connection.seller_reference||String(objectValue(other.shipping).id)!==shippingId||other.currency_id!=='BRL'||other.status!=='paid'||toCents(other.total_amount)===null)throw Error('shared_shipping');
      orders.push({id,gross:toCents(other.total_amount)!});
    }
    freight=allocateFreight(cost,orders).get(String(order.id))??null;
  }catch{issue='Frete ainda não confirmado; envios compartilhados exigem rateio entre os pedidos.';}
  const net=fees!==null&&freight!==null?gross-fees-freight:null;
  return {fees,freight,net,adjustments:0,...(net===null?{issue:issue||'Comissão ainda não informada no pedido.'}:{})};
}
async function readFinancial(db:SupabaseClient,companyId:string,row:Record<string,unknown>,deadline:number):Promise<FinancialValue>{
  if(row.provider==='mercado_livre')return mlFinancial(db,companyId,row,deadline);
  const connection=await loadMagaluConnection(db,companyId,row.connection_id),snapshot=objectValue(row.snapshot);
  const orderId=String(snapshot.providerOrderId||'');
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(orderId))throw Error('invalid_order');
  const reports:unknown[]=[];
  for(let offset=0;offset<500;offset+=100){
    if(Date.now()>deadline-9000)throw Error('financial_timeout');
    const page=magaluPage(await magaluRequest(db,connection,`/seller/v1/financial-analysis/orders?${new URLSearchParams({order_id:orderId,_limit:'100',_offset:String(offset)})}`),'/seller/v1/financial-analysis/orders',offset,100);
    reports.push(...page.rows);
    if(page.next===null)return magaluFinancial(reports,connection.seller_reference,orderId,toCents(snapshot.total)??NaN);
  }
  throw Error('financial_limit');
}
async function refreshFinancial(db: SupabaseClient, companyId: string, row: FinancialRow, deadline: number) {
  const key = JSON.stringify([companyId, row.id, row.updated_at]);
  const running = ongoing.get(key);
  if (running) return running;
  const work = (async () => {
    const value = await readFinancial(db, companyId, row, deadline).catch(error => pending(safeIssue(error)));
    const { error, data } = await db.rpc('marketplace_save_sale_financial', {
      p_empresa: companyId, p_sale: row.id, p_revision: row.updated_at,
      p_fees: value.fees, p_freight: value.freight, p_adjustments: value.adjustments, p_net: value.net, p_issue: value.issue ?? null,
    }).abortSignal(AbortSignal.timeout(5_000));
    if (error && !unavailableRpc(error.code)) console.error('marketplace_financial_save', error.code);
    return data === false ? pending('O pedido mudou durante a consulta. Os custos serão consultados novamente.') : value;
  })();
  ongoing.set(key, work);
  try { return await work; }
  finally { ongoing.delete(key); }
}

export async function processPendingRevenueFinancial(db: SupabaseClient) {
  const { data, error } = await db.rpc('marketplace_claim_sale_financial').abortSignal(AbortSignal.timeout(8_000));
  if (error) {
    if (!unavailableRpc(error.code)) console.error('marketplace_financial_claim', error.code);
    return;
  }
  const deadline = Date.now() + 28_000;
  await Promise.all((data ?? []).map((row: FinancialRow) => refreshFinancial(db, String(row.empresa_id), row, deadline)));
}

export async function loadFinancialBatch(db: SupabaseClient, companyId: string, year: number, filters: ReportFilters, cursor: string) {
  if (cursor && !uuidIsValid(cursor)) throw new MarketplaceError(400, 'invalid_cursor', 'Consulta financeira inválida.');
  const months = emptyFinancialMonths(), entries: FinancialEntry[] = [];
  if (filters.provider === 'direct' || filters.warehouseId && filters.warehouseId !== 'unassigned') return { months, entries, cursor: null, issues: [] };
  const pageSize = 25, deadline = Date.now() + 21_000;
  const query = db.from('marketplace_sales').select(selection).eq('empresa_id', companyId)
    .in('provider', filters.provider ? [filters.provider] : ['mercado_livre', 'magalu']).in('status', ['paid', 'confirmed'])
    .gte('snapshot->>soldAt', `${year - 1}-12-31`).lt('snapshot->>soldAt', `${year + 1}-01-02`).order('id').limit(pageSize + 1);
  if (filters.accountId) query.eq('connection_id', filters.accountId);
  if (cursor) query.gt('id', cursor);
  const { data, error } = await query.abortSignal(AbortSignal.timeout(8_000));
  if (error) throw new MarketplaceError(503, 'financial_unavailable', 'Não foi possível consultar os custos das vendas.');
  const rows = (data || []).slice(0, pageSize);
  const saved = await readStoredFinancial(db, companyId, rows.map(row => row.id));
  const issues = new Set<string>();
  const tasks: { row: FinancialRow; month: number; stored?: FinancialValue }[] = [];
  let consumed = 0, fetches = 0;
  for (const row of rows) {
    const snapshot = objectValue(row.snapshot), period = reportPeriod(String(snapshot.soldAt || ''));
    if (!period || period.year !== year || snapshot.currency !== 'BRL' || !(toCents(snapshot.total) ?? 0) || (row.provider === 'mercado_livre' && row.status !== 'paid')) {
      consumed++;
      continue;
    }
    const stored = sameFinancialRevision(saved.get(row.id), row.updated_at);
    const reusable = stored && (stored.value.net !== null || stored.nextAttemptAt > Date.now()) ? stored.value : undefined;
    if (!reusable && fetches >= 3) break;
    if (!reusable) fetches++;
    tasks.push({ row, month: period.month, stored: reusable });
    consumed++;
  }
  const values = await Promise.all(tasks.map(async task => task.stored ?? refreshFinancial(db, companyId, task.row, deadline)));
  for (const [index, task] of tasks.entries()) {
    const value = values[index], month = months[task.month - 1];
    entries.push({ id: String(task.row.id), revision: String(task.row.updated_at), value });
    if (value.fees !== null) { month.fees += value.fees; month.feeOrders++; }
    if (value.freight !== null) { month.freight += value.freight; month.freightOrders++; }
    if (value.net !== null) { month.net += value.net; month.adjustments += value.adjustments; month.netOrders++; }
    if (value.issue) issues.add(value.issue);
  }
  return { months, entries, cursor: data && consumed < data.length ? String(rows[consumed - 1].id) : null, issues: [...issues].slice(0, 3) };
}
