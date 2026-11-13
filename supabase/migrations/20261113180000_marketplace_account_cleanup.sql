-- Limpeza por conta e perfil. Instalação autorizada; nenhuma limpeza é executada pela migração.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.marketplace_connections
  add column catalog_import_enabled boolean not null default true,
  add column data_archived_at timestamptz;

create table public.marketplace_account_cleanups (
  empresa_id uuid not null references public.empresas(id),
  request_key uuid not null,
  connection_id uuid not null references public.marketplace_connections(id),
  actor_id uuid not null references auth.users(id),
  options jsonb not null,
  review_token text not null,
  account_name text not null,
  snapshot jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (empresa_id, request_key)
);
create table public.marketplace_account_hidden_notices (
  empresa_id uuid not null references public.empresas(id),
  connection_id uuid not null references public.marketplace_connections(id),
  notice_key text not null,
  primary key (empresa_id, connection_id, notice_key)
);
alter table public.marketplace_account_cleanups enable row level security;
alter table public.marketplace_account_hidden_notices enable row level security;
revoke all on public.marketplace_account_cleanups, public.marketplace_account_hidden_notices from public, anon, authenticated;
grant select on public.marketplace_account_cleanups, public.marketplace_account_hidden_notices to service_role;

create function public.marketplace_account_cleanup_allowed(p_company uuid, p_actor uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.usuarios_empresa u join public.empresa_modulos m on m.empresa_id=u.empresa_id
    where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo'
      and u.perfil in ('gestor_master','administrador') and m.modulo_id='marketplaces'
      and m.ativo and (m.expira_em is null or m.expira_em>now())
  )
$$;

-- Toda referência de histórico é considerada, inclusive FKs adicionadas depois desta entrega.
create function public.marketplace_account_product_cleanup_reason(p_company uuid, p_account uuid, p_product uuid)
returns text language plpgsql stable set search_path = pg_catalog, public as $$
declare
  p public.marketplace_products;
  fk record;
  used boolean;
begin
  select * into p from public.marketplace_products where empresa_id=p_company and id=p_product;
  if not found or p.archived_at is not null then return 'Cadastro já arquivado'; end if;
  if exists(select 1 from public.marketplace_product_links where empresa_id=p_company
    and product_id=p_product and connection_id<>p_account) then return 'Compartilhado com outra conta'; end if;
  if coalesce(p.stock_quantity,0)<>0 or exists(select 1 from public.marketplace_warehouse_balances
    where empresa_id=p_company and product_id=p_product and coalesce(quantity,0)<>0) then return 'Possui saldo de estoque'; end if;
  if p.stock_confirmed_at is not null or exists(select 1 from public.marketplace_products
    where empresa_id=p_company and id=p_product and stock_baseline_at is not null) then return 'Possui conferência de estoque registrada'; end if;
  if exists(select 1 from public.marketplace_product_price_researches where empresa_id=p_company
    and product_id=p_product and status='pending') then return 'Possui pesquisa de preço em andamento'; end if;
  if exists(select 1 from public.marketplace_catalog_completion where empresa_id=p_company and product_id=p_product
    and state in ('processing','sending','review_required')) then return 'Possui complementação de catálogo em andamento'; end if;
  if exists(select 1 from public.marketplace_publications where empresa_id=p_company
    and response_summary->>'local_product_id'=p_product::text) then return 'Possui histórico de publicação'; end if;
  if exists (
    select 1 from public.marketplace_sales s join public.marketplace_product_links l
      on l.empresa_id=s.empresa_id and l.connection_id=s.connection_id
    where l.empresa_id=p_company and l.product_id=p_product and exists (
      select 1 from jsonb_array_elements(case when jsonb_typeof(s.snapshot->'items')='array'
        then s.snapshot->'items' else '[]'::jsonb end) item
      where coalesce(item->>'listingId',item->>'id')=l.provider_listing_id
    )
  ) then return 'Possui histórico de venda'; end if;
  for fk in select ns.nspname,cl.relname,a.attname from pg_constraint c
    join pg_class cl on cl.oid=c.conrelid join pg_namespace ns on ns.oid=cl.relnamespace
    join lateral unnest(c.conkey,c.confkey) k(local_key,remote_key) on true
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.local_key
    join pg_attribute target on target.attrelid=c.confrelid and target.attnum=k.remote_key
    where c.contype='f' and c.confrelid in ('public.marketplace_products'::regclass,'public.marketplace_product_history_keys'::regclass)
      and target.attname='id'
      and cl.relname not in ('marketplace_product_links','marketplace_warehouse_balances','marketplace_inventory_outbox',
        'marketplace_listing_stock_control','marketplace_product_internal_notes','marketplace_price_consultations',
        'marketplace_product_price_researches','marketplace_price_product_sources','marketplace_catalog_completion')
  loop
    execute format('select exists(select 1 from %I.%I where %I=$1)',fk.nspname,fk.relname,fk.attname)
      into used using p_product;
    if used then return 'Possui vendas, movimentações ou outro histórico'; end if;
  end loop;
  return null;
end $$;

create function public.marketplace_account_cleanup_plan(p_company uuid, p_actor uuid, p_account uuid, p_options jsonb, p_notices text[])
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  c public.marketplace_connections;
  products jsonb;
  links jsonb;
  listings jsonb;
  alerts jsonb;
  blockers jsonb := '[]';
  account_name text;
  company_name text;
  plan jsonb;
begin
  if not public.marketplace_account_cleanup_allowed(p_company,p_actor) then raise exception 'Sem permissão para limpar dados de contas neste perfil.'; end if;
  if p_options is null or jsonb_typeof(p_options)<>'object'
    or (select count(*) from jsonb_object_keys(p_options))<>4
    or exists(select 1 from jsonb_each(p_options) o where o.key not in ('clearNotices','removeListings','removeProducts','archiveAccount') or jsonb_typeof(o.value)<>'boolean')
    or not ((p_options->>'clearNotices')::boolean or (p_options->>'removeListings')::boolean
      or (p_options->>'removeProducts')::boolean or (p_options->>'archiveAccount')::boolean)
    or ((p_options->>'removeProducts')::boolean and not (p_options->>'removeListings')::boolean)
    or ((p_options->>'archiveAccount')::boolean and not (p_options->>'clearNotices')::boolean)
    or cardinality(p_notices)>10000 then raise exception 'Selecione opções válidas para a limpeza.'; end if;
  select * into c from public.marketplace_connections where empresa_id=p_company and id=p_account;
  if not found or c.data_archived_at is not null then raise exception 'Conta não encontrada neste perfil ou já arquivada.'; end if;
  select coalesce(nullif(local_label,''),nullif(c.seller_name,''),'Vendedor '||c.seller_reference,c.id::text) into account_name
    from (select 1) one left join public.marketplace_connection_labels n on n.empresa_id=p_company and n.connection_id=p_account;
  select nome into company_name from public.empresas where id=p_company;
  if c.status<>'disconnected' and ((p_options->>'removeListings')::boolean or (p_options->>'archiveAccount')::boolean) then
    blockers := blockers || jsonb_build_array('Desconecte a conta antes de remover dados ou arquivá-la.');
  end if;
  if c.refresh_lock_until>clock_timestamp() or c.sync_lock_until>clock_timestamp()
    or (exists(select 1 from public.marketplace_inventory_worker where lease_until>clock_timestamp())
      and exists(select 1 from public.marketplace_inventory_outbox j join public.marketplace_product_links l
        on l.empresa_id=j.empresa_id and l.id=j.link_id where l.empresa_id=p_company and l.connection_id=p_account
          and j.state='pending'))
    or exists(select 1 from public.marketplace_listing_actions where empresa_id=p_company and connection_id=p_account and status in ('requested','uncertain'))
    or exists(select 1 from public.marketplace_publications where empresa_id=p_company and connection_id=p_account and status='publishing')
  then blockers := blockers || jsonb_build_array('Há uma sincronização ou alteração em andamento. Aguarde sua conclusão.'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'revision',p.revision,
    'reason',public.marketplace_account_product_cleanup_reason(p_company,p_account,p.id)) order by p.id),'[]') into products
    from public.marketplace_products p where p.empresa_id=p_company and exists(
      select 1 from public.marketplace_product_links l where l.empresa_id=p_company and l.connection_id=p_account and l.product_id=p.id);
  if jsonb_array_length(products)>1000 then raise exception 'Esta conta precisa de uma limpeza em lotes. Solicite a revisão antes de continuar.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'productId',product_id,'listingId',provider_listing_id,'status',status) order by id),'[]') into links
    from public.marketplace_product_links where empresa_id=p_company and connection_id=p_account;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'listingId',provider_listing_id,'syncedAt',synced_at) order by id),'[]') into listings
    from public.marketplace_listings where empresa_id=p_company and connection_id=p_account;
  select coalesce(jsonb_agg(id order by id),'[]') into alerts from public.marketplace_sale_alerts a
    where empresa_id=p_company and connection_id=p_account and not exists(
      select 1 from public.marketplace_account_hidden_notices h where h.empresa_id=p_company and h.connection_id=p_account and h.notice_key='sale-alert:'||a.id);
  plan := jsonb_build_object('companyName',company_name,'accountName',account_name,'connectionId',p_account,'status',c.status,
    'accountRevision',c.updated_at,'options',p_options,'products',products,'links',links,'listings',listings,
    'alerts',alerts,'noticeKeys',coalesce((select jsonb_agg(distinct v order by v) from unnest(p_notices) v),'[]'),'blockers',blockers);
  return plan || jsonb_build_object('reviewToken',md5(plan::text));
end $$;

create function public.marketplace_account_cleanup(p_company uuid, p_actor uuid, p_account uuid, p_options jsonb,
  p_notices text[], p_review text, p_confirmation text, p_key uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  old public.marketplace_account_cleanups;
  plan jsonb;
  item jsonb;
  outcome jsonb;
  removed integer := 0;
  retained integer;
begin
  if not public.marketplace_account_cleanup_allowed(p_company,p_actor) or p_key is null then raise exception 'Sem permissão para limpar dados de contas neste perfil.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('account-cleanup:'||p_company||':'||p_key,0));
  select * into old from public.marketplace_account_cleanups where empresa_id=p_company and request_key=p_key;
  if found then
    if old.actor_id<>p_actor or old.connection_id<>p_account or old.options is distinct from p_options
      or old.review_token is distinct from p_review or old.account_name is distinct from p_confirmation then raise exception 'Esta tentativa já foi usada com outra confirmação.'; end if;
    return old.result || jsonb_build_object('replayed',true);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('price-products:'||p_company::text,0));
  perform 1 from public.marketplace_connections where empresa_id=p_company and id=p_account for update;
  perform 1 from public.marketplace_inventory_worker where id=1 for update;
  perform 1 from public.marketplace_products p where p.empresa_id=p_company and exists(
    select 1 from public.marketplace_product_links l where l.empresa_id=p_company and l.connection_id=p_account and l.product_id=p.id)
    order by p.id for update;
  plan := public.marketplace_account_cleanup_plan(p_company,p_actor,p_account,p_options,p_notices);
  if plan->>'reviewToken' is distinct from p_review or plan->>'accountName' is distinct from p_confirmation
    then raise exception 'Os dados ou a confirmação mudaram. Confira a prévia novamente.'; end if;
  if jsonb_array_length(plan->'blockers')>0 then raise exception '%',plan->'blockers'->>0; end if;

  if (p_options->>'clearNotices')::boolean then
    insert into public.marketplace_account_hidden_notices(empresa_id,connection_id,notice_key)
      select p_company,p_account,v from unnest(p_notices) v on conflict do nothing;
    insert into public.marketplace_account_hidden_notices(empresa_id,connection_id,notice_key)
      select p_company,p_account,'sale-alert:'||v from jsonb_array_elements_text(plan->'alerts') v on conflict do nothing;
  end if;
  if (p_options->>'removeListings')::boolean then
    update public.marketplace_connections set catalog_import_enabled=false where empresa_id=p_company and id=p_account;
    delete from public.marketplace_listing_stock_control where empresa_id=p_company and link_id in (
      select id from public.marketplace_product_links where empresa_id=p_company and connection_id=p_account);
    delete from public.marketplace_inventory_outbox where empresa_id=p_company and link_id in (
      select id from public.marketplace_product_links where empresa_id=p_company and connection_id=p_account);
    delete from public.marketplace_product_links where empresa_id=p_company and connection_id=p_account;
    delete from public.marketplace_listing_import_issues where empresa_id=p_company and connection_id=p_account;
    delete from public.marketplace_listing_status_checks where empresa_id=p_company and connection_id=p_account;
    delete from public.marketplace_listings where empresa_id=p_company and connection_id=p_account;
    -- A pendência pertence ao vínculo importado. Produtos compartilhados continuam sujeitos às outras contas.
    update public.marketplace_products set listing_stock_review_at=null,revision=revision+1,updated_at=now()
      where empresa_id=p_company and id in (select (v->>'id')::uuid from jsonb_array_elements(plan->'products') v)
      and not exists(select 1 from public.marketplace_product_links l where l.empresa_id=p_company and l.product_id=marketplace_products.id);
  end if;
  if (p_options->>'removeProducts')::boolean then
    for item in select v from jsonb_array_elements(plan->'products') v where v->>'reason' is null loop
      perform public.marketplace_product_remove(p_company,p_actor,(item->>'id')::uuid,
        (select revision from public.marketplace_products where empresa_id=p_company and id=(item->>'id')::uuid),
        'deleted',item->>'name',gen_random_uuid(),'[]'::jsonb);
      removed := removed+1;
    end loop;
  end if;
  if (p_options->>'archiveAccount')::boolean then
    update public.marketplace_connections set data_archived_at=clock_timestamp(),catalog_import_enabled=false
      where empresa_id=p_company and id=p_account;
  end if;
  retained := jsonb_array_length(plan->'products')-removed;
  outcome := jsonb_build_object('counts',jsonb_build_object(
    'products',removed,'retainedProducts',retained,
    'links',case when (p_options->>'removeListings')::boolean then jsonb_array_length(plan->'links') else 0 end,
    'listings',case when (p_options->>'removeListings')::boolean then jsonb_array_length(plan->'listings') else 0 end,
    'notices',case when (p_options->>'clearNotices')::boolean then cardinality(p_notices)+jsonb_array_length(plan->'alerts') else 0 end),
    'archived',(p_options->>'archiveAccount')::boolean,'replayed',false);
  insert into public.marketplace_account_cleanups(empresa_id,request_key,connection_id,actor_id,options,review_token,account_name,snapshot,result)
    values(p_company,p_key,p_account,p_actor,p_options,p_review,p_confirmation,plan,outcome);
  return outcome;
end $$;

-- Leituras ou sincronizações iniciadas antes da limpeza também respeitam a decisão ao gravar.
create function public.marketplace_account_listing_write_guard() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare enabled boolean;
begin
  select catalog_import_enabled and data_archived_at is null into enabled from public.marketplace_connections
    where empresa_id=new.empresa_id and id=new.connection_id for share;
  if enabled is null then raise exception 'Conta não pertence ao perfil.'; end if;
  if not enabled then return null; end if;
  return new;
end $$;
create trigger marketplace_account_listing_write_guard before insert or update on public.marketplace_listings
  for each row execute function public.marketplace_account_listing_write_guard();

alter function public.marketplace_listing_catalog_import(uuid,uuid,text) rename to marketplace_listing_catalog_import_before_account_cleanup;
create function public.marketplace_listing_catalog_import(p_empresa uuid,p_connection uuid,p_listing text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform 1 from public.marketplace_connections where empresa_id=p_empresa and id=p_connection
    and catalog_import_enabled and data_archived_at is null for share;
  if not found then return jsonb_build_object('importDisabled',true); end if;
  return public.marketplace_listing_catalog_import_before_account_cleanup(p_empresa,p_connection,p_listing);
end $$;

create function public.marketplace_account_import_enable(p_company uuid,p_actor uuid,p_account uuid,p_confirmation text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare name text;
begin
  if not public.marketplace_account_cleanup_allowed(p_company,p_actor) then raise exception 'Sem permissão.'; end if;
  perform 1 from public.marketplace_connections where empresa_id=p_company and id=p_account and data_archived_at is null
    and (status='connected' or (provider='magalu' and status='attention' and last_error_code='magalu_connector_pending')) for update;
  if not found then raise exception 'Reconecte a conta antes de importar novamente.'; end if;
  select coalesce(nullif(n.local_label,''),nullif(c.seller_name,''),'Vendedor '||c.seller_reference,c.id::text) into name
    from public.marketplace_connections c left join public.marketplace_connection_labels n
      on n.empresa_id=c.empresa_id and n.connection_id=c.id where c.empresa_id=p_company and c.id=p_account;
  if name is distinct from p_confirmation then raise exception 'Confirme o nome da conta.'; end if;
  update public.marketplace_connections set catalog_import_enabled=true,sync_cursor=null,sync_phase='scan',
    sync_pending_ids=array[]::text[],updated_at=clock_timestamp() where empresa_id=p_company and id=p_account;
  return true;
end $$;

create function public.marketplace_account_reconnected() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.status in ('connected','attention') and old.status='disconnected' and new.token_sealed is not null then new.data_archived_at:=null; end if;
  return new;
end $$;
create trigger marketplace_account_reconnected before update of status on public.marketplace_connections
  for each row execute function public.marketplace_account_reconnected();

-- O filtro vem antes da paginação para que avisos antigos não ocupem o lugar dos novos.
do $migration$
declare
  definition text := pg_get_functiondef('public.marketplace_live_feed(uuid,uuid)'::regprocedure);
  old_alert text := 'where a.empresa_id=p_empresa and s.status';
  old_pending text := 'from marketplace_sale_notifications where empresa_id=p_empresa and processed_at is null';
begin
  if position(old_alert in definition)=0 or position(old_pending in definition)=0 then
    raise exception 'Contrato de avisos inesperado. A limpeza não foi instalada.';
  end if;
  definition := replace(definition,old_alert,
    'where a.empresa_id=p_empresa and not exists(select 1 from public.marketplace_account_hidden_notices h where h.empresa_id=p_empresa and h.connection_id=a.connection_id and h.notice_key=''sale-alert:''||a.id) and s.status');
  definition := replace(definition,old_pending,
    'from marketplace_sale_notifications where empresa_id=p_empresa and processed_at is null and not exists(select 1 from public.marketplace_account_cleanups c where c.empresa_id=p_empresa and c.connection_id=marketplace_sale_notifications.connection_id and (c.options->>''clearNotices'')::boolean and marketplace_sale_notifications.created_at<=c.created_at)');
  execute definition;
end $migration$;
create index marketplace_account_cleanups_notices on public.marketplace_account_cleanups(empresa_id,connection_id,created_at desc)
  where (options->>'clearNotices')::boolean;

revoke all on function public.marketplace_account_cleanup_allowed(uuid,uuid),
  public.marketplace_account_product_cleanup_reason(uuid,uuid,uuid),
  public.marketplace_account_cleanup_plan(uuid,uuid,uuid,jsonb,text[]),
  public.marketplace_account_cleanup(uuid,uuid,uuid,jsonb,text[],text,text,uuid),
  public.marketplace_account_listing_write_guard(),public.marketplace_account_reconnected(),
  public.marketplace_listing_catalog_import(uuid,uuid,text),
  public.marketplace_listing_catalog_import_before_account_cleanup(uuid,uuid,text),
  public.marketplace_account_import_enable(uuid,uuid,uuid,text),
  public.marketplace_live_feed(uuid,uuid)
  from public,anon,authenticated;
revoke all on function public.marketplace_listing_catalog_import_before_account_cleanup(uuid,uuid,text) from service_role;
grant execute on function public.marketplace_account_cleanup_plan(uuid,uuid,uuid,jsonb,text[]),
  public.marketplace_account_cleanup(uuid,uuid,uuid,jsonb,text[],text,text,uuid),
  public.marketplace_account_import_enable(uuid,uuid,uuid,text),
  public.marketplace_listing_catalog_import(uuid,uuid,text),public.marketplace_live_feed(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
