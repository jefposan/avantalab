do $$
begin
  if to_regclass('public.caixinhas_movimentos') is not null then
    alter table public.caixinhas_movimentos
      drop constraint if exists caixinhas_movimentos_tipo_check;

    alter table public.caixinhas_movimentos
      add constraint caixinhas_movimentos_tipo_check
      check (tipo in ('saldo_inicial', 'aporte', 'resgate', 'rendimento', 'ajuste'));
  end if;
end $$;

create unique index if not exists caixinhas_movimentos_saldo_inicial_uidx
  on public.caixinhas_movimentos (empresa_id)
  where tipo = 'saldo_inicial';
