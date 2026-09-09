-- Assinaturas de serviços passam a ter cópia PNG privada no Storage.
-- O campo legado `assinatura` permanece intacto para preservar o histórico.

alter table public.recebimentos_servicos
  add column if not exists assinatura_arquivo_path text;

create index if not exists recebimentos_servicos_realizados_em_idx
  on public.recebimentos_servicos (empresa_id, realizado_em desc)
  where situacao = 'realizado';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assinaturas-servicos', 'assinaturas-servicos', false, 1048576, array['image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

comment on column public.recebimentos_servicos.assinatura_arquivo_path is
  'Caminho privado do PNG da assinatura no bucket assinaturas-servicos; assinatura legada permanece preservada.';
