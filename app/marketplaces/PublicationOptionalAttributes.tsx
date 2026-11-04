'use client';
import MarketplaceSelect from './MarketplaceSelect';
import type {PublicationAttributeField} from '@/app/modules/marketplaces/services/catalog-publication';
import styles from './marketplaces.module.css';
/** Mesmas opções em Novo anúncio e na revisão por conta; opcionais não bloqueiam quando vazios. */
export default function PublicationOptionalAttributes({fields,values,errors,prefix,disabled,onChange}:{fields?:PublicationAttributeField[];values?:Record<string,string>;errors:Record<string,string>;prefix:string;disabled?:boolean;onChange:(values:Record<string,string>)=>void}){
 if(!fields?.length)return null;
 return <details id={`${prefix}-optional-attributes`} tabIndex={-1} className={styles.catalogWide} open={fields.some(f=>!!errors[`attribute:${f.id}`])||undefined}><summary>Ficha técnica complementar · {fields.length} campos</summary><div className={styles.catalogFields}>{fields.map(field=>{
  const id=`${prefix}-attribute:${field.id}`,error=errors[`attribute:${field.id}`],value=values?.[field.id]||'';
  return field.values.length?<MarketplaceSelect key={field.id} id={id} className={styles.catalogField} label={field.name} value={value} options={field.values.map(o=>({value:o.id,label:o.name}))} placeholder="Não informado" error={error} disabled={disabled} onChange={next=>onChange({...values,[field.id]:next})}/>:<label key={field.id} className={styles.catalogField} htmlFor={id}>{field.name}<input id={id} value={value} maxLength={field.maxLength||1000} disabled={disabled} aria-invalid={!!error} aria-describedby={error?`${id}-error`:field.units?.length?`${id}-units`:undefined} onChange={e=>onChange({...values,[field.id]:e.target.value})}/>{!!field.units?.length&&<small id={`${id}-units`}>Número e unidade: {field.units.join(', ')}</small>}{error&&<small id={`${id}-error`} role="alert">{error}</small>}</label>;
 })}</div></details>;
}
