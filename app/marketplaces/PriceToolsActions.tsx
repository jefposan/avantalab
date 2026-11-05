import type { CSSProperties } from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import { corTextoSobreFundo } from '@/app/lib/cores-avanta';
import styles from './marketplaces.module.css';

type Props = {
  brand: string;
  canManage: boolean;
  reading: boolean;
  canManageConnections: boolean;
  copyStatus: 'idle' | 'copied' | 'error';
  onCreate: () => void;
  onEdit: () => void;
  onSettings: () => void;
  onCopy: () => void;
};

/** A mesma barra no módulo e na prévia local, sem alterar as ações de lotes. */
export default function PriceToolsActions({ brand, canManage, reading, canManageConnections, copyStatus, onCreate, onEdit, onSettings, onCopy }: Props) {
  return <div className={`${styles.heroActions} ${styles.priceToolsActions}`} style={{ '--av-action-on-brand': corTextoSobreFundo(brand) } as CSSProperties}>
    <BotaoAcaoCompacto variante="primario" disabled={!canManage || reading} onClick={onCreate}>Criar Lote</BotaoAcaoCompacto>
    <BotaoAcaoCompacto variante="primario" disabled={reading} onClick={onEdit}>Editar Lotes</BotaoAcaoCompacto>
    {canManageConnections && <BotaoAcaoCompacto somenteIcone onClick={onSettings} aria-label="Configurações do AvantaPreços" title="Configurações do AvantaPreços"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.38.36.72.66 1 .3.27.68.4 1.08.4H21v4h-.1A1.7 1.7 0 0 0 19.4 15Z"/></svg></BotaoAcaoCompacto>}
    <div className={styles.copyPriceLinkControl}>
      <BotaoAcaoCompacto variante="primario" onClick={onCopy} aria-live="polite" style={copyStatus === 'copied' ? { '--brand': '#147a58', '--av-action-on-brand': corTextoSobreFundo('#147a58') } as CSSProperties : undefined}>
        {copyStatus === 'copied' ? 'Link copiado' : 'Copiar link do AvantaPreços'}
      </BotaoAcaoCompacto>
      {copyStatus === 'error' && <small role="alert">Não foi possível copiar. Tente novamente.</small>}
    </div>
  </div>;
}
