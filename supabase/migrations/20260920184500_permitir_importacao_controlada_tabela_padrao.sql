-- A carga administrativa usa service_role (sem auth.uid()); usuários continuam
-- sujeitos à mesma permissão de edição da tabela padrão.
begin;

create or replace function public.custos_garantir_tabela_padrao_rpc(p_empresa_id uuid)
returns public.custos_tabelas_preco
language plpgsql security definer set search_path = public as $$
declare v_tabela public.custos_tabelas_preco;
begin
  if auth.uid() is not null and not public.custos_pode_acessar_empresa(p_empresa_id, false) then
    raise exception 'Sem acesso às tabelas de preço desta empresa.';
  end if;
  select * into v_tabela from public.custos_tabelas_preco where empresa_id = p_empresa_id and padrao limit 1;
  if found then return v_tabela; end if;
  if auth.uid() is not null and not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'A tabela padrão ainda não foi preparada por um usuário com permissão de edição.';
  end if;
  insert into public.custos_tabelas_preco (empresa_id, codigo, nome, descricao, padrao, ativo)
  values (p_empresa_id, 'PADRAO', 'Tabela padrão', 'Preço de venda principal do cadastro de produtos.', true, true)
  returning * into v_tabela;
  return v_tabela;
end;
$$;

commit;
