-- Excluir um centro adicional remove todo o seu contexto financeiro de forma
-- atômica. O centro Principal segue protegido e pausar um centro preserva os
-- registros já existentes, bloqueando somente novos lançamentos.

create or replace function public.validar_centro_custo_do_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ativo boolean;
begin
  if new.centro_custo_id is null then return new; end if;

  select ativo into v_ativo
  from public.centros_custo
  where id = new.centro_custo_id and empresa_id = new.empresa_id;

  if v_ativo is null then
    raise exception 'Centro de custo inválido para este perfil.';
  end if;
  if not v_ativo then
    raise exception 'Este centro de custo está pausado e não aceita novos lançamentos.';
  end if;
  return new;
end;
$$;

create or replace function public.validar_centro_custo_receita_do_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ativo boolean;
begin
  if new.centro_custo_id is null then return new; end if;

  select ativo into v_ativo
  from public.centros_custo
  where id = new.centro_custo_id and empresa_id = new.empresa_id;

  if v_ativo is null then
    raise exception 'Centro de custo inválido para este perfil.';
  end if;
  if not v_ativo then
    raise exception 'Este centro de custo está pausado e não aceita novos lançamentos.';
  end if;
  return new;
end;
$$;

create or replace function public.excluir_centro_custo_com_lancamentos_rpc(
  p_centro_custo_id uuid,
  p_empresa_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_centro public.centros_custo%rowtype;
  v_lancamentos_excluidos integer := 0;
  v_receitas_excluidas integer := 0;
  v_recorrencias_excluidas integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = p_empresa_id
      and ue.user_id = auth.uid()
      and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ) then
    raise exception 'Você não tem permissão para excluir centros de custo.';
  end if;

  select * into v_centro
  from public.centros_custo
  where id = p_centro_custo_id and empresa_id = p_empresa_id
  for update;

  if not found then
    raise exception 'Centro de custo não encontrado.';
  end if;
  if v_centro.is_principal then
    raise exception 'O centro Principal não pode ser removido.';
  end if;

  -- Movimentos vinculados a uma despesa são parte do mesmo contexto e precisam
  -- sair antes do lançamento para não permanecerem órfãos no saldo da caixinha.
  delete from public.caixinhas_movimentos
  where empresa_id = p_empresa_id
    and lancamento_id in (
      select id from public.lancamentos
      where empresa_id = p_empresa_id and centro_custo_id = p_centro_custo_id
    );

  delete from public.lancamentos
  where empresa_id = p_empresa_id and centro_custo_id = p_centro_custo_id;
  get diagnostics v_lancamentos_excluidos = row_count;

  delete from public.recorrencias
  where empresa_id = p_empresa_id and centro_custo_id = p_centro_custo_id;
  get diagnostics v_recorrencias_excluidas = row_count;

  -- O gatilho de faturamentos_entradas recalcula automaticamente o total mensal
  -- consolidado após cada receita removida.
  delete from public.faturamentos_entradas
  where empresa_id = p_empresa_id and centro_custo_id = p_centro_custo_id;
  get diagnostics v_receitas_excluidas = row_count;

  delete from public.centros_custo
  where id = p_centro_custo_id and empresa_id = p_empresa_id;

  return jsonb_build_object(
    'lancamentos_excluidos', v_lancamentos_excluidos,
    'receitas_excluidas', v_receitas_excluidas,
    'recorrencias_excluidas', v_recorrencias_excluidas
  );
end;
$$;

revoke all on function public.excluir_centro_custo_com_lancamentos_rpc(uuid, uuid) from public;
grant execute on function public.excluir_centro_custo_com_lancamentos_rpc(uuid, uuid) to authenticated;
