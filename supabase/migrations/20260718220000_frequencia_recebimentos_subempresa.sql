-- Substitui a configuração de dia fixo por frequência de recebimento.
-- O campo anterior é preservado para compatibilidade histórica; registros já
-- cadastrados passam a ser mensais até que o gestor os atualize.

alter table public.recebimentos_subempresas
  add column if not exists frequencia_recebimento text;

update public.recebimentos_subempresas
set frequencia_recebimento = 'mensal'
where frequencia_recebimento is null;

alter table public.recebimentos_subempresas
  alter column frequencia_recebimento set default 'mensal',
  alter column frequencia_recebimento set not null;

alter table public.recebimentos_subempresas
  drop constraint if exists recebimentos_subempresas_frequencia_recebimento_check;

alter table public.recebimentos_subempresas
  add constraint recebimentos_subempresas_frequencia_recebimento_check
  check (frequencia_recebimento in ('semanal', 'quinzenal', 'mensal', 'trimestral', 'semestral', 'anual'));
