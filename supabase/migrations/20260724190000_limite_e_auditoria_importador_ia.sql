-- Limita análises extensas de extratos/faturas e registra somente metadados de
-- consumo. O PDF e o conteúdo reconhecido nunca são persistidos nesta tabela.
create table if not exists public.importador_ia_analises (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  competencia date not null,
  envio_mes smallint not null check (envio_mes between 1 and 3),
  tipo_documento text not null check (tipo_documento in ('automatico', 'extrato-bancario', 'fatura-cartao')),
  paginas smallint not null check (paginas between 1 and 5),
  status text not null default 'processando'
    check (status in ('processando', 'concluida', 'falha_validacao', 'falha_api', 'falha_tecnica')),
  modelos_utilizados text[] not null default '{}',
  contingencia_utilizada boolean not null default false,
  tokens_entrada integer not null default 0 check (tokens_entrada >= 0),
  tokens_saida integer not null default 0 check (tokens_saida >= 0),
  tokens_raciocinio integer not null default 0 check (tokens_raciocinio >= 0),
  tokens_total integer not null default 0 check (tokens_total >= 0),
  codigo_resultado text,
  criado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

create unique index if not exists importador_ia_analises_envio_mes_idx
  on public.importador_ia_analises (empresa_id, competencia, envio_mes);

create index if not exists importador_ia_analises_tokens_idx
  on public.importador_ia_analises (tokens_total desc, criado_em desc);

create index if not exists importador_ia_analises_competencia_idx
  on public.importador_ia_analises (competencia desc, empresa_id);

alter table public.importador_ia_analises enable row level security;
revoke all on table public.importador_ia_analises from public, anon, authenticated;

create or replace function public.reservar_importador_ia_analise(
  p_empresa_id uuid,
  p_tipo_documento text,
  p_paginas integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competencia date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  v_envios integer;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'SESSAO_EXPIRADA';
  end if;

  if p_tipo_documento not in ('automatico', 'extrato-bancario', 'fatura-cartao') then
    raise exception 'TIPO_DOCUMENTO_INVALIDO';
  end if;

  if p_paginas < 1 or p_paginas > 5 then
    raise exception 'LIMITE_PAGINAS_ATINGIDO';
  end if;

  if not exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.user_id = auth.uid()
      and acesso.empresa_id = p_empresa_id
      and acesso.status = 'ativo'
  ) then
    raise exception 'PERFIL_SEM_ACESSO';
  end if;

  -- Serializa reservas do mesmo perfil/mês para impedir quatro envios
  -- simultâneos de ultrapassarem a franquia de três.
  perform pg_advisory_xact_lock(
    hashtextextended(p_empresa_id::text || ':' || v_competencia::text, 0)
  );

  select count(*)::integer
    into v_envios
  from public.importador_ia_analises
  where empresa_id = p_empresa_id
    and competencia = v_competencia;

  if v_envios >= 3 then
    raise exception 'LIMITE_MENSAL_ATINGIDO';
  end if;

  insert into public.importador_ia_analises (
    empresa_id,
    usuario_id,
    competencia,
    envio_mes,
    tipo_documento,
    paginas
  )
  values (
    p_empresa_id,
    auth.uid(),
    v_competencia,
    v_envios + 1,
    p_tipo_documento,
    p_paginas
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'envios_restantes', 2 - v_envios
  );
end;
$$;

revoke all on function public.reservar_importador_ia_analise(uuid, text, integer) from public, anon;
grant execute on function public.reservar_importador_ia_analise(uuid, text, integer) to authenticated;

create or replace function public.finalizar_importador_ia_analise(
  p_analise_id uuid,
  p_status text,
  p_modelos_utilizados text[],
  p_contingencia_utilizada boolean,
  p_tokens_entrada integer,
  p_tokens_saida integer,
  p_tokens_raciocinio integer,
  p_tokens_total integer,
  p_codigo_resultado text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'SESSAO_EXPIRADA';
  end if;

  if p_status not in ('concluida', 'falha_validacao', 'falha_api', 'falha_tecnica') then
    raise exception 'STATUS_INVALIDO';
  end if;

  update public.importador_ia_analises
  set
    status = p_status,
    modelos_utilizados = coalesce(p_modelos_utilizados, '{}'),
    contingencia_utilizada = coalesce(p_contingencia_utilizada, false),
    tokens_entrada = greatest(coalesce(p_tokens_entrada, 0), 0),
    tokens_saida = greatest(coalesce(p_tokens_saida, 0), 0),
    tokens_raciocinio = greatest(coalesce(p_tokens_raciocinio, 0), 0),
    tokens_total = greatest(coalesce(p_tokens_total, 0), 0),
    codigo_resultado = left(nullif(btrim(coalesce(p_codigo_resultado, '')), ''), 80),
    finalizado_em = now()
  where id = p_analise_id
    and usuario_id = auth.uid();

  if not found then
    raise exception 'ANALISE_NAO_ENCONTRADA';
  end if;
end;
$$;

revoke all on function public.finalizar_importador_ia_analise(uuid, text, text[], boolean, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.finalizar_importador_ia_analise(uuid, text, text[], boolean, integer, integer, integer, integer, text) to authenticated;
