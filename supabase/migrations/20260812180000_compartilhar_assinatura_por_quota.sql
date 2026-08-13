-- A assinatura comercial pertence à conta que a contratou. Perfis criados
-- dentro da franquia desse plano apontam para o perfil de origem, sem criar
-- uma segunda assinatura, cobrança ou período de teste.
alter table public.empresas
  add column if not exists assinatura_origem_empresa_id uuid
  references public.empresas(id) on delete set null;

create index if not exists empresas_assinatura_origem_empresa_id_idx
  on public.empresas (assinatura_origem_empresa_id)
  where assinatura_origem_empresa_id is not null;

comment on column public.empresas.assinatura_origem_empresa_id is
  'Perfil que possui a assinatura comercial compartilhada por quota.';

-- Perfis antigos sem assinatura própria recebem a origem somente quando
-- pertencem à mesma conta da assinatura e ainda cabem na franquia dela. Cada
-- perfil de origem mantém a própria assinatura; um perfil compartilhado nunca
-- passa a autorizar uma nova criação dentro da mesma quota.
with fontes as (
  select
    e.id as origem_empresa_id,
    e.tipo_perfil,
    case when a.plano = 'business_pro' then 'business_pro' else 'business' end as plano,
    case when a.plano = 'business_pro' then 10 else 3 end as limite
  from public.empresas e
  join public.assinaturas a on a.empresa_id = e.id
  where e.tipo_perfil = 'empresa'
    and (
      a.status = 'ativa'
      or (a.status = 'trial' and a.trial_fim > now())
      or (a.status in ('cancelada', 'inadimplente') and a.valido_ate > now())
    )
), candidatos_ordenados as (
  select
    alvo.id as alvo_empresa_id,
    fonte.origem_empresa_id,
    fonte.plano,
    fonte.limite,
    row_number() over (
      partition by fonte.origem_empresa_id
      order by alvo.created_at asc nulls last, alvo.id
    ) as posicao
  from fontes fonte
  join public.usuarios_empresa dono_origem
    on dono_origem.empresa_id = fonte.origem_empresa_id
    and dono_origem.status = 'ativo'
  join public.usuarios_empresa dono_alvo
    on dono_alvo.user_id = dono_origem.user_id
    and dono_alvo.status = 'ativo'
  join public.empresas alvo on alvo.id = dono_alvo.empresa_id
  left join public.assinaturas assinatura_alvo on assinatura_alvo.empresa_id = alvo.id
  where alvo.id <> fonte.origem_empresa_id
    and alvo.assinatura_origem_empresa_id is null
    and assinatura_alvo.empresa_id is null
), escolhidos as (
  select distinct on (alvo_empresa_id)
    alvo_empresa_id,
    origem_empresa_id
  from candidatos_ordenados
  where posicao < limite
  order by alvo_empresa_id, case when plano = 'business_pro' then 0 else 1 end, origem_empresa_id
)
update public.empresas alvo
set assinatura_origem_empresa_id = escolhidos.origem_empresa_id
from escolhidos
where alvo.id = escolhidos.alvo_empresa_id;
