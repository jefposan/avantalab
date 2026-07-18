-- Módulo Recebimentos Presencial.
-- Independente do Controle de Ponto: tabelas, usuários, sessão e políticas próprias.

insert into public.modulos (id, nome, descricao, icone, perfis, ordem)
values (
  'recebimentos_presencial',
  'Recebimentos Presencial',
  'Cobrança em dinheiro em campo, com conferência e baixa pelo gestor.',
  'recebimentos',
  '{empresa}',
  3
)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  icone = excluded.icone,
  perfis = excluded.perfis,
  ordem = excluded.ordem;

create table if not exists public.recebimentos_colaboradores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  cpf text not null check (cpf ~ '^[0-9]{11}$'),
  celular text,
  email text not null,
  email_contato text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, empresa_id)
);

create unique index if not exists recebimentos_colaboradores_cpf_uidx
  on public.recebimentos_colaboradores (cpf);
create index if not exists recebimentos_colaboradores_empresa_idx
  on public.recebimentos_colaboradores (empresa_id, ativo, nome);

create table if not exists public.recebimentos_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  responsavel text not null default '',
  telefone text not null default '',
  email text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists recebimentos_empresas_empresa_idx
  on public.recebimentos_empresas (empresa_id, ativo, nome);

create table if not exists public.recebimentos_subempresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  recebimento_empresa_id uuid not null references public.recebimentos_empresas(id) on delete cascade,
  nome text not null,
  endereco text not null default '',
  logradouro text not null default '',
  numero text not null default '',
  complemento text not null default '',
  shopping_galeria text not null default '',
  loja_sala text not null default '',
  responsavel text not null default '',
  valor_combinado numeric(12,2) not null check (valor_combinado > 0),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists recebimentos_subempresas_empresa_idx
  on public.recebimentos_subempresas (empresa_id, recebimento_empresa_id, ativo, nome);

create table if not exists public.recebimentos_lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  recebimento_empresa_id uuid not null references public.recebimentos_empresas(id) on delete cascade,
  subempresa_id uuid not null references public.recebimentos_subempresas(id) on delete cascade,
  colaborador_user_id uuid references auth.users(id) on delete set null,
  vencimento date not null,
  valor_combinado numeric(12,2) not null check (valor_combinado > 0),
  valor_recebido numeric(12,2) check (valor_recebido >= 0),
  recebido_em timestamptz,
  observacao text,
  situacao text not null check (situacao in (
    'previsto', 'aguardando_conferencia', 'baixado', 'recebido_a_menor',
    'recebido_a_maior', 'em_atraso', 'devolvido_para_correcao'
  )),
  baixado_por uuid references auth.users(id) on delete set null,
  baixado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists recebimentos_lancamentos_empresa_vencimento_idx
  on public.recebimentos_lancamentos (empresa_id, vencimento);
create index if not exists recebimentos_lancamentos_colaborador_recebido_idx
  on public.recebimentos_lancamentos (colaborador_user_id, recebido_em desc);
create index if not exists recebimentos_lancamentos_situacao_idx
  on public.recebimentos_lancamentos (situacao);

create table if not exists public.recebimentos_eventos (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.recebimentos_lancamentos(id) on delete cascade,
  tipo text not null check (tipo in ('lancado', 'baixado', 'devolvido', 'divergencia', 'estornado')),
  por uuid references auth.users(id) on delete set null default auth.uid(),
  motivo text,
  snapshot jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists recebimentos_eventos_lancamento_idx
  on public.recebimentos_eventos (lancamento_id, criado_em desc);

create or replace function public.recebimentos_pode_gerir(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios_empresa ue
    join public.empresa_modulos m
      on m.empresa_id = ue.empresa_id
     and m.modulo_id = 'recebimentos_presencial'
     and m.ativo
    where ue.empresa_id = p_empresa_id
      and ue.user_id = auth.uid()
      and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  );
$$;

create or replace function public.recebimentos_e_colaborador(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recebimentos_colaboradores c
    join public.empresa_modulos m
      on m.empresa_id = c.empresa_id
     and m.modulo_id = 'recebimentos_presencial'
     and m.ativo
    where c.empresa_id = p_empresa_id
      and c.user_id = auth.uid()
      and c.ativo
  );
$$;

revoke all on function public.recebimentos_pode_gerir(uuid) from public;
revoke all on function public.recebimentos_e_colaborador(uuid) from public;
grant execute on function public.recebimentos_pode_gerir(uuid) to authenticated;
grant execute on function public.recebimentos_e_colaborador(uuid) to authenticated;

alter table public.recebimentos_colaboradores enable row level security;
alter table public.recebimentos_empresas enable row level security;
alter table public.recebimentos_subempresas enable row level security;
alter table public.recebimentos_lancamentos enable row level security;
alter table public.recebimentos_eventos enable row level security;

drop policy if exists recebimentos_colaboradores_select on public.recebimentos_colaboradores;
create policy recebimentos_colaboradores_select
  on public.recebimentos_colaboradores for select to authenticated
  using (user_id = auth.uid() or public.recebimentos_pode_gerir(empresa_id));

drop policy if exists recebimentos_empresas_select on public.recebimentos_empresas;
create policy recebimentos_empresas_select
  on public.recebimentos_empresas for select to authenticated
  using (public.recebimentos_pode_gerir(empresa_id) or public.recebimentos_e_colaborador(empresa_id));
drop policy if exists recebimentos_empresas_gestao on public.recebimentos_empresas;
create policy recebimentos_empresas_gestao
  on public.recebimentos_empresas for all to authenticated
  using (public.recebimentos_pode_gerir(empresa_id))
  with check (public.recebimentos_pode_gerir(empresa_id));

drop policy if exists recebimentos_subempresas_select on public.recebimentos_subempresas;
create policy recebimentos_subempresas_select
  on public.recebimentos_subempresas for select to authenticated
  using (public.recebimentos_pode_gerir(empresa_id) or public.recebimentos_e_colaborador(empresa_id));
drop policy if exists recebimentos_subempresas_gestao on public.recebimentos_subempresas;
create policy recebimentos_subempresas_gestao
  on public.recebimentos_subempresas for all to authenticated
  using (public.recebimentos_pode_gerir(empresa_id))
  with check (public.recebimentos_pode_gerir(empresa_id));

drop policy if exists recebimentos_lancamentos_select on public.recebimentos_lancamentos;
create policy recebimentos_lancamentos_select
  on public.recebimentos_lancamentos for select to authenticated
  using (
    public.recebimentos_pode_gerir(empresa_id)
    or (colaborador_user_id = auth.uid() and public.recebimentos_e_colaborador(empresa_id))
    or (
      colaborador_user_id is null
      and situacao in ('previsto', 'em_atraso')
      and public.recebimentos_e_colaborador(empresa_id)
    )
  );

drop policy if exists recebimentos_lancamentos_insert on public.recebimentos_lancamentos;
create policy recebimentos_lancamentos_insert
  on public.recebimentos_lancamentos for insert to authenticated
  with check (
    public.recebimentos_pode_gerir(empresa_id)
    or (
      public.recebimentos_e_colaborador(empresa_id)
      and colaborador_user_id = auth.uid()
      and situacao in ('aguardando_conferencia', 'recebido_a_menor', 'recebido_a_maior')
    )
  );

drop policy if exists recebimentos_lancamentos_update_gestao on public.recebimentos_lancamentos;
create policy recebimentos_lancamentos_update_gestao
  on public.recebimentos_lancamentos for update to authenticated
  using (public.recebimentos_pode_gerir(empresa_id))
  with check (public.recebimentos_pode_gerir(empresa_id));

-- Permite ao colaborador assumir uma cobrança aberta ou corrigir somente um
-- lançamento que já pertence a ele. Baixa, devolução e estorno continuam exclusivos do gestor.
drop policy if exists recebimentos_lancamentos_update_colaborador on public.recebimentos_lancamentos;
create policy recebimentos_lancamentos_update_colaborador
  on public.recebimentos_lancamentos for update to authenticated
  using (
    public.recebimentos_e_colaborador(empresa_id)
    and (
      (colaborador_user_id is null and situacao in ('previsto', 'em_atraso'))
      or (colaborador_user_id = auth.uid() and situacao = 'devolvido_para_correcao')
    )
  )
  with check (
    public.recebimentos_e_colaborador(empresa_id)
    and colaborador_user_id = auth.uid()
    and situacao in ('aguardando_conferencia', 'recebido_a_menor', 'recebido_a_maior')
  );

drop policy if exists recebimentos_lancamentos_delete on public.recebimentos_lancamentos;
create policy recebimentos_lancamentos_delete
  on public.recebimentos_lancamentos for delete to authenticated
  using (public.recebimentos_pode_gerir(empresa_id));

drop policy if exists recebimentos_eventos_select on public.recebimentos_eventos;
create policy recebimentos_eventos_select
  on public.recebimentos_eventos for select to authenticated
  using (
    exists (
      select 1 from public.recebimentos_lancamentos l
      where l.id = lancamento_id and public.recebimentos_pode_gerir(l.empresa_id)
    )
  );

create or replace function public.recebimentos_baixar(p_lancamento_id uuid, p_motivo text default null)
returns public.recebimentos_lancamentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lancamento public.recebimentos_lancamentos;
begin
  select * into v_lancamento from public.recebimentos_lancamentos where id = p_lancamento_id for update;
  if v_lancamento.id is null then raise exception 'Lançamento não encontrado.'; end if;
  if not public.recebimentos_pode_gerir(v_lancamento.empresa_id) then raise exception 'Acesso negado.'; end if;
  if v_lancamento.valor_recebido is null then raise exception 'O recebimento ainda não foi registrado.'; end if;

  update public.recebimentos_lancamentos
  set situacao = 'baixado', baixado_por = auth.uid(), baixado_em = now(), atualizado_em = now()
  where id = p_lancamento_id returning * into v_lancamento;
  insert into public.recebimentos_eventos (lancamento_id, tipo, por, motivo, snapshot)
  values (v_lancamento.id, 'baixado', auth.uid(), nullif(trim(p_motivo), ''), to_jsonb(v_lancamento));
  return v_lancamento;
end;
$$;

create or replace function public.recebimentos_devolver(p_lancamento_id uuid, p_motivo text)
returns public.recebimentos_lancamentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lancamento public.recebimentos_lancamentos;
begin
  if nullif(trim(p_motivo), '') is null then raise exception 'Informe o motivo da devolução.'; end if;
  select * into v_lancamento from public.recebimentos_lancamentos where id = p_lancamento_id for update;
  if v_lancamento.id is null then raise exception 'Lançamento não encontrado.'; end if;
  if not public.recebimentos_pode_gerir(v_lancamento.empresa_id) then raise exception 'Acesso negado.'; end if;

  update public.recebimentos_lancamentos
  set situacao = 'devolvido_para_correcao', observacao = concat_ws(' · ', nullif(observacao, ''), 'Devolvido: ' || trim(p_motivo)), atualizado_em = now()
  where id = p_lancamento_id returning * into v_lancamento;
  insert into public.recebimentos_eventos (lancamento_id, tipo, por, motivo, snapshot)
  values (v_lancamento.id, 'devolvido', auth.uid(), trim(p_motivo), to_jsonb(v_lancamento));
  return v_lancamento;
end;
$$;

create or replace function public.recebimentos_registrar_divergencia(p_lancamento_id uuid, p_motivo text)
returns public.recebimentos_lancamentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lancamento public.recebimentos_lancamentos;
begin
  if nullif(trim(p_motivo), '') is null then raise exception 'Informe o motivo da divergência.'; end if;
  select * into v_lancamento from public.recebimentos_lancamentos where id = p_lancamento_id for update;
  if v_lancamento.id is null then raise exception 'Lançamento não encontrado.'; end if;
  if not public.recebimentos_pode_gerir(v_lancamento.empresa_id) then raise exception 'Acesso negado.'; end if;
  if v_lancamento.valor_recebido is null then raise exception 'O recebimento ainda não foi registrado.'; end if;

  update public.recebimentos_lancamentos
  set situacao = 'baixado', baixado_por = auth.uid(), baixado_em = now(),
      observacao = concat_ws(' · ', nullif(observacao, ''), 'Divergência: ' || trim(p_motivo)), atualizado_em = now()
  where id = p_lancamento_id returning * into v_lancamento;
  insert into public.recebimentos_eventos (lancamento_id, tipo, por, motivo, snapshot)
  values (v_lancamento.id, 'divergencia', auth.uid(), trim(p_motivo), to_jsonb(v_lancamento));
  return v_lancamento;
end;
$$;

create or replace function public.recebimentos_estornar(p_lancamento_id uuid, p_motivo text)
returns public.recebimentos_lancamentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lancamento public.recebimentos_lancamentos;
  v_snapshot jsonb;
begin
  if nullif(trim(p_motivo), '') is null then raise exception 'Informe o motivo do estorno.'; end if;
  select * into v_lancamento from public.recebimentos_lancamentos where id = p_lancamento_id for update;
  if v_lancamento.id is null then raise exception 'Lançamento não encontrado.'; end if;
  if not public.recebimentos_pode_gerir(v_lancamento.empresa_id) then raise exception 'Acesso negado.'; end if;
  v_snapshot := to_jsonb(v_lancamento);

  update public.recebimentos_lancamentos
  set situacao = case when vencimento < current_date then 'em_atraso' else 'previsto' end,
      valor_recebido = null, colaborador_user_id = null, recebido_em = null,
      baixado_por = null, baixado_em = null,
      observacao = 'Estornado: ' || trim(p_motivo), atualizado_em = now()
  where id = p_lancamento_id returning * into v_lancamento;
  insert into public.recebimentos_eventos (lancamento_id, tipo, por, motivo, snapshot)
  values (v_lancamento.id, 'estornado', auth.uid(), trim(p_motivo), v_snapshot);
  return v_lancamento;
end;
$$;

revoke all on function public.recebimentos_baixar(uuid, text) from public;
revoke all on function public.recebimentos_devolver(uuid, text) from public;
revoke all on function public.recebimentos_registrar_divergencia(uuid, text) from public;
revoke all on function public.recebimentos_estornar(uuid, text) from public;
grant execute on function public.recebimentos_baixar(uuid, text) to authenticated;
grant execute on function public.recebimentos_devolver(uuid, text) to authenticated;
grant execute on function public.recebimentos_registrar_divergencia(uuid, text) to authenticated;
grant execute on function public.recebimentos_estornar(uuid, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'recebimentos_lancamentos'
     ) then
    alter publication supabase_realtime add table public.recebimentos_lancamentos;
  end if;
end;
$$;
