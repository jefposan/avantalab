-- MIGRACAO OFICIAL APROVADA PARA O PILOTO TRIDIUM.
-- Controle geral de permissoes por empresa e modulo. Exige revisao formal no AvantaLab.

begin;

create table public.module_role_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete restrict,
  module_id text not null check (module_id ~ '^[a-z][a-z0-9_]{2,63}$'),
  profile text not null check (profile in ('gestor_master','administrador','operador_completo','operador_simples')),
  permission_code text not null check (permission_code ~ '^[a-z][a-z0-9_.]{2,99}$'),
  decision text not null check (decision in ('allow','deny','inherit')),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (company_id,module_id,profile,permission_code)
);

create table public.module_user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete restrict,
  module_id text not null check (module_id ~ '^[a-z][a-z0-9_]{2,63}$'),
  user_id uuid not null references auth.users(id) on delete restrict,
  permission_code text not null check (permission_code ~ '^[a-z][a-z0-9_.]{2,99}$'),
  decision text not null check (decision in ('allow','deny','inherit')),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (company_id,module_id,user_id,permission_code)
);

create table public.module_permission_audit (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.empresas(id) on delete restrict,
  module_id text not null,
  target_type text not null check (target_type in ('profile','user')),
  target_profile text,
  target_user_id uuid references auth.users(id) on delete restrict,
  permission_code text not null,
  previous_decision text check (previous_decision in ('allow','deny','inherit')),
  new_decision text not null check (new_decision in ('allow','deny','inherit')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  constraint module_permission_audit_target_check check (
    (target_type='profile' and target_profile is not null and target_user_id is null)
    or (target_type='user' and target_profile is null and target_user_id is not null)
  )
);

create index module_role_permissions_lookup_idx on public.module_role_permission_overrides(company_id,module_id,profile,permission_code);
create index module_user_permissions_lookup_idx on public.module_user_permission_overrides(company_id,module_id,user_id,permission_code);
create index module_permission_audit_company_idx on public.module_permission_audit(company_id,module_id,occurred_at desc);

create or replace function public.module_permission_assert_manager()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_target_profile text;
begin
  if not exists (
    select 1 from public.usuarios_empresa membership
    where membership.empresa_id=new.company_id and membership.user_id=new.updated_by
      and membership.status='ativo' and membership.perfil in ('gestor_master','administrador')
  ) then raise exception 'A alteração de permissões exige gestor ou administrador ativo.' using errcode='42501'; end if;
  if not exists (
    select 1 from public.empresa_modulos installation
    where installation.empresa_id=new.company_id and installation.modulo_id=new.module_id
      and installation.ativo=true and (installation.expira_em is null or installation.expira_em > now())
  ) then raise exception 'O módulo precisa estar ativo para alterar permissões.' using errcode='42501'; end if;
  v_target_profile := case when tg_table_name='module_role_permission_overrides' then to_jsonb(new)->>'profile' else (
    select membership.perfil from public.usuarios_empresa membership
    where membership.empresa_id=new.company_id and membership.user_id=(to_jsonb(new)->>'user_id')::uuid and membership.status='ativo' limit 1
  ) end;
  if v_target_profile in ('gestor_master','administrador') and new.decision='deny'
    and new.permission_code in ('settings.view','access.view','access.manage','access.audit','fiscal.configure','fiscal.homologate')
  then raise exception 'Uma permissão administrativa protegida não pode ser bloqueada.' using errcode='23514'; end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.module_permission_record_audit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.module_permission_audit(company_id,module_id,target_type,target_profile,target_user_id,permission_code,previous_decision,new_decision,actor_id,occurred_at)
  values (new.company_id,new.module_id,case when tg_table_name='module_role_permission_overrides' then 'profile' else 'user' end,
    case when tg_table_name='module_role_permission_overrides' then to_jsonb(new)->>'profile' else null end,
    case when tg_table_name='module_user_permission_overrides' then (to_jsonb(new)->>'user_id')::uuid else null end,
    new.permission_code,case when tg_op='UPDATE' then old.decision else null end,new.decision,new.updated_by,new.updated_at);
  return new;
end $$;

create or replace function public.module_permission_reject_delete()
returns trigger language plpgsql as $$ begin raise exception 'Permissões não são excluídas; use a decisão inherit.' using errcode='23514'; end $$;

create or replace function public.module_permission_reject_audit_change()
returns trigger language plpgsql as $$ begin raise exception 'A auditoria de permissões é imutável.' using errcode='23514'; end $$;

create trigger module_role_permission_assert_manager before insert or update on public.module_role_permission_overrides for each row execute function public.module_permission_assert_manager();
create trigger module_user_permission_assert_manager before insert or update on public.module_user_permission_overrides for each row execute function public.module_permission_assert_manager();
create trigger module_role_permission_audit after insert or update on public.module_role_permission_overrides for each row execute function public.module_permission_record_audit();
create trigger module_user_permission_audit after insert or update on public.module_user_permission_overrides for each row execute function public.module_permission_record_audit();
create trigger module_role_permission_no_delete before delete on public.module_role_permission_overrides for each row execute function public.module_permission_reject_delete();
create trigger module_user_permission_no_delete before delete on public.module_user_permission_overrides for each row execute function public.module_permission_reject_delete();
create trigger module_permission_audit_immutable before update or delete on public.module_permission_audit for each row execute function public.module_permission_reject_audit_change();

alter table public.module_role_permission_overrides enable row level security;
alter table public.module_role_permission_overrides force row level security;
alter table public.module_user_permission_overrides enable row level security;
alter table public.module_user_permission_overrides force row level security;
alter table public.module_permission_audit enable row level security;
alter table public.module_permission_audit force row level security;

revoke all on public.module_role_permission_overrides from public, anon, authenticated;
revoke all on public.module_user_permission_overrides from public, anon, authenticated;
revoke all on public.module_permission_audit from public, anon, authenticated;
grant select,insert,update on public.module_role_permission_overrides to service_role;
grant select,insert,update on public.module_user_permission_overrides to service_role;
grant select,insert on public.module_permission_audit to service_role;
grant usage,select on sequence public.module_permission_audit_id_seq to service_role;

comment on table public.module_role_permission_overrides is 'Exceções ao padrão de cada perfil por empresa e módulo; acesso somente server-side.';
comment on table public.module_user_permission_overrides is 'Liberações e bloqueios individuais por empresa e módulo; acesso somente server-side.';
comment on table public.module_permission_audit is 'Histórico append-only das decisões de acesso; não armazena token ou conteúdo protegido.';

commit;
