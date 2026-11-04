import { NextResponse } from 'next/server';
import { normalizarTexto } from '@/app/lib/formatters';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { uuidIsValid } from '@/app/modules/marketplaces/services/listing-model';
import { dateOrder } from '@/app/modules/marketplaces/date-order';
import {salesAccountAvailable} from '@/app/modules/marketplaces/magalu-sales-model';
import {withListingPriceReferences} from '@/app/modules/marketplaces/services/listing-price-references';
import type {ListingGroup} from '@/app/modules/marketplaces/listing-groups';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    const connectionId = params.get('connectionId');
    const allAccounts = params.get('scope') === 'all';
    if (!allAccounts && !uuidIsValid(connectionId)) throw new MarketplaceError(400, 'select_account', 'Selecione uma conta.');
    const provider=params.get('marketplace')||'mercado_livre';
    if(!['mercado_livre','magalu'].includes(provider))throw new MarketplaceError(400,'invalid_provider','Marketplace não integrado.');
    const { data: connections, error: connectionError } = await db.from('marketplace_connections').select('id,provider,status,last_error_code').eq('empresa_id', empresaId).eq('provider', provider).in('status', ['connected','attention']);
    if (connectionError) throw connectionError;
    const ids = (connections || []).filter(salesAccountAvailable).map(row => row.id);
    if (!allAccounts && !ids.includes(connectionId!)) throw new MarketplaceError(403, 'invalid_account', 'A conta não está conectada nesta empresa.');
    const page = Math.max(1, Math.min(10000, Number(params.get('page')) || 1));
    if (!ids.length) return NextResponse.json({ listings: [], total: 0, page }, { headers: { 'Cache-Control': 'no-store' } });
    const countOnly=params.get('countOnly')==='1',skipCount=params.get('skipCount')==='1';
    if(params.get('grouped')==='1'){
      const status=params.get('status')||'';
      const search=normalizarTexto((params.get('q')||'').slice(0,120)).replace(/[%_\\]/g,'');
      const quality=['low','unknown','lowest'].includes(params.get('quality')||'')?params.get('quality'):null;
      const result=await db.rpc(quality?'marketplace_quality_grouped_listings':'marketplace_grouped_listings',{p_empresa:empresaId,p_connections:allAccounts?ids:[connectionId!],p_search:search,
        p_status:['active','paused','closed','under_review','inactive','deleted'].includes(status)?status:'',p_order:dateOrder(params.get('order')),p_page:page,p_count_only:countOnly,p_listing:(params.get('listingId')||'').slice(0,200),...(quality?{p_quality:quality}:{})}).abortSignal(request.signal);
      if(result.error)throw new MarketplaceError(503,'grouped_listings_unavailable','Não foi possível carregar os anúncios agrupados. Os dados existentes foram preservados; tente novamente.');
      const payload=result.data as {groups:ListingGroup[];total:number;listingTotal:number;page:number};
      const groups=await withListingPriceReferences(db,empresaId,payload.groups,request.signal);
      return NextResponse.json({...payload,groups,listings:groups.flatMap(group=>group.listings)},{headers:{'Cache-Control':'no-store'}});
    }
    let query = db.from('marketplace_listing_operations').select(countOnly?'provider_listing_id':'snapshot,status,operations,operationalStatus:operational_status,connectionId:connection_id', countOnly ? {count:'exact',head:true} : skipCount ? {} : { count: 'exact' }).eq('empresa_id', empresaId);
    query = allAccounts ? query.in('connection_id', ids) : query.eq('connection_id', connectionId);
    // Navegação de pendências mantém empresa, plataforma e conta autorizadas acima.
    const listingId=params.get('listingId');
    if(listingId)query=query.eq('provider_listing_id',listingId.slice(0,200));
    const status = params.get('status');
    if (['active', 'paused', 'closed', 'under_review', 'inactive', 'deleted'].includes(status || '')) query = query.eq('operational_status', status);
    const search = normalizarTexto((params.get('q') || '').slice(0, 120)).replace(/[%_\\]/g, '');
    if (search) query = query.ilike('search_text', `%${search}%`);
    if(countOnly){const {count,error}=await query.abortSignal(request.signal);if(error)throw error;return NextResponse.json({total:count??0},{headers:{'Cache-Control':'no-store'}});}
    const order = dateOrder(params.get('order'));
    // A criação original no ML, não a última sincronização. Ordenar antes de paginar.
    const { data, error, count } = await query.order('snapshot->>createdAt', { ascending: order === 'asc', nullsFirst: false }).order('provider_listing_id').range((page - 1) * 25, page * 25 - 1);
    if (error) throw error;
    return NextResponse.json({ listings: data || [], total: skipCount ? null : count || 0, page }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
