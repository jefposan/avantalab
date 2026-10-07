-- Não migra estados legados: uma revogação global antiga não pode virar um
-- bloqueio permanente de perfil. O cadastro financeiro não é alterado.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.sessoes_acesso_perfil (
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  sessao_auth_id uuid not null,
  dispositivo_id text not null check (length(dispositivo_id) between 1 and 160),
  plano text not null,
  simultaneas boolean not null,
  status text not null check (status in ('ativa', 'revogada')),
  atualizado_em timestamptz not null default now(),
  revogada_em timestamptz,
  primary key (user_id, empresa_id, sessao_auth_id)
);
alter table public.sessoes_acesso_perfil enable row level security;
create policy "Usuário consulta sessões dos próprios perfis"
  on public.sessoes_acesso_perfil for select to authenticated using (user_id = auth.uid());
grant select on public.sessoes_acesso_perfil to authenticated;
grant all on public.sessoes_acesso_perfil to service_role;

-- Somente o servidor escolhe plano, usuário e sessão, após validar o JWT.
-- O lock e a transação impedem dois dispositivos de ganharem a vaga única.
create function public.avantalab_confirmar_sessao_perfil(
  p_user_id uuid, p_empresa_id uuid, p_sessao_auth_id uuid,
  p_dispositivo_id text, p_plano text, p_simultaneas boolean, p_acao text
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_status text; v_simultaneas boolean;
begin
  if p_acao not in ('entrar', 'verificar') then raise exception 'Ação inválida'; end if;
  if not exists (select 1 from public.usuarios_empresa where user_id = p_user_id
    and empresa_id = p_empresa_id and status = 'ativo') then
    raise exception 'Perfil não autorizado';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_empresa_id::text, 0));
  select status, simultaneas into v_status, v_simultaneas from public.sessoes_acesso_perfil
    where user_id = p_user_id and empresa_id = p_empresa_id and sessao_auth_id = p_sessao_auth_id;
  -- Reabrir a página, trocar o dispositivo_id ou renovar o access token não
  -- ressuscita uma sessão revogada. Só um NOVO login tem outro session_id.
  if not p_simultaneas and v_status = 'revogada' then return false; end if;
  if p_acao = 'verificar' and v_status is null then
    return p_simultaneas or not exists(select 1 from public.sessoes_acesso_perfil
      where user_id = p_user_id and empresa_id = p_empresa_id and status = 'ativa');
  end if;
  if not p_simultaneas and (p_acao = 'entrar' or v_simultaneas) then
    update public.sessoes_acesso_perfil set status = 'revogada', revogada_em = now(), atualizado_em = now()
      where user_id = p_user_id and empresa_id = p_empresa_id
        and sessao_auth_id <> p_sessao_auth_id and status = 'ativa';
  end if;
  insert into public.sessoes_acesso_perfil(user_id, empresa_id, sessao_auth_id, dispositivo_id, plano, simultaneas, status)
    values(p_user_id, p_empresa_id, p_sessao_auth_id, p_dispositivo_id, p_plano, p_simultaneas, 'ativa')
    on conflict (user_id, empresa_id, sessao_auth_id) do update
      set atualizado_em = now(), plano = excluded.plano, simultaneas = excluded.simultaneas, status = 'ativa', revogada_em = null;
  return true;
end;
$$;
revoke all on function public.avantalab_confirmar_sessao_perfil(uuid,uuid,uuid,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.avantalab_confirmar_sessao_perfil(uuid,uuid,uuid,text,text,boolean,text) to service_role;

-- Complementa (não substitui) as autorizações já existentes. Impede que uma
-- sessão revogada continue usando o JWT curto em consultas/escritas diretas.
create function public.avantalab_sessao_perfil_permitida(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select not exists (select 1 from public.sessoes_acesso_perfil
    where user_id = auth.uid() and empresa_id = p_empresa_id
      and sessao_auth_id::text = auth.jwt()->>'session_id' and status = 'revogada')
    and not exists (select 1 from public.sessoes_acesso_perfil
      where user_id = auth.uid() and empresa_id = p_empresa_id and status = 'ativa'
        and not simultaneas
        and sessao_auth_id::text <> coalesce(auth.jwt()->>'session_id', ''));
$$;
revoke all on function public.avantalab_sessao_perfil_permitida(uuid) from public, anon;
grant execute on function public.avantalab_sessao_perfil_permitida(uuid) to authenticated;
-- Aplicação restrita às tabelas financeiras da Gestão. Não altera cadastros,
-- catálogo, tributação ou faturamento comercial. Autorizações já existentes
-- continuam obrigatórias; esta barreira somente verifica a sessão do perfil.
do $$
declare v_tabela text;
begin
  foreach v_tabela in array array['lancamentos','faturamentos','faturamentos_entradas',
    'despesas_cadastradas','recorrencias','configuracoes','caixinhas','caixinhas_movimentos','centros_custo'] loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_tabela and c.relrowsecurity) then
      execute format('create policy "Sessão ativa do perfil financeiro" on public.%I as restrictive for all to authenticated using (public.avantalab_sessao_perfil_permitida(empresa_id)) with check (public.avantalab_sessao_perfil_permitida(empresa_id))', v_tabela);
    end if;
  end loop;
end $$;
commit;
