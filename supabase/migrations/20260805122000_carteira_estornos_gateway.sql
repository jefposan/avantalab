alter table public.carteiras drop constraint if exists carteiras_saldo_centavos_check;
alter table public.carteira_movimentacoes drop constraint if exists carteira_movimentacoes_saldo_apos_centavos_check;
alter table public.carteiras add column if not exists gateway_customer_id text;
create unique index if not exists carteiras_gateway_customer_unique on public.carteiras (gateway_customer_id) where gateway_customer_id is not null;

create or replace function public.reverter_recarga_carteira(p_recarga_id uuid, p_gateway_payment_id text, p_status text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_recarga public.carteira_recargas%rowtype; v_saldo bigint; v_chave text;
begin
  select * into v_recarga from public.carteira_recargas where id = p_recarga_id and gateway_payment_id = p_gateway_payment_id for update;
  if not found then raise exception 'recarga_nao_encontrada'; end if;
  v_chave := 'reversao-recarga:' || v_recarga.id;
  if exists (select 1 from public.carteira_movimentacoes where idempotencia = v_chave) then
    select saldo_centavos into v_saldo from public.carteiras where empresa_id = v_recarga.empresa_id;
    return coalesce(v_saldo, 0);
  end if;
  update public.carteira_recargas set status = case when p_status = 'chargeback' then 'chargeback' else 'estornada' end, atualizado_em = now() where id = v_recarga.id;
  if v_recarga.creditada_em is null then return 0; end if;
  update public.carteiras set saldo_centavos = saldo_centavos - v_recarga.valor_centavos, atualizado_em = now() where empresa_id = v_recarga.empresa_id returning saldo_centavos into v_saldo;
  insert into public.carteira_movimentacoes (empresa_id, usuario_id, tipo, valor_centavos, saldo_apos_centavos, referencia_tipo, referencia_id, idempotencia, descricao)
    values (v_recarga.empresa_id, v_recarga.criado_por, case when p_status = 'chargeback' then 'chargeback' else 'estorno' end, -v_recarga.valor_centavos, v_saldo, 'recarga', v_recarga.id, v_chave, case when p_status = 'chargeback' then 'Contestação de pagamento da recarga' else 'Estorno do pagamento da recarga' end);
  return v_saldo;
end $$;

revoke all on function public.reverter_recarga_carteira(uuid,text,text) from public, anon, authenticated;
grant execute on function public.reverter_recarga_carteira(uuid,text,text) to service_role;
