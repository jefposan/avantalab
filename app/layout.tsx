import type { Metadata } from "next";
import "./globals.css";

const shareImage = 'https://avantalab.com.br/images/avantalab-share-meta-safe-center-v2.jpg';

export const metadata: Metadata = {
  metadataBase: new URL('https://avantalab.com.br'),
  title: 'AvantaLab Gestao',
  description: 'Controle entradas, despesas e saldo do seu negocio ou das suas financas pessoais.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'AvantaLab Gestao',
    description: 'Descubra quanto realmente sobra no seu negocio ou nas suas despesas pessoais.',
    type: 'website',
    siteName: 'AvantaLab Gestao',
    images: [
      {
        url: shareImage,
        width: 1200,
        height: 628,
        alt: 'AvantaLab Gestao',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AvantaLab Gestao',
    desc