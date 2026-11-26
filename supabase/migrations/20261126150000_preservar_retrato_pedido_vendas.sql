begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
-- Não reescreve lançamentos antigos nem inventa horários de inclusão legados.
alter table public.vendas_mobile_pedidos
  add column if not exists registrado_em timestamptz;

create or replace function public.preservar_retrato_pedido_vendas_mobile()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_antigo jsonb;
  v_novo jsonb;
  v_debito numeric;
  v_credito numeric;
begin
  if tg_op = 'INSERT' then
    new.registrado_em := clock_timestamp();
    return new;
  end if;
  -- Independente da data comercial e das futuras edições/reentregas da fila.
  new.registrado_em := old.registrado_em;
  if old.conta_id is distinct from new.conta_id
    or old.cliente_id is distinct from new.cliente_id
    or lower(coalesce(old.forma_pagamento, '')) like '%consign%'
    or lower(coalesce(new.forma_pagamento, '')) like '%consign%' then
    return new;
  end if;
  begin
    v_antigo := old.observacoes::jsonb;
    v_novo := new.observacoes::jsonb;
  exception when invalid_text_representation then
    return new;
  end;
  -- Texto livre e pedidos legados sem retrato permanecem intactos.
  if jsonb_typeof(v_antigo) is distinct from 'object'
    or jsonb_typeof(v_novo) is distinct from 'object'
    or not (v_antigo ? 'saldo_anterior' and v_antigo ? 'saldo_final') then
    return new;
  end if;
  begin
    v_debito := (v_antigo ->> 'saldo_anterior')::numeric;
    v_credito := coalesce((v_antigo ->> 'credito_anterior')::numeric, greatest(0, -v_debito));
    -- Compatibilidade com o mesmo crédito inferível no comprovante legado.
    if not (v_antigo ? 'credito_anterior') and v_debito = 0
      and (v_antigo ->> 'saldo_final')::numeric > 0 then
      v_credito := greatest(0, round(old.total - (v_antigo ->> 'saldo_final')::numeric, 2));
    end if;
    if v_debito is null or v_credito is null
      or v_debito::text in ('NaN', 'Infinity', '-Infinity')
      or v_credito::text in ('NaN', 'Infinity', '-Infinity') then
      return new;
    end if;
  exception when invalid_text_representation or numeric_value_out_of_range then
    return new;
  end;
  if not (v_antigo ? 'credito_anterior') and v_debito = 0
    and (v_antigo ->> 'saldo_final')::numeric = 0 and old.total > 0 then
    if new.total is distinct from old.total then
      raise exception 'O crédito original deste pedido antigo precisa ser conferido antes de alterar seu valor.';
    end if;
    new.observacoes := ((v_novo || jsonb_build_object('saldo_anterior', 0, 'saldo_final', 0)) - 'credito_anterior')::text;
    return new;
  end if;
  -- Só o total do próprio pedido pode mudar seu saldo final; nenhum outro
  -- pedido/pagamento, inclusive de outra conta, participa desta preservação.
  new.observacoes := (v_novo || jsonb_build_object(
    'saldo_anterior', greatest(0, v_debito),
    'credito_anterior', greatest(0, v_credito, -v_debito),
    'saldo_final', greatest(0, greatest(0, v_debito) - greatest(0, v_credito, -v_debito) + coalesce(new.total, 0))
  ))::text;
  return new;
end;
$$;

drop trigger if exists vendas_mobile_pedidos_preservar_retrato on public.vendas_mobile_pedidos;
create trigger vendas_mobile_pedidos_preservar_retrato
before insert or update on public.vendas_mobile_pedidos
for each row execute function public.preservar_retrato_pedido_vendas_mobile();

revoke all on function public.preservar_retrato_pedido_vendas_mobile() from public, anon, authenticated;
commit;
