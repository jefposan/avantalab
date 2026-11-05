'use client';
import { useState, type CSSProperties } from 'react';
import PriceToolsActions from '../PriceToolsActions';
import styles from '../marketplaces.module.css';

export default function Preview() {
  const [action, setAction] = useState('Prévia local — ações simuladas, sem gravação de dados.');
  const [copied, setCopied] = useState(false);
  return <main className={styles.page} style={{ '--brand': '#d60000', padding: '32px' } as CSSProperties}>
    <section className={styles.hero} aria-labelledby="module-title">
      <div><h1 id="module-title">Anúncios em marketplaces</h1></div>
      <PriceToolsActions brand="#d60000" canManage reading={false} canManageConnections copyStatus={copied ? 'copied' : 'idle'} onCreate={() => setAction('Criar Lote acionado')} onEdit={() => setAction('Editar Lotes acionado')} onSettings={() => setAction('Configurações acionadas')} onCopy={() => { setCopied(true); setAction('Cópia simulada acionada'); }} />
    </section>
    <p role="status">{action}</p>
  </main>;
}
