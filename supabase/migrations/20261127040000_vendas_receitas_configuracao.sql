begin;
create or replace function public.proteger_receita_recebimentos_gestao()
returns trigger language plpgsql set search_path=public as $$
begin
  if current_setting('app.recebimentos_sync',true)='1' or current_setting('app.vendas_servicos_sync',true)='1' then
    return coalesce(new,old);
  end if;
  if tg_op='INSERT' and new.tipo_obs in ('recebimentos_sistema','vendas_servicos_sistema') then
    raise exception 'Esta receita é controlada automaticamente pelo módulo de origem.';
  end if;
  if tg_op in ('UPDATE','DELETE') and old.tipo_obs in ('recebimentos_sistema','vendas_servicos_sistema') then
    raise exception 'Esta receita é controlada automaticamente pelo módulo de origem.';
  end if;
  return coalesce(new,old);
end $$;


-- Empresa/módulo: ausente significa ativo. Reaplicação não redefine escolhas.
create table if not exists public.vendas_receita_configuracoes (
 empresa_id uuid primary key references public.empresas(id) on delete cascade,
 enabled boolean not null default true,
 version integer not null default 1 check(version>0),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.vendas_receita_configuracoes enable row level security;
alter table public.vendas_receita_configuracoes force row level security;
revoke all on public.vendas_receita_configuracoes from public,anon,authenticated;
grant select,insert,update on public.vendas_receita_configuracoes to service_role,avanta_vendas_runtime;
drop policy if exists revenue_service on public.vendas_receita_configuracoes;
create policy revenue_service on public.vendas_receita_configuracoes to service_role using(true) with check(true);
drop policy if exists revenue_runtime on public.vendas_receita_configuracoes;
create policy revenue_runtime on public.vendas_receita_configuracoes to avanta_vendas_runtime
 using(public.vendas_runtime_empresa_liberada(empresa_id)) with check(public.vendas_runtime_empresa_liberada(empresa_id));

create or replace function public.vendas_receita_competencia(p_entrega jsonb,p_criado timestamptz)
returns date language plpgsql immutable set search_path=public,pg_temp as $$
declare v_date date;
begin
 begin v_date:=nullif(p_entrega->>'orderDate','')::date; exception when others then v_date:=null; end;
 return date_trunc('month',coalesce(v_date,(p_criado at time zone 'America/Sao_Paulo')::date))::date;
end $$;
create or replace function public.vendas_sincronizar_receita_mes(p_empresa_id uuid,p_competencia date)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_competencia date:=date_trunc('month',p_competencia)::date;
  v_total numeric(14,2):=0; v_anterior numeric(14,2):=0; v_entrada_id uuid;
  v_mes text; v_dia integer; v_sync_anterior text:=current_setting('app.vendas_servicos_sync',true);
begin
  perform pg_advisory_xact_lock(hashtextextended('vendas-financeiro:'||p_empresa_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended('vendas-receita:'||p_empresa_id::text||':'||v_competencia::text,0));
  if coalesce((select enabled from public.vendas_receita_configuracoes where empresa_id=p_empresa_id),true) then
    select coalesce(sum(operacao.total),0)::numeric(14,2) into v_total
    from public.vendas_operacoes operacao
    where operacao.empresa_id=p_empresa_id
      and ((operacao.tipo='pedido' and operacao.situacao='faturado')
        or (operacao.tipo='ordem_servico' and operacao.situacao='concluido'))
      and public.vendas_receita_competencia(operacao.entrega_retrato,operacao.criado_em)=v_competencia;
  end if;
  v_total:=greatest(0,v_total);
  v_mes:=(array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[extract(month from v_competencia)::integer];
  v_dia:=extract(day from (v_competencia+interval '1 month - 1 day'))::integer;
  select faturamento_entrada_id,valor_sincronizado into v_entrada_id,v_anterior
  from public.vendas_receitas_gestao where empresa_id=p_empresa_id and competencia=v_competencia for update;
  v_anterior:=coalesce(v_anterior,0);
  if v_entrada_id is null and v_total=0 then return; end if;
  perform set_config('app.vendas_servicos_sync','1',true);
  if v_entrada_id is null and v_total>0 then
    insert into public.faturamentos_entradas(empresa_id,ano,mes,dia,origem,valor,status,tipo_obs,origem_etiqueta,criado_por)
    values(p_empresa_id,extract(year from v_competencia)::integer,v_mes,v_dia,'Venda Avantalab',v_total,null,'vendas_servicos_sistema','Venda Avantalab',null)
    returning id into v_entrada_id;
    insert into public.vendas_receitas_gestao(empresa_id,competencia,faturamento_entrada_id,valor_sincronizado)
    values(p_empresa_id,v_competencia,v_entrada_id,v_total);
  elsif v_entrada_id is not null then
    update public.faturamentos_entradas set valor=v_total,dia=v_dia,origem='Venda Avantalab',status=null,tipo_obs='vendas_servicos_sistema',origem_etiqueta='Venda Avantalab',updated_at=now()
    where id=v_entrada_id and empresa_id=p_empresa_id;
    update public.vendas_receitas_gestao set valor_sincronizado=v_total,atualizado_em=now()
    where empresa_id=p_empresa_id and competencia=v_competencia;
  end if;
  -- O resumo deriva das entradas: recompor de forma absoluta evita dupla soma
  -- quando já existe gatilho financeiro no projeto.
  insert into public.faturamentos(empresa_id,ano,mes,valor)
  select p_empresa_id,extract(year from v_competencia)::integer,v_mes,
    coalesce(sum(valor) filter(where coalesce(status,'')<>'prevista'),0)
  from public.faturamentos_entradas
  where empresa_id=p_empresa_id and ano=extract(year from v_competencia)::integer and mes=v_mes
  on conflict(empresa_id,ano,mes) do update set valor=excluded.valor;
  perform set_config('app.vendas_servicos_sync',coalesce(v_sync_anterior,''),true);
end $$;


create or replace function public.vendas_recalcular_receitas(p_empresa_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare periodo date;
begin
 if (session_user='avanta_vendas_runtime' or current_setting('role',true)='avanta_vendas_runtime') and not public.vendas_runtime_empresa_liberada(p_empresa_id) then raise exception 'Empresa não liberada.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('vendas-financeiro:'||p_empresa_id::text,0));
 for periodo in
  select competencia from public.vendas_receitas_gestao where empresa_id=p_empresa_id
  union select public.vendas_receita_competencia(entrega_retrato,criado_em) from public.vendas_operacoes where empresa_id=p_empresa_id and tipo in ('pedido','ordem_servico')
  order by 1
 loop perform public.vendas_sincronizar_receita_mes(p_empresa_id,periodo); end loop;
end $$;
revoke all on function public.vendas_recalcular_receitas(uuid) from public,anon,authenticated;
grant execute on function public.vendas_recalcular_receitas(uuid) to service_role,avanta_vendas_runtime;

create or replace function public.vendas_disparar_receita_operacao()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op<>'INSERT' then
  perform public.vendas_sincronizar_receita_mes(old.empresa_id,public.vendas_receita_competencia(old.entrega_retrato,old.criado_em));
 end if;
 if tg_op<>'DELETE' then
  perform public.vendas_sincronizar_receita_mes(new.empresa_id,public.vendas_receita_competencia(new.entrega_retrato,new.criado_em));
 end if;
 return coalesce(new,old);
end $$;
revoke all on function public.vendas_disparar_receita_operacao() from public,anon,authenticated;
-- Receber/estornar pagamento não adiciona a venda novamente ao financeiro.
drop trigger if exists vendas_receita_gestao_trigger on public.vendas_contas_receber_eventos;
drop trigger if exists vendas_receita_operacao on public.vendas_operacoes;
create trigger vendas_receita_operacao after insert or update of situacao,total,entrega_retrato,criado_em or delete on public.vendas_operacoes
for each row execute function public.vendas_disparar_receita_operacao();
-- Ajustes alteram apenas o consolidado do módulo, por diferença. Entradas manuais são preservadas.
do $$declare empresa uuid; begin
 for empresa in select empresa_id from public.vendas_receitas_gestao union select empresa_id from public.vendas_operacoes where tipo in ('pedido','ordem_servico')
 loop perform public.vendas_recalcular_receitas(empresa); end loop;
end $$;
comment on table public.vendas_receita_configuracoes is 'Envio de vendas faturadas e serviços concluídos às entradas mensais; ativo por padrão; escolha persistente por empresa.';
commit;
