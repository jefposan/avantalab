import type { Metadata, Viewport } from 'next';
import ImportadorDespesas from '@/app/modules/importador-despesas/screens/ImportadorDespesas';

export const metadata: Metadata = {
  title: 'AvantaLab · Importador de despesas',
  description: 'Importe, revise e confirme despesas a partir de extratos e planilhas.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#003E73' };

export default function ImportadorDespesasPage() {
  return <ImportadorDespesas />;
}
