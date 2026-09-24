-- Mantém a fonte externa de catálogo isolada da base local de Custos.
-- A restauração usa um retrato já guardado e desloca a importação atual para
-- um segundo catálogo, sem alterar imagens, preços ou cadastros da origem.
begin;

alter table public.vendas_mobile_catalogos
  add column if not exists origem text not null default 'externa'
  check (origem in ('externa', 'custos_local'));

create index if not exists vendas_mobile_catalogos_empresa_origem_idx
  on public.vendas_mobile_catalogos (empresa_id, origem, ativo, criado_em);

create or replace function public.custos_restaurar_catalogo_externo_e_separar_local_rpc(
  p_empresa_id uuid,
  p_backup_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_backup public.custos_importacoes_catalogo_backups;
  v_catalogo_externo public.vendas_mobile_catalogos;
  v_catalogo_local public.vendas_mobile_catalogos;
  v_backup_atual uuid;
  v_movidos integer := 0;
  v_restaurados integer := 0;
begin
  if auth.uid() is not null and not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para separar os catálogos desta empresa.';
  end if;

  select * into v_backup
    from public.custos_importacoes_catalogo_backups
   where id = p_backup_id and empresa_id = p_empresa_id
   for update;
  if not found then raise exception 'O retrato de catálogo informado não pertence a esta empresa.'; end if;

  select * into v_catalogo_externo
    from public.vendas_mobile_catalogos
   where id = v_backup.catalogo_id and empresa_id = p_empresa_id
   for update;
  if not found then raise exception 'O catálogo externo de origem não foi localizado.'; end if;

  if jsonb_typeof(coalesce(v_backup.retrato -> 'produtos', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(v_backup.retrato -> 'produtos', '[]'::jsonb)) = 0 then
    raise exception 'O retrato não contém produtos para restauração.';
  end if;

  update public.vendas_mobile_catalogos
     set origem = 'externa', atualizado_em = now()
   where id = v_catalogo_externo.id;

  select * into v_catalogo_local
    from public.vendas_mobile_catalogos
   where empresa_id = p_empresa_id and (origem = 'custos_local' or codigo = 'CUSTOS_LOCAL')
   order by criado_em
   limit 1
   for update;
  if not found then
    insert into public.vendas_mobile_catalogos (empresa_id, nome, codigo, origem, ativo)
    values (p_empresa_id, 'Catálogo local de Custos', 'CUSTOS_LOCAL', 'custos_local', true)
    returning * into v_catalogo_local;
  else
    update public.vendas_mobile_catalogos
       set origem = 'custos_local', ativo = true, atualizado_em = now()
     where id = v_catalogo_local.id
     returning * into v_catalogo_local;
  end if;

  if exists (select 1 from public.vendas_mobile_catalogo_produtos where catalogo_id = v_catalogo_local.id) then
    raise exception 'O catálogo local já possui itens. A separação não foi repetida para evitar duplicidade.';
  end if;

  insert into public.custos_importacoes_catalogo_backups (empresa_id, catalogo_id, origem, retrato)
  values (
    p_empresa_id,
    v_catalogo_externo.id,
    'antes-da-separacao-catalogo-local',
    jsonb_build_object(
      'produtos', coalesce((select jsonb_agg(to_jsonb(produto)) from public.vendas_mobile_catalogo_produtos produto where produto.catalogo_id = v_catalogo_externo.id), '[]'::jsonb),
      'documento_custos', (select documento from public.custos_documentos where empresa_id = p_empresa_id)
    )
  ) returning id into v_backup_atual;

  -- A publicação é desligada antes de trocar a origem: os itens importados
  -- continuam íntegros no catálogo local, mas não entram no catálogo externo.
  update public.vendas_mobile_catalogo_produtos
     set disponivel_catalogo = false,
         catalogo_id = v_catalogo_local.id,
         atualizado_em = now()
   where catalogo_id = v_catalogo_externo.id;
  get diagnostics v_movidos = row_count;

  insert into public.vendas_mobile_catalogo_produtos
  select (jsonb_populate_record(
    null::public.vendas_mobile_catalogo_produtos,
    produto || jsonb_build_object(
      'catalogo_id', v_catalogo_externo.id,
      'habilitado_fiscal', false
    )
  )).*
    from jsonb_array_elements(v_backup.retrato -> 'produtos') produto;
  get diagnostics v_restaurados = row_count;

  return jsonb_build_object(
    'catalogo_externo_id', v_catalogo_externo.id,
    'catalogo_local_id', v_catalogo_local.id,
    'backup_segurança_id', v_backup_atual,
    'itens_movidos_para_local', v_movidos,
    'itens_restaurados_na_fonte_externa', v_restaurados
  );
end;
$$;

revoke all on function public.custos_restaurar_catalogo_externo_e_separar_local_rpc(uuid, uuid) from public, anon;
grant execute on function public.custos_restaurar_catalogo_externo_e_separar_local_rpc(uuid, uuid) to authenticated;

commit;
