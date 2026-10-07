begin;

-- Protege também a reorganização atômica de parcelas. Não migra registros
-- antigos, não altera valores/tipos e nunca efetiva uma previsão pela passagem
-- do tempo. A aplicação continua responsável pela confirmação do pagamento.
create or replace function public.marcar_despesa_futura_prevista()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_mes integer;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if new.status = 'cancelada' then return new; end if;
  v_mes := array_position(array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'], upper(new.mes));
  if v_mes is not null and new.ano is not null and new.dia is not null
    and (new.ano, v_mes, new.dia) > (extract(year from v_hoje)::integer, extract(month from v_hoje)::integer, extract(day from v_hoje)::integer) then
    new.status := 'prevista';
  end if;
  return new;
end;
$$;

revoke all on function public.marcar_despesa_futura_prevista() from public, anon, authenticated;
drop trigger if exists despesa_futura_prevista on public.lancamentos;
create trigger despesa_futura_prevista
before insert or update of ano, mes, dia, status on public.lancamentos
for each row execute function public.marcar_despesa_futura_prevista();

commit;
