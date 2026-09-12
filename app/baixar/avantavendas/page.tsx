import type { Metadata } from 'next';
import Image from 'next/image';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import QRCode from 'qrcode';
import { registrarEventoDownloadAvantaVendas } from '@/app/lib/avantavendas-download-analytics';
import {
  criarUrlEscolhaLojaAvantaVendas,
  extrairParametrosCampanhaAvantaVendas,
  normalizarParametrosDownloadAvantaVendas,
  planejarDownloadAvantaVendas,
} from '@/app/lib/avantavendas-download';
import styles from './baixar-avantavendas.module.css';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Baixe o AvantaVendas',
  description: 'Baixe o AvantaVendas para organizar clientes, produtos, pedidos e pagamentos.',
  robots: { index: false, follow: true },
};

type ParametrosBusca = Record<string, string | string[] | undefined>;

async function gerarQrCode(url: string) {
  try {
    return await QRCode.toDataURL(url, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#003E73', light: '#FFFFFF' },
    });
  } catch {
    return null;
  }
}

export default async function BaixarAvantaVendasPage({ searchParams }: { searchParams: Promise<ParametrosBusca> }) {
  const [parametrosBusca, cabecalhos] = await Promise.all([searchParams, headers()]);
  const parametros = normalizarParametrosDownloadAvantaVendas(parametrosBusca);
  const campanha = extrairParametrosCampanhaAvantaVendas(parametros);
  const plano = planejarDownloadAvantaVendas({
    userAgent: cabecalhos.get('user-agent'),
    parametros,
  });

  after(() => registrarEventoDownloadAvantaVendas({
    tipo: 'acesso',
    dispositivo: plano.dispositivo,
    destino: plano.destino,
    campanha,
  }));

  if (plano.url) redirect(plano.url);

  const escolhaAppStore = criarUrlEscolhaLojaAvantaVendas('ios', parametros);
  const escolhaGooglePlay = criarUrlEscolhaLojaAvantaVendas('android', parametros);
  const [qrAppStore, qrGooglePlay] = await Promise.all([
    gerarQrCode(escolhaAppStore),
    gerarQrCode(escolhaGooglePlay),
  ]);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="titulo-download">
        <Image
          className={styles.logo}
          src="/images/AvantaLab_pos_vendas.png"
          alt="AvantaVendas"
          width={1200}
          height={298}
          priority
        />
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Aplicativo oficial AvantaLab</p>
          <h1 id="titulo-download">Baixe o AvantaVendas</h1>
          <p>Organize clientes, produtos, pedidos e pagamentos no iPhone ou Android.</p>
        </div>

        <div className={styles.options} aria-label="Escolha a loja do seu celular">
          <a className={`${styles.storeButton} ${styles.apple}`} href={escolhaAppStore}>
            <span className={styles.storeIcon} aria-hidden="true"></span>
            <span><small>Baixar na</small><strong>App Store</strong></span>
          </a>
          <a className={`${styles.storeButton} ${styles.google}`} href={escolhaGooglePlay}>
            <span className={styles.playIcon} aria-hidden="true">▶</span>
            <span><small>Disponível no</small><strong>Google Play</strong></span>
          </a>
        </div>

        {(qrAppStore || qrGooglePlay) && (
          <div className={styles.qrGrid} aria-label="QR Codes para download">
            {qrAppStore && <a className={styles.qrCard} href={escolhaAppStore} aria-label="Abrir App Store para baixar AvantaVendas"><img src={qrAppStore} alt="QR Code para baixar AvantaVendas na App Store" /><span>App Store</span></a>}
            {qrGooglePlay && <a className={styles.qrCard} href={escolhaGooglePlay} aria-label="Abrir Google Play para baixar AvantaVendas"><img src={qrGooglePlay} alt="QR Code para baixar AvantaVendas na Google Play" /><span>Google Play</span></a>}
          </div>
        )}
      </section>
    </main>
  );
}
