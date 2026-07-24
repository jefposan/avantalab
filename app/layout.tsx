import type { Metadata, Viewport } from "next";
import "./globals.css";
import { inter } from "./lib/fonts";
import WebPopupScrollLock from "./components/WebPopupScrollLock";

const shareImage = 'https://avantalab.com.br/images/avantalab-share-meta-safe-center-v2.jpg?v=20260717-01';

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
    description: 'Controle entradas, despesas e saldo de forma simples.',
    images: [shareImage],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AvantaLab',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef6fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="preload"
          href="/images/bg-avantalab.webp"
          as="image"
          type="image/webp"
          media="(min-width: 1024px)"
        />
        <link
          rel="preload"
          href="/images/bg-avantalab-mobile.webp"
          as="image"
          type="image/webp"
          media="(max-width: 1023px)"
        />
      </head>
      <body className="typography-system min-h-full flex flex-col">
        <WebPopupScrollLock />
        {children}
      </body>
    </html>
  );
}
