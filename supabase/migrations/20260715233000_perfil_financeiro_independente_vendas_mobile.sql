-- O destino financeiro não depende do catálogo ou vínculo comercial.
create table if not exists public.vendas_mobile_perfis_financeiros (
  user_id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  atualizado_em timestamptz not null default now()
);
alter table public.vendas_mobile_perfis_financeiros enable row level security;
create policy vendas_perfil_financeiro_proprio on public.vendas_mobile_perfis_financeiros for select to authenticated using (user_id = auth.uid());

-- Mantém como destino inicial a empresa usada pelos lançamentos atuais; onde
-- não há lançamento, preserva o vínculo aprovado que já existia.
insert into public.vendas_mobile_perfis_financeiros (user_id, empresa_id)
select distinct on (origem.user_id) origem.user_id, origem.empresa_id
from (
  select user_id, empresa_id, criado_em from public.vendas_mobile_pagamentos where empresa_id is not null
  union all
  select user_id, empresa_id, criado_em from public.vendas_mobile_pedidos where empresa_id is not null
  union all
  select user_id, empresa_id, aprovado_em as criado_em from public.vendas_mobile_acessos where status = 'ativo'
) origem
order by origem.user_id, origem.criado_em desc
on conflict (user_id) do nothing;

create or replace function public.empresa_financeira_vendas_mobile(p_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from public.vendas_mobile_perfis_financeiros where user_id = p_user_id
$$;

create or replace function public.preencher_empresa_lancamento_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.empresa_id is null then new.empresa_id := public.empresa_financeira_vendas_mobile(new.user_id); end if;
  if new.empresa_id is null then raise exception 'Defina um destino financeiro em Configurações antes de lançar.'; end if;
  return new;
end;
$$;

create or replace function public.meus_perfis_financeiros_vendas_mobile_rpc()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return coalesce((select jsonb_agg(jsonb_build_object('empresa_id', e.id, 'empresa_nome', e.nome) order by e.nome)
    from public.usuarios_empresa ue join public.empresas e on e.id = ue.empresa_id
    where ue.user_id = auth.uid() and ue.status = 'ativo' and ue.perfil in ('gestor_master','administrador')), '[]'::jsonb);
end;
$$;

create or replace function public.definir_perfil_financeiro_vendas_mobile_rpc(p_empresa_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.usuarios_empresa where user_id = auth.uid() and empresa_id = p_empresa_id and status = 'ativo' and perfil in ('gestor_master','administrador')) then
    raise exception 'Você não possui permissão financeira neste perfil.';
  end if;
  insert into public.vendas_mobile_perfis_financeiros (user_id, empresa_id) values (auth.uid(), p_empresa_id)
  on conflict (user_id) do update set empresa_id = excluded.empresa_id, atualizado_em = now();
  return jsonb_build_object('empresa_id', p_empresa_id);
end;
$$;

-- A configuração e a consulta de integração usam somente o perfil financeiro.
create or replace function public.configurar_integracao_gestao_vendas_mobile_rpc(p_base_receita text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_empresa_id uuid; v_data date;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_base_receita not in ('recebidos','vendidos') then raise exception 'Base de receita inválida.'; end if;
  v_empresa_id := public.empresa_financeira_vendas_mobile(auth.uid());
  if v_empresa_id is null or not public.vendas_mobile_pode_gerir_catalogo(v_empresa_id) then raise exception 'Defina um perfil financeiro que você gerencia.'; end if;
  insert into public.vendas_mobile_integracao_gestao (empresa_id, base_receita, atualizado_por) values (v_empresa_id,p_base_receita,auth.uid())
  on conflict (empresa_id) do update set base_receita=excluded.base_receita,atualizado_em=now(),atualizado_por=excluded.atualizado_por;
  for v_data in select distinct data_referencia from (
    select data_pagamento data_referencia from public.vendas_mobile_pagamentos where empresa_id=v_empresa_id
    union select (criado_em at time zone 'America/Sao_Paulo')::date from public.vendas_mobile_pedidos where empresa_id=v_empresa_id
    union select data_referencia from public.vendas_mobile_receitas_gestao where empresa_id=v_empresa_id
  ) d where data_referencia is not null loop perform public.sincronizar_receita_vendas_mobile_gestao(v_empresa_id,v_data); end loop;
  return jsonb_build_object('base_receita',p_base_receita,'pode_configurar',true);
end;
$$;

create or replace function public.obter_integracao_gestao_vendas_mobile_rpc()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_empresa_id uuid; v_base text; v_pode boolean;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  v_empresa_id := public.empresa_financeira_vendas_mobile(auth.uid());
  if v_empresa_id is null then return jsonb_build_object('base_receita','recebidos','pode_configurar',false); end if;
  select base_receita into v_base from public.vendas_mobile_integracao_gestao where empresa_id=v_empresa_id;
  v_pode := public.vendas_mobile_pode_gerir_catalogo(v_empresa_id);
  return jsonb_build_object('base_receita',coalesce(v_base,'recebidos'),'pode_configurar',coalesce(v_pode,false),'empresa_id',v_empresa_id);
end;
$$;

revoke all on function public.meus_perfis_financeiros_vendas_mobile_rpc() from public;
grant execute on function public.meus_perfis_financeiros_vendas_mobile_rpc() to authenticated;
revoke all on function public.definir_perfil_financeiro_vendas_mobile_rpc(uuid) from public;
grant execute on function public.definir_perfil_financeiro_vendas_mobile_rpc(uuid) to authenticated;
