import { formatarMoeda } from '@/app/lib/formatters';
import type { SaleItem } from '@/app/modules/marketplaces/sale-items';
import styles from './marketplaces.module.css';

export default function SaleItems({ items }: { items: SaleItem[] }) {
  return <>{items.map((item,index)=><span className={styles.saleItem} key={`${item.listingId || item.title}-${index}`}>
    <span>{item.quantity}× {item.title}{item.unitPrice != null ? ` · ${formatarMoeda(item.unitPrice)}` : ''}</span>
    <small className={styles.saleItemEan}>EAN: {item.ean || (item.eanUnavailable ? 'Indisponível no momento' : 'Não informado')}</small>
  </span>)}</>;
}
