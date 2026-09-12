-- Cada perfil com Centros de custo ativos possui sempre o centro Principal.
-- Lançamentos e receitas passam a pertencer obrigatoriamente a um dos contextos.
alter table public.centros_custo add column if not exists is_principal boolean not null default false;
alter table public.faturamentos_entradas add column if not exists centro_custo_id uuid references public.centros_custo(id) on delete restrict;

create unique index if not exists centros_custo_um_principal_por_empresa_idx
  on public.centros_custo (empresa_id) where is_principal;
create index if not exists faturamentos_entradas_empresa_centro_periodo_idx
  on public.faturamentos_entradas (empresa_id, centro_custo_id, ano, mes);

create or replace function public.garantir_centro_custo_principal(p_empresa_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_centro_id uuid;
begin
  if not exists (
    select 1 from public.usuarios_empresa ue
    where ue.empresa_id = p_empresa_id and ue.user_id = auth.uid() and ue.status = 'ativo'
  ) then
    raise exception 'Sem acesso ao perfil.';
  end if;

  select id into v_centro_id
  from public.centros_custo
  where empresa_id = p_empresa_id and is_principal = true
  limit 1;

  if v_centro_id is null then
    select id into v_centro_id
    from public.centros_custo
    where empresa_id = p_empresa_id and lower(btrim(nome)) = 'principal'
    limit 1;

    if v_centro_id is not null then
      update public.centros_custo set is_principal = true, ativo = true where id = v_centro_id;
    else
      insert into public.centros_custo (empresa_id, nome, ativo, is_principal)
      values (p_empresa_id, 'Principal', true, true)
      returning id into v_centro_id;
    end if;
  end if;

  return v_centro_id;
end;
$$;

create or replace function public.ativar_contextos_centros_custo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_centro_principal uuid;
begin
  if new.centros_custo_ativo = true and coalesce(old.centros_custo_ativo, false) = false then
    v_centro_principal := public.garantir_centro_custo_principal(new.empresa_id);
    update public.lancamentos set centro_custo_id = v_centro_principal
      where empresa_id = new.empresa_id and centro_custo_id is null;
    update public.recorrencias set centro_custo_id = v_centro_principal
      where empresa_id = new.empresa_id and centro_custo_id is null;
    perform set_config('app.recebimentos_sync', '1', true);
    perform set_config('app.vendas_servicos_sync', '1', true);
    perform set_config('app.vendas_mobile_sync', '1', true);
    update public.faturamentos_entradas set centro_custo_id = v_centro_principal
      where empresa_id = new.empresa_id and centro_custo_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists configuracoes_ativar_contextos_centros_custo on public.configuracoes;
create trigger configuracoes_ativar_contextos_centros_custo
after insert or update of centros_custo_ativo on public.configuracoes
for each row execute function public.ativar_contextos_centros_custo();

create or replace function public.proteger_centro_custo_principal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' and old.is_principal then
    raise exception 'O centro Principal não pode ser removido.';
  end if;
  if tg_op = 'UPDATE' and old.is_principal and (new.is_principal = false or new.ativo = false or new.nome <> old.nome) then
    raise exception 'O centro Principal deve permanecer ativo e com este nome.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists centros_custo_proteger_principal on public.centros_custo;
create trigger centros_custo_proteger_principal
before update or delete on public.centros_custo
for each row execute function public.proteger_centro_custo_principal();

create or replace function public.validar_centro_custo_receita_do_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.centro_custo_id is not null and not exists (
    select 1 from public.centros_custo c
    where c.id = new.centro_custo_id and c.empresa_id = new.empresa_id
  ) then
    raise exception 'Centro de custo inválido para este perfil.';
  end if;
  return new;
end;
$$;

drop trigger if exists faturamentos_entradas_validar_centro_custo on public.faturamentos_entradas;
create trigger faturamentos_entradas_validar_centro_custo
before insert or update of empresa_id, centro_custo_id on public.faturamentos_entradas
for each row execute function public.validar_centro_custo_receita_do_perfil();

create or replace function public.recalcular_faturamento_apos_receita_de_centro()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid := coalesce(new.empresa_id, old.empresa_id);
  v_ano integer := coalesce(new.ano, old.ano);
  v_mes text := coalesce(new.mes, old.mes);
  v_total numeric;
begin
  if coalesce(new.centro_custo_id, old.centro_custo_id) is null then return coalesce(new, old); end if;
  select coalesce(sum(valor), 0) into v_total
  from public.faturamentos_entradas
  where empresa_id = v_empresa_id and ano = v_ano and mes = v_mes and coalesce(status, '') <> 'prevista';
  insert into public.faturamentos (empresa_id, ano, mes, valor, referencia_total_mensal)
  values (v_empresa_id, v_ano, v_mes, v_total, false)
  on conflict (empresa_id, ano, mes) do update set valor = excluded.valor, referencia_total_mensal = false;
  return coalesce(new, old);
end;
$$;

drop trigger if exists faturamentos_entradas_recalcular_centro on public.faturamentos_entradas;
create trigger faturamentos_entradas_recalcular_centro
after insert or update or delete on public.faturamentos_entradas
for each row execute function public.recalcular_faturamento_apos_receita_de_centro();

-- Perfis já configurados recebem o Principal e preservam todo o histórico nele.
do $$
declare v_config record; v_centro uuid;
begin
  perform set_config('app.recebimentos_sync', '1', true);
  perform set_config('app.vendas_servicos_sync', '1', true);
  perform set_config('app.vendas_mobile_sync', '1', true);
  for v_config in select empresa_id from public.configuracoes where centros_custo_ativo = true loop
    select id into v_centro from public.centros_custo
      where empresa_id = v_config.empresa_id and is_principal = true limit 1;
    if v_centro is null then
      select id into v_centro from public.centros_custo
        where empresa_id = v_config.empresa_id and lower(btrim(nome)) = 'principal' limit 1;
      if v_centro is not null then
        update public.centros_custo set is_principal = true, ativo = true where id = v_centro;
      else
        insert into public.centros_custo (empresa_id, nome, ativo, is_principal)
        values (v_config.empresa_id, 'Principal', true, true) returning id into v_centro;
      end if;
    end if;
    update public.lancamentos set centro_custo_id = v_centro where empresa_id = v_config.empresa_id and centro_custo_id is null;
    update public.recorrencias set centro_custo_id = v_centro where empresa_id = v_config.empresa_id and centro_custo_id is null;
    update public.faturamentos_entradas set centro_custo_id = v_centro where empresa_id = v_config.empresa_id and centro_custo_id is null;
  end loop;
end;
$$;
