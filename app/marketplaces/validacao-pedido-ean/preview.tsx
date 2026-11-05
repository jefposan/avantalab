'use client';
import { useState } from 'react';
import SaleItems from '../SaleItems';
import styles from '../marketplaces.module.css';

export default function Preview() {
  const [dark,setDark]=useState(false);
  return <main className={`${styles.page} ${dark?styles.dark:''}`} style={{padding:24}}>
    <h1>Prévia local — EAN nos itens do pedido</h1><p>Prévia demonstrativa sem gravações. Primeiro EAN conferido no anúncio; segundo item fictício.</p>
    <button onClick={()=>setDark(value=>!value)}>Alternar tema</button>
    <section className={styles.saleCard} style={{maxWidth:1000,marginTop:16}}>
      <header className={styles.saleSummary} style={{gridTemplateColumns:'1fr'}}><strong>Pedido #DEMONSTRAÇÃO</strong></header>
      <div className={styles.saleDetails}><dl><div><dt>Itens</dt><dd><SaleItems items={[{title:'Fritadeira Airfryer Philips Walita Xl Digital 6,2l - Preto 127v',quantity:1,unitPrice:535,ean:'8720389031151'},{title:'Produto demonstrativo sem EAN informado',quantity:2,unitPrice:20,ean:null}]} /></dd></div><div><dt>Total</dt><dd>R$ 575,00</dd></div><div><dt>Situação do pedido</dt><dd>Venda confirmada</dd></div></dl></div>
    </section>
  </main>;
}
