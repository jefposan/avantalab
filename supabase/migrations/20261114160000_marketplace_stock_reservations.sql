-- Reserva bloqueia disponibilidade; não cria receita nem baixa física até a conclusão.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
alter table public.marketplace_warehouse_balances add column reserved_quantity integer not null default 0 check(reserved_quantity between 0 and 99999);
alter table public.marketplace_warehouse_balances add constraint marketplace_reserved_confirmed check(reserved_quantity=0 or quantity is not null);
alter table public.marketplace_warehouse_balances add constraint marketplace_available_plus_reserved check(coalesce(quantity,0)+reserved_quantity<=99999);
create table public.marketplace_stock_reservations (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
 product_id uuid not null, warehouse_id uuid not null, actor_id uuid not null references auth.users(id),
 buyer text not null check(length(trim(buyer)) between 1 and 120), note text not null default '' check(length(note)<=500),
 quantity integer not null check(quantity between 1 and 99999),
 status text not null default 'active' check(status in ('active','cancelled','sold')),
 revision integer not null default 1 check(revision>0), sale_id uuid,
 closed_by uuid references auth.users(id), closed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(empresa_id,id),
 foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id),
 foreign key(empresa_id,warehouse_id) references public.marketplace_warehouses(empresa_id,id),
 foreign key(empresa_id,sale_id) references public.marketplace_direct_sales(empresa_id,id),
 check((status='active')=(closed_at is null)), check((status='sold')=(sale_id is not null))
);
create index marketplace_reservations_active on public.marketplace_stock_reservations(empresa_id,product_id,warehouse_id) where status='active';
alter table public.marketplace_stock_reservations enable row level security;
revoke all on public.marketplace_stock_reservations from public,anon,authenticated;
grant select,insert,update on public.marketplace_stock_reservations to service_role;
create table public.marketplace_reservation_releases (
 empresa_id uuid not null references public.empresas(id),product_id uuid not null,revision bigint not null,since_at timestamptz not null,created_at timestamptz not null default now(),
 primary key(empresa_id,product_id),foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id)
);
alter table public.marketplace_reservation_releases enable row level security;
revoke all on public.marketplace_reservation_releases from public,anon,authenticated;
grant select,insert,update,delete on public.marketplace_reservation_releases to service_role;
alter table public.marketplace_warehouse_movements drop constraint marketplace_warehouse_movements_kind_check;
alter table public.marketplace_warehouse_movements add constraint marketplace_warehouse_movements_kind_check check(kind in ('create','rename','archive','online','add','set','transfer','sale','withdraw','sale_return','reserve','reservation_cancel'));
alter table public.marketplace_warehouse_movements add column reservation_id uuid;
alter table public.marketplace_warehouse_movements add foreign key(empresa_id,reservation_id) references public.marketplace_stock_reservations(empresa_id,id);

create function public.marketplace_reservation_command(p_empresa_id uuid,p_actor_id uuid,p_action text,p_data jsonb,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare saved marketplace_warehouse_operations; r marketplace_stock_reservations; p marketplace_products;
 w marketplace_warehouses; b marketplace_warehouse_balances; qty integer; after_value integer; result jsonb; sale_result jsonb;
begin
 if p_request_key is null or p_action is null or p_action not in ('reserve','cancel','sell') then raise exception 'Operação de reserva inválida.';end if;
 perform 1 from empresa_modulos where empresa_id=p_empresa_id and modulo_id='marketplaces' and ativo and (expira_em is null or expira_em>now()) for share;
 if not found then raise exception 'Módulo indisponível neste perfil.';end if;
 perform 1 from usuarios_empresa where empresa_id=p_empresa_id and user_id=p_actor_id and status='ativo' and perfil in ('gestor_master','administrador','operador_completo') for share;
 if not found then
  perform 1 from marketplace_price_users where empresa_id=p_empresa_id and user_id=p_actor_id and ativo and can_register_sales for share;
  if not found then raise exception 'Sem permissão para reservar ou concluir vendas.';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('warehouse:'||p_empresa_id::text,0));
 select * into saved from marketplace_warehouse_operations where empresa_id=p_empresa_id and request_key=p_request_key;
 if found then
  if saved.actor_id<>p_actor_id or saved.action<>'reservation_'||p_action or saved.payload<>p_data then raise exception 'Esta tentativa já foi utilizada com outros dados.';end if;
  return saved.result;
 end if;
 if p_action='reserve' then
  if jsonb_typeof(p_data->'quantity') is distinct from 'number' or (p_data->>'quantity') !~ '^[0-9]{1,5}$' then raise exception 'Informe uma quantidade inteira válida.';end if;
  qty:=(p_data->>'quantity')::integer;
  if qty not between 1 and 99999 or length(trim(coalesce(p_data->>'buyer',''))) not between 1 and 120 or length(coalesce(p_data->>'note',''))>500 then raise exception 'Informe o possível comprador, a quantidade e observação de até 500 caracteres.';end if;
  select * into p from marketplace_products where empresa_id=p_empresa_id and id=(p_data->>'productId')::uuid and archived_at is null for update;
  if not found then raise exception 'Produto não encontrado neste perfil.';end if;
  select * into w from marketplace_warehouses where empresa_id=p_empresa_id and id=(p_data->>'warehouseId')::uuid and archived_at is null for update;
  if not found then raise exception 'Estoque não encontrado neste perfil.';end if;
  if w.is_online and to_jsonb(p)->>'listing_stock_review_at' is not null then raise exception 'Confirme primeiro o saldo Online do produto importado.';end if;
 else
  select * into r from marketplace_stock_reservations where empresa_id=p_empresa_id and id=(p_data->>'reservationId')::uuid for update;
  if not found then raise exception 'Reserva não encontrada neste perfil.';end if;
  if p_data->>'reservationRevision' is null or (p_data->>'reservationRevision')::integer<>r.revision or r.status<>'active' then raise exception 'Reserva já concluída, cancelada ou atualizada. Atualize a lista.';end if;
  select * into p from marketplace_products where empresa_id=p_empresa_id and id=r.product_id and archived_at is null for update;
  if not found then raise exception 'Produto indisponível. Confira o cadastro antes de concluir.';end if;
  select * into w from marketplace_warehouses where empresa_id=p_empresa_id and id=r.warehouse_id and archived_at is null for update;
  if not found then raise exception 'Estoque indisponível. Confira antes de concluir.';end if;
  qty:=r.quantity;
 end if;
 select * into b from marketplace_warehouse_balances where empresa_id=p_empresa_id and product_id=p.id and warehouse_id=w.id for update;
 if not found or b.quantity is null then raise exception 'Confirme o saldo deste estoque antes de reservar.';end if;
 if p_action='reserve' then
  if p_data->>'revision' is null or (p_data->>'revision')::integer<>b.revision then raise exception 'Saldo atualizado por outra operação. Atualize antes de reservar.';end if;
  if b.quantity<qty then raise exception 'Saldo insuficiente para esta reserva.';end if;
  after_value:=b.quantity-qty;
  -- Reduzir primeiro evita ultrapassar o limite físico ao somar a reserva.
  if w.is_online then update marketplace_products set stock_quantity=after_value,revision=revision+1,updated_at=now() where id=p.id;
  else update marketplace_warehouse_balances set quantity=after_value,revision=revision+1,updated_at=now() where empresa_id=p_empresa_id and product_id=p.id and warehouse_id=w.id;end if;
  update marketplace_warehouse_balances set reserved_quantity=reserved_quantity+qty where empresa_id=p_empresa_id and product_id=p.id and warehouse_id=w.id;
  insert into marketplace_stock_reservations(empresa_id,product_id,warehouse_id,actor_id,buyer,note,quantity)
   values(p_empresa_id,p.id,w.id,p_actor_id,trim(p_data->>'buyer'),trim(coalesce(p_data->>'note','')),qty) returning * into r;
 else
  if b.reserved_quantity<qty then raise exception 'Saldo reservado divergente. Não foi possível concluir.';end if;
  update marketplace_warehouse_balances set reserved_quantity=reserved_quantity-qty where empresa_id=p_empresa_id and product_id=p.id and warehouse_id=w.id;
  -- Repor e vender ocorre na mesma transação e sob a mesma trava: nenhum leitor
  -- ou outro vendedor consegue consumir a reposição intermediária.
  if w.is_online then update marketplace_products set stock_quantity=b.quantity+qty,revision=revision+1,updated_at=now() where id=p.id;
  else update marketplace_warehouse_balances set quantity=b.quantity+qty,revision=revision+1,updated_at=now() where empresa_id=p_empresa_id and product_id=p.id and warehouse_id=w.id;end if;
  if p_action='sell' then
   select * into b from marketplace_warehouse_balances where empresa_id=p_empresa_id and product_id=p.id and warehouse_id=w.id;
   sale_result:=marketplace_direct_sale_command(p_empresa_id,p_actor_id,'sell',jsonb_build_object('productId',p.id,'warehouseId',w.id,'revision',b.revision,'quantity',qty,'unitPriceCents',p_data->'unitPriceCents','soldOn',p_data->>'soldOn','note',left('Reserva: '||r.buyer||case when r.note<>'' then ' · '||r.note else '' end,500)),gen_random_uuid());
  end if;
  update marketplace_stock_reservations set status=case p_action when 'sell' then 'sold' else 'cancelled' end,sale_id=(sale_result->>'saleId')::uuid,closed_by=p_actor_id,closed_at=now(),updated_at=now(),revision=revision+1 where id=r.id returning * into r;
  select * into b from marketplace_warehouse_balances where empresa_id=p_empresa_id and product_id=p.id and warehouse_id=w.id;
  after_value:=b.quantity;
 end if;
 if w.is_online then
  if p_action='cancel' then
   insert into marketplace_reservation_releases(empresa_id,product_id,revision,since_at) select p_empresa_id,p.id,revision,r.created_at from marketplace_products where id=p.id
    on conflict(empresa_id,product_id) do update set revision=excluded.revision,since_at=excluded.since_at,created_at=now();
  end if;
  perform marketplace_enqueue_stock(p_empresa_id,p.id,p_action='cancel');
 end if;
 if p_action<>'sell' then
  insert into marketplace_warehouse_movements(empresa_id,actor_id,product_id,warehouse_id,kind,quantity,stock_before,stock_after,note,warehouse_name,reservation_id)
  values(p_empresa_id,p_actor_id,p.id,w.id,case p_action when 'reserve' then 'reserve' else 'reservation_cancel' end,qty,case p_action when 'reserve' then after_value+qty else after_value-qty end,after_value,'Reserva: '||r.buyer,w.name,r.id);
 end if;
 result:=jsonb_build_object('reservationId',r.id,'status',r.status,'productId',p.id,'stockAfter',after_value,'saleId',r.sale_id);
 insert into marketplace_warehouse_operations(empresa_id,request_key,actor_id,action,payload,result) values(p_empresa_id,p_request_key,p_actor_id,'reservation_'||p_action,p_data,result);
 return result;
end $$;
revoke all on function public.marketplace_reservation_command(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_reservation_command(uuid,uuid,text,jsonb,uuid) to service_role;

-- Reservas em andamento não podem perder produto ou depósito por arquivamento,
-- limpeza, unificação ou troca de qual depósito é Online.
create function public.marketplace_protect_reservations() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_table_name='marketplace_products' then
  if tg_op='DELETE' or new.archived_at is distinct from old.archived_at then
   if exists(select 1 from marketplace_stock_reservations where empresa_id=old.empresa_id and product_id=old.id and status='active') then raise exception 'Cancele ou conclua as reservas deste produto antes de retirar o cadastro.';end if;
  end if;
 else
  if tg_op='DELETE' or new.archived_at is distinct from old.archived_at or new.is_online is distinct from old.is_online then
   if exists(select 1 from marketplace_stock_reservations where empresa_id=old.empresa_id and status='active' and (warehouse_id=old.id or old.is_online is distinct from new.is_online)) then raise exception 'Cancele ou conclua as reservas antes de arquivar ou trocar o estoque Online.';end if;
  end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function public.marketplace_protect_reservations() from public,anon,authenticated;
create trigger marketplace_product_reservation_guard before update or delete on public.marketplace_products for each row execute function public.marketplace_protect_reservations();
create trigger marketplace_warehouse_reservation_guard before update or delete on public.marketplace_warehouses for each row execute function public.marketplace_protect_reservations();
notify pgrst,'reload schema';
commit;
