import type { productPublicationState } from '@/app/modules/marketplaces/local-product-publications';
import styles from './marketplaces.module.css';

/** Identificação única de publicação; não usar no histórico de vendas. */
export default function ProductPublicationRibbon({ state, reservedQuantity=0, availableQuantity }: { state: ReturnType<typeof productPublicationState>; reservedQuantity?:number; availableQuantity?:number }) {
  if(reservedQuantity>0&&availableQuantity===0)return <span className={styles.productPublicationRibbon} data-publication="reserved">Reservado</span>;
  return state ? <span className={styles.productPublicationRibbon} data-publication={state.key}>{state.label}</span> : null;
}
