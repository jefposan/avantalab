-- Aplicar antes da publicação do código. Mantém o acesso legado: NULL = todos.
begin;
alter table public.usuarios_empresa add column if not exists dashboard_liberada boolean not null default true;
alter table public.usuarios_empresa add column if not exists modulos_liberados text[] default null;
alter table public.usuarios_empresa add column if not exists areas_alteradas_por uuid;
alter table public.usuarios_empresa add constraint usuario_areas_conhecidas check (
  modulos_liberados is null or modulos_liberados <@ array['ponto','vendas_mobile','recebimentos_presencial','projetos','custos','vendas','marketplaces']::text[]
);
alter table public.usuarios_empresa add constraint usuario_master_dashboard check (perfil <> 'gestor_master' or dashboard_liberada);
alter table public.usuarios_empresa add constraint usuario_area_minima check (dashboard_liberada or coalesce(cardinality(modulos_liberados),0) > 0);

create table public.usuario_areas_auditoria (
  id bigint generated always as identity primary key,
  acesso_id uuid not null,
  empresa_id uuid not null references public.empresas(id),
  autor_id uuid,
  anterior jsonb,
  atual jsonb not null,
  criado_em timestamptz not null default now()
);
alter table public.usuario_areas_auditoria enable row level security;

create or replace function public.usuario_area_liberada(p_empresa uuid, p_area text, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from usuarios_empresa u where u.empresa_id=p_empresa and u.user_id=p_user and u.status='ativo'
    and (u.perfil='gestor_master' or case when p_area='dashboard' then u.dashboard_liberada else u.modulos_liberados is null or p_area=any(u.modulos_liberados) end));
$$;
revoke all on function public.usuario_area_liberada(uuid,text,uuid) from public;
grant execute on function public.usuario_area_liberada(uuid,text,uuid) to authenticated,service_role;

-- Não concede acesso: acrescenta uma restrição aos contratos RLS existentes.
-- Preserva colaboradores de Ponto, contas AvantaVendas e projetos compartilhados.
create or replace function public.usuario_area_restricao(p_empresa uuid, p_area text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select not exists(select 1 from usuarios_empresa u where u.empresa_id=p_empresa and u.user_id=auth.uid() and u.status='ativo' and u.perfil<>'funcionario_ponto')
    or public.usuario_area_liberada(p_empresa,p_area);
$$;
revoke all on function public.usuario_area_restricao(uuid,text) from public;
grant execute on function public.usuario_area_restricao(uuid,text) to authenticated,service_role;

create or replace function public.usuario_areas_validar_e_auditar()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare autor uuid := auth.uid();
begin
  if tg_op='UPDATE' and new.perfil is distinct from old.perfil and coalesce(auth.role(),'')<>'service_role' and autor is not null then
    if not exists(select 1 from usuarios_empresa u where u.empresa_id=old.empresa_id and u.user_id=autor and u.status='ativo' and u.perfil='gestor_master' and u.dashboard_liberada) then
      raise exception 'Somente o Gestor Master pode alterar o papel.' using errcode='42501';
    end if;
  end if;
  if tg_op='UPDATE' and new.perfil is not distinct from old.perfil and new.dashboard_liberada is not distinct from old.dashboard_liberada and new.modulos_liberados is not distinct from old.modulos_liberados then return new; end if;
  -- Escrita do navegador é negada mesmo que uma policy legada permita editar o vínculo.
  if coalesce(auth.role(),'') <> 'service_role' and autor is not null and not (tg_op='INSERT' and new.dashboard_liberada and new.modulos_liberados is null) then
    raise exception 'Liberações são alteradas somente pela administração de usuários.' using errcode='42501';
  end if;
  if new.perfil='gestor_master' then new.dashboard_liberada:=true; new.modulos_liberados:=null; end if;
  insert into usuario_areas_auditoria(acesso_id,empresa_id,autor_id,anterior,atual)
    values(new.id,new.empresa_id,coalesce(autor,new.areas_alteradas_por),case when tg_op='UPDATE' then jsonb_build_object('dashboard',old.dashboard_liberada,'modulos',old.modulos_liberados) else null end,jsonb_build_object('dashboard',new.dashboard_liberada,'modulos',new.modulos_liberados));
  return new;
end $$;
create trigger usuario_areas_validar before insert or update of perfil,dashboard_liberada,modulos_liberados on public.usuarios_empresa for each row execute function public.usuario_areas_validar_e_auditar();

-- Todas as tabelas de empresa com RLS recebem a fronteira adicional.
-- Tabelas neutras de identidade/instalação mantêm o contrato existente.
do $$ declare t record; area text; begin
  for t in select c.relname,a.attname from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity and a.attname in ('empresa_id','company_id') and a.atttypid='uuid'::regtype and not a.attisdropped
      and c.relname not in ('usuarios_empresa','empresa_modulos','sessoes_acesso_perfil','usuario_areas_auditoria','notificacoes','push_subscriptions')
  loop
    area := case when t.relname like 'marketplace%' then 'marketplaces' when t.relname like 'projetos%' then 'projetos' when t.relname like 'custos%' then 'custos'
      when t.relname like 'ponto%' or t.relname like 'rep_p%' then 'ponto' when t.relname like 'recebimentos%' then 'recebimentos_presencial'
      when t.relname like 'vendas_mobile%' or t.relname like 'vendas_divulgacao%' then 'vendas_mobile'
      when t.relname like 'vendas_%' then 'vendas' when t.relname like 'module_%' then 'vendas' else 'dashboard' end;
    execute format('create policy usuario_area_limite on public.%I as restrictive for all to authenticated using (public.usuario_area_restricao(%I,%L)) with check (public.usuario_area_restricao(%I,%L))',t.relname,t.attname,area,t.attname,area);
  end loop;
end $$;

-- Notas financeiras no Storage usam empresa_id como primeira pasta.
do $$ begin
  if to_regclass('storage.objects') is not null then
    execute $policy$create policy usuario_area_limite on storage.objects as restrictive for all to authenticated
      using (case when bucket_id='notas-lancamentos' then case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then public.usuario_area_restricao(split_part(name,'/',1)::uuid,'dashboard') else false end else true end)
      with check (case when bucket_id='notas-lancamentos' then case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then public.usuario_area_restricao(split_part(name,'/',1)::uuid,'dashboard') else false end else true end)$policy$;
  end if;
end $$;

-- RPCs SECURITY DEFINER não passam pelo RLS: adiciona a mesma checagem ao
-- início das funções PL/pgSQL empresariais existentes, preservando assinatura.
create or replace function public.usuario_area_rpc_restricao(p_area text,p_args jsonb)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare empresa uuid; alvo record; valor text;
begin
  empresa:=coalesce(p_args->>'p_empresa_id',p_args->>'p_company_id',p_args->>'p_empresa')::uuid;
  if empresa is not null then return public.usuario_area_restricao(empresa,p_area); end if;
  for alvo in select * from (values
    ('p_lancamento_id',case when p_area='recebimentos_presencial' then 'recebimentos_lancamentos' else 'lancamentos' end),
    ('p_ponto_id','pontos_restauracao'),('p_recorrencia_id','recorrencias'),
    ('p_centro_id','centros_custo'),('p_centro_custo_id','centros_custo'),
    ('p_acesso_id','usuarios_empresa'),('p_catalogo_id','vendas_mobile_catalogos')
  ) as ids(parametro,tabela)
  loop
    valor:=p_args->>alvo.parametro;
    if valor is not null and to_regclass('public.'||alvo.tabela) is not null then
      execute format('select empresa_id from public.%I where id=$1',alvo.tabela) into empresa using valor::uuid;
      if empresa is not null then return public.usuario_area_restricao(empresa,p_area); end if;
    end if;
  end loop;
  -- Um identificador ausente não herda direitos de outra empresa.
  return not exists(select 1 from usuarios_empresa u where u.user_id=auth.uid() and u.status='ativo' and u.perfil<>'funcionario_ponto' and not public.usuario_area_liberada(u.empresa_id,p_area));
end $$;
revoke all on function public.usuario_area_rpc_restricao(text,jsonb) from public;
grant execute on function public.usuario_area_rpc_restricao(text,jsonb) to authenticated,service_role;

create table public.usuario_areas_rpc_backup (assinatura text primary key, definicao text not null);
alter table public.usuario_areas_rpc_backup enable row level security;
revoke all on public.usuario_areas_rpc_backup from public,anon,authenticated;
do $$ declare f record; area text; definition text; args text; begin
  for f in select p.oid,p.proname,p.proargnames,p.proargtypes,pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
    where n.nspname='public' and l.lanname='plpgsql' and p.prosecdef and p.prorettype<>'trigger'::regtype
      and p.proargnames && array['p_empresa_id','p_company_id','p_empresa','p_lancamento_id','p_ponto_id','p_recorrencia_id','p_centro_id','p_centro_custo_id','p_acesso_id','p_catalogo_id']::text[]
      and p.proname not like 'usuario_area%' and p.proname not in ('listar_perfis_excluidos_para_usuario','registrar_sessao_acesso_perfil')
  loop
    select string_agg(format('%L,%I',name,name),',') into args from unnest(f.proargnames) with ordinality as names(name,ordinal) where f.proargtypes[ordinal::int-1]='uuid'::regtype;
    if args is null then continue; end if;
    area := case when f.proname like 'marketplace%' then 'marketplaces' when f.proname like 'projetos%' then 'projetos' when f.proname like 'custos%' then 'custos'
      when f.proname like 'ponto%' or f.proname like 'rep_p%' then 'ponto' when f.proname like 'recebimentos%' then 'recebimentos_presencial'
      when f.proname like '%vendas_mobile%' or f.proname like '%divulgacao%' or f.proname like '%catalogo%' then 'vendas_mobile'
      when f.proname like 'vendas_%' then 'vendas' else 'dashboard' end;
    insert into usuario_areas_rpc_backup values(f.oid::regprocedure::text,f.definition);
    definition := regexp_replace(f.definition,'\mBEGIN\M',format('BEGIN IF auth.uid() IS NOT NULL AND NOT public.usuario_area_rpc_restricao(%L,jsonb_build_object(%s)) THEN RAISE EXCEPTION ''Esta área não foi liberada.'' USING ERRCODE=''42501''; END IF;',area,args),'i');
    execute definition;
  end loop;
end $$;
commit;
