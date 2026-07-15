-- Evita duplicidade quando uma importação já criou a cópia pessoal de um
-- produto do catálogo antes do respectivo recibo de sincronização existir.
create or replace function public.sincronizar_catalogo_vendas_mobile_rpc()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_catalogo public.vendas_mobile_catalogos;
  v_produto public.vendas_mobile_catalogo_produtos;
  v_produto_pessoal_id uuid;
  v_adicionados integer := 0;
  v_ignorados integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  for v_catalogo in
    select c.* from public.vendas_mobile_catalogos c
    join public.vendas_mobile_vinculos_comerciais v on v.empresa_id = c.empresa_id and v.user_id = auth.uid() and v.ativo and v.catalogo_ativo
    join public.empresa_modulos m on m.empresa_id = c.empresa_id and m.modulo_id = 'vendas_mobile' and m.ativo = true
    where c.ativo = true
  loop
    for v_produto in select * from public.vendas_mobile_catalogo_produtos where catalogo_id = v_catalogo.id and ativo = true loop
      if exists (
        select 1 from public.vendas_mobile_catalogo_recebimentos r
        where r.user_id = auth.uid() and r.catalogo_produto_id = v_produto.id
      ) then
        v_ignorados := v_ignorados + 1;
        continue;
      end if;

      select p.id into v_produto_pessoal_id
      from public.vendas_mobile_produtos p
      where p.user_id = auth.uid() and p.catalogo_produto_origem_id = v_produto.id
      limit 1;

      if v_produto_pessoal_id is not null then
        insert into public.vendas_mobile_catalogo_recebimentos (user_id, catalogo_produto_id, produto_id, status)
        values (auth.uid(), v_produto.id, v_produto_pessoal_id, 'recebido');
        v_ignorados := v_ignorados + 1;
        continue;
      end if;

      insert into public.vendas_mobile_produtos (
        user_id, marca, categoria, sku, nome, descricao, preco, preco_custo,
        estoque, unidade, imagem_url, metadados, ativo, catalogo_empresa_id,
        catalogo_produto_origem_id, estoque_controlado
      ) values (
        auth.uid(), v_produto.marca, v_produto.categoria, v_produto.sku,
        v_produto.nome, v_produto.descricao, v_produto.preco_venda,
        v_produto.preco_custo, null, v_produto.unidade, v_produto.imagem_url,
        jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', v_catalogo.id, 'produto_id', v_produto.id)),
        true, v_catalogo.id, v_produto.id, false
      ) returning id into v_produto_pessoal_id;

      insert into public.vendas_mobile_catalogo_recebimentos (user_id, catalogo_produto_id, produto_id)
      values (auth.uid(), v_produto.id, v_produto_pessoal_id);
      v_adicionados := v_adicionados + 1;
    end loop;
  end loop;
  return jsonb_build_object('adicionados', v_adicionados, 'ja_recebidos', v_ignorados);
end;
$$;
