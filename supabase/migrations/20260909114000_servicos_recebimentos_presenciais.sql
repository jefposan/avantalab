-- Serviços executados no módulo Recebimentos Presenciais.
-- Mantém cobrança e execução independentes: nenhum lançamento financeiro é alterado.

alter table public.recebimentos_colaboradores
  add column if not exists pode_recebimentos boolean not null default true,
  add column if not exists pode_servicos boolean not null default false;

create table if not exists public.recebimentos_servicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  recebimento_empresa_id uuid not null references public.recebimentos_empresas(id) on delete cascade,
  subempresa_id uuid references public.recebimentos_subempresas(id) on delete cascade,
  data_programada date not null,
  situacao text not null default 'pendente' check (situacao in ('pendente', 'realizado', 'atrasado')),
  colaborador_user_id uuid references auth.users(id) on delete set null,
  cliente_nome text,
  assinatura text,
  avaliacao text check (avaliacao in ('bom', 'regular')),
  observacao_cliente text,
  realizado_em timestamptz,
  aviso_concluido_em timestamptz,
  aviso_concluido_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((situacao = 'realizado') = (realizado_em is not null))
);

create unique index if not exists recebimentos_servicos_programacao_uidx
  on public.recebimentos_servicos (empresa_id, recebimento_empresa_id, coalesce(subempresa_id, '00000000-0000-0000-0000-000000000000'::uuid), data_programada);
create index if not exists recebimentos_servicos_empresa_situacao_idx
  on public.recebimentos_servicos (empresa_id, situacao, data_programada desc);
create index if not exists recebimentos_servicos_aviso_idx
  on public.recebimentos_servicos (empresa_id, avaliacao, aviso_concluido_em)
  where avaliacao = 'regular';

create or replace function public.recebimentos_colaborador_pode_servicos(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.recebimentos_colaboradores c
    join public.empresa_modulos m on m.empresa_id = c.empresa_id and m.modulo_id = 'recebimentos_presencial' and m.ativo
    where c.empresa_id = p_empresa_id and c.user_id = auth.uid() and c.ativo and c.pode_servicos
  );
$$;
revoke all on function public.recebimentos_colaborador_pode_servicos(uuid) from public;
grant execute on function public.recebimentos_colaborador_pode_servicos(uuid) to authenticated;

create or replace function public.recebimentos_servico_agendado(
  p_data date, p_frequencia text, p_dias smallint[], p_dia smallint, p_mes_inicio smallint
) returns boolean language plpgsql immutable as $$
declare v_ultimo_dia smallint;
begin
  if p_frequencia = 'semanal' then
    return extract(dow from p_data)::smallint = any(coalesce(p_dias, '{}'::smallint[]));
  end if;
  if p_frequencia = 'quinzenal' then
    return p_dia is not null and mod(p_data - (date '2020-01-01' + (p_dia - 1)), 15) = 0;
  end if;
  v_ultimo_dia := extract(day from (date_trunc('month', p_data)::date + interval '1 month - 1 day'))::smallint;
  if extract(day from p_data)::smallint <> least(coalesce(p_dia, 1), v_ultimo_dia) then return false; end if;
  if p_frequencia = 'mensal' then return true; end if;
  if p_frequencia = 'trimestral' then return mod(extract(month from p_data)::int - coalesce(p_mes_inicio, 1) + 12, 3) = 0; end if;
  if p_frequencia = 'semestral' then return mod(extract(month from p_data)::int - coalesce(p_mes_inicio, 1) + 12, 6) = 0; end if;
  if p_frequencia = 'anual' then return extract(month from p_data)::int = coalesce(p_mes_inicio, 1); end if;
  return false;
end;
$$;

create or replace function public.recebimentos_sincronizar_servicos(p_empresa_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_data date; v_item record;
begin
  if not (public.recebimentos_pode_gerir(p_empresa_id) or public.recebimentos_colaborador_pode_servicos(p_empresa_id)) then
    raise exception 'Acesso negado.';
  end if;
  update public.recebimentos_servicos
    set situacao = 'atrasado', atualizado_em = now()
    where empresa_id = p_empresa_id and situacao = 'pendente' and data_programada < current_date;

  for v_item in
    select e.id recebimento_empresa_id, null::uuid subempresa_id,
           e.frequencia_execucao_servico frequencia, e.dias_execucao_semana dias,
           e.dia_execucao_mes dia, e.mes_inicio_execucao mes_inicio
      from public.recebimentos_empresas e
     where e.empresa_id = p_empresa_id and e.ativo and e.tipo_cadastro = 'cliente_direto'
    union all
    select s.recebimento_empresa_id, s.id,
           case when s.herda_execucao_servico then e.frequencia_execucao_servico else s.frequencia_execucao_servico end,
           case when s.herda_execucao_servico then e.dias_execucao_semana else s.dias_execucao_semana end,
           case when s.herda_execucao_servico then e.dia_execucao_mes else s.dia_execucao_mes end,
           case when s.herda_execucao_servico then e.mes_inicio_execucao else s.mes_inicio_execucao end
      from public.recebimentos_subempresas s
      join public.recebimentos_empresas e on e.id = s.recebimento_empresa_id
     where s.empresa_id = p_empresa_id and s.ativo and e.ativo
  loop
    if v_item.frequencia is null then continue; end if;
    -- A estreia não inventa atrasos para serviços antigos: a agenda começa hoje
    -- e deixa os próximos trinta dias previamente prontos para o colaborador.
    for v_data in select generate_series(current_date, current_date + 30, interval '1 day')::date loop
      if public.recebimentos_servico_agendado(v_data, v_item.frequencia, v_item.dias, v_item.dia, v_item.mes_inicio) then
        insert into public.recebimentos_servicos (empresa_id, recebimento_empresa_id, subempresa_id, data_programada)
        select p_empresa_id, v_item.recebimento_empresa_id, v_item.subempresa_id, v_data
        where not exists (
          select 1 from public.recebimentos_servicos x
           where x.empresa_id = p_empresa_id and x.recebimento_empresa_id = v_item.recebimento_empresa_id
             and x.subempresa_id is not distinct from v_item.subempresa_id and x.data_programada = v_data
        );
      end if;
    end loop;
  end loop;
end;
$$;
revoke all on function public.recebimentos_sincronizar_servicos(uuid) from public;
grant execute on function public.recebimentos_sincronizar_servicos(uuid) to authenticated;

alter table public.recebimentos_servicos enable row level security;
create policy recebimentos_servicos_select on public.recebimentos_servicos for select to authenticated
  using (public.recebimentos_pode_gerir(empresa_id) or public.recebimentos_colaborador_pode_servicos(empresa_id));
create policy recebimentos_servicos_gestao on public.recebimentos_servicos for all to authenticated
  using (public.recebimentos_pode_gerir(empresa_id)) with check (public.recebimentos_pode_gerir(empresa_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'recebimentos_servicos'
    ) then
    alter publication supabase_realtime add table public.recebimentos_servicos;
  end if;
end;
$$;
