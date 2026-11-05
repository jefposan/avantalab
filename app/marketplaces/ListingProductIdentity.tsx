import type { ListingSnapshot } from '@/app/modules/marketplaces/services/listing-model';
import ProductThumbnail from './ProductThumbnail';
import ProductPublicationRibbon from './ProductPublicationRibbon';
import { productPublicationState } from '@/app/modules/marketplaces/local-product-publications';
import styles from './marketplaces.module.css';

export default function ListingProductIdentity({ item, accountName, editing = false, provider = '' }: {
  item: Pick<ListingSnapshot, 'id' | 'title' | 'ean' | 'pictures'> & Partial<Pick<ListingSnapshot, 'status' | 'substatus'>>;
  accountName: string;
  editing?: boolean;
  provider?: string;
}) {
  const state = productPublicationState([{ provider, provider_listing_id: item.id, status: item.substatus?.includes('deleted') ? 'deleted' : item.status || '' }]);
  return <div className={`${styles.listingProductIdentity} ${state ? styles.listingProductPublished : ''}`}>
    <ProductPublicationRibbon state={state} />
    <ProductThumbnail key={item.pictures?.[0]} url={item.pictures?.[0]} name={item.title} />
    <div className={styles.listingProductText}>
      {editing && <small className={styles.editingListingLabel}>Em edição</small>}
      <strong>{item.title}</strong>
      <small>{accountName} · {item.id}</small>
      <small>EAN: {item.ean?.trim() || 'Não informado'}</small>
    </div>
  </div>;
}
