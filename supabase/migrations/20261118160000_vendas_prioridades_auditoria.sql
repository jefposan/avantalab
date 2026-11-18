begin;
-- Política comercial independente da matriz fiscal. Sem alteração de tributos.
create table fiscal_private.commercial_policies (
 company_id uuid primary key references public.empresas(id) on delete cascade,
 max_discount_percent numeric(5,2) not null default 15 check(max_discount_percent between 0 and 100),
 version integer not null default 1 check(version>0),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table fiscal_private.commercial_policies enable row level security;
revoke all on fiscal_private.commercial_policies from public,anon,authenticated;
-- Mantém unicidade e CPF numérico; CNPJ aceita a especificação alfanumérica.
alter table public.vendas_clientes drop constraint vendas_clientes_documento_check;
alter table public.vendas_clientes add constraint vendas_clientes_documento_check check (
 ((documento_tipo='cpf' and documento ~ '^[0-9]{11}$' and tipo_pessoa='fisica') or
 (documento_tipo='cnpj' and documento ~ '^[0-9A-Z]{12}[0-9]{2}$' and tipo_pessoa='juridica'))
) ;
alter table public.vendas_fornecedores drop constraint vendas_fornecedores_documento_check;
alter table public.vendas_fornecedores add constraint vendas_fornecedores_documento_check check (
 documento is null or (documento ~ '^[0-9A-Z]{12}[0-9]{2}$' and documento !~ '^(.)\1{13}$')
);
alter table public.cadastros_perfil drop constraint cadastros_perfil_check;
alter table public.cadastros_perfil add constraint cadastros_perfil_check check (
 documento is null or (tipo_documento='cpf' and documento ~ '^[0-9]{11}$') or
 (tipo_documento='cnpj' and documento ~ '^[0-9A-Z]{12}[0-9]{2}$')
);
commit;
