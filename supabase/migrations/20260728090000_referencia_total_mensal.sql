-- Distingue o total definido manualmente do total agregado pelas receitas.
alter table public.faturamentos
  add column if not exists referencia_total_mensal boolean not null default false;

-- Mantém visíveis as referências manuais já existentes: antes desta migração,
-- elas eram representadas pela parcela do faturamento acima das receitas
-- efetivadas do próprio mês.
update public.faturamentos f
set referencia_total_mensal = true
where not f.referencia_total_mensal
  and f.valor > coalesce((
    select sum(e.valor)
    from public.faturamentos_entradas e
    where e.empresa_id = f.empresa_id
      and e.ano = f.ano
      and e.mes = f.mes
      and coalesce(e.status, '') <> 'prevista'
  ), 0) + 0.009;
