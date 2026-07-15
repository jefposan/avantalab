-- Um vendedor utiliza somente um vínculo comercial ativo. Os demais ficam no
-- histórico, com catálogo, novidades e divulgação administrados separadamente.

create table if not exists public.vendas_mobile_vinculos_comerciais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ativo boolean not null default false,
  novidades_ativas boolean not null default true,
  divulgacao_ativa boolean not null default true,
  catalogo_ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, empresa_id)
);

create unique index if not exists vendas_vinculo_comercial_unico_ativo
  on public.vendas_mobile_vinculos_comerciais(user_id) where ativo;

-- Mantém o acesso comercial já existente como ponto de partida.
insert into public.vendas_mobile_vinculos_comerciais (user_id, empresa_id, ativo)
select distinct on (a.user_id) a.user_id, a.empresa_id, true
from public.vendas_mobile_acessos a
where a.status = 'ativo'
order by a.user_id, a.aprovado_em desc
on conflict (user_id, empresa_id) do update set ativo = excluded.ativo, atualizado_em = now();

create or replace function public.ativar_vinculo_comercial_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'ativo' and (tg_op = 'INSERT' or old.status is distinct from 'ativo') then
    update public.vendas_mobile_vinculos_comerciais
       set ativo = false, atualizado_em = now()
     where user_id = new.user_id and ativo = true;
    insert into public.vendas_mobile_vinculos_comerciais (user_id, empresa_id, ativo)
    values (new.user_id, new.empresa_id, true)
    on conflict (user_id, empresa_id) do update
      set ativo = true, atualizado_em = now();
  end if;
  return new;
end;
$$;

drop trigger if exists ativar_vinculo_comercial_vendas_mobile_trigger on public.vendas_mobile_acessos;
create trigger ativar_vinculo_comercial_vendas_mobile_trigger
after insert or update of status on public.vendas_mobile_acessos
for each row execute function public.ativar_vinculo_comercial_vendas_mobile();

alter table public.vendas_mobile_vinculos_comerciais enable row level security;
create policy vendas_vinculos_comerciais_proprios on public.vendas_mobile_vinculos_comerciais
  for select to authenticated using (user_id = auth.uid());

create or replace function public.meus_vinculos_comerciais_vendas_mobile_rpc()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'empresa_id', v.empresa_id, 'empresa_nome', e.nome,
      'ativo', v.ativo, 'novidades_ativas', v.novidades_ativas,
      'divulgacao_ativa', v.divulgacao_ativa, 'catalogo_ativo', v.catalogo_ativo
    ) order by v.ativo desc, v.atualizado_em desc)
    from public.vendas_mobile_vinculos_comerciais v
    join public.empresas e on e.id = v.empresa_id
    where v.user_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

create or replace function public.atualizar_recurso_vinculo_comercial_vendas_mobile_rpc(
  p_empresa_id uuid, p_recurso text, p_ativo boolean, p_remover_catalogo boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.vendas_mobile_vinculos_comerciais where user_id = auth.uid() and empresa_id = p_empresa_id) then
    raise exception 'Vínculo comercial não encontrado.';
  end if;
  if p_recurso not in ('novidades', 'divulgacao', 'catalogo') then raise exception 'Recurso inválido.'; end if;
  update public.vendas_mobile_vinculos_comerciais set
    novidades_ativas = case when p_recurso = 'novidades' then p_ativo else novidades_ativas end,
    divulgacao_ativa = case when p_recurso = 'divulgacao' then p_ativo else divulgacao_ativa end,
    catalogo_ativo = case when p_recurso = 'catalogo' then p_ativo else catalogo_ativo end,
    atualizado_em = now()
  where user_id = auth.uid() and empresa_id = p_empresa_id;
  if p_recurso = 'catalogo' and not p_ativo and p_remover_catalogo then
    delete from public.vendas_mobile_produtos p
    where p.user_id = auth.uid()
      and p.catalogo_empresa_id in (select id from public.vendas_mobile_catalogos where empresa_id = p_empresa_id);
  end if;
  return public.meus_vinculos_comerciais_vendas_mobile_rpc();
end;
$$;

-- A sincronização passa a receber novos produtos somente da empresa comercial ativa.
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
      if exists (select 1 from public.vendas_mobile_catalogo_recebimentos r where r.user_id = auth.uid() and r.catalogo_produto_id = v_produto.id) then v_ignorados := v_ignorados + 1; continue; end if;
      insert into public.vendas_mobile_produtos (user_id, marca, categoria, sku, nome, descricao, preco, preco_custo, estoque, unidade, imagem_url, metadados, ativo, catalogo_empresa_id, catalogo_produto_origem_id, estoque_controlado)
      values (auth.uid(), v_produto.marca, v_produto.categoria, v_produto.sku, v_produto.nome, v_produto.descricao, v_produto.preco_venda, v_produto.preco_custo, null, v_produto.unidade, v_produto.imagem_url, jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', v_catalogo.id, 'produto_id', v_produto.id)), true, v_catalogo.id, v_produto.id, false)
      returning id into v_produto_pessoal_id;
      insert into public.vendas_mobile_catalogo_recebimentos (user_id, catalogo_produto_id, produto_id) values (auth.uid(), v_produto.id, v_produto_pessoal_id);
      v_adicionados := v_adicionados + 1;
    end loop;
  end loop;
  return jsonb_build_object('adicionados', v_adicionados, 'ja_recebidos', v_ignorados);
end;
$$;

create table if not exists public.vendas_mobile_backups_reset (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  dados jsonb not null, criado_em timestamptz not null default now()
);
alter table public.vendas_mobile_backups_reset enable row level security;
create policy vendas_backups_reset_proprios on public.vendas_mobile_backups_reset for select to authenticated using (user_id = auth.uid());

create or replace function public.resetar_vendas_mobile_rpc(p_confirmacao text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_backup_id uuid; v_empresa_atual uuid;
begin
  if auth.uid() is null or upper(trim(coalesce(p_confirmacao,''))) <> 'RESETAR' then raise exception 'Confirmação de segurança inválida.'; end if;
  insert into public.vendas_mobile_backups_reset (user_id, dados) values (auth.uid(), jsonb_build_object(
    'gerado_em', now(), 'clientes', coalesce((select jsonb_agg(to_jsonb(c)) from public.vendas_mobile_clientes c where c.user_id = auth.uid()), '[]'::jsonb),
    'pedidos', coalesce((select jsonb_agg(to_jsonb(p)) from public.vendas_mobile_pedidos p where p.user_id = auth.uid()), '[]'::jsonb),
    'pagamentos', coalesce((select jsonb_agg(to_jsonb(p)) from public.vendas_mobile_pagamentos p where p.user_id = auth.uid()), '[]'::jsonb),
    'produtos', coalesce((select jsonb_agg(to_jsonb(p)) from public.vendas_mobile_produtos p where p.user_id = auth.uid()), '[]'::jsonb)
  )) returning id into v_backup_id;
  select empresa_id into v_empresa_atual from public.vendas_mobile_vinculos_comerciais where user_id = auth.uid() and ativo limit 1;
  delete from public.vendas_mobile_pagamentos where user_id = auth.uid();
  delete from public.vendas_mobile_pedidos where user_id = auth.uid();
  delete from public.vendas_mobile_agenda where user_id = auth.uid();
  delete from public.vendas_mobile_produtos where user_id = auth.uid();
  delete from public.vendas_mobile_clientes where user_id = auth.uid();
  delete from public.vendas_mobile_catalogo_recebimentos where user_id = auth.uid();
  delete from public.vendas_mobile_importacoes where user_id = auth.uid();
  delete from public.vendas_mobile_vinculos_comerciais where user_id = auth.uid() and not (empresa_id = v_empresa_atual and ativo);
  update public.vendas_mobile_vinculos_comerciais set novidades_ativas = true, divulgacao_ativa = true, catalogo_ativo = true, atualizado_em = now() where user_id = auth.uid() and ativo;
  return v_backup_id;
end;
$$;

revoke all on function public.meus_vinculos_comerciais_vendas_mobile_rpc() from public;
grant execute on function public.meus_vinculos_comerciais_vendas_mobile_rpc() to authenticated;
revoke all on function public.atualizar_recurso_vinculo_comercial_vendas_mobile_rpc(uuid,text,boolean,boolean) from public;
grant execute on function public.atualizar_recurso_vinculo_comercial_vendas_mobile_rpc(uuid,text,boolean,boolean) to authenticated;
revoke all on function public.resetar_vendas_mobile_rpc(text) from public;
grant execute on function public.resetar_vendas_mobile_rpc(text) to authenticated;
