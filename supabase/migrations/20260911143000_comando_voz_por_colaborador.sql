-- Permissão individual e opt-out para o comando por voz em Operações de Campo.
-- O default true preserva o comportamento de todos os colaboradores existentes.
alter table public.recebimentos_colaboradores
  add column if not exists pode_comando_voz boolean not null default true;

comment on column public.recebimentos_colaboradores.pode_comando_voz is
  'Autoriza e exibe as ações por voz no PWA Operações em Campo.';
