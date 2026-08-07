-- Exclusão de perfil com período de arrependimento.
-- O login Auth nunca é removido por este fluxo: somente o perfil financeiro
-- fica indisponível e pode ser restaurado pelo mesmo usuário em até 30 dias.

alter table public.empresas add column if not exists excluido_em timestamptz;
alter table public.empresas add column if not exists excluido_por uuid references auth.users(id) on delete set null;
alter table public.empresas add column if not exists purga_programada_em timestamptz;
create index if not exists empresas_purga_programada_idx
  on public.empresas (purga_programada_em)
  where excluido_em is not null;

create table if not exists public.perfis_excluidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  nome_perfil text not null,
  excluido_em timestamptz not null default now(),
  restaurar_ate timestamptz not null,
  restaurado_em timestamptz,
  retencao_legal boolean not null default false,
  detalhes_restritos text,
  vinculo_snapshot jsonb not null,
  acessos_vendas_snapshot jsonb not null default '[]'::jsonb,
  perfis_financeiros_snapshot jsonb not null default '[]'::jsonb
);
create index if not exists perfis_excluidos_usuario_prazo_idx
  on public.perfis_excluidos (user_id, restaurar_ate)
  where restaurado_em is null;
alter table public.perfis_excluidos enable row level security;

-- Corrige o gatilho de ponto: cada tipo de registro só acessa as colunas que
-- realmente existem nele. A versão anterior podia tentar OLD.empresa_id em
-- uma linha de empresas, interrompendo qualquer exclusão antes da regra real.
create or replace function public.ponto_impedir_exclusao_historico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'ponto_registros' then
    raise exception 'Registros de ponto não podem ser excluídos.';
  end if;

  if tg_table_name = 'ponto_funcionarios' then
    if exists (
      select 1 from public.ponto_registros
      where empresa_id = old.empresa_id and user_id = old.user_id
    ) then
      raise exception 'Não é permitido excluir funcionário com histórico de ponto.';
    end if;
  end if;

  if tg_table_name = 'usuarios_empresa' then
    if old.perfil = 'funcionario_ponto' and exists (
      select 1 from public.ponto_registros
      where empresa_id = old.empresa_id and user_id = old.user_id
    ) then
      raise exception 'Não é permitido excluir o vínculo de funcionário com histórico de ponto.';
    end if;
  end if;

  if tg_table_name = 'empresas' then
    if exists (select 1 from public.ponto_registros where empresa_id = old.id) then
      raise exception 'Não é permitido excluir empresa com histórico de ponto.';
    end if;
  end if;

  return old;
end;
$$;

create or replace function public.excluir_perfil_com_retencao(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_confirmacao text
)
returns table(nome_perfil text, restaurar_ate timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa public.empresas;
  v_vinculo jsonb;
  v_outros_ativos integer;
  v_prazo timestamptz := now() + interval '30 days';
  v_acessos_vendas jsonb := '[]'::jsonb;
  v_perfis_financeiros jsonb := '[]'::jsonb;
begin
  if upper(trim(coalesce(p_confirmacao, ''))) <> 'EXCLUIR' then
    raise exception 'Confirmação inválida.';
  end if;

  select * into v_empresa from public.empresas where id = p_empresa_id for update;
  if not found then raise exception 'Perfil não encontrado.'; end if;
  if v_empresa.excluido_em is not null then raise exception 'Este perfil já está em processo de exclusão.'; end if;

  select to_jsonb(ue) into v_vinculo
  from public.usuarios_empresa ue
  where ue.empresa_id = p_empresa_id
    and ue.user_id = p_usuario_id
    and ue.status = 'ativo'
  for update;
  if v_vinculo is null or coalesce(v_vinculo ->> 'perfil', '') <> 'gestor_master' then
    raise exception 'Somente o Gestor Master pode excluir este perfil.';
  end if;

  select count(*) into v_outros_ativos
  from public.usuarios_empresa
  where empresa_id = p_empresa_id and status = 'ativo' and user_id <> p_usuario_id;
  if v_outros_ativos > 0 then
    raise exception 'Este perfil possui outros usuários ativos. Remova ou transfira os acessos antes de excluí-lo.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) into v_acessos_vendas
  from public.vendas_mobile_acessos a where a.empresa_id = p_empresa_id;
  select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) into v_perfis_financeiros
  from public.vendas_mobile_perfis_financeiros f where f.empresa_id = p_empresa_id;

  insert into public.perfis_excluidos (
    empresa_id, user_id, nome_perfil, restaurar_ate, vinculo_snapshot,
    acessos_vendas_snapshot, perfis_financeiros_snapshot
  ) values (
    p_empresa_id, p_usuario_id, v_empresa.nome, v_prazo, v_vinculo,
    v_acessos_vendas, v_perfis_financeiros
  ) on conflict (empresa_id) do update set
    user_id = excluded.user_id,
    nome_perfil = excluded.nome_perfil,
    excluido_em = now(),
    restaurar_ate = excluded.restaurar_ate,
    restaurado_em = null,
    retencao_legal = false,
    detalhes_restritos = null,
    vinculo_snapshot = excluded.vinculo_snapshot,
    acessos_vendas_snapshot = excluded.acessos_vendas_snapshot,
    perfis_financeiros_snapshot = excluded.perfis_financeiros_snapshot;

  update public.empresas
  set excluido_em = now(), excluido_por = p_usuario_id, purga_programada_em = v_prazo
  where id = p_empresa_id;

  -- O perfil deixa de ter qualquer porta de acesso, mas os dados permanecem
  -- intactos até a purga ou uma restauração explícita.
  delete from public.vendas_mobile_perfis_financeiros where empresa_id = p_empresa_id;
  delete from public.vendas_mobile_acessos where empresa_id = p_empresa_id;
  delete from public.usuarios_empresa where empresa_id = p_empresa_id and user_id = p_usuario_id and status = 'ativo';

  return query select v_empresa.nome, v_prazo;
end;
$$;

create or replace function public.listar_perfis_excluidos_para_usuario(p_usuario_id uuid)
returns table(empresa_id uuid, nome_perfil text, restaurar_ate timestamptz)
language sql
security definer
set search_path = public
as $$
  select empresa_id, nome_perfil, restaurar_ate
  from public.perfis_excluidos
  where user_id = p_usuario_id
    and restaurado_em is null
    and restaurar_ate > now()
  order by excluido_em desc;
$$;

create or replace function public.restaurar_perfil_excluido(p_empresa_id uuid, p_usuario_id uuid)
returns table(nome_perfil text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro public.perfis_excluidos;
begin
  select * into v_registro from public.perfis_excluidos
  where empresa_id = p_empresa_id and user_id = p_usuario_id and restaurado_em is null
  for update;
  if not found then raise exception 'Perfil excluído não encontrado para esta conta.'; end if;
  if v_registro.restaurar_ate <= now() then raise exception 'O prazo de restauração deste perfil terminou.'; end if;

  update public.empresas
  set excluido_em = null, excluido_por = null, purga_programada_em = null
  where id = p_empresa_id;

  insert into public.usuarios_empresa
  select (jsonb_populate_record(null::public.usuarios_empresa, v_registro.vinculo_snapshot)).*;

  insert into public.vendas_mobile_acessos
  select (jsonb_populate_record(null::public.vendas_mobile_acessos, item)).*
  from jsonb_array_elements(v_registro.acessos_vendas_snapshot) item
  on conflict (empresa_id, user_id) do update
    set papel = excluded.papel, status = excluded.status,
        aprovado_em = excluded.aprovado_em, aprovado_por = excluded.aprovado_por,
        atualizado_em = excluded.atualizado_em;

  insert into public.vendas_mobile_perfis_financeiros
  select (jsonb_populate_record(null::public.vendas_mobile_perfis_financeiros, item)).*
  from jsonb_array_elements(v_registro.perfis_financeiros_snapshot) item
  on conflict (user_id) do update
    set empresa_id = excluded.empresa_id, atualizado_em = excluded.atualizado_em;

  update public.perfis_excluidos set restaurado_em = now() where id = v_registro.id;
  return query select v_registro.nome_perfil;
end;
$$;

-- Esta RPC é executada exclusivamente pela função agendada após cancelar as
-- assinaturas externas aplicáveis. Histórico de ponto protegido continua
-- bloqueando a remoção física, como exigido por retenção legal.
create or replace function public.purgar_perfil_excluido(p_empresa_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_registro public.perfis_excluidos;
begin
  select * into v_registro from public.perfis_excluidos
  where empresa_id = p_empresa_id and restaurado_em is null and restaurar_ate <= now()
  for update;
  if not found then return false; end if;
  delete from public.empresas where id = p_empresa_id;
  return true;
exception when others then
  update public.perfis_excluidos
  set retencao_legal = true, detalhes_restritos = left(sqlerrm, 500)
  where empresa_id = p_empresa_id;
  return false;
end;
$$;

revoke all on function public.excluir_perfil_com_retencao(uuid,uuid,text) from public, authenticated;
revoke all on function public.listar_perfis_excluidos_para_usuario(uuid) from public, authenticated;
revoke all on function public.restaurar_perfil_excluido(uuid,uuid) from public, authenticated;
revoke all on function public.purgar_perfil_excluido(uuid) from public, authenticated;
grant execute on function public.excluir_perfil_com_retencao(uuid,uuid,text) to service_role;
grant execute on function public.listar_perfis_excluidos_para_usuario(uuid) to service_role;
grant execute on function public.restaurar_perfil_excluido(uuid,uuid) to service_role;
grant execute on function public.purgar_perfil_excluido(uuid) to service_role;

do $$ declare job_id bigint; begin
  select jobid into job_id from cron.job where jobname = 'processar-perfis-excluidos' limit 1;
  if job_id is not null then perform cron.unschedule(job_id); end if;
end $$;
select cron.schedule('processar-perfis-excluidos','20 3 * * *',$job$
  select net.http_post(
    url := 'https://qzewxhdkwettnlmkjoqd.supabase.co/functions/v1/processar-perfis-excluidos',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey',(select decrypted_secret from vault.decrypted_secrets where name='cron_edge_secret'),
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_edge_secret')
    ),
    body := '{}'::jsonb, timeout_milliseconds := 30000
  );
$job$);
