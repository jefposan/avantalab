-- Filtra e ordena a qualidade antes da paginação, mantendo todas as contas do grupo.
create function public.marketplace_quality_grouped_listings(
 p_empresa uuid,p_connections uuid[],p_search text default '',p_status text default '',
 p_order text default 'desc',p_page integer default 1,p_count_only boolean default false,p_listing text default '',p_quality text default ''
) returns jsonb language sql stable security invoker set search_path=public as $$
with scoped as materialized (
 select o.*,p.id as product_id,p.name as product_name,p.ean as product_ean,p.pictures as product_pictures,
 p.stock_quantity,p.listing_stock_review_at,q.score as quality_score,
 case when p.id is not null then 'product:'||p.id::text else 'listing:'||o.connection_id::text||':'||o.provider_listing_id end as group_key
 from public.marketplace_listing_operations o
 left join public.marketplace_product_links l on l.empresa_id=o.empresa_id and l.connection_id=o.connection_id and l.provider_listing_id=o.provider_listing_id
 left join public.marketplace_products p on p.empresa_id=o.empresa_id and p.id=l.product_id and p.archived_at is null
 left join public.marketplace_listing_quality q on q.empresa_id=o.empresa_id and q.connection_id=o.connection_id and q.listing_id=o.provider_listing_id and o.operational_status not in ('closed','deleted')
 where o.empresa_id=p_empresa and o.connection_id=any(p_connections)
 and (coalesce(p_search,'')='' or o.search_text ilike '%'||p_search||'%')
 and (coalesce(p_status,'')='' or o.operational_status=p_status)
 and (coalesce(p_listing,'')='' or o.provider_listing_id=p_listing)
), summaries as (
 select group_key,count(*) as announcements,min(quality_score) as score,
 case when p_order='asc' then min(snapshot->>'createdAt') else max(snapshot->>'createdAt') end as sort_date
 from scoped group by group_key
 having p_quality not in ('low','unknown') or (p_quality='low' and min(quality_score)<70) or (p_quality='unknown' and count(quality_score)<count(*) )
), selected as (
 select * from summaries order by
 case when p_quality='lowest' then score end asc nulls last,
 case when p_order='asc' then sort_date end asc nulls last,
 case when p_order<>'asc' then sort_date end desc nulls last,group_key
 limit case when p_count_only then 0 else 25 end offset (greatest(1,least(coalesce(p_page,1),10000))-1)*25
), payload as (
 select selected.group_key,selected.sort_date,selected.score,jsonb_build_object(
 'key',selected.group_key,'productId',min(s.product_id::text),'title',coalesce(min(s.product_name),min(s.snapshot->>'title')),
 'ean',coalesce(min(s.product_ean),min(s.snapshot->>'ean')),
 'pictures',coalesce(nullif((jsonb_agg(s.product_pictures) filter(where s.product_id is not null))->0,'[]'::jsonb),(jsonb_agg(s.snapshot->'pictures'))->0,'[]'::jsonb),
 'stockQuantity',min(s.stock_quantity),'stockPending',bool_or(s.product_id is null or s.stock_quantity is null or s.listing_stock_review_at is not null),
 'listings',jsonb_agg(jsonb_build_object('snapshot',s.snapshot,'status',s.status,'operations',s.operations,'operationalStatus',s.operational_status,'connectionId',s.connection_id) order by s.connection_id,s.provider_listing_id)
 ) as value
 from selected join scoped s on s.group_key=selected.group_key group by selected.group_key,selected.sort_date,selected.score
)
select jsonb_build_object('total',(select count(*) from summaries),
 'listingTotal',(select coalesce(sum(announcements),0) from summaries),'page',greatest(1,least(coalesce(p_page,1),10000)),
 'groups',coalesce((select jsonb_agg(value order by
 case when p_quality='lowest' then score end asc nulls last,
 case when p_order='asc' then sort_date end asc nulls last,
 case when p_order<>'asc' then sort_date end desc nulls last,group_key) from payload),'[]'::jsonb));
$$;
revoke all on function public.marketplace_quality_grouped_listings(uuid,uuid[],text,text,text,integer,boolean,text,text) from public,anon,authenticated;
grant execute on function public.marketplace_quality_grouped_listings(uuid,uuid[],text,text,text,integer,boolean,text,text) to service_role;
notify pgrst,'reload schema';
