-- Aprovar um código empresarial é uma escolha comercial explícita do usuário.
-- Esse vínculo deve assumir Catálogo, Divulgação e Novidades sem ser substituído
-- por acessos administrativos criados automaticamente em outros perfis.

create or replace function public.ativar_vinculo_comercial_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deve_ativar boolean;
begin
  if new.status = 'ativo' and (tg_op = 'INSERT' or old.status is distinct from 'ativo') then
    insert into public.vendas_mobile_vinculos_comerciais (
      user_id,
      empresa_id,
      ativo,
      desvinculado_em
    )
    values (
      new.user_id,
      new.empresa_id,
      false,
      null
    )
    on conflict (user_id, empresa_id) do update
      set atualizado_em = now();

    v_deve_ativar := new.papel = 'vendedor' or not exists (
      select 1
      from public.vendas_mobile_vinculos_comerciais vinculo
      where vinculo.user_id = new.user_id
        and vinculo.ativo = true
    );

    if v_deve_ativar then
      update public.vendas_mobile_vinculos_comerciais
         set ativo = false,
             desvinculado_em = coalesce(desvinculado_em, now()),
             atualizado_em = now()
       where user_id = new.user_id
         and empresa_id <> new.empresa_id
         and ativo = true;

      update public.vendas_mobile_vinculos_comerciais
         set ativo = true,
             desvinculado_em = null,
             atualizado_em = now()
       where user_id = new.user_id
         and empresa_id = new.empresa_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ativar_vinculo_comercial_vendas_mobile_trigger
  on public.vendas_mobile_acessos;
create trigger ativar_vinculo_comercial_vendas_mobile_trigger
after insert or update of status
on public.vendas_mobile_acessos
for each row execute function public.ativar_vinculo_comercial_vendas_mobile();

-- Repara aprovações anteriores que ficaram inativas e sem data de
-- desvinculação por causa da regra antiga. A aprovação mais recente define o
-- vínculo comercial; acessos administrativos às demais empresas permanecem.
do $$
declare
  v_alvo record;
begin
  for v_alvo in
    select distinct on (solicitacao.user_id)
      solicitacao.user_id,
      solicitacao.empresa_id,
      coalesce(solicitacao.analisado_em, solicitacao.atualizado_em, now()) as aprovado_em
    from public.vendas_mobile_solicitacoes_acesso solicitacao
    join public.vendas_mobile_acessos acesso
      on acesso.user_id = solicitacao.user_id
     and acesso.empresa_id = solicitacao.empresa_id
     and acesso.status = 'ativo'
    join public.vendas_mobile_vinculos_comerciais vinculo
      on vinculo.user_id = solicitacao.user_id
     and vinculo.empresa_id = solicitacao.empresa_id
     and vinculo.ativo = false
     and vinculo.desvinculado_em is null
    where solicitacao.status = 'aprovada'
    order by solicitacao.user_id,
      coalesce(solicitacao.analisado_em, solicitacao.atualizado_em) desc
  loop
    update public.vendas_mobile_vinculos_comerciais
       set ativo = false,
           desvinculado_em = coalesce(desvinculado_em, v_alvo.aprovado_em),
           atualizado_em = now()
     where user_id = v_alvo.user_id
       and empresa_id <> v_alvo.empresa_id
       and ativo = true;

    update public.vendas_mobile_vinculos_comerciais
       set ativo = true,
           desvinculado_em = null,
           atualizado_em = now()
     where user_id = v_alvo.user_id
       and empresa_id = v_alvo.empresa_id;
  end loop;
end;
$$;
