-- Integra os resultados do Vendas Mobile ao faturamento do Gestão.
-- Cada lançamento de origem é recalculado imediatamente; a receita no Gestão
-- é controlada pelo sistema e não pode ser alterada manualmente.

alter table public.vendas_mobile_pedidos
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

alter table public.vendas_mobile_pagamentos
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists vendas_mobile_pedidos_empresa_data_idx
  on public.vendas_mobile_pedidos (empresa_id, criado_em desc);
create index if not exists vendas_mobile_pagamentos_empresa_data_idx
  on public.vendas_mobile_pagamentos (empresa_id, data_pagamento desc);

-- Registros antigos recebem a empresa ativa mais recente daquele vendedor.
update public.vendas_mobile_pedidos p
set empresa_id = (
  select a.empresa_id
  from public.vendas_mobile_acessos a
  where a.user_id = p.user_id and a.status = 'ativo'
  order by a.aprovado_em desc
  limit 1
)
where p.empresa_id is null;

update public.vendas_mobile_pagamentos p
set empresa_id = (
  select a.empresa_id
  from public.vendas_mobile_acessos a
  where a.user_id = p.user_id and a.status = 'ativo'
  order by a.aprovado_em desc
  limit 1
)
where p.empresa_id is null;

create or replace function public.preencher_empresa_lancamento_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.empresa_id is null then
    select a.empresa_id into new.empresa_id
    from public.vendas_mobile_acessos a
    where a.user_id = new.user_id and a.status = 'ativo'
    order by a.aprovado_em desc
    limit 1;
  end if;
  if new.empresa_id is null then
    raise exception 'Não foi possível identificar a empresa vinculada ao Vendas Mobile.';
  end if;
  return new;
end;
$$;

drop trigger if exists vendas_mobile_pedidos_empresa_trigger on public.vendas_mobile_pedidos;
create trigger vendas_mobile_pedidos_empresa_trigger
before insert on public.vendas_mobile_pedidos
for each row execute function public.preencher_empresa_lancamento_vendas_mobile();

drop trigger if exists vendas_mobile_pagamentos_empresa_trigger on public.vendas_mobile_pagamentos;
create trigger vendas_mobile_pagamentos_empresa_trigger
before insert on public.vendas_mobile_pagamentos
for each row execute function public.preencher_empresa_lancamento_vendas_mobile();

create table if not exists public.vendas_mobile_integracao_gestao (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  base_receita text not null default 'recebidos'
    check (base_receita in ('recebidos', 'vendidos')),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);

create table if not exists public.vendas_mobile_receitas_gestao (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  data_referencia date not null,
  faturamento_entrada_id uuid not null unique references public.faturamentos_entradas(id) on delete cascade,
  primary key (empresa_id, data_referencia)
);

alter table public.vendas_mobile_integracao_gestao enable row level security;
alter table public.vendas_mobile_receitas_gestao enable row level security;

drop policy if exists vendas_integracao_gestao_leitura on public.vendas_mobile_integracao_gestao;
create policy vendas_integracao_gestao_leitura on public.vendas_mobile_integracao_gestao
  for select to authenticated using (
    public.vendas_mobile_pode_gerir_catalogo(empresa_id)
    or exists (select 1 from public.vendas_mobile_acessos a where a.empresa_id = vendas_mobile_integracao_gestao.empresa_id and a.user_id = auth.uid() and a.status = 'ativo')
  );

create or replace function public.proteger_receita_vendas_mobile_gestao()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('app.vendas_mobile_sync', true) = '1' then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' and new.tipo_obs = 'vendas_mobile_sistema' then
    raise exception 'A receita do Vendas Mobile é atualizada automaticamente.';
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.tipo_obs = 'vendas_mobile_sistema' then
    raise exception 'A receita do Vendas Mobile é atualizada automaticamente.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists proteger_receita_vendas_mobile_gestao_trigger on public.faturamentos_entradas;
create trigger proteger_receita_vendas_mobile_gestao_trigger
before insert or update or delete on public.faturamentos_entradas
for each row execute function public.proteger_receita_vendas_mobile_gestao();

create or replace function public.sincronizar_receita_vendas_mobile_gestao(
  p_empresa_id uuid,
  p_data date
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_valor numeric(12,2) := 0;
  v_entrada_id uuid;
  v_valor_anterior numeric(12,2) := 0;
  v_ano integer := extract(year from p_data);
  v_mes text := (array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[extract(month from p_data)::integer];
begin
  if p_empresa_id is null or p_data is null then return; end if;
  select base_receita into v_base from public.vendas_mobile_integracao_gestao where empresa_id = p_empresa_id;
  v_base := coalesce(v_base, 'recebidos');

  if v_base = 'recebidos' then
    select coalesce(sum(p.valor), 0) into v_valor
    from public.vendas_mobile_pagamentos p
    where p.empresa_id = p_empresa_id and p.data_pagamento = p_data;
  else
    select coalesce(sum(p.total), 0) into v_valor
    from public.vendas_mobile_pedidos p
    where p.empresa_id = p_empresa_id
      and (p.criado_em at time zone 'America/Sao_Paulo')::date = p_data
      and coalesce(lower(p.status), '') not in ('cancelada', 'convertida')
      and coalesce(lower(p.forma_pagamento), '') not like '%consign%'
      and coalesce(p.total, 0) > 0;
  end if;

  perform set_config('app.vendas_mobile_sync', '1', true);
  select faturamento_entrada_id into v_entrada_id
  from public.vendas_mobile_receitas_gestao
  where empresa_id = p_empresa_id and data_referencia = p_data;

  if v_entrada_id is not null then
    select valor into v_valor_anterior from public.faturamentos_entradas where id = v_entrada_id;
    v_valor_anterior := coalesce(v_valor_anterior, 0);
  end if;

  if v_valor <= 0 then
    if v_entrada_id is not null then
      delete from public.faturamentos_entradas where id = v_entrada_id;
      delete from public.vendas_mobile_receitas_gestao where empresa_id = p_empresa_id and data_referencia = p_data;
      insert into public.faturamentos (empresa_id, ano, mes, valor)
      values (p_empresa_id, v_ano, v_mes, greatest(0, -v_valor_anterior))
      on conflict (empresa_id, ano, mes) do update set valor = greatest(0, public.faturamentos.valor - v_valor_anterior);
    end if;
    return;
  end if;

  if v_entrada_id is null then
    insert into public.faturamentos_entradas (empresa_id, ano, mes, dia, origem, valor, status, tipo_obs, criado_por)
    values (p_empresa_id, v_ano, v_mes, extract(day from p_data)::integer, 'Vendas Mobile', v_valor, null, 'vendas_mobile_sistema', null)
    returning id into v_entrada_id;
    insert into public.vendas_mobile_receitas_gestao (empresa_id, data_referencia, faturamento_entrada_id)
    values (p_empresa_id, p_data, v_entrada_id);
  else
    update public.faturamentos_entradas
    set ano = v_ano, mes = v_mes, dia = extract(day from p_data)::integer, origem = 'Vendas Mobile', valor = v_valor, status = null, tipo_obs = 'vendas_mobile_sistema'
    where id = v_entrada_id;
  end if;

  insert into public.faturamentos (empresa_id, ano, mes, valor)
  values (p_empresa_id, v_ano, v_mes, greatest(0, v_valor - v_valor_anterior))
  on conflict (empresa_id, ano, mes) do update set valor = greatest(0, public.faturamentos.valor + (v_valor - v_valor_anterior));
end;
$$;

create or replace function public.disparar_sincronizacao_receita_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
  v_data_antiga date;
  v_data_nova date;
begin
  if tg_op = 'INSERT' then
    v_empresa_id := new.empresa_id;
  elsif tg_op = 'DELETE' then
    v_empresa_id := old.empresa_id;
  else
    v_empresa_id := new.empresa_id;
  end if;
  if tg_table_name = 'vendas_mobile_pagamentos' then
    if tg_op <> 'INSERT' then v_data_antiga := old.data_pagamento; end if;
    if tg_op <> 'DELETE' then v_data_nova := new.data_pagamento; end if;
  else
    if tg_op <> 'INSERT' then v_data_antiga := (old.criado_em at time zone 'America/Sao_Paulo')::date; end if;
    if tg_op <> 'DELETE' then v_data_nova := (new.criado_em at time zone 'America/Sao_Paulo')::date; end if;
  end if;
  if v_data_antiga is not null then perform public.sincronizar_receita_vendas_mobile_gestao(v_empresa_id, v_data_antiga); end if;
  if v_data_nova is not null and v_data_nova is distinct from v_data_antiga then perform public.sincronizar_receita_vendas_mobile_gestao(v_empresa_id, v_data_nova); end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sincronizar_receita_vendas_mobile_pedidos_trigger on public.vendas_mobile_pedidos;
create trigger sincronizar_receita_vendas_mobile_pedidos_trigger
after insert or update or delete on public.vendas_mobile_pedidos
for each row execute function public.disparar_sincronizacao_receita_vendas_mobile();

drop trigger if exists sincronizar_receita_vendas_mobile_pagamentos_trigger on public.vendas_mobile_pagamentos;
create trigger sincronizar_receita_vendas_mobile_pagamentos_trigger
after insert or update or delete on public.vendas_mobile_pagamentos
for each row execute function public.disparar_sincronizacao_receita_vendas_mobile();

create or replace function public.configurar_integracao_gestao_vendas_mobile_rpc(p_base_receita text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
  v_data date;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_base_receita not in ('recebidos', 'vendidos') then raise exception 'Base de receita inválida.'; end if;
  select a.empresa_id into v_empresa_id from public.vendas_mobile_acessos a
  where a.user_id = auth.uid() and a.status = 'ativo' order by a.aprovado_em desc limit 1;
  if v_empresa_id is null or not public.vendas_mobile_pode_gerir_catalogo(v_empresa_id) then
    raise exception 'Somente o gestor da empresa pode alterar esta integração.';
  end if;
  insert into public.vendas_mobile_integracao_gestao (empresa_id, base_receita, atualizado_por)
  values (v_empresa_id, p_base_receita, auth.uid())
  on conflict (empresa_id) do update set base_receita = excluded.base_receita, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  for v_data in
    select distinct data_referencia from (
      select data_pagamento as data_referencia from public.vendas_mobile_pagamentos where empresa_id = v_empresa_id
      union
      select (criado_em at time zone 'America/Sao_Paulo')::date from public.vendas_mobile_pedidos where empresa_id = v_empresa_id
      union
      select data_referencia from public.vendas_mobile_receitas_gestao where empresa_id = v_empresa_id
    ) datas where data_referencia is not null
  loop
    perform public.sincronizar_receita_vendas_mobile_gestao(v_empresa_id, v_data);
  end loop;
  return jsonb_build_object('base_receita', p_base_receita, 'pode_configurar', true);
end;
$$;

create or replace function public.obter_integracao_gestao_vendas_mobile_rpc()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_empresa_id uuid; v_base text; v_pode boolean;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  select empresa_id into v_empresa_id from public.vendas_mobile_acessos where user_id = auth.uid() and status = 'ativo' order by aprovado_em desc limit 1;
  if v_empresa_id is null then return jsonb_build_object('base_receita','recebidos','pode_configurar',false); end if;
  select base_receita into v_base from public.vendas_mobile_integracao_gestao where empresa_id = v_empresa_id;
  v_pode := public.vendas_mobile_pode_gerir_catalogo(v_empresa_id);
  return jsonb_build_object('base_receita', coalesce(v_base, 'recebidos'), 'pode_configurar', coalesce(v_pode, false));
end;
$$;

revoke all on function public.configurar_integracao_gestao_vendas_mobile_rpc(text) from public;
grant execute on function public.configurar_integracao_gestao_vendas_mobile_rpc(text) to authenticated;
revoke all on function public.obter_integracao_gestao_vendas_mobile_rpc() from public;
grant execute on function public.obter_integracao_gestao_vendas_mobile_rpc() to authenticated;

-- Inicializa a preferência padrão e sincroniza o histórico de recebimentos.
insert into public.vendas_mobile_integracao_gestao (empresa_id, base_receita)
select distinct empresa_id, 'recebidos' from public.vendas_mobile_pagamentos where empresa_id is not null
on conflict (empresa_id) do nothing;

do $$
declare r record;
begin
  for r in select distinct empresa_id, data_pagamento from public.vendas_mobile_pagamentos where empresa_id is not null loop
    perform public.sincronizar_receita_vendas_mobile_gestao(r.empresa_id, r.data_pagamento);
  end loop;
end;
$$;
