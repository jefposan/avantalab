-- 3.2.0.80: cache/limites/consumo por empresa. Nenhuma chamada ao provedor nesta migração.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.marketplace_price_ai_jobs (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id),
 actor_id uuid not null references auth.users(id), query_hash text not null check(length(query_hash)=64),
 include_facts boolean not null, model text not null default 'gpt-5.4-mini' check(model='gpt-5.4-mini'),
 status text not null check(status in ('pending','completed','failed','cancelled')),
 result jsonb, usage jsonb not null default '{}', error_code text,
 created_at timestamptz not null default now(), finished_at timestamptz, expires_at timestamptz
);
alter table public.marketplace_price_ai_jobs enable row level security;
revoke all on public.marketplace_price_ai_jobs from public,anon,authenticated;
grant select on public.marketplace_price_ai_jobs to service_role;
create index marketplace_price_ai_cache_idx on public.marketplace_price_ai_jobs(empresa_id,query_hash,created_at desc);
create index marketplace_price_ai_budget_idx on public.marketplace_price_ai_jobs(empresa_id,created_at desc);
create unique index marketplace_price_ai_pending_idx on public.marketplace_price_ai_jobs(empresa_id,query_hash) where status='pending';

create function public.marketplace_price_ai_claim(p_company uuid,p_actor uuid,p_hash text,p_facts boolean)returns jsonb
language plpgsql security definer set search_path=public as $$
declare job marketplace_price_ai_jobs;
begin
 if p_hash is null or p_facts is null or p_hash!~'^[a-f0-9]{64}$'
 or not exists(select 1 from empresa_modulos m where m.empresa_id=p_company and m.modulo_id='marketplaces' and m.ativo and (m.expira_em is null or m.expira_em>now()))
 or not(exists(select 1 from usuarios_empresa where empresa_id=p_company and user_id=p_actor and status='ativo') or exists(select 1 from marketplace_price_users where empresa_id=p_company and user_id=p_actor and ativo)) then raise exception 'Acesso inválido';end if;
 -- Serializa os contadores da empresa, inclusive entre instâncias serverless.
 perform pg_advisory_xact_lock(hashtextextended('price-ai:'||p_company::text,0));
 select * into job from marketplace_price_ai_jobs where empresa_id=p_company and query_hash=p_hash and status='completed' and expires_at>now() and (include_facts or not p_facts) order by created_at desc limit 1;
 if found then return jsonb_build_object('status','cached','result',job.result,'researchedAt',job.created_at);end if;
 if exists(select 1 from marketplace_price_ai_jobs where empresa_id=p_company and query_hash=p_hash and status='pending' and created_at>now()-interval '2 minutes') then return jsonb_build_object('status','busy');end if;
 update marketplace_price_ai_jobs set status='failed',error_code='lease_expired',finished_at=now() where empresa_id=p_company and query_hash=p_hash and status='pending';
 if exists(select 1 from marketplace_price_ai_jobs where empresa_id=p_company and query_hash=p_hash and created_at>now()-interval '1 minute') then return jsonb_build_object('status','cooldown');end if;
 if (select count(*) from marketplace_price_ai_jobs where empresa_id=p_company and actor_id=p_actor and created_at>now()-interval '1 minute')>=5
 or (select count(*) from marketplace_price_ai_jobs where empresa_id=p_company and created_at>now()-interval '1 hour')>=30
 or (select count(*) from marketplace_price_ai_jobs where empresa_id=p_company and created_at>now()-interval '24 hours')>=100 then return jsonb_build_object('status','limited');end if;
 insert into marketplace_price_ai_jobs(empresa_id,actor_id,query_hash,include_facts,status)values(p_company,p_actor,p_hash,p_facts,'pending')returning * into job;
 return jsonb_build_object('status','claimed','id',job.id);
end $$;

create function public.marketplace_price_ai_finish(p_company uuid,p_actor uuid,p_id uuid,p_status text,p_result jsonb,p_usage jsonb,p_error text)returns void
language plpgsql security definer set search_path=public as $$begin
 if p_status not in ('completed','failed','cancelled') then raise exception 'Estado inválido';end if;
 update marketplace_price_ai_jobs set status=p_status,result=case when p_status='completed' then p_result end,
 usage=coalesce(p_usage,'{}'),error_code=p_error,finished_at=now(),
 expires_at=case when p_status='completed' then now()+case when p_result->'sample'<>'null'::jsonb then interval '6 hours' else interval '10 minutes' end end
 where id=p_id and empresa_id=p_company and actor_id=p_actor and status='pending';
 if not found then raise exception 'Reserva não disponível';end if;
end $$;
revoke all on function public.marketplace_price_ai_claim(uuid,uuid,text,boolean),public.marketplace_price_ai_finish(uuid,uuid,uuid,text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.marketplace_price_ai_claim(uuid,uuid,text,boolean),public.marketplace_price_ai_finish(uuid,uuid,uuid,text,jsonb,jsonb,text) to service_role;
commit;
