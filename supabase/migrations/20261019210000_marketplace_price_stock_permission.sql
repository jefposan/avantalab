-- Permissão específica de estoque do AvantaPreços. Nenhum acesso existente é ampliado automaticamente.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
alter table public.marketplace_price_users add column if not exists can_edit_stock boolean not null default false;

create or replace function public.marketplace_price_stock_authorized(p_empresa_id uuid,p_actor_id uuid,p_action text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if p_action is distinct from 'confirm_stock' then return false; end if;
  -- Serializa confirmação com revogação/exclusão do acesso. Não confia em token/metadata antigos.
  perform 1 from public.marketplace_price_users
    where empresa_id=p_empresa_id and user_id=p_actor_id and ativo and can_edit_stock for share;
  if not found then return false; end if;
  return exists(select 1 from public.empresa_modulos where empresa_id=p_empresa_id and modulo_id='marketplaces'
    and ativo and (expira_em is null or expira_em>now()));
end $$;
revoke all on function public.marketplace_price_stock_authorized(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.marketplace_price_stock_authorized(uuid,uuid,text) to service_role;

-- Amplia apenas o guard de confirm_stock no núcleo existente; preserva validação,
-- revisão, recibo idempotente, autoria, movimentação e os wrappers de unificação.
do $migration$
declare definition text; original_guard text; new_guard text;
begin
  select pg_get_functiondef('public.marketplace_product_command_base_49(uuid,uuid,text,jsonb,uuid)'::regprocedure) into definition;
  if strpos(definition,'marketplace_price_stock_authorized')>0 then return; end if;
  original_guard := $guard$if p_request_key is null or not exists (
    select 1 from public.usuarios_empresa u join public.empresa_modulos m on m.empresa_id = u.empresa_id
    where u.empresa_id = p_empresa_id and u.user_id = p_actor_id and u.status = 'ativo'
      and u.perfil in ('gestor_master', 'administrador', 'operador_completo')
      and m.modulo_id = 'marketplaces' and m.ativo and (m.expira_em is null or m.expira_em > now())
  ) then raise exception 'Sem permissão para gerenciar produtos nesta empresa.'; end if;$guard$;
  if strpos(definition,original_guard)=0 then raise exception 'Guard de produtos não reconhecido. Nenhuma autorização foi alterada.'; end if;
  new_guard := replace(original_guard,'if p_request_key is null or not exists (','if p_request_key is null or (not exists (');
  new_guard := replace(new_guard,') then raise exception',') and not public.marketplace_price_stock_authorized(p_empresa_id,p_actor_id,p_action)) then raise exception');
  execute replace(definition,original_guard,new_guard);
end $migration$;
revoke all on function public.marketplace_product_command_base_49(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_product_command_base_49(uuid,uuid,text,jsonb,uuid) to service_role;
notify pgrst,'reload schema';
commit;
