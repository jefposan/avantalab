-- Legados duplicados são preservados para conferência de vínculos e saldos.
-- Todos os caminhos de escrita ficam protegidos, inclusive draft/import e restauração.
begin;
create index if not exists marketplace_products_active_ean_lookup
  on public.marketplace_products (empresa_id, (ltrim(ean, '0')))
  where archived_at is null and ean is not null;

create or replace function public.marketplace_guard_product_ean()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is not null or new.ean is null or new.ean = '' then return new; end if;
  if TG_OP = 'UPDATE' then
    if old.empresa_id = new.empresa_id and old.archived_at is null
       and ltrim(old.ean, '0') is not distinct from ltrim(new.ean, '0') then
      return new; -- Não impedir correções de preço/estoque dos legados.
    end if;
  end if;
  -- Mesma trava dos registradores de pesquisa/importação; sem soma de saldos.
  perform pg_advisory_xact_lock(hashtextextended('price-products:' || new.empresa_id::text, 0));
  if exists(select 1 from public.marketplace_products p
    where p.empresa_id = new.empresa_id and p.archived_at is null
      and p.id <> new.id and ltrim(p.ean, '0') = ltrim(new.ean, '0')) then
    raise exception using errcode = '23505',
      message = 'marketplace_products_active_ean: EAN já cadastrado nesta empresa.',
      constraint = 'marketplace_products_active_ean';
  end if;
  return new;
end $$;
revoke all on function public.marketplace_guard_product_ean() from public;
create trigger marketplace_products_active_ean_guard
before insert or update of empresa_id, ean, archived_at on public.marketplace_products
for each row execute function public.marketplace_guard_product_ean();
commit;
