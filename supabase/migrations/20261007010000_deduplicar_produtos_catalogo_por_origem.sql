-- Cada conta pode manter apenas uma cópia de cada produto publicado pelo
-- catálogo. Esta correção conserva a primeira cópia (e todo o histórico),
-- redireciona referências da repetida e a mantém inativa para auditoria.
begin;

create temp table produtos_catalogo_repetidos on commit drop as
with classificados as (
  select
    produto.id as produto_repetido_id,
    produto.conta_id,
    produto.catalogo_produto_origem_id,
    first_value(produto.id) over (
      partition by produto.conta_id, produto.catalogo_produto_origem_id
      order by produto.criado_em, produto.id
    ) as produto_canonico_id,
    row_number() over (
      partition by produto.conta_id, produto.catalogo_produto_origem_id
      order by produto.criado_em, produto.id
    ) as posicao
  from public.vendas_mobile_produtos produto
  where produto.conta_id is not null
    and produto.catalogo_produto_origem_id is not null
)
select produto_repetido_id, produto_canonico_id, conta_id, catalogo_produto_origem_id
from classificados
where posicao > 1;

-- Pedidos e movimentos continuam apontando para o produto original. Os dados
-- registrados no pedido (quantidade, preço e descrição) não são alterados.
update public.vendas_mobile_pedido_itens item
   set produto_id = repetido.produto_canonico_id
  from produtos_catalogo_repetidos repetido
 where item.produto_id = repetido.produto_repetido_id;

update public.vendas_mobile_estoque_movimentos movimento
   set produto_id = repetido.produto_canonico_id
  from produtos_catalogo_repetidos repetido
 where movimento.produto_id = repetido.produto_repetido_id;

update public.vendas_mobile_catalogo_recebimentos recebimento
   set produto_id = repetido.produto_canonico_id,
       atualizado_em = now()
  from produtos_catalogo_repetidos repetido
 where recebimento.produto_id = repetido.produto_repetido_id;

update public.vendas_mobile_contas_catalogo_recebimentos recebimento
   set produto_id = repetido.produto_canonico_id,
       atualizado_em = now()
  from produtos_catalogo_repetidos repetido
 where recebimento.produto_id = repetido.produto_repetido_id;

-- Mescla os termos aprendidos pela busca por voz antes de descartar o índice
-- repetido, preservando a maior confiança, o total de confirmações e o último
-- uso conhecido em cada termo equivalente.
insert into public.vendas_mobile_produtos_busca_voz (
  conta_id, produto_id, termo, termo_normalizado, origem, confianca,
  confirmacoes, modelo, entrada_hash, ultima_utilizacao_em, criado_em, atualizado_em
)
select
  indice.conta_id, repetido.produto_canonico_id, indice.termo,
  indice.termo_normalizado, indice.origem, indice.confianca,
  indice.confirmacoes, indice.modelo, indice.entrada_hash,
  indice.ultima_utilizacao_em, indice.criado_em, now()
from public.vendas_mobile_produtos_busca_voz indice
join produtos_catalogo_repetidos repetido
  on repetido.produto_repetido_id = indice.produto_id
on conflict (conta_id, produto_id, termo_normalizado, origem) do update
  set confianca = greatest(public.vendas_mobile_produtos_busca_voz.confianca, excluded.confianca),
      confirmacoes = greatest(public.vendas_mobile_produtos_busca_voz.confirmacoes, excluded.confirmacoes),
      ultima_utilizacao_em = greatest(
        coalesce(public.vendas_mobile_produtos_busca_voz.ultima_utilizacao_em, '-infinity'::timestamptz),
        coalesce(excluded.ultima_utilizacao_em, '-infinity'::timestamptz)
      ),
      atualizado_em = now();

delete from public.vendas_mobile_produtos_busca_voz indice
using produtos_catalogo_repetidos repetido
where indice.produto_id = repetido.produto_repetido_id;

insert into public.vendas_mobile_busca_voz_aprendizados (
  conta_id, operacao_id, tipo, produto_id, cliente_id, termo,
  termo_normalizado, confirmado_por, criado_em
)
select
  aprendizado.conta_id, aprendizado.operacao_id, aprendizado.tipo,
  repetido.produto_canonico_id, aprendizado.cliente_id, aprendizado.termo,
  aprendizado.termo_normalizado, aprendizado.confirmado_por, aprendizado.criado_em
from public.vendas_mobile_busca_voz_aprendizados aprendizado
join produtos_catalogo_repetidos repetido
  on repetido.produto_repetido_id = aprendizado.produto_id
on conflict do nothing;

delete from public.vendas_mobile_busca_voz_aprendizados aprendizado
using produtos_catalogo_repetidos repetido
where aprendizado.produto_id = repetido.produto_repetido_id;

-- A cópia fica preservada apenas para auditoria e não pode voltar a ser
-- publicada: a origem é guardada nos metadados antes de ser desvinculada.
update public.vendas_mobile_produtos produto
   set ativo = false,
       catalogo_produto_origem_id = null,
       metadados = coalesce(produto.metadados, '{}'::jsonb) || jsonb_build_object(
         'catalogo_produto_origem_duplicada_id', repetido.catalogo_produto_origem_id,
         'produto_catalogo_canonico_id', repetido.produto_canonico_id,
         'motivo_inativacao', 'copia_duplicada_de_catalogo'
       ),
       atualizado_em = now()
  from produtos_catalogo_repetidos repetido
 where produto.id = repetido.produto_repetido_id;

drop index if exists public.vendas_mobile_produtos_conta_origem_catalogo_idx;
create unique index vendas_mobile_produtos_conta_origem_catalogo_uidx
  on public.vendas_mobile_produtos (conta_id, catalogo_produto_origem_id)
  where conta_id is not null and catalogo_produto_origem_id is not null;

-- O bloqueio por conta + origem cobre chamadas concorrentes de publicação: a
-- segunda aguarda a primeira e reutiliza a cópia recém-criada, em vez de gerar
-- uma duplicidade ou devolver erro ao vendedor.
create or replace function public.publicar_produto_catalogo_avantavendas(
  p_catalogo_produto_id uuid,
  p_conta_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_produto public.vendas_mobile_catalogo_produtos;
  v_catalogo public.vendas_mobile_catalogos;
  v_conta record;
  v_produto_conta_id uuid;
  v_publicavel boolean;
  v_atualizados integer := 0;
  v_adicionados integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;

  select * into v_produto
    from public.vendas_mobile_catalogo_produtos
   where id = p_catalogo_produto_id;
  if v_produto.id is null then raise exception 'Produto de catálogo não encontrado.'; end if;

  select * into v_catalogo
    from public.vendas_mobile_catalogos
   where id = v_produto.catalogo_id;
  if v_catalogo.id is null then raise exception 'Catálogo não encontrado.'; end if;

  if p_conta_id is null then
    if not public.vendas_mobile_pode_publicar_conteudo(v_catalogo.empresa_id)
       and not public.custos_pode_acessar_empresa(v_catalogo.empresa_id, true) then
      raise exception 'Você não tem permissão para publicar este catálogo.';
    end if;
  elsif not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;

  v_publicavel := v_catalogo.publicado_avantavendas
    and v_produto.ativo
    and v_produto.disponivel_catalogo
    and coalesce(v_produto.preco_divulgacao, 0) > 0;

  if not v_publicavel then
    update public.vendas_mobile_produtos
       set ativo = false,
           atualizado_em = now()
     where catalogo_produto_origem_id = v_produto.id
       and ativo = true;
    get diagnostics v_atualizados = row_count;
    return jsonb_build_object('atualizados', v_atualizados, 'adicionados', 0);
  end if;

  update public.vendas_mobile_produtos destino
     set marca = v_produto.marca,
         categoria = v_produto.categoria,
         sku = v_produto.sku,
         nome = v_produto.nome,
         descricao = v_produto.descricao,
         preco = coalesce(v_produto.preco_divulgacao, 0),
         unidade = v_produto.unidade,
         imagem_url = v_produto.imagem_url,
         metadados = coalesce(destino.metadados, '{}'::jsonb)
           || jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', v_catalogo.id, 'produto_id', v_produto.id)),
         ativo = v_publicavel,
         catalogo_empresa_id = v_catalogo.id,
         catalogo_produto_origem_id = v_produto.id,
         atualizado_em = now()
    from public.vendas_mobile_contas_vinculos_comerciais vinculo
    join public.vendas_mobile_contas_recursos recurso
      on recurso.conta_id = vinculo.conta_id and recurso.catalogo_ativo = true
   where destino.conta_id = vinculo.conta_id
     and destino.catalogo_produto_origem_id = v_produto.id
     and vinculo.empresa_id = v_catalogo.empresa_id
     and vinculo.ativo = true
     and (p_conta_id is null or vinculo.conta_id = p_conta_id)
     and public.vendas_mobile_vinculo_conta_valido(vinculo.conta_id, v_catalogo.empresa_id);
  get diagnostics v_atualizados = row_count;

  for v_conta in
    select conta.id, conta.criado_por
      from public.vendas_mobile_contas conta
      join public.vendas_mobile_contas_vinculos_comerciais vinculo
        on vinculo.conta_id = conta.id
       and vinculo.empresa_id = v_catalogo.empresa_id
       and vinculo.ativo = true
      join public.vendas_mobile_contas_recursos recurso
        on recurso.conta_id = conta.id and recurso.catalogo_ativo = true
     where conta.arquivada_em is null
       and (p_conta_id is null or conta.id = p_conta_id)
       and public.vendas_mobile_vinculo_conta_valido(conta.id, v_catalogo.empresa_id)
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      'catalogo-produto-conta:' || v_conta.id::text || ':' || v_produto.id::text,
      0
    ));

    select id into v_produto_conta_id
      from public.vendas_mobile_produtos
     where conta_id = v_conta.id and catalogo_produto_origem_id = v_produto.id
     order by criado_em, id
     limit 1;

    if v_produto_conta_id is null and v_publicavel then
      insert into public.vendas_mobile_produtos (
        user_id, conta_id, marca, categoria, sku, nome, descricao, preco,
        preco_custo, estoque, unidade, imagem_url, metadados, ativo,
        catalogo_empresa_id, catalogo_produto_origem_id, estoque_controlado
      ) values (
        v_conta.criado_por, v_conta.id, v_produto.marca, v_produto.categoria,
        v_produto.sku, v_produto.nome, v_produto.descricao, v_produto.preco_divulgacao,
        0, null, v_produto.unidade, v_produto.imagem_url,
        jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', v_catalogo.id, 'produto_id', v_produto.id)),
        true, v_catalogo.id, v_produto.id, false
      ) returning id into v_produto_conta_id;
      v_adicionados := v_adicionados + 1;
    end if;

    if v_produto_conta_id is not null then
      insert into public.vendas_mobile_contas_catalogo_recebimentos (
        conta_id, catalogo_produto_id, produto_id, status, recebido_por, atualizado_em
      ) values (
        v_conta.id, v_produto.id, v_produto_conta_id, 'recebido', v_conta.criado_por, now()
      ) on conflict (conta_id, catalogo_produto_id) do update
        set produto_id = excluded.produto_id,
            status = 'recebido',
            atualizado_em = excluded.atualizado_em;
    end if;
  end loop;

  return jsonb_build_object('atualizados', v_atualizados, 'adicionados', v_adicionados);
end;
$$;

commit;
