-- O vínculo comercial pertence à conta de vendas, não ao campo legado
-- vendas_mobile_contas.empresa_id. Esta correção mantém contas independentes
-- operando normalmente e libera conteúdo assim que a aprovação é registrada.
begin;

create or replace function public.consultar_codigo_vinculo_vendas_mobile_rpc(
  p_codigo_empresa text,
  p_conta_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_empresa_nome text;
  v_ja_adicionada boolean := false;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_gerir_conta(p_conta_id) then
    raise exception 'Selecione uma conta de vendas válida.';
  end if;

  select codigo.empresa_id, empresa.nome
    into v_empresa_id, v_empresa_nome
    from public.codigos_vinculo_empresa codigo
    join public.empresas empresa on empresa.id = codigo.empresa_id
   where codigo.codigo = upper(trim(coalesce(p_codigo_empresa, '')))
     and codigo.ativo = true;
  if v_empresa_id is null then raise exception 'Código da empresa não encontrado.'; end if;

  select exists (
    select 1
      from public.vendas_mobile_contas_vinculos_comerciais vinculo
     where vinculo.conta_id = p_conta_id
       and vinculo.empresa_id = v_empresa_id
       and vinculo.ativo = true
       and public.vendas_mobile_vinculo_conta_valido(vinculo.conta_id, vinculo.empresa_id)
  ) into v_ja_adicionada;

  return jsonb_build_object(
    'empresa_id', v_empresa_id,
    'empresa_nome', v_empresa_nome,
    'ja_adicionada', v_ja_adicionada
  );
end;
$$;

-- Garante que uma aprovação libere os três recursos imediatamente. A escolha
-- posterior do usuário continua preservada: ela só é sobrescrita por uma nova
-- aprovação, nunca por uma simples abertura ou sincronização da conta.
create or replace function public.vendas_mobile_aplicar_vinculo_solicitacao_aprovada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'aprovada' and new.conta_id is not null and (tg_op = 'INSERT' or old.status is distinct from 'aprovada') then
    insert into public.vendas_mobile_contas_vinculos_comerciais(conta_id, empresa_id, autorizado_por, ativo, origem)
    values (new.conta_id, new.empresa_id, new.user_id, true, 'solicitacao')
    on conflict (conta_id) do update
      set empresa_id = excluded.empresa_id,
          autorizado_por = excluded.autorizado_por,
          ativo = true,
          origem = 'solicitacao',
          atualizado_em = now();

    insert into public.vendas_mobile_contas_recursos(
      conta_id, novidades_ativas, divulgacao_ativa, catalogo_ativo
    ) values (new.conta_id, true, true, true)
    on conflict (conta_id) do update
      set novidades_ativas = true,
          divulgacao_ativa = true,
          catalogo_ativo = true,
          atualizado_em = now();
  end if;
  return new;
end;
$$;

create or replace function public.sincronizar_catalogo_vendas_mobile_rpc(p_conta_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_catalogo public.vendas_mobile_catalogos;
  v_produto public.vendas_mobile_catalogo_produtos;
  v_produto_conta_id uuid;
  v_adicionados integer := 0;
  v_ignorados integer := 0;
  v_sem_preco integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('catalogo-conta:' || p_conta_id::text, 0));

  select vinculo.empresa_id
    into v_empresa_id
    from public.vendas_mobile_contas_vinculos_comerciais vinculo
    join public.vendas_mobile_contas_recursos recurso
      on recurso.conta_id = vinculo.conta_id
     and recurso.catalogo_ativo = true
   where vinculo.conta_id = p_conta_id
     and vinculo.ativo = true
     and public.vendas_mobile_vinculo_conta_valido(vinculo.conta_id, vinculo.empresa_id)
   limit 1;

  if v_empresa_id is null then
    return jsonb_build_object('adicionados', 0, 'ja_recebidos', 0, 'sem_preco', 0);
  end if;

  for v_catalogo in
    select catalogo.*
      from public.vendas_mobile_catalogos catalogo
      join public.empresa_modulos modulo
        on modulo.empresa_id = catalogo.empresa_id
       and modulo.modulo_id = 'vendas_mobile'
       and modulo.ativo = true
     where catalogo.empresa_id = v_empresa_id
       and catalogo.ativo = true
  loop
    for v_produto in
      select * from public.vendas_mobile_catalogo_produtos
       where catalogo_id = v_catalogo.id
         and ativo = true
         and disponivel_catalogo = true
    loop
      if v_produto.preco_divulgacao is null or v_produto.preco_divulgacao <= 0 then
        v_sem_preco := v_sem_preco + 1;
        continue;
      end if;

      if exists (
        select 1 from public.vendas_mobile_contas_catalogo_recebimentos recebido
         where recebido.conta_id = p_conta_id
           and recebido.catalogo_produto_id = v_produto.id
      ) then
        v_ignorados := v_ignorados + 1;
        continue;
      end if;

      select produto.id
        into v_produto_conta_id
        from public.vendas_mobile_produtos produto
       where produto.conta_id = p_conta_id
         and produto.catalogo_produto_origem_id = v_produto.id
       limit 1;

      if v_produto_conta_id is null then
        insert into public.vendas_mobile_produtos (
          user_id, conta_id, marca, categoria, sku, nome, descricao, preco,
          preco_custo, estoque, unidade, imagem_url, metadados, ativo,
          catalogo_empresa_id, catalogo_produto_origem_id, estoque_controlado
        ) values (
          auth.uid(), p_conta_id, v_produto.marca, v_produto.categoria,
          v_produto.sku, v_produto.nome, v_produto.descricao,
          v_produto.preco_divulgacao, 0, null, v_produto.unidade,
          v_produto.imagem_url,
          jsonb_build_object('catalogo_empresa', jsonb_build_object(
            'catalogo_id', v_catalogo.id,
            'produto_id', v_produto.id
          )),
          true, v_catalogo.id, v_produto.id, false
        ) returning id into v_produto_conta_id;
        v_adicionados := v_adicionados + 1;
      else
        v_ignorados := v_ignorados + 1;
      end if;

      insert into public.vendas_mobile_contas_catalogo_recebimentos(
        conta_id, catalogo_produto_id, produto_id, status, recebido_por
      ) values (p_conta_id, v_produto.id, v_produto_conta_id, 'recebido', auth.uid())
      on conflict (conta_id, catalogo_produto_id) do nothing;
    end loop;
  end loop;

  return jsonb_build_object(
    'adicionados', v_adicionados,
    'ja_recebidos', v_ignorados,
    'sem_preco', v_sem_preco
  );
end;
$$;

revoke all on function public.consultar_codigo_vinculo_vendas_mobile_rpc(text, uuid) from public, anon;
grant execute on function public.consultar_codigo_vinculo_vendas_mobile_rpc(text, uuid) to authenticated;
revoke all on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) from public, anon;
grant execute on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) to authenticated;

commit;
