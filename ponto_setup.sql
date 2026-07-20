-- ─────────────────────────────────────────────────────────────
-- MÓDULO: Controle de Ponto (v1) — rodar DEPOIS de modulos_setup.sql
-- Funcionário = usuário Supabase Auth com papel 'funcionario_ponto'
-- em usuarios_empresa (login por login/usuário, criado via rota servidor).
-- ─────────────────────────────────────────────────────────────

-- Dados extras do funcionário (o vínculo/identidade fica em usuarios_empresa)
create table if not exists public.ponto_funcionarios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nome        text not null default '',
  login       text not null default '',
  cargo       text not null default '',
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  unique(user_id, empresa_id)
);
create index if not exists ponto_funcionarios_empresa_idx
  on public.ponto_funcionarios(empresa_id);

alter table public.ponto_funcionarios enable row level security;
create policy "ponto_funcionarios_select" on public.ponto_funcionarios
  for select using (
    user_id = auth.uid()
    or empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and perfil in ('gestor_master','administrador'))
  );
create policy "ponto_funcionarios_insert" on public.ponto_funcionarios
  for insert with check (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid()));
create policy "ponto_funcionarios_update" on public.ponto_funcionarios
  for update using (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid()));

-- Registros do ponto (IMUTÁVEIS: só SELECT e INSERT — sem update/delete)
create table if not exists public.ponto_registros (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete restrict,
  user_id       uuid not null references auth.users(id) on delete restrict,
  tipo          text not null check (tipo in ('entrada','saida_refeicao','retorno_refeicao','saida')),
  registrado_em timestamptz not null default now(),
  dia           date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  latitude      double precision,   -- GPS obrigatório (validado no app)
  longitude     double precision,
  precisao_m    double precision,
  dispositivo   text,               -- user agent
  hash          text,               -- integridade do registro
  criado_em     timestamptz not null default now()
);
create index if not exists ponto_registros_empresa_dia_idx on public.ponto_registros(empresa_id, dia);
create index if not exists ponto_registros_user_dia_idx on public.ponto_registros(user_id, dia);

alter table public.ponto_registros enable row level security;
-- Cada um lê os próprios; gestor/admin lê os de todos da empresa.
create policy "ponto_registros_select" on public.ponto_registros
  for select using (
    user_id = auth.uid()
    or empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and perfil in ('gestor_master','administrador'))
  );
-- Cada um registra o PRÓPRIO ponto.
create policy "ponto_registros_insert" on public.ponto_registros
  for insert with check (
    user_id = auth.uid()
    and empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );
-- Sem policies de UPDATE/DELETE: registros são imutáveis (base p/ REP-P).

-- A marcação só é aceita para funcionário e vínculo ativos. A regra também
-- protege inserções diretas que não passam pela interface.
create or replace function public.ponto_validar_funcionario_ativo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.ponto_funcionarios funcionario
    join public.usuarios_empresa acesso
      on acesso.empresa_id = funcionario.empresa_id
     and acesso.user_id = funcionario.user_id
     and acesso.perfil = 'funcionario_ponto'
     and acesso.status = 'ativo'
    where funcionario.empresa_id = new.empresa_id
      and funcionario.user_id = new.user_id
      and funcionario.ativo = true
  ) then
    raise exception 'Funcionário inativo ou sem acesso ao Controle de Ponto.';
  end if;
  return new;
end;
$$;

drop trigger if exists ponto_registros_validar_funcionario_ativo on public.ponto_registros;
create trigger ponto_registros_validar_funcionario_ativo
before insert on public.ponto_registros
for each row execute function public.ponto_validar_funcionario_ativo();

-- Nenhuma exclusão de registro é permitida. Funcionários, vínculos e empresas
-- com histórico também ficam protegidos contra exclusão física.
create or replace function public.ponto_impedir_exclusao_historico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'ponto_registros' then
    raise exception 'Registros de ponto não podem ser excluídos.';
  end if;
  if tg_table_name = 'ponto_funcionarios' and exists (
    select 1 from public.ponto_registros where empresa_id = old.empresa_id and user_id = old.user_id
  ) then
    raise exception 'Não é permitido excluir funcionário com histórico de ponto.';
  end if;
  if tg_table_name = 'usuarios_empresa' and old.perfil = 'funcionario_ponto' and exists (
    select 1 from public.ponto_registros where empresa_id = old.empresa_id and user_id = old.user_id
  ) then
    raise exception 'Não é permitido excluir o vínculo de funcionário com histórico de ponto.';
  end if;
  if tg_table_name = 'empresas' and exists (
    select 1 from public.ponto_registros where empresa_id = old.id
  ) then
    raise exception 'Não é permitido excluir empresa com histórico de ponto.';
  end if;
  return old;
end;
$$;

drop trigger if exists ponto_registros_impedir_exclusao on public.ponto_registros;
create trigger ponto_registros_impedir_exclusao
before delete on public.ponto_registros
for each row execute function public.ponto_impedir_exclusao_historico();

drop trigger if exists ponto_funcionarios_impedir_exclusao_historico on public.ponto_funcionarios;
create trigger ponto_funcionarios_impedir_exclusao_historico
before delete on public.ponto_funcionarios
for each row execute function public.ponto_impedir_exclusao_historico();

drop trigger if exists usuarios_empresa_ponto_impedir_exclusao_historico on public.usuarios_empresa;
create trigger usuarios_empresa_ponto_impedir_exclusao_historico
before delete on public.usuarios_empresa
for each row execute function public.ponto_impedir_exclusao_historico();

drop trigger if exists empresas_ponto_impedir_exclusao_historico on public.empresas;
create trigger empresas_ponto_impedir_exclusao_historico
before delete on public.empresas
for each row execute function public.ponto_impedir_exclusao_historico();
