-- Saldo local informado é a referência; importar outro anúncio não reabre conferência.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $$
declare definition text; source_function regprocedure; changed text;
begin
 source_function := (select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('marketplace_listing_catalog_import','marketplace_listing_catalog_import_before_removal')
 and p.proargtypes='2950 2950 25'::oidvector and position('if canonical is null then' in p.prosrc)>0);
 if source_function is null then raise exception 'Importador original não encontrado; nenhuma regra foi alterada.';end if;
 definition:=pg_get_functiondef(source_function);
 changed:=replace(definition,'if canonical is null then','if canonical is null and exists(select 1 from marketplace_products where empresa_id=p_empresa and id=target and stock_quantity is null) then');
 if changed=definition then raise exception 'Contrato do importador mudou.';end if;
 execute changed;
 definition:=pg_get_functiondef('public.marketplace_import_choose_local(uuid,uuid,uuid,text,uuid,uuid)'::regprocedure);
 changed:=replace(definition,'set listing_stock_review_at=clock_timestamp(),revision=revision+1,updated_at=now() where empresa_id=p_empresa and id=p_product and archived_at is null;',
 'set listing_stock_review_at=case when stock_quantity is null then clock_timestamp() else null end,revision=revision+1,updated_at=now() where empresa_id=p_empresa and id=p_product and archived_at is null;');
 if changed=definition then raise exception 'Contrato da escolha de cadastro mudou.';end if;
 changed:=replace(changed,'and product_id=p_product and state=''pending'';',
 'and product_id=p_product and state=''pending'' and exists(select 1 from marketplace_products where empresa_id=p_empresa and id=p_product and listing_stock_review_at is not null);');
 execute changed;
end $$;
-- Remove somente marcadores indevidos de produtos com saldo efetivamente registrado.
-- Não fabrica confirmação física nem movimenta unidades de qualquer depósito.
do $$ declare p record;begin
 for p in update public.marketplace_products set listing_stock_review_at=null,revision=revision+1,updated_at=now()
   where archived_at is null and stock_quantity is not null and listing_stock_review_at is not null returning empresa_id,id,stock_confirmed_at
 loop
   if p.stock_confirmed_at is not null then perform public.marketplace_enqueue_stock(p.empresa_id,p.id,false);end if;
 end loop;
end $$;
commit;
