-- Disponibilidade geral; somente o backend autenticado usa o papel runtime.
-- Sem instalação em massa, alteração de planos, certificados ou documentos.
begin;
set local lock_timeout = '5s';

create or replace function public.vendas_runtime_empresa_liberada(p_empresa_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.empresas e
    join public.empresa_modulos m on m.empresa_id=e.id
    where e.id=p_empresa_id and e.tipo_perfil='empresa'
      and m.modulo_id='vendas' and m.ativo=true
      and (m.expira_em is null or m.expira_em>now())
  );
$$;
revoke all on function public.vendas_runtime_empresa_liberada(uuid) from public,anon,authenticated;
grant execute on function public.vendas_runtime_empresa_liberada(uuid) to avanta_vendas_runtime;

-- Adapta apenas as políticas do papel dedicado que contêm a antiga empresa.
-- Mantém comandos, tabelas, condições adicionais e permissões dos outros papéis.
do $migration$
declare
  politica record;
  expressao text;
  verificacao text;
  padrao text := '([a-z_][a-z0-9_.]*) = ''ec9604fd-38f2-429b-9c00-c4bc6c642b0e''::uuid';
  definicao text;
begin
  for politica in
    select * from pg_policies
    where 'avanta_vendas_runtime'=any(roles)
      and (coalesce(qual,'') like '%ec9604fd-38f2-429b-9c00-c4bc6c642b0e%'
        or coalesce(with_check,'') like '%ec9604fd-38f2-429b-9c00-c4bc6c642b0e%')
  loop
    if politica.roles<>array['avanta_vendas_runtime']::name[] then
      raise exception 'Política compartilhada exige revisão: %.%',politica.tablename,politica.policyname;
    end if;
    expressao := regexp_replace(politica.qual,padrao,'public.vendas_runtime_empresa_liberada(\1)','g');
    verificacao := regexp_replace(politica.with_check,padrao,'public.vendas_runtime_empresa_liberada(\1)','g');
    if coalesce(expressao,'') like '%ec9604fd-38f2-429b-9c00-c4bc6c642b0e%'
      or coalesce(verificacao,'') like '%ec9604fd-38f2-429b-9c00-c4bc6c642b0e%' then
      raise exception 'Condição do piloto não reconhecida: %.%',politica.tablename,politica.policyname;
    end if;
    execute format('alter policy %I on %I.%I%s%s',politica.policyname,politica.schemaname,politica.tablename,
      case when expressao is null then '' else ' using ('||expressao||')' end,
      case when verificacao is null then '' else ' with check ('||verificacao||')' end);
  end loop;

  -- Preserva o corpo e as guardas atuais, inclusive autorização por área.
  definicao := pg_get_functiondef('public.vendas_reservar_numero_operacao(uuid,uuid)'::regprocedure);
  definicao := replace(definicao,
    'and p_empresa_id <> ''ec9604fd-38f2-429b-9c00-c4bc6c642b0e''::uuid',
    'and not public.vendas_runtime_empresa_liberada(p_empresa_id)');
  definicao := replace(definicao,'O runtime piloto não pode acessar outra empresa.','O módulo Vendas e Serviços não está ativo nesta empresa.');
  if definicao like '%ec9604fd-38f2-429b-9c00-c4bc6c642b0e%' then
    raise exception 'A guarda de numeração exige revisão antes da liberação.';
  end if;
  execute definicao;
end
$migration$;

comment on function public.vendas_runtime_empresa_liberada(uuid) is
  'Recorte do papel backend: perfil empresarial com Vendas instalado e vigente. A aplicação valida sessão, vínculo e permissões antes de consultar repositórios filtrados por empresa.';
comment on role avanta_vendas_runtime is
  'Backend Vendas com menor privilégio e RLS para empresas com módulo ativo; sessão e permissões verificadas na aplicação.';
commit;
