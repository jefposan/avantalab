-- NEW não existe em DELETE e OLD não existe em INSERT. Os retornos explícitos
-- preservam exclusões de centros adicionais e recalculam o consolidado quando
-- uma receita muda de mês ou é removida.
create or replace function public.proteger_centro_custo_principal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.is_principal then
      raise exception 'O centro Principal não pode ser removido.';
    end if;
    return old;
  end if;

  if old.is_principal and (new.is_principal = false or new.ativo = false or new.nome <> old.nome) then
    raise exception 'O centro Principal deve permanecer ativo e com este nome.';
  end if;
  return new;
end;
$$;

create or replace function public.recalcular_faturamento_apos_receita_de_centro()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total numeric;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.centro_custo_id is not null then
    select coalesce(sum(valor), 0) into v_total
    from public.faturamentos_entradas
    where empresa_id = old.empresa_id and ano = old.ano and mes = old.mes and coalesce(status, '') <> 'prevista';
    insert into public.faturamentos (empresa_id, ano, mes, valor, referencia_total_mensal)
    values (old.empresa_id, old.ano, old.mes, v_total, false)
    on conflict (empresa_id, ano, mes) do update set valor = excluded.valor, referencia_total_mensal = false;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.centro_custo_id is not null then
    select coalesce(sum(valor), 0) into v_total
    from public.faturamentos_entradas
    where empresa_id = new.empresa_id and ano = new.ano and mes = new.mes and coalesce(status, '') <> 'prevista';
    insert into public.faturamentos (empresa_id, ano, mes, valor, referencia_total_mensal)
    values (new.empresa_id, new.ano, new.mes, v_total, false)
    on conflict (empresa_id, ano, mes) do update set valor = excluded.valor, referencia_total_mensal = false;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
