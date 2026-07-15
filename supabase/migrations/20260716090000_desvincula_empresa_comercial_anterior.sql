-- Um vendedor possui somente um vínculo comercial. Conteúdos anteriores podem
-- ficar como histórico congelado, sem acesso nem atualizações da empresa antiga.
alter table public.vendas_mobile_vinculos_comerciais
  add column if not exists desvinculado_em timestamptz;

update public.vendas_mobile_vinculos_comerciais
set desvinculado_em = coalesce(desvinculado_em, atualizado_em)
where ativo = false;

create or replace function public.ativar_vinculo_comercial_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'ativo' and (tg_op = 'INSERT' or old.status is distinct from 'ativo') then
    update public.vendas_mobile_vinculos_comerciais
       set ativo = false, desvinculado_em = coalesce(desvinculado_em, now()), atualizado_em = now()
     where user_id = new.user_id and ativo = true and empresa_id <> new.empresa_id;
    -- Encerrar o acesso comercial anterior: não há dois vínculos simultâneos.
    update public.vendas_mobile_acessos
       set status = 'bloqueado', atualizado_em = now()
     where user_id = new.user_id and status = 'ativo' and empresa_id <> new.empresa_id;
    insert into public.vendas_mobile_vinculos_comerciais (user_id, empresa_id, ativo, desvinculado_em)
    values (new.user_id, new.empresa_id, true, null)
    on conflict (user_id, empresa_id) do update
      set ativo = true, desvinculado_em = null, atualizado_em = now();
  end if;
  return new;
end;
$$;

-- Histórico é somente leitura e congelado na data de desvinculação.
drop policy if exists vendas_mobile_conteudos_leitura on public.vendas_mobile_conteudos;
create policy vendas_mobile_conteudos_leitura on public.vendas_mobile_conteudos for select to authenticated
using (ativo = true and (
  (pagina = 'informacoes' and empresa_id is null)
  or (pagina = 'novidades' and exists (
    select 1 from public.vendas_mobile_vinculos_comerciais v
    where v.user_id = auth.uid() and v.empresa_id = vendas_mobile_conteudos.empresa_id and v.novidades_ativas
      and (v.ativo or (v.desvinculado_em is not null and vendas_mobile_conteudos.criado_em <= v.desvinculado_em))
  ))
));

drop policy if exists vendas_divulgacao_pastas_leitura on public.vendas_mobile_divulgacao_pastas;
create policy vendas_divulgacao_pastas_leitura on public.vendas_mobile_divulgacao_pastas for select to authenticated
using (ativo = true and exists (
  select 1 from public.vendas_mobile_vinculos_comerciais v
  where v.user_id = auth.uid() and v.empresa_id = vendas_mobile_divulgacao_pastas.empresa_id and v.divulgacao_ativa
    and (v.ativo or (v.desvinculado_em is not null and vendas_mobile_divulgacao_pastas.criado_em <= v.desvinculado_em))
));

drop policy if exists vendas_divulgacao_materiais_leitura on public.vendas_mobile_divulgacao_materiais;
create policy vendas_divulgacao_materiais_leitura on public.vendas_mobile_divulgacao_materiais for select to authenticated
using (ativo = true and exists (
  select 1 from public.vendas_mobile_divulgacao_pastas p
  join public.vendas_mobile_vinculos_comerciais v on v.empresa_id = p.empresa_id and v.user_id = auth.uid()
  where p.id = vendas_mobile_divulgacao_materiais.pasta_id and v.divulgacao_ativa
    and (v.ativo or (v.desvinculado_em is not null and p.criado_em <= v.desvinculado_em and vendas_mobile_divulgacao_materiais.criado_em <= v.desvinculado_em))
));
