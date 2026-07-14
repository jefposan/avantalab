-- Geração assíncrona de capas dos vídeos de Divulgação.
-- O upload termina assim que o material é registrado; um worker no Cloud Run
-- processa a capa em segundo plano e atualiza o material via service role.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.vendas_mobile_divulgacao_materiais
  add column if not exists miniatura_status text not null default 'nao_aplicavel',
  add column if not exists miniatura_erro text,
  add column if not exists miniatura_tentativas integer not null default 0,
  add column if not exists miniatura_processada_em timestamptz;

alter table public.vendas_mobile_divulgacao_materiais
  drop constraint if exists vendas_mobile_divulgacao_materiais_miniatura_status_check;
alter table public.vendas_mobile_divulgacao_materiais
  add constraint vendas_mobile_divulgacao_materiais_miniatura_status_check
  check (miniatura_status in ('nao_aplicavel', 'pendente', 'processando', 'pronta', 'erro'));

update public.vendas_mobile_divulgacao_materiais
set
  miniatura_status = case
    when tipo = 'imagem' then 'nao_aplicavel'
    when miniatura_url is not null then 'pronta'
    else 'pendente'
  end,
  miniatura_processada_em = case
    when tipo = 'video' and miniatura_url is not null then coalesce(miniatura_processada_em, atualizado_em, now())
    else miniatura_processada_em
  end;

create table if not exists public.vendas_mobile_thumbnail_jobs (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null unique references public.vendas_mobile_divulgacao_materiais(id) on delete cascade,
  status text not null default 'pendente'
    check (status in ('pendente', 'despachado', 'processando', 'concluido', 'erro')),
  tentativas integer not null default 0,
  request_id bigint,
  ultimo_erro text,
  proxima_tentativa_em timestamptz not null default now(),
  despachado_em timestamptz,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists vendas_thumbnail_jobs_fila_idx
  on public.vendas_mobile_thumbnail_jobs (status, proxima_tentativa_em, criado_em);

alter table public.vendas_mobile_thumbnail_jobs enable row level security;
-- A fila é interna. O worker usa a service role e não depende de policies públicas.

create or replace function public.preparar_status_miniatura_vendas_mobile()
returns trigger
language plpgsql
as $$
begin
  if new.tipo = 'imagem' then
    new.miniatura_status := 'nao_aplicavel';
    new.miniatura_erro := null;
  elsif new.miniatura_url is not null then
    new.miniatura_status := 'pronta';
    new.miniatura_erro := null;
    new.miniatura_processada_em := coalesce(new.miniatura_processada_em, now());
  elsif tg_op = 'INSERT' or old.miniatura_url is distinct from new.miniatura_url then
    new.miniatura_status := 'pendente';
    new.miniatura_erro := null;
    new.miniatura_processada_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists preparar_status_miniatura_vendas_mobile_trigger
  on public.vendas_mobile_divulgacao_materiais;
create trigger preparar_status_miniatura_vendas_mobile_trigger
before insert or update of tipo, miniatura_url
on public.vendas_mobile_divulgacao_materiais
for each row execute function public.preparar_status_miniatura_vendas_mobile();

create or replace function public.despachar_thumbnail_vendas_mobile(p_job_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  v_job public.vendas_mobile_thumbnail_jobs%rowtype;
  v_worker_url text;
  v_worker_secret text;
  v_request_id bigint;
begin
  select * into v_job
  from public.vendas_mobile_thumbnail_jobs
  where id = p_job_id
  for update;

  if not found or v_job.status not in ('pendente', 'erro') then
    return null;
  end if;

  if v_job.tentativas >= 3 then
    update public.vendas_mobile_thumbnail_jobs
    set status = 'erro', atualizado_em = now()
    where id = p_job_id;
    update public.vendas_mobile_divulgacao_materiais
    set miniatura_status = 'erro', miniatura_erro = coalesce(v_job.ultimo_erro, 'Não foi possível gerar a capa.'), atualizado_em = now()
    where id = v_job.material_id;
    return null;
  end if;

  select decrypted_secret into v_worker_url
  from vault.decrypted_secrets
  where name = 'vendas_thumbnail_worker_url'
  limit 1;

  select decrypted_secret into v_worker_secret
  from vault.decrypted_secrets
  where name = 'vendas_thumbnail_worker_secret'
  limit 1;

  -- Enquanto o Cloud Run ainda não estiver configurado, o job permanece seguro na fila.
  if nullif(trim(v_worker_url), '') is null or nullif(v_worker_secret, '') is null then
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_worker_url, '/') || '/process-thumbnail',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_worker_secret
    ),
    body := jsonb_build_object('jobId', v_job.id, 'materialId', v_job.material_id),
    timeout_milliseconds := 600000
  ) into v_request_id;

  update public.vendas_mobile_thumbnail_jobs
  set
    status = 'despachado',
    tentativas = tentativas + 1,
    request_id = v_request_id,
    despachado_em = now(),
    atualizado_em = now(),
    ultimo_erro = null
  where id = p_job_id;

  update public.vendas_mobile_divulgacao_materiais
  set
    miniatura_status = 'pendente',
    miniatura_tentativas = v_job.tentativas + 1,
    miniatura_erro = null,
    atualizado_em = now()
  where id = v_job.material_id;

  return v_request_id;
exception when others then
  update public.vendas_mobile_thumbnail_jobs
  set
    status = 'erro',
    ultimo_erro = left(sqlerrm, 1000),
    proxima_tentativa_em = now() + interval '2 minutes',
    atualizado_em = now()
  where id = p_job_id;
  return null;
end;
$$;

revoke all on function public.despachar_thumbnail_vendas_mobile(uuid) from public;

create or replace function public.enfileirar_thumbnail_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  v_job_id uuid;
begin
  if new.tipo <> 'video' or new.miniatura_url is not null then
    return new;
  end if;

  insert into public.vendas_mobile_thumbnail_jobs (material_id)
  values (new.id)
  on conflict (material_id) do update set
    status = 'pendente',
    proxima_tentativa_em = now(),
    atualizado_em = now()
  returning id into v_job_id;

  perform public.despachar_thumbnail_vendas_mobile(v_job_id);
  return new;
end;
$$;

drop trigger if exists enfileirar_thumbnail_vendas_mobile_trigger
  on public.vendas_mobile_divulgacao_materiais;
create trigger enfileirar_thumbnail_vendas_mobile_trigger
after insert on public.vendas_mobile_divulgacao_materiais
for each row execute function public.enfileirar_thumbnail_vendas_mobile();

insert into public.vendas_mobile_thumbnail_jobs (material_id)
select id
from public.vendas_mobile_divulgacao_materiais
where tipo = 'video' and miniatura_url is null
on conflict (material_id) do nothing;

create or replace function public.processar_fila_thumbnail_vendas_mobile()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  v_job record;
begin
  update public.vendas_mobile_thumbnail_jobs
  set
    status = 'pendente',
    ultimo_erro = coalesce(ultimo_erro, 'Processamento excedeu o tempo esperado.'),
    proxima_tentativa_em = now(),
    atualizado_em = now()
  where status in ('despachado', 'processando')
    and coalesce(iniciado_em, despachado_em, atualizado_em) < now() - interval '10 minutes'
    and tentativas < 3;

  update public.vendas_mobile_thumbnail_jobs
  set status = 'pendente', atualizado_em = now()
  where status = 'erro'
    and tentativas < 3
    and proxima_tentativa_em <= now();

  update public.vendas_mobile_divulgacao_materiais m
  set
    miniatura_status = 'erro',
    miniatura_erro = coalesce(j.ultimo_erro, 'Não foi possível gerar a capa.'),
    atualizado_em = now()
  from public.vendas_mobile_thumbnail_jobs j
  where j.material_id = m.id
    and j.status = 'erro'
    and j.tentativas >= 3
    and m.miniatura_status <> 'erro';

  for v_job in
    select id
    from public.vendas_mobile_thumbnail_jobs
    where status = 'pendente' and proxima_tentativa_em <= now()
    order by criado_em
    limit 5
    for update skip locked
  loop
    perform public.despachar_thumbnail_vendas_mobile(v_job.id);
  end loop;
end;
$$;

revoke all on function public.processar_fila_thumbnail_vendas_mobile() from public;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'processar-miniaturas-vendas-mobile' limit 1;
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end $$;

select cron.schedule(
  'processar-miniaturas-vendas-mobile',
  '* * * * *',
  $job$select public.processar_fila_thumbnail_vendas_mobile();$job$
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vendas_mobile_divulgacao_materiais'
  ) then
    alter publication supabase_realtime add table public.vendas_mobile_divulgacao_materiais;
  end if;
end $$;
