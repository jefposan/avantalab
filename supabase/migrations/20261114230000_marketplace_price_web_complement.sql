-- Complemento de pesquisa web: preserva o contrato ML e os controles de revisão/empresa.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create or replace function public.marketplace_ml_price_research(p_empresa_id uuid,p_actor_id uuid,p_product_id uuid,p_revision bigint,p_request_key uuid,p_action text,p_offers jsonb default '[]'::jsonb,p_evidence jsonb default '{}'::jsonb,p_error text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb; saved marketplace_product_price_researches;
begin
 if p_action is null or p_action not in ('claim','complete','fail') then raise exception 'Ação de pesquisa inválida.';end if;
 if p_action in ('complete','fail') then
  if jsonb_typeof(p_evidence) is distinct from 'object' or octet_length(p_evidence::text)>300000 or coalesce(p_evidence->>'provider','') not in ('mercado_livre','ml_web_search') then raise exception 'Recibo de pesquisa inválido.';end if;
  if jsonb_typeof(p_offers) is distinct from 'array' or jsonb_array_length(p_offers)>200 then raise exception 'Amostra inválida.';end if;
  if p_action='complete' and jsonb_array_length(p_offers)>0 then
   if p_evidence->>'provider'='ml_web_search' then
    -- O servidor comprova a página de origem. O recibo mantém o ML original;
    -- esta função só é executável pelo service_role, nunca pelo navegador.
    if p_evidence->>'status' is distinct from 'ready'
     or p_evidence->'offers' is distinct from p_offers
     or coalesce(p_evidence->>'count','') !~ '^[0-9]{1,2}$'
     or (p_evidence->>'count')::integer<>jsonb_array_length(p_offers)
     or jsonb_array_length(p_offers)>10
     or p_evidence->'mlResearch'->>'provider' is distinct from 'mercado_livre'
     or coalesce(p_evidence->'mlResearch'->>'count','') !~ '^[0-2]$'
     or coalesce(p_evidence->'mlResearch'->>'status','') not in ('ready','insufficient','identity_unconfirmed','unavailable')
     or jsonb_typeof(p_evidence->'mlResearch'->'offers') is distinct from 'array'
     or jsonb_array_length(p_evidence->'mlResearch'->'offers')<>(p_evidence->'mlResearch'->>'count')::integer
     or p_evidence->'mlResearch'->'catalogId' is distinct from p_evidence->'catalogId'
     or p_evidence->'complement'->>'status' is distinct from 'completed'
     or coalesce(p_evidence->'complement'->>'accepted','') !~ '^[1-8]$'
     or (p_evidence->'complement'->>'accepted')::integer<>(select count(*) from jsonb_array_elements(p_offers) o where o->>'source'='openai_web_search')
     then raise exception 'Recibo complementar inválido.';end if;
    if not exists(select 1 from jsonb_array_elements(p_offers) o where o->>'source'='openai_web_search')
     or (select count(distinct o->>'sellerId') from jsonb_array_elements(p_offers) o)<>jsonb_array_length(p_offers)
     then raise exception 'Amostra complementar inválida.';end if;
    if exists(select 1 from jsonb_array_elements(p_offers) o where
     case when o->>'source'='openai_web_search' then
      coalesce(o->>'sellerId','') !~ '^web:[a-z0-9.-]+$'
      or o->>'id' is distinct from o->>'sellerId'
      or coalesce(o->>'url','') !~ '^https://[a-z0-9.-]+/'
      or split_part(substring(o->>'url' from 9),'/',1) !~ ('^(www\.)?'||replace(substring(o->>'sellerId' from 5),'.','\.')||'$')
      or o->>'sellerId' ~ '(mercadolivre|mercadolibre|meli\.la)'
      or o->'origin'->>'title' is distinct from o->>'title'
      or o->'origin'->>'url' is distinct from o->>'url'
      or o->'origin'->'price' is distinct from o->'price'
      or o->'origin'->>'availability' is distinct from 'in_stock'
      or coalesce(o->'origin'->>'method','') not in ('json_ld','microdata','primary_dom')
      or coalesce(o->'origin'->>'checkedAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
     else
      coalesce(o->>'sellerId','') !~ '^[1-9][0-9]{0,19}$'
      or coalesce(o->>'id','') !~ '^MLB[0-9]{3,20}$'
      or coalesce(p_evidence->>'catalogId','') !~ '^MLB[0-9]{3,20}$'
      or o->>'url' is distinct from 'https://www.mercadolivre.com.br/p/'||(p_evidence->>'catalogId')||'?pdp_filters=item_id%3A'||(o->>'id')
      or not ((p_evidence->'mlResearch'->'offers') @> jsonb_build_array(o))
     end) then raise exception 'Fonte complementar não comprovada.';end if;
    if exists(select 1 from jsonb_array_elements(p_offers) o join marketplace_connections c on c.empresa_id=p_empresa_id and c.provider='mercado_livre' and c.seller_reference=o->>'sellerId') then raise exception 'Conta própria na amostra.';end if;
   else
   if p_evidence->>'status' is distinct from 'ready' or coalesce(p_evidence->>'count','') !~ '^[0-9]{1,3}$'
    or (p_evidence->>'count')::integer<>jsonb_array_length(p_offers) or p_evidence->'offers' is distinct from p_offers
    or jsonb_array_length(p_offers)<1 or coalesce(p_evidence->>'catalogId','') !~ '^MLB[0-9]{3,20}$' then raise exception 'Amostra insuficiente ou não confirmada.';end if;
   if exists(select 1 from jsonb_array_elements(p_offers) o where coalesce(o->>'sellerId','') !~ '^[1-9][0-9]{0,19}$' or coalesce(o->>'id','') !~ '^MLB[0-9]{3,20}$'
    or o->>'url' is distinct from 'https://www.mercadolivre.com.br/p/'||(p_evidence->>'catalogId')||'?pdp_filters=item_id%3A'||(o->>'id')) then raise exception 'Fonte de oferta inválida.';end if;
   if (select count(distinct o->>'sellerId') from jsonb_array_elements(p_offers) o)<>jsonb_array_length(p_offers) then raise exception 'Vendedor repetido na amostra.';end if;
   if exists(select 1 from jsonb_array_elements(p_offers) o join marketplace_connections c on c.empresa_id=p_empresa_id and c.provider='mercado_livre' and c.seller_reference=o->>'sellerId') then raise exception 'Conta própria na amostra.';end if;
   end if;
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
