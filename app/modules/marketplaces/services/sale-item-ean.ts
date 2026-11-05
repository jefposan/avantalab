import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketplaceSale } from './mercadolivre-sales';
import { listingIdIsValid, objectValue } from './listing-model';
import { saleItemEan } from '../sale-items';
import {magaluSku} from '../magalu-listing-model';

/** Somente leitura do anúncio da mesma empresa/conta, nunca procura por SKU ou nome. */
export async function withSaleItemEans(db: SupabaseClient, company: string, sales: MarketplaceSale[], budgetMs = 5000): Promise<MarketplaceSale[]> {
  const deadline=Date.now()+Math.max(0,budgetMs);
  const accounts = new Map<string,Set<string>>();
  const providers=new Map<string,string>();
  for (const sale of sales) for (const item of sale.items) {
    if (item.ean || typeof item.listingId!=='string' || !(sale.provider==='magalu'?magaluSku(item.listingId):listingIdIsValid(item.listingId))) continue;
    providers.set(sale.connectionId,sale.provider==='magalu'?'magalu':'mercado_livre');
    if (!accounts.has(sale.connectionId)) accounts.set(sale.connectionId,new Set());
    accounts.get(sale.connectionId)!.add(item.listingId);
  }
  const listings = new Map<string,Record<string,unknown>>(), failed = new Set<string>();
  for (const [account,values] of accounts) {
    const ids = [...values];
    for (let offset=0;offset<ids.length;offset+=100) {
      const batch=ids.slice(offset,offset+100);
      if (Date.now() >= deadline) { for (const id of batch) failed.add(`${account}:${id}`); continue; }
      try {
        const result=await db.from('marketplace_listings').select('provider_listing_id,snapshot').eq('empresa_id',company).eq('connection_id',account).eq('provider',providers.get(account)!).abortSignal(AbortSignal.timeout(Math.max(1,deadline-Date.now()))).in('provider_listing_id',batch);
        if (result.error) throw result.error;
        for (const row of result.data || []) if (batch.includes(row.provider_listing_id)) listings.set(`${account}:${row.provider_listing_id}`,objectValue(row.snapshot));
      } catch { for (const id of batch) failed.add(`${account}:${id}`); }
    }
  }
  return sales.map(sale=>({...sale,items:sale.items.map(item=>{
    if (item.ean || !item.listingId) return item;
    const key=`${sale.connectionId}:${item.listingId}`,snapshot=listings.get(key);
    if (failed.has(key)) return {...item,eanUnavailable:true};
    if (!snapshot) return item;
    const variations=(Array.isArray(snapshot.variations)?snapshot.variations:[]).map(objectValue);
    const ean=item.variationId ? saleItemEan(variations.find(row=>String(row.id)===item.variationId)?.ean) : variations.length ? null : saleItemEan(snapshot.ean);
    return {...item,ean};
  })}));
}
