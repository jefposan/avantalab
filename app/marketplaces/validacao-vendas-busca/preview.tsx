'use client';
import {useState,type CSSProperties,type ComponentProps} from 'react';
import Vendas from '../Vendas';
import styles from '../marketplaces.module.css';
import {SALE_GROUPS,type SaleGroup} from '@/app/modules/marketplaces/sales-status';
type Props=ComponentProps<typeof Vendas>;
const sample:Props['sales']=[{id:'demo-order',connectionId:'demo-account',orderId:'2000019284716164',soldAt:'2026-11-01T23:42:00Z',status:'paid',shipmentId:'demo-shipping',shipmentStatus:'delivered',shipmentSubstatus:null,labelStatus:'fulfilled',seenAt:null,createdAt:'2026-11-01T23:42:00Z',updatedAt:'2026-11-01T23:42:00Z',buyer:'CAMIVIANADEASSIS',total:149.9,currency:'BRL',provider:'mercado_livre',items:[{title:'Ventilador de Mesa Mondial Super Power II',quantity:1,unitPrice:149.9}]}];
export default function Preview(){
 const [account,setAccount]=useState(''),[group,setGroup]=useState<SaleGroup|''>(''),[expanded,setExpanded]=useState(true);
 const counts=Object.fromEntries(SALE_GROUPS.map(g=>[g.value,0])) as Record<SaleGroup,number>;
 return <main className={styles.page} style={{'--marketplace-brand':'#ce0800',padding:'28px',minHeight:'100vh'} as CSSProperties}>
 <Vendas companyId="demo-company" accountId={account} onAccountChange={setAccount} group={group} onGroupChange={setGroup} counts={counts} total={1} accounts={[{id:'demo-account',provider:'mercado_livre',seller_reference:'ADRIANO',seller_name:'ADRIANO',status:'active',last_synced_at:null,expires_at:null}]} marketplaceOptions={[{value:'mercado_livre',label:'Mercado Livre'}]} selectedMarketplaces={[]} onMarketplacesChange={()=>{}} sales={sample} canManage={false} loading={false} error="" awaitingUpdates={0} onRefresh={()=>{}} onSaleUpdated={()=>{}} expanded={expanded} onExpandedChange={setExpanded} saleToOpen="" dark={false} brand="#ce0800"/>
 </main>;
}
