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
  async headers() {
    return [
      { source: "/mobile", headers: semCachePwa },
      { source: "/mobile-app.js", headers: semCachePwa },
      { source: "/mobile-supabase.js", headers: semCachePwa },
      { source: "/mobile-sw.js", headers: semCachePwa },
    ];
  },
};

export default nextConfig;
