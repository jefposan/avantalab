-- A classificação tributária padrão pertence à empresa e ao seu enquadramento.
-- CFOP e natureza da operação permanecem na regra da emissão, pois variam por operação.
alter table public.cadastros_perfil
  add column if not exists configuracao_fiscal jsonb not null default '{}'::jsonb;

comment on column public.cadastros_perfil.configuracao_fiscal is
  'Parâmetros tributários padrão da empresa. NCM e unidade tributável são dados do produto; CFOP e natureza são definidos por operação na emissão.';
