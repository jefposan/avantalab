-- Exclusão do perfil AvantaVendas sem remover a identidade AvantaLab compartilhada
-- com o Gestão. A operação preserva os lançamentos financeiros já enviados ao
-- Gestão como histórico desvinculado e remove os dados específicos do Vendas.

create or replace function public.excluir_conta_avantavendas_rpc(
  p_confirmacao text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conta record;
  v_sucessor_id uuid;
  v_empresa_id uuid;
  v_contas_excluidas integer := 0;
  v_contas_transferidas integer := 0;
  v_uploads_para_excluir jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Sessão expirada.';
  end if;
  if upper(trim(coalesce(p_confirmacao, ''))) <> 'EXCLUIR' then
    raise exception 'Confirmação de segurança inválida.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('excluir-avantalab-vendas:' || v_user_id::text, 0));
  perform set_config('app.vendas_mobile_transferencia', '1', true);
  perform set_config('app.vendas_mobile_sync', '1', true);

  -- Cada competência enviada ao Gestão vira um histórico comum e deixa de
  -- apontar para o usuário do Vendas. Nenhum faturamento do Gestão é apagado.
  for v_empresa_id in
    select distinct empresa_id
    from public.vendas_mobile_receitas_gestao_usuario
    where user_id = v_user_id
  loop
    perform public.desvincular_receitas_vendas_mobile_usuario(v_user_id, v_empresa_id, false);
  end loop;

  delete from public.vendas_mobile_perfis_financeiros where user_id = v_user_id;

  -- Remove a pessoa de cada conta. Havendo equipe, transfere propriedade e
  -- autoria operacional; sem outro participante, apaga a conta e seus dados.
  for v_conta in
    select c.id, c.criado_por
    from public.vendas_mobile_contas c
    join public.vendas_mobile_contas_usuarios m on m.conta_id = c.id
    where m.user_id = v_user_id
    for update of c
  loop
    select m.user_id
      into v_sucessor_id
      from public.vendas_mobile_contas_usuarios m
     where m.conta_id = v_conta.id
       and m.user_id <> v_user_id
       and m.status = 'ativo'
     order by case m.papel
       when 'administrador' then 1
       when 'vendedor' then 2
       when 'consulta' then 3
       else 4
     end, m.criado_em
     limit 1;

    if v_sucessor_id is null then
      delete from public.vendas_mobile_contas where id = v_conta.id;
      v_contas_excluidas := v_contas_excluidas + 1;
      continue;
    end if;

    update public.vendas_mobile_clientes set user_id = v_sucessor_id where conta_id = v_conta.id and user_id = v_user_id;
    update public.vendas_mobile_pedidos set user_id = v_sucessor_id where conta_id = v_conta.id and user_id = v_user_id;
    update public.vendas_mobile_pagamentos set user_id = v_sucessor_id where conta_id = v_conta.id and user_id = v_user_id;
    update public.vendas_mobile_agenda set user_id = v_sucessor_id where conta_id = v_conta.id and user_id = v_user_id;
    -- O vínculo de catálogo é pessoal e possui unicidade por usuário. Ao
    -- transferir um produto compartilhado, ele passa a ser um item próprio da
    -- conta e não disputa a importação que o sucessor já possa possuir.
    update public.vendas_mobile_produtos
       set catalogo_produto_origem_id = null,
           catalogo_empresa_id = null,
           pacote_origem_id = null
     where conta_id = v_conta.id and user_id = v_user_id;
    update public.vendas_mobile_produtos set user_id = v_sucessor_id where conta_id = v_conta.id and user_id = v_user_id;
    update public.vendas_mobile_estoque_movimentos movimento
       set user_id = v_sucessor_id
     where movimento.user_id = v_user_id
       and exists (
         select 1 from public.vendas_mobile_produtos produto
          where produto.id = movimento.produto_id and produto.conta_id = v_conta.id
       );

    -- Imagens de produtos que continuam pertencendo a uma conta compartilhada
    -- passam para o sucessor. Os demais arquivos do usuário são apagados ao
    -- final da operação.
    update storage.objects objeto
       set owner_id = v_sucessor_id::text
     where objeto.bucket_id = 'vendas-produtos'
       and objeto.owner_id = v_user_id::text
       and exists (
         select 1
           from public.vendas_mobile_produtos produto
          where produto.conta_id = v_conta.id
            and produto.user_id = v_sucessor_id
            and produto.imagem_url is not null
            and right(produto.imagem_url, length(objeto.name)) = objeto.name
       );

    if v_conta.criado_por = v_user_id then
      update public.vendas_mobile_contas_usuarios
         set papel = 'proprietario', atualizado_em = now()
       where conta_id = v_conta.id and user_id = v_sucessor_id;
      update public.vendas_mobile_contas
         set criado_por = v_sucessor_id, atualizado_em = now()
       where id = v_conta.id;
    end if;
    v_contas_transferidas := v_contas_transferidas + 1;
  end loop;

  -- Registros legados sem conta compartilhada pertencem exclusivamente ao
  -- perfil excluído e não podem permanecer associados à identidade global.
  delete from public.vendas_mobile_pagamentos where user_id = v_user_id;
  delete from public.vendas_mobile_pedidos where user_id = v_user_id;
  delete from public.vendas_mobile_agenda where user_id = v_user_id;
  delete from public.vendas_mobile_produtos where user_id = v_user_id;
  delete from public.vendas_mobile_clientes where user_id = v_user_id;
  delete from public.vendas_mobile_estoque_movimentos where user_id = v_user_id;

  update public.vendas_mobile_contas_usuarios set convidado_por = null where convidado_por = v_user_id;
  delete from public.vendas_mobile_contas_usuarios where user_id = v_user_id;
  delete from public.vendas_mobile_catalogo_recebimentos where user_id = v_user_id;
  delete from public.vendas_mobile_importacoes where user_id = v_user_id;
  if to_regclass('public.vendas_mobile_instalacoes') is not null then
    execute 'delete from public.vendas_mobile_instalacoes where user_id = $1' using v_user_id;
  end if;
  if to_regclass('public.vendas_mobile_publicacoes') is not null then
    execute 'delete from public.vendas_mobile_publicacoes where user_id = $1' using v_user_id;
  end if;
  delete from public.vendas_mobile_backups_reset where user_id = v_user_id;
  delete from public.vendas_mobile_preferencias where user_id = v_user_id;
  delete from public.vendas_mobile_vinculos_comerciais where user_id = v_user_id;
  delete from public.vendas_mobile_solicitacoes_acesso where user_id = v_user_id;
  delete from public.vendas_mobile_acessos where user_id = v_user_id;
  delete from public.vendas_mobile_receitas_gestao_usuario where user_id = v_user_id;
  delete from public.vendas_mobile_pacotes where user_id = v_user_id;
  if to_regclass('public.feedbacks') is not null then
    execute $sql$
      delete from public.feedbacks
       where usuario_id = $1
         and mensagem like '[App Vendas]%'
    $sql$ using v_user_id;
  end if;

  -- A rota autenticada do AvantaVendas recebe esta lista e usa a API oficial
  -- do Storage para apagar também os arquivos físicos. Excluir diretamente de
  -- storage.objects removeria apenas o metadado e deixaria o objeto órfão.
  select coalesce(jsonb_agg(objeto.name order by objeto.name), '[]'::jsonb)
    into v_uploads_para_excluir
    from storage.objects objeto
   where objeto.bucket_id = 'vendas-produtos'
     and objeto.owner_id = v_user_id::text;

  -- Conteúdo corporativo é preservado, mas deixa de identificar a pessoa que
  -- excluiu seu perfil no Vendas.
  update public.vendas_mobile_divulgacao_pastas set criado_por = null where criado_por = v_user_id;
  update public.vendas_mobile_divulgacao_materiais set criado_por = null where criado_por = v_user_id;
  update public.vendas_mobile_catalogos set criado_por = null where criado_por = v_user_id;
  update public.vendas_mobile_integracao_gestao set atualizado_por = null where atualizado_por = v_user_id;

  perform set_config('app.vendas_mobile_transferencia', '0', true);

  return jsonb_build_object(
    'excluido', true,
    'contas_excluidas', v_contas_excluidas,
    'contas_transferidas', v_contas_transferidas,
    'login_avantalab_preservado', true,
    'gestao_preservado', true,
    'historico_financeiro_preservado', true,
    'uploads_para_excluir', v_uploads_para_excluir
  );
end;
$$;

revoke all on function public.excluir_conta_avantavendas_rpc(text) from public;
grant execute on function public.excluir_conta_avantavendas_rpc(text) to authenticated;
