-- A agenda precisa sobreviver aos dias em que ninguém abre o módulo. Ao
-- sincronizar, o período operacional em curso é recomposto desde o início da
-- programação relevante e datas vencidas já entram como atraso.

create or replace function public.recebimentos_sincronizar_servicos(p_empresa_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_data date;
  v_inicio_agenda date;
  v_item record;
begin
  if not (public.recebimentos_pode_gerir(p_empresa_id) or public.recebimentos_colaborador_pode_servicos(p_empresa_id)) then
    raise exception 'Acesso negado.';
  end if;

  for v_item in
    select e.id recebimento_empresa_id, null::uuid subempresa_id,
           e.frequencia_execucao_servico frequencia, e.dias_execucao_semana dias,
           e.dia_execucao_mes dia, e.mes_inicio_execucao mes_inicio,
           e.atualizado_em agenda_iniciada_em
      from public.recebimentos_empresas e
     where e.empresa_id = p_empresa_id and e.ativo and e.tipo_cadastro = 'cliente_direto'
    union all
    select s.recebimento_empresa_id, s.id,
           case when s.herda_execucao_servico then e.frequencia_execucao_servico else s.frequencia_execucao_servico end,
           case when s.herda_execucao_servico then e.dias_execucao_semana else s.dias_execucao_semana end,
           case when s.herda_execucao_servico then e.dia_execucao_mes else s.dia_execucao_mes end,
           case when s.herda_execucao_servico then e.mes_inicio_execucao else s.mes_inicio_execucao end,
           greatest(e.atualizado_em, coalesce(s.atualizado_em, e.atualizado_em))
      from public.recebimentos_subempresas s
      join public.recebimentos_empresas e on e.id = s.recebimento_empresa_id
     where s.empresa_id = p_empresa_id and s.ativo and e.ativo
  loop
    if v_item.frequencia is null then continue; end if;
    v_inicio_agenda := greatest(
      coalesce(v_item.agenda_iniciada_em::date, v_hoje),
      case v_item.frequencia
        when 'semanal' then date_trunc('week', v_hoje)::date
        when 'quinzenal' then v_hoje - 14
        when 'mensal' then date_trunc('month', v_hoje)::date
        when 'trimestral' then v_hoje - 92
        when 'semestral' then v_hoje - 184
        when 'anual' then date_trunc('year', v_hoje)::date
        else v_hoje
      end
    );

    for v_data in select generate_series(v_inicio_agenda, v_hoje + 30, interval '1 day')::date loop
      if public.recebimentos_servico_agendado(v_data, v_item.frequencia, v_item.dias, v_item.dia, v_item.mes_inicio) then
        insert into public.recebimentos_servicos (empresa_id, recebimento_empresa_id, subempresa_id, data_programada, situacao)
        select p_empresa_id, v_item.recebimento_empresa_id, v_item.subempresa_id, v_data,
               case when v_data < v_hoje then 'atrasado' else 'pendente' end
        where not exists (
          select 1 from public.recebimentos_servicos x
           where x.empresa_id = p_empresa_id
             and x.recebimento_empresa_id = v_item.recebimento_empresa_id
             and x.subempresa_id is not distinct from v_item.subempresa_id
             and x.data_programada = v_data
        );
      end if;
    end loop;
  end loop;

  update public.recebimentos_servicos
     set situacao = 'atrasado', atualizado_em = now()
   where empresa_id = p_empresa_id
     and situacao = 'pendente'
     and data_programada < v_hoje;
end;
$$;

comment on function public.recebimentos_sincronizar_servicos(uuid) is
  'Sincroniza os próximos 30 dias e o período corrente de cada frequência; serviços programados e não realizados antes da data operacional ficam atrasados.';
