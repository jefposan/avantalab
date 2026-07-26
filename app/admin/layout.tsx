import type { Metadata, Viewport } from 'next';
import AdminPwaBridge from './AdminPwaBridge';

export const metadata: Metadata = {
  title: 'Avanta Admin',
  description: 'Administração da plataforma AvantaLab.',
  manifest: '/admin-manifest.json',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      {
        url: '/images/avanta-admin-pwa-v2-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/images/avanta-admin-pwa-v2-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/images/avanta-admin-pwa-v2-180.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Avanta Admin',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#07182e',
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <AdminPwaBridge />
    </>
  );
}
