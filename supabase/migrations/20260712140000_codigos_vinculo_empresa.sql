-- Codigo publico usado para solicitar acesso a um perfil no modulo Vendas.
-- O UUID de empresas permanece interno e nunca e informado ao usuario final.

create table if not exists public.codigos_vinculo_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id) on delete cascade,
  codigo text not null unique check (codigo ~ '^AVA-[A-Z0-9]{8}$'),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists codigos_vinculo_empresa_codigo_ativo_idx
  on public.codigos_vinculo_empresa (codigo)
  where ativo = true;

alter table public.codigos_vinculo_empresa enable row level security;

-- Apenas gestores do proprio perfil podem consultar o codigo no navegador.
drop policy if exists "codigos_vinculo_empresa_select_gestor" on public.codigos_vinculo_empresa;
create policy "codigos_vinculo_empresa_select_gestor"
  on public.codigos_vinculo_empresa for select
  using (
    empresa_id in (
      select ue.empresa_id
      from public.usuarios_empresa ue
      where ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

-- A criacao e a troca do codigo passam por RPCs. Nao ha escrita direta pelo app.
drop policy if exists "codigos_vinculo_empresa_insert_gestor" on public.codigos_vinculo_empresa;
drop policy if exists "codigos_vinculo_empresa_update_gestor" on public.codigos_vinculo_empresa;
drop policy if exists "codigos_vinculo_empresa_delete_gestor" on public.codigos_vinculo_empresa;

create or replace function public.gerar_codigo_vinculo_empresa()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_codigo text;
begin
  loop
    v_codigo := 'AVA-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (
      select 1 from public.codigos_vinculo_empresa where codigo = v_codigo
    );
  end loop;

  return v_codigo;
end;
$$;

create or replace function public.criar_codigo_vinculo_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.codigos_vinculo_empresa (empresa_id, codigo)
  values (new.id, public.gerar_codigo_vinculo_empresa())
  on conflict (empresa_id) do nothing;
  return new;
end;
$$;

revoke all on function public.gerar_codigo_vinculo_empresa() from public;

drop trigger if exists empresas_criar_codigo_vinculo on public.empresas;
create trigger empresas_criar_codigo_vinculo
  after insert on public.empresas
  for each row execute function public.criar_codigo_vinculo_empresa();

-- Gera os codigos dos perfis criados antes desta migration.
insert into public.codigos_vinculo_empresa (empresa_id, codigo)
select e.id, public.gerar_codigo_vinculo_empresa()
from public.empresas e
on conflict (empresa_id) do nothing;

create or replace function public.regenerar_codigo_vinculo_empresa_rpc(
  p_empresa_id uuid
)
returns public.codigos_vinculo_empresa
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo public.codigos_vinculo_empresa;
begin
  if not exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = p_empresa_id
      and ue.user_id = auth.uid()
      and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ) then
    raise exception 'Sem permissao para alterar o codigo deste perfil.';
  end if;

  update public.codigos_vinculo_empresa
     set codigo = public.gerar_codigo_vinculo_empresa(),
         ativo = true,
         atualizado_em = now()
   where empresa_id = p_empresa_id
   returning * into v_codigo;

  return v_codigo;
end;
$$;

revoke all on function public.regenerar_codigo_vinculo_empresa_rpc(uuid) from public;
grant execute on function public.regenerar_codigo_vinculo_empresa_rpc(uuid) to authenticated;
