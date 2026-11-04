-- Inclui as ferramentas web no recibo, mantendo a reserva US$ 0,10 e teto mensal existente.
begin;
create or replace function public.marketplace_quality_ai_finish(p_company uuid,p_actor uuid,p_id uuid,p_status text,p_result jsonb,p_usage jsonb) returns void
language plpgsql security definer set search_path=public as $$declare charge bigint:=100000;job marketplace_quality_ai_jobs;calls numeric;begin
 select * into job from marketplace_quality_ai_jobs where id=p_id and empresa_id=p_company and actor_id=p_actor for update;
 if not found or job.status<>'reserved' or p_status not in ('completed','failed') then raise exception 'Tentativa inválida ou já concluída.';end if;
 calls:=case when p_usage ? 'webCalls' and jsonb_typeof(p_usage->'webCalls')='number' then (p_usage->>'webCalls')::numeric when not(p_usage ? 'webCalls') then 0 else null end;
 if jsonb_typeof(p_usage->'inputTokens')='number' and jsonb_typeof(p_usage->'outputTokens')='number'
  and (p_usage->>'inputTokens')::numeric between 0 and 60000 and (p_usage->>'outputTokens')::numeric between 0 and 3000
  and calls between 0 and 2 and calls=trunc(calls) then
  charge:=ceil((p_usage->>'inputTokens')::numeric*0.75+(p_usage->>'outputTokens')::numeric*4.5+calls*10000);
 end if;
 update marketplace_quality_ai_jobs set status=p_status,cost_microusd=charge,result=p_result,usage=p_usage,finished_at=now() where id=job.id;
end $$;
revoke all on function public.marketplace_quality_ai_finish(uuid,uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_quality_ai_finish(uuid,uuid,uuid,text,jsonb,jsonb) to service_role;
-- Endpoint novo impede iniciar pesquisa em ambiente que ainda não recebeu este recibo.
create or replace function public.marketplace_quality_ai_research_claim(p_company uuid,p_actor uuid,p_product uuid,p_hash text,p_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$begin
 return public.marketplace_quality_ai_claim(p_company,p_actor,p_product,p_hash,p_key)||jsonb_build_object('researchPricingVersion',1);
end $$;
revoke all on function public.marketplace_quality_ai_research_claim(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_quality_ai_research_claim(uuid,uuid,uuid,text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
