-- Reorganiza somente a parcela em edição e as parcelas posteriores do mesmo plano.
-- Registros anteriores permanecem intactos para preservar o histórico financeiro.
create or replace function public.reorganizar_parcelamento_despesa_rpc(
  p_empresa_id uuid,
  p_lancamento_id uuid,
  p_ano integer,
  p_mes text,
  p_dia integer,
  p_despesa_nome text,
  p_descricao_base text,
  p_valor numeric,
  p_parcela_atual integer,
  p_total_parcelas integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.lancamentos%rowtype;
  v_partes text[];
  v_descricao_original_base text;
  v_total_original integer;
  v_mes_original integer;
  v_data_original date;
  v_data_destino date;
  v_mes_destino text;
  v_ids uuid[] := array[]::uuid[];
  v_id uuid;
  v_restantes integer;
  v_existentes integer;
  v_indice integer;
  v_atualizados integer := 0;
  v_inseridos integer := 0;
  v_removidos integer := 0;
  v_descricao_destino text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = p_empresa_id
      and ue.user_id = auth.uid()
      and ue.status = 'ativo'
      and ue.perfil is distinct from 'funcionario_ponto'
  ) then
    raise exception 'Usuário sem permissão para reorganizar parcelas.';
  end if;

  if p_dia < 1 or p_dia > 31 or p_valor <= 0 or p_parcela_atual < 1
    or p_total_parcelas < p_parcela_atual or p_total_parcelas > 120 then
    raise exception 'Dados de parcelamento inválidos.';
  end if;

  v_mes_original := case upper(p_mes)
    when 'JANEIRO' then 1 when 'FEVEREIRO' then 2 when 'MARÇO' then 3
    when 'ABRIL' then 4 when 'MAIO' then 5 when 'JUNHO' then 6
    when 'JULHO' then 7 when 'AGOSTO' then 8 when 'SETEMBRO' then 9
    when 'OUTUBRO' then 10 when 'NOVEMBRO' then 11 when 'DEZEMBRO' then 12
    else 0
  end;
  if v_mes_original = 0 then
    raise exception 'Mês inválido para reorganizar parcelas.';
  end if;

  select * into v_original
  from public.lancamentos
  where id = p_lancamento_id
    and empresa_id = p_empresa_id
    and tipo_obs = 'parcela'
  for update;

  if not found then
    raise exception 'Parcela não encontrada.';
  end if;

  v_partes := regexp_match(coalesce(v_original.descricao, ''), '^(.*?)[[:space:]]*\(([0-9]+)/([0-9]+)\)[[:space:]]*$');
  if v_partes is null then
    raise exception 'A parcela não possui uma sequência válida.';
  end if;

  v_descricao_original_base := btrim(v_partes[1]);
  v_total_original := v_partes[3]::integer;
  v_data_original := make_date(
    v_original.ano,
    case upper(v_original.mes)
      when 'JANEIRO' then 1 when 'FEVEREIRO' then 2 when 'MARÇO' then 3
      when 'ABRIL' then 4 when 'MAIO' then 5 when 'JUNHO' then 6
      when 'JULHO' then 7 when 'AGOSTO' then 8 when 'SETEMBRO' then 9
      when 'OUTUBRO' then 10 when 'NOVEMBRO' then 11 when 'DEZEMBRO' then 12
    end,
    v_original.dia
  );

  for v_id in
    select l.id
    from public.lancamentos l
    where l.empresa_id = p_empresa_id
      and l.tipo_obs = 'parcela'
      and l.despesa_nome = v_original.despesa_nome
      and l.valor = v_original.valor
      and l.centro_custo_id is not distinct from v_original.centro_custo_id
      and btrim(regexp_replace(coalesce(l.descricao, ''), '[[:space:]]*\([0-9]+/[0-9]+\)[[:space:]]*$', '')) = v_descricao_original_base
      and substring(coalesce(l.descricao, '') from '\(([0-9]+)/([0-9]+)\)[[:space:]]*$') is not null
      and (regexp_match(coalesce(l.descricao, ''), '\(([0-9]+)/([0-9]+)\)[[:space:]]*$'))[2]::integer = v_total_original
      and make_date(
        l.ano,
        case upper(l.mes)
          when 'JANEIRO' then 1 when 'FEVEREIRO' then 2 when 'MARÇO' then 3
          when 'ABRIL' then 4 when 'MAIO' then 5 when 'JUNHO' then 6
          when 'JULHO' then 7 when 'AGOSTO' then 8 when 'SETEMBRO' then 9
          when 'OUTUBRO' then 10 when 'NOVEMBRO' then 11 when 'DEZEMBRO' then 12
        end,
        l.dia
      ) >= v_data_original
    order by l.ano, case upper(l.mes)
      when 'JANEIRO' then 1 when 'FEVEREIRO' then 2 when 'MARÇO' then 3
      when 'ABRIL' then 4 when 'MAIO' then 5 when 'JUNHO' then 6
      when 'JULHO' then 7 when 'AGOSTO' then 8 when 'SETEMBRO' then 9
      when 'OUTUBRO' then 10 when 'NOVEMBRO' then 11 when 'DEZEMBRO' then 12
    end, l.dia, l.id
    for update
  loop
    v_ids := array_append(v_ids, v_id);
  end loop;

  -- A parcela selecionada é sempre a primeira da sequência reorganizada.
  if not (p_lancamento_id = any(v_ids)) then
    v_ids := array_prepend(p_lancamento_id, v_ids);
  end if;

  v_restantes := p_total_parcelas - p_parcela_atual + 1;
  v_existentes := cardinality(v_ids);

  for v_indice in 0..v_restantes - 1 loop
    v_data_destino := (make_date(p_ano, v_mes_original, 1) + make_interval(months => v_indice))::date;
    v_data_destino := v_data_destino + least(
      p_dia,
      extract(day from (date_trunc('month', v_data_destino) + interval '1 month - 1 day'))::integer
    ) - 1;
    v_mes_destino := case extract(month from v_data_destino)::integer
      when 1 then 'JANEIRO' when 2 then 'FEVEREIRO' when 3 then 'MARÇO'
      when 4 then 'ABRIL' when 5 then 'MAIO' when 6 then 'JUNHO'
      when 7 then 'JULHO' when 8 then 'AGOSTO' when 9 then 'SETEMBRO'
      when 10 then 'OUTUBRO' when 11 then 'NOVEMBRO' when 12 then 'DEZEMBRO'
    end;
    v_descricao_destino := case
      when p_total_parcelas = 1 then btrim(p_descricao_base)
      when btrim(p_descricao_base) = '' then format('(%s/%s)', p_parcela_atual + v_indice, p_total_parcelas)
      else format('%s (%s/%s)', btrim(p_descricao_base), p_parcela_atual + v_indice, p_total_parcelas)
    end;

    if v_indice < v_existentes then
      update public.lancamentos
      set ano = extract(year from v_data_destino)::integer,
          mes = v_mes_destino,
          dia = extract(day from v_data_destino)::integer,
          despesa_nome = p_despesa_nome,
          descricao = v_descricao_destino,
          valor = case when id = p_lancamento_id then p_valor else valor end,
          tipo_obs = case when p_total_parcelas > 1 then 'parcela' else null end,
          updated_at = now()
      where id = v_ids[v_indice + 1]
        and empresa_id = p_empresa_id;
      v_atualizados := v_atualizados + 1;
    else
      insert into public.lancamentos (
        empresa_id, ano, mes, dia, despesa_nome, descricao, valor, status,
        tipo_obs, recorrencia_id, centro_custo_id
      ) values (
        p_empresa_id, extract(year from v_data_destino)::integer, v_mes_destino,
        extract(day from v_data_destino)::integer, p_despesa_nome,
        v_descricao_destino, p_valor, null,
        case when p_total_parcelas > 1 then 'parcela' else null end,
        null, v_original.centro_custo_id
      );
      v_inseridos := v_inseridos + 1;
    end if;
  end loop;

  if v_existentes > v_restantes then
    delete from public.lancamentos
    where empresa_id = p_empresa_id
      and id = any(v_ids[v_restantes + 1:v_existentes]);
    get diagnostics v_removidos = row_count;
  end if;

  return jsonb_build_object(
    'atualizados', v_atualizados,
    'inseridos', v_inseridos,
    'removidos', v_removidos
  );
end;
$$;

revoke all on function public.reorganizar_parcelamento_despesa_rpc(uuid, uuid, integer, text, integer, text, text, numeric, integer, integer) from public;
grant execute on function public.reorganizar_parcelamento_despesa_rpc(uuid, uuid, integer, text, integer, text, text, numeric, integer, integer) to authenticated;
