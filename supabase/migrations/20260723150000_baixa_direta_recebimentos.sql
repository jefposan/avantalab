-- Baixa administrativa de cobranças previstas ou em atraso, com a forma de
-- pagamento registrada no próprio lançamento.

alter table public.recebimentos_lancamentos
  add column if not exists forma_pagamento text;

alter table public.recebimentos_lancamentos
  drop constraint if exists recebimentos_lancamentos_forma_pagamento_check;

alter table public.recebimentos_lancamentos
  add constraint recebimentos_lancamentos_forma_pagamento_check
  check (forma_pagamento is null or forma_pagamento in (
    'dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto'
  ));

create or replace function public.recebimentos_baixar(
  p_lancamento_id uuid,
  p_motivo text,
  p_forma_pagamento text
)
returns public.recebimentos_lancamentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lancamento public.recebimentos_lancamentos;
begin
  if p_forma_pagamento is not null
    and p_forma_pagamento not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto') then
    raise exception 'Informe uma forma de pagamento válida.';
  end if;

  select * into v_lancamento
  from public.recebimentos_lancamentos
  where id = p_lancamento_id
  for update;

  if v_lancamento.id is null then raise exception 'Lançamento não encontrado.'; end if;
  if not public.recebimentos_pode_gerir(v_lancamento.empresa_id) then raise exception 'Acesso negado.'; end if;

  update public.recebimentos_lancamentos
  set situacao = 'baixado',
      valor_recebido = coalesce(v_lancamento.valor_recebido, v_lancamento.valor_combinado),
      recebido_em = coalesce(v_lancamento.recebido_em, now()),
      forma_pagamento = coalesce(p_forma_pagamento, v_lancamento.forma_pagamento),
      baixado_por = auth.uid(),
      baixado_em = now(),
      atualizado_em = now()
  where id = p_lancamento_id
  returning * into v_lancamento;

  insert into public.recebimentos_eventos (lancamento_id, tipo, por, motivo, snapshot)
  values (
    v_lancamento.id,
    'baixado',
    auth.uid(),
    concat_ws(' · ', nullif(trim(p_motivo), ''), case when p_forma_pagamento is null then null else 'Forma de pagamento: ' || p_forma_pagamento end),
    to_jsonb(v_lancamento)
  );

  return v_lancamento;
end;
$$;

revoke all on function public.recebimentos_baixar(uuid, text, text) from public;
grant execute on function public.recebimentos_baixar(uuid, text, text) to authenticated;
