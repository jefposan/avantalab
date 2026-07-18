-- Integra manualmente o total mensal baixado do Recebimentos Presencial ao
-- faturamento do Gestão. A receita criada é rastreável e protegida contra
-- edição/exclusão manual no Financeiro.

alter table public.faturamentos_entradas
  add column if not exists origem_etiqueta text;

create table if not exists public.recebimentos_integracao_financeira (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  nome_entrada text not null default 'Recebimentos em campo',
  titulo_etiqueta text not null default 'Recebimentos',
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null,
  check (char_length(btrim(nome_entrada)) between 1 and 120),
  check (char_length(btrim(titulo_etiqueta)) between 1 and 40)
);

create table if not exists public.recebimentos_receitas_gestao (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ano integer not null check (ano between 2000 and 2200),
  mes text not null check (mes in (
    'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
    'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'
  )),
  faturamento_entrada_id uuid not null unique references public.faturamentos_entradas(id) on delete cascade,
  valor_sincronizado numeric(12,2) not null check (valor_sincronizado >= 0),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null,
  primary key (empresa_id, ano, mes)
);

alter table public.recebimentos_integracao_financeira enable row level security;
alter table public.recebimentos_receitas_gestao enable row level security;

drop policy if exists recebimentos_integracao_financeira_select on public.recebimentos_integracao_financeira;
create policy recebimentos_integracao_financeira_select
  on public.recebimentos_integracao_financeira for select to authenticated
  using (public.recebimentos_pode_gerir(empresa_id));

drop policy if exists recebimentos_receitas_gestao_select on public.recebimentos_receitas_gestao;
create policy recebimentos_receitas_gestao_select
  on public.recebimentos_receitas_gestao for select to authenticated
  using (public.recebimentos_pode_gerir(empresa_id));

create or replace function public.proteger_receita_recebimentos_gestao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.recebimentos_sync', true) = '1' then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' and new.tipo_obs = 'recebimentos_sistema' then
    raise exception 'A receita do Recebimentos Presencial é controlada pelo módulo.';
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.tipo_obs = 'recebimentos_sistema' then
    raise exception 'A receita do Recebimentos Presencial é controlada pelo módulo.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists proteger_receita_recebimentos_gestao_trigger on public.faturamentos_entradas;
create trigger proteger_receita_recebimentos_gestao_trigger
before insert or update or delete on public.faturamentos_entradas
for each row execute function public.proteger_receita_recebimentos_gestao();

create or replace function public.recebimentos_obter_integracao_financeira(
  p_empresa_id uuid,
  p_ano integer,
  p_mes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.recebimentos_integracao_financeira%rowtype;
  v_vinculo public.recebimentos_receitas_gestao%rowtype;
  v_mes_nome text;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.recebimentos_pode_gerir(p_empresa_id) then raise exception 'Acesso negado.'; end if;
  if p_ano not between 2000 and 2200 or p_mes not between 1 and 12 then raise exception 'Período inválido.'; end if;

  v_mes_nome := (array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
    'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[p_mes];

  select * into v_config
  from public.recebimentos_integracao_financeira
  where empresa_id = p_empresa_id;

  select * into v_vinculo
  from public.recebimentos_receitas_gestao
  where empresa_id = p_empresa_id and ano = p_ano and mes = v_mes_nome;

  return jsonb_build_object(
    'nome_entrada', coalesce(v_config.nome_entrada, 'Recebimentos em campo'),
    'titulo_etiqueta', coalesce(v_config.titulo_etiqueta, 'Recebimentos'),
    'integrado', v_vinculo.faturamento_entrada_id is not null,
    'valor_sincronizado', coalesce(v_vinculo.valor_sincronizado, 0)
  );
end;
$$;

create or replace function public.recebimentos_integrar_financeiro(
  p_empresa_id uuid,
  p_ano integer,
  p_mes integer,
  p_nome_entrada text,
  p_titulo_etiqueta text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := btrim(coalesce(p_nome_entrada, ''));
  v_etiqueta text := btrim(coalesce(p_titulo_etiqueta, ''));
  v_mes_nome text;
  v_total numeric(12,2) := 0;
  v_valor_anterior numeric(12,2) := 0;
  v_entrada_id uuid;
  v_ultimo_dia integer;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if not public.recebimentos_pode_gerir(p_empresa_id) then
    raise exception 'Somente gestor ou administrador pode integrar os recebimentos.';
  end if;
  if p_ano not between 2000 and 2200 or p_mes not between 1 and 12 then raise exception 'Período inválido.'; end if;
  if char_length(v_nome) not between 1 and 120 then raise exception 'Informe o nome da entrada.'; end if;
  if char_length(v_etiqueta) not between 1 and 40 then raise exception 'Informe um título de etiqueta com até 40 caracteres.'; end if;

  v_mes_nome := (array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
    'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'])[p_mes];
  v_ultimo_dia := extract(day from (make_date(p_ano, p_mes, 1) + interval '1 month - 1 day'))::integer;

  select coalesce(sum(valor_recebido), 0) into v_total
  from public.recebimentos_lancamentos
  where empresa_id = p_empresa_id
    and situacao = 'baixado'
    and extract(year from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer = p_ano
    and extract(month from (coalesce(baixado_em, recebido_em) at time zone 'America/Sao_Paulo'))::integer = p_mes;

  if v_total <= 0 then raise exception 'Não há valor baixado neste mês para adicionar.'; end if;

  insert into public.recebimentos_integracao_financeira
    (empresa_id, nome_entrada, titulo_etiqueta, atualizado_em, atualizado_por)
  values (p_empresa_id, v_nome, v_etiqueta, now(), auth.uid())
  on conflict (empresa_id) do update set
    nome_entrada = excluded.nome_entrada,
    titulo_etiqueta = excluded.titulo_etiqueta,
    atualizado_em = now(),
    atualizado_por = auth.uid();

  select faturamento_entrada_id, valor_sincronizado
    into v_entrada_id, v_valor_anterior
  from public.recebimentos_receitas_gestao
  where empresa_id = p_empresa_id and ano = p_ano and mes = v_mes_nome;
  v_valor_anterior := coalesce(v_valor_anterior, 0);

  perform set_config('app.recebimentos_sync', '1', true);
  if v_entrada_id is null then
    insert into public.faturamentos_entradas
      (empresa_id, ano, mes, dia, origem, valor, status, tipo_obs, origem_etiqueta, criado_por)
    values
      (p_empresa_id, p_ano, v_mes_nome, v_ultimo_dia, v_nome, v_total, null,
       'recebimentos_sistema', v_etiqueta, auth.uid())
    returning id into v_entrada_id;

    insert into public.recebimentos_receitas_gestao
      (empresa_id, ano, mes, faturamento_entrada_id, valor_sincronizado, atualizado_por)
    values (p_empresa_id, p_ano, v_mes_nome, v_entrada_id, v_total, auth.uid());
  else
    update public.faturamentos_entradas
    set dia = v_ultimo_dia,
        origem = v_nome,
        valor = v_total,
        status = null,
        tipo_obs = 'recebimentos_sistema',
        origem_etiqueta = v_etiqueta,
        updated_at = now()
    where id = v_entrada_id and empresa_id = p_empresa_id;

    update public.recebimentos_receitas_gestao
    set valor_sincronizado = v_total, atualizado_em = now(), atualizado_por = auth.uid()
    where empresa_id = p_empresa_id and ano = p_ano and mes = v_mes_nome;
  end if;

  insert into public.faturamentos (empresa_id, ano, mes, valor)
  values (p_empresa_id, p_ano, v_mes_nome, greatest(0, v_total - v_valor_anterior))
  on conflict (empresa_id, ano, mes) do update
  set valor = greatest(0, public.faturamentos.valor + (v_total - v_valor_anterior));

  return jsonb_build_object(
    'integrado', true,
    'valor_sincronizado', v_total,
    'nome_entrada', v_nome,
    'titulo_etiqueta', v_etiqueta
  );
end;
$$;

revoke all on function public.recebimentos_obter_integracao_financeira(uuid, integer, integer) from public;
grant execute on function public.recebimentos_obter_integracao_financeira(uuid, integer, integer) to authenticated;
revoke all on function public.recebimentos_integrar_financeiro(uuid, integer, integer, text, text) from public;
grant execute on function public.recebimentos_integrar_financeiro(uuid, integer, integer, text, text) to authenticated;
