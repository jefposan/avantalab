-- Operador Completo pode administrar o conteúdo comercial do Vendas Mobile
-- quando o módulo já estiver instalado no perfil. Administração do módulo,
-- acessos e usuários permanece exclusiva de Gestor Master e Administrador.

drop policy if exists vendas_mobile_conteudos_empresa_insert on public.vendas_mobile_conteudos;
create policy vendas_mobile_conteudos_empresa_insert
  on public.vendas_mobile_conteudos for insert to authenticated
  with check (
    pagina = 'novidades'
    and empresa_id in (
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
    )
  );

drop policy if exists vendas_mobile_conteudos_empresa_update on public.vendas_mobile_conteudos;
create policy vendas_mobile_conteudos_empresa_update
  on public.vendas_mobile_conteudos for update to authenticated
  using (
    pagina = 'novidades'
    and empresa_id in (
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
    )
  )
  with check (
    pagina = 'novidades'
    and empresa_id in (
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
    )
  );

drop policy if exists vendas_mobile_conteudos_empresa_delete on public.vendas_mobile_conteudos;
create policy vendas_mobile_conteudos_empresa_delete
  on public.vendas_mobile_conteudos for delete to authenticated
  using (
    pagina = 'novidades'
    and empresa_id in (
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
    )
  );

drop policy if exists vendas_divulgacao_pastas_gestao on public.vendas_mobile_divulgacao_pastas;
create policy vendas_divulgacao_pastas_gestao
  on public.vendas_mobile_divulgacao_pastas for all to authenticated
  using (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
  ))
  with check (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
  ));

drop policy if exists vendas_divulgacao_materiais_gestao on public.vendas_mobile_divulgacao_materiais;
create policy vendas_divulgacao_materiais_gestao
  on public.vendas_mobile_divulgacao_materiais for all to authenticated
  using (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
  ))
  with check (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
  ));

drop policy if exists vendas_divulgacao_storage_insert on storage.objects;
create policy vendas_divulgacao_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vendas-divulgacao'
    and (storage.foldername(name))[1] in (
      select ue.empresa_id::text from public.usuarios_empresa ue
      where ue.user_id = auth.uid() and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
    )
  );

drop policy if exists vendas_divulgacao_storage_delete on storage.objects;
create policy vendas_divulgacao_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vendas-divulgacao'
    and (storage.foldername(name))[1] in (
      select ue.empresa_id::text from public.usuarios_empresa ue
      where ue.user_id = auth.uid() and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador', 'operador_completo')
    )
  );
