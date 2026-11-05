-- Importação por perfil, sem importar unidades nem confirmar estoque físico.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
alter table public.marketplace_products add column listing_stock_review_at timestamptz;
alter table public.marketplace_listing_actions add column if not exists request_payload jsonb not null default '{}'::jsonb;
create table public.marketplace_listing_import_issues (
 empresa_id uuid not null references public.empresas(id), connection_id uuid not null references public.marketplace_connections(id),
 provider_listing_id text not null, provider text not null, title text not null, issue text not null, candidate_product_ids uuid[] not null default '{}',
 updated_at timestamptz not null default now(), primary key(empresa_id,connection_id,provider_listing_id)
);
alter table public.marketplace_listing_import_issues enable row level security;
revoke all on public.marketplace_listing_import_issues from public,anon,authenticated;
grant select,insert,update,delete on public.marketplace_listing_import_issues to service_role;

create function public.marketplace_valid_import_ean(value text) returns text
language plpgsql immutable set search_path=public as $$
declare i integer; total integer:=0; n integer:=length(value);
begin
 if value is null or value !~ '^[0-9]+$' or n not in (8,12,13,14) or value ~ '^0+$' then return null; end if;
 for i in 1..n-1 loop total:=total+substr(value,i,1)::integer*case when (n-i)%2=1 then 3 else 1 end;end loop;
 if (10-total%10)%10<>right(value,1)::integer then return null;end if;
 return value;
end $$;

-- Somente service_role/trigger. Identidade e conta são sempre relidas da base.
create function public.marketplace_listing_catalog_import(p_empresa uuid,p_connection uuid,p_listing text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare l marketplace_listings; p marketplace_products; linked marketplace_product_links;
 actor uuid; target uuid; matches integer; ean_value text; sku_value text; problem text; canonical text;
 pictures jsonb; created boolean:=false; current_quantity integer; local_voltage text; remote_voltage text; candidates uuid[]; local_preferred boolean:=false;
begin
 select * into l from marketplace_listings where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing;
 if not found then raise exception 'Anúncio não encontrado neste perfil.';end if;
 select connected_by into actor from marketplace_connections where id=p_connection and empresa_id=p_empresa and provider=l.provider;
 if not found then raise exception 'Conta não pertence ao perfil.';end if;
 -- Mesma trava da consulta de preços: dois anúncios/contas não criam o mesmo EAN simultaneamente.
 perform pg_advisory_xact_lock(hashtextextended('price-products:'||p_empresa::text,0));
 if l.snapshot->>'stock' ~ '^[0-9]{1,5}$' then current_quantity:=(l.snapshot->>'stock')::integer;end if;
 select * into linked from marketplace_product_links where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing;
 if found then
  -- Inclui importações antigas ainda sem nenhuma conferência física, mesmo
  -- que o anúncio esteja pausado. Reconsulta não reabre saldo já confirmado.
  update marketplace_products set listing_stock_review_at=clock_timestamp(),revision=revision+1,updated_at=now()
   where empresa_id=p_empresa and id=linked.product_id and stock_quantity is null and stock_confirmed_at is null and listing_stock_review_at is null;
  update marketplace_product_links set status=l.status,reported_stock=current_quantity,title=left(l.title,220),updated_at=now()
   where id=linked.id and empresa_id=p_empresa and (status is distinct from l.status or reported_stock is distinct from current_quantity or title is distinct from left(l.title,220));
  if found then perform marketplace_enqueue_stock(p_empresa,linked.product_id,false);end if;
  delete from marketplace_listing_import_issues where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing;
  return jsonb_build_object('product_id',linked.product_id,'created',false);
 end if;
 select response_summary->>'local_product_id' into canonical from marketplace_publications
  where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing limit 1;
 if canonical ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
  select id into target from marketplace_products where empresa_id=p_empresa and id=canonical::uuid and archived_at is null;
 end if;
 if canonical is not null and target is null then problem:='import_identity_conflict';end if;
 ean_value:=marketplace_valid_import_ean(l.snapshot->>'ean');sku_value:=nullif(left(trim(l.snapshot->>'sku'),80),'');
 if target is null and problem is null and jsonb_array_length(case when jsonb_typeof(l.snapshot->'variations')='array' then l.snapshot->'variations' else '[]'::jsonb end)>0 then problem:='import_variations_review';
 elsif target is null and problem is null then
  if ean_value is not null then
   select count(*),min(id::text)::uuid into matches,target from marketplace_products
    where empresa_id=p_empresa and archived_at is null and ltrim(ean,'0')=ltrim(ean_value,'0');
   if matches>1 then problem:='import_identity_ambiguous';target:=null;end if;
  end if;
  if target is null and problem is null and sku_value is not null then
   select id into target from marketplace_products where empresa_id=p_empresa and archived_at is null and sku=sku_value;
   if target is not null and ean_value is not null and exists(select 1 from marketplace_products where id=target and ean is not null and ltrim(ean,'0')<>ltrim(ean_value,'0')) then problem:='import_identity_conflict';end if;
   -- SKU pode ser reutilizado em outra conta para um item diferente. Sem EAN
   -- coincidente, exigir também título exato; nunca aproximar por nome.
   if target is not null and exists(select 1 from marketplace_products where id=target and (ean is null or ean_value is null) and lower(trim(name))<>lower(trim(l.title))) then problem:='import_identity_conflict';end if;
  end if;
  if target is not null then
   select * into p from marketplace_products where empresa_id=p_empresa and id=target;
   select regexp_replace(lower(value->>'value'),'[^a-z0-9]','','g') into local_voltage from jsonb_array_elements(p.attributes) value
    where lower(coalesce(value->>'id',value->>'name','')) in ('voltage','voltagem') limit 1;
   select regexp_replace(lower(value->>'value'),'[^a-z0-9]','','g') into remote_voltage from jsonb_array_elements(case when jsonb_typeof(l.snapshot->'attributes')='array' then l.snapshot->'attributes' else '[]'::jsonb end) value
    where lower(coalesce(value->>'id',value->>'name','')) in ('voltage','voltagem') limit 1;
   if nullif(local_voltage,'') is not null and nullif(remote_voltage,'') is not null and local_voltage<>remote_voltage then problem:='import_identity_conflict';end if;
   if nullif(p.publication_form->>'condition','') is not null and nullif(l.snapshot->>'condition','') is not null
      and p.publication_form->>'condition'<>l.snapshot->>'condition' then problem:='import_identity_conflict';end if;
  elsif problem is null and ean_value is null and exists(select 1 from marketplace_products where empresa_id=p_empresa and archived_at is null and lower(trim(name))=lower(trim(l.title))) then
   problem:='import_identity_ambiguous';
   select array_agg(id order by id) into candidates from marketplace_products where empresa_id=p_empresa and archived_at is null and lower(trim(name))=lower(trim(l.title));
   if cardinality(candidates)=1 then target:=candidates[1];end if;
  end if;
 end if;
 -- Cadastro local único prevalece: divergência externa não sobrescreve seus
 -- campos nem cria outro produto. Apenas a conferência física fica pendente.
 if target is not null and problem in ('import_identity_ambiguous','import_identity_conflict') then local_preferred:=true;problem:=null;end if;
 if problem is not null then
  if problem in ('import_identity_ambiguous','import_identity_conflict') then
   if candidates is null then select array_agg(id order by id) into candidates from marketplace_products where empresa_id=p_empresa and archived_at is null and ((ean_value is not null and ltrim(ean,'0')=ltrim(ean_value,'0')) or (sku_value is not null and sku=sku_value));end if;
   if coalesce(cardinality(candidates),0)>0 then problem:='import_stock_review';end if;
  end if;
  insert into marketplace_listing_import_issues(empresa_id,connection_id,provider_listing_id,provider,title,issue,candidate_product_ids)
   values(p_empresa,p_connection,p_listing,l.provider,left(l.title,220),problem,coalesce(candidates,'{}'))
   on conflict(empresa_id,connection_id,provider_listing_id) do update set issue=excluded.issue,title=excluded.title,candidate_product_ids=excluded.candidate_product_ids,updated_at=now();
  return jsonb_build_object('issue',problem,'created',false);
 end if;
 if target is null then
  select coalesce(jsonb_agg(url),'[]'::jsonb) into pictures from
   (select url from jsonb_array_elements_text(case when jsonb_typeof(l.snapshot->'pictures')='array' then l.snapshot->'pictures' else '[]'::jsonb end) url where url ~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+(/[^[:space:]]*)?$' and length(url)<=2048 limit 12) images;
  insert into marketplace_products(empresa_id,created_by,name,sku,ean,description,pictures,category_id,attributes,publication_form,price_cents)
   values(p_empresa,actor,left(l.title,220),coalesce(sku_value,'MP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),ean_value,left(coalesce(l.snapshot->>'description',''),50000),pictures,
    left(coalesce(l.snapshot->>'category',''),30),case when jsonb_typeof(l.snapshot->'attributes')='array' then l.snapshot->'attributes' else '[]'::jsonb end,
    jsonb_build_object('condition',l.snapshot->>'condition','categoryId',l.snapshot->>'category'),
    case when l.snapshot->>'price' ~ '^[0-9]+(\.[0-9]+)?$' and (l.snapshot->>'price')::numeric>0 and (l.snapshot->>'price')::numeric<100000000 then round((l.snapshot->>'price')::numeric*100)::bigint end)
   returning id into target;
  created:=true;
 end if;
 -- Não modifica cadastro preenchido, autoria anterior, saldo, confirmação ou outros depósitos.
 if canonical is null then
  update marketplace_products set listing_stock_review_at=clock_timestamp(),revision=revision+1,updated_at=now() where empresa_id=p_empresa and id=target;
  update marketplace_inventory_outbox set state='excluded',issue='import_stock_review' where empresa_id=p_empresa and product_id=target and state='pending';
 end if;
 insert into marketplace_product_links(empresa_id,product_id,connection_id,provider,provider_listing_id,title,reported_stock,status,source_snapshot)
  values(p_empresa,target,p_connection,l.provider,p_listing,left(l.title,220),current_quantity,l.status,jsonb_build_object('condition',l.snapshot->>'condition','local_registration_preserved',local_preferred));
 delete from marketplace_listing_import_issues where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing;
 return jsonb_build_object('product_id',target,'created',created);
end $$;
revoke all on function public.marketplace_listing_catalog_import(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.marketplace_listing_catalog_import(uuid,uuid,text) to service_role;
revoke all on function public.marketplace_valid_import_ean(text) from public,anon,authenticated;

create function public.marketplace_import_choose_local(p_empresa uuid,p_actor uuid,p_connection uuid,p_listing text,p_product uuid,p_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare pending marketplace_listing_import_issues;l marketplace_listings;existing uuid;result jsonb;command jsonb;
begin
 if p_key is null or not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=p_empresa and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem permissão para conferir o cadastro.';end if;
 perform pg_advisory_xact_lock(hashtextextended('price-products:'||p_empresa::text,0));
 select * into l from marketplace_listings where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing;
 if not found then raise exception 'Anúncio não encontrado neste perfil.';end if;
 command:=jsonb_build_object('product_id',p_product,'connection_id',p_connection,'provider',l.provider,'provider_listing_id',p_listing,'source_snapshot',jsonb_build_object('local_registration_preserved',true));
 select product_id into existing from marketplace_product_links where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing;
 if existing is not null then
  if existing<>p_product then raise exception 'O anúncio já está vinculado a outro cadastro.';end if;
  if exists(select 1 from marketplace_product_operations where empresa_id=p_empresa and request_key=p_key) then
   return marketplace_product_command(p_empresa,p_actor,'link',command,p_key);
  end if;
  return jsonb_build_object('product_id',existing,'created',false);
 end if;
 select * into pending from marketplace_listing_import_issues where empresa_id=p_empresa and connection_id=p_connection and provider_listing_id=p_listing for update;
 if not found or not p_product=any(pending.candidate_product_ids) then raise exception 'Escolha um dos cadastros locais desta conferência.';end if;
 update marketplace_products set listing_stock_review_at=clock_timestamp(),revision=revision+1,updated_at=now() where empresa_id=p_empresa and id=p_product and archived_at is null;
 if not found then raise exception 'Cadastro local não encontrado.';end if;
 update marketplace_inventory_outbox set state='excluded',issue='import_stock_review' where empresa_id=p_empresa and product_id=p_product and state='pending';
 result:=marketplace_product_command(p_empresa,p_actor,'link',command,p_key);
 perform marketplace_listing_catalog_import(p_empresa,p_connection,p_listing);
 return result;
end $$;
revoke all on function public.marketplace_import_choose_local(uuid,uuid,uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_import_choose_local(uuid,uuid,uuid,text,uuid,uuid) to service_role;

create function public.marketplace_listing_catalog_changed() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 perform marketplace_listing_catalog_import(new.empresa_id,new.connection_id,new.provider_listing_id);
 -- Não basta aceitar o PUT: o estado observado em nova leitura encerra a pendência.
 update marketplace_listing_actions set status='succeeded',error_code=null
  where empresa_id=new.empresa_id and connection_id=new.connection_id and provider_listing_id=new.provider_listing_id
   and status in ('requested','uncertain') and
    ((action='pause' and new.status='paused') or (action='resume' and new.status in ('active','published'))
      or (action='close' and new.status='closed') or (action='delete' and new.status='deleted'));
 return new;
end $$;
revoke all on function public.marketplace_listing_catalog_changed() from public,anon,authenticated;
create trigger marketplace_listing_catalog_changed after insert or update on public.marketplace_listings
 for each row execute function public.marketplace_listing_catalog_changed();

create function public.marketplace_clear_listing_stock_review() returns trigger
language plpgsql set search_path=public as $$
begin
 if new.stock_confirmed_at is distinct from old.stock_confirmed_at and new.stock_confirmed_at is not null then new.listing_stock_review_at:=null;end if;
 return new;
end $$;
revoke all on function public.marketplace_clear_listing_stock_review() from public,anon,authenticated;
create trigger marketplace_clear_listing_stock_review before update of stock_confirmed_at on public.marketplace_products
 for each row execute function public.marketplace_clear_listing_stock_review();

-- A fila também respeita a pendência no banco; confirmar físico reenfileira normalmente.
create function public.marketplace_hold_import_stock_outbox() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from marketplace_products where empresa_id=new.empresa_id and id=new.product_id and listing_stock_review_at is not null) then
  new.state:='excluded';new.issue:='import_stock_review';
 end if;
 return new;
end $$;
revoke all on function public.marketplace_hold_import_stock_outbox() from public,anon,authenticated;
create trigger marketplace_hold_import_stock_outbox before insert or update on public.marketplace_inventory_outbox
 for each row execute function public.marketplace_hold_import_stock_outbox();

-- Releitura idempotente dos anúncios existentes; não unifica/apaga cadastros nem assume saldos.
do $$ declare l record;begin
 for l in select empresa_id,connection_id,provider_listing_id from marketplace_listings order by empresa_id,connection_id,provider_listing_id loop
  perform marketplace_listing_catalog_import(l.empresa_id,l.connection_id,l.provider_listing_id);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
