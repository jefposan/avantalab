begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create table public.marketplace_catalog_completion (
 empresa_id uuid not null references public.empresas(id) on delete cascade, product_id uuid not null,
 actor_id uuid not null, state text not null default 'pending' check(state in ('pending','processing','sending','completed','skipped','failed','review_required')),
 progress jsonb not null default '{}', issue text, lease_owner uuid, lease_until timestamptz,
 next_check_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(empresa_id,product_id),foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id) on delete cascade
);
alter table public.marketplace_catalog_completion enable row level security;
revoke all on public.marketplace_catalog_completion from public,anon,authenticated;
grant select,insert,update on public.marketplace_catalog_completion to service_role;
create index marketplace_catalog_completion_due on public.marketplace_catalog_completion(next_check_at) where state<>'review_required';

create function public.marketplace_catalog_completion_seed(p_company uuid,p_actor uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem permissão para complementar o catálogo.'; end if;
 insert into marketplace_catalog_completion(empresa_id,product_id,actor_id)
 select p_company,p.id,p_actor from marketplace_products p where p.empresa_id=p_company and p.archived_at is null and p.ean is not null
 on conflict(empresa_id,product_id) do update set actor_id=excluded.actor_id where marketplace_catalog_completion.state not in ('processing','sending');
end $$;

create function public.marketplace_catalog_completion_claim(p_owner uuid,p_company uuid default null)
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
 order by j.next_check_at,j.product_id limit 1 for update of j skip locked);
 if v_job.product_id is null then return null; end if;
 update marketplace_catalog_completion set state='processing',lease_owner=p_owner,lease_until=now()+interval '3 minutes',updated_at=now(),progress=case when state='pending' then progress else '{}'::jsonb end where empresa_id=v_job.empresa_id and product_id=v_job.product_id;
 v_job := (select j from marketplace_catalog_completion j where j.empresa_id=v_job.empresa_id and j.product_id=v_job.product_id);
 return to_jsonb(v_job);
end $$;

create function public.marketplace_catalog_complete_local(p_company uuid,p_actor uuid,p_product uuid,p_revision bigint,p_owner uuid,p_data jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_product public.marketplace_products; v_pictures jsonb; v_attributes jsonb; v_form jsonb; v_description text; v_entry jsonb; v_old jsonb; v_index integer; v_changed boolean:=false;
begin
 if jsonb_typeof(p_data) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('description','pictures','attributes')) or jsonb_typeof(p_data->'pictures') is distinct from 'array' or jsonb_array_length(p_data->'pictures')>12 or jsonb_typeof(p_data->'attributes') is distinct from 'array' or jsonb_array_length(p_data->'attributes')>100 or jsonb_typeof(p_data->'description') is distinct from 'string' or length(p_data->>'description')>50000 then raise exception 'Complemento inválido.'; end if;
 if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem permissão para complementar.'; end if;
 perform 1 from marketplace_catalog_completion where empresa_id=p_company and product_id=p_product and actor_id=p_actor and lease_owner=p_owner and state='processing' and lease_until>now() for update;
 if not found then raise exception 'A tentativa foi substituída.'; end if;
 v_product := (select p from marketplace_products p where empresa_id=p_company and id=p_product and archived_at is null for update);
 if v_product.id is null or v_product.revision<>p_revision then raise exception 'O cadastro mudou. Os dados preenchidos foram preservados.'; end if;
 v_pictures:=v_product.pictures;v_attributes:=v_product.attributes;v_form:=v_product.publication_form;v_description:=v_product.description;
 if btrim(v_description)='' and btrim(coalesce(v_form->>'description',''))<>'' then v_description:=v_form->>'description';v_changed:=true;
 elsif btrim(v_description)='' and btrim(p_data->>'description')<>'' then v_description:=p_data->>'description';v_changed:=true;end if;
 for v_entry in select * from jsonb_array_elements(p_data->'pictures') loop
  if jsonb_typeof(v_entry)<>'string' or length(v_entry#>>'{}')>2048 or (v_entry#>>'{}') !~ '^https://([a-zA-Z0-9-]+\.)*mlstatic\.com/[^[:space:]]+$' then raise exception 'Foto de catálogo inválida.';end if;
  if jsonb_array_length(v_pictures)<12 and not v_pictures @> jsonb_build_array(v_entry) then v_pictures:=v_pictures||jsonb_build_array(v_entry);v_changed:=true;end if;
 end loop;
 for v_entry in select * from jsonb_array_elements(p_data->'attributes') loop
  if coalesce(v_entry->>'id','') !~ '^[A-Z0-9_]{1,80}$' or length(coalesce(v_entry->>'value','')) not between 1 and 1000 or length(coalesce(v_entry->>'name',''))>120 then raise exception 'Característica inválida.';end if;
  v_index := (select (ord-1)::integer from jsonb_array_elements(v_attributes) with ordinality x(a,ord) where a->>'id'=v_entry->>'id' limit 1);
  v_old := v_attributes->v_index;
  if btrim(coalesce(v_form->'attributes'->>(v_entry->>'id'),''))<>'' then continue;end if;
  if v_index is null then
   if jsonb_array_length(v_attributes)>=100 then continue;end if;
   v_attributes:=v_attributes||jsonb_build_array(v_entry);v_changed:=true;
  elsif btrim(coalesce(v_old->>'value',''))='' and btrim(coalesce(v_old->>'valueId',''))='' then v_attributes:=jsonb_set(v_attributes,array[v_index::text],v_old||v_entry||jsonb_build_object('name',coalesce(nullif(v_old->>'name',''),v_entry->>'name')));v_changed:=true;
  else continue;end if;
  v_form:=jsonb_set(v_form,'{attributes}',coalesce(v_form->'attributes','{}')||jsonb_build_object(v_entry->>'id',coalesce(nullif(v_entry->>'valueId',''),v_entry->>'value')));
 end loop;
 if btrim(coalesce(v_form->>'description',''))='' and v_description<>'' then v_form:=v_form||jsonb_build_object('description',v_description);end if;
 if v_changed then
  update marketplace_products set description=v_description,pictures=v_pictures,attributes=v_attributes,publication_form=v_form,revision=revision+1,updated_at=now() where empresa_id=p_company and id=p_product;
  insert into marketplace_product_operations(empresa_id,request_key,actor_id,action,request_hash,result) values(p_company,p_owner,p_actor,'catalog_complete',md5(p_data::text),jsonb_build_object('product_id',p_product,'catalog_completed',true,'before',to_jsonb(v_product)));
 end if;
 return v_changed;
end $$;
revoke all on function public.marketplace_catalog_completion_seed(uuid,uuid),public.marketplace_catalog_completion_claim(uuid,uuid),public.marketplace_catalog_complete_local(uuid,uuid,uuid,bigint,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_catalog_completion_seed(uuid,uuid),public.marketplace_catalog_completion_claim(uuid,uuid),public.marketplace_catalog_complete_local(uuid,uuid,uuid,bigint,uuid,jsonb) to service_role;

-- Novos cadastros entram na fila somente em empresas que já ativaram o fluxo.
create function public.marketplace_catalog_completion_new_product()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_actor uuid;
begin
 if new.ean is null or new.archived_at is not null then return new;end if;
 if tg_op='UPDATE' and new.ean is not distinct from old.ean then return new;end if;
 v_actor := (select j.actor_id from marketplace_catalog_completion j
 where j.empresa_id=new.empresa_id and exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=j.empresa_id and u.user_id=j.actor_id and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) order by j.updated_at desc limit 1);
 if v_actor is not null then
  insert into marketplace_catalog_completion(empresa_id,product_id,actor_id) values(new.empresa_id,new.id,v_actor)
  on conflict(empresa_id,product_id) do update set state='pending',progress='{}',issue=null,next_check_at=now() where marketplace_catalog_completion.state not in ('processing','sending','review_required');
 end if;
 return new;
end $$;
revoke all on function public.marketplace_catalog_completion_new_product() from public,anon,authenticated;
grant execute on function public.marketplace_catalog_completion_new_product() to service_role;
create trigger marketplace_catalog_completion_on_product after insert or update of ean on public.marketplace_products for each row execute function public.marketplace_catalog_completion_new_product();
commit;
