-- Permite que um colaborador reposicione, no mês correto, somente um lançamento
-- devolvido para correção. O vencimento da cobrança nunca é alterado.

drop function if exists public.recebimentos_registrar_colaborador(
  uuid, uuid, uuid, uuid, uuid, numeric, text, text, text, text, text, bigint
);

create function public.recebimentos_registrar_colaborador(
  p_empresa_id uuid,
  p_lancamento_existente_id uuid,
  p_novo_lancamento_id uuid,
  p_recebimento_empresa_id uuid,
  p_subempresa_id uuid,
  p_valor_recebido numeric,
  p_observacao text,
  p_forma_pagamento text,
  p_comprovante_path text default null,
  p_comprovante_nome text default null,
  p_comprovante_mime text default null,
  p_comprovante_tamanho bigint default null,
  p_data_pagamento date default null
)
returns public.recebimentos_lancamentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lancamento public.recebimentos_lancamentos;
  v_recebimento_empresa_id uuid;
  v_valor_combinado numeric;
  v_situacao text;
  v_recebido_em timestamptz;
begin
  if not public.recebimentos_e_colaborador(p_empresa_id) then
    raise exception 'Acesso negado.';
  end if;
  if p_valor_recebido is null or p_valor_recebido < 0 then
    raise exception 'Informe um valor recebido válido.';
  end if;
  if p_forma_pagamento is null
    or p_forma_pagamento not in ('boleto', 'cartao_credito', 'cartao_debito', 'dinheiro', 'pix') then
    raise exception 'Selecione uma forma de pagamento válida.';
  end if;
  if p_comprovante_path is not null and (
    nullif(trim(p_comprovante_nome), '') is null
    or p_comprovante_mime not in ('image/jpeg', 'image/png', 'image/webp')
    or p_comprovante_tamanho is null
    or p_comprovante_tamanho <= 0
    or p_comprovante_tamanho > 6291456
  ) then
    raise exception 'O comprovante informado é inválido.';
  end if;

  if p_lancamento_existente_id is not null then
    select * into v_lancamento
    from public.recebimentos_lancamentos
    where id = p_lancamento_existente_id
      and empresa_id = p_empresa_id
    for update;

    if v_lancamento.id is null then
      raise exception 'Cobrança não encontrada.';
    end if;
    if not (
      (v_lancamento.colaborador_user_id is null and v_lancamento.situacao in ('previsto', 'em_atraso'))
      or (
        v_lancamento.colaborador_user_id = auth.uid()
        and v_lancamento.situacao = 'devolvido_para_correcao'
      )
    ) then
      raise exception 'Esta cobrança não está disponível para recebimento.';
    end if;
    if p_data_pagamento is not null and v_lancamento.situacao <> 'devolvido_para_correcao' then
      raise exception 'O mês do pagamento só pode ser alterado em uma devolução para correção.';
    end if;

    v_situacao := case
      when p_valor_recebido < v_lancamento.valor_combinado then 'recebido_a_menor'
      when p_valor_recebido > v_lancamento.valor_combinado then 'recebido_a_maior'
      else 'aguardando_conferencia'
    end;
    v_recebido_em := case
      when p_data_pagamento is null then now()
      else ((p_data_pagamento::text || ' 12:00:00')::timestamp at time zone 'America/Sao_Paulo')
    end;

    update public.recebimentos_lancamentos
    set colaborador_user_id = auth.uid(),
        valor_recebido = round(p_valor_recebido, 2),
        recebido_em = v_recebido_em,
        observacao = nullif(trim(p_observacao), ''),
        forma_pagamento = p_forma_pagamento,
        situacao = v_situacao,
        atualizado_em = now()
    where id = v_lancamento.id
    returning * into v_lancamento;
  else
    if p_novo_lancamento_id is null or p_recebimento_empresa_id is null then
      raise exception 'Informe o cliente do recebimento.';
    end if;
    if p_data_pagamento is not null then
      raise exception 'O mês do pagamento é informado somente ao corrigir uma devolução.';
    end if;

    if p_subempresa_id is not null then
      select s.recebimento_empresa_id, s.valor_combinado
      into v_recebimento_empresa_id, v_valor_combinado
      from public.recebimentos_subempresas s
      join public.recebimentos_empresas e
        on e.id = s.recebimento_empresa_id
       and e.empresa_id = s.empresa_id
       and e.tipo_cadastro = 'local_agrupador'
       and e.ativo
      where s.id = p_subempresa_id
        and s.empresa_id = p_empresa_id
        and s.recebimento_empresa_id = p_recebimento_empresa_id
        and s.ativo;
    else
      select e.id, e.valor_combinado
      into v_recebimento_empresa_id, v_valor_combinado
      from public.recebimentos_empresas e
      where e.id = p_recebimento_empresa_id
        and e.empresa_id = p_empresa_id
        and e.tipo_cadastro = 'cliente_direto'
        and e.ativo;
    end if;

    if v_recebimento_empresa_id is null then
      raise exception 'Cliente não encontrado ou inativo.';
    end if;
    if v_valor_combinado is null then
      raise exception 'Defina o valor contratado antes de registrar o recebimento.';
    end if;

    v_situacao := case
      when p_valor_recebido < v_valor_combinado then 'recebido_a_menor'
      when p_valor_recebido > v_valor_combinado then 'recebido_a_maior'
      else 'aguardando_conferencia'
    end;

    insert into public.recebimentos_lancamentos (
      id, empresa_id, recebimento_empresa_id, subempresa_id,
      colaborador_user_id, vencimento, valor_combinado, valor_recebido,
      recebido_em, observacao, forma_pagamento, situacao
    )
    values (
      p_novo_lancamento_id, p_empresa_id, v_recebimento_empresa_id, p_subempresa_id,
      auth.uid(), (now() at time zone 'America/Sao_Paulo')::date,
      v_valor_combinado, round(p_valor_recebido, 2), now(),
      nullif(trim(p_observacao), ''), p_forma_pagamento, v_situacao
    )
    returning * into v_lancamento;
  end if;

  if p_comprovante_path is not null then
    insert into public.recebimentos_comprovantes (
      empresa_id, lancamento_id, storage_path, nome_original,
      mime_type, tamanho_bytes, enviado_por
    )
    values (
      p_empresa_id, v_lancamento.id, p_comprovante_path, trim(p_comprovante_nome),
      p_comprovante_mime, p_comprovante_tamanho, auth.uid()
    )
    on conflict (lancamento_id) do update
    set storage_path = excluded.storage_path,
        nome_original = excluded.nome_original,
        mime_type = excluded.mime_type,
        tamanho_bytes = excluded.tamanho_bytes,
        enviado_por = excluded.enviado_por,
        atualizado_em = now();
  end if;

  insert into public.recebimentos_eventos (lancamento_id, tipo, por, motivo, snapshot)
  values (
    v_lancamento.id,
    'lancado',
    auth.uid(),
    null,
    to_jsonb(v_lancamento) || jsonb_build_object('comprovante', p_comprovante_path is not null)
  );

  return v_lancamento;
end;
$$;

revoke all on function public.recebimentos_registrar_colaborador(
  uuid, uuid, uuid, uuid, uuid, numeric, text, text, text, text, text, bigint, date
) from public;
grant execute on function public.recebimentos_registrar_colaborador(
  uuid, uuid, uuid, uuid, uuid, numeric, text, text, text, text, text, bigint, date
) to authenticated;
