import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { loadConnection, mlRequest, saveListing, type SellerConnection } from './mercadolivre-management';
import { processSaleNotifications, syncOrder } from './mercadolivre-sales';
import { readOrderSearchPages, reconcileSalesHistory } from './mercadolivre-sales-history';
import { listingStockPolicy } from './inventory-model';
import { objectValue } from './listing-model';
import { stockModelFromResponse } from './mercadolivre-edit-policy';
import { salesAccountAvailable } from '../magalu-sales-model';
import { stockIncreaseBlocker } from './inventory-product-guard';
import { listingStockSyncTerminated } from '../stock-reconciliation';

type StockJob = { link_id: string; empresa_id: string; product_id: string; desired_quantity: number; revision: number; generation: string; allow_increase: boolean; attempts: number };
const failureCode = (error: unknown) => error instanceof MarketplaceError ? error.code : 'processing';
function assertDatabase(error: unknown) { if (error) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível registrar a sincronização do estoque.'); }
async function excludeStockJob(db:SupabaseClient,job:StockJob){
 const result=await db.from('marketplace_inventory_outbox').update({state:'excluded',issue:null,protected_at:null})
  .eq('empresa_id',job.empresa_id).eq('product_id',job.product_id).eq('link_id',job.link_id).eq('revision',job.revision).eq('generation',job.generation);
 assertDatabase(result.error);
}

/**
 * A pausa é a contenção segura quando o Mercado Livre não permite confirmar
 * quantidade zero. Ela não declara que o saldo remoto ficou em zero: apenas
 * impede nova compra até a reconciliação do modelo de estoque.
 */
async function pauseForZeroProtection(db: SupabaseClient, connection: SellerConnection, job: StockJob, link: { id: string; provider_listing_id: string }, item: Record<string, unknown>, relatedIds: string[], deadline: number) {
  const ids = [...new Set([String(item.id), ...relatedIds].filter(id => /^MLB\d{6,20}$/.test(id)))];
  let protectedItem: Record<string, unknown> | null = null;
  for (const id of ids) {
    if (Date.now() > deadline - 12_000) throw new MarketplaceError(409, 'worker_time_limit', 'A proteção continuará na próxima tentativa.');
    const current = id === item.id ? item : objectValue(await mlRequest(db, connection, `/items/${id}`));
    if (current.id !== id || String(current.seller_id) !== connection.seller_reference) throw new MarketplaceError(503, 'invalid_listing', 'O anúncio compartilhado não foi confirmado nesta conta.');
    if (current.user_product_id !== item.user_product_id) throw new MarketplaceError(503, 'invalid_listing', 'O anúncio compartilhado não pertence ao mesmo produto do Mercado Livre.');
    if (id === link.provider_listing_id && current.status === 'active') {
      const intent = await db.from('marketplace_listing_stock_control').upsert({ link_id: link.id, empresa_id: job.empresa_id, product_id: job.product_id,
        pause_requested_at: new Date().toISOString(), paused_by_system: false, pause_reason: 'zero_stock_protection', updated_at: new Date().toISOString() }, { onConflict: 'link_id' });
      assertDatabase(intent.error);
    }
    if (current.status === 'active') await mlRequest(db, connection, `/items/${id}`, 'PUT', { status: 'paused' });
    const paused = objectValue(await mlRequest(db, connection, `/items/${id}`));
    if (paused.id !== id || String(paused.seller_id) !== connection.seller_reference || paused.status !== 'paused') throw new MarketplaceError(409, 'pause_unconfirmed', 'O Mercado Livre ainda não confirmou a pausa.');
    if (id === link.provider_listing_id) protectedItem = paused;
  }
  if (!protectedItem) throw new MarketplaceError(409, 'pause_unconfirmed', 'O Mercado Livre ainda não confirmou a pausa.');
  const owned = await db.from('marketplace_listing_stock_control').update({ paused_by_system: true, pause_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('empresa_id', job.empresa_id).eq('link_id', link.id);
  assertDatabase(owned.error);
  return protectedItem;
}

/** Nunca confirma sucesso só pelo PUT: relê o anúncio e verifica o saldo. */
export async function deliverStockJob(db: SupabaseClient, job: StockJob, deadline = Infinity) {
  const { data: product, error: productError } = await db.from('marketplace_products').select('stock_quantity,revision,listing_stock_review_at').eq('empresa_id', job.empresa_id).eq('id', job.product_id).is('archived_at', null).maybeSingle();
  assertDatabase(productError);
  const { data: link, error: linkError } = await db.from('marketplace_product_links').select('*').eq('empresa_id', job.empresa_id).eq('product_id', job.product_id).eq('id', job.link_id).maybeSingle();
  assertDatabase(linkError);
  if (!link) return;
  if(listingStockSyncTerminated(link.status)){await excludeStockJob(db,job);return;}
  if (!product || product.stock_quantity !== job.desired_quantity) return;
  if(link.provider==='magalu'){const {deliverMagaluStockJob}=await import('./magalu-inventory');await deliverMagaluStockJob(db,job,link,deadline);return;}
  let outcome = 'pending', issue: string | null = null;
  try {
    if(product.listing_stock_review_at)throw new MarketplaceError(409,'import_stock_review','Confirme o estoque físico do produto importado antes de enviar saldo aos anúncios.');
    if (link.provider !== 'mercado_livre') throw new MarketplaceError(409, 'provider_not_supported', 'Esta plataforma ainda precisa do conector de estoque.');
    const connection = await loadConnection(db, job.empresa_id, link.connection_id);
    const item = objectValue(await mlRequest(db, connection, `/items/${link.provider_listing_id}`));
    if (item.id !== link.provider_listing_id || String(item.seller_id) !== connection.seller_reference) throw new MarketplaceError(503, 'invalid_listing', 'O anúncio não foi confirmado nesta conta.');
    if(listingStockSyncTerminated(item.status)){
      await saveListing(db,connection,item,false);
      const saved=await db.from('marketplace_product_links').update({status:item.status,updated_at:new Date().toISOString()}).eq('empresa_id',job.empresa_id).eq('product_id',job.product_id).eq('id',link.id);
      assertDatabase(saved.error);await excludeStockJob(db,job);return;
    }
    const seller = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}`));
    if (String(seller.id) !== connection.seller_reference) throw new MarketplaceError(503, 'invalid_seller', 'Conta não confirmada.');
    let userProductIssue: string | null = null, relatedUserProductIds: string[] = [];
    if (item.user_product_id != null) {
      if (typeof item.user_product_id !== 'string' || !/^MLB[A-Z]?\d+$/.test(item.user_product_id)) userProductIssue = 'unknown_stock_model';
      else {
        try {
          const stock = await mlRequest(db, connection, `/user-products/${item.user_product_id}/stock`);
          if (stockModelFromResponse(stock, connection.seller_reference) !== 'single') userProductIssue = 'warehouse';
          const associated = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}/items/search?${new URLSearchParams({ user_product_id: item.user_product_id, limit: '100' })}`));
          const paging = objectValue(associated.paging);
          if (Array.isArray(associated.results) && typeof paging.total === 'number' && paging.total === associated.results.length && associated.results.includes(item.id)
            && associated.results.every(id => typeof id === 'string' && /^MLB\d{6,20}$/.test(id))) {
            relatedUserProductIds = associated.results as string[];
            const related = await db.from('marketplace_product_links').select('provider_listing_id,product_id').eq('empresa_id', job.empresa_id).eq('connection_id', link.connection_id).in('provider_listing_id', relatedUserProductIds);
            assertDatabase(related.error);
            if (related.data?.length !== relatedUserProductIds.length || related.data.some(row => row.product_id !== job.product_id)) userProductIssue ||= 'user_product_not_unified';
          } else userProductIssue ||= 'user_product_not_unified';
        } catch (error) {
          // Para saldo zero, a leitura do modelo não pode deixar o anúncio comprável.
          // A pausa abaixo ainda exige confirmação do próprio anúncio antes de proteger.
          if (job.desired_quantity !== 0) throw error;
          userProductIssue ||= failureCode(error);
        }
      }
    }
    // Atualizar quantidade de uma pausa manual não envia status active nem reativa o anúncio.
    const pausedStockOnly=item.status==='paused'&&Array.isArray(item.sub_status)&&item.sub_status.every(status=>['out_of_stock','paused_by_seller'].includes(String(status)));
    const policy = listingStockPolicy((job.desired_quantity===0&&item.status==='paused'||pausedStockOnly)?{...item,status:'active'}:item, seller.tags, job.desired_quantity, job.allow_increase);
    if(job.desired_quantity===0&&userProductIssue&&policy!=='fulfillment'){
      const paused=await pauseForZeroProtection(db,connection,job,link,item,relatedUserProductIds,deadline);
      await saveListing(db,connection,paused,false);
      const refreshed=await db.from('marketplace_product_links').update({reported_stock:typeof paused.available_quantity==='number'?paused.available_quantity:null,status:'paused',updated_at:new Date().toISOString()}).eq('id',link.id).eq('empresa_id',job.empresa_id).eq('product_id',job.product_id);assertDatabase(refreshed.error);
      outcome='protected';issue='paused_quantity_unconfirmed';
    }
    else if(job.desired_quantity===0&&['write','equal'].includes(policy)){
      // A quantidade zero, sozinha, não prova a pausa. Registra intenção antes
      // de enviar, relê depois e só confirma o anúncio não comprável.
      if(item.status==='active'){
        if(Date.now()>deadline-16_000)throw new MarketplaceError(409,'worker_time_limit','A pausa continuará na próxima tentativa.');
        const latest=await db.from('marketplace_products').select('stock_quantity,revision,listing_stock_review_at').eq('empresa_id',job.empresa_id).eq('id',job.product_id).is('archived_at',null).maybeSingle();
        assertDatabase(latest.error);
        if(latest.data?.stock_quantity!==0||latest.data.listing_stock_review_at||latest.data.revision!==product.revision)throw new MarketplaceError(409,'stock_changed','O saldo mudou antes da pausa.');
        const intent=await db.from('marketplace_listing_stock_control').upsert({link_id:link.id,empresa_id:job.empresa_id,product_id:job.product_id,pause_requested_at:new Date().toISOString(),paused_by_system:false,pause_reason:'zero_stock',updated_at:new Date().toISOString()},{onConflict:'link_id'});
        assertDatabase(intent.error);
        await mlRequest(db,connection,`/items/${link.provider_listing_id}`,'PUT',{status:'paused'});
      }
      let paused=objectValue(await mlRequest(db,connection,`/items/${link.provider_listing_id}`));
      if(paused.id!==link.provider_listing_id||String(paused.seller_id)!==connection.seller_reference||paused.status!=='paused')throw new MarketplaceError(409,'pause_unconfirmed','O Mercado Livre ainda não confirmou a pausa.');
      const intent=await db.from('marketplace_listing_stock_control').select('pause_requested_at').eq('empresa_id',job.empresa_id).eq('link_id',link.id).maybeSingle();
      assertDatabase(intent.error);
      if(intent.data?.pause_requested_at){const owned=await db.from('marketplace_listing_stock_control').update({paused_by_system:true,pause_confirmed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('empresa_id',job.empresa_id).eq('link_id',link.id);assertDatabase(owned.error);}
      if(paused.available_quantity!==0){await mlRequest(db,connection,`/items/${link.provider_listing_id}`,'PUT',{available_quantity:0});paused=objectValue(await mlRequest(db,connection,`/items/${link.provider_listing_id}`));}
      if(paused.id!==link.provider_listing_id||String(paused.seller_id)!==connection.seller_reference||paused.status!=='paused'||paused.available_quantity!==0)throw new MarketplaceError(409,'pause_stock_unconfirmed','Pausa/saldo zero ainda não confirmados conjuntamente.');
      await saveListing(db,connection,paused,false);
      const refreshed=await db.from('marketplace_product_links').update({reported_stock:0,status:'paused',updated_at:new Date().toISOString()}).eq('id',link.id).eq('empresa_id',job.empresa_id).eq('product_id',job.product_id);assertDatabase(refreshed.error);
      outcome='synced';
    }
    else if (userProductIssue) issue=userProductIssue;
    else if (policy === 'inactive') { if(item.status==='paused'&&job.desired_quantity>0)issue='paused_listing_review';else outcome='excluded'; }
    else if (policy === 'equal') { await saveListing(db, connection, item, false); outcome = 'synced'; }
    else if (policy !== 'write') issue = policy;
    else {
      if ((item.available_quantity as number) < job.desired_quantity) {
        const blocker = await stockIncreaseBlocker(db, job.empresa_id, job.product_id);
        if (blocker) throw new MarketplaceError(409, blocker, 'Há venda relacionada aguardando conferência.');
      }
      // A revisão pode ter mudado durante as consultas. Jamais enviar um saldo antigo.
      const latest = await db.from('marketplace_products').select('stock_quantity,revision,listing_stock_review_at').eq('empresa_id', job.empresa_id).eq('id', job.product_id).is('archived_at',null).maybeSingle();
      assertDatabase(latest.error);
      if (!latest.data || latest.data.listing_stock_review_at || latest.data.stock_quantity !== job.desired_quantity || latest.data.revision !== product.revision) throw new MarketplaceError(409, 'stock_changed', 'O estoque foi atualizado durante a conferência.');
      if (Date.now() > deadline - 16_000) throw new MarketplaceError(409, 'worker_time_limit', 'A atualização continuará na próxima tentativa.');
      await mlRequest(db, connection, `/items/${link.provider_listing_id}`, 'PUT', { available_quantity: job.desired_quantity });
      const verified = objectValue(await mlRequest(db, connection, `/items/${link.provider_listing_id}`));
      if (verified.id !== link.provider_listing_id || String(verified.seller_id) !== connection.seller_reference || verified.available_quantity !== job.desired_quantity) throw new MarketplaceError(409, 'remote_stock_unconfirmed', 'O Mercado Livre ainda não confirmou o saldo enviado.');
      await saveListing(db, connection, verified, false);
      const refreshed = await db.from('marketplace_product_links').update({ reported_stock: job.desired_quantity, status: verified.status, updated_at: new Date().toISOString() }).eq('id', link.id).eq('empresa_id', job.empresa_id).eq('product_id', job.product_id);
      assertDatabase(refreshed.error); outcome = 'synced';
    }
  } catch (error) { issue = failureCode(error); }
  // Uma nova baixa pode ter substituído o job. Não apagar a pendência mais recente.
  const result = await db.from('marketplace_inventory_outbox').update({ state: outcome, issue, attempts: job.attempts + 1,
    next_attempt_at: new Date(Date.now() + Math.min(15, 2 ** Math.min(job.attempts, 4)) * 60_000).toISOString(),
    synced_at: outcome === 'synced' ? new Date().toISOString() : null,
    protected_at: outcome === 'protected' ? new Date().toISOString() : null,
  }).eq('link_id', job.link_id).eq('empresa_id', job.empresa_id).eq('product_id', job.product_id).eq('revision', job.revision).eq('generation', job.generation);
  assertDatabase(result.error);
}

/** Varredura paginada com janela fixa e sobreposição de uma hora (precisão dos filtros ML). */
export async function reconcileOrders(db: SupabaseClient, connection: SellerConnection, activatedAt: string) {
  const { data: existing, error } = await db.from('marketplace_inventory_reconciliation').select('*').eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).maybeSingle();
  assertDatabase(error);
  const checkpoint = existing?.checkpoint || activatedAt, end = existing?.window_end || new Date().toISOString(), offset = existing?.scan_offset || 0;
  const query = new URLSearchParams({ seller: connection.seller_reference, 'order.date_last_updated.from': new Date(new Date(checkpoint).getTime() - 3_600_000).toISOString(),
    'order.date_last_updated.to': new Date(Math.ceil(new Date(end).getTime() / 3_600_000) * 3_600_000).toISOString(), offset: String(offset), limit: '50', sort: 'date_asc' });
  const { orders, more, nextOffset } = await readOrderSearchPages(db, connection, query);
  for (const order of orders) {
    const id = String(order.id);
    // O payload público nunca é confiado para baixar estoque: o processador relê /orders/id.
    const stamp = typeof order.last_updated === 'string' ? order.last_updated : end;
    const queued = await db.from('marketplace_sale_notifications').upsert({ id: `reconcile:${connection.id}:${id}:${stamp}`, empresa_id: connection.empresa_id,
      connection_id: connection.id, provider: 'mercado_livre', topic: 'orders_v2', resource: `/orders/${id}` }, { onConflict: 'id', ignoreDuplicates: true });
    assertDatabase(queued.error);
  }
  const saved = await db.from('marketplace_inventory_reconciliation').upsert({ connection_id: connection.id, empresa_id: connection.empresa_id,
    checkpoint: more ? checkpoint : end, window_end: more ? end : null, scan_offset: nextOffset, checked_at: new Date().toISOString(), issue: null });
  assertDatabase(saved.error);
}

export async function runMarketplaceWorker(db: SupabaseClient) {
  // Falta de configuração local não pode expirar as conexões reais nem escrever no ML.
  if (!process.env.MARKETPLACE_SECRETS_KEY || !((process.env.MERCADOLIVRE_CLIENT_ID&&process.env.MERCADOLIVRE_CLIENT_SECRET)||(process.env.MAGALU_CLIENT_ID&&process.env.MAGALU_CLIENT_SECRET))) return { configured: false };
  const owner = randomUUID(), claimed = await db.rpc('marketplace_worker_claim', { p_owner: owner });
  assertDatabase(claimed.error); if (!claimed.data) return { busy: true };
  const deadline = Date.now() + 40_000;
  let issue: string | null = null;
  try {
    const settings = await db.from('marketplace_inventory_settings').select('empresa_id,activated_at').eq('enabled', true);
    assertDatabase(settings.error);
    const companies = (settings.data || []).map(row => row.empresa_id);
    if (!companies.length) return { ok: true };
    const modules = await db.from('empresa_modulos').select('empresa_id,expira_em').in('empresa_id', companies).eq('modulo_id', 'marketplaces').eq('ativo', true);
    assertDatabase(modules.error);
    const enabled = (modules.data || []).filter(row => !row.expira_em || new Date(row.expira_em).getTime() > Date.now()).map(row => row.empresa_id);
    if (!enabled.length) return { ok: true };
    const worker = await db.from('marketplace_inventory_worker').select('turn').eq('id', 1).maybeSingle();
    assertDatabase(worker.error);
    const turn = Number(worker.data?.turn || 0) % 3;
    // Contingência aos webhooks: reconfere também IDs que sumiram da busca.
    // Rodízio próprio e orçamento curto preservam as rodadas de vendas/estoque.
    if(Number(worker.data?.turn||0)%4===3&&Date.now()<deadline-24_000){
      const candidates=await db.from('marketplace_connections').select('id,empresa_id').in('empresa_id',enabled)
        .eq('provider','mercado_livre').eq('status','connected').order('last_checked_at',{nullsFirst:true}).limit(1);
      assertDatabase(candidates.error);
      if(candidates.data?.[0]){
        const candidate=candidates.data[0];
        try{const {refreshKnownListingStatuses}=await import('./listing-status-refresh');await refreshKnownListingStatuses(db,await loadConnection(db,candidate.empresa_id,candidate.id),deadline-16_000);}
        catch(error){issue=failureCode(error);}
        finally{const rotated=await db.from('marketplace_connections').update({last_checked_at:new Date().toISOString()}).eq('empresa_id',candidate.empresa_id).eq('id',candidate.id);assertDatabase(rotated.error);}
      }
    }
    const refreshMagalu = async () => {
      if (!process.env.MAGALU_CLIENT_ID || !process.env.MAGALU_CLIENT_SECRET || Date.now() > deadline - 30_000) return;
      const accounts = await db.from('marketplace_connections').select('id,empresa_id,provider,status,last_error_code,last_checked_at')
        .in('empresa_id', enabled).eq('provider', 'magalu').in('status', ['connected', 'attention']).order('last_checked_at', { nullsFirst: true });
      assertDatabase(accounts.error);
      const candidate = accounts.data?.find(salesAccountAvailable);
      if (!candidate) return;
      try {
        const { loadMagaluConnection } = await import('./magalu-request');
        const { syncMagaluSales } = await import('./magalu-sales');
        const connection=await loadMagaluConnection(db, candidate.empresa_id, candidate.id);
        await syncMagaluSales(db, connection, deadline - 3_000);
        if(Date.now()<deadline-30_000){const {synchronizeMagaluListings}=await import('./magalu-listings');await synchronizeMagaluListings(db,connection,deadline-2000);}
      } catch (error) { issue = failureCode(error); }
      // O rodízio inclui falhas: uma loja sem permissão não bloqueia as demais.
      const checked = await db.from('marketplace_connections').update({ last_checked_at: new Date().toISOString() })
        .eq('empresa_id', candidate.empresa_id).eq('id', candidate.id).eq('provider', 'magalu');
      assertDatabase(checked.error);
    };
    const refreshPending = async () => {
      if (Date.now() > deadline - 24_000) return;
      const accounts = await db.from('marketplace_connections').select('id').in('empresa_id', enabled).eq('provider', 'mercado_livre').eq('status', 'connected');
      assertDatabase(accounts.error);
      if (!accounts.data?.length) return;
      const sale = await db.from('marketplace_pending_sales').select('*').in('empresa_id', enabled)
        .in('connection_id', accounts.data.map(row => row.id)).eq('provider', 'mercado_livre')
        .lte('checked_at', new Date(Date.now() - 5 * 60_000).toISOString()).order('checked_at').order('provider_order_id').limit(1).maybeSingle();
      assertDatabase(sale.error);
      if (sale.data) {
        try { await syncOrder(db, await loadConnection(db, sale.data.empresa_id, sale.data.connection_id), sale.data.provider_order_id, deadline - 5_000); }
        catch (error) {
          issue = failureCode(error);
          // Falha não torna o retrato atual; apenas adia a tentativa para dar vez aos demais pedidos.
          const delayed = await db.from('marketplace_sales').update({ operation_checked_at: new Date().toISOString() })
            .eq('empresa_id', sale.data.empresa_id).eq('connection_id', sale.data.connection_id).eq('provider_order_id', sale.data.provider_order_id);
          assertDatabase(delayed.error);
        }
      }
    };
    let delivered = false;
    const deliver = async () => {
      if (delivered || Date.now() > deadline - 18_000) return;
      const jobs = await db.from('marketplace_inventory_outbox').select('*').in('empresa_id', enabled).eq('state', 'pending').lte('next_attempt_at', new Date().toISOString()).order('next_attempt_at').limit(50);
      assertDatabase(jobs.error);
      for (const job of jobs.data || []) {
        if (Date.now() > deadline - 16_000) break;
        delivered = true; await deliverStockJob(db, job, deadline);
      }
    };
    const reconcile = async (history = false) => {
      if (Date.now() > deadline - 8_000) return;
      const connections = await db.from('marketplace_connections').select('id,empresa_id').in('empresa_id', enabled).eq('provider', 'mercado_livre').eq('status', 'connected');
      assertDatabase(connections.error);
      const cursors = await db.from('marketplace_inventory_reconciliation').select('*').in('empresa_id', enabled);
      assertDatabase(cursors.error);
      const cursorByAccount = new Map((cursors.data || []).map(row => [row.connection_id, row]));
      const eligible = (connections.data || []).filter(row => !history || !cursorByAccount.get(row.id)?.history_completed_at);
      const checkedAt = (id: string) => { const cursor = cursorByAccount.get(id); return String((history ? cursor?.history_checked_at : cursor?.checked_at) || ''); };
      const candidate = eligible.sort((a, b) => checkedAt(a.id).localeCompare(checkedAt(b.id)) || a.id.localeCompare(b.id))[0];
      if (!candidate) return;
      const activatedAt = settings.data!.find(row => row.empresa_id === candidate.empresa_id)!.activated_at;
      try {
        const connection = await loadConnection(db, candidate.empresa_id, candidate.id);
        if (history) await reconcileSalesHistory(db, connection, activatedAt);
        else await reconcileOrders(db, connection, activatedAt);
      }
      catch (error) {
        issue = failureCode(error);
        const current = await db.from('marketplace_inventory_reconciliation').select('checkpoint').eq('connection_id', candidate.id).maybeSingle();
        assertDatabase(current.error);
        const saved = await db.from('marketplace_inventory_reconciliation').upsert({ connection_id: candidate.id, empresa_id: candidate.empresa_id,
          checkpoint: current.data?.checkpoint || activatedAt,
          ...(history && issue !== 'sales_history_setup' ? { history_checked_at: new Date().toISOString() } : { checked_at: new Date().toISOString() }), issue }, { onConflict: 'connection_id' });
        assertDatabase(saved.error);
      }
    };
    // Alterna a prioridade: fila de vendas não pode impedir indefinidamente envio de estoque/varredura.
    if (turn === 0) await deliver();
    // Histórico usa rodada própria e rodízio próprio; não ocupa a janela de vendas novas.
    if (turn === 2) await reconcile(true);
    // Reconfere pedidos e pós-vendas ainda abertos mesmo sem novo webhook.
    if (turn === 1) { await refreshMagalu(); await refreshPending(); }
    const queued = await db.from('marketplace_sale_notifications').select('empresa_id,connection_id').in('empresa_id', enabled).is('processed_at', null).lte('next_attempt_at', new Date().toISOString()).order('priority').order('created_at').limit(100);
    assertDatabase(queued.error);
    for (const row of [...new Map((queued.data || []).map(row => [row.connection_id, row])).values()]) {
      if (Date.now() > deadline - 16_000) break;
      try { await processSaleNotifications(db, await loadConnection(db, row.empresa_id, row.connection_id), 3, deadline - 16_000); } catch (error) { issue = failureCode(error); }
    }
    const pending = await db.from('marketplace_inventory_events').select('id,empresa_id,connection_id,provider,listing_id,variation_id,issue').in('empresa_id', enabled).eq('state', 'pending').order('updated_at').limit(20);
    assertDatabase(pending.error);
    const checkedLinks = new Set<string>();
    for (const event of pending.data || []) {
      const key = `${event.connection_id}:${event.listing_id}`;
      if (event.provider === 'mercado_livre' && event.issue === 'product_not_linked' && !event.variation_id
        && !checkedLinks.has(key) && checkedLinks.size < 2 && Date.now() < deadline - 16_000) {
        checkedLinks.add(key);
        try {
          const connection = await loadConnection(db, event.empresa_id, event.connection_id);
          await (await import('./sale-listing-link')).resolveSaleListingLink(db, connection, event.listing_id, deadline);
        } catch { /* Vínculo incerto permanece pendente, nunca baixa por título ou EAN. */ }
      }
      const applied = await db.rpc('marketplace_apply_inventory_event', { p_id: event.id }); assertDatabase(applied.error);
    }
    delivered=false;await deliver();
    if (turn !== 2) await reconcile();
    return { ok: !issue };
  } catch (error) { issue = failureCode(error); throw error; }
  finally {
    const released = await db.from('marketplace_inventory_worker').update({ lease_owner: null, lease_until: null, finished_at: new Date().toISOString(), issue }).eq('id', 1).eq('lease_owner', owner);
    assertDatabase(released.error);
  }
}
