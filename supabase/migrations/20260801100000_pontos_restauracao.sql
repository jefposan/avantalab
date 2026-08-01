create table public.pontos_restauracao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text,
  origem text not null check (origem in ('manual','automatico_diario','pre_acao_destrutiva','pre_restauracao')),
  criado_por uuid references auth.users(id) on delete set null,
  schema_versao integer not null default 1,
  snapshot jsonb not null,
  tamanho_bytes integer not null default 0,
  criado_em timestamptz not null default now()
);
create index pontos_restauracao_empresa_criado_idx on public.pontos_restauracao(empresa_id, criado_em desc);
alter table public.pontos_restauracao enable row level security;

create table public.pontos_restauracao_estado (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  alterado_em timestamptz not null default now(),
  ultimo_diario_em timestamptz
);
alter table public.pontos_restauracao_estado enable row level security;

create or replace function public.marcar_ponto_restauracao_pendente()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_empresa uuid;
begin
  v_empresa := coalesce(new.empresa_id, old.empresa_id);
  if v_empresa is not null then
    insert into public.pontos_restauracao_estado(empresa_id, alterado_em) values (v_empresa, now())
    on conflict (empresa_id) do update set alterado_em = excluded.alterado_em;
  end if;
  return coalesce(new, old);
end $$;

create or replace function public.criar_ponto_restauracao(p_empresa_id uuid, p_origem text, p_criado_por uuid default null, p_nome text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_snapshot jsonb; v_id uuid;
begin
  v_snapshot := jsonb_build_object('versao',1,'dados',jsonb_build_object(
    'configuracoes',coalesce((select jsonb_agg(to_jsonb(x)) from public.configuracoes x where x.empresa_id=p_empresa_id),'[]'::jsonb),
    'despesas_cadastradas',coalesce((select jsonb_agg(to_jsonb(x)) from public.despesas_cadastradas x where x.empresa_id=p_empresa_id),'[]'::jsonb),
    'lancamentos',coalesce((select jsonb_agg(to_jsonb(x)) from public.lancamentos x where x.empresa_id=p_empresa_id),'[]'::jsonb),
    'faturamentos',coalesce((select jsonb_agg(to_jsonb(x)) from public.faturamentos x where x.empresa_id=p_empresa_id),'[]'::jsonb),
    'faturamentos_entradas',coalesce((select jsonb_agg(to_jsonb(x)) from public.faturamentos_entradas x where x.empresa_id=p_empresa_id),'[]'::jsonb),
    'recorrencias',coalesce((select jsonb_agg(to_jsonb(x)) from public.recorrencias x where x.empresa_id=p_empresa_id),'[]'::jsonb),
    'agenda_itens',coalesce((select jsonb_agg(to_jsonb(x)) from public.agenda_itens x where x.empresa_id=p_empresa_id),'[]'::jsonb)
  ));
  insert into public.pontos_restauracao(empresa_id,nome,origem,criado_por,snapshot,tamanho_bytes)
  values(p_empresa_id,nullif(trim(p_nome),''),p_origem,p_criado_por,v_snapshot,octet_length(v_snapshot::text)) returning id into v_id;
  insert into public.pontos_restauracao_estado(empresa_id,alterado_em,ultimo_diario_em)
  values(p_empresa_id,now(),case when p_origem='automatico_diario' then now() else null end)
  on conflict (empresa_id) do update set ultimo_diario_em=case when p_origem='automatico_diario' then now() else pontos_restauracao_estado.ultimo_diario_em end;
  delete from public.pontos_restauracao where id in (
    select id from (select id,row_number() over(order by criado_em desc) n from public.pontos_restauracao where empresa_id=p_empresa_id and origem='manual') s where n>10
  ) or (empresa_id=p_empresa_id and origem='automatico_diario' and criado_em < now()-interval '30 days')
    or (empresa_id=p_empresa_id and origem in ('pre_acao_destrutiva','pre_restauracao') and criado_em < now()-interval '90 days');
  return v_id;
end $$;

create or replace function public.restaurar_ponto_restauracao(p_ponto_id uuid, p_criado_por uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ponto public.pontos_restauracao; v_seguro uuid; v_dados jsonb;
begin
  select * into v_ponto from public.pontos_restauracao where id=p_ponto_id for update;
  if not found then raise exception 'Ponto de restauração não encontrado.'; end if;
  v_seguro:=public.criar_ponto_restauracao(v_ponto.empresa_id,'pre_restauracao',p_criado_por,'Segurança antes da restauração');
  v_dados:=v_ponto.snapshot->'dados';
  delete from public.recorrencias where empresa_id=v_ponto.empresa_id;
  delete from public.agenda_itens where empresa_id=v_ponto.empresa_id;
  delete from public.lancamentos where empresa_id=v_ponto.empresa_id;
  delete from public.faturamentos_entradas where empresa_id=v_ponto.empresa_id;
  delete from public.faturamentos where empresa_id=v_ponto.empresa_id;
  delete from public.despesas_cadastradas where empresa_id=v_ponto.empresa_id;
  delete from public.configuracoes where empresa_id=v_ponto.empresa_id;
  insert into public.configuracoes select * from jsonb_populate_recordset(null::public.configuracoes,v_dados->'configuracoes');
  insert into public.despesas_cadastradas select * from jsonb_populate_recordset(null::public.despesas_cadastradas,v_dados->'despesas_cadastradas');
  insert into public.lancamentos select * from jsonb_populate_recordset(null::public.lancamentos,v_dados->'lancamentos');
  insert into public.faturamentos select * from jsonb_populate_recordset(null::public.faturamentos,v_dados->'faturamentos');
  insert into public.faturamentos_entradas select * from jsonb_populate_recordset(null::public.faturamentos_entradas,v_dados->'faturamentos_entradas');
  insert into public.recorrencias select * from jsonb_populate_recordset(null::public.recorrencias,v_dados->'recorrencias');
  insert into public.agenda_itens select * from jsonb_populate_recordset(null::public.agenda_itens,v_dados->'agenda_itens');
  return v_seguro;
end $$;

do $$ declare t text; begin
  foreach t in array array['configuracoes','despesas_cadastradas','lancamentos','faturamentos','faturamentos_entradas','recorrencias','agenda_itens'] loop
    execute format('drop trigger if exists pontos_restauracao_pendente on public.%I',t);
    execute format('create trigger pontos_restauracao_pendente after insert or update or delete on public.%I for each row execute function public.marcar_ponto_restauracao_pendente()',t);
  end loop;
end $$;
revoke all on function public.criar_ponto_restauracao(uuid,text,uuid,text) from public;
revoke all on function public.restaurar_ponto_restauracao(uuid,uuid) from public;
grant execute on function public.criar_ponto_restauracao(uuid,text,uuid,text) to service_role;
grant execute on function public.restaurar_ponto_restauracao(uuid,uuid) to service_role;

do $$ declare job_id bigint; begin
  select jobid into job_id from cron.job where jobname='processar-pontos-restauracao' limit 1;
  if job_id is not null then perform cron.unschedule(job_id); end if;
end $$;
select cron.schedule('processar-pontos-restauracao','0 6 * * *',$job$
  select net.http_post(
    url := 'https://qzewxhdkwettnlmkjoqd.supabase.co/functions/v1/processar-pontos-restauracao',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name='cron_edge_secret'),'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_edge_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
$job$);
