/** Interpreta somente a situação observada, separada do resultado da gravação. */
export function listingSaleState({ status, substatus, stock }: { status?: unknown; substatus?: unknown; stock?: unknown }) {
  const flags = Array.isArray(substatus) ? substatus : [];
  if (flags.includes('deleted')) return 'Anúncio excluído';
  const processingPictures = flags.includes('picture_download_pending') || flags.includes('picture_downloading_pending');
  if (status !== 'active' && processingPictures) return 'Aguardando processamento das fotos pelo marketplace';
  if (status === 'under_review') return 'Anúncio em revisão pelo marketplace';
  if (status === 'not_yet_active') return 'Anúncio aguardando ativação pelo marketplace';
  if (status === 'paused' && flags.includes('paused_by_seller')) return 'Anúncio pausado pelo vendedor';
  if (status === 'paused' && flags.includes('out_of_stock')) return 'Anúncio pausado por falta de estoque';
  if (status === 'paused' && stock === 0) return 'Anúncio pausado, sem estoque disponível';
  if (status === 'paused') return 'Anúncio pausado. Confira a situação no marketplace';
  if (status === 'inactive') return 'Anúncio inativo';
  if (status === 'closed') return 'Anúncio encerrado';
  if (status === 'active' && stock === 0) return 'Anúncio ativo, sem estoque disponível';
  if (status === 'active') return processingPictures ? 'Anúncio ativo, com fotos em processamento' : 'Anúncio ativo';
  return 'Situação de venda ainda não confirmada';
}
