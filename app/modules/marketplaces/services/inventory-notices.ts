import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { InventoryNotice } from '../live-feed';
import { inventoryRows, type InventoryRow } from './inventory-read';
import { objectValue } from './listing-model';
import { saleItemEan } from '../sale-items';
import {stockDivergence,listingStockAlertsEnabled,listingStockSyncTerminated} from '../stock-reconciliation';

const text = (value: unknown): string | null => typeof value === 'string' && value ? value.slice(0,500) : null;
/** Somente leitura; não baixa estoque nem esconde eventos alterando seu estado. */
export async function readInventoryNotices(db: SupabaseClient, company: string): Promise<InventoryNotice[]> {
  const signal = AbortSignal.timeout(6000);
  const read = (table: string, columns: string) => db.from(table).select(columns).eq('empresa_id',company).abortSignal(signal);
  const [events,jobs,reconciliations,notifications,imports] = await Promise.all([
    inventoryRows((from,to)=>read('marketplace_inventory_events','id,product_id,connection_id,listing_id,provider,order_id,state,issue,confirmed_at').not('issue','is',null).order('id').range(from,to)),
    inventoryRows((from,to)=>read('marketplace_inventory_outbox','link_id,product_id,state,issue,next_attempt_at').in('state',['pending','protected']).order('link_id').range(from,to)),
    inventoryRows((from,to)=>read('marketplace_inventory_reconciliation','connection_id,issue').not('issue','is',null).order('connection_id').range(from,to)),
    inventoryRows((from,to)=>read('marketplace_sale_notifications','id,connection_id,provider,error_code,resource,topic').is('processed_at',null).not('error_code','is',null).order('id').range(from,to)),
    // Ler a escolha pendente antes do produto evita um vazio entre escolher
    // o cadastro (remove esta linha) e a conferência física (mantém o marcador).
    inventoryRows((from,to)=>read('marketplace_listing_import_issues','connection_id,provider,provider_listing_id,title,issue,candidate_product_ids').order('provider_listing_id').range(from,to)),
  ]);
  const [products,links,accounts,labels] = await Promise.all([
    inventoryRows((from,to)=>read('marketplace_products','id,name,sku,ean,stock_quantity,stock_confirmed_at,stock_baseline_at,listing_stock_review_at').order('id').range(from,to)),
    inventoryRows((from,to)=>read('marketplace_product_links','id,product_id,connection_id,provider_listing_id,provider,reported_stock,status').order('id').range(from,to)),
    inventoryRows((from,to)=>read('marketplace_connections','id,seller_name,provider').order('id').range(from,to)),
    inventoryRows((from,to)=>read('marketplace_connection_labels','connection_id,local_label').order('connection_id').range(from,to)),
  ]);
  const byProduct = new Map(products.map(row=>[String(row.id),row]));
  const missing = events.filter(event=>!byProduct.has(String(event.product_id)) && !links.some(link=>link.connection_id===event.connection_id && link.provider_listing_id===event.listing_id && byProduct.has(String(link.product_id))));
  const listingNames = new Map<string,InventoryRow>();
  for (const account of new Set(missing.map(row=>String(row.connection_id)))) {
    const ids = [...new Set(missing.filter(row=>row.connection_id===account).map(row=>String(row.listing_id)))];
    for (let offset=0;offset<ids.length;offset+=100) {
      const rows = await inventoryRows((from,to)=>read('marketplace_listings','connection_id,provider,provider_listing_id,snapshot').eq('connection_id',account).in('provider_listing_id',ids.slice(offset,offset+100)).order('id').range(from,to));
      for (const row of rows) listingNames.set(`${row.provider}:${row.connection_id}:${row.provider_listing_id}`,objectValue(row.snapshot));
    }
  }
  const identity = (row: InventoryRow, link?: InventoryRow): Omit<InventoryNotice,'id'|'source'|'code'> => {
    const product = byProduct.get(String(link?.product_id || row.product_id));
    const accountId = link?.connection_id || row.connection_id;
    const account = accounts.find(item=>item.id===accountId);
    const provider = text(row.provider || link?.provider || account?.provider) || 'mercado_livre';
    const listing = listingNames.get(`${provider}:${accountId}:${link?.provider_listing_id || row.listing_id}`);
    return { productId:text(product?.id), productName:text(product?.name) || text(listing?.title), ean:text(product?.ean) || saleItemEan(listing?.ean), listingId:text(link?.provider_listing_id || row.listing_id), connectionId:text(accountId), accountName:text(labels.find(item=>item.connection_id===accountId)?.local_label) || text(account?.seller_name), orderId:text(row.order_id), provider };
  };
  const notices: InventoryNotice[] = [];
  const statusChecks=await inventoryRows((from,to)=>read('marketplace_listing_status_checks','connection_id,issue').not('issue','is',null).order('connection_id').range(from,to));
  for(const row of statusChecks)notices.push({id:`listing-status:${row.connection_id}`,source:'account',code:'listing_refresh_partial',...identity(row)});
  for(const row of imports)notices.push({id:`import:${row.connection_id}:${row.provider_listing_id}`,source:'account',code:String(row.issue),...identity({...row,listing_id:row.provider_listing_id}),productName:text(row.title),candidateProducts:products.filter(p=>Array.isArray(row.candidate_product_ids)&&row.candidate_product_ids.includes(p.id)).map(p=>({id:String(p.id),name:String(p.name),ean:text(p.ean),sku:text(p.sku)}))});
  const actions=await inventoryRows((from,to)=>read('marketplace_listing_actions','id,connection_id,provider_listing_id,action,status').in('status',['requested','uncertain']).order('id').range(from,to));
  for(const action of actions){
    const link=links.find(l=>l.connection_id===action.connection_id&&l.provider_listing_id===action.provider_listing_id);
    if(action.action==='pause'&&link&&listingStockSyncTerminated(link.status))continue;
    notices.push({id:`listing-action:${action.id}`,source:'account',code:`listing_${action.action}_unconfirmed`,...identity({...action,listing_id:action.provider_listing_id},link)});
  }
  for(const product of products){
    if(!product.listing_stock_review_at)continue;
    const link=links.find(l=>l.product_id===product.id&&!listingStockSyncTerminated(l.status));
    if(!link)continue;
    notices.push({id:`import-stock:${product.id}`,source:'stock',code:'import_stock_review',...identity({product_id:product.id},link)});
  }
  for (const event of events) {
    const link = links.find(row=>row.connection_id===event.connection_id && row.provider_listing_id===event.listing_id && row.provider===event.provider);
    const product = byProduct.get(String(link?.product_id || event.product_id));
    const baseline = Date.parse(String(product?.stock_baseline_at));
    const historical = Number.isFinite(baseline) && Date.parse(String(event.confirmed_at))<=baseline;
    // Um alerta antigo de falta não permanece verdadeiro após conferir o saldo atual.
    if (event.state!=='pending' && historical) continue;
    let code = String(event.issue);
    if (code==='stock_not_confirmed' && product?.stock_quantity!=null && product?.stock_confirmed_at) code=historical?'baseline_reconciliation':'sale_reconciliation';
    notices.push({id:`sale:${event.id}`,source:'sale',code,...identity(event,link)});
  }
  for (const job of jobs) {
    const link = links.find(row=>row.id===job.link_id);
    if(link&&listingStockSyncTerminated(link.status))continue;
    if(job.issue==='import_stock_review' && byProduct.get(String(job.product_id))?.listing_stock_review_at)continue;
    // Não exige reposição/saldo de anúncio comprovadamente fora de venda.
    // Mantém a fila intacta, as vendas reais e erros de autorização, envio ou pausa incerta.
    if(link && !listingStockAlertsEnabled(link.status) && ['queued','paused_listing_review','stock_not_confirmed','local_stock_unset','stock_divergence','insufficient_stock','lower_remote_stock'].includes(text(job.issue)||'queued'))continue;
    notices.push({id:`stock:${job.link_id}`,source:'stock',code:job.issue==='stock_not_confirmed'?'remote_stock_unconfirmed':text(job.issue)||'queued',...identity(job,link),nextAttemptAt:text(job.next_attempt_at)});
  }
  for (const row of reconciliations) notices.push({id:`account:${row.connection_id}`,source:'account',code:String(row.issue),...identity(row)});
  for (const row of notifications) {
    const id = String(row.resource).split('/').pop();
    const link = row.topic==='items'?links.find(item=>item.connection_id===row.connection_id && item.provider_listing_id===id):undefined;
    notices.push({id:`notification:${row.id}`,source:'account',code:String(row.error_code),...identity({...row,order_id:['orders_v2','orders'].includes(String(row.topic))?id:null},link)});
  }
  for(const product of products){
    // Esgotamento não é pendência. Falhas reais da fila/pausa continuam acima.
    if(product.stock_quantity===0&&!product.listing_stock_review_at)continue;
    if(notices.some(n=>n.productId===product.id))continue;
    const linked=links.filter(l=>l.product_id===product.id && listingStockAlertsEnabled(l.status));
    const hint=stockDivergence(product.stock_quantity as number|null,linked as unknown as Array<{provider:string;reported_stock:number|null;status:string}>);
    if(hint)notices.push({id:`divergence:${product.id}`,source:'stock',code:product.stock_quantity==null?'local_stock_unset':hint==='Pausa pendente'?'pause_unconfirmed':'stock_divergence',...identity({product_id:product.id},linked.find(l=>['mercado_livre','magalu'].includes(String(l.provider))))});
  }
  // Pontuação é acompanhada visualmente no anúncio; não gera pendência.
  return notices;
}
