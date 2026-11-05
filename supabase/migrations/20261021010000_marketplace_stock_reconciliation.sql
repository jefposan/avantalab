-- Entrega local: revisão explícita, recibo idempotente e propriedade da pausa.
begin;
create table public.marketplace_stock_sync_reviews (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),actor_id uuid not null references auth.users(id),
 product_id uuid not null references public.marketplace_products(id), revision bigint not null, sources jsonb not null, created_at timestamptz not null default now()
);
create table public.marketplace_stock_sync_operations (
 empresa_id uuid not null references public.empresas(id),request_key uuid not null,actor_id uuid not null references auth.users(id),
 payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(empresa_id,request_key)
);
create table public.marketplace_listing_stock_control (
 link_id uuid primary key references public.marketplace_product_links(id),empresa_id uuid not null references public.empresas(id),
 product_id uuid not null references public.marketplace_products(id),pause_requested_at timestamptz,pause_confirmed_at timestamptz,
 paused_by_system boolean not null default false,updated_at timestamptz not null default now()
);
do $$ declare t text;begin
 foreach t in array array['marketplace_stock_sync_reviews','marketplace_stock_sync_operations','marketplace_listing_stock_control'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end $$;
create function public.marketplace_stock_sync_command(p_empresa uuid,p_actor uuid,p_key uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare saved marketplace_stock_sync_operations;r marketplace_stock_sync_reviews;p marketplace_products;w marketplace_warehouses;b marketplace_warehouse_balances;
 source jsonb;qty integer;result jsonb;allowed boolean;
begin
 allowed:=marketplace_price_stock_authorized(p_empresa,p_actor,'confirm_stock') or exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id
  where u.empresa_id=p_empresa and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now()));
 if not coalesce(allowed,false) or p_key is null then raise exception 'Sem permissão para sincronizar estoque.';end if;
 if not exists(select 1 from marketplace_inventory_settings where empresa_id=p_empresa and enabled) then raise exception 'A sincronização automática não está habilitada para este perfil.';end if;
 perform pg_advisory_xact_lock(hashtextextended('warehouse:'||p_empresa::text,0));
 select * into saved from marketplace_stock_sync_operations where empresa_id=p_empresa and request_key=p_key;
 if found then
  if saved.actor_id<>p_actor or saved.payload<>p_payload then raise exception 'Esta tentativa já foi utilizada com outros dados.';end if;
  return saved.result;
 end if;
 select * into r from marketplace_stock_sync_reviews where id=(p_payload->>'reviewId')::uuid and empresa_id=p_empresa and actor_id=p_actor;
 if not found or r.created_at<now()-interval '5 minutes' then raise exception 'Conferência expirada. Consulte os saldos novamente.';end if;
 if not exists(select 1 from jsonb_array_elements(r.sources) v where v->>'eligible'='true') then raise exception 'Nenhum anúncio elegível confirmado.';end if;
 select * into p from marketplace_products where id=r.product_id and empresa_id=p_empresa and archived_at is null for update;
 if not found or p.revision<>r.revision then raise exception 'O saldo local mudou. Confira os saldos novamente.';end if;
 perform 1 from marketplace_product_links where empresa_id=p_empresa and product_id=p.id for update;
 if (select count(*) from marketplace_product_links where empresa_id=p_empresa and product_id=p.id)<>jsonb_array_length(r.sources)
 or exists(select 1 from jsonb_array_elements(r.sources) s where not exists(select 1 from marketplace_product_links l where l.empresa_id=p_empresa and l.product_id=p.id and l.id::text=s->>'id' and l.provider=s->>'provider' and l.provider_listing_id=s->>'listingId' and (s->>'connectionId' is null or l.connection_id::text=s->>'connectionId'))) then raise exception 'Os vínculos do produto mudaram. Consulte os saldos novamente.';end if;
 if p_payload->>'direction'='listing_to_local' then
  select value into source from jsonb_array_elements(r.sources) where value->>'id'=p_payload->>'sourceId' and value->>'eligible'='true';
  if source is null then raise exception 'Anúncio de origem inválido.';end if;
  qty:=(source->>'quantity')::integer;
 elsif p_payload->>'direction'='local_to_listings' then qty:=p.stock_quantity;
 else raise exception 'Selecione a direção da sincronização.';end if;
 if qty is null or qty<0 or qty>99999 or coalesce((p_payload->>'confirmation')::boolean,false) is not true then raise exception 'Confirme a quantidade física antes de sincronizar.';end if;
 if qty=0 and coalesce((p_payload->>'confirmZero')::boolean,false) is not true then raise exception 'Confirme a pausa dos anúncios com saldo zero.';end if;
 -- Nunca repõe anúncios enquanto existem pedidos/eventos do produto por processar.
 if exists(select 1 from marketplace_inventory_events e where e.empresa_id=p_empresa and e.product_id=p.id and e.state='pending') then raise exception 'Confira as vendas pendentes deste produto antes de sincronizar.';end if;
 select * into w from marketplace_warehouses where empresa_id=p_empresa and is_online and archived_at is null;
 if not found then raise exception 'Estoque Online não encontrado.';end if;
 if p_payload->>'direction'='listing_to_local' then
  select * into b from marketplace_warehouse_balances where warehouse_id=w.id and product_id=p.id and empresa_id=p_empresa;
  perform marketplace_warehouse_command(p_empresa,p_actor,'set',jsonb_build_object('warehouseId',w.id,'productId',p.id,'quantity',qty,'revision',coalesce(b.revision,1),'note','Sincronização revisada: anúncio '||(source->>'listingId')||' → Online. Sem soma entre contas.'),p_key);
 end if;
 perform marketplace_enqueue_stock(p_empresa,p.id,true);
 result:=jsonb_build_object('productId',p.id,'quantity',qty,'before',p.stock_quantity,'status','pending','message','Saldo confirmado no AvantaLab. Atualização dos anúncios na fila; confira o resultado.');
 insert into marketplace_stock_sync_operations(empresa_id,request_key,actor_id,payload,result)values(p_empresa,p_key,p_actor,p_payload,result);
 return result;
end $$;
revoke all on function public.marketplace_stock_sync_command(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_stock_sync_command(uuid,uuid,uuid,jsonb) to service_role;
-- Edição remota vira divergência visível; não substitui o estoque local silenciosamente.
create or replace function public.marketplace_enqueue_stock(p_empresa uuid,p_product uuid,p_increase boolean default false) returns void
language plpgsql security definer set search_path=public as $$
begin
 insert into marketplace_inventory_outbox(link_id,empresa_id,product_id,desired_quantity,revision,allow_increase)
 select l.id,l.empresa_id,p.id,p.stock_quantity,p.revision,p_increase from marketplace_products p
 join marketplace_product_links l on l.empresa_id=p.empresa_id and l.product_id=p.id and l.provider='mercado_livre'
 join marketplace_inventory_settings s on s.empresa_id=p.empresa_id and s.enabled
 where p.empresa_id=p_empresa and p.id=p_product and p.archived_at is null and p.stock_quantity is not null
 on conflict(link_id) do update set product_id=excluded.product_id,desired_quantity=excluded.desired_quantity,revision=excluded.revision,
 generation=gen_random_uuid(),allow_increase=excluded.allow_increase,state='pending',issue=null,attempts=0,next_attempt_at=now(),updated_at=now();
end $$;
create or replace function public.marketplace_observe_listing(p_empresa uuid,p_connection uuid,p_listing text,p_quantity integer,p_status text) returns void
language plpgsql security definer set search_path=public as $$
declare l marketplace_product_links;
begin
 select * into l from marketplace_product_links where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing for update;
 if not found then return;end if;
 if not exists(select 1 from marketplace_connections where id=p_connection and empresa_id=p_empresa and provider=l.provider) then raise exception 'Conta não pertence à empresa.';end if;
 update marketplace_product_links set reported_stock=p_quantity,status=p_status,updated_at=now() where id=l.id;
end $$;
commit;
