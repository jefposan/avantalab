-- A leitura/importação de uma conta não revoga a reposição já confirmada
-- para as demais. A autorização vale apenas para a mesma revisão e saldo,
-- enquanto pendente; vendas, novas revisões e envios concluídos não a herdam.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $migration$
declare definition text; changed text;
begin
 definition:=pg_get_functiondef('public.marketplace_enqueue_stock(uuid,uuid,boolean)'::regprocedure);
 changed:=replace(definition,'allow_increase=excluded.allow_increase,',
 'allow_increase=excluded.allow_increase or (marketplace_inventory_outbox.state=''pending'' and marketplace_inventory_outbox.allow_increase and marketplace_inventory_outbox.empresa_id=excluded.empresa_id and marketplace_inventory_outbox.product_id=excluded.product_id and marketplace_inventory_outbox.revision=excluded.revision and marketplace_inventory_outbox.desired_quantity=excluded.desired_quantity),');
 if changed=definition then raise exception 'Contrato do enfileiramento mudou; nenhuma regra foi alterada.';end if;
 execute changed;
end $migration$;
commit;
