-- Corrige a operação da fila do emissor já autorizado, sem alterar RLS,
-- vínculo de empresa, papel, credencial ou acesso a certificados/documentos.
-- Identidade da tarefa e conteúdo fiscal continuam sem permissão de UPDATE.
begin;

grant update (
  state, attempt_count, available_at, leased_at, lease_expires_at,
  worker_id, last_error_code, last_error_reason, completed_at, updated_at
) on fiscal_private.recovery_jobs to avanta_vendas_runtime;

commit;
