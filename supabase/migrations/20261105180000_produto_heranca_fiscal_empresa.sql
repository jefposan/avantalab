begin;
alter table public.vendas_mobile_catalogo_produtos
  add column if not exists usar_fiscal_empresa boolean,
  add column if not exists cfop_interestadual text;
comment on column public.vendas_mobile_catalogo_produtos.usar_fiscal_empresa is
  'True herda padrões atuais da empresa; false permite exceções por campo. Null preserva exceções legadas/importadas, inferidas pelos códigos existentes.';
alter table public.vendas_mobile_catalogo_produtos
  add constraint vendas_produto_cfop_interestadual_valido
  check (cfop_interestadual is null or cfop_interestadual = '' or cfop_interestadual ~ '^6[0-9]{3}$');
notify pgrst, 'reload schema';
commit;
