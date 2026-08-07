-- AvantaProjetos / Mapa de Projetos — migration PREPARATÓRIA.
-- NÃO APLICAR AUTOMATICAMENTE. Revisar em ambiente isolado antes de mover para
-- supabase/migrations. Este arquivo permanece dentro do módulo de experimento.

begin;

create extension if not exists pgcrypto;

create or replace function public.projetos_tem_vinculo_empresa(
  p_empresa_id uuid,
  p_perfis text[] default null
) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.empresa_id = p_empresa_id
      and acesso.user_id = auth.uid()
      and acesso.status = 'ativo'
      and (p_perfis is null or acesso.perfil = any(p_perfis))
  );
$$;

revoke all on function public.projetos_tem_vinculo_empresa(uuid, text[]) from public;
grant execute on function public.projetos_tem_vinculo_empresa(uuid, text[]) to authenticated;

create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  nome text not null check (char_length(trim(nome)) between 1 and 120),
  descricao text not null default '' check (char_length(descricao) <= 5000),
  cor text not null default '#0A1F44' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  icone text not null default '◇' check (char_length(icone) <= 12),
  status text not null default 'planejado' check (status in ('ideia','planejado','em_andamento','aguardando','concluido','cancelado')),
  favorito boolean not null default false,
  data_inicio date not null default current_date,
  data_fim date,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  constraint projetos_datas_validas check (data_fim is null or data_fim >= data_inicio),
  unique (id, empresa_id)
);

create table public.projeto_membros (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  empresa_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  papel text not null default 'participante' check (papel in ('responsavel','participante','observador')),
  created_at timestamptz not null default now(),
  foreign key (projeto_id, empresa_id) references public.projetos(id, empresa_id) on delete cascade,
  unique (projeto_id, user_id)
);

create table public.projeto_nos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  empresa_id uuid not null,
  parent_id uuid,
  tipo text not null default 'ideia' check (tipo in ('projeto','etapa','tarefa','marco','ideia','observacao')),
  titulo text not null check (char_length(trim(titulo)) between 1 and 180),
  descricao text not null default '' check (char_length(descricao) <= 10000),
  posicao_x double precision not null default 0,
  posicao_y double precision not null default 0,
  largura double precision not null default 224 check (largura between 120 and 800),
  altura double precision not null default 112 check (altura between 60 and 800),
  cor text not null default '#1F8A9E' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  icone text not null default '◇' check (char_length(icone) <= 12),
  status text not null default 'ideia' check (status in ('ideia','planejado','em_andamento','aguardando','concluido','cancelado')),
  prioridade text not null default 'sem_prioridade' check (prioridade in ('sem_prioridade','baixa','normal','alta','urgente')),
  data_inicio date,
  data_fim date,
  progresso smallint not null default 0 check (progresso between 0 and 100),
  recolhido boolean not null default false,
  ordem integer not null default 0,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (projeto_id, empresa_id) references public.projetos(id, empresa_id) on delete cascade,
  foreign key (parent_id, projeto_id, empresa_id) references public.projeto_nos(id, projeto_id, empresa_id) on delete restrict,
  unique (id, projeto_id, empresa_id),
  constraint projeto_nos_datas_validas check (data_fim is null or data_inicio is null or data_fim >= data_inicio)
);

create table public.projeto_conexoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  empresa_id uuid not null,
  source_node_id uuid not null,
  target_node_id uuid not null,
  tipo text not null check (tipo in ('hierarquica','livre')),
  rotulo text not null default '' check (char_length(rotulo) <= 80),
  estilo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (projeto_id, empresa_id) references public.projetos(id, empresa_id) on delete cascade,
  foreign key (source_node_id, projeto_id, empresa_id) references public.projeto_nos(id, projeto_id, empresa_id) on delete cascade,
  foreign key (target_node_id, projeto_id, empresa_id) references public.projeto_nos(id, projeto_id, empresa_id) on delete cascade,
  constraint projeto_conexoes_nos_distintos check (source_node_id <> target_node_id),
  unique (projeto_id, source_node_id, target_node_id, tipo)
);

create unique index projeto_conexoes_alvo_hierarquico_unico
  on public.projeto_conexoes(projeto_id, target_node_id)
  where tipo = 'hierarquica';

create table public.projeto_responsaveis (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  node_id uuid not null,
  empresa_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (node_id, projeto_id, empresa_id) references public.projeto_nos(id, projeto_id, empresa_id) on delete cascade,
  unique (node_id, user_id)
);

create table public.projeto_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  node_id uuid not null,
  empresa_id uuid not null,
  titulo text not null check (char_length(trim(titulo)) between 1 and 180),
  concluido boolean not null default false,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (node_id, projeto_id, empresa_id) references public.projeto_nos(id, projeto_id, empresa_id) on delete cascade
);

create table public.projeto_comentarios (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  node_id uuid not null,
  empresa_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  conteudo text not null check (char_length(trim(conteudo)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (node_id, projeto_id, empresa_id) references public.projeto_nos(id, projeto_id, empresa_id) on delete cascade
);

create table public.projeto_etiquetas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 40),
  cor text not null default '#1F8A9E' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (empresa_id, nome),
  unique (id, empresa_id)
);

create table public.projeto_nos_etiquetas (
  node_id uuid not null,
  projeto_id uuid not null,
  etiqueta_id uuid not null,
  empresa_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (node_id, etiqueta_id),
  foreign key (node_id, projeto_id, empresa_id) references public.projeto_nos(id, projeto_id, empresa_id) on delete cascade,
  foreign key (etiqueta_id, empresa_id) references public.projeto_etiquetas(id, empresa_id) on delete cascade
);

create table public.projeto_atividades (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  node_id uuid,
  empresa_id uuid not null,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  acao text not null check (char_length(acao) between 1 and 80),
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (projeto_id, empresa_id) references public.projetos(id, empresa_id) on delete cascade,
  foreign key (node_id, projeto_id, empresa_id) references public.projeto_nos(id, projeto_id, empresa_id) on delete set null (node_id)
);

create index projetos_empresa_updated_idx on public.projetos(empresa_id, updated_at desc) where deleted_at is null;
create index projeto_membros_empresa_usuario_idx on public.projeto_membros(empresa_id, user_id, projeto_id);
create index projeto_nos_projeto_parent_idx on public.projeto_nos(projeto_id, parent_id, ordem) where deleted_at is null;
create index projeto_nos_empresa_status_idx on public.projeto_nos(empresa_id, status, data_fim) where deleted_at is null;
create index projeto_conexoes_projeto_idx on public.projeto_conexoes(projeto_id, source_node_id, target_node_id);
create index projeto_responsaveis_usuario_idx on public.projeto_responsaveis(empresa_id, user_id, projeto_id);
create index projeto_atividades_projeto_idx on public.projeto_atividades(projeto_id, created_at desc);

create or replace function public.projetos_pode_acessar(p_projeto_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projetos p
    join public.usuarios_empresa ue on ue.empresa_id = p.empresa_id
    where p.id = p_projeto_id and p.deleted_at is null
      and ue.user_id = auth.uid() and ue.status = 'ativo'
      and (
        ue.perfil in ('gestor_master','administrador','operador_completo')
        or p.criado_por = auth.uid()
        or exists (select 1 from public.projeto_membros m where m.projeto_id = p.id and m.user_id = auth.uid())
      )
  );
$$;

create or replace function public.projetos_pode_editar(p_projeto_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projetos p
    join public.usuarios_empresa ue on ue.empresa_id = p.empresa_id
    where p.id = p_projeto_id and p.deleted_at is null
      and ue.user_id = auth.uid() and ue.status = 'ativo'
      and (
        ue.perfil in ('gestor_master','administrador','operador_completo')
        or (ue.perfil = 'operador_simples' and exists (
          select 1 from public.projeto_membros m where m.projeto_id = p.id and m.user_id = auth.uid() and m.papel <> 'observador'
        ))
      )
  );
$$;

revoke all on function public.projetos_pode_acessar(uuid) from public;
revoke all on function public.projetos_pode_editar(uuid) from public;
grant execute on function public.projetos_pode_acessar(uuid), public.projetos_pode_editar(uuid) to authenticated;

alter table public.projetos enable row level security;
alter table public.projeto_membros enable row level security;
alter table public.projeto_nos enable row level security;
alter table public.projeto_conexoes enable row level security;
alter table public.projeto_responsaveis enable row level security;
alter table public.projeto_checklist_itens enable row level security;
alter table public.projeto_comentarios enable row level security;
alter table public.projeto_etiquetas enable row level security;
alter table public.projeto_nos_etiquetas enable row level security;
alter table public.projeto_atividades enable row level security;

create policy projetos_select on public.projetos for select to authenticated using (public.projetos_pode_acessar(id));
create policy projetos_insert on public.projetos for insert to authenticated with check (
  criado_por = auth.uid() and public.projetos_tem_vinculo_empresa(empresa_id, array['gestor_master','administrador','operador_completo'])
);
create policy projetos_update on public.projetos for update to authenticated
  using (public.projetos_pode_editar(id))
  with check (public.projetos_pode_editar(id) and empresa_id = (select p.empresa_id from public.projetos p where p.id = projetos.id));
create policy projetos_delete_master on public.projetos for delete to authenticated using (
  public.projetos_tem_vinculo_empresa(empresa_id, array['gestor_master'])
);

create policy projeto_membros_select on public.projeto_membros for select to authenticated using (public.projetos_pode_acessar(projeto_id));
create policy projeto_membros_gestao on public.projeto_membros for all to authenticated
  using (public.projetos_tem_vinculo_empresa(empresa_id, array['gestor_master','administrador']))
  with check (public.projetos_tem_vinculo_empresa(empresa_id, array['gestor_master','administrador']));

create policy projeto_nos_select on public.projeto_nos for select to authenticated using (public.projetos_pode_acessar(projeto_id));
create policy projeto_nos_write on public.projeto_nos for all to authenticated
  using (public.projetos_pode_editar(projeto_id)) with check (public.projetos_pode_editar(projeto_id));
create policy projeto_conexoes_select on public.projeto_conexoes for select to authenticated using (public.projetos_pode_acessar(projeto_id));
create policy projeto_conexoes_write on public.projeto_conexoes for all to authenticated
  using (public.projetos_pode_editar(projeto_id)) with check (public.projetos_pode_editar(projeto_id));
create policy projeto_responsaveis_select on public.projeto_responsaveis for select to authenticated using (public.projetos_pode_acessar(projeto_id));
create policy projeto_responsaveis_write on public.projeto_responsaveis for all to authenticated
  using (public.projetos_pode_editar(projeto_id)) with check (public.projetos_pode_editar(projeto_id));
create policy projeto_checklist_select on public.projeto_checklist_itens for select to authenticated using (public.projetos_pode_acessar(projeto_id));
create policy projeto_checklist_write on public.projeto_checklist_itens for all to authenticated
  using (public.projetos_pode_editar(projeto_id)) with check (public.projetos_pode_editar(projeto_id));
create policy projeto_comentarios_select on public.projeto_comentarios for select to authenticated using (public.projetos_pode_acessar(projeto_id));
create policy projeto_comentarios_insert on public.projeto_comentarios for insert to authenticated
  with check (user_id = auth.uid() and public.projetos_pode_editar(projeto_id));
create policy projeto_comentarios_update_proprio on public.projeto_comentarios for update to authenticated
  using (user_id = auth.uid() and public.projetos_pode_editar(projeto_id))
  with check (user_id = auth.uid() and public.projetos_pode_editar(projeto_id));
create policy projeto_comentarios_delete_proprio on public.projeto_comentarios for delete to authenticated
  using (user_id = auth.uid() or public.projetos_tem_vinculo_empresa(empresa_id, array['gestor_master','administrador']));
create policy projeto_etiquetas_select on public.projeto_etiquetas for select to authenticated using (public.projetos_tem_vinculo_empresa(empresa_id));
create policy projeto_etiquetas_write on public.projeto_etiquetas for all to authenticated
  using (public.projetos_tem_vinculo_empresa(empresa_id, array['gestor_master','administrador','operador_completo']))
  with check (public.projetos_tem_vinculo_empresa(empresa_id, array['gestor_master','administrador','operador_completo']));
create policy projeto_nos_etiquetas_select on public.projeto_nos_etiquetas for select to authenticated using (public.projetos_pode_acessar(projeto_id));
create policy projeto_nos_etiquetas_write on public.projeto_nos_etiquetas for all to authenticated
  using (public.projetos_pode_editar(projeto_id)) with check (public.projetos_pode_editar(projeto_id));
create policy projeto_atividades_select on public.projeto_atividades for select to authenticated using (public.projetos_pode_acessar(projeto_id));
-- atividades são criadas exclusivamente por triggers/funções do servidor.

create or replace function public.projetos_atualizar_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger projetos_updated_at before update on public.projetos for each row execute function public.projetos_atualizar_updated_at();
create trigger projeto_nos_updated_at before update on public.projeto_nos for each row execute function public.projetos_atualizar_updated_at();
create trigger projeto_conexoes_updated_at before update on public.projeto_conexoes for each row execute function public.projetos_atualizar_updated_at();
create trigger projeto_checklist_updated_at before update on public.projeto_checklist_itens for each row execute function public.projetos_atualizar_updated_at();
create trigger projeto_comentarios_updated_at before update on public.projeto_comentarios for each row execute function public.projetos_atualizar_updated_at();

create or replace function public.projetos_impedir_troca_de_escopo()
returns trigger language plpgsql set search_path = '' as $$
begin
  if to_jsonb(old)->>'empresa_id' is distinct from to_jsonb(new)->>'empresa_id'
     or (to_jsonb(old) ? 'projeto_id' and to_jsonb(old)->>'projeto_id' is distinct from to_jsonb(new)->>'projeto_id') then
    raise exception 'empresa_id e projeto_id são imutáveis.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger projetos_escopo_imutavel before update on public.projetos for each row execute function public.projetos_impedir_troca_de_escopo();
create trigger projeto_membros_escopo_imutavel before update on public.projeto_membros for each row execute function public.projetos_impedir_troca_de_escopo();
create trigger projeto_nos_escopo_imutavel before update on public.projeto_nos for each row execute function public.projetos_impedir_troca_de_escopo();
create trigger projeto_conexoes_escopo_imutavel before update on public.projeto_conexoes for each row execute function public.projetos_impedir_troca_de_escopo();
create trigger projeto_responsaveis_escopo_imutavel before update on public.projeto_responsaveis for each row execute function public.projetos_impedir_troca_de_escopo();
create trigger projeto_checklist_escopo_imutavel before update on public.projeto_checklist_itens for each row execute function public.projetos_impedir_troca_de_escopo();
create trigger projeto_comentarios_escopo_imutavel before update on public.projeto_comentarios for each row execute function public.projetos_impedir_troca_de_escopo();
create trigger projeto_nos_etiquetas_escopo_imutavel before update on public.projeto_nos_etiquetas for each row execute function public.projetos_impedir_troca_de_escopo();

create or replace function public.projetos_registrar_atividade()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_dados jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_projeto_id uuid;
  v_empresa_id uuid;
  v_node_id uuid;
begin
  v_projeto_id := case when tg_table_name = 'projetos' then (v_dados->>'id')::uuid else (v_dados->>'projeto_id')::uuid end;
  v_empresa_id := (v_dados->>'empresa_id')::uuid;
  v_node_id := case
    when tg_op = 'DELETE' then null
    when tg_table_name = 'projeto_nos' then (v_dados->>'id')::uuid
    when v_dados ? 'node_id' and nullif(v_dados->>'node_id','') is not null then (v_dados->>'node_id')::uuid
    else null
  end;
  insert into public.projeto_atividades(projeto_id, node_id, empresa_id, user_id, acao, dados)
  values (
    v_projeto_id, v_node_id, v_empresa_id, auth.uid(),
    lower(tg_op) || ':' || tg_table_name,
    jsonb_build_object('registro_id', v_dados->>'id', 'tabela', tg_table_name)
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger projetos_auditoria after insert or update on public.projetos for each row execute function public.projetos_registrar_atividade();
create trigger projeto_nos_auditoria after insert or update or delete on public.projeto_nos for each row execute function public.projetos_registrar_atividade();
create trigger projeto_conexoes_auditoria after insert or update or delete on public.projeto_conexoes for each row execute function public.projetos_registrar_atividade();
create trigger projeto_checklist_auditoria after insert or update or delete on public.projeto_checklist_itens for each row execute function public.projetos_registrar_atividade();
create trigger projeto_comentarios_auditoria after insert or update or delete on public.projeto_comentarios for each row execute function public.projetos_registrar_atividade();

create or replace function public.projetos_impedir_ciclo_hierarquico()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_tem_ciclo boolean;
begin
  if new.tipo <> 'hierarquica' then return new; end if;
  with recursive descendentes(id) as (
    select new.target_node_id
    union all
    select c.target_node_id
    from public.projeto_conexoes c
    join descendentes d on c.source_node_id = d.id
    where c.projeto_id = new.projeto_id and c.tipo = 'hierarquica' and c.id <> new.id
  ) select exists(select 1 from descendentes where id = new.source_node_id) into v_tem_ciclo;
  if v_tem_ciclo then raise exception 'A conexão hierárquica criaria um ciclo.' using errcode = '23514'; end if;
  return new;
end;
$$;

create trigger projeto_conexoes_sem_ciclo before insert or update on public.projeto_conexoes
for each row execute function public.projetos_impedir_ciclo_hierarquico();

grant select, insert, update, delete on public.projetos, public.projeto_membros, public.projeto_nos,
  public.projeto_conexoes, public.projeto_responsaveis, public.projeto_checklist_itens,
  public.projeto_comentarios, public.projeto_etiquetas, public.projeto_nos_etiquetas to authenticated;
grant select on public.projeto_atividades to authenticated;

commit;

-- Estratégia de recuperação antes da integração oficial:
-- 1. exportar/validar backup das tabelas projeto_*;
-- 2. remover políticas e triggers acima;
-- 3. remover tabelas na ordem inversa das dependências;
-- 4. remover funções projetos_* somente após confirmar ausência de chamadas.
