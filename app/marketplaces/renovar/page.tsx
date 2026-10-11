import type { Metadata } from 'next';
import RenewalClient from './RenewalClient';
export const metadata: Metadata = {
  title: 'Renovar autorização Mercado Livre',
  description: 'Autorize novamente sua conta do Mercado Livre no AvantaLab sem compartilhar sua senha.',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};
export default function RenewalPage() { return <RenewalClient />; }
