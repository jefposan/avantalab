-- Suspende o Vendas Mobile quando o módulo é removido da empresa.
-- A leitura permanece disponível para recuperação/backup dos dados, mas toda
-- gravação operacional é bloqueada até que o gestor master reinstale o módulo.

create or replace function public.vendas_mobile_modulo_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.vendas_mobile_acessos acesso
      join public.empresa_modulos modulo
        on modulo.empresa_id = acesso.empresa_id
       and modulo.modulo_id = 'vendas_mobile'
       and modulo.ativo = true
     where acesso.user_id = auth.uid()
       and acesso.status = 'ativo'
  );
$$;

create or replace function public.modulo_vendas_mobile_ativo_rpc(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.vendas_mobile_acessos acesso
      join public.empresa_modulos modulo
        on modulo.empresa_id = acesso.empresa_id
       and modulo.modulo_id = 'vendas_mobile'
       and modulo.ativo = true
     where acesso.user_id = auth.uid()
       and acesso.empresa_id = p_empresa_id
       and acesso.status = 'ativo'
  );
$$;

revoke all on function public.vendas_mobile_modulo_ativo() from public;
revoke all on function public.modulo_vendas_mobile_ativo_rpc(uuid) from public;
grant execute on function public.vendas_mobile_modulo_ativo() to authenticated;
grant execute on function public.modulo_vendas_mobile_ativo_rpc(uuid) to authenticated;

-- Produtos: leitura liberada; alterações somente com módulo ativo.
drop policy if exists vendas_mobile_produtos_own on public.vendas_mobile_produtos;
create policy vendas_mobile_produtos_select on public.vendas_mobile_produtos
  for select to authenticated using (user_id = auth.uid());
create policy vendas_mobile_produtos_insert on public.vendas_mobile_produtos
  for insert to authenticated with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_produtos_update on public.vendas_mobile_produtos
  for update to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo())
  with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_produtos_delete on public.vendas_mobile_produtos
  for delete to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());

-- Clientes.
drop policy if exists vendas_mobile_clientes_own on public.vendas_mobile_clientes;
create policy vendas_mobile_clientes_select on public.vendas_mobile_clientes
  for select to authenticated using (user_id = auth.uid());
create policy vendas_mobile_clientes_insert on public.vendas_mobile_clientes
  for insert to authenticated with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_clientes_update on public.vendas_mobile_clientes
  for update to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo())
  with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_clientes_delete on public.vendas_mobile_clientes
  for delete to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());

-- Pedidos e itens.
drop policy if exists vendas_mobile_pedidos_own on public.vendas_mobile_pedidos;
create policy vendas_mobile_pedidos_select on public.vendas_mobile_pedidos
  for select to authenticated using (user_id = auth.uid());
create policy vendas_mobile_pedidos_insert on public.vendas_mobile_pedidos
  for insert to authenticated with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_pedidos_update on public.vendas_mobile_pedidos
  for update to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo())
  with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_pedidos_delete on public.vendas_mobile_pedidos
  for delete to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());

drop policy if exists vendas_mobile_pedido_itens_own on public.vendas_mobile_pedido_itens;
create policy vendas_mobile_pedido_itens_select on public.vendas_mobile_pedido_itens
  for select to authenticated using (
    exists (select 1 from public.vendas_mobile_pedidos pedido where pedido.id = pedido_id and pedido.user_id = auth.uid())
  );
create policy vendas_mobile_pedido_itens_insert on public.vendas_mobile_pedido_itens
  for insert to authenticated with check (
    public.vendas_mobile_modulo_ativo()
    and exists (select 1 from public.vendas_mobile_pedidos pedido where pedido.id = pedido_id and pedido.user_id = auth.uid())
  );
create policy vendas_mobile_pedido_itens_update on public.vendas_mobile_pedido_itens
  for update to authenticated using (
    public.vendas_mobile_modulo_ativo()
    and exists (select 1 from public.vendas_mobile_pedidos pedido where pedido.id = pedido_id and pedido.user_id = auth.uid())
  ) with check (
    public.vendas_mobile_modulo_ativo()
    and exists (select 1 from public.vendas_mobile_pedidos pedido where pedido.id = pedido_id and pedido.user_id = auth.uid())
  );
create policy vendas_mobile_pedido_itens_delete on public.vendas_mobile_pedido_itens
  for delete to authenticated using (
    public.vendas_mobile_modulo_ativo()
    and exists (select 1 from public.vendas_mobile_pedidos pedido where pedido.id = pedido_id and pedido.user_id = auth.uid())
  );

-- Pagamentos.
drop policy if exists vendas_mobile_pagamentos_own on public.vendas_mobile_pagamentos;
create policy vendas_mobile_pagamentos_select on public.vendas_mobile_pagamentos
  for select to authenticated using (user_id = auth.uid());
create policy vendas_mobile_pagamentos_insert on public.vendas_mobile_pagamentos
  for insert to authenticated with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_pagamentos_update on public.vendas_mobile_pagamentos
  for update to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo())
  with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_pagamentos_delete on public.vendas_mobile_pagamentos
  for delete to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());

-- Agenda e importações.
drop policy if exists vendas_mobile_agenda_own on public.vendas_mobile_agenda;
create policy vendas_mobile_agenda_select on public.vendas_mobile_agenda
  for select to authenticated using (user_id = auth.uid());
create policy vendas_mobile_agenda_insert on public.vendas_mobile_agenda
  for insert to authenticated with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_agenda_update on public.vendas_mobile_agenda
  for update to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo())
  with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_agenda_delete on public.vendas_mobile_agenda
  for delete to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());

drop policy if exists vendas_mobile_importacoes_own on public.vendas_mobile_importacoes;
create policy vendas_mobile_importacoes_select on public.vendas_mobile_importacoes
  for select to authenticated using (user_id = auth.uid());
create policy vendas_mobile_importacoes_insert on public.vendas_mobile_importacoes
  for insert to authenticated with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_importacoes_update on public.vendas_mobile_importacoes
  for update to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo())
  with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_importacoes_delete on public.vendas_mobile_importacoes
  for delete to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());

-- Pacotes próprios continuam legíveis para consistência do catálogo, mas não
-- podem ser criados, alterados ou excluídos durante a suspensão.
drop policy if exists vendas_mobile_pacotes_own on public.vendas_mobile_pacotes;
create policy vendas_mobile_pacotes_insert on public.vendas_mobile_pacotes
  for insert to authenticated with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_pacotes_update on public.vendas_mobile_pacotes
  for update to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo())
  with check (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());
create policy vendas_mobile_pacotes_delete on public.vendas_mobile_pacotes
  for delete to authenticated using (user_id = auth.uid() and public.vendas_mobile_modulo_ativo());

-- Uploads também são gravações operacionais.
drop policy if exists "vendas_produtos_inserir_imagem_propria" on storage.objects;
create policy "vendas_produtos_inserir_imagem_propria" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'vendas-produtos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.vendas_mobile_modulo_ativo()
  );
drop policy if exists "vendas_produtos_atualizar_imagem_propria" on storage.objects;
create policy "vendas_produtos_atualizar_imagem_propria" on storage.objects
  for update to authenticated using (
    bucket_id = 'vendas-produtos' and owner_id = auth.uid()::text and public.vendas_mobile_modulo_ativo()
  ) with check (
    bucket_id = 'vendas-produtos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.vendas_mobile_modulo_ativo()
  );
drop policy if exists "vendas_produtos_excluir_imagem_propria" on storage.objects;
create policy "vendas_produtos_excluir_imagem_propria" on storage.objects
  for delete to authenticated using (
    bucket_id = 'vendas-produtos' and owner_id = auth.uid()::text and public.vendas_mobile_modulo_ativo()
  );
