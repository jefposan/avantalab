insert into storage.buckets (id, name, public) values ('rep-p-documentos', 'rep-p-documentos', false) on conflict (id) do nothing;

create table public.rep_p_documentos_gerados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  tipo text not null check (tipo in ('afd')),
  periodo_inicio date not null,
  periodo_fim date not null,
  arquivo_nome text not null,
  storage_path text not null unique,
  sha256 text not null,
  modo text not null check (modo in ('homologacao', 'producao')),
  solicitado_por uuid references auth.users(id) on delete restrict,
  gerado_em timestamptz not null default now()
);
create index rep_p_documentos_empresa_data_idx on public.rep_p_documentos_gerados (empresa_id, gerado_em desc);
alter table public.rep_p_documentos_gerados enable row level security;
create policy "rep_p_documentos_select_gestores" on public.rep_p_documentos_gerados for select using (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador')));
create function public.rep_p_documentos_sem_alteracao() returns trigger language plpgsql security definer set search_path = public as $$ begin raise exception 'Documentos REP-P emitidos não podem ser alterados ou apagados.'; end; $$;
create trigger rep_p_documentos_sem_update before update or delete on public.rep_p_documentos_gerados for each row execute function public.rep_p_documentos_sem_alteracao();

create table public.rep_p_documentos_auditoria (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.rep_p_documentos_gerados(id) on delete restrict,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  ator_user_id uuid references auth.users(id) on delete restrict,
  evento text not null check (evento in ('gerado', 'baixado')),
  ocorrido_em timestamptz not null default now()
);

create index rep_p_documentos_auditoria_documento_data_idx on public.rep_p_documentos_auditoria (documento_id, ocorrido_em desc);
alter table public.rep_p_documentos_auditoria enable row level security;
create policy "rep_p_documentos_auditoria_select_gestores" on public.rep_p_documentos_auditoria for select using (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador')));
create trigger rep_p_documentos_auditoria_sem_update before update or delete on public.rep_p_documentos_auditoria for each row execute function public.rep_p_documentos_sem_alteracao();
