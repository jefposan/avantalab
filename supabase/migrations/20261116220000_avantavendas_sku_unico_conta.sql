-- Proteção atômica para cadastro, edição, importação e sincronização.
-- Não apaga nem reescreve produtos, vendas, itens ou comprovantes existentes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Se existir conflito legado, parar sem alterar qualquer registro.
do $$
begin
  if exists (
    select 1 from public.vendas_mobile_produtos
    where conta_id is not null and nullif(btrim(sku), '') is not null
    group by conta_id, upper(btrim(sku)) having count(*) > 1
  ) then
    raise exception 'Existem SKUs repetidos nesta conta. Revise os cadastros antes de ativar a proteção.';
  end if;
end $$;

create unique index if not exists vendas_mobile_produtos_conta_sku_unico
  on public.vendas_mobile_produtos (conta_id, upper(btrim(sku)))
  where conta_id is not null and nullif(btrim(sku), '') is not null;

comment on index public.vendas_mobile_produtos_conta_sku_unico is
  'SKU único por conta AvantaVendas, inclusive inativos. Vazio permitido; zeros e pontuação preservados. Sem alteração do histórico.';
commit;
