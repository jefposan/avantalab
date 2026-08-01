create table if not exists public.assinatura_avisos (
  id uuid primary key default gen_random_uuid(),
  fatura_id text not null,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  marco text not null,
  notificacao_id uuid references public.notificacoes(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (fatura_id, user_id, marco)
);

alter table public.assinatura_avisos enable row level security;

do $$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname = 'processar-avisos-assinaturas' limit 1;
  if v_job is not null then perform cron.unschedule(v_job); end if;
end $$;

select cron.schedule(
  'processar-avisos-assinaturas',
  '0 11 * * *',
  $job$
    select net.http_post(
      url := 'https://qzewxhdkwettnlmkjoqd.supabase.co/functions/v1/processar-avisos-assinaturas',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_edge_secret'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_edge_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$
);
