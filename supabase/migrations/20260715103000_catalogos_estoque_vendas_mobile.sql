-- Catálogo mestre por empresa, cópias pessoais para vendedores e estoque opcional.

create table if not exists public.vendas_mobile_catalogos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null default 'Catálogo principal',
  codigo text not null,
  versao integer not null default 1 check (versao > 0),
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.vendas_mobile_catalogo_produtos (
  id uuid primary key default gen_random_uuid(),
  catalogo_id uuid not null references public.vendas_mobile_catalogos(id) on delete cascade,
  sku text,
  codigo_barras text,
  marca text,
  categoria text,
  nome text not null,
  descricao text,
  preco_custo numeric(12,2) not null check (preco_custo >= 0),
  preco_venda numeric(12,2) not null check (preco_venda > 0),
  unidade text not null default 'un',
  imagem_url text,
  imagem_path text,
  ativo boolean not null default true,
  ncm text,
  cest text,
  origem_mercadoria text,
  unidade_tributavel text,
  peso_liquido numeric(12,3),
  peso_bruto numeric(12,3),
  altura numeric(12,3),
  largura numeric(12,3),
  comprimento numeric(12,3),
  cst text,
  csosn text,
  aliquota_icms numeric(7,4),
  aliquota_ipi numeric(7,4),
  aliquota_pis numeric(7,4),
  aliquota_cofins numeric(7,4),
  observacoes_fiscais text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (catalogo_id, sku)
);

create index if not exists vendas_mobile_catalogos_empresa_idx
  on public.vendas_mobile_catalogos (empresa_id, ativo, atualizado_em desc);
create index if not exists vendas_mobile_catalogo_produtos_catalogo_idx
  on public.vendas_mobile_catalogo_produtos (catalogo_id, ativo, nome);

alter table public.vendas_mobile_produtos
  add column if not exists catalogo_empresa_id uuid references public.vendas_mobile_catalogos(id) on delete set null,
  add column if not exists catalogo_produto_origem_id uuid references public.vendas_mobile_catalogo_produtos(id) on delete set null,
  add column if not exists estoque_controlado boolean not null default false;

create unique index if not exists vendas_mobile_produtos_usuario_origem_catalogo_uidx
  on public.vendas_mobile_produtos (user_id, catalogo_produto_origem_id)
  where catalogo_produto_origem_id is not null;

create table if not exists public.vendas_mobile_catalogo_recebimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalogo_produto_id uuid not null references public.vendas_mobile_catalogo_produtos(id) on delete cascade,
  produto_id uuid references public.vendas_mobile_produtos(id) on delete set null,
  status text not null default 'recebido' check (status in ('recebido', 'removido')),
  recebido_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, catalogo_produto_id)
);

create table if not exists public.vendas_mobile_estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  produto_id uuid not null references public.vendas_mobile_produtos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'ajuste', 'venda', 'cancelamento', 'consignacao', 'retorno_consignacao')),
  quantidade numeric(12,3) not null,
  saldo_anterior numeric(12,3) not null,
  saldo_final numeric(12,3) not null,
  observacao text,
  criado_em timestamptz not null default now()
);

create index if not exists vendas_mobile_estoque_movimentos_produto_idx
  on public.vendas_mobile_estoque_movimentos (produto_id, criado_em desc);

create or replace function public.registrar_remocao_catalogo_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.catalogo_produto_origem_id is not null then
    update public.vendas_mobile_catalogo_recebimentos
       set status = 'removido', produto_id = null, atualizado_em = now()
     where user_id = old.user_id and catalogo_produto_id = old.catalogo_produto_origem_id;
  end if;
  return old;
end;
$$;

drop trigger if exists vendas_mobile_produto_removido_catalogo_trigger on public.vendas_mobile_produtos;
create trigger vendas_mobile_produto_removido_catalogo_trigger
after delete on public.vendas_mobile_produtos
for each row execute function public.registrar_remocao_catalogo_vendas_mobile();

alter table public.vendas_mobile_catalogos enable row level security;
alter table public.vendas_mobile_catalogo_produtos enable row level security;
alter table public.vendas_mobile_catalogo_recebimentos enable row level security;
alter table public.vendas_mobile_estoque_movimentos enable row level security;

create or replace function public.vendas_mobile_pode_gerir_catalogo(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.usuarios_empresa ue
    join public.empresa_modulos m on m.empresa_id = ue.empresa_id and m.modulo_id = 'vendas_mobile' and m.ativo = true
    where ue.empresa_id = p_empresa_id
      and ue.user_id = auth.uid()
      and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  );
$$;

revoke all on function public.vendas_mobile_pode_gerir_catalogo(uuid) from public;
grant execute on function public.vendas_mobile_pode_gerir_catalogo(uuid) to authenticated;

create policy vendas_catalogos_leitura on public.vendas_mobile_catalogos for select to authenticated
  using (
    public.vendas_mobile_pode_gerir_catalogo(empresa_id)
    or exists (select 1 from public.vendas_mobile_acessos a where a.empresa_id = vendas_mobile_catalogos.empresa_id and a.user_id = auth.uid() and a.status = 'ativo')
  );
create policy vendas_catalogos_gestao on public.vendas_mobile_catalogos for all to authenticated
  using (public.vendas_mobile_pode_gerir_catalogo(empresa_id))
  with check (public.vendas_mobile_pode_gerir_catalogo(empresa_id));

create policy vendas_catalogo_produtos_leitura on public.vendas_mobile_catalogo_produtos for select to authenticated
  using (exists (select 1 from public.vendas_mobile_catalogos c where c.id = catalogo_id and (
    public.vendas_mobile_pode_gerir_catalogo(c.empresa_id)
    or exists (select 1 from public.vendas_mobile_acessos a where a.empresa_id = c.empresa_id and a.user_id = auth.uid() and a.status = 'ativo')
  )));
create policy vendas_catalogo_produtos_gestao on public.vendas_mobile_catalogo_produtos for all to authenticated
  using (exists (select 1 from public.vendas_mobile_catalogos c where c.id = catalogo_id and public.vendas_mobile_pode_gerir_catalogo(c.empresa_id)))
  with check (exists (select 1 from public.vendas_mobile_catalogos c where c.id = catalogo_id and public.vendas_mobile_pode_gerir_catalogo(c.empresa_id)));

create policy vendas_catalogo_recebimentos_proprios on public.vendas_mobile_catalogo_recebimentos for select to authenticated
  using (user_id = auth.uid());
create policy vendas_estoque_movimentos_proprios on public.vendas_mobile_estoque_movimentos for select to authenticated
  using (user_id = auth.uid());

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
    join public.vendas_mobile_acessos a on a.empresa_id = c.empresa_id and a.user_id = auth.uid() and a.status = 'ativo'
    join public.empresa_modulos m on m.empresa_id = c.empresa_id and m.modulo_id = 'vendas_mobile' and m.ativo = true
    where c.ativo = true
  loop
    for v_produto in select * from public.vendas_mobile_catalogo_produtos where catalogo_id = v_catalogo.id and ativo = true loop
      if exists (select 1 from public.vendas_mobile_catalogo_recebimentos r where r.user_id = auth.uid() and r.catalogo_produto_id = v_produto.id) then
        v_ignorados := v_ignorados + 1;
        continue;
      end if;
      insert into public.vendas_mobile_produtos (
        user_id, marca, categoria, sku, nome, descricao, preco, preco_custo, estoque, unidade, imagem_url,
        metadados, ativo, catalogo_empresa_id, catalogo_produto_origem_id, estoque_controlado
      ) values (
        auth.uid(), v_produto.marca, v_produto.categoria, v_produto.sku, v_produto.nome, v_produto.descricao,
        v_produto.preco_venda, v_produto.preco_custo, null, v_produto.unidade, v_produto.imagem_url,
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

create or replace function public.movimentar_estoque_vendas_mobile_rpc(
  p_produto_id uuid, p_tipo text, p_quantidade numeric, p_observacao text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_produto public.vendas_mobile_produtos;
  v_anterior numeric(12,3);
  v_final numeric(12,3);
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  select * into v_produto from public.vendas_mobile_produtos where id = p_produto_id and user_id = auth.uid() for update;
  if v_produto.id is null then raise exception 'Produto não encontrado.'; end if;
  if not v_produto.estoque_controlado then raise exception 'Ative o controle de estoque deste produto antes de movimentá-lo.'; end if;
  v_anterior := coalesce(v_produto.estoque, 0);
  if p_tipo = 'entrada' then
    if coalesce(p_quantidade, 0) <= 0 then raise exception 'Informe uma entrada maior que zero.'; end if;
    v_final := v_anterior + p_quantidade;
  elsif p_tipo = 'ajuste' then
    if p_quantidade is null or p_quantidade < 0 then raise exception 'Informe o saldo final do ajuste.'; end if;
    v_final := p_quantidade;
  else
    raise exception 'Movimentação de estoque inválida.';
  end if;
  update public.vendas_mobile_produtos set estoque = v_final, atualizado_em = now() where id = v_produto.id;
  insert into public.vendas_mobile_estoque_movimentos (user_id, produto_id, tipo, quantidade, saldo_anterior, saldo_final, observacao)
  values (auth.uid(), v_produto.id, p_tipo, case when p_tipo = 'ajuste' then v_final - v_anterior else p_quantidade end, v_anterior, v_final, nullif(trim(p_observacao), ''));
  return jsonb_build_object('produto_id', v_produto.id, 'saldo_anterior', v_anterior, 'saldo_final', v_final, 'tipo', p_tipo);
end;
$$;

revoke all on function public.sincronizar_catalogo_vendas_mobile_rpc() from public;
revoke all on function public.movimentar_estoque_vendas_mobile_rpc(uuid, text, numeric, text) from public;
grant execute on function public.sincronizar_catalogo_vendas_mobile_rpc() to authenticated;
grant execute on function public.movimentar_estoque_vendas_mobile_rpc(uuid, text, numeric, text) to authenticated;

-- Imagens do catálogo mestre ficam em uma pasta compartilhada por empresa.
drop policy if exists vendas_catalogo_imagens_gestao on storage.objects;
create policy vendas_catalogo_imagens_gestao on storage.objects for all to authenticated
using (
  bucket_id = 'vendas-produtos'
  and (storage.foldername(name))[1] = 'catalogos'
  and exists (
    select 1 from public.usuarios_empresa ue
    join public.empresa_modulos m on m.empresa_id = ue.empresa_id and m.modulo_id = 'vendas_mobile' and m.ativo = true
    where ue.empresa_id::text = (storage.foldername(name))[2]
      and ue.user_id = auth.uid() and ue.status = 'ativo' and ue.perfil in ('gestor_master', 'administrador')
  )
)
with check (
  bucket_id = 'vendas-produtos'
  and (storage.foldername(name))[1] = 'catalogos'
  and exists (
    select 1 from public.usuarios_empresa ue
    join public.empresa_modulos m on m.empresa_id = ue.empresa_id and m.modulo_id = 'vendas_mobile' and m.ativo = true
    where ue.empresa_id::text = (storage.foldername(name))[2]
      and ue.user_id = auth.uid() and ue.status = 'ativo' and ue.perfil in ('gestor_master', 'administrador')
  )
);
