-- Fecha a janela de provisionamento e protege a numeração para o papel piloto.
begin;

revoke all on function public.vendas_definir_senha_runtime(text) from service_role;
drop function public.vendas_definir_senha_runtime(text);

create or replace function public.vendas_reservar_numero_operacao(
  p_empresa_id uuid,
  p_operacao_id uuid
)
returns table(operacao_tipo text, operacao_ano integer, operacao_numero bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_operacao public.vendas_operacoes;
  v_numero bigint;
  v_ano integer;
begin
  if session_user = 'avanta_vendas_runtime'
    and p_empresa_id <> 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid
  then
    raise exception 'O runtime piloto não pode acessar outra empresa.' using errcode='42501';
  end if;

  select * into v_operacao
  from public.vendas_operacoes
  where empresa_id=p_empresa_id and id=p_operacao_id
  for update;

  if not found then
    raise exception 'Operação comercial não localizada.' using errcode='P0002';
  end if;
  if v_operacao.numero is not null then
    return query select v_operacao.tipo, v_operacao.ano, v_operacao.numero;
    return;
  end if;
  if v_operacao.situacao not in ('rascunho','salvo') then
    raise exception 'Somente um documento em preparação pode receber número.' using errcode='23514';
  end if;

  v_ano := extract(year from timezone('America/Sao_Paulo', v_operacao.criado_em))::integer;
  insert into public.vendas_sequencias(empresa_id,tipo,ano,proximo_numero)
  values (p_empresa_id,v_operacao.tipo,v_ano,1)
  on conflict on constraint vendas_sequencias_pkey do nothing;

  select sequencia.proximo_numero into v_numero
  from public.vendas_sequencias sequencia
  where sequencia.empresa_id=p_empresa_id
    and sequencia.tipo=v_operacao.tipo
    and sequencia.ano=v_ano
  for update;

  update public.vendas_sequencias sequencia
  set proximo_numero=v_numero+1, atualizado_em=now()
  where sequencia.empresa_id=p_empresa_id
    and sequencia.tipo=v_operacao.tipo
    and sequencia.ano=v_ano;

  update public.vendas_operacoes
  set ano=v_ano, numero=v_numero, atualizado_em=now()
  where empresa_id=p_empresa_id and id=p_operacao_id;

  return query select v_operacao.tipo, v_ano, v_numero;
end;
$$;

revoke all on function public.vendas_reservar_numero_operacao(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.vendas_reservar_numero_operacao(uuid,uuid)
  to service_role, avanta_vendas_runtime;

commit;
