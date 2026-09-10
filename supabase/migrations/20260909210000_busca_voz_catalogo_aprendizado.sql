-- Índice oculto da Solicitação por Voz.
-- O cadastro comercial continua intacto; aliases automáticos, enriquecidos por
-- IA e aprendidos ficam em tabelas auxiliares, sempre isolados por catálogo ou
-- conta. A migração somente cria estruturas e índices de busca.

begin;

create table if not exists public.vendas_mobile_catalogo_produtos_busca_voz (
  id bigint generated always as identity primary key,
  catalogo_produto_id uuid not null references public.vendas_mobile_catalogo_produtos(id) on delete cascade,
  termo text not null check (char_length(termo) between 2 and 160),
  termo_normalizado text not null check (char_length(termo_normalizado) between 2 and 160),
  origem text not null check (origem in ('automatico', 'ia')),
  confianca numeric(4,3) not null default 0.900 check (confianca between 0 and 1),
  modelo text,
  entrada_hash text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (catalogo_produto_id, termo_normalizado, origem)
);

create table if not exists public.vendas_mobile_produtos_busca_voz (
  id bigint generated always as identity primary key,
  conta_id uuid not null references public.vendas_mobile_contas(id) on delete cascade,
  produto_id uuid not null references public.vendas_mobile_produtos(id) on delete cascade,
  termo text not null check (char_length(termo) between 2 and 160),
  termo_normalizado text not null check (char_length(termo_normalizado) between 2 and 160),
  origem text not null check (origem in ('automatico', 'ia', 'aprendizado')),
  confianca numeric(4,3) not null default 0.900 check (confianca between 0 and 1),
  confirmacoes integer not null default 0 check (confirmacoes >= 0),
  modelo text,
  entrada_hash text,
  ultima_utilizacao_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (conta_id, produto_id, termo_normalizado, origem)
);

create table if not exists public.vendas_mobile_clientes_busca_voz (
  id bigint generated always as identity primary key,
  conta_id uuid not null references public.vendas_mobile_contas(id) on delete cascade,
  cliente_id uuid not null references public.vendas_mobile_clientes(id) on delete cascade,
  termo text not null check (char_length(termo) between 2 and 160),
  termo_normalizado text not null check (char_length(termo_normalizado) between 2 and 160),
  origem text not null default 'aprendizado' check (origem = 'aprendizado'),
  confianca numeric(4,3) not null default 0.900 check (confianca between 0 and 1),
  confirmacoes integer not null default 1 check (confirmacoes >= 1),
  ultima_utilizacao_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (conta_id, cliente_id, termo_normalizado)
);

create table if not exists public.vendas_mobile_busca_voz_aprendizados (
  id bigint generated always as identity primary key,
  conta_id uuid not null references public.vendas_mobile_contas(id) on delete cascade,
  operacao_id uuid not null,
  tipo text not null check (tipo in ('product', 'customer')),
  produto_id uuid references public.vendas_mobile_produtos(id) on delete cascade,
  cliente_id uuid references public.vendas_mobile_clientes(id) on delete cascade,
  termo text not null check (char_length(termo) between 2 and 160),
  termo_normalizado text not null check (char_length(termo_normalizado) between 2 and 160),
  confirmado_por uuid not null references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  check (
    (tipo = 'product' and produto_id is not null and cliente_id is null)
    or (tipo = 'customer' and cliente_id is not null and produto_id is null)
  )
);

create unique index if not exists vendas_mobile_busca_voz_aprendizado_evento_uidx
  on public.vendas_mobile_busca_voz_aprendizados (
    conta_id, operacao_id, tipo, termo_normalizado,
    coalesce(produto_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists public.vendas_mobile_catalogo_busca_voz_fila (
  catalogo_produto_id uuid primary key references public.vendas_mobile_catalogo_produtos(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  entrada_hash text not null,
  status text not null default 'pendente' check (status in ('pendente', 'processando', 'concluido', 'erro')),
  tentativas integer not null default 0 check (tentativas >= 0),
  ultimo_erro text,
  processar_apos timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists vendas_mobile_produtos_busca_voz_termo_idx
  on public.vendas_mobile_produtos_busca_voz (conta_id, termo_normalizado);
create index if not exists vendas_mobile_clientes_busca_voz_termo_idx
  on public.vendas_mobile_clientes_busca_voz (conta_id, termo_normalizado);
create index if not exists vendas_mobile_catalogo_busca_voz_fila_idx
  on public.vendas_mobile_catalogo_busca_voz_fila (empresa_id, status, processar_apos);

alter table public.vendas_mobile_catalogo_produtos_busca_voz enable row level security;
alter table public.vendas_mobile_produtos_busca_voz enable row level security;
alter table public.vendas_mobile_clientes_busca_voz enable row level security;
alter table public.vendas_mobile_busca_voz_aprendizados enable row level security;
alter table public.vendas_mobile_catalogo_busca_voz_fila enable row level security;

drop policy if exists vendas_produtos_busca_voz_leitura on public.vendas_mobile_produtos_busca_voz;
create policy vendas_produtos_busca_voz_leitura
on public.vendas_mobile_produtos_busca_voz for select to authenticated
using (public.vendas_mobile_pode_ler_conta(conta_id));

drop policy if exists vendas_clientes_busca_voz_leitura on public.vendas_mobile_clientes_busca_voz;
create policy vendas_clientes_busca_voz_leitura
on public.vendas_mobile_clientes_busca_voz for select to authenticated
using (public.vendas_mobile_pode_ler_conta(conta_id));

drop policy if exists vendas_aprendizados_busca_voz_leitura on public.vendas_mobile_busca_voz_aprendizados;
create policy vendas_aprendizados_busca_voz_leitura
on public.vendas_mobile_busca_voz_aprendizados for select to authenticated
using (public.vendas_mobile_pode_ler_conta(conta_id));

revoke all on public.vendas_mobile_catalogo_produtos_busca_voz from anon, authenticated;
revoke all on public.vendas_mobile_catalogo_busca_voz_fila from anon, authenticated;
revoke all on public.vendas_mobile_produtos_busca_voz from anon, authenticated;
revoke all on public.vendas_mobile_clientes_busca_voz from anon, authenticated;
revoke all on public.vendas_mobile_busca_voz_aprendizados from anon, authenticated;
grant select on public.vendas_mobile_produtos_busca_voz to authenticated;
grant select on public.vendas_mobile_clientes_busca_voz to authenticated;
grant select on public.vendas_mobile_busca_voz_aprendizados to authenticated;

create or replace function public.vendas_mobile_normalizar_busca_voz(p_termo text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select trim(regexp_replace(
    translate(lower(p_termo),
      'áàâãäéèêëíìîïóòôõöúùûüçñýÿ',
      'aaaaaeeeeiiiiooooouuuucnyy'),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

create or replace function public.vendas_mobile_catalogo_busca_voz_hash(p_produto public.vendas_mobile_catalogo_produtos)
returns text
language sql
immutable
set search_path = public
as $$
  select md5(concat_ws(chr(31),
    coalesce(p_produto.nome, ''), coalesce(p_produto.marca, ''),
    coalesce(p_produto.categoria, ''), coalesce(p_produto.descricao, ''),
    coalesce(p_produto.sku, ''), coalesce(p_produto.unidade, '')
  ));
$$;

create or replace function public.vendas_mobile_termos_automaticos_produto(
  p_nome text,
  p_marca text,
  p_categoria text,
  p_sku text,
  p_unidade text
)
returns table (termo text, termo_normalizado text)
language sql
immutable
set search_path = public
as $$
  with termos as (
    select unnest(array[
      nullif(trim(p_nome), ''),
      nullif(trim(p_marca), ''),
      nullif(trim(p_sku), ''),
      nullif(trim(concat_ws(' ', p_categoria, p_nome)), ''),
      nullif(trim(concat_ws(' ', p_nome, p_categoria)), ''),
      nullif(trim(concat_ws(' ', p_marca, p_nome)), ''),
      nullif(trim(concat_ws(' ', p_nome, p_marca)), ''),
      nullif(trim(concat_ws(' ', p_nome, p_unidade)), '')
    ]) as valor
    union all
    select regexp_split_to_table(coalesce(p_nome, ''), '\s*[-–—/]\s*')
  )
  select min(trim(valor)) as termo, public.vendas_mobile_normalizar_busca_voz(valor) as termo_normalizado
  from termos
  where valor is not null
    and char_length(trim(valor)) between 2 and 160
    and char_length(public.vendas_mobile_normalizar_busca_voz(valor)) between 2 and 160
  group by public.vendas_mobile_normalizar_busca_voz(valor);
$$;

create or replace function public.vendas_mobile_reconstruir_busca_produto_conta(p_produto_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produto public.vendas_mobile_produtos;
begin
  select * into v_produto from public.vendas_mobile_produtos where id = p_produto_id;
  if v_produto.id is null or v_produto.conta_id is null then return; end if;

  delete from public.vendas_mobile_produtos_busca_voz
   where produto_id = v_produto.id and origem in ('automatico', 'ia');

  if coalesce(v_produto.ativo, true) then
    insert into public.vendas_mobile_produtos_busca_voz (
      conta_id, produto_id, termo, termo_normalizado, origem, confianca, entrada_hash
    )
    select v_produto.conta_id, v_produto.id, termo, termo_normalizado,
      'automatico', 0.940,
      md5(concat_ws(chr(31), coalesce(v_produto.nome, ''), coalesce(v_produto.marca, ''),
        coalesce(v_produto.categoria, ''), coalesce(v_produto.descricao, ''),
        coalesce(v_produto.sku, ''), coalesce(v_produto.unidade, '')))
    from public.vendas_mobile_termos_automaticos_produto(
      v_produto.nome, v_produto.marca, v_produto.categoria, v_produto.sku, v_produto.unidade
    )
    on conflict (conta_id, produto_id, termo_normalizado, origem) do update
      set termo = excluded.termo,
          confianca = excluded.confianca,
          entrada_hash = excluded.entrada_hash,
          atualizado_em = now();

    if v_produto.catalogo_produto_origem_id is not null then
      insert into public.vendas_mobile_produtos_busca_voz (
        conta_id, produto_id, termo, termo_normalizado, origem, confianca,
        confirmacoes, modelo, entrada_hash
      )
      select v_produto.conta_id, v_produto.id, indice.termo,
        indice.termo_normalizado, indice.origem, indice.confianca, 0,
        indice.modelo, indice.entrada_hash
      from public.vendas_mobile_catalogo_produtos_busca_voz indice
      where indice.catalogo_produto_id = v_produto.catalogo_produto_origem_id
      on conflict (conta_id, produto_id, termo_normalizado, origem) do update
        set termo = excluded.termo,
            confianca = excluded.confianca,
            modelo = excluded.modelo,
            entrada_hash = excluded.entrada_hash,
            atualizado_em = now();
    end if;
  end if;
end;
$$;

create or replace function public.vendas_mobile_reconstruir_busca_catalogo_produto(p_catalogo_produto_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produto public.vendas_mobile_catalogo_produtos;
  v_empresa_id uuid;
  v_hash text;
  v_conta_produto record;
begin
  select * into v_produto
  from public.vendas_mobile_catalogo_produtos
  where id = p_catalogo_produto_id;
  if v_produto.id is null then return; end if;
  select empresa_id into v_empresa_id
  from public.vendas_mobile_catalogos
  where id = v_produto.catalogo_id;
  if v_empresa_id is null then return; end if;
  v_hash := public.vendas_mobile_catalogo_busca_voz_hash(v_produto);

  delete from public.vendas_mobile_catalogo_produtos_busca_voz
   where catalogo_produto_id = v_produto.id and origem in ('automatico', 'ia');

  if coalesce(v_produto.ativo, true) and coalesce(v_produto.disponivel_catalogo, true) then
    insert into public.vendas_mobile_catalogo_produtos_busca_voz (
      catalogo_produto_id, termo, termo_normalizado, origem, confianca, entrada_hash
    )
    select v_produto.id, termo, termo_normalizado, 'automatico', 0.940, v_hash
    from public.vendas_mobile_termos_automaticos_produto(
      v_produto.nome, v_produto.marca, v_produto.categoria, v_produto.sku, v_produto.unidade
    )
    on conflict (catalogo_produto_id, termo_normalizado, origem) do update
      set termo = excluded.termo,
          confianca = excluded.confianca,
          entrada_hash = excluded.entrada_hash,
          atualizado_em = now();

    insert into public.vendas_mobile_catalogo_busca_voz_fila (
      catalogo_produto_id, empresa_id, entrada_hash, status, tentativas,
      ultimo_erro, processar_apos, atualizado_em
    ) values (
      v_produto.id, v_empresa_id, v_hash, 'pendente', 0, null, now(), now()
    ) on conflict (catalogo_produto_id) do update
      set empresa_id = excluded.empresa_id,
          entrada_hash = excluded.entrada_hash,
          status = 'pendente',
          tentativas = 0,
          ultimo_erro = null,
          processar_apos = now(),
          atualizado_em = now();
  else
    delete from public.vendas_mobile_catalogo_busca_voz_fila
     where catalogo_produto_id = v_produto.id;
  end if;

  for v_conta_produto in
    select id from public.vendas_mobile_produtos
    where catalogo_produto_origem_id = v_produto.id
  loop
    perform public.vendas_mobile_reconstruir_busca_produto_conta(v_conta_produto.id);
  end loop;
end;
$$;

create or replace function public.vendas_mobile_catalogo_busca_voz_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.vendas_mobile_reconstruir_busca_catalogo_produto(new.id);
  return new;
end;
$$;

create or replace function public.vendas_mobile_produto_busca_voz_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.vendas_mobile_reconstruir_busca_produto_conta(new.id);
  return new;
end;
$$;

drop trigger if exists vendas_mobile_catalogo_busca_voz_atualizar on public.vendas_mobile_catalogo_produtos;
create trigger vendas_mobile_catalogo_busca_voz_atualizar
after insert or update of sku, marca, categoria, nome, descricao, unidade, ativo, disponivel_catalogo
on public.vendas_mobile_catalogo_produtos
for each row execute function public.vendas_mobile_catalogo_busca_voz_trigger();

drop trigger if exists vendas_mobile_produto_busca_voz_atualizar on public.vendas_mobile_produtos;
create trigger vendas_mobile_produto_busca_voz_atualizar
after insert or update of sku, marca, categoria, nome, descricao, unidade, ativo, catalogo_produto_origem_id
on public.vendas_mobile_produtos
for each row execute function public.vendas_mobile_produto_busca_voz_trigger();

create or replace function public.vendas_mobile_salvar_aliases_catalogo_voz_rpc(
  p_catalogo_produto_id uuid,
  p_aliases jsonb,
  p_modelo text,
  p_entrada_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produto public.vendas_mobile_catalogo_produtos;
  v_hash_atual text;
  v_termo text;
  v_normalizado text;
  v_total integer := 0;
  v_conta_produto record;
begin
  select * into v_produto
  from public.vendas_mobile_catalogo_produtos
  where id = p_catalogo_produto_id;
  if v_produto.id is null then raise exception 'Produto de catálogo não encontrado.'; end if;
  if jsonb_typeof(coalesce(p_aliases, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_aliases, '[]'::jsonb)) > 16 then
    raise exception 'Aliases de catálogo inválidos.';
  end if;
  v_hash_atual := public.vendas_mobile_catalogo_busca_voz_hash(v_produto);

  if p_entrada_hash is distinct from v_hash_atual then
    update public.vendas_mobile_catalogo_busca_voz_fila
       set status = 'pendente', entrada_hash = v_hash_atual,
           processar_apos = now(), atualizado_em = now()
     where catalogo_produto_id = v_produto.id;
    return jsonb_build_object('atualizado', false, 'motivo', 'produto_alterado');
  end if;

  delete from public.vendas_mobile_catalogo_produtos_busca_voz
   where catalogo_produto_id = v_produto.id and origem = 'ia';

  for v_termo in
    select value from jsonb_array_elements_text(coalesce(p_aliases, '[]'::jsonb))
    limit 16
  loop
    v_termo := trim(left(v_termo, 160));
    v_normalizado := public.vendas_mobile_normalizar_busca_voz(v_termo);
    if char_length(v_normalizado) < 2 then continue; end if;
    insert into public.vendas_mobile_catalogo_produtos_busca_voz (
      catalogo_produto_id, termo, termo_normalizado, origem, confianca,
      modelo, entrada_hash, atualizado_em
    ) values (
      v_produto.id, v_termo, v_normalizado, 'ia', 0.900,
      nullif(left(trim(p_modelo), 100), ''), v_hash_atual, now()
    ) on conflict (catalogo_produto_id, termo_normalizado, origem) do update
      set termo = excluded.termo,
          confianca = excluded.confianca,
          modelo = excluded.modelo,
          entrada_hash = excluded.entrada_hash,
          atualizado_em = now();
    v_total := v_total + 1;
  end loop;

  update public.vendas_mobile_catalogo_busca_voz_fila
     set status = 'concluido', tentativas = tentativas + 1,
         ultimo_erro = null, atualizado_em = now()
   where catalogo_produto_id = v_produto.id;

  for v_conta_produto in
    select id from public.vendas_mobile_produtos
    where catalogo_produto_origem_id = v_produto.id
  loop
    perform public.vendas_mobile_reconstruir_busca_produto_conta(v_conta_produto.id);
  end loop;

  return jsonb_build_object('atualizado', true, 'aliases', v_total);
end;
$$;

create or replace function public.vendas_mobile_confirmar_aprendizado_busca_voz_rpc(
  p_conta_id uuid,
  p_operacao_id uuid,
  p_aprendizados jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_tipo text;
  v_id uuid;
  v_termo text;
  v_normalizado text;
  v_evento_id bigint;
  v_aprendidos integer := 0;
  v_limite_restante integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_operacao_id is null or not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;
  if not exists (
    select 1 from public.vendas_mobile_pedidos
     where id = p_operacao_id and conta_id = p_conta_id
    union all
    select 1 from public.vendas_mobile_pagamentos
     where id = p_operacao_id and conta_id = p_conta_id
    union all
    select 1 from public.vendas_mobile_agenda
     where id = p_operacao_id and conta_id = p_conta_id
  ) then
    raise exception 'O lançamento confirmado não foi localizado nesta conta.';
  end if;
  if jsonb_typeof(coalesce(p_aprendizados, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_aprendizados, '[]'::jsonb)) > 20 then
    raise exception 'Aprendizado de voz inválido.';
  end if;
  select greatest(0, 20 - count(*))::integer into v_limite_restante
    from public.vendas_mobile_busca_voz_aprendizados
   where conta_id = p_conta_id and operacao_id = p_operacao_id;
  if v_limite_restante = 0 then
    return jsonb_build_object('aprendidos', 0, 'motivo', 'limite_da_operacao');
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_aprendizados, '[]'::jsonb))
  loop
    exit when v_aprendidos >= v_limite_restante;
    v_tipo := trim(v_item ->> 'type');
    v_termo := trim(left(coalesce(v_item ->> 'reference', ''), 160));
    v_normalizado := public.vendas_mobile_normalizar_busca_voz(v_termo);
    begin v_id := (v_item ->> 'id')::uuid; exception when others then continue; end;
    if v_tipo not in ('product', 'customer') or char_length(v_normalizado) < 2 then continue; end if;

    if v_tipo = 'product' then
      if not exists (
        select 1 from public.vendas_mobile_produtos
        where id = v_id and conta_id = p_conta_id and ativo = true
      ) then continue; end if;
      insert into public.vendas_mobile_busca_voz_aprendizados (
        conta_id, operacao_id, tipo, produto_id, termo, termo_normalizado, confirmado_por
      ) values (
        p_conta_id, p_operacao_id, 'product', v_id, v_termo, v_normalizado, auth.uid()
      ) on conflict do nothing returning id into v_evento_id;
      if v_evento_id is not null then
        insert into public.vendas_mobile_produtos_busca_voz (
          conta_id, produto_id, termo, termo_normalizado, origem, confianca,
          confirmacoes, ultima_utilizacao_em, atualizado_em
        ) values (
          p_conta_id, v_id, v_termo, v_normalizado, 'aprendizado', 0.920,
          1, now(), now()
        ) on conflict (conta_id, produto_id, termo_normalizado, origem) do update
          set termo = excluded.termo,
              confirmacoes = public.vendas_mobile_produtos_busca_voz.confirmacoes + 1,
              confianca = least(0.995, public.vendas_mobile_produtos_busca_voz.confianca + 0.025),
              ultima_utilizacao_em = now(),
              atualizado_em = now();
        v_aprendidos := v_aprendidos + 1;
      end if;
    else
      if not exists (
        select 1 from public.vendas_mobile_clientes
        where id = v_id and conta_id = p_conta_id and ativo = true
      ) then continue; end if;
      insert into public.vendas_mobile_busca_voz_aprendizados (
        conta_id, operacao_id, tipo, cliente_id, termo, termo_normalizado, confirmado_por
      ) values (
        p_conta_id, p_operacao_id, 'customer', v_id, v_termo, v_normalizado, auth.uid()
      ) on conflict do nothing returning id into v_evento_id;
      if v_evento_id is not null then
        insert into public.vendas_mobile_clientes_busca_voz (
          conta_id, cliente_id, termo, termo_normalizado, confianca,
          confirmacoes, ultima_utilizacao_em, atualizado_em
        ) values (
          p_conta_id, v_id, v_termo, v_normalizado, 0.920, 1, now(), now()
        ) on conflict (conta_id, cliente_id, termo_normalizado) do update
          set termo = excluded.termo,
              confirmacoes = public.vendas_mobile_clientes_busca_voz.confirmacoes + 1,
              confianca = least(0.995, public.vendas_mobile_clientes_busca_voz.confianca + 0.025),
              ultima_utilizacao_em = now(),
              atualizado_em = now();
        v_aprendidos := v_aprendidos + 1;
      end if;
    end if;
    v_evento_id := null;
  end loop;

  return jsonb_build_object('aprendidos', v_aprendidos);
end;
$$;

revoke all on function public.vendas_mobile_salvar_aliases_catalogo_voz_rpc(uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.vendas_mobile_salvar_aliases_catalogo_voz_rpc(uuid, jsonb, text, text) to service_role;
revoke all on function public.vendas_mobile_confirmar_aprendizado_busca_voz_rpc(uuid, uuid, jsonb) from public, anon;
grant execute on function public.vendas_mobile_confirmar_aprendizado_busca_voz_rpc(uuid, uuid, jsonb) to authenticated;

-- As rotinas de reconstrução são acionadas apenas pelos gatilhos ou pelo
-- backend administrativo. Impedir execução direta evita que um usuário tente
-- reconstruir índices de outra conta conhecendo apenas o UUID de um produto.
revoke all on function public.vendas_mobile_reconstruir_busca_produto_conta(uuid) from public, anon, authenticated;
revoke all on function public.vendas_mobile_reconstruir_busca_catalogo_produto(uuid) from public, anon, authenticated;
revoke all on function public.vendas_mobile_catalogo_busca_voz_trigger() from public, anon, authenticated;
revoke all on function public.vendas_mobile_produto_busca_voz_trigger() from public, anon, authenticated;
grant execute on function public.vendas_mobile_reconstruir_busca_produto_conta(uuid) to service_role;
grant execute on function public.vendas_mobile_reconstruir_busca_catalogo_produto(uuid) to service_role;

do $$
declare
  v_produto record;
begin
  for v_produto in select id from public.vendas_mobile_catalogo_produtos loop
    perform public.vendas_mobile_reconstruir_busca_catalogo_produto(v_produto.id);
  end loop;
  for v_produto in select id from public.vendas_mobile_produtos loop
    perform public.vendas_mobile_reconstruir_busca_produto_conta(v_produto.id);
  end loop;
end $$;

commit;
