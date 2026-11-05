-- 3.2.0.127 — Retenção exclusiva dos logs concluídos do pg_cron.
-- Não remove jobs, cadastros, produtos, vendas ou histórico de negócio.
begin;
set local lock_timeout='2s';
set local statement_timeout='20s';

create or replace function public.limpar_historico_cron_30_dias(p_lote integer default 5000)
returns integer
language plpgsql
security invoker
set search_path=pg_catalog,pg_temp
as $$
declare
  v_removidos integer;
begin
  if p_lote is null or p_lote < 1 or p_lote > 10000 then
    raise exception 'Lote deve estar entre 1 e 10000.' using errcode='22023';
  end if;
  with antigos as (
    select runid from cron.job_run_details
    where end_time < now()-interval '30 days'
      and status in ('succeeded','failed')
    order by runid limit p_lote
    for update skip locked
  )
  delete from cron.job_run_details h using antigos a where h.runid=a.runid;
  get diagnostics v_removidos = row_count;
  return v_removidos;
end;
$$;

-- Manutenção administrativa; não expor por RPC a usuários ou service role.
revoke all on function public.limpar_historico_cron_30_dias(integer)
  from public,anon,authenticated,service_role;

-- pg_cron usa UTC neste projeto: 06:40 UTC = 03:40 America/Sao_Paulo.
-- Nome estável evita duplicação. Limite acima das ~6 mil execuções/dia atuais.
select cron.schedule(
  'avantalab-cron-history-retention-30d',
  '40 6 * * *',
  $job$set lock_timeout='2s'; set statement_timeout='20s'; select public.limpar_historico_cron_30_dias(10000);$job$
);
commit;
