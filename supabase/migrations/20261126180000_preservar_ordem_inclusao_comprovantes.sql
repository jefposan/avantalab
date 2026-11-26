begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Sem backfill: conserva a referência original disponível quando o legado
-- for editado. Meio-dia da interface antiga não é hora real de inclusão.
create or replace function public.preservar_ordem_inclusao_comprovantes_vendas()
returns trigger language plpgsql set search_path = public as $$
declare
  v_meta jsonb;
  v_data_comercial boolean;
begin
  if tg_table_name = 'vendas_mobile_pagamentos' then
    new.criado_em := old.criado_em;
  else
    new.registrado_em := old.registrado_em;
    begin
      v_meta := coalesce(old.observacoes::jsonb, '{}'::jsonb);
    exception when invalid_text_representation then
      v_meta := '{}'::jsonb;
    end;
    v_data_comercial := coalesce(v_meta ->> 'avantalab_pedido', '') = 'true' and not (v_meta ? 'origem_migracao');
    if old.registrado_em is null and old.criado_em is not null
      and not v_data_comercial
      and (old.criado_em at time zone 'America/Sao_Paulo')::time <> time '12:00:00' then
      new.registrado_em := old.criado_em;
    end if;
  end if;
  return new;
end;
$$;

-- O nome zz garante a execução após o preservador do retrato financeiro,
-- que continua inalterado e protegido. Sem mudança de permissões ou RLS.
drop trigger if exists zz_vendas_mobile_pedidos_ordem_inclusao on public.vendas_mobile_pedidos;
create trigger zz_vendas_mobile_pedidos_ordem_inclusao
before update on public.vendas_mobile_pedidos for each row
execute function public.preservar_ordem_inclusao_comprovantes_vendas();
drop trigger if exists zz_vendas_mobile_pagamentos_ordem_inclusao on public.vendas_mobile_pagamentos;
create trigger zz_vendas_mobile_pagamentos_ordem_inclusao
before update on public.vendas_mobile_pagamentos for each row
execute function public.preservar_ordem_inclusao_comprovantes_vendas();
revoke all on function public.preservar_ordem_inclusao_comprovantes_vendas() from public, anon, authenticated;
commit;
