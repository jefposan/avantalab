-- O código da tabela de preços é um identificador técnico estável. Ele passa a
-- ser gerado pelo banco a partir do nome e deixa de ser uma decisão do usuário.
begin;

comment on column public.custos_tabelas_preco.codigo is
  'Identificador técnico estável, gerado automaticamente e usado em importações e integrações.';

create or replace function public.custos_salvar_tabela_preco_rpc(
  p_empresa_id uuid, p_tabela_id uuid, p_codigo text, p_nome text,
  p_descricao text default null, p_ativo boolean default true
)
returns public.custos_tabelas_preco
language plpgsql security definer set search_path = public as $$
declare
  v_tabela public.custos_tabelas_preco;
  v_codigo_base text;
  v_codigo text;
  v_sufixo integer := 1;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para alterar tabelas de preço.';
  end if;
  if length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'Informe um nome com pelo menos 2 caracteres.';
  end if;

  if p_tabela_id is null then
    v_codigo_base := upper(regexp_replace(
      translate(
        trim(p_nome),
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
      ),
      '[^A-Za-z0-9]+', '-', 'g'
    ));
    v_codigo_base := trim(both '-' from v_codigo_base);
    if length(v_codigo_base) < 2 then v_codigo_base := 'TABELA'; end if;
    v_codigo_base := left(v_codigo_base, 30);
    v_codigo := v_codigo_base;

    loop
      begin
        insert into public.custos_tabelas_preco
          (empresa_id, codigo, nome, descricao, padrao, ativo)
        values
          (p_empresa_id, v_codigo, trim(p_nome), p_descricao, false, coalesce(p_ativo, true))
        returning * into v_tabela;
        return v_tabela;
      exception when unique_violation then
        v_sufixo := v_sufixo + 1;
        v_codigo := left(v_codigo_base, greatest(2, 29 - length(v_sufixo::text))) || '-' || v_sufixo::text;
        if v_sufixo > 9999 then
          raise exception 'Não foi possível gerar o identificador técnico da tabela.';
        end if;
      end;
    end loop;
  end if;

  update public.custos_tabelas_preco
     set nome = case when padrao then nome else trim(p_nome) end,
         descricao = p_descricao,
         ativo = case when padrao then true else coalesce(p_ativo, ativo) end
   where id = p_tabela_id and empresa_id = p_empresa_id
  returning * into v_tabela;
  if not found then raise exception 'Tabela de preço não localizada.'; end if;
  return v_tabela;
end;
$$;

revoke all on function public.custos_salvar_tabela_preco_rpc(uuid, uuid, text, text, text, boolean) from public, anon;
grant execute on function public.custos_salvar_tabela_preco_rpc(uuid, uuid, text, text, text, boolean) to authenticated;

commit;
