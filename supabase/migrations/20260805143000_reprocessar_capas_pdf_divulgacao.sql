-- Reenvia somente PDFs de Divulgação que não receberam capa por falha do worker.
update public.vendas_mobile_thumbnail_jobs as job
set
  status = 'pendente',
  tentativas = 0,
  ultimo_erro = null,
  proxima_tentativa_em = now(),
  iniciado_em = null,
  concluido_em = null,
  atualizado_em = now()
from public.vendas_mobile_divulgacao_materiais as material
where job.material_id = material.id
  and material.tipo = 'pdf'
  and material.miniatura_url is null;

update public.vendas_mobile_divulgacao_materiais
set
  miniatura_status = 'pendente',
  miniatura_erro = null,
  miniatura_tentativas = 0,
  miniatura_processada_em = null,
  atualizado_em = now()
where tipo = 'pdf'
  and miniatura_url is null;

select public.processar_fila_thumbnail_vendas_mobile();
