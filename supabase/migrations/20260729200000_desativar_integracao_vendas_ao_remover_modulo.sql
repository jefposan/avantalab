-- O Vendas Mobile individual continua gratuito. Esta regra só desfaz a
-- integração empresarial quando o módulo deixa de estar instalado: equipe e
-- destino financeiro do perfil são revogados, sem apagar dados pessoais.

create or replace function public.desativar_integracao_vendas_mobile_ao_remover_modulo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.modulo_id = 'vendas_mobile'
     and old.ativo = true
     and new.ativo = false then
    update public.vendas_mobile_acessos
       set status = 'bloqueado',
           atualizado_em = now()
     where empresa_id = new.empresa_id
       and status = 'ativo';

    delete from public.vendas_mobile_perfis_financeiros
     where empresa_id = new.empresa_id;
  end if;
  return new;
end;
$$;

drop trigger if exists vendas_mobile_desativar_integracao_ao_remover_modulo
  on public.empresa_modulos;
create trigger vendas_mobile_desativar_integracao_ao_remover_modulo
after update of ativo on public.empresa_modulos
for each row execute function public.desativar_integracao_vendas_mobile_ao_remover_modulo();

revoke all on function public.desativar_integracao_vendas_mobile_ao_remover_modulo() from public;
