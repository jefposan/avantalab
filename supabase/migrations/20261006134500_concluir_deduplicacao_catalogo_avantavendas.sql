-- Conclui a correção de cópias geradas pelo sincronizador anterior quando
-- já existiam dois produtos legados com o mesmo nome. Mantemos o produto
-- legado mais antigo como referência e nunca apagamos registros.
begin;

create temp table catalogo_produtos_duplicados_remanescentes on commit drop as
select distinct on (novo.id)
  novo.id as novo_id,
  legado.id as legado_id,
  novo.conta_id,
  novo.catalogo_produto_origem_id
from public.vendas_mobile_produtos novo
join public.vendas_mobile_catalogo_produtos origem
  on origem.id = novo.catalogo_produto_origem_id
join public.vendas_mobile_produtos legado
  on legado.conta_id = novo.conta_id
 and legado.catalogo_empresa_id = novo.catalogo_empresa_id
 and legado.catalogo_produto_origem_id is null
 and legado.ativo = true
 and legado.criado_em < novo.criado_em
 and (
   (nullif(trim(origem.sku), '') is not null
     and upper(trim(coalesce(legado.sku, ''))) = upper(trim(origem.sku)))
   or
   (nullif(trim(origem.sku), '') is null
     and lower(trim(legado.nome)) = lower(trim(origem.nome)))
 )
where novo.catalogo_produto_origem_id is not null
  and novo.ativo = true
order by novo.id, legado.criado_em, legado.id;

update public.vendas_mobile_produtos legado
   set catalogo_produto_origem_id = duplicado.catalogo_produto_origem_id,
       atualizado_em = now()
  from catalogo_produtos_duplicados_remanescentes duplicado
 where legado.id = duplicado.legado_id
   and legado.catalogo_produto_origem_id is null;

update public.vendas_mobile_contas_catalogo_recebimentos recebimento
   set produto_id = duplicado.legado_id,
       atualizado_em = now()
  from catalogo_produtos_duplicados_remanescentes duplicado
 where recebimento.conta_id = duplicado.conta_id
   and recebimento.catalogo_produto_id = duplicado.catalogo_produto_origem_id;

update public.vendas_mobile_produtos novo
   set ativo = false,
       atualizado_em = now()
  from catalogo_produtos_duplicados_remanescentes duplicado
 where novo.id = duplicado.novo_id;

commit;
