alter table public.importador_despesas_rascunhos
  add column if not exists ano integer,
  add column if not exists mes text;

update public.importador_despesas_rascunhos
set ano = coalesce((dados->>'anoDestino')::integer, extract(year from atualizado_em)::integer),
    mes = coalesce(nullif(dados->>'mesDestino', ''), 'LEGADO')
where ano is null or mes is null;

alter table public.importador_despesas_rascunhos
  alter column ano set not null,
  alter column mes set not null;

alter table public.importador_despesas_rascunhos
  drop constraint if exists importador_despesas_rascunhos_pkey;

alter table public.importador_despesas_rascunhos
  add primary key (empresa_id, usuario_id, ano, mes);
