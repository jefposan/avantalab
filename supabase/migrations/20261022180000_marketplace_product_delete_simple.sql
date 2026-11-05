-- 3.2.0.77: exclusão do cadastro, sem exigir saldo conhecido; histórico independente.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
-- Apenas a identidade técnica permanece para os registros históricos, não o cadastro.
create table public.marketplace_product_history_keys (
 empresa_id uuid not null references public.empresas(id),id uuid not null unique,
 primary key(empresa_id,id)
);
alter table public.marketplace_product_history_keys enable row level security;
revoke all on public.marketplace_product_history_keys from public,anon,authenticated;
grant select on public.marketplace_product_history_keys to service_role;
insert into public.marketplace_product_history_keys select empresa_id,id from public.marketplace_products;
create function public.marketplace_product_history_identity() returns trigger
language plpgsql security definer set search_path=public as $$begin
 insert into marketplace_product_history_keys(empresa_id,id)values(new.empresa_id,new.id);
 return new;
end $$;
create trigger marketplace_product_history_identity after insert on public.marketplace_products for each row execute function public.marketplace_product_history_identity();
revoke all on function public.marketplace_product_history_identity() from public,anon,authenticated;
-- Vendas e movimentos conservam seus IDs/snapshots; não dependem de cadastro ativo.
do $$declare fk record; definition text;begin
 for fk in select c.oid,c.conname,c.conrelid::regclass tbl from pg_constraint c join pg_class t on t.oid=c.conrelid
 where c.contype='f' and c.confrelid='public.marketplace_products'::regclass
 and t.relname in ('marketplace_stock_movements','marketplace_warehouse_movements','marketplace_direct_sales','marketplace_inventory_events','marketplace_stock_sync_reviews') loop
  definition:=replace(replace(pg_get_constraintdef(fk.oid),'REFERENCES public.marketplace_products(','REFERENCES public.marketplace_product_history_keys('),'REFERENCES marketplace_products(','REFERENCES marketplace_product_history_keys(');
  execute format('alter table %s drop constraint %I',fk.tbl,fk.conname);
  execute format('alter table %s add constraint %I %s',fk.tbl,fk.conname,definition);
 end loop;
end $$;
create function public.marketplace_product_history_insert_guard() returns trigger language plpgsql set search_path=public as $$begin
 if tg_op='UPDATE' and new.product_id is not distinct from old.product_id then return new;end if;
 if new.product_id is null then return new;end if;
 perform 1 from marketplace_products where id=new.product_id and empresa_id=new.empresa_id and archived_at is null for key share;
 if not found then raise exception 'Produto excluído. Não é possível iniciar outra movimentação para este cadastro.';end if;
 return new;
end $$;
do $$declare t text;begin
 foreach t in array array['marketplace_stock_movements','marketplace_warehouse_movements','marketplace_direct_sales','marketplace_inventory_events','marketplace_stock_sync_reviews'] loop
  if to_regclass('public.'||t) is not null then execute format('create trigger marketplace_product_history_insert_guard before insert or update of product_id on public.%I for each row execute function public.marketplace_product_history_insert_guard()',t);end if;
 end loop;
end $$;

alter function public.marketplace_product_removal_context(uuid,uuid,uuid) rename to marketplace_product_removal_context_v76;
create function public.marketplace_product_removal_context(p_company uuid,p_actor uuid,p_product uuid) returns jsonb
language plpgsql security definer set search_path=public as $$declare r jsonb;begin
 r:=marketplace_product_removal_context_v76(p_company,p_actor,p_product);
 return r||jsonb_build_object('mode','deleted','stockBlocked',false,'removalPolicy','simple-delete');
end $$;

create or replace function public.marketplace_product_remove(p_company uuid,p_actor uuid,p_product uuid,p_revision bigint,p_mode text,p_confirmation text,p_key uuid,p_proofs jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p marketplace_products;r jsonb;saved marketplace_product_removals;l marketplace_product_links;proof jsonb;t text;
begin
 if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem permissão para excluir produtos neste perfil.';end if;
 if p_key is null then raise exception 'Tentativa inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended('price-products:'||p_company::text,0));
 select * into saved from marketplace_product_removals where empresa_id=p_company and request_key=p_key;
 if found then
  if saved.actor_id<>p_actor or saved.product_id<>p_product or saved.mode<>p_mode or saved.snapshot->'product'->>'name' is distinct from p_confirmation then raise exception 'Tentativa já utilizada com outros dados.';end if;
  return jsonb_build_object('productId',p_product,'mode',saved.mode,'replayed',true);
 end if;
 select * into p from marketplace_products where empresa_id=p_company and id=p_product and archived_at is null for update;
 if not found then raise exception 'Produto já excluído ou não encontrado.';end if;
 perform 1 from marketplace_warehouse_balances where empresa_id=p_company and product_id=p.id order by warehouse_id for update;
 perform 1 from marketplace_product_links where empresa_id=p_company and product_id=p.id order by id for update;
 perform 1 from marketplace_inventory_worker where id=1 for update;
 r:=marketplace_product_removal_context(p_company,p_actor,p.id);
 if p_revision is null or p.revision<>p_revision or p.name is distinct from p_confirmation or p_mode is distinct from 'deleted' then raise exception 'O produto mudou. Abra a exclusão novamente.';end if;
 if (r->>'workBlocked')::boolean then raise exception 'Há uma alteração em andamento. Aguarde sua conclusão antes de excluir.';end if;
 if exists(select 1 from marketplace_inventory_events where empresa_id=p_company and product_id=p.id and state='pending') then raise exception 'Há uma venda sendo processada. Aguarde sua conclusão antes de excluir.';end if;
 if jsonb_typeof(p_proofs) is distinct from 'array' or jsonb_array_length(p_proofs)<>jsonb_array_length(r->'product'->'links') or (select count(distinct v->>'linkId') from jsonb_array_elements(p_proofs)v)<>jsonb_array_length(p_proofs) then raise exception 'Não foi possível conferir todos os anúncios vinculados.';end if;
 for l in select * from marketplace_product_links where empresa_id=p_company and product_id=p.id loop
  select v into proof from jsonb_array_elements(p_proofs)v where v->>'linkId'=l.id::text;
  if proof is null or proof->>'connectionId' is distinct from l.connection_id::text or proof->>'listingId' is distinct from l.provider_listing_id
   or coalesce(proof->>'status','') not in ('closed','deleted','cancelled','canceled','unpublished') or lower(l.status) is distinct from proof->>'status'
   or nullif(proof->>'checkedAt','') is null or (proof->>'checkedAt')::timestamptz<clock_timestamp()-interval '90 seconds' or (proof->>'checkedAt')::timestamptz>clock_timestamp()+interval '5 seconds' then raise exception 'Encerre ou exclua os anúncios vinculados antes de excluir o produto.';end if;
 end loop;
 insert into marketplace_product_removals(empresa_id,request_key,actor_id,product_id,mode,snapshot,proofs)values(p_company,p_key,p_actor,p.id,'deleted',r,p_proofs);
 -- Remove controles, fontes e consultas que só pertencem ao cadastro; não vendas/movimentos.
 foreach t in array array['marketplace_listing_stock_control','marketplace_inventory_outbox','marketplace_product_internal_notes','marketplace_product_price_researches','marketplace_price_product_sources'] loop
  if to_regclass('public.'||t) is not null then execute format('delete from public.%I where empresa_id=$1 and product_id=$2',t)using p_company,p.id;end if;
 end loop;
 if to_regclass('public.marketplace_price_consultations') is not null then delete from marketplace_price_consultations where empresa_id=p_company and local_product_id=p.id;end if;
 delete from marketplace_product_links where empresa_id=p_company and product_id=p.id;
 delete from marketplace_warehouse_balances where empresa_id=p_company and product_id=p.id;
 delete from marketplace_products where empresa_id=p_company and id=p.id;
 return jsonb_build_object('productId',p.id,'mode','deleted','replayed',false);
end $$;
revoke all on function public.marketplace_product_removal_context(uuid,uuid,uuid),public.marketplace_product_removal_context_v76(uuid,uuid,uuid),public.marketplace_product_remove(uuid,uuid,uuid,bigint,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_product_removal_context(uuid,uuid,uuid),public.marketplace_product_remove(uuid,uuid,uuid,bigint,text,text,uuid,jsonb) to service_role;

-- Um anúncio excluído do cadastro não deve recriá-lo durante sincronização automática.
alter function public.marketplace_listing_catalog_import(uuid,uuid,text) rename to marketplace_listing_catalog_import_v76;
create function public.marketplace_listing_catalog_import(p_empresa uuid,p_connection uuid,p_listing text)returns jsonb
language plpgsql security definer set search_path=public as $$begin
 if exists(select 1 from marketplace_product_removals d,jsonb_array_elements(d.snapshot->'product'->'links')l where d.empresa_id=p_empresa and l->>'connection_id'=p_connection::text and l->>'provider_listing_id'=p_listing) then return jsonb_build_object('removed',true,'created',false);end if;
 return marketplace_listing_catalog_import_v76(p_empresa,p_connection,p_listing);
end $$;
revoke all on function public.marketplace_listing_catalog_import(uuid,uuid,text),public.marketplace_listing_catalog_import_v76(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.marketplace_listing_catalog_import(uuid,uuid,text) to service_role;
commit;
