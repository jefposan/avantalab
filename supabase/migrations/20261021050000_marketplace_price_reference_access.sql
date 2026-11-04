-- AvantaPreços: somente referência de preço; sem conceder edição geral ou estoque.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create function public.marketplace_price_reference_allowed(p_empresa_id uuid,p_actor_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.empresa_modulos m where m.empresa_id=p_empresa_id
    and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now()))
  and (exists(select 1 from public.usuarios_empresa u where u.empresa_id=p_empresa_id
    and u.user_id=p_actor_id and u.status='ativo')
    or exists(select 1 from public.marketplace_price_users u where u.empresa_id=p_empresa_id
      and u.user_id=p_actor_id and u.ativo));
$$;
revoke all on function public.marketplace_price_reference_allowed(uuid,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_price_reference_allowed(uuid,uuid) to service_role;

create function public.marketplace_price_reference_edit(p_empresa_id uuid,p_actor_id uuid,p_product_id uuid,p_revision bigint,p_price_cents bigint,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_product public.marketplace_products; v_op public.marketplace_product_operations; v_hash text; v_result jsonb;
begin
  if not public.marketplace_price_reference_allowed(p_empresa_id,p_actor_id) then
    raise exception 'Sem permissão para atualizar a referência nesta empresa.';
  end if;
  if p_request_key is null or p_revision is null or p_revision<1 or p_price_cents is null or p_price_cents<=0 or p_price_cents>=10000000000 then
    raise exception 'Referência inválida.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('reference-key:'||p_empresa_id::text||':'||p_request_key::text,0));
  v_hash:=md5(p_actor_id::text||':'||p_product_id::text||':'||p_revision::text||':'||p_price_cents::text);
  select * into v_op from public.marketplace_product_operations where empresa_id=p_empresa_id and request_key=p_request_key;
  if found then
    if v_op.action<>'price_reference' or v_op.request_hash is distinct from v_hash then raise exception 'Tentativa repetida com dados diferentes.'; end if;
    return v_op.result;
  end if;
  select * into v_product from public.marketplace_products where empresa_id=p_empresa_id and id=p_product_id and archived_at is null for update;
  if not found or v_product.revision is distinct from p_revision then raise exception 'O cadastro mudou. Atualize antes de salvar.'; end if;
  if v_product.price_cents is distinct from p_price_cents then
    update public.marketplace_products set price_cents=p_price_cents,
      publication_form=publication_form||jsonb_build_object('price',p_price_cents::numeric/100),
      revision=revision+1,updated_at=now() where empresa_id=p_empresa_id and id=p_product_id returning * into v_product;
  end if;
  v_result:=jsonb_build_object('product_id',v_product.id,'revision',v_product.revision,'price_cents',v_product.price_cents);
  insert into public.marketplace_product_operations(empresa_id,request_key,actor_id,action,request_hash,result)
    values(p_empresa_id,p_request_key,p_actor_id,'price_reference',v_hash,v_result);
  return v_result;
end;
$$;
revoke all on function public.marketplace_price_reference_edit(uuid,uuid,uuid,bigint,bigint,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_price_reference_edit(uuid,uuid,uuid,bigint,bigint,uuid) to service_role;

-- Preserva integralmente pesquisa, limites, concorrência e auditoria existentes.
do $migration$
declare definition text; old_gate text:=$gate$not exists (
    select 1 from public.usuarios_empresa u join public.empresa_modulos m on m.empresa_id=u.empresa_id
    where u.empresa_id=p_empresa_id and u.user_id=p_actor_id and u.status='ativo'
      and u.perfil in ('gestor_master','administrador','operador_completo')
      and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())
  )$gate$;
begin
  definition:=pg_get_functiondef('public.marketplace_product_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,text)'::regprocedure);
  if position(old_gate in definition)=0 then raise exception 'Contrato de pesquisa inesperado; migração interrompida.'; end if;
  execute replace(definition,old_gate,'not public.marketplace_price_reference_allowed(p_empresa_id,p_actor_id)');
end;
$migration$;
notify pgrst,'reload schema';
commit;
