-- Apenas amplia a amostra para oito; preserva a média, revisão, autorização e auditoria.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $migration$
declare definition text;old_limit text:='jsonb_array_length(p_offers)>5';
begin
 definition:=pg_get_functiondef('public.marketplace_product_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,text)'::regprocedure);
 if strpos(definition,'jsonb_array_length(p_offers)>8')>0 then return;end if;
 if strpos(definition,old_limit)=0 then raise exception 'Limite de ofertas não reconhecido. Nenhuma função alterada.';end if;
 execute replace(definition,old_limit,'jsonb_array_length(p_offers)>8');
end $migration$;
notify pgrst,'reload schema';
commit;
