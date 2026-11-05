'use client';

import { useEffect, useRef, useState } from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import { formatarMoeda } from '@/app/lib/formatters';
import type { PublicationForm } from '@/app/modules/marketplaces/services/catalog-publication';
import { publicationShippingKey, type PublicationShippingQuote } from '@/app/modules/marketplaces/publication-shipping';
import { marketplaceClientRequest } from './Anunciados';
import styles from './marketplaces.module.css';

type Props = { idPrefix?: string; companyId: string; accountId: string; reviewId?: string; form: PublicationForm; disabled: boolean; onReview: (patch: Partial<PublicationForm>, costUnavailable?: boolean) => void; error?: string; request?: typeof marketplaceClientRequest };
export default function PublicationShipping({ idPrefix = 'new', companyId, accountId, reviewId = '', form, disabled, onReview, error, request = marketplaceClientRequest }: Props) {
  const [result, setResult] = useState<{ key: string; quote?: PublicationShippingQuote; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const onReviewRef=useRef(onReview);onReviewRef.current=onReview;
  const key = `${companyId}|${accountId}|${reviewId}|${publicationShippingKey(form)}`;
  const eligible = form.shippingMode === 'me2' && !!form.productId && !!form.categoryId && form.price > 0 && !!form.listingType && !!form.condition;
  const current = result?.key === key ? result : null;
  const quote = current?.quote;
  const mandatory = quote?.policy === 'mandatory';
  useEffect(() => {
    if (disabled || !eligible || (result?.key === key && result.quote)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await request('publicar/frete', { empresaId: companyId, connectionId: accountId, form }, AbortSignal.any([controller.signal,AbortSignal.timeout(50_000)])) as { quote: PublicationShippingQuote };
        if (controller.signal.aborted) return;
        const next = { ...form, freeShipping: response.quote.freeShipping };
        setResult({ key: `${companyId}|${accountId}|${reviewId}|${publicationShippingKey(next)}`, quote: response.quote });
        onReviewRef.current({ freeShipping: response.quote.freeShipping, shippingQuoteToken: response.quote.token, acknowledgeUnavailableShippingCost: false }, response.quote.sellerCost == null);
      } catch (failure) {
        if (!controller.signal.aborted) { setResult({ key, error: failure instanceof Error ? failure.message : 'Não foi possível consultar o frete.' }); onReviewRef.current({ shippingQuoteToken: undefined }); }
      }
    }, 650);
    return () => { clearTimeout(timer); controller.abort(); };
    // O fingerprint contém todos os parâmetros logísticos; token e ciência não disparam outra consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, eligible, disabled, retry, request]);
  useEffect(() => {
    if (!quote?.token) return;
    const timer = setTimeout(() => { setResult(null); onReviewRef.current({ shippingQuoteToken: undefined }); }, Math.max(0, Date.parse(quote.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [quote]);
  const change = (patch: Partial<PublicationForm>) => onReview({ ...patch, shippingQuoteToken: undefined, acknowledgeUnavailableShippingCost: false });
  return <section className={`${styles.catalogWide} ${styles.publicationShipping}`} aria-label="Frete do anúncio" id={`${idPrefix}-freeShipping`} tabIndex={-1}>
    <div className={styles.shippingHeading}><strong>Frete do anúncio</strong><BotaoAcaoCompacto disabled={disabled || !eligible} onClick={() => { setResult(null); onReview({ shippingQuoteToken: undefined }); setRetry(n => n + 1); }}>Atualizar estimativa</BotaoAcaoCompacto></div>
    {form.shippingMode !== 'me2' ? <p className={styles.help}>Selecione Mercado Envios para consultar as regras e o custo de envio. Nas demais modalidades, o frete é combinado à parte.</p> : <>
      <div className={styles.shippingSummary}>
        <div><label className={styles.catalogMatch}><input type="checkbox" checked={mandatory || form.freeShipping === true} disabled={disabled || !quote || mandatory || quote.policy !== 'optional'} onChange={event => change({ freeShipping: event.target.checked })} />Frete grátis para o comprador</label>
          <small>{mandatory ? 'Obrigatório pelo Mercado Livre' : quote?.policy === 'not_allowed' ? 'Não disponível nesta modalidade' : quote?.policy === 'optional' ? 'Opcional nesta conta e categoria' : 'Aguardando confirmação do Mercado Livre'}</small></div>
        <div><small>Custo estimado para você · por unidade</small><strong aria-live="polite">{quote ? quote.sellerCost == null ? 'Indisponível' : formatarMoeda(quote.sellerCost) : eligible && !current?.error ? 'Consultando…' : 'A consultar'}</strong></div>
      </div>
      {!eligible && <p className={styles.help}>Preencha preço, tipo de anúncio e condição para consultar o frete.</p>}
      {(current?.error || quote?.notice || error) && <p role="status">{current?.error || quote?.notice || error}</p>}
      {quote?.dimensionsSource && <p className={styles.help}>{quote.dimensionsSource === 'category' ? 'Estimativa com medidas padrão da categoria. Informe a embalagem para aproximar o custo.' : quote.dimensionsSource === 'product' ? 'Estimativa com as medidas da embalagem cadastradas.' : 'Estimativa com as medidas informadas abaixo.'} O valor final pode variar conforme o envio.</p>}
      <details><summary>Medidas da embalagem para estimar</summary><p className={styles.help}>Informe a caixa pronta para envio. Estas medidas são usadas nesta simulação; confira também as características do anúncio.</p><div className={styles.shippingDimensions}>{([{ key: 'height', label: 'Altura (cm)' }, { key: 'width', label: 'Largura (cm)' }, { key: 'length', label: 'Comprimento (cm)' }, { key: 'weightKg', label: 'Peso (kg)' }] as const).map(field => <label className={styles.catalogField} key={field.key}>{field.label}<input type="number" min="0.001" step="any" inputMode="decimal" value={form.packageDimensions?.[field.key] ?? ''} disabled={disabled} onChange={event => change({ packageDimensions: { ...form.packageDimensions, [field.key]: event.target.value === '' ? undefined : Number(event.target.value) } })} /></label>)}</div></details>
      {quote?.token && quote.sellerCost == null && <label className={styles.catalogMatch}><input id={`${idPrefix}-shipping-acknowledgement`} type="checkbox" checked={form.acknowledgeUnavailableShippingCost === true} disabled={disabled} onChange={event => onReview({ acknowledgeUnavailableShippingCost: event.target.checked })} />Estou ciente de que o custo de envio não foi estimado.</label>}
    </>}
  </section>;
}
