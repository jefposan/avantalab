-- ─────────────────────────────────────────────────────────────
-- RECEITAS PREVISTAS: entradas de faturamento com data futura viram "previstas".
-- Rode este script inteiro no SQL Editor do painel do Supabase.
--
-- status:  'prevista' enquanto nao confirmada; NULL/'confirmada' quando efetivada.
-- tipo_obs: 'previsto' para exibir o badge (igual as despesas).
-- ─────────────────────────────────────────────────────────────

alter table public.faturamentos_entradas
  add column if not exists status text;

alter table public.faturamentos_entradas
  add column if not exists tipo_obs text;
