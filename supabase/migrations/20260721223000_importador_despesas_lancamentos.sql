-- Registra a origem de lotes importados sem armazenar o documento enviado.
alter table public.lancamentos
  add column if not exists importacao_lote_chave text,
  add column if not exists importacao_item_chave text,
  add column if not exists importacao_origem text,
  add column if not exists importado_por uuid references auth.users(id) on delete set null;

create unique index if not exists lancamentos_importacao_item_unico_idx
  on public.lancamentos (empresa_id, importacao_item_chave)
  where importacao_item_chave is not null;

create or replace function public.importar_lancamentos_despesas_rpc(
  p_empresa_id uuid,
  p_lote_chave text,
  p_lancamentos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_inseridos integer;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada. Entre novamente.';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.user_id = auth.uid()
      and acesso.empresa_id = p_empresa_id
      and acesso.status = 'ativo'
      and acesso.perfil in ('gestor_master', 'administrador', 'operador_completo', 'operador_simples')
  ) then
    raise exception 'Você não tem permissão para inserir lançamentos neste perfil.';
  end if;

  if btrim(coalesce(p_lote_chave, '')) = '' or length(p_lote_chave) > 128 then
    raise exception 'Identificador do lote inválido.';
  end if;

  if jsonb_typeof(p_lancamentos) is distinct from 'array' then
    raise exception 'A lista de lançamentos é inválida.';
  end if;

  v_total := jsonb_array_length(p_lancamentos);
  if v_total < 1 or v_total > 500 then
    raise exception 'O lote deve conter entre 1 e 500 lançamentos.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_lancamentos) item
    where coalesce(item->>'data', '') !~ '^\d{4}-\d{2}-\d{2}$'
      or btrim(coalesce(item->>'tipo_despesa', '')) = ''
      or length(item->>'tipo_despesa') > 160
      or length(coalesce(item->>'descricao', '')) > 500
      or btrim(coalesce(item->>'item_chave', '')) = ''
      or length(item->>'item_chave') > 160
      or coalesce((item->>'valor')::numeric, 0) <= 0
      or coalesce((item->>'valor')::numeric, 0) > 999999999.99
  ) then
    raise exception 'Existe lançamento com data, tipo, descrição, valor ou identificador inválido.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_lancamentos) item
    where not exists (
      select 1
      from public.despesas_cadastradas despesa
      where despesa.empresa_id = p_empresa_id
        and lower(btrim(despesa.nome)) = lower(btrim(item->>'tipo_despesa'))
    )
  ) then
    raise exception 'Um dos tipos de despesa não pertence ao perfil selecionado.';
  end if;

  with itens as (
    select
      (item->>'data')::date as data_lancamento,
      btrim(item->>'tipo_despesa') as tipo_despesa,
      btrim(coalesce(item->>'descricao', '')) as descricao,
      round((item->>'valor')::numeric, 2) as valor,
      btrim(item->>'item_chave') as item_chave
    from jsonb_array_elements(p_lancamentos) item
  ), inseridos as (
    insert into public.lancamentos (
      empresa_id,
      ano,
      mes,
      dia,
      despesa_nome,
      descricao,
      valor,
      status,
      tipo_obs,
      importacao_lote_chave,
      importacao_item_chave,
      importacao_origem,
      importado_por
    )
    select
      p_empresa_id,
      extract(year from data_lancamento)::integer,
      case extract(month from data_lancamento)::integer
        when 1 then 'JANEIRO' when 2 then 'FEVEREIRO' when 3 then 'MARÇO'
        when 4 then 'ABRIL' when 5 then 'MAIO' when 6 then 'JUNHO'
        when 7 then 'JULHO' when 8 then 'AGOSTO' when 9 then 'SETEMBRO'
        when 10 then 'OUTUBRO' when 11 then 'NOVEMBRO' else 'DEZEMBRO'
      end,
      extract(day from data_lancamento)::integer,
      tipo_despesa,
      descricao,
      valor,
      null,
      'importacao',
      p_lote_chave,
      item_chave,
      'importador-despesas',
      auth.uid()
    from itens
    on conflict (empresa_id, importacao_item_chave)
      where importacao_item_chave is not null
      do nothing
    returning id
  )
  select count(*)::integer into v_inseridos from inseridos;

  return jsonb_build_object(
    'total', v_total,
    'inseridos', v_inseridos,
    'ignorados', v_total - v_inseridos,
    'lote_chave', p_lote_chave
  );
end;
$$;

revoke all on function public.importar_lancamentos_despesas_rpc(uuid, text, jsonb) from public;
grant execute on function public.importar_lancamentos_despesas_rpc(uuid, text, jsonb) to authenticated;

