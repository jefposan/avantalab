-- Fecha vínculos operacionais do módulo Vendas e Serviços:
-- fornecedor por perfil, saldo principal por item e receita mensal por caixa.

begin;

create table if not exists public.vendas_fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo bigint not null check (codigo > 0),
  documento text,
  razao_social text not null,
  contato_principal text,
  email text,
  telefone text,
  situacao text not null default 'ativo' check (situacao in ('ativo','inativo')),
  versao integer not null default 1 check (versao > 0),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, codigo),
  constraint vendas_fornecedores_documento_check check (
    documento is null or (documento ~ '^[0-9]{14}$' and documento !~ '^(.)\1{13}$')
  ),
  constraint vendas_fornecedores_nome_check check (length(trim(razao_social)) between 2 and 180)
);

create unique index if not exists vendas_fornecedores_documento_uidx
  on public.vendas_fornecedores (empresa_id, documento) where documento is not null;
create index if not exists vendas_fornecedores_busca_idx
  on public.vendas_fornecedores (empresa_id, situacao, razao_social);

create trigger vendas_fornecedores_touch before update on public.vendas_fornecedores
for each row execute function public.vendas_touch_version();

alter table public.vendas_fornecedores enable row level security;
alter table public.vendas_fornecedores force row level security;
revoke all on table public.vendas_fornecedores from public, anon, authenticated;
grant select,insert,update on table public.vendas_fornecedores to service_role;

-- Todo perfil com Vendas ativo recebe um local principal. Produtos publicados
-- começam controlados com saldo zero: a primeira venda só reserva após entrada
-- ou inventário, evitando estoque fictício.
insert into public.vendas_estoque_locais (empresa_id,codigo,nome,descricao,padrao,ativo)
select modulo.empresa_id,'principal','Estoque principal','Local padrão do módulo Vendas e Serviços.',true,true
from public.empresa_modulos modulo
join public.empresas empresa on empresa.id=modulo.empresa_id and empresa.tipo_perfil='empresa'
where modulo.modulo_id='vendas' and modulo.ativo=true
  and not exists(select 1 from public.vendas_estoque_locais existente where existente.empresa_id=modulo.empresa_id and existente.padrao=true and existente.ativo=true)
on conflict (empresa_id,codigo) do update set ativo=true;

insert into public.vendas_estoque_saldos (empresa_id,local_id,produto_id,saldo_fisico,saldo_reservado,estoque_minimo,permite_negativo)
select catalogo.empresa_id,local.id,produto.id,0,0,0,false
from public.vendas_mobile_catalogo_produtos produto
join public.vendas_mobile_catalogos catalogo on catalogo.id=produto.catalogo_id
join public.vendas_estoque_locais local on local.empresa_id=catalogo.empresa_id and local.padrao=true and local.ativo=true
where catalogo.ativo=true and produto.ativo=true and produto.disponivel_catalogo=true
  and coalesce(produto.tipo_item,'produto')='produto'
on conflict (empresa_id,local_id,produto_id) do nothing;

create or replace function public.vendas_preparar_estoque_item_catalogo()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_empresa_id uuid; v_local_id uuid;
begin
  if new.ativo is not true or new.disponivel_catalogo is not true or coalesce(new.tipo_item,'produto')<>'produto' then return new; end if;
  select catalogo.empresa_id into v_empresa_id from public.vendas_mobile_catalogos catalogo where catalogo.id=new.catalogo_id and catalogo.ativo=true;
  if v_empresa_id is null then return new; end if;
  select id into v_local_id from public.vendas_estoque_locais where empresa_id=v_empresa_id and padrao=true and ativo=true order by criado_em limit 1;
  if v_local_id is null then
    insert into public.vendas_estoque_locais(empresa_id,codigo,nome,descricao,padrao,ativo)
    values(v_empresa_id,'principal','Estoque principal','Local padrão do módulo Vendas e Serviços.',true,true)
    on conflict (empresa_id,codigo) do update set ativo=true
    returning id into v_local_id;
  end if;
  insert into public.vendas_estoque_saldos(empresa_id,local_id,produto_id,saldo_fisico,saldo_reservado,estoque_minimo,permite_negativo)
  values(v_empresa_id,v_local_id,new.id,0,0,0,false)
  on conflict (empresa_id,local_id,produto_id) do nothing;
  return new;
end $$;

drop trigger if exists vendas_catalogo_preparar_estoque_trigger on public.vendas_mobile_catalogo_produtos;
create trigger vendas_catalogo_preparar_estoque_trigger
after insert or update of ativo,disponivel_catalogo,tipo_item on public.vendas_mobile_catalogo_produtos
for each row execute function public.vendas_preparar_estoque_item_catalogo();
revoke all on function public.vendas_preparar_estoque_item_catalogo() from public,anon,authenticated;

alter table public.vendas_contas_receber_eventos
  add column if not exists data_movimentacao date;
update public.vendas_contas_receber_eventos
set data_movimentacao=(criado_em at time zone 'America/Sao_Paulo')::date
where data_movimentacao is null;
alter table public.vendas_contas_receber_eventos alter column data_movimentacao
  set default ((now() at time zone 'America/Sao_Paulo')::date);
alter table public.vendas_contas_receber_eventos alter column data_movimentacao set not null;

alter table public.vendas_estoque_movimentos
  add column if not exists data_movimentacao date;
update public.vendas_estoque_movimentos
set data_movimentacao=(criado_em at time zone 'America/Sao_Paulo')::date
where data_movimentacao is null;
alter table public.vendas_estoque_movimentos alter column data_movimentacao
  set default ((now() at time zone 'America/Sao_Paulo')::date);
alter table public.vendas_estoque_movimentos alter column data_movimentacao set not null;

alter table public.vendas_eventos drop constraint if exists vendas_eventos_recurso_tipo_check;
alter table public.vendas_eventos add constraint vendas_eventos_recurso_tipo_check check (
  recurso_tipo in ('cliente','fornecedor','operacao','ordem_servico','estoque','inventario','conta_receber','configuracao_fiscal')
);

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

create table if not exists public.vendas_receitas_gestao (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  competencia date not null,
  faturamento_entrada_id uuid not null unique references public.faturamentos_entradas(id) on delete cascade,
  valor_sincronizado numeric(14,2) not null default 0 check (valor_sincronizado >= 0),
  atualizado_em timestamptz not null default now(),
  primary key (empresa_id,competencia),
  constraint vendas_receitas_gestao_competencia_check check (competencia=date_trunc('month',competencia)::date)
);
alter table public.vendas_receitas_gestao enable row level security;
alter table public.vendas_receitas_gestao force row level security;
revoke all on table public.vendas_receitas_gestao from public,anon,authenticated;
grant select,insert,update on table public.vendas_receitas_gestao to service_role;

create or replace function public.vendas_sincronizar_receita_mes(p_empresa_id uuid,p_competencia date)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_competencia date:=date_trunc('month',p_competencia)::date;
  v_total numeric(14,2):=0; v_anterior numeric(14,2):=0; v_entrada_id uuid;
  v_mes text; v_dia integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('vendas-receita:'||p_empresa_id::text||':'||v_competencia::text,0));
  select coalesce(sum(case evento.tipo when 'recebimento' then evento.valor when 'estorno_recebimento' then -evento.valor else 0 end),0)::numeric(14,2)
  into v_total from public.vendas_contas_receber_eventos evento
  where evento.empresa_id=p_empresa_id and evento.data_movimentacao>=v_competencia and evento.data_movimentacao<(v_competencia+interval '1 month')::date;
  v_total:=greatest(0,v_total);
  v_mes:=(array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[extract(month from v_competencia)::integer];
  v_dia:=extract(day from (v_competencia+interval '1 month - 1 day'))::integer;
  select faturamento_entrada_id,valor_sincronizado into v_entrada_id,v_anterior
  from public.vendas_receitas_gestao where empresa_id=p_empresa_id and competencia=v_competencia for update;
  v_anterior:=coalesce(v_anterior,0);
  perform set_config('app.vendas_servicos_sync','1',true);
  if v_entrada_id is null and v_total>0 then
    insert into public.faturamentos_entradas(empresa_id,ano,mes,dia,origem,valor,status,tipo_obs,origem_etiqueta,criado_por)
    values(p_empresa_id,extract(year from v_competencia)::integer,v_mes,v_dia,'Vendas e Serviços',v_total,null,'vendas_servicos_sistema','Vendas e Serviços',null)
    returning id into v_entrada_id;
    insert into public.vendas_receitas_gestao(empresa_id,competencia,faturamento_entrada_id,valor_sincronizado)
    values(p_empresa_id,v_competencia,v_entrada_id,v_total);
  elsif v_entrada_id is not null then
    update public.faturamentos_entradas set valor=v_total,dia=v_dia,origem='Vendas e Serviços',status=null,tipo_obs='vendas_servicos_sistema',origem_etiqueta='Vendas e Serviços',updated_at=now()
    where id=v_entrada_id and empresa_id=p_empresa_id;
    update public.vendas_receitas_gestao set valor_sincronizado=v_total,atualizado_em=now()
    where empresa_id=p_empresa_id and competencia=v_competencia;
  end if;
  insert into public.faturamentos(empresa_id,ano,mes,valor)
  values(p_empresa_id,extract(year from v_competencia)::integer,v_mes,greatest(0,v_total-v_anterior))
  on conflict(empresa_id,ano,mes) do update set valor=greatest(0,public.faturamentos.valor+(v_total-v_anterior));
  perform set_config('app.vendas_servicos_sync','0',true);
end $$;

create or replace function public.vendas_disparar_sincronizacao_receita()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.tipo in ('recebimento','estorno_recebimento') then perform public.vendas_sincronizar_receita_mes(new.empresa_id,new.data_movimentacao); end if;
  return new;
end $$;
drop trigger if exists vendas_receita_gestao_trigger on public.vendas_contas_receber_eventos;
create trigger vendas_receita_gestao_trigger after insert on public.vendas_contas_receber_eventos
for each row execute function public.vendas_disparar_sincronizacao_receita();
revoke all on function public.vendas_sincronizar_receita_mes(uuid,date) from public,anon,authenticated;
revoke all on function public.vendas_disparar_sincronizacao_receita() from public,anon,authenticated;

comment on table public.vendas_fornecedores is 'Fornecedores pertencem ao perfil empresarial; o login aparece somente na auditoria.';
comment on table public.vendas_receitas_gestao is 'Vínculo idempotente entre recebimentos líquidos do módulo e a entrada mensal da Gestão.';

commit;
