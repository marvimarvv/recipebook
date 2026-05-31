/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24
        }
      }
    },
    {
      urlPattern: /\/icons\/.*\.png$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'icons-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        }
      }
    },
    {
      urlPattern: /\/manifest\.json$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'manifest-cache',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 60 * 60 * 24 // 1 day
        }
      }
    }
  ],
  // iOS specific: Disable service worker in development for better debugging
  disableDevLogs: true,
  // iOS specific: Ensure service worker is registered properly
  publicExcludes: ['!**/*.{js,css,json,png}']
})

const nextConfig = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  // iOS specific: Enable output for better PWA support
  output: 'standalone',
  images: {
    domains: ['images.unsplash.com', 'api.dicebear.com'],
    // iOS specific: Enable image optimization for PWA
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    appDir: true,
    // iOS specific: Enable server components for PWA
    serverComponentsExternalPackages: ['next-pwa']
  },
  // iOS specific: Headers for PWA
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  // iOS specific: Redirects for PWA
  async redirects() {
    return [
      // Ensure clean URLs for PWA
      {
        source: '/index.html',
        destination: '/',
        permanent: true
      }
    ]
  }
})

module.exports = nextConfig
