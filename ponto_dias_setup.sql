-- ─────────────────────────────────────────────────────────────
-- Controle de Ponto — dias da semana trabalhados (para contar faltas)
-- 0 = domingo, 1 = segunda ... 6 = sábado (padrão JS getDay()).
-- Rodar no SQL Editor do Supabase (depois de ponto_setup.sql).
-- ─────────────────────────────────────────────────────────────

alter table public.ponto_funcionarios
  add column if not exists dias_trabalho smallint[] not null default '{1,2,3,4,5}';
