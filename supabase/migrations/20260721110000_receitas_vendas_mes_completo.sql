-- A receita automática do Vendas representa a competência completa de cada
-- mês. A interface continua impedindo novos pagamentos em data futura, mas um
-- dado antigo, importado ou corrigido manualmente nunca pode desaparecer da
-- soma por estar depois da data atual.
create or replace function public.sincronizar_receita_vendas_mobile_gestao(
  p_empresa_id uuid,
  p_data date default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_dia_atual integer := extract(day from (now() at time zone 'America/Sao_Paulo'))::integer;
  v_entrada record;
  v_mes_reg record;
  v_nova_entrada_id uuid;
  v_data_referencia date;
  v_dia integer;
begin
  if p_empresa_id is null then return; end if;

  select base_receita into v_base
  from public.vendas_mobile_integracao_gestao
  where empresa_id = p_empresa_id;
  v_base := coalesce(v_base, 'recebidos');

  perform set_config('app.vendas_mobile_sync', '1', true);

  -- Remove a consolidação anterior e desconta seus valores antes de recriar
  -- cada mês com a fonte completa de pedidos ou recebimentos.
  for v_entrada in
    select e.id, e.ano, e.mes, e.valor
    from public.vendas_mobile_receitas_gestao r
    join public.faturamentos_entradas e on e.id = r.faturamento_entrada_id
    where r.empresa_id = p_empresa_id
  loop
    delete from public.faturamentos_entradas where id = v_entrada.id;
    insert into public.faturamentos (empresa_id, ano, mes, valor)
    values (p_empresa_id, v_entrada.ano, v_entrada.mes, greatest(0, -coalesce(v_entrada.valor, 0)))
    on conflict (empresa_id, ano, mes) do update
      set valor = greatest(0, public.faturamentos.valor - coalesce(v_entrada.valor, 0));
  end loop;

  for v_mes_reg in
    select
      extract(year from referencia)::integer as ano,
      extract(month from referencia)::integer as numero_mes,
      (array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[extract(month from referencia)::integer] as mes,
      sum(valor)::numeric(12,2) as valor
    from (
      select p.data_pagamento as referencia, p.valor
      from public.vendas_mobile_pagamentos p
      where v_base = 'recebidos'
        and p.empresa_id = p_empresa_id

      union all

      select (p.criado_em at time zone 'America/Sao_Paulo')::date as referencia, p.total as valor
      from public.vendas_mobile_pedidos p
      where v_base = 'vendidos'
        and p.empresa_id = p_empresa_id
        and coalesce(lower(p.status), '') not in ('cancelada', 'convertida')
        and coalesce(lower(p.forma_pagamento), '') not like '%consign%'
        and coalesce(p.total, 0) > 0
    ) origem
    where referencia is not null
    group by extract(year from referencia), extract(month from referencia)
    having sum(valor) > 0
    order by extract(year from referencia), extract(month from referencia)
  loop
    v_dia := least(v_dia_atual, extract(day from (make_date(v_mes_reg.ano, v_mes_reg.numero_mes, 1) + interval '1 month - 1 day'))::integer);
    v_data_referencia := make_date(v_mes_reg.ano, v_mes_reg.numero_mes, v_dia);

    insert into public.faturamentos_entradas (empresa_id, ano, mes, dia, origem, valor, status, tipo_obs, criado_por)
    values (p_empresa_id, v_mes_reg.ano, v_mes_reg.mes, v_dia, 'Vendas Mobile', v_mes_reg.valor, null, 'vendas_mobile_sistema', null)
    returning id into v_nova_entrada_id;

    insert into public.vendas_mobile_receitas_gestao (empresa_id, data_referencia, faturamento_entrada_id)
    values (p_empresa_id, v_data_referencia, v_nova_entrada_id);

    insert into public.faturamentos (empresa_id, ano, mes, valor)
    values (p_empresa_id, v_mes_reg.ano, v_mes_reg.mes, v_mes_reg.valor)
    on conflict (empresa_id, ano, mes) do update
      set valor = public.faturamentos.valor + v_mes_reg.valor;
  end loop;
end;
$$;

-- Recalcula também os meses já existentes para corrigir imediatamente os
-- totais da Gestão Web e da Gestão Mobile.
do $$
declare r record;
begin
  for r in
    select distinct empresa_id from (
      select empresa_id from public.vendas_mobile_receitas_gestao
      union select empresa_id from public.vendas_mobile_pagamentos where empresa_id is not null
      union select empresa_id from public.vendas_mobile_pedidos where empresa_id is not null
    ) empresas
  loop
    perform public.sincronizar_receita_vendas_mobile_gestao(r.empresa_id, null);
  end loop;
end;
$$;
