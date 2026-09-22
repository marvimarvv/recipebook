/** @type {import('next').NextConfig} */
const withSerwist = require("@serwist/next").default({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  register: true,
});

const nextConfig = withSerwist({
  reactStrictMode: true,
  // iOS specific: Enable output for better PWA support
  output: "standalone",
  // Fix cross-origin request warning for development
  allowedDevOrigins: ["nf4qfd-3000.csb.app", "localhost:3000"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
    // iOS specific: Enable image optimization for PWA
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Long-lived caching is only safe for content-hashed files, i.e. production
  // /_next/static. Dev chunks and HTML share URLs across builds — caching them
  // as immutable makes browsers serve stale code forever.
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  // iOS specific: Redirects for PWA
  async redirects() {
    return [
      // Ensure clean URLs for PWA
      {
        source: "/index.html",
        destination: "/",
        permanent: true,
      },
    ];
  },
});

module.exports = nextConfig;
