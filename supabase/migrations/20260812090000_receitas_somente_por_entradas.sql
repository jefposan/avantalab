-- Remove o conceito operacional de total mensal manual sem perder valores.
-- A parcela do faturamento que ainda não possui origem vira uma entrada comum,
-- editável e excluível pelos mesmos fluxos das demais receitas.
insert into public.faturamentos_entradas (
  empresa_id,
  ano,
  mes,
  dia,
  origem,
  valor,
  status,
  tipo_obs,
  criado_por
)
select
  f.empresa_id,
  f.ano,
  f.mes,
  1,
  'Receita registrada anteriormente',
  greatest(0, f.valor - coalesce(entradas.total, 0)),
  null,
  'total_mensal_convertido',
  null
from public.faturamentos f
left join lateral (
  select sum(e.valor) as total
  from public.faturamentos_entradas e
  where e.empresa_id = f.empresa_id
    and e.ano = f.ano
    and e.mes = f.mes
    and coalesce(e.status, '') <> 'prevista'
) entradas on true
where f.referencia_total_mensal
  and f.valor - coalesce(entradas.total, 0) > 0.009
  and not exists (
    select 1
    from public.faturamentos_entradas existente
    where existente.empresa_id = f.empresa_id
      and existente.ano = f.ano
      and existente.mes = f.mes
      and existente.tipo_obs = 'total_mensal_convertido'
  );

update public.faturamentos
set referencia_total_mensal = false
where referencia_total_mensal;
