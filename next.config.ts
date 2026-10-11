import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Exercise demo images are served from our own domain (proxied to the jsDelivr
  // CDN mirror of free-exercise-db) so networks that block GitHub still load them.
  async rewrites() {
    return [
      {
        source: "/ex-img/:path*",
        destination: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(body.bin|exercises.json)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
