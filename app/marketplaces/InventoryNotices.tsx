'use client';
import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { inventoryNoticeTarget } from '@/app/modules/marketplaces/notice-navigation';
import type { InventoryNotice } from '@/app/modules/marketplaces/live-feed';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import Tooltip from '@/app/components/Tooltip';
import { Icon } from '@/app/projetos/components/Icon';
import { corTextoSobreFundo } from '@/app/lib/cores-avanta';
import { inventoryIssueMessage, inventoryNoticeCount, inventoryNoticeDismissAction, inventoryNoticeDismissKey, providerName, type MarketplaceLiveFeed } from '@/app/modules/marketplaces/live-feed';
import styles from './marketplaces.module.css';
import ImportStockChoice from './ImportStockChoice';

type DismissNotice = (notice: InventoryNotice) => Promise<void>;

export function InventoryNoticeList({feed, unavailable, error = '', onAdjust, companyId, canManage=false, onDismiss, dismissing}: {
  feed: MarketplaceLiveFeed | null; unavailable: boolean; error?: string; onAdjust?:(notice:InventoryNotice)=>void;
  companyId?:string; canManage?:boolean;
  onDismiss?:(notice: InventoryNotice, event: MouseEvent<HTMLButtonElement>)=>void; dismissing?:string|null;
}) {
  return <div role="status" aria-live="polite">
      {(error || unavailable) && <p role="alert">{error || 'Não foi possível consultar os avisos. A lista anterior pode estar desatualizada.'}</p>}
      {!feed && !unavailable && !error && <p>Consultando pendências…</p>}
      {feed && !feed.enabled && <p>A sincronização de estoque não está habilitada nesta empresa. Solicite a verificação ao administrador.</p>}
      {feed?.enabled && !feed.workerHealthy && <p>A rotina de estoque não confirmou atividade recente. A última consulta não garante a conclusão das atualizações.</p>}
      {feed?.noticesUnavailable && <p>Não foi possível identificar os detalhes das pendências. Atualize os avisos; nenhuma pendência foi considerada resolvida por essa falha.</p>}
      {feed?.noticeDismissalsUnavailable && <p role="alert">Não foi possível consultar os avisos dispensados. Atualize os avisos para tentar novamente.</p>}
      {!!feed?.pendingSales && <p>{feed.pendingSales} notificação(ões) de venda aguardando leitura. Os produtos ainda serão identificados.</p>}
      {feed?.notices?.map(notice=>{
        const dismissLabel = onDismiss && inventoryNoticeDismissAction(notice);
        return <article className={styles.inventoryNotice} key={notice.id}>
          <strong>{notice.productName || (notice.source==='account'?'Pendência da conta — produto ainda não identificado':'Produto ainda não identificado')}</strong>
          <small>{[notice.productName ? `EAN: ${notice.ean || 'Não informado'}` : null,providerName(notice.provider),notice.accountName,notice.listingId && `Anúncio ${notice.listingId}`,notice.orderId && `Pedido #${notice.orderId}`].filter(Boolean).join(' · ')}</small>
          <span>{inventoryIssueMessage(notice.code)}</span>
          <div className={styles.inventoryNoticeActions}>
            {notice.candidateProducts?.length&&companyId?<ImportStockChoice notice={notice} companyId={companyId} canManage={canManage} onAdjust={onAdjust}/>:inventoryNoticeTarget(notice)&&onAdjust&&<BotaoAcaoCompacto onClick={()=>onAdjust(notice)}>{notice.code==='zero_stock_review'?'Confirmar saldo zero':notice.code==='out_of_stock'?'Ver estoque':notice.code==='zero_stock_pause_pending'?'Conferir pausa':'Conferir e ajustar'}</BotaoAcaoCompacto>}
            {dismissLabel && <BotaoAcaoCompacto
              disabled={Boolean(dismissing) || feed.noticeDismissalsUnavailable}
              aria-label={dismissLabel === 'OK' ? 'OK, dispensar aviso de cancelamento' : undefined}
              onClick={event=>onDismiss?.(notice,event)}
            >{dismissing === inventoryNoticeDismissKey(notice) ? 'Dispensando…' : dismissLabel}</BotaoAcaoCompacto>}
          </div>
        </article>;
      })}
      {feed && !feed.notices && !feed.noticesUnavailable && <p>Os detalhes dos avisos não estão disponíveis nesta resposta. Atualize os avisos.</p>}
      {feed?.notices && !feed.noticesUnavailable && !feed.notices.length && feed.pendingStock > 0 && <p>Há atualização de estoque aguardando detalhamento. Atualize os avisos para conferir o motivo.</p>}
      {feed?.enabled && feed.workerHealthy && feed.notices && !feed.noticesUnavailable && !unavailable && !error && !feed.notices.length && !feed.pendingSales && !feed.pendingStock && <small>Sem pendências na última consulta.</small>}
    </div>;
}

export default function InventoryNotices({companyId, feed, unavailable, dark = false, brand = '#003E73', onAdjust,canManage=false,onDismiss}: {companyId: string; feed: MarketplaceLiveFeed | null; unavailable: boolean; dark?: boolean; brand?: string; onAdjust?:(notice:InventoryNotice)=>void;canManage?:boolean;onDismiss?:DismissNotice}) {
  const [refresh, setRefresh] = useState({loading:false,error:''});
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const [dismissing, setDismissing] = useState<string|null>(null);
  const [dismissError, setDismissError] = useState('');
  const visibleNotices = dismissed.size > 0 ? feed?.notices?.filter(notice=>!dismissed.has(inventoryNoticeDismissKey(notice))) : undefined;
  const visibleFeed = feed && visibleNotices && visibleNotices.length !== feed.notices?.length
    ? {...feed, notices:visibleNotices, pendingStock:visibleNotices.filter(notice=>notice.source==='stock').length}
    : feed;
  const count = inventoryNoticeCount(visibleFeed, unavailable || Boolean(refresh.error));
  async function dismiss(notice: InventoryNotice, event: MouseEvent<HTMLButtonElement>) {
    if (!onDismiss || dismissing) return;
    const article = event.currentTarget.closest('article');
    const heading = article?.closest('section')?.querySelector<HTMLElement>('[data-inventory-notice-heading]');
    const key = inventoryNoticeDismissKey(notice);
    setDismissing(key);
    setDismissError('');
    try {
      await onDismiss(notice);
      if (article?.contains(document.activeElement) || (document.activeElement === document.body && article?.isConnected)) heading?.focus();
      setDismissed(previous=>new Set(previous).add(key));
    } catch (error) {
      setDismissError(error instanceof Error ? error.message : 'Não foi possível dispensar o aviso. Tente novamente.');
    } finally {
      setDismissing(null);
    }
  }
  useEffect(()=>{
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{companyId:string;loading:boolean;error:string}>).detail;
      if (detail?.companyId===companyId) {
        setRefresh({loading:detail.loading,error:detail.error});
        if (detail.loading) setDismissError('');
      }
    };
    window.addEventListener('avanta:marketplace-notices-refresh-state',listener);
    return ()=>window.removeEventListener('avanta:marketplace-notices-refresh-state',listener);
  },[companyId]);
  return <>
    <Tooltip texto={count ? `${count} aviso(s) de pendências` : 'Consultar pendências'} posicao="bottom"><button type="button" className={styles.inventoryAlertButton} data-has-notices={count > 0} aria-label={count ? `${count} aviso(s) de pendências. Abrir lista.` : 'Consultar pendências'} aria-haspopup="dialog" aria-expanded={open} aria-controls="inventory-notices-dialog" onClick={event=>{ event.currentTarget.focus(); setOpen(true); }}>
      <Icon name="alert" size={22} />{count > 0 && <b className={styles.inventoryAlertBadge} aria-hidden="true">{count}</b>}
    </button></Tooltip>
    <CardExpandidoModal aberto={open} variante="avisos" darkMode={dark} rotulo="Pendências de estoque e vendas" onFechar={()=>setOpen(false)}>
      <div className={`${styles.settingsModalScope} ${dark ? styles.dark : ''}`} style={{'--brand':brand,'--av-action-on-brand':corTextoSobreFundo(brand)} as CSSProperties}>
        <section id="inventory-notices-dialog" className={`${styles.userModal} ${styles.inventoryDialog}`} aria-busy={refresh.loading}>
          <header className={styles.userModalHeader}><h2>Pendências</h2><BotaoAcaoCompacto variante="discreto" somenteIcone aria-label="Fechar pendências" onClick={()=>setOpen(false)}><Icon name="close" /></BotaoAcaoCompacto></header>
          <div className={styles.inventoryStatus}><div className={styles.inventoryNoticeHeading}><strong data-inventory-notice-heading tabIndex={-1}>{count ? `${count} aviso(s)` : 'Última consulta'}</strong><BotaoAcaoCompacto disabled={refresh.loading} onClick={()=>window.dispatchEvent(new CustomEvent('avanta:marketplace-refresh-notices',{detail:{companyId}}))}>{refresh.loading?'Atualizando…':'Atualizar avisos'}</BotaoAcaoCompacto></div>
            <InventoryNoticeList companyId={companyId} canManage={canManage} feed={visibleFeed} unavailable={unavailable} error={dismissError || refresh.error} onDismiss={onDismiss ? dismiss : undefined} dismissing={dismissing} onAdjust={onAdjust ? notice=>{setOpen(false);requestAnimationFrame(()=>onAdjust(notice));} : undefined} />
          </div>
        </section>
      </div>
    </CardExpandidoModal>
  </>;
}
