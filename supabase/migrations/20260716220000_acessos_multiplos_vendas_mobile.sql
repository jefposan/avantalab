-- Um mesmo usuário pode administrar ou operar mais de um perfil no Vendas.
-- O vínculo comercial continua único, mas não pode bloquear os demais acessos.

create or replace function public.ativar_vinculo_comercial_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

    if not exists (
      select 1
      from public.vendas_mobile_vinculos_comerciais vinculo
      where vinculo.user_id = new.user_id
        and vinculo.ativo = true
    ) then
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

-- Para gestores da Gestão, a instalação do módulo é a fonte de verdade.
-- O acesso operacional é reparado automaticamente e não deve fazer a tela
-- afirmar que o módulo está desinstalado.
create or replace function public.modulo_vendas_mobile_ativo_rpc(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.empresa_modulos modulo
    where modulo.empresa_id = p_empresa_id
      and modulo.modulo_id = 'vendas_mobile'
      and modulo.ativo = true
      and (
        exists (
          select 1
          from public.usuarios_empresa acesso_gestao
          where acesso_gestao.empresa_id = p_empresa_id
            and acesso_gestao.user_id = auth.uid()
            and acesso_gestao.status = 'ativo'
            and acesso_gestao.perfil in ('gestor_master', 'administrador')
        )
        or exists (
          select 1
          from public.vendas_mobile_acessos acesso_vendas
          where acesso_vendas.empresa_id = p_empresa_id
            and acesso_vendas.user_id = auth.uid()
            and acesso_vendas.status = 'ativo'
        )
      )
  );
$$;

revoke all on function public.modulo_vendas_mobile_ativo_rpc(uuid) from public;
grant execute on function public.modulo_vendas_mobile_ativo_rpc(uuid) to authenticated;

-- Repara os acessos de gestores de todos os perfis que já possuem o módulo.
-- Antes desta correção, ativar um perfil podia bloquear os demais.
insert into public.vendas_mobile_acessos (
  empresa_id,
  user_id,
  papel,
  status,
  aprovado_por,
  atualizado_em
)
select
  acesso_gestao.empresa_id,
  acesso_gestao.user_id,
  'gestor',
  'ativo',
  acesso_gestao.user_id,
  now()
from public.usuarios_empresa acesso_gestao
join public.empresa_modulos modulo
  on modulo.empresa_id = acesso_gestao.empresa_id
 and modulo.modulo_id = 'vendas_mobile'
 and modulo.ativo = true
where acesso_gestao.status = 'ativo'
  and acesso_gestao.perfil in ('gestor_master', 'administrador')
on conflict (empresa_id, user_id) do update
  set papel = 'gestor',
      status = 'ativo',
      aprovado_por = excluded.aprovado_por,
      atualizado_em = now();
