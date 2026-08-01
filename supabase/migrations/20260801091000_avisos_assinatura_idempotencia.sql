-- A notificacao tem uma chave tecnica por fatura, destinatario e marco.
-- Isso permite retomar uma execucao interrompida sem duplicar aviso ou push.
alter table public.notificacoes
  add column if not exists origem_id text,
  add column if not exists ref_data date;

create unique index if not exists notificacoes_origem_ref_uidx
  on public.notificacoes (origem_id, ref_data);

create index if not exists assinatura_avisos_empresa_criado_em_idx
  on public.assinatura_avisos (empresa_id, criado_em desc);
