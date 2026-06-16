import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avantalab Gestão",
  description: "Sistema de gestão financeira Avantalab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
