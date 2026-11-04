-- Exclusão: conferir anúncios importados de todas as contas, mesmo sem vínculo.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
-- Reutiliza a política existente, sem conceder novos acessos. Compatível com
-- instalações anteriores à liberação dedicada de exclusão no AvantaPreços.
create or replace function public.marketplace_product_removal_discovery_access(p_company uuid,p_actor uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare allowed boolean;
begin
 if to_regprocedure('public.marketplace_product_removal_authorized(uuid,uuid)') is not null then
  execute 'select public.marketplace_product_removal_authorized($1,$2)' into allowed using p_company,p_actor;
  return allowed;
 end if;
 return exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id
  where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo')
   and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now()));
end $$;
create or replace function public.marketplace_product_removal_candidates(p_company uuid,p_actor uuid,p_product uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p marketplace_products; result jsonb;
begin
 if not marketplace_product_removal_discovery_access(p_company,p_actor) then raise exception 'Sem permissão para excluir produtos neste perfil.';end if;
 select * into p from marketplace_products where empresa_id=p_company and id=p_product and archived_at is null;
 if not found then raise exception 'Produto já excluído ou não encontrado.';end if;
 select coalesce(jsonb_agg(v order by v->>'connection_id',v->>'provider_listing_id'),'[]'::jsonb) into result from (
  select jsonb_build_object('id',coalesce(l.id::text,'unlinked:'||s.connection_id::text||':'||s.provider_listing_id),
   'connection_id',s.connection_id,'provider',s.provider,'provider_listing_id',s.provider_listing_id,
   'title',s.title,'status',s.status,'reported_stock',null,'source_snapshot','{}'::jsonb,'updated_at',s.synced_at,
   'unlinked',l.id is null,'conflict',other_link.product_id is not null,'accountName',coalesce(c.seller_name,c.seller_reference)) v
  from marketplace_listings s join marketplace_connections c on c.id=s.connection_id and c.empresa_id=p_company
  left join marketplace_product_links l on l.empresa_id=p_company and l.connection_id=s.connection_id and l.provider_listing_id=s.provider_listing_id and l.product_id=p.id
  left join marketplace_product_links other_link on other_link.empresa_id=p_company and other_link.connection_id=s.connection_id and other_link.provider_listing_id=s.provider_listing_id and other_link.product_id<>p.id
  where s.empresa_id=p_company and (l.id is not null or (
   nullif(regexp_replace(coalesce(p.ean,''),'[^0-9]','','g'),'') is not null and (
    ltrim(regexp_replace(coalesce(s.snapshot->>'ean',''),'[^0-9]','','g'),'0')=ltrim(regexp_replace(p.ean,'[^0-9]','','g'),'0')
    or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(s.snapshot->'variations')='array' then s.snapshot->'variations' else '[]'::jsonb end) variation
      where ltrim(regexp_replace(coalesce(variation->>'ean',''),'[^0-9]','','g'),'0')=ltrim(regexp_replace(p.ean,'[^0-9]','','g'),'0')))))
  union all
  select to_jsonb(l)||jsonb_build_object('unlinked',false,'conflict',false,'accountName',coalesce(c.seller_name,c.seller_reference))
  from marketplace_product_links l join marketplace_connections c on c.id=l.connection_id and c.empresa_id=p_company
  where l.empresa_id=p_company and l.product_id=p.id and not exists(select 1 from marketplace_listings s where s.empresa_id=p_company and s.connection_id=l.connection_id and s.provider_listing_id=l.provider_listing_id)
 ) candidates;
 return result;
end $$;

create or replace function public.marketplace_product_remove_checked(p_company uuid,p_actor uuid,p_product uuid,p_revision bigint,p_mode text,p_confirmation text,p_key uuid,p_proofs jsonb,p_discovery jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare candidates jsonb; candidate jsonb; proof jsonb; saved marketplace_product_removals; outcome jsonb;
begin
 if not marketplace_product_removal_discovery_access(p_company,p_actor) then raise exception 'Sem permissão para excluir produtos neste perfil.';end if;
 perform pg_advisory_xact_lock(hashtextextended('price-products:'||p_company::text,0));
 select * into saved from marketplace_product_removals where empresa_id=p_company and request_key=p_key;
 if found then return marketplace_product_remove(p_company,p_actor,p_product,p_revision,p_mode,p_confirmation,p_key,p_proofs);end if;
 perform 1 from marketplace_products where empresa_id=p_company and id=p_product for update;
 perform 1 from marketplace_listings where empresa_id=p_company order by connection_id,provider_listing_id for share;
 candidates:=marketplace_product_removal_candidates(p_company,p_actor,p_product);
 if jsonb_typeof(p_discovery) is distinct from 'array' or jsonb_array_length(p_discovery)<>jsonb_array_length(candidates)
  or (select count(distinct v->>'linkId') from jsonb_array_elements(p_discovery)v)<>jsonb_array_length(candidates) then raise exception 'Os anúncios encontrados mudaram. Confira a exclusão novamente.';end if;
 for candidate in select * from jsonb_array_elements(candidates) loop
  select v into proof from jsonb_array_elements(p_discovery)v where v->>'linkId'=candidate->>'id';
  if (candidate->>'conflict')::boolean then raise exception 'Há anúncio do mesmo EAN vinculado a outro cadastro. Confira o vínculo antes de excluir.';end if;
  if proof is null or proof->>'connectionId' is distinct from candidate->>'connection_id' or proof->>'listingId' is distinct from candidate->>'provider_listing_id'
   or coalesce(proof->>'status','') not in ('deleted','cancelled','canceled','unpublished') or candidate->>'status' is distinct from proof->>'status'
   or nullif(proof->>'error','') is not null or nullif(proof->>'checkedAt','') is null
   or (proof->>'checkedAt')::timestamptz<clock_timestamp()-interval '90 seconds' or (proof->>'checkedAt')::timestamptz>clock_timestamp()+interval '5 seconds'
   then raise exception 'Confirme a exclusão de todos os anúncios encontrados antes de excluir o produto.';end if;
 end loop;
 outcome:=marketplace_product_remove(p_company,p_actor,p_product,p_revision,p_mode,p_confirmation,p_key,p_proofs);
 -- Retém a identidade de TODOS os anúncios conferidos, inclusive os sem vínculo:
 -- a importação posterior já consulta este histórico e não recria o produto.
 update marketplace_product_removals set snapshot=jsonb_set(snapshot,'{product,links}',coalesce(snapshot#>'{product,links}','[]'::jsonb)||coalesce((select jsonb_agg(v) from jsonb_array_elements(candidates)v where (v->>'unlinked')::boolean),'[]'::jsonb),true)||jsonb_build_object('discoveryProofs',p_discovery)
 where empresa_id=p_company and request_key=p_key;
 return outcome;
end $$;
revoke all on function public.marketplace_product_removal_discovery_access(uuid,uuid),public.marketplace_product_removal_candidates(uuid,uuid,uuid),public.marketplace_product_remove_checked(uuid,uuid,uuid,bigint,text,text,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_product_removal_candidates(uuid,uuid,uuid),public.marketplace_product_remove_checked(uuid,uuid,uuid,bigint,text,text,uuid,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
