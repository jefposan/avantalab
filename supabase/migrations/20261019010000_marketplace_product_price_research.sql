-- Pesquisa explícita de referência. Nunca modifica anúncios, estoque ou lotes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create table public.marketplace_product_price_researches (
  empresa_id uuid not null references public.empresas(id),
  request_key uuid not null,
  product_id uuid not null,
  actor_id uuid not null references auth.users(id),
  product_revision bigint not null,
  status text not null check (status in ('pending','updated','no_offers','failed','conflict')),
  previous_price_cents bigint,
  reference_cents bigint,
  offers jsonb not null default '[]'::jsonb check (jsonb_typeof(offers)='array'),
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  primary key (empresa_id, request_key),
  foreign key (empresa_id, product_id) references public.marketplace_products(empresa_id,id)
);
create unique index marketplace_product_price_pending_idx on public.marketplace_product_price_researches(empresa_id,product_id) where status='pending';
create index marketplace_product_price_actor_idx on public.marketplace_product_price_researches(empresa_id,actor_id,created_at desc);
alter table public.marketplace_product_price_researches enable row level security;
revoke all on public.marketplace_product_price_researches from public, anon, authenticated;
grant select,insert,update on public.marketplace_product_price_researches to service_role;

create function public.marketplace_product_price_research(p_empresa_id uuid,p_actor_id uuid,p_product_id uuid,p_revision bigint,p_request_key uuid,p_action text,p_offers jsonb default '[]'::jsonb,p_error text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_job public.marketplace_product_price_researches; v_product public.marketplace_products; v_cents bigint; v_claimed boolean:=false;
begin
  if p_request_key is null or p_action not in ('claim','complete','fail') or not exists (
    select 1 from public.usuarios_empresa u join public.empresa_modulos m on m.empresa_id=u.empresa_id
    where u.empresa_id=p_empresa_id and u.user_id=p_actor_id and u.status='ativo'
      and u.perfil in ('gestor_master','administrador','operador_completo')
      and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())
  ) then raise exception 'Sem permissão para atualizar a referência nesta empresa.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('price-actor:'||p_empresa_id::text||':'||p_actor_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended('price:'||p_empresa_id::text||':'||p_product_id::text,0));
  select * into v_job from public.marketplace_product_price_researches where empresa_id=p_empresa_id and request_key=p_request_key for update;
  if found then
    if v_job.product_id<>p_product_id or v_job.actor_id<>p_actor_id or v_job.product_revision is distinct from p_revision then
      raise exception 'Tentativa repetida com dados diferentes. Atualize antes de tentar novamente.';
    end if;
    if v_job.status<>'pending' or p_action='claim' then
      return jsonb_build_object('status',v_job.status,'claimed',false,'price_cents',v_job.reference_cents,'offers_count',jsonb_array_length(v_job.offers));
    end if;
  elsif p_action<>'claim' then raise exception 'Pesquisa não encontrada.';
  end if;

  if p_action='claim' then
    select * into v_product from public.marketplace_products where empresa_id=p_empresa_id and id=p_product_id and archived_at is null for update;
    if not found or v_product.revision is distinct from p_revision then raise exception 'O cadastro mudou. Atualize antes de pesquisar novamente.'; end if;
    update public.marketplace_product_price_researches set status='failed',error_code='timeout',finished_at=now()
      where empresa_id=p_empresa_id and product_id=p_product_id and status='pending' and created_at<now()-interval '2 minutes';
    if exists(select 1 from public.marketplace_product_price_researches where empresa_id=p_empresa_id and product_id=p_product_id and status='pending') then
      return jsonb_build_object('status','busy','claimed',false);
    end if;
    if (select count(*) from public.marketplace_product_price_researches where empresa_id=p_empresa_id and actor_id=p_actor_id and created_at>now()-interval '1 minute')>=5 then
      return jsonb_build_object('status','limited','claimed',false);
    end if;
    insert into public.marketplace_product_price_researches(empresa_id,request_key,product_id,actor_id,product_revision,status,previous_price_cents)
      values(p_empresa_id,p_request_key,p_product_id,p_actor_id,p_revision,'pending',v_product.price_cents) returning * into v_job;
    v_claimed:=true;
  elsif p_action='fail' then
    update public.marketplace_product_price_researches set status='failed',error_code=case when p_error in ('price_provider_unavailable','price_provider_limited','price_provider_authorization','price_provider_not_configured','price_provider_failed','price_provider_invalid_response','invalid_price_query') then p_error else 'research_failed' end,finished_at=now()
      where empresa_id=p_empresa_id and request_key=p_request_key returning * into v_job;
  else
    if v_job.created_at<now()-interval '2 minutes' then
      update public.marketplace_product_price_researches set status='failed',error_code='timeout',finished_at=now() where empresa_id=p_empresa_id and request_key=p_request_key returning * into v_job;
    else
      if jsonb_typeof(p_offers) is distinct from 'array' or jsonb_array_length(p_offers)>5 then raise exception 'Ofertas inválidas.'; end if;
      if exists(select 1 from jsonb_array_elements(p_offers) o where jsonb_typeof(o->'price') is distinct from 'number' or (o->>'price')::numeric<=0 or (o->>'price')::numeric>=1000000 or coalesce(o->>'url','') !~ '^https://' or coalesce(trim(o->>'title'),'')='' or coalesce(trim(o->>'seller'),'')='') then raise exception 'Ofertas inválidas.'; end if;
      if jsonb_array_length(p_offers)=0 then
        update public.marketplace_product_price_researches set status='no_offers',finished_at=now() where empresa_id=p_empresa_id and request_key=p_request_key returning * into v_job;
      else
        select * into v_product from public.marketplace_products where empresa_id=p_empresa_id and id=p_product_id and archived_at is null for update;
        if not found or v_product.revision is distinct from v_job.product_revision then
          update public.marketplace_product_price_researches set status='conflict',error_code='product_changed',offers=p_offers,finished_at=now() where empresa_id=p_empresa_id and request_key=p_request_key returning * into v_job;
        else
          select round(avg(round((o->>'price')::numeric*100)))::bigint into v_cents from jsonb_array_elements(p_offers) o;
          update public.marketplace_products set price_cents=v_cents,publication_form=publication_form||jsonb_build_object('price',v_cents::numeric/100),revision=revision+1,updated_at=now()
            where empresa_id=p_empresa_id and id=p_product_id;
          update public.marketplace_product_price_researches set status='updated',reference_cents=v_cents,offers=p_offers,finished_at=now() where empresa_id=p_empresa_id and request_key=p_request_key returning * into v_job;
        end if;
      end if;
    end if;
  end if;
  return jsonb_build_object('status',v_job.status,'claimed',v_claimed,'price_cents',v_job.reference_cents,'offers_count',jsonb_array_length(v_job.offers));
end;
$$;
revoke all on function public.marketplace_product_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.marketplace_product_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,text) to service_role;
notify pgrst,'reload schema';
commit;
