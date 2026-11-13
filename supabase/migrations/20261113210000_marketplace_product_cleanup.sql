-- Limpeza de cadastros com exclusão da lista ativa e preservação integral dos históricos.
-- A migração apenas instala o recurso. Não limpa nenhum perfil automaticamente.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create table public.marketplace_product_cleanups (
 empresa_id uuid not null references public.empresas(id),request_key uuid not null,
 actor_id uuid not null references auth.users(id),product_ids uuid[] not null,
 review_token text not null,confirmation text not null,result jsonb not null,
 created_at timestamptz not null default clock_timestamp(),primary key(empresa_id,request_key)
);
alter table public.marketplace_product_cleanups enable row level security;
revoke all on public.marketplace_product_cleanups from public,anon,authenticated;
grant select on public.marketplace_product_cleanups to service_role;

create function public.marketplace_product_cleanup_item(p_company uuid,p_actor uuid,p_product uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r jsonb; candidates jsonb; current_candidates jsonb; accounts jsonb; blockers jsonb:='[]'; origin text; has_history boolean; has_current_links boolean;
begin
 if not public.marketplace_account_cleanup_allowed(p_company,p_actor) then raise exception 'Sem permissão para limpar cadastros neste perfil.';end if;
 r:=public.marketplace_product_removal_context(p_company,p_actor,p_product);
 candidates:=public.marketplace_product_removal_candidates(p_company,p_actor,p_product);
 select coalesce(jsonb_agg(v order by v->>'connection_id',v->>'provider_listing_id'),'[]') into current_candidates
  from jsonb_array_elements(candidates) v left join public.marketplace_connections c
   on c.empresa_id=p_company and c.id=(v->>'connection_id')::uuid
  where c.status is distinct from 'disconnected';
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'status',c.status,'updatedAt',c.updated_at,
  'syncLockUntil',c.sync_lock_until,'refreshLockUntil',c.refresh_lock_until) order by c.id),'[]') into accounts
  from public.marketplace_connections c where c.empresa_id=p_company and exists(
   select 1 from jsonb_array_elements(candidates) v where v->>'connection_id'=c.id::text);
 has_current_links:=jsonb_array_length(current_candidates)>0 or exists(
  select 1 from public.marketplace_product_links l left join public.marketplace_connections c on c.empresa_id=l.empresa_id and c.id=l.connection_id
   where l.empresa_id=p_company and l.product_id=p_product and c.status is distinct from 'disconnected');
 if has_current_links then
  blockers:=blockers||jsonb_build_array('Possui anúncios de conta ainda conectada ou com autorização pendente. Desconecte a conta ou resolva os anúncios na exclusão individual.');end if;
 if coalesce((r->'product'->>'stock_quantity')::integer,0)<>0 or exists(
  select 1 from public.marketplace_warehouse_balances where empresa_id=p_company and product_id=p_product and coalesce(quantity,0)<>0) then
  blockers:=blockers||jsonb_build_array('Possui saldo em estoque. Registre a saída ou transferência antes de limpar.');end if;
 if (exists(select 1 from public.marketplace_inventory_worker where lease_until>clock_timestamp())
   and exists(select 1 from public.marketplace_inventory_outbox where empresa_id=p_company and product_id=p_product and state='pending'))
  or exists(select 1 from public.marketplace_publications pub left join public.marketplace_connections c on c.empresa_id=pub.empresa_id and c.id=pub.connection_id
   where pub.empresa_id=p_company and pub.response_summary->>'local_product_id'=p_product::text
    and (pub.status='publishing' or (c.status is distinct from 'disconnected' and pub.provider_listing_id is not null
     and not exists(select 1 from public.marketplace_product_links l where l.empresa_id=p_company and l.product_id=p_product and l.connection_id=pub.connection_id and l.provider_listing_id=pub.provider_listing_id))))
  or exists(select 1 from public.marketplace_listing_actions a join public.marketplace_product_links l
   on l.empresa_id=a.empresa_id and l.connection_id=a.connection_id and l.provider_listing_id=a.provider_listing_id
   where l.empresa_id=p_company and l.product_id=p_product and a.status in ('requested','uncertain'))
  or exists(select 1 from jsonb_array_elements(accounts) a where (a->>'syncLockUntil')::timestamptz>clock_timestamp() or (a->>'refreshLockUntil')::timestamptz>clock_timestamp())
  or exists(select 1 from public.marketplace_inventory_events e
   left join public.marketplace_connections c on c.empresa_id=e.empresa_id and c.id=e.connection_id
   where e.empresa_id=p_company and e.product_id=p_product and e.state='pending' and c.status is distinct from 'disconnected')
  or exists(select 1 from public.marketplace_product_price_researches where empresa_id=p_company and product_id=p_product and status='pending')
  or exists(select 1 from public.marketplace_catalog_completion where empresa_id=p_company and product_id=p_product and state in ('processing','sending','review_required')) then
  blockers:=blockers||jsonb_build_array('Há venda, pesquisa, publicação ou sincronização em andamento. Aguarde a conclusão.');end if;
 origin:=case when exists(select 1 from public.marketplace_price_product_sources where empresa_id=p_company and product_id=p_product)
  or exists(select 1 from public.marketplace_price_consultations where empresa_id=p_company and local_product_id=p_product) then 'avantaprecos'
  when jsonb_array_length(candidates)>0 then 'anuncio' else 'local' end;
 has_history:=(r->>'history')::boolean or origin='avantaprecos'
  or exists(select 1 from public.marketplace_stock_movements where empresa_id=p_company and product_id=p_product)
  or exists(select 1 from public.marketplace_warehouse_movements where empresa_id=p_company and product_id=p_product)
  or exists(select 1 from public.marketplace_direct_sales where empresa_id=p_company and product_id=p_product)
  or exists(select 1 from public.marketplace_inventory_events where empresa_id=p_company and product_id=p_product);
 return jsonb_build_object('id',p_product,'name',r->'product'->>'name','sku',r->'product'->>'sku',
  'ean',r->'product'->'ean','revision',r->'product'->'revision','updatedAt',r->'product'->'updated_at',
  'stock',r->'product'->'stock_quantity','allocations',r->'allocations','origin',origin,
  'hasHistory',has_history,'linked',has_current_links,
  'disconnectedLinks',jsonb_array_length(candidates)-jsonb_array_length(current_candidates),'accounts',accounts,'blockers',blockers);
end $$;

create function public.marketplace_product_cleanup_list(p_company uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare rows jsonb;
begin
 if not public.marketplace_account_cleanup_allowed(p_company,p_actor) then raise exception 'Sem permissão para limpar cadastros neste perfil.';end if;
 if (select count(*) from public.marketplace_products where empresa_id=p_company and archived_at is null)>1000 then
  raise exception 'Este perfil possui mais de 1.000 cadastros. Solicite uma limpeza em lotes antes de continuar.';end if;
 select coalesce(jsonb_agg(public.marketplace_product_cleanup_item(p_company,p_actor,id) order by name,id),'[]') into rows
  from public.marketplace_products where empresa_id=p_company and archived_at is null;
 return jsonb_build_object('companyName',(select nome from public.empresas where id=p_company),'products',rows);
end $$;

create function public.marketplace_product_cleanup_review(p_company uuid,p_actor uuid,p_ids uuid[])
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare rows jsonb; plan jsonb;
begin
 if not public.marketplace_account_cleanup_allowed(p_company,p_actor) then raise exception 'Sem permissão para limpar cadastros neste perfil.';end if;
 if p_ids is null or cardinality(p_ids) not between 1 and 1000 or exists(select 1 from unnest(p_ids) x where x is null)
  or (select count(distinct x) from unnest(p_ids) x)<>cardinality(p_ids) then raise exception 'Selecione de 1 a 1.000 cadastros diferentes.';end if;
 if (select count(*) from public.marketplace_products where empresa_id=p_company and id=any(p_ids) and archived_at is null)<>cardinality(p_ids) then
  raise exception 'Um cadastro foi alterado, removido ou não pertence a este perfil. Atualize a seleção.';end if;
 select jsonb_agg(public.marketplace_product_cleanup_item(p_company,p_actor,id) order by id) into rows
  from public.marketplace_products where empresa_id=p_company and id=any(p_ids) and archived_at is null;
 plan:=jsonb_build_object('companyName',(select nome from public.empresas where id=p_company),'products',rows);
 return plan||jsonb_build_object('reviewToken',md5(plan::text));
end $$;

create function public.marketplace_product_cleanup_execute(p_company uuid,p_actor uuid,p_ids uuid[],p_review text,p_confirmation text,p_acknowledged boolean,p_key uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare saved public.marketplace_product_cleanups; plan jsonb; item jsonb; snapshot jsonb; outcome jsonb; ids uuid[]; candidates jsonb;
begin
 if not public.marketplace_account_cleanup_allowed(p_company,p_actor) then raise exception 'Sem permissão para limpar cadastros neste perfil.';end if;
 if p_key is null or p_acknowledged is distinct from true then raise exception 'Confirme que os cadastros selecionados serão apagados da lista ativa.';end if;
 select array_agg(v order by v) into ids from unnest(p_ids) v;
 perform pg_advisory_xact_lock(hashtextextended('product-cleanup:'||p_company||':'||p_key,0));
 select * into saved from public.marketplace_product_cleanups where empresa_id=p_company and request_key=p_key;
 if found then
  if saved.actor_id<>p_actor or saved.product_ids is distinct from ids or saved.review_token is distinct from p_review
   or saved.confirmation is distinct from p_confirmation then raise exception 'Esta tentativa já foi usada para outra seleção.';end if;
  return saved.result||jsonb_build_object('replayed',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('price-products:'||p_company::text,0));
 -- Mantém a desconexão estável até o fim: reconexão concorrente aguarda esta transação.
 perform 1 from public.marketplace_connections c where c.empresa_id=p_company and exists(
  select 1 from public.marketplace_products p,jsonb_array_elements(public.marketplace_product_removal_candidates(p_company,p_actor,p.id)) v
   where p.empresa_id=p_company and p.id=any(ids) and v->>'connection_id'=c.id::text) order by c.id for share;
 perform 1 from public.marketplace_inventory_worker where id=1 for update;
 perform 1 from public.marketplace_products where empresa_id=p_company and id=any(ids) order by id for update;
 perform 1 from public.marketplace_warehouse_balances where empresa_id=p_company and product_id=any(ids) order by product_id,warehouse_id for update;
 perform 1 from public.marketplace_listings where empresa_id=p_company order by connection_id,provider_listing_id for share;
 plan:=public.marketplace_product_cleanup_review(p_company,p_actor,ids);
 if plan->>'reviewToken' is distinct from p_review or plan->>'companyName' is distinct from p_confirmation then
  raise exception 'Os dados ou a confirmação mudaram. Revise a seleção novamente.';end if;
 if exists(select 1 from jsonb_array_elements(plan->'products') p where jsonb_array_length(p->'blockers')>0) then
  raise exception 'Há cadastros com saldo, anúncios ou operações pendentes. Revise os bloqueios antes de limpar.';end if;
 for item in select v from jsonb_array_elements(plan->'products') v loop
  snapshot:=public.marketplace_product_removal_context(p_company,p_actor,(item->>'id')::uuid);
  candidates:=public.marketplace_product_removal_candidates(p_company,p_actor,(item->>'id')::uuid);
  -- Conserva os vínculos e o trabalho retirado na auditoria, sem manter ligação operacional.
  snapshot:=jsonb_set(snapshot,'{product,links}',(snapshot#>'{product,links}')||coalesce(
   (select jsonb_agg(v) from jsonb_array_elements(candidates) v where (v->>'unlinked')::boolean),'[]'::jsonb),true)
   ||jsonb_build_object('disconnectedAccounts',item->'accounts','retiredStockJobs',coalesce(
    (select jsonb_agg(to_jsonb(j)) from public.marketplace_inventory_outbox j where j.empresa_id=p_company and j.product_id=(item->>'id')::uuid),'[]'::jsonb));
  insert into public.marketplace_product_removals(empresa_id,request_key,actor_id,product_id,mode,snapshot,proofs)
   values(p_company,gen_random_uuid(),p_actor,(item->>'id')::uuid,'archived',snapshot||jsonb_build_object('cleanupRequestKey',p_key),'[]');
  delete from public.marketplace_listing_stock_control where empresa_id=p_company and link_id in (
   select l.id from public.marketplace_product_links l join public.marketplace_connections c on c.empresa_id=l.empresa_id and c.id=l.connection_id
    where l.empresa_id=p_company and l.product_id=(item->>'id')::uuid and c.status='disconnected');
  delete from public.marketplace_inventory_outbox where empresa_id=p_company and link_id in (
   select l.id from public.marketplace_product_links l join public.marketplace_connections c on c.empresa_id=l.empresa_id and c.id=l.connection_id
    where l.empresa_id=p_company and l.product_id=(item->>'id')::uuid and c.status='disconnected');
  delete from public.marketplace_product_links l using public.marketplace_connections c
   where l.empresa_id=p_company and l.product_id=(item->>'id')::uuid and c.empresa_id=l.empresa_id and c.id=l.connection_id and c.status='disconnected';
  -- Mantém as linhas referenciadas por vendas, fiscal, financeiro, pesquisas e movimentos.
  update public.marketplace_products set archived_at=clock_timestamp(),listing_stock_review_at=null,
   revision=revision+1,updated_at=clock_timestamp() where empresa_id=p_company and id=(item->>'id')::uuid;
 end loop;
 outcome:=jsonb_build_object('removed',cardinality(ids),'productIds',ids,'historyPreserved',true,'replayed',false);
 insert into public.marketplace_product_cleanups(empresa_id,request_key,actor_id,product_ids,review_token,confirmation,result)
  values(p_company,p_key,p_actor,ids,p_review,p_confirmation,outcome);
 return outcome;
end $$;
revoke all on function public.marketplace_product_cleanup_item(uuid,uuid,uuid),public.marketplace_product_cleanup_list(uuid,uuid),
 public.marketplace_product_cleanup_review(uuid,uuid,uuid[]),public.marketplace_product_cleanup_execute(uuid,uuid,uuid[],text,text,boolean,uuid)
 from public,anon,authenticated;
grant execute on function public.marketplace_product_cleanup_list(uuid,uuid),public.marketplace_product_cleanup_review(uuid,uuid,uuid[]),
 public.marketplace_product_cleanup_execute(uuid,uuid,uuid[],text,text,boolean,uuid) to service_role;
notify pgrst,'reload schema';
commit;
