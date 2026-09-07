-- Estornos comerciais preservam o rascunho fiscal imutavel e registram o
-- cancelamento em uma tabela apensada. Aplicar somente após backup e homologação.

begin;

create table public.vendas_fiscal_rascunho_cancelamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  rascunho_id uuid not null,
  operacao_id uuid not null,
  motivo text not null check (char_length(trim(motivo)) between 5 and 1000),
  chave_idempotencia text not null,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, rascunho_id),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, rascunho_id) references public.vendas_fiscal_rascunhos(empresa_id, id) on delete restrict,
  foreign key (empresa_id, operacao_id) references public.vendas_operacoes(empresa_id, id) on delete restrict
);

create trigger vendas_fiscal_rascunho_cancelamentos_immutable
before update or delete on public.vendas_fiscal_rascunho_cancelamentos
for each row execute function public.vendas_rejeitar_alteracao_imutavel();

alter table public.vendas_fiscal_rascunho_cancelamentos enable row level security;
alter table public.vendas_fiscal_rascunho_cancelamentos force row level security;
revoke all on table public.vendas_fiscal_rascunho_cancelamentos from public, anon, authenticated;
grant select,insert on table public.vendas_fiscal_rascunho_cancelamentos to service_role;

comment on table public.vendas_fiscal_rascunho_cancelamentos is
  'Marcador imutavel de cancelamento do rascunho comercial; nao cancela documento fiscal autorizado.';

-- Evidências privadas das ordens de serviço. O conteúdo pertence ao perfil
-- empresarial e nunca recebe URL pública permanente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendas-os-anexos',
  'vendas-os-anexos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.vendas_remover_arquivo_anexo_os()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = 'vendas-os-anexos'
    and name = old.referencia_storage;
  return old;
end;
$$;

drop trigger if exists vendas_remover_arquivo_anexo_os_trigger on public.vendas_os_anexos;
create trigger vendas_remover_arquivo_anexo_os_trigger
after delete on public.vendas_os_anexos
for each row execute function public.vendas_remover_arquivo_anexo_os();

revoke all on function public.vendas_remover_arquivo_anexo_os() from public, authenticated;

create or replace function public.vendas_validar_limite_anexos_os()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('vendas:os:anexos:' || new.empresa_id::text || ':' || new.operacao_id::text, 0));
  if (select count(*) from public.vendas_os_anexos where empresa_id = new.empresa_id and operacao_id = new.operacao_id) >= 5 then
    raise exception 'AV-SERVICE-ATTACHMENT-LIMIT';
  end if;
  if new.tipo_mime not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') or new.tamanho_bytes > 10485760 then
    raise exception 'AV-SERVICE-ATTACHMENT-TYPE';
  end if;
  return new;
end;
$$;

drop trigger if exists vendas_validar_limite_anexos_os_trigger on public.vendas_os_anexos;
create trigger vendas_validar_limite_anexos_os_trigger
before insert on public.vendas_os_anexos
for each row execute function public.vendas_validar_limite_anexos_os();

revoke all on function public.vendas_validar_limite_anexos_os() from public, authenticated;

commit;
