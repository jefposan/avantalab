-- PDFs passam a ser materiais de divulgação com capa gerada no envio.
alter table public.vendas_mobile_divulgacao_materiais
  drop constraint if exists vendas_mobile_divulgacao_materiais_tipo_check;

alter table public.vendas_mobile_divulgacao_materiais
  add constraint vendas_mobile_divulgacao_materiais_tipo_check
  check (tipo in ('imagem', 'video', 'pdf'));

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf'
]
where id = 'vendas-divulgacao';

-- PDFs seguem a mesma fila no Cloud Run que gera as capas dos vídeos.
create or replace function public.enfileirar_thumbnail_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
declare
  v_job_id uuid;
begin
  if new.tipo not in ('video', 'pdf') or new.miniatura_url is not null then
    return new;
  end if;

  insert into public.vendas_mobile_thumbnail_jobs (material_id)
  values (new.id)
  on conflict (material_id) do update set
    status = 'pendente',
    proxima_tentativa_em = now(),
    atualizado_em = now()
  returning id into v_job_id;

  perform public.despachar_thumbnail_vendas_mobile(v_job_id);
  return new;
end;
$$;
