create or replace function public.custos_documentos_atualizar_metadados()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  new.revisao := case when tg_op = 'UPDATE' then old.revisao + 1 else 1 end;
  return new;
end;
$$;

drop policy if exists custos_documentos_delete on public.custos_documentos;
revoke delete on public.custos_documentos from authenticated;
