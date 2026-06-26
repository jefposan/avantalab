-- ─────────────────────────────────────────────────────────────
-- DESPESAS: tipo de observacao (previsto / fixa / parcela) + vinculo com recorrencia
-- Rode este script inteiro no SQL Editor do painel do Supabase.
-- ─────────────────────────────────────────────────────────────

-- tipo_obs: rotulo/observacao da despesa exibido como badge.
--   'previsto' = lancamento avulso com data futura (pede confirmacao na data)
--   'fixa'     = despesa recorrente do mes (pede confirmacao na data)
--   'parcela'  = parcela de um parcelamento (valor e data definidos; NAO pede confirmacao)
--   NULL       = despesa normal
alter table public.lancamentos
  add column if not exists tipo_obs text;

-- recorrencia_id: vincula o lancamento gerado a sua despesa fixa (idempotencia da geracao mensal).
alter table public.lancamentos
  add column if not exists recorrencia_id uuid references public.recorrencias(id) on delete set null;

create index if not exists lancamentos_recorrencia_idx
  on public.lancamentos(recorrencia_id);

-- Evita duplicar a fixa do mesmo mes/ano para a mesma recorrencia.
create unique index if not exists lancamentos_fixa_mes_uidx
  on public.lancamentos(recorrencia_id, ano, mes)
  where recorrencia_id is not null;
