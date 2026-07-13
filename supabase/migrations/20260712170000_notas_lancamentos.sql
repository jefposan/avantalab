alter table public.lancamentos
  add column if not exists nota_arquivo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notas-lancamentos',
  'notas-lancamentos',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.remover_arquivo_nota_lancamento()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  caminho text;
begin
  caminho := case
    when tg_op = 'DELETE' then old.nota_arquivo_path
    when old.nota_arquivo_path is distinct from new.nota_arquivo_path then old.nota_arquivo_path
    else null
  end;

  if caminho is not null and caminho <> '' then
    delete from storage.objects
    where bucket_id = 'notas-lancamentos'
      and name = caminho;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists lancamentos_remover_arquivo_nota on public.lancamentos;
create trigger lancamentos_remover_arquivo_nota
after delete or update of nota_arquivo_path on public.lancamentos
for each row execute function public.remover_arquivo_nota_lancamento();
