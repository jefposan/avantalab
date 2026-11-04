import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { findProductSearchIds, type ProductSearchRow } from '../local-product-search';
import { productAllocations } from './warehouses';
import {uuidIsValid} from './listing-model';
import { PUBLICATION_PROVIDERS, PUBLICATION_STATUS_QUERY } from '../local-product-publications';

type CatalogRow={id:string;name:string;ean:string|null;description:string;pictures:string[];price_cents:number|null;stock_quantity:number|null;stock_confirmed_at:string|null;created_at:string;updated_at:string;publication_link?:unknown;stock_balance?:unknown};

/** Projeção de leitura do mesmo cadastro usado por Produtos e estoque, sem criar histórico. */
export async function readPriceCatalog(db: SupabaseClient, companyId: string, search: string, page: number, sort: string, signal?: AbortSignal, warehouseId = '') {
  const term = search.trim();
  if(warehouseId&&!uuidIsValid(warehouseId))throw new MarketplaceError(400,'invalid_warehouse','Selecione um estoque válido.');
  if(warehouseId&&sort==='without_stock')throw new MarketplaceError(400,'invalid_stock_filter','Selecione Todos para visualizar produtos sem estoque.');
  if (term.length > 120 || !Number.isSafeInteger(page) || page < 1) throw new MarketplaceError(400, 'invalid_search', 'Confira o termo e a página da pesquisa.');
  if (!['alpha','date','created','advertised','with_stock','without_stock'].includes(sort)) throw new MarketplaceError(400,'invalid_sort','Selecione uma opção válida para a lista de produtos.');
  const timeout = AbortSignal.timeout(20_000);
  const deadline = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const orderColumn=sort==='date'?'updated_at':sort==='created'?'created_at':'name';
  const ascending=!['date','created'].includes(sort);
  if(warehouseId){
    const w=await db.from('marketplace_warehouses').select('id').eq('empresa_id',companyId).eq('id',warehouseId).is('archived_at',null).maybeSingle();
    if(w.error)throw new MarketplaceError(503,'warehouses_unavailable','Não foi possível conferir o estoque selecionado.');
    if(!w.data)throw new MarketplaceError(404,'warehouse_missing','Estoque não encontrado nesta empresa.');
  }
  const stockFilter=Boolean(warehouseId)||sort==='with_stock'||sort==='without_stock';
  const joins=(sort==='advertised'?',publication_link:marketplace_product_links()':'')+(stockFilter?',stock_balance:marketplace_warehouse_balances(quantity,warehouse_id,warehouse:marketplace_warehouses!inner(id))':'');
  // Aplicar filtros antes da contagem/paginação, não só nos 25 itens da tela.
  const scoped=(columns:string,count?:'exact')=>{
    let query=db.from('marketplace_products').select(columns+joins,count?{count}:{}).eq('empresa_id',companyId).is('archived_at',null);
    if(sort==='advertised')query=query.eq('publication_link.empresa_id',companyId).in('publication_link.provider',PUBLICATION_PROVIDERS).neq('publication_link.provider_listing_id','').or(PUBLICATION_STATUS_QUERY,{referencedTable:'publication_link'}).not('publication_link','is',null);
    if(stockFilter){
      query=query.eq('stock_balance.empresa_id',companyId).eq('stock_balance.warehouse.empresa_id',companyId).is('stock_balance.warehouse.archived_at',null).gt('stock_balance.quantity',0);
      if(warehouseId)query=query.eq('stock_balance.warehouse_id',warehouseId);
      query=sort==='without_stock'?query.is('stock_balance',null):query.not('stock_balance','is',null);
    }
    return query;
  };
  let ids: string[] | null = null;
  if (term) {
    try {
      ids = await findProductSearchIds(async offset => {
        const { data, error } = await scoped('id,name,sku,ean,description').order(orderColumn,{ascending}).order('id').range(offset, offset + 199).abortSignal(deadline);
        if (error) throw error;
        return (data || []) as unknown as ProductSearchRow[];
      }, term, deadline);
    } catch { throw new MarketplaceError(503, 'catalog_search', 'Não foi possível concluir a pesquisa dos produtos. Tente novamente.'); }
    if (!ids.slice((page - 1) * 25, page * 25).length) return { products: [], total: ids.length, page };
  }
  let query = scoped('id,name,ean,description,pictures,price_cents,stock_quantity,stock_confirmed_at,created_at,updated_at','exact');
  if (ids) query = query.in('id', ids.slice((page - 1) * 25, page * 25));
  else query = query.order(orderColumn,{ascending}).order('id').range((page - 1) * 25, page * 25 - 1);
  const { data, error, count } = await query.abortSignal(deadline);
  if (error) throw new MarketplaceError(503, 'catalog_unavailable', 'Não foi possível carregar os produtos da empresa.');
  const rows=(data||[]) as unknown as CatalogRow[];
  const products = ids ? [...rows].sort((a,b) => ids!.indexOf(a.id) - ids!.indexOf(b.id)) : rows;
  let allocations:Awaited<ReturnType<typeof productAllocations>>|null=null;
  try {allocations=await productAllocations(db,companyId,products.map(p=>p.id));}catch { /* Falha não vira distribuição vazia. */ }
  return { products:products.map(p=>{
    const distribution=allocations?.get(p.id);
    const {publication_link,stock_balance,...product}=p;
    void publication_link;void stock_balance;
    const balances=Array.isArray(stock_balance)?stock_balance as Array<{warehouse_id:string;quantity:number|null}>:[];
    const selected=warehouseId?balances.find(b=>b.warehouse_id===warehouseId):undefined;
    return {...product,...(warehouseId?{selected_stock_quantity:selected?.quantity??null}:{}),...(distribution?{allocations:distribution,total_stock_quantity:distribution.some(b=>b.quantity==null)?null:distribution.reduce((sum,b)=>sum+(b.quantity||0),0)}:{})};
  }), total: ids?.length ?? count ?? 0, page };
}
