-- Clientes podem ser cadastrados antes da definição comercial do valor.
-- Sem valor, a recorrência é mantida como configuração, mas não gera cobranças.

alter table public.recebimentos_subempresas
  alter column valor_combinado drop not null;

alter table public.recebimentos_subempresas
  drop constraint if exists recebimentos_subempresas_valor_combinado_check;

alter table public.recebimentos_subempresas
  add constraint recebimentos_subempresas_valor_combinado_check
  check (valor_combinado is null or valor_combinado > 0);

create or replace function public.recebimentos_ignorar_previsao_sem_valor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.recorrencia_gerada and new.valor_combinado is null then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists recebimentos_ignorar_previsao_sem_valor_trigger on public.recebimentos_lancamentos;
create trigger recebimentos_ignorar_previsao_sem_valor_trigger
before insert on public.recebimentos_lancamentos
for each row execute function public.recebimentos_ignorar_previsao_sem_valor();

revoke all on function public.recebimentos_ignorar_previsao_sem_valor() from public, authenticated;
