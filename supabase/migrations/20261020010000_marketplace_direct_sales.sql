-- Vendas diretas e saídas físicas. Sem lançamentos financeiros, NF ou backfill de vendas.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
alter table public.marketplace_price_users add column can_register_sales boolean not null default false;
create table public.marketplace_direct_sales (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
 product_id uuid not null, warehouse_id uuid not null, warehouse_name text not null,
 product_name text not null, ean text, picture text, quantity integer not null check(quantity between 1 and 99999),
 unit_price_cents bigint not null check(unit_price_cents between 1 and 999999999),
 total_cents bigint generated always as (quantity::bigint*unit_price_cents) stored,
 sold_on date not null, status text not null default 'confirmed' check(status in ('confirmed','cancelled')),
 returned_quantity integer not null default 0 check(returned_quantity between 0 and quantity),
 note text not null default '', cancellation_note text, actor_id uuid not null references auth.users(id),
 cancelled_by uuid references auth.users(id), cancelled_at timestamptz,
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(empresa_id,id), foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id),
 foreign key(empresa_id,warehouse_id) references public.marketplace_warehouses(empresa_id,id)
);
create index marketplace_direct_sales_period on public.marketplace_direct_sales(empresa_id,sold_on desc,id);
alter table public.marketplace_direct_sales enable row level security;
revoke all on public.marketplace_direct_sales from public,anon,authenticated;
grant select,insert,update on public.marketplace_direct_sales to service_role;
alter table public.marketplace_warehouse_movements drop constraint marketplace_warehouse_movements_kind_check;
alter table public.marketplace_warehouse_movements add constraint marketplace_warehouse_movements_kind_check check(kind in ('create','rename','archive','online','add','set','transfer','sale','withdraw','sale_return'));
alter table public.marketplace_warehouse_movements add column sale_id uuid;
alter table public.marketplace_warehouse_movements add foreign key(empresa_id,sale_id) references public.marketplace_direct_sales(empresa_id,id);

create function public.marketplace_direct_sale_command(p_empresa_id uuid,p_actor_id uuid,p_action text,p_data jsonb,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare manager boolean; allowed boolean:=false; saved marketplace_warehouse_operations;
 w marketplace_warehouses; p marketplace_products; b marketplace_warehouse_balances; s marketplace_direct_sales;
 qty integer; price bigint; day_value date; before_value integer; after_value integer;
 result jsonb; movement_kind text; reason text;
begin
 if p_request_key is null or p_action is null or p_action not in ('sell','withdraw','cancel','return') then raise exception 'Operação de saída inválida.'; end if;
 perform 1 from empresa_modulos where empresa_id=p_empresa_id and modulo_id='marketplaces' and ativo and (expira_em is null or expira_em>now()) for share;
 if not found then raise exception 'Módulo indisponível neste perfil.'; end if;
 perform 1 from usuarios_empresa where empresa_id=p_empresa_id and user_id=p_actor_id and status='ativo' and perfil in ('gestor_master','administrador','operador_completo') for share;
 manager:=found;
 if manager then allowed:=true;
 elsif p_action='withdraw' then allowed:=marketplace_price_stock_authorized(p_empresa_id,p_actor_id,'confirm_stock');
 else
   perform 1 from marketplace_price_users where empresa_id=p_empresa_id and user_id=p_actor_id and ativo and can_register_sales for share;
   allowed:=found;
 end if;
 if not allowed then raise exception 'Sem permissão para esta operação.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('warehouse:'||p_empresa_id::text,0));
 select * into saved from marketplace_warehouse_operations where empresa_id=p_empresa_id and request_key=p_request_key;
 if found then
   if saved.actor_id<>p_actor_id or saved.action<>'direct_'||p_action or saved.payload<>p_data then raise exception 'Esta tentativa já foi utilizada com outros dados.'; end if;
   return saved.result;
 end if;
 reason:=trim(coalesce(p_data->>'note',''));
 if length(reason)>500 then raise exception 'Use até 500 caracteres na observação.'; end if;
 if p_action in ('cancel','return') then
   select * into s from marketplace_direct_sales where empresa_id=p_empresa_id and id=(p_data->>'saleId')::uuid for update;
   if not found then raise exception 'Venda direta não encontrada neste perfil.'; end if;
   if (p_data->>'saleRevision') is null or (p_data->>'saleRevision')::integer<>s.revision then raise exception 'Venda atualizada. Confira antes de continuar.'; end if;
   if p_action='cancel' and s.status='cancelled' then raise exception 'Venda já cancelada. Use Registrar devolução para um retorno físico posterior.'; end if;
   if p_action='return' and s.status<>'cancelled' then raise exception 'Cancele a venda antes de registrar a devolução.'; end if;
   if reason='' then raise exception 'Informe o motivo do cancelamento ou da devolução.'; end if;
   if jsonb_typeof(p_data->'quantity') is distinct from 'number' or (p_data->>'quantity') !~ '^[0-9]{1,5}$' then raise exception 'Informe a quantidade que retornou fisicamente.'; end if;
   qty:=(p_data->>'quantity')::integer;
   if qty<(case when p_action='return' then 1 else 0 end) or qty>s.quantity-s.returned_quantity then raise exception 'Quantidade de devolução inválida ou já devolvida.'; end if;
   select * into w from marketplace_warehouses where empresa_id=p_empresa_id and id=(p_data->>'warehouseId')::uuid and archived_at is null;
   if qty>0 and w.id is null then raise exception 'Selecione um estoque ativo para receber a devolução.'; end if;
   select * into p from marketplace_products where empresa_id=p_empresa_id and id=s.product_id for update;
   if qty>0 and p.archived_at is not null then raise exception 'Reative o produto antes de devolver unidades ao estoque.'; end if;
 else
   select * into w from marketplace_warehouses where empresa_id=p_empresa_id and id=(p_data->>'warehouseId')::uuid and archived_at is null;
   if not found then raise exception 'Estoque não encontrado neste perfil.'; end if;
   select * into p from marketplace_products where empresa_id=p_empresa_id and id=(p_data->>'productId')::uuid and archived_at is null for update;
   if not found then raise exception 'Produto não encontrado neste perfil.'; end if;
   if jsonb_typeof(p_data->'quantity') is distinct from 'number' or (p_data->>'quantity') !~ '^[0-9]{1,5}$' then raise exception 'Informe uma quantidade inteira válida.'; end if;
   qty:=(p_data->>'quantity')::integer;
   if qty not between 1 and 99999 then raise exception 'Informe a quantidade de saída.'; end if;
   if p_action='withdraw' and (p_data->>'reason' is null or p_data->>'reason' not in ('loss','damage','internal')) then raise exception 'Selecione o motivo da saída.'; end if;
   if p_action='sell' then
     if jsonb_typeof(p_data->'unitPriceCents') is distinct from 'number' or (p_data->>'unitPriceCents') !~ '^[0-9]{1,9}$' then raise exception 'Informe o preço unitário vendido.'; end if;
     price:=(p_data->>'unitPriceCents')::bigint;
     if price<1 then raise exception 'O preço de venda deve ser maior que zero.'; end if;
     if p_data->>'soldOn' is null or p_data->>'soldOn' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Informe a data da venda.'; end if;
     day_value:=(p_data->>'soldOn')::date;
     if day_value> (now() at time zone 'America/Sao_Paulo')::date or day_value<'2000-01-01' then raise exception 'A data da venda não pode ser futura ou anterior a 2000.'; end if;
   end if;
 end if;
 if p_action in ('sell','withdraw') or qty>0 then
   insert into marketplace_warehouse_balances(empresa_id,warehouse_id,product_id,quantity,confirmed_at)
   values(p_empresa_id,w.id,p.id,case when p_action in ('cancel','return') then 0 end,case when p_action in ('cancel','return') then now() end) on conflict do nothing;
   select * into b from marketplace_warehouse_balances where empresa_id=p_empresa_id and warehouse_id=w.id and product_id=p.id for update;
   if p_data->>'revision' is null or (p_data->>'revision')::integer<>b.revision then raise exception 'Saldo atualizado por outra operação. Atualize antes de continuar.'; end if;
   before_value:=b.quantity;
   if before_value is null then raise exception 'Confirme o saldo deste estoque antes de movimentar.'; end if;
   after_value:=before_value+case when p_action in ('sell','withdraw') then -qty else qty end;
   if after_value not between 0 and 99999 then raise exception 'Saldo insuficiente ou acima do limite.'; end if;
   if w.is_online then
     update marketplace_products set stock_quantity=after_value,revision=revision+1,updated_at=now() where id=p.id;
     perform marketplace_enqueue_stock(p_empresa_id,p.id,qty>0 and p_action in ('return','cancel'));
   else
     update marketplace_warehouse_balances set quantity=after_value,revision=revision+1,updated_at=now() where empresa_id=p_empresa_id and warehouse_id=w.id and product_id=p.id;
   end if;
 end if;
 if p_action='sell' then
   insert into marketplace_direct_sales(empresa_id,product_id,warehouse_id,warehouse_name,product_name,ean,picture,quantity,unit_price_cents,sold_on,note,actor_id)
   values(p_empresa_id,p.id,w.id,w.name,p.name,p.ean,p.pictures->>0,qty,price,day_value,reason,p_actor_id) returning * into s;
 elsif p_action in ('cancel','return') then
   update marketplace_direct_sales set status='cancelled',returned_quantity=returned_quantity+qty,revision=revision+1,updated_at=now(),
     cancellation_note=case when p_action='cancel' then reason else cancellation_note end,
     cancelled_by=case when p_action='cancel' then p_actor_id else cancelled_by end,
     cancelled_at=coalesce(cancelled_at,now()) where id=s.id returning * into s;
 end if;
 if p_action in ('sell','withdraw') or qty>0 then
   movement_kind:=case p_action when 'sell' then 'sale' when 'withdraw' then 'withdraw' else 'sale_return' end;
   insert into marketplace_warehouse_movements(empresa_id,actor_id,warehouse_id,product_id,kind,quantity,stock_before,stock_after,note,warehouse_name,sale_id)
   values(p_empresa_id,p_actor_id,w.id,p.id,movement_kind,qty,before_value,after_value,
     case when p_action='withdraw' then (case p_data->>'reason' when 'loss' then 'Perda' when 'damage' then 'Avaria' else 'Uso interno' end)||case when reason<>'' then ' · '||reason else '' end else reason end,w.name,s.id);
 end if;
 result:=jsonb_build_object('saleId',s.id,'productId',p.id,'stockAfter',after_value);
 insert into marketplace_warehouse_operations(empresa_id,request_key,actor_id,action,payload,result) values(p_empresa_id,p_request_key,p_actor_id,'direct_'||p_action,p_data,result);
 return result;
end $$;
revoke all on function public.marketplace_direct_sale_command(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_direct_sale_command(uuid,uuid,text,jsonb,uuid) to service_role;
notify pgrst,'reload schema';
commit;
