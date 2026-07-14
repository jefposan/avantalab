alter table public.vendas_mobile_divulgacao_pastas
  add column if not exists pasta_pai_id uuid
  references public.vendas_mobile_divulgacao_pastas(id) on delete cascade;

create index if not exists vendas_divulgacao_pastas_pai_idx
  on public.vendas_mobile_divulgacao_pastas (empresa_id, pasta_pai_id, ordem, criado_em desc);

create or replace function public.validar_pasta_divulgacao_vendas_mobile()
returns trigger
language plpgsql
as $$
declare
  v_empresa_pai uuid;
  v_ancestral uuid;
begin
  if new.pasta_pai_id is null then
    return new;
  end if;

  if new.pasta_pai_id = new.id then
    raise exception 'Uma pasta não pode ser filha dela mesma.';
  end if;

  select empresa_id into v_empresa_pai
  from public.vendas_mobile_divulgacao_pastas
  where id = new.pasta_pai_id;

  if v_empresa_pai is null or v_empresa_pai <> new.empresa_id then
    raise exception 'A pasta-pai precisa pertencer à mesma empresa.';
  end if;

  v_ancestral := new.pasta_pai_id;
  while v_ancestral is not null loop
    if v_ancestral = new.id then
      raise exception 'Não é possível criar um ciclo entre pastas.';
    end if;
    select pasta_pai_id into v_ancestral
    from public.vendas_mobile_divulgacao_pastas
    where id = v_ancestral;
  end loop;

  return new;
end;
$$;

drop trigger if exists validar_pasta_divulgacao_vendas_mobile_trigger
  on public.vendas_mobile_divulgacao_pastas;
create trigger validar_pasta_divulgacao_vendas_mobile_trigger
before insert or update of pasta_pai_id, empresa_id
on public.vendas_mobile_divulgacao_pastas
for each row execute function public.validar_pasta_divulgacao_vendas_mobile();
