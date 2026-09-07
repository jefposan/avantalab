-- Publicação controlada do módulo Vendas e Serviços.
-- A restrição temporária à Tridium é aplicada também nas APIs server-side;
-- o catálogo mantém o contrato comercial definitivo para perfis empresariais.
begin;

insert into public.modulos (
  id, nome, descricao, icone, disponivel, perfis, ordem, preco_mensal,
  vendavel_business, incluido_business_pro, modo_navegacao, rota_web, superficies
) values (
  'vendas', 'Vendas e Serviços',
  'Operação comercial integrada a clientes, custos, estoque, recebimentos e emissão fiscal.',
  'vendas', true, array['empresa'], 6, 14.90,
  true, true, 'pagina_total', '/vendas', array['web']
)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  icone = excluded.icone,
  disponivel = excluded.disponivel,
  perfis = excluded.perfis,
  ordem = excluded.ordem,
  preco_mensal = excluded.preco_mensal,
  vendavel_business = excluded.vendavel_business,
  incluido_business_pro = excluded.incluido_business_pro,
  modo_navegacao = excluded.modo_navegacao,
  rota_web = excluded.rota_web,
  superficies = excluded.superficies;

commit;
