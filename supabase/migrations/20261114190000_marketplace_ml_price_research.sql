-- Pesquisa direta no catálogo ML, com recibo e sem chamadas de IA.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.marketplace_product_price_researches add column evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object');
create index marketplace_product_research_latest on public.marketplace_product_price_researches(empresa_id,product_id,created_at desc);
alter table public.marketplace_price_consultations add column market_evidence jsonb check(market_evidence is null or jsonb_typeof(market_evidence)='object');
alter table public.marketplace_price_consultations drop constraint marketplace_price_consultations_sample_source_check;
alter table public.marketplace_price_consultations add constraint marketplace_price_consultations_sample_source_check check(sample_source in ('active_offers','catalog_reference','manual_reference','google_shopping','openai_web_search','local_reference','mercadolivre_catalog'));

-- Preserva o comando atual (permissões, revisão, trava, limites e repetição).
-- Só amplia o teto: a chamada de IA antiga continua limitada a oito no código.
do $migration$
declare definition text;
begin
 definition:=pg_get_functiondef('public.marketplace_product_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,text)'::regprocedure);
 if strpos(definition,'jsonb_array_length(p_offers)>8')=0 then raise exception 'Contrato de pesquisa não reconhecido.';end if;
 execute replace(definition,'jsonb_array_length(p_offers)>8','jsonb_array_length(p_offers)>200');
end $migration$;

create function public.marketplace_ml_price_research(p_empresa_id uuid,p_actor_id uuid,p_product_id uuid,p_revision bigint,p_request_key uuid,p_action text,p_offers jsonb default '[]'::jsonb,p_evidence jsonb default '{}'::jsonb,p_error text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb; saved marketplace_product_price_researches;
begin
 if p_action is null or p_action not in ('claim','complete','fail') then raise exception 'Ação de pesquisa inválida.';end if;
 if p_action in ('complete','fail') then
  if jsonb_typeof(p_evidence) is distinct from 'object' or octet_length(p_evidence::text)>300000 or p_evidence->>'provider' is distinct from 'mercado_livre' then raise exception 'Recibo de pesquisa inválido.';end if;
  if jsonb_typeof(p_offers) is distinct from 'array' or jsonb_array_length(p_offers)>200 then raise exception 'Amostra inválida.';end if;
  if p_action='complete' and jsonb_array_length(p_offers)>0 then
   if p_evidence->>'status' is distinct from 'ready' or coalesce(p_evidence->>'count','') !~ '^[0-9]{1,3}$'
    or (p_evidence->>'count')::integer<>jsonb_array_length(p_offers) or p_evidence->'offers' is distinct from p_offers
    or jsonb_array_length(p_offers)<3 or coalesce(p_evidence->>'catalogId','') !~ '^MLB[0-9]{3,20}$' then raise exception 'Amostra insuficiente ou não confirmada.';end if;
   if exists(select 1 from jsonb_array_elements(p_offers) o where coalesce(o->>'sellerId','') !~ '^[1-9][0-9]{0,19}$' or coalesce(o->>'id','') !~ '^MLB[0-9]{3,20}$'
    or o->>'url' is distinct from 'https://www.mercadolivre.com.br/p/'||(p_evidence->>'catalogId')||'?pdp_filters=item_id%3A'||(o->>'id')) then raise exception 'Fonte de oferta inválida.';end if;
   if (select count(distinct o->>'sellerId') from jsonb_array_elements(p_offers) o)<>jsonb_array_length(p_offers) then raise exception 'Vendedor repetido na amostra.';end if;
   if exists(select 1 from jsonb_array_elements(p_offers) o join marketplace_connections c on c.empresa_id=p_empresa_id and c.provider='mercado_livre' and c.seller_reference=o->>'sellerId') then raise exception 'Conta própria na amostra.';end if;
  elsif p_action='complete' and p_evidence->>'status'='ready' then raise exception 'Resultado sem ofertas.';
  end if;
 end if;
 result:=marketplace_product_price_research(p_empresa_id,p_actor_id,p_product_id,p_revision,p_request_key,p_action,p_offers,p_error);
 -- Repetir uma conclusão recupera o recibo original; não substitui sua evidência.
 select * into saved from marketplace_product_price_researches where empresa_id=p_empresa_id and request_key=p_request_key for update;
 if p_action in ('complete','fail') and saved.evidence='{}'::jsonb then
  update marketplace_product_price_researches set evidence=p_evidence where empresa_id=p_empresa_id and request_key=p_request_key;
 end if;
 return result;
end $$;
revoke all on function public.marketplace_ml_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.marketplace_ml_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,jsonb,text) to service_role;
notify pgrst,'reload schema';
commit;
