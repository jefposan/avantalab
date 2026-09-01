-- Separa o preço interno de venda, calculado pela Gestão, do preço sugerido
-- de revenda publicado no catálogo de divulgação do AvantaVendas.
begin;

alter table public.vendas_mobile_catalogo_produtos
  add column if not exists preco_divulgacao numeric(12,2);

-- Congela a sugestão anterior à separação. Quando a precificação interna já
-- alterou o preço compartilhado, o primeiro valor anterior auditado recupera
-- o preço que existia no catálogo. Sem histórico, preserva-se o valor atual.
with sugestoes_anteriores as (
  select produto.id,
         coalesce(
           (
             select historico.preco_anterior
               from public.custos_tabela_preco_historico historico
              where historico.produto_id = produto.id
                and historico.preco_anterior > 0
              order by historico.criado_em asc, historico.id asc
              limit 1
           ),
           nullif(produto.preco_venda, 0)
         ) as preco_original
    from public.vendas_mobile_catalogo_produtos produto
)
update public.vendas_mobile_catalogo_produtos produto
   set preco_divulgacao = sugestao.preco_original
  from sugestoes_anteriores sugestao
 where produto.id = sugestao.id
   and produto.preco_divulgacao is null
   and sugestao.preco_original > 0;

alter table public.vendas_mobile_catalogo_produtos
  drop constraint if exists vendas_mobile_catalogo_produtos_preco_divulgacao_check;
alter table public.vendas_mobile_catalogo_produtos
  add constraint vendas_mobile_catalogo_produtos_preco_divulgacao_check
  check (preco_divulgacao is null or preco_divulgacao > 0);

comment on column public.vendas_mobile_catalogo_produtos.preco_divulgacao is
  'Preço sugerido de revenda publicado ao distribuidor no catálogo do AvantaVendas; independente do preço interno da Gestão.';

create or replace function public.sincronizar_catalogo_vendas_mobile_rpc(p_conta_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid; v_catalogo public.vendas_mobile_catalogos;
  v_produto public.vendas_mobile_catalogo_produtos; v_produto_conta_id uuid;
  v_adicionados integer := 0; v_ignorados integer := 0; v_sem_preco integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('catalogo-conta:' || p_conta_id::text, 0));
  select empresa_id into v_empresa_id from public.vendas_mobile_contas
  where id = p_conta_id and arquivada_em is null;
  if v_empresa_id is null then
    return jsonb_build_object('adicionados', 0, 'ja_recebidos', 0, 'sem_preco', 0);
  end if;
  if not exists (
    select 1 from public.vendas_mobile_vinculos_comerciais vinculo
    where vinculo.user_id = auth.uid() and vinculo.empresa_id = v_empresa_id
      and vinculo.ativo and vinculo.catalogo_ativo
  ) then
    return jsonb_build_object('adicionados', 0, 'ja_recebidos', 0, 'sem_preco', 0);
  end if;
  for v_catalogo in
    select catalogo.* from public.vendas_mobile_catalogos catalogo
    join public.empresa_modulos modulo on modulo.empresa_id = catalogo.empresa_id
      and modulo.modulo_id = 'vendas_mobile' and modulo.ativo = true
    where catalogo.empresa_id = v_empresa_id and catalogo.ativo = true
  loop
    for v_produto in select * from public.vendas_mobile_catalogo_produtos
      where catalogo_id = v_catalogo.id and ativo = true and disponivel_catalogo = true
    loop
      if v_produto.preco_divulgacao is null or v_produto.preco_divulgacao <= 0 then
        v_sem_preco := v_sem_preco + 1; continue;
      end if;
      if exists (select 1 from public.vendas_mobile_contas_catalogo_recebimentos r
        where r.conta_id = p_conta_id and r.catalogo_produto_id = v_produto.id) then
        v_ignorados := v_ignorados + 1; continue;
      end if;
      select id into v_produto_conta_id from public.vendas_mobile_produtos
      where conta_id = p_conta_id and catalogo_produto_origem_id = v_produto.id limit 1;
      if v_produto_conta_id is null then
        insert into public.vendas_mobile_produtos(
          user_id, conta_id, marca, categoria, sku, nome, descricao, preco, preco_custo,
          estoque, unidade, imagem_url, metadados, ativo, catalogo_empresa_id,
          catalogo_produto_origem_id, estoque_controlado
        ) values (
          auth.uid(), p_conta_id, v_produto.marca, v_produto.categoria, v_produto.sku,
          v_produto.nome, v_produto.descricao, v_produto.preco_divulgacao, 0,
          null, v_produto.unidade, v_produto.imagem_url,
          jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', v_catalogo.id, 'produto_id', v_produto.id)),
          true, v_catalogo.id, v_produto.id, false
        ) returning id into v_produto_conta_id;
        v_adicionados := v_adicionados + 1;
      else v_ignorados := v_ignorados + 1; end if;
      insert into public.vendas_mobile_contas_catalogo_recebimentos(
        conta_id, catalogo_produto_id, produto_id, status, recebido_por
      ) values (p_conta_id, v_produto.id, v_produto_conta_id, 'recebido', auth.uid())
      on conflict (conta_id, catalogo_produto_id) do nothing;
    end loop;
  end loop;
  return jsonb_build_object(
    'adicionados', v_adicionados,
    'ja_recebidos', v_ignorados,
    'sem_preco', v_sem_preco
  );
end;
$$;

revoke all on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) from public, anon;
grant execute on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) to authenticated;

commit;
