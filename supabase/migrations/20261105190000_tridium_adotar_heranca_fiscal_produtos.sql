-- Solicitação expressa: todos os produtos existentes da Tridium usam a empresa.
-- Não modifica NCM, CEST, códigos guardados, estoque, valores ou retratos de notas.
begin;
do $$
declare
  catalogo uuid;
  empresa constant uuid := 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
  origem_backup constant text := '3.2.0.330:heranca-fiscal-tridium';
begin
  for catalogo in
    select c.id from public.vendas_mobile_catalogos c
    where c.empresa_id = empresa
      and exists (select 1 from public.vendas_mobile_catalogo_produtos p where p.catalogo_id=c.id and p.tipo_item='produto' and p.excluido_em is null)
      and not exists (select 1 from public.custos_importacoes_catalogo_backups b where b.empresa_id=empresa and b.catalogo_id=c.id and b.origem=origem_backup)
    for update
  loop
    insert into public.custos_importacoes_catalogo_backups(empresa_id,catalogo_id,origem,retrato)
      select empresa,catalogo,origem_backup,jsonb_build_object('produtos',jsonb_agg(jsonb_build_object('id',p.id,'usar_fiscal_empresa',p.usar_fiscal_empresa)))
      from public.vendas_mobile_catalogo_produtos p where p.catalogo_id=catalogo and p.tipo_item='produto' and p.excluido_em is null;
    update public.vendas_mobile_catalogo_produtos p set usar_fiscal_empresa=true
      where p.catalogo_id=catalogo and p.tipo_item='produto' and p.excluido_em is null and p.usar_fiscal_empresa is distinct from true;
  end loop;
end $$;
commit;
