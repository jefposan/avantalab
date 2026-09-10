-- Agendamentos manuais de serviço são independentes da frequência contratada
-- e nunca escrevem em lançamentos ou históricos financeiros.

alter table public.recebimentos_colaboradores
  add column if not exists pode_agendamentos boolean not null default false;

alter table public.recebimentos_servicos
  add column if not exists tipo_servico text not null default 'rotina'
  check (tipo_servico in ('rotina', 'interna', 'revisao', 'extra'));

-- Um local pode ter a rotina e um ou mais atendimentos manuais na mesma data.
-- A chave anterior não distinguia esses casos.
drop index if exists public.recebimentos_servicos_programacao_uidx;
create unique index if not exists recebimentos_servicos_programacao_tipo_uidx
  on public.recebimentos_servicos (
    empresa_id,
    recebimento_empresa_id,
    coalesce(subempresa_id, '00000000-0000-0000-0000-000000000000'::uuid),
    data_programada,
    tipo_servico
  );

create index if not exists recebimentos_servicos_manuais_idx
  on public.recebimentos_servicos (empresa_id, data_programada, situacao)
  where tipo_servico <> 'rotina';

comment on column public.recebimentos_colaboradores.pode_agendamentos is
  'Permite que o colaborador crie agendamentos manuais de serviços no PWA.';
comment on column public.recebimentos_servicos.tipo_servico is
  'rotina para frequência contratada; interna, revisao ou extra para agendamento manual.';
