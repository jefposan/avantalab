-- Somente habilita auditoria de edição; não altera anúncios ou credenciais.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.marketplace_listing_actions drop constraint marketplace_listing_actions_action_check;
alter table public.marketplace_listing_actions add constraint marketplace_listing_actions_action_check
  check (action in ('pause', 'resume', 'close', 'delete', 'edit'));
-- Tentativas em andamento bloqueiam edição concorrente do mesmo anúncio.
-- Resultados incertos exigem releitura explícita na interface, sem reenvio automático.
-- Uma execução interrompida que permaneça requested exige reconciliação administrativa
-- com consulta do provedor antes de liberar o registro; nunca apagar o histórico.
create unique index marketplace_listing_edit_inflight_idx on public.marketplace_listing_actions(connection_id, provider_listing_id)
  where action = 'edit' and status = 'requested';
commit;
