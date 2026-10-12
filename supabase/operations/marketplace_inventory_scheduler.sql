-- Configura o job DESATIVADO: pode ser aplicado antes da publicação.
-- Ativar somente depois de publicar /api/cron/marketplaces e confirmar
-- que POST sem credencial retorna 401 (não 404).
-- Nenhuma senha ML ou service_role é enviada no job.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
-- pg_net é gerenciado pelo Supabase: REVOKE de seus objetos como postgres pode
-- não ter efeito. Manter o schema net FORA dos schemas expostos pela Data API;
-- não oferecer RPC pública que leia a fila HTTP. Logins diretos ao banco são
-- administradores confiáveis: podem ler os cabeçalhos temporários de pg_net.
create or replace function public.marketplace_inventory_tick() returns bigint
language plpgsql security definer set search_path=public as $$
declare v_token text; v_request bigint;
begin
  select token into v_token from marketplace_inventory_worker where id=1;
  if v_token is null then raise exception 'A migração de estoque ainda não foi aplicada.'; end if;
  select net.http_post(
    url:='https://avantalab.com.br/api/cron/marketplaces',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_token),
    body:='{}'::jsonb,timeout_milliseconds:=5000
  ) into v_request;
  return v_request;
end $$;
revoke all on function public.marketplace_inventory_tick() from public,anon,authenticated;
grant execute on function public.marketplace_inventory_tick() to service_role;
-- Atualiza só este agendamento; não toca os jobs de outros módulos.
do $$ declare v_job bigint; begin
  for v_job in select jobid from cron.job where jobname='avantalab-marketplace-inventory-v1' loop
    perform cron.unschedule(v_job);
  end loop;
end $$;
select cron.schedule('avantalab-marketplace-inventory-v1','30 seconds','select public.marketplace_inventory_tick();');
select cron.alter_job(jobid,active:=false) from cron.job where jobname='avantalab-marketplace-inventory-v1';
commit;

-- Ativação separada, somente após a verificação da rota publicada:
-- select cron.alter_job(jobid,active:=true) from cron.job where jobname='avantalab-marketplace-inventory-v1';
-- Verificação sem credenciais: cron.job/cron.job_run_details e heartbeat do worker.
-- Reversão recuperável: select cron.alter_job(jobid,active:=false)
-- from cron.job where jobname='avantalab-marketplace-inventory-v1';
