-- Aceita uma ou duas ofertas válidas após a coleta completa do catálogo.
-- Preserva identificação, fontes, vendedores únicos, permissões e idempotência.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $migration$
declare definition text;
begin
 definition:=pg_get_functiondef('public.marketplace_ml_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,jsonb,text)'::regprocedure);
 if strpos(definition,'jsonb_array_length(p_offers)<3')=0 then raise exception 'Contrato de pesquisa ML não reconhecido.';end if;
 execute replace(definition,'jsonb_array_length(p_offers)<3','jsonb_array_length(p_offers)<1');
end $migration$;
notify pgrst,'reload schema';
commit;
