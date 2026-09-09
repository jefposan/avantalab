-- Hotfix: corrige a regressao introduzida pela publicacao imediata do catalogo sem
-- alterar qualquer dado operacional. O gatilho de conta e compartilhado por
-- clientes, pedidos, pagamentos e agenda; por isso ele nao pode referenciar
-- colunas exclusivas de produtos.

begin;

-- Contrato comum a todas as tabelas operacionais. Esta funcao usa somente
-- campos existentes em clientes, pedidos, pagamentos, agenda e produtos.
create or replace function public.preencher_conta_operacional_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  if new.conta_id is null then
    raise exception 'Selecione uma conta de vendas antes de continuar.';
  end if;

  if not public.vendas_mobile_pode_operar_conta(new.conta_id) then
    raise exception 'Você não possui permissão para operar esta conta de vendas.';
  end if;

  new.user_id := auth.uid();
  return new;
end;
$$;

-- A excecao de publicacao pertence exclusivamente a vendas_mobile_produtos.
-- A verificacao da tabela fica em uma instrucao separada para que o PostgreSQL
-- jamais tente resolver catalogo_produto_origem_id em outro tipo de NEW.
create or replace function public.preencher_conta_operacional_produto_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name <> 'vendas_mobile_produtos' then
    raise exception 'Gatilho de produto vinculado a uma tabela inválida.';
  end if;

  if new.catalogo_produto_origem_id is not null
     and exists (
       select 1
       from public.vendas_mobile_catalogo_produtos produto
       join public.vendas_mobile_catalogos catalogo
         on catalogo.id = produto.catalogo_id
       join public.vendas_mobile_contas_vinculos_comerciais vinculo
         on vinculo.conta_id = new.conta_id
        and vinculo.empresa_id = catalogo.empresa_id
        and vinculo.ativo = true
       join public.vendas_mobile_contas_recursos recurso
         on recurso.conta_id = vinculo.conta_id
        and recurso.catalogo_ativo = true
       where produto.id = new.catalogo_produto_origem_id
         and public.vendas_mobile_pode_publicar_conteudo(catalogo.empresa_id)
         and public.vendas_mobile_vinculo_conta_valido(
           vinculo.conta_id,
           catalogo.empresa_id
         )
     ) then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;

  if new.conta_id is null then
    raise exception 'Selecione uma conta de vendas antes de continuar.';
  end if;

  if not public.vendas_mobile_pode_operar_conta(new.conta_id) then
    raise exception 'Você não possui permissão para operar esta conta de vendas.';
  end if;

  new.user_id := auth.uid();
  return new;
end;
$$;

-- Apenas o gatilho de produtos muda de funcao. Os gatilhos de clientes,
-- pedidos, pagamentos e agenda permanecem vinculados a funcao comum acima.
drop trigger if exists vendas_mobile_produtos_conta_padrao
  on public.vendas_mobile_produtos;

create trigger vendas_mobile_produtos_conta_padrao
before insert on public.vendas_mobile_produtos
for each row
execute function public.preencher_conta_operacional_produto_vendas_mobile();

commit;
