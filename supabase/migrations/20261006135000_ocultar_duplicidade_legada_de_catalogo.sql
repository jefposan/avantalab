-- Oculta apenas a cópia legada repetida que restou após a conciliação: o
-- registro histórico continua no banco e pedidos já emitidos seguem intactos.
begin;

create temp table catalogo_produtos_legados_repetidos on commit drop as
select distinct on (repetido.id)
  repetido.id as repetido_id
from public.vendas_mobile_produtos referencia
join public.vendas_mobile_catalogo_produtos origem
  on origem.id = referencia.catalogo_produto_origem_id
join public.vendas_mobile_produtos repetido
  on repetido.conta_id = referencia.conta_id
 and repetido.catalogo_empresa_id = referencia.catalogo_empresa_id
 and repetido.catalogo_produto_origem_id is null
 and repetido.ativo = true
 and repetido.criado_em > referencia.criado_em
 and (
   (nullif(trim(origem.sku), '') is not null
     and upper(trim(coalesce(repetido.sku, ''))) = upper(trim(origem.sku)))
   or
   (nullif(trim(origem.sku), '') is null
     and lower(trim(repetido.nome)) = lower(trim(origem.nome)))
 )
where referencia.catalogo_produto_origem_id is not null
  and referencia.ativo = true
order by repetido.id, referencia.criado_em, referencia.id;

update public.vendas_mobile_produtos repetido
   set ativo = false,
       atualizado_em = now()
  from catalogo_produtos_legados_repetidos candidato
 where repetido.id = candidato.repetido_id;

commit;
