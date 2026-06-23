-- AvantaLab — ordem dos cards do dashboard web (kanban), salva por perfil.
-- Rode no SQL Editor do Supabase antes de publicar.

alter table public.configuracoes
  add column if not exists dashboard_ordem_web jsonb;

comment on column public.configuracoes.dashboard_ordem_web is
  'Ordem preferida dos cards reordenaveis do dashboard web (kanban), por perfil/empresa. Array de ids, ex: ["aConfirmar","saldo","resumoFinanceiro","registrarEntradas"].';
