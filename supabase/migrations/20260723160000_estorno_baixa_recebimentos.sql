-- Estorno de baixa administrativa: desfaz também a forma de pagamento
-- registrada na confirmação e devolve a cobrança ao fluxo aberto.

create or replace function public.recebimentos_estornar(p_lancamento_id uuid, p_motivo text)
returns public.recebimentos_lancamentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lancamento public.recebimentos_lancamentos;
  v_snapshot jsonb;
begin
  if nullif(trim(p_motivo), '') is null then raise exception 'Informe o motivo do estorno.'; end if;

  select * into v_lancamento
  from public.recebimentos_lancamentos
  where id = p_lancamento_id
  for update;

  if v_lancamento.id is null then raise exception 'Lançamento não encontrado.'; end if;
  if not public.recebimentos_pode_gerir(v_lancamento.empresa_id) then raise exception 'Acesso negado.'; end if;
  if v_lancamento.situacao <> 'baixado' then raise exception 'Somente recebimentos baixados podem ser estornados por esta ação.'; end if;

  v_snapshot := to_jsonb(v_lancamento);

  update public.recebimentos_lancamentos
  set situacao = case when vencimento < (now() at time zone 'America/Sao_Paulo')::date then 'em_atraso' else 'previsto' end,
      valor_recebido = null,
      colaborador_user_id = null,
      recebido_em = null,
      forma_pagamento = null,
      baixado_por = null,
      baixado_em = null,
      observacao = 'Estornado: ' || trim(p_motivo),
      atualizado_em = now()
  where id = p_lancamento_id
  returning * into v_lancamento;

  insert into public.recebimentos_eventos (lancamento_id, tipo, por, motivo, snapshot)
  values (v_lancamento.id, 'estornado', auth.uid(), trim(p_motivo), v_snapshot);

  return v_lancamento;
end;
$$;
