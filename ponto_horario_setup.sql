-- ─────────────────────────────────────────────────────────────
-- Controle de Ponto — horário previsto do funcionário (pontualidade)
-- Rodar no SQL Editor do Supabase (depois de ponto_setup.sql).
-- ─────────────────────────────────────────────────────────────

-- Horário previsto de entrada e saída (par único, igual todos os dias).
alter table public.ponto_funcionarios
  add column if not exists hora_entrada time,
  add column if not exists hora_saida   time;
