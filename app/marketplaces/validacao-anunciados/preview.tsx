'use client';

import { useState } from 'react';
import ListingProductIdentity from '../ListingProductIdentity';
import styles from '../marketplaces.module.css';

const illustration = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect width="56" height="56" fill="white"/><rect x="13" y="3" width="30" height="49" rx="5" fill="#c9cdd1"/><path fill="#4b5563" d="M19 9h18v30H19z"/><path fill="#e5e7eb" d="M20 20h16v18H20z"/><path stroke="#111827" stroke-width="3" d="M23 16h10m-5 0v9"/><path fill="#94a3b8" d="M17 44h22v5H17z"/></svg>')}`;
const rows = [
  { id:'MLB7764166726', title:'Purificador Com Compressor Soft Prata Slim Água Gelada 220 220v', ean:'7898077620930', pictures:[illustration] },
  { id:'MLB1234567890', title:'Produto demonstrativo sem EAN ou foto', ean:null, pictures:[] },
  { id:'MLB1234567891', title:'Produto demonstrativo com foto indisponível', ean:'7890000000000', pictures:['/imagem-de-teste-inexistente.jpg'] },
];

export default function Preview() {
  const [dark,setDark]=useState(false);
  return <main className={`${styles.page} ${dark ? styles.dark : ''}`} style={{padding:24}}>
    <h1>Prévia local — Anunciados</h1>
    <p>Dados fictícios; ilustração de teste. Nenhum anúncio ou cadastro real é alterado.</p>
    <button type="button" onClick={()=>setDark(value=>!value)}>Alternar tema</button>
    <div className={styles.tableScroll} style={{marginTop:16}}><table className={styles.listingTable}><colgroup><col style={{width:'35%'}}/><col/><col/><col/></colgroup><thead><tr><th>Anúncio</th><th>Situação</th><th>Preço</th><th>Estoque</th></tr></thead><tbody>{rows.map(item=><tr key={item.id} className={styles.listingRow}><th scope="row"><ListingProductIdentity item={item} accountName="ADRIANO" /></th><td>Ativo</td><td>R$ 200,00</td><td>2</td></tr>)}</tbody></table></div>
  </main>;
}
