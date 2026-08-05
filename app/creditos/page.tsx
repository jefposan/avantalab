import type { Metadata } from 'next';
import Image from 'next/image';
import CarteiraCreditos from '@/components/carteira/CarteiraCreditos';
import styles from '@/components/carteira/carteira.module.css';

export const metadata: Metadata = { title: 'Meus créditos | AvantaLab', robots: { index: false, follow: false } };

export default function CreditosPage() {
  return <main className={styles.pagina}><header className={styles.topo}><Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={150} height={38} priority /></header><div className={styles.palco}><CarteiraCreditos /></div></main>;
}
