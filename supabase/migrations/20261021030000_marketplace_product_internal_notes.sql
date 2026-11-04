-- Observações privadas por produto, fora da ficha/descrição de publicação.
begin;
create table public.marketplace_product_internal_notes (
  empresa_id uuid not null references public.empresas(id),
  product_id uuid not null,
  notes text not null default '' check (char_length(notes)<=160),
  revision bigint not null default 1 check (revision>=1),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(empresa_id,product_id),
  foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id)
);
alter table public.marketplace_product_internal_notes enable row level security;
revoke all on public.marketplace_product_internal_notes from public,anon,authenticated;
grant select,insert,update on public.marketplace_product_internal_notes to service_role;

create function public.marketplace_warehouse_command_with_notes(p_empresa_id uuid,p_actor_id uuid,p_action text,p_data jsonb,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare repeated boolean; result jsonb; current_revision bigint; notes_value text;
begin
  -- Mesma ordem de trava do comando publicado; saldo + observação + recibo
  -- confirmam juntos. Qualquer falha das observações desfaz também o saldo.
  perform pg_advisory_xact_lock(hashtextextended('warehouse:'||p_empresa_id::text,0));
  select exists(select 1 from marketplace_warehouse_operations where empresa_id=p_empresa_id and request_key=p_request_key) into repeated;
  -- O original verifica ator, permissão atual, empresa, payload e recibo,
  -- inclusive em repetição. Não duplica sua lógica ou enfraquece suas guardas.
  result:=marketplace_warehouse_command(p_empresa_id,p_actor_id,p_action,p_data,p_request_key);
  if repeated or not (p_data ? 'internalNotes') then return result; end if;
  if p_action not in ('add','set','transfer') then raise exception 'Observações disponíveis apenas para produtos do estoque.'; end if;
  if jsonb_typeof(p_data->'internalNotes') is distinct from 'string'
    or char_length(p_data->>'internalNotes')>160
    or (p_data->>'internalNotesRevision') is null
    or (p_data->>'internalNotesRevision') !~ '^[0-9]+$' then
    raise exception 'Informe observações internas de até 160 caracteres e atualize sua revisão.';
  end if;
  select revision into current_revision from marketplace_product_internal_notes
    where empresa_id=p_empresa_id and product_id=(p_data->>'productId')::uuid for update;
  if coalesce(current_revision,0)<>(p_data->>'internalNotesRevision')::bigint then
    raise exception 'As observações foram alteradas por outro usuário. Atualize antes de continuar.';
  end if;
  notes_value:=trim(p_data->>'internalNotes');
  insert into marketplace_product_internal_notes(empresa_id,product_id,notes,revision,updated_by)
    values(p_empresa_id,(p_data->>'productId')::uuid,notes_value,1,p_actor_id)
    on conflict(empresa_id,product_id) do update set notes=excluded.notes,
      revision=marketplace_product_internal_notes.revision+1,updated_by=excluded.updated_by,updated_at=now();
  return result;
end $$;
revoke all on function public.marketplace_warehouse_command_with_notes(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_warehouse_command_with_notes(uuid,uuid,text,jsonb,uuid) to service_role;
notify pgrst,'reload schema';
commit;
