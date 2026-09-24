-- Um insumo pode ser usado na composição e, sem ser divulgado comercialmente,
-- também existir no estoque e na seleção da emissão fiscal.
begin;

alter table public.vendas_mobile_catalogo_produtos
  add column if not exists habilitado_fiscal boolean not null default false;

comment on column public.vendas_mobile_catalogo_produtos.habilitado_fiscal is
  'Libera o item para estoque e emissão fiscal sem exigir disponibilidade no catálogo comercial. CFOP e natureza pertencem à operação da emissão.';

-- Produtos publicados continuam recebendo saldo; itens fiscais privados também.
create or replace function public.vendas_preparar_estoque_item_catalogo()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_empresa_id uuid; v_local_id uuid;
begin
  if new.ativo is not true
    or (new.disponivel_catalogo is not true and new.habilitado_fiscal is not true)
    or coalesce(new.tipo_item,'produto') <> 'produto' then
    return new;
  end if;

  select catalogo.empresa_id into v_empresa_id
    from public.vendas_mobile_catalogos catalogo
   where catalogo.id = new.catalogo_id and catalogo.ativo = true;
  if v_empresa_id is null then return new; end if;

  select id into v_local_id from public.vendas_estoque_locais
   where empresa_id = v_empresa_id and padrao = true and ativo = true
   order by criado_em limit 1;
  if v_local_id is null then
    insert into public.vendas_estoque_locais(empresa_id,codigo,nome,descricao,padrao,ativo)
    values(v_empresa_id,'principal','Estoque principal','Local padrão do módulo Vendas e Serviços.',true,true)
    on conflict (empresa_id,codigo) do update set ativo=true
    returning id into v_local_id;
  end if;

  insert into public.vendas_estoque_saldos(empresa_id,local_id,produto_id,saldo_fisico,saldo_reservado,estoque_minimo,permite_negativo)
  values(v_empresa_id,v_local_id,new.id,0,0,0,false)
  on conflict (empresa_id,local_id,produto_id) do nothing;
  return new;
end $$;

drop trigger if exists vendas_catalogo_preparar_estoque_trigger on public.vendas_mobile_catalogo_produtos;
create trigger vendas_catalogo_preparar_estoque_trigger
after insert or update of ativo,disponivel_catalogo,habilitado_fiscal,tipo_item on public.vendas_mobile_catalogo_produtos
for each row execute function public.vendas_preparar_estoque_item_catalogo();

commit;
