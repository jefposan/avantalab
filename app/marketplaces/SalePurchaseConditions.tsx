'use client';
import type {PurchaseConditions} from '@/app/modules/marketplaces/purchase-conditions';
import {formatarMoeda} from '@/app/lib/formatters';
import styles from './marketplaces.module.css';
export default function SalePurchaseConditions({value,loading,error}:{value?:PurchaseConditions;loading:boolean;error:string}){
 const amount=(v:number|null|undefined)=>v===null||v===undefined?'Não informado':formatarMoeda(v/100);
 return <section className={styles.purchaseConditions} aria-label="Condições da compra">
  <h3>Condições da compra</h3>
  {loading?<p role="status">Consultando pagamento, fretes e taxas…</p>:error?<p role="alert">Não foi possível confirmar as condições. Use Atualizar pós-venda para tentar novamente.</p>:<>
   <dl><div><dt>Forma de pagamento</dt><dd>{value?.payments.length?value.payments.map((p,i)=><p key={i}>{p.method} · {p.status}{p.amount!==null?` · ${amount(p.amount)}`:''}</p>):'Não informado'}</dd></div>
   <div><dt>Parcelas</dt><dd>{value?.payments.length?value.payments.map((p,i)=><p key={i}>{p.installments===null?'Não informado':`${p.installments} ${p.installments===1?'parcela':'parcelas'}`}</p>):'Não informado'}</dd></div>
   <div><dt>Frete pago pelo comprador</dt><dd>{amount(value?.buyerFreight)}</dd></div>
   <div><dt>Frete descontado do vendedor</dt><dd>{amount(value?.sellerFreight)}</dd></div>
   <div><dt>Taxas do Mercado Livre</dt><dd>{amount(value?.fees)}</dd></div>
   <div><dt>Líquido após taxas e frete</dt><dd>{amount(value?.net)}</dd></div></dl>
   <p className={styles.salesScopeHelp}>Líquido calculado sobre o valor dos produtos, descontando taxas e frete do vendedor; não confirma o repasse. Dados para conferência, sem alterar a nota fiscal.</p>
   {value?.issues.map(message=><p key={message} className={styles.salesScopeHelp} role="status">{message}</p>)}
  </>}
 </section>;
}
