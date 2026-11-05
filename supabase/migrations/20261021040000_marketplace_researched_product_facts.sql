-- Completa a ficha pesquisada sem alterar saldo, anúncios ou campos manuais preenchidos.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create function public.marketplace_complete_product_attributes(p_saved jsonb,p_incoming jsonb)
returns jsonb language sql immutable set search_path=public as $$
  with saved as (select value,ordinality as pos from jsonb_array_elements(coalesce(p_saved,'[]'::jsonb)) with ordinality),
  incoming_raw as (select value,ordinality as pos from jsonb_array_elements(case when jsonb_typeof(p_incoming)='array' then p_incoming else '[]'::jsonb end) with ordinality where coalesce(value->>'id','')<>'' and coalesce(value->>'value','')<>'' limit 80),
  incoming as (select distinct on (upper(value->>'id')) value,pos from incoming_raw order by upper(value->>'id'),pos),
  completed as (select case when coalesce(s.value->>'value','')='' and i.value is not null then s.value||jsonb_build_object('value',i.value->'value') else s.value end as value,s.pos from saved s left join incoming i on upper(i.value->>'id')=upper(s.value->>'id')),
  combined as (select value,pos from completed union all select i.value,i.pos+1000000 from incoming i where not exists(select 1 from saved s where upper(s.value->>'id')=upper(i.value->>'id')))
  select coalesce(jsonb_agg(value order by pos),'[]'::jsonb) from combined;
$$;
revoke all on function public.marketplace_complete_product_attributes(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_complete_product_attributes(jsonb,jsonb) to service_role;
create or replace function public.marketplace_price_product_register(p_empresa_id uuid,p_actor_id uuid,p_source_key text,p_data jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_product public.marketplace_products; v_id uuid; v_matches integer; v_ean text:=nullif(p_data->>'ean',''); v_picture text:=p_data->>'image'; v_pictures jsonb:='[]'; v_price bigint; v_attributes jsonb; v_sources jsonb;
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
    select * into v_product from public.marketplace_products where empresa_id=p_empresa_id and id=v_id and archived_at is null for update;
    if not found then raise exception 'O cadastro vinculado foi arquivado. Confira os produtos desta empresa.'; end if;
    if v_ean is not null and v_product.ean is not null and ltrim(v_product.ean,'0')<>ltrim(v_ean,'0') then raise exception 'O EAN do cadastro vinculado diverge da consulta. Confira o produto antes de movimentar estoque.'; end if;
    if v_ean is not null and v_product.ean is null and exists(select 1 from public.marketplace_products where empresa_id=p_empresa_id and id<>v_id and archived_at is null and ltrim(ean,'0')=ltrim(v_ean,'0')) then raise exception 'Já existe outro cadastro com este EAN. Confira a unificação dos produtos.'; end if;
    v_attributes:=public.marketplace_complete_product_attributes(v_product.attributes,p_data->'attributes');
    select coalesce(jsonb_agg(url order by url),'[]'::jsonb) into v_sources from (select distinct value as url from jsonb_array_elements(case when jsonb_typeof(v_product.publication_form->'web_research_sources')='array' then v_product.publication_form->'web_research_sources' else '[]'::jsonb end || case when jsonb_typeof(p_data->'sources')='array' then p_data->'sources' else '[]'::jsonb end) order by url limit 20) s;
    -- Só completa ausências. Uma identificação sem preço pode ser precificada depois.
    update public.marketplace_products set
      description=case when description='' then left(coalesce(p_data->>'description',''),50000) else description end,
      pictures=case when pictures='[]'::jsonb then v_pictures else pictures end,
      attributes=v_attributes,publication_form=case when v_sources<>'[]'::jsonb then publication_form||jsonb_build_object('web_research_sources',v_sources) else publication_form end,
      ean=coalesce(ean,v_ean),price_cents=coalesce(price_cents,v_price),revision=revision+1,updated_at=now()
      where id=v_id and (attributes<>v_attributes or (v_sources<>'[]'::jsonb and coalesce(publication_form->'web_research_sources','[]'::jsonb)<>v_sources) or (ean is null and v_ean is not null) or (description='' and coalesce(p_data->>'description','')<>'') or (pictures='[]'::jsonb and v_pictures<>'[]'::jsonb) or (price_cents is null and v_price is not null));
    -- Nome, referência/foto preenchidas e saldo nunca são substituídos.
  else
    insert into public.marketplace_products(empresa_id,created_by,name,ean,description,pictures,attributes,publication_form,price_cents)
    values(p_empresa_id,p_actor_id,trim(p_data->>'name'),v_ean,left(coalesce(p_data->>'description',''),50000),v_pictures,
      public.marketplace_complete_product_attributes('[]'::jsonb,p_data->'attributes'),
      case when jsonb_typeof(p_data->'sources')='array' then jsonb_build_object('web_research_sources',p_data->'sources') else '{}'::jsonb end,
      v_price)
    returning id into v_id;
  end if;
  insert into public.marketplace_price_product_sources values(p_empresa_id,p_source_key,v_id) on conflict do nothing;
  return v_id;
end $$;
revoke all on function public.marketplace_price_product_register(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_price_product_register(uuid,uuid,text,jsonb) to service_role;


commit;

