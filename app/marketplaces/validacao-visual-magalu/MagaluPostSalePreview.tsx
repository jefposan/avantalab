'use client';
import type { CSSProperties } from 'react';
import { SalePostSaleView } from '../SalePostSale';
import type { PostSaleDetails } from '@/app/modules/marketplaces/post-sale';
import styles from '../marketplaces.module.css';

/** Fixture local sem sessão, rede, tokens, banco, anúncios ou movimentações. */
const details: PostSaleDetails = {
  provider: 'magalu', checkedAt: '2026-10-13T15:00:00Z', currency: 'BRL', cancellation: null,
  refundText: 'Reembolso não confirmado nesta consulta. Cancelamento não comprova pagamento ou devolução.', refundedAmount: null,
  claimsComplete: true, returnsComplete: false, accessIssues: [], warnings: ['Há remessa de devolução registrada. Esta consulta não confirma recebimento físico do produto.'],
  claims: [{ id: 'DEMONSTRAÇÃO-01', processState: 'open', statusText: 'Aguardando vendedor', typeText: 'Troca', reasonText: 'Produto com defeito', stageText: 'Troca', responsibleText: 'Vendedor', dueAt: '2026-10-14T18:00:00Z',
    createdAt: '2026-10-12T13:00:00Z', updatedAt: '2026-10-13T15:00:00Z', closedAt: null, resolutionText: null, problemText: null, detailComplete: true, returnDetails: null,
    actions: [{ text: 'Avaliar e responder ao protocolo no Magalu', dueAt: '2026-10-14T18:00:00Z', required: true }],
    messages: [{ id: '1', date: '2026-10-12T13:00:00Z', text: 'Ao ligar o aparelho, ele não resfria a água.\nGostaria de avaliar a troca do produto.' }],
    events: [{ id: '2', date: '2026-10-13T15:00:00Z', text: 'Dados da devolução informados' }],
    returnRecords: [{ id: 'TESTE-RETORNO', statusText: 'Remessa de devolução registrada — entrega e andamento ainda precisam de confirmação no Magalu' }],
  }], financialEntries: [{ text: 'Débito · Comissão', value: 10, statusText: 'Concluída', date: '2026-10-13T15:00:00Z' }],
};
export default function MagaluPostSalePreview() {
  return <main className={styles.page} style={{ '--brand': '#003E73' } as CSSProperties}>
    <h1>Magalu · validação local</h1><p>Dados fictícios. Nenhuma conta, pedido ou estoque é alterado.</p>
    <article className={styles.saleCard}><div className={styles.saleDetails}>
      <SalePostSaleView provider="magalu" details={details} loading={false} error="" onRefresh={() => {}} />
    </div></article>
  </main>;
}
