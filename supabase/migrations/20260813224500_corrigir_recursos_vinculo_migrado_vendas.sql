-- Corrige somente as preferencias comerciais que, na primeira separacao por
-- conta, foram herdadas da empresa financeira em vez do fornecedor real.
-- Nenhum registro operacional e alterado por esta migracao.

create temporary table av_vendas_preservacao_recursos on commit drop as
select
  (select count(*) from public.vendas_mobile_produtos) as produtos,
  (select count(*) from public.vendas_mobile_clientes) as clientes,
  (select count(*) from public.vendas_mobile_pedidos) as pedidos,
  (select count(*) from public.vendas_mobile_pagamentos) as pagamentos;

update public.vendas_mobile_contas_recursos r
set
  novidades_ativas = legado.novidades_ativas,
  divulgacao_ativa = legado.divulgacao_ativa,
  catalogo_ativo = legado.catalogo_ativo,
  atualizado_em = now()
from public.vendas_mobile_contas_vinculos_comerciais vinculo
join public.vendas_mobile_contas conta on conta.id = vinculo.conta_id
join public.vendas_mobile_vinculos_comerciais legado
  on legado.user_id = vinculo.autorizado_por
 and legado.empresa_id = vinculo.empresa_id
where r.conta_id = vinculo.conta_id
  and vinculo.ativo = true
  and vinculo.origem = 'migracao'
  and vinculo.empresa_id is distinct from conta.empresa_id;

do $$
declare v_antes record;
begin
  select * into v_antes from av_vendas_preservacao_recursos;
  if v_antes.produtos <> (select count(*) from public.vendas_mobile_produtos)
     or v_antes.clientes <> (select count(*) from public.vendas_mobile_clientes)
     or v_antes.pedidos <> (select count(*) from public.vendas_mobile_pedidos)
     or v_antes.pagamentos <> (select count(*) from public.vendas_mobile_pagamentos) then
    raise exception 'Protecao de dados: a correcao de recursos alterou registros operacionais e foi cancelada.';
  end if;
end $$;

