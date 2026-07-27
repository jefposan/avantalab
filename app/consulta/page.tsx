import type { Metadata } from 'next';
import Image from 'next/image';
import CentralConsultasCard from '@/components/consultas/CentralConsultasCard';
import styles from '@/components/consultas/consultas.module.css';

export const metadata: Metadata = {
  title: 'Central de Consultas | AvantaLab',
  description:
    'Consulta pública de dados cadastrais de empresas por CNPJ no AvantaLab.',
  robots: { index: false, follow: false },
};

export default function ConsultaPage() {
  return (
    <main className={styles.pagina}>
      <header className={styles.topo}>
        <div className={styles.topoConteudo}>
          <Image
            src="/images/logo-avantalab-oficial.png"
            alt="AvantaLab"
            width={150}
            height={38}
            priority
            className={styles.logo}
          />
          <div className={styles.topoTitulo}>
            <span>AvantaLab</span>
            <strong>Central de Consultas</strong>
          </div>
        </div>
      </header>

      <div className={styles.palco}>
        <CentralConsultasCard />
      </div>
    </main>
  );
}
