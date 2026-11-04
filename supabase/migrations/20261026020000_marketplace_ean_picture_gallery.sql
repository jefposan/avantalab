-- Conserva a galeria encontrada por EAN; a foto de capa continua sendo a original.
create or replace function public.marketplace_price_product_register_gallery(p_empresa_id uuid,p_actor_id uuid,p_source_key text,p_data jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_product public.marketplace_products; v_pictures jsonb;
begin
  if jsonb_typeof(p_data->'pictures') is distinct from 'array' or jsonb_array_length(p_data->'pictures')>12 then
    raise exception 'Galeria de fotos inválida.';
  end if;
  if exists(select 1 from jsonb_array_elements(p_data->'pictures') p where jsonb_typeof(p)<>'string' or length(p#>>'{}')>2048 or (p#>>'{}') !~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+(/[^[:space:]]*)?$') then
    raise exception 'Informe fotos com endereços HTTPS válidos.';
  end if;
  v_id:=public.marketplace_price_product_register(p_empresa_id,p_actor_id,p_source_key,p_data);
  select * into v_product from public.marketplace_products where id=v_id and empresa_id=p_empresa_id and archived_at is null for update;
  -- Apenas complementa cadastro sem galeria; nunca remove fotos ou troca capa manual.
  if jsonb_array_length(v_product.pictures)<=1 and nullif(p_data->>'ean','') is not null
    and ltrim(v_product.ean,'0')=ltrim(p_data->>'ean','0')
    and (v_product.pictures='[]'::jsonb or v_product.pictures->>0=p_data->>'image') then
    select coalesce(jsonb_agg(value order by pos),'[]'::jsonb) into v_pictures from (
      select value,min(pos) pos from jsonb_array_elements(v_product.pictures||(p_data->'pictures')) with ordinality a(value,pos)
      group by value order by min(pos) limit 12
    ) gallery;
    if v_pictures<>v_product.pictures then
      update public.marketplace_products set pictures=v_pictures,revision=revision+1,updated_at=now()
        where id=v_id and empresa_id=p_empresa_id;
    end if;
  end if;
  return v_id;
end $$;
revoke all on function public.marketplace_price_product_register_gallery(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_price_product_register_gallery(uuid,uuid,text,jsonb) to service_role;
