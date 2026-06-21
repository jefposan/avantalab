import type { Metadata } from "next";
import "./globals.css";

const siteUrl = 'https://avantalab.com.br';
const shareImage = 'https://avantalab.com.br/images/avantalab-share-meta-safe-center-v2.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Avantalab Gestão",
  description: "Controle entradas, despesas e saldo do seu negócio ou das suas finanças pessoais.",
  manifest: '/manifest.json',
  openGraph: {
    title: 'AvantaLab Gestão',
    description: 'Descubra quanto realmente sobra no seu negócio ou nas suas despesas pessoais.',
    type: 'website',
    siteName: 'AvantaLab Gestão',
    images: [
      {
        url: shareImage,
        secureUrl: shareImage,
        width: 1200,
        height: 628,
        alt: 'AvantaLab Gestão',
        type: 'image/jpeg',
      },
    ],