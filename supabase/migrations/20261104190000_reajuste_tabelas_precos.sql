-- Reajuste atômico e auditável das tabelas de preços de Custos e Precificação.
begin;

create table if not exists public.custos_reajustes_tabelas (
  id uuid primary key,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null check (tipo in ('percentual', 'valor')),
  valor numeric(12,4) not null check (valor > 0),
  tabela_ids uuid[] not null check (cardinality(tabela_ids) > 0),
  tabelas_quantidade integer not null default 0 check (tabelas_quantidade >= 0),
  precos_atualizados integer not null default 0 check (precos_atualizados >= 0),
  detalhes jsonb not null default '{}'::jsonb check (jsonb_typeof(detalhes) = 'object'),
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists custos_reajustes_tabelas_empresa_idx
  on public.custos_reajustes_tabelas (empresa_id, criado_em desc);

alter table public.custos_tabela_preco_historico
  add column if not exists reajuste_id uuid references public.custos_reajustes_tabelas(id) on delete set null;
create index if not exists custos_tabela_preco_historico_reajuste_idx
  on public.custos_tabela_preco_historico (reajuste_id) where reajuste_id is not null;

alter table public.custos_tabela_preco_historico
  drop constraint if exists custos_tabela_preco_historico_origem_check;
alter table public.custos_tabela_preco_historico
  add constraint custos_tabela_preco_historico_origem_check
  check (origem in ('manual', 'importacao', 'reajuste'));

alter table public.custos_reajustes_tabelas enable row level security;
drop policy if exists custos_reajustes_tabelas_leitura on public.custos_reajustes_tabelas;
create policy custos_reajustes_tabelas_leitura on public.custos_reajustes_tabelas
  for select to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, false));

revoke all on table public.custos_reajustes_tabelas from public, anon, authenticated;
grant select on table public.custos_reajustes_tabelas to authenticated;

create or replace function public.custos_aplicar_reajuste_tabelas_rpc(
  p_empresa_id uuid,
  p_reajuste_id uuid,
  p_tabela_ids uuid[],
  p_tipo text,
  p_valor numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tabela_ids uuid[];
  v_existente public.custos_reajustes_tabelas;
  v_tabela public.custos_tabelas_preco;
  v_produto public.vendas_mobile_catalogo_produtos;
  v_anterior numeric(12,2);
  v_novo numeric;
  v_tabelas_quantidade integer := 0;
  v_precos_atualizados integer := 0;
  v_herdados_materializados integer := 0;
  v_preco_proprio boolean;
  v_detalhes jsonb;
begin
  if not public.custos_pode_acessar_empresa(p_empresa_id, true) then
    raise exception 'Sem permissão para reajustar tabelas de preços.';
  end if;
  if p_reajuste_id is null then raise exception 'Identificador do reajuste não informado.'; end if;
  if p_tipo not in ('percentual', 'valor') then raise exception 'Escolha percentual ou valor adicional.'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Informe um reajuste maior que zero.'; end if;

  -- Serializa repetições concorrentes do mesmo comando antes de consultar o
  -- lote. Uma nova tentativa recebe o resultado já gravado, sem reaplicar.
  perform pg_advisory_xact_lock(hashtextextended(p_reajuste_id::text, 0));

  select coalesce(array_agg(item.id order by item.id), '{}'::uuid[])
    into v_tabela_ids
    from (select distinct unnest(coalesce(p_tabela_ids, '{}'::uuid[])) as id) item;
  if cardinality(v_tabela_ids) = 0 then raise exception 'Selecione ao menos uma tabela de preços.'; end if;

  select * into v_existente
    from public.custos_reajustes_tabelas
   where id = p_reajuste_id;
  if found then
    if v_existente.empresa_id <> p_empresa_id
       or v_existente.tipo <> p_tipo
       or v_existente.valor <> round(p_valor, 4)
       or v_existente.tabela_ids <> v_tabela_ids then
      raise exception 'Este identificador já pertence a outro reajuste.';
    end if;
    return jsonb_build_object(
      'reajuste_id', v_existente.id,
      'tabelas_atualizadas', v_existente.tabelas_quantidade,
      'precos_atualizados', v_existente.precos_atualizados
    );
  end if;

  select count(*) into v_tabelas_quantidade
    from public.custos_tabelas_preco tabela
   where tabela.id = any(v_tabela_ids)
     and tabela.empresa_id = p_empresa_id
     and tabela.ativo;
  if v_tabelas_quantidade <> cardinality(v_tabela_ids) then
    raise exception 'Uma das tabelas selecionadas não existe, está inativa ou pertence a outra empresa.';
  end if;
  if not exists (
    select 1
      from public.vendas_mobile_catalogo_produtos produto
      join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
     where catalogo.empresa_id = p_empresa_id
       and produto.ativo
       and produto.excluido_em is null
  ) then raise exception 'Não há produtos ou serviços ativos para reajustar.'; end if;

  -- Os bloqueios são adquiridos sempre na mesma ordem antes do cálculo. Isso
  -- evita que dois reajustes simultâneos utilizem bases diferentes ou entrem
  -- em impasse ao compartilhar produtos e tabelas.
  perform 1
    from public.custos_tabelas_preco tabela
   where tabela.id = any(v_tabela_ids)
   order by tabela.id
   for update;
  perform 1
    from public.vendas_mobile_catalogo_produtos produto
    join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
   where catalogo.empresa_id = p_empresa_id
     and produto.ativo
     and produto.excluido_em is null
   order by produto.id
   for update of produto;

  insert into public.custos_reajustes_tabelas (
    id, empresa_id, tipo, valor, tabela_ids, tabelas_quantidade, precos_atualizados
  ) values (
    p_reajuste_id, p_empresa_id, p_tipo, round(p_valor, 4), v_tabela_ids, v_tabelas_quantidade, 0
  );

  -- Tabelas adicionais são processadas antes da padrão. Assim, um preço ainda
  -- herdado usa a base original e não recebe o mesmo reajuste duas vezes.
  for v_tabela in
    select tabela.*
      from public.custos_tabelas_preco tabela
     where tabela.id = any(v_tabela_ids)
     order by tabela.padrao asc, tabela.id
  loop
    for v_produto in
      select produto.*
        from public.vendas_mobile_catalogo_produtos produto
        join public.vendas_mobile_catalogos catalogo on catalogo.id = produto.catalogo_id
       where catalogo.empresa_id = p_empresa_id
         and produto.ativo
         and produto.excluido_em is null
       order by produto.id
    loop
      v_preco_proprio := false;
      if v_tabela.padrao then
        v_anterior := v_produto.preco_venda;
      else
        select item.preco into v_anterior
          from public.custos_tabela_preco_itens item
         where item.tabela_preco_id = v_tabela.id
           and item.produto_id = v_produto.id;
        if found then
          v_preco_proprio := true;
        else
          v_anterior := v_produto.preco_venda;
        end if;
      end if;

      v_novo := round(case
        when p_tipo = 'percentual' then v_anterior * (1 + p_valor / 100)
        else v_anterior + p_valor
      end, 2);
      if v_novo > 9999999999.99 then raise exception 'O reajuste ultrapassa o limite permitido para preços.'; end if;
      if v_novo is not distinct from v_anterior then continue; end if;

      if v_tabela.padrao then
        update public.vendas_mobile_catalogo_produtos
           set preco_venda = v_novo, atualizado_em = now()
         where id = v_produto.id;
      else
        insert into public.custos_tabela_preco_itens (tabela_preco_id, produto_id, preco)
        values (v_tabela.id, v_produto.id, v_novo)
        on conflict (tabela_preco_id, produto_id) do update set preco = excluded.preco;
        if not v_preco_proprio then v_herdados_materializados := v_herdados_materializados + 1; end if;
      end if;

      insert into public.custos_tabela_preco_historico (
        empresa_id, tabela_preco_id, produto_id, preco_anterior, preco_novo, origem, reajuste_id
      ) values (
        p_empresa_id, v_tabela.id, v_produto.id, v_anterior, v_novo, 'reajuste', p_reajuste_id
      );
      v_precos_atualizados := v_precos_atualizados + 1;
    end loop;
  end loop;

  select jsonb_build_object(
    'tabelas', coalesce(jsonb_agg(jsonb_build_object(
      'id', tabela.id, 'nome', tabela.nome, 'codigo', tabela.codigo, 'padrao', tabela.padrao
    ) order by tabela.padrao desc, tabela.nome), '[]'::jsonb),
    'valores_herdados_materializados', v_herdados_materializados
  ) into v_detalhes
    from public.custos_tabelas_preco tabela
   where tabela.id = any(v_tabela_ids);

  update public.custos_reajustes_tabelas
     set precos_atualizados = v_precos_atualizados,
         detalhes = v_detalhes
   where id = p_reajuste_id;

  return jsonb_build_object(
    'reajuste_id', p_reajuste_id,
    'tabelas_atualizadas', v_tabelas_quantidade,
    'precos_atualizados', v_precos_atualizados
  );
end;
$$;

revoke all on function public.custos_aplicar_reajuste_tabelas_rpc(uuid, uuid, uuid[], text, numeric)
  from public, anon, authenticated;
grant execute on function public.custos_aplicar_reajuste_tabelas_rpc(uuid, uuid, uuid[], text, numeric)
  to authenticated;

comment on table public.custos_reajustes_tabelas is
  'Lotes auditáveis e idempotentes de reajuste aplicados às tabelas de preços internas da empresa.';
comment on function public.custos_aplicar_reajuste_tabelas_rpc(uuid, uuid, uuid[], text, numeric) is
  'Aplica percentual ou valor adicional às tabelas ativas selecionadas, preservando histórico por item.';

commit;
