-- AvantaLab — status de despesas previstas (Previsto / A confirmar / Não ocorreu)
-- Rode no SQL Editor do Supabase ANTES de publicar o app.
-- Sem esta coluna, o lançamento de despesa vai falhar (o insert envia "status").

alter table public.lancamentos
  add column if not exists status text;

comment on column public.lancamentos.status is
  'null = despesa realizada normal; prevista = lançada para data futura aguardando a data/confirmação; confirmada = confirmada pelo usuário; cancelada = não ocorreu (fora do total).';
