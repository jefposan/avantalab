-- Disparos administrativos por aplicativo e automacoes de relacionamento.

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_app_origem_check;

alter table public.push_subscriptions
  add constraint push_subscriptions_app_origem_check
  check (app_origem in ('mobile', 'ponto', 'avantavendas'));

alter table public.push_subscriptions
  add column if not exists fcm_token text;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_canal_check;

alter table public.push_subscriptions
  add constraint push_subscriptions_canal_check check (canal in ('web', 'apns', 'fcm'));

create unique index if not exists push_subscriptions_fcm_token_uidx
  on public.push_subscriptions (fcm_token)
  where fcm_token is not null;

alter table public.admin_disparos
  add column if not exists aplicativo text not null default 'gestao',
  add column if not exists origem text not null default 'manual',
  add column if not exists programacao_id uuid;

alter table public.admin_disparos
  drop constraint if exists admin_disparos_aplicativo_check,
  drop constraint if exists admin_disparos_origem_check;

alter table public.admin_disparos
  add constraint admin_disparos_aplicativo_check check (aplicativo in ('gestao', 'avantavendas')),
  add constraint admin_disparos_origem_check check (origem in ('manual', 'automatico'));

create table if not exists public.app_atividade_usuarios (
  user_id uuid not null references auth.users(id) on delete cascade,
  aplicativo text not null check (aplicativo in ('gestao', 'avantavendas')),
  primeiro_acesso_em timestamptz not null default now(),
  ultimo_acesso_em timestamptz not null default now(),
  primary key (user_id, aplicativo)
);

create index if not exists app_atividade_usuarios_aplicativo_ultimo_idx
  on public.app_atividade_usuarios (aplicativo, ultimo_acesso_em);

insert into public.app_atividade_usuarios (user_id, aplicativo, primeiro_acesso_em, ultimo_acesso_em)
select distinct ue.user_id, 'gestao', u.created_at, coalesce(u.last_sign_in_at, u.created_at)
from public.usuarios_empresa ue
join auth.users u on u.id = ue.user_id
where ue.user_id is not null
  and ue.status = 'ativo'
  and ue.perfil <> 'funcionario_ponto'
on conflict (user_id, aplicativo) do nothing;

insert into public.app_atividade_usuarios (user_id, aplicativo, primeiro_acesso_em, ultimo_acesso_em)
select distinct vcu.user_id, 'avantavendas', u.created_at, coalesce(u.last_sign_in_at, u.created_at)
from public.vendas_mobile_contas_usuarios vcu
join auth.users u on u.id = vcu.user_id
join public.vendas_mobile_contas vc on vc.id = vcu.conta_id and vc.arquivada_em is null
where vcu.user_id is not null and vcu.status = 'ativo'
on conflict (user_id, aplicativo) do nothing;

alter table public.app_atividade_usuarios enable row level security;

create policy "app_atividade_select_propria" on public.app_atividade_usuarios
  for select using (user_id = auth.uid());

create or replace function public.registrar_atividade_aplicativo(p_aplicativo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sessao necessaria.'; end if;
  if p_aplicativo not in ('gestao', 'avantavendas') then raise exception 'Aplicativo invalido.'; end if;

  insert into public.app_atividade_usuarios (user_id, aplicativo, primeiro_acesso_em, ultimo_acesso_em)
  values (auth.uid(), p_aplicativo, now(), now())
  on conflict (user_id, aplicativo) do update
    set ultimo_acesso_em = excluded.ultimo_acesso_em;
end;
$$;

revoke all on function public.registrar_atividade_aplicativo(text) from public;
grant execute on function public.registrar_atividade_aplicativo(text) to authenticated;

create table if not exists public.admin_disparos_programados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  aplicativo text not null check (aplicativo in ('gestao', 'avantavendas')),
  gatilho text not null check (gatilho in ('data_programada', 'apos_cadastro', 'sem_acesso')),
  titulo text not null,
  mensagem text not null,
  data_programada timestamptz,
  intervalo_valor integer,
  intervalo_unidade text check (intervalo_unidade in ('horas', 'dias', 'semanas')),
  ativo boolean not null default true,
  ultima_execucao_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint admin_disparos_programados_configuracao_check check (
    (gatilho = 'data_programada' and data_programada is not null and intervalo_valor is null and intervalo_unidade is null)
    or
    (gatilho in ('apos_cadastro', 'sem_acesso') and data_programada is null and intervalo_valor > 0 and intervalo_unidade is not null)
  )
);

alter table public.admin_disparos_programados enable row level security;

alter table public.admin_disparos
  drop constraint if exists admin_disparos_programacao_id_fkey;

alter table public.admin_disparos
  add constraint admin_disparos_programacao_id_fkey
  foreign key (programacao_id) references public.admin_disparos_programados(id) on delete set null;

create table if not exists public.admin_disparos_entregas (
  id uuid primary key default gen_random_uuid(),
  programacao_id uuid not null references public.admin_disparos_programados(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  referencia text not null,
  status text not null check (status in ('enviado', 'sem_inscricao', 'erro')),
  pushes_enviados integer not null default 0,
  erro text,
  criado_em timestamptz not null default now(),
  unique (programacao_id, user_id, referencia)
);

create index if not exists admin_disparos_entregas_programacao_idx
  on public.admin_disparos_entregas (programacao_id, criado_em desc);

alter table public.admin_disparos_entregas enable row level security;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'processar-disparos-programados' limit 1;
  if job_id is not null then perform cron.unschedule(job_id); end if;
end $$;

select cron.schedule(
  'processar-disparos-programados',
  '*/15 * * * *',
  $job$
    select net.http_post(
      url := 'https://qzewxhdkwettnlmkjoqd.supabase.co/functions/v1/processar-disparos',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_edge_secret'),
        'Authorization', (select 'Bearer ' || decrypted_secret from vault.decrypted_secrets where name = 'cron_edge_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$
);
