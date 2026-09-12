-- Toda receita ou despesa criada após a ativação deve entrar no contexto
-- Principal quando a origem não informar explicitamente um centro de custo.
create or replace function public.aplicar_centro_custo_principal_padrao()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_centro_principal uuid;
begin
  if new.centro_custo_id is not null then
    return new;
  end if;

  if exists (
    select 1 from public.configuracoes
    where empresa_id = new.empresa_id and centros_custo_ativo = true
  ) then
    select id into v_centro_principal
    from public.centros_custo
    where empresa_id = new.empresa_id and is_principal = true and ativo = true
    limit 1;

    if v_centro_principal is not null then
      new.centro_custo_id := v_centro_principal;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists lancamentos_aplicar_centro_principal_padrao on public.lancamentos;
create trigger lancamentos_aplicar_centro_principal_padrao
before insert on public.lancamentos
for each row execute function public.aplicar_centro_custo_principal_padrao();

drop trigger if exists recorrencias_aplicar_centro_principal_padrao on public.recorrencias;
create trigger recorrencias_aplicar_centro_principal_padrao
before insert on public.recorrencias
for each row execute function public.aplicar_centro_custo_principal_padrao();

drop trigger if exists faturamentos_entradas_aplicar_centro_principal_padrao on public.faturamentos_entradas;
create trigger faturamentos_entradas_aplicar_centro_principal_padrao
before insert on public.faturamentos_entradas
for each row execute function public.aplicar_centro_custo_principal_padrao();
