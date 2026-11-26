-- Uma única chave por empresa, exclusiva de Vendas e Serviços.
-- Desligar e religar não altera saldos, mínimos, reservas ou histórico.
alter table public.empresas add column if not exists vendas_estoque_controle_ativo boolean not null default true;
comment on column public.empresas.vendas_estoque_controle_ativo is 'Controle geral de estoque da empresa somente em Vendas e Serviços; dados anteriores preservados ao desligar.';
