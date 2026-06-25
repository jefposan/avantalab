-- ─────────────────────────────────────────────────────────────
-- Controle de Ponto — CPF do funcionário (usado como login, único)
-- Rodar no SQL Editor do Supabase (depois de ponto_setup.sql).
-- ─────────────────────────────────────────────────────────────

alter table public.ponto_funcionarios
  add column if not exists cpf text;

-- CPF único por empresa (permite o mesmo CPF em empresas diferentes).
create unique index if not exists ponto_funcionarios_empresa_cpf_idx
  on public.ponto_funcionarios(empresa_id, cpf)
  where cpf is not null;
