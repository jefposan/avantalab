import type { NextConfig } from "next";

const semCachePwa = [
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  },
  {
    key: "Cloudflare-CDN-Cache-Control",
    value: "no-store",
  },
  {
    key: "CDN-Cache-Control",
    value: "no-store",
  },
];

const nextConfig: NextConfig = {
  // PGlite é usado somente pela prévia local bloqueada em produção; mantém URLs/WASM nativos do Node.
  serverExternalPackages: ['@electric-sql/pglite'],
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    "/avantavendas/recursos/*": [
      "./app/avantavendas/sistema/**/*",
      "./app/avantavendas/runtime-compacto/*.js",
    ],
    "/api/modulos/vendas/**/*": ["./schemas/nfe/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/preview/landing",
        destination: "/",
        permanent: true,
      },
      {
        source: "/mobile/vendas",
        destination: "/avantavendas",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      { source: "/gestao", headers: semCachePwa },
      { source: "/sw.js", headers: semCachePwa },
      { source: "/mobile", headers: semCachePwa },
      { source: "/mobile/versao", headers: semCachePwa },
      { source: "/mobile-app.js", headers: semCachePwa },
      { source: "/mobile-runtime/:path*", headers: semCachePwa },
      { source: "/mobile-supabase.js", headers: semCachePwa },
      { source: "/mobile-sw.js", headers: semCachePwa },
      { source: "/avantavendas", headers: semCachePwa },
      { source: "/avantavendas/gestao", headers: semCachePwa },
      { source: "/avantavendas/manifest.webmanifest", headers: semCachePwa },
      { source: "/avantavendas/sw.js", headers: semCachePwa },
      { source: "/avantavendas/versao", headers: semCachePwa },
    ];
  },
  async rewrites() {
    return {
      // beforeFiles preserva URLs, bootstrap e SW; dev mantém fonte legível.
      beforeFiles: process.env.NODE_ENV === 'production'
        ? [{ source: '/mobile-app.js', destination: '/mobile-runtime/mobile-app.js' }]
        : [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
