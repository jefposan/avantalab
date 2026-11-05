-- Custos e Precificação: exclusão lógica do cadastro mestre.
-- O item deixa de participar das operações, mas a mesma identidade permanece
-- disponível para históricos de custos, vendas, estoque e documentos fiscais.
begin;

alter table public.vendas_mobile_catalogo_produtos
  add column if not exists excluido_em timestamptz,
  add column if not exists excluido_por uuid references auth.users(id) on delete set null;

create index if not exists vendas_mobile_catalogo_produtos_exclusao_idx
  on public.vendas_mobile_catalogo_produtos (catalogo_id, excluido_em, nome);

comment on column public.vendas_mobile_catalogo_produtos.excluido_em is
  'Exclusão lógica: oculta o cadastro das operações sem remover sua identidade histórica.';

-- O navegador pode criar e editar quando autorizado, mas não recebe DELETE.
-- A remoção visível passa exclusivamente pela RPC de exclusão lógica abaixo.
drop policy if exists vendas_catalogo_produtos_gestao on public.vendas_mobile_catalogo_produtos;
drop policy if exists vendas_catalogo_produtos_gestao_inserir on public.vendas_mobile_catalogo_produtos;
drop policy if exists vendas_catalogo_produtos_gestao_atualizar on public.vendas_mobile_catalogo_produtos;
create policy vendas_catalogo_produtos_gestao_inserir
  on public.vendas_mobile_catalogo_produtos for insert to authenticated
  with check (exists (
    select 1 from public.vendas_mobile_catalogos catalogo
     where catalogo.id = catalogo_id
       and (
         public.vendas_mobile_pode_gerir_catalogo(catalogo.empresa_id)
         or public.custos_pode_acessar_empresa(catalogo.empresa_id, true)
       )
  ));
create policy vendas_catalogo_produtos_gestao_atualizar
  on public.vendas_mobile_catalogo_produtos for update to authenticated
  using (exists (
    select 1 from public.vendas_mobile_catalogos catalogo
     where catalogo.id = catalogo_id
       and (
         public.vendas_mobile_pode_gerir_catalogo(catalogo.empresa_id)
         or public.custos_pode_acessar_empresa(catalogo.empresa_id, true)
       )
  ))
  with check (exists (
    select 1 from public.vendas_mobile_catalogos catalogo
     where catalogo.id = catalogo_id
       and (
         public.vendas_mobile_pode_gerir_catalogo(catalogo.empresa_id)
         or public.custos_pode_acessar_empresa(catalogo.empresa_id, true)
       )
  ));

create or replace function public.custos_bloquear_alteracao_produto_excluido()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.excluido_em is not null then
    raise exception 'Este cadastro foi excluído e permanece disponível somente nos históricos.';
  end if;
  return new;
end;
$$;

drop trigger if exists custos_bloquear_alteracao_produto_excluido
  on public.vendas_mobile_catalogo_produtos;
create trigger custos_bloquear_alteracao_produto_excluido
before update on public.vendas_mobile_catalogo_produtos
for each row
when (old.excluido_em is not null)
execute function public.custos_bloquear_alteracao_produto_excluido();

create or replace function public.custos_excluir_produto_rpc(
  p_empresa_id uuid,
  p_produto_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produto public.vendas_mobile_catalogo_produtos;
  v_excluido_em timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception 'Sua sessão expirou. Entre novamente antes de excluir.';
  end if;
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Você não possui permissão para excluir cadastros desta empresa.';
  end if;

  select produto.*
    into v_produto
    from public.vendas_mobile_catalogo_produtos produto
    join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
   where produto.id = p_produto_id
     and catalogo.empresa_id = p_empresa_id
   for update of produto;
  if not found then
    raise exception 'Produto ou serviço não encontrado nesta empresa.';
  end if;
  if v_produto.excluido_em is not null then
    return jsonb_build_object(
      'produto_id', p_produto_id,
      'excluido', true,
      'excluido_em', v_produto.excluido_em
    );
  end if;

  -- ativo/disponivel_catalogo também despublicam as cópias operacionais pelo
  -- gatilho já existente, sem apagar nenhuma delas ou seus lançamentos.
  update public.vendas_mobile_catalogo_produtos
     set ativo = false,
         disponivel_catalogo = false,
         excluido_em = v_excluido_em,
         excluido_por = auth.uid(),
         atualizado_em = v_excluido_em
   where id = p_produto_id;

  return jsonb_build_object(
    'produto_id', p_produto_id,
    'excluido', true,
    'excluido_em', v_excluido_em
  );
end;
$$;

revoke all on function public.custos_bloquear_alteracao_produto_excluido() from public, anon, authenticated;
revoke all on function public.custos_excluir_produto_rpc(uuid, uuid) from public, anon;
grant execute on function public.custos_excluir_produto_rpc(uuid, uuid) to authenticated;

commit;
