'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import FiltroCompetencia from '@/app/recebimentos/components/FiltroCompetencia';
import receiptStyles from '@/app/recebimentos/recebimentos.module.css';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import CampoData from '@/app/components/CampoData';
import { marketplaceDateLabel } from '@/app/modules/marketplaces/date-format';
import DraggableModalCard from '@/app/components/DraggableModalCard';
import { orderedSaleGroups, validSalePeriod, type SaleGroup, type SalePeriod } from '@/app/modules/marketplaces/sales-status';
import MarketplaceSelect from './MarketplaceSelect';
import styles from './marketplaces.module.css';
import Tooltip from '@/app/components/Tooltip';
import { Icon } from '@/app/projetos/components/Icon';

export function monthPeriod(year: number, month: number): SalePeriod {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return { start: `${prefix}-01`, end: `${prefix}-${new Date(year, month + 1, 0).getDate()}` };
}

export function SalesPeriodFilter({ period, onPeriodChange, dark, brand, statusFilter, showAll = true, contexto = 'vendas' }: {
  period: SalePeriod; onPeriodChange: (period: SalePeriod) => void;
  dark: boolean; brand: string; statusFilter?: ReactNode; showAll?: boolean; contexto?: 'vendas'|'servicos'|'notas';
}) {
  const textos={vendas:{label:'Período das vendas',title:'Período de vendas',description:'Selecione a data inicial e final da venda. Os dois dias serão incluídos.',noun:'Vendas'},servicos:{label:'Período dos serviços',title:'Período dos serviços',description:'Selecione a data inicial e final do agendamento. Os dois dias serão incluídos.',noun:'Serviços'},notas:{label:'Período das notas',title:'Período das notas fiscais',description:'Selecione a data inicial e final das notas. Os dois dias serão incluídos.',noun:'Notas'}}[contexto];
  const [reference, setReference] = useState(() => ({ ano: new Date().getFullYear(), mes: new Date().getMonth() }));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(period);
  const [error, setError] = useState('');
  const month = monthPeriod(reference.ano, reference.mes);
  const custom = !!period.start && (period.start !== month.start || period.end !== month.end);
  const dateLabel = marketplaceDateLabel;

  function moveMonth(delta: number) {
    const date = new Date(reference.ano, reference.mes + delta, 1);
    setReference({ ano: date.getFullYear(), mes: date.getMonth() });
    onPeriodChange(monthPeriod(date.getFullYear(), date.getMonth()));
  }

  return <>
    <div className={`${styles.salesFilters} ${dark ? receiptStyles.darkScope : ''}`} style={{ '--cp': brand, '--texto-primario': dark ? '#e2e8f0' : '#1e293b' } as CSSProperties}>
      <div className={styles.headerPeriodGroup} role="group" aria-labelledby="sales-period-heading">
        <span id="sales-period-heading" className={styles.headerGroupLabel}>{textos.label}</span>
        <div className={styles.salesDateFilters} data-mode={!period.start ? 'all' : custom ? 'custom' : 'month'}>
        <FiltroCompetencia referencia={reference} todos={!period.start} onMudarMes={moveMonth} onMostrarTodos={() => onPeriodChange({ start: '', end: '' })} mostrarTodos={showAll} todosLabel="Todo o período" tooltipPosition="bottom" />
        <Tooltip texto={custom ? `${textos.noun} de ${dateLabel(period.start)} a ${dateLabel(period.end)}` : 'Escolher data inicial e final'} posicao="bottom"><button type="button" className={`${styles.refreshSales} ${styles.headerDateButton}`} aria-label={custom ? `Selecionar datas: ${dateLabel(period.start)} a ${dateLabel(period.end)}` : 'Selecionar datas'} aria-haspopup="dialog" aria-expanded={open} aria-pressed={custom} onClick={() => { setDraft(period.start ? period : month); setError(''); setOpen(true); }}><Icon name="calendar" size={16} /><span>{custom ? `${dateLabel(period.start)} – ${dateLabel(period.end)}` : 'Selecionar datas'}</span></button></Tooltip>
        </div>
      </div>
      {statusFilter}
    </div>
    <CardExpandidoModal aberto={open} rotulo={textos.title} onFechar={() => setOpen(false)}>
      <div className={`${styles.salesPeriodTheme} ${dark ? styles.dark : ''}`} style={{ '--brand': brand } as CSSProperties}>
        <DraggableModalCard className={`${styles.userModal} ${styles.salesPeriodDialog}`}>
          <div className={styles.userModalHeader} data-modal-drag-handle><h2>{textos.title}</h2><button type="button" className={styles.iconAction} aria-label="Fechar período" onClick={() => setOpen(false)}>×</button></div>
          <form className={styles.form} onSubmit={(event) => {
            event.preventDefault();
            if (!draft.start || !draft.end || !validSalePeriod(draft)) { setError('Informe as duas datas. A data final deve ser igual ou posterior à inicial.'); return; }
            setError(''); onPeriodChange(draft); setOpen(false);
          }}>
            <p className={styles.help}>{textos.description}</p>
            <div className={styles.salesPeriodDates}>
              <label>Data inicial<CampoData anoCurto required value={draft.start} aria-label="Data inicial" onChange={start => setDraft(current => ({ ...current, start }))} aria-describedby={error ? 'sales-period-error' : undefined} /></label>
              <label>Data final<CampoData anoCurto required value={draft.end} aria-label="Data final" min={draft.start || undefined} onChange={end => setDraft(current => ({ ...current, end }))} aria-describedby={error ? 'sales-period-error' : undefined} /></label>
            </div>
            {error && <p id="sales-period-error" className={styles.salesError} role="alert">{error}</p>}
            <div className={styles.salesPeriodActions}><button type="button" className={styles.refreshSales} onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className={styles.primary}>Aplicar período</button></div>
          </form>
        </DraggableModalCard>
      </div>
    </CardExpandidoModal>
  </>;
}

export default function SalesFilters({ period, onPeriodChange, group, onGroupChange, counts, total, dark, brand }: {
  period: SalePeriod; onPeriodChange: (period: SalePeriod) => void;
  group: SaleGroup | ''; onGroupChange: (group: SaleGroup | '') => void;
  counts: Record<SaleGroup, number>; total: number; dark: boolean; brand: string;
}) {
  return <SalesPeriodFilter period={period} onPeriodChange={onPeriodChange} dark={dark} brand={brand} showAll={false} statusFilter={
    <MarketplaceSelect label="Situação das vendas" ariaLabel="Filtrar situação das vendas" leadingIcon={<Icon name="filter" size={16} />} detailAsBadge tooltipText="Filtrar vendas por situação" tooltipPosition="bottom" value={group} placeholder="Todas as situações" className={styles.salesStatusFilter} onChange={(value) => onGroupChange(value as SaleGroup | '')} options={[
        { value: '', label: 'Todas', detail: String(total) },
        ...orderedSaleGroups(counts).map(({ value, label }) => ({ value, label, detail: String(counts[value]) })),
      ]} />
  } />;
}
