import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inventoryRows } from './inventory-read';

/** Um evento identificado só bloqueia seu produto, incluindo anúncios/contas que compartilham o saldo. */
export async function stockIncreaseBlocker(db: SupabaseClient, company: string, product: string): Promise<'pending_product_sales' | 'pending_unidentified_sales' | null> {
  const signal = AbortSignal.timeout(5000);
  const links = await inventoryRows((from,to) => db.from('marketplace_product_links').select('connection_id,provider,provider_listing_id').eq('empresa_id',company).eq('product_id',product).in('provider',['mercado_livre','magalu']).order('id').range(from,to).abortSignal(signal));
  const known = await inventoryRows((from,to) => db.from('marketplace_inventory_events').select('id').eq('empresa_id',company).eq('product_id',product).eq('state','pending').order('id').range(from,to).abortSignal(signal));
  if (known.length) return 'pending_product_sales';
  const accounts = [...new Set(links.map(link=>String(link.connection_id)))];
  for (const account of accounts) {
    if (links.some(link=>link.connection_id===account&&link.provider==='magalu')) {
      const sync=await db.from('marketplace_magalu_sales_sync').select('scan_offset,window_end,last_completed_at').eq('empresa_id',company).eq('connection_id',account).abortSignal(signal).maybeSingle();
      // Sem webhook confirmado, não repõe saldo enquanto a varredura de pedidos está incompleta ou antiga.
      if(sync.error||!sync.data||Number(sync.data.scan_offset)!==0||sync.data.window_end||!sync.data.last_completed_at||!Number.isFinite(Date.parse(sync.data.last_completed_at))||Date.parse(sync.data.last_completed_at)<Date.now()-5*60_000)return 'pending_unidentified_sales';
    }
    const ids = new Set(links.filter(link=>link.connection_id===account).map(link=>String(link.provider_listing_id)));
    // Considera também eventos ainda não associados ao cadastro e todos os anúncios do mesmo saldo.
    const events = await inventoryRows((from,to) => db.from('marketplace_inventory_events').select('listing_id').eq('empresa_id',company).eq('connection_id',account).eq('state','pending').order('id').range(from,to).abortSignal(signal));
    if (events.some(event=>ids.has(String(event.listing_id)))) return 'pending_product_sales';
    const notifications = await inventoryRows((from,to) => db.from('marketplace_sale_notifications').select('topic,resource').eq('empresa_id',company).eq('connection_id',account).is('processed_at',null).order('id').range(from,to).abortSignal(signal));
    // Antes de ler um pedido/envio, não é seguro afirmar quais produtos foram vendidos.
    // Essa precaução fica limitada à conta relacionada, não à empresa inteira.
    if (notifications.some(row=>row.topic!=='items' || ids.has(String(row.resource).split('/').pop() || ''))) return 'pending_unidentified_sales';
  }
  return null;
}
