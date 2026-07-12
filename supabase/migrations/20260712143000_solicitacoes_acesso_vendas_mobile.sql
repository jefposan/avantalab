-- Fluxo de acesso do Vendas Mobile: o codigo identifica o perfil e o gestor
-- decide se o usuario pode entrar. Um vendedor nao recebe automaticamente
-- acesso aos demais recursos do ERP.

create table if not exists public.vendas_mobile_solicitacoes_acesso (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovada', 'rejeitada', 'cancelada')),
  solicitado_em timestamptz not null default now(),
  analisado_em timestamptz,
  analisado_por uuid references auth.users(id) on delete set null,
  observacao_gestor text,
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, user_id)
);

create index if not exists vendas_mobile_solicitacoes_empresa_status_idx
  on public.vendas_mobile_solicitacoes_acesso (empresa_id, status, solicitado_em desc);

create table if not exists public.vendas_mobile_acessos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'vendedor' check (papel in ('vendedor', 'gestor')),
  status text not null default 'ativo' check (status in ('ativo', 'bloqueado')),
  aprovado_em timestamptz not null default now(),
  aprovado_por uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, user_id)
);

create index if not exists vendas_mobile_acessos_usuario_status_idx
  on public.vendas_mobile_acessos (user_id, status);

alter table public.vendas_mobile_solicitacoes_acesso enable row level security;
alter table public.vendas_mobile_acessos enable row level security;

-- O solicitante acompanha somente a propria solicitacao. Gestores do perfil
-- veem as solicitacoes e os acessos vinculados a sua empresa.
drop policy if exists "vendas_solicitacoes_select_proprio_ou_gestor"
  on public.vendas_mobile_solicitacoes_acesso;
create policy "vendas_solicitacoes_select_proprio_ou_gestor"
  on public.vendas_mobile_solicitacoes_acesso for select
  using (
    user_id = auth.uid()
    or empresa_id in (
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

drop policy if exists "vendas_acessos_select_proprio_ou_gestor"
  on public.vendas_mobile_acessos;
create policy "vendas_acessos_select_proprio_ou_gestor"
  on public.vendas_mobile_acessos for select
  using (
    user_id = auth.uid()
    or empresa_id in (
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

-- Nenhuma insercao, aprovacao ou bloqueio e feita diretamente pelo navegador.

create or replace function public.solicitar_acesso_vendas_mobile_rpc(
  p_codigo_empresa text,
  p_nome text,
  p_telefone text default null
)
returns public.vendas_mobile_solicitacoes_acesso
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_email text;
  v_solicitacao public.vendas_mobile_solicitacoes_acesso;
begin
  if auth.uid() is null then
    raise exception 'É necessário entrar na conta antes de solicitar acesso.';
  end if;

  select c.empresa_id into v_empresa_id
  from public.codigos_vinculo_empresa c
  where c.codigo = upper(trim(p_codigo_empresa))
    and c.ativo = true;

  if v_empresa_id is null then
    raise exception 'Código da empresa não encontrado.';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if trim(v_email) = '' then
    raise exception 'Não foi possível identificar o email desta conta.';
  end if;

  if trim(coalesce(p_nome, '')) = '' then
    raise exception 'Informe seu nome para enviar a solicitação.';
  end if;

  if exists (
    select 1 from public.vendas_mobile_acessos a
    where a.empresa_id = v_empresa_id
      and a.user_id = auth.uid()
      and a.status = 'ativo'
  ) then
    raise exception 'Esta conta já possui acesso a este perfil.';
  end if;

  insert into public.vendas_mobile_solicitacoes_acesso (
    empresa_id, user_id, nome, email, telefone, status, solicitado_em,
    analisado_em, analisado_por, observacao_gestor, atualizado_em
  ) values (
    v_empresa_id, auth.uid(), trim(p_nome), v_email, nullif(trim(p_telefone), ''), 'pendente', now(),
    null, null, null, now()
  )
  on conflict (empresa_id, user_id) do update set
    nome = excluded.nome,
    email = excluded.email,
    telefone = excluded.telefone,
    status = 'pendente',
    solicitado_em = now(),
    analisado_em = null,
    analisado_por = null,
    observacao_gestor = null,
    atualizado_em = now()
  where public.vendas_mobile_solicitacoes_acesso.status in ('rejeitada', 'cancelada')
  returning * into v_solicitacao;

  if v_solicitacao.id is null then
    select * into v_solicitacao
    from public.vendas_mobile_solicitacoes_acesso
    where empresa_id = v_empresa_id and user_id = auth.uid();
  end if;

  return v_solicitacao;
end;
$$;

create or replace function public.analisar_solicitacao_vendas_mobile_rpc(
  p_solicitacao_id uuid,
  p_aprovar boolean,
  p_observacao text default null
)
returns public.vendas_mobile_solicitacoes_acesso
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitacao public.vendas_mobile_solicitacoes_acesso;
begin
  select * into v_solicitacao
  from public.vendas_mobile_solicitacoes_acesso
  where id = p_solicitacao_id
  for update;

  if v_solicitacao.id is null then
    raise exception 'Solicitação não encontrada.';
  end if;

  if not exists (
    select 1 from public.usuarios_empresa ue
    where ue.empresa_id = v_solicitacao.empresa_id
      and ue.user_id = auth.uid()
      and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ) then
    raise exception 'Sem permissão para analisar esta solicitação.';
  end if;

  update public.vendas_mobile_solicitacoes_acesso
     set status = case when p_aprovar then 'aprovada' else 'rejeitada' end,
         analisado_em = now(),
         analisado_por = auth.uid(),
         observacao_gestor = nullif(trim(p_observacao), ''),
         atualizado_em = now()
   where id = v_solicitacao.id
   returning * into v_solicitacao;

  if p_aprovar then
    insert into public.vendas_mobile_acessos (
      empresa_id, user_id, papel, status, aprovado_em, aprovado_por, atualizado_em
    ) values (
      v_solicitacao.empresa_id, v_solicitacao.user_id, 'vendedor', 'ativo', now(), auth.uid(), now()
    )
    on conflict (empresa_id, user_id) do update set
      status = 'ativo',
      aprovado_em = now(),
      aprovado_por = auth.uid(),
      atualizado_em = now();
  else
    update public.vendas_mobile_acessos
       set status = 'bloqueado', atualizado_em = now()
     where empresa_id = v_solicitacao.empresa_id
       and user_id = v_solicitacao.user_id;
  end if;

  return v_solicitacao;
end;
$$;

create or replace function public.meus_acessos_vendas_mobile_rpc()
returns table (
  empresa_id uuid,
  empresa_nome text,
  papel text,
  status text
)
language sql
security definer
set search_path = public
as $$
  select a.empresa_id, e.nome, a.papel, a.status
  from public.vendas_mobile_acessos a
  join public.empresas e on e.id = a.empresa_id
  where a.user_id = auth.uid()

  union

  select ue.empresa_id, e.nome, 'gestor'::text, 'ativo'::text
  from public.usuarios_empresa ue
  join public.empresas e on e.id = ue.empresa_id
  where ue.user_id = auth.uid()
    and ue.status = 'ativo'
    and ue.perfil in ('gestor_master', 'administrador');
$$;

revoke all on function public.solicitar_acesso_vendas_mobile_rpc(text, text, text) from public;
revoke all on function public.analisar_solicitacao_vendas_mobile_rpc(uuid, boolean, text) from public;
revoke all on function public.meus_acessos_vendas_mobile_rpc() from public;
grant execute on function public.solicitar_acesso_vendas_mobile_rpc(text, text, text) to authenticated;
grant execute on function public.analisar_solicitacao_vendas_mobile_rpc(uuid, boolean, text) to authenticated;
grant execute on function public.meus_acessos_vendas_mobile_rpc() to authenticated;
