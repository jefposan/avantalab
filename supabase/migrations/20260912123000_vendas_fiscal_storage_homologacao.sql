-- Guarda privada dos artefatos de NF-e do piloto controlado de homologação.
-- O navegador não recebe políticas de leitura ou escrita; todo acesso passa
-- pelo runtime server-side autenticado do módulo Vendas e Serviços.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avantalab-fiscal-private',
  'avantalab-fiscal-private',
  false,
  10485760,
  array['application/xml', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- A ausência intencional de policies para anon/authenticated mantém o bucket
-- inacessível ao cliente. O service role é usado somente dentro das rotas
-- protegidas e os objetos recebem caminhos físicos únicos por SHA-256.
