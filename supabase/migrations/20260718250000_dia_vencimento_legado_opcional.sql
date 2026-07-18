-- A recorrência substituiu o dia único de vencimento. O campo legado continua
-- preenchido quando há dia-base, mas não pode impedir semanal ou novos ciclos.
alter table public.recebimentos_subempresas
  alter column dia_vencimento drop not null;

update public.recebimentos_subempresas
set dia_vencimento = dia_mes
where dia_vencimento is null
  and dia_mes is not null;
