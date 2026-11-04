'use client';

import { useState } from 'react';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import styles from '../marketplaces.module.css';

export default function Preview() {
  const [open,setOpen]=useState(true),[dark,setDark]=useState(false),[busy,setBusy]=useState(false),[brand,setBrand]=useState('#d00000'),[confirmed,setConfirmed]=useState(0);
  return <main className={`${styles.page} ${dark?styles.dark:''}`} style={{padding:24}}>
    <h1>Prévia local — confirmação do estoque</h1>
    <p>Sem banco ou estoque real. Confirmações simuladas: {confirmed}.</p>
    <div style={{display:'flex',gap:16}}>
      <button type="button" onClick={()=>setOpen(true)}>Abrir confirmação</button>
      <button type="button" onClick={()=>setDark(value=>!value)}>Alternar tema</button>
      <button type="button" onClick={()=>setBusy(value=>!value)}>Alternar espera</button>
      <button type="button" onClick={()=>setBrand(value=>value==='#d00000'?'#ffe600':'#d00000')}>Alternar cor do perfil</button>
    </div>
    <section className={styles.listingsPanel} style={{'--brand':brand} as React.CSSProperties}>
      <ModalConfirmacao aberto={open} titulo="Confirmar estoque físico?" mensagem={'Confirmar 30 unidades físicas de “Produto de teste”? O saldo anterior será substituído, com registro no histórico. Nenhum anúncio será alterado.'} textoConfirmar="Confirmar" variante="primaria" corPrimaria={brand} darkMode={dark} carregando={busy} aoCancelar={()=>setOpen(false)} aoConfirmar={()=>{setConfirmed(value=>value+1);setOpen(false);}} />
    </section>
  </main>;
}
