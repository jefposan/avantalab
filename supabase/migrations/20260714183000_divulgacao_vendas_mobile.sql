-- Estrutura de divulgacao por empresa para o App Vendas.
-- O identificador do modulo e tecnico; o nome comercial pode ser alterado depois.

insert into public.modulos (id, nome, descricao, icone, perfis, ordem)
values (
  'vendas_mobile',
  'Vendas Mobile',
  'Novidades e materiais de divulgação para a equipe comercial.',
  'vendas',
  '{empresa}',
  2
)
on conflict (id) do update set
  descricao = excluded.descricao,
  icone = excluded.icone,
  perfis = excluded.perfis,
  ordem = excluded.ordem;

create table if not exists public.vendas_mobile_divulgacao_pastas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_divulgacao_materiais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  pasta_id uuid not null references public.vendas_mobile_divulgacao_pastas(id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('imagem', 'video')),
  arquivo_path text not null,
  arquivo_url text not null,
  miniatura_path text,
  miniatura_url text,
  mime_type text,
  tamanho_bytes bigint,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists vendas_divulgacao_pastas_empresa_idx
  on public.vendas_mobile_divulgacao_pastas (empresa_id, ordem, criado_em desc);
create index if not exists vendas_divulgacao_materiais_pasta_idx
  on public.vendas_mobile_divulgacao_materiais (pasta_id, ordem, criado_em desc);

alter table public.vendas_mobile_divulgacao_pastas enable row level security;
alter table public.vendas_mobile_divulgacao_materiais enable row level security;

drop policy if exists vendas_divulgacao_pastas_leitura on public.vendas_mobile_divulgacao_pastas;
create policy vendas_divulgacao_pastas_leitura
  on public.vendas_mobile_divulgacao_pastas for select to authenticated
  using (
    empresa_id in (
      select a.empresa_id from public.vendas_mobile_acessos a
      where a.user_id = auth.uid() and a.status = 'ativo'
      union
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid() and ue.status = 'ativo'
    )
  );

drop policy if exists vendas_divulgacao_materiais_leitura on public.vendas_mobile_divulgacao_materiais;
create policy vendas_divulgacao_materiais_leitura
  on public.vendas_mobile_divulgacao_materiais for select to authenticated
  using (
    empresa_id in (
      select a.empresa_id from public.vendas_mobile_acessos a
      where a.user_id = auth.uid() and a.status = 'ativo'
      union
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid() and ue.status = 'ativo'
    )
  );

drop policy if exists vendas_divulgacao_pastas_gestao on public.vendas_mobile_divulgacao_pastas;
create policy vendas_divulgacao_pastas_gestao
  on public.vendas_mobile_divulgacao_pastas for all to authenticated
  using (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ))
  with check (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ));

drop policy if exists vendas_divulgacao_materiais_gestao on public.vendas_mobile_divulgacao_materiais;
create policy vendas_divulgacao_materiais_gestao
  on public.vendas_mobile_divulgacao_materiais for all to authenticated
  using (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ))
  with check (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendas-divulgacao',
  'vendas-divulgacao',
  true,
  104857600,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vendas_divulgacao_storage_insert on storage.objects;
create policy vendas_divulgacao_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vendas-divulgacao'
    and (storage.foldername(name))[1] in (
      select ue.empresa_id::text from public.usuarios_empresa ue
      where ue.user_id = auth.uid() and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

drop policy if exists vendas_divulgacao_storage_delete on storage.objects;
create policy vendas_divulgacao_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vendas-divulgacao'
    and (storage.foldername(name))[1] in (
      select ue.empresa_id::text from public.usuarios_empresa ue
      where ue.user_id = auth.uid() and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );
