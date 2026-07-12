create or replace function public.criar_primeiro_perfil_cadastro_rpc(
  p_nome_empresa text,
  p_tipo_perfil text default 'empresa'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa public.empresas;
  v_empresa_id uuid;
  v_email text;
  v_nome_empresa text;
  v_nome_usuario text;
  v_tipo_perfil text;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado nao encontrado.';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if trim(v_email) = '' then
    raise exception 'Email do usuario autenticado nao encontrado.';
  end if;

  v_nome_empresa := coalesce(nullif(trim(p_nome_empresa), ''), 'Meu perfil');
  v_tipo_perfil := case when p_tipo_perfil = 'pessoal' then 'pessoal' else 'empresa' end;
  v_nome_usuario := coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'nome'), ''),
    split_part(v_email, '@', 1)
  );

  -- Serializa somente a criacao do primeiro perfil deste usuario. A RPC usada
  -- para perfis adicionais permanece livre para criar quantos forem desejados.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  select ue.empresa_id
    into v_empresa_id
    from public.usuarios_empresa ue
   where ue.user_id = auth.uid()
     and ue.status = 'ativo'
   order by ue.id
   limit 1;

  if v_empresa_id is not null then
    select * into v_empresa from public.empresas where id = v_empresa_id;
    return jsonb_build_object('empresa', to_jsonb(v_empresa), 'criado', false);
  end if;

  insert into public.empresas (nome, tipo_perfil)
  values (v_nome_empresa, v_tipo_perfil)
  returning * into v_empresa;

  insert into public.usuarios_empresa (
    empresa_id,
    user_id,
    nome,
    email,
    perfil,
    status
  )
  values (
    v_empresa.id,
    auth.uid(),
    v_nome_usuario,
    v_email,
    'gestor_master',
    'ativo'
  );

  insert into public.configuracoes (
    empresa_id,
    cor_primaria,
    dark_mode,
    duplicados_ativo,
    logo_url,
    logo_settings
  )
  values (
    v_empresa.id,
    '#003E73',
    false,
    true,
    '',
    '{"scale":100,"x":0,"y":0}'::jsonb
  )
  on conflict (empresa_id) do nothing;

  return jsonb_build_object('empresa', to_jsonb(v_empresa), 'criado', true);
end;
$$;

revoke all on function public.criar_primeiro_perfil_cadastro_rpc(text, text) from public;
grant execute on function public.criar_primeiro_perfil_cadastro_rpc(text, text) to authenticated;

-- Mantem a criacao deliberada de perfis adicionais, mas registra no vinculo
-- o nome do usuario autenticado, e nao o nome fantasia da empresa.
create or replace function public.criar_empresa_inicial_rpc(p_nome_empresa text)
returns public.empresas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa public.empresas;
  v_email text;
  v_nome_empresa text;
  v_nome_usuario text;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado nao encontrado.';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if trim(v_email) = '' then
    raise exception 'Email do usuario autenticado nao encontrado.';
  end if;

  v_nome_empresa := coalesce(nullif(trim(p_nome_empresa), ''), 'Meu perfil');
  v_nome_usuario := coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'nome'), ''),
    split_part(v_email, '@', 1)
  );

  insert into public.empresas (nome)
  values (v_nome_empresa)
  returning * into v_empresa;

  insert into public.usuarios_empresa (
    empresa_id,
    user_id,
    nome,
    email,
    perfil,
    status
  )
  values (
    v_empresa.id,
    auth.uid(),
    v_nome_usuario,
    v_email,
    'gestor_master',
    'ativo'
  );

  insert into public.configuracoes (
    empresa_id,
    cor_primaria,
    dark_mode,
    duplicados_ativo,
    logo_url,
    logo_settings
  )
  values (
    v_empresa.id,
    '#003E73',
    false,
    true,
    '',
    '{"scale":100,"x":0,"y":0}'::jsonb
  )
  on conflict (empresa_id) do nothing;

  return v_empresa;
end;
$$;
