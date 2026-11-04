-- Editor manual: atualiza conteúdo e características na mesma transação,
-- sem aceitar estoque, anúncio ou identidade de outra ficha.
create or replace function public.marketplace_product_editor_save(p_empresa_id uuid,p_actor_id uuid,p_product_id uuid,p_revision bigint,p_data jsonb,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_product public.marketplace_products; v_result jsonb; v_values jsonb; v_replayed boolean;
begin
 if jsonb_typeof(p_data) is distinct from 'object'
   or exists(select 1 from jsonb_object_keys(p_data) key where key not in ('name','sku','ean','description','pictures','category_id','price_cents','attributes'))
   or coalesce(length(p_data->>'name'),0) not between 1 and 220
   or length(coalesce(p_data->>'sku',''))>80
   or length(coalesce(p_data->>'ean',''))>14
   or length(coalesce(p_data->>'description',''))>50000
   or coalesce(p_data->>'category_id','')<>'' and p_data->>'category_id' !~ '^MLB[0-9]+$'
   or jsonb_typeof(p_data->'pictures') is distinct from 'array' or jsonb_array_length(p_data->'pictures')>12
   or jsonb_typeof(p_data->'attributes') is distinct from 'array' or jsonb_array_length(p_data->'attributes')>100
 then raise exception 'Cadastro inválido.'; end if;
 if exists(select 1 from jsonb_array_elements(p_data->'pictures') p where jsonb_typeof(p)<>'string' or length(p#>>'{}')>2048 or (p#>>'{}') !~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+(/[^[:space:]]*)?$') then raise exception 'Fotos inválidas.'; end if;
 if exists(select 1 from jsonb_array_elements(p_data->'attributes') a where coalesce(a->>'id','') !~ '^[A-Z0-9_]{1,80}$' or length(coalesce(a->>'value','')) not between 1 and 1000 or length(coalesce(a->>'name','')) not between 1 and 120) then raise exception 'Características inválidas.'; end if;
 if exists(select 1 from jsonb_array_elements(p_data->'attributes') a where a->>'id' in ('GTIN','EAN','GTIN14','PRODUCT_GTIN') and regexp_replace(coalesce(a->>'value',''),'\D','','g') is distinct from coalesce(p_data->>'ean','')) then raise exception 'O EAN das características deve ser o mesmo EAN do cadastro.'; end if;
 select exists(select 1 from public.marketplace_product_operations where empresa_id=p_empresa_id and request_key=p_request_key) into v_replayed;
 v_result:=public.marketplace_product_command(p_empresa_id,p_actor_id,'update',jsonb_build_object('product_id',p_product_id,'revision',p_revision,'name',p_data->>'name','sku',coalesce(p_data->>'sku',''),'ean',coalesce(p_data->>'ean',''),'description',p_data->>'description','pictures',p_data->'pictures','category_id',coalesce(p_data->>'category_id',''),'price_cents',p_data->'price_cents','attributes',p_data->'attributes'),p_request_key);
 if v_replayed then return v_result; end if;
 select * into v_product from public.marketplace_products where id=p_product_id and empresa_id=p_empresa_id and archived_at is null for update;
 if not found then raise exception 'Produto não encontrado nesta empresa.'; end if;
 select coalesce(jsonb_object_agg(a->>'id',a->>'value'),'{}') into v_values from jsonb_array_elements(p_data->'attributes') a;
 update public.marketplace_products set attributes=p_data->'attributes',publication_form=publication_form||jsonb_build_object('attributes',v_values) where id=p_product_id and empresa_id=p_empresa_id;
 return v_result;
end $$;
revoke all on function public.marketplace_product_editor_save(uuid,uuid,uuid,bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_product_editor_save(uuid,uuid,uuid,bigint,jsonb,uuid) to service_role;
notify pgrst, 'reload schema';
