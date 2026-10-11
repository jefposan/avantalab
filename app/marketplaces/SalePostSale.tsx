'use client';

import { useEffect, useState } from 'react';
import type { PostSaleDetails } from '@/app/modules/marketplaces/post-sale';
import type { MarketplaceSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';
import { marketplaceClientRequest } from './Anunciados';
import styles from './marketplaces.module.css';

const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const formatDate = (value: string) => Number.isFinite(Date.parse(value)) ? date.format(new Date(value)) : 'Data não informada';

export default function SalePostSale({ companyId, saleId, connectionId, onSaleUpdated }: {
  companyId: string; saleId: string; connectionId: string; onSaleUpdated: (sale: MarketplaceSale) => void;
}) {
  const [details, setDetails] = useState<PostSaleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ empresaId: companyId, connectionId, saleId });
    void marketplaceClientRequest(`vendas/pos-venda?${params}`, undefined, controller.signal).then((result: { sale: MarketplaceSale; postSale: PostSaleDetails }) => {
      if (controller.signal.aborted) return;
      setDetails(result.postSale); onSaleUpdated(result.sale);
    }).catch((err) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Não foi possível consultar o pós-venda.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, saleId, connectionId, revision, onSaleUpdated]);

  return <SalePostSaleView details={details} loading={loading} error={error} onRefresh={() => { setLoading(true); setError(''); setDetails(null); setRevision((value) => value + 1); }} />;
}

/** Apresentação sem acesso a sessão; permite validar todos os estados com dados simulados. */
export function SalePostSaleView({ details, loading, error, onRefresh }: {
  details: PostSaleDetails | null; loading: boolean; error: string; onRefresh: () => void;
}) {
  return <div className={styles.postSale}>
    <div className={styles.postSaleHeading}><h3>Pós-venda · Mercado Livre</h3><button type="button" className={styles.refreshSales} disabled={loading} onClick={onRefresh}>{loading ? 'Consultando…' : 'Atualizar pós-venda'}</button></div>
    {loading && <p className={styles.salesScopeHelp} role="status">Consultando cancelamento, reclamações, devolução e reembolso no Mercado Livre…</p>}
    {error && <p className={styles.salesError} role="alert">{error} Não foi possível confirmar devolução ou reembolso. Tente Atualizar pós-venda.</p>}
    {details && <>
      <p className={styles.salesScopeHelp}>Consulta realizada em {formatDate(details.checkedAt)}. Os estados abaixo são independentes da entrega original.</p>
      {details.warnings.map((warning) => <p key={warning} className={styles.salesError} role="status">{warning}</p>)}
      {details.accessIssues?.some((issue) => issue.permissionDenied) && <div className={styles.claimDetails} role="status">
        <h4>Como liberar a consulta do pós-venda</h4>
        <p className={styles.salesScopeHelp}>O administrador do aplicativo deve conferir, no DevCenter do Mercado Livre, as permissões dos recursos reclamações e devoluções (claims e returns), em Vendas e envios / Comunicação pré e pós-venda. Habilite o acesso necessário para consulta. Se o Mercado Livre solicitar nova autorização, reconecte a mesma conta no AvantaLab; depois clique em Atualizar pós-venda. Não é necessário excluir a conta.</p>
        <p className={styles.salesScopeHelp}>Um bloqueio 403 também pode depender da autorização da conta ou de uma política de acesso do Mercado Livre. Atualizar a página, sozinho, não concede essa permissão.</p>
        <a className={styles.postSaleLink} href="https://developers.mercadolivre.com.br/pt_br/permissoes-funcionais/" target="_blank" rel="noopener noreferrer">Consultar orientação oficial de permissões ↗</a>
      </div>}
      <dl>
        {details.cancellation && <>
          <div><dt>Cancelamento</dt><dd>{details.cancellation.reasonText}</dd></div>
          <div><dt>Solicitado por</dt><dd>{details.cancellation.requestedByText}</dd></div>
          {details.cancellation.date && <div><dt>Data do cancelamento</dt><dd>{formatDate(details.cancellation.date)}</dd></div>}
        </>}
        <div><dt>Reembolso dos pagamentos</dt><dd>{details.refundText}{details.refundedAmount != null && <span>Valor informado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: details.currency }).format(details.refundedAmount)}</span>}</dd></div>
        <div><dt>Devolução do produto</dt><dd>{details.claims.some((claim) => claim.returnDetails?.physicalReturn) ? 'Devolução registrada pelo Mercado Livre — acompanhe o retorno abaixo.' : details.claims.some((claim) => claim.returnDetails && !claim.returnDetails.physicalReturn) ? 'O Mercado Livre informou um caso sem devolução física.' : details.claimsComplete && details.returnsComplete ? 'Nenhuma devolução identificada nesta consulta.' : 'Não foi possível confirmar se existe devolução.'}</dd></div>
      </dl>
      {!details.claims.length && details.claimsComplete && <p className={styles.salesScopeHelp}>Nenhuma reclamação vinculada a este pedido foi encontrada nesta consulta.</p>}
      {details.claims.map((claim) => <section key={claim.id} className={styles.claimDetails} aria-label={`Caso de pós-venda ${claim.id}`}>
        <h4>{claim.typeText} #{claim.id} · {claim.statusText}</h4>
        <dl>
          <div><dt>Motivo</dt><dd>{claim.reasonText}</dd></div>
          {claim.problemText && <div><dt>Problema relatado</dt><dd>{claim.problemText}<span>Texto informado pelo Mercado Livre.</span></dd></div>}
          {claim.stageText && <div><dt>Etapa do processo</dt><dd>{claim.stageText}</dd></div>}
          <div><dt>Próximo responsável</dt><dd>{claim.statusText === 'Encerrada' ? 'Caso encerrado — confira a resolução e o retorno do produto.' : claim.responsibleText || 'Não confirmado nesta consulta.'}</dd></div>
          {claim.dueAt && <div><dt>Prazo informado</dt><dd>{formatDate(claim.dueAt)}</dd></div>}
          {claim.createdAt && <div><dt>Abertura do caso</dt><dd>{formatDate(claim.createdAt)}</dd></div>}
          {claim.updatedAt && <div><dt>Última atualização no ML</dt><dd>{formatDate(claim.updatedAt)}</dd></div>}
          {claim.closedAt && <div><dt>Encerramento do caso</dt><dd>{formatDate(claim.closedAt)}</dd></div>}
          {claim.resolutionText && <div><dt>Resolução do caso</dt><dd>{claim.resolutionText}</dd></div>}
        </dl>
        {claim.detailComplete === false && <p className={styles.salesScopeHelp}>O detalhamento deste caso está incompleto: motivo específico, responsável ou prazo podem não estar disponíveis. Os demais dados confirmados foram mantidos.</p>}
        {claim.actions.length > 0 && <h4>Ações da sua conta no Mercado Livre</h4>}
        {claim.actions.map((action, index) => <p key={index} className={action.required ? styles.salesError : styles.salesScopeHelp}>{action.required ? 'Pendente' : 'Disponível'}: {action.text}{action.dueAt ? ` · Prazo: ${formatDate(action.dueAt)}` : ''}.</p>)}
        {!claim.actions.length && claim.statusText !== 'Encerrada' && <p className={styles.salesScopeHelp}>Nenhuma ação da sua conta foi informada nesta consulta. Isso não confirma que o processo foi resolvido; confira o responsável e o prazo.</p>}
        {claim.returnDetails && <>
          <dl><div><dt>Situação da devolução</dt><dd>{claim.returnDetails.statusText}</dd></div><div><dt>Dinheiro deste caso</dt><dd>{claim.returnDetails.moneyText}</dd></div></dl>
          {claim.returnDetails.refundRuleText && <p className={styles.salesScopeHelp}>{claim.returnDetails.refundRuleText}</p>}
          {claim.returnDetails.shipments.map((shipment, index) => <dl key={`${shipment.id}-${index}`}><div><dt>Envio de retorno</dt><dd>{shipment.statusText} · Destino: {shipment.destinationText}{shipment.tracking && <span>Rastreamento: {shipment.tracking}</span>}</dd></div></dl>)}
        </>}
      </section>)}
    </>}
    <p className={styles.salesScopeHelp}>Este painel consulta informações; responder, aceitar devoluções ou solicitar reembolsos continua no Mercado Livre. Os filtros do cabeçalho classificam o pedido, não o envio de retorno.</p>
    <a className={styles.postSaleLink} href="https://www.mercadolivre.com.br/vendas" target="_blank" rel="noopener noreferrer">Abrir vendas no Mercado Livre ↗</a>
    <p className={styles.salesScopeHelp}>Na plataforma, entre na mesma conta desta venda e localize o número do pedido.</p>
  </div>;
}
