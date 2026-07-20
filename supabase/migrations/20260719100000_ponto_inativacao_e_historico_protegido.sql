-- Controle de Ponto: inativação segura e preservação do histórico.
-- Funcionários são inativados, nunca excluídos quando houver registros legais.

alter table public.ponto_registros
  drop constraint if exists ponto_registros_empresa_id_fkey;

alter table public.ponto_registros
  add constraint ponto_registros_empresa_id_fkey
  foreign key (empresa_id) references public.empresas(id) on delete restrict;

alter table public.ponto_registros
  drop constraint if exists ponto_registros_user_id_fkey;

alter table public.ponto_registros
  add constraint ponto_registros_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete restrict;

create or replace function public.ponto_validar_funcionario_ativo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.ponto_funcionarios funcionario
    join public.usuarios_empresa acesso
      on acesso.empresa_id = funcionario.empresa_id
     and acesso.user_id = funcionario.user_id
     and acesso.perfil = 'funcionario_ponto'
     and acesso.status = 'ativo'
    where funcionario.empresa_id = new.empresa_id
      and funcionario.user_id = new.user_id
      and funcionario.ativo = true
  ) then
    raise exception 'Funcionário inativo ou sem acesso ao Controle de Ponto.';
  end if;

  return new;
end;
$$;

drop trigger if exists ponto_registros_validar_funcionario_ativo on public.ponto_registros;
create trigger ponto_registros_validar_funcionario_ativo
before insert on public.ponto_registros
for each row execute function public.ponto_validar_funcionario_ativo();

create or replace function public.ponto_impedir_exclusao_historico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'ponto_registros' then
    raise exception 'Registros de ponto não podem ser excluídos.';
  end if;

  if tg_table_name = 'ponto_funcionarios' and exists (
    select 1 from public.ponto_registros
    where empresa_id = old.empresa_id and user_id = old.user_id
  ) then
    raise exception 'Não é permitido excluir funcionário com histórico de ponto.';
  end if;

  if tg_table_name = 'usuarios_empresa'
    and old.perfil = 'funcionario_ponto'
    and exists (
      select 1 from public.ponto_registros
      where empresa_id = old.empresa_id and user_id = old.user_id
    ) then
    raise exception 'Não é permitido excluir o vínculo de funcionário com histórico de ponto.';
  end if;

  if tg_table_name = 'empresas' and exists (
    select 1 from public.ponto_registros where empresa_id = old.id
  ) then
    raise exception 'Não é permitido excluir empresa com histórico de ponto.';
  end if;

  return old;
end;
$$;

drop trigger if exists ponto_registros_impedir_exclusao on public.ponto_registros;
create trigger ponto_registros_impedir_exclusao
before delete on public.ponto_registros
for each row execute function public.ponto_impedir_exclusao_historico();

drop trigger if exists ponto_funcionarios_impedir_exclusao_historico on public.ponto_funcionarios;
create trigger ponto_funcionarios_impedir_exclusao_historico
before delete on public.ponto_funcionarios
for each row execute function public.ponto_impedir_exclusao_historico();

drop trigger if exists usuarios_empresa_ponto_impedir_exclusao_historico on public.usuarios_empresa;
create trigger usuarios_empresa_ponto_impedir_exclusao_historico
before delete on public.usuarios_empresa
for each row execute function public.ponto_impedir_exclusao_historico();

drop trigger if exists empresas_ponto_impedir_exclusao_historico on public.empresas;
create trigger empresas_ponto_impedir_exclusao_historico
before delete on public.empresas
for each row execute function public.ponto_impedir_exclusao_historico();
