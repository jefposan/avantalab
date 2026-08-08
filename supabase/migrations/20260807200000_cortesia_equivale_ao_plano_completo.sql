-- Cortesia representa acesso integral ao plano comercial correspondente.
-- Corrige registros antigos gravados sem `plano` e padroniza todos os perfis
-- atualmente em cortesia para a mesma regra usada nos novos benefícios.

update public.assinaturas as assinatura
set
  plano = case
    when empresa.tipo_perfil = 'empresa' then 'business_pro'
    else 'pessoal_premium'
  end,
  atualizado_em = now()
from public.empresas as empresa
where assinatura.empresa_id = empresa.id
  and assinatura.status = 'cortesia'
  and assinatura.plano is distinct from case
    when empresa.tipo_perfil = 'empresa' then 'business_pro'
    else 'pessoal_premium'
  end;
