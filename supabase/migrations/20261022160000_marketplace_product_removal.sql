-- Preparação local: não aplicar em produção sem autorização de publicação.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create table public.marketplace_product_removals (
 empresa_id uuid not null references public.empresas(id), request_key uuid not null,
 actor_id uuid not null references auth.users(id), product_id uuid not null,
 mode text not null check(mode in ('deleted','archived')), snapshot jsonb not null,
 proofs jsonb not null, created_at timestamptz not null default now(), primary key(empresa_id,request_key), unique(empresa_id,product_id)
);
alter table public.marketplace_product_removals enable row level security;
revoke all on public.marketplace_product_removals from public,anon,authenticated;
grant select,insert on public.marketplace_product_removals to service_role;

create function public.marketplace_product_removal_context(p_company uuid,p_actor uuid,p_product uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p marketplace_products; fk record; referenced boolean; history boolean:=false; balance_block boolean; work_block boolean; balances jsonb; links jsonb; accounts jsonb;
begin
 if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id
  where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo')
  and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem permissão para excluir produtos neste perfil.';end if;
 select * into p from marketplace_products where empresa_id=p_company and id=p_product and archived_at is null;
 if not found then raise exception 'Produto não encontrado ou já removido.';end if;
 -- Toda FK é considerada: novas tabelas de histórico também impedem exclusão física.
 for fk in select ns.nspname,cl.relname,a.attname from pg_constraint c
  join pg_class cl on cl.oid=c.conrelid join pg_namespace ns on ns.oid=cl.relnamespace
  join lateral unnest(c.conkey,c.confkey) k(local_key,remote_key) on true
  join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.local_key
  join pg_attribute target on target.attrelid=c.confrelid and target.attnum=k.remote_key
  where c.contype='f' and c.confrelid='public.marketplace_products'::regclass and target.attname='id'
   and cl.relname<>'marketplace_warehouse_balances'
 loop
  execute format('select exists(select 1 from %I.%I where %I=$1)',fk.nspname,fk.relname,fk.attname) into referenced using p.id;
  history:=history or referenced;
 end loop;
 history:=history or exists(select 1 from marketplace_publications where empresa_id=p_company and response_summary->>'local_product_id'=p.id::text);
 select coalesce(jsonb_agg(jsonb_build_object('warehouseId',w.id,'name',w.name,'quantity',b.quantity,'isOnline',w.is_online) order by w.name),'[]'::jsonb)
  into balances from marketplace_warehouse_balances b join marketplace_warehouses w on w.empresa_id=b.empresa_id and w.id=b.warehouse_id
  where b.empresa_id=p_company and b.product_id=p.id;
 balance_block:=p.stock_quantity is null or p.stock_quantity<>0 or exists(select 1 from marketplace_warehouse_balances where empresa_id=p_company and product_id=p.id and (quantity is null or quantity<>0));
 work_block:=exists(select 1 from marketplace_inventory_outbox where empresa_id=p_company and product_id=p.id and state='pending')
  and exists(select 1 from marketplace_inventory_worker where lease_until>clock_timestamp());
 work_block:=work_block or exists(select 1 from marketplace_publications pub where pub.empresa_id=p_company and pub.response_summary->>'local_product_id'=p.id::text
  and (pub.status='publishing' or (pub.provider_listing_id is not null and not exists(select 1 from marketplace_product_links l where l.empresa_id=p_company and l.product_id=p.id and l.connection_id=pub.connection_id and l.provider_listing_id=pub.provider_listing_id))));
 work_block:=work_block or exists(select 1 from marketplace_listing_actions a join marketplace_product_links l on l.empresa_id=a.empresa_id and l.connection_id=a.connection_id and l.provider_listing_id=a.provider_listing_id
  where l.empresa_id=p_company and l.product_id=p.id and a.status in ('requested','uncertain'));
 select coalesce(jsonb_agg(to_jsonb(l) order by l.connection_id,l.provider_listing_id),'[]'::jsonb) into links from marketplace_product_links l where l.empresa_id=p_company and l.product_id=p.id;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'provider',c.provider,'seller_name',c.seller_name,'seller_reference',c.seller_reference,'status',c.status,'last_synced_at',c.last_synced_at,'expires_at',c.expires_at)),'[]'::jsonb)
  into accounts from marketplace_connections c where c.empresa_id=p_company and exists(select 1 from marketplace_product_links l where l.empresa_id=p_company and l.product_id=p.id and l.connection_id=c.id);
 return jsonb_build_object('product',to_jsonb(p)||jsonb_build_object('links',links),'allocations',balances,'accounts',accounts,'history',history,
  'mode',case when history then 'archived' else 'deleted' end,'stockBlocked',balance_block,'workBlocked',work_block);
end $$;

create function public.marketplace_product_remove(p_company uuid,p_actor uuid,p_product uuid,p_revision bigint,p_mode text,p_confirmation text,p_key uuid,p_proofs jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p marketplace_products; review jsonb; previous marketplace_product_removals; l marketplace_product_links; proof jsonb; outcome jsonb;
begin
 if p_key is null then raise exception 'Tentativa inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended('price-products:'||p_company::text,0));
 select * into previous from marketplace_product_removals where empresa_id=p_company and request_key=p_key;
 if found then
  if previous.actor_id<>p_actor or previous.product_id<>p_product or previous.mode<>p_mode or previous.snapshot->'product'->>'name' is distinct from p_confirmation then raise exception 'Tentativa já utilizada com outros dados.';end if;
  -- Repetição não apaga nada novamente, mas ainda exige usuário ativo com permissão.
  if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem permissão.';end if;
  return jsonb_build_object('productId',p_product,'mode',previous.mode,'replayed',true);
 end if;
 select * into p from marketplace_products where empresa_id=p_company and id=p_product and archived_at is null for update;
 if not found then raise exception 'Produto não encontrado ou já removido.';end if;
 perform 1 from marketplace_warehouse_balances where empresa_id=p_company and product_id=p.id order by warehouse_id for update;
 perform 1 from marketplace_product_links where empresa_id=p_company and product_id=p.id order by id for update;
 perform 1 from marketplace_inventory_worker where id=1 for update;
 review:=marketplace_product_removal_context(p_company,p_actor,p.id);
 if p_revision is null or p.revision<>p_revision or p.name is distinct from p_confirmation or review->>'mode' is distinct from p_mode then raise exception 'O cadastro ou histórico mudou. Confira a exclusão novamente.';end if;
 if (review->>'stockBlocked')::boolean then raise exception 'Há saldo ou quantidade a confirmar. Registre a saída ou transferência antes de excluir.';end if;
 if (review->>'workBlocked')::boolean then raise exception 'Há publicação, alteração de anúncio ou sincronização pendente. Aguarde e confira novamente.';end if;
 if exists(select 1 from marketplace_inventory_events where empresa_id=p_company and product_id=p.id and state='pending') then raise exception 'Confira as vendas pendentes deste produto antes de excluir.';end if;
 if jsonb_typeof(p_proofs) is distinct from 'array' or jsonb_array_length(p_proofs)<>jsonb_array_length(review->'product'->'links')
  or (select count(distinct v->>'linkId') from jsonb_array_elements(p_proofs) v)<>jsonb_array_length(p_proofs) then raise exception 'Confira todos os anúncios de todas as contas antes de excluir.';end if;
 for l in select * from marketplace_product_links where empresa_id=p_company and product_id=p.id loop
  select v into proof from jsonb_array_elements(p_proofs) v where v->>'linkId'=l.id::text;
  if proof is null or proof->>'connectionId' is distinct from l.connection_id::text or proof->>'listingId' is distinct from l.provider_listing_id
   or proof->>'status' not in ('paused','closed','deleted','inactive','cancelled','canceled','unpublished')
   or lower(l.status) is distinct from proof->>'status'
   or nullif(proof->>'checkedAt','') is null or (proof->>'checkedAt')::timestamptz<clock_timestamp()-interval '90 seconds'
   or (proof->>'checkedAt')::timestamptz>clock_timestamp()+interval '5 seconds' then raise exception 'Há anúncio ativo, pendente ou sem confirmação recente. Pause/encerre e confira novamente.';end if;
 end loop;
 -- Exclui apenas trabalho futuro, nunca movimentações, vendas, consultas ou anúncios.
 update marketplace_inventory_outbox set state='excluded',issue='product_removed',generation=gen_random_uuid(),updated_at=now() where empresa_id=p_company and product_id=p.id and state='pending';
 insert into marketplace_product_removals(empresa_id,request_key,actor_id,product_id,mode,snapshot,proofs) values(p_company,p_key,p_actor,p.id,p_mode,review,p_proofs);
 if p_mode='deleted' then
  delete from marketplace_warehouse_balances where empresa_id=p_company and product_id=p.id and quantity=0;
  delete from marketplace_products where empresa_id=p_company and id=p.id;
 else
  update marketplace_products set archived_at=clock_timestamp(),revision=revision+1,updated_at=now() where empresa_id=p_company and id=p.id;
  update marketplace_inventory_outbox set state='excluded',issue='product_removed',generation=gen_random_uuid(),updated_at=now() where empresa_id=p_company and product_id=p.id and state='pending';
 end if;
 return jsonb_build_object('productId',p.id,'mode',p_mode,'replayed',false);
end $$;
revoke all on function public.marketplace_product_removal_context(uuid,uuid,uuid),public.marketplace_product_remove(uuid,uuid,uuid,bigint,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_product_removal_context(uuid,uuid,uuid),public.marketplace_product_remove(uuid,uuid,uuid,bigint,text,text,uuid,jsonb) to service_role;

-- Um vínculo arquivado continua existindo para histórico, sem ressuscitar cadastro.
alter function public.marketplace_listing_catalog_import(uuid,uuid,text) rename to marketplace_listing_catalog_import_before_removal;
create function public.marketplace_listing_catalog_import(p_empresa uuid,p_connection uuid,p_listing text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare linked uuid;
begin
 select l.product_id into linked from marketplace_product_links l join marketplace_products p on p.empresa_id=l.empresa_id and p.id=l.product_id
 where l.empresa_id=p_empresa and l.connection_id=p_connection and l.provider_listing_id=p_listing and p.archived_at is not null;
 if found then return jsonb_build_object('product_id',linked,'created',false,'archived',true);end if;
 return marketplace_listing_catalog_import_before_removal(p_empresa,p_connection,p_listing);
end $$;
revoke all on function public.marketplace_listing_catalog_import(uuid,uuid,text),public.marketplace_listing_catalog_import_before_removal(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.marketplace_listing_catalog_import(uuid,uuid,text) to service_role;
-- Pesquisa/importação automática por EAN não recria um cadastro arquivado.
create function public.marketplace_removed_identity_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if nullif(new.ean,'') is not null and exists(select 1 from marketplace_products where empresa_id=new.empresa_id and archived_at is not null and ltrim(ean,'0')=ltrim(new.ean,'0')) then
  raise exception 'Este produto está arquivado. Confira o cadastro existente antes de cadastrá-lo novamente.';
 end if;
 return new;
end $$;
create trigger marketplace_removed_identity_guard before insert on public.marketplace_products for each row execute function public.marketplace_removed_identity_guard();
-- Ações/publicações concorrentes adquirem a mesma proteção da linha do produto.
create function public.marketplace_removed_operation_guard() returns trigger language plpgsql set search_path=public as $$
declare product uuid; archived timestamptz; identifier text;
begin
 if tg_table_name='marketplace_publications' then
  identifier:=new.response_summary->>'local_product_id';
  if identifier is null then return new;end if;
  product:=identifier::uuid;
  select archived_at into archived from marketplace_products where empresa_id=new.empresa_id and id=product for key share;
  if not found or archived is not null then raise exception 'Produto removido. Não é possível iniciar outra publicação.';end if;
 else
  select p.archived_at into archived from marketplace_product_links l join marketplace_products p on p.empresa_id=l.empresa_id and p.id=l.product_id
   where l.empresa_id=new.empresa_id and l.connection_id=new.connection_id and l.provider_listing_id=new.provider_listing_id for key share of p;
  if found and archived is not null and new.action not in ('pause','close','delete') then raise exception 'Produto arquivado. Não é possível reativar ou editar seu anúncio por este cadastro.';end if;
 end if;
 return new;
end $$;
create trigger marketplace_removed_publication_guard before insert on public.marketplace_publications for each row execute function public.marketplace_removed_operation_guard();
create trigger marketplace_removed_listing_action_guard before insert on public.marketplace_listing_actions for each row execute function public.marketplace_removed_operation_guard();
commit;
