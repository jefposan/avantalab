-- Normalização portuguesa nas projeções de anúncios, inclusive registros antigos.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create function public.marketplace_search_normalize(value text)returns text
language sql immutable parallel safe set search_path=public as $$
 select regexp_replace(lower(translate(regexp_replace(btrim(coalesce(value,'')),'[̀-ͯ]','','g'),
 'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäåéèêëíìîïóòôõöúùûüçñ',
 'AAAAAAEEEEIIIIOOOOOUUUUCNaaaaaaeeeeiiiiooooouuuucn')),'[[:space:]]+',' ','g')
$$;
create function public.marketplace_listing_search_normalize()returns trigger language plpgsql set search_path=public as $$begin
 new.search_text:=marketplace_search_normalize(concat_ws(' ',new.title,new.provider_listing_id,new.snapshot->>'ean',new.snapshot->>'sku'));
 return new;
end $$;
create trigger marketplace_listing_search_normalize before insert or update of title,provider_listing_id,snapshot,search_text on public.marketplace_listings for each row execute function public.marketplace_listing_search_normalize();
update public.marketplace_listings set search_text=marketplace_search_normalize(concat_ws(' ',title,provider_listing_id,snapshot->>'ean',snapshot->>'sku'))
 where search_text is distinct from marketplace_search_normalize(concat_ws(' ',title,provider_listing_id,snapshot->>'ean',snapshot->>'sku'));
commit;
