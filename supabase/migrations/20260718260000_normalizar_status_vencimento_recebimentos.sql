-- Garante que somente cobranças realmente vencidas possam permanecer com o
-- status em_atraso. A data local de São Paulo é a referência operacional do
-- módulo, inclusive durante inserções, estornos e sincronizações.

create or replace function public.recebimentos_normalizar_status_vencimento()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if new.valor_recebido is null and new.situacao in ('previsto', 'em_atraso') then
    new.situacao := case when new.vencimento < v_hoje then 'em_atraso' else 'previsto' end;
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_normalizar_status_vencimento_trg
  on public.recebimentos_lancamentos;

create trigger recebimentos_normalizar_status_vencimento_trg
before insert or update of vencimento, valor_recebido, situacao
on public.recebimentos_lancamentos
for each row execute function public.recebimentos_normalizar_status_vencimento();

-- Repara qualquer estado inconsistente anterior sem alterar cobranças já
-- recebidas, conferidas, devolvidas ou baixadas.
update public.recebimentos_lancamentos
set situacao = case
    when vencimento < (now() at time zone 'America/Sao_Paulo')::date then 'em_atraso'
    else 'previsto'
  end,
  atualizado_em = now()
where valor_recebido is null
  and situacao in ('previsto', 'em_atraso');
