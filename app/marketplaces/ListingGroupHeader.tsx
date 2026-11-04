'use client';
import type {ListingGroup} from '@/app/modules/marketplaces/listing-groups';
import {listingGroupSummary} from '@/app/modules/marketplaces/listing-groups';
import {productPublicationState} from '@/app/modules/marketplaces/local-product-publications';
import {formatarMoeda} from '@/app/lib/formatters';
import ProductThumbnail from './ProductThumbnail';
import {ProductSalePrices} from './LocalProductPricing';
import type {PricePercentages} from '@/app/modules/marketplaces/price-settings';
import QualitySummary from './QualitySummary';
import ProductPublicationRibbon from './ProductPublicationRibbon';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import styles from './marketplaces.module.css';

export default function ListingGroupHeader({group,provider,open,disabled,onToggle,controlsId,onViewStock,percentages=null}:{group:ListingGroup;provider:string;open:boolean;disabled:boolean;onToggle:()=>void;controlsId:string;onViewStock?:()=>void;percentages?:PricePercentages|null}){
 const summary=listingGroupSummary(group);
 const differentPrices=summary.prices.length>1||summary.prices.some(range=>range.min!==range.max);
 const labels:Record<string,string>={active:'ativo',paused:'pausado',closed:'encerrado',inactive:'inativo',deleted:'excluído',under_review:'em revisão'};
 const statuses=<div className={styles.announcedGroupStatuses} aria-label={summary.statuses.map(([status,count])=>`${count} ${labels[status]||status}${count>1&&status!=='under_review'?'s':''}`).join(' · ')}>{summary.statuses.map(([status,count])=><span key={status} data-status={status}>{status==='paused'&&<span aria-hidden="true">Ⅱ - </span>}{count} {labels[status]||status}{count>1&&status!=='under_review'?'s':''}</span>)}</div>;
 const price=(value:number,currency:string)=>currency==='BRL'?formatarMoeda(value):`${currency} ${value.toFixed(2)}`;
 const publication=productPublicationState(group.listings.map(row=>({provider,provider_listing_id:row.snapshot.id,status:row.snapshot.substatus?.includes('deleted')?'deleted':row.status})));
 return <div className={styles.announcedGroupHeader}>
  <div className={`${styles.listingProductIdentity} ${publication?styles.listingProductPublished:''}`}>
   <ProductPublicationRibbon state={publication}/><ProductThumbnail url={group.pictures?.[0]} name={group.title}/>
   <div className={styles.listingProductText}><strong>{group.title}</strong><small>EAN: {group.ean||'Não informado'}</small>{!group.productId&&<small>Sem vínculo com cadastro local</small>}</div>
  </div>
  <div className={styles.announcedGroupQuality}>
   {provider==='mercado_livre'?<QualitySummary wide label="Qualidade do anúncio" links={group.listings.filter(r=>!['closed','deleted'].includes(r.operationalStatus||r.status)).map(r=>({connectionId:r.connectionId,id:r.snapshot.id}))}/>:null}{statuses}</div>
  <div className={styles.announcedGroupPrices} aria-label="Comparativo de preços do produto"><div className={styles.announcedGroupPriceCurrent}><small>{differentPrices?'Preços dos anúncios':'Preço anunciado'}</small>{summary.prices.length?summary.prices.map(range=><strong key={range.currency}>{price(range.min,range.currency)}{range.min!==range.max?` a ${price(range.max,range.currency)}`:''}</strong>):<span>Preço indisponível</span>}</div><ProductSalePrices reference={group.referencePriceCents??null} percentages={percentages}/></div>
  <div className={styles.announcedGroupActionBlock}>
   <div className={styles.announcedGroupCounts}><strong>{group.listings.length} {group.listings.length===1?'anúncio':'anúncios'} · {summary.accounts} {summary.accounts===1?'conta':'contas'}</strong></div>
   <div className={styles.announcedGroupActions}>
   <BotaoAcaoCompacto disabled={disabled||!group.productId||!onViewStock} title={!group.productId?'Este anúncio ainda não possui vínculo com um cadastro local.':undefined} onClick={onViewStock}>Ver no estoque</BotaoAcaoCompacto>
   <BotaoAcaoCompacto aria-expanded={open} aria-controls={controlsId} disabled={disabled} onClick={onToggle}>{open?'Recolher':'Ver anúncios'} {open?'⌃':'⌄'}</BotaoAcaoCompacto>
  </div>
  </div>
 </div>;
}
