-- Libera todos os perfis ja existentes por prazo indeterminado.
-- Neste momento nao ha assinaturas pagas em producao; qualquer residuo de
-- cobranca/gateway e limpo para que todos fiquem como cortesia administrativa.

insert into public.assinaturas (
  empresa_id,
  tipo_perfil,
  status,
  plano,
  ciclo,
  trial_fim,
  valido_ate,
  gateway,
  gateway_customer_id,
  gateway_subscription_id,
  cupom_id,
  atualizado_em
)
select
  e.id,
  case when e.tipo_perfil = 'pessoal' then 'pessoal' else 'empresa' end,
  'cortesia',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  now()
from public.empresas e
on conflict (empresa_id) do update
set
  tipo_perfil = excluded.tipo_perfil,
  status = 'cortesia',
  plano = null,
  ciclo = null,
  trial_fim = null,
  valido_ate = null,
  gateway = null,
  gateway_customer_id = null,
  gateway_subscription_id = null,
  cupom_id = null,
  atualizado_em = now();
