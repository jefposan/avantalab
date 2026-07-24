create or replace function public.recebimentos_importar_planilha(p_nome_perfil text, p_linhas jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_perfis_encontrados integer;
  v_locais integer := 0;
  v_clientes integer := 0;
begin
  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) = 0 then
    raise exception 'A planilha não possui linhas válidas para importar.';
  end if;

  select count(*), (array_agg(id order by id))[1]
  into v_perfis_encontrados, v_empresa_id
  from public.empresas
  where upper(trim(nome)) = upper(trim(p_nome_perfil));

  if v_perfis_encontrados = 0 then raise exception 'Perfil "%" não encontrado.', p_nome_perfil; end if;
  if v_perfis_encontrados > 1 then raise exception 'Há mais de um perfil com o nome "%".', p_nome_perfil; end if;

  if exists (
    select 1 from jsonb_to_recordset(p_linhas) as linha(status text, empresa text, subempresa text, valor numeric)
    where nullif(trim(linha.status), '') is null or nullif(trim(linha.empresa), '') is null
      or nullif(trim(linha.subempresa), '') is null or lower(trim(linha.status)) not in ('ativo', 'cancelado', 'inativo')
      or (linha.valor is not null and linha.valor <= 0)
  ) then raise exception 'A importação contém status, nome ou valor inválido.'; end if;

  delete from public.recebimentos_eventos where empresa_id = v_empresa_id;
  delete from public.recebimentos_lancamentos where empresa_id = v_empresa_id;
  delete from public.recebimentos_subempresas where empresa_id = v_empresa_id;
  delete from public.recebimentos_empresas where empresa_id = v_empresa_id;

  with locais as (
    select distinct trim(linha.empresa) as nome
    from jsonb_to_recordset(p_linhas) as linha(status text, empresa text, subempresa text, valor numeric)
  )
  insert into public.recebimentos_empresas (empresa_id, nome, tipo_cadastro, endereco, cep, logradouro, bairro, cidade, estado, numero, complemento, responsavel, telefone, email, ativo)
  select v_empresa_id, nome, 'local_agrupador', '', '', '', '', '', '', '', '', '', '', '', true from locais;
  get diagnostics v_locais = row_count;

  insert into public.recebimentos_subempresas (empresa_id, recebimento_empresa_id, nome, endereco, logradouro, numero, complemento, shopping_galeria, loja_sala, responsavel, cep, bairro, cidade, estado, valor_combinado, frequencia_recebimento, dias_semana, dia_mes, mes_inicio, dia_vencimento, ativo)
  select v_empresa_id, local.id, trim(linha.subempresa), '', '', '', '', '', '', '', '', '', '', '', linha.valor, 'mensal', '{}', 30, null, 30, lower(trim(linha.status)) = 'ativo'
  from jsonb_to_recordset(p_linhas) as linha(status text, empresa text, subempresa text, valor numeric)
  join public.recebimentos_empresas local on local.empresa_id = v_empresa_id and local.tipo_cadastro = 'local_agrupador' and local.nome = trim(linha.empresa);
  get diagnostics v_clientes = row_count;

  perform public.recebimentos_sincronizar_recorrencias(v_empresa_id);
  return jsonb_build_object('empresa_id', v_empresa_id, 'locais', v_locais, 'clientes', v_clientes);
end;
$$;
