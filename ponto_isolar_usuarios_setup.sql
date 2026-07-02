-- ─────────────────────────────────────────────────────────────
-- ISOLAR FUNCIONÁRIO DE PONTO DO SISTEMA (reforço no banco / RLS)
--
-- Funcionários do Controle de Ponto (usuarios_empresa.perfil =
-- 'funcionario_ponto') NÃO são usuários do sistema. Este script:
--   1) Faz as RPCs de login/listagem ignorarem esse perfil.
--   2) Ajusta as políticas RLS das tabelas do sistema para NÃO
--      concederem acesso a esse perfil (defesa no próprio banco,
--      mesmo que alguém chame a API diretamente).
--
-- MANTÉM intacto o que o funcionário precisa em /ponto:
--   empresas (nome), ponto_config (geofence), ponto_funcionarios,
--   ponto_registros e push_subscriptions — NÃO são tocados aqui.
--
-- Rode o script inteiro no SQL Editor do Supabase. É idempotente e
-- não altera o comportamento de gestor/administrador/operador.
-- 'is distinct from' preserva linhas com perfil NULL (não quebra).
-- ─────────────────────────────────────────────────────────────


-- ══ 1. RPCs ══════════════════════════════════════════════════

-- Login por usuário: não resolve o e-mail de funcionário de ponto.
create or replace function public.buscar_email_por_login_rpc(p_login text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_email text;
begin
  select ue.email
  into v_email
  from public.usuarios_empresa ue
  where lower(ue.login) = lower(trim(p_login))
    and ue.status = 'ativo'
    and ue.perfil is distinct from 'funcionario_ponto'
  order by ue.criado_em asc
  limit 1;
  return v_email;
end;
$function$;

-- Lista de usuários da empresa: oculta funcionários de ponto.
create or replace function public.listar_usuarios_empresa_rpc(p_empresa_id uuid)
 returns table(id uuid, empresa_id uuid, user_id uuid, nome text, email text, perfil text, status text, criado_em timestamp with time zone, atualizado_em timestamp with time zone)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not exists (
    select 1
    from public.usuarios_empresa ue
    where ue.empresa_id = p_empresa_id
      and ue.user_id = auth.uid()
      and ue.status = 'ativo'
      and ue.perfil in ('gestor_master', 'administrador')
  ) then
    raise exception 'Usuário sem permissão para listar acessos.';
  end if;

  return query
  select
    ue.id, ue.empresa_id, ue.user_id, ue.nome, ue.email,
    ue.perfil, ue.status, ue.criado_em, ue.atualizado_em
  from public.usuarios_empresa ue
  where ue.empresa_id = p_empresa_id
    and ue.perfil is distinct from 'funcionario_ponto'
  order by ue.criado_em asc;
end;
$function$;


-- ══ 2. RLS — tabelas financeiras (SELECT via usuarios_empresa) ══

alter policy "configuracoes_select_usuario_vinculado" on public.configuracoes
  using (exists (select 1 from public.usuarios_empresa ue
    where ue.empresa_id = configuracoes.empresa_id
      and ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil is distinct from 'funcionario_ponto'));

alter policy "despesas_cadastradas_select_usuario_vinculado" on public.despesas_cadastradas
  using (exists (select 1 from public.usuarios_empresa ue
    where ue.empresa_id = despesas_cadastradas.empresa_id
      and ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil is distinct from 'funcionario_ponto'));

alter policy "faturamentos_select_usuario_vinculado" on public.faturamentos
  using (exists (select 1 from public.usuarios_empresa ue
    where ue.empresa_id = faturamentos.empresa_id
      and ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil is distinct from 'funcionario_ponto'));

alter policy "lancamentos_select_usuario_vinculado" on public.lancamentos
  using (exists (select 1 from public.usuarios_empresa ue
    where ue.empresa_id = lancamentos.empresa_id
      and ue.user_id = auth.uid() and ue.status = 'ativo'
      and ue.perfil is distinct from 'funcionario_ponto'));


-- ══ 3. RLS — faturamentos_entradas (SELECT/UPDATE/DELETE) ══════

alter policy "Usuarios autenticados podem ver entradas da propria empresa" on public.faturamentos_entradas
  using (exists (select 1 from public.usuarios_empresa ue
    where ue.empresa_id = faturamentos_entradas.empresa_id
      and ue.user_id = auth.uid()
      and coalesce(ue.status, 'ativo') = 'ativo'
      and ue.perfil is distinct from 'funcionario_ponto'));

alter policy "Usuarios autenticados podem atualizar entradas da propria empresa" on public.faturamentos_entradas
  using (exists (select 1 from public.usuarios_empresa ue
    where ue.empresa_id = faturamentos_entradas.empresa_id
      and ue.user_id = auth.uid()
      and coalesce(ue.status, 'ativo') = 'ativo'
      and ue.perfil is distinct from 'funcionario_ponto'))
  with check (exists (select 1 from public.usuarios_empresa ue
    where ue.empresa_id = faturamentos_entradas.empresa_id
      and ue.user_id = auth.uid()
      and coalesce(ue.status, 'ativo') = 'ativo'
      and ue.perfil is distinct from 'funcionario_ponto'));

alter policy "Usuarios autenticados podem excluir entradas da propria empresa" on public.faturamentos_entradas
  using (exists (select 1 from public.usuarios_empresa ue
    where ue.empresa_id = faturamentos_entradas.empresa_id
      and ue.user_id = auth.uid()
      and coalesce(ue.status, 'ativo') = 'ativo'
      and ue.perfil is distinct from 'funcionario_ponto'));


-- ══ 4. RLS — recorrencias (SELECT/UPDATE/DELETE) ══════════════

alter policy "recorrencias_select" on public.recorrencias
  using (empresa_id in (select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'));

alter policy "recorrencias_update" on public.recorrencias
  using (empresa_id in (select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'))
  with check (empresa_id in (select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'));

alter policy "recorrencias_delete" on public.recorrencias
  using (empresa_id in (select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'));


-- ══ 5. RLS — empresa_modulos (SELECT/UPDATE/DELETE) ═══════════

alter policy "empresa_modulos_select" on public.empresa_modulos
  using (empresa_id in (select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'));

alter policy "empresa_modulos_update" on public.empresa_modulos
  using (empresa_id in (select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'))
  with check (empresa_id in (select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'));

alter policy "empresa_modulos_delete" on public.empresa_modulos
  using (empresa_id in (select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'));


-- ══ 6. RLS — notificacoes (SELECT/UPDATE/DELETE) ══════════════
-- Mantém as notificações do próprio usuário; bloqueia as da empresa
-- (user_id IS NULL) para funcionário de ponto.

alter policy "notificacoes_select" on public.notificacoes
  using ((user_id = auth.uid()) or ((user_id is null) and (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'))));

alter policy "notificacoes_update" on public.notificacoes
  using ((user_id = auth.uid()) or ((user_id is null) and (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'))))
  with check ((user_id = auth.uid()) or ((user_id is null) and (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'))));

alter policy "notificacoes_delete" on public.notificacoes
  using ((user_id = auth.uid()) or ((user_id is null) and (empresa_id in (
    select ue.empresa_id from public.usuarios_empresa ue
    where ue.user_id = auth.uid() and ue.perfil is distinct from 'funcionario_ponto'))));


-- ══ 7. RLS — feedbacks (SELECT) ═══════════════════════════════

alter policy "Usuários autenticados podem ver feedbacks da própria empresa" on public.feedbacks
  using (exists (select 1 from public.usuarios_empresa ue
    where ue.empresa_id = feedbacks.empresa_id
      and ue.user_id = auth.uid()
      and ue.perfil is distinct from 'funcionario_ponto'));


-- ══ 8. Verificação (opcional) ═════════════════════════════════
-- Confere se ainda restou alguma policy sobre usuarios_empresa
-- (singular) sem o filtro de funcionario_ponto nas tabelas do
-- sistema. 'empresas', 'ponto_*' ficam de fora de propósito.
--
-- select tablename, policyname
-- from pg_policies
-- where schemaname = 'public'
--   and qual ilike '%usuarios_empresa%'
--   and qual not ilike '%funcionario_ponto%'
--   and tablename not in ('empresas','ponto_config','ponto_funcionarios','ponto_registros')
-- order by tablename, policyname;
