'use client';

import { useState, type CSSProperties } from 'react';
import FiltroCompetencia from '@/app/recebimentos/components/FiltroCompetencia';
import receiptStyles from '@/app/recebimentos/recebimentos.module.css';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import DraggableModalCard from '@/app/components/DraggableModalCard';
import { SALE_GROUPS, validSalePeriod, type SaleGroup, type SalePeriod } from '@/app/modules/marketplaces/sales-status';
import MarketplaceSelect from './MarketplaceSelect';
import styles from './marketplaces.module.css';

export function monthPeriod(year: number, month: number): SalePeriod {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return { start: `${prefix}-01`, end: `${prefix}-${new Date(year, month + 1, 0).getDate()}` };
}

export default function SalesFilters({ period, onPeriodChange, group, onGroupChange, counts, total, dark, brand }: {
  period: SalePeriod; onPeriodChange: (period: SalePeriod) => void;
  group: SaleGroup | ''; onGroupChange: (group: SaleGroup | '') => void;
  counts: Record<SaleGroup, number>; total: number; dark: boolean; brand: string;
}) {
  const [reference, setReference] = useState(() => ({ ano: new Date().getFullYear(), mes: new Date().getMonth() }));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(period);
  const [error, setError] = useState('');
  const month = monthPeriod(reference.ano, reference.mes);
  const custom = !!period.start && (period.start !== month.start || period.end !== month.end);
  const dateLabel = (iso: string) => iso.split('-').reverse().join('/');

  function moveMonth(delta: number) {
    const date = new Date(reference.ano, reference.mes + delta, 1);
    setReference({ ano: date.getFullYear(), mes: date.getMonth() });
    onPeriodChange(monthPeriod(date.getFullYear(), date.getMonth()));
  }

  return <>
    <div className={`${styles.salesFilters} ${dark ? receiptStyles.darkScope : ''}`} style={{ '--cp': brand, '--texto-primario': dark ? '#e2e8f0' : '#1e293b' } as CSSProperties}>
      <div className={styles.salesDateFilters}>
        <FiltroCompetencia referencia={reference} todos={!period.start} onMudarMes={moveMonth} onMostrarTodos={() => onPeriodChange({ start: '', end: '' })} />
        <button type="button" className={styles.refreshSales} aria-pressed={custom} onClick={() => { setDraft(period.start ? period : month); setError(''); setOpen(true); }} title={custom ? `${dateLabel(period.start)} a ${dateLabel(period.end)}` : 'Selecionar datas inicial e final'}>{custom ? `${dateLabel(period.start)} – ${dateLabel(period.end)}` : 'Período'}</button>
      </div>
      <MarketplaceSelect label="" ariaLabel="Filtrar situação das vendas" value={group} placeholder="Todas as situações" className={styles.salesStatusFilter} onChange={(value) => onGroupChange(value as SaleGroup | '')} options={[
        { value: '', label: 'Todas', detail: String(total) },
        ...SALE_GROUPS.map(({ value, label }) => ({ value, label, detail: String(counts[value]) })),
      ]} />
    </div>
    <CardExpandidoModal aberto={open} rotulo="Selecionar período de vendas" onFechar={() => setOpen(false)}>
      <div className={`${styles.salesPeriodTheme} ${dark ? styles.dark : ''}`} style={{ '--brand': brand } as CSSProperties}>
        <DraggableModalCard className={`${styles.userModal} ${styles.salesPeriodDialog}`}>
          <div className={styles.userModalHeader} data-modal-drag-handle><h2>Período de vendas</h2><button type="button" className={styles.iconAction} aria-label="Fechar período" onClick={() => setOpen(false)}>×</button></div>
          <form className={styles.form} onSubmit={(event) => {
            event.preventDefault();
            if (!draft.start || !draft.end || !validSalePeriod(draft)) { setError('Informe as duas datas. A data final deve ser igual ou posterior à inicial.'); return; }
            setError(''); onPeriodChange(draft); setOpen(false);
          }}>
            <p className={styles.help}>Selecione a data inicial e final da venda. Os dois dias serão incluídos.</p>
            <div className={styles.salesPeriodDates}>
              <label>Data inicial<input type="date" required value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} aria-describedby={error ? 'sales-period-error' : undefined} /></label>
              <label>Data final<input type="date" required value={draft.end} min={draft.start || undefined} onChange={(event) => setDraft({ ...draft, end: event.target.value })} aria-describedby={error ? 'sales-period-error' : undefined} /></label>
            </div>
            {error && <p id="sales-period-error" className={styles.salesError} role="alert">{error}</p>}
            <div className={styles.salesPeriodActions}><button type="button" className={styles.refreshSales} onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className={styles.primary}>Aplicar período</button></div>
          </form>
        </DraggableModalCard>
      </div>
    </CardExpandidoModal>
  </>;
}
