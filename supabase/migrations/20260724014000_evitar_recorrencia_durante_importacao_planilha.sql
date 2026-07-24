-- A importação de uma base legada deve inserir todos os cadastros antes de
-- sincronizar recorrências. Sem essa guarda, o gatilho de subempresa tenta
-- validar uma sessão autenticada a cada linha, inclusive no SQL Editor.

create or replace function public.recebimentos_substituir_previsoes_ao_alterar_vencimento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if current_setting('recebimentos.importacao_planilha', true) = 'on' then
    return new;
  end if;

  if tg_op = 'UPDATE' and (
    old.frequencia_recebimento is distinct from new.frequencia_recebimento or
    old.dias_semana is distinct from new.dias_semana or
    old.dia_mes is distinct from new.dia_mes or
    old.mes_inicio is distinct from new.mes_inicio or
    old.recorrencia_inicio is distinct from new.recorrencia_inicio or
    old.valor_combinado is distinct from new.valor_combinado or
    old.ativo is distinct from new.ativo
  ) then
    delete from public.recebimentos_lancamentos
    where subempresa_id = new.id
      and recorrencia_gerada
      and valor_recebido is null
      and vencimento >= v_hoje;
    perform public.recebimentos_sincronizar_recorrencias(new.empresa_id);
  elsif tg_op = 'INSERT' then
    perform public.recebimentos_sincronizar_recorrencias(new.empresa_id);
  end if;
  return new;
end;
$$;

create or replace function public.recebimentos_importar_planilha(p_nome_perfil text, p_linhas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_perfis_encontrados integer;
  v_locais integer := 0;
  v_clientes integer := 0;
begin
  perform set_config('recebimentos.importacao_planilha', 'on', true);

  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) = 0 then
    raise exception 'A planilha não possui linhas válidas para importar.';
  end if;

  select count(*), (array_agg(id order by id))[1]
    into v_perfis_encontrados, v_empresa_id
  from public.empresas
  where upper(trim(nome)) = upper(trim(p_nome_perfil));

  if v_perfis_encontrados = 0 then
    raise exception 'Perfil "%" não encontrado.', p_nome_perfil;
  end if;
  if v_perfis_encontrados > 1 then
    raise exception 'Há mais de um perfil com o nome "%".', p_nome_perfil;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_linhas) as linha(status text, empresa text, subempresa text, valor numeric)
    where nullif(trim(linha.status), '') is null
       or nullif(trim(linha.empresa), '') is null
       or nullif(trim(linha.subempresa), '') is null
       or lower(trim(linha.status)) not in ('ativo', 'cancelado', 'inativo')
       or (linha.valor is not null and linha.valor <= 0)
  ) then
    raise exception 'A importação contém status, nome ou valor inválido.';
  end if;

  delete from public.recebimentos_lancamentos where empresa_id = v_empresa_id;
  delete from public.recebimentos_subempresas where empresa_id = v_empresa_id;
  delete from public.recebimentos_empresas where empresa_id = v_empresa_id;

  with locais as (
    select distinct trim(linha.empresa) as nome
    from jsonb_to_recordset(p_linhas) as linha(status text, empresa text, subempresa text, valor numeric)
  )
  insert into public.recebimentos_empresas (
    empresa_id, nome, tipo_cadastro, endereco, cep, logradouro, bairro, cidade, estado,
    numero, complemento, responsavel, telefone, email, ativo
  )
  select v_empresa_id, nome, 'local_agrupador', '', '', '', '', '', '', '', '', '', '', '', true
  from locais;
  get diagnostics v_locais = row_count;

  insert into public.recebimentos_subempresas (
    empresa_id, recebimento_empresa_id, nome, endereco, logradouro, numero, complemento,
    shopping_galeria, loja_sala, responsavel, cep, bairro, cidade, estado, valor_combinado,
    frequencia_recebimento, dias_semana, dia_mes, mes_inicio, dia_vencimento, ativo
  )
  select v_empresa_id, local.id, trim(linha.subempresa), '', '', '', '', '', '', '', '', '', '', '',
    linha.valor, 'mensal', '{}', 30, null, 30, lower(trim(linha.status)) = 'ativo'
  from jsonb_to_recordset(p_linhas) as linha(status text, empresa text, subempresa text, valor numeric)
  join public.recebimentos_empresas local
    on local.empresa_id = v_empresa_id
   and local.tipo_cadastro = 'local_agrupador'
   and local.nome = trim(linha.empresa);
  get diagnostics v_clientes = row_count;

  return jsonb_build_object('empresa_id', v_empresa_id, 'locais', v_locais, 'clientes', v_clientes);
end;
$$;
