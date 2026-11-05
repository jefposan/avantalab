-- Uma resposta válida sem pontuação numérica não apaga a avaliação anterior.
create or replace function public.marketplace_quality_save(p_company uuid,p_connection uuid,p_listing text,p_result jsonb,p_issue text) returns void
language plpgsql security definer set search_path=public as $$declare point numeric;stamp timestamptz;has_quality boolean;begin
 if not exists(select 1 from marketplace_connections where id=p_connection and empresa_id=p_company) then raise exception 'Conta inválida.';end if;
 stamp:=(p_result->>'checkedAt')::timestamptz;
 select (q->>'score')::numeric into point from jsonb_array_elements(p_result->'quality') q order by case when q->>'entityType'='ITEM' then 0 else 1 end limit 1;
 has_quality:=point is not null;
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
notify pgrst,'reload schema';
