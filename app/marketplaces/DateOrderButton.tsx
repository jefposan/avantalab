'use client';

import Tooltip from '@/app/components/Tooltip';
import { Icon } from '@/app/projetos/components/Icon';
import type { DateOrder } from '@/app/modules/marketplaces/date-order';
import styles from './marketplaces.module.css';

export default function DateOrderButton({ context, order, onChange, disabled = false }: {
  context: 'Vendas' | 'Anunciados'; order: DateOrder; onChange: (order: DateOrder) => void; disabled?: boolean;
}) {
  const current = order === 'desc' ? 'Mais recentes' : 'Mais antigas';
  const next = order === 'desc' ? 'mais antigas' : 'mais recentes';
  const description = `${context}: ${current.toLowerCase()} primeiro. Clique para mostrar ${next} primeiro.`;
  return <Tooltip texto={description}><button type="button" className={`${styles.refreshSales} ${styles.dateOrderButton}`} disabled={disabled} aria-label={description} onClick={() => onChange(order === 'desc' ? 'asc' : 'desc')}>
    <Icon name="filter" size={16} /> <span>{current}</span>
  </button></Tooltip>;
}
