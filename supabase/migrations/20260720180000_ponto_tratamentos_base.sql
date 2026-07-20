-- Tratamentos de jornada: fatos suplementares e imutáveis.
-- Nenhuma tabela desta migration altera marcações originais ou a ARP.

create table public.ponto_jornadas_contratuais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  funcionario_user_id uuid not null references auth.users(id) on delete restrict,
  vigencia_inicio date not null, vigencia_fim date,
  matricula_esocial text, dias_trabalho smallint[] not null default '{}',
  hora_entrada time, hora_saida time, intervalo_minutos integer not null default 0 check (intervalo_minutos >= 0),
  duracao_minutos integer, criado_por uuid references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  check (vigencia_fim is null or vigencia_fim >= vigencia_inicio),
  check (duracao_minutos is null or duracao_minutos >= 0),
  check (hora_entrada is null or hora_saida is not null),
  check (hora_saida is null or hora_entrada is not null)
);
create index ponto_jornadas_funcionario_vigencia_idx on public.ponto_jornadas_contratuais (empresa_id, funcionario_user_id, vigencia_inicio desc);

create table public.ponto_ajustes (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete restrict,
  funcionario_user_id uuid not null references auth.users(id) on delete restrict,
  registro_original_id uuid references public.ponto_registros(id) on delete restrict,
  data_referencia date not null, tipo text not null check (tipo in ('inclusao','desconsideracao','correcao')),
  dados_propostos jsonb not null default '{}'::jsonb, motivo text not null, comprovante_path text,
  solicitado_por uuid not null references auth.users(id) on delete restrict, solicitado_em timestamptz not null default now()
);

create table public.ponto_abonos (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete restrict,
  funcionario_user_id uuid not null references auth.users(id) on delete restrict,
  data_inicio date not null, data_fim date not null, minutos_abonados integer check (minutos_abonados is null or minutos_abonados > 0),
  tipo text not null, motivo text not null, comprovante_path text not null,
  solicitado_por uuid not null references auth.users(id) on delete restrict, solicitado_em timestamptz not null default now(),
  check (data_fim >= data_inicio)
);

insert into storage.buckets (id, name, public) values ('ponto-comprovantes', 'ponto-comprovantes', false) on conflict (id) do nothing;
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['application/pdf','image/jpeg','image/png'] where id = 'ponto-comprovantes';

-- A decisão é um evento, não um update. Cancelar revoga o resultado anterior e preserva a trilha.
create table public.ponto_tratamentos_decisoes (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete restrict,
  ajuste_id uuid references public.ponto_ajustes(id) on delete restrict, abono_id uuid references public.ponto_abonos(id) on delete restrict,
  decisao text not null check (decisao in ('aprovado','recusado','cancelado')), motivo text not null,
  decidido_por uuid not null references auth.users(id) on delete restrict, decidido_em timestamptz not null default now(),
  check ((ajuste_id is not null)::integer + (abono_id is not null)::integer = 1)
);
create index ponto_tratamentos_decisoes_ajuste_idx on public.ponto_tratamentos_decisoes (ajuste_id, decidido_em desc) where ajuste_id is not null;
create index ponto_tratamentos_decisoes_abono_idx on public.ponto_tratamentos_decisoes (abono_id, decidido_em desc) where abono_id is not null;

create table public.ponto_banco_horas_regras (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete restrict,
  nome text not null, vigencia_inicio date not null, vigencia_fim date,
  acordo_referencia text not null, prazo_compensacao_dias integer not null check (prazo_compensacao_dias between 1 and 365),
  limite_minutos integer check (limite_minutos is null or limite_minutos > 0), ativo boolean not null default true,
  criado_por uuid not null references auth.users(id) on delete restrict, criado_em timestamptz not null default now(),
  check (vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);
create table public.ponto_banco_horas_lancamentos (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete restrict,
  funcionario_user_id uuid not null references auth.users(id) on delete restrict,
  regra_id uuid not null references public.ponto_banco_horas_regras(id) on delete restrict,
  data_referencia date not null, minutos integer not null check (minutos <> 0),
  natureza text not null check (natureza in ('saldo_inicial','credito','debito','compensacao','ajuste')),
  origem text not null check (origem in ('manual','tratamento','apuracao')), referencia_id uuid, motivo text not null,
  criado_por uuid not null references auth.users(id) on delete restrict, criado_em timestamptz not null default now()
);

create or replace function public.ponto_tratamentos_validar_vinculos() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name in ('ponto_ajustes', 'ponto_abonos', 'ponto_jornadas_contratuais', 'ponto_banco_horas_lancamentos') and not exists (
    select 1 from public.ponto_funcionarios f where f.empresa_id = new.empresa_id and f.user_id = new.funcionario_user_id
  ) then raise exception 'Funcionário não pertence à empresa do tratamento.'; end if;
  if tg_table_name = 'ponto_ajustes' and new.registro_original_id is not null and not exists (
    select 1 from public.ponto_registros r where r.id = new.registro_original_id and r.empresa_id = new.empresa_id and r.user_id = new.funcionario_user_id
  ) then raise exception 'A marcação original não pertence ao funcionário e empresa informados.'; end if;
  if tg_table_name = 'ponto_banco_horas_lancamentos' and not exists (
    select 1 from public.ponto_banco_horas_regras r where r.id = new.regra_id and r.empresa_id = new.empresa_id
  ) then raise exception 'A regra de banco de horas não pertence à empresa.'; end if;
  if tg_table_name = 'ponto_tratamentos_decisoes' and not exists (
    select 1 from public.ponto_ajustes a where a.id = new.ajuste_id and a.empresa_id = new.empresa_id
    union all select 1 from public.ponto_abonos a where a.id = new.abono_id and a.empresa_id = new.empresa_id
  ) then raise exception 'O tratamento não pertence à empresa.'; end if;
  return new;
end $$;

create or replace function public.ponto_tratamentos_imutaveis() returns trigger language plpgsql security definer set search_path = public as $$ begin raise exception 'Tratamentos de ponto são eventos imutáveis; registre um novo evento.'; end $$;

create trigger ponto_jornadas_validar before insert on public.ponto_jornadas_contratuais for each row execute function public.ponto_tratamentos_validar_vinculos();
create trigger ponto_ajustes_validar before insert on public.ponto_ajustes for each row execute function public.ponto_tratamentos_validar_vinculos();
create trigger ponto_abonos_validar before insert on public.ponto_abonos for each row execute function public.ponto_tratamentos_validar_vinculos();
create trigger ponto_decisoes_validar before insert on public.ponto_tratamentos_decisoes for each row execute function public.ponto_tratamentos_validar_vinculos();
create trigger ponto_banco_lancamentos_validar before insert on public.ponto_banco_horas_lancamentos for each row execute function public.ponto_tratamentos_validar_vinculos();
create trigger ponto_jornadas_imutaveis before update or delete on public.ponto_jornadas_contratuais for each row execute function public.ponto_tratamentos_imutaveis();
create trigger ponto_ajustes_imutaveis before update or delete on public.ponto_ajustes for each row execute function public.ponto_tratamentos_imutaveis();
create trigger ponto_abonos_imutaveis before update or delete on public.ponto_abonos for each row execute function public.ponto_tratamentos_imutaveis();
create trigger ponto_decisoes_imutaveis before update or delete on public.ponto_tratamentos_decisoes for each row execute function public.ponto_tratamentos_imutaveis();
create trigger ponto_banco_regras_imutaveis before update or delete on public.ponto_banco_horas_regras for each row execute function public.ponto_tratamentos_imutaveis();
create trigger ponto_banco_lancamentos_imutaveis before update or delete on public.ponto_banco_horas_lancamentos for each row execute function public.ponto_tratamentos_imutaveis();

alter table public.ponto_jornadas_contratuais enable row level security;
alter table public.ponto_ajustes enable row level security;
alter table public.ponto_abonos enable row level security;
alter table public.ponto_tratamentos_decisoes enable row level security;
alter table public.ponto_banco_horas_regras enable row level security;
alter table public.ponto_banco_horas_lancamentos enable row level security;

create policy "ponto_jornadas_select_gestores" on public.ponto_jornadas_contratuais for select using (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador')));
create policy "ponto_ajustes_select_gestores" on public.ponto_ajustes for select using (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador')));
create policy "ponto_abonos_select_gestores" on public.ponto_abonos for select using (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador')));
create policy "ponto_decisoes_select_gestores" on public.ponto_tratamentos_decisoes for select using (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador')));
create policy "ponto_banco_regras_select_gestores" on public.ponto_banco_horas_regras for select using (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador')));
create policy "ponto_banco_lancamentos_select_gestores" on public.ponto_banco_horas_lancamentos for select using (empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador')));

alter table public.rep_p_documentos_gerados drop constraint rep_p_documentos_gerados_tipo_check;
alter table public.rep_p_documentos_gerados add constraint rep_p_documentos_gerados_tipo_check check (tipo in ('afd', 'manual', 'espelho', 'aej'));
