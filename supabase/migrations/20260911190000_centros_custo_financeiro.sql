-- Centros de custo opcionais por perfil. Registros legados permanecem sem centro.
create table if not exists public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists centros_custo_empresa_nome_unico_idx on public.centros_custo (empresa_id, lower(btrim(nome)));
create index if not exists centros_custo_empresa_ativo_nome_idx on public.centros_custo (empresa_id, ativo, nome);

alter table public.configuracoes add column if not exists centros_custo_ativo boolean not null default false;
alter table public.lancamentos add column if not exists centro_custo_id uuid references public.centros_custo(id) on delete set null;
alter table public.recorrencias add column if not exists centro_custo_id uuid references public.centros_custo(id) on delete set null;
create index if not exists lancamentos_empresa_centro_custo_periodo_idx on public.lancamentos (empresa_id, centro_custo_id, ano, mes);

create or replace function public.validar_centro_custo_do_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.centro_custo_id is not null and not exists (select 1 from public.centros_custo c where c.id = new.centro_custo_id and c.empresa_id = new.empresa_id) then
    raise exception 'Centro de custo inválido para este perfil.';
  end if;
  return new;
end;
$$;
drop trigger if exists lancamentos_validar_centro_custo on public.lancamentos;
create trigger lancamentos_validar_centro_custo before insert or update of empresa_id, centro_custo_id on public.lancamentos for each row execute function public.validar_centro_custo_do_perfil();
drop trigger if exists recorrencias_validar_centro_custo on public.recorrencias;
create trigger recorrencias_validar_centro_custo before insert or update of empresa_id, centro_custo_id on public.recorrencias for each row execute function public.validar_centro_custo_do_perfil();

alter table public.centros_custo enable row level security;
create policy centros_custo_leitura on public.centros_custo for select to authenticated using (
  exists (select 1 from public.usuarios_empresa ue where ue.empresa_id = centros_custo.empresa_id and ue.user_id = auth.uid() and ue.status = 'ativo')
);
create policy centros_custo_gestao on public.centros_custo for all to authenticated using (
  exists (select 1 from public.usuarios_empresa ue where ue.empresa_id = centros_custo.empresa_id and ue.user_id = auth.uid() and ue.status = 'ativo' and ue.perfil in ('gestor_master', 'administrador'))
) with check (
  exists (select 1 from public.usuarios_empresa ue where ue.empresa_id = centros_custo.empresa_id and ue.user_id = auth.uid() and ue.status = 'ativo' and ue.perfil in ('gestor_master', 'administrador'))
);
