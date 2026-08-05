import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';
import ConsultaCredito from '@/components/consultas/ConsultaCredito';
import styles from '@/components/consultas/credito.module.css';

export const metadata: Metadata = { title: 'Consulta de crédito | AvantaLab', robots: { index: false, follow: false } };
export default function ConsultaCreditoPage() { return <main className={styles.pagina}><header className={styles.topo}><Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={150} height={38} priority /></header><div className={styles.palco}><Suspense fallback={<p>Carregando…</p>}><ConsultaCredito /></Suspense></div></main>; }
