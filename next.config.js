/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./.
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24
        }
      }
    }
  ]
})

const nextConfig = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['images.unsplash.com', 'api.dicebear.com']
  },
  experimental: {
    appDir: true
  }
})

module.exports = nextConfig
