-- Snapshot completo e conexao comercial isolada por conta do AvantaVendas.
-- A autorizacao concedida pela empresa continua externa ao backup: uma
-- restauracao nunca reativa um acesso revogado pelo gestor.

create table if not exists public.vendas_mobile_contas_recursos (
  conta_id uuid primary key references public.vendas_mobile_contas(id) on delete cascade,
  novidades_ativas boolean not null default true,
  divulgacao_ativa boolean not null default true,
  catalogo_ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas_mobile_contas_preferencias (
  conta_id uuid primary key references public.vendas_mobile_contas(id) on delete cascade,
  versao integer not null default 1 check (versao >= 1),
  preferencias jsonb not null default '{}'::jsonb check (jsonb_typeof(preferencias) = 'object'),
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

insert into public.vendas_mobile_contas_recursos
  (conta_id, novidades_ativas, divulgacao_ativa, catalogo_ativo)
select
  c.id,
  coalesce(v.novidades_ativas, true),
  coalesce(v.divulgacao_ativa, true),
  coalesce(v.catalogo_ativo, true)
from public.vendas_mobile_contas c
left join public.vendas_mobile_vinculos_comerciais v
  on v.user_id = c.criado_por and v.empresa_id = c.empresa_id
on conflict (conta_id) do nothing;

insert into public.vendas_mobile_contas_preferencias
  (conta_id, versao, preferencias, atualizado_por, criado_em, atualizado_em)
select
  c.id,
  coalesce(p.versao, 1),
  coalesce(p.preferencias, '{}'::jsonb),
  c.criado_por,
  coalesce(p.criado_em, c.criado_em),
  coalesce(p.atualizado_em, c.atualizado_em)
from public.vendas_mobile_contas c
left join public.vendas_mobile_preferencias p on p.user_id = c.criado_por
on conflict (conta_id) do nothing;

create or replace function public.criar_recursos_conta_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.vendas_mobile_contas_recursos(conta_id)
  values (new.id)
  on conflict (conta_id) do nothing;
  insert into public.vendas_mobile_contas_preferencias(conta_id, atualizado_por)
  values (new.id, new.criado_por)
  on conflict (conta_id) do nothing;
  return new;
end;
$$;

drop trigger if exists vendas_mobile_contas_criar_recursos on public.vendas_mobile_contas;
create trigger vendas_mobile_contas_criar_recursos
  after insert on public.vendas_mobile_contas
  for each row execute function public.criar_recursos_conta_vendas_mobile();

alter table public.vendas_mobile_contas_recursos enable row level security;
alter table public.vendas_mobile_contas_preferencias enable row level security;
drop policy if exists vendas_mobile_contas_recursos_leitura on public.vendas_mobile_contas_recursos;
create policy vendas_mobile_contas_recursos_leitura
  on public.vendas_mobile_contas_recursos for select to authenticated
  using (public.vendas_mobile_pode_ler_conta(conta_id));
drop policy if exists vendas_mobile_contas_preferencias_leitura on public.vendas_mobile_contas_preferencias;
create policy vendas_mobile_contas_preferencias_leitura
  on public.vendas_mobile_contas_preferencias for select to authenticated
  using (public.vendas_mobile_pode_ler_conta(conta_id));
drop policy if exists vendas_mobile_contas_preferencias_gravar on public.vendas_mobile_contas_preferencias;
create policy vendas_mobile_contas_preferencias_gravar
  on public.vendas_mobile_contas_preferencias for all to authenticated
  using (public.vendas_mobile_pode_operar_conta(conta_id))
  with check (public.vendas_mobile_pode_operar_conta(conta_id) and atualizado_por = auth.uid());

alter table public.vendas_mobile_catalogo_recebimentos
  add column if not exists conta_id uuid references public.vendas_mobile_contas(id) on delete cascade;

update public.vendas_mobile_catalogo_recebimentos r
set conta_id = p.conta_id
from public.vendas_mobile_produtos p
where r.conta_id is null and r.produto_id = p.id and p.conta_id is not null;

alter table public.vendas_mobile_catalogo_recebimentos
  drop constraint if exists vendas_mobile_catalogo_recebimentos_user_id_catalogo_produto_id_key;
drop index if exists public.vendas_mobile_produtos_usuario_origem_catalogo_uidx;

delete from public.vendas_mobile_catalogo_recebimentos atual
using public.vendas_mobile_catalogo_recebimentos repetido
where atual.conta_id is not null
  and atual.conta_id = repetido.conta_id
  and atual.catalogo_produto_id = repetido.catalogo_produto_id
  and atual.id > repetido.id;

alter table public.vendas_mobile_catalogo_recebimentos
  drop constraint if exists vendas_mobile_catalogo_recebimentos_conta_produto_key;
alter table public.vendas_mobile_catalogo_recebimentos
  add constraint vendas_mobile_catalogo_recebimentos_conta_produto_key
  unique (conta_id, catalogo_produto_id);

create index if not exists vendas_mobile_produtos_conta_origem_catalogo_idx
  on public.vendas_mobile_produtos (conta_id, catalogo_produto_origem_id)
  where conta_id is not null and catalogo_produto_origem_id is not null;

create index if not exists vendas_mobile_catalogo_recebimentos_conta_idx
  on public.vendas_mobile_catalogo_recebimentos(conta_id, atualizado_em desc);

create or replace function public.registrar_remocao_catalogo_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('app.vendas_mobile_restaurando', true) = '1' then
    return old;
  end if;
  if old.catalogo_produto_origem_id is not null then
    update public.vendas_mobile_catalogo_recebimentos
       set status = 'removido', produto_id = null, atualizado_em = now()
     where conta_id = old.conta_id
       and catalogo_produto_id = old.catalogo_produto_origem_id;
  end if;
  return old;
end;
$$;

create or replace function public.meus_vinculos_comerciais_vendas_mobile_rpc(p_conta_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.vendas_mobile_pode_ler_conta(p_conta_id) then
    raise exception 'Conta de vendas invalida ou sem permissao.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'empresa_id', c.empresa_id,
      'empresa_nome', e.nome,
      'ativo', true,
      'novidades_ativas', r.novidades_ativas,
      'divulgacao_ativa', r.divulgacao_ativa,
      'catalogo_ativo', r.catalogo_ativo
    ))
    from public.vendas_mobile_contas c
    join public.empresas e on e.id = c.empresa_id
    join public.vendas_mobile_contas_recursos r on r.conta_id = c.id
    where c.id = p_conta_id
      and c.arquivada_em is null
      and (
        exists (
          select 1 from public.vendas_mobile_acessos a
          where a.user_id = v_user_id and a.empresa_id = c.empresa_id and a.status = 'ativo'
        )
        or exists (
          select 1 from public.usuarios_empresa u
          where u.user_id = v_user_id and u.empresa_id = c.empresa_id and u.status = 'ativo'
        )
      )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.atualizar_recurso_vinculo_comercial_vendas_mobile_rpc(
  p_conta_id uuid,
  p_empresa_id uuid,
  p_recurso text,
  p_ativo boolean,
  p_remover_catalogo boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.vendas_mobile_pode_gerir_conta(p_conta_id) then
    raise exception 'Sem permissao para configurar esta conta.';
  end if;
  if not exists (
    select 1 from public.vendas_mobile_contas
    where id = p_conta_id and empresa_id = p_empresa_id and arquivada_em is null
  ) then
    raise exception 'Vinculo comercial nao encontrado nesta conta.';
  end if;
  if p_recurso not in ('novidades', 'divulgacao', 'catalogo') then
    raise exception 'Recurso invalido.';
  end if;

  insert into public.vendas_mobile_contas_recursos(conta_id)
  values (p_conta_id)
  on conflict (conta_id) do nothing;

  update public.vendas_mobile_contas_recursos set
    novidades_ativas = case when p_recurso = 'novidades' then p_ativo else novidades_ativas end,
    divulgacao_ativa = case when p_recurso = 'divulgacao' then p_ativo else divulgacao_ativa end,
    catalogo_ativo = case when p_recurso = 'catalogo' then p_ativo else catalogo_ativo end,
    atualizado_em = now()
  where conta_id = p_conta_id;

  if p_recurso = 'catalogo' and not p_ativo and p_remover_catalogo then
    delete from public.vendas_mobile_produtos p
    where p.conta_id = p_conta_id
      and p.catalogo_empresa_id in (
        select id from public.vendas_mobile_catalogos where empresa_id = p_empresa_id
      );
  end if;

  return public.meus_vinculos_comerciais_vendas_mobile_rpc(p_conta_id);
end;
$$;

create or replace function public.sincronizar_catalogo_vendas_mobile_rpc(p_conta_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_empresa_id uuid;
  v_catalogo public.vendas_mobile_catalogos;
  v_produto public.vendas_mobile_catalogo_produtos;
  v_produto_conta_id uuid;
  v_adicionados integer := 0;
  v_ignorados integer := 0;
begin
  if v_user_id is null then raise exception 'Sessao expirada.'; end if;
  if not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas invalida ou sem permissao.';
  end if;

  select c.empresa_id into v_empresa_id
  from public.vendas_mobile_contas c
  join public.vendas_mobile_contas_recursos r on r.conta_id = c.id and r.catalogo_ativo
  where c.id = p_conta_id and c.arquivada_em is null;

  if v_empresa_id is null then
    return jsonb_build_object('adicionados', 0, 'ja_recebidos', 0);
  end if;
  if not (
    exists (select 1 from public.vendas_mobile_acessos a where a.user_id = v_user_id and a.empresa_id = v_empresa_id and a.status = 'ativo')
    or exists (select 1 from public.usuarios_empresa u where u.user_id = v_user_id and u.empresa_id = v_empresa_id and u.status = 'ativo')
  ) then
    raise exception 'Seu acesso a empresa vinculada nao esta ativo.';
  end if;

  for v_catalogo in
    select c.* from public.vendas_mobile_catalogos c
    join public.empresa_modulos m
      on m.empresa_id = c.empresa_id and m.modulo_id = 'vendas_mobile' and m.ativo = true
    where c.empresa_id = v_empresa_id and c.ativo = true
  loop
    for v_produto in
      select * from public.vendas_mobile_catalogo_produtos
      where catalogo_id = v_catalogo.id and ativo = true
    loop
      if exists (
        select 1 from public.vendas_mobile_produtos p
        where p.conta_id = p_conta_id and p.catalogo_produto_origem_id = v_produto.id
      ) then
        v_ignorados := v_ignorados + 1;
        continue;
      end if;

      insert into public.vendas_mobile_produtos (
        user_id, conta_id, marca, categoria, sku, nome, descricao, preco, preco_custo,
        estoque, unidade, imagem_url, metadados, ativo, catalogo_empresa_id,
        catalogo_produto_origem_id, estoque_controlado
      ) values (
        v_user_id, p_conta_id, v_produto.marca, v_produto.categoria, v_produto.sku,
        v_produto.nome, v_produto.descricao, v_produto.preco_venda, v_produto.preco_custo,
        null, v_produto.unidade, v_produto.imagem_url,
        jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', v_catalogo.id, 'produto_id', v_produto.id)),
        true, v_catalogo.id, v_produto.id, false
      ) returning id into v_produto_conta_id;

      insert into public.vendas_mobile_catalogo_recebimentos
        (user_id, conta_id, catalogo_produto_id, produto_id, status, recebido_em, atualizado_em)
      values
        (v_user_id, p_conta_id, v_produto.id, v_produto_conta_id, 'recebido', now(), now())
      on conflict (conta_id, catalogo_produto_id) do update
        set user_id = excluded.user_id,
            produto_id = excluded.produto_id,
            status = 'recebido',
            atualizado_em = now();

      v_adicionados := v_adicionados + 1;
    end loop;
  end loop;

  return jsonb_build_object('adicionados', v_adicionados, 'ja_recebidos', v_ignorados);
end;
$$;

create or replace function public.exportar_snapshot_conta_vendas_mobile(p_conta_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_conta public.vendas_mobile_contas%rowtype;
begin
  select * into v_conta
  from public.vendas_mobile_contas
  where id = p_conta_id and arquivada_em is null;

  if v_conta.id is null then raise exception 'Conta de vendas nao encontrada.'; end if;

  return jsonb_build_object(
    'produto', 'AvantaVendas',
    'schema_versao', 2,
    'gerado_em', now(),
    'conta_origem', jsonb_build_object('id', v_conta.id, 'nome', v_conta.nome),
    'dados', jsonb_build_object(
      'conta', to_jsonb(v_conta),
      'conta_usuarios', coalesce((
        select jsonb_agg(to_jsonb(t) order by (t.papel = 'proprietario') desc, t.criado_em, t.user_id)
        from public.vendas_mobile_contas_usuarios t where t.conta_id = p_conta_id
      ), '[]'::jsonb),
      'recursos_conta', coalesce((
        select to_jsonb(t) from public.vendas_mobile_contas_recursos t where t.conta_id = p_conta_id
      ), jsonb_build_object('conta_id', p_conta_id, 'novidades_ativas', true, 'divulgacao_ativa', true, 'catalogo_ativo', true)),
      'preferencias_conta', coalesce((
        select to_jsonb(t) from public.vendas_mobile_contas_preferencias t where t.conta_id = p_conta_id
      ), jsonb_build_object('conta_id', p_conta_id, 'versao', 1, 'preferencias', '{}'::jsonb)),
      'catalogo_recebimentos', coalesce((
        select jsonb_agg(to_jsonb(t) order by t.recebido_em, t.id)
        from public.vendas_mobile_catalogo_recebimentos t where t.conta_id = p_conta_id
      ), '[]'::jsonb),
      'clientes', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_clientes t where t.conta_id = p_conta_id), '[]'::jsonb),
      'produtos', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_produtos t where t.conta_id = p_conta_id), '[]'::jsonb),
      'pedidos', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_pedidos t where t.conta_id = p_conta_id), '[]'::jsonb),
      'pedido_itens', coalesce((
        select jsonb_agg(to_jsonb(i) order by i.criado_em, i.id)
        from public.vendas_mobile_pedido_itens i
        join public.vendas_mobile_pedidos p on p.id = i.pedido_id
        where p.conta_id = p_conta_id
      ), '[]'::jsonb),
      'pagamentos', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_pagamentos t where t.conta_id = p_conta_id), '[]'::jsonb),
      'agenda', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_agenda t where t.conta_id = p_conta_id), '[]'::jsonb),
      'estoque_movimentos', coalesce((
        select jsonb_agg(to_jsonb(m) order by m.criado_em, m.id)
        from public.vendas_mobile_estoque_movimentos m
        join public.vendas_mobile_produtos p on p.id = m.produto_id
        where p.conta_id = p_conta_id
      ), '[]'::jsonb)
    )
  );
end;
$$;

alter table public.vendas_mobile_pontos_restauracao
  alter column schema_versao set default 2;

create or replace function public.criar_ponto_restauracao_vendas_mobile(
  p_conta_id uuid,
  p_origem text default 'manual',
  p_criado_por uuid default null,
  p_nome text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_id uuid;
  v_papel text;
begin
  if p_origem not in ('manual', 'automatico_diario', 'pre_restauracao', 'pre_reset') then raise exception 'Origem do ponto de restauracao invalida.'; end if;
  if p_criado_por is not null then
    v_papel := public.vendas_mobile_papel_usuario_conta(p_conta_id, p_criado_por);
    if v_papel not in ('proprietario', 'administrador') then raise exception 'Sem permissao para criar um ponto desta conta.'; end if;
  elsif p_origem <> 'automatico_diario' then
    raise exception 'Responsavel pelo ponto de restauracao nao informado.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('av-vendas:' || p_conta_id::text, 0));
  v_snapshot := public.exportar_snapshot_conta_vendas_mobile(p_conta_id);

  insert into public.vendas_mobile_pontos_restauracao
    (conta_id, nome, origem, schema_versao, snapshot, tamanho_bytes, criado_por)
  values
    (p_conta_id, nullif(trim(coalesce(p_nome, '')), ''), p_origem, 2, v_snapshot, pg_column_size(v_snapshot), p_criado_por)
  returning id into v_id;

  if p_origem = 'automatico_diario' then
    insert into public.vendas_mobile_pontos_restauracao_estado(conta_id, alterado_em, ultimo_diario_em)
    values (p_conta_id, now(), now())
    on conflict (conta_id) do update set ultimo_diario_em = excluded.ultimo_diario_em;
  end if;

  delete from public.vendas_mobile_pontos_restauracao p
  where p.conta_id = p_conta_id and p.origem = 'manual'
    and p.id not in (
      select id from public.vendas_mobile_pontos_restauracao
      where conta_id = p_conta_id and origem = 'manual'
      order by criado_em desc limit 10
    );

  delete from public.vendas_mobile_pontos_restauracao
  where conta_id = p_conta_id and (
    (origem = 'automatico_diario' and criado_em < now() - interval '30 days')
    or (origem in ('pre_restauracao', 'pre_reset') and criado_em < now() - interval '90 days')
  );
  return v_id;
end;
$$;

create or replace function public.restaurar_snapshot_conta_vendas_mobile(
  p_conta_id uuid,
  p_snapshot jsonb,
  p_criado_por uuid,
  p_ponto_origem_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ponto_seguranca uuid;
  v_dados jsonb;
  v_schema integer;
  v_empresa_id uuid;
  v_nome text;
  v_produtos_restaurar jsonb;
begin
  if public.vendas_mobile_papel_usuario_conta(p_conta_id, p_criado_por) <> 'proprietario' then
    raise exception 'Somente o proprietario pode restaurar esta conta.';
  end if;
  v_schema := coalesce((p_snapshot ->> 'schema_versao')::integer, 0);
  if v_schema not in (1, 2) then raise exception 'Versao de backup incompativel.'; end if;
  if nullif(p_snapshot #>> '{conta_origem,id}', '')::uuid is distinct from p_conta_id then
    raise exception 'Este backup pertence a outra conta de vendas.';
  end if;
  if jsonb_typeof(p_snapshot -> 'dados') <> 'object' then raise exception 'Arquivo de backup invalido.'; end if;

  v_dados := p_snapshot -> 'dados';
  if exists (
    select 1
    from unnest(array['clientes','produtos','pedidos','pagamentos','agenda']) chave
    cross join lateral jsonb_array_elements(coalesce(v_dados -> chave, '[]'::jsonb)) registro
    where nullif(registro ->> 'conta_id', '')::uuid is distinct from p_conta_id
  ) then raise exception 'O backup contem registros de outra conta de vendas.'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(v_dados -> 'pedido_itens', '[]'::jsonb)) item
    where not exists (
      select 1 from jsonb_array_elements(coalesce(v_dados -> 'pedidos', '[]'::jsonb)) pedido
      where pedido ->> 'id' = item ->> 'pedido_id'
    )
  ) then raise exception 'O backup contem itens sem pedido valido.'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(v_dados -> 'estoque_movimentos', '[]'::jsonb)) movimento
    where not exists (
      select 1 from jsonb_array_elements(coalesce(v_dados -> 'produtos', '[]'::jsonb)) produto
      where produto ->> 'id' = movimento ->> 'produto_id'
    )
  ) then raise exception 'O backup contem movimentos sem produto valido.'; end if;

  if v_schema = 2 then
    if nullif(v_dados #>> '{conta,id}', '')::uuid is distinct from p_conta_id then raise exception 'Perfil do backup invalido.'; end if;
    if exists (
      select 1 from jsonb_array_elements(coalesce(v_dados -> 'conta_usuarios', '[]'::jsonb)) membro
      where nullif(membro ->> 'conta_id', '')::uuid is distinct from p_conta_id
    ) then raise exception 'O backup contem usuarios de outra conta.'; end if;
    if exists (
      select 1 from jsonb_array_elements(coalesce(v_dados -> 'catalogo_recebimentos', '[]'::jsonb)) recebimento
      where nullif(recebimento ->> 'conta_id', '')::uuid is distinct from p_conta_id
    ) then raise exception 'O backup contem vinculos de catalogo de outra conta.'; end if;

    v_empresa_id := nullif(v_dados #>> '{conta,empresa_id}', '')::uuid;
    if v_empresa_id is not null and not (
      exists (select 1 from public.vendas_mobile_acessos a where a.user_id = p_criado_por and a.empresa_id = v_empresa_id and a.status = 'ativo')
      or exists (select 1 from public.usuarios_empresa u where u.user_id = p_criado_por and u.empresa_id = v_empresa_id and u.status = 'ativo')
    ) then
      raise exception 'A empresa deste backup revogou o acesso. Solicite nova aprovacao antes de restaurar este vinculo.';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('av-vendas:' || p_conta_id::text, 0));
  v_ponto_seguranca := public.criar_ponto_restauracao_vendas_mobile(p_conta_id, 'pre_restauracao', p_criado_por, 'Antes da restauracao');
  perform set_config('app.vendas_mobile_transferencia', '1', true);
  perform set_config('app.vendas_mobile_restaurando', '1', true);

  -- O produto copiado e preservado mesmo se o catalogo mestre ou um pacote
  -- legado tiver sido excluido depois do backup. Nesse caso ele volta como
  -- produto independente, sem uma chave estrangeira quebrada.
  select coalesce(jsonb_agg(
    case
      when nullif(produto_catalogo ->> 'pacote_origem_id', '')::uuid is not null
        and not exists (
          select 1 from public.vendas_mobile_pacotes p
          where p.id = nullif(produto_catalogo ->> 'pacote_origem_id', '')::uuid
        )
      then jsonb_set(produto_catalogo, '{pacote_origem_id}', 'null'::jsonb)
      else produto_catalogo
    end
  ), '[]'::jsonb)
  into v_produtos_restaurar
  from (
    select case
      when nullif(produto ->> 'catalogo_produto_origem_id', '')::uuid is not null
        and not exists (
          select 1 from public.vendas_mobile_catalogo_produtos cp
          where cp.id = nullif(produto ->> 'catalogo_produto_origem_id', '')::uuid
        )
      then jsonb_set(
        jsonb_set(produto, '{catalogo_produto_origem_id}', 'null'::jsonb),
        '{catalogo_empresa_id}', 'null'::jsonb
      )
      when nullif(produto ->> 'catalogo_empresa_id', '')::uuid is not null
        and not exists (
          select 1 from public.vendas_mobile_catalogos c
          where c.id = nullif(produto ->> 'catalogo_empresa_id', '')::uuid
        )
      then jsonb_set(produto, '{catalogo_empresa_id}', 'null'::jsonb)
      else produto
    end as produto_catalogo
    from jsonb_array_elements(coalesce(v_dados -> 'produtos', '[]'::jsonb)) produto
  ) produtos_normalizados;

  delete from public.vendas_mobile_catalogo_recebimentos where conta_id = p_conta_id;
  delete from public.vendas_mobile_pagamentos where conta_id = p_conta_id;
  delete from public.vendas_mobile_pedido_itens i using public.vendas_mobile_pedidos p
    where i.pedido_id = p.id and p.conta_id = p_conta_id;
  delete from public.vendas_mobile_pedidos where conta_id = p_conta_id;
  delete from public.vendas_mobile_agenda where conta_id = p_conta_id;
  delete from public.vendas_mobile_estoque_movimentos m using public.vendas_mobile_produtos p
    where m.produto_id = p.id and p.conta_id = p_conta_id;
  delete from public.vendas_mobile_produtos where conta_id = p_conta_id;
  delete from public.vendas_mobile_clientes where conta_id = p_conta_id;

  insert into public.vendas_mobile_clientes
    select * from jsonb_populate_recordset(null::public.vendas_mobile_clientes, coalesce(v_dados -> 'clientes', '[]'::jsonb));
  insert into public.vendas_mobile_produtos
    select * from jsonb_populate_recordset(null::public.vendas_mobile_produtos, v_produtos_restaurar);
  insert into public.vendas_mobile_pedidos
    select * from jsonb_populate_recordset(null::public.vendas_mobile_pedidos, coalesce(v_dados -> 'pedidos', '[]'::jsonb));
  insert into public.vendas_mobile_pedido_itens
    select * from jsonb_populate_recordset(null::public.vendas_mobile_pedido_itens, coalesce(v_dados -> 'pedido_itens', '[]'::jsonb));
  insert into public.vendas_mobile_pagamentos
    select * from jsonb_populate_recordset(null::public.vendas_mobile_pagamentos, coalesce(v_dados -> 'pagamentos', '[]'::jsonb));
  insert into public.vendas_mobile_agenda
    select * from jsonb_populate_recordset(null::public.vendas_mobile_agenda, coalesce(v_dados -> 'agenda', '[]'::jsonb));
  insert into public.vendas_mobile_estoque_movimentos
    select * from jsonb_populate_recordset(null::public.vendas_mobile_estoque_movimentos, coalesce(v_dados -> 'estoque_movimentos', '[]'::jsonb));

  if v_schema = 2 then
    insert into public.vendas_mobile_catalogo_recebimentos
    select r.*
    from jsonb_populate_recordset(
      null::public.vendas_mobile_catalogo_recebimentos,
      coalesce(v_dados -> 'catalogo_recebimentos', '[]'::jsonb)
    ) r
    where r.conta_id = p_conta_id
      and exists (select 1 from auth.users u where u.id = r.user_id)
      and exists (select 1 from public.vendas_mobile_catalogo_produtos cp where cp.id = r.catalogo_produto_id)
      and (r.produto_id is null or exists (select 1 from public.vendas_mobile_produtos p where p.id = r.produto_id and p.conta_id = p_conta_id));

    v_nome := trim(coalesce(v_dados #>> '{conta,nome}', ''));
    if length(v_nome) < 2 then raise exception 'Nome do perfil no backup e invalido.'; end if;
    update public.vendas_mobile_contas
    set nome = v_nome, empresa_id = v_empresa_id, atualizado_em = now()
    where id = p_conta_id;

    insert into public.vendas_mobile_contas_recursos
      (conta_id, novidades_ativas, divulgacao_ativa, catalogo_ativo, criado_em, atualizado_em)
    select
      p_conta_id,
      coalesce(r.novidades_ativas, true),
      coalesce(r.divulgacao_ativa, true),
      coalesce(r.catalogo_ativo, true),
      coalesce(r.criado_em, now()),
      now()
    from jsonb_populate_record(
      null::public.vendas_mobile_contas_recursos,
      coalesce(v_dados -> 'recursos_conta', '{}'::jsonb)
    ) r
    on conflict (conta_id) do update set
      novidades_ativas = excluded.novidades_ativas,
      divulgacao_ativa = excluded.divulgacao_ativa,
      catalogo_ativo = excluded.catalogo_ativo,
      atualizado_em = now();

    insert into public.vendas_mobile_contas_preferencias
      (conta_id, versao, preferencias, atualizado_por, criado_em, atualizado_em)
    select
      p_conta_id,
      greatest(1, coalesce(p.versao, 1)),
      coalesce(p.preferencias, '{}'::jsonb),
      p_criado_por,
      coalesce(p.criado_em, now()),
      now()
    from jsonb_populate_record(
      null::public.vendas_mobile_contas_preferencias,
      coalesce(v_dados -> 'preferencias_conta', '{}'::jsonb)
    ) p
    on conflict (conta_id) do update set
      versao = excluded.versao,
      preferencias = excluded.preferencias,
      atualizado_por = excluded.atualizado_por,
      atualizado_em = now();

    delete from public.vendas_mobile_contas_usuarios
    where conta_id = p_conta_id and user_id <> p_criado_por;

    insert into public.vendas_mobile_contas_usuarios
      (conta_id, user_id, papel, status, convidado_por, criado_em, atualizado_em)
    select
      p_conta_id,
      m.user_id,
      case when m.user_id = p_criado_por then 'proprietario' else m.papel end,
      case when m.user_id = p_criado_por then 'ativo' else m.status end,
      m.convidado_por,
      m.criado_em,
      m.atualizado_em
    from jsonb_populate_recordset(
      null::public.vendas_mobile_contas_usuarios,
      coalesce(v_dados -> 'conta_usuarios', '[]'::jsonb)
    ) m
    where m.conta_id = p_conta_id and exists (select 1 from auth.users u where u.id = m.user_id)
    on conflict (conta_id, user_id) do update set
      papel = excluded.papel,
      status = excluded.status,
      convidado_por = excluded.convidado_por,
      atualizado_em = excluded.atualizado_em;

    insert into public.vendas_mobile_contas_usuarios(conta_id, user_id, papel, status)
    values (p_conta_id, p_criado_por, 'proprietario', 'ativo')
    on conflict (conta_id, user_id) do update set papel = 'proprietario', status = 'ativo', atualizado_em = now();
  end if;

  insert into public.vendas_mobile_restauracoes_auditoria
    (conta_id, ponto_origem_id, ponto_seguranca_id, executado_por, modo)
  values (p_conta_id, p_ponto_origem_id, v_ponto_seguranca, p_criado_por, 'substituir');

  insert into public.vendas_mobile_pontos_restauracao_estado(conta_id, alterado_em)
  values (p_conta_id, now())
  on conflict (conta_id) do update set alterado_em = excluded.alterado_em;
  return v_ponto_seguranca;
end;
$$;

create or replace function public.marcar_ponto_restauracao_conta_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conta_id uuid;
begin
  if current_setting('app.vendas_mobile_restaurando', true) = '1' then return coalesce(new, old); end if;
  v_conta_id := case when tg_op = 'DELETE' then old.id else new.id end;
  if v_conta_id is not null then
    insert into public.vendas_mobile_pontos_restauracao_estado(conta_id, alterado_em)
    values (v_conta_id, now())
    on conflict (conta_id) do update set alterado_em = excluded.alterado_em;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists vendas_mobile_contas_marcar_restauracao on public.vendas_mobile_contas;
create trigger vendas_mobile_contas_marcar_restauracao
  after update on public.vendas_mobile_contas
  for each row execute function public.marcar_ponto_restauracao_conta_vendas_mobile();

do $$
declare t text;
begin
  foreach t in array array['vendas_mobile_contas_usuarios','vendas_mobile_contas_recursos','vendas_mobile_contas_preferencias','vendas_mobile_catalogo_recebimentos'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_marcar_restauracao', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.marcar_ponto_restauracao_vendas_mobile()', t || '_marcar_restauracao', t);
  end loop;
end $$;

revoke all on function public.meus_vinculos_comerciais_vendas_mobile_rpc(uuid) from public, anon;
revoke all on function public.atualizar_recurso_vinculo_comercial_vendas_mobile_rpc(uuid,uuid,text,boolean,boolean) from public, anon;
revoke all on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) from public, anon;
grant execute on function public.meus_vinculos_comerciais_vendas_mobile_rpc(uuid) to authenticated;
grant execute on function public.atualizar_recurso_vinculo_comercial_vendas_mobile_rpc(uuid,uuid,text,boolean,boolean) to authenticated;
grant execute on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) to authenticated;
revoke all on function public.exportar_snapshot_conta_vendas_mobile(uuid) from public, anon, authenticated;
revoke all on function public.criar_ponto_restauracao_vendas_mobile(uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.restaurar_snapshot_conta_vendas_mobile(uuid,jsonb,uuid,uuid) from public, anon, authenticated;
grant execute on function public.exportar_snapshot_conta_vendas_mobile(uuid) to service_role;
grant execute on function public.criar_ponto_restauracao_vendas_mobile(uuid,text,uuid,text) to service_role;
grant execute on function public.restaurar_snapshot_conta_vendas_mobile(uuid,jsonb,uuid,uuid) to service_role;
