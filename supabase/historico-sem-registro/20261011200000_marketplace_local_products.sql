-- Cadastro local por empresa. Não soma anúncios, não faz baixa de vendas e
-- não envia mudanças ao provedor. Migração aditiva, com histórico preservado.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  sku text not null default ('MP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  name text not null check (length(trim(name)) between 1 and 220),
  ean text, description text not null default '', pictures jsonb not null default '[]'::jsonb,
  category_id text not null default '', catalog_product_id text not null default '',
  attributes jsonb not null default '[]'::jsonb, publication_form jsonb not null default '{}'::jsonb,
  price_cents bigint check (price_cents is null or price_cents > 0),
  stock_quantity integer check (stock_quantity is null or stock_quantity between 0 and 99999),
  stock_confirmed_at timestamptz, stock_confirmed_by uuid references auth.users(id),
  revision bigint not null default 1, draft_key uuid, archived_at timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (empresa_id, id), unique (empresa_id, sku), unique (empresa_id, draft_key),
  check ((stock_quantity is null) = (stock_confirmed_at is null)),
  check (jsonb_typeof(pictures) = 'array' and jsonb_typeof(attributes) = 'array' and jsonb_typeof(publication_form) = 'object')
);

create table if not exists public.marketplace_product_links (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
  product_id uuid not null, connection_id uuid not null references public.marketplace_connections(id),
  provider text not null, provider_listing_id text not null, title text not null,
  reported_stock integer, status text not null default '', source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (empresa_id, product_id) references public.marketplace_products(empresa_id, id),
  unique (empresa_id, connection_id, provider_listing_id)
);

create table if not exists public.marketplace_stock_movements (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
  product_id uuid not null, actor_id uuid not null references auth.users(id),
  kind text not null check (kind in ('confirmation', 'adjustment')),
  stock_before integer, stock_after integer not null, note text not null default '',
  created_at timestamptz not null default now(),
  foreign key (empresa_id, product_id) references public.marketplace_products(empresa_id, id)
);

create table if not exists public.marketplace_product_operations (
  empresa_id uuid not null references public.empresas(id), request_key uuid not null,
  actor_id uuid not null references auth.users(id), action text not null, request_hash text not null,
  result jsonb not null, created_at timestamptz not null default now(), primary key (empresa_id, request_key)
);

create index if not exists marketplace_products_company_idx on public.marketplace_products(empresa_id, created_at desc) where archived_at is null;
create index if not exists marketplace_product_links_product_idx on public.marketplace_product_links(empresa_id, product_id);
create index if not exists marketplace_stock_movements_product_idx on public.marketplace_stock_movements(empresa_id, product_id, created_at desc);

alter table public.marketplace_products enable row level security;
alter table public.marketplace_product_links enable row level security;
alter table public.marketplace_stock_movements enable row level security;
alter table public.marketplace_product_operations enable row level security;
revoke all on public.marketplace_products, public.marketplace_product_links, public.marketplace_stock_movements, public.marketplace_product_operations from anon, authenticated;
grant select, insert, update on public.marketplace_products, public.marketplace_product_links, public.marketplace_stock_movements, public.marketplace_product_operations to service_role;

create or replace function public.marketplace_product_command(p_empresa_id uuid, p_actor_id uuid, p_action text, p_data jsonb, p_request_key uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_product public.marketplace_products; v_target public.marketplace_products;
  v_link public.marketplace_product_links; v_operation public.marketplace_product_operations;
  v_quantity integer; v_before integer; v_result jsonb; v_hash text;
begin
  if p_request_key is null or not exists (
    select 1 from public.usuarios_empresa u join public.empresa_modulos m on m.empresa_id = u.empresa_id
    where u.empresa_id = p_empresa_id and u.user_id = p_actor_id and u.status = 'ativo'
      and u.perfil in ('gestor_master', 'administrador', 'operador_completo')
      and m.modulo_id = 'marketplaces' and m.ativo and (m.expira_em is null or m.expira_em > now())
  ) then raise exception 'Sem permissão para gerenciar produtos nesta empresa.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_empresa_id::text || ':' || p_request_key::text, 0));
  v_hash := md5(p_action || ':' || p_actor_id::text || ':' || case when p_action = 'draft' then p_request_key::text else p_data::text end);
  select * into v_operation from public.marketplace_product_operations where empresa_id = p_empresa_id and request_key = p_request_key;
  if found then
    if v_operation.request_hash <> v_hash then raise exception 'Tentativa repetida com dados diferentes. Atualize e tente novamente.'; end if;
    return v_operation.result;
  end if;

  if p_action in ('create', 'draft', 'import') then
    if p_action = 'import' then
      if not exists (select 1 from public.marketplace_connections c where c.id = (p_data->>'connection_id')::uuid and c.empresa_id = p_empresa_id and c.provider = p_data->>'provider') then raise exception 'Conta de origem não pertence à empresa.'; end if;
      perform pg_advisory_xact_lock(hashtextextended(p_empresa_id::text || ':' || (p_data->>'connection_id') || ':' || (p_data->>'provider_listing_id'), 0));
      select * into v_link from public.marketplace_product_links where empresa_id = p_empresa_id and connection_id = (p_data->>'connection_id')::uuid and provider_listing_id = p_data->>'provider_listing_id';
      if found then
        v_result := jsonb_build_object('product_id', v_link.product_id, 'created', false);
        insert into public.marketplace_product_operations values (p_empresa_id, p_request_key, p_actor_id, p_action, v_hash, v_result, now());
        return v_result;
      end if;
    end if;
    if p_action <> 'import' and p_data->>'stock_quantity' is not null and (p_data->>'stock_quantity') !~ '^[0-9]{1,5}$' then raise exception 'Quantidade física inválida.'; end if;
    v_quantity := case when p_action = 'import' then null else (p_data->>'stock_quantity')::integer end;
    if v_quantity is not null and (v_quantity < 0 or v_quantity > 99999 or coalesce((p_data->>'physical_confirmation')::boolean, false) is not true) then raise exception 'Confirme a quantidade física.'; end if;
    insert into public.marketplace_products (empresa_id, sku, name, ean, description, pictures, category_id, catalog_product_id, attributes, publication_form, price_cents, stock_quantity, stock_confirmed_at, stock_confirmed_by, created_by, draft_key)
    values (p_empresa_id, coalesce(nullif(trim(p_data->>'sku'), ''), 'MP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
      p_data->>'name', nullif(p_data->>'ean', ''), coalesce(p_data->>'description', ''), coalesce(p_data->'pictures', '[]'::jsonb), coalesce(p_data->>'category_id', ''), coalesce(p_data->>'catalog_product_id', ''),
      coalesce(p_data->'attributes', '[]'::jsonb), coalesce(p_data->'publication_form', '{}'::jsonb), (p_data->>'price_cents')::bigint, v_quantity,
      case when v_quantity is not null then now() end, case when v_quantity is not null then p_actor_id end, p_actor_id, case when p_action = 'draft' then p_request_key end)
    returning * into v_product;
    if p_action = 'import' then
      insert into public.marketplace_product_links (empresa_id, product_id, connection_id, provider, provider_listing_id, title, reported_stock, status, source_snapshot)
      values (p_empresa_id, v_product.id, (p_data->>'connection_id')::uuid, p_data->>'provider', p_data->>'provider_listing_id', v_product.name, (p_data->>'reported_stock')::integer, coalesce(p_data->>'status', ''), coalesce(p_data->'source_snapshot', '{}'::jsonb));
    elsif v_quantity is not null then
      insert into public.marketplace_stock_movements (empresa_id, product_id, actor_id, kind, stock_before, stock_after, note)
      values (p_empresa_id, v_product.id, p_actor_id, 'confirmation', null, v_quantity, 'Quantidade inicial informada pelo usuário.');
    end if;
    v_result := jsonb_build_object('product_id', v_product.id, 'created', true);
  else
    if p_action = 'merge' then
      perform 1 from public.marketplace_products where empresa_id = p_empresa_id and id in ((p_data->>'product_id')::uuid, (p_data->>'target_id')::uuid) order by id for update;
    end if;
    select * into v_product from public.marketplace_products where empresa_id = p_empresa_id and id = (p_data->>'product_id')::uuid and archived_at is null for update;
    if not found then raise exception 'Produto não encontrado nesta empresa.'; end if;
    if p_action <> 'link' and v_product.revision is distinct from (p_data->>'revision')::bigint then raise exception 'O cadastro foi atualizado por outra operação. Atualize antes de salvar.'; end if;
    if p_action = 'confirm_stock' then
      if coalesce(p_data->>'quantity', '') !~ '^[0-9]{1,5}$' then raise exception 'Quantidade física inválida.'; end if;
      v_quantity := (p_data->>'quantity')::integer;
      if v_quantity is null or v_quantity < 0 or v_quantity > 99999 or coalesce((p_data->>'physical_confirmation')::boolean, false) is not true then raise exception 'Confirme a quantidade física de 0 a 99.999.'; end if;
      v_before := v_product.stock_quantity;
      update public.marketplace_products set stock_quantity = v_quantity, stock_confirmed_at = now(), stock_confirmed_by = p_actor_id, revision = revision + 1, updated_at = now() where id = v_product.id;
      insert into public.marketplace_stock_movements (empresa_id, product_id, actor_id, kind, stock_before, stock_after, note)
      values (p_empresa_id, v_product.id, p_actor_id, case when v_before is null then 'confirmation' else 'adjustment' end, v_before, v_quantity, coalesce(p_data->>'note', ''));
    elsif p_action = 'link' then
      if not exists (select 1 from public.marketplace_connections c where c.id = (p_data->>'connection_id')::uuid and c.empresa_id = p_empresa_id and c.provider = p_data->>'provider') then raise exception 'Conta não pertence à empresa.'; end if;
      select * into v_link from public.marketplace_product_links where empresa_id = p_empresa_id and connection_id = (p_data->>'connection_id')::uuid and provider_listing_id = p_data->>'provider_listing_id';
      if found and v_link.product_id <> v_product.id then raise exception 'Anúncio já vinculado a outro produto.'; end if;
      insert into public.marketplace_product_links (empresa_id, product_id, connection_id, provider, provider_listing_id, title, reported_stock, status, source_snapshot)
      values (p_empresa_id, v_product.id, (p_data->>'connection_id')::uuid, p_data->>'provider', p_data->>'provider_listing_id', coalesce(p_data->>'title', v_product.name), (p_data->>'reported_stock')::integer, coalesce(p_data->>'status', ''), coalesce(p_data->'source_snapshot', '{}'::jsonb))
      on conflict (empresa_id, connection_id, provider_listing_id) do update set reported_stock = excluded.reported_stock, status = excluded.status, source_snapshot = excluded.source_snapshot, updated_at = now();
    elsif p_action = 'enrich' then
      -- Completa uma importação parcial, sem substituir nome/preço/estoque revisados.
      update public.marketplace_products set
        description = case when description = '' then coalesce(p_data->>'description', '') else description end,
        pictures = case when pictures = '[]'::jsonb then coalesce(p_data->'pictures', '[]'::jsonb) else pictures end,
        catalog_product_id = case when catalog_product_id = '' then coalesce(p_data->>'catalog_product_id', '') else catalog_product_id end,
        attributes = case when attributes = '[]'::jsonb then coalesce(p_data->'attributes', '[]'::jsonb) else attributes end,
        publication_form = coalesce(p_data->'publication_form', '{}'::jsonb) || publication_form,
        revision = revision + 1, updated_at = now() where id = v_product.id;
    elsif p_action = 'update' then
      update public.marketplace_products set name = p_data->>'name', ean = nullif(p_data->>'ean', ''), description = coalesce(p_data->>'description', ''), pictures = coalesce(p_data->'pictures', '[]'::jsonb),
        category_id = coalesce(p_data->>'category_id', ''), price_cents = (p_data->>'price_cents')::bigint,
        publication_form = publication_form || jsonb_build_object('description', coalesce(p_data->>'description', ''), 'price', coalesce((p_data->>'price_cents')::numeric / 100, 0)),
        revision = revision + 1, updated_at = now() where id = v_product.id;
    elsif p_action = 'merge' then
      if v_product.stock_quantity is not null then raise exception 'Vincule apenas um cadastro com estoque ainda não confirmado; os saldos nunca são somados.'; end if;
      select * into v_target from public.marketplace_products where empresa_id = p_empresa_id and id = (p_data->>'target_id')::uuid and archived_at is null;
      if not found or v_target.id = v_product.id then raise exception 'Selecione outro produto desta empresa.'; end if;
      if v_target.revision is distinct from (p_data->>'target_revision')::bigint then raise exception 'O destino foi atualizado. Atualize a lista antes de vincular.'; end if;
      update public.marketplace_product_links set product_id = v_target.id, updated_at = now() where empresa_id = p_empresa_id and product_id = v_product.id;
      update public.marketplace_products set archived_at = now(), revision = revision + 1, updated_at = now() where id = v_product.id;
      update public.marketplace_products set revision = revision + 1, updated_at = now() where id = v_target.id;
    else raise exception 'Operação de cadastro inválida.'; end if;
    v_result := jsonb_build_object('product_id', case when p_action = 'merge' then v_target.id else v_product.id end, 'created', false);
  end if;
  insert into public.marketplace_product_operations values (p_empresa_id, p_request_key, p_actor_id, p_action, v_hash, v_result, now());
  return v_result;
end;
$$;
revoke all on function public.marketplace_product_command(uuid, uuid, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.marketplace_product_command(uuid, uuid, text, jsonb, uuid) to service_role;
notify pgrst, 'reload schema';
commit;
