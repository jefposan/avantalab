'use client';

import { useEffect } from 'react';
import styles from './projetos.module.css';

export default function ProjetosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Falha isolada no AvantaProjetos:', error); }, [error]);
  return <main className={styles.errorState}><span>!</span><h1>Não foi possível abrir o AvantaProjetos</h1><p>Seus dados locais não foram descartados. Tente carregar novamente.</p><button type="button" className={styles.primaryButton} onClick={reset}>Tentar novamente</button></main>;
}
