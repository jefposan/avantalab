-- Trilha de auditoria imutável do Controle de Ponto.
create table public.ponto_auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  funcionario_user_id uuid references auth.users(id) on delete restrict,
  ator_user_id uuid references auth.users(id) on delete restrict,
  evento text not null check (evento in ('marcacao_registrada', 'funcionario_inativado', 'funcionario_reativado', 'funcionario_cadastrado')),
  origem text not null default 'sistema',
  motivo text,
  dados jsonb not null default '{}'::jsonb,
  ocorrido_em timestamptz not null default now()
);

create index ponto_auditoria_empresa_ocorrido_idx on public.ponto_auditoria(empresa_id, ocorrido_em desc);
create index ponto_auditoria_funcionario_ocorrido_idx on public.ponto_auditoria(funcionario_user_id, ocorrido_em desc);

alter table public.ponto_auditoria enable row level security;
create policy "ponto_auditoria_select_gestores" on public.ponto_auditoria
  for select using (
    empresa_id in (
      select empresa_id from public.usuarios_empresa
      where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador')
    )
  );

create function public.ponto_impedir_alteracao_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'A trilha de auditoria do ponto é imutável.';
end;
$$;
create trigger ponto_auditoria_sem_update before update on public.ponto_auditoria
for each row execute function public.ponto_impedir_alteracao_auditoria();
create trigger ponto_auditoria_sem_delete before delete on public.ponto_auditoria
for each row execute function public.ponto_impedir_alteracao_auditoria();

create function public.ponto_auditar_marcacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ponto_auditoria (empresa_id, funcionario_user_id, ator_user_id, evento, origem, dados)
  values (
    new.empresa_id, new.user_id, new.user_id, 'marcacao_registrada', 'app_ponto',
    jsonb_build_object('registro_id', new.id, 'tipo', new.tipo, 'dia', new.dia, 'registrado_em', new.registrado_em, 'hash', new.hash, 'dispositivo', new.dispositivo)
  );
  return new;
end;
$$;
create trigger ponto_registros_auditar_marcacao after insert on public.ponto_registros
for each row execute function public.ponto_auditar_marcacao();
