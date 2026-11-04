-- Estoques internos por perfil. O saldo legado continua sendo SOMENTE o online.
-- Não muda critérios de venda/cancelamento nem cria baixa offline.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

create table public.marketplace_warehouses (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
  name text not null check(length(trim(name)) between 1 and 60), is_online boolean not null default false,
  archived_at timestamptz, created_at timestamptz not null default now(), unique(empresa_id,id)
);
create unique index marketplace_warehouse_online on public.marketplace_warehouses(empresa_id) where is_online and archived_at is null;
create unique index marketplace_warehouse_name on public.marketplace_warehouses(empresa_id,lower(trim(name))) where archived_at is null;
create table public.marketplace_warehouse_balances (
  empresa_id uuid not null, warehouse_id uuid not null, product_id uuid not null,
  quantity integer check(quantity between 0 and 99999), confirmed_at timestamptz,
  revision integer not null default 1 check(revision>0), updated_at timestamptz not null default now(),
  primary key(empresa_id,warehouse_id,product_id),
  foreign key(empresa_id,warehouse_id) references public.marketplace_warehouses(empresa_id,id),
  foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id),
  check((quantity is null)=(confirmed_at is null))
);
create table public.marketplace_warehouse_operations (
  empresa_id uuid not null references public.empresas(id), request_key uuid not null, actor_id uuid not null references auth.users(id),
  action text not null, payload jsonb not null, result jsonb not null, created_at timestamptz not null default now(),
  primary key(empresa_id,request_key)
);
create table public.marketplace_warehouse_movements (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
  product_id uuid, actor_id uuid not null references auth.users(id), warehouse_id uuid not null,
  destination_id uuid, kind text not null check(kind in ('create','rename','archive','online','add','set','transfer')),
  quantity integer, stock_before integer, stock_after integer, destination_before integer, destination_after integer,
  note text not null default '', created_at timestamptz not null default now(),
  warehouse_name text not null, destination_name text,
  foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id),
  foreign key(empresa_id,warehouse_id) references public.marketplace_warehouses(empresa_id,id),
  foreign key(empresa_id,destination_id) references public.marketplace_warehouses(empresa_id,id)
);
create index marketplace_warehouse_product on public.marketplace_warehouse_balances(empresa_id,product_id);
create index marketplace_warehouse_history on public.marketplace_warehouse_movements(empresa_id,product_id,created_at desc);
alter table public.marketplace_warehouses enable row level security;
alter table public.marketplace_warehouse_balances enable row level security;
alter table public.marketplace_warehouse_operations enable row level security;
alter table public.marketplace_warehouse_movements enable row level security;
revoke all on public.marketplace_warehouses,public.marketplace_warehouse_balances,public.marketplace_warehouse_operations,public.marketplace_warehouse_movements from public,anon,authenticated;
grant select,insert,update on public.marketplace_warehouses,public.marketplace_warehouse_balances,public.marketplace_warehouse_operations,public.marketplace_warehouse_movements to service_role;

create function public.marketplace_online_warehouse(p_empresa uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
  select id into result from marketplace_warehouses where empresa_id=p_empresa and is_online and archived_at is null;
  if result is not null then return result; end if;
  perform pg_advisory_xact_lock(hashtextextended('warehouse:'||p_empresa::text,0));
  select id into result from marketplace_warehouses where empresa_id=p_empresa and is_online and archived_at is null;
  if result is null then insert into marketplace_warehouses(empresa_id,name,is_online) values(p_empresa,'Online',true) returning id into result; end if;
  return result;
end $$;

-- Espelho em uma direção: a venda online existente altera o legado e atualiza
-- somente o depósito online. Nunca soma nem toca depósitos offline.
create function public.marketplace_mirror_online_stock() returns trigger
language plpgsql security definer set search_path=public as $$
declare warehouse uuid;
begin
  if tg_op='INSERT' or new.stock_quantity is distinct from old.stock_quantity or new.stock_confirmed_at is distinct from old.stock_confirmed_at then
    warehouse:=marketplace_online_warehouse(new.empresa_id);
    insert into marketplace_warehouse_balances(empresa_id,warehouse_id,product_id,quantity,confirmed_at)
    values(new.empresa_id,warehouse,new.id,new.stock_quantity,new.stock_confirmed_at)
    on conflict(empresa_id,warehouse_id,product_id) do update set quantity=excluded.quantity,confirmed_at=excluded.confirmed_at,
      revision=marketplace_warehouse_balances.revision+1,updated_at=now()
    where marketplace_warehouse_balances.quantity is distinct from excluded.quantity or marketplace_warehouse_balances.confirmed_at is distinct from excluded.confirmed_at;
  end if;
  return new;
end $$;
create trigger marketplace_mirror_online_stock after insert or update on public.marketplace_products for each row execute function public.marketplace_mirror_online_stock();

insert into marketplace_warehouses(empresa_id,name,is_online)
select distinct empresa_id,'Online',true from marketplace_products;
insert into marketplace_warehouse_balances(empresa_id,warehouse_id,product_id,quantity,confirmed_at)
select p.empresa_id,w.id,p.id,p.stock_quantity,p.stock_confirmed_at from marketplace_products p
join marketplace_warehouses w on w.empresa_id=p.empresa_id and w.is_online;

create function public.marketplace_protect_allocated_product() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if old.archived_at is null and new.archived_at is not null and exists(
    select 1 from marketplace_warehouse_balances where empresa_id=new.empresa_id and product_id=new.id and quantity>0
  ) then raise exception 'Transfira ou confira os saldos dos estoques antes de arquivar ou unificar este cadastro.'; end if;
  return new;
end $$;
create trigger marketplace_protect_allocated_product before update on public.marketplace_products for each row execute function public.marketplace_protect_allocated_product();

create function public.marketplace_warehouse_command(p_empresa_id uuid,p_actor_id uuid,p_action text,p_data jsonb,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare manager boolean; saved marketplace_warehouse_operations; w marketplace_warehouses; dest marketplace_warehouses;
  p marketplace_products; b marketplace_warehouse_balances; target marketplace_warehouse_balances;
  name_value text; qty integer; after_value integer; before_value integer; result jsonb; wid uuid; had_online boolean;
begin
  manager:=exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id
    where u.empresa_id=p_empresa_id and u.user_id=p_actor_id and u.status='ativo'
    and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces'
    and m.ativo and (m.expira_em is null or m.expira_em>now()));
  if p_request_key is null or (not manager and (p_action not in ('add','set','transfer') or not marketplace_price_stock_authorized(p_empresa_id,p_actor_id,'confirm_stock'))) then
    raise exception 'Sem permissão para esta operação de estoque.';
  end if;
  -- Serializa recibos e mudanças de depósito online; movimentos de produto
  -- também travam o produto antes de consultar os saldos/revisões.
  perform pg_advisory_xact_lock(hashtextextended('warehouse:'||p_empresa_id::text,0));
  select * into saved from marketplace_warehouse_operations where empresa_id=p_empresa_id and request_key=p_request_key;
  if found then
    if saved.actor_id<>p_actor_id or saved.action<>p_action or saved.payload<>p_data then raise exception 'Esta tentativa já foi utilizada com outros dados.'; end if;
    return saved.result;
  end if;
  had_online:=exists(select 1 from marketplace_warehouses where empresa_id=p_empresa_id and is_online and archived_at is null);
  wid:=marketplace_online_warehouse(p_empresa_id);
  if p_action='create' then
    name_value:=trim(p_data->>'name');
    if name_value is null or length(name_value) not between 1 and 60 then raise exception 'Informe o nome do estoque (até 60 caracteres).'; end if;
    if not had_online and lower(name_value)='online' then select * into w from marketplace_warehouses where id=wid;
    else insert into marketplace_warehouses(empresa_id,name) values(p_empresa_id,name_value) returning * into w; end if;
  else
    select * into w from marketplace_warehouses where empresa_id=p_empresa_id and id=(p_data->>'warehouseId')::uuid and archived_at is null;
    if not found then raise exception 'Estoque não encontrado neste perfil.'; end if;
    if p_action='rename' then
      name_value:=trim(p_data->>'name');
      if name_value is null or length(name_value) not between 1 and 60 then raise exception 'Informe o nome do estoque (até 60 caracteres).'; end if;
      update marketplace_warehouses set name=name_value where id=w.id;
    elsif p_action='archive' then
      if w.is_online then raise exception 'O estoque online não pode ser arquivado.'; end if;
      if exists(select 1 from marketplace_warehouse_balances where empresa_id=p_empresa_id and warehouse_id=w.id and (quantity>0 or quantity is null)) then raise exception 'Este estoque possui saldo ou quantidade não confirmada. Confira e transfira os produtos antes de arquivar.'; end if;
      update marketplace_warehouses set archived_at=now() where id=w.id;
    elsif p_action='online' then
      if not w.is_online then
        -- Trava todos antes de trocar a origem; vendas concorrentes terminam
        -- antes da troca ou veem a nova origem completa, nunca metade dela.
        perform 1 from marketplace_products where empresa_id=p_empresa_id and archived_at is null order by id for update;
        if exists(select 1 from marketplace_products where empresa_id=p_empresa_id and archived_at is null and (stock_quantity>0 or stock_quantity is null))
          or exists(select 1 from marketplace_inventory_events where empresa_id=p_empresa_id and state='pending') then
          raise exception 'Transfira o saldo online e conclua as pendências de vendas antes de trocar o estoque online.';
        end if;
        update marketplace_warehouses set is_online=false where empresa_id=p_empresa_id and is_online;
        update marketplace_warehouses set is_online=true where id=w.id;
        for p in select * from marketplace_products where empresa_id=p_empresa_id and archived_at is null order by id loop
          select * into b from marketplace_warehouse_balances where empresa_id=p_empresa_id and warehouse_id=w.id and product_id=p.id;
          if b.product_id is not null and b.quantity is null then raise exception 'Confirme os saldos não verificados do destino antes de colocá-lo online.'; end if;
          update marketplace_products set stock_quantity=coalesce(b.quantity,0),stock_confirmed_at=coalesce(b.confirmed_at,now()),revision=revision+1,updated_at=now() where id=p.id;
          perform marketplace_enqueue_stock(p_empresa_id,p.id,true);
        end loop;
      end if;
    elsif p_action in ('add','set','transfer') then
      select * into p from marketplace_products where empresa_id=p_empresa_id and id=(p_data->>'productId')::uuid and archived_at is null for update;
      if not found then raise exception 'Produto não encontrado neste perfil.'; end if;
      insert into marketplace_warehouse_balances(empresa_id,warehouse_id,product_id) values(p_empresa_id,w.id,p.id) on conflict do nothing;
      select * into b from marketplace_warehouse_balances where empresa_id=p_empresa_id and warehouse_id=w.id and product_id=p.id for update;
      if p_data->>'revision' is null or (p_data->>'revision')::integer<>b.revision then raise exception 'Saldo atualizado por outra operação. Atualize antes de continuar.'; end if;
      if jsonb_typeof(p_data->'quantity') is distinct from 'number' or (p_data->>'quantity') !~ '^[0-9]{1,5}$' then raise exception 'Informe uma quantidade inteira válida.'; end if;
      qty:=(p_data->>'quantity')::integer;
      if qty>99999 or (p_action<>'set' and qty<1) then raise exception 'Confira a quantidade de 1 a 99.999 unidades.'; end if;
      before_value:=b.quantity;
      after_value:=case p_action when 'add' then coalesce(b.quantity,0)+qty when 'set' then qty else b.quantity-qty end;
      if after_value is null or after_value<0 or after_value>99999 then raise exception 'Saldo insuficiente, não confirmado ou acima do limite.'; end if;
      if p_action='transfer' then
        select * into dest from marketplace_warehouses where empresa_id=p_empresa_id and id=(p_data->>'destinationId')::uuid and archived_at is null;
        if not found or dest.id=w.id then raise exception 'Selecione outro estoque deste perfil.'; end if;
        insert into marketplace_warehouse_balances(empresa_id,warehouse_id,product_id) values(p_empresa_id,dest.id,p.id) on conflict do nothing;
        select * into target from marketplace_warehouse_balances where empresa_id=p_empresa_id and warehouse_id=dest.id and product_id=p.id for update;
        if p_data->>'destinationRevision' is null or (p_data->>'destinationRevision')::integer<>target.revision then raise exception 'Saldo do destino atualizado. Atualize antes de transferir.'; end if;
        if coalesce(target.quantity,0)+qty>99999 then raise exception 'O destino excederia o limite de saldo.'; end if;
        if dest.is_online then
          update marketplace_products set stock_quantity=coalesce(target.quantity,0)+qty,stock_confirmed_at=coalesce(stock_confirmed_at,now()),revision=revision+1,updated_at=now() where id=p.id;
          perform marketplace_enqueue_stock(p_empresa_id,p.id,true);
        else
          update marketplace_warehouse_balances set quantity=coalesce(target.quantity,0)+qty,confirmed_at=coalesce(confirmed_at,now()),revision=revision+1,updated_at=now() where empresa_id=p_empresa_id and warehouse_id=dest.id and product_id=p.id;
        end if;
      end if;
      if w.is_online then
        if p_action='set' then
          perform marketplace_product_command(p_empresa_id,p_actor_id,'confirm_stock',jsonb_build_object('product_id',p.id,'revision',p.revision,'quantity',after_value,'physical_confirmation',true,'note','Conferência do estoque online.'),p_request_key);
        else
          update marketplace_products set stock_quantity=after_value,stock_confirmed_at=coalesce(stock_confirmed_at,now()),revision=revision+1,updated_at=now() where id=p.id;
          if p_action='add' then perform marketplace_enqueue_stock(p_empresa_id,p.id,true); end if;
        end if;
      else
        update marketplace_warehouse_balances set quantity=after_value,confirmed_at=now(),revision=revision+1,updated_at=now() where empresa_id=p_empresa_id and warehouse_id=w.id and product_id=p.id;
      end if;
    else raise exception 'Operação de estoque inválida.';
    end if;
  end if;
  insert into marketplace_warehouse_movements(empresa_id,actor_id,warehouse_id,product_id,destination_id,kind,quantity,stock_before,stock_after,destination_before,destination_after,note,warehouse_name,destination_name)
  values(p_empresa_id,p_actor_id,w.id,case when p_action in ('add','set','transfer') then p.id end,dest.id,p_action,qty,before_value,after_value,target.quantity,case when dest.id is not null then coalesce(target.quantity,0)+qty end,left(coalesce(p_data->>'note',name_value,''),500),w.name,dest.name);
  result:=jsonb_build_object('warehouseId',w.id,'productId',case when p_action in ('add','set','transfer') then p.id end);
  insert into marketplace_warehouse_operations(empresa_id,request_key,actor_id,action,payload,result) values(p_empresa_id,p_request_key,p_actor_id,p_action,p_data,result);
  return result;
end $$;
do $$ declare f text; begin
  foreach f in array array['marketplace_online_warehouse(uuid)','marketplace_mirror_online_stock()','marketplace_protect_allocated_product()','marketplace_warehouse_command(uuid,uuid,text,jsonb,uuid)'] loop
    execute 'revoke all on function public.'||f||' from public,anon,authenticated';
    execute 'grant execute on function public.'||f||' to service_role';
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
