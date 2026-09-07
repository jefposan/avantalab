-- Credencial técnica dedicada ao runtime server-side de Vendas.
-- Sem herança de service_role e sem BYPASSRLS: o próprio banco limita o papel
-- ao piloto Tridium. A senha não é persistida nesta migration.
begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'avanta_vendas_runtime') then
    create role avanta_vendas_runtime
      login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end
$$;

grant usage on schema public, fiscal_private to avanta_vendas_runtime;

grant select on public.empresas, public.usuarios_empresa, public.empresa_modulos,
  public.module_role_permission_overrides, public.module_user_permission_overrides,
  public.vendas_mobile_catalogos, public.vendas_mobile_catalogo_produtos,
  public.custos_tabelas_preco, public.custos_tabela_preco_itens,
  public.cadastros_perfil to avanta_vendas_runtime;

grant select,insert,update on public.vendas_clientes, public.vendas_cliente_contatos,
  public.vendas_sequencias, public.vendas_operacoes, public.vendas_operacao_itens,
  public.vendas_ordens_servico, public.vendas_os_materiais, public.vendas_os_checklist,
  public.vendas_os_anexos, public.vendas_estoque_locais, public.vendas_estoque_saldos,
  public.vendas_estoque_reservas, public.vendas_inventarios,
  public.vendas_inventario_itens, public.vendas_contas_receber,
  public.vendas_fiscal_configuracoes to avanta_vendas_runtime;
grant delete on public.vendas_cliente_contatos, public.vendas_operacao_itens,
  public.vendas_os_materiais, public.vendas_os_checklist, public.vendas_os_anexos
  to avanta_vendas_runtime;
grant select,insert on public.vendas_estoque_movimentos,
  public.vendas_contas_receber_eventos, public.vendas_fiscal_rascunhos,
  public.vendas_eventos to avanta_vendas_runtime;
grant usage,select on sequence public.vendas_eventos_id_seq to avanta_vendas_runtime;

grant select,insert,update on fiscal_private.emissions,
  fiscal_private.number_sequences, fiscal_private.number_voids,
  fiscal_private.number_reservations, fiscal_private.certificates
  to avanta_vendas_runtime;
grant select,insert on fiscal_private.artifacts,
  fiscal_private.transmission_attempts, fiscal_private.events,
  fiscal_private.operations, fiscal_private.certificate_events,
  fiscal_private.recovery_jobs, fiscal_private.artifact_retention_events,
  fiscal_private.artifact_access_events,
  fiscal_private.emission_corrections to avanta_vendas_runtime;
grant usage,select on all sequences in schema fiscal_private to avanta_vendas_runtime;

do $$
declare item record;
begin
  for item in select * from (values
    ('public','empresas','id'), ('public','usuarios_empresa','empresa_id'),
    ('public','empresa_modulos','empresa_id'),
    ('public','module_role_permission_overrides','company_id'),
    ('public','module_user_permission_overrides','company_id'),
    ('public','vendas_mobile_catalogos','empresa_id'),
    ('public','custos_tabelas_preco','empresa_id'), ('public','cadastros_perfil','empresa_id'),
    ('public','vendas_clientes','empresa_id'), ('public','vendas_cliente_contatos','empresa_id'),
    ('public','vendas_sequencias','empresa_id'), ('public','vendas_operacoes','empresa_id'),
    ('public','vendas_operacao_itens','empresa_id'), ('public','vendas_ordens_servico','empresa_id'),
    ('public','vendas_os_materiais','empresa_id'), ('public','vendas_os_checklist','empresa_id'),
    ('public','vendas_os_anexos','empresa_id'), ('public','vendas_estoque_locais','empresa_id'),
    ('public','vendas_estoque_saldos','empresa_id'), ('public','vendas_estoque_reservas','empresa_id'),
    ('public','vendas_estoque_movimentos','empresa_id'), ('public','vendas_inventarios','empresa_id'),
    ('public','vendas_inventario_itens','empresa_id'), ('public','vendas_contas_receber','empresa_id'),
    ('public','vendas_contas_receber_eventos','empresa_id'),
    ('public','vendas_fiscal_configuracoes','empresa_id'),
    ('public','vendas_fiscal_rascunhos','empresa_id'), ('public','vendas_eventos','empresa_id'),
    ('fiscal_private','emissions','company_id'), ('fiscal_private','number_sequences','company_id'),
    ('fiscal_private','number_voids','company_id'), ('fiscal_private','number_reservations','company_id'),
    ('fiscal_private','artifacts','company_id'), ('fiscal_private','transmission_attempts','company_id'),
    ('fiscal_private','events','company_id'), ('fiscal_private','operations','company_id'),
    ('fiscal_private','certificates','company_id'), ('fiscal_private','certificate_events','company_id'),
    ('fiscal_private','recovery_jobs','company_id'),
    ('fiscal_private','artifact_retention_events','company_id'),
    ('fiscal_private','artifact_access_events','company_id'),
    ('fiscal_private','emission_corrections','company_id')
  ) as scoped(schema_name, table_name, tenant_column)
  loop
    execute format('drop policy if exists vendas_runtime_tridium on %I.%I', item.schema_name, item.table_name);
    execute format(
      'create policy vendas_runtime_tridium on %I.%I for all to avanta_vendas_runtime using (%I = %L::uuid) with check (%I = %L::uuid)',
      item.schema_name, item.table_name, item.tenant_column,
      'ec9604fd-38f2-429b-9c00-c4bc6c642b0e', item.tenant_column,
      'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'
    );
  end loop;
end
$$;

drop policy if exists vendas_runtime_tridium on public.vendas_mobile_catalogo_produtos;
create policy vendas_runtime_tridium on public.vendas_mobile_catalogo_produtos
for select to avanta_vendas_runtime using (exists (
  select 1 from public.vendas_mobile_catalogos catalogo
  where catalogo.id = catalogo_id
    and catalogo.empresa_id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid
));

drop policy if exists vendas_runtime_tridium on public.custos_tabela_preco_itens;
create policy vendas_runtime_tridium on public.custos_tabela_preco_itens
for select to avanta_vendas_runtime using (exists (
  select 1 from public.custos_tabelas_preco tabela
  where tabela.id = tabela_preco_id
    and tabela.empresa_id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid
));

create or replace function public.vendas_definir_senha_runtime(p_password text)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  if p_password is null or length(p_password) < 48 then
    raise exception 'A credencial do runtime deve possuir ao menos 48 caracteres.';
  end if;
  execute format('alter role avanta_vendas_runtime password %L', p_password);
end;
$$;

revoke all on function public.vendas_definir_senha_runtime(text) from public, anon, authenticated;
grant execute on function public.vendas_definir_senha_runtime(text) to service_role;

comment on role avanta_vendas_runtime is
  'Runtime Vendas: menor privilégio, limitado por RLS ao piloto Tridium.';

commit;
