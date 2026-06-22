-- ─────────────────────────────────────────────────────────────
-- Disparo de avisos para todos os usuarios (broadcast / novidades)
-- ─────────────────────────────────────────────────────────────

-- Avisos globais (novidades) nao pertencem a uma empresa especifica.
-- Liberamos empresa_id para aceitar nulo nesses casos.
alter table public.notificacoes
  alter column empresa_id drop not null;
