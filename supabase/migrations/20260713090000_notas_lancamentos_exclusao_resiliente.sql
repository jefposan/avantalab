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
    begin
      delete from storage.objects
      where bucket_id = 'notas-lancamentos'
        and name = caminho;
    exception when others then
      raise warning 'Não foi possível limpar a nota %: %', caminho, sqlerrm;
    end;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
