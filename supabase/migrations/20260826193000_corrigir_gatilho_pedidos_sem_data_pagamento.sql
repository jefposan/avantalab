-- Corrige o gatilho compartilhado de pedidos e pagamentos. Em PL/pgSQL, uma
-- expressão CASE única tenta resolver todos os campos do record NEW; ao salvar
-- um pedido, NEW não possui data_pagamento. Ramos IF separados são compilados
-- somente para a tabela correspondente e preservam o vínculo financeiro.
create or replace function public.preencher_empresa_lancamento_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data date;
begin
  perform public.aplicar_troca_financeira_pendente_conta_vendas_mobile(new.conta_id);

  if tg_table_name = 'vendas_mobile_pagamentos' then
    v_data := coalesce(new.data_pagamento, current_date);
  else
    v_data := coalesce(
      (new.criado_em at time zone 'America/Sao_Paulo')::date,
      current_date
    );
  end if;

  if new.empresa_id is null then
    new.empresa_id := public.empresa_financeira_efetiva_conta_vendas_mobile(
      new.conta_id,
      new.user_id,
      v_data
    );
  end if;

  return new;
end;
$$;
