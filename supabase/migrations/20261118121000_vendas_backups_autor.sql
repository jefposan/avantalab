begin;
set local lock_timeout='5s';
-- Conserva o backup fiscal sem impedir o fluxo existente de exclusão de conta.
alter table fiscal_private.note_backups alter column actor_id drop not null;
alter table fiscal_private.note_backups drop constraint note_backups_actor_id_fkey;
alter table fiscal_private.note_backups add constraint note_backups_actor_id_fkey
 foreign key(actor_id) references auth.users(id) on delete set null;
commit;
