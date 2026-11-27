-- Não altera lançamentos existentes. Novas despesas parceladas permanecem previstas.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $migration$
declare
  assinatura regprocedure := 'public.aplicar_movimento_financeiro_mobile_rpc(uuid,uuid,text,text,jsonb,uuid)'::regprocedure;
  definicao text;
  anterior text := 'v_futuro := coalesce((p_dados->>''prevista'')::boolean,false) and v_total=1;';
  nova text := 'v_futuro := coalesce((p_dados->>''prevista'')::boolean,false) or (p_tipo=''despesa'' and v_total>1);';
begin
  select pg_get_functiondef(assinatura) into definicao;
  if position(nova in definicao)>0 then return; end if;
  if position(anterior in definicao)=0 then
    raise exception 'Contrato de movimentos Mobile mudou; revisar antes de aplicar confirmação de despesas.';
  end if;
  execute replace(definicao,anterior,nova);
end;
$migration$;
commit;
