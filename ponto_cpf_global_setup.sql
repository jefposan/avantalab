-- ─────────────────────────────────────────────────────────────
-- Controle de Ponto — CPF único GLOBAL (um CPF = uma empresa)
-- Necessário para o login único em /ponto resolver a empresa pelo CPF.
-- Rodar no SQL Editor do Supabase.
-- ─────────────────────────────────────────────────────────────

-- Remove a unicidade por empresa (se existir) e cria unicidade global.
drop index if exists public.ponto_funcionarios_empresa_cpf_idx;

create unique index if not exists ponto_funcionarios_cpf_unique
  on public.ponto_funcionarios(cpf)
  where cpf is not null;
