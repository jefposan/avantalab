-- Separa a empresa financeira da conta da empresa que fornece o conteudo.
-- Esta migracao e aditiva: nenhum produto, pedido ou recebimento e removido.

create temporary table av_vendas_preservacao_migracao on commit drop as
select
  (select count(*) from public.vendas_mobile_produtos) as produtos,
  (select count(*) from public.vendas_mobile_clientes) as clientes,
  (select count(*) from public.vendas_mobile_pedidos) as pedidos,
  (select count(*) from public.vendas_mobile_pagamentos) as pagamentos;

create table if not exists public.vendas_mobile_contas_vinculos_comerciais (
  conta_id uuid primary key references public.vendas_mobile_contas(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  autorizado_por uuid not null references auth.users(id) on delete restrict,
  ativo boolean not null default true,
  origem text not null default 'migracao'
    check (origem in ('migracao', 'perfil', 'solicitacao', 'restauracao')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists vendas_mobile_contas_vinculos_empresa_idx
  on public.vendas_mobile_contas_vinculos_comerciais(empresa_id, ativo);

-- O catalogo ja copiado para a conta e a evidencia mais forte do vinculo que
-- estava em uso. Na ausencia dele, preserva a empresa escolhida no perfil; o
-- vinculo legado so e herdado automaticamente quando o usuario tem uma conta.
with contas_base as (
  select c.*,
    count(*) over (partition by c.criado_por) as total_contas,
    row_number() over (partition by c.criado_por order by c.criado_em, c.id) as ordem_conta
  from public.vendas_mobile_contas c
  where c.arquivada_em is null
), candidatos as (
  select
    c.id as conta_id,
    c.criado_por,
    coalesce(
      produto.empresa_id,
      case when c.empresa_id is not null and (
        exists (select 1 from public.vendas_mobile_acessos a
                where a.user_id = c.criado_por and a.empresa_id = c.empresa_id and a.status = 'ativo')
        or exists (select 1 from public.usuarios_empresa u
                   where u.user_id = c.criado_por and u.empresa_id = c.empresa_id and u.status = 'ativo')
      ) then c.empresa_id end,
      case when c.total_contas = 1 or c.ordem_conta = 1 then legado.empresa_id end
    ) as empresa_id
  from contas_base c
  left join lateral (
    select catalogo.empresa_id
    from public.vendas_mobile_produtos p
    join public.vendas_mobile_catalogos catalogo on catalogo.id = p.catalogo_empresa_id
    where p.conta_id = c.id
    group by catalogo.empresa_id
    order by count(*) desc, max(p.atualizado_em) desc nulls last
    limit 1
  ) produto on true
  left join lateral (
    select v.empresa_id
    from public.vendas_mobile_vinculos_comerciais v
    where v.user_id = c.criado_por and v.ativo = true
    order by v.atualizado_em desc
    limit 1
  ) legado on true
)
insert into public.vendas_mobile_contas_vinculos_comerciais
  (conta_id, empresa_id, autorizado_por, ativo, origem)
select conta_id, empresa_id, criado_por, true, 'migracao'
from candidatos
where empresa_id is not null
on conflict (conta_id) do nothing;

alter table public.vendas_mobile_contas_vinculos_comerciais enable row level security;
drop policy if exists vendas_mobile_contas_vinculos_leitura
  on public.vendas_mobile_contas_vinculos_comerciais;
create policy vendas_mobile_contas_vinculos_leitura
  on public.vendas_mobile_contas_vinculos_comerciais for select to authenticated
  using (public.vendas_mobile_pode_ler_conta(conta_id));

create or replace function public.vendas_mobile_vinculo_conta_valido(
  p_conta_id uuid,
  p_empresa_id uuid default null
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.vendas_mobile_contas_vinculos_comerciais v
    where v.conta_id = p_conta_id
      and v.ativo = true
      and (p_empresa_id is null or v.empresa_id = p_empresa_id)
      and (
        exists (select 1 from public.vendas_mobile_acessos a
                where a.user_id = v.autorizado_por and a.empresa_id = v.empresa_id and a.status = 'ativo')
        or exists (select 1 from public.usuarios_empresa u
                   where u.user_id = v.autorizado_por and u.empresa_id = v.empresa_id and u.status = 'ativo')
      )
  )
$$;

create or replace function public.vendas_mobile_usuario_tem_vinculo_conta_empresa(
  p_empresa_id uuid,
  p_recurso text default 'catalogo'
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.vendas_mobile_contas_usuarios membro
    join public.vendas_mobile_contas_vinculos_comerciais v on v.conta_id = membro.conta_id
    join public.vendas_mobile_contas_recursos r on r.conta_id = membro.conta_id
    where membro.user_id = auth.uid() and membro.status = 'ativo'
      and v.empresa_id = p_empresa_id and v.ativo = true
      and public.vendas_mobile_vinculo_conta_valido(v.conta_id, v.empresa_id)
      and case p_recurso
        when 'novidades' then r.novidades_ativas
        when 'divulgacao' then r.divulgacao_ativa
        else r.catalogo_ativo
      end
  )
$$;

create or replace function public.meus_vinculos_comerciais_vendas_mobile_rpc(p_conta_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.vendas_mobile_pode_ler_conta(p_conta_id) then
    raise exception 'Conta de vendas invalida ou sem permissao.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'empresa_id', v.empresa_id,
      'empresa_nome', e.nome,
      'ativo', v.ativo,
      'novidades_ativas', r.novidades_ativas,
      'divulgacao_ativa', r.divulgacao_ativa,
      'catalogo_ativo', r.catalogo_ativo
    ))
    from public.vendas_mobile_contas_vinculos_comerciais v
    join public.empresas e on e.id = v.empresa_id
    join public.vendas_mobile_contas_recursos r on r.conta_id = v.conta_id
    where v.conta_id = p_conta_id
      and v.ativo = true
      and public.vendas_mobile_vinculo_conta_valido(v.conta_id, v.empresa_id)
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
  if not public.vendas_mobile_vinculo_conta_valido(p_conta_id, p_empresa_id) then
    raise exception 'Vinculo comercial nao encontrado nesta conta.';
  end if;
  if p_recurso not in ('novidades', 'divulgacao', 'catalogo') then
    raise exception 'Recurso invalido.';
  end if;

  insert into public.vendas_mobile_contas_recursos(conta_id)
  values (p_conta_id) on conflict (conta_id) do nothing;
  if p_recurso = 'novidades' then
    update public.vendas_mobile_contas_recursos set novidades_ativas = p_ativo, atualizado_em = now() where conta_id = p_conta_id;
  elsif p_recurso = 'divulgacao' then
    update public.vendas_mobile_contas_recursos set divulgacao_ativa = p_ativo, atualizado_em = now() where conta_id = p_conta_id;
  else
    update public.vendas_mobile_contas_recursos set catalogo_ativo = p_ativo, atualizado_em = now() where conta_id = p_conta_id;
    if not p_ativo and p_remover_catalogo then
      delete from public.vendas_mobile_produtos p
      where p.conta_id = p_conta_id
        and p.catalogo_empresa_id in (
          select id from public.vendas_mobile_catalogos where empresa_id = p_empresa_id
        );
    end if;
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
  if not public.vendas_mobile_pode_operar_conta(p_conta_id) then raise exception 'Conta de vendas invalida ou sem permissao.'; end if;

  select v.empresa_id into v_empresa_id
  from public.vendas_mobile_contas_vinculos_comerciais v
  join public.vendas_mobile_contas_recursos r on r.conta_id = v.conta_id and r.catalogo_ativo
  where v.conta_id = p_conta_id and v.ativo = true
    and public.vendas_mobile_vinculo_conta_valido(v.conta_id, v.empresa_id);
  if v_empresa_id is null then return jsonb_build_object('adicionados', 0, 'ja_recebidos', 0); end if;

  for v_catalogo in
    select c.* from public.vendas_mobile_catalogos c
    join public.empresa_modulos m on m.empresa_id = c.empresa_id and m.modulo_id = 'vendas_mobile' and m.ativo = true
    where c.empresa_id = v_empresa_id and c.ativo = true
  loop
    for v_produto in select * from public.vendas_mobile_catalogo_produtos where catalogo_id = v_catalogo.id and ativo = true
    loop
      if exists (select 1 from public.vendas_mobile_produtos p where p.conta_id = p_conta_id and p.catalogo_produto_origem_id = v_produto.id) then
        v_ignorados := v_ignorados + 1; continue;
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
      values (v_user_id, p_conta_id, v_produto.id, v_produto_conta_id, 'recebido', now(), now())
      on conflict (conta_id, catalogo_produto_id) do update
        set user_id = excluded.user_id, produto_id = excluded.produto_id, status = 'recebido', atualizado_em = now();
      v_adicionados := v_adicionados + 1;
    end loop;
  end loop;
  return jsonb_build_object('adicionados', v_adicionados, 'ja_recebidos', v_ignorados);
end;
$$;

-- Novas solicitacoes ficam ligadas ao perfil de vendas que as originou.
alter table public.vendas_mobile_solicitacoes_acesso
  add column if not exists conta_id uuid references public.vendas_mobile_contas(id) on delete cascade;

update public.vendas_mobile_solicitacoes_acesso s
set conta_id = c.id
from public.vendas_mobile_contas c
where s.conta_id is null and c.criado_por = s.user_id
  and c.arquivada_em is null
  and (select count(*) from public.vendas_mobile_contas x where x.criado_por = s.user_id and x.arquivada_em is null) = 1;

create or replace function public.solicitar_acesso_vendas_mobile_rpc(
  p_codigo_empresa text,
  p_nome text,
  p_telefone text,
  p_conta_id uuid
)
returns public.vendas_mobile_solicitacoes_acesso
language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
  v_email text;
  v_solicitacao public.vendas_mobile_solicitacoes_acesso;
begin
  if auth.uid() is null then raise exception 'E necessario entrar na conta antes de solicitar acesso.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_gerir_conta(p_conta_id) then raise exception 'Selecione um perfil de vendas valido.'; end if;
  select c.empresa_id into v_empresa_id from public.codigos_vinculo_empresa c
  where c.codigo = upper(trim(p_codigo_empresa)) and c.ativo = true;
  if v_empresa_id is null then raise exception 'Codigo da empresa nao encontrado.'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if trim(v_email) = '' then raise exception 'Nao foi possivel identificar o email desta conta.'; end if;
  if trim(coalesce(p_nome, '')) = '' then raise exception 'Informe seu nome para enviar a solicitacao.'; end if;

  select * into v_solicitacao from public.vendas_mobile_solicitacoes_acesso
  where empresa_id = v_empresa_id and user_id = auth.uid() for update;

  if exists (select 1 from public.vendas_mobile_acessos a where a.empresa_id = v_empresa_id and a.user_id = auth.uid() and a.status = 'ativo') then
    insert into public.vendas_mobile_contas_vinculos_comerciais(conta_id, empresa_id, autorizado_por, ativo, origem)
    values (p_conta_id, v_empresa_id, auth.uid(), true, 'solicitacao')
    on conflict (conta_id) do update set empresa_id = excluded.empresa_id, autorizado_por = excluded.autorizado_por,
      ativo = true, origem = 'solicitacao', atualizado_em = now();
    if v_solicitacao.id is null then
      insert into public.vendas_mobile_solicitacoes_acesso(empresa_id,user_id,conta_id,nome,email,telefone,status,solicitado_em,analisado_em,atualizado_em)
      values(v_empresa_id,auth.uid(),p_conta_id,trim(p_nome),v_email,nullif(trim(p_telefone),''),'aprovada',now(),now(),now()) returning * into v_solicitacao;
    else
      update public.vendas_mobile_solicitacoes_acesso set conta_id=p_conta_id,nome=trim(p_nome),email=v_email,telefone=nullif(trim(p_telefone),''),status='aprovada',analisado_em=now(),atualizado_em=now()
      where id=v_solicitacao.id returning * into v_solicitacao;
    end if;
    return v_solicitacao;
  end if;

  if v_solicitacao.id is null then
    insert into public.vendas_mobile_solicitacoes_acesso(empresa_id,user_id,conta_id,nome,email,telefone,status,solicitado_em,atualizado_em)
    values(v_empresa_id,auth.uid(),p_conta_id,trim(p_nome),v_email,nullif(trim(p_telefone),''),'pendente',now(),now()) returning * into v_solicitacao;
  elsif v_solicitacao.status in ('rejeitada','cancelada') then
    update public.vendas_mobile_solicitacoes_acesso set conta_id=p_conta_id,nome=trim(p_nome),email=v_email,telefone=nullif(trim(p_telefone),''),status='pendente',solicitado_em=now(),analisado_em=null,analisado_por=null,observacao_gestor=null,atualizado_em=now()
    where id=v_solicitacao.id returning * into v_solicitacao;
  end if;
  return v_solicitacao;
end;
$$;

create or replace function public.vendas_mobile_aplicar_vinculo_solicitacao_aprovada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aprovada' and new.conta_id is not null and (tg_op = 'INSERT' or old.status is distinct from 'aprovada') then
    insert into public.vendas_mobile_contas_vinculos_comerciais(conta_id,empresa_id,autorizado_por,ativo,origem)
    values(new.conta_id,new.empresa_id,new.user_id,true,'solicitacao')
    on conflict(conta_id) do update set empresa_id=excluded.empresa_id,autorizado_por=excluded.autorizado_por,
      ativo=true,origem='solicitacao',atualizado_em=now();
  end if;
  return new;
end;
$$;
drop trigger if exists vendas_mobile_solicitacao_aplicar_vinculo on public.vendas_mobile_solicitacoes_acesso;
create trigger vendas_mobile_solicitacao_aplicar_vinculo
after insert or update of status on public.vendas_mobile_solicitacoes_acesso
for each row execute function public.vendas_mobile_aplicar_vinculo_solicitacao_aprovada();

create or replace function public.vendas_mobile_desativar_vinculo_revogado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'bloqueado' and old.status is distinct from 'bloqueado' then
    update public.vendas_mobile_contas_vinculos_comerciais
    set ativo=false, atualizado_em=now()
    where empresa_id=new.empresa_id and autorizado_por=new.user_id and ativo=true;
  end if;
  return new;
end;
$$;
drop trigger if exists vendas_mobile_acesso_desativar_vinculo on public.vendas_mobile_acessos;
create trigger vendas_mobile_acesso_desativar_vinculo
after update of status on public.vendas_mobile_acessos
for each row execute function public.vendas_mobile_desativar_vinculo_revogado();

-- Contas novas que ja selecionam uma empresa nascem com o vinculo correto.
create or replace function public.criar_conta_vendas_mobile_rpc(p_nome text, p_empresa_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_conta public.vendas_mobile_contas;
begin
  if auth.uid() is null then raise exception 'Sessao expirada.'; end if;
  if length(trim(coalesce(p_nome,''))) < 2 then raise exception 'Informe o nome da conta.'; end if;
  if p_empresa_id is not null and not exists (
    select 1 from public.vendas_mobile_acessos a where a.user_id=auth.uid() and a.empresa_id=p_empresa_id and a.status='ativo'
    union all select 1 from public.usuarios_empresa u where u.user_id=auth.uid() and u.empresa_id=p_empresa_id and u.status='ativo'
  ) then raise exception 'Voce ainda nao possui acesso aprovado a esta empresa.'; end if;
  insert into public.vendas_mobile_contas(nome,empresa_id,criado_por) values(trim(p_nome),p_empresa_id,auth.uid()) returning * into v_conta;
  insert into public.vendas_mobile_contas_usuarios(conta_id,user_id,papel) values(v_conta.id,auth.uid(),'proprietario');
  if p_empresa_id is not null then
    insert into public.vendas_mobile_contas_vinculos_comerciais(conta_id,empresa_id,autorizado_por,ativo,origem)
    values(v_conta.id,p_empresa_id,auth.uid(),true,'perfil');
  end if;
  return jsonb_build_object('id',v_conta.id,'nome',v_conta.nome,'empresa_id',v_conta.empresa_id,'papel','proprietario');
end;
$$;

-- As politicas abaixo permitem que participantes da mesma conta recebam o
-- conteudo autorizado para ela, sem conceder acesso a outras contas do login.
drop policy if exists vendas_catalogos_leitura on public.vendas_mobile_catalogos;
create policy vendas_catalogos_leitura on public.vendas_mobile_catalogos for select to authenticated using (
  public.vendas_mobile_pode_gerir_catalogo(empresa_id)
  or exists (select 1 from public.vendas_mobile_acessos a where a.empresa_id=vendas_mobile_catalogos.empresa_id and a.user_id=auth.uid() and a.status='ativo')
  or public.vendas_mobile_usuario_tem_vinculo_conta_empresa(empresa_id,'catalogo')
);
drop policy if exists vendas_catalogo_produtos_leitura on public.vendas_mobile_catalogo_produtos;
create policy vendas_catalogo_produtos_leitura on public.vendas_mobile_catalogo_produtos for select to authenticated using (
  exists (select 1 from public.vendas_mobile_catalogos c where c.id=catalogo_id and (
    public.vendas_mobile_pode_gerir_catalogo(c.empresa_id)
    or exists (select 1 from public.vendas_mobile_acessos a where a.empresa_id=c.empresa_id and a.user_id=auth.uid() and a.status='ativo')
    or public.vendas_mobile_usuario_tem_vinculo_conta_empresa(c.empresa_id,'catalogo')
  ))
);
drop policy if exists vendas_mobile_conteudos_leitura on public.vendas_mobile_conteudos;
create policy vendas_mobile_conteudos_leitura on public.vendas_mobile_conteudos for select to authenticated using (
  ativo=true and ((pagina='informacoes' and empresa_id is null) or
  (pagina='novidades' and public.vendas_mobile_usuario_tem_vinculo_conta_empresa(empresa_id,'novidades')))
);
drop policy if exists vendas_divulgacao_pastas_leitura on public.vendas_mobile_divulgacao_pastas;
create policy vendas_divulgacao_pastas_leitura on public.vendas_mobile_divulgacao_pastas for select to authenticated using (
  ativo=true and public.vendas_mobile_usuario_tem_vinculo_conta_empresa(empresa_id,'divulgacao')
);
drop policy if exists vendas_divulgacao_materiais_leitura on public.vendas_mobile_divulgacao_materiais;
create policy vendas_divulgacao_materiais_leitura on public.vendas_mobile_divulgacao_materiais for select to authenticated using (
  ativo=true and exists (select 1 from public.vendas_mobile_divulgacao_pastas p
    where p.id=pasta_id and public.vendas_mobile_usuario_tem_vinculo_conta_empresa(p.empresa_id,'divulgacao'))
);

revoke all on function public.vendas_mobile_vinculo_conta_valido(uuid,uuid) from public, anon;
revoke all on function public.vendas_mobile_usuario_tem_vinculo_conta_empresa(uuid,text) from public, anon;
revoke all on function public.solicitar_acesso_vendas_mobile_rpc(text,text,text,uuid) from public, anon;
grant execute on function public.vendas_mobile_vinculo_conta_valido(uuid,uuid) to authenticated;
grant execute on function public.vendas_mobile_usuario_tem_vinculo_conta_empresa(uuid,text) to authenticated;
grant execute on function public.solicitar_acesso_vendas_mobile_rpc(text,text,text,uuid) to authenticated;

-- Falha a transacao inteira se qualquer dado operacional tiver sido removido
-- ou se uma conta com produtos recebidos ficar sem o fornecedor correspondente.
do $$
declare v_antes record;
begin
  select * into v_antes from av_vendas_preservacao_migracao;
  if v_antes.produtos <> (select count(*) from public.vendas_mobile_produtos)
     or v_antes.clientes <> (select count(*) from public.vendas_mobile_clientes)
     or v_antes.pedidos <> (select count(*) from public.vendas_mobile_pedidos)
     or v_antes.pagamentos <> (select count(*) from public.vendas_mobile_pagamentos) then
    raise exception 'Protecao de dados: a migracao alterou registros operacionais e foi cancelada.';
  end if;

  if exists (
    select 1
    from public.vendas_mobile_contas c
    join lateral (
      select catalogo.empresa_id
      from public.vendas_mobile_produtos p
      join public.vendas_mobile_catalogos catalogo on catalogo.id = p.catalogo_empresa_id
      where p.conta_id = c.id
      group by catalogo.empresa_id
      order by count(*) desc, max(p.atualizado_em) desc nulls last
      limit 1
    ) produto on true
    left join public.vendas_mobile_contas_vinculos_comerciais v
      on v.conta_id = c.id and v.empresa_id = produto.empresa_id and v.ativo = true
    where v.conta_id is null
  ) then
    raise exception 'Protecao de catalogo: uma conta com produtos recebidos ficou sem vinculo e a migracao foi cancelada.';
  end if;
end $$;
