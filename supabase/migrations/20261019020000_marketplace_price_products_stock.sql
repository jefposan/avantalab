-- Consulta cria cadastro, nunca unidades. Saldo continua confirmado explicitamente.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
create table public.marketplace_price_product_sources (
  empresa_id uuid not null references public.empresas(id),
  source_key text not null check (length(source_key) between 1 and 240),
  product_id uuid not null,
  primary key (empresa_id,source_key),
  foreign key (empresa_id,product_id) references public.marketplace_products(empresa_id,id)
);
alter table public.marketplace_price_product_sources enable row level security;
revoke all on public.marketplace_price_product_sources from public,anon,authenticated;
grant select,insert,update on public.marketplace_price_product_sources to service_role;
alter table public.marketplace_price_consultations add column local_product_id uuid;
alter table public.marketplace_price_consultations add foreign key (empresa_id,local_product_id) references public.marketplace_products(empresa_id,id);

create function public.marketplace_price_product_register(p_empresa_id uuid,p_actor_id uuid,p_source_key text,p_data jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_product public.marketplace_products; v_id uuid; v_matches integer; v_ean text:=nullif(p_data->>'ean',''); v_picture text:=p_data->>'image'; v_pictures jsonb:='[]'; v_price bigint;
begin
  if p_source_key is null or length(p_source_key) not between 1 and 240 or length(trim(coalesce(p_data->>'name',''))) not between 1 and 220
    or (v_ean is not null and v_ean !~ '^[0-9]{8,14}$') then raise exception 'Identificação do produto inválida.'; end if;
  -- Serializa identificações simultâneas, inclusive as sem EAN; não compara por nome.
  perform pg_advisory_xact_lock(hashtextextended('price-products:'||p_empresa_id::text,0));
  if v_picture ~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+(/[^[:space:]]*)?$' and length(v_picture)<=2048 then v_pictures:=jsonb_build_array(v_picture); end if;
  if p_data->>'price_cents' ~ '^[0-9]{1,10}$' and (p_data->>'price_cents')::bigint>0 then v_price:=(p_data->>'price_cents')::bigint; end if;
  select product_id into v_id from public.marketplace_price_product_sources where empresa_id=p_empresa_id and source_key=p_source_key;
  if p_source_key ~ '^mercado_livre:LOCAL:[0-9a-f-]{36}$' then
    v_id:=substring(p_source_key from 21)::uuid;
    if not exists(select 1 from public.marketplace_products where empresa_id=p_empresa_id and id=v_id and archived_at is null) then raise exception 'Produto local não encontrado nesta empresa.'; end if;
  end if;
  if v_id is null and v_ean is not null then
    select count(*),min(id::text)::uuid into v_matches,v_id from public.marketplace_products where empresa_id=p_empresa_id and ltrim(ean,'0')=ltrim(v_ean,'0') and archived_at is null;
    if v_matches>1 then raise exception 'Há mais de um cadastro com este EAN. Unifique os produtos antes de continuar.'; end if;
  end if;
  if v_id is not null then
    select * into v_product from public.marketplace_products where empresa_id=p_empresa_id and id=v_id and archived_at is null;
    if not found then raise exception 'O cadastro vinculado foi arquivado. Confira os produtos desta empresa.'; end if;
    if v_ean is not null and v_product.ean is not null and ltrim(v_product.ean,'0')<>ltrim(v_ean,'0') then raise exception 'O EAN do cadastro vinculado diverge da consulta. Confira o produto antes de movimentar estoque.'; end if;
    if v_ean is not null and v_product.ean is null and exists(select 1 from public.marketplace_products where empresa_id=p_empresa_id and id<>v_id and archived_at is null and ltrim(ean,'0')=ltrim(v_ean,'0')) then raise exception 'Já existe outro cadastro com este EAN. Confira a unificação dos produtos.'; end if;
    -- Só completa ausências. Uma identificação sem preço pode ser precificada depois.
    update public.marketplace_products set
      description=case when description='' then left(coalesce(p_data->>'description',''),50000) else description end,
      pictures=case when pictures='[]'::jsonb then v_pictures else pictures end,
      ean=coalesce(ean,v_ean),price_cents=coalesce(price_cents,v_price),revision=revision+1,updated_at=now()
      where id=v_id and ((ean is null and v_ean is not null) or (description='' and coalesce(p_data->>'description','')<>'') or (pictures='[]'::jsonb and v_pictures<>'[]'::jsonb) or (price_cents is null and v_price is not null));
    -- Nome, referência/foto preenchidas e saldo nunca são substituídos.
  else
    insert into public.marketplace_products(empresa_id,created_by,name,ean,description,pictures,attributes,price_cents)
    values(p_empresa_id,p_actor_id,trim(p_data->>'name'),v_ean,left(coalesce(p_data->>'description',''),50000),v_pictures,
      case when jsonb_typeof(p_data->'attributes')='array' then p_data->'attributes' else '[]'::jsonb end,
      v_price)
    returning id into v_id;
  end if;
  insert into public.marketplace_price_product_sources values(p_empresa_id,p_source_key,v_id) on conflict do nothing;
  return v_id;
end $$;
revoke all on function public.marketplace_price_product_register(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_price_product_register(uuid,uuid,text,jsonb) to service_role;

create function public.marketplace_price_history_register_product()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  NEW.local_product_id:=public.marketplace_price_product_register(NEW.empresa_id,NEW.created_by,'mercado_livre:'||NEW.provider_product_id,
    jsonb_build_object('name',NEW.product_name,'ean',NEW.ean,'description',NEW.product_description,'image',NEW.image_url,'price_cents',NEW.market_price_cents));
  return NEW;
end $$;
revoke all on function public.marketplace_price_history_register_product() from public,anon,authenticated;
create trigger marketplace_price_history_product before insert or update of provider_product_id,ean,product_name on public.marketplace_price_consultations
for each row execute function public.marketplace_price_history_register_product();

create function public.marketplace_price_history_product_ensure(p_empresa_id uuid,p_history_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  -- Reparação explícita do vínculo antigo depois de resolver um EAN ambíguo.
  update public.marketplace_price_consultations set product_name=product_name
    where empresa_id=p_empresa_id and id=p_history_id and local_product_id is null returning local_product_id into v_id;
  if v_id is null then select local_product_id into v_id from public.marketplace_price_consultations where empresa_id=p_empresa_id and id=p_history_id; end if;
  if v_id is null then raise exception 'Consulta não vinculada nesta empresa. Confira os cadastros com o mesmo EAN.'; end if;
  return v_id;
end $$;
revoke all on function public.marketplace_price_history_product_ensure(uuid,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_price_history_product_ensure(uuid,uuid) to service_role;

-- Preserva o contrato de movimentação e unificação existente. Histórico/origem
-- precisam seguir o mesmo destino canônico quando o usuário unifica cadastros.
alter function public.marketplace_product_command(uuid,uuid,text,jsonb,uuid) rename to marketplace_product_command_base_49;
create function public.marketplace_product_command(p_empresa_id uuid,p_actor_id uuid,p_action text,p_data jsonb,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if p_action='merge' then perform pg_advisory_xact_lock(hashtextextended('price-products:'||p_empresa_id::text,0)); end if;
  v_result:=public.marketplace_product_command_base_49(p_empresa_id,p_actor_id,p_action,p_data,p_request_key);
  if p_action='merge' then
    update public.marketplace_price_product_sources set product_id=(v_result->>'product_id')::uuid where empresa_id=p_empresa_id and product_id=(p_data->>'product_id')::uuid;
    update public.marketplace_price_consultations set local_product_id=(v_result->>'product_id')::uuid where empresa_id=p_empresa_id and local_product_id=(p_data->>'product_id')::uuid;
  end if;
  return v_result;
end $$;
revoke all on function public.marketplace_product_command(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_product_command(uuid,uuid,text,jsonb,uuid) to service_role;

-- Históricos anteriores ficam disponíveis para entrada de estoque sem refazer pesquisa.
-- EAN ambíguo não gera outro cadastro nem impede os demais históricos de migrar.
do $$ declare h record; begin
  for h in select id from public.marketplace_price_consultations where local_product_id is null order by empresa_id,created_at,id loop
    begin
      update public.marketplace_price_consultations set product_name=product_name where id=h.id;
    exception when raise_exception then null;
    end;
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
