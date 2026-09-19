-- Oferece exclusão imediata do perfil sem reduzir as proteções de histórico
-- trabalhista/fiscal. A operação permanece exclusiva da service role.

create or replace function public.marcar_ponto_restauracao_pendente()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_empresa uuid;
begin
  v_empresa := coalesce(new.empresa_id, old.empresa_id);
  -- Durante o cascade de uma empresa a linha pai já pode estar invisível. Não
  -- recriamos o estado do ponto de restauração nesse momento.
  if v_empresa is not null
    and exists (select 1 from public.empresas where id = v_empresa)
  then
    insert into public.pontos_restauracao_estado(empresa_id, alterado_em)
    values (v_empresa, now())
    on conflict (empresa_id) do update set alterado_em = excluded.alterado_em;
  end if;
  return coalesce(new, old);
end $$;

create or replace function public.validar_exclusao_perfil_definitiva(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_confirmacao text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_perfil text;
  v_outros_ativos integer;
  v_fk record;
  v_possui_registro boolean;
begin
  if upper(trim(coalesce(p_confirmacao, ''))) <> 'EXCLUIR' then
    raise exception 'Confirmação inválida.';
  end if;
  if not exists (select 1 from public.empresas where id = p_empresa_id and excluido_em is null) then
    raise exception 'Perfil não encontrado.';
  end if;

  select perfil into v_perfil
  from public.usuarios_empresa
  where empresa_id = p_empresa_id and user_id = p_usuario_id and status = 'ativo'
  limit 1;
  if coalesce(v_perfil, '') <> 'gestor_master' then
    raise exception 'Somente o Gestor Master pode excluir este perfil.';
  end if;

  select count(*) into v_outros_ativos
  from public.usuarios_empresa
  where empresa_id = p_empresa_id and status = 'ativo' and user_id <> p_usuario_id;
  if v_outros_ativos > 0 then
    raise exception 'Este perfil possui outros usuários ativos. Remova ou transfira os acessos antes de excluí-lo.';
  end if;

  -- Toda referência RESTRICT/NO ACTION representa histórico que não pode ser
  -- apagado por este fluxo. O vínculo financeiro do AvantaVendas é a única
  -- exceção operacional e é removido pela função definitiva.
  for v_fk in
    select ns.nspname as schema_nome,
           cls.relname as tabela_nome,
           att.attname as coluna_nome
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace ns on ns.oid = cls.relnamespace
    join lateral unnest(con.conkey) with ordinality chave(attnum, ordem) on true
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = chave.attnum
    where con.contype = 'f'
      and con.confrelid = 'public.empresas'::regclass
      and con.confdeltype in ('a', 'r')
      and array_length(con.conkey, 1) = 1
      and not (
        ns.nspname = 'public'
        and cls.relname in ('vendas_mobile_contas_perfis_financeiros', 'vendas_mobile_perfis_financeiros')
      )
  loop
    execute format(
      'select exists (select 1 from %I.%I where %I = $1)',
      v_fk.schema_nome, v_fk.tabela_nome, v_fk.coluna_nome
    ) into v_possui_registro using p_empresa_id;
    if v_possui_registro then
      raise exception 'Este perfil possui registros sujeitos à guarda legal. Use a opção de 30 dias; os registros obrigatórios permanecerão protegidos.';
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.excluir_perfil_definitivamente(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_confirmacao text
)
returns table(nome_perfil text)
language plpgsql
security definer
set search_path = public
as $$
declare v_nome text;
begin
  perform public.validar_exclusao_perfil_definitiva(
    p_empresa_id, p_usuario_id, p_confirmacao
  );

  select nome into v_nome from public.empresas where id = p_empresa_id for update;

  delete from public.vendas_mobile_contas_perfis_financeiros
  where empresa_id = p_empresa_id;
  delete from public.vendas_mobile_perfis_financeiros
  where empresa_id = p_empresa_id;

  -- A remoção explícita garante que backups e pontos desapareçam antes do
  -- cascade geral e impede a recriação de estado pelos gatilhos financeiros.
  delete from public.pontos_restauracao where empresa_id = p_empresa_id;
  delete from public.pontos_restauracao_estado where empresa_id = p_empresa_id;
  delete from public.perfis_excluidos where empresa_id = p_empresa_id;
  delete from public.empresas where id = p_empresa_id;

  return query select v_nome;
end;
$$;

revoke all on function public.validar_exclusao_perfil_definitiva(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.excluir_perfil_definitivamente(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.validar_exclusao_perfil_definitiva(uuid,uuid,text) to service_role;
grant execute on function public.excluir_perfil_definitivamente(uuid,uuid,text) to service_role;

-- A purga automática usa o mesmo cascade corrigido. Se houver retenção legal,
-- sua captura de erro existente mantém o perfil marcado como protegido.
create or replace function public.purgar_perfil_excluido(p_empresa_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_registro public.perfis_excluidos;
begin
  select * into v_registro from public.perfis_excluidos
  where empresa_id = p_empresa_id and restaurado_em is null and restaurar_ate <= now()
  for update;
  if not found then return false; end if;

  delete from public.vendas_mobile_contas_perfis_financeiros where empresa_id = p_empresa_id;
  delete from public.vendas_mobile_perfis_financeiros where empresa_id = p_empresa_id;
  delete from public.pontos_restauracao where empresa_id = p_empresa_id;
  delete from public.pontos_restauracao_estado where empresa_id = p_empresa_id;
  delete from public.empresas where id = p_empresa_id;
  return true;
exception when others then
  update public.perfis_excluidos
  set retencao_legal = true, detalhes_restritos = left(sqlerrm, 500)
  where empresa_id = p_empresa_id;
  return false;
end;
$$;

revoke all on function public.purgar_perfil_excluido(uuid) from public, anon, authenticated;
grant execute on function public.purgar_perfil_excluido(uuid) to service_role;
