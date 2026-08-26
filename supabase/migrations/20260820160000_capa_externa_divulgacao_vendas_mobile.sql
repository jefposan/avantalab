-- A capa externa pertence somente à pasta. Ela não cria um material de divulgação
-- e, portanto, não é exibida na galeria do AvantaVendas.
alter table public.vendas_mobile_divulgacao_pastas
  add column if not exists capa_arquivo_path text,
  add column if not exists capa_arquivo_url text;

comment on column public.vendas_mobile_divulgacao_pastas.capa_arquivo_path is
  'Arquivo de imagem usado exclusivamente como capa externa da pasta.';
comment on column public.vendas_mobile_divulgacao_pastas.capa_arquivo_url is
  'URL pública da imagem usada exclusivamente como capa externa da pasta.';

create or replace function public.validar_capa_pasta_divulgacao_vendas_mobile()
returns trigger
language plpgsql
as $$
declare
  v_material_empresa uuid;
  v_material_pasta uuid;
  v_material_tipo text;
  v_material_ativo boolean;
  v_pasta_atual uuid;
  v_pasta_pai uuid;
  v_descendente boolean := false;
begin
  if (new.capa_arquivo_path is null) <> (new.capa_arquivo_url is null) then
    raise exception 'A capa externa precisa informar arquivo e URL juntos.';
  end if;

  if new.capa_arquivo_url is not null then
    if new.pasta_pai_id is not null then
      raise exception 'Somente pastas principais podem receber uma capa personalizada.';
    end if;
    if new.capa_material_id is not null then
      raise exception 'A pasta deve usar uma capa por vez.';
    end if;
    return new;
  end if;

  if new.capa_material_id is null then
    return new;
  end if;

  if new.pasta_pai_id is not null then
    raise exception 'Somente pastas principais podem receber uma capa personalizada.';
  end if;

  select empresa_id, pasta_id, tipo, ativo
    into v_material_empresa, v_material_pasta, v_material_tipo, v_material_ativo
  from public.vendas_mobile_divulgacao_materiais
  where id = new.capa_material_id;

  if not found
    or v_material_empresa <> new.empresa_id
    or v_material_tipo <> 'imagem'
    or not v_material_ativo then
    raise exception 'A capa precisa ser uma imagem ativa da mesma empresa.';
  end if;

  v_pasta_atual := v_material_pasta;
  while v_pasta_atual is not null loop
    select pasta_pai_id into v_pasta_pai
    from public.vendas_mobile_divulgacao_pastas
    where id = v_pasta_atual and empresa_id = new.empresa_id;

    exit when not found or v_pasta_pai is null;
    if v_pasta_pai = new.id then
      v_descendente := true;
      exit;
    end if;
    v_pasta_atual := v_pasta_pai;
  end loop;

  if not v_descendente then
    raise exception 'A capa precisa estar publicada dentro de uma subpasta desta pasta principal.';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_capa_pasta_divulgacao_vendas_mobile_trigger
  on public.vendas_mobile_divulgacao_pastas;
create trigger validar_capa_pasta_divulgacao_vendas_mobile_trigger
before insert or update of capa_material_id, capa_arquivo_path, capa_arquivo_url, pasta_pai_id, empresa_id
on public.vendas_mobile_divulgacao_pastas
for each row execute function public.validar_capa_pasta_divulgacao_vendas_mobile();
