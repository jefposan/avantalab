-- Configuração exclusiva do controle de estoque em Vendas e Serviços.
-- Preserva saldos, reservas, histórico e o comportamento atual por padrão.
alter table public.empresas add column if not exists vendas_estoque_controle_ativo boolean not null default true;
alter table public.vendas_estoque_saldos add column if not exists controle_ativo boolean not null default true;
comment on column public.empresas.vendas_estoque_controle_ativo is 'Controle geral de estoque da empresa somente em Vendas e Serviços.';
comment on column public.vendas_estoque_saldos.controle_ativo is 'Controle individual preservando saldo físico, reservas e histórico.';
