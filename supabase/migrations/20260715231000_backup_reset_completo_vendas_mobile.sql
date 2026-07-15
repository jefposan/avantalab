-- Completa a cópia de segurança automática feita antes do reset.
create or replace function public.resetar_vendas_mobile_rpc(p_confirmacao text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_backup_id uuid; v_empresa_atual uuid;
begin
  if auth.uid() is null or upper(trim(coalesce(p_confirmacao,''))) <> 'RESETAR' then raise exception 'Confirmação de segurança inválida.'; end if;
  insert into public.vendas_mobile_backups_reset (user_id, dados) values (auth.uid(), jsonb_build_object(
    'gerado_em', now(),
    'clientes', coalesce((select jsonb_agg(to_jsonb(c)) from public.vendas_mobile_clientes c where c.user_id = auth.uid()), '[]'::jsonb),
    'pedidos', coalesce((select jsonb_agg(to_jsonb(p)) from public.vendas_mobile_pedidos p where p.user_id = auth.uid()), '[]'::jsonb),
    'itens_pedidos', coalesce((select jsonb_agg(to_jsonb(i)) from public.vendas_mobile_pedido_itens i join public.vendas_mobile_pedidos p on p.id = i.pedido_id where p.user_id = auth.uid()), '[]'::jsonb),
    'pagamentos', coalesce((select jsonb_agg(to_jsonb(p)) from public.vendas_mobile_pagamentos p where p.user_id = auth.uid()), '[]'::jsonb),
    'produtos', coalesce((select jsonb_agg(to_jsonb(p)) from public.vendas_mobile_produtos p where p.user_id = auth.uid()), '[]'::jsonb),
    'agenda', coalesce((select jsonb_agg(to_jsonb(a)) from public.vendas_mobile_agenda a where a.user_id = auth.uid()), '[]'::jsonb),
    'vinculos_comerciais', coalesce((select jsonb_agg(to_jsonb(v)) from public.vendas_mobile_vinculos_comerciais v where v.user_id = auth.uid()), '[]'::jsonb)
  )) returning id into v_backup_id;
  select empresa_id into v_empresa_atual from public.vendas_mobile_vinculos_comerciais where user_id = auth.uid() and ativo limit 1;
  delete from public.vendas_mobile_pagamentos where user_id = auth.uid();
  delete from public.vendas_mobile_pedidos where user_id = auth.uid();
  delete from public.vendas_mobile_agenda where user_id = auth.uid();
  delete from public.vendas_mobile_produtos where user_id = auth.uid();
  delete from public.vendas_mobile_clientes where user_id = auth.uid();
  delete from public.vendas_mobile_catalogo_recebimentos where user_id = auth.uid();
  delete from public.vendas_mobile_importacoes where user_id = auth.uid();
  delete from public.vendas_mobile_vinculos_comerciais where user_id = auth.uid() and not (empresa_id = v_empresa_atual and ativo);
  update public.vendas_mobile_vinculos_comerciais set novidades_ativas = true, divulgacao_ativa = true, catalogo_ativo = true, atualizado_em = now() where user_id = auth.uid() and ativo;
  return v_backup_id;
end;
$$;
