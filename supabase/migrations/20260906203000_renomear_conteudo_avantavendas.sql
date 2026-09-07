-- O módulo integrado administra publicações para o AvantaVendas; não é uma
-- segunda operação de vendas. O identificador técnico permanece inalterado.
update public.modulos
set
  nome = 'Conteúdo AvantaVendas',
  descricao = 'Publique novidades, catálogo e materiais de divulgação para a equipe comercial.'
where id = 'vendas_mobile';
