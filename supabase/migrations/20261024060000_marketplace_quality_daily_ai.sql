begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create table public.marketplace_listing_quality (
 empresa_id uuid not null references public.empresas(id),connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
 listing_id text not null,score numeric check(score between 0 and 100),result jsonb,checked_at timestamptz,issue text,
 next_check_at timestamptz not null default now(),lease_owner uuid,lease_until timestamptz,
 primary key(connection_id,listing_id)
);
create index marketplace_quality_due on public.marketplace_listing_quality(next_check_at);
alter table public.marketplace_listing_quality enable row level security;
revoke all on public.marketplace_listing_quality from public,anon,authenticated;
grant select,insert,update on public.marketplace_listing_quality to service_role;

create function public.marketplace_quality_claim(p_owner uuid) returns jsonb
language plpgsql security definer set search_path=public as $$declare jobs jsonb;begin
 insert into marketplace_listing_quality(empresa_id,connection_id,listing_id)
 select s.empresa_id,s.connection_id,s.provider_listing_id from marketplace_listings s
 join marketplace_connections c on c.id=s.connection_id and c.empresa_id=s.empresa_id
 join empresa_modulos m on m.empresa_id=s.empresa_id and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())
 where c.provider='mercado_livre' and c.status='connected' and s.status in ('active','paused','under_review','inactive')
 and not exists(select 1 from marketplace_listing_quality q where q.connection_id=s.connection_id and q.listing_id=s.provider_listing_id)
 order by s.connection_id,s.provider_listing_id limit 100
 on conflict(connection_id,listing_id) do nothing;
 with selected as (select q.connection_id,q.listing_id from marketplace_listing_quality q
 join marketplace_connections c on c.id=q.connection_id and c.empresa_id=q.empresa_id and c.status='connected'
 join marketplace_listings s on s.connection_id=q.connection_id and s.provider_listing_id=q.listing_id and s.empresa_id=q.empresa_id
 join empresa_modulos m on m.empresa_id=q.empresa_id and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())
 where q.next_check_at<=now() and (q.lease_until is null or q.lease_until<now()) and s.status in ('active','paused','under_review','inactive')
 order by q.next_check_at,q.connection_id,q.listing_id limit 5 for update of q skip locked), claimed as (
 update marketplace_listing_quality q set lease_owner=p_owner,lease_until=now()+interval '2 minutes'
 from selected s where s.connection_id=q.connection_id and s.listing_id=q.listing_id returning q.*)
 select coalesce(jsonb_agg(to_jsonb(claimed)),'[]') into jobs from claimed;
 return jobs;
end $$;
revoke all on function public.marketplace_quality_claim(uuid) from public,anon,authenticated;
grant execute on function public.marketplace_quality_claim(uuid) to service_role;

create function public.marketplace_quality_save(p_company uuid,p_connection uuid,p_listing text,p_result jsonb,p_issue text) returns void
language plpgsql security definer set search_path=public as $$declare point numeric;stamp timestamptz;has_quality boolean;begin
 if not exists(select 1 from marketplace_connections where id=p_connection and empresa_id=p_company) then raise exception 'Conta inválida.';end if;
 stamp:=(p_result->>'checkedAt')::timestamptz;
 select (q->>'score')::numeric into point from jsonb_array_elements(p_result->'quality') q order by case when q->>'entityType'='ITEM' then 0 else 1 end limit 1;
 has_quality:=jsonb_array_length(p_result->'quality')>0;
 insert into marketplace_listing_quality(empresa_id,connection_id,listing_id,score,result,checked_at,issue,next_check_at)
 values(p_company,p_connection,p_listing,point,case when has_quality then p_result end,case when has_quality then stamp end,p_issue,now()+case when has_quality then interval '24 hours' else interval '1 hour' end)
 on conflict(connection_id,listing_id) do update set
 score=case when has_quality then excluded.score else marketplace_listing_quality.score end,
 result=case when has_quality then excluded.result else marketplace_listing_quality.result end,
 checked_at=case when has_quality then excluded.checked_at else marketplace_listing_quality.checked_at end,
 issue=excluded.issue,next_check_at=excluded.next_check_at
 where marketplace_listing_quality.empresa_id=p_company and (marketplace_listing_quality.checked_at is null or marketplace_listing_quality.checked_at<=stamp);
end $$;
revoke all on function public.marketplace_quality_save(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.marketplace_quality_save(uuid,uuid,text,jsonb,text) to service_role;

create table public.marketplace_quality_ai_jobs (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas(id),product_id uuid not null,
 actor_id uuid not null,request_key uuid not null,fingerprint text not null,month date not null,
 status text not null default 'reserved' check(status in ('reserved','completed','failed')),cost_microusd bigint not null default 100000 check(cost_microusd between 0 and 100000),
 result jsonb,usage jsonb,created_at timestamptz not null default now(),finished_at timestamptz,
 unique(empresa_id,request_key)
);
create index marketplace_quality_ai_month on public.marketplace_quality_ai_jobs(empresa_id,month);
alter table public.marketplace_quality_ai_jobs enable row level security;
revoke all on public.marketplace_quality_ai_jobs from public,anon,authenticated;
grant select on public.marketplace_quality_ai_jobs to service_role;
create function public.marketplace_quality_ai_claim(p_company uuid,p_actor uuid,p_product uuid,p_hash text,p_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare period date:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;used bigint;job marketplace_quality_ai_jobs;
begin
 if not exists(select 1 from usuarios_empresa u join empresa_modulos m on m.empresa_id=u.empresa_id where u.empresa_id=p_company and u.user_id=p_actor and u.status='ativo' and u.perfil in ('gestor_master','administrador','operador_completo') and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now())) then raise exception 'Sem permissão para completar anúncios com IA.';end if;
 if p_key is null or p_hash !~ '^[a-f0-9]{64}$' or not exists(select 1 from marketplace_products where id=p_product and empresa_id=p_company and archived_at is null) then raise exception 'Produto ou tentativa inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended('quality-ai:'||p_company::text||':'||period::text,0));
 select * into job from marketplace_quality_ai_jobs where empresa_id=p_company and request_key=p_key;
 if found then
  if job.actor_id<>p_actor or job.product_id<>p_product or job.fingerprint<>p_hash then raise exception 'Tentativa já utilizada com outros dados.';end if;
  return jsonb_build_object('status',case when job.status='completed' then 'cached' else 'busy' end,'result',job.result);
 end if;
 select * into job from marketplace_quality_ai_jobs where empresa_id=p_company and product_id=p_product and fingerprint=p_hash and status='completed' and created_at>now()-interval '24 hours' order by created_at desc limit 1;
 if found then return jsonb_build_object('status','cached','result',job.result);end if;
 if exists(select 1 from marketplace_quality_ai_jobs where empresa_id=p_company and product_id=p_product and status='reserved' and created_at>now()-interval '2 minutes') then return jsonb_build_object('status','busy');end if;
 select coalesce(sum(cost_microusd),0) into used from marketplace_quality_ai_jobs where empresa_id=p_company and month=period;
 if used+100000>5000000 then return jsonb_build_object('status','limited','usedMicrousd',used);end if;
 insert into marketplace_quality_ai_jobs(empresa_id,actor_id,product_id,request_key,fingerprint,month) values(p_company,p_actor,p_product,p_key,p_hash,period) returning * into job;
 return jsonb_build_object('status','claimed','id',job.id,'usedMicrousd',used+100000);
end $$;
create function public.marketplace_quality_ai_finish(p_company uuid,p_actor uuid,p_id uuid,p_status text,p_result jsonb,p_usage jsonb) returns void
language plpgsql security definer set search_path=public as $$declare charge bigint:=100000;job marketplace_quality_ai_jobs;begin
 select * into job from marketplace_quality_ai_jobs where id=p_id and empresa_id=p_company and actor_id=p_actor for update;
 if not found or job.status<>'reserved' or p_status not in ('completed','failed') then raise exception 'Tentativa inválida ou já concluída.';end if;
 if jsonb_typeof(p_usage->'inputTokens')='number' and jsonb_typeof(p_usage->'outputTokens')='number'
  and (p_usage->>'inputTokens')::numeric between 0 and 60000 and (p_usage->>'outputTokens')::numeric between 0 and 3000 then
  charge:=ceil((p_usage->>'inputTokens')::numeric*0.75+(p_usage->>'outputTokens')::numeric*4.5);
 end if;
 -- Sem recibo de consumo, conserva a reserva máxima; nunca libera gasto incerto.
 update marketplace_quality_ai_jobs set status=p_status,cost_microusd=charge,result=p_result,usage=p_usage,finished_at=now() where id=job.id;
end $$;
revoke all on function public.marketplace_quality_ai_claim(uuid,uuid,uuid,text,uuid),public.marketplace_quality_ai_finish(uuid,uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_quality_ai_claim(uuid,uuid,uuid,text,uuid),public.marketplace_quality_ai_finish(uuid,uuid,uuid,text,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
