-- Contexto explícito do centro na importação. Sem movimentação de lançamentos legados.
create or replace function public.importar_lancamentos_despesas_contexto_rpc(
  p_empresa_id uuid,
  p_centro_custo_id uuid,
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

  if p_centro_custo_id is null and exists(select 1 from public.configuracoes where empresa_id=p_empresa_id and centros_custo_ativo) then
    raise exception 'Selecione o centro de custo antes de importar as despesas.';
  end if;
  if p_centro_custo_id is not null and not exists(select 1 from public.centros_custo where id=p_centro_custo_id and empresa_id=p_empresa_id and ativo) then
    raise exception 'Centro de custo inválido ou pausado para este perfil.';
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
      centro_custo_id,
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
      p_centro_custo_id,
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

revoke all on function public.importar_lancamentos_despesas_contexto_rpc(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.importar_lancamentos_despesas_contexto_rpc(uuid, uuid, text, jsonb) to authenticated;


-- Rascunhos por centro em tabela aditiva: preserva rascunhos e clientes legados.
create table public.importador_despesas_rascunhos_centros (
 empresa_id uuid not null references public.empresas(id) on delete cascade,
 usuario_id uuid not null references auth.users(id) on delete cascade,
 centro_custo_id uuid not null,
 ano integer not null,
 mes text not null,
 dados jsonb not null check(octet_length(dados::text)<=1000000),
 atualizado_em timestamptz not null default now(),
 primary key(empresa_id,usuario_id,ano,mes,centro_custo_id),
 foreign key(centro_custo_id) references public.centros_custo(id) on delete cascade
);
alter table public.importador_despesas_rascunhos_centros enable row level security;
create policy importador_centro_proprio on public.importador_despesas_rascunhos_centros for all to authenticated
using (usuario_id=auth.uid() and exists(select 1 from public.usuarios_empresa a where a.empresa_id=importador_despesas_rascunhos_centros.empresa_id and a.user_id=auth.uid() and a.status='ativo') and exists(select 1 from public.centros_custo c where c.id=centro_custo_id and c.empresa_id=importador_despesas_rascunhos_centros.empresa_id))
with check (usuario_id=auth.uid() and exists(select 1 from public.usuarios_empresa a where a.empresa_id=importador_despesas_rascunhos_centros.empresa_id and a.user_id=auth.uid() and a.status='ativo' and a.perfil in ('gestor_master','administrador','operador_completo','operador_simples')) and exists(select 1 from public.centros_custo c where c.id=centro_custo_id and c.empresa_id=importador_despesas_rascunhos_centros.empresa_id and c.ativo));
revoke all on public.importador_despesas_rascunhos_centros from anon;
grant select,insert,update,delete on public.importador_despesas_rascunhos_centros to authenticated;
