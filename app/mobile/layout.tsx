import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://avantalab.com.br';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <link rel="preload" href="/images/ava-logo-fundo-claro.png" as="image" type="image/png" />
      <link rel="preload" href="/images/ava-logo-fundo-escuro.png" as="image" type="image/png" />
      {children}
    </>
  );
}
