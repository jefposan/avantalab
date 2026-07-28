create table if not exists public.usuarios_contas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text not null default '',
  login text,
  origem text not null default 'cadastro',
  empresa_origem_id uuid references public.empresas(id) on delete set null,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists usuarios_contas_email_unico_idx
  on public.usuarios_contas (lower(email))
  where email is not null and btrim(email) <> '';

create unique index if not exists usuarios_contas_login_unico_idx
  on public.usuarios_contas (lower(login))
  where login is not null and btrim(login) <> '';

alter table public.usuarios_contas enable row level security;
revoke all on public.usuarios_contas from public, anon, authenticated;
grant all on public.usuarios_contas to service_role;

create or replace function public.sincronizar_auth_usuario_conta()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_nome text;
  v_login text;
  v_origem text;
  v_empresa_origem uuid;
  v_criado_por uuid;
begin
  v_nome := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  v_login := nullif(lower(btrim(new.raw_user_meta_data ->> 'login')), '');
  v_origem := coalesce(
    nullif(btrim(new.raw_app_meta_data ->> 'origem_avantalab'), ''),
    case when new.raw_user_meta_data ->> 'tipo' = 'usuario_interno' then 'usuario_interno' end,
    'cadastro'
  );

  begin
    v_empresa_origem := nullif(new.raw_app_meta_data ->> 'empresa_origem_id', '')::uuid;
  exception when others then
    v_empresa_origem := null;
  end;

  begin
    v_criado_por := nullif(new.raw_app_meta_data ->> 'criado_por', '')::uuid;
  exception when others then
    v_criado_por := null;
  end;

  insert into public.usuarios_contas (
    user_id, email, nome, login, origem, empresa_origem_id, criado_por
  )
  values (
    new.id, lower(new.email), coalesce(v_nome, ''), v_login, v_origem,
    v_empresa_origem, v_criado_por
  )
  on conflict (user_id) do update
  set email = excluded.email,
      nome = coalesce(nullif(excluded.nome, ''), public.usuarios_contas.nome),
      login = coalesce(excluded.login, public.usuarios_contas.login),
      origem = case
        when excluded.origem = 'usuario_interno' then excluded.origem
        else public.usuarios_contas.origem
      end,
      empresa_origem_id = coalesce(
        excluded.empresa_origem_id,
        public.usuarios_contas.empresa_origem_id
      ),
      criado_por = coalesce(excluded.criado_por, public.usuarios_contas.criado_por),
      atualizado_em = now();

  return new;
end;
$$;

drop trigger if exists auth_usuario_conta_sincronizar on auth.users;
create trigger auth_usuario_conta_sincronizar
after insert or update of email, raw_user_meta_data, raw_app_meta_data
on auth.users
for each row execute function public.sincronizar_auth_usuario_conta();

insert into public.usuarios_contas (
  user_id, email, nome, login, origem, empresa_origem_id, criado_por
)
select
  usuario.id,
  lower(usuario.email),
  coalesce(
    nullif(btrim(acesso.nome), ''),
    nullif(btrim(usuario.raw_user_meta_data ->> 'nome'), ''),
    nullif(btrim(usuario.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(usuario.email, ''), '@', 1)
  ),
  nullif(lower(btrim(acesso.login)), ''),
  coalesce(
    nullif(btrim(usuario.raw_app_meta_data ->> 'origem_avantalab'), ''),
    case
      when usuario.raw_user_meta_data ->> 'tipo' = 'usuario_interno'
        then 'usuario_interno'
    end,
    'cadastro'
  ),
  case
    when usuario.raw_app_meta_data ->> 'empresa_origem_id'
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (usuario.raw_app_meta_data ->> 'empresa_origem_id')::uuid
    else null
  end,
  case
    when usuario.raw_app_meta_data ->> 'criado_por'
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (usuario.raw_app_meta_data ->> 'criado_por')::uuid
    else null
  end
from auth.users usuario
left join lateral (
  select vinculo.nome, vinculo.login
  from public.usuarios_empresa vinculo
  where vinculo.user_id = usuario.id
  order by
    case when vinculo.login is not null and btrim(vinculo.login) <> '' then 0 else 1 end,
    vinculo.criado_em asc
  limit 1
) acesso on true
where usuario.email is not null
on conflict (user_id) do update
set email = excluded.email,
    nome = coalesce(nullif(excluded.nome, ''), public.usuarios_contas.nome),
    login = coalesce(excluded.login, public.usuarios_contas.login),
    origem = case
      when excluded.origem = 'usuario_interno' then excluded.origem
      else public.usuarios_contas.origem
    end,
    atualizado_em = now();

create or replace function public.auditar_exclusao_total_usuario_rpc(
  p_user_id uuid,
  p_acesso_ignorado uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bloqueios jsonb := '[]'::jsonb;
  v_item record;
  v_existe boolean;
begin
  if p_user_id is null then
    raise exception 'Usuario nao informado.';
  end if;

  if exists (
    select 1
    from public.usuarios_empresa acesso
    where acesso.user_id = p_user_id
      and acesso.id is distinct from p_acesso_ignorado
  ) then
    v_bloqueios := v_bloqueios || jsonb_build_array('usuarios_empresa');
  end if;

  for v_item in
    select distinct
      tabela.table_schema,
      tabela.table_name,
      tabela.column_name
    from information_schema.columns tabela
    where tabela.table_schema = 'public'
      and tabela.column_name in ('user_id', 'usuario_id')
      and tabela.udt_name = 'uuid'
      and tabela.table_name not in ('usuarios_empresa', 'usuarios_contas')
  loop
    execute format(
      'select exists (select 1 from %I.%I where %I = $1)',
      v_item.table_schema,
      v_item.table_name,
      v_item.column_name
    )
    into v_existe
    using p_user_id;

    if v_existe then
      v_bloqueios := v_bloqueios || jsonb_build_array(
        v_item.table_name || '.' || v_item.column_name
      );
    end if;
  end loop;

  for v_item in
    select distinct
      namespace.nspname as table_schema,
      classe.relname as table_name,
      atributo.attname as column_name
    from pg_constraint restricao
    join pg_class classe on classe.oid = restricao.conrelid
    join pg_namespace namespace on namespace.oid = classe.relnamespace
    join pg_attribute atributo
      on atributo.attrelid = restricao.conrelid
     and atributo.attnum = restricao.conkey[1]
    where restricao.contype = 'f'
      and restricao.confrelid = 'auth.users'::regclass
      and array_length(restricao.conkey, 1) = 1
      and namespace.nspname = 'public'
      and classe.relname not in ('usuarios_empresa', 'usuarios_contas')
      and atributo.attname not in ('user_id', 'usuario_id')
  loop
    execute format(
      'select exists (select 1 from %I.%I where %I = $1)',
      v_item.table_schema,
      v_item.table_name,
      v_item.column_name
    )
    into v_existe
    using p_user_id;

    if v_existe then
      v_bloqueios := v_bloqueios || jsonb_build_array(
        v_item.table_name || '.' || v_item.column_name
      );
    end if;
  end loop;

  return jsonb_build_object(
    'pode_excluir_total', jsonb_array_length(v_bloqueios) = 0,
    'bloqueios', v_bloqueios
  );
end;
$$;

revoke all on function public.auditar_exclusao_total_usuario_rpc(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.auditar_exclusao_total_usuario_rpc(uuid, uuid)
  to service_role;
