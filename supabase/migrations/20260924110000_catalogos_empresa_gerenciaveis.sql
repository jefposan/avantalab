-- Catálogos empresariais independentes: uma empresa pode manter várias fontes
-- sem confundir a fonte externa, o catálogo local de Custos e catálogos manuais.
begin;

alter table public.vendas_mobile_catalogos
  add column if not exists padrao boolean not null default false;

alter table public.vendas_mobile_catalogos
  drop constraint if exists vendas_mobile_catalogos_origem_check;
alter table public.vendas_mobile_catalogos
  add constraint vendas_mobile_catalogos_origem_check
  check (origem in ('externa', 'custos_local', 'manual'));

-- A instalação existente mantém uma única referência atual por empresa, dando
-- prioridade à fonte externa para preservar o comportamento já publicado.
with ordenados as (
  select id,
         row_number() over (
           partition by empresa_id
           order by case origem when 'externa' then 0 when 'custos_local' then 1 else 2 end,
                    criado_em, id
         ) as posicao
    from public.vendas_mobile_catalogos
   where ativo = true
)
update public.vendas_mobile_catalogos catalogo
   set padrao = (ordenados.posicao = 1),
       atualizado_em = now()
  from ordenados
 where catalogo.id = ordenados.id;

create unique index if not exists vendas_mobile_catalogos_empresa_padrao_uidx
  on public.vendas_mobile_catalogos (empresa_id)
  where padrao;

create or replace function public.custos_salvar_catalogo_empresa_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_nome text,
  p_codigo text default null
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_nome text := nullif(trim(coalesce(p_nome, '')), '');
  v_codigo text := upper(regexp_replace(trim(coalesce(p_codigo, '')), '[^A-Za-z0-9_-]+', '_', 'g'));
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para gerenciar os catálogos desta empresa.';
  end if;
  if v_nome is null then raise exception 'Informe o nome do catálogo.'; end if;

  if p_catalogo_id is null then
    if v_codigo = '' then
      v_codigo := 'CATALOGO_' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    end if;
    insert into public.vendas_mobile_catalogos (empresa_id, nome, codigo, origem, ativo, padrao, criado_por)
    values (p_empresa_id, v_nome, v_codigo, 'manual', true, false, auth.uid())
    returning * into v_catalogo;
    return v_catalogo;
  end if;

  select * into v_catalogo
    from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id
   for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;

  if v_catalogo.origem <> 'manual' and v_codigo <> '' and v_codigo <> v_catalogo.codigo then
    raise exception 'O código de uma fonte externa ou de Custos é protegido.';
  end if;

  update public.vendas_mobile_catalogos
     set nome = v_nome,
         codigo = case when v_catalogo.origem = 'manual' and v_codigo <> '' then v_codigo else codigo end,
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;
  return v_catalogo;
exception when unique_violation then
  raise exception 'Este código de catálogo já está em uso nesta empresa.';
end;
$$;

create or replace function public.custos_alterar_status_catalogo_empresa_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid,
  p_ativo boolean
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_substituto uuid;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para gerenciar os catálogos desta empresa.';
  end if;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id for update;
  if not found then raise exception 'Catálogo não localizado nesta empresa.'; end if;

  if not coalesce(p_ativo, false) and v_catalogo.padrao then
    select id into v_substituto from public.vendas_mobile_catalogos
     where empresa_id = p_empresa_id and ativo = true and id <> v_catalogo.id
     order by criado_em, id limit 1 for update;
    if v_substituto is null then
      raise exception 'Ative outro catálogo antes de desativar o catálogo atual.';
    end if;
    update public.vendas_mobile_catalogos set padrao = false, atualizado_em = now()
     where empresa_id = p_empresa_id and padrao;
    update public.vendas_mobile_catalogos set padrao = true, atualizado_em = now()
     where id = v_substituto;
  end if;

  update public.vendas_mobile_catalogos
     set ativo = coalesce(p_ativo, false),
         padrao = case when coalesce(p_ativo, false) then padrao else false end,
         atualizado_em = now()
   where id = v_catalogo.id
   returning * into v_catalogo;
  return v_catalogo;
end;
$$;

create or replace function public.custos_definir_catalogo_atual_rpc(
  p_empresa_id uuid,
  p_catalogo_id uuid
)
returns public.vendas_mobile_catalogos
language plpgsql security definer set search_path = public as $$
declare v_catalogo public.vendas_mobile_catalogos;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para gerenciar os catálogos desta empresa.';
  end if;
  select * into v_catalogo from public.vendas_mobile_catalogos
   where id = p_catalogo_id and empresa_id = p_empresa_id and ativo = true for update;
  if not found then raise exception 'Ative o catálogo antes de torná-lo o catálogo atual.'; end if;
  update public.vendas_mobile_catalogos set padrao = false, atualizado_em = now()
   where empresa_id = p_empresa_id and padrao;
  update public.vendas_mobile_catalogos set padrao = true, atualizado_em = now()
   where id = v_catalogo.id returning * into v_catalogo;
  return v_catalogo;
end;
$$;

revoke all on function public.custos_salvar_catalogo_empresa_rpc(uuid, uuid, text, text) from public, anon;
revoke all on function public.custos_alterar_status_catalogo_empresa_rpc(uuid, uuid, boolean) from public, anon;
revoke all on function public.custos_definir_catalogo_atual_rpc(uuid, uuid) from public, anon;
grant execute on function public.custos_salvar_catalogo_empresa_rpc(uuid, uuid, text, text) to authenticated;
grant execute on function public.custos_alterar_status_catalogo_empresa_rpc(uuid, uuid, boolean) to authenticated;
grant execute on function public.custos_definir_catalogo_atual_rpc(uuid, uuid) to authenticated;

commit;
