begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
alter table public.marketplace_catalog_completion add column photo_policy text not null default 'preserve' check(photo_policy in ('preserve','catalog','custom'));
create or replace function public.marketplace_catalog_confirm_full(p_company uuid,p_actor uuid,p_product uuid,p_revision bigint,p_source jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_product public.marketplace_products;
begin
 if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem permissão.';end if;
 perform pg_advisory_xact_lock(hashtextextended('marketplace-catalog-completion',0));
 perform 1 from marketplace_catalog_completion where empresa_id=p_company and product_id=p_product and state in ('processing','sending','review_required');
 if found then raise exception 'Atualização em andamento ou com envio incerto.';end if;
 v_product := (select p from marketplace_products p where empresa_id=p_company and id=p_product and archived_at is null for update);
 if v_product.id is null or v_product.revision<>p_revision or p_source->>'ean' is distinct from v_product.ean or jsonb_typeof(p_source) is distinct from 'object' then raise exception 'Cadastro ou identidade mudou.';end if;
 insert into marketplace_catalog_completion(empresa_id,product_id,actor_id,progress,photo_policy) values(p_company,p_product,p_actor,jsonb_build_object('full',true,'source',p_source,'expectedRevision',p_revision,'name',v_product.name),case when p_source->>'photoMode' in ('catalog','custom') then p_source->>'photoMode' else 'preserve' end)
 on conflict(empresa_id,product_id) do update set actor_id=p_actor,state='pending',progress=excluded.progress,photo_policy=case when p_source->>'photoMode' in ('catalog','custom') then excluded.photo_policy else marketplace_catalog_completion.photo_policy end,issue=null,lease_owner=null,lease_until=null,next_check_at=now(),updated_at=now();
end $$;
create or replace function public.marketplace_catalog_apply_full_local(p_company uuid,p_actor uuid,p_product uuid,p_revision bigint,p_owner uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_job public.marketplace_catalog_completion;v_product public.marketplace_products;v_source jsonb;v_photos jsonb:='[]';v_attrs jsonb;v_form jsonb;v_entry jsonb;v_id text;v_index integer;v_description text;v_name text;v_changed boolean;
begin
 if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem permissão.';end if;
 v_job := (select j from marketplace_catalog_completion j where empresa_id=p_company and product_id=p_product and actor_id=p_actor and lease_owner=p_owner and state='processing' and lease_until>now() for update);
 if v_job.product_id is null or v_job.progress->>'full' is distinct from 'true' or v_job.progress->>'expectedRevision' is distinct from p_revision::text then raise exception 'Confirmação inválida ou substituída.';end if;
 v_product := (select p from marketplace_products p where empresa_id=p_company and id=p_product and archived_at is null for update);
 v_source:=v_job.progress->'source';
 if v_product.id is null or v_product.revision<>p_revision or v_source->>'ean' is distinct from v_product.ean then raise exception 'O cadastro mudou após a confirmação.';end if;
 if coalesce(v_source->>'id','') !~ '^MLB[0-9]+$' or jsonb_typeof(v_source->'pictures') is distinct from 'array' or jsonb_array_length(v_source->'pictures')>12 or jsonb_typeof(v_source->'attributes') is distinct from 'array' or jsonb_array_length(v_source->'attributes')>100 or jsonb_typeof(v_source->'name') is distinct from 'string' or length(btrim(v_source->>'name')) not between 1 and 220 or jsonb_typeof(v_source->'description') is distinct from 'string' or length(v_source->>'description')>50000 then raise exception 'Ficha inválida.';end if;
 v_name:=v_source->>'name';v_description:=coalesce(nullif(btrim(v_source->>'description'),''),v_product.description);v_attrs:=v_product.attributes;v_form:=v_product.publication_form;
 for v_entry in select * from jsonb_array_elements(v_source->'pictures') loop
  if coalesce(v_entry->>'url','') !~ '^https://([a-zA-Z0-9-]+\.)*mlstatic\.com/[^[:space:]]+$' or length(v_entry->>'url')>2048 then raise exception 'Foto inválida.';end if;
  if not v_photos @> jsonb_build_array(v_entry->>'url') then v_photos:=v_photos||jsonb_build_array(v_entry->>'url');end if;
 end loop;
 if v_source->>'photoMode' in ('catalog','custom') and jsonb_array_length(v_source->'pictures')=0 then raise exception 'Selecione ao menos uma foto.';end if;
 if coalesce(v_source->>'photoMode','') not in ('catalog','custom') then
 for v_entry in select * from jsonb_array_elements(v_product.pictures) loop
  if jsonb_array_length(v_photos)<12 and not v_photos @> jsonb_build_array(v_entry) and not exists(select 1 from jsonb_array_elements(v_source->'pictures') x where length(coalesce(x->>'id',''))>0 and position(x->>'id' in v_entry#>>'{}')>0) then v_photos:=v_photos||jsonb_build_array(v_entry);end if;
 end loop;
 end if;
 for v_entry in select * from jsonb_array_elements(v_source->'attributes') loop
  v_id:=v_entry->>'id';
  if coalesce(v_id,'') !~ '^[A-Z0-9_]{1,80}$' or length(coalesce(v_entry->>'value','')) not between 1 and 1000 or length(coalesce(v_entry->>'name',''))>120 then raise exception 'Característica inválida.';end if;
  if v_id ~ '^(GTIN|EAN|SELLER_|PACKAGE_|WARRANTY|SALE_|PRICE|STOCK|AVAILABLE_QUANTITY|SHIPPING|DELIVERY|LISTING_TYPE|ITEM_CONDITION|CONDITION)' then continue;end if;
  v_index := (select (ord-1)::integer from jsonb_array_elements(v_attrs) with ordinality x(a,ord) where a->>'id'=v_id limit 1);
  if v_index is null then
   if jsonb_array_length(v_attrs)>=100 then continue;end if;
   v_attrs:=v_attrs||jsonb_build_array(v_entry);
  else v_attrs:=jsonb_set(v_attrs,array[v_index::text],v_entry);end if;
  v_form:=jsonb_set(v_form,'{attributes}',coalesce(v_form->'attributes','{}')||jsonb_build_object(v_id,coalesce(nullif(v_entry->>'valueId',''),v_entry->>'value')));
 end loop;
 v_form:=v_form||jsonb_build_object('description',v_description,'pictureUrl',coalesce(v_photos->>0,''),'additionalPictures',coalesce((select jsonb_agg(v) from jsonb_array_elements(v_photos) with ordinality x(v,n) where n>1),'[]'::jsonb));
 v_changed:=v_name is distinct from v_product.name or v_description is distinct from v_product.description or v_photos is distinct from v_product.pictures or v_attrs is distinct from v_product.attributes or v_form is distinct from v_product.publication_form;
 if v_changed then
  update marketplace_products set name=v_name,description=v_description,pictures=v_photos,attributes=v_attrs,publication_form=v_form,revision=revision+1,updated_at=now() where empresa_id=p_company and id=p_product;
  insert into marketplace_product_operations(empresa_id,request_key,actor_id,action,request_hash,result) values(p_company,p_owner,p_actor,'catalog_full',md5(v_source::text),jsonb_build_object('product_id',p_product,'confirmed',true,'before',to_jsonb(v_product)));
 end if;
 return v_changed;
end $$;
create function public.marketplace_catalog_completion_claim(p_owner uuid,p_company uuid,p_full_capable boolean,p_photo_selection_capable boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_job public.marketplace_catalog_completion;
begin
 if p_owner is null then raise exception 'Tentativa inválida.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('marketplace-catalog-completion',0));
 -- Só retomar automaticamente leituras. Um envio interrompido exige conferência.
 update marketplace_catalog_completion set state=case when state='sending' then 'review_required' else 'pending' end,
 issue=case when state='sending' then 'Envio interrompido: confira os anúncios antes de reenviar.' else issue end,lease_owner=null,lease_until=null
 where state in ('processing','sending') and lease_until<now();
 v_job := (select j from marketplace_catalog_completion j join marketplace_products p on p.empresa_id=j.empresa_id and p.id=j.product_id
 where (p_company is null or j.empresa_id=p_company) and p.archived_at is null and j.state in ('pending','completed','skipped','failed') and j.next_check_at<=now()
 and not exists(select 1 from marketplace_catalog_completion running where running.empresa_id=j.empresa_id and running.state in ('processing','sending') and running.lease_until>now())
 and exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=j.empresa_id and u.user_id=j.actor_id and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now()))
 and (p_full_capable or coalesce(j.progress->>'full','false')<>'true')
 and (p_photo_selection_capable or coalesce(j.progress->'source'->>'photoMode','')='' and j.photo_policy<>'custom')
 order by j.next_check_at,j.product_id limit 1 for update of j skip locked);
 if v_job.product_id is null then return null; end if;
 update marketplace_catalog_completion set state='processing',lease_owner=p_owner,lease_until=now()+interval '3 minutes',updated_at=now(),progress=case when state='pending' then progress else '{}'::jsonb end where empresa_id=v_job.empresa_id and product_id=v_job.product_id;
 v_job := (select j from marketplace_catalog_completion j where j.empresa_id=v_job.empresa_id and j.product_id=v_job.product_id);
 return to_jsonb(v_job);
end $$;
create or replace function public.marketplace_catalog_completion_claim(p_owner uuid,p_company uuid,p_full_capable boolean) returns jsonb language sql security definer set search_path=public as $$ select public.marketplace_catalog_completion_claim(p_owner,p_company,p_full_capable,false) $$;
revoke all on function public.marketplace_catalog_completion_claim(uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.marketplace_catalog_completion_claim(uuid,uuid,boolean,boolean) to service_role;
commit;
