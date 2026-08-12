-- A tabela faturamentos é um resumo derivado das entradas efetivadas.
-- Corrige registros históricos que ficaram com total e lista diferentes antes
-- da retirada do total mensal manual, sem apagar nenhuma receita existente.

-- Quando o total antigo for maior que a soma das entradas, preserva a diferença
-- como uma receita comum. Assim o histórico passa a ter origem, dia e valor.
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
where f.valor - coalesce(entradas.total, 0) > 0.009;

-- Em seguida, o resumo fica exatamente igual à soma das receitas efetivadas.
-- Isso também corrige o cenário inverso: entrada existente com total zerado.
update public.faturamentos f
set
  valor = coalesce((
    select sum(e.valor)
    from public.faturamentos_entradas e
    where e.empresa_id = f.empresa_id
      and e.ano = f.ano
      and e.mes = f.mes
      and coalesce(e.status, '') <> 'prevista'
  ), 0),
  referencia_total_mensal = false;
