import type { productPublicationState } from '@/app/modules/marketplaces/local-product-publications';
import styles from './marketplaces.module.css';

/** Identificação única de publicação; não usar no histórico de vendas. */
export default function ProductPublicationRibbon({ state }: { state: ReturnType<typeof productPublicationState> }) {
  return state ? <span className={styles.productPublicationRibbon} data-publication={state.key}>{state.label}</span> : null;
}
