-- Salva a ficha da preparação atomicamente; não recebe preço, saldo ou identidade.
create or replace function public.marketplace_product_content_save(p_empresa_id uuid,p_actor_id uuid,p_product_id uuid,p_revision bigint,p_data jsonb,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_product public.marketplace_products; v_result jsonb; v_values jsonb;
begin
 if jsonb_typeof(p_data) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_data) key where key not in ('description','pictures','attributes','category_id')) or (coalesce(p_data->>'category_id','')<>'' and p_data->>'category_id' !~ '^MLB[0-9]+$')
 or jsonb_typeof(p_data->'pictures') is distinct from 'array' or jsonb_array_length(p_data->'pictures')>12
 or jsonb_typeof(p_data->'attributes') is distinct from 'array' or jsonb_array_length(p_data->'attributes')>100
 or jsonb_typeof(p_data->'description') is distinct from 'string' or length(p_data->>'description')>50000 then raise exception 'Ficha inválida.'; end if;
 if exists(select 1 from jsonb_array_elements(p_data->'pictures') p where jsonb_typeof(p)<>'string' or length(p#>>'{}')>2048 or (p#>>'{}') !~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+(/[^[:space:]]*)?$') then raise exception 'Fotos inválidas.'; end if;
 if exists(select 1 from jsonb_array_elements(p_data->'attributes') a where coalesce(a->>'id','') !~ '^[A-Z0-9_]{1,80}$' or length(coalesce(a->>'value',''))>1000 or length(coalesce(a->>'name',''))>120) then raise exception 'Características inválidas.'; end if;
 select * into v_product from public.marketplace_products where id=p_product_id and empresa_id=p_empresa_id and archived_at is null for update;
 if not found or v_product.revision<>p_revision then raise exception 'O cadastro mudou. Recarregue a preparação.'; end if;
 if exists(select 1 from jsonb_array_elements(v_product.pictures) p where not (p_data->'pictures') @> jsonb_build_array(p)) or (v_product.pictures<>'[]'::jsonb and v_product.pictures->>0 is distinct from p_data->'pictures'->>0) then raise exception 'Preserve a capa e as fotos atuais do produto.'; end if;
 v_result:=public.marketplace_product_command(p_empresa_id,p_actor_id,'update',jsonb_build_object('product_id',p_product_id,'revision',p_revision,'name',v_product.name,'ean',v_product.ean,'sku',v_product.sku,'category_id',coalesce(p_data->>'category_id',v_product.category_id),'catalog_product_id',v_product.catalog_product_id,'price_cents',v_product.price_cents,'description',p_data->'description','pictures',p_data->'pictures'),p_request_key);
 select coalesce(jsonb_object_agg(a->>'id',coalesce(nullif(a->>'valueId',''),a->>'value')),'{}') into v_values from jsonb_array_elements(p_data->'attributes') a;
 update public.marketplace_products set attributes=p_data->'attributes',publication_form=publication_form||jsonb_build_object('attributes',v_values) where id=p_product_id and empresa_id=p_empresa_id;
 return v_result;
end $$;
revoke all on function public.marketplace_product_content_save(uuid,uuid,uuid,bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_product_content_save(uuid,uuid,uuid,bigint,jsonb,uuid) to service_role;
