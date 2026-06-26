-- ─────────────────────────────────────────────────────────────
-- Permite que QUALQUER usuario autenticado crie seu proprio perfil
-- (empresa ou pessoal), independente do papel. O usuario passa a ser
-- gestor_master do NOVO perfil criado.
-- Rode este script inteiro no SQL Editor do painel do Supabase.
-- ─────────────────────────────────────────────────────────────

create or replace function public.criar_empresa_inicial_rpc(p_nome_empresa text)
returns public.empresas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa public.empresas;
  v_email text;
  v_nome text;
begin
  v_email := auth.jwt() ->> 'email';

  if auth.uid() is null then
    raise exception 'Usuário autenticado não encontrado.';
  end if;

  if v_email is null or trim(v_email) = '' then
    raise exception 'Email do usuário autenticado não encontrado.';
  end if;

  -- (Removida a restricao "Somente o Gestor Master pode criar uma nova empresa".)
  -- Qualquer usuario autenticado pode criar seu proprio perfil; ele vira
  -- gestor_master do novo perfil.

  v_nome := coalesce(nullif(trim(p_nome_empresa), ''), 'Minha Empresa');

  insert into public.empresas (nome)
  values (v_nome)
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
    v_nome,
    lower(v_email),
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
