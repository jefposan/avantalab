-- Produtos criados pela carga administrativa entram em estudo e não devem
-- disparar a publicação de AvantaVendas sem uma sessão humana.
begin;

create or replace function public.publicar_alteracao_catalogo_avantavendas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  perform public.publicar_produto_catalogo_avantavendas(new.id);
  return new;
end;
$$;

commit;
