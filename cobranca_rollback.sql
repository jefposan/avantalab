-- ─────────────────────────────────────────────────────────────
-- DESFAZER a cobrança (remove as 3 tabelas novas).
-- Só use se quiser reverter o cobranca_setup.sql.
-- Não afeta nenhuma tabela existente do sistema.
-- A ordem respeita as dependências (resgates e assinaturas antes de cupons).
-- ─────────────────────────────────────────────────────────────

drop table if exists public.cupons_resgates;
drop table if exists public.assinaturas;
drop table if exists public.cupons;
