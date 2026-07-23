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
  devIndicators: false,
  outputFileTracingIncludes: {
    "/avantavendas/recursos/*": ["./app/avantavendas/sistema/**/*"],
  },
  async headers() {
    return [
      { source: "/mobile", headers: semCachePwa },
      { source: "/mobile-app.js", headers: semCachePwa },
      { source: "/mobile-supabase.js", headers: semCachePwa },
      { source: "/mobile-sw.js", headers: semCachePwa },
      { source: "/avantavendas", headers: semCachePwa },
      { source: "/avantavendas/manifest.webmanifest", headers: semCachePwa },
      { source: "/avantavendas/sw.js", headers: semCachePwa },
      { source: "/avantavendas/versao", headers: semCachePwa },
    ];
  },
};

export default nextConfig;
