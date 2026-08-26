-- Custos e Precificacao: cadastro mestre compartilhado com o Catalogo Tridium.
-- Produtos permanecem em vendas_mobile_catalogo_produtos; somente os dados
-- proprios de custos ficam no documento do modulo.
begin;

insert into public.modulos (
  id, nome, descricao, icone, disponivel, perfis, ordem, preco_mensal,
  vendavel_business, incluido_business_pro, modo_navegacao, rota_web, superficies
) values (
  'custos', 'Custos e Precificação',
  'Cadastro mestre, composição de custos, histórico e simulações de preço.',
  -- A estrutura pode ser aplicada com segurança no banco compartilhado. A
  -- publicação geral só muda para true junto com o deploy oficial do código;
  -- durante o desenvolvimento, a API local inclui exclusivamente este módulo.
  'custos', false, array['empresa'], 5, 14.90,
  true, true, 'pagina_total', '/custos', array['web']
)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  icone = excluded.icone,
  disponivel = excluded.disponivel,
  perfis = excluded.perfis,
  ordem = excluded.ordem,
  preco_mensal = excluded.preco_mensal,
  vendavel_business = excluded.vendavel_business,
  incluido_business_pro = excluded.incluido_business_pro,
  modo_navegacao = excluded.modo_navegacao,
  rota_web = excluded.rota_web,
  superficies = excluded.superficies;

alter table public.vendas_mobile_catalogo_produtos
  add column if not exists tipo_item text not null default 'produto',
  add column if not exists disponivel_catalogo boolean not null default true,
  add column if not exists cfop_padrao text,
  add column if not exists cst_pis text,
  add column if not exists cst_cofins text,
  add column if not exists cst_ibs_cbs text,
  add column if not exists classificacao_ibs_cbs text,
  add column if not exists codigo_tributacao_nacional text,
  add column if not exists codigo_tributacao_municipal text,
  add column if not exists nbs text,
  add column if not exists item_lc116 text,
  add column if not exists municipio_prestacao text,
  add column if not exists aliquota_iss numeric(7,4);

alter table public.vendas_mobile_catalogo_produtos
  drop constraint if exists vendas_mobile_catalogo_produtos_tipo_item_check;
alter table public.vendas_mobile_catalogo_produtos
  add constraint vendas_mobile_catalogo_produtos_tipo_item_check
  check (tipo_item in ('produto', 'servico'));

-- Rascunhos podem nascer sem preço. A publicação no catálogo continua sendo
-- validada pela interface e exige preço maior que zero.
alter table public.vendas_mobile_catalogo_produtos
  drop constraint if exists vendas_mobile_catalogo_produtos_preco_venda_check;
alter table public.vendas_mobile_catalogo_produtos alter column preco_venda set default 0;
alter table public.vendas_mobile_catalogo_produtos
  add constraint vendas_mobile_catalogo_produtos_preco_venda_check check (preco_venda >= 0);

create or replace function public.custos_pode_acessar_empresa(p_empresa_id uuid, p_editar boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.modulo_ativo_para_empresa(p_empresa_id, 'custos') and exists (
    select 1
      from public.usuarios_empresa acesso
     where acesso.empresa_id = p_empresa_id
       and acesso.user_id = auth.uid()
       and acesso.status = 'ativo'
       and (not p_editar or acesso.perfil in ('gestor_master', 'administrador', 'operador_completo'))
  );
$$;
revoke all on function public.custos_pode_acessar_empresa(uuid, boolean) from public;
grant execute on function public.custos_pode_acessar_empresa(uuid, boolean) to authenticated;

create table if not exists public.custos_documentos (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  documento jsonb not null default '{"version":1,"recursos":[],"composicoes":{},"cenarios":[],"historico":[]}'::jsonb,
  revisao bigint not null default 1,
  atualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint custos_documentos_versao_check check ((documento->>'version')::integer = 1)
);
alter table public.custos_documentos enable row level security;

create policy custos_documentos_select on public.custos_documentos for select to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, false));
create policy custos_documentos_insert on public.custos_documentos for insert to authenticated
  with check (public.custos_pode_acessar_empresa(empresa_id, true) and atualizado_por = auth.uid());
create policy custos_documentos_update on public.custos_documentos for update to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, true))
  with check (public.custos_pode_acessar_empresa(empresa_id, true) and atualizado_por = auth.uid());
create policy custos_documentos_delete on public.custos_documentos for delete to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, true));

create or replace function public.custos_documentos_atualizar_metadados()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  new.revisao := case when tg_op = 'UPDATE' then old.revisao + 1 else 1 end;
  return new;
end;
$$;
drop trigger if exists custos_documentos_metadados on public.custos_documentos;
create trigger custos_documentos_metadados before insert or update on public.custos_documentos
for each row execute function public.custos_documentos_atualizar_metadados();
grant select, insert, update, delete on public.custos_documentos to authenticated;

-- Catálogo e Custos passam a administrar a mesma base de produtos.
drop policy if exists vendas_catalogos_leitura on public.vendas_mobile_catalogos;
drop policy if exists vendas_catalogos_gestao on public.vendas_mobile_catalogos;
create policy vendas_catalogos_leitura on public.vendas_mobile_catalogos for select to authenticated
  using (
    public.vendas_mobile_pode_gerir_catalogo(empresa_id)
    or public.custos_pode_acessar_empresa(empresa_id, false)
    or exists (select 1 from public.vendas_mobile_acessos a where a.empresa_id = vendas_mobile_catalogos.empresa_id and a.user_id = auth.uid() and a.status = 'ativo')
  );
create policy vendas_catalogos_gestao on public.vendas_mobile_catalogos for all to authenticated
  using (public.vendas_mobile_pode_gerir_catalogo(empresa_id) or public.custos_pode_acessar_empresa(empresa_id, true))
  with check (public.vendas_mobile_pode_gerir_catalogo(empresa_id) or public.custos_pode_acessar_empresa(empresa_id, true));

drop policy if exists vendas_catalogo_produtos_leitura on public.vendas_mobile_catalogo_produtos;
drop policy if exists vendas_catalogo_produtos_gestao on public.vendas_mobile_catalogo_produtos;
create policy vendas_catalogo_produtos_leitura on public.vendas_mobile_catalogo_produtos for select to authenticated
  using (exists (
    select 1 from public.vendas_mobile_catalogos c where c.id = catalogo_id and (
      public.vendas_mobile_pode_gerir_catalogo(c.empresa_id)
      or public.custos_pode_acessar_empresa(c.empresa_id, false)
      or (
        vendas_mobile_catalogo_produtos.ativo = true
        and vendas_mobile_catalogo_produtos.disponivel_catalogo = true
        and exists (select 1 from public.vendas_mobile_acessos a where a.empresa_id = c.empresa_id and a.user_id = auth.uid() and a.status = 'ativo')
      )
    )
  ));
create policy vendas_catalogo_produtos_gestao on public.vendas_mobile_catalogo_produtos for all to authenticated
  using (exists (
    select 1 from public.vendas_mobile_catalogos c where c.id = catalogo_id
      and (public.vendas_mobile_pode_gerir_catalogo(c.empresa_id) or public.custos_pode_acessar_empresa(c.empresa_id, true))
  ))
  with check (exists (
    select 1 from public.vendas_mobile_catalogos c where c.id = catalogo_id
      and (public.vendas_mobile_pode_gerir_catalogo(c.empresa_id) or public.custos_pode_acessar_empresa(c.empresa_id, true))
  ));

-- O vendedor recebe apenas itens ativos que já foram publicados pelo módulo.
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
    for v_produto in
      select * from public.vendas_mobile_catalogo_produtos
      where catalogo_id = v_catalogo.id and ativo = true and disponivel_catalogo = true
    loop
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

drop policy if exists vendas_catalogo_imagens_gestao on storage.objects;
create policy vendas_catalogo_imagens_gestao on storage.objects for all to authenticated
using (
  bucket_id = 'vendas-produtos'
  and (storage.foldername(name))[1] = 'catalogos'
  and exists (
    select 1 from public.usuarios_empresa ue
    where ue.empresa_id::text = (storage.foldername(name))[2]
      and ue.user_id = auth.uid() and ue.status = 'ativo'
      and (
        (ue.perfil in ('gestor_master', 'administrador') and public.vendas_mobile_pode_gerir_catalogo(ue.empresa_id))
        or public.custos_pode_acessar_empresa(ue.empresa_id, true)
      )
  )
)
with check (
  bucket_id = 'vendas-produtos'
  and (storage.foldername(name))[1] = 'catalogos'
  and exists (
    select 1 from public.usuarios_empresa ue
    where ue.empresa_id::text = (storage.foldername(name))[2]
      and ue.user_id = auth.uid() and ue.status = 'ativo'
      and (
        (ue.perfil in ('gestor_master', 'administrador') and public.vendas_mobile_pode_gerir_catalogo(ue.empresa_id))
        or public.custos_pode_acessar_empresa(ue.empresa_id, true)
      )
  )
);

commit;
