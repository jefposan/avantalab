-- Contrato oficial de módulos AvantaLab e persistência inicial do AvantaProjetos.
-- Instalação e remoção são exclusivas do servidor; dados permanecem na empresa.
begin;

alter table public.modulos add column if not exists preco_mensal numeric(12,2) not null default 14.90;
alter table public.modulos add column if not exists vendavel_business boolean not null default true;
alter table public.modulos add column if not exists incluido_business_pro boolean not null default true;
alter table public.modulos add column if not exists modo_navegacao text not null default 'integrado';
alter table public.modulos add column if not exists rota_web text;
alter table public.modulos add column if not exists superficies text[] not null default array['web'];
update public.modulos set
  preco_mensal = 14.90,
  vendavel_business = true,
  incluido_business_pro = true;
update public.modulos set superficies = array['web', 'pwa', 'android', 'ios'], modo_navegacao = 'integrado', rota_web = null
where id in ('ponto', 'vendas_mobile', 'recebimentos_presencial');
alter table public.modulos drop constraint if exists modulos_preco_padrao_check;
alter table public.modulos add constraint modulos_preco_padrao_check check (preco_mensal = 14.90);
alter table public.modulos drop constraint if exists modulos_modo_navegacao_check;
alter table public.modulos add constraint modulos_modo_navegacao_check check (modo_navegacao in ('integrado', 'pagina_total'));

alter table public.assinaturas_modulos add column if not exists cancelamento_solicitado_em timestamptz;
alter table public.empresa_modulos add column if not exists expira_em timestamptz;
create index if not exists empresa_modulos_ativos_expiracao_idx
  on public.empresa_modulos (empresa_id, modulo_id, ativo, expira_em);

drop policy if exists "empresa_modulos_insert" on public.empresa_modulos;
drop policy if exists "empresa_modulos_update" on public.empresa_modulos;
drop policy if exists "empresa_modulos_delete" on public.empresa_modulos;
drop policy if exists "empresa_modulos_select" on public.empresa_modulos;
create policy "empresa_modulos_select" on public.empresa_modulos for select to authenticated using (
  exists (select 1 from public.usuarios_empresa acesso where acesso.empresa_id = empresa_modulos.empresa_id and acesso.user_id = auth.uid() and acesso.status = 'ativo')
);

insert into public.modulos (
  id, nome, descricao, icone, disponivel, perfis, ordem, preco_mensal,
  vendavel_business, incluido_business_pro, modo_navegacao, rota_web, superficies
) values (
  'projetos', 'Projetos', 'Planejamento visual de projetos, etapas, tarefas e responsáveis.',
  'projetos', true, array['empresa'], 4, 14.90, true, true, 'pagina_total', '/projetos', array['web']
)
on conflict (id) do update set nome = excluded.nome, descricao = excluded.descricao,
  icone = excluded.icone, disponivel = excluded.disponivel, perfis = excluded.perfis,
  ordem = excluded.ordem, preco_mensal = excluded.preco_mensal,
  vendavel_business = excluded.vendavel_business, incluido_business_pro = excluded.incluido_business_pro,
  modo_navegacao = excluded.modo_navegacao, rota_web = excluded.rota_web, superficies = excluded.superficies;

create or replace function public.modulo_ativo_para_empresa(p_empresa_id uuid, p_modulo_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.empresa_modulos instalacao
    where instalacao.empresa_id = p_empresa_id and instalacao.modulo_id = p_modulo_id
      and instalacao.ativo = true and (instalacao.expira_em is null or instalacao.expira_em > now()))
    and (
      not exists (select 1 from public.assinaturas assinatura where assinatura.empresa_id = p_empresa_id)
      or exists (
        select 1 from public.assinaturas assinatura
        where assinatura.empresa_id = p_empresa_id
          and (
            assinatura.status = 'ativa'
            or (assinatura.status = 'trial' and assinatura.trial_fim > now())
            or (assinatura.status = 'cortesia' and (assinatura.valido_ate is null or assinatura.valido_ate > now()))
            or (assinatura.status in ('cancelada', 'inadimplente') and assinatura.valido_ate > now())
          )
      )
    );
$$;
revoke all on function public.modulo_ativo_para_empresa(uuid, text) from public;
grant execute on function public.modulo_ativo_para_empresa(uuid, text) to authenticated;

create table if not exists public.projetos_documentos (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  documento jsonb not null default '{"version":1,"people":[],"projects":[]}'::jsonb,
  revisao bigint not null default 1,
  atualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint projetos_documentos_versao_check check ((documento->>'version')::integer = 1)
);
alter table public.projetos_documentos enable row level security;

create policy projetos_documentos_select on public.projetos_documentos for select to authenticated using (
  public.modulo_ativo_para_empresa(empresa_id, 'projetos') and exists (
    select 1 from public.usuarios_empresa acesso where acesso.empresa_id = projetos_documentos.empresa_id and acesso.user_id = auth.uid() and acesso.status = 'ativo'));
create policy projetos_documentos_insert on public.projetos_documentos for insert to authenticated with check (
  public.modulo_ativo_para_empresa(empresa_id, 'projetos') and atualizado_por = auth.uid() and exists (
    select 1 from public.usuarios_empresa acesso where acesso.empresa_id = projetos_documentos.empresa_id and acesso.user_id = auth.uid()
      and acesso.status = 'ativo' and acesso.perfil in ('gestor_master', 'administrador', 'operador_completo')));
create policy projetos_documentos_update on public.projetos_documentos for update to authenticated using (
  public.modulo_ativo_para_empresa(empresa_id, 'projetos') and exists (
    select 1 from public.usuarios_empresa acesso where acesso.empresa_id = projetos_documentos.empresa_id and acesso.user_id = auth.uid()
      and acesso.status = 'ativo' and acesso.perfil in ('gestor_master', 'administrador', 'operador_completo')))
  with check (public.modulo_ativo_para_empresa(empresa_id, 'projetos') and atualizado_por = auth.uid());
create policy projetos_documentos_delete on public.projetos_documentos for delete to authenticated using (
  public.modulo_ativo_para_empresa(empresa_id, 'projetos') and exists (
    select 1 from public.usuarios_empresa acesso where acesso.empresa_id = projetos_documentos.empresa_id and acesso.user_id = auth.uid()
      and acesso.status = 'ativo' and acesso.perfil in ('gestor_master', 'administrador')));

create or replace function public.projetos_documentos_atualizar_metadados()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  new.revisao := case when tg_op = 'UPDATE' then old.revisao + 1 else 1 end;
  new.documento := jsonb_set(new.documento, '{companyId}', to_jsonb(new.empresa_id::text), true);
  return new;
end;
$$;
drop trigger if exists projetos_documentos_metadados on public.projetos_documentos;
create trigger projetos_documentos_metadados before insert or update on public.projetos_documentos
for each row execute function public.projetos_documentos_atualizar_metadados();
grant select, insert, update, delete on public.projetos_documentos to authenticated;

commit;
